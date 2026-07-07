from django.urls import path

from telephony.views import (
    CallLogDetailView,
    CallLogListView,
    CallRecordingStreamView,
    CallRecordingView,
    CallReportView,
    CallTranscribeView,
    MangoSyncView,
    TelephonyDashboardView,
    TelephonyIntegrationView,
)

urlpatterns = [
    path("telephony/integration/", TelephonyIntegrationView.as_view(), name="telephony-integration"),
    path("telephony/dashboard/", TelephonyDashboardView.as_view(), name="telephony-dashboard"),
    path("telephony/calls/", CallLogListView.as_view(), name="telephony-calls"),
    path("telephony/calls/<int:call_id>/", CallLogDetailView.as_view(), name="telephony-call-detail"),
    path("telephony/mango/sync/", MangoSyncView.as_view(), name="telephony-mango-sync"),
    path("telephony/calls/<int:call_id>/recording/", CallRecordingView.as_view(), name="telephony-call-recording"),
    path("telephony/calls/<int:call_id>/stream/", CallRecordingStreamView.as_view(), name="telephony-call-stream"),
    path("telephony/calls/<int:call_id>/transcribe/", CallTranscribeView.as_view(), name="telephony-call-transcribe"),
    path("telephony/calls/<int:call_id>/report/", CallReportView.as_view(), name="telephony-call-report"),
]
