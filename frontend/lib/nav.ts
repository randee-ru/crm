export const mainNavigation = [
  { label: "Обзор", href: "/" },
  { label: "Логин", href: "/login" },
  { label: "Рабочий стол", href: "/dashboard" },
] as const;

export const workspaceNavigation = [
  { id: "messages", label: "Мессенджер", href: "/dashboard/messages", icon: "messages" },
  { id: "feed", label: "Лента", href: "/", icon: "home" },
  { id: "disk", label: "Диск", href: "/dashboard/drive", icon: "disk" },
  { id: "mail", label: "Почта", href: "/dashboard/mail", icon: "mail" },
  { id: "tasks", label: "Задачи и проекты", href: "/dashboard/tasks", icon: "tasks" },
  { id: "crm", label: "CRM", href: "/dashboard", icon: "crm" },
  { id: "marketing", label: "Маркетинг", href: "/dashboard/marketing", icon: "marketing" },
  { id: "schedule", label: "Расписание", href: "/dashboard/schedule", icon: "calendar" },
  { id: "clients", label: "Клиенты", href: "/dashboard/clients", icon: "clients" },
  { id: "contracts", label: "Договоры", href: "/dashboard/contracts", icon: "contracts" },
  { id: "memberships", label: "Абонементы", href: "/dashboard/memberships", icon: "memberships" },
  { id: "trainers", label: "Тренеры", href: "/dashboard/trainers", icon: "trainers" },
  { id: "employees", label: "Сотрудники", href: "/dashboard/employees", icon: "employees" },
  { id: "bookings", label: "Бронирования", href: "/dashboard/bookings", icon: "bookings" },
  { id: "attendance", label: "Посещаемость", href: "/dashboard/attendance", icon: "attendance" },
  { id: "telephony", label: "Телефония", href: "/dashboard/telephony", icon: "telephony" },
  { id: "sales", label: "Продажи", href: "/dashboard/sales", icon: "sales" },
  { id: "payments", label: "Платежи", href: "/dashboard/payments", icon: "payments" },
  { id: "daily-report", label: "Дневной отчет", href: "/dashboard/daily-report", icon: "report" },
  { id: "reports", label: "Отчёты", href: "/dashboard/reports", icon: "analytics" },
  { id: "settings", label: "Настройки", href: "/dashboard/settings", icon: "settings" },
] as const;

export const workspaceSidebarLayout = [
  {
    type: "section",
    id: "collaboration",
    label: "Совместная работа",
    icon: "collaboration",
    items: ["messages", "feed", "disk", "mail"] as const,
  },
  {
    type: "section",
    id: "fitness",
    label: "Фитнес",
    icon: "fitness",
    items: [
      "schedule",
      "clients",
      "contracts",
      "memberships",
      "trainers",
      "employees",
      "bookings",
      "attendance",
      "telephony",
      "sales",
      "payments",
      "daily-report",
      "reports",
    ] as const,
  },
  { type: "items", items: ["tasks", "crm", "marketing"] as const },
  { type: "items", items: ["settings"] as const },
] as const;

export const crmTopTabs = [
  "Сделки",
  "Товары и Склады",
  "Клиенты",
  "Продажи",
  "Аналитика",
  "Смарт-процессы",
  "Ещё",
] as const;

export const crmViewTabs = ["Канбан", "Список", "Дела", "Календарь"] as const;

export const crmStatusTabs = ["Входящие", "Запланированные", "Ещё"] as const;

/** @deprecated use crmViewTabs + crmStatusTabs */
export const crmSubtabs = [
  ...crmViewTabs,
  ...crmStatusTabs,
] as const;

export const tasksTopTabs = [
  "Задачи",
  "Проекты",
  "Потоки",
  "Скрам",
  "Эффективность",
  "Шаблоны",
  "Корзина",
  "Ещё",
] as const;

export const tasksViewTabs = [
  { label: "Список", href: "/dashboard/tasks" },
  { label: "Сроки", href: "/dashboard/tasks?view=deadlines" },
  { label: "Мой план", href: "/dashboard/tasks?view=plan" },
  { label: "Календарь", href: "/dashboard/schedule" },
  { label: "Гант", href: "/dashboard/tasks?view=gantt" },
] as const;

export const mailProviders = [
  { id: "gmail", label: "Gmail", icon: "G" },
  { id: "outlook", label: "Outlook", icon: "O" },
  { id: "icloud", label: "iCloud", icon: "i" },
  { id: "office365", label: "Office365", icon: "365" },
  { id: "exchange", label: "Exchange", icon: "E" },
  { id: "yahoo", label: "Yahoo!", icon: "Y" },
  { id: "aol", label: "Aol", icon: "A" },
  { id: "yandex", label: "Яндекс", icon: "Я" },
  { id: "mailru", label: "Mail.ru", icon: "@"},
  { id: "imap", label: "Корпоративная почта (IMAP+SMTP)", icon: "✉" },
] as const;

export const driveTopTabs = [
  { label: "Лента", href: "/", stub: true },
  { label: "Мессенджер", href: "/dashboard/messages", stub: false },
  { label: "Календарь", href: "/dashboard/schedule", stub: false },
  { label: "Диск", href: "/dashboard/drive", stub: false },
  { label: "Почта", href: "/dashboard/mail", stub: false },
  { label: "Группы", href: "/dashboard/drive?view=groups", stub: true },
  { label: "Ещё", href: "/dashboard/drive?view=more", stub: true },
] as const;

export const marketingTopTabs = [
  { id: "start", label: "Старт", href: "/dashboard/marketing", stub: false },
  { id: "newsletters", label: "Рассылки", href: "/dashboard/marketing?tab=newsletters", stub: false },
  { id: "advertising", label: "Реклама", href: "/dashboard/marketing?tab=advertising", stub: false },
  { id: "segments", label: "Сегменты", href: "/dashboard/marketing?tab=segments", stub: true },
  { id: "sales-generator", label: "Генератор продаж", href: "/dashboard/marketing?tab=sales-generator", stub: false },
  { id: "toloka", label: "Яндекс.Толока", href: "/dashboard/marketing?tab=toloka", stub: false },
  { id: "templates", label: "Мои шаблоны", href: "/dashboard/marketing?tab=templates", stub: true },
  { id: "more", label: "Ещё", href: "/dashboard/marketing?tab=more", stub: true },
] as const;

export type MarketingProviderId =
  | "email"
  | "sms"
  | "messengers"
  | "lookalike"
  | "google_ads"
  | "vk_ads"
  | "yandex_direct"
  | "yandex_toloka"
  | "repeat_deals";

export const marketingStartSections = [
  {
    id: "newsletters",
    title: "Создать рассылку",
    tiles: [
      { id: "email" as const, label: "Email рассылка", icon: "✉", tone: "sky" },
      { id: "sms" as const, label: "SMS рассылка", icon: "💬", tone: "pink" },
      { id: "messengers" as const, label: "Мессенджеры", icon: "📱", tone: "lime" },
    ],
  },
  {
    id: "advertising",
    title: "Создать рекламную аудиторию",
    tiles: [
      { id: "lookalike" as const, label: "Look-alike аудитория", icon: "◎", tone: "violet" },
      { id: "google_ads" as const, label: "Реклама Google Ads", icon: "A", tone: "blue" },
      { id: "vk_ads" as const, label: "Реклама VK", icon: "VK", tone: "indigo" },
    ],
  },
  {
    id: "sales-generator",
    title: "Генератор продаж",
    tiles: [
      { id: "repeat_deals" as const, label: "Повторные сделки", icon: "🤝", tone: "teal" },
    ],
  },
  {
    id: "yandex",
    title: "Яндекс",
    tiles: [
      { id: "yandex_direct" as const, label: "Яндекс.Директ", icon: "Я", tone: "orange" },
      { id: "yandex_toloka" as const, label: "Яндекс.Толока", icon: "✳", tone: "amber" },
    ],
  },
] as const;

export const marketingProviderFields: Record<
  MarketingProviderId,
  { key: string; label: string; type?: "text" | "password" | "email"; placeholder?: string }[]
> = {
  email: [
    { key: "sender_email", label: "Email отправителя", type: "email", placeholder: "marketing@club.ru" },
    { key: "smtp_host", label: "SMTP сервер", placeholder: "smtp.yandex.ru" },
    { key: "api_key", label: "API ключ / пароль", type: "password" },
  ],
  sms: [
    { key: "provider_name", label: "SMS-провайдер", placeholder: "SMS.ru" },
    { key: "api_key", label: "API ключ", type: "password" },
    { key: "sender_name", label: "Имя отправителя", placeholder: "SPORTMAX" },
  ],
  messengers: [
    { key: "telegram_token", label: "Telegram Bot Token", type: "password" },
    { key: "whatsapp_business_id", label: "WhatsApp Business ID" },
  ],
  lookalike: [
    { key: "source_audience", label: "Исходная аудитория", placeholder: "Клиенты клуба" },
    { key: "platform", label: "Площадка", placeholder: "VK / Яндекс" },
  ],
  google_ads: [
    { key: "customer_id", label: "Customer ID", placeholder: "123-456-7890" },
    { key: "api_key", label: "API ключ", type: "password" },
  ],
  vk_ads: [
    { key: "account_id", label: "ID рекламного кабинета" },
    { key: "access_token", label: "Access Token", type: "password" },
  ],
  yandex_direct: [
    { key: "login", label: "Логин Яндекс.Директ" },
    { key: "token", label: "OAuth токен", type: "password" },
    { key: "client_id", label: "Client ID" },
  ],
  yandex_toloka: [
    { key: "oauth_token", label: "OAuth токен", type: "password" },
    { key: "sandbox", label: "Режим песочницы", placeholder: "да / нет" },
  ],
  repeat_deals: [
    { key: "pipeline_id", label: "Воронка CRM", placeholder: "Основная" },
    { key: "days_after_visit", label: "Дней после визита", placeholder: "30" },
  ],
};

export const messagesTopTabs = [
  { label: "Чаты", href: "/dashboard/messages", stub: false },
  { label: "Чаты задач", href: "/dashboard/messages?view=task-chats", stub: true },
  { label: "BitrixGPT", href: "/dashboard/messages?view=gpt", stub: true },
  { label: "Каналы", href: "/dashboard/messages?view=channels", stub: true },
  { label: "Контакт-центр", href: "/dashboard/messages?view=contact-center", stub: true },
  { label: "Уведомления", href: "/dashboard/messages?view=notifications", stub: true },
  { label: "Маркетплейс", href: "/dashboard/messages?view=marketplace", stub: true },
  { label: "Настройки", href: "/dashboard/settings", stub: false },
  { label: "Ещё", href: "/dashboard/messages?view=more", stub: true },
] as const;
