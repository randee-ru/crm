from __future__ import annotations

from django.db.models import Q, QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from employees.models import Trainer
from employees.serializers import TrainerDetailSerializer, TrainerListSerializer, TrainerWriteSerializer


class TrainerQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_trainers_queryset(self) -> QuerySet[Trainer]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Trainer.objects.none()

        return Trainer.objects.filter(company__slug=company_slug, company__is_active=True).select_related(
            "branch",
            "company",
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
