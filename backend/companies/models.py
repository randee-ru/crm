from __future__ import annotations

from django.db import models
from django.utils.text import slugify

from core.models import TimeStampedModel


WORKSPACE_MODULE_IDS: tuple[str, ...] = (
    "crm",
    "messages",
    "feed",
    "disk",
    "mail",
    "tasks",
    "marketing",
    "schedule",
    "clients",
    "contracts",
    "memberships",
    "trainers",
    "employees",
    "bookings",
    "attendance",
    "telephony",
    "sales",
    "payments",
    "daily-report",
    "reports",
    "settings",
)


def _disabled_modules_for(visible_modules: set[str]) -> tuple[str, ...]:
    return tuple(module for module in WORKSPACE_MODULE_IDS if module not in visible_modules)


DEFAULT_ROLE_DISABLED_MODULES: dict[str, tuple[str, ...]] = {
    "admin": (),
    "manager": (),
    "reception": _disabled_modules_for({"crm", "messages", "feed", "disk", "mail", "schedule", "clients"}),
    "user": _disabled_modules_for({"messages", "feed", "disk", "mail", "schedule"}),
}

ROLE_ALIASES: dict[str, str] = {
    "employee": "reception",
    "staff": "user",
}


class Company(TimeStampedModel):
    """Компания - это tenant в CRM Kit.

    Все основные данные в SaaS-платформе должны принадлежать компании,
    чтобы мы не смешивали информацию разных клиентов в одной базе.
    """

    name = models.CharField("Название", max_length=255, unique=True)
    slug = models.SlugField("URL-идентификатор", max_length=255, unique=True)
    is_active = models.BooleanField("Активна", default=True)
    disabled_modules = models.JSONField(
        "Скрытые модули меню",
        default=list,
        blank=True,
        help_text="Идентификаторы пунктов бокового меню, скрытых для всех сотрудников компании.",
    )
    role_disabled_modules = models.JSONField(
        "Скрытые модули меню по ролям",
        default=dict,
        blank=True,
        help_text="Словарь {роль: [id пунктов меню]} — что дополнительно скрыто для конкретной роли.",
    )

    class Meta:
        verbose_name = "Компания"
        verbose_name_plural = "Компании"
        ordering = ["name"]

    def save(self, *args: object, **kwargs: object) -> None:
        # Автоматически заполняем slug, чтобы у компании был стабильный
        # человекочитаемый идентификатор даже если его не ввели вручную.
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @staticmethod
    def normalize_role(role: str | None) -> str:
        if not role:
            return ""
        return ROLE_ALIASES.get(role, role)

    def normalized_role_disabled_modules(self) -> dict[str, list[str]]:
        normalized: dict[str, list[str]] = {}
        for role, modules in (self.role_disabled_modules or {}).items():
            canonical_role = self.normalize_role(role)
            if not canonical_role:
                continue
            bucket = normalized.setdefault(canonical_role, [])
            for module in modules:
                if module not in bucket:
                    bucket.append(module)
        return normalized

    def effective_disabled_modules(self, role: str) -> list[str]:
        """Модули меню, скрытые для конкретной роли: общие + ролевые.

        Владелец (owner) всегда видит полное меню — это защита от случайной
        самоблокировки.
        """
        canonical_role = self.normalize_role(role)
        if canonical_role == "owner":
            return list(self.disabled_modules)
        role_specific = self.normalized_role_disabled_modules().get(
            canonical_role,
            list(DEFAULT_ROLE_DISABLED_MODULES.get(canonical_role, ())),
        )
        merged = set(self.disabled_modules) | set(role_specific)
        return sorted(merged)

    def __str__(self) -> str:
        return self.name
