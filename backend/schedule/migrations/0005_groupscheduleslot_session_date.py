from __future__ import annotations

from datetime import date, timedelta

from django.db import migrations, models


def migrate_weekday_to_session_date(apps, schema_editor) -> None:
    GroupScheduleSlot = apps.get_model("schedule", "GroupScheduleSlot")
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    for slot in GroupScheduleSlot.objects.all():
        weekday = getattr(slot, "weekday", 0) or 0
        slot.session_date = monday + timedelta(days=int(weekday))
        slot.save(update_fields=["session_date"])


class Migration(migrations.Migration):
    dependencies = [
        ("schedule", "0004_schedule_settings_enrollments"),
    ]

    operations = [
        migrations.AddField(
            model_name="groupscheduleslot",
            name="session_date",
            field=models.DateField(null=True, verbose_name="Дата занятия"),
        ),
        migrations.RunPython(migrate_weekday_to_session_date, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="groupscheduleslot",
            name="session_date",
            field=models.DateField(verbose_name="Дата занятия"),
        ),
        migrations.RemoveField(
            model_name="groupscheduleslot",
            name="weekday",
        ),
        migrations.AlterModelOptions(
            name="groupscheduleslot",
            options={
                "ordering": ["session_date", "start_time", "id"],
                "verbose_name": "Слот группового расписания",
                "verbose_name_plural": "Слоты группового расписания",
            },
        ),
    ]
