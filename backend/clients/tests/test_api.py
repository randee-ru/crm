from __future__ import annotations

from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from bookings.models import Booking
from clients.models import Client
from companies.models import Company
from memberships.models import Membership
from schedule.models import GroupProgram, GroupScheduleSlot, GroupSlotEnrollment


class ClientListApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(
            username="manager",
            password="admin12345",
        )
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        self.branch = Branch.objects.create(company=self.company, name="Main Hall")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.MANAGER,
        )
        self.employee_user = get_user_model().objects.create_user(
            username="employee",
            password="admin12345",
        )
        CompanyMembership.objects.create(
            user=self.employee_user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.EMPLOYEE,
        )
        self.client_record = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Иван",
            last_name="Петров",
            phone="+79991112233",
            birth_date="1990-05-12",
        )
        Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Пробный месяц",
            status=Membership.Status.ACTIVE,
            starts_at=timezone.localdate(),
            ends_at=timezone.localdate() + timedelta(days=10),
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_client_list_uses_registration_date_over_import_created_at(self) -> None:
        imported_client = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Сидорова",
            phone="+79992223344",
            registration_date="2019-04-01",
        )

        response = self.http.get("/api/v1/clients/?company=sportmax", **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        results = {item["id"]: item for item in response.json()["results"]}

        # У импортированного клиента реальная историческая дата регистрации,
        # а не технический момент создания строки в БД при импорте.
        self.assertEqual(results[imported_client.id]["registration_date"], "2019-04-01")

        # У клиента без registration_date (заведён прямо в CRM) честно
        # показываем дату создания записи.
        self.assertEqual(
            results[self.client_record.id]["registration_date"],
            self.client_record.created_at.date().isoformat(),
        )

    def test_client_list_requires_authentication(self) -> None:
        response = self.http.get("/api/v1/clients/?company=sportmax")
        self.assertEqual(response.status_code, 401)

    def test_client_list_returns_company_clients(self) -> None:
        response = self.http.get(
            "/api/v1/clients/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["full_name"], "Петров Иван")
        self.assertEqual(payload["results"][0]["membership_status"], "active")
        self.assertEqual(payload["results"][0]["birth_date"], "1990-05-12")
        self.assertIsNotNone(payload["results"][0]["membership_end"])
        self.assertIn("club_access_blocked", payload["results"][0])
        self.assertIn("group_programs_blocked", payload["results"][0])

    def test_client_list_supports_search_filter(self) -> None:
        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Орлова",
            phone="+79992223344",
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&search=Орлова",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["full_name"], "Орлова Мария")

    def test_client_list_supports_multiword_search_in_any_order(self) -> None:
        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Алексей",
            last_name="Алексеев",
            middle_name="Иванович",
            phone="+79992223344",
        )

        for query in ("Алексей Алексеев", "Алексеев Алексей", "Алексеев Иванович"):
            response = self.http.get(
                f"/api/v1/clients/?company=sportmax&search={query}",
                **self.auth_headers(),
            )
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["count"], 1)
            self.assertEqual(payload["results"][0]["full_name"], "Алексеев Алексей Иванович")

    def test_client_list_supports_phone_search_with_formatting(self) -> None:
        client = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Александра",
            last_name="Цыганкова",
            middle_name="Дмитриевна",
            phone="+7 (910) 486-11-40",
            email="lexiko@internet.ru",
            external_id="staff-11",
            manager_name="Менеджер по продажам",
            client_status="former",
            client_status_label="Бывший",
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&search=79104861140",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["id"], client.id)

    def test_client_list_ignores_short_search(self) -> None:
        response = self.http.get(
            "/api/v1/clients/?company=sportmax&search=Пе",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "Петров Иван")

    def test_client_options_supports_phone_search_with_formatting(self) -> None:
        client = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Оксана",
            last_name="Смелкова",
            middle_name="Владимировна",
            phone="+7 (980) 186-15-36",
            email="oksanasmelkova702@gmail.com",
            external_id="staff-10",
        )

        response = self.http.get(
            "/api/v1/clients/options/?company=sportmax&search=79801861536",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()["results"]
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], client.id)

    def test_client_options_supports_multiword_search_in_any_order(self) -> None:
        client = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Алексей",
            last_name="Алексеев",
            middle_name="Иванович",
            phone="+79994445566",
        )

        for query in ("Алексей Алексеев", "Алексеев Алексей"):
            response = self.http.get(
                f"/api/v1/clients/options/?company=sportmax&search={query}",
                **self.auth_headers(),
            )
            self.assertEqual(response.status_code, 200)
            payload = response.json()["results"]
            self.assertEqual(len(payload), 1)
            self.assertEqual(payload[0]["id"], client.id)

    def test_client_list_supports_client_status_filter(self) -> None:
        self.client_record.client_status = "active"
        self.client_record.client_status_label = "Действующий"
        self.client_record.save()

        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Орлова",
            phone="+79992223344",
            client_status="former",
            client_status_label="Бывший член клуба",
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&client_status=active",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["client_status"], "active")

    def test_client_list_supports_birth_date_range_filter(self) -> None:
        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Орлова",
            phone="+79992223344",
            birth_date="1985-03-02",
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&birth_date_from=1989-01-01&birth_date_to=1991-12-31",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "Петров Иван")

    def test_client_list_supports_ordering_by_name(self) -> None:
        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Мария",
            last_name="Абрамова",
            phone="+79992223344",
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&ordering=name",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        names = [item["full_name"] for item in response.json()["results"]]
        self.assertEqual(names, ["Абрамова Мария", "Петров Иван"])

        desc_response = self.http.get(
            "/api/v1/clients/?company=sportmax&ordering=-name",
            **self.auth_headers(),
        )
        desc_names = [item["full_name"] for item in desc_response.json()["results"]]
        self.assertEqual(desc_names, ["Петров Иван", "Абрамова Мария"])

    def test_client_list_supports_ordering_by_registration_date(self) -> None:
        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Светлана",
            last_name="Раннева",
            phone="+79993334455",
            registration_date="2018-01-01",
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&ordering=registration_date",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()["results"]
        self.assertEqual(payload[0]["full_name"], "Раннева Светлана")

    def test_client_list_ordering_combined_with_distinct_filter_does_not_error(self) -> None:
        # membership_expires_in_days вызывает .distinct() — вместе с
        # сортировкой по аннотированному полю Postgres требует, чтобы поле
        # сортировки было в SELECT; проверяем, что запрос не падает.
        response = self.http.get(
            "/api/v1/clients/?company=sportmax&membership_expires_in_days=30&ordering=-membership_end",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)

    def test_client_list_ignores_unknown_ordering_key(self) -> None:
        response = self.http.get(
            "/api/v1/clients/?company=sportmax&ordering=not-a-real-field",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)

    def test_client_list_supports_membership_expiry_filter(self) -> None:
        Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Светлана",
            last_name="Кузнецова",
            phone="+79994445566",
        )
        Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=Client.objects.get(phone="+79994445566"),
            title="Долгий абонемент",
            status=Membership.Status.ACTIVE,
            starts_at=timezone.localdate(),
            ends_at=timezone.localdate() + timedelta(days=90),
        )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&membership_expires_in_days=30",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "Петров Иван")

    def test_client_list_pagination(self) -> None:
        for index in range(5):
            Client.objects.create(
                company=self.company,
                branch=self.branch,
                first_name=f"Клиент{index}",
                last_name="Тестов",
                phone=f"+799900000{index:02d}",
            )

        response = self.http.get(
            "/api/v1/clients/?company=sportmax&page=1",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 6)
        self.assertEqual(len(payload["results"]), 6)
        self.assertIsNone(payload["previous"])

    def test_company_context_returns_tenant_summary(self) -> None:
        response = self.http.get(
            "/api/v1/company/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["slug"], "sportmax")
        self.assertEqual(payload["clients_count"], 1)

    def test_client_create_adds_new_client(self) -> None:
        response = self.http.post(
            "/api/v1/clients/?company=sportmax",
            data={
                "first_name": "Елена",
                "last_name": "Климова",
                "phone": "+79993334455",
                "email": "elena@example.com",
                "branch_id": self.branch.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["full_name"], "Климова Елена")
        self.assertEqual(Client.objects.filter(company=self.company).count(), 2)

    def test_client_detail_and_update(self) -> None:
        detail_response = self.http.get(
            f"/api/v1/clients/{self.client_record.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["phone"], "+79991112233")
        self.assertFalse(detail_response.json()["club_access_blocked"])
        self.assertFalse(detail_response.json()["group_programs_blocked"])

        update_response = self.http.patch(
            f"/api/v1/clients/{self.client_record.id}/?company=sportmax",
            data={"notes": "Нужен повторный звонок", "is_active": True},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(update_response.status_code, 200)
        self.client_record.refresh_from_db()
        self.assertEqual(self.client_record.notes, "Нужен повторный звонок")

    def test_client_block_fields_can_be_updated_only_by_manage_roles(self) -> None:
        manager_response = self.http.patch(
            f"/api/v1/clients/{self.client_record.id}/?company=sportmax",
            data={"club_access_blocked": True, "group_programs_blocked": True},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(manager_response.status_code, 200)
        self.client_record.refresh_from_db()
        self.assertTrue(self.client_record.club_access_blocked)
        self.assertTrue(self.client_record.group_programs_blocked)

        employee_token = Token.objects.create(user=self.employee_user)
        employee_response = self.http.patch(
            f"/api/v1/clients/{self.client_record.id}/?company=sportmax",
            data={"club_access_blocked": False},
            content_type="application/json",
            **{"HTTP_AUTHORIZATION": f"Token {employee_token.key}"},
        )
        self.assertEqual(employee_response.status_code, 400)
        self.client_record.refresh_from_db()
        self.assertTrue(self.client_record.club_access_blocked)

    def test_branch_list_returns_company_branches(self) -> None:
        response = self.http.get(
            "/api/v1/branches/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["name"], "Main Hall")


class ClientProfileApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(
            username="manager",
            password="admin12345",
        )
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
        self.program = GroupProgram.objects.create(
            company=self.company,
            title="Йога",
            code="YOGA",
            description="Описание",
            color="#123456",
            sort_order=1,
            is_active=True,
        )
        self.slot = GroupScheduleSlot.objects.create(
            company=self.company,
            program=self.program,
            branch=self.branch,
            session_date=timezone.localdate() + timedelta(days=1),
            start_time=datetime.strptime("09:00", "%H:%M").time(),
            end_time=datetime.strptime("10:00", "%H:%M").time(),
            room="Main Hall",
        )
        self.token = Token.objects.create(user=self.user)

        Booking.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Функциональная тренировка",
            starts_at=timezone.now() - timedelta(days=2),
            ends_at=timezone.now() - timedelta(days=2) + timedelta(hours=1),
            status=Booking.Status.COMPLETED,
            source="1c",
            room="Зал №1",
            lesson_type="group",
            payment_basis="Абонемент",
        )
        GroupSlotEnrollment.objects.create(
            company=self.company,
            slot=self.slot,
            client=self.client_record,
            status=GroupSlotEnrollment.Status.CANCELLED,
            notes="Запись через расписание",
        )

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_client_profile_includes_bookings_and_group_enrollments(self) -> None:
        response = self.http.get(
            f"/api/v1/clients/{self.client_record.id}/profile/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["lessons"]), 2)
        titles = {item["title"]: item for item in payload["lessons"]}
        self.assertIn("Функциональная тренировка", titles)
        self.assertIn("Йога", titles)
        self.assertEqual(titles["Функциональная тренировка"]["source"], "1c")
        self.assertEqual(titles["Йога"]["source"], "schedule")
        self.assertEqual(titles["Йога"]["status"], "cancelled")
