from __future__ import annotations

from django.urls import path

from bookings.views import BookingDetailView, BookingListCreateView

urlpatterns = [
    path("bookings/", BookingListCreateView.as_view(), name="booking-list"),
    path("bookings/<int:booking_id>/", BookingDetailView.as_view(), name="booking-detail"),
]
