from __future__ import annotations

from django.test import TestCase

from branches.models import Branch
from companies.models import Company
from employees.models import Trainer


class TrainerModelTest(TestCase):
    def test_trainer_branch_must_belong_to_company(self) -> None:
        company_one = Company.objects.create(name="Fitness Club One")
        company_two = Company.objects.create(name="Fitness Club Two")
        branch = Branch.objects.create(company=company_two, name="Main Hall")

        with self.assertRaisesMessage(Exception, "Филиал должен принадлежать той же компании, что и тренер."):
            Trainer.objects.create(
                company=company_one,
                branch=branch,
                first_name="Анна",
                last_name="Тренерова",
                phone="+79990000001",
            )
