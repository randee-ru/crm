from __future__ import annotations

from django.urls import path

from employees.views import (
    TrainerDetailView,
    TrainerListCreateView,
    TrainerRentPaymentDetailView,
    TrainerRentPaymentListCreateView,
)

urlpatterns = [
    path("trainers/", TrainerListCreateView.as_view(), name="trainer-list"),
    path("trainers/<int:trainer_id>/", TrainerDetailView.as_view(), name="trainer-detail"),
    path(
        "trainers/<int:trainer_id>/rent-payments/",
        TrainerRentPaymentListCreateView.as_view(),
        name="trainer-rent-payment-list",
    ),
    path(
        "trainers/<int:trainer_id>/rent-payments/<int:payment_id>/",
        TrainerRentPaymentDetailView.as_view(),
        name="trainer-rent-payment-detail",
    ),
]
