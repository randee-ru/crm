from __future__ import annotations

from django.db.models import Q, QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CompanyMembership, EmployeeInvitation
from accounts.permissions import HasCompanyAccess, resolve_company_slug
from accounts.staff_serializers import (
    StaffInvitationSerializer,
    StaffInvitationWriteSerializer,
    StaffMembershipSerializer,
    StaffMembershipWriteSerializer,
)
from clients.views import get_company_from_request
from branches.models import Branch


class StaffQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)


class StaffDashboardView(StaffQuerysetMixin, APIView):
    def get(self, request: Request) -> Response:
        company = self.get_company()
        if company is None:
            return Response({"memberships": [], "invitations": [], "branches": []})

        search = request.query_params.get("search", "").strip().lower()

        memberships = (
            CompanyMembership.objects.filter(company=company)
            .select_related("user", "branch")
            .order_by("user__last_name", "user__first_name")
        )
        invitations = EmployeeInvitation.objects.filter(company=company).select_related("branch").order_by(
            "-created_at"
        )

        if search:
            memberships = memberships.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(role__icontains=search)
            )
            invitations = invitations.filter(
                Q(email__icontains=search)
                | Q(full_name__icontains=search)
                | Q(role__icontains=search)
            )

        active_members = memberships.filter(is_active=True).count()
        admins = memberships.filter(role__in=[CompanyMembership.Role.OWNER, CompanyMembership.Role.ADMIN]).count()
        pending_invites = invitations.filter(status=EmployeeInvitation.Status.PENDING).count()

        return Response(
            {
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "slug": company.slug,
                },
                "memberships": StaffMembershipSerializer(memberships, many=True).data,
                "invitations": StaffInvitationSerializer(invitations, many=True).data,
                "branches": [
                    {"id": branch.id, "name": branch.name, "slug": branch.slug, "is_primary": branch.is_primary}
                    for branch in Branch.objects.filter(company=company).order_by("-is_primary", "name")
                ],
                "stats": {
                    "total_members": memberships.count(),
                    "active_members": active_members,
                    "admins": admins,
                    "pending_invites": pending_invites,
                },
            }
        )


class StaffMembershipDetailView(StaffQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "membership_id"

    def get_queryset(self) -> QuerySet[CompanyMembership]:
        company = self.get_company()
        if company is None:
            return CompanyMembership.objects.none()
        return CompanyMembership.objects.filter(company=company).select_related("user", "branch")

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return StaffMembershipWriteSerializer
        return StaffMembershipSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write_serializer = self.get_serializer(instance, data=request.data, partial=partial)
        write_serializer.is_valid(raise_exception=True)
        self.perform_update(write_serializer)

        read_serializer = StaffMembershipSerializer(
            write_serializer.instance,
            context=self.get_serializer_context(),
        )
        return Response(read_serializer.data)


class StaffInvitationListCreateView(StaffQuerysetMixin, ListCreateAPIView):
    def get_queryset(self) -> QuerySet[EmployeeInvitation]:
        company = self.get_company()
        if company is None:
            return EmployeeInvitation.objects.none()
        queryset = EmployeeInvitation.objects.filter(company=company).select_related("branch").order_by("-created_at")
        search = self.request.query_params.get("search", "").strip().lower()
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) | Q(full_name__icontains=search) | Q(role__icontains=search)
            )
        return queryset

    def get_serializer_class(self):
        if self.request.method == "POST":
            return StaffInvitationWriteSerializer
        return StaffInvitationSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = self.get_serializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)

        read_serializer = StaffInvitationSerializer(
            write_serializer.instance,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class StaffInvitationDetailView(StaffQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "invitation_id"

    def get_queryset(self) -> QuerySet[EmployeeInvitation]:
        company = self.get_company()
        if company is None:
            return EmployeeInvitation.objects.none()
        return EmployeeInvitation.objects.filter(company=company).select_related("branch")

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return StaffInvitationWriteSerializer
        return StaffInvitationSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write_serializer = self.get_serializer(instance, data=request.data, partial=partial)
        write_serializer.is_valid(raise_exception=True)
        self.perform_update(write_serializer)

        read_serializer = StaffInvitationSerializer(
            write_serializer.instance,
            context=self.get_serializer_context(),
        )
        return Response(read_serializer.data)
