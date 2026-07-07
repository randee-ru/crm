from __future__ import annotations

from django.urls import path

from schedule.group_views import (
    GroupProgramListView,
    GroupScheduleSlotDetailView,
    GroupScheduleSlotListCreateView,
    GroupSlotEnrollmentDetailView,
    GroupSlotEnrollmentListCreateView,
    ScheduleSettingsView,
    ScheduleSmsIntegrationDetailView,
    ScheduleSmsIntegrationListCreateView,
)
from schedule.public_views import PublicScheduleEmbedView
from schedule.views import ScheduleEventDetailView, ScheduleEventListCreateView

urlpatterns = [
    path("public/schedule/<slug:company_slug>/", PublicScheduleEmbedView.as_view(), name="public-schedule-embed"),
    path("schedule/", ScheduleEventListCreateView.as_view(), name="schedule-list"),
    path("schedule/<int:event_id>/", ScheduleEventDetailView.as_view(), name="schedule-detail"),
    path("schedule/programs/", GroupProgramListView.as_view(), name="schedule-programs"),
    path("schedule/settings/", ScheduleSettingsView.as_view(), name="schedule-settings"),
    path("schedule/sms-integrations/", ScheduleSmsIntegrationListCreateView.as_view(), name="schedule-sms-integrations"),
    path(
        "schedule/sms-integrations/<int:integration_id>/",
        ScheduleSmsIntegrationDetailView.as_view(),
        name="schedule-sms-integration-detail",
    ),
    path("schedule/group-slots/", GroupScheduleSlotListCreateView.as_view(), name="schedule-group-slots"),
    path("schedule/group-slots/<int:slot_id>/", GroupScheduleSlotDetailView.as_view(), name="schedule-group-slot-detail"),
    path(
        "schedule/group-slots/<int:slot_id>/enrollments/",
        GroupSlotEnrollmentListCreateView.as_view(),
        name="schedule-group-slot-enrollments",
    ),
    path(
        "schedule/group-slots/<int:slot_id>/enrollments/<int:enrollment_id>/",
        GroupSlotEnrollmentDetailView.as_view(),
        name="schedule-group-slot-enrollment-detail",
    ),
]
