"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  iconUrl?: string;
  action?: {
    label?: string;
    title?: string;
    icon?: React.ReactNode;
    onClick?: (option: DropdownOption, event: React.MouseEvent<HTMLButtonElement>) => void;
  };
};

type DropdownProps = {
  options: DropdownOption[];
  value?: string | null;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
  onChange?: (option: DropdownOption) => void;
};

/**
 * Accessible custom dropdown that matches ChitterHaven's glass UI.
 * Includes keyboard navigation, outside-click closing, and optional descriptions/icons.
 */
export default function Dropdown({
  options,
  value,
  placeholder = "Select an option",
  disabled = false,
  label,
  className = "",
  onChange,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const normalizedOptions = useMemo(() => options ?? [], [options]);
  const selected = useMemo(
    () => normalizedOptions.find((opt) => opt.value === value) || null,
    [normalizedOptions, value]
  );

  useEffect(() => {
    if (!open) return;
    const handleClick = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(ev.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const moveHighlight = (delta: number) => {
    setHighlight((prev) => {
      const next = (prev + delta + normalizedOptions.length) % normalizedOptions.length;
      return isNaN(next) ? 0 : next;
    });
  };

  const renderOptionIcon = (opt: DropdownOption) => {
    if (opt.icon) {
      return <span className="ch-dropdown__icon-node" aria-hidden>{opt.icon}</span>;
    }
    if (opt.iconUrl) {
      return <img src={opt.iconUrl} alt="" className="ch-dropdown__icon" />;
    }
    return null;
  };

  const commitHighlight = () => {
    const option = normalizedOptions[highlight];
    if (!option) return;
    onChange?.(option);
    setOpen(false);
  };
  // Accessible announcement for action clicks
  const [srMessage, setSrMessage] = useState("");
  const srTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!srMessage) return;
    if (srTimerRef.current) window.clearTimeout(srTimerRef.current);
    srTimerRef.current = window.setTimeout(() => setSrMessage(""), 2500);
    return () => {
      if (srTimerRef.current) window.clearTimeout(srTimerRef.current);
    };
  }, [srMessage]);

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open && (ev.key === "ArrowDown" || ev.key === "ArrowUp" || ev.key === " " || ev.key === "Enter")) {
      ev.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      moveHighlight(1);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      moveHighlight(-1);
    } else if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      commitHighlight();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div
      className={`ch-dropdown ${className}`}
      data-open={open ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
      ref={containerRef}
    >
      {label && (
        <div className="ch-dropdown__label">
          {label}
        </div>
      )}
      <button
        type="button"
        className="ch-dropdown__control"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        <div className="ch-dropdown__value">
          {selected ? (
            <>
              {renderOptionIcon(selected)}
              <span className="ch-dropdown__value-text">
                <span>{selected.label}</span>
                {selected.description && <span className="ch-dropdown__value-desc">{selected.description}</span>}
              </span>
            </>
          ) : (
            <span className="ch-dropdown__placeholder">{placeholder}</span>
          )}
        </div>
        <span className="ch-dropdown__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && normalizedOptions.length > 0 && (
        <div className="ch-dropdown__menu" role="listbox">
          {normalizedOptions.map((opt, idx) => {
            const isActive = selected?.value === opt.value;
            const isHighlighted = idx === highlight;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isActive}
                tabIndex={-1}
                className={`ch-dropdown__option${isActive ? " is-active" : ""}${isHighlighted ? " is-highlighted" : ""}`}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => {
                  onChange?.(opt);
                  setOpen(false);
                }}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onChange?.(opt);
                    setOpen(false);
                  }
                }}
              >
                {renderOptionIcon(opt)}
                <div className="ch-dropdown__option-body">
                  <div className="ch-dropdown__option-label">{opt.label}</div>
                  {opt.description && (
                    <div className="ch-dropdown__option-desc">{opt.description}</div>
                  )}
                </div>
                {opt.action && (
                  <button
                    type="button"
                    className="ch-dropdown__option-action"
                    title={opt.action.title || opt.action.label}
                    aria-label={`${opt.label} ${opt.action.title || opt.action.label}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      opt.action?.onClick?.(opt, ev);
                      // announce to screen readers that the action ran
                      try { setSrMessage(`${opt.label} ${opt.action?.title || opt.action?.label || 'action'} activated`); } catch {}
                    }}
                  >
                    {opt.action.icon || opt.action.label || "⋯"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Live region for screen-readers: announced when action buttons are pressed */}
      {srMessage && (
        <div aria-live="polite" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>{srMessage}</div>
      )}
      <style jsx>{`
        .ch-dropdown {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: #e5e7eb;
          width: 100%;
          max-width: 280px;
        }
        .ch-dropdown[data-disabled="true"] {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .ch-dropdown__label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
        }
        .ch-dropdown__control {
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          padding: 10px 12px;
          background: rgba(8, 12, 24, 0.85);
          color: inherit;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          transition: border-color 140ms ease, box-shadow 140ms ease, transform 120ms ease, background 140ms ease;
        }
        .ch-dropdown__control:hover {
          border-color: rgba(148, 163, 184, 0.42);
          transform: translateY(-1px);
        }
        .ch-dropdown__control:focus-visible {
          outline: none;
          border-color: var(--ch-accent, #60a5fa);
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25);
        }
        .ch-dropdown__control:disabled {
          cursor: not-allowed;
        }
        .ch-dropdown__value {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          min-width: 0;
        }
        .ch-dropdown__value-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1px;
        }
        .ch-dropdown__value-text > span:first-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .ch-dropdown__value-desc {
          font-size: 11px;
          color: #94a3b8;
        }
        .ch-dropdown__placeholder {
          color: #64748b;
        }
        .ch-dropdown__icon {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          object-fit: cover;
        }
        .ch-dropdown__icon-node {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.25);
          color: #cbd5e1;
          font-size: 11px;
          flex: 0 0 auto;
        }
        .ch-dropdown__chevron {
          font-size: 13px;
          color: #94a3b8;
          transition: transform 180ms ease, color 140ms ease;
        }
        .ch-dropdown[data-open="true"] .ch-dropdown__chevron {
          transform: rotate(180deg);
          color: #cbd5f5;
        }
        .ch-dropdown__menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(6, 10, 20, 0.98);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
          padding: 6px;
          max-height: 260px;
          overflow-y: auto;
          z-index: 30;
          transform-origin: top center;
          animation: ch-dropdown-enter 170ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ch-dropdown__option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
        }
        .ch-dropdown__option-body {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .ch-dropdown__option-label {
          font-size: 14px;
        }
        .ch-dropdown__option-desc {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .ch-dropdown__option.is-highlighted {
          background: rgba(96, 165, 250, 0.12);
          border-color: rgba(96, 165, 250, 0.35);
          transform: translateY(-1px);
        }
        .ch-dropdown__option.is-active {
          border-color: var(--ch-accent, #60a5fa);
        }
        .ch-dropdown__option-action {
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(15, 23, 42, 0.7);
          color: #cbd5f5;
          padding: 8px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: background 100ms ease, border-color 100ms ease;
        }
        .ch-dropdown__option-action:hover {
          border-color: var(--ch-accent, #60a5fa);
          color: #fff;
        }
        @keyframes ch-dropdown-enter {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 640px) {
          .ch-dropdown {
            max-width: 100%;
          }
          .ch-dropdown__control { padding: 12px 14px; }
          .ch-dropdown__option { padding: 14px; }
          .ch-dropdown__option-action { padding: 10px 12px; font-size: 14px; }
          .ch-dropdown__menu { padding: 8px; max-height: 56vh; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ch-dropdown__control,
          .ch-dropdown__chevron,
          .ch-dropdown__menu,
          .ch-dropdown__option {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
