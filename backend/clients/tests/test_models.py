from __future__ import annotations

from django.test import TestCase

from branches.models import Branch
from clients.models import Client
from companies.models import Company


class ClientModelTest(TestCase):
    def test_client_belongs_to_company_and_formats_full_name(self) -> None:
        # Проверяем базовый сценарий фитнес-клуба:
        # клиент создаётся внутри конкретной компании и получает понятное имя.
        company = Company.objects.create(name="Fitness Club One")
        branch = Branch.objects.create(company=company, name="Main Hall")

        client = Client.objects.create(
            company=company,
            branch=branch,
            first_name="Anna",
            last_name="Petrova",
            phone="+79990001122",
        )

        self.assertEqual(client.full_name, "Petrova Anna")
        self.assertEqual(str(client), "Petrova Anna (+79990001122)")
        self.assertEqual(company.clients.count(), 1)

