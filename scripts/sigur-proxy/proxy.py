#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 CRM Kit — локальный прокси Sigur (ставится НА СЕРВЕР КЛУБА, рядом с 1С и Sigur)
================================================================================

 ЗАЧЕМ ЭТА ПРОГРАММА
 -------------------
 У вас два мира:
   • Сервер клуба  — Sigur + 1С (турникет, абонементы, учёт)
   • Облако        — CRM Kit (клиенты, посещаемость, отчёты)

 Sigur умеет слать запросы только на ОДИН адрес. Эта программа стоит ПОСЕРЕДИНЕ:

   БЫЛО (сейчас у вас):
     Sigur ──────────────────► 1С (127.0.0.1:85)

   СТАНЕТ:
     Sigur ──► ЭТА ПРОГРАММА (:9000) ──► 1С (как раньше)
                              │
                              └──► Облако CRM (копия проходов, HTTPS)

 ОБЛАКО НЕ УЧАСТВУЕТ В РЕШЕНИИ «ПУСТИТЬ / НЕ ПУСТИТЬ».
 Турникет по-прежнему решает 1С. Облако только ПОЛУЧАЕТ КОПИЮ факта прохода.

--------------------------------------------------------------------------------
 СХЕМА 1 — клиент прикладывает карту (getaccess)
--------------------------------------------------------------------------------

   Клиент → Sigur → [прокси] → 1С «можно пустить?»
                      ↑           │
                      └───────────┘ ответ 1С (allow: true/false)
                      │
                      └── ответ уходит обратно в Sigur → турникет

   Облако на этом шаге НЕ вызывается (интернет не нужен для турникета).

--------------------------------------------------------------------------------
 СХЕМА 2 — клиент прошёл через турникет (events)
--------------------------------------------------------------------------------

   Sigur → [прокси] → 1С (записать проход в базу 1С)
              │
              └── если 1С ответила OK → копия того же JSON в облако CRM
                                          │
                                          └── CRM находит клиента по номеру
                                              карты и пишет «Посещаемость»

--------------------------------------------------------------------------------
 ЧТО НАСТРОИТЬ
--------------------------------------------------------------------------------

 1) В Sigur (WEB-делегирование) вместо 1С указать прокси:
      URL делегирования:  http://127.0.0.1:9000/sigur/getaccess
      URL проходов:       http://127.0.0.1:9000/sigur/events

 2) Скопировать config.example.env → .env и заполнить (1С локально + URL облака).

 3) Запустить: python proxy.py   (или run-windows.bat на Windows)

 4) В облачном CRM: Настройки → Интеграции → Sigur → скопировать proxy_inbound_key
    в .env как CRM_SIGUR_PROXY_KEY

 Зависимости: только Python 3.10+ (стандартная библиотека).
================================================================================
"""

from __future__ import annotations

import base64
import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# -----------------------------------------------------------------------------
# Загрузка .env из папки со скриптом (удобно на Windows-сервере клуба)
# -----------------------------------------------------------------------------

def load_env_file() -> None:
    """Читает файл .env рядом с proxy.py и подставляет переменные в os.environ."""
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [sigur-proxy] %(levelname)s %(message)s",
)
logger = logging.getLogger("sigur-proxy")

# -----------------------------------------------------------------------------
# Настройки (из .env или переменных окружения)
# -----------------------------------------------------------------------------

# На каком адресе слушает прокси. 127.0.0.1 = только локально на сервере клуба.
LISTEN_HOST = os.environ.get("SIGUR_PROXY_HOST", "127.0.0.1")
LISTEN_PORT = int(os.environ.get("SIGUR_PROXY_PORT", "9000"))

# Куда пересылать запросы в 1С (на том же сервере — localhost, быстро).
ONEC_GETACCESS_URL = os.environ.get(
    "ONEC_SIGUR_GETACCESS_URL",
    "http://127.0.0.1:85/Fitness_PROF/hs/sigur/getaccess",
)
ONEC_EVENTS_URL = os.environ.get(
    "ONEC_SIGUR_EVENTS_URL",
    "http://127.0.0.1:85/Fitness_PROF/hs/sigur/events",
)
ONEC_BASIC_USER = os.environ.get("ONEC_SIGUR_BASIC_USER", "sigur")
ONEC_BASIC_PASSWORD = os.environ.get("ONEC_SIGUR_BASIC_PASSWORD", "sigur")

# Куда слать КОПИЮ проходов в облако CRM Kit (интернет).
# Пример: https://app.crmkit.ru/api/v1/integrations/sigur/inbound/events/?company=sportmax
CLOUD_EVENTS_URL = os.environ.get("CRM_SIGUR_EVENTS_URL", "").strip()
# Секретный ключ из настроек интеграции Sigur в облачном CRM (config.proxy_inbound_key).
CLOUD_PROXY_KEY = os.environ.get("CRM_SIGUR_PROXY_KEY", "").strip()
# Таймаут на отправку в облако — не блокируем Sigur надолго.
CLOUD_FORWARD_TIMEOUT = float(os.environ.get("CRM_SIGUR_FORWARD_TIMEOUT", "5"))


def _basic_auth_header(user: str, password: str) -> str:
    """Заголовок Authorization для 1С (тот же логин/пароль, что в настройках Sigur)."""
    token = base64.b64encode(f"{user}:{password}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def forward_post(
    url: str,
    body: bytes,
    *,
    basic_user: str | None = None,
    basic_password: str | None = None,
    extra_headers: dict[str, str] | None = None,
    timeout: float = 10.0,
) -> tuple[int, bytes, dict[str, str]]:
    """
    Универсальная отправка POST с JSON-телом.

    Используется и для 1С (с Basic Auth), и для облака CRM (с X-Sigur-Proxy-Key).
    """
    request = Request(url, data=body, method="POST")
    request.add_header("Content-Type", "application/json; charset=utf-8")
    if basic_user is not None:
        request.add_header("Authorization", _basic_auth_header(basic_user, basic_password or ""))
    for key, value in (extra_headers or {}).items():
        request.add_header(key, value)

    try:
        with urlopen(request, timeout=timeout) as response:
            headers = {key: value for key, value in response.headers.items()}
            return response.status, response.read(), headers
    except HTTPError as error:
        # 1С может вернуть 500 с телом — это всё равно «ответ», его нужно вернуть Sigur.
        headers = {key: value for key, value in error.headers.items()}
        return error.code, error.read(), headers
    except URLError as error:
        raise RuntimeError(f"Не удалось связаться с {url}: {error}") from error


def forward_events_to_cloud(body: bytes) -> None:
    """
    Шаг «облако видит проход»:
      После успешной записи в 1С отправляем ТОТ ЖЕ JSON в CRM Kit.

    CRM по полю keyHex ищет клиента (card_number) и создаёт запись посещаемости.
    Если интернет упал — только пишем в лог; турникет и 1С уже отработали.
    """
    if not CLOUD_EVENTS_URL:
        logger.debug("CRM_SIGUR_EVENTS_URL не задан — облако не уведомляем")
        return

    headers = {"X-Sigur-Proxy-Key": CLOUD_PROXY_KEY} if CLOUD_PROXY_KEY else {}
    try:
        status, response_body, _ = forward_post(
            CLOUD_EVENTS_URL,
            body,
            extra_headers=headers,
            timeout=CLOUD_FORWARD_TIMEOUT,
        )
        if status >= 300:
            logger.warning("Облако CRM: ошибка HTTP %s — %s", status, response_body[:300])
        else:
            logger.info("Облако CRM: проход принят — %s", response_body[:200])
    except Exception as error:  # noqa: BLE001
        logger.warning("Облако CRM: не удалось отправить (1С уже записала): %s", error)


class SigurProxyHandler(BaseHTTPRequestHandler):
    """
    HTTP-сервер, который подменяет 1С для Sigur.

    Sigur шлёт сюда POST; мы пересылаем в 1С и возвращаем ответ Sigur.
    """

    server_version = "CRMKitSigurProxy/1.0"

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        logger.info("%s - %s", self.address_string(), format % args)

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return b""
        return self.rfile.read(length)

    def _send(self, status: int, body: bytes, content_type: str = "application/json; charset=utf-8") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        """Проверка, что программа запущена: откройте http://127.0.0.1:9000/health"""
        if self.path in ("/", "/health"):
            payload = json.dumps({"status": "ok", "service": "crmkit-sigur-proxy"}).encode("utf-8")
            self._send(200, payload)
            return
        self._send(404, b'{"detail":"Not found"}')

    def do_POST(self) -> None:  # noqa: N802
        body = self._read_body()
        path = self.path.split("?", 1)[0]

        if path.endswith("/sigur/getaccess"):
            self._handle_getaccess(body)
            return

        if path.endswith("/sigur/events"):
            self._handle_events(body)
            return

        self._send(404, b'{"detail":"Not found"}')

    def _handle_getaccess(self, body: bytes) -> None:
        """
        «Можно пустить клиента?»

        1. Sigur прислал JSON: keyHex, accessPoint, direction
        2. Мы пересылаем в 1С без изменений
        3. 1С отвечает: {"allow": true/false, "message": "..."}
        4. Этот ответ возвращаем Sigur → турникет открывается или нет

        Облако здесь НЕ участвует.
        """
        try:
            status, response_body, _ = forward_post(
                ONEC_GETACCESS_URL,
                body,
                basic_user=ONEC_BASIC_USER,
                basic_password=ONEC_BASIC_PASSWORD,
            )
            self._send(status, response_body)
        except Exception as error:  # noqa: BLE001
            logger.exception("getaccess: ошибка связи с 1С")
            payload = json.dumps({"allow": False, "message": str(error)}).encode("utf-8")
            self._send(502, payload)

    def _handle_events(self, body: bytes) -> None:
        """
        «Клиент прошёл через турникет».

        1. Sigur прислал JSON: {"logs": [{logId, keyHex, accessPoint, direction}, ...]}
        2. Сначала пересылаем в 1С (главная система учёта)
        3. Если 1С ответила OK — шлём копию в облако CRM
        4. Ответ 1С возвращаем Sigur (обычно {"confirmedLogId": ...})

        Так облако «видит» те же проходы, что и 1С.
        """
        try:
            # --- Шаг A: записать в 1С (обязательно) ---
            status, response_body, _ = forward_post(
                ONEC_EVENTS_URL,
                body,
                basic_user=ONEC_BASIC_USER,
                basic_password=ONEC_BASIC_PASSWORD,
            )

            # --- Шаг B: копия в облако (желательно, не блокирует турникет) ---
            if status < 300:
                forward_events_to_cloud(body)

            # --- Шаг C: ответ Sigur — всегда от 1С ---
            self._send(status, response_body)
        except Exception as error:  # noqa: BLE001
            logger.exception("events: ошибка связи с 1С")
            payload = json.dumps({"detail": str(error)}).encode("utf-8")
            self._send(502, payload)


def main() -> int:
    if not ONEC_GETACCESS_URL or not ONEC_EVENTS_URL:
        logger.error("Укажите ONEC_SIGUR_GETACCESS_URL и ONEC_SIGUR_EVENTS_URL в .env")
        return 1

    server = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), SigurProxyHandler)
    logger.info("Прокси запущен: http://%s:%s", LISTEN_HOST, LISTEN_PORT)
    logger.info("→ 1С getaccess: %s", ONEC_GETACCESS_URL)
    logger.info("→ 1С events:    %s", ONEC_EVENTS_URL)
    if CLOUD_EVENTS_URL:
        logger.info("→ Облако CRM:   %s", CLOUD_EVENTS_URL)
    else:
        logger.warning("CRM_SIGUR_EVENTS_URL не задан — облако проходы НЕ получит")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Остановлено")
    return 0


if __name__ == "__main__":
    sys.exit(main())
