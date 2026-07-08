from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client
from crm.choices import ClientInterest, ContactType, LeadSource, LossReason, VisitType
from crm.funnel_services import apply_stage_side_effects, record_stage_change
from crm.models import Deal, DealContactHistory, DealPipeline, DealStage, DealStageHistory, Task
from crm.pipelines import get_default_pipeline
from memberships.models import Membership
from telephony.models import CallLog


class DealLinkedCallSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    has_recording = serializers.SerializerMethodField()
    recording_status = serializers.SerializerMethodField()

    class Meta:
        model = CallLog
        fields = [
            "id",
            "caller_phone",
            "line_name",
            "status",
            "status_label",
            "started_at",
            "duration",
            "has_recording",
            "recording_status",
        ]

    def get_has_recording(self, call: CallLog) -> bool:
        return bool(call.recording_id or call.recording_url or call.recording_file)

    def get_recording_status(self, call: CallLog) -> str:
        if call.recording_id or call.recording_url or call.recording_file:
            return "available"
        if call.status == CallLog.Status.ANSWERED and call.duration > 0:
            return "not_stored"
        return "unavailable"


class KanbanDealSerializer(serializers.ModelSerializer):
    """Облегчённый serializer для канбана — без N+1 по задачам."""

    client_name = serializers.SerializerMethodField()
    contact_phone = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    stage_id = serializers.IntegerField(source="stage.id", read_only=True)
    stage_code = serializers.CharField(source="stage.code", read_only=True)
    stage_label = serializers.CharField(source="stage.name", read_only=True)
    stage_color = serializers.CharField(source="stage.color", read_only=True)
    pipeline_id = serializers.IntegerField(source="pipeline.id", read_only=True)
    pipeline_slug = serializers.CharField(source="pipeline.slug", read_only=True)
    lead_source_label = serializers.CharField(source="get_lead_source_display", read_only=True, default="")
    days_remaining = serializers.SerializerMethodField()
    has_overdue_task = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = Deal
        fields = [
            "id",
            "title",
            "amount",
            "pipeline_id",
            "pipeline_slug",
            "stage_id",
            "stage_code",
            "stage_label",
            "stage_color",
            "client_name",
            "contact_name",
            "contact_phone",
            "lead_source",
            "lead_source_label",
            "days_remaining",
            "has_overdue_task",
            "next_contact_at",
            "loss_reason",
            "assigned_to_name",
            "created_at",
        ]

    def get_client_name(self, deal: Deal) -> str | None:
        if deal.client_id:
            return deal.client.full_name
        return deal.contact_name or None

    def get_contact_phone(self, deal: Deal) -> str:
        return deal.display_phone

    def get_assigned_to_name(self, deal: Deal) -> str | None:
        if not deal.assigned_to_id:
            return deal.manager_name or None
        full_name = deal.assigned_to.get_full_name().strip()
        return full_name or deal.assigned_to.username

    def get_days_remaining(self, deal: Deal) -> int | None:
        return deal.days_remaining()


class DealListSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    contact_phone = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    stage_id = serializers.IntegerField(source="stage.id", read_only=True)
    stage_code = serializers.CharField(source="stage.code", read_only=True)
    stage_label = serializers.CharField(source="stage.name", read_only=True)
    stage_color = serializers.CharField(source="stage.color", read_only=True)
    pipeline_id = serializers.IntegerField(source="pipeline.id", read_only=True)
    pipeline_slug = serializers.CharField(source="pipeline.slug", read_only=True)
    lead_source_label = serializers.CharField(source="get_lead_source_display", read_only=True, default="")
    days_remaining = serializers.SerializerMethodField()
    has_overdue_task = serializers.BooleanField(read_only=True, default=False)
    next_contact_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Deal
        fields = [
            "id",
            "title",
            "amount",
            "pipeline_id",
            "pipeline_slug",
            "stage_id",
            "stage_code",
            "stage_label",
            "stage_color",
            "client_name",
            "contact_name",
            "contact_phone",
            "contact_email",
            "lead_source",
            "lead_source_label",
            "client_interest",
            "visit_type",
            "visit_at",
            "desired_tariff",
            "next_contact_at",
            "manager_comment",
            "loss_reason",
            "days_remaining",
            "has_overdue_task",
            "branch_name",
            "assigned_to_name",
            "created_at",
        ]

    def get_client_name(self, deal: Deal) -> str | None:
        if deal.client_id:
            return deal.client.full_name
        return deal.contact_name or None

    def get_contact_phone(self, deal: Deal) -> str:
        return deal.display_phone

    def get_branch_name(self, deal: Deal) -> str | None:
        if not deal.branch_id:
            return None
        return deal.branch.name

    def get_assigned_to_name(self, deal: Deal) -> str | None:
        if not deal.assigned_to_id:
            return deal.manager_name or None
        full_name = deal.assigned_to.get_full_name().strip()
        return full_name or deal.assigned_to.username

    def get_days_remaining(self, deal: Deal) -> int | None:
        return deal.days_remaining()


class DealStageHistorySerializer(serializers.ModelSerializer):
    from_stage_code = serializers.CharField(source="from_stage.code", read_only=True, allow_null=True)
    from_stage_name = serializers.CharField(source="from_stage.name", read_only=True, allow_null=True)
    to_stage_code = serializers.CharField(source="to_stage.code", read_only=True)
    to_stage_name = serializers.CharField(source="to_stage.name", read_only=True)
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DealStageHistory
        fields = [
            "id",
            "from_stage_code",
            "from_stage_name",
            "to_stage_code",
            "to_stage_name",
            "changed_by_name",
            "comment",
            "created_at",
        ]

    def get_changed_by_name(self, entry: DealStageHistory) -> str | None:
        if not entry.changed_by_id:
            return None
        full_name = entry.changed_by.get_full_name().strip()
        return full_name or entry.changed_by.username


class DealContactHistorySerializer(serializers.ModelSerializer):
    contact_type_label = serializers.CharField(source="get_contact_type_display", read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = DealContactHistory
        fields = [
            "id",
            "contact_type",
            "contact_type_label",
            "contacted_at",
            "user_name",
            "comment",
            "created_at",
        ]

    def get_user_name(self, entry: DealContactHistory) -> str | None:
        if not entry.user_id:
            return None
        full_name = entry.user.get_full_name().strip()
        return full_name or entry.user.username


class DealContactHistoryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealContactHistory
        fields = ["contact_type", "contacted_at", "comment"]

    def validate_contact_type(self, value: str) -> str:
        if value not in ContactType.values:
            raise serializers.ValidationError("Недопустимый тип контакта.")
        return value

    def create(self, validated_data: dict) -> DealContactHistory:
        from django.utils import timezone

        deal: Deal = self.context["deal"]
        user = self.context["request"].user
        contacted_at = validated_data.get("contacted_at") or timezone.now()

        entry = DealContactHistory.objects.create(
            deal=deal,
            user=user,
            contacted_at=contacted_at,
            contact_type=validated_data["contact_type"],
            comment=validated_data.get("comment", ""),
        )

        if contacted_at > timezone.now():
            deal.next_contact_at = contacted_at
            deal.save(update_fields=["next_contact_at", "updated_at"])

        return entry


class DealTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    due_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_at",
            "assigned_to_name",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_assigned_to_name(self, task: Task) -> str | None:
        if not task.assigned_to_id:
            return None
        full_name = task.assigned_to.get_full_name().strip()
        return full_name or task.assigned_to.username

    def get_created_by_name(self, task: Task) -> str | None:
        if not task.created_by_id:
            return None
        full_name = task.created_by.get_full_name().strip()
        return full_name or task.created_by.username


class DealDetailSerializer(DealListSerializer):
    client_id = serializers.IntegerField(source="client.id", read_only=True, allow_null=True)
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, allow_null=True)
    assigned_to_id = serializers.IntegerField(read_only=True, allow_null=True)
    membership_id = serializers.IntegerField(source="membership.id", read_only=True, allow_null=True)
    membership_title = serializers.CharField(source="membership.title", read_only=True, allow_null=True)
    membership_starts_at = serializers.DateField(source="membership.starts_at", read_only=True, allow_null=True)
    membership_ends_at = serializers.DateField(source="membership.ends_at", read_only=True, allow_null=True)
    renewal_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    proposed_tariff = serializers.CharField(read_only=True, allow_blank=True)
    stage_history = DealStageHistorySerializer(many=True, read_only=True)
    contact_history = DealContactHistorySerializer(many=True, read_only=True)
    tasks = DealTaskSerializer(many=True, read_only=True)
    linked_calls = serializers.SerializerMethodField()
    source_name = serializers.CharField(read_only=True, allow_blank=True)
    channel = serializers.CharField(read_only=True, allow_blank=True)
    description = serializers.CharField(read_only=True, allow_blank=True)
    closed_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta(DealListSerializer.Meta):
        fields = DealListSerializer.Meta.fields + [
            "client_id",
            "branch_id",
            "assigned_to_id",
            "membership_id",
            "membership_title",
            "membership_starts_at",
            "membership_ends_at",
            "renewal_amount",
            "proposed_tariff",
            "source_name",
            "channel",
            "description",
            "closed_at",
            "updated_at",
            "stage_history",
            "contact_history",
            "tasks",
            "linked_calls",
        ]

    def get_linked_calls(self, deal: Deal) -> list[dict]:
        from crm.call_links import resolve_calls_for_deal

        try:
            calls = resolve_calls_for_deal(deal)
            return DealLinkedCallSerializer(calls, many=True).data
        except Exception:
            return []


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
    membership_id = serializers.PrimaryKeyRelatedField(
        queryset=Membership.objects.all(),
        source="membership",
        required=False,
        allow_null=True,
    )
    lead_source = serializers.ChoiceField(choices=LeadSource.choices, required=False, allow_blank=True)
    client_interest = serializers.ChoiceField(choices=ClientInterest.choices, required=False, allow_blank=True)
    visit_type = serializers.ChoiceField(choices=VisitType.choices, required=False, allow_blank=True)
    loss_reason = serializers.ChoiceField(choices=LossReason.choices, required=False, allow_blank=True)

    class Meta:
        model = Deal
        fields = [
            "title",
            "amount",
            "pipeline_id",
            "stage_id",
            "client_id",
            "branch_id",
            "membership_id",
            "contact_name",
            "contact_phone",
            "contact_email",
            "lead_source",
            "client_interest",
            "visit_type",
            "visit_at",
            "desired_tariff",
            "next_contact_at",
            "manager_comment",
            "loss_reason",
            "renewal_amount",
            "proposed_tariff",
            "description",
            "source_name",
            "channel",
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

    def validate_membership_id(self, membership):
        company = self.context.get("company")
        if membership and company and membership.company_id != company.id:
            raise serializers.ValidationError("Абонемент должен принадлежать текущей компании.")
        return membership

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
                stage = first_stage

        # Причина отказа обязательна при переходе на проигрышный этап
        loss_reason = attrs.get("loss_reason", getattr(self.instance, "loss_reason", ""))
        if stage and stage.is_lost and not loss_reason:
            raise serializers.ValidationError(
                {"loss_reason": "Укажите причину отказа при переводе сделки в «Потеряно»."}
            )

        return attrs

    def create(self, validated_data: dict) -> Deal:
        validated_data["company"] = self.context["company"]
        validated_data["assigned_to"] = self.context["request"].user
        deal = super().create(validated_data)
        record_stage_change(
            deal,
            from_stage_id=None,
            to_stage=deal.stage,
            changed_by=self.context["request"].user,
            comment="Создание сделки",
        )
        return deal

    def update(self, instance: Deal, validated_data: dict) -> Deal:
        old_stage = instance.stage
        new_stage = validated_data.get("stage", old_stage)
        user = self.context["request"].user

        deal = super().update(instance, validated_data)

        if new_stage.id != old_stage.id:
            record_stage_change(
                deal,
                from_stage_id=old_stage.id,
                to_stage=new_stage,
                changed_by=user,
            )
            apply_stage_side_effects(deal, old_stage=old_stage, new_stage=new_stage, changed_by=user)

        return deal
