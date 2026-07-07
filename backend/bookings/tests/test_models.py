from __future__ import annotations

from datetime import datetime, timedelta, timezone

from django.test import TestCase

from bookings.models import Booking
from clients.models import Client
from companies.models import Company
from employees.models import Trainer
from memberships.models import Membership


class BookingModelTest(TestCase):
    def test_booking_membership_must_match_client(self) -> None:
        company = Company.objects.create(name="Fitness Club One")
        client = Client.objects.create(company=company, first_name="Иван", last_name="Петров", phone="+79990000001")
        trainer = Trainer.objects.create(
            company=company,
            first_name="Анна",
            last_name="Тренерова",
            phone="+79990000002",
            trains_gym_floor=True,
        )
        membership = Membership.objects.create(
            company=company,
            client=client,
            title="Test",
            starts_at="2026-07-01",
            ends_at="2026-07-31",
        )

        starts_at = datetime(2026, 7, 10, 10, 0, tzinfo=timezone.utc)
        ends_at = starts_at + timedelta(hours=1)
        booking = Booking(
            company=company,
            client=client,
            trainer=trainer,
            membership=membership,
            title="Training",
            starts_at=starts_at,
            ends_at=ends_at,
        )
        booking.save()

        self.assertEqual(booking.membership_id, membership.id)
