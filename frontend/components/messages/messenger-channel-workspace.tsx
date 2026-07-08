"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { MessengerThreadPanel } from "@/components/messages/messenger-thread-panel";
import { MessengerThreadSidebar } from "@/components/messages/messenger-thread-sidebar";
import type { MessengerChannelProvider } from "@/lib/messenger";
import type {
  MessengerAccountRecord,
  MessengerIntegrationRecord,
  MessengerMessageRecord,
  MessengerThreadRecord,
} from "@/lib/types";

type MessengerChannelWorkspaceProps = {
  provider: MessengerChannelProvider;
  integration: MessengerIntegrationRecord | null;
  account: MessengerAccountRecord | null;
  threads: MessengerThreadRecord[];
  activeThreadId: number | null;
  initialMessages: MessengerMessageRecord[];
  search?: string;
};

export function MessengerChannelWorkspace({
  provider,
  integration,
  account,
  threads,
  activeThreadId,
  initialMessages,
  search,
}: MessengerChannelWorkspaceProps) {
  const router = useRouter();
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <div className="messages-layout messages-channel-layout">
      <MessengerThreadSidebar
        provider={provider}
        threads={threads}
        activeThreadId={activeThread?.id ?? null}
        search={search}
      />
      <MessengerThreadPanel
        provider={provider}
        integration={integration}
        account={account}
        thread={activeThread}
        initialMessages={initialMessages}
      />
    </div>
  );
}
