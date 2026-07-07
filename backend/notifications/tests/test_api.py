from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company
from notifications.models import Notification


class NotificationsApiTest(TestCase):
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

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_notification_list_and_mark_all_read(self) -> None:
        Notification.objects.create(
            company=self.company,
            title="Новая задача",
            body="Позвонить клиенту",
            target_url="/dashboard/tasks",
        )

        response = self.http.get("/api/v1/notifications/?company=sportmax", **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertFalse(payload[0]["is_read"])

        mark_response = self.http.post(
            "/api/v1/notifications/mark-all-read/?company=sportmax",
            data={},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(mark_response.status_code, 200)

        notification = Notification.objects.first()
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)
