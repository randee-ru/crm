from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='sale',
            name='external_number',
            field=models.CharField(blank=True, db_index=True, max_length=64, verbose_name='Номер в 1С'),
        ),
        migrations.AddField(
            model_name='sale',
            name='installment_info',
            field=models.CharField(blank=True, max_length=255, verbose_name='Рассрочка'),
        ),
        migrations.AddField(
            model_name='sale',
            name='promo_code',
            field=models.CharField(blank=True, max_length=64, verbose_name='Промокод'),
        ),
    ]
