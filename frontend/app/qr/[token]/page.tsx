import { redirect, notFound } from "next/navigation";

import { getClientByQrToken } from "@/lib/api";

type QrClientPageProps = {
  params: Promise<{ token: string }>;
};

export default async function QrClientPage({ params }: QrClientPageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  try {
    const client = await getClientByQrToken(token);
    redirect(`/dashboard/clients/${client.id}`);
  } catch {
    notFound();
  }
}
