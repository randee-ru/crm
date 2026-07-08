from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from crm.models import Deal
from crm.pipelines import ensure_default_pipeline, get_stage_by_code


class DealApiTest(TestCase):
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
        self.token = Token.objects.create(user=self.user)
        self.pipeline = ensure_default_pipeline(self.company)
        self.new_stage = get_stage_by_code(self.pipeline, "new_lead")
        self.offer_stage = get_stage_by_code(self.pipeline, "follow_up")

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_deal_create_and_list(self) -> None:
        create_response = self.http.post(
            "/api/v1/deals/?company=sportmax",
            data={
                "title": "Абонемент VIP",
                "amount": "15000.00",
                "stage_id": self.new_stage.id,
                "client_id": self.client_record.id,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_response.status_code, 201)
        payload = create_response.json()
        self.assertEqual(payload["title"], "Абонемент VIP")
        self.assertEqual(payload["stage_id"], self.new_stage.id)

        list_response = self.http.get(
            "/api/v1/deals/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(list_response.status_code, 200)
        payload = list_response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(len(payload["results"]), 1)

    def test_deal_stage_update(self) -> None:
        deal = Deal.objects.create(
            company=self.company,
            pipeline=self.pipeline,
            stage=self.new_stage,
            branch=self.branch,
            client=self.client_record,
            assigned_to=self.user,
            title="Семейный тариф",
            amount=Decimal("24000.00"),
        )

        response = self.http.patch(
            f"/api/v1/deals/{deal.id}/?company=sportmax",
            data={"stage_id": self.offer_stage.id},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        deal.refresh_from_db()
        self.assertEqual(deal.stage_id, self.offer_stage.id)

    def test_deal_delete(self) -> None:
        deal = Deal.objects.create(
            company=self.company,
            pipeline=self.pipeline,
            stage=self.new_stage,
            branch=self.branch,
            client=self.client_record,
            assigned_to=self.user,
            title="Удаляемая сделка",
            amount=Decimal("1000.00"),
        )

        response = self.http.delete(
            f"/api/v1/deals/{deal.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Deal.objects.filter(id=deal.id).exists())

    def test_deal_detail_without_renewal_fields(self) -> None:
        deal = Deal.objects.create(
            company=self.company,
            pipeline=self.pipeline,
            stage=self.new_stage,
            title="Заявка — звонок +79991234567",
            contact_phone="+79991234567",
            amount=Decimal("0.00"),
        )

        response = self.http.get(
            f"/api/v1/deals/{deal.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsNone(payload["client_id"])
        self.assertIsNone(payload["renewal_amount"])
        self.assertIn("linked_calls", payload)
        self.assertIn("tasks", payload)

    def test_deal_contact_create_and_detail(self) -> None:
        deal = Deal.objects.create(
            company=self.company,
            pipeline=self.pipeline,
            stage=self.new_stage,
            branch=self.branch,
            client=self.client_record,
            assigned_to=self.user,
            title="Контакт по сделке",
            amount=Decimal("5000.00"),
        )

        contact_response = self.http.post(
            f"/api/v1/deals/{deal.id}/contacts/?company=sportmax",
            data={
                "contact_type": "call",
                "contacted_at": "2026-07-10T14:00:00+03:00",
                "comment": "Перезвонить по тарифу",
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(contact_response.status_code, 201)
        payload = contact_response.json()
        self.assertEqual(payload["contact_type"], "call")
        self.assertEqual(payload["comment"], "Перезвонить по тарифу")

        detail_response = self.http.get(
            f"/api/v1/deals/{deal.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(detail_response.status_code, 200)
        detail = detail_response.json()
        self.assertEqual(len(detail["contact_history"]), 1)
        if detail["stage_history"]:
            self.assertIsNone(detail["stage_history"][0]["from_stage_code"])
        deal.refresh_from_db()
        self.assertIsNotNone(deal.next_contact_at)

    def test_deal_task_create_and_list(self) -> None:
        from crm.models import Task

        deal = Deal.objects.create(
            company=self.company,
            pipeline=self.pipeline,
            stage=self.new_stage,
            branch=self.branch,
            client=self.client_record,
            assigned_to=self.user,
            title="Задачи по сделке",
            amount=Decimal("3000.00"),
        )

        task_response = self.http.post(
            "/api/v1/tasks/?company=sportmax",
            data={
                "title": "Отправить КП",
                "deal_id": deal.id,
                "due_at": "2026-07-08T10:00:00+03:00",
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(task_response.status_code, 201)
        self.assertEqual(task_response.json()["title"], "Отправить КП")

        list_response = self.http.get(
            f"/api/v1/tasks/?company=sportmax&deal={deal.id}",
            **self.auth_headers(),
        )
        self.assertEqual(list_response.status_code, 200)
        tasks = list_response.json()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["deal_id"], deal.id)

        detail_response = self.http.get(
            f"/api/v1/deals/{deal.id}/?company=sportmax",
            **self.auth_headers(),
        )
        self.assertEqual(len(detail_response.json()["tasks"]), 1)

        task_id = tasks[0]["id"]
        done_response = self.http.patch(
            f"/api/v1/tasks/{task_id}/?company=sportmax",
            data={"status": Task.Status.DONE},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(done_response.status_code, 200)
        self.assertEqual(done_response.json()["status"], Task.Status.DONE)


class PipelineApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(
            username="owner",
            password="admin12345",
        )
        self.company = Company.objects.create(name="Fit Club", slug="fitclub")
        self.branch = Branch.objects.create(company=self.company, name="Center")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.MANAGER,
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_pipeline_list_creates_default_fitness_pipeline(self) -> None:
        response = self.http.get(
            "/api/v1/pipelines/?company=fitclub",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        pipelines = response.json()
        self.assertEqual(len(pipelines), 4)
        general = next(p for p in pipelines if p["slug"] == "general")
        self.assertEqual(general["name"], "Общая воронка")
        self.assertTrue(general["is_default"])
        sales = next(p for p in pipelines if p["slug"] == "membership-sales")
        self.assertEqual(sales["name"], "Продажа абонемента")
        self.assertGreaterEqual(len(sales["stages"]), 7)
        stage_names = [stage["name"] for stage in sales["stages"]]
        self.assertIn("Назначен визит", stage_names)
        self.assertIn("Продано", stage_names)

    def test_pipeline_create_and_stage_create(self) -> None:
        create_pipeline = self.http.post(
            "/api/v1/pipelines/?company=fitclub",
            data={
                "name": "Корпоративные продажи",
                "slug": "corporate",
                "sort_order": 10,
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_pipeline.status_code, 201)
        pipeline_id = create_pipeline.json()["id"]
        pipeline_payload = create_pipeline.json()
        self.assertEqual(len(pipeline_payload["stages"]), 7)

        create_stage = self.http.post(
            f"/api/v1/pipelines/{pipeline_id}/stages/?company=fitclub",
            data={
                "name": "Первый контакт",
                "color": "#336699",
            },
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(create_stage.status_code, 201)
        payload = create_stage.json()
        self.assertEqual(payload["name"], "Первый контакт")
        self.assertEqual(payload["code"], "pervyy-kontakt")
        self.assertFalse(payload["is_won"])
        self.assertFalse(payload["is_lost"])

    def test_stage_reorder_and_delete(self) -> None:
        pipeline_response = self.http.get(
            "/api/v1/pipelines/?company=fitclub",
            **self.auth_headers(),
        )
        pipeline = pipeline_response.json()[0]
        pipeline_id = pipeline["id"]
        stage_ids = [stage["id"] for stage in pipeline["stages"]]
        reversed_ids = list(reversed(stage_ids))

        reorder_response = self.http.post(
            f"/api/v1/pipelines/{pipeline_id}/stages/reorder/?company=fitclub",
            data={"stage_ids": reversed_ids},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(reorder_response.status_code, 200)
        self.assertEqual([stage["id"] for stage in reorder_response.json()], reversed_ids)

        empty_stage_id = next(
            stage["id"] for stage in reorder_response.json() if stage["deals_count"] == 0
        )
        delete_response = self.http.delete(
            f"/api/v1/pipelines/{pipeline_id}/stages/{empty_stage_id}/?company=fitclub",
            **self.auth_headers(),
        )
        self.assertEqual(delete_response.status_code, 204)
