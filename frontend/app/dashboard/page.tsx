import type { Metadata } from "next";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import { SectionHeading } from "@/components/section-heading";
import { StatCard } from "@/components/stat-card";
import { getApiBaseUrl, getHealthcheck } from "@/lib/api";

export const metadata: Metadata = {
  title: "Дашборд",
};

export default async function DashboardPage() {
  let healthStatus = "unknown";
  let serviceName = "crm-kit";

  try {
    const health = await getHealthcheck();
    healthStatus = health.status;
    serviceName = health.service;
  } catch {
    healthStatus = "offline";
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-glow backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
                Dashboard
              </p>
              <h1 className="mt-4 text-4xl font-semibold text-white md:text-5xl">
                Управляйте фитнес-клубом из одной панели.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Здесь будет рабочее пространство сотрудников: клиенты, абонементы,
                расписание, бронирования и отчёты. Сейчас это красивый и готовый к
                расширению каркас.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
              <p className="text-sm text-slate-400">Backend health</p>
              <p className="mt-2 text-2xl font-semibold text-white">{healthStatus}</p>
              <p className="mt-2 text-sm text-slate-400">
                Service: <span className="text-slate-200">{serviceName}</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">API base: {getApiBaseUrl()}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Клиенты"
            value="128"
            note="Базовая метрика для первого фитнес-клуба. Позже будет приходить из API."
          />
          <StatCard
            label="Активные абонементы"
            value="84"
            note="Показывает, сколько клиентов сейчас используют услуги клуба."
          />
          <StatCard
            label="Посещения сегодня"
            value="36"
            note="Проверяем операционную активность клуба в течение дня."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
            <SectionHeading
              eyebrow="Этап 6"
              title="Основные зоны будущего продукта"
              description="Каждая карточка ниже - это будущий модуль CRM Kit. Сейчас это навигационная карта для команды и понятный скелет интерфейса."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["clients", "Клиенты", "Регистрация и история посещений"],
                ["memberships", "Абонементы", "Статусы, срок действия и лимиты"],
                ["schedule", "Расписание", "Тренеры, залы и временные слоты"],
                ["integrations", "Интеграции", "Mango Office, Sigur и внешние сервисы"],
              ].map(([id, title, description]) => (
                <article
                  key={id}
                  id={id}
                  className="rounded-3xl border border-white/10 bg-slate-950/80 p-5"
                >
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">{id}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
              <SectionHeading
                eyebrow="API client"
                title="Подключение к backend"
                description="Мы уже заложили небольшой frontend API-клиент. Он читает healthcheck и позже будет использоваться для реальных запросов."
              />

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">Текущий пример</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  <code>getHealthcheck()</code> обращается к <code>/health/</code> и
                  показывает, что backend доступен.
                </p>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
                Навигация
              </p>
              <div className="mt-4 space-y-3">
                <Link
                  href="/login"
                  className="block rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-4 text-sm text-slate-200 transition hover:bg-white/5"
                >
                  Перейти на экран входа
                </Link>
                <Link
                  href="/"
                  className="block rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-4 text-sm text-slate-200 transition hover:bg-white/5"
                >
                  Вернуться на главную страницу
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
