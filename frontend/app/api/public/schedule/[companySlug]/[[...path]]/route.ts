import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_BASE = (process.env.BACKEND_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "";
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ companySlug: string; path?: string[] }> },
): Promise<NextResponse> {
  const { companySlug, path = [] } = await context.params;
  const suffix = path.length ? `/${path.join("/")}` : "";
  const incoming = new URL(request.url);
  const target = new URL(`${BACKEND_BASE}/api/v1/public/schedule/${companySlug}${suffix}`);
  target.search = incoming.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const session = request.headers.get("x-client-session");
  if (session) headers.set("x-client-session", session);

  const ip = clientIp(request);
  if (ip) {
    headers.set("x-forwarded-for", ip);
    headers.set("x-real-ip", ip);
  }
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", "") || "http");
  // Нужен для PUBLIC_SCHEDULE_HOSTS (schedule.sportmax.fit без token в URL).
  headers.set("x-forwarded-host", incoming.host);
  headers.set("host", incoming.host);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const upstream = await fetch(target.toString(), init);
    const body = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) responseHeaders.set("content-type", upstreamType);
    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Backend unavailable";
    return NextResponse.json({ detail }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ companySlug: string; path?: string[] }> },
) {
  return proxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ companySlug: string; path?: string[] }> },
) {
  return proxy(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ companySlug: string; path?: string[] }> },
) {
  return proxy(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ companySlug: string; path?: string[] }> },
) {
  return proxy(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ companySlug: string; path?: string[] }> },
) {
  return proxy(request, context);
}
