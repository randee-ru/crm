export type NavigationItem = {
  label: string;
  href: string;
};

export type HealthcheckResponse = {
  status: "ok";
  service: string;
};

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  initials: string;
  avatar_url: string | null;
};

export type CompanyMembershipRecord = {
  id: number;
  company_name: string;
  company_slug: string;
  branch_name: string | null;
  role: string;
  is_active: boolean;
};

export type CompanyContext = {
  id: number;
  name: string;
  slug: string;
  clients_count: number;
  clients_active_count?: number;
  role?: string;
  branch_name?: string | null;
  disabled_modules?: string[];
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  memberships: CompanyMembershipRecord[];
  company: CompanyContext;
};

export type ClientRecord = {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  is_active: boolean;
  client_status?: string | null;
  client_status_label?: string | null;
  branch_name: string | null;
  membership_status: string | null;
  membership_title: string | null;
  membership_start: string | null;
  membership_end: string | null;
  visit_count?: number;
  ltv_total?: string;
  manager_name?: string | null;
  last_visit_date?: string | null;
  created_at: string;
};

export type ClientCallRecord = {
  id: number;
  direction: "incoming" | "outgoing";
  status: string;
  caller_phone: string;
  target_phone: string;
  line_name: string;
  line_display: string;
  duration: number;
  started_at: string;
  has_recording: boolean;
  transcription_text: string;
  call_summary: string;
};

export type ClientProfile = ClientDetail & {
  external_id: string;
  middle_name: string;
  gender: string;
  passport: string;
  card_number: string;
  card_status: string;
  client_status: string;
  client_status_label: string;
  manager_name: string;
  lead_source: string;
  acquisition_channel: string;
  club_name: string;
  contract_ref: string;
  ltv_total: string;
  visit_count: number;
  visit_frequency: string;
  max_break_days: number;
  registration_date: string | null;
  last_visit_date: string | null;
  last_payment_date: string | null;
  last_interaction_date: string | null;
  membership_name: string;
  membership_status: string;
  membership_start: string | null;
  membership_end: string | null;
  tags: string[];
  interests: string[];
  messages: ClientMessageRecord[];
  leads: ClientLeadRecord[];
  visits: ClientVisitRecord[];
  sales: ClientSaleRecord[];
  deals: ClientDealRecord[];
  lessons: ClientLessonRecord[];
  memberships: ClientMembershipSummary[];
  calls: ClientCallRecord[];
};

export type ClientMessageRecord = {
  id: number;
  channel: string;
  message_type: string;
  kind: string;
  source: string;
  phone: string;
  body: string;
  sent_at: string | null;
};

export type ClientLeadRecord = {
  id: number;
  title: string;
  status: string;
  channel: string;
  club_name: string;
  manager_name: string;
  comment: string;
  ad_source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  lead_date: string | null;
};

export type ClientVisitRecord = {
  id: number;
  checked_in_at: string | null;
  checked_out_at: string | null;
  duration_minutes: number | null;
  room: string;
  visit_source: string;
  locker_key: string;
  status: string;
};

export type ClientSaleRecord = {
  id: number;
  title: string;
  external_number: string;
  total_amount: string;
  paid_amount: string;
  promo_code: string;
  installment_info: string;
  status: string;
  sold_at: string | null;
  created_at: string;
};

export type ClientDealRecord = {
  id: number;
  title: string;
  description: string;
  amount: string;
  deal_type: string;
  source_name: string;
  channel: string;
  result_label: string;
  manager_name: string;
  stage_name: string;
  closed_at: string | null;
  created_at: string;
};

export type ClientLessonRecord = {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  room: string;
  lesson_type: string;
  payment_basis: string;
  source: string;
};

export type ClientMembershipSummary = {
  id: number;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  price: string;
};

export type ClientDetail = ClientRecord & {
  branch_id: number | null;
  notes: string;
  updated_at: string;
};

export type BranchOption = {
  id: number;
  name: string;
  slug: string;
  is_primary: boolean;
};

export type MembershipRecord = {
  id: number;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  visit_limit: number | null;
  visits_used: number;
  remaining_visits: number | null;
  price: string;
  client_name: string;
  client_phone: string;
  branch_name: string | null;
  client_id: number | null;
  branch_id: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type MembershipWriteInput = {
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  visit_limit?: number | null;
  visits_used?: number;
  price?: string | number;
  notes?: string;
  client_id?: number | null;
  branch_id?: number | null;
};

export type StaffCompanySummary = {
  id: number;
  name: string;
  slug: string;
};

export type StaffMembershipRecord = {
  id: number;
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: string;
  is_active: boolean;
  branch_id: number | null;
  branch_name: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffInvitationRecord = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  status: string;
  branch_id: number | null;
  branch_name: string | null;
  message: string;
  invite_url: string;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffDashboardStats = {
  total_members: number;
  active_members: number;
  admins: number;
  pending_invites: number;
};

export type StaffDashboardResponse = {
  company: StaffCompanySummary;
  memberships: StaffMembershipRecord[];
  invitations: StaffInvitationRecord[];
  branches: BranchOption[];
  stats: StaffDashboardStats;
};

export type StaffMembershipUpdateInput = {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  branch_id?: number | null;
};

export type StaffInvitationWriteInput = {
  email: string;
  full_name: string;
  role: string;
  message?: string;
  expires_at?: string | null;
  branch_id?: number | null;
};

export type ClientWriteInput = {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  notes?: string;
  branch_id?: number | null;
  is_active?: boolean;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ClientListFilters = {
  search?: string;
  clientStatus?: string;
  birthDateFrom?: string;
  birthDateTo?: string;
  birthdayMonth?: string;
  membershipExpiresInDays?: string;
  page?: number;
};

export type TaskRecord = {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  client_name: string | null;
  branch_name: string | null;
  assigned_to_name: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskDetail = TaskRecord & {
  description: string;
  client_id: number | null;
  branch_id: number | null;
  assigned_to_id: number | null;
  updated_at: string;
};

export type TaskWriteInput = {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  due_at?: string | null;
  client_id?: number | null;
  branch_id?: number | null;
};

export type DealStageRecord = {
  id: number;
  name: string;
  code: string;
  color: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
  deals_count?: number;
};

export type DealPipelineRecord = {
  id: number;
  name: string;
  slug: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  stages: DealStageRecord[];
};

export type DealRecord = {
  id: number;
  title: string;
  amount: string;
  pipeline_id: number;
  stage_id: number;
  stage_code: string;
  stage_label: string;
  stage_color: string;
  client_name: string | null;
  branch_name: string | null;
  assigned_to_name: string | null;
  created_at: string;
};

export type DealDetail = DealRecord & {
  client_id: number | null;
  branch_id: number | null;
  assigned_to_id: number | null;
  updated_at: string;
};

export type DealWriteInput = {
  title?: string;
  amount?: string | number;
  pipeline_id?: number;
  stage_id?: number;
  client_id?: number | null;
  branch_id?: number | null;
};

export type PipelineWriteInput = {
  name: string;
  slug: string;
  is_default?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

export type StageWriteInput = {
  name: string;
  code: string;
  color?: string;
  sort_order?: number;
  is_won?: boolean;
  is_lost?: boolean;
};

export type TaskListFilters = {
  search?: string;
  status?: string;
  due?: "today" | "overdue";
};

export type ScheduleEventRecord = {
  id: number;
  title: string;
  trainer_name: string;
  room: string;
  starts_at: string;
  ends_at: string;
  status: string;
  client_name: string | null;
  branch_name: string | null;
};

export type ScheduleEventDetail = ScheduleEventRecord & {
  notes: string;
  client_id: number | null;
  branch_id: number | null;
  trainer_id: number | null;
  created_at: string;
  updated_at: string;
};

export type ScheduleWriteInput = {
  title: string;
  trainer_name?: string;
  room?: string;
  starts_at: string;
  ends_at: string;
  status?: string;
  notes?: string;
  client_id?: number | null;
  branch_id?: number | null;
};

export type GroupProgramRecord = {
  id: number;
  title: string;
  code: string;
  description: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

export type GroupScheduleSlotRecord = {
  id: number;
  program: number;
  program_title: string;
  program_code: string;
  program_color: string;
  program_description: string;
  display_title: string;
  custom_title: string;
  color: string;
  display_color: string;
  max_participants: number | null;
  max_participants_effective: number;
  enrollment_count: number;
  session_date: string;
  weekday: number;
  start_time: string;
  end_time: string;
  room: string;
  trainer_name: string;
  trainer: number | null;
  trainer_display: string;
  description: string;
  restrictions: string;
  branch: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GroupScheduleSlotWriteInput = {
  program: number;
  session_date: string;
  start_time: string;
  end_time: string;
  room?: string;
  trainer_name?: string;
  trainer?: number | null;
  description?: string;
  restrictions?: string;
  custom_title?: string;
  color?: string;
  max_participants?: number | null;
  branch?: number | null;
  is_active?: boolean;
};

export type ScheduleSettingsRecord = {
  default_max_participants: number;
  sms_reminder_hours: number[];
  is_published: boolean;
  publish_weeks_ahead: number;
  embed_token: string;
  updated_at: string;
};

export type PublicScheduleSlotRecord = {
  id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  display_title: string;
  display_color: string;
  program_code: string;
  room: string;
  trainer_display: string;
  description: string;
  restrictions: string;
};

export type PublicSchedulePayload = {
  company_name: string;
  company_slug: string;
  weeks_ahead: number;
  date_from: string;
  date_to: string;
  slots: PublicScheduleSlotRecord[];
};

export type ScheduleSmsIntegrationRecord = {
  id: number;
  provider: string;
  title: string;
  sender_name: string;
  webhook_url: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  is_primary: boolean;
  has_api_key: boolean;
  has_api_secret: boolean;
  updated_at: string;
};

export type ScheduleSmsIntegrationWriteInput = {
  provider: string;
  title?: string;
  api_key?: string;
  api_secret?: string;
  sender_name?: string;
  webhook_url?: string;
  settings?: Record<string, unknown>;
  is_active?: boolean;
  is_primary?: boolean;
};

export type GroupSlotEnrollmentRecord = {
  id: number;
  slot: number;
  client: number;
  client_name: string;
  client_phone: string;
  status: "confirmed" | "cancelled" | "waitlist";
  notes: string;
  created_at: string;
};

export type TrainerRecord = {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  specialization: string;
  photo_url: string | null;
  trains_gym_floor: boolean;
  trains_group_programs: boolean;
  rent_paid_current_month: boolean;
  is_active: boolean;
  branch_name: string | null;
  created_at: string;
};

export type TrainerRentPayment = {
  id: number;
  period: string;
  amount: string;
  paid_at: string;
  note: string;
  created_at: string;
};

export type TrainerAccessCardStatus = "active" | "blocked" | "lost";

export type TrainerAccessCard = {
  id: number;
  card_number: string;
  status: TrainerAccessCardStatus;
  status_label: string;
  issued_at: string;
  note: string;
  created_at: string;
};

export type TrainerDetail = TrainerRecord & {
  branch_id: number | null;
  achievements: string;
  bio: string;
  updated_at: string;
  rent_payments: TrainerRentPayment[];
  access_cards: TrainerAccessCard[];
};

export type TrainerWriteInput = {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  specialization?: string;
  achievements?: string;
  bio?: string;
  trains_gym_floor?: boolean;
  trains_group_programs?: boolean;
  is_active?: boolean;
  branch_id?: number | null;
};

export type TrainerRentPaymentWriteInput = {
  period: string;
  amount: string;
  paid_at?: string;
  note?: string;
};

export type TrainerAccessCardWriteInput = {
  card_number: string;
  status?: TrainerAccessCardStatus;
  issued_at?: string;
  note?: string;
};

export type BookingRecord = {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  source: string;
  client_name: string | null;
  trainer_name: string | null;
  branch_name: string | null;
  membership_title: string | null;
  created_at: string;
};

export type BookingDetail = BookingRecord & {
  notes: string;
  client_id: number | null;
  trainer_id: number | null;
  branch_id: number | null;
  membership_id: number | null;
  updated_at: string;
};

export type BookingWriteInput = {
  title: string;
  starts_at: string;
  ends_at: string;
  status?: string;
  source?: string;
  notes?: string;
  client_id?: number | null;
  trainer_id?: number | null;
  branch_id?: number | null;
  membership_id?: number | null;
};

export type AttendanceRecord = {
  id: number;
  status: string;
  client_name: string;
  trainer_name: string | null;
  branch_name: string | null;
  membership_title: string | null;
  booking_title: string | null;
  locker_key: string | null;
  duration_label: string | null;
  is_in_club: boolean;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
};

export type AttendanceDetail = AttendanceRecord & {
  notes: string;
  client_id: number | null;
  trainer_id: number | null;
  branch_id: number | null;
  membership_id: number | null;
  booking_id: number | null;
  updated_at: string;
};

export type AttendanceWriteInput = {
  status?: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  notes?: string;
  client_id?: number | null;
  trainer_id?: number | null;
  branch_id?: number | null;
  membership_id?: number | null;
  booking_id?: number | null;
};

export type AttendanceOccupancyPoint = {
  time: string;
  count: number;
};

export type ChatRoomRecord = {
  id: number;
  title: string;
  slug: string;
  room_type: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_author: string | null;
};

export type ChatMessageRecord = {
  id: number;
  body: string;
  author_name: string;
  author_initials: string;
  created_at: string;
};

export type DriveItemRecord = {
  id: number;
  parent_id: number | null;
  name: string;
  item_type: "folder" | "file";
  mime_type: string;
  size_bytes: number;
  is_trashed: boolean;
  created_by_name: string | null;
  download_url: string | null;
  created_at: string;
  updated_at: string;
};

export type DriveBreadcrumbItem = {
  id: number | null;
  name: string;
};

export type MailAccountRecord = {
  id: number;
  provider: string;
  provider_label: string;
  email: string;
  display_name: string;
  is_active: boolean;
  unread_count: number;
  created_at: string;
};

export type MailMessageRecord = {
  id: number;
  folder: string;
  subject: string;
  body: string;
  from_name: string;
  from_email: string;
  to_emails: string;
  is_read: boolean;
  sent_at: string;
  created_at: string;
};

export type MarketingIntegrationRecord = {
  id: number;
  provider: string;
  provider_label: string;
  title: string;
  status: string;
  status_label: string;
  settings: Record<string, string>;
  is_active: boolean;
  connected_by_name: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingCampaignRecord = {
  id: number;
  channel: string;
  channel_label: string;
  title: string;
  subject: string;
  body: string;
  status: string;
  status_label: string;
  recipients_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractRecord = {
  id: number;
  title: string;
  contract_date: string;
  prefix: string;
  is_signed: boolean;
  number: string;
  branch_name: string | null;
  client_name: string;
  client_id: number;
  template_name: string;
  membership_label: string;
  created_at: string;
};

export type TelephonyIntegrationRecord = {
  id: number;
  provider: string;
  api_url: string;
  has_api_key: boolean;
  has_api_secret: boolean;
  is_active: boolean;
  last_synced_at: string | null;
  settings: Record<string, unknown>;
};

export type CallLogRecord = {
  id: number;
  external_id: string;
  direction: "incoming" | "outgoing";
  status: "answered" | "missed" | "busy" | "voicemail";
  caller_phone: string;
  target_phone: string;
  line_name: string;
  line_display: string;
  recording_id: string;
  recording_url: string;
  started_at: string;
  duration: number;
  source: string;
  client_id: number | null;
  client_name: string | null;
  has_recording: boolean;
  has_transcription: boolean;
  transcription_text: string;
  call_summary: string;
  call_report: string;
  created_at: string;
};

export type TelephonyLineStat = {
  key: string;
  label: string;
  number: string | null;
  count: number;
};

export type TelephonyDashboardStats = {
  total_calls: number;
  today_calls: number;
  today_answered: number;
  today_missed: number;
  with_recording: number;
  with_transcription: number;
  lines?: TelephonyLineStat[];
};

export type CallListFilters = {
  period?: "today" | "yesterday" | "week" | "month";
  status?: "answered" | "missed" | "";
  search?: string;
  line?: string;
  page?: number;
};

export type SaleRecord = {
  id: number;
  title: string;
  status: string;
  total_amount: string;
  discount_amount: string;
  paid_amount: string;
  client_name: string | null;
  branch_name: string | null;
  membership_title: string | null;
  trainer_name: string | null;
  created_at: string;
};

export type PaymentRecord = {
  id: number;
  amount: string;
  method: string;
  status: string;
  paid_at: string;
  client_name: string | null;
  branch_name: string | null;
  sale_title: string | null;
  membership_title: string | null;
  created_at: string;
};

export type DailyReportMetrics = {
  incoming_calls: number;
  outgoing_calls: number;
  outgoing_dialed_base: number;
  total_calls: number;
  telegram: number;
  max: number;
  whatsapp: number;
  site_applications: number;
  new_site_applications: number;
  guest_visits: number;
  day_sales: number;
  day_sales_amount: string;
  meetings_scheduled: number;
  refusals: number;
  renewals: number;
  negative_result: number;
  no_result: number;
  cash_op: string;
  reviews: number;
};

export type DailyReportResponse = {
  report_date: string;
  generated_at: string;
  company: {
    id: number;
    name: string;
    slug: string;
  };
  metrics: DailyReportMetrics;
  source_notes: string[];
  plan_items: string[];
};

export type NotificationRecord = {
  id: number;
  kind: "info" | "success" | "warning" | "error" | "task" | "crm";
  title: string;
  body: string;
  target_url: string;
  is_read: boolean;
  read_at: string | null;
  source_app: string;
  source_model: string;
  source_object_id: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AnalyticsOverviewResponse = {
  generated_at: string;
  company: {
    id: number;
    name: string;
    slug: string;
  };
  range: {
    days: number;
    start_date: string;
    end_date: string;
  };
  totals: {
    clients_total: number;
    clients_active: number;
    bookings: number;
    attendances: number;
    sales_amount: string;
    payments_amount: string;
    unread_notifications: number;
  };
  series: {
    date: string;
    calls: number;
    bookings: number;
    attendances: number;
    sales_amount: string;
    payments_amount: string;
  }[];
  top_sources: {
    channel: string;
    total: number;
  }[];
};

export type ScheduleListFilters = {
  search?: string;
  when?: "today" | "upcoming";
  status?: string;
};

export type ActionState = {
  error?: string;
  success?: string;
};

export type IntegrationProvider =
  | "mango"
  | "sigur"
  | "rfid"
  | "turnstile"
  | "payment"
  | "sms"
  | "partner";

export type IntegrationConnectionRecord = {
  id: number;
  company: number;
  provider: IntegrationProvider;
  provider_label: string;
  name: string;
  status: "draft" | "active" | "error" | "archived";
  status_label: string;
  external_id: string;
  config: Record<string, unknown>;
  last_synced_at: string | null;
  last_error: string;
  created_at: string;
  updated_at: string;
};

export type IntegrationConnectionWriteInput = {
  provider: IntegrationProvider;
  name: string;
  status?: string;
  external_id?: string;
};
