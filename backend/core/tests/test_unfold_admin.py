from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from unfold.admin import ModelAdmin

from accounts.admin import CompanyMembershipAdmin
from accounts.models import CompanyMembership
from branches.admin import BranchAdmin
from branches.models import Branch
from companies.admin import CompanyAdmin
from companies.models import Company


class UnfoldAdminConfigurationTest(TestCase):
    def test_admin_classes_use_unfold_modeladmin(self) -> None:
        # Проверяем именно архитектурный контракт:
        # внутренние страницы должны работать через Unfold, а не через стандартный admin.
        self.assertTrue(issubclass(CompanyAdmin, ModelAdmin))
        self.assertTrue(issubclass(BranchAdmin, ModelAdmin))
        self.assertTrue(issubclass(CompanyMembershipAdmin, ModelAdmin))

    def test_models_are_registered_in_admin_site(self) -> None:
        # Регистрация в admin нужна, чтобы сотрудники могли открыть модели в /admin/.
        self.assertIsInstance(admin.site._registry[Company], CompanyAdmin)
        self.assertIsInstance(admin.site._registry[Branch], BranchAdmin)
        self.assertIsInstance(admin.site._registry[CompanyMembership], CompanyMembershipAdmin)

