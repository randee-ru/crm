"use client";

import { deleteTrainerAction } from "@/app/actions/trainers";

type TrainerDeleteButtonProps = {
  trainerId: number;
};

export function TrainerDeleteButton({ trainerId }: TrainerDeleteButtonProps) {
  const action = deleteTrainerAction.bind(null, trainerId);

  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm("Удалить тренера?")) {
            event.preventDefault();
          }
        }}
        className="rounded border border-red-200 bg-white px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50"
      >
        Удалить
      </button>
    </form>
  );
}
