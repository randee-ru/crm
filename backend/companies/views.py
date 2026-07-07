from __future__ import annotations

from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from companies.models import Company
from companies.serializers import CompanyModuleSettingsSerializer


class CompanyModuleSettingsView(APIView):
    """Список пунктов бокового меню, скрытых компанией для своих сотрудников."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def _get_company(self, request: Request) -> Company | None:
        company_slug = resolve_company_slug(request, required=True)
        if not company_slug:
            return None
        return Company.objects.filter(slug=company_slug, is_active=True).first()

    def get(self, request: Request) -> Response:
        company = self._get_company(request)
        if company is None:
            return Response({"detail": "Company not found."}, status=404)
        return Response(CompanyModuleSettingsSerializer(company).data)

    def patch(self, request: Request) -> Response:
        company = self._get_company(request)
        if company is None:
            return Response({"detail": "Company not found."}, status=404)
        serializer = CompanyModuleSettingsSerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
