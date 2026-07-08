import type {
  PublicClientEnrollmentRecord,
  PublicScheduleClientRecord,
  PublicSchedulePayload,
} from "@/lib/types";

const SESSION_PREFIX = "crmkit_schedule_session_";
const PHONE_PREFIX = "crmkit_schedule_phone_";

export function getStoredSessionToken(companySlug: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(`${SESSION_PREFIX}${companySlug}`) || "";
}

export function getStoredPhone(companySlug: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(`${PHONE_PREFIX}${companySlug}`) || "";
}

export function storeSessionToken(companySlug: string, token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${SESSION_PREFIX}${companySlug}`, token);
}

export function storePhone(companySlug: string, phone: string): void {
  if (typeof window === "undefined") return;
  if (phone.trim()) {
    window.localStorage.setItem(`${PHONE_PREFIX}${companySlug}`, phone.trim());
  }
}

export function clearSessionToken(companySlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${SESSION_PREFIX}${companySlug}`);
}

function publicHeaders(sessionToken?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (sessionToken) {
    headers["X-Client-Session"] = sessionToken;
  }
  return headers;
}

function publicPath(companySlug: string, path: string, token: string): string {
  const params = new URLSearchParams({ token });
  // Идём через Next API proxy, чтобы Django получал реальный IP клиента
  // (простой rewrite /backend → Django даёт REMOTE_ADDR=127.0.0.1).
  return `/api/public/schedule/${companySlug}${path}?${params.toString()}`;
}

async function parseError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { detail?: string };
  return payload.detail || `Ошибка ${response.status}`;
}

export async function fetchPublicSchedule(
  companySlug: string,
  token: string,
  sessionToken = "",
): Promise<PublicSchedulePayload> {
  const response = await fetch(publicPath(companySlug, "", token), {
    headers: publicHeaders(sessionToken),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<PublicSchedulePayload>;
}

export async function fetchOtpChallenge(
  companySlug: string,
  embedToken: string,
): Promise<{ challenge_id: string; question: string }> {
  const response = await fetch(publicPath(companySlug, "/auth/challenge", embedToken), {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<{ challenge_id: string; question: string }>;
}

export async function loginSchedulePortal(
  companySlug: string,
  embedToken: string,
  phone: string,
  password: string,
): Promise<{ session_token: string; client_name: string; client_id: number }> {
  const response = await fetch(publicPath(companySlug, "/auth/login", embedToken), {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({ phone, password }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<{ session_token: string; client_name: string; client_id: number }>;
}

export async function requestPasswordReset(
  companySlug: string,
  embedToken: string,
  phone: string,
  challenge: { challenge_id: string; captcha_answer: string; website?: string },
): Promise<{
  detail: string;
  check_id: string;
  call_phone: string;
  call_phone_pretty: string;
  call_phone_html: string;
  status: string;
  debug_confirmed?: string;
}> {
  const response = await fetch(publicPath(companySlug, "/auth/forgot-password", embedToken), {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({
      phone,
      challenge_id: challenge.challenge_id,
      captcha_answer: challenge.captcha_answer,
      website: challenge.website || "",
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<{
    detail: string;
    check_id: string;
    call_phone: string;
    call_phone_pretty: string;
    call_phone_html: string;
    status: string;
    debug_confirmed?: string;
  }>;
}

export async function fetchCallcheckStatus(
  companySlug: string,
  embedToken: string,
  checkId: string,
): Promise<{ status: string; detail: string; check_id: string; call_phone_pretty?: string }> {
  const params = new URLSearchParams({ token: embedToken, check_id: checkId });
  const response = await fetch(
    `/api/public/schedule/${companySlug}/auth/callcheck-status?${params.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<{
    status: string;
    detail: string;
    check_id: string;
    call_phone_pretty?: string;
  }>;
}

export async function resetSchedulePassword(
  companySlug: string,
  embedToken: string,
  phone: string,
  checkId: string,
  newPassword: string,
  email: string,
): Promise<{ session_token: string; client_name: string; client_id: number }> {
  const response = await fetch(publicPath(companySlug, "/auth/reset-password", embedToken), {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({
      phone,
      check_id: checkId,
      new_password: newPassword,
      email,
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<{ session_token: string; client_name: string; client_id: number }>;
}

export async function requestScheduleOtp(
  companySlug: string,
  embedToken: string,
  phone: string,
  challenge: { challenge_id: string; captcha_answer: string; website?: string },
): Promise<{ detail: string; debug_code?: string }> {
  const response = await fetch(publicPath(companySlug, "/auth/request-code", embedToken), {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({
      phone,
      challenge_id: challenge.challenge_id,
      captcha_answer: challenge.captcha_answer,
      website: challenge.website || "",
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<{ detail: string; debug_code?: string }>;
}

export async function verifyScheduleOtp(
  companySlug: string,
  embedToken: string,
  phone: string,
  code: string,
): Promise<{ session_token: string; client_name: string; client_id: number }> {
  const response = await fetch(publicPath(companySlug, "/auth/verify-code", embedToken), {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({ phone, code }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<{ session_token: string; client_name: string; client_id: number }>;
}

export async function fetchMyEnrollments(
  companySlug: string,
  embedToken: string,
  sessionToken: string,
): Promise<PublicClientEnrollmentRecord[]> {
  const response = await fetch(publicPath(companySlug, "/enrollments", embedToken), {
    headers: publicHeaders(sessionToken),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<PublicClientEnrollmentRecord[]>;
}

export async function enrollOnSlot(
  companySlug: string,
  embedToken: string,
  sessionToken: string,
  slotId: number,
): Promise<PublicClientEnrollmentRecord> {
  const response = await fetch(publicPath(companySlug, `/slots/${slotId}/enroll`, embedToken), {
    method: "POST",
    headers: publicHeaders(sessionToken),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<PublicClientEnrollmentRecord>;
}

export async function cancelEnrollment(
  companySlug: string,
  embedToken: string,
  sessionToken: string,
  enrollmentId: number,
): Promise<PublicClientEnrollmentRecord> {
  const response = await fetch(
    publicPath(companySlug, `/enrollments/${enrollmentId}/cancel`, embedToken),
    {
      method: "POST",
      headers: publicHeaders(sessionToken),
    },
  );
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<PublicClientEnrollmentRecord>;
}

export type { PublicScheduleClientRecord };
