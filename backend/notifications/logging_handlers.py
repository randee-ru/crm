from __future__ import annotations

import logging
from html import escape

from notifications.telegram import send_telegram_notification


class TelegramErrorHandler(logging.Handler):
    """Логирующий хендлер, пересылающий ERROR+ записи в Telegram-бот."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            message = self.format(record)
        except Exception:
            message = record.getMessage()
        if len(message) > 3500:
            message = f"{message[:3500]}..."
        send_telegram_notification(f"⚠️ Ошибка на сервере\n\n<pre>{escape(message)}</pre>")
