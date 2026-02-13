"use client";

import type React from "react";

type SwitchProps = {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  accent?: string;
  onLabel?: string;
  offLabel?: string;
};

export default function Switch({
  checked,
  onChange,
  disabled = false,
  accent = "#60a5fa",
  onLabel = "ON",
  offLabel = "OFF",
}: SwitchProps) {
  const knobOffset = checked ? 14 : 0;
  const content = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: 2,
        borderRadius: 999,
        border: `1px solid ${checked ? accent : "#4b5563"}`,
        background: "#020617",
        width: 32,
        height: 18,
        position: "relative",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 2,
          top: 2,
          width: 14,
          height: 14,
          borderRadius: 999,
          background: checked ? "#16a34a" : "#4b5563",
          color: "#0b1120",
          fontSize: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateX(${knobOffset}px)`,
          transition: "transform 140ms ease-out",
          pointerEvents: "none",
        }}
      >
        {checked ? onLabel : offLabel}
      </span>
    </span>
  );

  if (!onChange) return content;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      style={{ background: "transparent", border: "none", padding: 0, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {content}
    </button>
  );
}

