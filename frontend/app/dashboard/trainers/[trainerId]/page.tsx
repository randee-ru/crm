import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrainerProfilePanel } from "@/components/trainers/trainer-profile-panel";
import { WorkspaceCard } from "@/components/workspace-card";
import { getBranches, getTrainer } from "@/lib/api";
import type { BranchOption, TrainerDetail } from "@/lib/types";

type TrainerPageProps = {
  params: Promise<{
    trainerId: string;
  }>;
};

export async function generateMetadata({ params }: TrainerPageProps): Promise<Metadata> {
  const resolved = await params;
  return {
    title: `Тренер ${resolved.trainerId}`,
  };
}

export default async function TrainerDetailPage({ params }: TrainerPageProps) {
  const resolved = await params;
  const trainerId = Number(resolved.trainerId);

  if (!Number.isFinite(trainerId)) {
    notFound();
  }

  let trainer: TrainerDetail;
  let branches: BranchOption[] = [];

  try {
    [trainer, branches] = await Promise.all([
      getTrainer(trainerId),
      getBranches().catch(() => [] as BranchOption[]),
    ]);
  } catch {
    notFound();
  }

  return (
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="trainers-workspace-card min-w-0 flex-1">
          <TrainerProfilePanel trainer={trainer} branches={branches} />
        </WorkspaceCard>
      </div>
  );
}
