"""ASGI config for CRM Kit.

ASGI is the modern Python interface used for async-capable web servers.
It will later support HTTP and real-time integrations if needed.
"""

from __future__ import annotations

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

application = get_asgi_application()
