from __future__ import annotations

from django.urls import path

from schedule.group_views import (
    GroupProgramListView,
    GroupProgramDetailView,
    GroupScheduleSlotDetailView,
    GroupScheduleSlotListCreateView,
    GroupSlotEnrollmentDetailView,
    GroupSlotEnrollmentListCreateView,
    ScheduleSettingsView,
    ScheduleSmsIntegrationDetailView,
    ScheduleSmsIntegrationListCreateView,
)
from schedule.public_booking_views import (
    PublicScheduleCallcheckStatusView,
    PublicScheduleClientEnrollmentsView,
    PublicScheduleClientMeView,
    PublicScheduleEnrollmentCancelView,
    PublicScheduleForgotPasswordView,
    PublicScheduleLoginView,
    PublicScheduleOtpChallengeView,
    PublicScheduleOtpRequestView,
    PublicScheduleOtpVerifyView,
    PublicScheduleResetPasswordView,
    PublicScheduleSlotEnrollView,
)
from schedule.public_views import PublicScheduleEmbedView
from schedule.views import ScheduleEventDetailView, ScheduleEventListCreateView

urlpatterns = [
    path("public/schedule/<slug:company_slug>", PublicScheduleEmbedView.as_view(), name="public-schedule-embed"),
    path("public/schedule/<slug:company_slug>/", PublicScheduleEmbedView.as_view(), name="public-schedule-embed-slash"),
    path(
        "public/schedule/<slug:company_slug>/auth/login",
        PublicScheduleLoginView.as_view(),
        name="public-schedule-auth-login",
    ),
    path(
        "public/schedule/<slug:company_slug>/auth/forgot-password",
        PublicScheduleForgotPasswordView.as_view(),
        name="public-schedule-auth-forgot-password",
    ),
    path(
        "public/schedule/<slug:company_slug>/auth/reset-password",
        PublicScheduleResetPasswordView.as_view(),
        name="public-schedule-auth-reset-password",
    ),
    path(
        "public/schedule/<slug:company_slug>/auth/callcheck-status",
        PublicScheduleCallcheckStatusView.as_view(),
        name="public-schedule-auth-callcheck-status",
    ),
    path(
        "public/schedule/<slug:company_slug>/auth/challenge",
        PublicScheduleOtpChallengeView.as_view(),
        name="public-schedule-auth-challenge",
    ),
    path(
        "public/schedule/<slug:company_slug>/auth/request-code",
        PublicScheduleOtpRequestView.as_view(),
        name="public-schedule-auth-request",
    ),
    path(
        "public/schedule/<slug:company_slug>/auth/verify-code",
        PublicScheduleOtpVerifyView.as_view(),
        name="public-schedule-auth-verify",
    ),
    path(
        "public/schedule/<slug:company_slug>/auth/me",
        PublicScheduleClientMeView.as_view(),
        name="public-schedule-auth-me",
    ),
    path(
        "public/schedule/<slug:company_slug>/enrollments",
        PublicScheduleClientEnrollmentsView.as_view(),
        name="public-schedule-enrollments",
    ),
    path(
        "public/schedule/<slug:company_slug>/slots/<int:slot_id>/enroll",
        PublicScheduleSlotEnrollView.as_view(),
        name="public-schedule-slot-enroll",
    ),
    path(
        "public/schedule/<slug:company_slug>/enrollments/<int:enrollment_id>/cancel",
        PublicScheduleEnrollmentCancelView.as_view(),
        name="public-schedule-enrollment-cancel",
    ),
    path("schedule/", ScheduleEventListCreateView.as_view(), name="schedule-list"),
    path("schedule/<int:event_id>/", ScheduleEventDetailView.as_view(), name="schedule-detail"),
    path("schedule/programs/", GroupProgramListView.as_view(), name="schedule-programs"),
    path("schedule/programs/<int:program_id>/", GroupProgramDetailView.as_view(), name="schedule-program-detail"),
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
