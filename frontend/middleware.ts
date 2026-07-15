import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import {
  CLIENT_LK_HOST,
  CRM_APP_HOST,
  isSchedulePublicHost,
  schedulePublicOrigin,
} from "@/lib/public-hosts";

const protectedPaths = ["/", "/dashboard"];
const DEFAULT_COMPANY_SLUG = (process.env.NEXT_PUBLIC_COMPANY_SLUG || "sportmax").trim();

function hostnameOf(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host");
  const raw = (forwarded || request.headers.get("host") || "").split(",")[0].trim();
  return raw.split(":")[0].toLowerCase();
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = hostnameOf(request);

  // Публичное расписание: только расписание, без CRM.
  if (isSchedulePublicHost(host)) {
    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt"
    ) {
      return NextResponse.next();
    }

    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = `/schedule/${DEFAULT_COMPANY_SLUG}`;
      url.search = "";
      return NextResponse.rewrite(url);
    }

    if (pathname.startsWith("/schedule/") || pathname.startsWith("/embed/schedule/")) {
      return NextResponse.next();
    }

    // CRM-пути с домена расписания → на CRM.
    if (
      pathname.startsWith("/dashboard") ||
      pathname === "/login" ||
      pathname.startsWith("/login/")
    ) {
      const target = new URL(pathname + request.nextUrl.search, `https://${CRM_APP_HOST}`);
      return NextResponse.redirect(target);
    }

    const home = request.nextUrl.clone();
    home.pathname = `/schedule/${DEFAULT_COMPANY_SLUG}`;
    home.search = "";
    return NextResponse.rewrite(home);
  }

  // Клиентский ЛК — заготовка (пока редирект на расписание / запись).
  if (host === CLIENT_LK_HOST) {
    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt"
    ) {
      return NextResponse.next();
    }
    if (
      pathname.startsWith("/dashboard") ||
      pathname === "/login" ||
      pathname.startsWith("/login/")
    ) {
      const target = new URL(pathname + request.nextUrl.search, `https://${CRM_APP_HOST}`);
      return NextResponse.redirect(target);
    }
    // Пока ЛК ведёт на публичное расписание (вход клиентов там же).
    const target = new URL("/", schedulePublicOrigin());
    return NextResponse.redirect(target, 302);
  }

  // CRM-домен: публичное расписание уводим на schedule.* (без токена в URL).
  if (pathname.startsWith("/schedule/") || pathname.startsWith("/embed/schedule/")) {
    const parts = pathname.split("/").filter(Boolean);
    const slug = parts[2] || parts[1] || DEFAULT_COMPANY_SLUG;
    const target = new URL(`/schedule/${slug}`, schedulePublicOrigin());
    return NextResponse.redirect(target, 308);
  }

  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isProtected && !token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && token) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/login",
    "/schedule",
    "/schedule/:path*",
    "/embed/schedule/:path*",
  ],
};
