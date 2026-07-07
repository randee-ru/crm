"use client";

type SettingsToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function SettingsToggle({ enabled, onChange, label, disabled = false }: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`settings-toggle ${enabled ? "settings-toggle--on" : "settings-toggle--off"} disabled:opacity-60`}
    >
      <span className="settings-toggle-knob" />
      <span className="settings-toggle-label">{enabled ? "вкл" : "выкл"}</span>
    </button>
  );
}
