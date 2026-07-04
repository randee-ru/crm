import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { SectionHeading } from "@/components/section-heading";
import { StatCard } from "@/components/stat-card";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
            Этап 6 · Основа frontend
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight text-white md:text-7xl">
            Frontend каркас для CRM Kit, который готов к росту продукта.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Мы уже собрали backend, SaaS-основу и внутреннюю админку. Теперь frontend
            получает свой собственный стартовый слой: главную страницу, вход, dashboard
            и API-клиент.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Открыть дашборд
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Страница входа
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-[32px] border border-white/10 bg-grid [background-size:32px_32px] opacity-20" />
          <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl">
            <SectionHeading
              eyebrow="Что уже есть"
              title="Структура frontend"
              description="Это не готовый продуктовый интерфейс, а foundation, на котором можно быстро строить экраны и подключать backend."
            />

            <div className="mt-8 grid gap-4">
              <StatCard
                label="App shell"
                value="Есть"
                note="Глобальная структура приложения и базовые стили уже собраны."
              />
              <StatCard
                label="Auth screen"
                value="Есть"
                note="Страница входа готова как каркас для будущей авторизации."
              />
              <StatCard
                label="Dashboard"
                value="Есть"
                note="Появилась рабочая основа для внутренних экранов команды."
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
