from __future__ import annotations

from django.conf import settings
from django.db import models

from companies.models import Company
from core.models import TimeStampedModel


class MailAccount(TimeStampedModel):
    """Подключённый почтовый ящик сотрудника."""

    class Provider(models.TextChoices):
        GMAIL = "gmail", "Gmail"
        OUTLOOK = "outlook", "Outlook"
        ICLOUD = "icloud", "iCloud"
        OFFICE365 = "office365", "Office365"
        EXCHANGE = "exchange", "Exchange"
        YAHOO = "yahoo", "Yahoo!"
        AOL = "aol", "Aol"
        YANDEX = "yandex", "Яндекс"
        MAILRU = "mailru", "Mail.ru"
        IMAP = "imap", "Корпоративная почта"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="mail_accounts",
        verbose_name="Компания",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mail_accounts",
        verbose_name="Пользователь",
    )
    provider = models.CharField("Провайдер", max_length=20, choices=Provider.choices)
    email = models.EmailField("Email")
    display_name = models.CharField("Отображаемое имя", max_length=120, blank=True)
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        verbose_name = "Почтовый ящик"
        verbose_name_plural = "Почтовые ящики"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "user", "email"],
                name="uniq_mail_account_per_user",
            )
        ]

    def __str__(self) -> str:
        return f"{self.email} ({self.provider})"


class MailMessage(TimeStampedModel):
    """Письмо в подключённом ящике."""

    class Folder(models.TextChoices):
        INBOX = "inbox", "Входящие"
        SENT = "sent", "Отправленные"
        DRAFTS = "drafts", "Черновики"
        TRASH = "trash", "Корзина"

    account = models.ForeignKey(
        MailAccount,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Ящик",
    )
    folder = models.CharField("Папка", max_length=20, choices=Folder.choices, default=Folder.INBOX)
    subject = models.CharField("Тема", max_length=255)
    body = models.TextField("Текст")
    from_name = models.CharField("От кого (имя)", max_length=120, blank=True)
    from_email = models.EmailField("От кого")
    to_emails = models.TextField("Кому", help_text="Список email через запятую")
    is_read = models.BooleanField("Прочитано", default=False)
    sent_at = models.DateTimeField("Дата")

    class Meta:
        verbose_name = "Письмо"
        verbose_name_plural = "Письма"
        ordering = ["-sent_at", "-id"]

    def __str__(self) -> str:
        return self.subject
