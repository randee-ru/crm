from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company
from employees.models import Trainer


class TrainerApiTest(TestCase):
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
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_trainer_create_and_list(self) -> None:
        create_response = self.http.post(
            "/api/v1/trainers/?company=sportmax",
            data={
                "first_name": "Анна",
                "last_name": "Иванова",
                "phone": "+79990000001",
                "specialization": "Йога",
                "branch_id": self.branch.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)

        list_response = self.http.get("/api/v1/trainers/?company=sportmax", **self.auth_headers())
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)
        self.assertEqual(list_response.json()[0]["full_name"], "Анна Иванова")

    def test_trainer_update_and_delete(self) -> None:
        trainer = Trainer.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Анна",
            last_name="Иванова",
            phone="+79990000001",
            specialization="Йога",
        )

        update_response = self.http.patch(
            f"/api/v1/trainers/{trainer.id}/?company=sportmax",
            data={
                "first_name": "Анна",
                "last_name": "Иванова",
                "phone": "+79990000001",
                "email": "anna@club.ru",
                "specialization": "Пилатес",
                "is_active": False,
                "branch_id": self.branch.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["specialization"], "Пилатес")

        delete_response = self.http.delete(
            f"/api/v1/trainers/{trainer.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(Trainer.objects.filter(id=trainer.id).exists())
