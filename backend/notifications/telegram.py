from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_telegram_notification(text: str) -> None:
    """Отправляет текстовое уведомление в Telegram-бот владельца системы.

    Молча ничего не делает, если бот не настроен, и никогда не поднимает
    исключение выше — сбой отправки не должен ломать основной поток (запись
    клиента, сохранение сообщения и т.д.).
    """

    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_NOTIFY_CHAT_ID
    if not token or not chat_id:
        return

    try:
        requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            timeout=5,
        )
    except requests.RequestException:
        logger.exception("Не удалось отправить уведомление в Telegram")
