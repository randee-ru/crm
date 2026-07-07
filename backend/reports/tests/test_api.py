from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company


class ReportsApiTest(TestCase):
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

    def test_daily_and_overview_reports(self) -> None:
        daily_response = self.http.get("/api/v1/reports/daily/?company=sportmax", **self.auth_headers())
        self.assertEqual(daily_response.status_code, 200)
        daily_payload = daily_response.json()
        self.assertIn("metrics", daily_payload)
        self.assertIn("source_notes", daily_payload)

        overview_response = self.http.get("/api/v1/reports/overview/?company=sportmax&days=7", **self.auth_headers())
        self.assertEqual(overview_response.status_code, 200)
        overview_payload = overview_response.json()
        self.assertIn("totals", overview_payload)
        self.assertIn("series", overview_payload)
