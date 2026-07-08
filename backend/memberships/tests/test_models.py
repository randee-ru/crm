from __future__ import annotations

from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from memberships.models import Membership


class MembershipModelTest(TestCase):
    def test_membership_tracks_client_and_remaining_visits(self) -> None:
        # Проверяем типичный сценарий: у клиента есть абонемент,
        # у него есть лимит, и мы можем посчитать остаток посещений.
        company = Company.objects.create(name="Fitness Club One")
        branch = Branch.objects.create(company=company, name="Main Hall")
        client = Client.objects.create(
            company=company,
            branch=branch,
            first_name="Anna",
            last_name="Petrova",
            phone="+79990001122",
        )

        membership = Membership.objects.create(
            company=company,
            branch=branch,
            client=client,
            title="Monthly 12 visits",
            status=Membership.Status.ACTIVE,
            starts_at=date(2026, 7, 1),
            ends_at=date(2026, 7, 31),
            visit_limit=12,
            visits_used=3,
            price="4990.00",
        )

        self.assertEqual(str(membership), "Petrova Anna — Monthly 12 visits")
        self.assertEqual(membership.remaining_visits, 9)

    def test_membership_rejects_client_from_other_company(self) -> None:
        # Проверяем SaaS-границу: абонемент не должен ссылаться на клиента
        # из другой компании.
        company_one = Company.objects.create(name="Fitness Club One")
        company_two = Company.objects.create(name="Fitness Club Two")
        branch = Branch.objects.create(company=company_one, name="Main Hall")
        client = Client.objects.create(
            company=company_two,
            first_name="Ivan",
            last_name="Sidorov",
            phone="+79990003344",
        )

        membership = Membership(
            company=company_one,
            branch=branch,
            client=client,
            title="Monthly Unlimited",
            status=Membership.Status.ACTIVE,
            starts_at=date(2026, 7, 1),
            ends_at=date(2026, 7, 31),
            price="6990.00",
        )

        with self.assertRaises(ValidationError):
            membership.full_clean()

