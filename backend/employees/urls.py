from __future__ import annotations

from django.urls import path

from employees.views import (
    TrainerAccessCardDetailView,
    TrainerAccessCardListCreateView,
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
    path(
        "trainers/<int:trainer_id>/access-cards/",
        TrainerAccessCardListCreateView.as_view(),
        name="trainer-access-card-list",
    ),
    path(
        "trainers/<int:trainer_id>/access-cards/<int:card_id>/",
        TrainerAccessCardDetailView.as_view(),
        name="trainer-access-card-detail",
    ),
]
