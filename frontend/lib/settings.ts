export type SettingsSectionId =
  | "tools"
  | "pipelines"
  | "portal"
  | "homepage"
  | "communications"
  | "employees"
  | "automation"
  | "requisites"
  | "schedule"
  | "integrations"
  | "security"
  | "more";

export const settingsSections = [
  { id: "tools", label: "Инструменты" },
  { id: "pipelines", label: "Воронки CRM" },
  { id: "portal", label: "Мой CRM Kit" },
  { id: "homepage", label: "Главная страница" },
  { id: "communications", label: "Коммуникации" },
  { id: "employees", label: "Сотрудники" },
  { id: "automation", label: "Автоматизация" },
  { id: "requisites", label: "Реквизиты" },
  { id: "schedule", label: "Расписание" },
  { id: "integrations", label: "Интеграции" },
  { id: "security", label: "Безопасность" },
  { id: "more", label: "Дополнительно" },
] as const satisfies ReadonlyArray<{ id: SettingsSectionId; label: string }>;

/**
 * Идентификатор пункта настроек "Инструменты" — соответствует одному или
 * нескольким id из `workspaceNavigation` (lib/nav.ts), которые он скрывает/показывает.
 */
export type SettingsToolId =
  | "collaboration"
  | "tasks"
  | "crm"
  | "marketing"
  | "schedule"
  | "clients"
  | "contracts"
  | "memberships"
  | "trainers"
  | "employees"
  | "bookings"
  | "attendance"
  | "telephony"
  | "sales"
  | "payments"
  | "daily-report"
  | "reports";

export type SettingsToolConfig = {
  id: SettingsToolId;
  label: string;
  /** id пунктов workspaceNavigation, которые включает/выключает этот тумблер. */
  moduleIds: string[];
  expandable?: boolean;
};

export const settingsTools: SettingsToolConfig[] = [
  {
    id: "collaboration",
    label: "Совместная работа",
    moduleIds: ["messages", "disk", "mail"],
    expandable: true,
  },
  { id: "tasks", label: "Задачи и проекты", moduleIds: ["tasks"] },
  { id: "crm", label: "CRM", moduleIds: ["crm"] },
  { id: "marketing", label: "Маркетинг", moduleIds: ["marketing"] },
  { id: "schedule", label: "Расписание", moduleIds: ["schedule"] },
  { id: "clients", label: "Клиенты", moduleIds: ["clients"] },
  { id: "contracts", label: "Договоры", moduleIds: ["contracts"] },
  { id: "memberships", label: "Абонементы", moduleIds: ["memberships"] },
  { id: "trainers", label: "Тренеры", moduleIds: ["trainers"] },
  { id: "employees", label: "Сотрудники", moduleIds: ["employees"] },
  { id: "bookings", label: "Бронирования", moduleIds: ["bookings"] },
  { id: "attendance", label: "Посещаемость", moduleIds: ["attendance"] },
  { id: "telephony", label: "Телефония", moduleIds: ["telephony"] },
  { id: "sales", label: "Продажи", moduleIds: ["sales"] },
  { id: "payments", label: "Платежи", moduleIds: ["payments"] },
  { id: "daily-report", label: "Дневной отчет", moduleIds: ["daily-report"] },
  { id: "reports", label: "Отчёты", moduleIds: ["reports"] },
];

export const settingsSectionMeta: Record<
  SettingsSectionId,
  { title: string; description: string }
> = {
  tools: {
    title: "Инструменты",
    description:
      "Создайте удобное рабочее пространство для вашей компании. Включите только те инструменты, которые нужны для работы вашим сотрудникам.",
  },
  pipelines: {
    title: "Воронки CRM",
    description:
      "Настройка этапов продаж для фитнес-клуба: пробные занятия, коммерческие предложения, оплата абонементов.",
  },
  portal: {
    title: "Мой CRM Kit",
    description: "Персональные настройки портала и рабочего стола.",
  },
  homepage: {
    title: "Главная страница",
    description: "Настройка ленты, виджетов и стартового экрана сотрудников.",
  },
  communications: {
    title: "Коммуникации",
    description: "Мессенджер, уведомления и каналы связи с клиентами.",
  },
  employees: {
    title: "Сотрудники",
    description: "Структура компании, роли и доступы пользователей.",
  },
  automation: {
    title: "Автоматизация",
    description: "Роботы, триггеры и бизнес-процессы.",
  },
  requisites: {
    title: "Реквизиты",
    description: "Юридические данные компании и филиалов.",
  },
  schedule: {
    title: "Расписание",
    description: "График работы, залы и слоты занятий.",
  },
  integrations: {
    title: "Интеграции",
    description: "Телефония, SMS, маркетинг, СКУД и другие внешние сервисы компании.",
  },
  security: {
    title: "Безопасность",
    description: "Политики доступа, сессии и аудит действий.",
  },
  more: {
    title: "Дополнительно",
    description: "Расширенные параметры и интеграции.",
  },
};
