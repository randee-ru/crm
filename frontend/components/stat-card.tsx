type StatCardProps = {
  label: string;
  value: string;
  note: string;
};

export function StatCard({ label, value, note }: StatCardProps) {
  return (
    <div className="border-b border-r border-[var(--line)] bg-white p-4 last:border-r-0 md:last:border-b-0">
      <p className="text-[12px] font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-[28px] font-semibold tracking-tight text-[var(--text)]">{value}</p>
      <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">{note}</p>
    </div>
  );
}
