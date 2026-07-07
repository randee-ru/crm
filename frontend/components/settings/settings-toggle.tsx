"use client";

type SettingsToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
};

export function SettingsToggle({ enabled, onChange, label }: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={`settings-toggle ${enabled ? "settings-toggle--on" : "settings-toggle--off"}`}
    >
      <span className="settings-toggle-knob" />
      <span className="settings-toggle-label">{enabled ? "вкл" : "выкл"}</span>
    </button>
  );
}
