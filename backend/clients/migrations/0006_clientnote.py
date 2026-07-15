from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0005_client_secondary_phone"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClientNote",
            fields=[
                (
                    "id",
                    models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID"),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Создано")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Обновлено")),
                ("body", models.TextField(verbose_name="Заметка")),
                (
                    "client",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notes_entries",
                        to="clients.client",
                        verbose_name="Клиент",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="client_notes",
                        to="companies.company",
                        verbose_name="Компания",
                    ),
                ),
            ],
            options={
                "verbose_name": "Заметка клиента",
                "verbose_name_plural": "Заметки клиентов",
                "ordering": ["-created_at", "-id"],
            },
        ),
    ]
