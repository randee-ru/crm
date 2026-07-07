from __future__ import annotations

import json
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from attendance.models import AttendanceRecord
from bookings.models import Booking
from branches.models import Branch
from clients.import_1c import (
    default_membership_dates,
    make_key,
    map_booking_status,
    map_client_status,
    map_gender,
    map_membership_status,
    normalize_phone,
    normalize_email,
    parse_export_date,
    parse_export_datetime,
    split_name,
    to_decimal,
    as_text,
)
from clients.models import Client, ClientLead, ClientMessage
from companies.models import Company
from crm.models import Deal
from crm.pipelines import ensure_default_pipeline, get_stage_by_code
from memberships.models import Membership
from sales.models import Sale


class Command(BaseCommand):
    help = "Импорт клиентов и связанных данных из JSON-экспорта 1С."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--file", required=True, help="Путь к clients_export_*.json")
        parser.add_argument("--company", default="sportmax", help="Slug компании")
        parser.add_argument("--limit", type=int, default=0, help="Ограничить число клиентов")
        parser.add_argument("--skip-visits", action="store_true", help="Не импортировать посещения")
        parser.add_argument("--skip-messages", action="store_true", help="Не импортировать сообщения")
        parser.add_argument("--batch-size", type=int, default=200, help="Размер пакета bulk_create")

    def handle(self, *args, **options) -> None:
        file_path = options["file"]
        company_slug = options["company"]
        limit = options["limit"]
        batch_size = options["batch_size"]

        try:
            company = Company.objects.get(slug=company_slug, is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{company_slug}' не найдена.") from exc

        branch = Branch.objects.filter(company=company).order_by("-is_primary", "id").first()
        if branch is None:
            branch = Branch.objects.create(company=company, name="Main Hall", is_primary=True)

        pipeline = ensure_default_pipeline(company)
        default_stage = get_stage_by_code(pipeline, "new_lead")

        with open(file_path, "r", encoding="utf-8-sig") as handle:
            records = json.load(handle)

        if not isinstance(records, list):
            raise CommandError("Ожидался JSON-массив клиентов.")

        if limit:
            records = records[:limit]

        stats = {
            "clients": 0,
            "messages": 0,
            "visits": 0,
            "sales": 0,
            "deals": 0,
            "lessons": 0,
            "leads": 0,
            "memberships": 0,
            "errors": 0,
        }

        self.stdout.write(f"Импорт {len(records)} клиентов в {company.slug}...")

        for index, record in enumerate(records, start=1):
            try:
                with transaction.atomic():
                    client = self._upsert_client(company, branch, record)
                    stats["clients"] += 1

                    membership = self._upsert_membership(company, branch, client, record)
                    if membership:
                        stats["memberships"] += 1

                    if not options["skip_messages"]:
                        stats["messages"] += self._import_messages(
                            company, client, record.get("messages") or [], batch_size
                        )

                    if not options["skip_visits"]:
                        stats["visits"] += self._import_visits(
                            company, branch, client, membership, record.get("visits") or [], batch_size
                        )

                    stats["sales"] += self._import_sales(
                        company, branch, client, membership, record.get("sales") or [], batch_size
                    )
                    stats["deals"] += self._import_deals(
                        company, branch, client, pipeline, default_stage, record.get("deals") or [], batch_size
                    )
                    stats["lessons"] += self._import_lessons(
                        company, branch, client, membership, record.get("lessons") or [], batch_size
                    )
                    stats["leads"] += self._import_leads(
                        company, client, record.get("leads") or [], batch_size
                    )
            except Exception as exc:
                stats["errors"] += 1
                external_id = str(record.get("id") or "?")
                self.stderr.write(self.style.WARNING(f"  пропуск {external_id}: {exc}"))
                continue

            if index % 100 == 0:
                self.stdout.write(f"  ... {index}/{len(records)}")

        self.stdout.write(self.style.SUCCESS("Импорт завершён:"))
        for key, value in stats.items():
            self.stdout.write(f"  {key}: {value}")

    def _upsert_client(self, company: Company, branch: Branch, record: dict) -> Client:
        external_id = str(record.get("id") or "").strip()
        if not external_id:
            raise CommandError("Запись без id.")

        first_name, last_name, middle_name = split_name(record)
        phone = normalize_phone(record.get("phone"), external_id)
        client_status = map_client_status(record.get("client_status"))

        defaults = {
            "branch": branch,
            "first_name": first_name[:100],
            "last_name": last_name[:100],
            "middle_name": middle_name[:100],
            "phone": phone[:32],
            "email": normalize_email(record.get("email")),
            "birth_date": parse_export_date(record.get("birth_date")),
            "gender": map_gender(record.get("gender")),
            "passport": as_text(record.get("passport"), 64),
            "card_number": as_text(record.get("card_number"), 64),
            "card_status": as_text(record.get("card_status"), 64),
            "client_status": client_status,
            "client_status_label": as_text(record.get("client_status_label"), 120),
            "manager_name": as_text(record.get("manager"), 120),
            "lead_source": as_text(record.get("lead_source"), 120),
            "acquisition_channel": as_text(record.get("acquisition_channel"), 120),
            "club_name": as_text(record.get("club"), 120),
            "contract_ref": as_text(record.get("contract"), 255),
            "ltv_total": to_decimal(record.get("ltv_total")),
            "visit_count": int(record.get("visit_count") or 0),
            "visit_frequency": as_text(record.get("visit_frequency"), 64),
            "max_break_days": int(record.get("max_break_days") or 0),
            "registration_date": parse_export_date(record.get("registration_date") or record.get("created")),
            "last_visit_date": parse_export_date(record.get("last_visit_date")),
            "last_payment_date": parse_export_date(record.get("last_payment_date")),
            "last_interaction_date": parse_export_datetime(record.get("last_interaction_date")),
            "membership_name": as_text(record.get("membership_name"), 255),
            "membership_status": as_text(record.get("membership_status"), 64),
            "membership_start": parse_export_date(record.get("membership_start")),
            "membership_end": parse_export_date(record.get("membership_end")),
            "tags": record.get("tags") or [],
            "interests": record.get("interests") or [],
            "is_active": client_status in {"lead", "active"},
            "is_deleted": bool(record.get("is_deleted")),
        }

        client, _created = Client.objects.update_or_create(
            company=company,
            external_id=external_id,
            defaults=defaults,
        )
        return client

    def _upsert_membership(
        self,
        company: Company,
        branch: Branch,
        client: Client,
        record: dict,
    ) -> Membership | None:
        title = (record.get("membership_name") or "").strip()
        if not title:
            return None

        starts_at, ends_at = default_membership_dates(
            parse_export_date(record.get("membership_start")),
            parse_export_date(record.get("membership_end")),
        )
        membership, _created = Membership.objects.update_or_create(
            company=company,
            client=client,
            title=title[:255],
            defaults={
                "branch": branch,
                "status": map_membership_status(record.get("membership_status")),
                "starts_at": starts_at,
                "ends_at": ends_at,
                "price": to_decimal(record.get("ltv_total")),
            },
        )
        return membership

    def _import_messages(
        self,
        company: Company,
        client: Client,
        items: list[dict],
        batch_size: int,
    ) -> int:
        rows: list[ClientMessage] = []
        for item in items:
            sent_at = parse_export_datetime(item.get("date"))
            external_key = make_key("msg", client.external_id, item.get("date"), as_text(item.get("text"), 80))
            rows.append(
                ClientMessage(
                    company=company,
                    client=client,
                    external_key=external_key,
                    channel=as_text(item.get("channel"), 64),
                    message_type=as_text(item.get("type"), 64),
                    kind=as_text(item.get("kind"), 64),
                    source=as_text(item.get("source"), 120),
                    phone=as_text(item.get("phone") or client.phone, 32),
                    body=as_text(item.get("text"), 8000),
                    sent_at=sent_at,
                )
            )
        ClientMessage.objects.bulk_create(rows, batch_size=batch_size, ignore_conflicts=True)
        return len(rows)

    def _import_visits(
        self,
        company: Company,
        branch: Branch,
        client: Client,
        membership: Membership | None,
        items: list[dict],
        batch_size: int,
    ) -> int:
        rows: list[AttendanceRecord] = []
        for item in items:
            checked_in = parse_export_datetime(item.get("check_in"))
            if not checked_in:
                continue
            checked_out = parse_export_datetime(item.get("check_out"))
            external_key = make_key("visit", client.external_id, item.get("check_in"), item.get("room"))
            rows.append(
                AttendanceRecord(
                    company=company,
                    branch=branch,
                    client=client,
                    membership=membership,
                    status=AttendanceRecord.Status.CHECKED_IN,
                    checked_in_at=checked_in,
                    checked_out_at=checked_out,
                    room=as_text(item.get("room"), 120),
                    visit_source=as_text(item.get("source"), 120),
                    duration_minutes=int(item.get("duration_minutes") or 0) or None,
                    external_key=external_key,
                )
            )
        AttendanceRecord.objects.bulk_create(rows, batch_size=batch_size, ignore_conflicts=True)
        return len(rows)

    def _import_sales(
        self,
        company: Company,
        branch: Branch,
        client: Client,
        membership: Membership | None,
        items: list[dict],
        batch_size: int,
    ) -> int:
        count = 0
        for item in items:
            sold_at = parse_export_datetime(item.get("date"))
            external_number = str(item.get("number") or "").strip()
            title = f"Продажа {external_number}" if external_number else f"Продажа {client.full_name}"
            amount = to_decimal(item.get("amount"))
            defaults = {
                "branch": branch,
                "client": client,
                "membership": membership,
                "title": title[:255],
                "status": Sale.Status.COMPLETED,
                "total_amount": amount,
                "paid_amount": amount,
                "sold_at": sold_at,
                "promo_code": as_text(item.get("promo_code"), 64),
                "installment_info": as_text(item.get("installment"), 255),
            }
            if external_number:
                Sale.objects.update_or_create(
                    company=company,
                    external_number=external_number,
                    defaults=defaults,
                )
            else:
                Sale.objects.create(company=company, **defaults)
            count += 1
        return count

    def _import_deals(
        self,
        company: Company,
        branch: Branch,
        client: Client,
        pipeline,
        default_stage,
        items: list[dict],
        batch_size: int,
    ) -> int:
        count = 0
        for item in items:
            title = as_text(item.get("name"), 255) or "Сделка"
            external_key = make_key("deal", client.external_id, item.get("date"), title)
            result = as_text(item.get("result")).lower()
            stage_code = "payment" if result in {"успех", "won", "success"} else "new_lead"
            stage = get_stage_by_code(pipeline, stage_code) or default_stage
            Deal.objects.update_or_create(
                company=company,
                external_key=external_key,
                defaults={
                    "pipeline": pipeline,
                    "stage": stage,
                    "branch": branch,
                    "client": client,
                    "title": title,
                    "description": as_text(item.get("description"), 4000),
                    "deal_type": as_text(item.get("type"), 64),
                    "source_name": as_text(item.get("source"), 120),
                    "channel": as_text(item.get("channel"), 64),
                    "result_label": as_text(item.get("result"), 120),
                    "manager_name": as_text(item.get("manager"), 120),
                    "amount": to_decimal(item.get("amount")),
                    "closed_at": parse_export_datetime(item.get("closed_date")),
                },
            )
            count += 1
        return count

    def _import_lessons(
        self,
        company: Company,
        branch: Branch,
        client: Client,
        membership: Membership | None,
        items: list[dict],
        batch_size: int,
    ) -> int:
        rows: list[Booking] = []
        for item in items:
            starts_at = parse_export_datetime(item.get("start"))
            ends_at = parse_export_datetime(item.get("end"))
            if not starts_at:
                continue
            if not ends_at:
                ends_at = starts_at + timedelta(hours=1)
            service = as_text(item.get("service"), 255) or "Занятие"
            external_key = make_key("lesson", client.external_id, item.get("start"), service)
            rows.append(
                Booking(
                    company=company,
                    branch=branch,
                    client=client,
                    membership=membership,
                    title=service,
                    starts_at=starts_at,
                    ends_at=ends_at,
                    status=map_booking_status(as_text(item.get("status"))),
                    source=as_text(item.get("club"), 120),
                    room=as_text(item.get("room"), 120),
                    lesson_type=as_text(item.get("type"), 120),
                    payment_basis=as_text(item.get("payment_basis"), 120),
                    external_key=external_key,
                    notes=as_text(item.get("arrival_status"), 255),
                )
            )
        Booking.objects.bulk_create(rows, batch_size=batch_size, ignore_conflicts=True)
        return len(rows)

    def _import_leads(
        self,
        company: Company,
        client: Client,
        items: list[dict],
        batch_size: int,
    ) -> int:
        rows: list[ClientLead] = []
        for item in items:
            external_key = make_key("lead", client.external_id, item.get("date"), as_text(item.get("name")))
            rows.append(
                ClientLead(
                    company=company,
                    client=client,
                    external_key=external_key,
                    title=as_text(item.get("name"), 255),
                    status=as_text(item.get("status"), 64),
                    channel=as_text(item.get("channel"), 64),
                    club_name=as_text(item.get("club"), 120),
                    manager_name=as_text(item.get("manager"), 120),
                    comment=as_text(item.get("comment"), 4000),
                    ad_source=as_text(item.get("ad_source"), 120),
                    utm_source=as_text(item.get("utm_source"), 120),
                    utm_medium=as_text(item.get("utm_medium"), 120),
                    utm_campaign=as_text(item.get("utm_campaign"), 120),
                    utm_content=as_text(item.get("utm_content"), 120),
                    utm_term=as_text(item.get("utm_term"), 120),
                    lead_date=parse_export_datetime(item.get("date")),
                )
            )
        ClientLead.objects.bulk_create(rows, batch_size=batch_size, ignore_conflicts=True)
        return len(rows)
