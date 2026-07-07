"""Настройки django-unfold для панели платформы CRM Kit.

/admin/ — это не рабочий CRM-интерфейс для сотрудников клуба.
Здесь управляют тенантами, доступами и системными сущностями.
Операционные данные (клиенты, задачи, расписание) доступны только
в dev-режиме для отладки — см. ADMIN_ENABLE_BUSINESS_MODELS.
"""

from __future__ import annotations

from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _


def _business_models_visible(request: object) -> bool:
    from django.conf import settings

    return getattr(settings, "ADMIN_ENABLE_BUSINESS_MODELS", False)


def get_unfold_settings() -> dict:
    navigation: list[dict] = [
        {
            "title": _("Платформа"),
            "separator": True,
            "collapsible": False,
            "items": [
                {
                    "title": _("Компании"),
                    "icon": "business",
                    "link": reverse_lazy("admin:companies_company_changelist"),
                },
                {
                    "title": _("Филиалы"),
                    "icon": "store",
                    "link": reverse_lazy("admin:branches_branch_changelist"),
                },
                {
                    "title": _("Доступы пользователей"),
                    "icon": "badge",
                    "link": reverse_lazy("admin:accounts_companymembership_changelist"),
                },
                {
                    "title": _("Приглашения сотрудников"),
                    "icon": "mail",
                    "link": reverse_lazy("admin:accounts_employeeinvitation_changelist"),
                },
            ],
        },
        {
            "title": _("Пользователи и API"),
            "collapsible": True,
            "items": [
                {
                    "title": _("Пользователи"),
                    "icon": "people",
                    "link": reverse_lazy("admin:auth_user_changelist"),
                },
                {
                    "title": _("Группы"),
                    "icon": "groups",
                    "link": reverse_lazy("admin:auth_group_changelist"),
                },
                {
                    "title": _("API-токены"),
                    "icon": "key",
                    "link": reverse_lazy("admin:authtoken_tokenproxy_changelist"),
                },
            ],
        },
        {
            "title": _("Данные CRM (только dev)"),
            "separator": True,
            "collapsible": True,
            "permission": _business_models_visible,
            "items": [
                {
                    "title": _("Клиенты"),
                    "icon": "person",
                    "link": reverse_lazy("admin:clients_client_changelist"),
                    "permission": _business_models_visible,
                },
                {
                    "title": _("Тренеры"),
                    "icon": "badge",
                    "link": reverse_lazy("admin:employees_trainer_changelist"),
                    "permission": _business_models_visible,
                },
                {
                    "title": _("Абонементы"),
                    "icon": "card_membership",
                    "link": reverse_lazy("admin:memberships_membership_changelist"),
                    "permission": _business_models_visible,
                },
                {
                    "title": _("Бронирования"),
                    "icon": "event",
                    "link": reverse_lazy("admin:bookings_booking_changelist"),
                    "permission": _business_models_visible,
                },
                {
                    "title": _("Посещения"),
                    "icon": "check_circle",
                    "link": reverse_lazy("admin:attendance_attendancerecord_changelist"),
                    "permission": _business_models_visible,
                },
                {
                    "title": _("Продажи"),
                    "icon": "payments",
                    "link": reverse_lazy("admin:sales_sale_changelist"),
                    "permission": _business_models_visible,
                },
                {
                    "title": _("Платежи"),
                    "icon": "receipt_long",
                    "link": reverse_lazy("admin:payments_payment_changelist"),
                    "permission": _business_models_visible,
                },
                {
                    "title": _("Телефония"),
                    "icon": "call",
                    "link": reverse_lazy("admin:telephony_calllog_changelist"),
                    "permission": _business_models_visible,
                },
                {
                    "title": _("Задачи"),
                    "icon": "task",
                    "link": reverse_lazy("admin:crm_task_changelist"),
                    "permission": _business_models_visible,
                },
                {
                    "title": _("Расписание"),
                    "icon": "calendar_month",
                    "link": reverse_lazy("admin:schedule_scheduleevent_changelist"),
                    "permission": _business_models_visible,
                },
            ],
        },
    ]

    return {
        "SITE_TITLE": "CRM Kit Platform",
        "SITE_HEADER": "CRM Kit Platform",
        "SITE_SUBHEADER": _("Администрирование системы"),
        "SITE_SYMBOL": "settings",
        "SHOW_HISTORY": True,
        "SHOW_VIEW_ON_SITE": False,
        "SITE_DROPDOWN": [
            {
                "icon": "dashboard",
                "title": _("Рабочий CRM (frontend)"),
                "link": "http://localhost:3000/dashboard",
                "attrs": {"target": "_blank"},
            },
            {
                "icon": "api",
                "title": _("API healthcheck"),
                "link": "http://127.0.0.1:8000/health/",
                "attrs": {"target": "_blank"},
            },
        ],
        "SIDEBAR": {
            "show_search": True,
            "show_all_applications": False,
            "navigation": navigation,
        },
    }
