from __future__ import annotations

import io
from datetime import date, datetime, timezone as dt_timezone
from unittest.mock import MagicMock, patch
import urllib.error

from django.test import SimpleTestCase

from telephony.mango_client import MangoConfig, MangoRateLimitError, request_mango_stats


class MangoClientTest(SimpleTestCase):
    @patch("telephony.mango_client.timezone.now")
    @patch("telephony.mango_client.call_mango_api")
    def test_request_mango_stats_caps_today_to_current_moment(
        self,
        call_mango_api_mock: MagicMock,
        now_mock: MagicMock,
    ) -> None:
        now_mock.return_value = datetime(2026, 7, 9, 14, 15, 0, tzinfo=dt_timezone.utc)
        call_mango_api_mock.return_value = {"result": 0, "key": "stats-key"}

        config = MangoConfig(api_key="api-key", api_salt="api-salt")
        request_mango_stats(config, date(2026, 7, 8), date(2026, 7, 9))

        payload = call_mango_api_mock.call_args.args[2]
        self.assertEqual(payload["date_from"], str(int(datetime(2026, 7, 8, 0, 0, tzinfo=dt_timezone.utc).timestamp())))
        self.assertEqual(payload["date_to"], str(int(datetime(2026, 7, 9, 14, 15, tzinfo=dt_timezone.utc).timestamp())))

    @patch("telephony.mango_client.urllib.request.urlopen")
    def test_call_mango_api_translates_rate_limit_to_dedicated_error(self, urlopen_mock: MagicMock) -> None:
        urlopen_mock.side_effect = urllib.error.HTTPError(
            "https://app.mango-office.ru/vpbx/stats/request",
            429,
            "Too Many Requests",
            {"Retry-After": "120"},
            io.BytesIO(
                b'{"name":"Too Many Requests","message":"Total rate limit exceeded for action vpbx/stats/request"}'
            ),
        )

        config = MangoConfig(api_key="api-key", api_salt="api-salt")

        with self.assertRaises(MangoRateLimitError) as context:
            request_mango_stats(config, date(2026, 7, 8), date(2026, 7, 9))

        self.assertEqual(context.exception.retry_after_seconds, 120)
        self.assertIn("Total rate limit exceeded", str(context.exception))
