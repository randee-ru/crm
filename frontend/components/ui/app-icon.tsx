import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  BarChart3,
  Bell,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CreditCard,
  Download,
  Dumbbell,
  ClipboardList,
  File,
  FileSignature,
  FileText,
  Folder,
  GripVertical,
  Handshake,
  HardDrive,
  Home,
  IdCard,
  LayoutDashboard,
  LayoutGrid,
  Mail,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Network,
  Pause,
  Globe,
  Pencil,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  Printer,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Target,
  UserCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";

import type { workspaceNavigation } from "@/lib/nav";

export type NavIconName = (typeof workspaceNavigation)[number]["icon"];
export type SectionIconName = "collaboration" | "fitness" | "modules" | "service";
export type AppIconName = NavIconName | SectionIconName;

const navIcons: Record<NavIconName, LucideIcon> = {
  home: Home,
  crm: LayoutDashboard,
  marketing: Megaphone,
  tasks: ClipboardList,
  clients: Users,
  contracts: FileSignature,
  sales: ShoppingBag,
  memberships: BadgeCheck,
  trainers: Dumbbell,
  bookings: CalendarCheck,
  attendance: UserCheck,
  employees: IdCard,
  calendar: Calendar,
  messages: MessageSquare,
  disk: HardDrive,
  mail: Mail,
  telephony: Phone,
  payments: CreditCard,
  report: BarChart3,
  analytics: BarChart3,
  settings: Settings,
};

const sectionIcons: Record<SectionIconName, LucideIcon> = {
  collaboration: Network,
  fitness: Dumbbell,
  modules: LayoutGrid,
  service: Wrench,
};

const iconRegistry: Record<AppIconName, LucideIcon> = {
  ...navIcons,
  ...sectionIcons,
};

type AppIconProps = {
  name: AppIconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function AppIcon({ name, className, size = 18, strokeWidth = 1.75 }: AppIconProps) {
  const Icon = iconRegistry[name];
  return <Icon className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

type IconProps = {
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function IconPhone({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Phone className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconMail({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Mail className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconIdCard({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <IdCard className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconPhoneIncoming({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <PhoneIncoming className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconPhoneOutgoing({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <PhoneOutgoing className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconCheck({ className, size = 14, strokeWidth = 2.25 }: IconProps) {
  return <Check className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconX({ className, size = 14, strokeWidth = 2.25 }: IconProps) {
  return <X className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconPlay({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Play className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconPause({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Pause className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconClose({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <X className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconTranscribe({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <FileText className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconReport({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <BarChart3 className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconSearch({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Search className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconBell({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Bell className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconFolder({ className, size = 20, strokeWidth = 1.75 }: IconProps) {
  return <Folder className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconFile({ className, size = 20, strokeWidth = 1.75 }: IconProps) {
  return <File className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconDownload({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Download className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconFileSignature({ className, size = 18, strokeWidth = 1.75 }: IconProps) {
  return <FileSignature className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconCheckCircle({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <CheckCircle2 className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconCalendarCheck({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <CalendarCheck className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconChevronLeft({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <ChevronLeft className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconChevronRight({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <ChevronRight className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconArrowLeft({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <ArrowLeft className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconArrowUp({ className, size = 14, strokeWidth = 1.75 }: IconProps) {
  return <ArrowUp className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconArrowDown({ className, size = 14, strokeWidth = 1.75 }: IconProps) {
  return <ArrowDown className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconGrip({ className, size = 14, strokeWidth = 1.75 }: IconProps) {
  return <GripVertical className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconPencil({ className, size = 14, strokeWidth = 1.75 }: IconProps) {
  return <Pencil className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconGlobe({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Globe className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconPrinter({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Printer className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconShare({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Share2 className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconSettings({ className, size = 16, strokeWidth = 1.75 }: IconProps) {
  return <Settings className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function IconCircle({ className, size = 10, strokeWidth = 2 }: IconProps) {
  return <Circle className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export const marketingTileIcons = {
  email: Mail,
  sms: MessageSquare,
  messengers: Smartphone,
  lookalike: Target,
  google_ads: MousePointerClick,
  vk_ads: Users,
  yandex_direct: Megaphone,
  yandex_toloka: Sparkles,
  repeat_deals: Handshake,
} as const satisfies Record<string, LucideIcon>;

export function MarketingTileIcon({
  id,
  className,
  size = 22,
}: {
  id: keyof typeof marketingTileIcons;
  className?: string;
  size?: number;
}) {
  const Icon = marketingTileIcons[id];
  return <Icon className={className} size={size} strokeWidth={1.75} aria-hidden />;
}
