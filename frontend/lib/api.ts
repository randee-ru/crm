import type {
  BranchOption,
  BookingRecord,
  BookingDetail,
  AttendanceRecord,
  AttendanceDetail,
  AttendanceOccupancyPoint,
  ChatMessageRecord,
  ChatRoomRecord,
  DriveBreadcrumbItem,
  DriveItemRecord,
  MailAccountRecord,
  MailMessageRecord,
  IntegrationConnectionRecord,
  MarketingCampaignRecord,
  MarketingIntegrationRecord,
  ContractRecord,
  NotificationRecord,
  CallListFilters,
  CallLogRecord,
  ClientDetail,
  ClientListFilters,
  ClientProfile,
  ClientRecord,
  CompanyContext,
  DealDetail,
  DealPipelineRecord,
  DealRecord,
  DailyReportResponse,
  GroupProgramRecord,
  GroupScheduleSlotRecord,
  ScheduleSettingsRecord,
  ScheduleSmsIntegrationRecord,
  HealthcheckResponse,
  PaginatedResponse,
  MembershipRecord,
  StaffDashboardResponse,
  StaffMembershipRecord,
  ScheduleEventDetail,
  ScheduleEventRecord,
  ScheduleListFilters,
  PaymentRecord,
  SaleRecord,
  AnalyticsOverviewResponse,
  TrainerRecord,
  TaskDetail,
  TaskListFilters,
  TaskRecord,
  TrainerDetail,
  TelephonyDashboardStats,
  TelephonyIntegrationRecord,
} from "@/lib/types";
import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import { DEFAULT_COMPANY_SLUG } from "@/lib/auth-cookies";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(await getAuthHeaders()),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      `Не удалось получить данные от backend (${API_BASE_URL}). Проверьте, что сервер запущен.`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getHealthcheck(): Promise<HealthcheckResponse> {
  const response = await fetch(`${API_BASE_URL}/health/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthcheckResponse>;
}

function buildClientQuery(companySlug: string, filters: ClientListFilters = {}): string {
  const params = new URLSearchParams({ company: companySlug });

  if (filters.search && filters.search.length >= 3) {
    params.set("search", filters.search);
  }

  if (filters.clientStatus) {
    params.set("client_status", filters.clientStatus);
  }

  if (filters.birthDateFrom) {
    params.set("birth_date_from", filters.birthDateFrom);
  }

  if (filters.birthDateTo) {
    params.set("birth_date_to", filters.birthDateTo);
  }

  if (filters.birthdayMonth) {
    params.set("birthday_month", filters.birthdayMonth);
  }

  if (filters.membershipExpiresInDays) {
    params.set("membership_expires_in_days", filters.membershipExpiresInDays);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  return params.toString();
}

export async function getClientsPaginated(
  companySlug?: string,
  filters: ClientListFilters = {},
): Promise<PaginatedResponse<ClientRecord>> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const query = buildClientQuery(slug, filters);
  return request<PaginatedResponse<ClientRecord>>(`/api/v1/clients/?${query}`);
}

export async function getCompanyContext(
  companySlug?: string,
): Promise<CompanyContext> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<CompanyContext>(`/api/v1/company/?company=${encodeURIComponent(slug)}`);
}

export async function getClients(
  companySlug?: string,
  filters: ClientListFilters = {},
): Promise<ClientRecord[]> {
  const page = await getClientsPaginated(companySlug, filters);
  return page.results;
}

export async function getClient(clientId: number, companySlug?: string): Promise<ClientDetail> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<ClientDetail>(
    `/api/v1/clients/${clientId}/?company=${encodeURIComponent(slug)}`,
  );
}

export async function getClientProfile(clientId: number, companySlug?: string): Promise<ClientProfile> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<ClientProfile>(
    `/api/v1/clients/${clientId}/profile/?company=${encodeURIComponent(slug)}`,
  );
}

export async function getBranches(companySlug?: string): Promise<BranchOption[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<BranchOption[]>(`/api/v1/branches/?company=${encodeURIComponent(slug)}`);
}

export async function getMemberships(
  companySlug?: string,
  filters: { search?: string; status?: string } = {},
): Promise<MembershipRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  return request<MembershipRecord[]>(`/api/v1/memberships/?${params.toString()}`);
}

export async function getMembership(
  membershipId: number,
  companySlug?: string,
): Promise<MembershipRecord> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<MembershipRecord>(
    `/api/v1/memberships/${membershipId}/?company=${encodeURIComponent(slug)}`,
  );
}

export async function getEmployeesDashboard(
  companySlug?: string,
  search?: string,
): Promise<StaffDashboardResponse> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (search) {
    params.set("search", search);
  }
  return request<StaffDashboardResponse>(`/api/v1/staff/dashboard/?${params.toString()}`);
}

export async function getEmployeeMembership(
  membershipId: number,
  companySlug?: string,
): Promise<StaffMembershipRecord> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<StaffMembershipRecord>(
    `/api/v1/staff/memberships/${membershipId}/?company=${encodeURIComponent(slug)}`,
  );
}

function buildTaskQuery(companySlug: string, filters: TaskListFilters = {}): string {
  const params = new URLSearchParams({ company: companySlug });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.due) params.set("due", filters.due);
  return params.toString();
}

export async function getTasks(
  companySlug?: string,
  filters: TaskListFilters = {},
): Promise<TaskRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<TaskRecord[]>(`/api/v1/tasks/?${buildTaskQuery(slug, filters)}`);
}

export async function getTask(taskId: number, companySlug?: string): Promise<TaskDetail> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<TaskDetail>(`/api/v1/tasks/${taskId}/?company=${encodeURIComponent(slug)}`);
}

function buildDealQuery(companySlug: string, search?: string, pipelineId?: string): string {
  const params = new URLSearchParams({ company: companySlug });
  if (search) params.set("search", search);
  if (pipelineId) params.set("pipeline", pipelineId);
  return params.toString();
}

export async function getDeals(
  companySlug?: string,
  search?: string,
  pipelineId?: string,
): Promise<DealRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<DealRecord[]>(`/api/v1/deals/?${buildDealQuery(slug, search, pipelineId)}`);
}

export async function getPipelines(companySlug?: string): Promise<DealPipelineRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<DealPipelineRecord[]>(`/api/v1/pipelines/?company=${encodeURIComponent(slug)}`);
}

export async function getDeal(dealId: number, companySlug?: string): Promise<DealDetail> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<DealDetail>(
    `/api/v1/deals/${dealId}/?company=${encodeURIComponent(slug)}`,
  );
}

function buildScheduleQuery(companySlug: string, filters: ScheduleListFilters = {}): string {
  const params = new URLSearchParams({ company: companySlug });
  if (filters.search) params.set("search", filters.search);
  if (filters.when) params.set("when", filters.when);
  if (filters.status) params.set("status", filters.status);
  return params.toString();
}

export async function getScheduleEvents(
  companySlug?: string,
  filters: ScheduleListFilters = {},
): Promise<ScheduleEventRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<ScheduleEventRecord[]>(`/api/v1/schedule/?${buildScheduleQuery(slug, filters)}`);
}

export async function getScheduleEvent(
  eventId: number,
  companySlug?: string,
): Promise<ScheduleEventDetail> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<ScheduleEventDetail>(
    `/api/v1/schedule/${eventId}/?company=${encodeURIComponent(slug)}`,
  );
}

export async function getGroupPrograms(companySlug?: string): Promise<GroupProgramRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<GroupProgramRecord[]>(`/api/v1/schedule/programs/?company=${encodeURIComponent(slug)}`);
}

export async function getGroupScheduleSlots(
  companySlug?: string,
  from?: string,
  to?: string,
): Promise<GroupScheduleSlotRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return request<GroupScheduleSlotRecord[]>(`/api/v1/schedule/group-slots/?${params.toString()}`);
}

export async function getScheduleSettings(companySlug?: string): Promise<ScheduleSettingsRecord> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<ScheduleSettingsRecord>(`/api/v1/schedule/settings/?company=${encodeURIComponent(slug)}`);
}

export async function getScheduleSmsIntegrations(companySlug?: string): Promise<ScheduleSmsIntegrationRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<ScheduleSmsIntegrationRecord[]>(`/api/v1/schedule/sms-integrations/?company=${encodeURIComponent(slug)}`);
}

export async function getTrainers(companySlug?: string): Promise<TrainerRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<TrainerRecord[]>(`/api/v1/trainers/?company=${encodeURIComponent(slug)}`);
}

export async function getTrainer(trainerId: number, companySlug?: string): Promise<TrainerDetail> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<TrainerDetail>(`/api/v1/trainers/${trainerId}/?company=${encodeURIComponent(slug)}`);
}

export async function getBookings(companySlug?: string): Promise<BookingRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<BookingRecord[]>(`/api/v1/bookings/?company=${encodeURIComponent(slug)}`);
}

export async function getBooking(bookingId: number, companySlug?: string): Promise<BookingDetail> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<BookingDetail>(`/api/v1/bookings/${bookingId}/?company=${encodeURIComponent(slug)}`);
}

export type AttendanceListFilters = {
  when?: "now" | "today" | "yesterday" | "date";
  date?: string;
  person?: "clients" | "staff" | "all";
  search?: string;
};

export async function getAttendanceRecords(
  companySlug?: string,
  filters: AttendanceListFilters = {},
): Promise<AttendanceRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (filters.when) params.set("when", filters.when);
  if (filters.date) params.set("date", filters.date);
  if (filters.person) params.set("person", filters.person);
  if (filters.search) params.set("search", filters.search);
  return request<AttendanceRecord[]>(`/api/v1/attendance/?${params.toString()}`);
}

export async function getAttendanceRecord(
  attendanceId: number,
  companySlug?: string,
): Promise<AttendanceDetail> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<AttendanceDetail>(
    `/api/v1/attendance/${attendanceId}/?company=${encodeURIComponent(slug)}`,
  );
}

export async function getAttendanceOccupancy(companySlug?: string): Promise<AttendanceOccupancyPoint[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<AttendanceOccupancyPoint[]>(
    `/api/v1/attendance/occupancy/?company=${encodeURIComponent(slug)}`,
  );
}

export async function getChatRooms(companySlug?: string): Promise<ChatRoomRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<ChatRoomRecord[]>(`/api/v1/chats/?company=${encodeURIComponent(slug)}`);
}

export async function getChatMessages(roomId: number, companySlug?: string): Promise<ChatMessageRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<ChatMessageRecord[]>(
    `/api/v1/chats/${roomId}/messages/?company=${encodeURIComponent(slug)}`,
  );
}

export async function getDriveItems(
  companySlug?: string,
  options: { parent?: number | null; trashed?: boolean; search?: string } = {},
): Promise<DriveItemRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (options.parent) params.set("parent", String(options.parent));
  if (options.trashed) params.set("trashed", "1");
  if (options.search) params.set("search", options.search);
  return request<DriveItemRecord[]>(`/api/v1/drive/items/?${params.toString()}`);
}

export async function getDriveBreadcrumb(
  itemId: number,
  companySlug?: string,
): Promise<DriveBreadcrumbItem[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<DriveBreadcrumbItem[]>(
    `/api/v1/drive/items/${itemId}/breadcrumb/?company=${encodeURIComponent(slug)}`,
  );
}

export async function getMailAccounts(companySlug?: string): Promise<MailAccountRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<MailAccountRecord[]>(`/api/v1/mail/accounts/?company=${encodeURIComponent(slug)}`);
}

export async function getMailMessages(
  accountId: number,
  options: { folder?: string; search?: string } = {},
  companySlug?: string,
): Promise<MailMessageRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (options.folder) params.set("folder", options.folder);
  if (options.search) params.set("search", options.search);
  return request<MailMessageRecord[]>(
    `/api/v1/mail/accounts/${accountId}/messages/?${params.toString()}`,
  );
}

export async function getMarketingIntegrations(companySlug?: string): Promise<MarketingIntegrationRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<MarketingIntegrationRecord[]>(
    `/api/v1/marketing/integrations/?company=${encodeURIComponent(slug)}`,
  );
}

export async function getIntegrationConnections(companySlug?: string): Promise<IntegrationConnectionRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<IntegrationConnectionRecord[]>(`/api/v1/integrations/?company=${encodeURIComponent(slug)}`);
}

export async function getMarketingCampaigns(
  options: { channel?: string; status?: string } = {},
  companySlug?: string,
): Promise<MarketingCampaignRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (options.channel) params.set("channel", options.channel);
  if (options.status) params.set("status", options.status);
  return request<MarketingCampaignRecord[]>(`/api/v1/marketing/campaigns/?${params.toString()}`);
}

export async function getContracts(
  options: { search?: string; signed?: "0" | "1" } = {},
  companySlug?: string,
): Promise<ContractRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (options.search) params.set("search", options.search);
  if (options.signed) params.set("signed", options.signed);
  return request<ContractRecord[]>(`/api/v1/contracts/?${params.toString()}`);
}

export async function getSales(companySlug?: string): Promise<SaleRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<SaleRecord[]>(`/api/v1/sales/?company=${encodeURIComponent(slug)}`);
}

export async function getPayments(companySlug?: string): Promise<PaymentRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<PaymentRecord[]>(`/api/v1/payments/?company=${encodeURIComponent(slug)}`);
}

export async function getDailyReport(
  companySlug?: string,
  date?: string,
): Promise<DailyReportResponse> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (date) params.set("date", date);
  return request<DailyReportResponse>(`/api/v1/reports/daily/?${params.toString()}`);
}

export async function getAnalyticsOverview(
  companySlug?: string,
  days = 30,
): Promise<AnalyticsOverviewResponse> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug, days: String(days) });
  return request<AnalyticsOverviewResponse>(`/api/v1/reports/overview/?${params.toString()}`);
}

export async function getNotifications(
  companySlug?: string,
  unreadOnly = false,
): Promise<NotificationRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const params = new URLSearchParams({ company: slug });
  if (unreadOnly) params.set("unread", "true");
  return request<NotificationRecord[]>(`/api/v1/notifications/?${params.toString()}`);
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function getCompanySlug(): Promise<string> {
  try {
    return await getCompanySlugFromCookie();
  } catch {
    return DEFAULT_COMPANY_SLUG;
  }
}

export const taskStatusLabels: Record<string, string> = {
  open: "Открыта",
  in_progress: "В работе",
  done: "Выполнена",
  cancelled: "Отменена",
};

export const taskPriorityLabels: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
};

export const scheduleStatusLabels: Record<string, string> = {
  planned: "Запланировано",
  completed: "Завершено",
  cancelled: "Отменено",
};

export const trainerStatusLabels: Record<string, string> = {
  true: "Активен",
  false: "Неактивен",
};

export const bookingStatusLabels: Record<string, string> = {
  draft: "Черновик",
  confirmed: "Подтверждено",
  completed: "Завершено",
  cancelled: "Отменено",
  no_show: "Не пришёл",
};

export const attendanceStatusLabels: Record<string, string> = {
  checked_in: "Пришёл",
  late: "Опоздал",
  no_show: "Не пришёл",
  cancelled: "Отменено",
};

export const saleStatusLabels: Record<string, string> = {
  draft: "Черновик",
  pending: "В ожидании",
  completed: "Завершена",
  cancelled: "Отменена",
};

export const paymentStatusLabels: Record<string, string> = {
  pending: "Ожидается",
  succeeded: "Оплачен",
  failed: "Не прошёл",
  refunded: "Возврат",
};

export const paymentMethodLabels: Record<string, string> = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
  online: "Онлайн",
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatMoney(value: string | number): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}
export const membershipStatusLabels: Record<string, string> = {
  draft: "Черновик",
  active: "Активен",
  frozen: "Заморожен",
  expired: "Истёк",
  cancelled: "Отменён",
};

export const clientStatusLabels: Record<string, string> = {
  lead: "Потенциальный",
  active: "Действующий",
  former: "Бывший",
  rejected: "Отказ",
};

export function formatClientDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function getClientInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export function getMembershipDealLabel(client: ClientRecord): string {
  if (!client.membership_status) {
    return "Дела отсутствуют";
  }

  return membershipStatusLabels[client.membership_status] ?? client.membership_status;
}

export function getClientPathLabel(client: ClientRecord): string {
  if (client.membership_title) {
    return client.membership_title;
  }

  return client.is_active ? "Потенциальный член клуба" : "Неактивен";
}

function buildCallQuery(companySlug: string, filters: CallListFilters = {}): string {
  const params = new URLSearchParams({ company: companySlug });
  if (filters.period) params.set("period", filters.period);
  if (filters.status) params.set("status", filters.status);
  if (filters.search && filters.search.length >= 3) params.set("search", filters.search);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

export async function getTelephonyIntegration(companySlug?: string): Promise<TelephonyIntegrationRecord> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<TelephonyIntegrationRecord>(`/api/v1/telephony/integration/?company=${encodeURIComponent(slug)}`);
}

export async function getTelephonyDashboard(companySlug?: string): Promise<TelephonyDashboardStats> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<TelephonyDashboardStats>(`/api/v1/telephony/dashboard/?company=${encodeURIComponent(slug)}`);
}

export async function getCallsPaginated(
  companySlug?: string,
  filters: CallListFilters = {},
): Promise<PaginatedResponse<CallLogRecord>> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  return request<PaginatedResponse<CallLogRecord>>(`/api/v1/telephony/calls/?${buildCallQuery(slug, filters)}`);
}

export function formatCallDuration(seconds: number): string {
  if (seconds <= 0) return "0 с";
  if (seconds < 60) return `${seconds} с`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} м ${rest} с` : `${minutes} м`;
}

export function formatPhoneDisplay(value: string | null | undefined): string {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
  }
  return value?.trim() || "—";
}

export type {
  BranchOption,
  CallListFilters,
  CallLogRecord,
  ClientDetail,
  ClientListFilters,
  ClientProfile,
  ClientRecord,
  CompanyContext,
  DealDetail,
  DealPipelineRecord,
  DealRecord,
  DailyReportResponse,
  HealthcheckResponse,
  ScheduleEventDetail,
  ScheduleEventRecord,
  ScheduleListFilters,
  TaskDetail,
  TaskListFilters,
  TaskRecord,
  TrainerDetail,
  TelephonyDashboardStats,
  TelephonyIntegrationRecord,
};
