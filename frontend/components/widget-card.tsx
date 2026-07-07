import type { ReactNode } from "react";

type WidgetCardProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function WidgetCard({ title, action, children, className = "" }: WidgetCardProps) {
  return (
    <section className={`widget-card ${className}`.trim()}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
