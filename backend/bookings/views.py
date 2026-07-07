from __future__ import annotations

from django.db.models import Q, QuerySet
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from bookings.models import Booking
from bookings.serializers import BookingDetailSerializer, BookingListSerializer, BookingWriteSerializer
from clients.views import get_company_from_request


class BookingQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_bookings_queryset(self) -> QuerySet[Booking]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Booking.objects.none()

        return (
            Booking.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("branch", "client", "membership", "trainer", "company")
            .order_by("starts_at")
        )


class BookingListCreateView(BookingQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return BookingWriteSerializer
        return BookingListSerializer

    def get_queryset(self) -> QuerySet[Booking]:
        queryset = self.get_company_bookings_queryset()

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(source__icontains=search)
                | Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(trainer__first_name__icontains=search)
                | Q(trainer__last_name__icontains=search)
            )

        status = self.request.query_params.get("status", "").strip()
        if status:
            queryset = queryset.filter(status=status)

        when = self.request.query_params.get("when", "").strip()
        now = timezone.now()
        if when == "today":
            queryset = queryset.filter(starts_at__date=now.date())
        elif when == "upcoming":
            queryset = queryset.filter(starts_at__gte=now)

        return queryset

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context

    def perform_create(self, serializer) -> None:
        company = get_company_from_request(self.request)
        if company is None:
            raise ValueError("Company context is required.")
        serializer.save(company=company)

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = BookingWriteSerializer(data=request.data, context=self.get_serializer_context())
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        read_serializer = BookingListSerializer(write_serializer.instance, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class BookingDetailView(BookingQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "booking_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return BookingWriteSerializer
        return BookingDetailSerializer

    def get_queryset(self) -> QuerySet[Booking]:
        return self.get_company_bookings_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context
