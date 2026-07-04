from __future__ import annotations

from django.conf import settings
from django.db import models

from branches.models import Branch
from companies.models import Company
from core.models import TimeStampedModel


class CompanyMembership(TimeStampedModel):
    """Связь пользователя с компанией и ролью.

    Мы не смешиваем authentication и business access:
    пользователь может существовать сам по себе, а доступ к данным
    получает через membership внутри конкретной компании.
    """

    class Role(models.TextChoices):
        OWNER = "owner", "Владелец"
        ADMIN = "admin", "Администратор"
        MANAGER = "manager", "Менеджер"
        EMPLOYEE = "employee", "Сотрудник"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_memberships",
        verbose_name="Пользователь",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="memberships",
        verbose_name="Филиал",
    )
    role = models.CharField(
        "Роль",
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE,
    )
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        verbose_name = "Доступ пользователя"
        verbose_name_plural = "Доступы пользователей"
        ordering = ["company", "user"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "company"],
                name="uniq_user_company_membership",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} -> {self.company} ({self.role})"

