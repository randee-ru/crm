from __future__ import annotations

from rest_framework import serializers

from telephony.lines import resolve_call_log_line_display
from telephony.models import CallLog, TelephonyIntegration


class TelephonyIntegrationSerializer(serializers.ModelSerializer):
    has_api_key = serializers.SerializerMethodField()
    has_api_secret = serializers.SerializerMethodField()

    class Meta:
        model = TelephonyIntegration
        fields = [
            "id",
            "provider",
            "api_url",
            "has_api_key",
            "has_api_secret",
            "is_active",
            "last_synced_at",
            "settings",
        ]

    def get_has_api_key(self, obj: TelephonyIntegration) -> bool:
        return bool(obj.api_key)

    def get_has_api_secret(self, obj: TelephonyIntegration) -> bool:
        return bool(obj.api_secret)


class TelephonyIntegrationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelephonyIntegration
        fields = [
            "provider",
            "api_url",
            "api_key",
            "api_secret",
            "webhook_secret",
            "settings",
            "is_active",
        ]
        extra_kwargs = {
            "api_key": {"required": False, "allow_blank": True},
            "api_secret": {"required": False, "allow_blank": True},
            "webhook_secret": {"required": False, "allow_blank": True},
            "settings": {"required": False},
        }

    def update(self, instance: TelephonyIntegration, validated_data: dict) -> TelephonyIntegration:
        if validated_data.get("api_key") == "***":
            validated_data.pop("api_key", None)
        if validated_data.get("api_secret") == "***":
            validated_data.pop("api_secret", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class CallLogSerializer(serializers.ModelSerializer):
    client_id = serializers.IntegerField(source="client.id", read_only=True, allow_null=True)
    client_name = serializers.SerializerMethodField()
    line_display = serializers.SerializerMethodField()
    has_recording = serializers.SerializerMethodField()
    has_transcription = serializers.SerializerMethodField()

    class Meta:
        model = CallLog
        fields = [
            "id",
            "external_id",
            "direction",
            "status",
            "caller_phone",
            "target_phone",
            "from_number",
            "to_number",
            "line_number",
            "line_name",
            "line_display",
            "recording_id",
            "recording_url",
            "started_at",
            "duration",
            "source",
            "client_id",
            "client_name",
            "has_recording",
            "has_transcription",
            "transcription_text",
            "call_summary",
            "call_report",
            "created_at",
        ]

    def get_client_name(self, obj: CallLog) -> str | None:
        return obj.client.full_name if obj.client_id else None

    def get_line_display(self, obj: CallLog) -> str:
        line_directory = self.context.get("line_directory") or {}
        return resolve_call_log_line_display(obj, line_directory)

    def get_has_recording(self, obj: CallLog) -> bool:
        return bool(obj.recording_id or obj.recording_url or obj.recording_file)

    def get_has_transcription(self, obj: CallLog) -> bool:
        return bool(obj.transcription_text)


class CallLogDetailSerializer(CallLogSerializer):
    class Meta(CallLogSerializer.Meta):
        fields = CallLogSerializer.Meta.fields
