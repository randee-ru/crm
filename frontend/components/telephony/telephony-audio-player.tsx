"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { IconClose, IconPause, IconPlay } from "@/components/ui/app-icon";
import { useWorkspaceShell } from "@/components/workspace-shell-provider";

type TelephonyAudioPlayerProps = {
  callId: number;
  title: string;
  durationHint?: number;
  onClose: () => void;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function readStreamError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    if (payload?.detail) return payload.detail;
  }
  const text = await response.text().catch(() => "");
  const trimmed = text.trim();
  if (trimmed) {
    if (contentType.includes("text/html") || /^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
      return `Ошибка загрузки записи (${response.status})`;
    }
    return trimmed;
  }
  return `Ошибка загрузки записи (${response.status})`;
}

export function TelephonyAudioPlayer({ callId, title, durationHint = 0, onClose }: TelephonyAudioPlayerProps) {
  const { sidebarCollapsed } = useWorkspaceShell();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationHint);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sidebarOffset = sidebarCollapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)";
  const streamUrl = `/api/telephony/recording/${callId}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;
    let started = false;
    setLoading(true);
    setError("");
    setCurrent(0);
    setDuration(durationHint);
    setPlaying(false);

    const timeoutId = window.setTimeout(() => {
      if (!cancelled && !started) {
        setLoading(false);
        setError("Запись загружается слишком долго. Подождите минуту и попробуйте снова.");
      }
    }, 45000);

    const onLoadedMetadata = () => {
      if (cancelled) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onCanPlay = () => {
      if (cancelled) return;
      started = true;
      setLoading(false);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };
    const onTimeUpdate = () => setCurrent(audio.currentTime);
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onEnded = () => setPlaying(false);
    const onPlaying = () => {
      if (!cancelled) {
        started = true;
        setLoading(false);
      }
    };
    const onError = () => {
      if (cancelled) return;
      setLoading(false);
      void fetch(streamUrl, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) {
            setError(await readStreamError(response));
            return;
          }
          setError("Не удалось воспроизвести запись");
        })
        .catch(() => setError("Не удалось воспроизвести запись"));
      setPlaying(false);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);

    audio.src = streamUrl;
    audio.load();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
    };
  }, [callId, durationHint, streamUrl, mounted]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || loading || error) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function handleSeek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  const player = (
    <div
      className="telephony-floating-player"
      style={{
        left: `max(1rem, calc(${sidebarOffset} + 1rem))`,
        right: "1rem",
        width: "auto",
      }}
      role="region"
      aria-label="Плеер записи звонка"
    >
      <audio ref={audioRef} preload="auto" />

      <div className="telephony-floating-player-main">
        <button
          type="button"
          className="telephony-floating-player-play"
          onClick={togglePlay}
          disabled={loading || Boolean(error)}
          aria-label={playing ? "Пауза" : "Воспроизвести"}
        >
          {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
        </button>

        <div className="telephony-floating-player-meta">
          <strong>{title || "Запись звонка"}</strong>
          <span>
            {loading ? "Подготовка записи…" : error || `${formatTime(current)} / ${formatTime(duration)}`}
          </span>
        </div>

        <button type="button" className="telephony-floating-player-close" onClick={onClose} aria-label="Закрыть плеер">
          <IconClose size={16} />
        </button>
      </div>

      <div className="telephony-floating-player-track">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={current}
          disabled={loading || Boolean(error) || duration <= 0}
          onChange={(event) => handleSeek(Number(event.target.value))}
          aria-label="Позиция воспроизведения"
          style={{ background: `linear-gradient(to right, var(--accent) ${progress}%, #e5ebf2 ${progress}%)` }}
        />
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(player, document.body);
}
