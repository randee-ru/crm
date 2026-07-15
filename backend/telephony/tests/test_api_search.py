from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from telephony.models import CallLog


class TelephonySearchApiTest(TestCase):
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

        self.client_record = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Александра",
            last_name="Цыганкова",
            middle_name="Дмитриевна",
            phone="+7 (910) 486-11-40",
            email="lexiko@internet.ru",
        )
        CallLog.objects.create(
            company=self.company,
            client=self.client_record,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone="+7 (910) 486-11-40",
            target_phone="74951203639",
            line_name="Менеджеры",
            started_at=timezone.now(),
            duration=120,
            external_id="call-1",
        )

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_call_log_search_matches_client_name(self) -> None:
        response = self.http.get(
            "/api/v1/telephony/calls/?company=sportmax&search=Цыганкова",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["client_name"], "Цыганкова Александра Дмитриевна")

    def test_call_log_search_matches_digits_only_phone(self) -> None:
        response = self.http.get(
            "/api/v1/telephony/calls/?company=sportmax&search=79104861140",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["client_id"], self.client_record.id)
