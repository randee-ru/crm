import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COMPANY_COOKIE, AUTH_TOKEN_COOKIE, DEFAULT_COMPANY_SLUG } from "@/lib/auth-cookies";
import { API_BASE_URL } from "@/lib/api-config";

type RouteContext = {
  params: Promise<{ callId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { callId } = await context.params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const company = cookieStore.get(AUTH_COMPANY_COOKIE)?.value ?? DEFAULT_COMPANY_SLUG;

  if (!token) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const range = request.headers.get("range");
  const response = await fetch(
    `${API_BASE_URL}/api/v1/telephony/calls/${callId}/stream/?company=${encodeURIComponent(company)}`,
    {
      headers: {
        Accept: "*/*",
        Authorization: `Token ${token}`,
        ...(range ? { Range: range } : {}),
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ detail: detail || "Recording unavailable" }, { status: response.status });
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("Accept-Ranges", "bytes");
  const contentLength = response.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  const contentRange = response.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}
