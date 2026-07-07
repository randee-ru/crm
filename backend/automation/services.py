from __future__ import annotations

import logging
import queue
import threading
import time
from typing import Any

from django.db import close_old_connections, transaction
from django.utils import timezone

from automation.models import AutomationEvent, AutomationRule
from companies.models import Company
from notifications.services import create_notification

logger = logging.getLogger(__name__)

_queue: queue.Queue[int] = queue.Queue()
_worker_lock = threading.Lock()
_worker_started = False
_queued_ids: set[int] = set()
_queued_ids_lock = threading.Lock()


def record_event(
    *,
    company: Company,
    event_type: str,
    payload: dict[str, Any] | None = None,
    actor=None,
    source_app: str = "",
    source_model: str = "",
    source_object_id: str = "",
) -> AutomationEvent:
    event = AutomationEvent.objects.create(
        company=company,
        event_type=event_type,
        payload=payload or {},
        actor=actor,
        source_app=source_app,
        source_model=source_model,
        source_object_id=source_object_id,
    )
    transaction.on_commit(lambda: enqueue_event(event.pk))
    return event


def enqueue_event(event_id: int) -> None:
    _ensure_worker()
    with _queued_ids_lock:
        if event_id in _queued_ids:
            return
        _queued_ids.add(event_id)
        _queue.put(event_id)


def _ensure_worker() -> None:
    global _worker_started
    with _worker_lock:
        if _worker_started:
            return
        thread = threading.Thread(target=_worker_loop, name="automation-worker", daemon=True)
        thread.start()
        _worker_started = True


def _matches_conditions(payload: dict[str, Any], conditions: dict[str, Any]) -> bool:
    if not conditions:
        return True

    for key, expected in conditions.items():
        actual = payload.get(key)
        if isinstance(expected, list):
            if actual not in expected:
                return False
            continue
        if isinstance(expected, dict):
            if not isinstance(actual, dict):
                return False
            for nested_key, nested_expected in expected.items():
                if actual.get(nested_key) != nested_expected:
                    return False
            continue
        if actual != expected:
            return False
    return True


def _resolve_action_value(action: dict[str, Any], event: AutomationEvent, key: str, default: str = "") -> str:
    value = action.get(key, default)
    if not isinstance(value, str):
        return default
    if value.startswith("payload."):
        payload_key = value.removeprefix("payload.")
        return str(event.payload.get(payload_key, default) or default)
    return value


def _create_task_action(event: AutomationEvent, action: dict[str, Any]) -> None:
    from crm.models import Task

    title = _resolve_action_value(action, event, "title", default=event.event_type)
    description = _resolve_action_value(action, event, "description")
    client_id = action.get("client_id")
    branch_id = action.get("branch_id")
    assigned_to_id = action.get("assigned_to_id")
    task = Task.objects.create(
        company=event.company,
        title=title,
        description=description,
        status=Task.Status.OPEN,
        priority=action.get("priority", Task.Priority.NORMAL),
        due_at=timezone.now() if action.get("due_now") else None,
        client_id=client_id if isinstance(client_id, int) else None,
        branch_id=branch_id if isinstance(branch_id, int) else None,
        assigned_to_id=assigned_to_id if isinstance(assigned_to_id, int) else None,
    )


def _create_notification_action(event: AutomationEvent, action: dict[str, Any]) -> None:
    create_notification(
        company=event.company,
        recipient=event.actor if action.get("recipient") == "actor" else None,
        kind=action.get("kind", "info"),
        title=_resolve_action_value(action, event, "title", default=event.event_type),
        body=_resolve_action_value(action, event, "body"),
        target_url=_resolve_action_value(action, event, "target_url"),
        source_app=event.source_app or "automation",
        source_model=event.source_model,
        source_object_id=event.source_object_id,
        payload={"event_type": event.event_type, **event.payload},
    )


def _execute_action(event: AutomationEvent, action: dict[str, Any]) -> None:
    kind = action.get("kind")
    if kind == "notification":
        _create_notification_action(event, action)
    elif kind == "task":
        _create_task_action(event, action)
    elif kind == "log":
        logger.info("Automation log action executed: %s", action)


def process_event(event_id: int) -> None:
    event = AutomationEvent.objects.select_related("company", "actor").filter(pk=event_id).first()
    if event is None:
        return

    if event.status != AutomationEvent.Status.PENDING:
        return

    event.status = AutomationEvent.Status.PROCESSING
    event.save(update_fields=["status", "updated_at"])

    try:
        rules = AutomationRule.objects.filter(
            company=event.company,
            event_type=event.event_type,
            is_active=True,
        ).order_by("sort_order", "id")

        for rule in rules:
            if not _matches_conditions(event.payload, rule.conditions if isinstance(rule.conditions, dict) else {}):
                continue
            for action in rule.actions if isinstance(rule.actions, list) else []:
                if isinstance(action, dict):
                    _execute_action(event, action)
            rule.last_run_at = timezone.now()
            rule.last_error = ""
            rule.save(update_fields=["last_run_at", "last_error", "updated_at"])

        event.status = AutomationEvent.Status.DONE
        event.processed_at = timezone.now()
        event.error = ""
        event.save(update_fields=["status", "processed_at", "error", "updated_at"])
    except Exception as exc:  # pragma: no cover - safety net for worker
        logger.exception("Automation event failed: %s", event_id)
        event.status = AutomationEvent.Status.FAILED
        event.error = str(exc)
        event.save(update_fields=["status", "error", "updated_at"])
        raise


def _worker_loop() -> None:
    while True:
        event_id = _queue.get()
        try:
            close_old_connections()
            process_event(event_id)
        except Exception:
            logger.exception("Не удалось обработать событие автоматизации %s", event_id)
        finally:
            with _queued_ids_lock:
                _queued_ids.discard(event_id)
            close_old_connections()
            _queue.task_done()
            time.sleep(0.1)
