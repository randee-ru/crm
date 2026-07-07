from __future__ import annotations

from rest_framework import serializers

from accounts.models import CompanyMembership
from companies.models import Company

# Роль "owner" сознательно исключена — владельцу нельзя скрыть меню, чтобы
# компания не могла случайно заблокировать сама себе доступ к настройкам.
RESTRICTABLE_ROLES = [choice for choice in CompanyMembership.Role.values if choice != CompanyMembership.Role.OWNER]


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
        unknown_roles = set(value) - set(RESTRICTABLE_ROLES)
        if unknown_roles:
            raise serializers.ValidationError(f"Неизвестная или запрещённая роль: {', '.join(sorted(unknown_roles))}")
        return {role: _dedupe(modules) for role, modules in value.items()}
