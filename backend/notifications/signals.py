from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from crm.models import Deal, Task
from messaging.models import ChatMessage
from notifications.emitters import (
    notify_call_logged,
    notify_chat_message,
    notify_deal_stage_changed,
    notify_task_created,
)
from telephony.models import CallLog


@receiver(post_save, sender=CallLog)
def emit_call_notification(sender, instance: CallLog, created: bool, **kwargs) -> None:
    if not created:
        return
    notify_call_logged(instance)


@receiver(post_save, sender=ChatMessage)
def emit_chat_notification(sender, instance: ChatMessage, created: bool, **kwargs) -> None:
    if not created:
        return
    notify_chat_message(instance)


@receiver(post_save, sender=Task)
def emit_task_notification(sender, instance: Task, created: bool, **kwargs) -> None:
    if not created:
        return
    notify_task_created(instance)


@receiver(post_save, sender=Deal)
def emit_deal_stage_notification(sender, instance: Deal, created: bool, **kwargs) -> None:
    if created:
        return
    previous_stage = getattr(instance, "_previous_stage_name", None)
    if not previous_stage or not instance.stage_id:
        return
    current_name = instance.stage.name
    if previous_stage == current_name:
        return
    notify_deal_stage_changed(
        instance,
        from_stage_name=previous_stage,
        to_stage_name=current_name,
    )
