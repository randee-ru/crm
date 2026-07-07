import type { Metadata } from "next";

import { MessagesChatPanel } from "@/components/messages/messages-chat-panel";
import { MessagesChatSidebar } from "@/components/messages/messages-chat-sidebar";
import { MessagesModuleHeader } from "@/components/messages/messages-module-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";
import { getChatMessages, getChatRooms } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Мессенджер",
};

type MessagesPageProps = {
  searchParams: Promise<{ room?: string; search?: string }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const params = await searchParams;
  const [rooms, session] = await Promise.all([getChatRooms(), getAuthSession()]);

  const activeRoomId = params.room ? Number(params.room) : (rooms[0]?.id ?? null);
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0] ?? null;
  const messages = activeRoom ? await getChatMessages(activeRoom.id) : [];

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="messages-workspace-card min-w-0 flex-1">
          <MessagesModuleHeader />
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
    </DashboardShell>
  );
}
