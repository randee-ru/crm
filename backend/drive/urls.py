from __future__ import annotations

from django.urls import path

from drive.views import DriveBreadcrumbView, DriveItemDetailView, DriveItemListCreateView

urlpatterns = [
    path("drive/items/", DriveItemListCreateView.as_view(), name="drive-item-list"),
    path("drive/items/<int:item_id>/", DriveItemDetailView.as_view(), name="drive-item-detail"),
    path("drive/items/<int:item_id>/breadcrumb/", DriveBreadcrumbView.as_view(), name="drive-breadcrumb"),
]
