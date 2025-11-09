"use client";

import { useEffect, useRef } from "react";

type Settings = {
  theme?: "dark" | "light" | "system";
  accentHex?: string;
};

const applyTheme = (s: Settings) => {
  const root = document.documentElement;
  const body = document.body;
  const prefersLight = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = s.theme === 'system' || !s.theme ? (prefersLight ? 'light' : 'dark') : s.theme;
  root.setAttribute('data-theme', theme);
  const accent = s.accentHex || '#60a5fa';
  root.style.setProperty('--accent', accent);
  // Basic body palette flip (most UI is inline-styled; this provides a baseline)
  if (theme === 'light') {
    body.style.backgroundColor = '#f8fafc';
    body.style.color = '#0f172a';
  } else {
    body.style.backgroundColor = '';
    body.style.color = '';
  }
};

export default function ThemeController() {
  const appliedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/settings');
        const d = await r.json();
        applyTheme(d || {});
      } catch {}
      appliedRef.current = true;
    };
    load();

    const onUpdated = (e: any) => {
      const s = e?.detail || {};
      applyTheme(s);
    };
    window.addEventListener('ch_settings_updated', onUpdated as any);
    return () => window.removeEventListener('ch_settings_updated', onUpdated as any);
  }, []);

  return null;
}

