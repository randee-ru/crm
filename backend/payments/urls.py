from __future__ import annotations

from django.urls import path

from payments.views import PaymentDetailView, PaymentListCreateView

urlpatterns = [
    path("payments/", PaymentListCreateView.as_view(), name="payment-list"),
    path("payments/<int:payment_id>/", PaymentDetailView.as_view(), name="payment-detail"),
]
