import { Apple, Bot, Monitor, Smartphone, Terminal } from "lucide-react";

const platforms = [
  { label: "MacOS", Icon: Apple },
  { label: "Windows", Icon: Monitor },
  { label: "Linux", Icon: Terminal },
  { label: "iOS", Icon: Smartphone },
  { label: "Android", Icon: Bot },
] as const;

export function AppsDownloadWidget() {
  return (
    <section className="widget-card">
      <h2 className="text-[15px] font-semibold text-[var(--text)]">Скачать приложения</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {platforms.map((platform) => (
          <button
            key={platform.label}
            type="button"
            title={platform.label}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-white"
          >
            <platform.Icon size={20} strokeWidth={1.75} aria-hidden />
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">
        Мобильные и десктопные клиенты CRM Kit — скоро.
      </p>
    </section>
  );
}
