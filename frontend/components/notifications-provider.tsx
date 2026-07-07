"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { NotificationRecord } from "@/lib/types";

type NotificationsContextValue = {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  unreadCount: number;
  notifications: NotificationRecord[];
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

type NotificationsProviderProps = {
  children: ReactNode;
  initialNotifications?: NotificationRecord[];
};

export function NotificationsProvider({
  children,
  initialNotifications = [],
}: NotificationsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(
    initialNotifications.filter((item) => !item.is_read).length,
  );

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((value) => !value), []);
  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
  }, []);

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
      markAllRead,
    }),
    [closePanel, isOpen, markAllRead, notifications, openPanel, togglePanel, unreadCount],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
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
