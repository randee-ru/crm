export function formatDealAmount(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "0 ₽";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildCrmDashboardHref(
  view: "kanban" | "list",
  params?: Record<string, string | undefined>,
) {
  if (view === "list") {
    const search = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value) search.set(key, value);
      }
    }
    const query = search.toString();
    return query ? `/dashboard/clients?${query}` : "/dashboard/clients";
  }

  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}
