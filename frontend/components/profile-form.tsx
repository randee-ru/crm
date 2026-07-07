"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { updateProfileAction } from "@/app/actions/profile";
import { UserAvatar } from "@/components/user-avatar";
import type { ActionState, AuthUser } from "@/lib/types";

type ProfileFormProps = {
  user: AuthUser;
  role?: string;
  companyName?: string;
};

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  staff: "Сотрудник",
};

function buildDisplayName(firstName: string, lastName: string, fallback: string) {
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || fallback;
}

function buildInitials(firstName: string, lastName: string, fallback: string) {
  const first = firstName.trim();
  const last = lastName.trim();

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }

  const source = buildDisplayName(firstName, lastName, fallback);
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

const initialActionState: ActionState = {};

export function ProfileForm({ user, role, companyName }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(user.first_name || user.display_name.split(" ")[0] || "");
  const [lastName, setLastName] = useState(
    user.last_name || user.display_name.split(" ").slice(1).join(" ") || "",
  );
  const [email, setEmail] = useState(user.email);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialActionState);

  const previewUser = useMemo(
    () => ({
      display_name: buildDisplayName(firstName, lastName, user.username),
      initials: buildInitials(firstName, lastName, user.username),
      avatar_url: avatarPreview ?? user.avatar_url,
    }),
    [avatarPreview, firstName, lastName, user.avatar_url, user.username],
  );

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview(URL.createObjectURL(file));
  };

  return (
    <form action={formAction} className="space-y-5 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar user={previewUser} size="lg" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-[11px] font-semibold text-white opacity-0 transition hover:bg-black/45 hover:opacity-100"
          >
            Фото
          </button>
          <input
            ref={fileInputRef}
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--text)]">{previewUser.display_name}</p>
          <p className="text-[13px] text-[var(--accent-strong)]">
            {role ? (roleLabels[role] ?? role) : "Сотрудник"}
          </p>
          {companyName ? <p className="text-[12px] text-[var(--muted)]">{companyName}</p> : null}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-[12px] font-medium text-[var(--accent-strong)] hover:underline"
          >
            Загрузить фотографию
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">Имя</span>
          <input
            className="form-field"
            name="first_name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">Фамилия</span>
          <input
            className="form-field"
            name="last_name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">Логин</span>
          <input className="form-field bg-[var(--panel-muted)]" value={user.username} readOnly />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">Email</span>
          <input
            className="form-field"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? "Сохранение..." : "Сохранить"}
        </button>
        {state.success ? (
          <span className="text-[13px] font-medium text-[var(--success)]">{state.success}</span>
        ) : null}
        {state.error ? (
          <span className="text-[13px] font-medium text-[var(--danger)]">{state.error}</span>
        ) : null}
      </div>

      <p className="text-[12px] leading-5 text-[var(--muted)]">
        Фото профиля — до 2 МБ, форматы PNG, JPG или WebP.
      </p>
    </form>
  );
}
