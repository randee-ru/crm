from __future__ import annotations

from django.db.models import Q, QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from memberships.models import Membership
from memberships.serializers import (
    MembershipDetailSerializer,
    MembershipListSerializer,
    MembershipWriteSerializer,
)


class MembershipQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)


class MembershipListCreateView(MembershipQuerysetMixin, ListCreateAPIView):
    def get_queryset(self) -> QuerySet[Membership]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Membership.objects.none()
        queryset = (
            Membership.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("company", "branch", "client")
            .order_by("-starts_at", "-created_at")
        )
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(client__phone__icontains=search)
            )
        status = self.request.query_params.get("status", "").strip()
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MembershipWriteSerializer
        return MembershipListSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = MembershipWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        read_serializer = MembershipDetailSerializer(instance, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class MembershipDetailView(MembershipQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "membership_id"

    def get_queryset(self) -> QuerySet[Membership]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Membership.objects.none()
        return Membership.objects.filter(company__slug=company_slug, company__is_active=True).select_related(
            "company", "branch", "client"
        )

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return MembershipWriteSerializer
        return MembershipDetailSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write_serializer = MembershipWriteSerializer(
            instance,
            data=request.data,
            partial=partial,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        return Response(MembershipDetailSerializer(instance, context=self.get_serializer_context()).data)

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        instance.delete()
        return Response(status=204)
