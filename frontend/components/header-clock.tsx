"use client";

import { useEffect, useState } from "react";

function formatClock(date: Date) {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HeaderClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(formatClock(new Date()));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!time) return null;

  return (
    <span className="shell-inset hidden rounded-lg px-2.5 py-1 text-[12px] font-medium text-[var(--shell-text)] lg:inline-flex">
      {time}
    </span>
  );
}
