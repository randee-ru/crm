from __future__ import annotations

from django.test import Client, TestCase


class HealthcheckTest(TestCase):
    def test_healthcheck_returns_ok(self) -> None:
        response = Client().get("/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

