import type { Metadata } from "next";

import { MessengerChannelWorkspace } from "@/components/messages/messenger-channel-workspace";
import { MessagesChatPanel } from "@/components/messages/messages-chat-panel";
import { MessagesChatSidebar } from "@/components/messages/messages-chat-sidebar";
import { MessagesModuleHeader } from "@/components/messages/messages-module-header";
import { WorkspaceCard } from "@/components/workspace-card";
import { getMessengerAccountAction } from "@/app/actions/messenger";
import type { MessengerChannelProvider } from "@/lib/messenger";
import {
  getChatMessages,
  getChatRooms,
  getMessengerIntegration,
  getMessengerMessages,
  getMessengerThreads,
} from "@/lib/api";
import { getAuthSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Мессенджер",
};

type MessagesPageProps = {
  searchParams: Promise<{ room?: string; thread?: string; view?: string; search?: string }>;
};

const CHANNEL_VIEWS = new Set(["max", "telegram", "whatsapp"]);

function resolveActiveView(view?: string) {
  if (!view || view === "chats") return "chats";
  if (CHANNEL_VIEWS.has(view)) return view;
  return "chats";
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const params = await searchParams;
  const activeView = resolveActiveView(params.view);

  if (CHANNEL_VIEWS.has(activeView)) {
    const provider = activeView as MessengerChannelProvider;
    const integration = await getMessengerIntegration(provider);
    const account = await getMessengerAccountAction(provider);
    const isConnected =
      account?.status === "ready" || Boolean(integration?.has_connected_account);
    const threads = isConnected ? await getMessengerThreads(provider) : [];

    const activeThreadId = params.thread
      ? Number(params.thread)
      : (threads[0]?.id ?? null);
    const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0] ?? null;
    const messages = activeThread && isConnected ? await getMessengerMessages(activeThread.id) : [];

    return (
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="messages-workspace-card min-w-0 flex-1">
          <MessagesModuleHeader activeView={activeView} />
          <MessengerChannelWorkspace
            provider={provider}
            integration={integration}
            account={account}
            threads={threads}
            activeThreadId={activeThread?.id ?? null}
            initialMessages={messages}
            search={params.search}
          />
        </WorkspaceCard>
      </div>
    );
  }

  const [rooms, session] = await Promise.all([getChatRooms(), getAuthSession()]);

  const activeRoomId = params.room ? Number(params.room) : (rooms[0]?.id ?? null);
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0] ?? null;
  const messages = activeRoom ? await getChatMessages(activeRoom.id) : [];

  return (
    <div className="workspace-content min-h-0 flex-1">
      <WorkspaceCard className="messages-workspace-card min-w-0 flex-1">
        <MessagesModuleHeader activeView={activeView} />
        <div className="messages-layout">
          <MessagesChatSidebar
            rooms={rooms}
            activeRoomId={activeRoom?.id ?? null}
            search={params.search}
          />
          <MessagesChatPanel
            room={activeRoom}
            initialMessages={messages}
            currentUserName={session?.user.display_name ?? session?.user.username ?? ""}
          />
        </div>
      </WorkspaceCard>
    </div>
  );
}
