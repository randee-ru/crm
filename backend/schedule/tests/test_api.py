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
from employees.models import Trainer
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
        self.group_trainer = Trainer.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Анна",
            last_name="Иванова",
            phone="+79990001122",
            email="group.trainer@sportmax.fit",
            trains_group_programs=True,
        )
        self.personal_trainer = Trainer.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Ирина",
            last_name="Петрова",
            phone="+79990003344",
            email="floor.trainer@sportmax.fit",
            trains_gym_floor=True,
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

    def test_group_program_accepts_room_and_group_trainer(self) -> None:
        response = self.http.post(
            "/api/v1/schedule/programs/?company=sportmax",
            data={
                "title": "Велофит",
                "code": "CYCLE",
                "description": "Описание",
                "color": "#ff5500",
                "sort_order": 3,
                "room": "Cycle Studio",
                "trainer": self.group_trainer.id,
                "is_active": True,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["room"], "Cycle Studio")
        self.assertEqual(payload["trainer"], self.group_trainer.id)
        self.assertEqual(payload["trainer_display"], self.group_trainer.full_name)

    def test_group_program_rejects_non_group_trainer(self) -> None:
        response = self.http.post(
            "/api/v1/schedule/programs/?company=sportmax",
            data={
                "title": "Новая программа с залом",
                "code": "NEW2",
                "description": "Описание",
                "color": "#123456",
                "sort_order": 78,
                "room": "Main Hall",
                "trainer": self.personal_trainer.id,
                "is_active": True,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Выберите тренера групповых программ", response.json()["trainer"][0])

    def test_group_slot_inherits_program_defaults(self) -> None:
        program = GroupProgram.objects.create(
            company=self.company,
            title="Копия Йоги",
            code="YOGA2",
            description="Описание",
            color="#123456",
            sort_order=2,
            trainer=self.group_trainer,
            room="Cycle Studio",
            is_active=True,
        )
        response = self.http.post(
            "/api/v1/schedule/group-slots/?company=sportmax",
            data={
                "program": program.id,
                "session_date": timezone.localdate().isoformat(),
                "start_time": "13:00",
                "end_time": "14:00",
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["room"], "Cycle Studio")
        self.assertEqual(payload["trainer"], self.group_trainer.id)
        self.assertEqual(payload["trainer_display"], self.group_trainer.full_name)

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

    def test_group_slot_enrollment_is_idempotent_for_same_client(self) -> None:
        first = self.http.post(
            f"/api/v1/schedule/group-slots/{self.slot.id}/enrollments/?company=sportmax",
            data={
                "client": self.client_record.id,
                "status": GroupSlotEnrollment.Status.CONFIRMED,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        second = self.http.post(
            f"/api/v1/schedule/group-slots/{self.slot.id}/enrollments/?company=sportmax",
            data={
                "client": self.client_record.id,
                "status": GroupSlotEnrollment.Status.CONFIRMED,
            },
            content_type="application/json",
            **self.auth_headers(),
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(GroupSlotEnrollment.objects.filter(slot=self.slot, client=self.client_record).count(), 1)
