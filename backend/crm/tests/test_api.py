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
from crm.models import Task


class TaskApiTest(TestCase):
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

    def test_task_create_and_list(self) -> None:
        due_at = (timezone.now() + timedelta(hours=2)).isoformat()
        create_response = self.http.post(
            "/api/v1/tasks/?company=sportmax",
            data={
                "title": "Позвонить клиенту",
                "description": "Подтвердить пробное занятие",
                "priority": "high",
                "due_at": due_at,
                "client_id": self.client_record.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.json()["title"], "Позвонить клиенту")

        list_response = self.http.get(
            "/api/v1/tasks/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)

    def test_task_update(self) -> None:
        task = Task.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            assigned_to=self.user,
            created_by=self.user,
            title="Подтвердить оплату",
            status=Task.Status.OPEN,
        )

        response = self.http.patch(
            f"/api/v1/tasks/{task.id}/?company=sportmax",
            data={"status": "done"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.Status.DONE)
