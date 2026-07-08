import type {
  MessengerAccountRecord,
  MessengerIntegrationRecord,
  MessengerMessageRecord,
  MessengerThreadRecord,
} from "@/lib/types";

export type MessengerChannelProvider = "max" | "telegram" | "whatsapp";

export const MESSENGER_PROVIDER_LABELS: Record<MessengerChannelProvider, string> = {
  max: "МАКС",
  telegram: "Телеграм",
  whatsapp: "Вотсапп",
};

export type MessengerWorkspaceData = {
  provider: MessengerChannelProvider;
  integration: MessengerIntegrationRecord | null;
  account: MessengerAccountRecord | null;
  threads: MessengerThreadRecord[];
  messages: MessengerMessageRecord[];
  activeThreadId: number | null;
};
