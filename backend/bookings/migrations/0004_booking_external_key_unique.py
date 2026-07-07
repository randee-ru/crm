from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_booking_import_fields'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(
                condition=models.Q(external_key__gt=''),
                fields=('company', 'external_key'),
                name='uniq_booking_external_key',
            ),
        ),
    ]
