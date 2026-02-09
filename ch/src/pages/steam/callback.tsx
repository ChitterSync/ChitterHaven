"use client";

import { useEffect, useState } from "react";

const extractSteamId = (value: string | null) => {
  if (!value) return null;
  const match = value.match(/\/openid\/id\/(\d{15,20})/);
  return match ? match[1] : null;
};

export default function SteamCallback() {
  const [status, setStatus] = useState("Completing Steam link...");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const claimed = params.get("openid.claimed_id");
    const identity = params.get("openid.identity");
    const steamId = extractSteamId(claimed) || extractSteamId(identity);
    if (steamId) {
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: "chittersync:steam_linked", steamId },
            window.location.origin,
          );
        }
      } catch {}
      setStatus("Steam linked. You can close this window.");
      window.setTimeout(() => window.close(), 500);
      return;
    }
    setStatus("Steam link failed. Please try again.");
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      {status}
    </div>
  );
}
