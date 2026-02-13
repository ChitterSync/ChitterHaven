


"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Login from "./Login";
import Main from "./Main";
import { useAuth } from "./useAuth";
import { APP_VERSION } from "./updateNews";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-400">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { authenticated, user, loading, refresh } = useAuth();
  const searchParams = useSearchParams();
  const authError = searchParams?.get("authError");
  const [fillScreenActive, setFillScreenActive] = useState(false);
  const isDevEnv = process.env.NODE_ENV === "development";
  const versionLabel = isDevEnv ? "DEV ENV" : `v${APP_VERSION}`;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const body = document.body;
    setFillScreenActive(body?.dataset?.chFillScreen === "true");
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ enabled: boolean }>;
      if (custom?.detail) {
        setFillScreenActive(!!custom.detail.enabled);
      }
    };
    window.addEventListener("ch_fill_screen", handler as EventListener);
    return () => window.removeEventListener("ch_fill_screen", handler as EventListener);
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="hidden md:block text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-300">
        ChitterHaven Community
      </h1>
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : authenticated && user ? (
        <Main username={user.username} />
      ) : (
        <Login onLogin={refresh} authNotice={authError} />
      )}
      {!fillScreenActive && (
        <footer className="mt-10 text-center text-xs text-gray-400 max-w-3xl">
          <p>ChitterSync Ac {new Date().getFullYear()}</p>
          <p className="hidden md:block opacity-80">This is a Beta version of ChitterHaven. Accounts and messages may be purged at any time during testing.</p>
          <button
            type="button"
            className="hidden md:inline-block opacity-80 hover:opacity-100 underline underline-offset-4"
            onClick={() => {
              if (typeof window === "undefined") return;
              const popupUrl = "/release-notes?popup=1";
              const width = Math.min(1100, Math.max(860, Math.floor(window.innerWidth * 0.9)));
              const height = Math.min(900, Math.max(640, Math.floor(window.innerHeight * 0.9)));
              const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
              const top = Math.max(0, Math.floor((window.screen.height - height) / 2));
              window.open(
                popupUrl,
                "ch_release_notes_popup",
                `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
              );
            }}
            title="Open release notes in a popup window"
          >
            {versionLabel}
          </button>
        </footer>
      )}
    </div>
  );
}
