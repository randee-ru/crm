from __future__ import annotations

import logging
from html import escape

from notifications.telegram import send_telegram_notification


class TelegramErrorHandler(logging.Handler):
    """Логирующий хендлер, пересылающий ERROR+ записи в Telegram-бот."""

    _IGNORED_MESSAGE_MARKERS = (
        "Invalid HTTP_HOST header",
        "DisallowedHost",
        "Для этого номера пароль ещё не создан",
        "Клиент с таким номером не найден",
        "Доступ в клуб ограничен",
        "Запись на групповые занятия недоступна",
        "Подтверждение звонком временно недоступно",
        "Подтверждение устарело",
        "Проверка не найдена",
        "Неверный ответ на проверку",
        "Слишком много запросов",
        "Код уже отправлен",
    )

    def emit(self, record: logging.LogRecord) -> None:
        try:
            message = self.format(record)
        except Exception:
            message = record.getMessage()

        # Сканеры с чужим Host не должны спамить Telegram.
        if any(marker in message for marker in self._IGNORED_MESSAGE_MARKERS):
            return
        if record.name == "django.security.DisallowedHost":
            return
        if record.exc_info:
            exc_type = record.exc_info[0]
            if exc_type and exc_type.__name__ == "ValueError" and any(
                marker in message for marker in self._IGNORED_MESSAGE_MARKERS
            ):
                return

        if len(message) > 3500:
            message = f"{message[:3500]}..."
        send_telegram_notification(f"⚠️ Ошибка на сервере\n\n<pre>{escape(message)}</pre>")
