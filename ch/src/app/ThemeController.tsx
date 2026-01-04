"use client";

import { useEffect, useRef } from "react";

type ThemeStop = { color: string; position: number };

type Settings = {
  theme?: "system" | "dark" | "light" | "midnight" | "sunset" | "forest" | "neon" | "ocean" | "custom";
  accentHex?: string;
  customThemeGradient?: string;
  customThemeImage?: string;
  customThemeStops?: ThemeStop[];
  customThemeAngle?: number;
};

type ThemePalette = {
  panel: string;
  panelAlt: string;
  panelStrong: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
};

type ThemePreset = {
  body: string;
  shell: string;
  shellSize?: string;
  shellPosition?: string;
  shellRepeat?: string;
  palette: ThemePalette;
};

type RGB = { r: number; g: number; b: number };

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex?: string): RGB | null => {
  if (!hex) return null;
  let value = hex.replace('#', '').trim();
  if (!value) return null;
  if (value.length === 3) {
    value = value
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (value.length !== 6) return null;
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const rgbToHex = (rgb: RGB): string => {
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(Math.round(rgb.r))}${toHex(Math.round(rgb.g))}${toHex(Math.round(rgb.b))}`;
};

const parseRgbString = (value: string): RGB | null => {
  const match = value
    .replace(/\s+/g, '')
    .match(/^rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3})(?:,(\d*(?:\.\d+)?))?\)$/i);
  if (!match) return null;
  const [, rStr, gStr, bStr, aStr] = match;
  const r = Number(rStr);
  const g = Number(gStr);
  const b = Number(bStr);
  const alpha = aStr === undefined ? 1 : Number(aStr);
  if ([r, g, b, alpha].some((n) => Number.isNaN(n))) return null;
  const blendAgainst = 255 * (1 - clamp(alpha, 0, 1));
  return {
    r: clamp(r + blendAgainst, 0, 255),
    g: clamp(g + blendAgainst, 0, 255),
    b: clamp(b + blendAgainst, 0, 255),
  };
};

const toRGB = (value?: string): RGB | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return hexToRgb(trimmed) || parseRgbString(trimmed);
};

const mixColors = (base: string, blend: string, ratio: number): string => {
  const colorA = toRGB(base);
  const colorB = toRGB(blend);
  if (!colorA || !colorB) {
    return base;
  }
  const weight = clamp(ratio, 0, 1);
  const mixed: RGB = {
    r: colorA.r + (colorB.r - colorA.r) * weight,
    g: colorA.g + (colorB.g - colorA.g) * weight,
    b: colorA.b + (colorB.b - colorA.b) * weight,
  };
  return rgbToHex(mixed);
};

const getLuminance = (value?: string) => {
  const rgb = toRGB(value);
  if (!rgb) return 0;
  const { r, g, b } = rgb;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const baseDarkPalette: ThemePalette = {
  panel: '#0b1222',
  panelAlt: '#0f172a',
  panelStrong: '#111827',
  card: '#111a2e',
  cardAlt: '#081225',
  border: '#1f2937',
  text: '#e5e7eb',
  textMuted: '#94a3b8',
};

const baseLightPalette: ThemePalette = {
  panel: '#ffffff',
  panelAlt: '#f8fafc',
  panelStrong: '#e2e8f0',
  card: '#f1f5f9',
  cardAlt: '#e2e8f0',
  border: '#cbd5f5',
  text: '#0f172a',
  textMuted: '#475569',
};

const paletteFromBase = (primary: string, mode: 'dark' | 'light' = 'dark'): ThemePalette => {
  if (mode === 'light') {
    const neutral = '#ffffff';
    return {
      panel: mixColors(neutral, primary, 0.05),
      panelAlt: mixColors(neutral, primary, 0.1),
      panelStrong: mixColors('#f1f5f9', primary, 0.18),
      card: mixColors('#ffffff', primary, 0.08),
      cardAlt: mixColors('#f8fafc', primary, 0.15),
      border: mixColors('#cbd5f5', primary, 0.25),
      text: '#0f172a',
      textMuted: '#475569',
    };
  }
  const neutral = '#050b12';
  return {
    panel: mixColors(neutral, primary, 0.18),
    panelAlt: mixColors('#050e1c', primary, 0.24),
    panelStrong: mixColors('#030c18', primary, 0.32),
    card: mixColors('#060b1a', primary, 0.26),
    cardAlt: mixColors('#040a18', primary, 0.35),
    border: mixColors('#111827', primary, 0.35),
    text: '#e5e7eb',
    textMuted: '#9ca3af',
  };
};

const gradientTokenRegex = /rgba?\([^\)]+\)|#[0-9a-f]{3,8}/gi;

const extractPrimaryColor = (gradient?: string): string | null => {
  if (!gradient) return null;
  const matches = gradient.match(gradientTokenRegex);
  if (!matches || matches.length === 0) return null;
  for (const token of matches) {
    const rgb = toRGB(token);
    if (rgb) {
      return rgbToHex(rgb);
    }
  }
  return null;
};

const buildGradientFromStops = (stops?: ThemeStop[], angle?: number): string | null => {
  if (!Array.isArray(stops) || stops.length < 2) return null;
  const sanitized = stops
    .filter((stop) => stop && typeof stop.color === 'string' && stop.color.trim().length > 0)
    .map((stop) => ({
      color: stop.color.trim(),
      position: clamp(Number(stop.position), 0, 100),
    }));
  if (sanitized.length < 2) return null;
  const sorted = sanitized.sort((a, b) => a.position - b.position);
  const angleValue = Number.isFinite(angle) ? Number(angle) : 135;
  return `linear-gradient(${angleValue}deg, ${sorted
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(', ')})`;
};

const buildPaletteFromGradient = (gradient: string, accentHex?: string): ThemePalette => {
  const primary = extractPrimaryColor(gradient) || accentHex || '#60a5fa';
  const luminance = getLuminance(primary);
  const mode: 'dark' | 'light' = luminance > 0.65 ? 'light' : 'dark';
  return paletteFromBase(primary, mode);
};

const THEME_PRESETS: Record<string, ThemePreset> = {
  dark: {
    body: "radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.15), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(6,182,212,0.12), transparent 60%), #050b12",
    shell: "linear-gradient(180deg, rgba(15,23,42,0.85), rgba(17,24,39,0.82))",
    palette: baseDarkPalette,
  },
  light: {
    body: "radial-gradient(1000px 600px at -5% -5%, rgba(59,130,246,0.15), transparent 60%), #f8fafc",
    shell: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(226,232,240,0.9))",
    palette: baseLightPalette,
  },
  midnight: {
    body: "radial-gradient(900px 600px at 10% -10%, rgba(59,7,100,0.35), transparent 60%), radial-gradient(600px 500px at 90% 0%, rgba(17,24,39,0.45), transparent 70%), #030712",
    shell: "linear-gradient(135deg, rgba(17,24,39,0.95), rgba(2,6,23,0.92))",
    palette: {
      ...baseDarkPalette,
      panel: '#060818',
      panelAlt: '#080a1c',
      panelStrong: '#090b1e',
      card: '#0c1022',
      cardAlt: '#090b1c',
      border: '#1c2540',
    },
  },
  sunset: {
    body: "radial-gradient(800px 500px at 20% -5%, rgba(251,113,133,0.35), transparent 65%), radial-gradient(600px 480px at 80% 5%, rgba(251,191,36,0.25), transparent 60%), #0b0614",
    shell: "linear-gradient(145deg, rgba(232,121,249,0.9), rgba(251,146,60,0.85))",
    palette: {
      ...baseDarkPalette,
      panel: '#170716',
      panelAlt: '#1e0b1c',
      panelStrong: '#240f20',
      card: '#1a0b17',
      cardAlt: '#1f0c19',
      border: '#402136',
    },
  },
  forest: {
    body: "radial-gradient(900px 620px at 0% -10%, rgba(74,222,128,0.3), transparent 60%), radial-gradient(700px 520px at 100% 0%, rgba(45,212,191,0.25), transparent 60%), #04110c",
    shell: "linear-gradient(150deg, rgba(6,78,59,0.92), rgba(2,44,34,0.95))",
    palette: {
      ...baseDarkPalette,
      panel: '#051b15',
      panelAlt: '#07231c',
      panelStrong: '#082b21',
      card: '#062019',
      cardAlt: '#07261d',
      border: '#133c2f',
    },
  },
  neon: {
    body: "radial-gradient(900px 600px at 10% -10%, rgba(248,113,113,0.35), transparent 60%), radial-gradient(700px 520px at 90% 5%, rgba(129,140,248,0.3), transparent 60%), #020617",
    shell: "linear-gradient(135deg, rgba(236,72,153,0.92), rgba(79,70,229,0.9))",
    palette: {
      ...baseDarkPalette,
      panel: '#09081c',
      panelAlt: '#0c0a22',
      panelStrong: '#0f0d27',
      card: '#0c0a20',
      cardAlt: '#100d26',
      border: '#30244b',
    },
  },
  ocean: {
    body: "radial-gradient(900px 620px at 15% -10%, rgba(56,189,248,0.32), transparent 60%), radial-gradient(600px 480px at 85% 0%, rgba(59,130,246,0.35), transparent 60%), #021019",
    shell: "linear-gradient(145deg, rgba(5,150,199,0.9), rgba(30,64,175,0.92))",
    palette: {
      ...baseDarkPalette,
      panel: '#031420',
      panelAlt: '#051b28',
      panelStrong: '#072033',
      card: '#041827',
      cardAlt: '#031223',
      border: '#123049',
    },
  },
};

const defaultCustomGradient = "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(30,27,75,0.95))";

const buildCustomPreset = (s: Settings): ThemePreset => {
  const gradientFromStops = buildGradientFromStops(s.customThemeStops, s.customThemeAngle);
  const gradient = (typeof s.customThemeGradient === "string" && s.customThemeGradient.trim().length > 0)
    ? s.customThemeGradient.trim()
    : (gradientFromStops || defaultCustomGradient);
  const image = typeof s.customThemeImage === "string" && s.customThemeImage.trim().length > 0
    ? s.customThemeImage.trim()
    : "";
  const shell = image ? `${gradient}, url(${image})` : gradient;
  const palette = buildPaletteFromGradient(gradient, s.accentHex);
  return {
    body: image ? `${gradient}, url(${image})` : gradient,
    shell,
    shellSize: image ? "cover" : undefined,
    shellPosition: image ? "center" : undefined,
    shellRepeat: image ? "no-repeat" : undefined,
    palette,
  };
};

let themeTransitionTimeout: number | null = null;

const enableThemeTransition = (palette: ThemePalette) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  const luminance = getLuminance(palette.panel);
  const duration = luminance > 0.55 ? 900 : 420;
  root.style.setProperty('--ch-theme-transition-duration', `${duration}ms`);
  root.classList.add('ch-theme-transition');
  body.classList.add('ch-theme-transition');
  if (themeTransitionTimeout && typeof window !== 'undefined') {
    window.clearTimeout(themeTransitionTimeout);
  }
  themeTransitionTimeout = window.setTimeout(() => {
    root.classList.remove('ch-theme-transition');
    body.classList.remove('ch-theme-transition');
  }, duration + 150);
};

const normalizePayload = (raw: any): Settings => {
  if (raw && typeof raw === 'object' && 'settings' in raw && typeof raw.settings === 'object') {
    return raw.settings as Settings;
  }
  return (raw || {}) as Settings;
};

const applyTheme = (rawSettings: any) => {
  const s = normalizePayload(rawSettings);
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  const prefersLight = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = s.theme === 'system' || !s.theme ? (prefersLight ? 'light' : 'dark') : s.theme;
  root.setAttribute('data-theme', theme);
  const accent = s.accentHex || '#60a5fa';
  root.style.setProperty('--accent', accent);
  const preset = theme === 'custom'
    ? buildCustomPreset(s)
    : (THEME_PRESETS[theme] || THEME_PRESETS.dark);
  root.style.setProperty('--ch-shell-bg', preset.shell);
  root.style.setProperty('--ch-shell-bg-size', preset.shellSize || 'cover');
  root.style.setProperty('--ch-shell-bg-position', preset.shellPosition || 'center');
  root.style.setProperty('--ch-shell-bg-repeat', preset.shellRepeat || 'no-repeat');
  root.style.setProperty('--ch-body-bg', preset.body);
  const palette = preset.palette || baseDarkPalette;
  root.style.setProperty('--ch-panel', palette.panel);
  root.style.setProperty('--ch-panel-alt', palette.panelAlt);
  root.style.setProperty('--ch-panel-strong', palette.panelStrong);
  root.style.setProperty('--ch-card', palette.card);
  root.style.setProperty('--ch-card-alt', palette.cardAlt);
  root.style.setProperty('--ch-border', palette.border);
  root.style.setProperty('--ch-text', palette.text);
  root.style.setProperty('--ch-text-muted', palette.textMuted);
  body.style.background = preset.body;
  body.style.backgroundSize = preset.shellSize || 'cover';
  body.style.backgroundPosition = preset.shellPosition || 'center';
  body.style.backgroundRepeat = preset.shellRepeat || 'no-repeat';
  body.style.color = palette.text;
  enableThemeTransition(palette);
  if (typeof window !== 'undefined') {
    (window as any).__chLastTheme = {
      theme,
      accentHex: accent,
      customThemeGradient: s.customThemeGradient,
      customThemeImage: s.customThemeImage,
      customThemeStops: Array.isArray(s.customThemeStops) ? s.customThemeStops.map((stop) => ({ ...stop })) : undefined,
      customThemeAngle: s.customThemeAngle,
    };
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
    const onPreview = (e: any) => {
      const payload = e?.detail || {};
      applyTheme(payload);
    };
    window.addEventListener('ch_settings_updated', onUpdated as any);
    window.addEventListener('ch_theme_preview', onPreview as any);
    return () => {
      window.removeEventListener('ch_settings_updated', onUpdated as any);
      window.removeEventListener('ch_theme_preview', onPreview as any);
    };
  }, []);

  return null;
}
