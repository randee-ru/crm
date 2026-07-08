from __future__ import annotations

from datetime import datetime
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company
from crm.deal_serializers import DealLinkedCallSerializer
from telephony.mango_client import MangoCall, MangoConfig
from telephony.models import CallLog, TelephonyIntegration
from telephony.services import (
    _mango_call_matches_call_log,
    refresh_call_recording_from_mango,
    upsert_mango_call,
)


class UpsertRecordingPreservationTest(TestCase):
    def setUp(self) -> None:
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")

    def test_upsert_preserves_recording_id_when_mango_returns_empty(self) -> None:
        started = int(datetime(2026, 5, 20, 12, 0, tzinfo=timezone.get_current_timezone()).timestamp())
        existing = CallLog.objects.create(
            company=self.company,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone="79001112233",
            target_phone="74951203639",
            from_number="79001112233",
            to_number="74951203639",
            recording_id="existing-recording-id",
            started_at=datetime.fromtimestamp(started, tz=timezone.get_current_timezone()),
            duration=100,
            external_id="mango_existing-recording-id",
        )
        mango_call = MangoCall(
            recording_id="",
            start=started,
            finish=started + 100,
            from_number="79001112233",
            to_number="74951203639",
            line_number="74951203639",
        )

        call_log, created = upsert_mango_call(self.company, mango_call, {}, existing, {})

        self.assertFalse(created)
        self.assertEqual(call_log.pk, existing.pk)
        self.assertEqual(call_log.recording_id, "existing-recording-id")


class RefreshCallRecordingTest(TestCase):
    def setUp(self) -> None:
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.config = MangoConfig(api_key="test-key", api_salt="test-salt")
        started = int(datetime(2026, 5, 20, 12, 0, tzinfo=timezone.get_current_timezone()).timestamp())
        self.started_at = datetime.fromtimestamp(started, tz=timezone.get_current_timezone())
        self.call = CallLog.objects.create(
            company=self.company,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone="79001112233",
            target_phone="74951203639",
            from_number="79001112233",
            to_number="74951203639",
            recording_id="",
            started_at=self.started_at,
            duration=100,
            external_id="mango_no_recording",
        )
        self.matching_mango_call = MangoCall(
            recording_id="fresh-recording-id",
            start=int(self.started_at.timestamp()),
            finish=int(self.started_at.timestamp()) + 100,
            from_number="79001112233",
            to_number="74951203639",
            line_number="74951203639",
        )

    def test_mango_call_matches_call_log_by_timestamp_duration_and_numbers(self) -> None:
        self.assertTrue(_mango_call_matches_call_log(self.call, self.matching_mango_call))

    def test_mango_call_does_not_match_different_duration(self) -> None:
        other = MangoCall(
            recording_id="other-id",
            start=int(self.started_at.timestamp()),
            finish=int(self.started_at.timestamp()) + 50,
            from_number="79001112233",
            to_number="74951203639",
        )
        self.assertFalse(_mango_call_matches_call_log(self.call, other))

    @patch("telephony.services.get_mango_calls")
    def test_refresh_call_recording_from_mango_saves_recording_id(self, get_mango_calls) -> None:
        get_mango_calls.return_value = [
            self.matching_mango_call,
            MangoCall(
                recording_id="",
                start=int(self.started_at.timestamp()),
                finish=int(self.started_at.timestamp()) + 100,
                from_number="79001112233",
                to_number="74951203639",
            ),
        ]

        recording_id = refresh_call_recording_from_mango(self.call, self.config)

        self.assertEqual(recording_id, "fresh-recording-id")
        self.call.refresh_from_db()
        self.assertEqual(self.call.recording_id, "fresh-recording-id")
        get_mango_calls.assert_called_once_with(
            self.config,
            timezone.localdate(self.started_at),
            timezone.localdate(self.started_at),
        )

    @patch("telephony.services.get_mango_calls")
    def test_refresh_call_recording_from_mango_returns_empty_when_not_found(self, get_mango_calls) -> None:
        get_mango_calls.return_value = [
            MangoCall(
                recording_id="",
                start=int(self.started_at.timestamp()),
                finish=int(self.started_at.timestamp()) + 100,
                from_number="79001112233",
                to_number="74951203639",
            )
        ]

        recording_id = refresh_call_recording_from_mango(self.call, self.config)

        self.assertEqual(recording_id, "")
        self.call.refresh_from_db()
        self.assertEqual(self.call.recording_id, "")


class DealLinkedCallRecordingStatusTest(TestCase):
    def setUp(self) -> None:
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")

    def test_recording_status_available(self) -> None:
        call = CallLog.objects.create(
            company=self.company,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone="79001112233",
            target_phone="74951203639",
            recording_id="rec-1",
            started_at=timezone.now(),
            duration=60,
            external_id="call-available",
        )
        data = DealLinkedCallSerializer(call).data
        self.assertEqual(data["recording_status"], "available")
        self.assertTrue(data["has_recording"])

    def test_recording_status_not_stored_for_answered_call_without_recording(self) -> None:
        call = CallLog.objects.create(
            company=self.company,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone="79001112233",
            target_phone="74951203639",
            started_at=timezone.now(),
            duration=100,
            external_id="call-not-stored",
        )
        data = DealLinkedCallSerializer(call).data
        self.assertEqual(data["recording_status"], "not_stored")
        self.assertFalse(data["has_recording"])

    def test_recording_status_unavailable_for_missed_call(self) -> None:
        call = CallLog.objects.create(
            company=self.company,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.MISSED,
            caller_phone="79001112233",
            target_phone="74951203639",
            started_at=timezone.now(),
            duration=0,
            external_id="call-missed",
        )
        data = DealLinkedCallSerializer(call).data
        self.assertEqual(data["recording_status"], "unavailable")


class CallRecordingPlaybackViewTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(username="manager", password="admin12345")
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.MANAGER,
        )
        self.token = Token.objects.create(user=self.user)
        TelephonyIntegration.objects.create(
            company=self.company,
            provider=TelephonyIntegration.Provider.MANGO,
            api_key="test-key",
            api_secret="test-salt",
        )
        self.call = CallLog.objects.create(
            company=self.company,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone="79001112233",
            target_phone="74951203639",
            from_number="79001112233",
            to_number="74951203639",
            started_at=timezone.now(),
            duration=100,
            external_id="call-playback",
        )

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    @patch("telephony.services.get_mango_calls")
    def test_stream_returns_not_stored_message_after_failed_refresh(self, get_mango_calls) -> None:
        get_mango_calls.return_value = []

        response = self.http.get(
            f"/api/v1/telephony/calls/{self.call.id}/stream/?company=sportmax",
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 404)
        self.assertIn("Mango Office", response.content.decode())
