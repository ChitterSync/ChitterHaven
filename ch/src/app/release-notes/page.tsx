"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { APP_VERSION, UPDATE_FEED, filterHighlightsForAudience } from "../updateNews";

export default function ReleaseNotesPage() {
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const audience = {
    isMobile,
    isAdmin: false,
    isMod: false,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1120", color: "#e2e8f0", padding: "24px 16px 64px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Release notes</div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>What's New in ChitterHaven</h1>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Current version: {APP_VERSION}</div>
          </div>
          <Link
            href="/"
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.2)",
              color: "#93c5fd",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            Back to chat
          </Link>
        </header>

        <div style={{ display: "grid", gap: 16 }}>
          {UPDATE_FEED.map((entry) => {
            const visibleHighlights = filterHighlightsForAudience(entry, audience);
            return (
              <section
                key={entry.version}
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.15)",
                  padding: "18px 18px 16px",
                  background: "rgba(15,23,42,0.8)",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>{entry.releasedAt}</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>v{entry.version}</div>
                  </div>
                </div>

                {visibleHighlights.length > 0 && (
                  <ul style={{ marginTop: 12, paddingLeft: 18, display: "grid", gap: 8, fontSize: 14 }}>
                    {visibleHighlights.map((item, index) => (
                      <li key={`${item.text}-${index}`}>
                        <strong style={{ color: "#93c5fd", marginRight: 6 }}>{item.severity}</strong>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                )}

                {entry.fullNotesMarkdown && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "12px 12px 4px",
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.12)",
                      background: "rgba(2,6,23,0.6)",
                      fontSize: 14,
                    }}
                  >
                    {/* @ts-expect-error react-markdown supports children */}
                    <ReactMarkdown>{entry.fullNotesMarkdown}</ReactMarkdown>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
