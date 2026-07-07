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

const STORAGE_KEY = "crm_sidebar_collapsed";
const SECTIONS_KEY = "crm_sidebar_sections";

type WorkspaceShellContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  openSections: Record<string, boolean>;
  toggleSection: (sectionId: string) => void;
};

const WorkspaceShellContext = createContext<WorkspaceShellContextValue | null>(null);

const defaultSections: Record<string, boolean> = {
  collaboration: true,
};

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function readSections(): Record<string, boolean> {
  if (typeof window === "undefined") return defaultSections;
  try {
    const raw = window.localStorage.getItem(SECTIONS_KEY);
    if (!raw) return defaultSections;
    return { ...defaultSections, ...JSON.parse(raw) };
  } catch {
    return defaultSections;
  }
}

export function WorkspaceShellProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(defaultSections);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSidebarCollapsedState(readCollapsed());
    setOpenSections(readSections());
    setReady(true);
  }, []);

  const setSidebarCollapsed = useCallback((value: boolean) => {
    setSidebarCollapsedState(value);
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((current) => {
      const next = { ...current, [sectionId]: !(current[sectionId] ?? true) };
      window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      sidebarCollapsed: ready ? sidebarCollapsed : false,
      toggleSidebar,
      setSidebarCollapsed,
      openSections: ready ? openSections : defaultSections,
      toggleSection,
    }),
    [openSections, ready, setSidebarCollapsed, sidebarCollapsed, toggleSection, toggleSidebar],
  );

  return (
    <WorkspaceShellContext.Provider value={value}>{children}</WorkspaceShellContext.Provider>
  );
}

export function useWorkspaceShell() {
  const context = useContext(WorkspaceShellContext);
  if (!context) {
    throw new Error("useWorkspaceShell must be used within WorkspaceShellProvider");
  }
  return context;
}

export function useWorkspaceShellOptional() {
  return useContext(WorkspaceShellContext);
}
