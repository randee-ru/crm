from __future__ import annotations

from django.test import TestCase

from attendance.models import AttendanceRecord
from clients.models import Client
from companies.models import Company
from employees.models import Trainer


class AttendanceRecordModelTest(TestCase):
    def test_attendance_client_must_belong_to_company(self) -> None:
        company_one = Company.objects.create(name="Fitness Club One")
        company_two = Company.objects.create(name="Fitness Club Two")
        client = Client.objects.create(company=company_two, first_name="Иван", last_name="Петров", phone="+79990000001")
        trainer = Trainer.objects.create(
            company=company_one,
            first_name="Анна",
            last_name="Тренерова",
            phone="+79990000002",
            trains_gym_floor=True,
        )

        with self.assertRaisesMessage(Exception, "Клиент должен принадлежать той же компании, что и посещение."):
            AttendanceRecord.objects.create(
                company=company_one,
                client=client,
                trainer=trainer,
            )
