"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_COMPANY_COOKIE,
  AUTH_TOKEN_COOKIE,
} from "@/lib/auth-cookies";
import { API_BASE_URL } from "@/lib/api-config";
import type { AuthSession } from "@/lib/types";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Введите логин и пароль." };
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    return {
      error: `Backend недоступен (${API_BASE_URL}). Запустите: python manage.py runserver --settings=config.settings.dev`,
    };
  }

  if (!response.ok) {
    return { error: "Неверный логин, пароль или доступ к компании." };
  }

  const session = (await response.json()) as AuthSession;
  const cookieStore = await cookies();

  cookieStore.set(AUTH_TOKEN_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  if (session.company?.slug) {
    cookieStore.set(AUTH_COMPANY_COOKIE, session.company.slug, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  redirect("/dashboard");
}

export type AcceptInviteState = {
  error?: string;
};

export async function acceptInvitationAction(
  _prevState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!token || !firstName || !lastName || !password) {
    return { error: "Заполните приглашение: имя, фамилию и пароль." };
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth/accept-invite/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        first_name: firstName,
        last_name: lastName,
        password,
      }),
    });
  } catch {
    return { error: `Backend недоступен (${API_BASE_URL}).` };
  }

  if (!response.ok) {
    return { error: "Не удалось принять приглашение." };
  }

  const session = (await response.json()) as AuthSession;
  const cookieStore = await cookies();

  cookieStore.set(AUTH_TOKEN_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  if (session.company?.slug) {
    cookieStore.set(AUTH_COMPANY_COOKIE, session.company.slug, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  if (token) {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Token ${token}`,
      },
    }).catch(() => undefined);
  }

  cookieStore.delete(AUTH_TOKEN_COOKIE);
  cookieStore.delete(AUTH_COMPANY_COOKIE);
  redirect("/login");
}
