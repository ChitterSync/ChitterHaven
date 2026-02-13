"use client";

// --- deps (tiny but sharp).
import { useEffect, useRef, useState } from "react";
import Dropdown, { type DropdownOption } from "./components/Dropdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDesktop, faEye, faEyeSlash, faGear, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";

type LoginProps = {
  onLogin: () => void;
  authNotice?: string | null;
};

type LoginAnimationMode = "full" | "reduced" | "none";
type LoginThemeMode = "system" | "dark" | "light";

const LOGIN_UI_SETTINGS_KEY = "ch_login_ui_settings";

const loginAnimationOptions: DropdownOption[] = [
  { value: "full", label: "Full", description: "All transitions and motion.", icon: <FontAwesomeIcon icon={faSun} /> },
  { value: "reduced", label: "Reduced", description: "Shorter, subtler transitions.", icon: <FontAwesomeIcon icon={faDesktop} /> },
  { value: "none", label: "None", description: "Instant switches, no animation.", icon: <FontAwesomeIcon icon={faMoon} /> },
];

const loginThemeOptions: DropdownOption[] = [
  { value: "system", label: "System", description: "Follow device appearance.", icon: <FontAwesomeIcon icon={faDesktop} /> },
  { value: "dark", label: "Dark", description: "Dark login palette.", icon: <FontAwesomeIcon icon={faMoon} /> },
  { value: "light", label: "Light", description: "Light login palette.", icon: <FontAwesomeIcon icon={faSun} /> },
];

export default function Login({ onLogin, authNotice }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginAnimationMode, setLoginAnimationMode] = useState<LoginAnimationMode>("full");
  const [loginThemeMode, setLoginThemeMode] = useState<LoginThemeMode>("system");
  const [popupPending, setPopupPending] = useState(false);
  const [authProvider, setAuthProvider] = useState<"local" | "chittersync">(() => {
    const pref = (process.env.NEXT_PUBLIC_AUTH_PREFERENCE || "").toLowerCase();
    if (pref === "local") return "local";
    return "chittersync";
  });

  const popupRef = useRef<Window | null>(null);
  const popupTimerRef = useRef<number | null>(null);
  const popupMessageRef = useRef(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

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
    try {
      const raw = window.localStorage.getItem(LOGIN_UI_SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { animation?: LoginAnimationMode; theme?: LoginThemeMode };
      if (parsed.animation === "full" || parsed.animation === "reduced" || parsed.animation === "none") {
        setLoginAnimationMode(parsed.animation);
      }
      if (parsed.theme === "system" || parsed.theme === "dark" || parsed.theme === "light") {
        setLoginThemeMode(parsed.theme);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        LOGIN_UI_SETTINGS_KEY,
        JSON.stringify({ animation: loginAnimationMode, theme: loginThemeMode }),
      );
    } catch {}
  }, [loginAnimationMode, loginThemeMode]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const applyTheme = () => {
      const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
      const resolved = loginThemeMode === "system" ? (prefersLight ? "light" : "dark") : loginThemeMode;
      const root = document.documentElement;
      const body = document.body;
      root.setAttribute("data-theme", resolved);
      root.style.setProperty("--accent", "#60a5fa");
      if (resolved === "light") {
        root.style.setProperty("--ch-body-bg", "radial-gradient(1000px 600px at -5% -5%, rgba(59,130,246,0.15), transparent 60%), #f8fafc");
        root.style.setProperty("--ch-shell-bg", "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(226,232,240,0.9))");
        root.style.setProperty("--ch-panel", "#ffffff");
        root.style.setProperty("--ch-panel-alt", "#f8fafc");
        root.style.setProperty("--ch-panel-strong", "#e2e8f0");
        root.style.setProperty("--ch-card", "#f1f5f9");
        root.style.setProperty("--ch-card-alt", "#e2e8f0");
        root.style.setProperty("--ch-border", "#cbd5f5");
        root.style.setProperty("--ch-text", "#0f172a");
        root.style.setProperty("--ch-text-muted", "#475569");
        body.style.background = "radial-gradient(1000px 600px at -5% -5%, rgba(59,130,246,0.15), transparent 60%), #f8fafc";
        body.style.color = "#0f172a";
      } else {
        root.style.setProperty("--ch-body-bg", "radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.15), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(6,182,212,0.12), transparent 60%), #050b12");
        root.style.setProperty("--ch-shell-bg", "linear-gradient(180deg, rgba(15,23,42,0.85), rgba(17,24,39,0.82))");
        root.style.setProperty("--ch-panel", "#0b1222");
        root.style.setProperty("--ch-panel-alt", "#0f172a");
        root.style.setProperty("--ch-panel-strong", "#111827");
        root.style.setProperty("--ch-card", "#111a2e");
        root.style.setProperty("--ch-card-alt", "#081225");
        root.style.setProperty("--ch-border", "#1f2937");
        root.style.setProperty("--ch-text", "#e5e7eb");
        root.style.setProperty("--ch-text-muted", "#94a3b8");
        body.style.background = "radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.15), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(6,182,212,0.12), transparent 60%), #050b12";
        body.style.color = "#e5e7eb";
      }
      try {
        window.dispatchEvent(new CustomEvent("ch_theme_preview", { detail: { theme: resolved } }));
      } catch {}
    };

    applyTheme();
    if (loginThemeMode !== "system" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const listener = () => applyTheme();
    if (media.addEventListener) media.addEventListener("change", listener);
    else media.addListener(listener);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", listener);
      else media.removeListener(listener);
    };
  }, [loginThemeMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMouseDown = (event: MouseEvent) => {
      if (!settingsRef.current) return;
      if (settingsRef.current.contains(event.target as Node)) return;
      setSettingsOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);

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

  const animationDurationMs = loginAnimationMode === "none" ? 0 : loginAnimationMode === "reduced" ? 140 : 300;
  const transitionStyle = animationDurationMs
    ? {
        transition: `opacity ${animationDurationMs}ms ease, transform ${animationDurationMs}ms ease, max-height ${animationDurationMs}ms ease`,
      }
    : { transition: "none" };
  const hiddenTransformClass = loginAnimationMode === "none" ? "" : "-translate-y-1";
  const selectorTransition = animationDurationMs
    ? `transform ${animationDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
    : "none";

  return (
    <form onSubmit={handleSubmit} className="glass w-full max-w-[360px] mx-auto mt-6 p-6 rounded-2xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            className="btn-ghost rounded-full border border-white/15 px-2 py-1"
            onClick={() => setSettingsOpen((prev) => !prev)}
            aria-label="Login settings"
            aria-expanded={settingsOpen}
          >
            <FontAwesomeIcon icon={faGear} />
          </button>
          {settingsOpen && (
            <div
              className="absolute right-0 z-20 mt-2 grid gap-2 rounded-xl border border-white/15 bg-slate-950/95 p-2 shadow-2xl"
              style={{ width: 260 }}
            >
              <Dropdown
                options={loginAnimationOptions}
                value={loginAnimationMode}
                label="Switch Animation"
                onChange={(option) => setLoginAnimationMode(option.value as LoginAnimationMode)}
              />
              <Dropdown
                options={loginThemeOptions}
                value={loginThemeMode}
                label="Theme"
                onChange={(option) => setLoginThemeMode(option.value as LoginThemeMode)}
              />
            </div>
          )}
        </div>
      </div>
      <div className="relative flex items-center gap-2 text-xs mb-4 rounded-full border border-white/15 bg-slate-950/40 p-1">
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full border border-indigo-300/45 bg-indigo-500/20"
          style={{
            transform: authProvider === "local" ? "translateX(calc(100% + 0.5rem))" : "translateX(0)",
            transition: selectorTransition,
          }}
        />
        <button
          type="button"
          className={`relative z-[1] flex-1 rounded-full border px-3 py-1 transition-colors ${authProvider === "chittersync" ? "border-indigo-400 text-indigo-100" : "border-white/20 text-gray-400 hover:text-gray-300"}`}
          onClick={() => { if (authProvider !== "chittersync") setAuthProvider("chittersync"); setError(""); }}
        >
          ChitterSync
        </button>
        <button
          type="button"
          className={`relative z-[1] flex-1 rounded-full border px-3 py-1 transition-colors ${authProvider === "local" ? "border-indigo-400 text-indigo-100" : "border-white/20 text-gray-400 hover:text-gray-300"}`}
          onClick={() => { if (authProvider !== "local") setAuthProvider("local"); setError(""); }}
        >
          Local account
        </button>
      </div>
      {authNotice && (
        <div className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-400/40 rounded-xl px-3 py-2 mb-3">
          {authNotice}
        </div>
      )}
      <div className="relative">
        <div
          className={`transition-all duration-300 ease-out ${
            authProvider === "local"
              ? "opacity-100 translate-y-0 max-h-[1200px]"
              : `pointer-events-none opacity-0 ${hiddenTransformClass} max-h-0 overflow-hidden`
          }`}
          style={transitionStyle}
        >
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
        </div>
        <div
          className={`transition-all duration-300 ease-out ${
            authProvider === "chittersync"
              ? "opacity-100 translate-y-0 max-h-[1200px]"
              : `pointer-events-none opacity-0 ${hiddenTransformClass} max-h-0 overflow-hidden`
          }`}
          style={transitionStyle}
        >
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
        </div>
      </div>
    </form>
  );
}
