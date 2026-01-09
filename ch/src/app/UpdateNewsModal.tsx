"use client";

import type { CSSProperties } from "react";
import { type UpdateEntry, type UpdateHighlight, APP_VERSION } from "./updateNews";

type Props = {
  open: boolean;
  entry: UpdateEntry;
  highlights: UpdateHighlight[];
  isMobile: boolean;
  onDismiss: () => void;
  onViewNotes?: () => void;
};

const severityLabel = (severity: UpdateHighlight["severity"]) => {
  if (severity === "security") return "Security";
  if (severity === "major") return "Major";
  return "Minor";
};

export default function UpdateNewsModal({ open, entry, highlights, isMobile, onDismiss, onViewNotes }: Props) {
  if (!open) return null;
  const list = highlights.slice(0, 5);
  const containerStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 96,
    display: "flex",
    alignItems: isMobile ? "flex-end" : "flex-start",
    justifyContent: isMobile ? "center" : "flex-end",
    padding: isMobile ? "0 12px calc(12px + env(safe-area-inset-bottom))" : "16px",
  };

  const cardStyle: CSSProperties = {
    pointerEvents: "auto",
    width: isMobile ? "min(520px, 100%)" : 360,
    maxWidth: "100%",
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: isMobile ? 16 : 12,
    color: "#e2e8f0",
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
    padding: isMobile ? "16px 16px 14px" : "14px 16px",
    backdropFilter: "blur(18px)",
  };

  return (
    <div style={containerStyle} aria-live="polite">
      <div style={cardStyle} role="dialog" aria-label="What's new">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 2 }}>What's new</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>ChitterHaven v{entry.version || APP_VERSION}</div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onDismiss}
            style={{ padding: "4px 8px", color: "#e2e8f0" }}
            aria-label="Dismiss update news"
          >
            X
          </button>
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {list.map((item, index) => (
            <div key={`${item.text}-${index}`} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ marginTop: 2, color: "#38bdf8" }}>-</span>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, marginRight: 6, color: "#93c5fd" }}>
                  {severityLabel(item.severity)}
                </span>
                {item.text}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          {onViewNotes ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={onViewNotes}
              style={{ padding: "6px 10px", fontSize: 12, color: "#93c5fd" }}
            >
              View full notes
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={onDismiss}
            style={{ padding: "6px 12px", fontSize: 12, color: "#e2e8f0" }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
