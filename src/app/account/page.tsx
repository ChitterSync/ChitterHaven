"use client";

import { useEffect, useState } from "react";

type MeResponse = {
  userId: string;
  loginId?: string;
  username: string;
  createdAt?: string;
  lastLoginAt?: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Not signed in");
        }
        const data = await res.json();
        if (!cancelled) {
          setUser(data.user ?? data);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError("You must be signed in to manage your account.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/signin/logout", { method: "POST", credentials: "include" });
      window.location.href = "/signin?loggedOut=true";
    } catch {
      // swallow errors; user can always close tab
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black to-gray-500 font-[Jost,sans-serif] p-4">
        <div className="main w-full max-w-md bg-white/10 p-8 rounded-xl shadow-lg backdrop-blur text-white">
          <h1 className="text-2xl font-bold mb-4 text-center">Account</h1>
          <p className="text-center text-gray-300">Loading your account…</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black to-gray-500 font-[Jost,sans-serif] p-4">
        <div className="main w-full max-w-md bg-white/10 p-8 rounded-xl shadow-lg backdrop-blur text-white">
          <h1 className="text-2xl font-bold mb-4 text-center">Account</h1>
          <p className="text-center text-red-300 mb-4">{error ?? "Unable to load account."}</p>
          <div className="flex justify-center gap-3">
            <a
              href="/signin"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm"
            >
              Go to sign in
            </a>
            <a
              href="/register"
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-semibold text-sm"
            >
              Create account
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black to-gray-500 font-[Jost,sans-serif] p-4">
      <div className="main w-full max-w-2xl bg-white/10 p-8 rounded-xl shadow-lg backdrop-blur text-white">
        <h1 className="text-3xl font-bold mb-2 text-center">Account Manager</h1>
        <p className="text-center text-sm text-gray-300 mb-6">
          This account is used across ChitterSync apps (auth.chittersync.com, ch.chittersync.com, and others).
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="bg-black/30 rounded-lg p-4 border border-white/10">
            <h2 className="text-lg font-semibold mb-2">Profile</h2>
            <div className="space-y-1 text-sm text-gray-200">
              <div>
                <span className="font-semibold text-gray-300">Username:</span>{" "}
                <span className="font-mono">{user.username}</span>
              </div>
              {user.loginId && (
                <div>
                  <span className="font-semibold text-gray-300">Login ID:</span>{" "}
                  <span className="font-mono">{user.loginId}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-300">User ID:</span>{" "}
                <span className="font-mono break-all">{user.userId}</span>
              </div>
            </div>
          </section>

          <section className="bg-black/30 rounded-lg p-4 border border-white/10">
            <h2 className="text-lg font-semibold mb-2">Security</h2>
            <p className="text-sm text-gray-300 mb-3">
              These controls affect sign‑in for all connected apps.
            </p>
            <button
              type="button"
              className="w-full mb-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm"
              onClick={() => {
                // Placeholder; future: link to password‑change flow
                alert("Password change coming soon. For now, use account recovery if needed.");
              }}
            >
              Change password
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm"
              onClick={handleLogout}
            >
              Sign out of this browser
            </button>
          </section>
        </div>

        <section className="mt-6 bg-black/30 rounded-lg p-4 border border-white/10">
          <h2 className="text-lg font-semibold mb-2">Connected apps</h2>
          <p className="text-sm text-gray-300">
            This account is currently used by ChitterHaven and may be used by more ChitterSync apps in the future.
          </p>
        </section>
      </div>
    </div>
  );
}

