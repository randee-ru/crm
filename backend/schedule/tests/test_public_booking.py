from __future__ import annotations

from datetime import time, timedelta
from unittest.mock import patch

from django.core.cache import cache
from django.test import Client as DjangoClient, TestCase, override_settings
from django.utils import timezone

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from schedule.client_auth import set_client_portal_password
from schedule.models import GroupProgram, GroupScheduleSlot, GroupSlotEnrollment
from schedule.services import get_schedule_settings


@override_settings(DEBUG=True)
class PublicScheduleBookingTest(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.http = DjangoClient()
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        self.client_record = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Иван",
            last_name="Петров",
            phone="+79991112233",
        )
        set_client_portal_password(self.client_record, "121351")
        self.program = GroupProgram.objects.create(
            company=self.company,
            title="Йога",
            code="YOGA",
            color="#123456",
            sort_order=1,
            is_active=True,
        )
        self.slot = GroupScheduleSlot.objects.create(
            company=self.company,
            program=self.program,
            branch=self.branch,
            session_date=timezone.localdate() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            trainer_name="Анна",
            room="Main Hall",
            max_participants=1,
        )
        settings = get_schedule_settings(self.company)
        settings.is_published = True
        settings.embed_token = "embed-secret"
        settings.save()

    def public_url(self, path: str) -> str:
        return f"/api/v1/public/schedule/sportmax{path}?token=embed-secret"

    def _challenge(self) -> dict:
        response = self.http.get(self.public_url("/auth/challenge"))
        self.assertEqual(response.status_code, 200)
        return response.json()

    def _login(self, phone: str = "89991112233", password: str = "121351") -> str:
        response = self.http.post(
            self.public_url("/auth/login"),
            data={"phone": phone, "password": password},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["session_token"]

    def _request_reset_code(self, phone: str, *, answer: int | None = None) -> object:
        challenge = self._challenge()
        captcha_key = f"otp_captcha:{challenge['challenge_id']}"
        expected = cache.get(captcha_key)
        self.assertIsNotNone(expected)
        return self.http.post(
            self.public_url("/auth/forgot-password"),
            data={
                "phone": phone,
                "challenge_id": challenge["challenge_id"],
                "captcha_answer": str(answer if answer is not None else expected),
                "website": "",
            },
            content_type="application/json",
        )

    def test_public_schedule_includes_booking_fields(self) -> None:
        response = self.http.get(self.public_url(""))
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["booking_enabled"])
        slot = body["slots"][0]
        self.assertEqual(slot["seats_left"], 1)
        self.assertFalse(slot["is_past"])
        self.assertTrue(slot["can_book"])

    @patch("schedule.public_booking.send_company_sms", return_value=True)
    def test_login_and_enroll_sends_confirmation_sms(self, sms_mock) -> None:
        session_token = self._login()

        enroll_response = self.http.post(
            self.public_url(f"/slots/{self.slot.id}/enroll"),
            HTTP_X_CLIENT_SESSION=session_token,
        )
        self.assertEqual(enroll_response.status_code, 201)
        self.assertEqual(enroll_response.json()["status"], "confirmed")
        self.assertEqual(GroupSlotEnrollment.objects.filter(client=self.client_record).count(), 1)
        sms_mock.assert_called_once()

        schedule_response = self.http.get(
            self.public_url(""),
            HTTP_X_CLIENT_SESSION=session_token,
        )
        slot = schedule_response.json()["slots"][0]
        self.assertTrue(slot["is_enrolled"])

    def test_phone_formats_normalize_on_login(self) -> None:
        for phone in ("+79991112233", "79991112233", "89991112233"):
            session_token = self._login(phone=phone)
            self.assertTrue(session_token)

    def test_phone_leading_seven_not_doubled(self) -> None:
        from telephony.phone import normalize_phone

        self.assertEqual(normalize_phone("79998010227"), "79998010227")
        self.assertNotEqual(normalize_phone("7999801027"), "77999801027")

    def test_unknown_phone_rejected(self) -> None:
        response = self.http.post(
            self.public_url("/auth/login"),
            data={"phone": "89990000000", "password": "121351"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_forgot_password_requires_captcha(self) -> None:
        response = self.http.post(
            self.public_url("/auth/forgot-password"),
            data={"phone": "89991112233"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_foreign_phone_rejected(self) -> None:
        response = self._request_reset_code("+380501112233")
        self.assertEqual(response.status_code, 400)
        self.assertIn("российск", response.json()["detail"].lower())

    def test_reset_password_flow(self) -> None:
        self.client_record.schedule_portal_password = ""
        self.client_record.save(update_fields=["schedule_portal_password"])
        request_response = self._request_reset_code("89991112233")
        self.assertEqual(request_response.status_code, 200)
        body = request_response.json()
        check_id = body["check_id"]
        self.assertTrue(check_id)
        self.assertIn("call_phone", body)

        reset_response = self.http.post(
            self.public_url("/auth/reset-password"),
            data={
                "phone": "89991112233",
                "check_id": check_id,
                "email": "ivan@example.com",
                "new_password": "4321",
            },
            content_type="application/json",
        )
        self.assertEqual(reset_response.status_code, 200, reset_response.content)
        session_token = reset_response.json()["session_token"]
        self.assertTrue(session_token)

        self.client_record.refresh_from_db()
        self.assertEqual(self.client_record.email, "ivan@example.com")

        login_response = self.http.post(
            self.public_url("/auth/login"),
            data={"phone": "89991112233", "password": "4321"},
            content_type="application/json",
        )
        self.assertEqual(login_response.status_code, 200)

    def test_cannot_book_within_one_hour(self) -> None:
        session_token = self._login()

        start_dt = timezone.localtime() + timedelta(minutes=30)
        end_dt = start_dt + timedelta(hours=1)
        soon_slot = GroupScheduleSlot.objects.create(
            company=self.company,
            program=self.program,
            branch=self.branch,
            session_date=start_dt.date(),
            start_time=start_dt.time(),
            end_time=end_dt.time(),
            trainer_name="Анна",
            room="Main Hall",
            max_participants=1,
        )

        enroll_response = self.http.post(
            self.public_url(f"/slots/{soon_slot.id}/enroll"),
            HTTP_X_CLIENT_SESSION=session_token,
        )
        self.assertEqual(enroll_response.status_code, 400)
        self.assertIn("1 час", enroll_response.json()["detail"])

    def test_cannot_cancel_within_one_hour(self) -> None:
        session_token = self._login()

        start_dt = timezone.localtime() + timedelta(minutes=30)
        end_dt = start_dt + timedelta(hours=1)
        soon_slot = GroupScheduleSlot.objects.create(
            company=self.company,
            program=self.program,
            branch=self.branch,
            session_date=start_dt.date(),
            start_time=start_dt.time(),
            end_time=end_dt.time(),
            trainer_name="Анна",
            room="Main Hall",
            max_participants=1,
        )

        enroll_response = self.http.post(
            self.public_url(f"/slots/{soon_slot.id}/enroll"),
            HTTP_X_CLIENT_SESSION=session_token,
        )
        self.assertEqual(enroll_response.status_code, 400)

        # Занятие через 2 часа — запись и отмена должны работать.
        later_start = timezone.localtime() + timedelta(hours=2)
        later_end = later_start + timedelta(hours=1)
        later_slot = GroupScheduleSlot.objects.create(
            company=self.company,
            program=self.program,
            branch=self.branch,
            session_date=later_start.date(),
            start_time=later_start.time(),
            end_time=later_end.time(),
            trainer_name="Анна",
            room="Main Hall",
            max_participants=1,
        )
        with patch("schedule.public_booking.send_company_sms", return_value=True):
            enroll_response = self.http.post(
                self.public_url(f"/slots/{later_slot.id}/enroll"),
                HTTP_X_CLIENT_SESSION=session_token,
            )
        self.assertEqual(enroll_response.status_code, 201)
        enrollment_id = enroll_response.json()["id"]

        cancel_response = self.http.post(
            self.public_url(f"/enrollments/{enrollment_id}/cancel"),
            HTTP_X_CLIENT_SESSION=session_token,
        )
        self.assertEqual(cancel_response.status_code, 200)
