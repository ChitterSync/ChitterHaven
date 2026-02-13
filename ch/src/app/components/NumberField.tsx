"use client";

import type React from "react";

type NumberFieldProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  className,
  style,
}: NumberFieldProps) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={className}
      style={style}
    />
  );
}

