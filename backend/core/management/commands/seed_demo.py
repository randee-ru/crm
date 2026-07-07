from __future__ import annotations

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import CompanyMembership
from attendance.models import AttendanceRecord
from branches.models import Branch
from bookings.models import Booking
from clients.models import Client
from companies.models import Company
from contracts.models import Contract
from crm.models import Deal, Task
from employees.models import Trainer
from memberships.models import Membership
from payments.models import Payment
from sales.models import Sale
from schedule.models import ScheduleEvent

User = get_user_model()


class Command(BaseCommand):
    help = "Создаёт демо-данные фитнес-клуба для локальной проверки CRM-интерфейса."

    @transaction.atomic
    def handle(self, *args: object, **options: object) -> None:
        user, _user_created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@sportmax.local",
                "first_name": "Пётр",
                "last_name": "Менеджеров",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password("121351")
        user.save()

        created_clients = 0

        created_clients += self._seed_company(
            slug="sportmax",
            name="Sportmax Fitness",
            branch_name="Main Hall",
            user=user,
            role=CompanyMembership.Role.ADMIN,
            clients=[
                ("Иван", "Петров", "+79991110001", Membership.Status.ACTIVE, "Пробный месяц"),
                ("Мария", "Орлова", "+79991110002", Membership.Status.CANCELLED, "Годовой абонемент"),
                ("Дмитрий", "Соколов", "+79991110003", Membership.Status.ACTIVE, "Безлимит 3 месяца"),
                ("Антон", "Смирнов", "+79991110004", Membership.Status.EXPIRED, "Разовые посещения"),
                ("Елена", "Климова", "+79991110005", Membership.Status.DRAFT, "Семейный тариф"),
            ],
        )

        created_clients += self._seed_company(
            slug="fitpro",
            name="FitPro Center",
            branch_name="Downtown",
            user=user,
            role=CompanyMembership.Role.MANAGER,
            clients=[
                ("Ольга", "Новикова", "+79992220001", Membership.Status.ACTIVE, "Утренний безлимит"),
                ("Сергей", "Волков", "+79992220002", Membership.Status.ACTIVE, "Корпоративный тариф"),
            ],
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo data ready. "
                f"New clients: {created_clients}. "
                "Login: admin / 121351. "
                "Companies: sportmax, fitpro."
            )
        )

    def _seed_company(
        self,
        *,
        slug: str,
        name: str,
        branch_name: str,
        user: User,
        role: str,
        clients: list[tuple[str, str, str, str, str]],
    ) -> int:
        company, _ = Company.objects.get_or_create(slug=slug, defaults={"name": name})
        branch, _ = Branch.objects.get_or_create(company=company, name=branch_name)
        trainer, _ = Trainer.objects.get_or_create(
            company=company,
            phone=f"+7999000{company.id or 1:04d}",
            defaults={
                "branch": branch,
                "first_name": "Анна",
                "last_name": f"Тренерова-{slug}",
                "email": f"trainer@{slug}.local",
                "specialization": "Функциональный тренинг",
                "trains_gym_floor": True,
                "trains_group_programs": True,
            },
        )
        CompanyMembership.objects.update_or_create(
            user=user,
            company=company,
            defaults={"branch": branch, "role": role, "is_active": True},
        )

        today = date.today()
        created_clients = 0

        for first_name, last_name, phone, status, title in clients:
            client, created = Client.objects.get_or_create(
                company=company,
                phone=phone,
                defaults={
                    "branch": branch,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": f"client{phone[-4:]}@{slug}.local",
                },
            )
            if created:
                created_clients += 1

            Membership.objects.update_or_create(
                company=company,
                client=client,
                title=title,
                defaults={
                    "branch": branch,
                    "status": status,
                    "starts_at": today - timedelta(days=10),
                    "ends_at": today + timedelta(days=20),
                    "price": 4990,
                },
            )

        self._seed_tasks_and_schedule(company=company, branch=branch, trainer=trainer, user=user)
        self._seed_deals(company=company, branch=branch, user=user)
        self._seed_bookings_attendance_sales_payments(
            company=company,
            branch=branch,
            trainer=trainer,
        )
        self._seed_messaging(company=company, user=user)
        self._seed_contracts(company=company, branch=branch)

        return created_clients

    def _seed_tasks_and_schedule(
        self,
        *,
        company: Company,
        branch: Branch,
        trainer: Trainer,
        user: User,
    ) -> None:
        first_client = Client.objects.filter(company=company).order_by("id").first()
        now = timezone.now()

        demo_tasks = [
            ("Позвонить клиенту", Task.Priority.HIGH, Task.Status.OPEN, timedelta(hours=2)),
            ("Подтвердить оплату", Task.Priority.NORMAL, Task.Status.IN_PROGRESS, timedelta(hours=4)),
            ("Закрыть заявку", Task.Priority.HIGH, Task.Status.OPEN, -timedelta(hours=1)),
        ]

        for title, priority, status, delta in demo_tasks:
            Task.objects.update_or_create(
                company=company,
                title=title,
                defaults={
                    "branch": branch,
                    "client": first_client,
                    "assigned_to": user,
                    "created_by": user,
                    "priority": priority,
                    "status": status,
                    "due_at": now + delta,
                    "description": f"Demo task for {company.slug}",
                },
            )

        demo_events = [
            ("Йога для начинающих", "Анна", "Зал 2", 15, 16),
            ("Functional training", "Олег", "Зал 1", 18, 19),
        ]

        for title, trainer_name, room, start_hour, end_hour in demo_events:
            starts_at = now.replace(hour=start_hour, minute=0, second=0, microsecond=0)
            ends_at = now.replace(hour=end_hour, minute=0, second=0, microsecond=0)
            ScheduleEvent.objects.update_or_create(
                company=company,
                title=title,
                starts_at=starts_at,
                defaults={
                    "branch": branch,
                    "client": first_client,
                    "trainer": trainer,
                    "trainer_name": trainer_name,
                    "room": room,
                    "ends_at": ends_at,
                    "status": ScheduleEvent.Status.PLANNED,
                },
            )

    def _seed_bookings_attendance_sales_payments(
        self,
        *,
        company: Company,
        branch: Branch,
        trainer: Trainer,
    ) -> None:
        from decimal import Decimal

        client = Client.objects.filter(company=company).order_by("id").first()
        membership = Membership.objects.filter(company=company, client=client).order_by("-starts_at").first()
        now = timezone.now().replace(minute=0, second=0, microsecond=0)

        booking, _ = Booking.objects.update_or_create(
            company=company,
            title=f"Персональная тренировка {client.full_name if client else company.slug}",
            starts_at=now + timedelta(hours=1),
            defaults={
                "branch": branch,
                "client": client,
                "membership": membership,
                "trainer": trainer,
                "ends_at": now + timedelta(hours=2),
                "status": Booking.Status.CONFIRMED,
                "source": "demo",
            },
        )

        AttendanceRecord.objects.update_or_create(
            company=company,
            client=client,
            booking=booking,
            defaults={
                "branch": branch,
                "membership": membership,
                "trainer": trainer,
                "status": AttendanceRecord.Status.CHECKED_IN,
                "checked_in_at": now + timedelta(hours=1, minutes=5),
                "checked_out_at": now + timedelta(hours=2),
                "locker_key": "M081",
            },
        )

        in_club_visitors = list(Client.objects.filter(company=company).order_by("id")[:5])
        locker_keys = ["Ж093", "M081", "Ж104", "M022", "Ж117"]
        for index, visitor in enumerate(in_club_visitors):
            visitor_membership = (
                Membership.objects.filter(company=company, client=visitor).order_by("-starts_at").first()
            )
            checked_in_at = now - timedelta(hours=2, minutes=index * 17)
            AttendanceRecord.objects.update_or_create(
                company=company,
                client=visitor,
                locker_key=locker_keys[index % len(locker_keys)],
                defaults={
                    "branch": branch,
                    "membership": visitor_membership,
                    "trainer": trainer if index == 0 else None,
                    "status": AttendanceRecord.Status.CHECKED_IN,
                    "checked_in_at": checked_in_at,
                    "checked_out_at": None,
                },
            )

        sale, _ = Sale.objects.update_or_create(
            company=company,
            title=f"Продажа абонемента {client.full_name if client else company.slug}",
            defaults={
                "branch": branch,
                "client": client,
                "membership": membership,
                "trainer": trainer,
                "status": Sale.Status.COMPLETED,
                "total_amount": Decimal("10000"),
                "discount_amount": Decimal("1000"),
                "paid_amount": Decimal("9000"),
                "sold_at": now,
            },
        )

        Payment.objects.update_or_create(
            company=company,
            sale=sale,
            defaults={
                "branch": branch,
                "client": client,
                "membership": membership,
                "amount": Decimal("9000"),
                "method": Payment.Method.CARD,
                "status": Payment.Status.SUCCEEDED,
                "paid_at": now,
                "external_id": f"{company.slug.upper()}-PAY-{sale.id}",
            },
        )

    def _seed_deals(
        self,
        *,
        company: Company,
        branch: Branch,
        user: User,
    ) -> None:
        from decimal import Decimal

        from crm.pipelines import ensure_default_pipeline, get_stage_by_code

        pipeline = ensure_default_pipeline(company)
        clients = list(Client.objects.filter(company=company).order_by("id")[:5])
        demo_deals = [
            ("Пробное занятие", "new_lead", Decimal("0")),
            ("Абонемент 3 месяца", "trial", Decimal("12900")),
            ("Семейный тариф", "payment", Decimal("24000")),
            ("Корпоративный пакет", "offer", Decimal("85000")),
            ("Продление безлимита", "payment", Decimal("15900")),
        ]

        for index, (title, stage_code, amount) in enumerate(demo_deals):
            client = clients[index % len(clients)] if clients else None
            stage = get_stage_by_code(pipeline, stage_code)
            Deal.objects.update_or_create(
                company=company,
                pipeline=pipeline,
                title=title,
                defaults={
                    "branch": branch,
                    "client": client,
                    "assigned_to": user,
                    "amount": amount,
                    "stage": stage,
                },
            )

    def _seed_messaging(self, *, company: Company, user: User) -> None:
        from messaging.models import ChatMessage, ChatRoom

        news_room, _ = ChatRoom.objects.update_or_create(
            company=company,
            slug="company-news",
            defaults={
                "title": "Новости компании",
                "room_type": ChatRoom.RoomType.COMPANY_NEWS,
            },
        )
        general_room, _ = ChatRoom.objects.update_or_create(
            company=company,
            slug="general",
            defaults={
                "title": "Общий чат",
                "room_type": ChatRoom.RoomType.GENERAL,
            },
        )

        demo_messages = [
            (news_room, "Добро пожаловать в CRM Kit! Здесь будут объявления клуба и важные новости."),
            (
                news_room,
                "На следующей неделе обновляем расписание групповых занятий. Следите за анонсами.",
            ),
            (
                general_room,
                "Коллеги, используйте общий чат для оперативных вопросов по смене и клиентам.",
            ),
            (general_room, "Кто на ресепшене сегодня после 18:00?"),
        ]

        for room, body in demo_messages:
            message, created = ChatMessage.objects.get_or_create(
                room=room,
                author=user,
                body=body,
            )
            if created:
                room.last_message_at = message.created_at
                room.save(update_fields=["last_message_at", "updated_at"])

    def _seed_contracts(self, *, company: Company, branch: Branch) -> None:
        today = date.today()
        clients = list(Client.objects.filter(company=company).order_by("id"))
        if not clients:
            return

        templates = [
            'Членство "Дневной 3 месяца" с Тренировка платная',
            'Членство "Полный 12 месяцев"',
            'Членство "Пробный месяц"',
            'Членство "Семейный тариф"',
            'Членство "Безлимит 3 месяца"',
        ]

        base_number = 13870 + company.id * 100
        for index, client in enumerate(clients):
            membership = Membership.objects.filter(company=company, client=client).order_by("-starts_at").first()
            number = str(base_number + index + 1)
            template_name = templates[index % len(templates)]
            membership_label = membership.title if membership else template_name.split('"')[1] if '"' in template_name else ""

            Contract.objects.update_or_create(
                company=company,
                number=number,
                defaults={
                    "branch": branch,
                    "client": client,
                    "membership": membership,
                    "prefix": "",
                    "contract_date": today - timedelta(days=index % 3),
                    "template_name": template_name,
                    "membership_label": membership_label,
                    "is_signed": index % 4 != 2,
                },
            )
