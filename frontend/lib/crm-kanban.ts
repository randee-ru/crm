export function formatDealAmount(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "0 ₽";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatKanbanCardCreatedAt(value: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function buildCrmDashboardHref(
  view: "kanban" | "list",
  params?: Record<string, string | undefined>,
) {
  const search = new URLSearchParams();
  if (view === "list") {
    search.set("view", "list");
  }
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}
