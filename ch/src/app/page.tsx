


"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Login from "./Login";
import Main from "./Main";
import { useAuth } from "./useAuth";

export default function Home() {
  const { authenticated, user, loading, refresh } = useAuth();
  const searchParams = useSearchParams();
  const authError = searchParams?.get("authError");
  const [fillScreenActive, setFillScreenActive] = useState(false);
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
          <p className="hidden md:block opacity-80">v0.2.1 BETA</p>
        </footer>
      )}
    </div>
  );
}
