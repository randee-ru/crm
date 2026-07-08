"""Перечисления для воронок продаж и продления абонементов."""

from __future__ import annotations

from django.db import models


class LeadSource(models.TextChoices):
    SITE = "site", "Сайт"
    CALL = "call", "Звонок"
    WHATSAPP = "whatsapp", "WhatsApp"
    TELEGRAM = "telegram", "Telegram"
    AVITO = "avito", "Авито"
    YANDEX_DIRECT = "yandex_direct", "Яндекс Директ"
    VK = "vk", "VK"
    REFERRAL = "referral", "Рекомендация"
    OFFLINE_ADS = "offline_ads", "Офлайн-реклама"
    OTHER = "other", "Другое"


class ClientInterest(models.TextChoices):
    GYM = "gym", "Тренажерный зал"
    GROUP = "group", "Групповые программы"
    PERSONAL = "personal", "Персональные тренировки"
    POOL = "pool", "Бассейн"
    KIDS = "kids", "Детские секции"
    FAMILY = "family", "Семейная карта"
    DAY = "day", "Дневная карта"
    FULL = "full", "Полный абонемент"
    CORPORATE = "corporate", "Корпоративный абонемент"


class VisitType(models.TextChoices):
    TOUR = "tour", "Экскурсия"
    PRESENTATION = "presentation", "Презентация клуба"
    TRIAL = "trial", "Пробная тренировка"
    CONSULTATION = "consultation", "Консультация"
    IMMEDIATE = "immediate", "Сразу покупка"


class LossReason(models.TextChoices):
    EXPENSIVE = "expensive", "Дорого"
    OTHER_CLUB = "other_club", "Выбрал другой клуб"
    FAR = "far", "Далеко ехать"
    NO_TIME = "no_time", "Нет времени"
    NO_ANSWER = "no_answer", "Не дозвонились"
    CHANGED_MIND = "changed_mind", "Передумал"
    CLUB_DISLIKE = "club_dislike", "Не устроил клуб"
    NO_VISIT = "no_visit", "Не пришел на визит"
    OTHER = "other", "Другое"


class ContactType(models.TextChoices):
    CALL = "call", "Звонок"
    MESSENGER = "messenger", "Мессенджер"
    VISIT = "visit", "Визит"
    EMAIL = "email", "Email"
    NOTE = "note", "Заметка"
