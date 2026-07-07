from __future__ import annotations

from django.db.models import Exists, OuterRef, Q, QuerySet
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from employees.models import Trainer, TrainerAccessCard, TrainerRentPayment
from employees.serializers import (
    TrainerAccessCardSerializer,
    TrainerAccessCardWriteSerializer,
    TrainerDetailSerializer,
    TrainerListSerializer,
    TrainerRentPaymentSerializer,
    TrainerRentPaymentWriteSerializer,
    TrainerWriteSerializer,
)


class TrainerQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_trainers_queryset(self) -> QuerySet[Trainer]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Trainer.objects.none()

        current_month_start = timezone.localdate().replace(day=1)
        rent_paid_this_month = TrainerRentPayment.objects.filter(
            trainer=OuterRef("pk"),
            period=current_month_start,
        )
        return (
            Trainer.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("branch", "company")
            .prefetch_related("rent_payments", "access_cards")
            .annotate(rent_paid_current_month=Exists(rent_paid_this_month))
        )


class TrainerListCreateView(TrainerQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return TrainerWriteSerializer
        return TrainerListSerializer

    def get_queryset(self) -> QuerySet[Trainer]:
        queryset = self.get_company_trainers_queryset().order_by("last_name", "first_name")

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(middle_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
                | Q(specialization__icontains=search)
            )

        is_active = self.request.query_params.get("is_active")
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")

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
        write_serializer = self.get_serializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        trainer = write_serializer.instance
        read_serializer = TrainerDetailSerializer(trainer, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class TrainerDetailView(TrainerQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "trainer_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return TrainerWriteSerializer
        return TrainerDetailSerializer

    def get_queryset(self) -> QuerySet[Trainer]:
        return self.get_company_trainers_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=204)


class TrainerNestedResourceMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_trainer(self) -> Trainer | None:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return None
        return Trainer.objects.filter(
            id=self.kwargs["trainer_id"],
            company__slug=company_slug,
            company__is_active=True,
        ).first()


class TrainerRentPaymentListCreateView(TrainerNestedResourceMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return TrainerRentPaymentWriteSerializer
        return TrainerRentPaymentSerializer

    def get_queryset(self) -> QuerySet[TrainerRentPayment]:
        trainer = self.get_trainer()
        if trainer is None:
            return TrainerRentPayment.objects.none()
        return TrainerRentPayment.objects.filter(trainer=trainer).order_by("-period")

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        context["trainer"] = self.get_trainer()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        trainer = self.get_trainer()
        if trainer is None:
            return Response({"detail": "Trainer not found."}, status=status.HTTP_404_NOT_FOUND)
        write_serializer = TrainerRentPaymentWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        read_serializer = TrainerRentPaymentSerializer(instance)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class TrainerRentPaymentDetailView(TrainerNestedResourceMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "payment_id"
    serializer_class = TrainerRentPaymentSerializer

    def get_queryset(self) -> QuerySet[TrainerRentPayment]:
        trainer = self.get_trainer()
        if trainer is None:
            return TrainerRentPayment.objects.none()
        return TrainerRentPayment.objects.filter(trainer=trainer)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=204)


class TrainerAccessCardListCreateView(TrainerNestedResourceMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return TrainerAccessCardWriteSerializer
        return TrainerAccessCardSerializer

    def get_queryset(self) -> QuerySet[TrainerAccessCard]:
        trainer = self.get_trainer()
        if trainer is None:
            return TrainerAccessCard.objects.none()
        return TrainerAccessCard.objects.filter(trainer=trainer).order_by("-issued_at")

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        context["trainer"] = self.get_trainer()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        trainer = self.get_trainer()
        if trainer is None:
            return Response({"detail": "Trainer not found."}, status=status.HTTP_404_NOT_FOUND)
        write_serializer = TrainerAccessCardWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        read_serializer = TrainerAccessCardSerializer(instance)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class TrainerAccessCardDetailView(TrainerNestedResourceMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "card_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return TrainerAccessCardWriteSerializer
        return TrainerAccessCardSerializer

    def get_queryset(self) -> QuerySet[TrainerAccessCard]:
        trainer = self.get_trainer()
        if trainer is None:
            return TrainerAccessCard.objects.none()
        return TrainerAccessCard.objects.filter(trainer=trainer)

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        context["trainer"] = self.get_trainer()
        return context

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=204)
