from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from schedule.models import ScheduleEvent


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
