from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0003_deal_pipelines'),
    ]

    operations = [
        migrations.AddField(
            model_name='deal',
            name='channel',
            field=models.CharField(blank=True, max_length=64, verbose_name='Канал'),
        ),
        migrations.AddField(
            model_name='deal',
            name='closed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата закрытия'),
        ),
        migrations.AddField(
            model_name='deal',
            name='deal_type',
            field=models.CharField(blank=True, max_length=64, verbose_name='Тип сделки'),
        ),
        migrations.AddField(
            model_name='deal',
            name='description',
            field=models.TextField(blank=True, verbose_name='Описание'),
        ),
        migrations.AddField(
            model_name='deal',
            name='external_key',
            field=models.CharField(blank=True, db_index=True, max_length=128, verbose_name='Ключ импорта'),
        ),
        migrations.AddField(
            model_name='deal',
            name='manager_name',
            field=models.CharField(blank=True, max_length=120, verbose_name='Менеджер'),
        ),
        migrations.AddField(
            model_name='deal',
            name='result_label',
            field=models.CharField(blank=True, max_length=120, verbose_name='Результат'),
        ),
        migrations.AddField(
            model_name='deal',
            name='source_name',
            field=models.CharField(blank=True, max_length=120, verbose_name='Источник'),
        ),
    ]
