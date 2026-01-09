"use client";

import type { CSSProperties } from "react";

export type InvitePreview = {
  code: string;
  haven: string;
  name: string;
  icon: string | null;
  memberCount?: number | null;
  maxUses?: number | null;
  uses?: number | null;
  expiresAt?: number | null;
};

type Props = {
  preview?: InvitePreview | null;
  status?: "loading" | "error" | "ready";
  error?: string | null;
  isJoined?: boolean;
  isBusy?: boolean;
  onJoin?: () => void;
};

const cardStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.2)",
  background: "rgba(15,23,42,0.8)",
  padding: 12,
  display: "grid",
  gap: 8,
};

export default function InviteCard({ preview, status, error, isJoined, isBusy, onJoin }: Props) {
  if (status === "error") {
    return (
      <div style={{ ...cardStyle, borderColor: "rgba(248,113,113,0.4)", background: "rgba(30,6,12,0.6)" }}>
        <div style={{ fontWeight: 600, color: "#fca5a5" }}>Invite unavailable</div>
        <div style={{ fontSize: 12, color: "#fecaca" }}>{error || "This invite is invalid or expired."}</div>
      </div>
    );
  }
  if (status === "loading" || !preview) {
    return (
      <div style={cardStyle}>
        <div style={{ fontWeight: 600 }}>Loading invite...</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Fetching haven details.</div>
      </div>
    );
  }
  const membersLabel =
    typeof preview.memberCount === "number" ? `${preview.memberCount} member${preview.memberCount === 1 ? "" : "s"}` : null;
  const usesLabel =
    typeof preview.maxUses === "number"
      ? `${preview.uses ?? 0}/${preview.maxUses} uses`
      : preview.maxUses === null
        ? "Unlimited uses"
        : null;
  const expiresLabel =
    typeof preview.expiresAt === "number"
      ? `Expires ${new Date(preview.expiresAt).toLocaleDateString()}`
      : preview.expiresAt === null
        ? "No expiry"
        : null;
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.3)",
            background: "rgba(2,6,23,0.8)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {preview.icon ? (
            <img src={preview.icon} alt={preview.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontWeight: 700, color: "#cbd5f5" }}>{preview.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 14 }}>{preview.name}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{preview.haven}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#94a3b8" }}>
        {membersLabel && <span>{membersLabel}</span>}
        {usesLabel && <span>{usesLabel}</span>}
        {expiresLabel && <span>{expiresLabel}</span>}
      </div>
      <button
        type="button"
        className="btn-ghost"
        onClick={onJoin}
        disabled={isBusy}
        style={{
          padding: "6px 10px",
          borderRadius: 10,
          color: isJoined ? "#22c55e" : "#93c5fd",
          border: "1px solid rgba(148,163,184,0.3)",
          background: "rgba(2,6,23,0.6)",
          cursor: isBusy ? "default" : "pointer",
          opacity: isBusy ? 0.7 : 1,
        }}
      >
        {isBusy ? "Joining..." : isJoined ? "Open Server" : "Join Server"}
      </button>
    </div>
  );
}
