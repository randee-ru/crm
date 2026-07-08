from __future__ import annotations

from django.urls import path

from crm.analytics_views import RenewalFunnelAnalyticsView, SalesFunnelAnalyticsView
from crm.dashboard_views import CrmDashboardView, CrmFunnelAnalyticsView
from crm.deal_views import DealContactListCreateView, DealDetailView, DealKanbanView, DealListCreateView
from crm.pipeline_views import (
    PipelineDetailView,
    PipelineListCreateView,
    StageDetailView,
    StageListCreateView,
    StageReorderView,
)
from crm.views import TaskDetailView, TaskListCreateView

urlpatterns = [
    path("tasks/", TaskListCreateView.as_view(), name="task-list"),
    path("tasks/<int:task_id>/", TaskDetailView.as_view(), name="task-detail"),
    path("pipelines/", PipelineListCreateView.as_view(), name="pipeline-list"),
    path("pipelines/<int:pipeline_id>/", PipelineDetailView.as_view(), name="pipeline-detail"),
    path(
        "pipelines/<int:pipeline_id>/stages/",
        StageListCreateView.as_view(),
        name="pipeline-stage-list",
    ),
    path(
        "pipelines/<int:pipeline_id>/stages/reorder/",
        StageReorderView.as_view(),
        name="pipeline-stage-reorder",
    ),
    path(
        "pipelines/<int:pipeline_id>/stages/<int:stage_id>/",
        StageDetailView.as_view(),
        name="pipeline-stage-detail",
    ),
    path("deals/", DealListCreateView.as_view(), name="deal-list"),
    path("deals/kanban/", DealKanbanView.as_view(), name="deal-kanban"),
    path("dashboard/", CrmDashboardView.as_view(), name="crm-dashboard"),
    path("dashboard/analytics/", CrmFunnelAnalyticsView.as_view(), name="crm-dashboard-analytics"),
    path("deals/<int:deal_id>/", DealDetailView.as_view(), name="deal-detail"),
    path("deals/<int:deal_id>/contacts/", DealContactListCreateView.as_view(), name="deal-contacts"),
    path("analytics/sales-funnel/", SalesFunnelAnalyticsView.as_view(), name="sales-funnel-analytics"),
    path("analytics/renewal-funnel/", RenewalFunnelAnalyticsView.as_view(), name="renewal-funnel-analytics"),
]
