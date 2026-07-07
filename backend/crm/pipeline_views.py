from __future__ import annotations

from django.db.models import Count, Prefetch, QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess
from clients.views import get_company_from_request
from crm.models import DealPipeline, DealStage
from crm.pipeline_serializers import (
    DealPipelineListSerializer,
    DealPipelineWriteSerializer,
    DealStageSerializer,
    DealStageWriteSerializer,
)
from crm.pipelines import ensure_default_pipeline, reorder_pipeline_stages


class PipelineQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)

    def get_company_pipelines_queryset(self) -> QuerySet[DealPipeline]:
        company = self.get_company()
        if company is None:
            return DealPipeline.objects.none()

        if not DealPipeline.objects.filter(company=company, is_active=True).exists():
            ensure_default_pipeline(company)

        stages_qs = DealStage.objects.annotate(deals_count=Count("deals", distinct=True)).order_by(
            "sort_order", "id"
        )
        return (
            DealPipeline.objects.filter(company=company, is_active=True)
            .prefetch_related(Prefetch("stages", queryset=stages_qs))
            .order_by("sort_order", "name")
        )


class PipelineListCreateView(PipelineQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return DealPipelineWriteSerializer
        return DealPipelineListSerializer

    def get_queryset(self) -> QuerySet[DealPipeline]:
        return self.get_company_pipelines_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = DealPipelineWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        pipeline = write_serializer.save()
        read_serializer = DealPipelineListSerializer(pipeline, context=self.get_serializer_context())
        return Response(read_serializer.data, status=201)


class PipelineDetailView(PipelineQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "pipeline_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return DealPipelineWriteSerializer
        return DealPipelineListSerializer

    def get_queryset(self) -> QuerySet[DealPipeline]:
        return self.get_company_pipelines_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def perform_destroy(self, instance: DealPipeline) -> None:
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class StageListCreateView(PipelineQuerysetMixin, ListCreateAPIView):
    def get_pipeline(self) -> DealPipeline:
        pipeline_id = self.kwargs["pipeline_id"]
        return self.get_company_pipelines_queryset().get(id=pipeline_id)

    def get_queryset(self) -> QuerySet[DealStage]:
        pipeline = self.get_pipeline()
        return pipeline.stages.annotate(deals_count=Count("deals", distinct=True)).order_by(
            "sort_order", "id"
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DealStageWriteSerializer
        return DealStageSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["pipeline"] = self.get_pipeline()
        return context

    def perform_create(self, serializer) -> None:
        serializer.save()

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = DealStageWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        read_serializer = DealStageSerializer(write_serializer.instance)
        return Response(read_serializer.data, status=201)


class StageDetailView(PipelineQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "stage_id"

    def get_pipeline(self) -> DealPipeline:
        pipeline_id = self.kwargs["pipeline_id"]
        return self.get_company_pipelines_queryset().get(id=pipeline_id)

    def get_queryset(self) -> QuerySet[DealStage]:
        return self.get_pipeline().stages.all()

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return DealStageWriteSerializer
        return DealStageSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["pipeline"] = self.get_pipeline()
        return context

    def perform_destroy(self, instance: DealStage) -> None:
        if instance.pipeline.stages.count() <= 1:
            raise ValidationError("Нельзя удалить единственный этап воронки.")
        if instance.deals.exists():
            raise ValidationError(
                "Нельзя удалить этап с активными сделками. Перенесите сделки в другой этап."
            )
        instance.delete()


class StageReorderView(PipelineQuerysetMixin, APIView):
    def post(self, request: Request, pipeline_id: int) -> Response:
        pipeline = self.get_company_pipelines_queryset().get(id=pipeline_id)
        stage_ids = request.data.get("stage_ids")

        if not isinstance(stage_ids, list) or not stage_ids:
            raise ValidationError({"stage_ids": "Передайте массив идентификаторов этапов."})

        try:
            normalized_ids = [int(stage_id) for stage_id in stage_ids]
        except (TypeError, ValueError) as exc:
            raise ValidationError({"stage_ids": "Идентификаторы этапов должны быть числами."}) from exc

        try:
            reorder_pipeline_stages(pipeline, normalized_ids)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

        stages_qs = pipeline.stages.annotate(deals_count=Count("deals", distinct=True)).order_by(
            "sort_order", "id"
        )
        serializer = DealStageSerializer(stages_qs, many=True)
        return Response(serializer.data)
