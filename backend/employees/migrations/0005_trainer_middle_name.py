from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0004_traineraccesscard"),
    ]

    operations = [
        migrations.AddField(
            model_name="trainer",
            name="middle_name",
            field=models.CharField(blank=True, max_length=100, verbose_name="Отчество"),
        ),
    ]
