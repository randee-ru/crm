from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0003_client_club_access_blocked_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="schedule_portal_password",
            field=models.CharField(
                blank=True,
                max_length=128,
                verbose_name="Пароль личного кабинета расписания",
            ),
        ),
    ]
