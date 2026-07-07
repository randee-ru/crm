from __future__ import annotations

from django.urls import path

from contracts.views import ContractDetailView, ContractListCreateView

urlpatterns = [
    path("contracts/", ContractListCreateView.as_view(), name="contract-list"),
    path("contracts/<int:contract_id>/", ContractDetailView.as_view(), name="contract-detail"),
]
