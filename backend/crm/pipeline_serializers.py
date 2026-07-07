from __future__ import annotations

from rest_framework import serializers

from crm.models import DealPipeline, DealStage


class DealStageSerializer(serializers.ModelSerializer):
    deals_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = DealStage
        fields = [
            "id",
            "name",
            "code",
            "color",
            "sort_order",
            "is_won",
            "is_lost",
            "deals_count",
        ]


class DealStageWriteSerializer(serializers.ModelSerializer):
    code = serializers.SlugField(required=False, allow_blank=True, max_length=80)
    after_stage_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = DealStage
        fields = [
            "name",
            "code",
            "color",
            "sort_order",
            "is_won",
            "is_lost",
            "after_stage_id",
        ]

    def validate(self, attrs: dict) -> dict:
        is_won = attrs.get("is_won", False)
        is_lost = attrs.get("is_lost", False)
        if is_won and is_lost:
            raise serializers.ValidationError("Этап не может быть одновременно успехом и отказом.")
        return attrs

    def validate_code(self, code: str) -> str:
        if not code:
            return code
        pipeline = self.context.get("pipeline")
        if not pipeline:
            return code
        queryset = DealStage.objects.filter(pipeline=pipeline, code=code)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Этап с таким кодом уже есть в воронке.")
        return code

    def validate_after_stage_id(self, after_stage_id: int | None) -> int | None:
        if after_stage_id is None:
            return None
        pipeline = self.context.get("pipeline")
        if pipeline and not pipeline.stages.filter(id=after_stage_id).exists():
            raise serializers.ValidationError("Указанный этап не найден в этой воронке.")
        return after_stage_id

    def create(self, validated_data: dict) -> DealStage:
        from crm.pipelines import (
            compute_stage_sort_order,
            ensure_unique_stage_code,
            stage_code_from_name,
        )

        pipeline = self.context["pipeline"]
        after_stage_id = validated_data.pop("after_stage_id", None)
        code = (validated_data.get("code") or "").strip()
        if not code:
            code = ensure_unique_stage_code(pipeline, stage_code_from_name(validated_data["name"]))
        validated_data["code"] = code

        if validated_data.get("sort_order") is None:
            validated_data["sort_order"] = compute_stage_sort_order(pipeline, after_stage_id)

        if not validated_data.get("color"):
            validated_data["color"] = "#4a90d9"

        return DealStage.objects.create(pipeline=pipeline, **validated_data)


class DealPipelineListSerializer(serializers.ModelSerializer):
    stages = DealStageSerializer(many=True, read_only=True)

    class Meta:
        model = DealPipeline
        fields = [
            "id",
            "name",
            "slug",
            "is_default",
            "is_active",
            "sort_order",
            "stages",
        ]


class DealPipelineWriteSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True, max_length=80)

    class Meta:
        model = DealPipeline
        fields = [
            "name",
            "slug",
            "is_default",
            "is_active",
            "sort_order",
        ]

    def validate_slug(self, slug: str) -> str:
        if not slug:
            return slug
        company = self.context.get("company")
        if not company:
            return slug
        queryset = DealPipeline.objects.filter(company=company, slug=slug)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Воронка с таким кодом уже существует.")
        return slug

    def create(self, validated_data: dict) -> DealPipeline:
        from crm.pipelines import (
            ensure_unique_pipeline_slug,
            pipeline_slug_from_name,
            seed_default_stages_for_pipeline,
        )

        company = self.context["company"]
        slug = (validated_data.get("slug") or "").strip()
        if not slug:
            slug = pipeline_slug_from_name(validated_data["name"])
        validated_data["slug"] = ensure_unique_pipeline_slug(company, slug)

        if "sort_order" not in validated_data:
            last = (
                DealPipeline.objects.filter(company=company)
                .order_by("-sort_order")
                .values_list("sort_order", flat=True)
                .first()
            )
            validated_data["sort_order"] = (last or 0) + 10

        pipeline = DealPipeline.objects.create(company=company, **validated_data)
        if pipeline.is_default:
            DealPipeline.objects.filter(company=company, is_default=True).exclude(id=pipeline.id).update(
                is_default=False
            )
        seed_default_stages_for_pipeline(pipeline)
        return pipeline

    def update(self, instance: DealPipeline, validated_data: dict) -> DealPipeline:
        pipeline = super().update(instance, validated_data)
        if pipeline.is_default:
            DealPipeline.objects.filter(company=instance.company, is_default=True).exclude(
                id=pipeline.id
            ).update(is_default=False)
        return pipeline
