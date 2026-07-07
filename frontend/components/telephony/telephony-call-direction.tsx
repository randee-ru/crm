import type { CallLogRecord } from "@/lib/types";
import { IconPhoneIncoming, IconPhoneOutgoing } from "@/components/ui/app-icon";

type TelephonyCallDirectionProps = {
  direction: CallLogRecord["direction"];
  showLabel?: boolean;
  missed?: boolean;
  variant?: "inline" | "pill";
};

export function TelephonyCallDirection({
  direction,
  showLabel = true,
  missed = false,
  variant = "inline",
}: TelephonyCallDirectionProps) {
  const isIncoming = direction === "incoming";
  const label = isIncoming ? "Входящий" : "Исходящий";

  return (
    <span
      className={`telephony-direction telephony-direction--${direction}${variant === "pill" ? " telephony-direction--pill" : ""}${missed ? " telephony-direction--missed" : ""}`}
      title={missed ? `${label}, пропущен` : label}
    >
      <span className="telephony-direction-icon" aria-hidden>
        {isIncoming ? <IconPhoneIncoming size={15} strokeWidth={2} /> : <IconPhoneOutgoing size={15} strokeWidth={2} />}
      </span>
      {showLabel ? <span className="telephony-direction-label">{label}</span> : null}
    </span>
  );
}
