from __future__ import annotations

from django.db.models.signals import pre_save
from django.dispatch import receiver

from crm.models import Deal


@receiver(pre_save, sender=Deal)
def remember_deal_stage(sender, instance: Deal, **kwargs) -> None:
    if not instance.pk:
        instance._previous_stage_name = None
        return
    previous = Deal.objects.filter(pk=instance.pk).select_related("stage").first()
    instance._previous_stage_name = previous.stage.name if previous and previous.stage_id else None
