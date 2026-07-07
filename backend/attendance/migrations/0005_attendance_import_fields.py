from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0004_attendancerecord_locker_key'),
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancerecord',
            name='duration_minutes',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Длительность (мин)'),
        ),
        migrations.AddField(
            model_name='attendancerecord',
            name='external_key',
            field=models.CharField(blank=True, db_index=True, max_length=128, verbose_name='Ключ импорта'),
        ),
        migrations.AddField(
            model_name='attendancerecord',
            name='room',
            field=models.CharField(blank=True, max_length=120, verbose_name='Зал'),
        ),
        migrations.AddField(
            model_name='attendancerecord',
            name='visit_source',
            field=models.CharField(blank=True, max_length=120, verbose_name='Источник прохода'),
        ),
        migrations.AddConstraint(
            model_name='attendancerecord',
            constraint=models.UniqueConstraint(condition=models.Q(('external_key__gt', '')), fields=('company', 'external_key'), name='uniq_attendance_external_key'),
        ),
    ]
