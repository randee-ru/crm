"use client";

import { useState, type ReactNode } from "react";

import { clickToCallAction } from "@/app/actions/telephony";
import { IconPhone } from "@/components/ui/app-icon";

type ClickToCallChipProps = {
  phone: string;
  clientId?: number;
  className?: string;
  showIcon?: boolean;
  children?: ReactNode;
};

export function ClickToCallChip({
  phone,
  clientId,
  className = "client-card-meta-chip",
  showIcon = true,
  children,
}: ClickToCallChipProps) {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");

  async function handleClick() {
    if (!phone || loading) return;
    setLoading(true);
    setHint("");
    try {
      const result = await clickToCallAction({ phone, client_id: clientId });
      setHint(`Звоним с ${result.extension}…`);
      window.setTimeout(() => setHint(""), 4000);
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Не удалось позвонить");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="click-to-call-wrap">
      <button
        type="button"
        className={`${className} click-to-call-chip${loading ? " click-to-call-chip--loading" : ""}`}
        onClick={() => void handleClick()}
        disabled={loading}
        title="Позвонить через Mango Office"
      >
        {showIcon ? <IconPhone size={14} /> : null}
        {children ?? phone}
      </button>
      {hint ? <span className="click-to-call-hint">{hint}</span> : null}
    </span>
  );
}
