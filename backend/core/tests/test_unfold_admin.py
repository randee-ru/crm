from __future__ import annotations

from django.contrib import admin
from django.test import TestCase, override_settings
from unfold.admin import ModelAdmin

from accounts.admin import CompanyMembershipAdmin
from accounts.models import CompanyMembership
from branches.admin import BranchAdmin
from branches.models import Branch
from clients.models import Client
from companies.admin import CompanyAdmin
from companies.models import Company
from config.admin_registry import register_business_admin
from crm.models import Task


class UnfoldAdminConfigurationTest(TestCase):
    def test_admin_classes_use_unfold_modeladmin(self) -> None:
        self.assertTrue(issubclass(CompanyAdmin, ModelAdmin))
        self.assertTrue(issubclass(BranchAdmin, ModelAdmin))
        self.assertTrue(issubclass(CompanyMembershipAdmin, ModelAdmin))

    def test_platform_models_are_registered_in_admin_site(self) -> None:
        self.assertIsInstance(admin.site._registry[Company], CompanyAdmin)
        self.assertIsInstance(admin.site._registry[Branch], BranchAdmin)
        self.assertIsInstance(admin.site._registry[CompanyMembership], CompanyMembershipAdmin)

    def test_business_models_not_registered_in_test_settings(self) -> None:
        # test settings держат ADMIN_ENABLE_BUSINESS_MODELS=False.
        self.assertNotIn(Client, admin.site._registry)
        self.assertNotIn(Task, admin.site._registry)

    @override_settings(ADMIN_ENABLE_BUSINESS_MODELS=True)
    def test_register_business_admin_can_attach_crm_models(self) -> None:
        from clients.admin import ClientAdmin
        from crm.admin import TaskAdmin

        register_business_admin(Client, ClientAdmin)
        register_business_admin(Task, TaskAdmin)

        self.assertIsInstance(admin.site._registry[Client], ClientAdmin)
        self.assertIsInstance(admin.site._registry[Task], TaskAdmin)

        admin.site.unregister(Client)
        admin.site.unregister(Task)
