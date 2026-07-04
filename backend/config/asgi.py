"""ASGI-конфигурация для CRM Kit.

ASGI - современный Python-интерфейс для асинхронных web-серверов.
Позже он пригодится для HTTP и real-time интеграций, если это понадобится.
"""

from __future__ import annotations

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

application = get_asgi_application()
