"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { AUTH_COMPANY_COOKIE } from "@/lib/auth-cookies";
import type { ActionState } from "@/lib/types";

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
