from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company


class AuthApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="admin12345",
            first_name="Пётр",
            last_name="Менеджеров",
        )
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.ADMIN,
        )

    def test_login_returns_token_and_company_context(self) -> None:
        response = self.http.post(
            "/api/v1/auth/login/",
            data={"username": "admin", "password": "admin12345"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("token", payload)
        self.assertEqual(payload["user"]["username"], "admin")
        self.assertEqual(payload["company"]["slug"], "sportmax")
        self.assertEqual(len(payload["memberships"]), 1)

    def test_login_rejects_invalid_credentials(self) -> None:
        response = self.http.post(
            "/api/v1/auth/login/",
            data={"username": "admin", "password": "wrong-password"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_me_requires_authentication(self) -> None:
        response = self.http.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, 401)

    def test_me_patch_updates_profile(self) -> None:
        login = self.http.post(
            "/api/v1/auth/login/",
            data={"username": "admin", "password": "admin12345"},
            content_type="application/json",
        )
        token = login.json()["token"]

        response = self.http.patch(
            "/api/v1/auth/me/",
            data={
                "first_name": "Иван",
                "last_name": "Алексеев",
                "email": "ivan@sportmax.local",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Token {token}",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user"]["first_name"], "Иван")
        self.assertEqual(payload["user"]["last_name"], "Алексеев")
        self.assertEqual(payload["user"]["display_name"], "Иван Алексеев")
        self.assertEqual(payload["user"]["email"], "ivan@sportmax.local")
