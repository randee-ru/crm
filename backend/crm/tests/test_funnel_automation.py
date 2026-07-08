from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client
from companies.models import Company
from crm.funnel_services import (
    create_renewal_deals,
    move_visit_done_to_follow_up,
    run_funnel_automation_for_company,
    update_renewal_stages,
)
from crm.models import Deal, Task
from crm.pipelines import (
    RENEWAL_PIPELINE_SLUG,
    SALES_PIPELINE_SLUG,
    ensure_default_pipeline,
    get_renewal_pipeline,
    get_stage_by_code,
)
from memberships.models import Membership


class FunnelAutomationTest(TestCase):
    def setUp(self) -> None:
        self.user = get_user_model().objects.create_user(username="mgr", password="pass")
        self.company = Company.objects.create(name="Fit", slug="fit")
        self.branch = Branch.objects.create(company=self.company, name="Main")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.MANAGER,
        )
        self.client_record = Client.objects.create(
            company=self.company,
            branch=self.branch,
            first_name="Анна",
            last_name="Иванова",
            phone="+79990001122",
        )
        ensure_default_pipeline(self.company)
        from crm.pipelines import get_sales_pipeline

        self.sales_pipeline = get_sales_pipeline(self.company)
        self.renewal_pipeline = get_renewal_pipeline(self.company)

    def test_pipelines_have_correct_stages(self) -> None:
        sales_codes = set(self.sales_pipeline.stages.values_list("code", flat=True))
        self.assertIn("visit_scheduled", sales_codes)
        self.assertIn("follow_up", sales_codes)
        self.assertEqual(self.sales_pipeline.name, "Продажа абонемента")

        renewal_codes = set(self.renewal_pipeline.stages.values_list("code", flat=True))
        self.assertIn("renewal_30", renewal_codes)
        self.assertIn("renewal_lost", renewal_codes)

    def test_visit_done_moves_to_follow_up_after_2_hours(self) -> None:
        visit_done = get_stage_by_code(self.sales_pipeline, "visit_done")
        deal = Deal.objects.create(
            company=self.company,
            pipeline=self.sales_pipeline,
            stage=visit_done,
            title="Тест визит",
            visit_done_at=timezone.now() - timedelta(hours=3),
        )
        moved = move_visit_done_to_follow_up(self.company)
        self.assertEqual(moved, 1)
        deal.refresh_from_db()
        self.assertEqual(deal.stage.code, "follow_up")
        self.assertTrue(deal.follow_up_started_at)
        self.assertEqual(deal.tasks.count(), 5)

    def test_visit_done_not_moved_before_2_hours(self) -> None:
        visit_done = get_stage_by_code(self.sales_pipeline, "visit_done")
        deal = Deal.objects.create(
            company=self.company,
            pipeline=self.sales_pipeline,
            stage=visit_done,
            title="Свежий визит",
            visit_done_at=timezone.now() - timedelta(minutes=30),
        )
        moved = move_visit_done_to_follow_up(self.company)
        self.assertEqual(moved, 0)
        deal.refresh_from_db()
        self.assertEqual(deal.stage.code, "visit_done")

    def test_create_renewal_deal_30_days_before_end(self) -> None:
        today = timezone.localdate()
        membership = Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Безлимит 12 мес",
            status=Membership.Status.ACTIVE,
            starts_at=today - timedelta(days=335),
            ends_at=today + timedelta(days=30),
            price=Decimal("15000"),
        )
        created = create_renewal_deals(self.company)
        self.assertEqual(created, 1)
        deal = Deal.objects.get(membership=membership)
        self.assertEqual(deal.pipeline.slug, RENEWAL_PIPELINE_SLUG)
        self.assertEqual(deal.stage.code, "renewal_30")
        self.assertEqual(deal.external_key, f"renewal:membership:{membership.pk}")

    def test_renewal_stage_auto_transition(self) -> None:
        today = timezone.localdate()
        membership = Membership.objects.create(
            company=self.company,
            branch=self.branch,
            client=self.client_record,
            title="Месячный",
            status=Membership.Status.ACTIVE,
            starts_at=today - timedelta(days=23),
            ends_at=today + timedelta(days=7),
            price=Decimal("5000"),
        )
        stage_30 = get_stage_by_code(self.renewal_pipeline, "renewal_30")
        deal = Deal.objects.create(
            company=self.company,
            pipeline=self.renewal_pipeline,
            stage=stage_30,
            client=self.client_record,
            membership=membership,
            title="Продление",
            external_key=f"renewal:membership:{membership.pk}",
        )
        updated = update_renewal_stages(self.company)
        self.assertGreaterEqual(updated, 1)
        deal.refresh_from_db()
        self.assertEqual(deal.stage.code, "renewal_7")

    def test_run_funnel_automation_for_company(self) -> None:
        result = run_funnel_automation_for_company(self.company)
        self.assertIn("visit_to_follow_up", result)
        self.assertIn("renewal_deals_created", result)


class DealLossReasonValidationTest(TestCase):
    def setUp(self) -> None:
        self.http = __import__("django.test").test.Client()
        from rest_framework.authtoken.models import Token

        self.user = get_user_model().objects.create_user(username="mgr2", password="pass")
        self.company = Company.objects.create(name="Club", slug="club")
        self.branch = Branch.objects.create(company=self.company, name="B1")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            branch=self.branch,
            role=CompanyMembership.Role.MANAGER,
        )
        self.token = Token.objects.create(user=self.user)
        self.pipeline = ensure_default_pipeline(self.company)
        self.new_stage = get_stage_by_code(self.pipeline, "new_lead")
        self.lost_stage = get_stage_by_code(self.pipeline, "lost")

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_loss_reason_required_on_lost_stage(self) -> None:
        deal = Deal.objects.create(
            company=self.company,
            pipeline=self.pipeline,
            stage=self.new_stage,
            title="Тест",
        )
        response = self.http.patch(
            f"/api/v1/deals/{deal.id}/?company=club",
            data={"stage_id": self.lost_stage.id},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("loss_reason", response.json())

        response_ok = self.http.patch(
            f"/api/v1/deals/{deal.id}/?company=club",
            data={"stage_id": self.lost_stage.id, "loss_reason": "expensive"},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response_ok.status_code, 200)
        deal.refresh_from_db()
        self.assertEqual(deal.loss_reason, "expensive")
