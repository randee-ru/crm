from __future__ import annotations

import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from channels.models import MessengerAccount, MessengerMessage, MessengerThread
from clients.models import Client, ClientMessage
from companies.models import Company


class GatewayInboundTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        self.client_record = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Иван",
            last_name="Петров",
            phone="+79991112233",
        )
        self.account = MessengerAccount.objects.create(
            company=self.company,
            provider="whatsapp",
            gateway_session_id="sportmax__whatsapp__abcd1234",
            label="WhatsApp",
            status=MessengerAccount.Status.READY,
            is_active=True,
        )

    def _signed_post(self, payload: dict) -> object:
        import hmac
        from hashlib import sha256

        from django.conf import settings

        body = json.dumps(payload).encode("utf-8")
        sign = hmac.new(settings.MESSENGER_GATEWAY_SECRET.encode(), body, sha256).hexdigest()
        return self.http.post(
            "/api/v1/channels/gateway/inbound/",
            data=body,
            content_type="application/json",
            HTTP_X_GATEWAY_SECRET=sign,
        )

    def test_inbound_message_creates_thread_and_client_message(self) -> None:
        payload = {
            "event": "message.inbound",
            "company_slug": "sportmax",
            "provider": "whatsapp",
            "session_id": "sportmax__whatsapp__abcd1234",
            "external_chat_id": "79991112233@s.whatsapp.net",
            "external_message_id": "msg-1",
            "contact_phone": "79991112233",
            "contact_name": "Иван",
            "body": "Привет из WhatsApp",
            "sent_at": "2026-07-07T12:00:00+00:00",
        }
        response = self._signed_post(payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

        thread = MessengerThread.objects.get(external_chat_id="79991112233@s.whatsapp.net")
        self.assertEqual(thread.provider, "whatsapp")
        self.assertEqual(thread.account_id, self.account.id)
        self.assertEqual(thread.client_id, self.client_record.id)

        message = MessengerMessage.objects.get(thread=thread)
        self.assertEqual(message.body, "Привет из WhatsApp")
        self.assertEqual(message.direction, "inbound")

        client_message = ClientMessage.objects.get(external_key="channels:whatsapp:msg-1")
        self.assertEqual(client_message.client_id, self.client_record.id)

    def test_rejects_invalid_signature(self) -> None:
        payload = {"event": "message.inbound", "company_slug": "sportmax"}
        response = self.http.post(
            "/api/v1/channels/gateway/inbound/",
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_X_GATEWAY_SECRET="bad",
        )
        self.assertEqual(response.status_code, 403)


class GatewayApiTest(TestCase):
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
        self.token = Token.objects.create(user=self.user)
        self.account = MessengerAccount.objects.create(
            company=self.company,
            provider="telegram",
            gateway_session_id="sportmax__telegram__abcd5678",
            label="Telegram",
            status=MessengerAccount.Status.READY,
            is_active=True,
        )
        self.thread = MessengerThread.objects.create(
            company=self.company,
            provider="telegram",
            external_chat_id="12345",
            contact_name="Иван",
            account=self.account,
        )

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    @patch("channels.gateway_services.get_gateway_client")
    def test_create_gateway_account(self, client_mock) -> None:
        gateway = client_mock.return_value
        gateway.create_session.return_value = {
            "id": "sportmax__whatsapp__new1",
            "status": "qr",
            "phone": "",
            "error": "",
            "qr_data_url": "data:image/png;base64,abc",
        }
        response = self.http.post(
            "/api/v1/channels/gateway/accounts/?company=sportmax",
            data={"provider": "whatsapp", "label": "WA"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "qr")
        self.assertTrue(MessengerAccount.objects.filter(gateway_session_id="sportmax__whatsapp__new1").exists())

    @patch("channels.gateway_services.get_gateway_client")
    def test_refresh_account_status(self, client_mock) -> None:
        pending = MessengerAccount.objects.create(
            company=self.company,
            provider="whatsapp",
            gateway_session_id="sportmax__whatsapp__pending",
            status=MessengerAccount.Status.QR,
            is_active=True,
        )
        gateway = client_mock.return_value
        gateway.get_session.return_value = {
            "id": pending.gateway_session_id,
            "status": "ready",
            "phone": "79990001122",
            "error": "",
            "qr_data_url": "",
        }
        response = self.http.get(
            f"/api/v1/channels/gateway/accounts/{pending.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ready")
        pending.refresh_from_db()
        self.assertEqual(pending.status, MessengerAccount.Status.READY)

    @patch("channels.gateway_services.get_gateway_client")
    def test_create_max_gateway_account(self, client_mock) -> None:
        gateway = client_mock.return_value
        gateway.create_session.return_value = {
            "id": "sportmax__max__new1",
            "status": "qr",
            "phone": "",
            "error": "",
            "qr_data_url": "data:image/png;base64,abc",
        }
        response = self.http.post(
            "/api/v1/channels/gateway/accounts/?company=sportmax",
            data={"provider": "max", "label": "MAX", "phone": "+79991234567"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "qr")
        self.assertTrue(MessengerAccount.objects.filter(gateway_session_id="sportmax__max__new1").exists())

    @patch("channels.gateway_services.get_gateway_client")
    def test_submit_max_code(self, client_mock) -> None:
        pending = MessengerAccount.objects.create(
            company=self.company,
            provider="max",
            gateway_session_id="sportmax__max__pending",
            status=MessengerAccount.Status.CODE_REQUIRED,
            is_active=True,
        )
        gateway = client_mock.return_value
        gateway.submit_max_code.return_value = {
            "id": pending.gateway_session_id,
            "status": "ready",
            "phone": "79990001122",
            "error": "",
            "qr_data_url": "",
        }
        response = self.http.post(
            f"/api/v1/channels/gateway/accounts/{pending.id}/max-code/?company=sportmax",
            data={"code": "12345"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ready")
        pending.refresh_from_db()
        self.assertEqual(pending.status, MessengerAccount.Status.READY)

    @patch("channels.gateway_services.send_via_gateway")
    def test_send_max_message_via_gateway(self, send_mock) -> None:
        max_account = MessengerAccount.objects.create(
            company=self.company,
            provider="max",
            gateway_session_id="sportmax__max__ready1",
            label="MAX",
            status=MessengerAccount.Status.READY,
            is_active=True,
        )
        max_thread = MessengerThread.objects.create(
            company=self.company,
            provider="max",
            external_chat_id="98765",
            contact_name="Клиент",
            account=max_account,
        )
        send_mock.return_value = {
            "external_message_id": "max-out-1",
            "external_chat_id": "98765",
        }
        response = self.http.post(
            f"/api/v1/channels/threads/{max_thread.id}/messages/?company=sportmax",
            data={"body": "Ответ через MAX"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["body"], "Ответ через MAX")
        send_mock.assert_called_once()

    @patch("channels.gateway_services.send_via_gateway")
    def test_send_message_via_gateway(self, send_mock) -> None:
        send_mock.return_value = {
            "external_message_id": "out-1",
            "external_chat_id": "12345",
        }
        response = self.http.post(
            f"/api/v1/channels/threads/{self.thread.id}/messages/?company=sportmax",
            data={"body": "Ответ оператора"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["body"], "Ответ оператора")
        send_mock.assert_called_once()
        self.assertTrue(
            MessengerMessage.objects.filter(
                thread=self.thread,
                direction="outbound",
                body="Ответ оператора",
            ).exists(),
        )
