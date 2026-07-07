from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("branches", "0001_initial"),
        ("companies", "0001_initial"),
        ("employees", "0001_initial"),
        ("schedule", "0002_scheduleevent_trainer"),
    ]

    operations = [
        migrations.CreateModel(
            name="GroupProgram",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=160, verbose_name="Название")),
                ("code", models.CharField(blank=True, max_length=64, verbose_name="Код")),
                ("description", models.TextField(blank=True, verbose_name="Описание")),
                ("color", models.CharField(default="#2f6fed", max_length=16, verbose_name="Цвет")),
                ("sort_order", models.PositiveIntegerField(default=0, verbose_name="Порядок")),
                ("is_active", models.BooleanField(default=True, verbose_name="Активна")),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="group_programs",
                        to="companies.company",
                        verbose_name="Компания",
                    ),
                ),
            ],
            options={
                "verbose_name": "Групповая программа",
                "verbose_name_plural": "Групповые программы",
                "ordering": ["sort_order", "title"],
            },
        ),
        migrations.CreateModel(
            name="GroupScheduleSlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("weekday", models.PositiveSmallIntegerField(help_text="0 = понедельник", verbose_name="День недели")),
                ("start_time", models.TimeField(verbose_name="Начало")),
                ("end_time", models.TimeField(verbose_name="Окончание")),
                ("room", models.CharField(blank=True, max_length=120, verbose_name="Зал")),
                ("trainer_name", models.CharField(blank=True, max_length=120, verbose_name="Имя тренера")),
                ("description", models.TextField(blank=True, verbose_name="Описание")),
                ("restrictions", models.TextField(blank=True, verbose_name="Ограничения")),
                ("is_active", models.BooleanField(default=True, verbose_name="Активен")),
                (
                    "branch",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="group_schedule_slots",
                        to="branches.branch",
                        verbose_name="Филиал",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="group_schedule_slots",
                        to="companies.company",
                        verbose_name="Компания",
                    ),
                ),
                (
                    "program",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule_slots",
                        to="schedule.groupprogram",
                        verbose_name="Программа",
                    ),
                ),
                (
                    "trainer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="group_schedule_slots",
                        to="employees.trainer",
                        verbose_name="Тренер",
                    ),
                ),
            ],
            options={
                "verbose_name": "Слот группового расписания",
                "verbose_name_plural": "Слоты группового расписания",
                "ordering": ["weekday", "start_time", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="groupprogram",
            constraint=models.UniqueConstraint(fields=("company", "title"), name="uniq_group_program_title_per_company"),
        ),
    ]
