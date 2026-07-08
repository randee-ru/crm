from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_sales_pipeline_stages(apps, schema_editor):
    """Обновляет этапы воронки продаж и переносит сделки со старых кодов."""
    DealPipeline = apps.get_model("crm", "DealPipeline")
    DealStage = apps.get_model("crm", "DealStage")
    Deal = apps.get_model("crm", "Deal")

    sales_stages = [
        {"name": "Новая заявка", "code": "new_lead", "color": "#3d5f8f", "sort_order": 10, "is_won": False, "is_lost": False},
        {"name": "Назначен визит", "code": "visit_scheduled", "color": "#4a90d9", "sort_order": 20, "is_won": False, "is_lost": False},
        {"name": "Визит состоялся", "code": "visit_done", "color": "#2eb8d4", "sort_order": 30, "is_won": False, "is_lost": False},
        {"name": "Повторный контакт", "code": "follow_up", "color": "#3dba5c", "sort_order": 40, "is_won": False, "is_lost": False},
        {"name": "Оформление договора", "code": "contract", "color": "#e8a020", "sort_order": 50, "is_won": False, "is_lost": False},
        {"name": "Продано", "code": "won", "color": "#2fa34d", "sort_order": 60, "is_won": True, "is_lost": False},
        {"name": "Потеряно", "code": "lost", "color": "#8b98a8", "sort_order": 70, "is_won": False, "is_lost": True},
    ]

    renewal_stages = [
        {"name": "До окончания 30 дней", "code": "renewal_30", "color": "#3d5f8f", "sort_order": 10, "is_won": False, "is_lost": False},
        {"name": "До окончания 15 дней", "code": "renewal_15", "color": "#4a90d9", "sort_order": 20, "is_won": False, "is_lost": False},
        {"name": "До окончания 7 дней", "code": "renewal_7", "color": "#2eb8d4", "sort_order": 30, "is_won": False, "is_lost": False},
        {"name": "До окончания 3 дня", "code": "renewal_3", "color": "#e8a020", "sort_order": 40, "is_won": False, "is_lost": False},
        {"name": "Заканчивается сегодня", "code": "renewal_today", "color": "#e85d04", "sort_order": 50, "is_won": False, "is_lost": False},
        {"name": "Просрочено", "code": "renewal_overdue", "color": "#d62828", "sort_order": 60, "is_won": False, "is_lost": False},
        {"name": "Продлил", "code": "renewal_won", "color": "#2fa34d", "sort_order": 70, "is_won": True, "is_lost": False},
        {"name": "Не продлил", "code": "renewal_lost", "color": "#8b98a8", "sort_order": 80, "is_won": False, "is_lost": True},
    ]

    legacy_map = {
        "trial": "visit_scheduled",
        "trial_done": "visit_done",
        "offer": "follow_up",
        "payment": "contract",
    }

    for pipeline in DealPipeline.objects.filter(slug="membership-sales"):
        pipeline.name = "Продажа абонемента"
        pipeline.save(update_fields=["name"])

        for stage_data in sales_stages:
            DealStage.objects.update_or_create(
                pipeline=pipeline,
                code=stage_data["code"],
                defaults=stage_data,
            )

        for old_code, new_code in legacy_map.items():
            old_stage = DealStage.objects.filter(pipeline=pipeline, code=old_code).first()
            new_stage = DealStage.objects.filter(pipeline=pipeline, code=new_code).first()
            if old_stage and new_stage and old_stage.id != new_stage.id:
                Deal.objects.filter(pipeline=pipeline, stage=old_stage).update(stage=new_stage)

    Company = apps.get_model("companies", "Company")
    for company in Company.objects.all():
        renewal_pipeline, _ = DealPipeline.objects.get_or_create(
            company=company,
            slug="membership-renewal",
            defaults={
                "name": "Продление абонемента",
                "is_default": False,
                "is_active": True,
                "sort_order": 10,
            },
        )
        for stage_data in renewal_stages:
            DealStage.objects.update_or_create(
                pipeline=renewal_pipeline,
                code=stage_data["code"],
                defaults=stage_data,
            )


class Migration(migrations.Migration):

    # RunPython переносит сделки между этапами — на PostgreSQL нельзя в одной транзакции с CREATE INDEX.
    atomic = False

    dependencies = [
        ("memberships", "0001_initial"),
        ("crm", "0004_deal_import_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="deal",
            name="client_interest",
            field=models.CharField(
                blank=True,
                choices=[
                    ("gym", "Тренажерный зал"),
                    ("group", "Групповые программы"),
                    ("personal", "Персональные тренировки"),
                    ("pool", "Бассейн"),
                    ("kids", "Детские секции"),
                    ("family", "Семейная карта"),
                    ("day", "Дневная карта"),
                    ("full", "Полный абонемент"),
                    ("corporate", "Корпоративный абонемент"),
                ],
                max_length=32,
                verbose_name="Интерес клиента",
            ),
        ),
        migrations.AddField(
            model_name="deal",
            name="contact_email",
            field=models.EmailField(blank=True, max_length=254, verbose_name="Email"),
        ),
        migrations.AddField(
            model_name="deal",
            name="contact_name",
            field=models.CharField(blank=True, max_length=255, verbose_name="Имя контакта"),
        ),
        migrations.AddField(
            model_name="deal",
            name="contact_phone",
            field=models.CharField(blank=True, max_length=32, verbose_name="Телефон"),
        ),
        migrations.AddField(
            model_name="deal",
            name="desired_tariff",
            field=models.CharField(blank=True, max_length=120, verbose_name="Желаемый тариф"),
        ),
        migrations.AddField(
            model_name="deal",
            name="follow_up_started_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Начало повторного контакта"),
        ),
        migrations.AddField(
            model_name="deal",
            name="lead_source",
            field=models.CharField(
                blank=True,
                choices=[
                    ("site", "Сайт"),
                    ("call", "Звонок"),
                    ("whatsapp", "WhatsApp"),
                    ("telegram", "Telegram"),
                    ("avito", "Авито"),
                    ("yandex_direct", "Яндекс Директ"),
                    ("vk", "VK"),
                    ("referral", "Рекомендация"),
                    ("offline_ads", "Офлайн-реклама"),
                    ("other", "Другое"),
                ],
                max_length=32,
                verbose_name="Источник лида",
            ),
        ),
        migrations.AddField(
            model_name="deal",
            name="loss_reason",
            field=models.CharField(
                blank=True,
                choices=[
                    ("expensive", "Дорого"),
                    ("other_club", "Выбрал другой клуб"),
                    ("far", "Далеко ехать"),
                    ("no_time", "Нет времени"),
                    ("no_answer", "Не дозвонились"),
                    ("changed_mind", "Передумал"),
                    ("club_dislike", "Не устроил клуб"),
                    ("no_visit", "Не пришел на визит"),
                    ("other", "Другое"),
                ],
                max_length=32,
                verbose_name="Причина отказа",
            ),
        ),
        migrations.AddField(
            model_name="deal",
            name="manager_comment",
            field=models.TextField(blank=True, verbose_name="Комментарий менеджера"),
        ),
        migrations.AddField(
            model_name="deal",
            name="membership",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="renewal_deals",
                to="memberships.membership",
                verbose_name="Абонемент",
            ),
        ),
        migrations.AddField(
            model_name="deal",
            name="next_contact_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Следующий контакт"),
        ),
        migrations.AddField(
            model_name="deal",
            name="proposed_tariff",
            field=models.CharField(blank=True, max_length=120, verbose_name="Предложенный тариф"),
        ),
        migrations.AddField(
            model_name="deal",
            name="renewal_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
                verbose_name="Сумма продления",
            ),
        ),
        migrations.AddField(
            model_name="deal",
            name="visit_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Дата визита"),
        ),
        migrations.AddField(
            model_name="deal",
            name="visit_done_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Визит состоялся в"),
        ),
        migrations.AddField(
            model_name="deal",
            name="visit_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("tour", "Экскурсия"),
                    ("presentation", "Презентация клуба"),
                    ("trial", "Пробная тренировка"),
                    ("consultation", "Консультация"),
                    ("immediate", "Сразу покупка"),
                ],
                max_length=32,
                verbose_name="Тип визита",
            ),
        ),
        migrations.AddField(
            model_name="task",
            name="automation_key",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=128,
                verbose_name="Ключ автоматизации",
            ),
        ),
        migrations.AddField(
            model_name="task",
            name="deal",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tasks",
                to="crm.deal",
                verbose_name="Сделка",
            ),
        ),
        migrations.CreateModel(
            name="DealContactHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "contact_type",
                    models.CharField(
                        choices=[
                            ("call", "Звонок"),
                            ("messenger", "Мессенджер"),
                            ("visit", "Визит"),
                            ("email", "Email"),
                            ("note", "Заметка"),
                        ],
                        default="note",
                        max_length=20,
                        verbose_name="Тип контакта",
                    ),
                ),
                ("contacted_at", models.DateTimeField(verbose_name="Дата контакта")),
                ("comment", models.TextField(blank=True, verbose_name="Комментарий")),
                (
                    "deal",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contact_history",
                        to="crm.deal",
                        verbose_name="Сделка",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="deal_contacts",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Менеджер",
                    ),
                ),
            ],
            options={
                "verbose_name": "Контакт по сделке",
                "verbose_name_plural": "Контакты по сделкам",
                "ordering": ["-contacted_at"],
            },
        ),
        migrations.CreateModel(
            name="DealStageHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("comment", models.TextField(blank=True, verbose_name="Комментарий")),
                (
                    "changed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="deal_stage_changes",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Кто изменил",
                    ),
                ),
                (
                    "deal",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="stage_history",
                        to="crm.deal",
                        verbose_name="Сделка",
                    ),
                ),
                (
                    "from_stage",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="history_from",
                        to="crm.dealstage",
                        verbose_name="С этапа",
                    ),
                ),
                (
                    "to_stage",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="history_to",
                        to="crm.dealstage",
                        verbose_name="На этап",
                    ),
                ),
            ],
            options={
                "verbose_name": "История этапа сделки",
                "verbose_name_plural": "История этапов сделок",
                "ordering": ["-created_at"],
            },
        ),
        migrations.RunPython(migrate_sales_pipeline_stages, migrations.RunPython.noop),
    ]
