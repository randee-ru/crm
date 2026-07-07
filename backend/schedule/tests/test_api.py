from __future__ import annotations

from datetime import timedelta, time

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from schedule.models import GroupProgram, GroupScheduleSlot, GroupSlotEnrollment, ScheduleEvent


class ScheduleApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(
            username="manager",
            password="admin12345",
        )
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
        self.blocked_client = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Блокова",
            phone="+79994443322",
            club_access_blocked=True,
            group_programs_blocked=True,
        )
        self.program = GroupProgram.objects.create(
            company=self.company,
            title="Йога",
            code="YOGA",
            description="Описание",
            color="#123456",
            sort_order=1,
            is_active=True,
        )
        self.slot = GroupScheduleSlot.objects.create(
            company=self.company,
            program=self.program,
            branch=self.branch,
            session_date=timezone.localdate(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            trainer_name="Анна",
            room="Main Hall",
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_schedule_create_and_filter_today(self) -> None:
        starts_at = timezone.now().replace(hour=15, minute=0, second=0, microsecond=0)
        ends_at = starts_at + timedelta(hours=1)

        create_response = self.http.post(
            "/api/v1/schedule/?company=sportmax",
            data={
                "title": "Йога для начинающих",
                "trainer_name": "Анна",
                "room": "Зал 2",
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "client_id": self.client_record.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)

        list_response = self.http.get(
            "/api/v1/schedule/?company=sportmax&when=today",
            **self.auth_headers(),
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)
        self.assertEqual(list_response.json()[0]["title"], "Йога для начинающих")

    def test_group_program_crud(self) -> None:
        create_response = self.http.post(
            "/api/v1/schedule/programs/?company=sportmax",
            data={
                "title": "Новая программа",
                "code": "NEW",
                "description": "Описание",
                "color": "#123456",
                "sort_order": 77,
                "is_active": True,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)
        program_id = create_response.json()["id"]

        update_response = self.http.patch(
            f"/api/v1/schedule/programs/{program_id}/?company=sportmax",
            data={
                "title": "Новая программа 2",
                "sort_order": 88,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["title"], "Новая программа 2")
        self.assertEqual(update_response.json()["sort_order"], 88)

        delete_response = self.http.delete(
            f"/api/v1/schedule/programs/{program_id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(delete_response.status_code, 204)

        program = GroupProgram.objects.get(id=program_id)
        self.assertFalse(program.is_active)

    def test_group_slot_enrollment_rejects_blocked_client(self) -> None:
        response = self.http.post(
            f"/api/v1/schedule/group-slots/{self.slot.id}/enrollments/?company=sportmax",
            data={
                "client": self.blocked_client.id,
                "status": GroupSlotEnrollment.Status.CONFIRMED,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Клиент заблокирован для прохода в клуб.", response.json()["client"][0])
