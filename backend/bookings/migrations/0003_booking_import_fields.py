from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='external_key',
            field=models.CharField(blank=True, db_index=True, max_length=128, verbose_name='Ключ импорта'),
        ),
        migrations.AddField(
            model_name='booking',
            name='lesson_type',
            field=models.CharField(blank=True, max_length=120, verbose_name='Тип занятия'),
        ),
        migrations.AddField(
            model_name='booking',
            name='payment_basis',
            field=models.CharField(blank=True, max_length=120, verbose_name='Основание оплаты'),
        ),
        migrations.AddField(
            model_name='booking',
            name='room',
            field=models.CharField(blank=True, max_length=120, verbose_name='Зал'),
        ),
    ]
