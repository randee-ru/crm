from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from channels.models import MessengerIntegration, MessengerMessage, MessengerThread
from clients.models import Client, ClientMessage
from companies.models import Company


class MaxWebhookTest(TestCase):
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
        MessengerIntegration.objects.create(
            company=self.company,
            provider="max",
            bot_token="test-token",
            webhook_secret="secret-123",
            is_active=True,
        )

    def test_inbound_message_creates_thread_client_message_and_links_client(self) -> None:
        payload = {
            "update_type": "message_created",
            "timestamp": 1710700000000,
            "message": {
                "sender": {
                    "user_id": 12345,
                    "first_name": "Иван",
                    "phone": "+79991112233",
                    "is_bot": False,
                },
                "recipient": {"chat_id": 67890, "chat_type": "dialog"},
                "timestamp": 1710700000000,
                "body": {"mid": "mid.abc123", "text": "Привет из MAX"},
            },
        }

        response = self.http.post(
            "/api/channels/webhooks/max?company=sportmax",
            data=payload,
            content_type="application/json",
            HTTP_X_MAX_BOT_API_SECRET="secret-123",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

        thread = MessengerThread.objects.get(external_chat_id="67890")
        self.assertEqual(thread.provider, "max")
        self.assertEqual(thread.client_id, self.client_record.id)
        self.assertEqual(thread.contact_name, "Иван")

        message = MessengerMessage.objects.get(thread=thread)
        self.assertEqual(message.body, "Привет из MAX")
        self.assertEqual(message.direction, "inbound")

        client_message = ClientMessage.objects.get(external_key="channels:max:mid.abc123")
        self.assertEqual(client_message.client_id, self.client_record.id)
        self.assertEqual(client_message.channel, "max")
        self.assertEqual(client_message.body, "Привет из MAX")

    def test_rejects_invalid_secret(self) -> None:
        payload = {"update_type": "bot_started", "chat_id": 1}
        response = self.http.post(
            "/api/channels/webhooks/max?company=sportmax",
            data=payload,
            content_type="application/json",
            HTTP_X_MAX_BOT_API_SECRET="wrong",
        )
        self.assertEqual(response.status_code, 403)


class MessengerApiTest(TestCase):
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
        MessengerIntegration.objects.create(
            company=self.company,
            provider="max",
            bot_token="test-token",
            is_active=True,
        )
        self.thread = MessengerThread.objects.create(
            company=self.company,
            provider="max",
            external_chat_id="67890",
            external_user_id="12345",
            chat_type="dialog",
            contact_name="Иван",
        )

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_list_threads(self) -> None:
        response = self.http.get(
            "/api/v1/channels/threads/?company=sportmax&provider=max",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["contact_name"], "Иван")

    @patch("channels.services.send_max_message")
    def test_send_message(self, send_mock) -> None:
        send_mock.return_value = {
            "message": {"body": {"mid": "mid.out.1", "text": "Ответ оператора"}},
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
