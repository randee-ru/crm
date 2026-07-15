from __future__ import annotations

import uuid
from urllib.parse import quote

from django.core.exceptions import ValidationError
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
        EMPLOYEE = "reception", "Ресепшен"
        USER = "user", "Пользователь"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_memberships",
        verbose_name="Пользователь",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="user_memberships",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_memberships",
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


class UserProfile(TimeStampedModel):
    """Расширенные данные пользователя, не входящие в стандартную модель User."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name="Пользователь",
    )
    avatar = models.ImageField(
        "Фото профиля",
        upload_to="avatars/%Y/%m/",
        blank=True,
        null=True,
    )
    phone = models.CharField("Телефон", max_length=32, blank=True, default="")
    birth_date = models.DateField("Дата рождения", null=True, blank=True)

    class Meta:
        verbose_name = "Профиль пользователя"
        verbose_name_plural = "Профили пользователей"

    def __str__(self) -> str:
        return f"Профиль {self.user}"


class EmployeeInvitation(TimeStampedModel):
    """Приглашение сотрудника в компанию."""

    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает"
        ACCEPTED = "accepted", "Принято"
        CANCELLED = "cancelled", "Отменено"
        EXPIRED = "expired", "Истекло"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="employee_invitations",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_invitations",
        verbose_name="Филиал",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_invitations_sent",
        verbose_name="Кто пригласил",
    )
    email = models.EmailField("Email")
    full_name = models.CharField("Имя сотрудника", max_length=255, blank=True)
    role = models.CharField(
        "Роль",
        max_length=20,
        choices=CompanyMembership.Role.choices,
        default=CompanyMembership.Role.EMPLOYEE,
    )
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    token = models.UUIDField("Токен приглашения", default=uuid.uuid4, editable=False, unique=True)
    message = models.TextField("Сообщение", blank=True)
    expires_at = models.DateTimeField("Истекает", null=True, blank=True)
    accepted_at = models.DateTimeField("Принято", null=True, blank=True)

    class Meta:
        verbose_name = "Приглашение сотрудника"
        verbose_name_plural = "Приглашения сотрудников"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "email", "status"],
                name="uniq_employee_invitation_state_per_company_email",
            )
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и приглашение."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def invite_url(self) -> str:
        url = f"/login?invite={self.token}"
        if self.email:
            url += f"&email={quote(self.email)}"
        return url

    def __str__(self) -> str:
        return f"{self.email} — {self.get_status_display()}"
