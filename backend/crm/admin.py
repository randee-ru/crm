from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from .models import Deal, DealPipeline, DealStage, Task


class TaskAdmin(ModelAdmin):
    list_display = ("title", "company", "status", "priority", "due_at", "assigned_to")
    list_filter = ("company", "status", "priority", "branch")
    search_fields = ("title", "description")
    autocomplete_fields = ("company", "branch", "client", "assigned_to", "created_by")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True


class DealStageInline(TabularInline):
    model = DealStage
    extra = 0
    fields = ("name", "code", "color", "sort_order", "is_won", "is_lost")
    ordering = ("sort_order", "id")


class DealPipelineAdmin(ModelAdmin):
    list_display = ("name", "company", "slug", "is_default", "is_active", "sort_order")
    list_filter = ("company", "is_default", "is_active")
    search_fields = ("name", "slug")
    autocomplete_fields = ("company",)
    inlines = [DealStageInline]
    list_fullwidth = True


class DealStageAdmin(ModelAdmin):
    list_display = ("name", "pipeline", "code", "color", "sort_order", "is_won", "is_lost")
    list_filter = ("pipeline__company", "is_won", "is_lost")
    search_fields = ("name", "code")
    autocomplete_fields = ("pipeline",)
    list_fullwidth = True


class DealAdmin(ModelAdmin):
    list_display = ("title", "company", "pipeline", "stage", "amount", "client", "assigned_to")
    list_filter = ("company", "pipeline", "stage")
    search_fields = ("title",)
    autocomplete_fields = ("company", "pipeline", "stage", "branch", "client", "assigned_to")
    list_fullwidth = True
