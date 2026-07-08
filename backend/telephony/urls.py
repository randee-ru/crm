from django.urls import path

from telephony.views import (
    CallLogListView,
    CallLogDetailView,
    CallRecordingStreamView,
    CallRecordingView,
    CallReportView,
    CallTranscribeView,
    ClickToCallView,
    MangoSyncView,
    TelephonyDashboardView,
    TelephonyIntegrationView,
)
from telephony.webhooks import MangoWebhookView

urlpatterns = [
    path("telephony/integration/", TelephonyIntegrationView.as_view(), name="telephony-integration"),
    path("telephony/dashboard/", TelephonyDashboardView.as_view(), name="telephony-dashboard"),
    path("telephony/calls/", CallLogListView.as_view(), name="telephony-calls"),
    path("telephony/calls/click-to-call/", ClickToCallView.as_view(), name="telephony-click-to-call"),
    path("telephony/calls/<int:call_id>/", CallLogDetailView.as_view(), name="telephony-call-detail"),
    path("telephony/mango/sync/", MangoSyncView.as_view(), name="telephony-mango-sync"),
    path("telephony/webhooks/mango/", MangoWebhookView.as_view(), name="telephony-mango-webhook"),
    path("telephony/calls/<int:call_id>/recording/", CallRecordingView.as_view(), name="telephony-call-recording"),
    path("telephony/calls/<int:call_id>/stream/", CallRecordingStreamView.as_view(), name="telephony-call-stream"),
    path("telephony/calls/<int:call_id>/transcribe/", CallTranscribeView.as_view(), name="telephony-call-transcribe"),
    path("telephony/calls/<int:call_id>/report/", CallReportView.as_view(), name="telephony-call-report"),
]
