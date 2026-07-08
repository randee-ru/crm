from __future__ import annotations

import json

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from crm.models import Deal, DealPipeline, DealStage, Task
from messaging.models import ChatMessage, ChatRoom
from notifications.emitters import notify_call_ringing
from notifications.models import Notification
from telephony.models import CallLog, TelephonyIntegration

User = get_user_model()


class NotificationEmittersTest(TestCase):
    def setUp(self) -> None:
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        self.user = User.objects.create_user(username="manager", password="admin12345")
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
            phone="79647873586",
        )

    def test_notify_call_ringing_with_client(self) -> None:
        notification = notify_call_ringing(
            self.company,
            caller_phone="79647873586",
            line_name="Ресепшен",
            entry_id="entry-1",
        )
        self.assertIsNotNone(notification)
        assert notification is not None
        self.assertEqual(notification.title, "Входящий звонок")
        self.assertIn("Петров", notification.body)
        self.assertEqual(notification.payload["event"], "call.ringing")
        self.assertEqual(notification.payload["client_id"], self.client_record.id)
        self.assertEqual(notification.target_url, f"/dashboard/clients/{self.client_record.id}")

    def test_notify_call_ringing_dedupes(self) -> None:
        first = notify_call_ringing(
            self.company,
            caller_phone="79001112233",
            entry_id="entry-dup",
        )
        second = notify_call_ringing(
            self.company,
            caller_phone="79001112233",
            entry_id="entry-dup",
        )
        self.assertIsNotNone(first)
        self.assertIsNone(second)

    def test_incoming_call_log_creates_notification(self) -> None:
        from django.utils import timezone

        CallLog.objects.create(
            company=self.company,
            client=self.client_record,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone="79647873586",
            started_at=timezone.now(),
            duration=95,
            line_name="Mango Office",
        )
        self.assertTrue(
            Notification.objects.filter(
                company=self.company,
                payload__event="call.answered",
            ).exists()
        )

    def test_chat_message_creates_notification(self) -> None:
        room = ChatRoom.objects.create(
            company=self.company,
            title="Общий чат",
            slug="general",
        )
        ChatMessage.objects.create(room=room, author=self.user, body="Привет, команда!")
        self.assertTrue(
            Notification.objects.filter(
                company=self.company,
                payload__event="message.new",
            ).exists()
        )

    def test_task_created_notification(self) -> None:
        Task.objects.create(
            company=self.company,
            title="Позвонить клиенту",
            assigned_to=self.user,
        )
        self.assertTrue(
            Notification.objects.filter(
                company=self.company,
                payload__event="task.created",
            ).exists()
        )


class MangoWebhookTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        TelephonyIntegration.objects.create(
            company=self.company,
            provider=TelephonyIntegration.Provider.MANGO,
            api_key="test-key",
            api_secret="test-salt",
            webhook_secret="test-salt",
            is_active=True,
        )

    def test_mango_webhook_creates_ringing_notification(self) -> None:
        payload = {
            "call_state": "Appeared",
            "from": {"number": "79001234567"},
            "to": {"number": "sip:reception@vpbx"},
            "entry_id": "entry-webhook-1",
            "location": "Ресепшен",
        }
        payload_json = json.dumps(payload, separators=(",", ":"))
        import hashlib

        sign = hashlib.sha256(f"test-key{payload_json}test-salt".encode()).hexdigest()
        for url in (
            "/api/v1/telephony/webhooks/mango/?company=sportmax",
            "/api/mango/callback",
        ):
            Notification.objects.all().delete()
            response = self.http.post(
                url,
                data={"json": payload_json, "sign": sign, "vpbx_api_key": "test-key"},
            )
            self.assertEqual(response.status_code, 200, msg=url)
            self.assertTrue(
                Notification.objects.filter(
                    company=self.company,
                    payload__event="call.ringing",
                ).exists(),
                msg=url,
            )

    def test_mango_callback_connection_check(self) -> None:
        response = self.http.get("/api/mango/callback")
        self.assertEqual(response.status_code, 200)

        response = self.http.post("/api/mango/callback", data={"vpbx_api_key": "test-key"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("status"), "ok")
