"use client";

import type React from "react";

type RangeFieldProps = {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
};

export default function RangeField({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  valueLabel,
  formatValue,
  style,
  inputStyle,
}: RangeFieldProps) {
  const shown = typeof formatValue === "function" ? formatValue(value) : valueLabel ?? String(value);
  return (
    <div className="range-row" style={style}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={inputStyle}
      />
      <span className="range-value">{shown}</span>
    </div>
  );
}

