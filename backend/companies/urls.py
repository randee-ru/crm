from __future__ import annotations

from django.urls import path

from companies.views import CompanyModuleSettingsView

urlpatterns = [
    path("company/module-settings/", CompanyModuleSettingsView.as_view(), name="company-module-settings"),
]
