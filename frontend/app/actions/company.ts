"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthHeaders, getAuthSession, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import { AUTH_COMPANY_COOKIE } from "@/lib/auth-cookies";
import type { ActionState, CompanyModuleSettings } from "@/lib/types";

export async function switchCompanyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = String(formData.get("company_slug") ?? "").trim();
  if (!companySlug) {
    return { error: "Выберите компанию." };
  }

  const session = await getAuthSession();
  const allowed = session?.memberships.some(
    (membership) => membership.company_slug === companySlug && membership.is_active,
  );

  if (!allowed) {
    return { error: "Нет доступа к выбранной компании." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COMPANY_COOKIE, companySlug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/dashboard");
}

export async function updateModuleSettingsAction(disabledModules: string[]): Promise<string[]> {
  const companySlug = await getCompanySlugFromCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/company/module-settings/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ disabled_modules: disabledModules }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось сохранить настройки меню.");
  }

  const payload = (await response.json()) as { disabled_modules: string[] };
  revalidatePath("/dashboard/settings");
  return payload.disabled_modules;
}

export async function updateRoleModuleSettingsAction(
  role: string,
  disabledModules: string[],
): Promise<CompanyModuleSettings> {
  const companySlug = await getCompanySlugFromCookie();
  const current = await getModuleSettingsAction();
  const roleDisabledModules = { ...current.role_disabled_modules, [role]: disabledModules };

  const response = await fetch(
    `${API_BASE_URL}/api/v1/company/module-settings/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role_disabled_modules: roleDisabledModules }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось сохранить настройки меню для роли.");
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/employees");
  return response.json() as Promise<CompanyModuleSettings>;
}

export async function getModuleSettingsAction(): Promise<CompanyModuleSettings> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/company/module-settings/?company=${encodeURIComponent(companySlug)}`,
    {
      headers: await getAuthHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить настройки меню.");
  }

  return response.json() as Promise<CompanyModuleSettings>;
}
