from __future__ import annotations

from django.apps import AppConfig


class BookingsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bookings"
    verbose_name = "Бронирования"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import BookingAdmin
        from .models import Booking

        register_business_admin(Booking, BookingAdmin)
