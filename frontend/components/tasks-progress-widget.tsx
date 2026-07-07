"use client";

type TasksProgressWidgetProps = {
  total: number;
  inProgress: number;
  done: number;
};

export function TasksProgressWidget({ total, inProgress, done }: TasksProgressWidgetProps) {
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <section className="widget-card">
      <h2 className="text-[15px] font-semibold text-[var(--text)]">Прогресс задач</h2>
      <div className="mt-3 flex items-center gap-4">
        <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
          <circle cx="42" cy="42" r={radius} fill="none" stroke="#eef2f4" strokeWidth="8" />
          <circle
            cx="42"
            cy="42"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="space-y-1 text-[13px]">
          <p>
            <span className="font-semibold text-[var(--text)]">{progress}%</span>{" "}
            <span className="text-[var(--muted)]">выполнено</span>
          </p>
          <p className="text-[var(--muted)]">В работе: {inProgress}</p>
          <p className="text-[var(--muted)]">Всего: {total}</p>
        </div>
      </div>
    </section>
  );
}
