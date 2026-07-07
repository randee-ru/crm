from __future__ import annotations

from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from accounts.models import CompanyMembership
from companies.models import Company


def get_active_memberships(user) -> CompanyMembership:
    return CompanyMembership.objects.filter(
        user=user,
        is_active=True,
        company__is_active=True,
    ).select_related("company", "branch")


def user_can_access_company(user, company_slug: str) -> bool:
    if not user or not user.is_authenticated:
        return False

    return get_active_memberships(user).filter(company__slug=company_slug).exists()


def resolve_company_slug(request: Request, *, required: bool = True) -> str | None:
    company_slug = request.query_params.get("company")
    if company_slug:
        return company_slug

    if not request.user or not request.user.is_authenticated:
        return None

    membership = get_active_memberships(request.user).first()
    if membership:
        return membership.company.slug

    return None if not required else None


def get_company_or_none(company_slug: str) -> Company | None:
    try:
        return Company.objects.get(slug=company_slug, is_active=True)
    except Company.DoesNotExist:
        return None


class HasCompanyAccess(BasePermission):
    message = "You do not have access to this company."

    def has_permission(self, request: Request, view) -> bool:
        company_slug = resolve_company_slug(request, required=False)
        if not company_slug:
            self.message = "Company context is required."
            return False

        if not get_company_or_none(company_slug):
            self.message = "Company not found."
            return False

        return user_can_access_company(request.user, company_slug)
