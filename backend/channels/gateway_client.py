from __future__ import annotations

import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class GatewayClientError(Exception):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class MessengerGatewayClient:
    def __init__(self) -> None:
        self.base_url = settings.MESSENGER_GATEWAY_URL.rstrip("/")
        self.secret = settings.MESSENGER_GATEWAY_SECRET

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        url = f"{self.base_url}{path}"
        try:
            response = requests.request(
                method,
                url,
                headers=self._headers(),
                timeout=kwargs.pop("timeout", 30),
                **kwargs,
            )
        except requests.RequestException as exc:
            raise GatewayClientError(f"Шлюз недоступен: {exc}") from exc

        if response.status_code == 204:
            return None

        try:
            payload = response.json() if response.content else {}
        except ValueError:
            payload = {"detail": response.text}

        if response.status_code >= 400:
            detail = payload.get("detail") if isinstance(payload, dict) else str(payload)
            raise GatewayClientError(str(detail or "Ошибка шлюза"), status_code=response.status_code)
        return payload

    def list_sessions(self, company_slug: str) -> list[dict[str, Any]]:
        data = self._request("GET", f"/sessions?company_slug={company_slug}")
        return data.get("sessions", []) if isinstance(data, dict) else []

    def get_session(self, session_id: str) -> dict[str, Any]:
        return self._request("GET", f"/sessions/{session_id}")

    def create_session(
        self,
        *,
        company_slug: str,
        provider: str,
        label: str = "",
        phone: str = "",
        api_id: int | None = None,
        api_hash: str = "",
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "company_slug": company_slug,
            "provider": provider,
            "label": label,
            "phone": phone,
        }
        if api_id:
            body["api_id"] = api_id
        if api_hash:
            body["api_hash"] = api_hash
        return self._request("POST", "/sessions", json=body)

    def submit_telegram_code(self, session_id: str, code: str) -> dict[str, Any]:
        return self._request("POST", f"/sessions/{session_id}/telegram-code", json={"code": code})

    def submit_telegram_password(self, session_id: str, password: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/sessions/{session_id}/telegram-password",
            json={"password": password},
        )

    def submit_max_code(self, session_id: str, code: str) -> dict[str, Any]:
        return self._request("POST", f"/sessions/{session_id}/max-code", json={"code": code})

    def submit_max_password(self, session_id: str, password: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/sessions/{session_id}/max-password",
            json={"password": password},
        )

    def send_message(
        self,
        *,
        session_id: str,
        chat_id: str,
        text: str,
        contact_phone: str = "",
        contact_name: str = "",
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/sessions/{session_id}/send",
            json={
                "chat_id": chat_id,
                "text": text,
                "contact_phone": contact_phone,
                "contact_name": contact_name,
            },
        )

    def delete_session(self, session_id: str) -> None:
        self._request("DELETE", f"/sessions/{session_id}")


def get_gateway_client() -> MessengerGatewayClient:
    return MessengerGatewayClient()
