"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { IconPhone, IconX } from "@/components/ui/app-icon";
import type { NotificationRecord } from "@/lib/types";

const TOAST_DURATION_MS = 15_000;
const MAX_VISIBLE_TOASTS = 4;

type ActiveToast = {
  notification: NotificationRecord;
  expiresAt: number;
};

type NotificationToastsProps = {
  items: NotificationRecord[];
  onDismiss: (id: number) => void;
};

function toastEvent(notification: NotificationRecord): string {
  const event = notification.payload?.event;
  return typeof event === "string" ? event : "";
}

function isCallEvent(notification: NotificationRecord): boolean {
  const event = toastEvent(notification);
  return event.startsWith("call.");
}

function clientName(notification: NotificationRecord): string {
  const name = notification.payload?.client_name;
  return typeof name === "string" ? name.trim() : "";
}

function clientId(notification: NotificationRecord): number | null {
  const raw = notification.payload?.client_id;
  return typeof raw === "number" ? raw : null;
}

function kindIcon(notification: NotificationRecord) {
  if (isCallEvent(notification)) {
    return <IconPhone size={18} />;
  }
  if (notification.kind === "task") {
    return <span className="notification-toast-kind">✓</span>;
  }
  if (notification.kind === "crm") {
    return <span className="notification-toast-kind">◆</span>;
  }
  return <span className="notification-toast-kind">●</span>;
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ActiveToast;
  onDismiss: (id: number) => void;
}) {
  const router = useRouter();
  const { notification } = toast;
  const ringing = toastEvent(notification) === "call.ringing";
  const name = clientName(notification);
  const id = clientId(notification);

  const handleOpen = useCallback(() => {
    onDismiss(notification.id);
    if (notification.target_url) {
      router.push(notification.target_url as never);
    }
  }, [notification.id, notification.target_url, onDismiss, router]);

  const handleClientClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onDismiss(notification.id);
      if (id) {
        router.push(`/dashboard/clients/${id}` as never);
      }
    },
    [id, notification.id, onDismiss, router],
  );

  return (
    <article
      className={`notification-toast ${ringing ? "notification-toast-ringing" : ""}`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="notification-toast-close"
        aria-label="Закрыть"
        onClick={() => onDismiss(notification.id)}
      >
        <IconX size={14} />
      </button>

      <button type="button" className="notification-toast-body" onClick={handleOpen}>
        <span className="notification-toast-icon">{kindIcon(notification)}</span>
        <span className="notification-toast-content">
          <strong>{notification.title}</strong>
          {name ? (
            <span className="notification-toast-client" onClick={handleClientClick} role="link">
              {name}
            </span>
          ) : (
            <span className="notification-toast-text">{notification.body}</span>
          )}
          {name ? <span className="notification-toast-sub">{notification.body}</span> : null}
        </span>
      </button>

      <span
        className="notification-toast-progress"
        style={{ animationDuration: `${TOAST_DURATION_MS}ms` }}
      />
    </article>
  );
}

export function NotificationToasts({ items, onDismiss }: NotificationToastsProps) {
  const [active, setActive] = useState<ActiveToast[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (!items.length) return;

    setActive((current) => {
      const existing = new Set(current.map((item) => item.notification.id));
      const next = [...current];
      for (const notification of items) {
        if (existing.has(notification.id)) continue;
        next.unshift({
          notification,
          expiresAt: Date.now() + TOAST_DURATION_MS,
        });
        existing.add(notification.id);
      }
      return next.slice(0, MAX_VISIBLE_TOASTS);
    });
  }, [items]);

  useEffect(() => {
    for (const toast of active) {
      if (timersRef.current.has(toast.notification.id)) continue;
      const timeoutId = window.setTimeout(() => {
        onDismiss(toast.notification.id);
        timersRef.current.delete(toast.notification.id);
      }, Math.max(0, toast.expiresAt - Date.now()));
      timersRef.current.set(toast.notification.id, timeoutId);
    }
  }, [active, onDismiss]);

  useEffect(() => {
    return () => {
      for (const timeoutId of timersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      timersRef.current.clear();
    };
  }, []);

  const handleDismiss = useCallback(
    (id: number) => {
      const timeoutId = timersRef.current.get(id);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timersRef.current.delete(id);
      }
      setActive((current) => current.filter((item) => item.notification.id !== id));
      onDismiss(id);
    },
    [onDismiss],
  );

  if (!active.length) return null;

  return (
    <div className="notification-toast-stack" aria-label="Всплывающие уведомления">
      {active.map((toast) => (
        <ToastCard key={toast.notification.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
