import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api-config";

export async function GET() {
  const response = await fetch(`${API_BASE_URL}/api/mango/callback`, {
    method: "GET",
    cache: "no-store",
  });
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const contentType = request.headers.get("content-type") || "application/x-www-form-urlencoded";

  const response = await fetch(`${API_BASE_URL}/api/mango/callback`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
    cache: "no-store",
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
  });
}
