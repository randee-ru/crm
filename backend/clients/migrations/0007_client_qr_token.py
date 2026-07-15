from __future__ import annotations

import uuid

from django.db import migrations, models


def populate_qr_tokens(apps, schema_editor):
    Client = apps.get_model("clients", "Client")
    for client in Client.objects.all().iterator():
        if not client.qr_token:
            client.qr_token = uuid.uuid4()
            client.save(update_fields=["qr_token"])


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0006_clientnote"),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="qr_token",
            field=models.UUIDField(
                default=None,
                blank=True,
                null=True,
                db_index=True,
                editable=False,
                unique=False,
                verbose_name="Токен QR",
            ),
        ),
        migrations.RunPython(populate_qr_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="client",
            name="qr_token",
            field=models.UUIDField(default=uuid.uuid4, db_index=True, editable=False, unique=True, verbose_name="Токен QR"),
        ),
    ]
