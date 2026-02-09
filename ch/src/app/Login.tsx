"use client";

// --- deps (tiny but sharp).
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

type LoginProps = {
  onLogin: () => void;
  authNotice?: string | null;
};

export default function Login({ onLogin, authNotice }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [popupPending, setPopupPending] = useState(false);
  const [authProvider, setAuthProvider] = useState<"local" | "chittersync">(() => {
    const pref = (process.env.NEXT_PUBLIC_AUTH_PREFERENCE || "").toLowerCase();
    if (pref === "local") return "local";
    return "chittersync";
  });

  const popupRef = useRef<Window | null>(null);
  const popupTimerRef = useRef<number | null>(null);
  const popupMessageRef = useRef(false);

  const authBaseUrl = (
    process.env.NEXT_PUBLIC_CS_AUTH_URL ||
    process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
    "https://auth.chittersync.com"
  ).replace(/\/$/, "");

  const authOrigin = (() => {
    try {
      return new URL(authBaseUrl).origin;
    } catch {
      return "";
    }
  })();

  const buildAuthRedirect = (path: "signin" | "register") => {
    if (!authBaseUrl) return null;
    const returnTo = `${window.location.pathname}${window.location.search}`;
    return `${authBaseUrl}/${path}?redirect=${encodeURIComponent(returnTo)}`;
  };

  const isTrustedRedirect = (url: string, allowedDomains?: string[]) => {
    const domains = allowedDomains || ["chittersync.com", "ch.chittersync.com"];
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin) return true;
      return domains.some((domain) => {
        const host = parsed.hostname;
        return host === domain || host.endsWith(`.${domain}`);
      });
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; redirectUrl?: string } | null;
      if (!data || data.type !== "chittersync:auth") return;
      if (authOrigin && event.origin !== authOrigin) return;
      popupMessageRef.current = true;
      if (popupTimerRef.current !== null) {
        window.clearInterval(popupTimerRef.current);
        popupTimerRef.current = null;
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      setPopupPending(false);
      if (data.redirectUrl && isTrustedRedirect(data.redirectUrl)) {
        window.location.href = data.redirectUrl;
        return;
      }
      onLogin();
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (popupTimerRef.current !== null) {
        window.clearInterval(popupTimerRef.current);
        popupTimerRef.current = null;
      }
    };
  }, [authOrigin, onLogin]);

  const openAuthPopup = (url: string) => {
    if (typeof window === "undefined") return;
    const width = 520;
    const height = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const features = [
      "popup=yes",
      "toolbar=no",
      "location=no",
      "status=no",
      "menubar=no",
      "scrollbars=yes",
      "resizable=yes",
      `width=${width}`,
      `height=${height}`,
      `left=${Math.round(left)}`,
      `top=${Math.round(top)}`,
    ].join(",");

    const popup = window.open(url, "chittersync_auth", features);
    if (!popup) {
      return false;
    }
    popupRef.current = popup;
    popupMessageRef.current = false;
    setPopupPending(true);

    if (popupTimerRef.current !== null) {
      window.clearInterval(popupTimerRef.current);
    }
    popupTimerRef.current = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(popupTimerRef.current as number);
        popupTimerRef.current = null;
        setPopupPending(false);
        if (!popupMessageRef.current) {
          onLogin();
        }
      }
    }, 500);

    return true;
  };

  const handleChitterSyncLogin = () => {
    if (typeof window === "undefined") return;
    if (!authBaseUrl) {
      setError("ChitterSync auth is not configured.");
      return;
    }
    const returnTo = `${window.location.pathname}${window.location.search}`;
    const target = `/api/auth/start?returnTo=${encodeURIComponent(returnTo)}`;
    const opened = openAuthPopup(target);
    if (!opened) {
      setPopupPending(false);
      window.location.href = target;
    }
  };

  const handleChitterSyncRegister = () => {
    if (typeof window === "undefined") return;
    const target = buildAuthRedirect("register");
    if (!target) {
      setError("ChitterSync auth is not configured.");
      return;
    }
    const opened = openAuthPopup(target);
    if (!opened) {
      setPopupPending(false);
      window.location.href = target;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }
    const endpoint = mode === "login" ? "/api/login" : "/api/register";
    const requestBody = { username, password };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await res.json();
    if (data.success) {
      onLogin();
    } else {
      setError(data.error || (mode === "login" ? "Login failed" : "Registration failed"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass w-full max-w-[360px] mx-auto mt-6 p-6 rounded-2xl">
      <h2 className="text-xl font-semibold mb-4">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h2>
      <div className="flex items-center gap-2 text-xs mb-4">
        <button
          type="button"
          className={`flex-1 rounded-full border px-3 py-1 ${authProvider === "chittersync" ? "border-indigo-400 text-indigo-200" : "border-white/20 text-gray-400"}`}
          onClick={() => { setAuthProvider("chittersync"); setError(""); }}
        >
          ChitterSync
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full border px-3 py-1 ${authProvider === "local" ? "border-indigo-400 text-indigo-200" : "border-white/20 text-gray-400"}`}
          onClick={() => { setAuthProvider("local"); setError(""); }}
        >
          Local account
        </button>
      </div>
      {authNotice && (
        <div className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-400/40 rounded-xl px-3 py-2 mb-3">
          {authNotice}
        </div>
      )}
      {authProvider === "local" ? (
        <>
          <div className="space-y-3">
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              className="input-dark w-full px-3 py-2"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="input-dark w-full px-3 py-2 pr-10"
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost p-1"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>
          {error && <div className="text-red-400 text-sm mt-3">{error}</div>}
          <button type="submit" className="btn-primary w-full mt-4 py-2 text-sm font-medium">
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
          <div className="text-center mt-4 text-sm">
            {mode === "login" ? (
              <button
                type="button"
                className="text-indigo-400 hover:text-indigo-300"
                onClick={() => { setMode("register"); setError(""); }}
              >
                Create an account
              </button>
            ) : (
              <button
                type="button"
                className="text-indigo-400 hover:text-indigo-300"
                onClick={() => { setMode("login"); setError(""); }}
              >
                Back to login
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-4">
            <span className="flex-1 h-px bg-white/10" />
            <span>or</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>
          <button
            type="button"
            onClick={handleChitterSyncLogin}
            className="btn-chittersync w-full mt-3 py-2 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={popupPending}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {popupPending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                  Awaiting modal...
                </span>
              ) : (
                <>
                  <img
                    className="cs-logo cs-logo-fade"
                    src="https://avatars.githubusercontent.com/u/206038594?s=200&v=4"
                    alt="ChitterSync logo"
                  />
                  Continue with ChitterSync
                </>
              )}
            </span>
          </button>
        </>
      ) : (
        <>
          {error && <div className="text-red-400 text-sm mt-3">{error}</div>}
          <button
            type="button"
            onClick={handleChitterSyncLogin}
            className="btn-chittersync w-full mt-2 py-2 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={popupPending}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {popupPending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                  Awaiting modal...
                </span>
              ) : (
                <>
                  <img
                    className="cs-logo cs-logo-fade"
                    src="https://avatars.githubusercontent.com/u/206038594?s=200&v=4"
                    alt="ChitterSync logo"
                  />
                  Sign in with ChitterSync
                </>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={handleChitterSyncRegister}
            className="btn-primary w-full mt-3 py-2 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={popupPending}
          >
            {popupPending ? "Awaiting modal..." : "Create a ChitterSync account"}
          </button>
        </>
      )}
    </form>
  );
}
