from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import get_active_memberships, resolve_company_slug, user_can_access_company
from accounts.serializers import (
    AuthSessionSerializer,
    AcceptInvitationSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    authenticate_user,
    build_auth_session,
)
from accounts.models import CompanyMembership, EmployeeInvitation
from companies.models import Company

User = get_user_model()


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate_user(
            serializer.validated_data["username"],
            serializer.validated_data["password"],
        )
        if user is None:
            return Response({"detail": "Invalid credentials or no company access."}, status=401)

        token, _ = Token.objects.get_or_create(user=user)
        payload = build_auth_session(user, token.key, request=request)
        return Response(AuthSessionSerializer(payload).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        Token.objects.filter(user=request.user).delete()
        return Response(status=204)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def _build_response(self, request: Request) -> Response:
        token = Token.objects.filter(user=request.user).first()
        if token is None:
            token = Token.objects.create(user=request.user)

        payload = build_auth_session(request.user, token.key, request=request)
        company_slug = resolve_company_slug(request, required=False)
        if company_slug and user_can_access_company(request.user, company_slug):
            company = Company.objects.get(slug=company_slug, is_active=True)
            membership = get_active_memberships(request.user).get(company=company)
            payload["company"] = {
                "id": company.id,
                "name": company.name,
                "slug": company.slug,
                "role": membership.role,
                "branch_name": membership.branch.name if membership.branch else None,
                "clients_count": company.clients.count(),
                "clients_active_count": company.clients.filter(is_active=True).count(),
                "disabled_modules": company.effective_disabled_modules(membership.role),
            }

        return Response(payload)

    def get(self, request: Request) -> Response:
        return self._build_response(request)

    def patch(self, request: Request) -> Response:
        serializer = ProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return self._build_response(request)


class AcceptInvitationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = AcceptInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation: EmployeeInvitation = serializer.validated_data["invitation"]
        first_name = serializer.validated_data["first_name"].strip()
        last_name = serializer.validated_data["last_name"].strip()
        password = serializer.validated_data["password"]
        username_seed = invitation.email.split("@", 1)[0].strip() or invitation.email
        username = username_seed[:150]

        with transaction.atomic():
            user = User.objects.filter(email__iexact=invitation.email).first()
            if user is None:
                from accounts.serializers import _unique_username

                username = _unique_username(username)
                user = User.objects.create_user(
                    username=username,
                    email=invitation.email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password,
                )
            else:
                user.first_name = first_name
                user.last_name = last_name
                user.email = invitation.email
                user.set_password(password)
                if not user.username:
                    from accounts.serializers import _unique_username

                    user.username = _unique_username(username)
                user.save()

            membership, _ = CompanyMembership.objects.get_or_create(
                user=user,
                company=invitation.company,
                defaults={
                    "branch": invitation.branch,
                    "role": invitation.role,
                    "is_active": True,
                },
            )
            membership.branch = invitation.branch
            membership.role = invitation.role
            membership.is_active = True
            membership.save()

            invitation.status = EmployeeInvitation.Status.ACCEPTED
            invitation.accepted_at = timezone.now()
            invitation.save(update_fields=["status", "accepted_at", "updated_at"])

            token, _ = Token.objects.get_or_create(user=user)
            payload = build_auth_session(user, token.key, request=request)
            payload["company"] = {
                "id": invitation.company.id,
                "name": invitation.company.name,
                "slug": invitation.company.slug,
                "role": membership.role,
                "branch_name": membership.branch.name if membership.branch else None,
                "clients_count": invitation.company.clients.count(),
                "clients_active_count": invitation.company.clients.filter(is_active=True).count(),
            }
            return Response(AuthSessionSerializer(payload).data, status=201)
