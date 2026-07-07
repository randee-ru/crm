from __future__ import annotations

from django.urls import path

from crm.deal_views import DealDetailView, DealListCreateView
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
    path("deals/<int:deal_id>/", DealDetailView.as_view(), name="deal-detail"),
]
