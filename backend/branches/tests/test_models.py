from __future__ import annotations

from django.test import TestCase

from branches.models import Branch
from companies.models import Company


class BranchModelTest(TestCase):
    def test_branch_belongs_to_company_and_generates_slug(self) -> None:
        # Проверяем, что филиал нельзя воспринимать отдельно от компании:
        # связь tenant -> branch должна быть явной.
        company = Company.objects.create(name="Fitness Club One")
        branch = Branch.objects.create(company=company, name="Main Hall")

        self.assertEqual(branch.slug, "main-hall")
        self.assertEqual(str(branch), "Fitness Club One / Main Hall")
        self.assertEqual(company.branches.count(), 1)

