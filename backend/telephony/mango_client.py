from __future__ import annotations

import hashlib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timezone as dt_timezone
from typing import Any


_RECORDING_URL_CACHE: dict[str, tuple[str, float]] = {}
_RECORDING_URL_CACHE_TTL_SECONDS = 30 * 60


def get_cached_recording_url(recording_id: str) -> str:
    cached = _RECORDING_URL_CACHE.get(recording_id)
    if not cached:
        return ""
    url, expires_at = cached
    if time.time() >= expires_at:
        _RECORDING_URL_CACHE.pop(recording_id, None)
        return ""
    return url


def set_cached_recording_url(recording_id: str, url: str) -> None:
    normalized = (url or "").strip()
    if normalized:
        _RECORDING_URL_CACHE[recording_id] = (normalized, time.time() + _RECORDING_URL_CACHE_TTL_SECONDS)


@dataclass(frozen=True)
class MangoConfig:
    api_key: str
    api_salt: str
    api_url: str = "https://app.mango-office.ru/vpbx"


@dataclass(frozen=True)
class MangoCall:
    recording_id: str
    start: int
    finish: int
    from_number: str
    to_number: str
    line_number: str = ""
    entry_id: str = ""


def resolve_mango_config(integration) -> MangoConfig | None:
    import os

    api_key = (integration.api_key or integration.settings.get("api_key") or os.getenv("MANGO_OFFICE_API_KEY") or "").strip()
    api_salt = (
        integration.api_secret
        or integration.settings.get("api_secret")
        or os.getenv("MANGO_OFFICE_API_SALT")
        or ""
    ).strip()
    api_url = (
        integration.api_url
        or integration.settings.get("api_url")
        or os.getenv("MANGO_OFFICE_API_URL")
        or "https://app.mango-office.ru/vpbx"
    ).strip()
    if not api_key or not api_salt:
        return None
    return MangoConfig(api_key=api_key, api_salt=api_salt, api_url=api_url)


def generate_signature(api_key: str, api_salt: str, payload: str) -> str:
    return hashlib.sha256(f"{api_key}{payload}{api_salt}".encode()).hexdigest()


def call_mango_api(config: MangoConfig, endpoint: str, payload: dict[str, Any]) -> Any:
    payload_json = json.dumps(payload, separators=(",", ":"))
    sign = generate_signature(config.api_key, config.api_salt, payload_json)
    base_url = config.api_url.rstrip("/")
    endpoint_path = endpoint if endpoint.startswith("/") else f"/{endpoint}"
    body = urllib.parse.urlencode(
        {
            "vpbx_api_key": config.api_key,
            "sign": sign,
            "json": payload_json,
        }
    ).encode()

    request = urllib.request.Request(
        f"{base_url}{endpoint_path}",
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            content_type = response.headers.get("Content-Type", "")
            raw = response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Mango Office API error: {exc.code} {detail}") from exc

    if "application/json" in content_type:
        return json.loads(raw.decode("utf-8"))
    return raw.decode("utf-8")


def request_mango_stats(config: MangoConfig, date_from: date, date_to: date) -> str:
    payload = {
        "date_from": str(int(datetime.combine(date_from, datetime.min.time(), tzinfo=dt_timezone.utc).timestamp())),
        "date_to": str(int(datetime.combine(date_to, datetime.max.time(), tzinfo=dt_timezone.utc).timestamp())),
        "fields": (
            "records,start,finish,answer,from_extension,from_number,"
            "to_extension,to_number,disconnect_reason,line_number,location,entry_id"
        ),
    }
    result = call_mango_api(config, "/stats/request", payload)
    if isinstance(result, dict):
        if result.get("result") not in (None, 0):
            raise RuntimeError(f"Mango Office API error: {result.get('result')}")
        if isinstance(result.get("key"), str):
            return result["key"]
        data = result.get("data")
        if isinstance(data, dict) and isinstance(data.get("key"), str):
            return data["key"]
    raise RuntimeError("Не удалось получить ключ статистики Mango Office")


def get_mango_stats_result(config: MangoConfig, key: str) -> Any:
    result = call_mango_api(config, "/stats/result", {"key": key})
    if isinstance(result, str):
        return result
    if isinstance(result, dict):
        for field in ("data", "text", "csv"):
            if isinstance(result.get(field), str):
                return result[field]
        for field in ("records", "entries", "stats"):
            if isinstance(result.get(field), list):
                return result[field]
        if result.get("result") not in (None, 0):
            raise RuntimeError(f"Mango Office API error: {result.get('result')}")
    if isinstance(result, list):
        return result
    raise RuntimeError("Не удалось получить результаты статистики Mango Office")


def parse_mango_calls_csv(csv_text: str) -> list[MangoCall]:
    calls: list[MangoCall] = []
    for line in csv_text.strip().splitlines():
        if not line.strip():
            continue
        parts = line.split(";")
        if len(parts) < 5:
            continue
        recording_id = (parts[0] or "").strip("[]")
        start = int(parts[1] or 0)
        finish = int(parts[2] or 0)
        from_number = parts[5] if len(parts) > 5 and parts[5] else parts[3]
        to_number = parts[7] if len(parts) > 7 and parts[7] else parts[4]
        line_number = parts[9] if len(parts) > 9 else ""
        entry_id = parts[11] if len(parts) > 11 else ""
        if not start or not finish:
            continue
        calls.append(
            MangoCall(
                recording_id=recording_id,
                start=start,
                finish=finish,
                from_number=from_number,
                to_number=to_number,
                line_number=line_number,
                entry_id=entry_id,
            )
        )
    return calls


def parse_mango_calls_result(result: Any) -> list[MangoCall]:
    if isinstance(result, str):
        trimmed = result.strip()
        if not trimmed:
            return []
        if trimmed.startswith("[") or trimmed.startswith("{"):
            try:
                parsed = json.loads(trimmed)
            except json.JSONDecodeError:
                return parse_mango_calls_csv(trimmed)
            return parse_mango_calls_result(parsed)
        return parse_mango_calls_csv(trimmed)

    if isinstance(result, list):
        calls: list[MangoCall] = []
        for row in result:
            if isinstance(row, list):
                recording_id = str(row[0] if len(row) > 0 else "").strip("[]")
                start = int(row[1] or 0) if len(row) > 1 else 0
                finish = int(row[2] or 0) if len(row) > 2 else 0
                from_number = str(row[5] if len(row) > 5 else row[3] if len(row) > 3 else "")
                to_number = str(row[7] if len(row) > 7 else row[4] if len(row) > 4 else "")
                line_number = str(row[9] if len(row) > 9 else "")
                entry_id = str(row[11] if len(row) > 11 else "")
            elif isinstance(row, dict):
                recording_id = str(row.get("recordingId") or row.get("recording_id") or row.get("recording") or "")
                start = int(row.get("start") or row.get("start_time_unix") or 0)
                finish = int(row.get("finish") or row.get("finish_time_unix") or 0)
                from_number = str(row.get("fromNumber") or row.get("from_number") or row.get("from") or "")
                to_number = str(row.get("toNumber") or row.get("to_number") or row.get("to") or "")
                line_number = str(row.get("lineNumber") or row.get("line_number") or "")
                entry_id = str(row.get("entryId") or row.get("entry_id") or "")
            else:
                continue
            if start and finish:
                calls.append(
                    MangoCall(
                        recording_id=recording_id,
                        start=start,
                        finish=finish,
                        from_number=from_number,
                        to_number=to_number,
                        line_number=line_number,
                        entry_id=entry_id,
                    )
                )
        return calls

    if isinstance(result, dict):
        for field in ("records", "entries", "stats"):
            if isinstance(result.get(field), list):
                return parse_mango_calls_result(result[field])
        for field in ("data", "text", "csv"):
            if isinstance(result.get(field), str):
                return parse_mango_calls_result(result[field])
    return []


def determine_call_direction(from_number: str, to_number: str) -> str:
    external_pattern = re.compile(r"^(7|8|\+7|\d{10,})")
    is_from_external = bool(external_pattern.match(from_number or ""))
    is_to_external = bool(external_pattern.match(to_number or ""))
    if is_from_external and not is_to_external:
        return "incoming"
    if not is_from_external and is_to_external:
        return "outgoing"
    return "incoming"


def get_mango_calls(config: MangoConfig, date_from: date, date_to: date) -> list[MangoCall]:
    key = request_mango_stats(config, date_from, date_to)
    for _ in range(10):
        result = get_mango_stats_result(config, key)
        if isinstance(result, str) and not result.strip():
            time.sleep(1)
            continue
        calls = parse_mango_calls_result(result)
        if calls:
            return calls
        time.sleep(1)
    return parse_mango_calls_result(get_mango_stats_result(config, key))


def _extract_recording_url(payload: dict[str, Any]) -> str | None:
    for key in ("url", "link", "recording_url", "recordingUrl", "file", "location"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    data = payload.get("data")
    if isinstance(data, dict):
        return _extract_recording_url(data)
    return None


def _request_mango_recording(
    config: MangoConfig,
    recording_id: str,
    action: str,
    endpoint: str,
) -> dict[str, str | bytes]:
    payload_json = json.dumps({"recording_id": recording_id, "action": action}, separators=(",", ":"))
    sign = generate_signature(config.api_key, config.api_salt, payload_json)
    base_url = config.api_url.rstrip("/")
    body = urllib.parse.urlencode(
        {
            "vpbx_api_key": config.api_key,
            "sign": sign,
            "json": payload_json,
        }
    ).encode()
    request = urllib.request.Request(
        f"{base_url}{endpoint}",
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ARG002
            return None

    opener = urllib.request.build_opener(NoRedirectHandler)
    try:
        with opener.open(request, timeout=120) as response:
            content_type = response.headers.get("Content-Type", "") or "audio/mpeg"
            raw = response.read()
            if "application/json" in content_type:
                payload = json.loads(raw.decode("utf-8"))
                if isinstance(payload, dict):
                    url = _extract_recording_url(payload)
                    if url:
                        return {"kind": "url", "url": url, "content_type": content_type}
                    if payload.get("error"):
                        raise RuntimeError(f"Mango Office: {payload['error']}")
                    if payload.get("result") not in (None, 0, "0", 1000):
                        raise RuntimeError(f"Mango Office: код {payload.get('result')}")
            if raw:
                audio_type = content_type if "audio" in content_type else _guess_audio_type(raw)
                return {"kind": "blob", "data": raw, "content_type": audio_type}
    except urllib.error.HTTPError as exc:
        if exc.code in {301, 302, 303, 307, 308}:
            location = exc.headers.get("Location")
            if location:
                return {"kind": "url", "url": urllib.parse.urljoin(base_url + "/", location), "content_type": "audio/mpeg"}
        if exc.code == 429:
            time.sleep(2)
            try:
                with opener.open(request, timeout=120) as response:
                    content_type = response.headers.get("Content-Type", "") or "audio/mpeg"
                    raw = response.read()
                    if "application/json" in content_type:
                        payload = json.loads(raw.decode("utf-8"))
                        if isinstance(payload, dict):
                            url = _extract_recording_url(payload)
                            if url:
                                return {"kind": "url", "url": url, "content_type": content_type}
                    if raw:
                        audio_type = content_type if "audio" in content_type else _guess_audio_type(raw)
                        return {"kind": "blob", "data": raw, "content_type": audio_type}
            except urllib.error.HTTPError as retry_exc:
                if retry_exc.code == 429:
                    raise RuntimeError("Mango Office: слишком много запросов. Подождите минуту и повторите.") from retry_exc
                detail = retry_exc.read().decode("utf-8", errors="ignore")
                raise RuntimeError(f"Mango recording error: {retry_exc.code} {detail}") from retry_exc
            raise RuntimeError("Mango Office: слишком много запросов. Подождите минуту и повторите.") from exc
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Mango recording error: {exc.code} {detail}") from exc

    raise RuntimeError("Не удалось получить запись звонка из Mango Office")


def get_mango_recording_payload(
    config: MangoConfig,
    recording_id: str,
    action: str = "play",
) -> dict[str, str | bytes]:
    recording_id = (recording_id or "").strip().strip("[]")
    if not recording_id:
        raise RuntimeError("Пустой ID записи")

    endpoints = ("/queries/recording/post", "/queries/recording/post_load")
    last_error: Exception | None = None
    for endpoint in endpoints:
        try:
            return _request_mango_recording(config, recording_id, action, endpoint)
        except RuntimeError as exc:
            last_error = exc
            if "слишком много запросов" in str(exc):
                raise
    if last_error:
        raise last_error
    raise RuntimeError("Не удалось получить запись звонка из Mango Office")


def _guess_audio_type(buffer: bytes) -> str:
    if len(buffer) >= 4 and buffer[0:4] == b"RIFF":
        return "audio/wav"
    if len(buffer) >= 4 and buffer[0:4] == b"OggS":
        return "audio/ogg"
    if len(buffer) >= 2 and buffer[0] == 0xFF:
        return "audio/mpeg"
    return "audio/mpeg"


def fetch_url_bytes(url: str) -> tuple[bytes, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "CRM-KIT/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        content_type = response.headers.get("Content-Type", "") or "audio/mpeg"
        return response.read(), content_type


def build_recording_stream_response(url: str, range_header: str | None = None):
    from django.http import StreamingHttpResponse

    headers = {"User-Agent": "CRM-KIT/1.0"}
    if range_header:
        headers["Range"] = range_header
    remote = urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=120)
    content_type = remote.headers.get("Content-Type", "") or "audio/mpeg"
    status = getattr(remote, "status", 200) or 200

    def iterator():
        try:
            while True:
                chunk = remote.read(64 * 1024)
                if not chunk:
                    break
                yield chunk
        finally:
            remote.close()

    response = StreamingHttpResponse(iterator(), content_type=content_type, status=status)
    for header_name in ("Content-Length", "Content-Range", "Accept-Ranges"):
        header_value = remote.headers.get(header_name)
        if header_value:
            response[header_name] = header_value
    if "Accept-Ranges" not in response:
        response["Accept-Ranges"] = "bytes"
    response["Cache-Control"] = "private, max-age=3600"
    return response


def resolve_call_recording_stream(
    config: MangoConfig,
    recording_id: str,
    cached_url: str = "",
    range_header: str | None = None,
):
    from django.http import HttpResponse

    recording_id = (recording_id or "").strip().strip("[]")
    if not recording_id:
        raise RuntimeError("Пустой ID записи")

    for candidate in (cached_url.strip(), get_cached_recording_url(recording_id)):
        if not candidate:
            continue
        try:
            return build_recording_stream_response(candidate, range_header), candidate
        except Exception:
            pass

    payload = get_mango_recording_payload(config, recording_id, "play")
    if payload.get("kind") == "url":
        url = str(payload.get("url") or "").strip()
        if not url:
            raise RuntimeError("Не удалось получить ссылку на запись")
        set_cached_recording_url(recording_id, url)
        stream = build_recording_stream_response(url, range_header)
        return stream, url

    if payload.get("kind") == "blob":
        data = bytes(payload["data"])
        content_type = str(payload.get("content_type") or "audio/mpeg")
        response = HttpResponse(data, content_type=content_type)
        response["Accept-Ranges"] = "bytes"
        response["Cache-Control"] = "private, max-age=3600"
        return response, ""

    raise RuntimeError("Не удалось получить запись звонка из Mango Office")


def resolve_call_recording_audio(
    config: MangoConfig,
    recording_id: str,
    cached_url: str = "",
    action: str = "play",
) -> tuple[bytes, str, str]:
    recording_id = (recording_id or "").strip().strip("[]")
    for candidate in (cached_url.strip(), get_cached_recording_url(recording_id)):
        if not candidate:
            continue
        try:
            data, content_type = fetch_url_bytes(candidate)
            return data, content_type, candidate
        except Exception:
            pass

    payload = get_mango_recording_payload(config, recording_id, action)
    if payload.get("kind") == "blob":
        content_type = str(payload.get("content_type") or "audio/mpeg")
        return bytes(payload["data"]), content_type, ""

    url = payload.get("url")
    if isinstance(url, str) and url.strip():
        set_cached_recording_url(recording_id, url)
        data, content_type = fetch_url_bytes(url.strip())
        return data, content_type, url.strip()

    raise RuntimeError("Не удалось получить запись звонка из Mango Office")


def get_mango_recording_url(config: MangoConfig, recording_id: str, action: str = "play") -> str | None:
    payload = get_mango_recording_payload(config, recording_id, action)
    if payload.get("kind") == "url":
        return str(payload["url"])
    return None


def download_mango_recording(config: MangoConfig, recording_id: str, cached_url: str = "") -> tuple[bytes, str]:
    data, content_type, _source_url = resolve_call_recording_audio(
        config,
        recording_id,
        cached_url=cached_url,
        action="download",
    )
    return data, content_type
