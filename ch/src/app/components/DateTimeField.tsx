"use client";

import React from "react";

type DateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  mode?: "date" | "time" | "datetime-local";
  disabled?: boolean;
  min?: string;
  max?: string;
  step?: number;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  clearable?: boolean;
  clearLabel?: string;
};

export default function DateTimeField({
  value,
  onChange,
  mode = "datetime-local",
  disabled,
  min,
  max,
  step,
  placeholder,
  className,
  style,
  inputStyle,
  clearable = false,
  clearLabel = "Clear",
}: DateTimeFieldProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, ...style }}>
      <input
        type={mode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={className}
        style={inputStyle}
      />
      {clearable && !disabled && value && (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onChange("")}
          style={{ padding: "6px 10px" }}
          aria-label={clearLabel}
          title={clearLabel}
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}

