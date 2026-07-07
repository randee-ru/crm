from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client
from crm.models import Deal, DealPipeline, DealStage
from crm.pipelines import get_default_pipeline


class DealListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True, default=None)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    assigned_to_name = serializers.SerializerMethodField()
    stage_id = serializers.IntegerField(source="stage.id", read_only=True)
    stage_code = serializers.CharField(source="stage.code", read_only=True)
    stage_label = serializers.CharField(source="stage.name", read_only=True)
    stage_color = serializers.CharField(source="stage.color", read_only=True)
    pipeline_id = serializers.IntegerField(source="pipeline.id", read_only=True)

    class Meta:
        model = Deal
        fields = [
            "id",
            "title",
            "amount",
            "pipeline_id",
            "stage_id",
            "stage_code",
            "stage_label",
            "stage_color",
            "client_name",
            "branch_name",
            "assigned_to_name",
            "created_at",
        ]

    def get_assigned_to_name(self, deal: Deal) -> str | None:
        if not deal.assigned_to_id:
            return None
        full_name = deal.assigned_to.get_full_name().strip()
        return full_name or deal.assigned_to.username


class DealDetailSerializer(DealListSerializer):
    client_id = serializers.IntegerField(source="client.id", read_only=True, default=None)
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    assigned_to_id = serializers.IntegerField(read_only=True, default=None)

    class Meta(DealListSerializer.Meta):
        fields = DealListSerializer.Meta.fields + [
            "client_id",
            "branch_id",
            "assigned_to_id",
            "updated_at",
        ]


class DealWriteSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        source="client",
        required=False,
        allow_null=True,
    )
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )
    pipeline_id = serializers.PrimaryKeyRelatedField(
        queryset=DealPipeline.objects.all(),
        source="pipeline",
        required=False,
    )
    stage_id = serializers.PrimaryKeyRelatedField(
        queryset=DealStage.objects.all(),
        source="stage",
        required=False,
    )

    class Meta:
        model = Deal
        fields = [
            "title",
            "amount",
            "pipeline_id",
            "stage_id",
            "client_id",
            "branch_id",
        ]

    def validate_client_id(self, client):
        company = self.context.get("company")
        if client and company and client.company_id != company.id:
            raise serializers.ValidationError("Клиент должен принадлежать текущей компании.")
        return client

    def validate_branch_id(self, branch):
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def validate_pipeline_id(self, pipeline: DealPipeline) -> DealPipeline:
        company = self.context.get("company")
        if pipeline and company and pipeline.company_id != company.id:
            raise serializers.ValidationError("Воронка должна принадлежать текущей компании.")
        return pipeline

    def validate(self, attrs: dict) -> dict:
        company = self.context.get("company")
        pipeline = attrs.get("pipeline")
        stage = attrs.get("stage")

        if self.instance:
            pipeline = pipeline or self.instance.pipeline
            stage = stage or self.instance.stage
        elif company and not pipeline:
            pipeline = get_default_pipeline(company)
            attrs["pipeline"] = pipeline

        if stage and pipeline and stage.pipeline_id != pipeline.id:
            raise serializers.ValidationError({"stage_id": "Этап должен принадлежать выбранной воронке."})

        if pipeline and not stage:
            first_stage = pipeline.stages.order_by("sort_order", "id").first()
            if first_stage:
                attrs["stage"] = first_stage

        return attrs

    def create(self, validated_data: dict) -> Deal:
        validated_data["company"] = self.context["company"]
        validated_data["assigned_to"] = self.context["request"].user
        return super().create(validated_data)
