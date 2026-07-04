import Link from "next/link";

const items = [
  { label: "Обзор", href: "/dashboard" },
  { label: "Клиенты", href: "/dashboard#clients" },
  { label: "Абонементы", href: "/dashboard#memberships" },
  { label: "Расписание", href: "/dashboard#schedule" },
  { label: "Интеграции", href: "/dashboard#integrations" },
] as const;

export function Sidebar() {
  return (
    <aside className="rounded-[28px] border border-white/10 bg-slate-950/80 p-4 shadow-glow backdrop-blur-xl">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Navigation</p>
        <p className="mt-2 text-lg font-semibold text-white">CRM Kit Console</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Единая рабочая панель для сотрудников фитнес-клуба.
        </p>
      </div>

      <nav className="mt-4 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <span>{item.label}</span>
            <span className="text-slate-500">→</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

