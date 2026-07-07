from __future__ import annotations

from rest_framework import serializers

from companies.models import Company


class CompanyModuleSettingsSerializer(serializers.ModelSerializer):
    disabled_modules = serializers.ListField(child=serializers.CharField(max_length=64), allow_empty=True)

    class Meta:
        model = Company
        fields = ["disabled_modules"]

    def validate_disabled_modules(self, value: list[str]) -> list[str]:
        # Убираем дубликаты, сохраняя порядок — список используется только как
        # фильтр видимости пунктов меню на фронтенде, строгий словарь id тут не нужен.
        seen: dict[str, None] = {}
        for item in value:
            seen.setdefault(item, None)
        return list(seen.keys())
