from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import CompanyMembership
from automation.models import AutomationEvent, AutomationRule
from automation.services import process_event
from branches.models import Branch
from companies.models import Company
from notifications.models import Notification


class AutomationApiTest(TestCase):
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

    def test_event_processing_creates_notification(self) -> None:
        AutomationRule.objects.create(
            company=self.company,
            name="Deal notification",
            event_type="deal.created",
            actions=[
                {
                    "kind": "notification",
                    "title": "Новая сделка",
                    "body": "Создана сделка payload.title",
                    "target_url": "/dashboard",
                }
            ],
        )
        event = AutomationEvent.objects.create(
            company=self.company,
            event_type="deal.created",
            payload={"title": "Абонемент VIP"},
        )

        process_event(event.id)

        self.assertTrue(Notification.objects.filter(company=self.company, title="Новая сделка").exists())
        event.refresh_from_db()
        self.assertEqual(event.status, AutomationEvent.Status.DONE)
