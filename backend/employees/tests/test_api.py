from __future__ import annotations

import io

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client as DjangoClient, TestCase
from PIL import Image
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from companies.models import Company
from employees.models import Trainer


def _make_test_image() -> SimpleUploadedFile:
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), color="red").save(buffer, format="PNG")
    buffer.seek(0)
    return SimpleUploadedFile("photo.png", buffer.read(), content_type="image/png")


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
                "trains_gym_floor": False,
                "trains_group_programs": True,
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
        self.assertFalse(list_response.json()[0]["trains_gym_floor"])
        self.assertTrue(list_response.json()[0]["trains_group_programs"])
        self.assertFalse(list_response.json()[0]["rent_paid_current_month"])

    def test_trainer_create_requires_at_least_one_type(self) -> None:
        response = self.http.post(
            "/api/v1/trainers/?company=sportmax",
            data={
                "first_name": "Анна",
                "last_name": "Иванова",
                "phone": "+79990000001",
                "trains_gym_floor": False,
                "trains_group_programs": False,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)

    def test_trainer_update_and_delete(self) -> None:
        trainer = Trainer.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Анна",
            last_name="Иванова",
            phone="+79990000001",
            specialization="Йога",
            trains_gym_floor=True,
        )

        update_response = self.http.patch(
            f"/api/v1/trainers/{trainer.id}/?company=sportmax",
            data={
                "first_name": "Анна",
                "last_name": "Иванова",
                "phone": "+79990000001",
                "email": "anna@club.ru",
                "specialization": "Пилатес",
                "trains_gym_floor": True,
                "trains_group_programs": False,
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

    def test_trainer_create_with_photo_and_bio(self) -> None:
        create_response = self.http.post(
            "/api/v1/trainers/?company=sportmax",
            data={
                "first_name": "Анна",
                "last_name": "Иванова",
                "phone": "+79990000001",
                "trains_gym_floor": "true",
                "achievements": "МСМК по пауэрлифтингу",
                "bio": "Тренирую 10 лет, специализация — силовые виды спорта.",
                "photo": _make_test_image(),
            },
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)

        trainer = Trainer.objects.get()
        self.assertTrue(trainer.photo)
        self.assertEqual(trainer.achievements, "МСМК по пауэрлифтингу")

        detail_response = self.http.get(f"/api/v1/trainers/{trainer.id}/?company=sportmax", **self.auth_headers())
        payload = detail_response.json()
        self.assertEqual(payload["achievements"], "МСМК по пауэрлифтингу")
        self.assertIsNotNone(payload["photo_url"])

    def test_trainer_rent_payment_create_and_list(self) -> None:
        trainer = Trainer.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Анна",
            last_name="Иванова",
            phone="+79990000001",
            trains_gym_floor=True,
        )

        create_response = self.http.post(
            f"/api/v1/trainers/{trainer.id}/rent-payments/?company=sportmax",
            data={"period": "2026-07-01", "amount": "15000.00", "note": "Июль"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)

        trainer_response = self.http.get(f"/api/v1/trainers/{trainer.id}/?company=sportmax", **self.auth_headers())
        self.assertEqual(trainer_response.status_code, 200)
        payload = trainer_response.json()
        self.assertEqual(len(payload["rent_payments"]), 1)
        self.assertEqual(payload["rent_payments"][0]["amount"], "15000.00")
