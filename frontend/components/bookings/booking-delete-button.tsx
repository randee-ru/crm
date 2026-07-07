"use client";

import { deleteBookingAction } from "@/app/actions/bookings";

type BookingDeleteButtonProps = {
  bookingId: number;
};

export function BookingDeleteButton({ bookingId }: BookingDeleteButtonProps) {
  const action = deleteBookingAction.bind(null, bookingId);

  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm("Удалить бронирование?")) {
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
