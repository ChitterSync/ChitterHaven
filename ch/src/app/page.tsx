


"use client";
import { useEffect, useState } from "react";
import Login from "./Login";
import Main from "./Main";

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d && d.user && d.user.username) setUser(d.user.username);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-300">
        ChitterHaven Community
      </h1>
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : user ? <Main username={user} /> : <Login onLogin={setUser} />}
      <footer className="mt-10 text-center text-xs text-gray-400 max-w-3xl">
        <p>ChitterSync © {new Date().getFullYear()}</p>
        <p className="opacity-80">This is a temporary demo version of ChitterHaven. Accounts and messages may be purged at any time during testing.</p>
      </footer>
    </div>
  );
}
