"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutAction } from "@/app/actions/auth";
import { useUserPanel } from "@/components/user-panel-provider";
import { UserAvatar } from "@/components/user-avatar";
import { workspaceGroupLabels } from "@/lib/access-groups";

function PanelIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
      {children}
    </span>
  );
}

function ProfileLink({
  children,
  className = "",
  onNavigate,
}: {
  children: React.ReactNode;
  className?: string;
  onNavigate: () => void;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        onNavigate();
        router.push("/dashboard/profile");
      }}
      className={className}
    >
      {children}
    </button>
  );
}

const quickCards = [
  {
    title: "Зарплата и отпуск",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5L12 14.8 7.5 16.7l.9-5L4.8 8.2l5-.7L12 3Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Расширения",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M4 7h7V4H4v3Zm9 0h7V4h-7v3ZM4 20h7v-3H4v3Zm9 0h7v-3h-7v3Z" strokeLinejoin="round" />
        <path d="M9 9v6M15 9v6M9 15h6M9 9h6" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

const menuItems = [
  {
    title: "Скачать мобильное приложение",
    href: "/dashboard/settings",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.8]">
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M11 18.5h2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Приложение для MacOS",
    href: "/dashboard/settings",
    action: "Скачать",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.8]">
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H17a2.5 2.5 0 0 1 2.5 2.5V14A2.5 2.5 0 0 1 17 16.5H6.5A2.5 2.5 0 0 1 4 14V6.5Z" />
        <path d="M8 19.5h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Тема оформления",
    href: "/dashboard/settings",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.8]">
        <path d="M12 3a9 9 0 1 0 0 18c4.5 0 7-3.5 7-7 0-3.5-2.5-5-5-5-1.2 0-2.2.4-3 1.1A5.5 5.5 0 0 0 12 3Z" />
      </svg>
    ),
  },
  {
    title: "Панель управления",
    href: "/dashboard/settings",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.8]">
        <path d="M4 7h16M4 12h10M4 17h14" strokeLinecap="round" />
        <circle cx="17" cy="12" r="2" />
      </svg>
    ),
  },
] as const;

export function UserProfilePanel() {
  const { isOpen, closePanel, user, companyName, role } = useUserPanel();
  const [workSeconds, setWorkSeconds] = useState(0);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!isWorking) return;

    const timer = window.setInterval(() => {
      setWorkSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isWorking]);

  if (!isOpen || !user) return null;

  const hours = String(Math.floor(workSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((workSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(workSeconds % 60).padStart(2, "0");
  const roleLabel = role ? (workspaceGroupLabels[role] ?? role) : "Пользователь";

  return (
    <>
      <button
        type="button"
        aria-label="Закрыть панель профиля"
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]"
        onClick={closePanel}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Профиль пользователя"
        className="fixed right-3 top-[calc(var(--header-height)+12px)] z-[60] w-[min(360px,calc(100vw-1.5rem))] animate-[slideInRight_0.22s_ease-out] overflow-hidden rounded-[var(--card-radius)] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
      >
        <div className="border-b border-[var(--line)] px-4 py-4">
          <div className="flex items-center gap-3">
            <ProfileLink
              onNavigate={closePanel}
              className="transition hover:opacity-90"
            >
              <UserAvatar user={user} size="lg" />
            </ProfileLink>
            <div className="min-w-0">
              <ProfileLink
                onNavigate={closePanel}
                className="flex items-center gap-1 text-left text-[16px] font-semibold text-[var(--text)] transition hover:text-[var(--accent-strong)]"
              >
                {user.display_name}
                <span className="text-[var(--muted)]">›</span>
              </ProfileLink>
              <ProfileLink
                onNavigate={closePanel}
                className="mt-0.5 block text-left text-[13px] font-medium text-[var(--accent-strong)] transition hover:underline"
              >
                {roleLabel}
              </ProfileLink>
              {companyName ? (
                <p className="mt-0.5 truncate text-[12px] text-[var(--muted)]">{companyName}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--line)] px-4 py-3">
          <p className="text-[13px] text-[var(--muted)]">
            {isWorking ? "Работаю" : "Не работаю"}{" "}
            <span className="font-semibold text-[var(--text)]">
              {hours}:{minutes}:{seconds}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setIsWorking((value) => !value)}
            className="mt-2 flex w-full items-center justify-between rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            <span>{isWorking ? "Завершить рабочий день" : "Начать рабочий день"}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-[var(--line)] px-4 py-3">
          {quickCards.map((item) => (
            <button
              key={item.title}
              type="button"
              className="rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-3 text-left transition hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)]/50"
            >
              {item.icon}
              <p className="mt-2 text-[12px] font-medium leading-4 text-[var(--text)]">{item.title}</p>
            </button>
          ))}
        </div>

        <div className="divide-y divide-[var(--line)]">
          {menuItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              onClick={closePanel}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--panel-muted)]"
            >
              <PanelIcon>{item.icon}</PanelIcon>
              <span className="flex-1 text-[13px] text-[var(--text)]">{item.title}</span>
              {"action" in item && item.action ? (
                <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)]">
                  {item.action}
                </span>
              ) : (
                <span className="text-[var(--muted)]">›</span>
              )}
            </Link>
          ))}
        </div>

        <div className="flex justify-end border-t border-[var(--line)] px-4 py-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-[13px] font-medium text-[var(--text)] transition hover:text-[var(--danger)]"
            >
              Выйти
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
