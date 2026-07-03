"""Project URL configuration.

The root router stays intentionally small.
Business modules will register their own URLs later.
"""

from __future__ import annotations

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def healthcheck(_: object) -> JsonResponse:
    """Simple health endpoint for load balancers and local checks."""
    return JsonResponse({"status": "ok", "service": "crm-kit"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck),
]

