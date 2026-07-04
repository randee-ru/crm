from __future__ import annotations

from django.test import TestCase

from companies.models import Company


class CompanyModelTest(TestCase):
    def test_company_generates_slug_automatically(self) -> None:
        # Проверяем, что новичку не обязательно вручную думать про slug:
        # модель сама создаёт читаемый идентификатор.
        company = Company.objects.create(name="Fitness Club One")

        self.assertEqual(company.slug, "fitness-club-one")
        self.assertEqual(str(company), "Fitness Club One")

