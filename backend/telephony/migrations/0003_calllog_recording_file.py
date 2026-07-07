from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("telephony", "0002_alter_calllog_recording_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="calllog",
            name="recording_archived_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Запись сохранена локально"),
        ),
        migrations.AddField(
            model_name="calllog",
            name="recording_file",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to="telephony/recordings/%Y/%m/",
                verbose_name="Локальная запись",
            ),
        ),
    ]
