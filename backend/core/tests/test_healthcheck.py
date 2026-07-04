from __future__ import annotations

from django.test import Client, TestCase


class HealthcheckTest(TestCase):
    def test_healthcheck_returns_ok(self) -> None:
        # Проверяем контракт самого простого endpoint'а,
        # чтобы сразу заметить поломку запуска backend.
        response = Client().get("/health/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["service"], "crm-kit")
