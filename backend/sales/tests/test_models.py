from __future__ import annotations

from django.test import TestCase

from clients.models import Client
from companies.models import Company
from sales.models import Sale


class SaleModelTest(TestCase):
    def test_sale_balance_due_uses_discount_and_paid_amount(self) -> None:
        company = Company.objects.create(name="Fitness Club One")
        client = Client.objects.create(company=company, first_name="Иван", last_name="Петров", phone="+79990000001")
        sale = Sale.objects.create(
            company=company,
            client=client,
            title="Абонемент",
            total_amount=10000,
            discount_amount=1000,
            paid_amount=3000,
        )

        self.assertEqual(sale.balance_due, 6000)
