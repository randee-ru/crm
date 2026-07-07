#!/usr/bin/env python3
"""
Локальный прокси Sigur → 1С + облачный CRM Kit.

Ставится на сервер клуба (рядом с Sigur и 1С).
Sigur настраивается на http://127.0.0.1:9000/sigur/getaccess и .../events

Зависимости: только стандартная библиотека Python 3.10+.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [sigur-proxy] %(levelname)s %(message)s",
)
logger = logging.getLogger("sigur-proxy")

LISTEN_HOST = os.environ.get("SIGUR_PROXY_HOST", "127.0.0.1")
LISTEN_PORT = int(os.environ.get("SIGUR_PROXY_PORT", "9000"))

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

CLOUD_EVENTS_URL = os.environ.get("CRM_SIGUR_EVENTS_URL", "").strip()
CLOUD_PROXY_KEY = os.environ.get("CRM_SIGUR_PROXY_KEY", "").strip()
CLOUD_FORWARD_TIMEOUT = float(os.environ.get("CRM_SIGUR_FORWARD_TIMEOUT", "5"))


def _basic_auth_header(user: str, password: str) -> str:
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
        headers = {key: value for key, value in error.headers.items()}
        return error.code, error.read(), headers
    except URLError as error:
        raise RuntimeError(f"Не удалось связаться с {url}: {error}") from error


def forward_events_to_cloud(body: bytes) -> None:
    if not CLOUD_EVENTS_URL:
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
            logger.warning("CRM cloud forward failed: HTTP %s %s", status, response_body[:300])
        else:
            logger.info("CRM cloud forward OK: %s", response_body[:200])
    except Exception as error:  # noqa: BLE001
        logger.warning("CRM cloud forward error: %s", error)


class SigurProxyHandler(BaseHTTPRequestHandler):
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
        try:
            status, response_body, _ = forward_post(
                ONEC_GETACCESS_URL,
                body,
                basic_user=ONEC_BASIC_USER,
                basic_password=ONEC_BASIC_PASSWORD,
            )
            self._send(status, response_body)
        except Exception as error:  # noqa: BLE001
            logger.exception("getaccess proxy error")
            payload = json.dumps({"allow": False, "message": str(error)}).encode("utf-8")
            self._send(502, payload)

    def _handle_events(self, body: bytes) -> None:
        try:
            status, response_body, _ = forward_post(
                ONEC_EVENTS_URL,
                body,
                basic_user=ONEC_BASIC_USER,
                basic_password=ONEC_BASIC_PASSWORD,
            )
            if status < 300:
                forward_events_to_cloud(body)
            self._send(status, response_body)
        except Exception as error:  # noqa: BLE001
            logger.exception("events proxy error")
            payload = json.dumps({"detail": str(error)}).encode("utf-8")
            self._send(502, payload)


def main() -> int:
    if not ONEC_GETACCESS_URL or not ONEC_EVENTS_URL:
        logger.error("Укажите ONEC_SIGUR_GETACCESS_URL и ONEC_SIGUR_EVENTS_URL")
        return 1

    server = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), SigurProxyHandler)
    logger.info("Listening on http://%s:%s", LISTEN_HOST, LISTEN_PORT)
    logger.info("1C getaccess: %s", ONEC_GETACCESS_URL)
    logger.info("1C events: %s", ONEC_EVENTS_URL)
    if CLOUD_EVENTS_URL:
        logger.info("CRM cloud events: %s", CLOUD_EVENTS_URL)
    else:
        logger.warning("CRM_SIGUR_EVENTS_URL не задан — копия проходов в облако отключена")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Stopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
