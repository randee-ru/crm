from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("employees", "0005_trainer_middle_name"),
    ]

    operations = [
        migrations.AlterField(
            model_name="trainer",
            name="phone",
            field=models.CharField(blank=True, max_length=32, null=True, verbose_name="Телефон"),
        ),
        migrations.RemoveConstraint(
            model_name="trainer",
            name="uniq_trainer_phone_per_company",
        ),
        migrations.AddConstraint(
            model_name="trainer",
            constraint=models.UniqueConstraint(
                condition=Q(phone__isnull=False),
                fields=("company", "phone"),
                name="uniq_trainer_phone_per_company",
            ),
        ),
    ]
