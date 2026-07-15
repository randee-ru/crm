from __future__ import annotations

from django.db import migrations


def forwards(apps, schema_editor) -> None:
    Company = apps.get_model("companies", "Company")
    role_aliases = {
        "employee": "reception",
        "staff": "user",
    }

    for company in Company.objects.all().iterator():
        role_disabled_modules = dict(company.role_disabled_modules or {})
        changed = False

        for legacy_role, canonical_role in role_aliases.items():
            if legacy_role not in role_disabled_modules:
                continue

            modules = list(role_disabled_modules.get(canonical_role, []))
            for module in role_disabled_modules.pop(legacy_role, []):
                if module not in modules:
                    modules.append(module)
            role_disabled_modules[canonical_role] = modules
            changed = True

        if changed:
            company.role_disabled_modules = role_disabled_modules
            company.save(update_fields=["role_disabled_modules"])


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0003_company_role_disabled_modules_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
