from __future__ import annotations

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from telephony.models import CallLog
from telephony.recording_jobs import enqueue_call_recording_archives


@receiver(pre_save, sender=CallLog)
def remember_previous_recording_state(sender, instance: CallLog, **kwargs) -> None:
    if not instance.pk:
        instance._had_recording_id = False
        return
    previous = CallLog.objects.filter(pk=instance.pk).values_list("recording_id", flat=True).first()
    instance._had_recording_id = bool(previous)


@receiver(post_save, sender=CallLog)
def schedule_call_recording_archive(sender, instance: CallLog, created: bool, **kwargs) -> None:
    if not instance.recording_id or instance.recording_file:
        return

    had_recording_id = getattr(instance, "_had_recording_id", not created)
    if not created and had_recording_id:
        return

    transaction.on_commit(lambda: enqueue_call_recording_archives(instance.pk))
