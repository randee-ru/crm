from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from attendance.models import AttendanceRecord
from branches.models import Branch
from bookings.models import Booking
from clients.models import Client
from companies.models import Company
from employees.models import Trainer
from memberships.models import Membership


class AttendanceApiTest(TestCase):
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
        self.client_record = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Иван",
            last_name="Петров",
            phone="+79991112233",
        )
        self.trainer = Trainer.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Анна",
            last_name="Иванова",
            phone="+79990000001",
            trains_gym_floor=True,
        )
        self.membership = Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Пробный месяц",
            status=Membership.Status.ACTIVE,
            starts_at="2026-07-01",
            ends_at="2026-07-31",
        )
        starts_at = timezone.now().replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        ends_at = starts_at + timedelta(hours=1)
        self.booking = Booking.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            membership=self.membership,
            trainer=self.trainer,
            title="Персональная тренировка",
            starts_at=starts_at,
            ends_at=ends_at,
            status=Booking.Status.CONFIRMED,
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_attendance_create_and_list(self) -> None:
        now = timezone.now()
        create_response = self.http.post(
            "/api/v1/attendance/?company=sportmax",
            data={
                "status": AttendanceRecord.Status.CHECKED_IN,
                "checked_in_at": now.isoformat(),
                "checked_out_at": (now + timedelta(hours=1)).isoformat(),
                "client_id": self.client_record.id,
                "membership_id": self.membership.id,
                "trainer_id": self.trainer.id,
                "branch_id": self.branch.id,
                "booking_id": self.booking.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)

        list_response = self.http.get("/api/v1/attendance/?company=sportmax", **self.auth_headers())
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)

    def test_attendance_rejects_blocked_client(self) -> None:
        blocked_client = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Блокова",
            phone="+79994443322",
            club_access_blocked=True,
        )
        blocked_membership = Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=blocked_client,
            title="Пробный месяц",
            status=Membership.Status.ACTIVE,
            starts_at="2026-07-01",
            ends_at="2026-07-31",
        )
        blocked_booking = Booking.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            membership=self.membership,
            trainer=self.trainer,
            title="Персональная тренировка",
            starts_at=timezone.now() + timedelta(hours=2),
            ends_at=timezone.now() + timedelta(hours=3),
            status=Booking.Status.CONFIRMED,
        )

        response = self.http.post(
            "/api/v1/attendance/?company=sportmax",
            data={
                "status": AttendanceRecord.Status.CHECKED_IN,
                "checked_in_at": timezone.now().isoformat(),
                "client_id": blocked_client.id,
                "membership_id": blocked_membership.id,
                "trainer_id": self.trainer.id,
                "branch_id": self.branch.id,
                "booking_id": blocked_booking.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Клиент заблокирован для прохода в клуб.", response.json()["client_id"][0])

    def test_attendance_detail_update_and_delete(self) -> None:
        attendance = AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            membership=self.membership,
            trainer=self.trainer,
            booking=self.booking,
            status=AttendanceRecord.Status.CHECKED_IN,
            checked_in_at=timezone.now() - timedelta(minutes=45),
            checked_out_at=timezone.now() - timedelta(minutes=5),
        )

        detail_response = self.http.get(
            f"/api/v1/attendance/{attendance.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["client_name"], "Петров Иван")

        update_response = self.http.patch(
            f"/api/v1/attendance/{attendance.id}/?company=sportmax",
            data={
                "status": AttendanceRecord.Status.LATE,
                "checked_in_at": (timezone.now() - timedelta(minutes=50)).isoformat(),
                "checked_out_at": (timezone.now() - timedelta(minutes=15)).isoformat(),
                "notes": "Опоздал на 10 минут",
                "client_id": self.client_record.id,
                "membership_id": self.membership.id,
                "trainer_id": self.trainer.id,
                "branch_id": self.branch.id,
                "booking_id": self.booking.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["status"], AttendanceRecord.Status.LATE)

        delete_response = self.http.delete(
            f"/api/v1/attendance/{attendance.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(AttendanceRecord.objects.filter(id=attendance.id).exists())
