from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0004_client_schedule_portal_password"),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="secondary_phone",
            field=models.CharField(blank=True, default="", max_length=32, verbose_name="Доп. телефон"),
        ),
    ]
