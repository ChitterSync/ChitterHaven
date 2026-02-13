"use client";

import type React from "react";

export type ChoiceSliderOption = {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
};

export type ChoiceSliderLayout = "single" | "wrap";

type ChoiceSliderProps = {
  value: string;
  options: ChoiceSliderOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  layout?: ChoiceSliderLayout;
  compact?: boolean;
};

export default function ChoiceSlider({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  layout = "single",
  compact = false,
}: ChoiceSliderProps) {
  const safeOptions = Array.isArray(options) ? options : [];
  const selectedIndex = Math.max(0, safeOptions.findIndex((option) => option.value === value));
  const widthPercent = safeOptions.length > 0 ? 100 / safeOptions.length : 100;
  const translatePercent = selectedIndex * 100;

  const moveSelection = (delta: number) => {
    if (disabled || safeOptions.length < 2) return;
    const nextIndex = Math.max(0, Math.min(safeOptions.length - 1, selectedIndex + delta));
    const next = safeOptions[nextIndex];
    if (next && next.value !== value) onChange(next.value);
  };

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {layout === "wrap" ? (
        <div
          role="radiogroup"
          aria-label={ariaLabel}
          data-ch-choice-slider="true"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            border: "1px solid rgba(148,163,184,0.28)",
            borderRadius: 12,
            background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.9))",
            boxShadow: "inset 0 1px 0 rgba(148,163,184,0.08), 0 10px 24px rgba(2,6,23,0.28)",
            padding: 6,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {safeOptions.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onChange(option.value)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  minHeight: compact ? 30 : 36,
                  padding: compact ? "6px 8px" : "8px 10px",
                  borderRadius: 9,
                  border: active ? "1px solid rgba(125,211,252,0.55)" : "1px solid rgba(148,163,184,0.24)",
                  background: active
                    ? "linear-gradient(135deg, rgba(56,189,248,0.28), rgba(59,130,246,0.2))"
                    : "rgba(2,6,23,0.55)",
                  color: active ? "#e2e8f0" : "#94a3b8",
                  fontSize: compact ? 11 : 12,
                  fontWeight: 600,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {option.icon}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        data-ch-choice-slider="true"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            moveSelection(1);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            moveSelection(-1);
          }
        }}
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, safeOptions.length)}, minmax(0, 1fr))`,
          border: "1px solid rgba(148,163,184,0.28)",
          borderRadius: 12,
          background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.9))",
          boxShadow: "inset 0 1px 0 rgba(148,163,184,0.08), 0 10px 24px rgba(2,6,23,0.28)",
          overflow: "hidden",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 2,
            bottom: 2,
            left: 2,
            width: `calc(${widthPercent}% - 4px)`,
            borderRadius: 10,
            background: "linear-gradient(135deg, rgba(56,189,248,0.32), rgba(59,130,246,0.22))",
            border: "1px solid rgba(125,211,252,0.5)",
            boxShadow: "0 0 0 1px rgba(30,41,59,0.65), 0 6px 16px rgba(59,130,246,0.28)",
            transform: `translateX(${translatePercent}%)`,
            transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            pointerEvents: "none",
          }}
        />
        {safeOptions.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              style={{
                position: "relative",
                zIndex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minHeight: compact ? 30 : 36,
                padding: compact ? "6px 8px" : "8px 10px",
                border: "none",
                background: "transparent",
                color: active ? "#e2e8f0" : "#94a3b8",
                fontSize: compact ? 11 : 12,
                fontWeight: 600,
                cursor: disabled ? "not-allowed" : "pointer",
                transform: active ? "translateY(-0.5px)" : "none",
                transition: "color 140ms ease, transform 160ms ease",
              }}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      )}
      {safeOptions[selectedIndex]?.description && (
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{safeOptions[selectedIndex].description}</div>
      )}
    </div>
  );
}
