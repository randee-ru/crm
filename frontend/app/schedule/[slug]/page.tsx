import type { Metadata, Viewport } from "next";

import { ScheduleEmbedView } from "@/components/schedule/schedule-embed-view";

export const metadata: Metadata = {
  title: "Расписание клуба",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

type PublicSchedulePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function PublicSchedulePage({ params, searchParams }: PublicSchedulePageProps) {
  const { slug } = await params;
  // На schedule.sportmax.fit токен в URL не нужен — backend пропускает по Host.
  // token оставляем опциональным только для обратной совместимости.
  const { token = "" } = await searchParams;

  return (
    <main className="schedule-embed-page schedule-embed-page--wide schedule-embed-page--mobile">
      <ScheduleEmbedView companySlug={slug} token={token} />
    </main>
  );
}
