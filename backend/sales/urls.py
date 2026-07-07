from __future__ import annotations

from django.urls import path

from sales.views import SaleDetailView, SaleListCreateView

urlpatterns = [
    path("sales/", SaleListCreateView.as_view(), name="sale-list"),
    path("sales/<int:sale_id>/", SaleDetailView.as_view(), name="sale-detail"),
]
