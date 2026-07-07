"use client";

import { useActionState, useRef } from "react";

import { switchCompanyAction } from "@/app/actions/company";
import type { ActionState, CompanyMembershipRecord } from "@/lib/types";

type CompanySwitcherProps = {
  memberships: CompanyMembershipRecord[];
  currentSlug: string;
  currentName?: string;
  variant?: "light" | "dark" | "shell";
};

const initialState: ActionState = {};

function ClubIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 21V9l8-4.5L20 9v12M9 21v-6h6v6M9 13h6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CompanySwitcher({
  memberships,
  currentSlug,
  currentName,
  variant = "light",
}: CompanySwitcherProps) {
  const [state, formAction, isPending] = useActionState(switchCompanyAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const displayName = currentName ?? currentSlug;
  const isShell = variant === "shell";

  if (memberships.length <= 1) {
    return (
      <div
        className={`workspace-club workspace-club--static hidden md:inline-flex ${
          isShell ? "workspace-club--shell" : `workspace-club--${variant}`
        }`}
        title={displayName}
      >
        <span className="workspace-club-icon" aria-hidden="true">
          <ClubIcon className="h-4 w-4" />
        </span>
        <span className="workspace-club-copy">
          <span className="workspace-club-label">Клуб</span>
          <span className="workspace-club-name">{displayName}</span>
        </span>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className={`workspace-club workspace-club--switchable hidden md:inline-flex ${
        isShell ? "workspace-club--shell" : `workspace-club--${variant}`
      } ${isPending ? "workspace-club--pending" : ""}`}
    >
      <span className="workspace-club-icon" aria-hidden="true">
        <ClubIcon className="h-4 w-4" />
      </span>

      <span className="workspace-club-copy">
        <span className="workspace-club-label">Клуб</span>
        <span className="workspace-club-name">{displayName}</span>
      </span>

      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="workspace-club-chevron h-3.5 w-3.5 fill-none stroke-current stroke-2"
      >
        <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <select
        name="company_slug"
        defaultValue={currentSlug}
        disabled={isPending}
        className="workspace-club-select"
        aria-label="Выбрать клуб"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {memberships.map((membership) => (
          <option key={membership.id} value={membership.company_slug}>
            {membership.company_name}
          </option>
        ))}
      </select>

      {state.error ? <span className="workspace-club-error">{state.error}</span> : null}
    </form>
  );
}
