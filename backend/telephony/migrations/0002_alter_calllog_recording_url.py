from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("telephony", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="calllog",
            name="recording_url",
            field=models.TextField(blank=True, verbose_name="Ссылка на запись"),
        ),
    ]
