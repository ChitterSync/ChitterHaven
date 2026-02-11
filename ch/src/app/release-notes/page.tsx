"use client";

import Link from "next/link";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { APP_VERSION, UPDATE_FEED, filterHighlightsForAudience } from "../updateNews";

const normalizeHashValue = (value: string) =>
  value.trim().toLowerCase().replace(/^#/, "").replace(/[^a-z0-9.-]/g, "");

const getVersionAliases = (version: string) => {
  const normalizedVersion = normalizeHashValue(version);
  const aliases = new Set<string>([normalizedVersion]);
  const withoutBeta = normalizedVersion.replace(/-beta$/, "");
  aliases.add(withoutBeta);
  const numericPrefix = normalizedVersion.match(/^\d+(?:\.\d+){1,3}/)?.[0];
  if (numericPrefix) aliases.add(numericPrefix);
  return Array.from(aliases).filter(Boolean);
};

export default function ReleaseNotesPage() {
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const audience = {
    isMobile,
    isAdmin: false,
    isMod: false,
  };

  useEffect(() => {
    const jumpToHash = () => {
      if (typeof window === "undefined") return;
      const raw = window.location.hash;
      if (!raw) return;
      const hash = normalizeHashValue(raw);
      if (!hash) return;

      const directTarget =
        document.getElementById(hash) ||
        document.getElementById(`release-${hash}`);
      if (directTarget) {
        directTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-release-aliases]"));
      const matched = sections.find((section) => {
        const aliasesRaw = section.dataset.releaseAliases || "";
        const aliases = aliasesRaw.split(",").map((item) => normalizeHashValue(item));
        return aliases.includes(hash);
      });
      if (matched) {
        matched.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    jumpToHash();
    window.addEventListener("hashchange", jumpToHash);
    return () => window.removeEventListener("hashchange", jumpToHash);
  }, []);

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
            const aliases = getVersionAliases(entry.version);
            const primaryAlias = aliases[0];
            return (
              <section
                key={entry.version}
                id={`release-${primaryAlias}`}
                data-release-aliases={aliases.join(",")}
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
