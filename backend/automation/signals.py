from __future__ import annotations

from django.db.models.signals import post_save
from django.db.models.signals import pre_save
from django.dispatch import receiver

from automation.services import record_event
from attendance.models import AttendanceRecord
from bookings.models import Booking
from crm.models import Deal, Task
from payments.models import Payment
from sales.models import Sale


def _remember_previous_status(instance, attr_name: str, model_cls) -> None:
    if not instance.pk:
        setattr(instance, attr_name, None)
        return
    previous = model_cls.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
    setattr(instance, attr_name, previous)


@receiver(pre_save, sender=Booking)
def remember_booking_status(sender, instance: Booking, **kwargs) -> None:
    _remember_previous_status(instance, "_previous_status", Booking)


@receiver(pre_save, sender=Sale)
def remember_sale_status(sender, instance: Sale, **kwargs) -> None:
    _remember_previous_status(instance, "_previous_status", Sale)


@receiver(pre_save, sender=Payment)
def remember_payment_status(sender, instance: Payment, **kwargs) -> None:
    _remember_previous_status(instance, "_previous_status", Payment)


@receiver(post_save, sender=Deal)
def on_deal_saved(sender, instance: Deal, created: bool, **kwargs) -> None:
    if created:
        record_event(
            company=instance.company,
            event_type="deal.created",
            payload={
                "deal_id": instance.pk,
                "title": instance.title,
                "amount": str(instance.amount),
                "stage_id": instance.stage_id,
                "pipeline_id": instance.pipeline_id,
            },
            source_app="crm",
            source_model="Deal",
            source_object_id=str(instance.pk),
        )


@receiver(post_save, sender=Task)
def on_task_saved(sender, instance: Task, created: bool, **kwargs) -> None:
    if created:
        record_event(
            company=instance.company,
            event_type="task.created",
            payload={"task_id": instance.pk, "title": instance.title, "priority": instance.priority},
            actor=instance.created_by,
            source_app="crm",
            source_model="Task",
            source_object_id=str(instance.pk),
        )


@receiver(post_save, sender=Booking)
def on_booking_saved(sender, instance: Booking, created: bool, **kwargs) -> None:
    previous_status = getattr(instance, "_previous_status", None)
    if created:
        event_type = "booking.created"
    elif previous_status != instance.status and instance.status in {
        Booking.Status.CONFIRMED,
        Booking.Status.COMPLETED,
    }:
        event_type = "booking.confirmed" if instance.status == Booking.Status.CONFIRMED else "booking.completed"
    else:
        return

    if event_type:
        record_event(
            company=instance.company,
            event_type=event_type,
            payload={
                "booking_id": instance.pk,
                "title": instance.title,
                "status": instance.status,
                "trainer_id": instance.trainer_id,
                "client_id": instance.client_id,
            },
            source_app="bookings",
            source_model="Booking",
            source_object_id=str(instance.pk),
        )


@receiver(post_save, sender=AttendanceRecord)
def on_attendance_saved(sender, instance: AttendanceRecord, created: bool, **kwargs) -> None:
    if created:
        record_event(
            company=instance.company,
            event_type="attendance.created",
            payload={
                "attendance_id": instance.pk,
                "status": instance.status,
                "client_id": instance.client_id,
                "trainer_id": instance.trainer_id,
            },
            source_app="attendance",
            source_model="AttendanceRecord",
            source_object_id=str(instance.pk),
        )


@receiver(post_save, sender=Sale)
def on_sale_saved(sender, instance: Sale, created: bool, **kwargs) -> None:
    previous_status = getattr(instance, "_previous_status", None)
    if created:
        event_type = "sale.created"
    elif previous_status != instance.status and instance.status == Sale.Status.COMPLETED:
        event_type = "sale.completed"
    else:
        return

    if event_type:
        record_event(
            company=instance.company,
            event_type=event_type,
            payload={
                "sale_id": instance.pk,
                "title": instance.title,
                "status": instance.status,
                "paid_amount": str(instance.paid_amount),
                "total_amount": str(instance.total_amount),
            },
            source_app="sales",
            source_model="Sale",
            source_object_id=str(instance.pk),
        )


@receiver(post_save, sender=Payment)
def on_payment_saved(sender, instance: Payment, created: bool, **kwargs) -> None:
    previous_status = getattr(instance, "_previous_status", None)
    if created:
        event_type = "payment.created"
    elif previous_status != instance.status and instance.status in {
        Payment.Status.SUCCEEDED,
        Payment.Status.REFUNDED,
    }:
        event_type = "payment.succeeded" if instance.status == Payment.Status.SUCCEEDED else "payment.refunded"
    else:
        return

    if event_type:
        record_event(
            company=instance.company,
            event_type=event_type,
            payload={
                "payment_id": instance.pk,
                "amount": str(instance.amount),
                "status": instance.status,
                "method": instance.method,
            },
            source_app="payments",
            source_model="Payment",
            source_object_id=str(instance.pk),
        )
