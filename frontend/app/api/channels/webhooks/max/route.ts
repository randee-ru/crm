import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api-config";

async function proxyRequest(request: Request, method: "GET" | "POST") {
  const url = new URL(request.url);
  const target = `${API_BASE_URL}/api/channels/webhooks/max${url.search}`;

  if (method === "GET") {
    const response = await fetch(target, { method: "GET", cache: "no-store" });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  }

  const body = await request.text();
  const contentType = request.headers.get("content-type") || "application/json";
  const secret = request.headers.get("x-max-bot-api-secret");

  const response = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      ...(secret ? { "X-Max-Bot-Api-Secret": secret } : {}),
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
  });
}

export async function GET(request: Request) {
  return proxyRequest(request, "GET");
}

export async function POST(request: Request) {
  return proxyRequest(request, "POST");
}
