import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { InviteAcceptForm } from "@/components/invite-accept-form";
import { SiteHeader } from "@/components/site-header";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Вход",
};

type LoginPageProps = {
  searchParams: Promise<{
    invite?: string;
    email?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const inviteToken = params.invite?.trim() ?? "";
  const inviteEmail = params.email?.trim() ?? "";

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#2162a9_0%,#2b72b9_22%,#2e84c5_52%,#43b1d0_100%)]">
      <SiteHeader variant="marketing" />
      <section className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-12">
        <div className="relative flex flex-col justify-center text-white">
          <div className="absolute inset-0 -z-10 rounded-[36px] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_25%),radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.12),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/80">
            Доступ в систему
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Вход в рабочее пространство CRM Kit
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 md:text-lg">
            После входа frontend получает token, company slug и показывает только клиентов
            вашей компании через `CompanyMembership`.
          </p>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-[470px] rounded-[30px] bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.22)]">
            <div className="rounded-[26px] border border-slate-200 bg-white p-6">
              <BrandLogo href="/" size="lg" className="mb-4" />
              <h2 className="text-2xl font-semibold text-slate-900">Войти в CRM</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Используй логин сотрудника, у которого есть доступ к компании.
              </p>

              {inviteToken ? (
                <InviteAcceptForm token={inviteToken} email={inviteEmail} />
              ) : (
                <LoginForm />
              )}

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {inviteToken ? "Вход по приглашению" : "Demo после `seed_demo`"}
                </span>
                <Link href="/" className="text-sky-500 hover:text-sky-600">
                  На главную
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
