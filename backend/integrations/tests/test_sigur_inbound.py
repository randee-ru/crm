from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from attendance.models import AttendanceRecord
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from integrations.models import IntegrationConnection, IntegrationEvent


class SigurInboundApiTest(TestCase):
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
        self.connection = IntegrationConnection.objects.create(
            company=self.company,
            provider=IntegrationConnection.Provider.SIGUR,
            name="Турникет главный",
            status=IntegrationConnection.Status.ACTIVE,
            config={"proxy_inbound_key": "test-proxy-key"},
        )
        self.client_record = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Иван",
            last_name="Иванов",
            phone="+79001234567",
            card_number="A1B2C3D4",
        )

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_inbound_events_creates_attendance(self) -> None:
        payload = {
            "logs": [
                {
                    "logId": 100001,
                    "keyHex": "A1B2C3D4",
                    "accessPoint": 1,
                    "direction": 1,
                }
            ]
        }
        response = self.http.post(
            "/api/v1/integrations/sigur/inbound/events/?company=sportmax",
            data=payload,
            content_type="application/json",
            HTTP_X_SIGUR_PROXY_KEY="test-proxy-key",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["attendance_created"], 1)
        self.assertEqual(IntegrationEvent.objects.count(), 1)
        self.assertEqual(AttendanceRecord.objects.count(), 1)
        attendance = AttendanceRecord.objects.first()
        assert attendance is not None
        self.assertEqual(attendance.client_id, self.client_record.id)
        self.assertEqual(attendance.external_key, "sigur:100001")

    def test_inbound_events_rejects_invalid_key(self) -> None:
        response = self.http.post(
            "/api/v1/integrations/sigur/inbound/events/?company=sportmax",
            data={"logs": []},
            content_type="application/json",
            HTTP_X_SIGUR_PROXY_KEY="wrong",
        )
        self.assertEqual(response.status_code, 401)

    def test_connection_create_generates_proxy_key(self) -> None:
        response = self.http.post(
            "/api/v1/integrations/?company=sportmax",
            data={"provider": "sigur", "name": "Второй вход"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        config = response.json()["config"]
        self.assertTrue(str(config.get("proxy_inbound_key") or "").strip())
