"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteEmployeeAction } from "@/app/actions/employees";

type EmployeeDeleteButtonProps = {
  membershipId: number;
  employeeName: string;
  disabled?: boolean;
};

export function EmployeeDeleteButton({
  membershipId,
  employeeName,
  disabled = false,
}: EmployeeDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || isPending}
      onClick={() => {
        if (!window.confirm(`Удалить сотрудника «${employeeName}» из компании?`)) {
          return;
        }
        startTransition(async () => {
          const result = await deleteEmployeeAction(membershipId);
          if (result?.error) {
            window.alert(result.error);
            return;
          }
          router.push("/dashboard/employees");
          router.refresh();
        });
      }}
      className="rounded-full border border-[#f5b5b5] bg-[#fff5f5] px-3 py-1.5 text-[12px] font-semibold text-[#c2410c] hover:bg-[#feecec] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Удаление..." : "Удалить"}
    </button>
  );
}
