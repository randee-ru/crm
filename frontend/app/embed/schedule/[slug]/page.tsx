import type { Metadata } from "next";

import { ScheduleEmbedView } from "@/components/schedule/schedule-embed-view";

export const metadata: Metadata = {
  title: "Расписание",
  robots: { index: true, follow: true },
};

type EmbedSchedulePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function EmbedSchedulePage({ params, searchParams }: EmbedSchedulePageProps) {
  const { slug } = await params;
  const { token = "" } = await searchParams;

  return (
    <main className="schedule-embed-page">
      <ScheduleEmbedView companySlug={slug} token={token} />
    </main>
  );
}
