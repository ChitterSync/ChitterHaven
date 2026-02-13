"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const [flashTargetId, setFlashTargetId] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popupMode, setPopupMode] = useState(false);
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const audience = {
    isMobile,
    isAdmin: false,
    isMod: false,
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPopupMode(new URLSearchParams(window.location.search).get("popup") === "1");
  }, []);

  useEffect(() => {
    if (!popupMode || typeof window === "undefined") return;
    const baseState = { chReleaseNotesPopup: "base" };
    const guardState = { chReleaseNotesPopup: "guard" };
    window.history.replaceState(baseState, "", window.location.href);
    window.history.pushState(guardState, "", window.location.href);
    const onPopState = () => {
      window.close();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [popupMode]);

  useEffect(() => {
    const triggerFlash = (targetId: string) => {
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }
      setFlashTargetId(targetId);
      flashTimerRef.current = setTimeout(() => {
        setFlashTargetId(null);
        flashTimerRef.current = null;
      }, 2200);
    };

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
        triggerFlash(directTarget.id);
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
        triggerFlash(matched.id);
      }
    };

    jumpToHash();
    window.addEventListener("hashchange", jumpToHash);
    return () => {
      window.removeEventListener("hashchange", jumpToHash);
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }
    };
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
            href={popupMode ? "#" : "/"}
            onClick={(event) => {
              if (!popupMode) return;
              event.preventDefault();
              window.close();
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.2)",
              color: "#93c5fd",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            {popupMode ? "Close" : "Back to chat"}
          </Link>
        </header>

        <div style={{ display: "grid", gap: 16 }}>
          {UPDATE_FEED.map((entry) => {
            const visibleHighlights = filterHighlightsForAudience(entry, audience);
            const aliases = getVersionAliases(entry.version);
            const primaryAlias = aliases[0];
            const sectionId = `release-${primaryAlias}`;
            const isFlashing = flashTargetId === sectionId;
            return (
              <section
                key={entry.version}
                id={sectionId}
                data-release-aliases={aliases.join(",")}
                style={{
                  borderRadius: 16,
                  border: isFlashing
                    ? "1px solid rgba(125,211,252,0.9)"
                    : "1px solid rgba(148,163,184,0.15)",
                  padding: "18px 18px 16px",
                  background: "rgba(15,23,42,0.8)",
                  boxShadow: isFlashing
                    ? "0 0 0 2px rgba(56,189,248,0.25), 0 12px 32px rgba(0,0,0,0.25)"
                    : "0 12px 32px rgba(0,0,0,0.25)",
                  animation: isFlashing ? "release-note-flash 2.2s ease-out 1" : undefined,
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
      <style jsx global>{`
        @keyframes release-note-flash {
          0% {
            transform: translateY(0);
            filter: brightness(1);
          }
          18% {
            transform: translateY(-2px);
            filter: brightness(1.14);
          }
          38% {
            transform: translateY(0);
            filter: brightness(1);
          }
          56% {
            transform: translateY(-1px);
            filter: brightness(1.08);
          }
          100% {
            transform: translateY(0);
            filter: brightness(1);
          }
        }
      `}</style>
    </div>
  );
}
