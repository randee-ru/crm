import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Вход",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
            Доступ в систему
          </p>
          <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-tight text-white">
            Вход в CRM Kit для сотрудников фитнес-клуба.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            На этом этапе форма пока статичная, но структура уже готова для подключения
            реальной авторизации.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Открыть дашборд
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Вернуться на главную
            </Link>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
            <p className="text-sm text-slate-400">CRM Kit Login</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Авторизация</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Форма здесь пока как каркас. В следующем шаге её можно подключить к
              backend API.
            </p>

            <form className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Email</span>
                <input
                  type="email"
                  placeholder="manager@crmkit.ru"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Пароль</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                />
              </label>
              <button
                type="button"
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Войти
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
