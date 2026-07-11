from __future__ import annotations

from datetime import date, datetime, timedelta
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company
from telephony.background_sync import run_telephony_sync_cycle
from telephony.mango_client import MangoRateLimitError
from telephony.models import TelephonyIntegration
from telephony.services import sync_mango_calls


class TelephonyBackgroundSyncTest(TestCase):
    def setUp(self) -> None:
        self.user = get_user_model().objects.create_user(username="manager", password="admin12345")
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.MANAGER,
        )
        TelephonyIntegration.objects.create(
            company=self.company,
            provider=TelephonyIntegration.Provider.MANGO,
            api_key="api-key",
            api_secret="api-secret",
            is_active=True,
        )

    @patch("telephony.background_sync.purge_old_recordings", return_value=1)
    @patch("telephony.background_sync.archive_pending_recordings", return_value=(2, 0))
    @patch("telephony.background_sync.sync_mango_calls")
    def test_run_cycle_syncs_mango_companies_and_archives_recordings(
        self,
        sync_mock: MagicMock,
        archive_mock: MagicMock,
        purge_mock: MagicMock,
    ) -> None:
        integration = TelephonyIntegration.objects.get(company=self.company)
        sync_mock.return_value = (5, integration, 3)

        totals = run_telephony_sync_cycle(lookback_days=4, archive_limit=7)

        sync_mock.assert_called_once()
        called_company = sync_mock.call_args.args[0]
        today = timezone.localdate()
        self.assertEqual(called_company.slug, "sportmax")
        self.assertEqual(sync_mock.call_args.kwargs["date_from"].isoformat(), (today - timedelta(days=4)).isoformat())
        self.assertEqual(sync_mock.call_args.kwargs["date_to"].isoformat(), today.isoformat())
        archive_mock.assert_called_once()
        purge_mock.assert_called_once()
        self.assertEqual(totals["companies"], 1)
        self.assertEqual(totals["synced"], 5)
        self.assertEqual(totals["archive_queued"], 3)
        self.assertEqual(totals["archived"], 2)
        self.assertEqual(totals["failed"], 0)
        self.assertEqual(totals["purged"], 1)

    @patch("telephony.background_sync.purge_old_recordings", return_value=1)
    @patch("telephony.background_sync.archive_pending_recordings", return_value=(2, 0))
    @patch("telephony.background_sync.sync_mango_calls")
    def test_run_cycle_skips_rate_limit_like_errors_without_marking_failure(
        self,
        sync_mock: MagicMock,
        archive_mock: MagicMock,
        purge_mock: MagicMock,
    ) -> None:
        sync_mock.side_effect = RuntimeError(
            'Mango Office API error: 429 {"name":"Too Many Requests","message":"Total rate limit exceeded"}'
        )

        totals = run_telephony_sync_cycle(lookback_days=4, archive_limit=7)

        self.assertEqual(totals["companies"], 1)
        self.assertEqual(totals["synced"], 0)
        self.assertEqual(totals["archive_queued"], 0)
        self.assertEqual(totals["archived"], 0)
        self.assertEqual(totals["failed"], 0)
        self.assertEqual(totals["purged"], 0)
        archive_mock.assert_not_called()
        purge_mock.assert_not_called()

    @patch("telephony.background_sync.purge_old_recordings", return_value=1)
    @patch("telephony.background_sync.archive_pending_recordings", return_value=(2, 0))
    @patch("telephony.background_sync.sync_mango_calls")
    def test_run_cycle_skips_explicit_mango_rate_limit_without_traceback(
        self,
        sync_mock: MagicMock,
        archive_mock: MagicMock,
        purge_mock: MagicMock,
    ) -> None:
        sync_mock.side_effect = MangoRateLimitError("Mango Office API error: 429", retry_after_seconds=120)

        totals = run_telephony_sync_cycle(lookback_days=4, archive_limit=7)

        self.assertEqual(totals["companies"], 1)
        self.assertEqual(totals["synced"], 0)
        self.assertEqual(totals["archive_queued"], 0)
        self.assertEqual(totals["archived"], 0)
        self.assertEqual(totals["failed"], 0)
        self.assertEqual(totals["purged"], 0)
        archive_mock.assert_not_called()
        purge_mock.assert_not_called()

    @patch("telephony.services.fetch_mango_line_directory", return_value={})
    @patch("telephony.services.get_mango_calls")
    def test_sync_mango_calls_sets_cooldown_on_rate_limit(self, get_calls_mock: MagicMock, _line_directory_mock: MagicMock) -> None:
        get_calls_mock.side_effect = MangoRateLimitError("Mango Office API error: 429", retry_after_seconds=120)

        synced, integration, archive_queued = sync_mango_calls(
            self.company,
            date_from=date(2026, 7, 1),
            date_to=date(2026, 7, 2),
        )

        self.assertEqual(synced, 0)
        self.assertEqual(archive_queued, 0)
        self.assertIsNotNone(integration.settings.get("mango_sync_cooldown_until"))
        self.assertIsNone(integration.last_synced_at)
        self.assertLess(timezone.now(), datetime.fromisoformat(integration.settings["mango_sync_cooldown_until"]))
        self.assertEqual(get_calls_mock.call_count, 1)

    @patch("telephony.services.get_mango_calls")
    @patch("telephony.services.fetch_mango_line_directory")
    def test_sync_mango_calls_sets_cooldown_when_directory_fetch_is_rate_limited(
        self,
        fetch_directory_mock: MagicMock,
        get_calls_mock: MagicMock,
    ) -> None:
        fetch_directory_mock.side_effect = MangoRateLimitError("Mango Office API error: 429", retry_after_seconds=90)

        synced, integration, archive_queued = sync_mango_calls(
            self.company,
            date_from=date(2026, 7, 1),
            date_to=date(2026, 7, 2),
        )

        self.assertEqual(synced, 0)
        self.assertEqual(archive_queued, 0)
        self.assertIsNotNone(integration.settings.get("mango_sync_cooldown_until"))
        self.assertIsNone(integration.last_synced_at)
        self.assertLess(timezone.now(), datetime.fromisoformat(integration.settings["mango_sync_cooldown_until"]))
        self.assertEqual(get_calls_mock.call_count, 0)

    @patch("telephony.services.fetch_mango_line_directory", return_value={})
    @patch("telephony.services.get_mango_calls")
    def test_sync_mango_calls_skips_mango_when_cooldown_is_active(self, get_calls_mock: MagicMock, _line_directory_mock: MagicMock) -> None:
        integration = TelephonyIntegration.objects.get(company=self.company)
        integration.settings = {
            "mango_sync_cooldown_until": (timezone.now() + timedelta(minutes=10)).isoformat(),
        }
        integration.save(update_fields=["settings", "updated_at"])

        synced, refreshed_integration, archive_queued = sync_mango_calls(
            self.company,
            date_from=date(2026, 7, 1),
            date_to=date(2026, 7, 2),
        )

        self.assertEqual(synced, 0)
        self.assertEqual(archive_queued, 0)
        self.assertFalse(get_calls_mock.called)
        self.assertEqual(
            refreshed_integration.settings["mango_sync_cooldown_until"],
            integration.settings["mango_sync_cooldown_until"],
        )
