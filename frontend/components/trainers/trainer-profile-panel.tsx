"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { TrainerAccessCardsPanel } from "@/components/trainers/trainer-access-cards-panel";
import { TrainerDeleteButton } from "@/components/trainers/trainer-delete-button";
import { TrainerForm } from "@/components/trainers/trainer-form";
import { TrainerRentPanel } from "@/components/trainers/trainer-rent-panel";
import { IconArrowLeft, IconMail, IconPhone } from "@/components/ui/app-icon";
import { formatClientDate, getClientInitials } from "@/lib/api";
import type { BranchOption, TrainerDetail } from "@/lib/types";

type TrainerProfilePanelProps = {
  trainer: TrainerDetail;
  branches: BranchOption[];
};

export function TrainerProfilePanel({ trainer, branches }: TrainerProfilePanelProps) {
  const [showEdit, setShowEdit] = useState(false);

  const typeLabels = [
    trainer.trains_gym_floor ? "Тренажёрный зал" : null,
    trainer.trains_group_programs ? "Групповые программы" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="client-card">
      <header className="client-card-hero">
        <div className="client-card-hero-top">
          <Link href="/dashboard/trainers" className="client-card-back">
            <IconArrowLeft size={15} className="client-card-back-icon" />
            К списку тренеров
          </Link>
          <div className="flex items-center gap-2">
            <TrainerDeleteButton trainerId={trainer.id} />
            <button type="button" className="client-card-save" onClick={() => setShowEdit((value) => !value)}>
              {showEdit ? "Скрыть редактирование" : "Редактировать"}
            </button>
          </div>
        </div>

        <div className="client-card-hero-main">
          <div className="client-card-avatar-wrap">
            <div className="client-card-avatar overflow-hidden">
              {trainer.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trainer.photo_url} alt={trainer.full_name} className="h-full w-full object-cover" />
              ) : (
                getClientInitials(trainer.full_name)
              )}
            </div>
          </div>
          <div className="client-card-hero-info">
            <div className="client-card-hero-title-row">
              <h1 className="client-card-title">{trainer.full_name}</h1>
              <span className={`client-card-status client-card-status--${trainer.is_active ? "active" : "former"}`}>
                {trainer.is_active ? "Активен" : "Неактивен"}
              </span>
            </div>
            <div className="client-card-header-meta">
              {trainer.phone ? (
                <a href={`tel:${trainer.phone}`} className="client-card-meta-chip">
                  <IconPhone size={14} />
                  {trainer.phone}
                </a>
              ) : null}
              {trainer.email ? (
                <a href={`mailto:${trainer.email}`} className="client-card-meta-chip">
                  <IconMail size={14} />
                  {trainer.email}
                </a>
              ) : null}
              {typeLabels.map((label) => (
                <span key={label} className="client-card-meta-chip">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="client-card-stats">
          <StatCard label="Филиал" value={trainer.branch_name || "—"} />
          <StatCard label="Специализация" value={trainer.specialization || "—"} />
          <StatCard label="В команде с" value={formatClientDate(trainer.created_at)} />
          <StatCard
            label="Аренда зала"
            value={
              trainer.trains_gym_floor
                ? trainer.rent_paid_current_month
                  ? "Оплачена"
                  : "Не оплачена"
                : "Не требуется"
            }
            tone={trainer.trains_gym_floor ? (trainer.rent_paid_current_month ? "good" : "bad") : "neutral"}
          />
        </div>
      </header>

      <div className="client-card-body">
        <div className="client-card-main-layout">
          <aside className="client-card-sidebar">
            <SidebarCard title="Контакты">
              <ContactField icon={<IconPhone size={16} />} label="Телефон" value={trainer.phone} />
              <ContactField icon={<IconMail size={16} />} label="Email" value={trainer.email} />
            </SidebarCard>

            <SidebarCard title="Работа">
              <InfoLine label="Филиал" value={trainer.branch_name || "—"} />
              <InfoLine label="Тип" value={typeLabels.join(", ") || "—"} />
              <InfoLine label="Специализация" value={trainer.specialization || "—"} />
              <InfoLine label="Статус" value={trainer.is_active ? "Активен" : "Неактивен"} />
            </SidebarCard>

            <SidebarCard title="Точки входа">
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/bookings" className="bitrix-link text-[13px] font-medium">
                  Смотреть бронирования
                </Link>
                <Link href="/dashboard/attendance" className="bitrix-link text-[13px] font-medium">
                  Смотреть посещения
                </Link>
                <Link href="/dashboard/schedule" className="bitrix-link text-[13px] font-medium">
                  Смотреть расписание
                </Link>
              </div>
            </SidebarCard>

            <TrainerAccessCardsPanel trainerId={trainer.id} cards={trainer.access_cards} />
          </aside>

          <section className="client-card-timeline space-y-3">
            <div className="client-card-section">
              <h2>Публичный профиль</h2>
              <p className="mb-3 text-[12px] text-[var(--muted)]">
                Эти данные выгружаются на сайт клуба и в мобильное приложение.
              </p>
              <div className="space-y-3">
                <div>
                  <span className="client-card-contact-label">Заслуги и регалии</span>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] text-[var(--text)]">
                    {trainer.achievements || "Не заполнено"}
                  </p>
                </div>
                <div>
                  <span className="client-card-contact-label">Описание</span>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] text-[var(--text)]">
                    {trainer.bio || "Не заполнено"}
                  </p>
                </div>
              </div>
            </div>

            {trainer.trains_gym_floor ? (
              <div className="client-card-section">
                <h2>Аренда тренажёрного зала</h2>
                <TrainerRentPanel
                  trainerId={trainer.id}
                  payments={trainer.rent_payments}
                  rentPaidCurrentMonth={trainer.rent_paid_current_month}
                />
              </div>
            ) : (
              <div className="client-card-empty-state">
                <strong>Аренда не требуется</strong>
                <p>Тренер не работает в тренажёрном зале, поэтому аренду отслеживать не нужно.</p>
              </div>
            )}
          </section>
        </div>

        {showEdit ? (
          <section className="client-card-edit">
            <h2>Редактирование тренера</h2>
            <TrainerForm trainer={trainer} branches={branches} submitLabel="Сохранить изменения" />
          </section>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" }) {
  return (
    <div className="client-card-stat">
      <span>{label}</span>
      <strong className={tone === "good" ? "text-[#047857]" : tone === "bad" ? "text-[#b91c1c]" : undefined}>
        {value}
      </strong>
    </div>
  );
}

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="client-card-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ContactField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="client-card-contact">
      <span className="client-card-contact-icon" aria-hidden>
        {icon}
      </span>
      <div>
        <span className="client-card-contact-label">{label}</span>
        <strong>{value || "—"}</strong>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="client-card-info-line">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}
