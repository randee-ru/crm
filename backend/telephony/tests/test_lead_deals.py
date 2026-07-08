from __future__ import annotations

from datetime import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from crm.models import Deal
from crm.pipelines import ensure_default_pipeline, get_stage_by_code
from telephony.lead_deals_service import ensure_lead_deal_from_call
from telephony.models import CallLog
from telephony.services import upsert_mango_call
from telephony.mango_client import MangoCall


class LeadDealFromCallTest(TestCase):
    def setUp(self) -> None:
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        self.user = get_user_model().objects.create_user(username="manager", password="admin12345")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.MANAGER,
        )
        self.client_record = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Иван",
            last_name="Петров",
            phone="+79529973776",
        )
        self.pipeline = ensure_default_pipeline(self.company)
        self.new_stage = get_stage_by_code(self.pipeline, "new_lead")

    def _incoming_call(self, *, client: Client | None = None, line_name: str = "Менеджеры") -> CallLog:
        return CallLog.objects.create(
            company=self.company,
            client=client,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone="79529973776",
            target_phone="74951203639",
            line_name=line_name,
            started_at=timezone.now(),
            duration=120,
            external_id="test-call-1",
        )

    def test_unknown_incoming_call_creates_deal_in_new_lead(self) -> None:
        call = self._incoming_call(client=None, line_name="Менеджеры")
        deal = ensure_lead_deal_from_call(call)

        self.assertIsNotNone(deal)
        assert deal is not None
        self.assertEqual(deal.stage_id, self.new_stage.id)
        self.assertEqual(deal.external_key, f"call:{call.pk}")
        self.assertIn("менеджеры", deal.title.lower())

    def test_known_client_does_not_create_deal(self) -> None:
        call = self._incoming_call(client=self.client_record, line_name="Менеджеры")
        deal = ensure_lead_deal_from_call(call)
        self.assertIsNone(deal)
        self.assertEqual(Deal.objects.count(), 0)

    def test_outgoing_call_does_not_create_deal(self) -> None:
        call = CallLog.objects.create(
            company=self.company,
            direction=CallLog.Direction.OUTGOING,
            status=CallLog.Status.ANSWERED,
            caller_phone="74951203639",
            target_phone="79529973776",
            line_name="Менеджеры",
            started_at=timezone.now(),
            duration=30,
            external_id="test-call-out",
        )
        deal = ensure_lead_deal_from_call(call)
        self.assertIsNone(deal)

    def test_upsert_mango_call_creates_lead_for_unknown_number(self) -> None:
        started = int(datetime(2026, 7, 7, 18, 33, tzinfo=timezone.get_current_timezone()).timestamp())
        mango_call = MangoCall(
            start=started,
            finish=started + 484,
            from_number="79529973776",
            to_number="sip:user3@domain",
            line_number="74951203639",
            recording_id="rec-test-1",
        )
        call_log, created = upsert_mango_call(self.company, mango_call, {}, None, {})
        self.assertTrue(created)
        self.assertIsNone(call_log.client_id)
        self.assertTrue(Deal.objects.filter(company=self.company, external_key=f"call:{call_log.pk}").exists())

    def test_repeat_call_from_same_number_reuses_existing_deal(self) -> None:
        call1 = self._incoming_call(client=None, line_name="Менеджеры")
        deal1 = ensure_lead_deal_from_call(call1)
        self.assertIsNotNone(deal1)

        call2 = CallLog.objects.create(
            company=self.company,
            client=None,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.MISSED,
            caller_phone="79529973776",
            target_phone="74951203639",
            line_name="Менеджеры",
            started_at=timezone.now(),
            duration=0,
            external_id="test-call-2",
        )
        deal2 = ensure_lead_deal_from_call(call2)

        self.assertIsNotNone(deal2)
        assert deal1 is not None and deal2 is not None
        self.assertEqual(deal1.pk, deal2.pk)
        self.assertEqual(Deal.objects.count(), 1)
        self.assertIn("---", deal2.description or "")

    def test_different_numbers_create_separate_deals(self) -> None:
        call1 = self._incoming_call(client=None)
        deal1 = ensure_lead_deal_from_call(call1)

        call2 = CallLog.objects.create(
            company=self.company,
            client=None,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone="79001112233",
            target_phone="74951203639",
            line_name="Менеджеры",
            started_at=timezone.now(),
            duration=10,
            external_id="test-call-other",
        )
        deal2 = ensure_lead_deal_from_call(call2)

        self.assertIsNotNone(deal1)
        self.assertIsNotNone(deal2)
        assert deal1 is not None and deal2 is not None
        self.assertNotEqual(deal1.pk, deal2.pk)
        self.assertEqual(Deal.objects.count(), 2)

    def test_pipeline_renamed_to_general_funnel(self) -> None:
        self.assertEqual(self.pipeline.name, "Общая воронка")
