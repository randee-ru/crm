from __future__ import annotations

from django.db import models


class TimeStampedModel(models.Model):
    """Reusable base model with creation and update timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

