from __future__ import annotations

from unfold.admin import ModelAdmin

from .models import Trainer, TrainerRentPayment


class TrainerAdmin(ModelAdmin):
    list_display = (
        "full_name",
        "phone",
        "company",
        "branch",
        "specialization",
        "trains_gym_floor",
        "trains_group_programs",
        "is_active",
    )
    list_filter = ("company", "branch", "is_active", "trains_gym_floor", "trains_group_programs")
    search_fields = ("first_name", "last_name", "phone", "email", "specialization")
    autocomplete_fields = ("company", "branch")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True


class TrainerRentPaymentAdmin(ModelAdmin):
    list_display = ("trainer", "company", "period", "amount", "paid_at")
    list_filter = ("company", "period")
    search_fields = ("trainer__first_name", "trainer__last_name")
    autocomplete_fields = ("company", "trainer")
    list_fullwidth = True
