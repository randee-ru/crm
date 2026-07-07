"use client";

import { deleteMembershipAction } from "@/app/actions/memberships";

type MembershipDeleteButtonProps = {
  membershipId: number;
};

export function MembershipDeleteButton({ membershipId }: MembershipDeleteButtonProps) {
  const action = deleteMembershipAction.bind(null, membershipId);

  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm("Удалить абонемент?")) {
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
