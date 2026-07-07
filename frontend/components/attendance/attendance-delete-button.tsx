"use client";

import { deleteAttendanceAction } from "@/app/actions/attendance";

type AttendanceDeleteButtonProps = {
  attendanceId: number;
};

export function AttendanceDeleteButton({ attendanceId }: AttendanceDeleteButtonProps) {
  const action = deleteAttendanceAction.bind(null, attendanceId);

  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm("Удалить посещение?")) {
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
