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

import type { AuthUser } from "@/lib/types";

type UserPanelContextValue = {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  user: AuthUser | null;
  companyName?: string;
  role?: string;
};

const UserPanelContext = createContext<UserPanelContextValue | null>(null);

type UserPanelProviderProps = {
  children: ReactNode;
  user?: AuthUser | null;
  companyName?: string;
  role?: string;
};

export function UserPanelProvider({
  children,
  user = null,
  companyName,
  role,
}: UserPanelProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

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
      user,
      companyName,
      role,
    }),
    [closePanel, companyName, isOpen, openPanel, role, togglePanel, user],
  );

  return <UserPanelContext.Provider value={value}>{children}</UserPanelContext.Provider>;
}

export function useUserPanel() {
  const context = useContext(UserPanelContext);
  if (!context) {
    throw new Error("useUserPanel must be used within UserPanelProvider");
  }
  return context;
}

export function useUserPanelOptional() {
  return useContext(UserPanelContext);
}
