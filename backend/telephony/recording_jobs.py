from __future__ import annotations

import logging
import queue
import threading
import time

from django.conf import settings
from django.db import close_old_connections

from telephony.models import CallLog
from telephony.recording_storage import archive_call_recording

logger = logging.getLogger(__name__)

_queue: queue.Queue[int] = queue.Queue()
_worker_lock = threading.Lock()
_worker_started = False
_queued_ids: set[int] = set()
_queued_ids_lock = threading.Lock()


def auto_archive_enabled() -> bool:
    return bool(getattr(settings, "TELEPHONY_AUTO_ARCHIVE_RECORDINGS", True))


def enqueue_call_recording_archives(call_ids: list[int] | int) -> None:
    if not auto_archive_enabled():
        return

    ids = [call_ids] if isinstance(call_ids, int) else list(call_ids)
    if not ids:
        return

    _ensure_worker()
    with _queued_ids_lock:
        for call_id in ids:
            if call_id in _queued_ids:
                continue
            _queued_ids.add(call_id)
            _queue.put(call_id)


def _ensure_worker() -> None:
    global _worker_started
    with _worker_lock:
        if _worker_started:
            return
        thread = threading.Thread(
            target=_worker_loop,
            name="telephony-recording-archiver",
            daemon=True,
        )
        thread.start()
        _worker_started = True


def _worker_loop() -> None:
    while True:
        call_id = _queue.get()
        try:
            close_old_connections()
            call = CallLog.objects.select_related("company").filter(pk=call_id).first()
            if call and call.recording_id and not call.recording_file:
                archive_call_recording(call)
        except Exception:
            logger.exception("Не удалось сохранить запись звонка %s", call_id)
        finally:
            with _queued_ids_lock:
                _queued_ids.discard(call_id)
            close_old_connections()
            _queue.task_done()
            time.sleep(float(getattr(settings, "TELEPHONY_RECORDING_ARCHIVE_DELAY_SECONDS", 0.3)))
