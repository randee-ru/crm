from __future__ import annotations

from django.db.models import Q
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from companies.models import Company
from notifications.models import Notification
from notifications.serializers import NotificationMarkReadSerializer, NotificationSerializer
from notifications.services import mark_notifications_read


def _company_queryset(request) -> tuple[Company | None, Q]:
    company_slug = resolve_company_slug(request, required=True)
    if not company_slug:
        return None, Q(pk__isnull=True)

    company = Company.objects.filter(slug=company_slug, is_active=True).first()
    if company is None:
        return None, Q(pk__isnull=True)

    return company, Q(company=company)


class NotificationListView(ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        company, company_q = _company_queryset(self.request)
        if company is None:
            return Notification.objects.none()

        queryset = Notification.objects.filter(company_q)
        queryset = queryset.filter(Q(recipient__isnull=True) | Q(recipient=self.request.user))

        unread = self.request.query_params.get("unread")
        if unread in {"true", "false"}:
            queryset = queryset.filter(is_read=unread != "true")

        return queryset.order_by("-created_at", "-id")


class NotificationDetailView(RetrieveUpdateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]
    serializer_class = NotificationSerializer
    lookup_url_kwarg = "notification_id"

    def get_queryset(self):
        company, company_q = _company_queryset(self.request)
        if company is None:
            return Notification.objects.none()
        return Notification.objects.filter(company_q).filter(
            Q(recipient__isnull=True) | Q(recipient=self.request.user)
        )


class NotificationMarkAllReadView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def post(self, request):
        serializer = NotificationMarkReadSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        company, company_q = _company_queryset(request)
        if company is None:
            return Response({"detail": "Company not found."}, status=404)

        notifications = Notification.objects.filter(company_q).filter(
            Q(recipient__isnull=True) | Q(recipient=request.user)
        )
        updated = mark_notifications_read(notifications)
        return Response({"updated": updated})
