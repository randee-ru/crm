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
  { id: "security", label: "Безопасность" },
  { id: "more", label: "Дополнительно" },
] as const satisfies ReadonlyArray<{ id: SettingsSectionId; label: string }>;

export type SettingsToolId =
  | "collaboration"
  | "tasks"
  | "crm"
  | "booking"
  | "inventory"
  | "sites"
  | "company"
  | "signature"
  | "automation"
  | "bi";

export type SettingsToolConfig = {
  id: SettingsToolId;
  label: string;
  defaultEnabled: boolean;
  expandable?: boolean;
  links?: Array<{ label: string; href: string; external?: boolean }>;
};

export const settingsTools: SettingsToolConfig[] = [
  {
    id: "collaboration",
    label: "Совместная работа",
    defaultEnabled: true,
    expandable: true,
    links: [
      { label: "Перейти", href: "/" },
      { label: "Права доступа", href: "/dashboard/settings?section=security" },
    ],
  },
  {
    id: "tasks",
    label: "Задачи и проекты",
    defaultEnabled: true,
    links: [
      { label: "Перейти", href: "/dashboard/tasks" },
      { label: "Права доступа", href: "/dashboard/settings?section=security" },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    defaultEnabled: true,
    links: [
      { label: "Перейти", href: "/dashboard" },
      { label: "Права доступа", href: "/dashboard/settings?section=security" },
      { label: "Настройки", href: "/dashboard/settings?section=tools" },
      { label: "Воронки", href: "/dashboard/settings?section=pipelines" },
    ],
  },
  {
    id: "booking",
    label: "Онлайн-запись",
    defaultEnabled: false,
  },
  {
    id: "inventory",
    label: "Складской учёт",
    defaultEnabled: false,
  },
  {
    id: "sites",
    label: "Сайты и Магазины",
    defaultEnabled: false,
  },
  {
    id: "company",
    label: "Компания",
    defaultEnabled: true,
    links: [
      { label: "Перейти", href: "/dashboard/settings?section=employees" },
      { label: "Права доступа", href: "/dashboard/settings?section=security" },
    ],
  },
  {
    id: "signature",
    label: "Подпись",
    defaultEnabled: false,
  },
  {
    id: "automation",
    label: "Автоматизация",
    defaultEnabled: true,
    links: [
      { label: "Перейти", href: "/dashboard/settings?section=automation" },
      { label: "Права доступа", href: "/dashboard/settings?section=security" },
    ],
  },
  {
    id: "bi",
    label: "BI Конструктор",
    defaultEnabled: false,
  },
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
  security: {
    title: "Безопасность",
    description: "Политики доступа, сессии и аудит действий.",
  },
  more: {
    title: "Дополнительно",
    description: "Расширенные параметры и интеграции.",
  },
};

export const SETTINGS_TOOLS_STORAGE_KEY = "crm_settings_tools";
