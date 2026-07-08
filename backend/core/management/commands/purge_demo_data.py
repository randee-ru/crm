from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from bookings.models import Booking
from clients.models import Client
from companies.models import Company
from contracts.models import Contract
from crm.models import Deal, Task
from memberships.models import Membership
from messaging.models import ChatMessage, ChatRoom
from payments.models import Payment
from sales.models import Sale
from schedule.models import ScheduleEvent

User = get_user_model()

DEMO_COMPANY_SLUGS = frozenset({"fitpro"})
DEMO_CLIENT_PHONE_PREFIXES = ("+7999111", "+7999222")
DEMO_DEAL_TITLES = frozenset(
    {
        "Заявка с сайта",
        "Звонок — пробная тренировка",
        "Семейный тариф",
        "Корпоративный пакет",
        "WhatsApp — консультация",
    }
)
DEMO_SCHEDULE_TITLES = frozenset({"Йога для начинающих", "Functional training"})
DEMO_MESSAGE_BODIES = frozenset(
    {
        "Добро пожаловать в CRM Kit! Здесь будут объявления клуба и важные новости.",
        "На следующей неделе обновляем расписание групповых занятий. Следите за анонсами.",
        "Коллеги, используйте общий чат для оперативных вопросов по смене и клиентам.",
        "Кто на ресепшене сегодня после 18:00?",
    }
)


class Command(BaseCommand):
    help = "Удаляет демо-данные seed_demo и bootstrap_funnel_data, сохраняя импорт 1С и телефонию."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax", help="Slug компании (или fitpro для полного удаления)")
        parser.add_argument(
            "--delete-demo-companies",
            action="store_true",
            help="Полностью удалить демо-компании (fitpro).",
        )

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        delete_demo_companies = options["delete_demo_companies"]
        company_slug = options["company"]

        if delete_demo_companies:
            removed = 0
            for slug in sorted(DEMO_COMPANY_SLUGS):
                try:
                    company = Company.objects.get(slug=slug)
                except Company.DoesNotExist:
                    continue
                self._delete_company_completely(company)
                removed += 1
                self.stdout.write(self.style.WARNING(f"Удалена демо-компания: {slug}"))
            if removed == 0:
                self.stdout.write("Демо-компании не найдены.")
            return

        try:
            company = Company.objects.get(slug=company_slug, is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{company_slug}' не найдена.") from exc

        if company_slug in DEMO_COMPANY_SLUGS:
            self._delete_company_completely(company)
            self.stdout.write(self.style.SUCCESS(f"Демо-компания {company_slug} удалена."))
            return

        stats = self._purge_company(company)
        self.stdout.write(
            self.style.SUCCESS(
                "Очистка завершена: "
                + ", ".join(f"{key}={value}" for key, value in stats.items() if value)
            )
        )

    def _purge_company(self, company: Company) -> dict[str, int]:
        stats: dict[str, int] = {}

        renewal_deals = Deal.objects.filter(company=company, external_key__startswith="renewal:")
        stats["renewal_deals"] = renewal_deals.count()
        renewal_deals.delete()

        winback_deals = Deal.objects.filter(company=company, external_key__startswith="winback:")
        stats["winback_deals"] = winback_deals.count()
        winback_deals.delete()

        demo_deals = Deal.objects.filter(company=company, title__in=DEMO_DEAL_TITLES)
        stats["seed_deals"] = demo_deals.count()
        demo_deals.delete()

        today = timezone.localdate()
        bootstrap_memberships = Membership.objects.filter(
            company=company,
            starts_at=today - timedelta(days=60),
            status=Membership.Status.ACTIVE,
        )
        stats["bootstrap_memberships"] = bootstrap_memberships.count()
        bootstrap_memberships.delete()

        demo_clients = Client.objects.filter(
            company=company,
        ).filter(
            Q(phone__startswith=DEMO_CLIENT_PHONE_PREFIXES[0])
            | Q(phone__startswith=DEMO_CLIENT_PHONE_PREFIXES[1])
        )
        stats["demo_clients"] = demo_clients.count()
        demo_clients.delete()

        demo_tasks = Task.objects.filter(company=company, description__contains="Demo task for")
        stats["demo_tasks"] = demo_tasks.count()
        demo_tasks.delete()

        demo_bookings = Booking.objects.filter(company=company, source="demo")
        stats["demo_bookings"] = demo_bookings.count()
        demo_bookings.delete()

        demo_events = ScheduleEvent.objects.filter(company=company, title__in=DEMO_SCHEDULE_TITLES)
        stats["demo_schedule"] = demo_events.count()
        demo_events.delete()

        demo_messages = ChatMessage.objects.filter(room__company=company, body__in=DEMO_MESSAGE_BODIES)
        stats["demo_messages"] = demo_messages.count()
        demo_messages.delete()

        demo_sales = Sale.objects.filter(
            company=company,
            title__startswith="Продажа абонемента ",
            external_number="",
        )
        stats["demo_sales"] = demo_sales.count()
        for sale in demo_sales:
            Payment.objects.filter(company=company, sale=sale).delete()
        demo_sales.delete()

        demo_trainers = company.trainers.filter(last_name__contains="Тренерова-")
        stats["demo_trainers"] = demo_trainers.count()
        demo_trainers.delete()

        return stats

    def _delete_company_completely(self, company: Company) -> None:
        from crm.models import DealPipeline

        Deal.objects.filter(company=company).delete()
        DealPipeline.objects.filter(company=company).delete()
        company.delete()

