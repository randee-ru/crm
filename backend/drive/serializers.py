from __future__ import annotations

from rest_framework import serializers

from drive.models import DriveItem


class DriveItemSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = DriveItem
        fields = [
            "id",
            "parent_id",
            "name",
            "item_type",
            "mime_type",
            "size_bytes",
            "is_trashed",
            "created_by_name",
            "download_url",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, item: DriveItem) -> str | None:
        if not item.created_by_id:
            return None
        full_name = item.created_by.get_full_name().strip()
        return full_name or item.created_by.username

    def get_download_url(self, item: DriveItem) -> str | None:
        if item.item_type != DriveItem.ItemType.FILE or not item.file:
            return None
        request = self.context.get("request")
        if not request:
            return item.file.url
        return request.build_absolute_uri(item.file.url)


class DriveFolderWriteSerializer(serializers.ModelSerializer):
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=DriveItem.objects.filter(item_type=DriveItem.ItemType.FOLDER, is_trashed=False),
        source="parent",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = DriveItem
        fields = ["name", "parent_id"]

    def validate_name(self, name: str) -> str:
        trimmed = name.strip()
        if not trimmed:
            raise serializers.ValidationError("Укажите название папки.")
        return trimmed

    def create(self, validated_data: dict) -> DriveItem:
        return DriveItem.objects.create(
            company=self.context["company"],
            created_by=self.context["request"].user,
            item_type=DriveItem.ItemType.FOLDER,
            **validated_data,
        )


class DriveFileWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    parent_id = serializers.IntegerField(required=False, allow_null=True)
    content = serializers.CharField(required=False, allow_blank=True)

    def validate_name(self, name: str) -> str:
        trimmed = name.strip()
        if not trimmed:
            raise serializers.ValidationError("Укажите имя файла.")
        return trimmed

    def create(self, validated_data: dict) -> DriveItem:
        company = self.context["company"]
        user = self.context["request"].user
        parent_id = validated_data.get("parent_id")
        parent = None
        if parent_id:
            parent = DriveItem.objects.get(
                id=parent_id,
                company=company,
                item_type=DriveItem.ItemType.FOLDER,
                is_trashed=False,
            )

        content = validated_data.get("content", "")
        name = validated_data["name"]
        from django.core.files.base import ContentFile

        file_obj = ContentFile(content.encode("utf-8"), name=name)
        return DriveItem.objects.create(
            company=company,
            parent=parent,
            created_by=user,
            name=name,
            item_type=DriveItem.ItemType.FILE,
            file=file_obj,
            mime_type="text/plain",
            size_bytes=len(content.encode("utf-8")),
        )
