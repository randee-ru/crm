from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company
from telephony.click_to_call import click_to_call, resolve_click_to_call_extension
from telephony.mango_client import MangoConfig
from telephony.models import TelephonyIntegration

User = get_user_model()


class ClickToCallTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = User.objects.create_user(username="manager", password="admin12345", email="manager@test.ru")
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.MANAGER,
        )
        self.token = Token.objects.create(user=self.user)
        TelephonyIntegration.objects.create(
            company=self.company,
            provider=TelephonyIntegration.Provider.MANGO,
            api_key="test-key",
            api_secret="test-salt",
            is_active=True,
            settings={"click_to_call_extension": "4", "click_to_call_line": "74951203639"},
        )

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    @patch("telephony.click_to_call.initiate_mango_callback")
    def test_click_to_call_api(self, mock_initiate) -> None:
        mock_initiate.return_value = {"result": 1000}
        response = self.http.post(
            "/api/v1/telephony/calls/click-to-call/?company=sportmax",
            data={"phone": "+7 (980) 186-15-36"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["extension"], "4")
        self.assertEqual(payload["to_number"], "79801861536")
        mock_initiate.assert_called_once()

    def test_resolve_extension_from_settings(self) -> None:
        integration = TelephonyIntegration.objects.get(company=self.company)
        config = MangoConfig(api_key="test-key", api_salt="test-salt")
        extension = resolve_click_to_call_extension(integration, self.user, config)
        self.assertEqual(extension, "4")

    @patch("telephony.click_to_call.initiate_mango_callback")
    def test_click_to_call_service(self, mock_initiate) -> None:
        mock_initiate.return_value = {"result": 1000}
        result = click_to_call(self.company, self.user, phone="79801861536")
        self.assertEqual(result["extension"], "4")
        self.assertEqual(result["to_number"], "79801861536")
