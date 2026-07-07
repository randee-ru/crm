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
from memberships.models import Membership


class ClientListApiTest(TestCase):
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
            birth_date="1990-05-12",
        )
        Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Пробный месяц",
            status=Membership.Status.ACTIVE,
            starts_at=timezone.localdate(),
            ends_at=timezone.localdate() + timedelta(days=10),
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_client_list_requires_authentication(self) -> None:
        response = self.http.get("/api/v1/clients/?company=sportmax")
        self.assertEqual(response.status_code, 401)

    def test_client_list_returns_company_clients(self) -> None:
        response = self.http.get(
            "/api/v1/clients/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["full_name"], "Иван Петров")
        self.assertEqual(payload["results"][0]["membership_status"], "active")
        self.assertEqual(payload["results"][0]["birth_date"], "1990-05-12")
        self.assertIsNotNone(payload["results"][0]["membership_end"])

    def test_client_list_supports_search_filter(self) -> None:
        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Орлова",
            phone="+79992223344",
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&search=Орлова",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["full_name"], "Мария Орлова")

    def test_client_list_ignores_short_search(self) -> None:
        response = self.http.get(
            "/api/v1/clients/?company=sportmax&search=Пе",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "Иван Петров")

    def test_client_list_supports_client_status_filter(self) -> None:
        self.client_record.client_status = "active"
        self.client_record.client_status_label = "Действующий"
        self.client_record.save()

        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Орлова",
            phone="+79992223344",
            client_status="former",
            client_status_label="Бывший член клуба",
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&client_status=active",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["client_status"], "active")

    def test_client_list_supports_birth_date_range_filter(self) -> None:
        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Орлова",
            phone="+79992223344",
            birth_date="1985-03-02",
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&birth_date_from=1989-01-01&birth_date_to=1991-12-31",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "Иван Петров")

    def test_client_list_supports_membership_expiry_filter(self) -> None:
        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Светлана",
            last_name="Кузнецова",
            phone="+79994445566",
        )
        Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=Client.objects.get(phone="+79994445566"),
            title="Долгий абонемент",
            status=Membership.Status.ACTIVE,
            starts_at=timezone.localdate(),
            ends_at=timezone.localdate() + timedelta(days=90),
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&membership_expires_in_days=30",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "Иван Петров")

    def test_client_list_pagination(self) -> None:
        for index in range(5):
            Client.objects.create(
                company=self.company,
                branch=self.branch,
                first_name=f"Клиент{index}",
                last_name="Тестов",
                phone=f"+799900000{index:02d}",
            )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&page=1",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 6)
        self.assertEqual(len(payload["results"]), 6)
        self.assertIsNone(payload["previous"])

    def test_company_context_returns_tenant_summary(self) -> None:
        response = self.http.get(
            "/api/v1/company/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["slug"], "sportmax")
        self.assertEqual(payload["clients_count"], 1)

    def test_client_create_adds_new_client(self) -> None:
        response = self.http.post(
            "/api/v1/clients/?company=sportmax",
            data={
                "first_name": "Елена",
                "last_name": "Климова",
                "phone": "+79993334455",
                "email": "elena@example.com",
                "branch_id": self.branch.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["full_name"], "Елена Климова")
        self.assertEqual(Client.objects.filter(company=self.company).count(), 2)

    def test_client_detail_and_update(self) -> None:
        detail_response = self.http.get(
            f"/api/v1/clients/{self.client_record.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["phone"], "+79991112233")

        update_response = self.http.patch(
            f"/api/v1/clients/{self.client_record.id}/?company=sportmax",
            data={"notes": "Нужен повторный звонок", "is_active": True},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(update_response.status_code, 200)
        self.client_record.refresh_from_db()
        self.assertEqual(self.client_record.notes, "Нужен повторный звонок")

    def test_branch_list_returns_company_branches(self) -> None:
        response = self.http.get(
            "/api/v1/branches/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["name"], "Main Hall")
