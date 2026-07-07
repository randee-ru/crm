from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from payments.models import Payment
from sales.models import Sale


class PaymentApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(username="manager", password="admin12345")
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.MANAGER,
        )
        self.client_record = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Иван",
            last_name="Петров",
            phone="+79991112233",
        )
        self.sale = Sale.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Абонемент",
            status=Sale.Status.COMPLETED,
            total_amount=10000,
            discount_amount=1000,
            paid_amount=9000,
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_payment_create_and_list(self) -> None:
        create_response = self.http.post(
            "/api/v1/payments/?company=sportmax",
            data={
                "amount": "9000",
                "method": Payment.Method.CARD,
                "status": Payment.Status.SUCCEEDED,
                "client_id": self.client_record.id,
                "branch_id": self.branch.id,
                "sale_id": self.sale.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)

        list_response = self.http.get("/api/v1/payments/?company=sportmax", **self.auth_headers())
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)
