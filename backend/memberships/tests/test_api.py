from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from memberships.models import Membership


class MembershipApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(
            username="manager",
            password="admin12345",
            email="manager@sportmax.local",
        )
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        self.branch_second = Branch.objects.create(company=self.company, name="Pool")
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
        self.membership = Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Пробный месяц",
            status=Membership.Status.ACTIVE,
            starts_at="2026-07-01",
            ends_at="2026-07-31",
            visit_limit=12,
            visits_used=3,
            price="4990.00",
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_membership_list_returns_company_records(self) -> None:
        response = self.http.get("/api/v1/memberships/?company=sportmax", **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["title"], "Пробный месяц")
        self.assertEqual(payload[0]["remaining_visits"], 9)

    def test_membership_list_supports_search_and_status_filters(self) -> None:
        Membership.objects.create(
            company=self.company,
            branch=self.branch_second,
            client=self.client_record,
            title="Безлимит",
            status=Membership.Status.FROZEN,
            starts_at="2026-06-01",
            ends_at="2026-06-30",
        )

        response = self.http.get(
            "/api/v1/memberships/?company=sportmax&search=Пробный&status=active",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["status"], "active")

    def test_membership_create_detail_update_and_delete(self) -> None:
        create_response = self.http.post(
            "/api/v1/memberships/?company=sportmax",
            data={
                "title": "Утренний пакет",
                "status": Membership.Status.DRAFT,
                "starts_at": "2026-08-01",
                "ends_at": "2026-08-31",
                "visit_limit": 8,
                "visits_used": 0,
                "price": "3500.00",
                "notes": "Ограниченный по времени",
                "client_id": self.client_record.id,
                "branch_id": self.branch.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)
        created_id = create_response.json()["id"]

        detail_response = self.http.get(
            f"/api/v1/memberships/{created_id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["title"], "Утренний пакет")

        update_response = self.http.patch(
            f"/api/v1/memberships/{created_id}/?company=sportmax",
            data={
                "title": "Утренний пакет 2.0",
                "status": Membership.Status.ACTIVE,
                "starts_at": "2026-08-01",
                "ends_at": "2026-09-01",
                "visit_limit": 10,
                "visits_used": 2,
                "price": "4500.00",
                "notes": "Обновлённые условия",
                "client_id": self.client_record.id,
                "branch_id": self.branch_second.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["branch_name"], "Pool")

        delete_response = self.http.delete(
            f"/api/v1/memberships/{created_id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(Membership.objects.filter(id=created_id).exists())
