# Generated manually for fitness club kanban pipelines

from __future__ import annotations

import django.db.models.deletion
from django.db import migrations, models

DEFAULT_FITNESS_STAGES = [
    {
        "name": "Новая заявка",
        "code": "new_lead",
        "color": "#3d5f8f",
        "sort_order": 10,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Пробное занятие",
        "code": "trial",
        "color": "#4a90d9",
        "sort_order": 20,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Визит состоялся",
        "code": "trial_done",
        "color": "#2eb8d4",
        "sort_order": 30,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Коммерческое предложение",
        "code": "offer",
        "color": "#3dba5c",
        "sort_order": 40,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Ожидает оплату",
        "code": "payment",
        "color": "#e8a020",
        "sort_order": 50,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Абонемент оформлен",
        "code": "won",
        "color": "#2fa34d",
        "sort_order": 60,
        "is_won": True,
        "is_lost": False,
    },
    {
        "name": "Отказ",
        "code": "lost",
        "color": "#8b98a8",
        "sort_order": 70,
        "is_won": False,
        "is_lost": True,
    },
]

LEGACY_STAGE_MAP = {
    "new": "new_lead",
    "preparation": "trial",
    "prepayment": "payment",
    "in_progress": "offer",
    "final_invoice": "payment",
}


def forwards(apps, schema_editor) -> None:
    Company = apps.get_model("companies", "Company")
    Deal = apps.get_model("crm", "Deal")
    DealPipeline = apps.get_model("crm", "DealPipeline")
    DealStage = apps.get_model("crm", "DealStage")

    for company in Company.objects.all():
        pipeline, _ = DealPipeline.objects.get_or_create(
            company=company,
            slug="membership-sales",
            defaults={
                "name": "Продажи абонементов",
                "is_default": True,
                "is_active": True,
                "sort_order": 0,
            },
        )

        stage_by_code: dict[str, object] = {}
        for stage_data in DEFAULT_FITNESS_STAGES:
            stage, _ = DealStage.objects.update_or_create(
                pipeline=pipeline,
                code=stage_data["code"],
                defaults=stage_data,
            )
            stage_by_code[stage_data["code"]] = stage

        default_stage = stage_by_code["new_lead"]
        for deal in Deal.objects.filter(company=company):
            legacy_code = getattr(deal, "stage_legacy", None) or "new"
            target_code = LEGACY_STAGE_MAP.get(legacy_code, "new_lead")
            deal.pipeline_id = pipeline.id
            deal.stage_id = stage_by_code.get(target_code, default_stage).id
            deal.save(update_fields=["pipeline_id", "stage_id", "updated_at"])


def backwards(apps, schema_editor) -> None:
  Deal = apps.get_model("crm", "Deal")
  DealStage = apps.get_model("crm", "DealStage")

  reverse_map = {
      "new_lead": "new",
      "trial": "preparation",
      "trial_done": "preparation",
      "offer": "in_progress",
      "payment": "prepayment",
      "won": "final_invoice",
      "lost": "new",
  }

  for deal in Deal.objects.select_related("stage").all():
      if deal.stage_id:
          stage = DealStage.objects.filter(id=deal.stage_id).first()
          if stage:
              deal.stage_legacy = reverse_map.get(stage.code, "new")
              deal.save(update_fields=["stage_legacy", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0001_initial"),
        ("crm", "0002_deal"),
    ]

    operations = [
        migrations.CreateModel(
            name="DealPipeline",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120, verbose_name="Название")),
                ("slug", models.SlugField(max_length=80, verbose_name="Код")),
                ("is_default", models.BooleanField(default=False, verbose_name="По умолчанию")),
                ("is_active", models.BooleanField(default=True, verbose_name="Активна")),
                ("sort_order", models.PositiveIntegerField(default=0, verbose_name="Порядок")),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="deal_pipelines",
                        to="companies.company",
                        verbose_name="Компания",
                    ),
                ),
            ],
            options={
                "verbose_name": "Воронка",
                "verbose_name_plural": "Воронки",
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.CreateModel(
            name="DealStage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120, verbose_name="Название")),
                ("code", models.SlugField(max_length=80, verbose_name="Код")),
                ("color", models.CharField(default="#3d5f8f", max_length=7, verbose_name="Цвет")),
                ("sort_order", models.PositiveIntegerField(default=0, verbose_name="Порядок")),
                ("is_won", models.BooleanField(default=False, verbose_name="Успешный этап")),
                ("is_lost", models.BooleanField(default=False, verbose_name="Проигрыш")),
                (
                    "pipeline",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="stages",
                        to="crm.dealpipeline",
                        verbose_name="Воронка",
                    ),
                ),
            ],
            options={
                "verbose_name": "Этап воронки",
                "verbose_name_plural": "Этапы воронки",
                "ordering": ["sort_order", "id"],
            },
        ),
        migrations.RenameField(
            model_name="deal",
            old_name="stage",
            new_name="stage_legacy",
        ),
        migrations.AddField(
            model_name="deal",
            name="pipeline",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="deals",
                to="crm.dealpipeline",
                verbose_name="Воронка",
            ),
        ),
        migrations.AddField(
            model_name="deal",
            name="stage",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="deals",
                to="crm.dealstage",
                verbose_name="Этап",
            ),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(
            model_name="deal",
            name="stage_legacy",
        ),
        migrations.AlterField(
            model_name="deal",
            name="pipeline",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="deals",
                to="crm.dealpipeline",
                verbose_name="Воронка",
            ),
        ),
        migrations.AlterField(
            model_name="deal",
            name="stage",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="deals",
                to="crm.dealstage",
                verbose_name="Этап",
            ),
        ),
        migrations.AddConstraint(
            model_name="dealpipeline",
            constraint=models.UniqueConstraint(fields=("company", "slug"), name="uniq_pipeline_slug_per_company"),
        ),
        migrations.AddConstraint(
            model_name="dealstage",
            constraint=models.UniqueConstraint(fields=("pipeline", "code"), name="uniq_stage_code_per_pipeline"),
        ),
    ]
