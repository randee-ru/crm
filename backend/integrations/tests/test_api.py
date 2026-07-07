from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company
from integrations.models import IntegrationEvent


class IntegrationsApiTest(TestCase):
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

    def test_webhook_creates_event(self) -> None:
        response = self.http.post(
            "/api/v1/integrations/webhooks/sigur/?company=sportmax",
            data={"event_type": "access.granted", "external_key": "abc-123"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(IntegrationEvent.objects.count(), 1)
        event = IntegrationEvent.objects.first()
        self.assertEqual(event.provider, "sigur")
        self.assertEqual(event.event_type, "access.granted")
