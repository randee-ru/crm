from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company


class CompanyMembershipModelTest(TestCase):
    def test_membership_links_user_company_and_branch(self) -> None:
        # Проверяем, что доступ пользователя всегда хранится через компанию,
        # а не просто "в воздухе". Это основа SaaS-ограничений.
        user = get_user_model().objects.create_user(
            username="john.doe",
            password="strong-password",
        )
        company = Company.objects.create(name="Fitness Club One")
        branch = Branch.objects.create(company=company, name="Main Hall")

        membership = CompanyMembership.objects.create(
            user=user,
            company=company,
            branch=branch,
            role=CompanyMembership.Role.ADMIN,
        )

        self.assertEqual(str(membership), f"{user} -> {company} (admin)")
        self.assertEqual(company.memberships.count(), 1)
        self.assertEqual(user.company_memberships.count(), 1)

