from __future__ import annotations

from unittest.mock import MagicMock, patch

from django.test import TestCase

from branches.models import Branch
from clients.models import Client, ClientMessage
from companies.models import Company
from schedule.sms import send_company_sms


class SmsClientLoggingTest(TestCase):
    def setUp(self) -> None:
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        self.client = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Иван",
            last_name="Петров",
            phone="+79991112233",
        )

    @patch("schedule.sms.request.urlopen")
    @patch("schedule.sms.get_primary_sms_integration")
    def test_send_company_sms_logs_client_message(self, integration_mock: MagicMock, urlopen_mock: MagicMock) -> None:
        integration = MagicMock()
        integration.api_key = "test-api-id"
        integration.sender_name = ""
        integration_mock.return_value = integration

        response = MagicMock()
        response.read.return_value = (
            b'{"status":"OK","status_code":100,'
            b'"sms":{"79991112233":{"status":"OK","status_code":100,"sms_id":"123456789"}}}'
        )
        urlopen_mock.return_value.__enter__.return_value = response

        sent = send_company_sms(
            self.company,
            "79991112233",
            "Код для сброса пароля: 1234",
            client=self.client,
            purpose="password_reset",
        )
        self.assertTrue(sent)

        message = ClientMessage.objects.get(client=self.client)
        self.assertEqual(message.message_type, "sms")
        self.assertEqual(message.channel, "sms_ru")
        self.assertEqual(message.kind, "outbound")
        self.assertEqual(message.source, "password_reset")
        self.assertEqual(message.external_key, "schedule:sms:123456789")
        self.assertIn("1234", message.body)

    @patch("schedule.sms.request.urlopen")
    @patch("schedule.sms.get_primary_sms_integration")
    def test_send_company_sms_resolves_client_by_phone(self, integration_mock: MagicMock, urlopen_mock: MagicMock) -> None:
        integration = MagicMock()
        integration.api_key = "test-api-id"
        integration.sender_name = ""
        integration_mock.return_value = integration

        response = MagicMock()
        response.read.return_value = (
            b'{"status":"OK","status_code":100,'
            b'"sms":{"79991112233":{"status":"OK","status_code":100,"sms_id":"987654321"}}}'
        )
        urlopen_mock.return_value.__enter__.return_value = response

        send_company_sms(
            self.company,
            "+79991112233",
            "Запись подтверждена",
            purpose="enrollment",
        )

        message = ClientMessage.objects.get(client=self.client)
        self.assertEqual(message.source, "enrollment")
