from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from attendance.models import AttendanceRecord
from bookings.models import Booking
from branches.models import Branch
from clients.models import Client, ClientLead, ClientMessage
from companies.models import Company
from employees.models import Trainer
from memberships.models import Membership
from payments.models import Payment
from sales.models import Sale
from telephony.models import CallLog


class DailyReportApiTest(TestCase):
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
        self.trainer = Trainer.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Анна",
            last_name="Иванова",
            phone="+79990000001",
        )
        self.membership = Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Пробный месяц",
            status=Membership.Status.ACTIVE,
            starts_at="2026-07-01",
            ends_at="2026-07-31",
        )
        starts_at = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
        self.booking = Booking.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            membership=self.membership,
            trainer=self.trainer,
            title="Персональная тренировка",
            starts_at=starts_at,
            ends_at=starts_at + timedelta(hours=1),
            status=Booking.Status.CONFIRMED,
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_daily_report_counts_sources(self) -> None:
        now = timezone.now()

        CallLog.objects.create(
            company=self.company,
            client=self.client_record,
            direction=CallLog.Direction.INCOMING,
            status=CallLog.Status.ANSWERED,
            caller_phone=self.client_record.phone,
            target_phone="+79990000000",
            started_at=now - timedelta(minutes=15),
            duration=120,
        )
        CallLog.objects.create(
            company=self.company,
            client=self.client_record,
            direction=CallLog.Direction.OUTGOING,
            status=CallLog.Status.MISSED,
            caller_phone="+79990000000",
            target_phone=self.client_record.phone,
            started_at=now - timedelta(minutes=10),
            duration=0,
        )

        ClientMessage.objects.create(
            company=self.company,
            client=self.client_record,
            channel="telegram",
            kind="message",
            source="telegram",
            body="Здравствуйте",
            sent_at=now - timedelta(minutes=50),
        )
        ClientMessage.objects.create(
            company=self.company,
            client=self.client_record,
            channel="whatsapp",
            kind="message",
            source="whatsapp",
            body="Добрый день",
            sent_at=now - timedelta(minutes=45),
        )
        ClientMessage.objects.create(
            company=self.company,
            client=self.client_record,
            channel="max",
            kind="message",
            source="max",
            body="MAX message",
            sent_at=now - timedelta(minutes=40),
        )

        ClientLead.objects.create(
            company=self.company,
            client=self.client_record,
            title="Заявка с сайта",
            status="new",
            channel="site",
            ad_source="site",
            lead_date=now - timedelta(minutes=35),
        )
        ClientLead.objects.create(
            company=self.company,
            client=self.client_record,
            title="Отказ",
            status="rejected",
            channel="site",
            ad_source="site",
            lead_date=now - timedelta(minutes=30),
        )

        AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            status=AttendanceRecord.Status.CHECKED_IN,
            checked_in_at=now - timedelta(hours=2),
            checked_out_at=now - timedelta(hours=1, minutes=20),
            booking=self.booking,
            membership=self.membership,
            trainer=self.trainer,
        )
        AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            status=AttendanceRecord.Status.CHECKED_IN,
            checked_in_at=now - timedelta(hours=1),
            checked_out_at=now - timedelta(minutes=15),
        )

        Sale.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            membership=self.membership,
            trainer=self.trainer,
            title="Продление абонемента",
            status=Sale.Status.COMPLETED,
            total_amount=50000,
            paid_amount=50000,
            sold_at=now - timedelta(minutes=25),
        )
        Sale.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Отменённая продажа",
            status=Sale.Status.CANCELLED,
            total_amount=12000,
            paid_amount=0,
            sold_at=now - timedelta(minutes=20),
        )

        Payment.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            membership=self.membership,
            sale=None,
            amount=48750,
            method=Payment.Method.CASH,
            status=Payment.Status.SUCCEEDED,
            paid_at=now - timedelta(minutes=5),
        )

        response = self.http.get(
            "/api/v1/reports/daily/?company=sportmax",
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["report_date"], timezone.localdate().isoformat())
        self.assertEqual(payload["metrics"]["incoming_calls"], 1)
        self.assertEqual(payload["metrics"]["outgoing_calls"], 1)
        self.assertEqual(payload["metrics"]["outgoing_dialed_base"], 1)
        self.assertEqual(payload["metrics"]["total_calls"], 2)
        self.assertEqual(payload["metrics"]["telegram"], 1)
        self.assertEqual(payload["metrics"]["max"], 1)
        self.assertEqual(payload["metrics"]["whatsapp"], 1)
        self.assertEqual(payload["metrics"]["site_applications"], 2)
        self.assertEqual(payload["metrics"]["new_site_applications"], 1)
        self.assertEqual(payload["metrics"]["guest_visits"], 1)
        self.assertEqual(payload["metrics"]["day_sales"], 1)
        self.assertEqual(payload["metrics"]["meetings_scheduled"], 1)
        self.assertEqual(payload["metrics"]["refusals"], 1)
        self.assertEqual(payload["metrics"]["renewals"], 1)
        self.assertEqual(payload["metrics"]["negative_result"], 1)
        self.assertEqual(payload["metrics"]["no_result"], 1)
        self.assertEqual(payload["metrics"]["cash_op"], "48750")
        self.assertEqual(payload["metrics"]["reviews"], 0)
