from __future__ import annotations

from django.test import TestCase

from clients.models import Client
from companies.models import Company
from payments.models import Payment


class PaymentModelTest(TestCase):
    def test_payment_amount_must_be_positive(self) -> None:
        company = Company.objects.create(name="Fitness Club One")
        client = Client.objects.create(company=company, first_name="Иван", last_name="Петров", phone="+79990000001")

        with self.assertRaisesMessage(Exception, "Сумма платежа должна быть больше нуля."):
            Payment.objects.create(company=company, client=client, amount=0)
