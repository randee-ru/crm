from __future__ import annotations

from django.urls import path

from reports.views import AnalyticsOverviewView, DailyReportView


urlpatterns = [
    path("reports/daily/", DailyReportView.as_view(), name="daily-report"),
    path("reports/overview/", AnalyticsOverviewView.as_view(), name="reports-overview"),
]
