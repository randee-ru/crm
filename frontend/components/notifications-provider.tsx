"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import { NotificationToasts } from "@/components/notification-toasts";
import type { NotificationRecord } from "@/lib/types";

const POLL_INTERVAL_MS = 10_000;
const HIDDEN_NOTIFICATION_IDS_KEY = "crm-hidden-notification-ids";

type NotificationsContextValue = {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  unreadCount: number;
  notifications: NotificationRecord[];
  notificationsLoaded: boolean;
  markAllRead: () => void;
  markRead: (id: number) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

type NotificationsProviderProps = {
  children: ReactNode;
};

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [toastQueue, setToastQueue] = useState<NotificationRecord[]>([]);
  const seenToastIdsRef = useRef<Set<number>>(new Set());
  const hiddenNotificationIdsRef = useRef<Set<number>>(new Set());
  const maxIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(HIDDEN_NOTIFICATION_IDS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as number[];
      hiddenNotificationIdsRef.current = new Set(parsed.filter((value) => Number.isFinite(value)));
    } catch {
      hiddenNotificationIdsRef.current = new Set();
    }
  }, []);

  const persistHiddenNotifications = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      HIDDEN_NOTIFICATION_IDS_KEY,
      JSON.stringify(Array.from(hiddenNotificationIdsRef.current)),
    );
  }, []);

  const applyNotifications = useCallback((items: NotificationRecord[], showToasts = false) => {
    const visibleItems = items.filter((item) => !hiddenNotificationIdsRef.current.has(item.id));
    setNotifications(visibleItems);
    setUnreadCount(visibleItems.filter((item) => !item.is_read).length);
    setLoaded(true);

    if (!showToasts) {
      for (const item of visibleItems) {
        seenToastIdsRef.current.add(item.id);
        maxIdRef.current = Math.max(maxIdRef.current, item.id);
      }
      return;
    }

    const fresh = visibleItems.filter(
      (item) => item.id > maxIdRef.current && !seenToastIdsRef.current.has(item.id),
    );
    if (fresh.length) {
      setToastQueue((current) => {
        const existing = new Set(current.map((item) => item.id));
        const merged = [...fresh.filter((item) => !existing.has(item.id)), ...current];
        return merged.slice(0, 8);
      });
    }
    for (const item of visibleItems) {
      maxIdRef.current = Math.max(maxIdRef.current, item.id);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void listNotificationsAction().then((items) => {
      if (cancelled) return;
      applyNotifications(items, false);
    });

    const intervalId = window.setInterval(() => {
      void listNotificationsAction().then((items) => {
        if (cancelled) return;
        applyNotifications(items, true);
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [applyNotifications]);

  const dismissToast = useCallback((id: number) => {
    seenToastIdsRef.current.add(id);
    setToastQueue((items) => items.filter((item) => item.id !== id));
  }, []);

  const markRead = useCallback((id: number) => {
    hiddenNotificationIdsRef.current.add(id);
    persistHiddenNotifications();
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    void markNotificationReadAction(id);
  }, [persistHiddenNotifications]);

  const markAllRead = useCallback(() => {
    for (const item of notifications) {
      hiddenNotificationIdsRef.current.add(item.id);
    }
    persistHiddenNotifications();
    setUnreadCount(0);
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
    void markAllNotificationsReadAction();
  }, [notifications, persistHiddenNotifications]);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((value) => !value), []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closePanel, isOpen]);

  const value = useMemo(
    () => ({
      isOpen,
      openPanel,
      closePanel,
      togglePanel,
      unreadCount,
      notifications,
      notificationsLoaded: loaded,
      markAllRead,
      markRead,
    }),
    [
      closePanel,
      isOpen,
      loaded,
      markAllRead,
      markRead,
      notifications,
      openPanel,
      togglePanel,
      unreadCount,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationToasts items={toastQueue} onDismiss={dismissToast} />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}

export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}
