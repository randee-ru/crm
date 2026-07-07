# Generated manually for 1C import

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='client',
            name='uniq_client_phone_per_company',
        ),
        migrations.AddField(
            model_name='client',
            name='external_id',
            field=models.CharField(blank=True, db_index=True, max_length=64, verbose_name='ID в 1С'),
        ),
        migrations.AddField(
            model_name='client',
            name='middle_name',
            field=models.CharField(blank=True, max_length=100, verbose_name='Отчество'),
        ),
        migrations.AddField(
            model_name='client',
            name='gender',
            field=models.CharField(choices=[('male', 'Мужской'), ('female', 'Женский'), ('unknown', 'Не указан')], default='unknown', max_length=10, verbose_name='Пол'),
        ),
        migrations.AddField(
            model_name='client',
            name='passport',
            field=models.CharField(blank=True, max_length=64, verbose_name='Паспорт'),
        ),
        migrations.AddField(
            model_name='client',
            name='card_number',
            field=models.CharField(blank=True, max_length=64, verbose_name='Номер карты'),
        ),
        migrations.AddField(
            model_name='client',
            name='card_status',
            field=models.CharField(blank=True, max_length=64, verbose_name='Статус карты'),
        ),
        migrations.AddField(
            model_name='client',
            name='client_status',
            field=models.CharField(blank=True, choices=[('lead', 'Потенциальный'), ('active', 'Действующий'), ('former', 'Бывший'), ('rejected', 'Отказ')], default='lead', max_length=20, verbose_name='Статус клиента'),
        ),
        migrations.AddField(
            model_name='client',
            name='client_status_label',
            field=models.CharField(blank=True, max_length=120, verbose_name='Статус (подпись)'),
        ),
        migrations.AddField(
            model_name='client',
            name='manager_name',
            field=models.CharField(blank=True, max_length=120, verbose_name='Менеджер'),
        ),
        migrations.AddField(
            model_name='client',
            name='lead_source',
            field=models.CharField(blank=True, max_length=120, verbose_name='Источник лида'),
        ),
        migrations.AddField(
            model_name='client',
            name='acquisition_channel',
            field=models.CharField(blank=True, max_length=120, verbose_name='Канал привлечения'),
        ),
        migrations.AddField(
            model_name='client',
            name='club_name',
            field=models.CharField(blank=True, max_length=120, verbose_name='Клуб'),
        ),
        migrations.AddField(
            model_name='client',
            name='contract_ref',
            field=models.CharField(blank=True, max_length=255, verbose_name='Договор (ссылка)'),
        ),
        migrations.AddField(
            model_name='client',
            name='ltv_total',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='LTV'),
        ),
        migrations.AddField(
            model_name='client',
            name='visit_count',
            field=models.PositiveIntegerField(default=0, verbose_name='Количество визитов'),
        ),
        migrations.AddField(
            model_name='client',
            name='visit_frequency',
            field=models.CharField(blank=True, max_length=64, verbose_name='Частота визитов'),
        ),
        migrations.AddField(
            model_name='client',
            name='max_break_days',
            field=models.PositiveIntegerField(default=0, verbose_name='Макс. перерыв (дней)'),
        ),
        migrations.AddField(
            model_name='client',
            name='registration_date',
            field=models.DateField(blank=True, null=True, verbose_name='Дата регистрации'),
        ),
        migrations.AddField(
            model_name='client',
            name='last_visit_date',
            field=models.DateField(blank=True, null=True, verbose_name='Последний визит'),
        ),
        migrations.AddField(
            model_name='client',
            name='last_payment_date',
            field=models.DateField(blank=True, null=True, verbose_name='Последняя оплата'),
        ),
        migrations.AddField(
            model_name='client',
            name='last_interaction_date',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Последнее взаимодействие'),
        ),
        migrations.AddField(
            model_name='client',
            name='membership_name',
            field=models.CharField(blank=True, max_length=255, verbose_name='Текущий абонемент'),
        ),
        migrations.AddField(
            model_name='client',
            name='membership_status',
            field=models.CharField(blank=True, max_length=64, verbose_name='Статус абонемента'),
        ),
        migrations.AddField(
            model_name='client',
            name='membership_start',
            field=models.DateField(blank=True, null=True, verbose_name='Абонемент с'),
        ),
        migrations.AddField(
            model_name='client',
            name='membership_end',
            field=models.DateField(blank=True, null=True, verbose_name='Абонемент до'),
        ),
        migrations.AddField(
            model_name='client',
            name='tags',
            field=models.JSONField(blank=True, default=list, verbose_name='Теги'),
        ),
        migrations.AddField(
            model_name='client',
            name='interests',
            field=models.JSONField(blank=True, default=list, verbose_name='Интересы'),
        ),
        migrations.AddField(
            model_name='client',
            name='is_deleted',
            field=models.BooleanField(default=False, verbose_name='Удалён в 1С'),
        ),
        migrations.AddConstraint(
            model_name='client',
            constraint=models.UniqueConstraint(condition=models.Q(('external_id__gt', '')), fields=('company', 'external_id'), name='uniq_client_external_id_per_company'),
        ),
        migrations.CreateModel(
            name='ClientMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('external_key', models.CharField(blank=True, db_index=True, max_length=128, verbose_name='Ключ импорта')),
                ('channel', models.CharField(blank=True, max_length=64, verbose_name='Канал')),
                ('message_type', models.CharField(blank=True, max_length=64, verbose_name='Тип')),
                ('kind', models.CharField(blank=True, max_length=64, verbose_name='Вид')),
                ('source', models.CharField(blank=True, max_length=120, verbose_name='Источник')),
                ('phone', models.CharField(blank=True, max_length=32, verbose_name='Телефон')),
                ('body', models.TextField(blank=True, verbose_name='Текст')),
                ('sent_at', models.DateTimeField(blank=True, null=True, verbose_name='Дата')),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='clients.client', verbose_name='Клиент')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='client_messages', to='companies.company', verbose_name='Компания')),
            ],
            options={
                'verbose_name': 'Сообщение клиента',
                'verbose_name_plural': 'Сообщения клиентов',
                'ordering': ['-sent_at', '-id'],
            },
        ),
        migrations.CreateModel(
            name='ClientLead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('external_key', models.CharField(blank=True, db_index=True, max_length=128, verbose_name='Ключ импорта')),
                ('title', models.CharField(blank=True, max_length=255, verbose_name='Название')),
                ('status', models.CharField(blank=True, max_length=64, verbose_name='Статус')),
                ('channel', models.CharField(blank=True, max_length=64, verbose_name='Канал')),
                ('club_name', models.CharField(blank=True, max_length=120, verbose_name='Клуб')),
                ('manager_name', models.CharField(blank=True, max_length=120, verbose_name='Менеджер')),
                ('comment', models.TextField(blank=True, verbose_name='Комментарий')),
                ('ad_source', models.CharField(blank=True, max_length=120, verbose_name='Рекламный источник')),
                ('utm_source', models.CharField(blank=True, max_length=120, verbose_name='UTM source')),
                ('utm_medium', models.CharField(blank=True, max_length=120, verbose_name='UTM medium')),
                ('utm_campaign', models.CharField(blank=True, max_length=120, verbose_name='UTM campaign')),
                ('utm_content', models.CharField(blank=True, max_length=120, verbose_name='UTM content')),
                ('utm_term', models.CharField(blank=True, max_length=120, verbose_name='UTM term')),
                ('lead_date', models.DateTimeField(blank=True, null=True, verbose_name='Дата')),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='leads', to='clients.client', verbose_name='Клиент')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='client_leads', to='companies.company', verbose_name='Компания')),
            ],
            options={
                'verbose_name': 'Лид клиента',
                'verbose_name_plural': 'Лиды клиентов',
                'ordering': ['-lead_date', '-id'],
            },
        ),
        migrations.AddConstraint(
            model_name='clientmessage',
            constraint=models.UniqueConstraint(condition=models.Q(('external_key__gt', '')), fields=('company', 'external_key'), name='uniq_client_message_external_key'),
        ),
    ]
