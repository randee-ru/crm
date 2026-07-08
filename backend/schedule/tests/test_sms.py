from __future__ import annotations

from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from schedule.sms import resolve_sms_ru_credentials, send_sms_via_sms_ru


class SmsRuSendTests(SimpleTestCase):
    @patch("schedule.sms.request.urlopen")
    def test_send_without_sender_omits_from_param(self, urlopen_mock: MagicMock) -> None:
        response = MagicMock()
        response.read.return_value = (
            b'{"status":"OK","status_code":100,'
            b'"sms":{"79991112233":{"status":"OK","status_code":100}}}'
        )
        urlopen_mock.return_value.__enter__.return_value = response

        send_sms_via_sms_ru(
            api_id="test-api-id",
            phone="+79991112233",
            message="Код для записи: 1234",
            sender="",
            user_ip="8.8.8.8",
        )

        request_obj = urlopen_mock.call_args[0][0]
        body = request_obj.data.decode("utf-8")
        self.assertIn("api_id=test-api-id", body)
        self.assertIn("to=79991112233", body)
        self.assertNotIn("from=", body)

    @override_settings(SMS_RU_API_ID="env-api-id")
    def test_resolve_credentials_falls_back_to_env(self) -> None:
        company = MagicMock()
        with patch("schedule.sms.get_primary_sms_integration", return_value=None):
            credentials = resolve_sms_ru_credentials(company)
        self.assertEqual(credentials, ("env-api-id", ""))

    def test_resolve_credentials_prefers_integration(self) -> None:
        company = MagicMock()
        integration = MagicMock()
        integration.api_key = "db-api-id"
        integration.sender_name = ""
        with patch("schedule.sms.get_primary_sms_integration", return_value=integration):
            credentials = resolve_sms_ru_credentials(company)
        self.assertEqual(credentials, ("db-api-id", ""))
