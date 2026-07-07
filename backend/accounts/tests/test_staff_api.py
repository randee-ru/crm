from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership, EmployeeInvitation
from branches.models import Branch
from companies.models import Company


class StaffApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(
            username="manager",
            password="admin12345",
            first_name="Иван",
            last_name="Петров",
            email="manager@sportmax.local",
        )
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        self.branch_second = Branch.objects.create(company=self.company, name="Pool")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.ADMIN,
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_dashboard_returns_memberships_and_invitations(self) -> None:
        EmployeeInvitation.objects.create(
            company=self.company,
            branch=self.branch,
            invited_by=self.user,
            email="new@sportmax.local",
            full_name="Новый Сотрудник",
            role=CompanyMembership.Role.EMPLOYEE,
        )

        response = self.http.get("/api/v1/staff/dashboard/?company=sportmax", **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["company"]["slug"], "sportmax")
        self.assertEqual(payload["stats"]["total_members"], 1)
        self.assertEqual(payload["stats"]["pending_invites"], 1)
        self.assertEqual(len(payload["memberships"]), 1)
        self.assertEqual(len(payload["invitations"]), 1)

    def test_invitation_create_and_duplicate_member_email_is_rejected(self) -> None:
        create_response = self.http.post(
            "/api/v1/staff/invitations/?company=sportmax",
            data={
                "email": "coach@sportmax.local",
                "full_name": "Анна Иванова",
                "role": CompanyMembership.Role.MANAGER,
                "message": "Добро пожаловать в команду.",
                "branch_id": self.branch.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.json()["email"], "coach@sportmax.local")
        self.assertIn("/login?invite=", create_response.json()["invite_url"])

        duplicate_response = self.http.post(
            "/api/v1/staff/invitations/?company=sportmax",
            data={
                "email": "manager@sportmax.local",
                "full_name": "Иван Петров",
                "role": CompanyMembership.Role.EMPLOYEE,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(duplicate_response.status_code, 400)

    def test_membership_patch_updates_employee_data(self) -> None:
        membership = CompanyMembership.objects.get(user=self.user, company=self.company)

        response = self.http.patch(
            f"/api/v1/staff/memberships/{membership.id}/?company=sportmax",
            data={
                "first_name": "Сергей",
                "last_name": "Иванов",
                "email": "sergey@sportmax.local",
                "role": CompanyMembership.Role.MANAGER,
                "is_active": False,
                "branch_id": self.branch_second.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["display_name"], "Сергей Иванов")
        self.assertEqual(payload["role"], CompanyMembership.Role.MANAGER)
        self.assertFalse(payload["is_active"])
        self.assertEqual(payload["branch_name"], "Pool")

    def test_membership_direct_create(self) -> None:
        response = self.http.post(
            "/api/v1/staff/memberships/?company=sportmax",
            data={
                "first_name": "Ольга",
                "last_name": "Ресепшн",
                "email": "reception@sportmax.local",
                "password": "very-strong-pass",
                "role": CompanyMembership.Role.EMPLOYEE,
                "branch_id": self.branch.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["display_name"], "Ольга Ресепшн")
        self.assertEqual(payload["role"], CompanyMembership.Role.EMPLOYEE)
        self.assertTrue(payload["is_active"])

        login_response = self.http.post(
            "/api/v1/auth/login/",
            data={"username": payload["username"], "password": "very-strong-pass"},
            content_type="application/json",
        )
        self.assertEqual(login_response.status_code, 200)

    def test_membership_direct_create_rejects_existing_active_email(self) -> None:
        response = self.http.post(
            "/api/v1/staff/memberships/?company=sportmax",
            data={
                "first_name": "Дубль",
                "last_name": "Иванов",
                "email": "manager@sportmax.local",
                "password": "very-strong-pass",
                "role": CompanyMembership.Role.EMPLOYEE,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)

    def test_invitation_accept_creates_user_and_membership(self) -> None:
        invitation = EmployeeInvitation.objects.create(
            company=self.company,
            branch=self.branch,
            invited_by=self.user,
            email="newcoach@sportmax.local",
            full_name="Новый Тренер",
            role=CompanyMembership.Role.MANAGER,
        )

        response = self.http.post(
            "/api/v1/auth/accept-invite/",
            data={
                "token": str(invitation.token),
                "first_name": "Новый",
                "last_name": "Тренер",
                "password": "strong-password-123",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertIn("token", payload)
        self.assertEqual(payload["company"]["slug"], "sportmax")
        self.assertTrue(
            CompanyMembership.objects.filter(
                company=self.company,
                user__email="newcoach@sportmax.local",
                role=CompanyMembership.Role.MANAGER,
                is_active=True,
            ).exists()
        )
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, EmployeeInvitation.Status.ACCEPTED)
        self.assertIsNotNone(invitation.accepted_at)
