from __future__ import annotations

import json
import os
import urllib.error
import urllib.request


WHISPER_PROMPT = (
    "Телефонный разговор фитнес-клуба. Расставь знаки препинания, "
    "разделяй реплики. Не выдумывай текст."
)


def _format_openai_error(detail: str, *, context: str) -> str:
    try:
        payload = json.loads(detail)
        error = payload.get("error") if isinstance(payload, dict) else None
        if isinstance(error, dict):
            code = str(error.get("code") or error.get("type") or "")
            if code == "billing_not_active":
                return (
                    "OpenAI: биллинг не активен. Добавьте способ оплаты и баланс на "
                    "https://platform.openai.com/settings/organization/billing , затем перезапустите backend."
                )
            message = str(error.get("message") or "").strip()
            if message:
                return f"OpenAI {context}: {message}"
    except json.JSONDecodeError:
        pass
    return f"OpenAI {context}: {detail}"


def transcribe_audio(buffer: bytes, filename: str = "recording.mp3", content_type: str = "audio/mpeg") -> str:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY не настроен")

    model = (os.getenv("OPENAI_TRANSCRIPTION_MODEL") or "whisper-1").strip()

    boundary = "----crmkitboundary7MA4YWxkTrZu0gW"
    body_parts: list[bytes] = []

    def add_field(name: str, value: str) -> None:
        body_parts.append(f"--{boundary}\r\n".encode())
        body_parts.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body_parts.append(f"{value}\r\n".encode())

    add_field("model", model)
    add_field("language", "ru")
    add_field("prompt", WHISPER_PROMPT)

    body_parts.append(f"--{boundary}\r\n".encode())
    body_parts.append(
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode()
    )
    body_parts.append(f"Content-Type: {content_type}\r\n\r\n".encode())
    body_parts.append(buffer)
    body_parts.append(b"\r\n")
    body_parts.append(f"--{boundary}--\r\n".encode())
    body = b"".join(body_parts)

    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/transcriptions",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(_format_openai_error(detail, context="transcription error")) from exc

    text = (payload.get("text") or "").strip()
    if not text:
        raise RuntimeError("OpenAI не вернул текст транскрипции")
    return text


def generate_call_report(transcript: str) -> str:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY не настроен")

    system = (
        "Ты коуч по продажам фитнес-клуба. Проанализируй транскрипт звонка на русском. "
        "Дай оценку 0-10, этап воронки, сильные стороны, ошибки, рекомендации и краткий вердикт."
    )
    model = (os.getenv("OPENAI_REPORT_MODEL") or "gpt-4o-mini").strip()
    payload = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": transcript},
            ],
            "temperature": 0.3,
            "max_tokens": 2000,
        }
    ).encode()
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(_format_openai_error(detail, context="report error")) from exc

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    if not content:
        raise RuntimeError("OpenAI не вернул отчёт по звонку")
    return content
