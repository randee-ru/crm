from __future__ import annotations

from django.db import migrations, models


def forwards(apps, schema_editor) -> None:
    CompanyMembership = apps.get_model("accounts", "CompanyMembership")
    EmployeeInvitation = apps.get_model("accounts", "EmployeeInvitation")

    CompanyMembership.objects.filter(role="employee").update(role="reception")
    EmployeeInvitation.objects.filter(role="employee").update(role="reception")


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_employeeinvitation"),
    ]

    operations = [
        migrations.AlterField(
            model_name="companymembership",
            name="role",
            field=models.CharField(
                choices=[
                    ("owner", "Владелец"),
                    ("admin", "Администратор"),
                    ("manager", "Менеджер"),
                    ("reception", "Ресепшен"),
                    ("user", "Пользователь"),
                ],
                default="reception",
                max_length=20,
                verbose_name="Роль",
            ),
        ),
        migrations.AlterField(
            model_name="employeeinvitation",
            name="role",
            field=models.CharField(
                choices=[
                    ("owner", "Владелец"),
                    ("admin", "Администратор"),
                    ("manager", "Менеджер"),
                    ("reception", "Ресепшен"),
                    ("user", "Пользователь"),
                ],
                default="reception",
                max_length=20,
                verbose_name="Роль",
            ),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
