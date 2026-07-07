from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase
from rest_framework.authtoken.models import Token

from accounts.models import CompanyMembership
from companies.models import Company


class CompanyModuleSettingsApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(username="manager", password="admin12345")
        self.company = Company.objects.create(name="Sportmax Fitness", slug="sportmax")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyMembership.Role.MANAGER,
        )
        self.token = Token.objects.create(user=self.user)

    def auth_headers(self) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_defaults_to_empty_list(self) -> None:
        response = self.http.get("/api/v1/company/module-settings/?company=sportmax", **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"disabled_modules": [], "role_disabled_modules": {}})

    def test_patch_persists_and_deduplicates(self) -> None:
        response = self.http.patch(
            "/api/v1/company/module-settings/?company=sportmax",
            data={"disabled_modules": ["marketing", "bookings", "marketing"]},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["disabled_modules"], ["marketing", "bookings"])

        self.company.refresh_from_db()
        self.assertEqual(self.company.disabled_modules, ["marketing", "bookings"])

    def test_module_settings_are_isolated_per_company(self) -> None:
        other_company = Company.objects.create(name="FitPro", slug="fitpro")
        other_company.disabled_modules = ["sales"]
        other_company.save(update_fields=["disabled_modules"])

        response = self.http.get("/api/v1/company/module-settings/?company=sportmax", **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"disabled_modules": [], "role_disabled_modules": {}})

    def test_role_disabled_modules_persist_and_reject_unknown_role(self) -> None:
        response = self.http.patch(
            "/api/v1/company/module-settings/?company=sportmax",
            data={"role_disabled_modules": {"employee": ["marketing", "sales", "marketing"]}},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role_disabled_modules"], {"employee": ["marketing", "sales"]})

        invalid_response = self.http.patch(
            "/api/v1/company/module-settings/?company=sportmax",
            data={"role_disabled_modules": {"owner": ["marketing"]}},
            content_type="application/json",
            **self.auth_headers(),
        )
        self.assertEqual(invalid_response.status_code, 400)

    def test_owner_role_always_sees_full_menu(self) -> None:
        self.company.disabled_modules = ["marketing"]
        self.company.role_disabled_modules = {"owner": ["sales"], "employee": ["sales"]}
        self.company.save(update_fields=["disabled_modules", "role_disabled_modules"])

        self.assertEqual(self.company.effective_disabled_modules("owner"), ["marketing"])
        self.assertEqual(self.company.effective_disabled_modules("employee"), ["marketing", "sales"])
