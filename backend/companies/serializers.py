from __future__ import annotations

from rest_framework import serializers

from accounts.models import CompanyMembership
from companies.models import DEFAULT_ROLE_DISABLED_MODULES, Company, ROLE_ALIASES

# Роль "owner" сознательно исключена — владельцу нельзя скрыть меню, чтобы
# компания не могла случайно заблокировать сама себе доступ к настройкам.
RESTRICTABLE_ROLES = [
    choice for choice in CompanyMembership.Role.values if choice != CompanyMembership.Role.OWNER
]


def _dedupe(value: list[str]) -> list[str]:
    seen: dict[str, None] = {}
    for item in value:
        seen.setdefault(item, None)
    return list(seen.keys())


class CompanyModuleSettingsSerializer(serializers.ModelSerializer):
    disabled_modules = serializers.ListField(child=serializers.CharField(max_length=64), allow_empty=True)
    role_disabled_modules = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField(max_length=64)),
        required=False,
    )

    class Meta:
        model = Company
        fields = ["disabled_modules", "role_disabled_modules"]

    def validate_disabled_modules(self, value: list[str]) -> list[str]:
        # Убираем дубликаты, сохраняя порядок — список используется только как
        # фильтр видимости пунктов меню на фронтенде, строгий словарь id тут не нужен.
        return _dedupe(value)

    def validate_role_disabled_modules(self, value: dict[str, list[str]]) -> dict[str, list[str]]:
        normalized: dict[str, list[str]] = {}
        unknown_roles = set()
        for role, modules in value.items():
            canonical_role = ROLE_ALIASES.get(role, role)
            if canonical_role not in RESTRICTABLE_ROLES:
                unknown_roles.add(role)
                continue
            existing = normalized.setdefault(canonical_role, [])
            for module in _dedupe(modules):
                if module not in existing:
                    existing.append(module)
        if unknown_roles:
            raise serializers.ValidationError(f"Неизвестная или запрещённая роль: {', '.join(sorted(unknown_roles))}")
        return normalized

    def to_representation(self, instance: Company) -> dict:
        data = super().to_representation(instance)
        normalized = instance.normalized_role_disabled_modules()
        for role in RESTRICTABLE_ROLES:
            if role not in normalized:
                normalized[role] = list(DEFAULT_ROLE_DISABLED_MODULES.get(role, ()))
        data["role_disabled_modules"] = normalized
        return data
