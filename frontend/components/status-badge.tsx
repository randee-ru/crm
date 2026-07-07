type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "bg-[#eef2f4] text-[#525c69]",
  success: "bg-[#e8f7d4] text-[#5e7a1f]",
  warning: "bg-[#fff4d6] text-[#9a6700]",
  danger: "bg-[#ffe3e2] text-[#b42318]",
  info: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}

export function taskStatusTone(status: string): StatusBadgeProps["tone"] {
  switch (status) {
    case "done":
      return "success";
    case "in_progress":
      return "info";
    case "cancelled":
      return "danger";
    default:
      return "warning";
  }
}

export function membershipStatusTone(status: string): StatusBadgeProps["tone"] {
  switch (status) {
    case "active":
      return "success";
    case "draft":
      return "neutral";
    case "frozen":
      return "info";
    case "expired":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}
