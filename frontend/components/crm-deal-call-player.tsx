"use client";

import { useEffect, useRef, useState } from "react";

import { IconPause, IconPlay } from "@/components/ui/app-icon";
import { formatDateTime } from "@/lib/api";
import type { DealLinkedCall } from "@/lib/types";

type CrmDealCallPlayerProps = {
  call: DealLinkedCall;
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

function canAttemptPlayback(call: DealLinkedCall): boolean {
  if (call.has_recording) return true;
  return call.duration > 0 && call.status === "answered";
}

function emptyRecordingMessage(call: DealLinkedCall): string {
  if (call.recording_status === "not_stored") {
    return "Запись не сохранялась в Mango Office";
  }
  if (call.duration > 0 && call.status === "answered") {
    return "Запись не сохранялась в Mango Office";
  }
  return "Запись пока недоступна";
}

export function CrmDealCallPlayer({ call }: CrmDealCallPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(call.duration || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  const streamUrl = `/api/telephony/recording/${call.id}`;
  const playbackAllowed = canAttemptPlayback(call);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !started) return;

    const onTimeUpdate = () => setCurrent(audio.currentTime);
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onEnded = () => setPlaying(false);
    const onPlaying = () => {
      setLoading(false);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onError = () => {
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

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [started, streamUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!playbackAllowed) return;

    if (!started) {
      setStarted(true);
      setLoading(true);
      setError("");
      window.setTimeout(() => {
        const node = audioRef.current;
        if (!node) return;
        node.src = streamUrl;
        node.load();
        void node.play().catch(() => {
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
        });
      }, 0);
      return;
    }

    if (!audio || error) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function handleSeek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const showEmptyMessage = !playbackAllowed && !started;

  return (
    <div className="crm-deal-call-item">
      <audio ref={audioRef} preload="none" />

      <div className="crm-deal-call-item-head">
        <button
          type="button"
          className="crm-deal-call-play"
          onClick={togglePlay}
          disabled={!playbackAllowed || Boolean(error)}
          aria-label={playing ? "Пауза" : "Слушать запись"}
        >
          {playing ? <IconPause size={14} /> : <IconPlay size={14} />}
        </button>

        <div className="crm-deal-call-item-meta">
          <strong>{formatDateTime(call.started_at)}</strong>
          <span>
            {call.line_name || "Телефония"} · {call.status_label}
            {call.duration > 0 ? ` · ${formatTime(call.duration)}` : ""}
          </span>
        </div>
      </div>

      {started ? (
        <div className="crm-deal-call-item-track">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={current}
            disabled={loading || Boolean(error) || duration <= 0}
            onChange={(event) => handleSeek(Number(event.target.value))}
            aria-label="Позиция воспроизведения"
            style={{
              background: `linear-gradient(to right, var(--accent) ${progress}%, #e5ebf2 ${progress}%)`,
            }}
          />
          <span className="crm-deal-call-item-time">
            {loading ? "Загрузка…" : error || `${formatTime(current)} / ${formatTime(duration)}`}
          </span>
        </div>
      ) : null}

      {showEmptyMessage ? (
        <p className="crm-deal-call-item-empty">{emptyRecordingMessage(call)}</p>
      ) : null}
    </div>
  );
}
