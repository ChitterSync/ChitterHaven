"use client";

import React, { useLayoutEffect } from "react";

type TextBarElement = HTMLInputElement | HTMLTextAreaElement;

type TextBarProps = {
  value: string;
  onValueChange: (value: string, cursor: number) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  autoResize?: boolean;
  minHeight?: number;
  maxHeight?: number;
  maxLength?: number;
  showCounter?: boolean;
  clearable?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<TextBarElement>) => void;
  inputRef?: React.RefObject<TextBarElement | null>;
  style?: React.CSSProperties;
  className?: string;
  ariaLabel?: string;
};

export default function TextBar({
  value,
  onValueChange,
  placeholder,
  disabled,
  multiline = false,
  rows = 1,
  autoResize = false,
  minHeight,
  maxHeight,
  maxLength,
  showCounter = false,
  clearable = false,
  onKeyDown,
  inputRef,
  style,
  className,
  ariaLabel,
}: TextBarProps) {
  useLayoutEffect(() => {
    if (!multiline || !autoResize) return;
    const el = inputRef?.current;
    if (!el || !(el instanceof HTMLTextAreaElement)) return;
    el.style.height = "auto";
    const nextHeight = el.scrollHeight;
    if (typeof maxHeight === "number" && nextHeight > maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = "auto";
      return;
    }
    el.style.height = `${Math.max(nextHeight, minHeight || 0)}px`;
    el.style.overflowY = "hidden";
  }, [autoResize, inputRef, maxHeight, minHeight, multiline, value]);

  const sharedProps = {
    value,
    placeholder,
    disabled,
    className,
    "aria-label": ariaLabel,
    maxLength,
    onChange: (e: React.ChangeEvent<TextBarElement>) => {
      const cursor = e.target.selectionStart ?? e.target.value.length;
      onValueChange(e.target.value, cursor);
    },
    onKeyDown,
    style,
  };

  return (
    <div style={{ display: "grid", gap: 6, width: "100%" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
        {multiline ? (
          <textarea
            {...sharedProps}
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={rows}
          />
        ) : (
          <input
            {...sharedProps}
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
          />
        )}
        {clearable && !disabled && value.length > 0 && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => onValueChange("", 0)}
            style={{ padding: "6px 10px" }}
            aria-label="Clear text"
            title="Clear"
          >
            Clear
          </button>
        )}
      </div>
      {(showCounter || typeof maxLength === "number") && (
        <div style={{ fontSize: 11, color: "var(--ch-text-muted)", textAlign: "right" }}>
          {value.length}{typeof maxLength === "number" ? `/${maxLength}` : ""}
        </div>
      )}
    </div>
  );
}

