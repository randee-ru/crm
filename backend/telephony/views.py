from __future__ import annotations

from datetime import date, timedelta

from django.db.models import Q, QuerySet
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from core.pagination import ClientListPagination
from telephony.lines import filter_calls_by_line_key, summarize_line_counts
from telephony.models import CallLog, TelephonyIntegration
from telephony.serializers import (
    CallLogDetailSerializer,
    CallLogSerializer,
    TelephonyIntegrationSerializer,
    TelephonyIntegrationWriteSerializer,
)
from telephony.click_to_call import click_to_call
from telephony.services import recording_unavailable_message, sync_mango_calls, try_refresh_call_recording


class BinaryPassthroughRenderer(BaseRenderer):
    media_type = "*/*"
    format = "bin"
    charset = None

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if isinstance(data, (bytes, bytearray)):
            return bytes(data)
        return b""


class TelephonyQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)

    def get_calls_queryset(self) -> QuerySet[CallLog]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return CallLog.objects.none()
        return (
            CallLog.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("client", "company")
            .order_by("-started_at", "-id")
        )


class TelephonyIntegrationView(TelephonyQuerysetMixin, APIView):
    def get_integration(self) -> TelephonyIntegration:
        company = self.get_company()
        integration, _ = TelephonyIntegration.objects.get_or_create(company=company)
        return integration

    def get(self, request: Request) -> Response:
        integration = self.get_integration()
        data = TelephonyIntegrationSerializer(integration).data
        return Response(data)

    def patch(self, request: Request) -> Response:
        integration = self.get_integration()
        serializer = TelephonyIntegrationWriteSerializer(integration, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TelephonyIntegrationSerializer(integration).data)


class CallLogListView(TelephonyQuerysetMixin, ListAPIView):
    serializer_class = CallLogSerializer
    pagination_class = ClientListPagination

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        company = self.get_company()
        integration = TelephonyIntegration.objects.filter(company=company).first()
        if integration and isinstance(integration.settings, dict):
            context["line_directory"] = integration.settings.get("line_directory") or {}
        else:
            context["line_directory"] = {}
        return context

    def get_queryset(self) -> QuerySet[CallLog]:
        queryset = self.get_calls_queryset()
        period = self.request.query_params.get("period", "today").strip()
        status = self.request.query_params.get("status", "").strip()
        search = self.request.query_params.get("search", "").strip()

        now = timezone.localdate()
        if period == "today":
            queryset = queryset.filter(started_at__date=now)
        elif period == "yesterday":
            queryset = queryset.filter(started_at__date=now - timedelta(days=1))
        elif period == "week":
            queryset = queryset.filter(started_at__date__gte=now - timedelta(days=6))
        elif period == "month":
            queryset = queryset.filter(started_at__date__gte=now - timedelta(days=29))

        if status == "answered":
            queryset = queryset.filter(status=CallLog.Status.ANSWERED)
        elif status == "missed":
            queryset = queryset.filter(status=CallLog.Status.MISSED)

        if len(search) >= 3:
            queryset = queryset.filter(
                Q(caller_phone__icontains=search)
                | Q(target_phone__icontains=search)
                | Q(line_name__icontains=search)
                | Q(line_number__icontains=search)
                | Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(client__phone__icontains=search)
            )

        line = self.request.query_params.get("line", "").strip()
        if line:
            queryset = filter_calls_by_line_key(queryset, line)

        return queryset


class CallLogDetailView(TelephonyQuerysetMixin, RetrieveAPIView):
    lookup_url_kwarg = "call_id"
    serializer_class = CallLogDetailSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        company = self.get_company()
        integration = TelephonyIntegration.objects.filter(company=company).first()
        if integration and isinstance(integration.settings, dict):
            context["line_directory"] = integration.settings.get("line_directory") or {}
        else:
            context["line_directory"] = {}
        return context

    def get_queryset(self) -> QuerySet[CallLog]:
        return self.get_calls_queryset()


class TelephonyDashboardView(TelephonyQuerysetMixin, APIView):
    def get(self, request: Request) -> Response:
        queryset = self.get_calls_queryset()
        today = timezone.localdate()
        today_calls = queryset.filter(started_at__date=today)
        company = self.get_company()
        integration = TelephonyIntegration.objects.filter(company=company).first()
        line_directory = {}
        if integration and isinstance(integration.settings, dict):
            line_directory = integration.settings.get("line_directory") or {}
        return Response(
            {
                "total_calls": queryset.count(),
                "today_calls": today_calls.count(),
                "today_answered": today_calls.filter(status=CallLog.Status.ANSWERED).count(),
                "today_missed": today_calls.filter(status=CallLog.Status.MISSED).count(),
                "with_recording": today_calls.exclude(recording_id="").count(),
                "with_transcription": today_calls.exclude(transcription_text="").count(),
                "lines": summarize_line_counts(today_calls, line_directory),
            }
        )


class MangoSyncView(TelephonyQuerysetMixin, APIView):
    def post(self, request: Request) -> Response:
        company = self.get_company()
        date_from = request.data.get("date_from")
        date_to = request.data.get("date_to")
        try:
            synced, integration, archive_queued = sync_mango_calls(
                company,
                date_from=date.fromisoformat(date_from) if date_from else None,
                date_to=date.fromisoformat(date_to) if date_to else None,
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(
            {
                "synced": synced,
                "archive_queued": archive_queued,
                "last_synced_at": integration.last_synced_at,
            }
        )


class ClickToCallView(TelephonyQuerysetMixin, APIView):
    def post(self, request: Request) -> Response:
        phone = str(request.data.get("phone") or "").strip()
        extension = str(request.data.get("extension") or "").strip()
        if not phone:
            return Response({"detail": "Укажите номер телефона."}, status=400)

        company = self.get_company()
        try:
            result = click_to_call(company, request.user, phone=phone, extension=extension)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response(result)


class CallRecordingView(TelephonyQuerysetMixin, APIView):
    def post(self, request: Request, call_id: int) -> Response:
        call = self.get_calls_queryset().filter(id=call_id).first()
        if call is None:
            return Response({"detail": "Call not found."}, status=404)
        call = try_refresh_call_recording(call)
        if not call.recording_id and not call.recording_file:
            return Response({"detail": recording_unavailable_message(call)}, status=404)
        return Response(
            {
                "playback_url": f"/api/telephony/recording/{call_id}",
                "title": call.client.full_name if call.client_id else call.caller_phone,
                "duration": call.duration,
            }
        )


class CallRecordingStreamView(TelephonyQuerysetMixin, APIView):
    authentication_classes = TelephonyQuerysetMixin.authentication_classes
    permission_classes = TelephonyQuerysetMixin.permission_classes
    renderer_classes = [BinaryPassthroughRenderer]

    def get(self, request: Request, call_id: int) -> HttpResponse:
        from telephony.mango_client import resolve_call_recording_stream, resolve_mango_config
        from telephony.recording_storage import build_local_recording_response

        call = self.get_calls_queryset().filter(id=call_id).first()
        if call is None:
            return HttpResponse("Call not found.", status=404)
        call = try_refresh_call_recording(call)
        if not call.recording_id and not call.recording_file:
            return HttpResponse(recording_unavailable_message(call), status=404)

        if call.recording_file:
            return build_local_recording_response(call)

        integration = TelephonyIntegration.objects.filter(company=call.company).first()
        config = resolve_mango_config(integration) if integration else None
        if config is None:
            return HttpResponse("Mango Office not configured.", status=400)

        range_header = request.META.get("HTTP_RANGE")
        try:
            stream_response, source_url = resolve_call_recording_stream(
                config,
                call.recording_id,
                cached_url=call.recording_url,
                range_header=range_header,
            )
        except Exception as exc:
            message = str(exc)
            status = 429 if "слишком много запросов" in message.lower() else 400
            return HttpResponse(message, status=status)

        if source_url and source_url != call.recording_url:
            call.recording_url = source_url
            call.save(update_fields=["recording_url", "updated_at"])

        return stream_response


class CallTranscribeView(TelephonyQuerysetMixin, APIView):
    def post(self, request: Request, call_id: int) -> Response:
        from telephony.recording_storage import read_call_recording_bytes
        from telephony.transcription import generate_call_report, transcribe_audio

        call = self.get_calls_queryset().filter(id=call_id).first()
        if call is None:
            return Response({"detail": "Call not found."}, status=404)
        if call.transcription_text and not request.data.get("force"):
            return Response({"transcription_text": call.transcription_text, "cached": True})
        if not call.recording_id and not call.recording_file:
            return Response({"detail": "Recording not available."}, status=404)

        try:
            audio, content_type = read_call_recording_bytes(call)
            filename = call.recording_file.name.rsplit("/", 1)[-1] if call.recording_file else f"{call.recording_id}.mp3"
            transcript = transcribe_audio(audio, filename=filename, content_type=content_type)
            call.transcription_text = transcript
            call.call_summary = transcript[:500]
            call.save(update_fields=["transcription_text", "call_summary", "updated_at"])
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response({"transcription_text": call.transcription_text, "cached": False})


class CallReportView(TelephonyQuerysetMixin, APIView):
    def post(self, request: Request, call_id: int) -> Response:
        from telephony.transcription import generate_call_report

        call = self.get_calls_queryset().filter(id=call_id).first()
        if call is None:
            return Response({"detail": "Call not found."}, status=404)
        if not call.transcription_text:
            return Response({"detail": "Transcription required."}, status=400)
        if call.call_report and not request.data.get("force"):
            return Response({"call_report": call.call_report, "cached": True})
        try:
            report = generate_call_report(call.transcription_text)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)
        call.call_report = report
        call.call_summary = report.split("\n", 1)[0][:500]
        call.save(update_fields=["call_report", "call_summary", "updated_at"])
        return Response({"call_report": call.call_report, "cached": False})
