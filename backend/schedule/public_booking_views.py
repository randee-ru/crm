from __future__ import annotations

import hashlib
from datetime import date

from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from companies.models import Company
from notifications.telegram import send_telegram_notification
from schedule.client_auth import (
    display_phone_hint,
    login_schedule_portal,
    poll_callcheck_status,
    request_password_reset,
    request_schedule_otp,
    reset_schedule_password,
    resolve_client_session,
    verify_schedule_otp,
)
from telephony.phone import normalize_phone
from schedule.group_serializers import PublicClientEnrollmentSerializer
from schedule.models import GroupScheduleSlot, GroupSlotEnrollment
from schedule.otp_protection import extract_client_ip
from schedule.public_access import PublicScheduleAccessMixin
from schedule.public_booking import (
    cancel_public_enrollment,
    create_public_enrollment,
    send_enrollment_confirmation_sms,
)


class PublicScheduleLoginView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        phone = str(request.data.get("phone") or "").strip()
        password = str(request.data.get("password") or "")
        if not phone or not password:
            return Response({"detail": "Укажите номер телефона и пароль."}, status=400)
        try:
            payload = login_schedule_portal(company, phone, password)
        except ValueError as exc:
            _send_auth_error_notification(
                company=company,
                event="login",
                phone=phone,
                detail=str(exc),
                title="Неудачный вход в личный кабинет",
            )
            return Response({"detail": str(exc)}, status=400)
        send_telegram_notification(
            "🔓 Вход в личный кабинет\n"
            f"{company.name}\n"
            f"{payload['client_name']} · {payload['phone']}",
        )
        return Response(payload)


class PublicScheduleForgotPasswordView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        phone = str(request.data.get("phone") or "").strip()
        if not phone:
            return Response({"detail": "Укажите номер телефона."}, status=400)
        try:
            payload = request_password_reset(
                company,
                phone,
                user_ip=extract_client_ip(request),
                honeypot=str(request.data.get("website") or "").strip(),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class PublicScheduleResetPasswordView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        phone = str(request.data.get("phone") or "").strip()
        check_id = str(request.data.get("check_id") or request.data.get("code") or "").strip()
        new_password = str(request.data.get("new_password") or "")
        email = str(request.data.get("email") or "").strip()
        if not phone or not check_id or not new_password or not email:
            return Response(
                {"detail": "Укажите телефон, подтверждение звонком, email и новый пароль."},
                status=400,
            )
        try:
            payload = reset_schedule_password(
                company,
                phone,
                check_id,
                new_password,
                email=email,
            )
        except ValueError as exc:
            _send_auth_error_notification(
                company=company,
                event="reset",
                phone=phone,
                detail=str(exc),
                title="Ошибка сброса пароля личного кабинета",
            )
            return Response({"detail": str(exc)}, status=400)
        send_telegram_notification(
            "🔑 Пароль установлен, вход выполнен\n"
            f"{company.name}\n"
            f"{payload['client_name']} · {payload['phone']}",
        )
        return Response(payload)


class PublicScheduleCallcheckStatusView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        check_id = str(request.query_params.get("check_id") or "").strip()
        if not check_id:
            return Response({"detail": "Укажите check_id."}, status=400)
        try:
            payload = poll_callcheck_status(company, check_id)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class PublicScheduleOtpChallengeView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied
        return Response({"detail": "Проверка отключена."})


class PublicScheduleOtpRequestView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        phone = str(request.data.get("phone") or "").strip()
        if not phone:
            return Response({"detail": "Укажите номер телефона."}, status=400)
        try:
            payload = request_schedule_otp(
                company,
                phone,
                user_ip=extract_client_ip(request),
                honeypot=str(request.data.get("website") or "").strip(),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class PublicScheduleOtpVerifyView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        phone = str(request.data.get("phone") or "").strip()
        code = str(request.data.get("code") or "").strip()
        if not phone or not code:
            return Response({"detail": "Укажите телефон и код."}, status=400)
        try:
            payload = verify_schedule_otp(company, phone, code)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class PublicScheduleClientMeView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        client = self.get_client(request, company)
        if client is None:
            return Response({"detail": "Требуется вход."}, status=401)
        return Response(
            {
                "client_id": client.id,
                "client_name": client.full_name,
                "phone": client.phone,
            }
        )


class PublicScheduleClientEnrollmentsView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        client = self.get_client(request, company)
        if client is None:
            return Response({"detail": "Требуется вход."}, status=401)

        enrollments = (
            GroupSlotEnrollment.objects.filter(
                company=company,
                client=client,
                status__in=[
                    GroupSlotEnrollment.Status.CONFIRMED,
                    GroupSlotEnrollment.Status.WAITLIST,
                ],
                slot__session_date__gte=date.today(),
            )
            .select_related("slot", "slot__program", "slot__trainer")
            .order_by("slot__session_date", "slot__start_time")
        )
        return Response(PublicClientEnrollmentSerializer(enrollments, many=True).data)


class PublicScheduleSlotEnrollView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request, company_slug: str, slot_id: int) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        client = self.get_client(request, company)
        if client is None:
            return Response({"detail": "Войдите по номеру телефона и паролю, чтобы записаться."}, status=401)

        slot = GroupScheduleSlot.objects.filter(
            company=company,
            id=slot_id,
            is_active=True,
        ).select_related("program", "trainer").first()
        if slot is None:
            return Response({"detail": "Занятие не найдено."}, status=404)

        program_title = slot.custom_title or slot.program.title
        try:
            enrollment = create_public_enrollment(slot=slot, client=client)
        except ValueError as exc:
            send_telegram_notification(
                "⚠️ Ошибка записи на занятие\n"
                f"{company.name}\n"
                f"{client.full_name} · {client.phone}\n"
                f"{program_title} · {slot.session_date:%d.%m.%Y} {slot.start_time:%H:%M}\n"
                f"Причина: {exc}",
            )
            return Response({"detail": str(exc)}, status=400)

        send_enrollment_confirmation_sms(
            company=company,
            client=client,
            slot=slot,
            enrollment=enrollment,
            user_ip=extract_client_ip(request),
        )

        send_telegram_notification(
            "🗓 Новая запись на занятие\n"
            f"{company.name}\n"
            f"{client.full_name} · {client.phone}\n"
            f"{program_title} · {slot.session_date:%d.%m.%Y} {slot.start_time:%H:%M}",
        )

        return Response(
            PublicClientEnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED,
        )


class PublicScheduleEnrollmentCancelView(PublicScheduleAccessMixin, APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request, company_slug: str, enrollment_id: int) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        client = self.get_client(request, company)
        if client is None:
            return Response({"detail": "Требуется вход."}, status=401)

        enrollment = GroupSlotEnrollment.objects.filter(
            company=company,
            id=enrollment_id,
            client=client,
        ).select_related("slot", "slot__program", "slot__trainer").first()
        if enrollment is None:
            return Response({"detail": "Запись не найдена."}, status=404)

        try:
            enrollment = cancel_public_enrollment(enrollment=enrollment, client=client)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response(PublicClientEnrollmentSerializer(enrollment).data)


_AUTH_ERROR_NOTIFICATION_TTL_SECONDS = 10 * 60


def _send_auth_error_notification(*, company: Company, event: str, phone: str, detail: str, title: str) -> None:
    normalized_phone = normalize_phone(phone)
    dedupe_source = f"{company.id}:{event}:{normalized_phone}:{detail}".encode("utf-8")
    dedupe_key = f"schedule-auth-error:{hashlib.sha1(dedupe_source).hexdigest()}"
    if not cache.add(dedupe_key, "1", timeout=_AUTH_ERROR_NOTIFICATION_TTL_SECONDS):
        return

    phone_label = display_phone_hint(normalized_phone or phone)
    send_telegram_notification(
        f"🚫 {title}\n"
        f"{company.name}\n"
        f"{phone_label} · {detail}",
    )
