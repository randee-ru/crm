from __future__ import annotations

from django.db.models import QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from drive.models import DriveItem
from drive.serializers import (
    DriveFileWriteSerializer,
    DriveFolderWriteSerializer,
    DriveItemSerializer,
)


class DriveQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)

    def get_drive_queryset(self) -> QuerySet[DriveItem]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return DriveItem.objects.none()
        return DriveItem.objects.filter(
            company__slug=company_slug,
            company__is_active=True,
        ).select_related("created_by", "parent", "company")


class DriveItemListCreateView(DriveQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            item_type = self.request.data.get("item_type", "folder")
            if item_type == "file":
                return DriveFileWriteSerializer
            return DriveFolderWriteSerializer
        return DriveItemSerializer

    def get_queryset(self) -> QuerySet[DriveItem]:
        queryset = self.get_drive_queryset()
        parent = self.request.query_params.get("parent", "").strip()
        trashed = self.request.query_params.get("trashed", "").strip() == "1"

        if trashed:
            return queryset.filter(is_trashed=True).order_by("-updated_at")

        queryset = queryset.filter(is_trashed=False)
        if parent.isdigit():
            return queryset.filter(parent_id=int(parent)).order_by("item_type", "name")
        return queryset.filter(parent__isnull=True).order_by("item_type", "name")

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        item_type = request.data.get("item_type", "folder")
        serializer_class = DriveFileWriteSerializer if item_type == "file" else DriveFolderWriteSerializer
        write_serializer = serializer_class(data=request.data, context=self.get_serializer_context())
        write_serializer.is_valid(raise_exception=True)
        item = write_serializer.save()
        read_serializer = DriveItemSerializer(item, context=self.get_serializer_context())
        return Response(read_serializer.data, status=201)


class DriveItemDetailView(DriveQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "item_id"
    serializer_class = DriveItemSerializer

    def get_queryset(self) -> QuerySet[DriveItem]:
        return self.get_drive_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def perform_destroy(self, instance: DriveItem) -> None:
        if instance.item_type == DriveItem.ItemType.FOLDER and instance.children.filter(is_trashed=False).exists():
            instance.is_trashed = True
            instance.save(update_fields=["is_trashed", "updated_at"])
            return
        if instance.item_type == DriveItem.ItemType.FILE:
            instance.is_trashed = True
            instance.save(update_fields=["is_trashed", "updated_at"])
            return
        instance.delete()


class DriveBreadcrumbView(DriveQuerysetMixin, APIView):
    def get(self, request: Request, item_id: int) -> Response:
        queryset = self.get_drive_queryset()
        item = queryset.filter(id=item_id, item_type=DriveItem.ItemType.FOLDER).first()
        if not item:
            return Response([])

        trail = []
        current = item
        while current:
            trail.append({"id": current.id, "name": current.name})
            current = current.parent
        trail.reverse()
        return Response([{"id": None, "name": "Мой Диск"}, *trail])
