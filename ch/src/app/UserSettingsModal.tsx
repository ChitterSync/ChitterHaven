"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Dropdown, { type DropdownOption } from "./components/Dropdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faBook,
  faCirclePause,
  faCirclePlay,
  faCode,
  faGlobe,
  faInfoCircle,
  faKey,
  faLock,
  faLink,
  faMicrophone,
  faPalette,
  faShield,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

type ThemeStop = { color: string; position: number };

type AppearanceSettings = {
  messageGrouping?: "none" | "compact" | "aggressive";
  messageStyle?: "bubbles" | "classic" | "sleek" | "minimal_log" | "focus" | "thread_forward" | "retro";
  timeFormat?: "12h" | "24h";
  timeDisplay?: "absolute" | "relative" | "hybrid";
  timestampGranularity?: "perMessage" | "perGroup";
  systemMessageEmphasis?: "prominent" | "normal" | "dimmed" | "collapsible";
  maxContentWidth?: number | null;
  accentIntensity?: "subtle" | "normal" | "bold";
  readingMode?: boolean;
  fillScreen?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onStatusChangeAction?: (status: string) => void;
  onSavedAction?: (settings: Settings) => void;
};

type Settings = {
  theme?: "dark" | "light" | "system" | "midnight" | "sunset" | "forest" | "neon" | "ocean" | "custom";
  compact?: boolean;
  compactSidebar?: boolean;
  showTimestamps?: boolean;
  chatStyle?: 'sleek' | 'classic' | 'bubbles' | 'minimal_log' | 'focus' | 'thread_forward' | 'retro' | 'modern';
  messageFontSize?: 'small'|'medium'|'large';
  appearance?: AppearanceSettings;
  accentHex?: string;
  boldColorHex?: string;
  italicColorHex?: string;
  pinColorHex?: string;
  mentionColorHex?: string;
  codeColorHex?: string;
  callHavensServers?: boolean;
  showTips?: boolean;
  reduceMotion?: boolean;
  showOnlineCount?: boolean;
  callsEnabled?: boolean;
  callRingSound?: boolean;
  callRingtone?: string;
   quickButtonsOwn?: string[];
   quickButtonsOthers?: string[];
  monospaceMessages?: boolean;
  notifications?: { mentions?: boolean; pins?: boolean; soundEnabled?: boolean; volume?: number };
  status?: "online" | "idle" | "dnd" | "offline";
  statusMessage?: string;
  dndIsCosmetic?: boolean;
  richPresence?: { type?: "game" | "music" | "custom"; title?: string; details?: string };
  autoIdleEnabled?: boolean;
  blurOnUnfocused?: boolean;
  streamerMode?: boolean;
  streamerModeStyle?: 'blur' | 'shorten';
  streamerModeHoverReveal?: boolean;
  sidebarHavenIconOnly?: boolean;
  havenColumns?: number;
  customThemeGradient?: string;
  customThemeImage?: string;
  customThemeStops?: ThemeStop[];
  customThemeAngle?: number;
  enableOneko?: boolean;
  friendNicknames?: Record<string, string>;
  havenNicknames?: Record<string, Record<string, string>>;
  lastSeenUpdateVersion?: string;
  disableMinorUpdatePopups?: boolean;
  disableMajorUpdatePopups?: boolean;
  blockedUsers?: string[];
  showBlockActions?: boolean;
  showReadingModeButton?: boolean;
  callrfMobileSizing?: boolean;
  steamId?: string;
  steamRichPresence?: boolean;
  syncProfileToChitterSync?: boolean;
  voice?: {
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
    autoGain?: boolean;
    pushToTalk?: boolean;
    inputVolume?: number;
    outputVolume?: number;
    micTestTone?: boolean;
  };
};

type ThemePreviewFields = Pick<Settings, "theme" | "accentHex" | "customThemeGradient" | "customThemeImage" | "customThemeStops" | "customThemeAngle">;

type AppearanceProfile = { id: string; name: string; settings: Partial<Settings> };

const RINGTONE_OPTIONS = ["Drive", "Bandwidth", "Drift", "Progress", "Spooky"];

const CustomDropdown = ({ label, items, emptyLabel }: { label: string; items: string[]; emptyLabel: string }) => {
  const [open, setOpen] = useState(false);
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 10, background: '#020617' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          color: '#e5e7eb',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{safeItems.length}</span>
      </button>
      {open && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid #1f2937', display: 'grid', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
          {safeItems.length === 0 ? (
            <div style={{ fontSize: 12, color: '#6b7280' }}>{emptyLabel}</div>
          ) : (
            safeItems.map((item) => (
              <div key={item} style={{ fontSize: 13, color: '#e5e7eb' }}>{item}</div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const DEFAULT_CUSTOM_THEME_GRADIENT = "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(30,27,75,0.95))";

const DEFAULT_CUSTOM_THEME_STOPS: ThemeStop[] = [
  { color: "#60a5fa", position: 0 },
  { color: "#4338ca", position: 55 },
  { color: "#7c3aed", position: 100 },
];

const DEFAULT_CUSTOM_THEME_ANGLE = 135;

const SECRET_THRESHOLD = 30;

const MAX_STATUS_MESSAGE = 140;

const MAX_RICH_TITLE = 80;

const MAX_RICH_DETAILS = 160;

const APPEARANCE_WIDTHS = [720, 840, 960, 1080];

const APPEARANCE_PROFILE_STORAGE_KEY = "appearance.profiles";

const APPEARANCE_PROFILE_ACTIVE_KEY = "appearance.activeProfileId";

const LOCAL_DESKTOP_NOTIF_KEY = "desktop_notifications_enabled";

const MESSAGE_STYLE_OPTIONS: Array<{ value: AppearanceSettings["messageStyle"]; label: string; description: string }> = [
  { value: "sleek", label: "Sleek", description: "Glass-like cards with balanced spacing." },
  { value: "classic", label: "Classic", description: "Discord-like rows with solid panels." },
  { value: "bubbles", label: "Bubbles", description: "Chat bubbles with accent fills." },
  { value: "minimal_log", label: "Minimal Log", description: "Transcript-style rows with subtle dividers." },
  { value: "focus", label: "Focus", description: "Recent clusters stay crisp, older ones soften." },
  { value: "thread_forward", label: "Thread Forward", description: "Conversation branches get subtle guides." },
  { value: "retro", label: "Retro", description: "Terminal-inspired cards with scanlines." },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sanitizeStatusMessage = (value?: string) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_STATUS_MESSAGE) : "";
};

const sanitizeRichPresence = (raw?: Settings["richPresence"] | null) => {
  if (!raw || typeof raw !== "object") return undefined;
  const type = raw.type === "game" || raw.type === "music" || raw.type === "custom" ? raw.type : undefined;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, MAX_RICH_TITLE) : "";
  const details = typeof raw.details === "string" ? raw.details.trim().slice(0, MAX_RICH_DETAILS) : "";
  if (!type || !title) return undefined;
  return details ? { type, title, details } : { type, title };
};

const resolveDefaultTimeFormat = (): AppearanceSettings["timeFormat"] => {
  try {
    const resolved = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
    const cycle = resolved.hourCycle;
    if (cycle === "h23" || cycle === "h24") return "24h";
  } catch {}
  return "12h";
};

const normalizeAppearanceSettings = (raw?: AppearanceSettings | null, hasExistingSettings = false): AppearanceSettings => {
  const base = raw && typeof raw === "object" ? { ...raw } : {};
  const messageStyle =
    base.messageStyle === "bubbles" ||
    base.messageStyle === "classic" ||
    base.messageStyle === "sleek" ||
    base.messageStyle === "minimal_log" ||
    base.messageStyle === "focus" ||
    base.messageStyle === "thread_forward" ||
    base.messageStyle === "retro"
      ? base.messageStyle
      : undefined;
  const messageGrouping =
    base.messageGrouping === "none" || base.messageGrouping === "compact" || base.messageGrouping === "aggressive"
      ? base.messageGrouping
      : (hasExistingSettings ? "none" : "compact");
  const timeFormat = base.timeFormat === "12h" || base.timeFormat === "24h" ? base.timeFormat : resolveDefaultTimeFormat();
  const timeDisplay = base.timeDisplay === "relative" || base.timeDisplay === "hybrid" || base.timeDisplay === "absolute"
    ? base.timeDisplay
    : "absolute";
  const timestampGranularity = base.timestampGranularity === "perGroup" ? "perGroup" : "perMessage";
  const systemMessageEmphasis =
    base.systemMessageEmphasis === "normal" ||
    base.systemMessageEmphasis === "dimmed" ||
    base.systemMessageEmphasis === "collapsible"
      ? base.systemMessageEmphasis
      : "prominent";
  const accentIntensity =
    base.accentIntensity === "subtle" || base.accentIntensity === "bold"
      ? base.accentIntensity
      : "normal";
  const maxWidth = typeof base.maxContentWidth === "number" ? base.maxContentWidth : null;
  const maxContentWidth = maxWidth && APPEARANCE_WIDTHS.includes(maxWidth) ? maxWidth : null;
  const fillScreen = typeof base.fillScreen === "boolean" ? base.fillScreen : true;
  return {
    messageGrouping,
    messageStyle,
    timeFormat,
    timeDisplay,
    timestampGranularity,
    systemMessageEmphasis,
    maxContentWidth,
    accentIntensity,
    readingMode: base.readingMode === true,
    fillScreen,
  };
};

const profileId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `appearance-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const appearanceKeys: (keyof Settings)[] = [
  "theme",
  "compact",
  "compactSidebar",
  "showTimestamps",
  "chatStyle",
  "messageFontSize",
  "accentHex",
  "boldColorHex",
  "italicColorHex",
  "pinColorHex",
  "mentionColorHex",
  "codeColorHex",
  "callHavensServers",
  "showTips",
  "reduceMotion",
  "showOnlineCount",
  "blurOnUnfocused",
  "streamerMode",
  "streamerModeStyle",
  "streamerModeHoverReveal",
  "sidebarHavenIconOnly",
  "havenColumns",
  "customThemeGradient",
  "customThemeImage",
  "customThemeStops",
  "customThemeAngle",
  "monospaceMessages",
  "appearance",
];

const extractAppearanceSettings = (s: Settings): Partial<Settings> => {
  const snapshot: Partial<Settings> = {};
  appearanceKeys.forEach((key) => {
    const value = (s as any)[key];
    if (typeof value !== "undefined") {
      (snapshot as any)[key] = value;
    }
  });
  if (s.appearance) {
    snapshot.appearance = normalizeAppearanceSettings(s.appearance, true);
  }
  return snapshot;
};

const sanitizeProfiles = (raw: any): AppearanceProfile[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const id = typeof entry.id === "string" && entry.id.trim().length ? entry.id.trim() : "";
      const name = typeof entry.name === "string" && entry.name.trim().length ? entry.name.trim() : "Profile";
      if (!id) return null;
      const settings = entry.settings && typeof entry.settings === "object" ? entry.settings : {};
      return { id, name, settings };
    })
    .filter((entry): entry is AppearanceProfile => !!entry);
};

const cloneStops = (stops: ThemeStop[]): ThemeStop[] => stops.map((stop) => ({ ...stop }));

const gradientStopRegex = /(rgba?\([^\)]+\)|#[0-9a-f]{3,8})(?:\s+(-?\d+(?:\.\d+)?))?/gi;

const sanitizeStops = (incoming?: ThemeStop[] | null): ThemeStop[] => {
  if (!Array.isArray(incoming)) return cloneStops(DEFAULT_CUSTOM_THEME_STOPS);
  const normalized = incoming
    .filter((stop): stop is ThemeStop => !!stop && typeof stop.color === "string")
    .map((stop) => ({
      color: stop.color.trim() || "#ffffff",
      position: clamp(Number.isFinite(Number(stop.position)) ? Number(stop.position) : 0, 0, 100),
    }))
    .filter((stop) => stop.color.length > 0);
  const trimmed = normalized.slice(0, 5);
  if (trimmed.length < 2) return cloneStops(DEFAULT_CUSTOM_THEME_STOPS);
  return trimmed.sort((a, b) => a.position - b.position);
};

const parseStopsFromGradient = (gradient?: string): ThemeStop[] | null => {
  if (!gradient) return null;
  const matches = Array.from(gradient.matchAll(gradientStopRegex));
  if (!matches.length) return null;
  const stops = matches
    .map((match, index, arr) => {
      const color = match[1]?.trim();
      if (!color) return null;
      const posRaw = match[2];
      if (posRaw !== undefined) {
        return { color, position: clamp(Number(posRaw), 0, 100) };
      }
      if (arr.length === 1) {
        return { color, position: index === 0 ? 0 : 100 };
      }
      const inferred = (index / (arr.length - 1)) * 100;
      return { color, position: clamp(inferred, 0, 100) };
    })
    .filter((stop): stop is ThemeStop => !!stop);
  if (stops.length < 2) return null;
  return cloneStops(stops.slice(0, 5));
};

const normalizeAngle = (value?: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CUSTOM_THEME_ANGLE;
  const normalized = parsed % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const parseAngleFromGradient = (gradient?: string): number | null => {
  if (!gradient) return null;
  const match = gradient.match(/linear-gradient\(([^,]+),/i);
  if (!match) return null;
  const token = match[1]?.trim();
  if (!token) return null;
  const angleMatch = token.match(/(-?\d+(?:\.\d+)?)deg/i);
  if (!angleMatch) return null;
  return normalizeAngle(Number(angleMatch[1]));
};

const buildGradientFromStops = (stops: ThemeStop[], angle: number) => {
  if (!Array.isArray(stops) || stops.length < 2) return null;
  const sorted = cloneStops(stops).sort((a, b) => a.position - b.position);
  return `linear-gradient(${angle}deg, ${sorted.map((stop) => `${stop.color} ${stop.position}%`).join(", ")})`;
};

const pickThemeFields = (s: Settings): ThemePreviewFields => ({
  theme: s.theme,
  accentHex: s.accentHex,
  customThemeGradient: s.customThemeGradient,
  customThemeImage: s.customThemeImage,
  customThemeStops: s.customThemeStops ? cloneStops(s.customThemeStops) : undefined,
  customThemeAngle: s.customThemeAngle,
});

const readLastAppliedTheme = (): ThemePreviewFields | null => {
  if (typeof window === "undefined") return null;
  const payload = (window as any).__chLastTheme;
  if (!payload || typeof payload !== "object") return null;
  return {
    theme: payload.theme,
    accentHex: payload.accentHex,
    customThemeGradient: typeof payload.customThemeGradient === "string" ? payload.customThemeGradient : undefined,
    customThemeImage: typeof payload.customThemeImage === "string" ? payload.customThemeImage : undefined,
    customThemeStops: sanitizeStops(payload.customThemeStops),
    customThemeAngle: normalizeAngle(payload.customThemeAngle),
  };
};

const normalizeSettings = (raw?: Settings | null): Settings => {
  const base: Settings = { ...(raw || {}) };
  const hasExistingSettings = !!(raw && Object.keys(raw).length);
  const notif = base.notifications || {};
  base.notifications = {
    mentions: notif.mentions !== false,
    pins: notif.pins !== false,
    soundEnabled: notif.soundEnabled !== false,
    volume: typeof notif.volume === "number" ? notif.volume : 0.6,
  };
  if (base.callRingSound === undefined) base.callRingSound = true;
  if (!base.callRingtone || !RINGTONE_OPTIONS.includes(base.callRingtone)) base.callRingtone = "Drive";
  if (base.streamerModeStyle !== 'shorten') base.streamerModeStyle = 'blur';
  base.streamerModeHoverReveal = base.streamerModeHoverReveal !== false;
  base.blurOnUnfocused = base.blurOnUnfocused !== false;
  base.statusMessage = sanitizeStatusMessage(base.statusMessage);
  base.dndIsCosmetic = base.dndIsCosmetic === true;
  base.richPresence = sanitizeRichPresence(base.richPresence);
  const columns = Number(base.havenColumns);
  base.havenColumns = Number.isFinite(columns) ? Math.min(5, Math.max(1, Math.round(columns))) : 1;
  base.sidebarHavenIconOnly = base.sidebarHavenIconOnly === true;
  base.customThemeGradient =
    typeof base.customThemeGradient === 'string' && base.customThemeGradient.trim().length
      ? base.customThemeGradient.trim()
      : DEFAULT_CUSTOM_THEME_GRADIENT;
  const parsedStops = parseStopsFromGradient(base.customThemeGradient);
  base.customThemeStops = sanitizeStops(base.customThemeStops || parsedStops || null);
  base.customThemeAngle = normalizeAngle(base.customThemeAngle ?? parseAngleFromGradient(base.customThemeGradient) ?? DEFAULT_CUSTOM_THEME_ANGLE);
  if (!base.customThemeGradient) {
    const built = buildGradientFromStops(base.customThemeStops || DEFAULT_CUSTOM_THEME_STOPS, base.customThemeAngle || DEFAULT_CUSTOM_THEME_ANGLE);
    if (built) base.customThemeGradient = built;
  }
  base.customThemeImage = typeof base.customThemeImage === 'string' ? base.customThemeImage : '';
  if (base.chatStyle === 'classic' || base.chatStyle === 'bubbles' || base.chatStyle === 'minimal_log' || base.chatStyle === 'focus' || base.chatStyle === 'thread_forward' || base.chatStyle === 'retro') {
    base.chatStyle = base.chatStyle;
  } else {
    base.chatStyle = 'sleek';
  }
  base.enableOneko = base.enableOneko === true;
  base.callrfMobileSizing = base.callrfMobileSizing === true;
  base.steamRichPresence = base.steamRichPresence === true;
  base.steamId = typeof base.steamId === 'string' ? base.steamId.trim() : '';
  base.syncProfileToChitterSync = base.syncProfileToChitterSync === true;
  const voice = base.voice && typeof base.voice === 'object' ? { ...base.voice } : {};
  base.voice = {
    noiseSuppression: voice.noiseSuppression !== false,
    echoCancellation: voice.echoCancellation !== false,
    autoGain: voice.autoGain !== false,
    pushToTalk: voice.pushToTalk === true,
    inputVolume: typeof voice.inputVolume === 'number' ? Math.min(1, Math.max(0, voice.inputVolume)) : 0.85,
    outputVolume: typeof voice.outputVolume === 'number' ? Math.min(1, Math.max(0, voice.outputVolume)) : 0.9,
    micTestTone: voice.micTestTone === true,
  };
  base.appearance = normalizeAppearanceSettings(base.appearance, hasExistingSettings);
  if (!base.appearance?.messageStyle) {
    base.appearance = { ...base.appearance, messageStyle: base.chatStyle };
  }
  base.friendNicknames =
    base.friendNicknames && typeof base.friendNicknames === 'object'
      ? Object.fromEntries(
          Object.entries(base.friendNicknames)
            .map(([user, nick]) => [user, typeof nick === 'string' ? nick.trim() : ''])
            .filter(([user, nick]) => typeof user === 'string' && nick.length),
        )
      : {};
  base.havenNicknames =
    base.havenNicknames && typeof base.havenNicknames === 'object'
      ? Object.fromEntries(
          Object.entries(base.havenNicknames)
            .filter(([haven, map]) => typeof haven === 'string' && map && typeof map === 'object')
            .map(([haven, map]) => [
              haven,
              Object.fromEntries(
                Object.entries(map as Record<string, string>)
                  .map(([user, nick]) => [user, typeof nick === 'string' ? nick.trim() : ''])
                  .filter(([user, nick]) => typeof user === 'string' && nick.length),
              ),
            ]),
        )
      : {};
  base.disableMinorUpdatePopups = base.disableMinorUpdatePopups === true;
  base.disableMajorUpdatePopups = base.disableMajorUpdatePopups === true;
  base.showBlockActions = base.showBlockActions !== false;
  base.showReadingModeButton = base.showReadingModeButton !== false;
  base.blockedUsers = Array.isArray(base.blockedUsers)
    ? Array.from(new Set(base.blockedUsers.filter((u) => typeof u === "string").map((u) => u.trim()).filter(Boolean)))
    : [];
  return base;
};

export default function UserSettingsModal({ isOpen, onClose, username, onStatusChangeAction, onSavedAction }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => normalizeSettings({}));
  const [appearanceProfiles, setAppearanceProfiles] = useState<AppearanceProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; steamId?: string } | null;
      if (!data || data.type !== "chittersync:steam_linked") return;
      if (!data.steamId) return;
      setSettings((s) => ({ ...s, steamId: data.steamId, steamRichPresence: true }));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  const cleanupLegacySettings = useCallback(() => {
    setSettings((s) => {
      const next = { ...s } as any;
      [
        "legacyTheme",
        "themePreset",
        "compactMode",
        "messageDensity",
        "oldSidebarWidth",
        "legacyAccent",
        "classicSidebar",
        "chatterStyle",
      ].forEach((key) => {
        if (key in next) delete next[key];
      });
      return next;
    });
  }, []);
  const [accountFriends, setAccountFriends] = useState<{ friends: string[]; incoming: string[]; outgoing: string[] }>({ friends: [], incoming: [], outgoing: [] });
  const [blockInput, setBlockInput] = useState("");
  const [confirmBlockRemoval, setConfirmBlockRemoval] = useState<string | null>(null);
  const [syncProfilesEnabled, setSyncProfilesEnabled] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const lastSavedThemeRef = useRef<ThemePreviewFields | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [tab, setTab] = useState<'appearance'|'notifications'|'voice'|'privacy'|'status'|'account'|'connections'|'browser'|'guides'|'dev'|'about'|'secrets'>('appearance');
  const [settingsSearch, setSettingsSearch] = useState('');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [browserInfo, setBrowserInfo] = useState({
    userAgent: '',
    platform: '',
    language: '',
    online: true,
    cookiesEnabled: false,
    deviceMemory: undefined as number | undefined,
    hardwareConcurrency: undefined as number | undefined,
    screen: '',
  });
  const [permissionStates, setPermissionStates] = useState<Record<string, string>>({});
  const [guideChecked, setGuideChecked] = useState(true);
  const [guideLevel, setGuideLevel] = useState(60);
  const [demoToggleArmed, setDemoToggleArmed] = useState(false);
  const [secretClicks, setSecretClicks] = useState(0);
  const secretsUnlocked = secretClicks >= SECRET_THRESHOLD || settings.enableOneko === true;
  const lastSecretCountRef = useRef(0);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [aboutUser, setAboutUser] = useState<any>(null);
  const [aboutStats, setAboutStats] = useState<{ havens: number; dms: number }>({ havens: 0, dms: 0 });
  const [converting, setConverting] = useState(false);
  const [convertMessage, setConvertMessage] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [isLegacyAccount, setIsLegacyAccount] = useState(true);
  const [authProvider, setAuthProvider] = useState<"legacy" | "chittersync" | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateLayout = () => setIsMobileLayout(window.innerWidth < 860);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    let profiles: AppearanceProfile[] = [];
    try {
      const raw = window.localStorage.getItem(APPEARANCE_PROFILE_STORAGE_KEY);
      profiles = sanitizeProfiles(raw ? JSON.parse(raw) : []);
    } catch {
      profiles = [];
    }
    let storedActive: string | null = null;
    try {
      storedActive = window.localStorage.getItem(APPEARANCE_PROFILE_ACTIVE_KEY);
    } catch {}
    setAppearanceProfiles(profiles);
    if (storedActive && profiles.some((p) => p.id === storedActive)) {
      setActiveProfileId(storedActive);
    } else {
      setActiveProfileId(profiles[0]?.id ?? null);
    }
    setProfilesLoaded(true);
  }, [isOpen]);
  useEffect(() => {
    if (!profilesLoaded || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(APPEARANCE_PROFILE_STORAGE_KEY, JSON.stringify(appearanceProfiles));
      if (activeProfileId) {
        window.localStorage.setItem(APPEARANCE_PROFILE_ACTIVE_KEY, activeProfileId);
      } else {
        window.localStorage.removeItem(APPEARANCE_PROFILE_ACTIVE_KEY);
      }
    } catch {}
  }, [appearanceProfiles, activeProfileId, profilesLoaded]);
  useEffect(() => {
    if (!isOpen || !profilesLoaded || loading) return;
    if (appearanceProfiles.length === 0) {
      const baseProfile: AppearanceProfile = {
        id: profileId(),
        name: "Default",
        settings: extractAppearanceSettings(settings),
      };
      setAppearanceProfiles([baseProfile]);
      setActiveProfileId(baseProfile.id);
    }
  }, [appearanceProfiles.length, isOpen, profilesLoaded, settings, loading]);
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/settings');
      const d = await r.json().catch(() => ({}));
      const incoming = (d && typeof d === 'object' && 'settings' in d) ? (d.settings as Settings) : d;
      const normalized = normalizeSettings(incoming as Settings);
        setSettings(normalized);
        lastSavedThemeRef.current = pickThemeFields(normalized);
      lastSavedThemeRef.current = pickThemeFields(normalized);
      if (typeof (d as any)?.legacy === 'boolean') {
        setIsLegacyAccount(Boolean((d as any).legacy));
      } else {
        setIsLegacyAccount(true);
      }
      setLastSyncedAt(((d as any)?.syncedAt ?? null) as string | null);
      setSyncWarning(((d as any)?.syncError ?? null) as string | null);
    } catch {
      setSyncWarning('Failed to load settings.');
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    if (settings.enableOneko) {
      setSecretClicks((prev) => (prev >= SECRET_THRESHOLD ? prev : SECRET_THRESHOLD));
      lastSecretCountRef.current = SECRET_THRESHOLD;
    }
  }, [settings.enableOneko]);
  useEffect(() => {
    const justUnlocked = secretClicks >= SECRET_THRESHOLD && lastSecretCountRef.current < SECRET_THRESHOLD;
    if (justUnlocked && !settings.enableOneko) {
      setSettings((s) => (s.enableOneko ? s : { ...s, enableOneko: true }));
    }
    if (justUnlocked) {
      setTab('secrets');
    }
    lastSecretCountRef.current = secretClicks;
  }, [secretClicks, settings.enableOneko]);
  useEffect(() => {
    if (!isOpen) return;
    fetchSettings();
    // Basic local telemetry
    if (typeof window !== 'undefined') {
      try {
        const hRaw = window.localStorage.getItem('havens');
        const h = hRaw ? JSON.parse(hRaw) : {};
        setAboutStats(s => ({ ...s, havens: h && typeof h === 'object' ? Object.keys(h).length : 0 }));
      } catch {}
      try {
        const dRaw = window.localStorage.getItem('dms');
        const dms = dRaw ? JSON.parse(dRaw) : [];
        setAboutStats(s => ({ ...s, dms: Array.isArray(dms) ? dms.length : s.dms }));
      } catch {}
    }
  }, [isOpen, fetchSettings]);
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(LOCAL_DESKTOP_NOTIF_KEY);
      setDesktopNotificationsEnabled(stored === "true");
    } catch {}
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/friends')
      .then((r) => r.json())
      .then((data) => setAccountFriends({
        friends: Array.isArray(data?.friends) ? data.friends : [],
        incoming: Array.isArray(data?.incoming) ? data.incoming : [],
        outgoing: Array.isArray(data?.outgoing) ? data.outgoing : [],
      }))
      .catch(() => setAccountFriends({ friends: [], incoming: [], outgoing: [] }));
  }, [isOpen]);
  const handleDesktopNotificationsToggle = async () => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setSyncWarning("Desktop notifications are not supported in this browser.");
      return;
    }
    if (desktopNotificationsEnabled) {
      setDesktopNotificationsEnabled(false);
      try { window.localStorage.setItem(LOCAL_DESKTOP_NOTIF_KEY, "false"); } catch {}
      try { window.dispatchEvent(new CustomEvent("ch_desktop_notifications", { detail: { enabled: false } })); } catch {}
      return;
    }
    let permission = Notification.permission;
    if (permission !== "granted") {
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = "denied";
      }
    }
    if (permission !== "granted") {
      setSyncWarning("Notification permission was not granted.");
      return;
    }
    setDesktopNotificationsEnabled(true);
    try { window.localStorage.setItem(LOCAL_DESKTOP_NOTIF_KEY, "true"); } catch {}
    try { window.dispatchEvent(new CustomEvent("ch_desktop_notifications", { detail: { enabled: true } })); } catch {}
  };
  const performLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    const authBase = process.env.NEXT_PUBLIC_CS_AUTH_URL;
    if (authBase && authProvider === "chittersync") {
      const trimmed = authBase.replace(/\/$/, "");
      try {
        await fetch(`${trimmed}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {}
      window.location.href = `${trimmed}/signin?loggedOut=true`;
    }
  };
  useEffect(() => {
    if (!isOpen || tab !== 'about' || aboutUser || aboutLoading) return;
    (async () => {
      setAboutLoading(true);
      try {
        const r = await fetch('/api/auth/me');
        const d = await r.json();
        if (d && d.user) setAboutUser(d.user);
      } catch {}
      setAboutLoading(false);
    })();
  }, [isOpen, tab, aboutUser, aboutLoading]);
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        const provider = (data as any)?.provider;
        setAuthProvider(provider === "chittersync" || provider === "legacy" ? provider : null);
      })
      .catch(() => setAuthProvider(null));
  }, [isOpen]);
  const broadcastSettingsUpdate = (payload: Settings) => {
    try { window.dispatchEvent(new CustomEvent('ch_settings_updated', { detail: payload })); } catch {}
    try { window.dispatchEvent(new CustomEvent('ch_theme_preview', { detail: pickThemeFields(payload) })); } catch {}
  };
  const activeProfile = appearanceProfiles.find((profile) => profile.id === activeProfileId) || null;
  const applyProfile = useCallback((profile: AppearanceProfile) => {
    const next = normalizeSettings({
      ...settings,
      ...profile.settings,
      appearance: {
        ...(settings.appearance || {}),
        ...((profile.settings as any)?.appearance || {}),
      },
    });
    setSettings(next);
    broadcastSettingsUpdate(next);
  }, [settings]);
  const handleSelectProfile = (id: string) => {
    setActiveProfileId(id);
    const profile = appearanceProfiles.find((p) => p.id === id);
    if (profile) applyProfile(profile);
  };
  const handleCreateProfile = () => {
    const name = window.prompt("Profile name");
    if (!name) return;
    const profile: AppearanceProfile = {
      id: profileId(),
      name: name.trim() || "Profile",
      settings: extractAppearanceSettings(settings),
    };
    setAppearanceProfiles((prev) => [...prev, profile]);
    setActiveProfileId(profile.id);
  };
  const handleDuplicateProfile = () => {
    if (!activeProfile) return;
    const profile: AppearanceProfile = {
      id: profileId(),
      name: `${activeProfile.name} Copy`,
      settings: { ...activeProfile.settings },
    };
    setAppearanceProfiles((prev) => [...prev, profile]);
    setActiveProfileId(profile.id);
  };
  const handleRenameProfile = () => {
    if (!activeProfile) return;
    const name = window.prompt("Rename profile", activeProfile.name);
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setAppearanceProfiles((prev) =>
      prev.map((profile) => (profile.id === activeProfile.id ? { ...profile, name: trimmed } : profile)),
    );
  };
  const handleDeleteProfile = () => {
    if (!activeProfile) return;
    if (appearanceProfiles.length <= 1) return;
    const confirmed = window.confirm(`Delete "${activeProfile.name}"?`);
    if (!confirmed) return;
    setAppearanceProfiles((prev) => prev.filter((profile) => profile.id !== activeProfile.id));
    const next = appearanceProfiles.find((profile) => profile.id !== activeProfile.id) || null;
    setActiveProfileId(next?.id ?? null);
    if (next) applyProfile(next);
  };
  const handleUpdateProfile = () => {
    if (!activeProfile) return;
    setAppearanceProfiles((prev) =>
      prev.map((profile) =>
        profile.id === activeProfile.id ? { ...profile, settings: extractAppearanceSettings(settings) } : profile,
      ),
    );
  };
  const save = async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      const normalized = normalizeSettings(settings);
      try {
        window.localStorage.setItem("ch_pending_settings", JSON.stringify(normalized));
      } catch {}
      setSettings(normalized);
      setSyncWarning("Offline: saved locally. Changes will sync when you’re back online.");
      if (normalized?.status && onStatusChangeAction) onStatusChangeAction(normalized.status);
      if (onSavedAction) onSavedAction(normalized);
      broadcastSettingsUpdate(normalized);
      onClose();
      return;
    }
    try {
      const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setSyncWarning((err?.error as string) || 'Failed to save settings.');
        return;
      }
      const d = await r.json().catch(() => ({}));
      const payload = (d && typeof d === 'object' && 'settings' in d) ? (d.settings as Settings) : d;
      const normalized = normalizeSettings(payload as Settings);
      setSettings(normalized);
      if (typeof (d as any)?.legacy === 'boolean') setIsLegacyAccount(Boolean((d as any).legacy));
      setLastSyncedAt(((d as any)?.syncedAt ?? null) as string | null);
      setSyncWarning(((d as any)?.syncError ?? null) as string | null);
      if (normalized?.status && onStatusChangeAction) onStatusChangeAction(normalized.status);
      if (onSavedAction) onSavedAction(normalized);
      broadcastSettingsUpdate(normalized);
    } catch {
      setSyncWarning('Failed to save settings.');
      return;
    }
    onClose();
  };
  const stopPreview = () => {
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      } catch {}
      previewAudioRef.current = null;
    }
    setPreviewing(null);
  };
  const previewRingtone = (name: string) => {
    if (previewing === name) {
      stopPreview();
      return;
    }
    stopPreview();
    try {
      const audio = new Audio(`/sounds/ringtones/${name}.wav`);
      audio.volume = 0.85;
      audio.play().catch(() => {});
      audio.onended = stopPreview;
      previewAudioRef.current = audio;
      setPreviewing(name);
    } catch {
      setPreviewing(null);
    }
  };
  const ringtoneOptions: DropdownOption[] = RINGTONE_OPTIONS.map((opt) => ({
    value: opt,
    label: opt === "Drive" ? `${opt} (Default)` : opt,
    action: {
      label: previewing === opt ? "Pause" : "Play",
      icon: (
        <FontAwesomeIcon
          icon={previewing === opt ? faCirclePause : faCirclePlay}
          style={{ pointerEvents: "none" }}
        />
      ),
      onClick: () => previewRingtone(opt),
    },
  }));
  useEffect(() => {
    if (!isOpen) {
      stopPreview();
    }
  }, [isOpen]);
  const dispatchThemePreview = useCallback((payload: ThemePreviewFields | null) => {
    if (!payload) return;
    try {
      window.dispatchEvent(new CustomEvent('ch_theme_preview', { detail: payload }));
    } catch {}
  }, []);
  const revertThemePreview = useCallback(() => {
    if (!lastSavedThemeRef.current) return;
    dispatchThemePreview(lastSavedThemeRef.current);
  }, [dispatchThemePreview]);
  useEffect(() => {
    if (!isOpen) return;
    if (!lastSavedThemeRef.current) {
      const fallback = readLastAppliedTheme();
      if (fallback) {
        lastSavedThemeRef.current = fallback;
        setSettings((prev) => ({ ...prev, ...fallback }));
      }
    }
  }, [isOpen, setSettings]);
  const themeStopsSignature = useMemo(() => JSON.stringify(settings.customThemeStops || []), [settings.customThemeStops]);
  useEffect(() => {
    if (!isOpen) return;
    dispatchThemePreview(pickThemeFields(settings));
  }, [
    isOpen,
    settings.theme,
    settings.accentHex,
    settings.customThemeGradient,
    settings.customThemeImage,
    settings.customThemeAngle,
    themeStopsSignature,
    dispatchThemePreview,
  ]);
  useEffect(() => {
    if (!isOpen) return undefined;
    return () => {
      revertThemePreview();
    };
  }, [isOpen, revertThemePreview]);
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined') return;
    const info = {
      userAgent: navigator.userAgent || '',
      platform: (navigator as any).platform || '',
      language: navigator.language || '',
      online: typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
      cookiesEnabled: typeof navigator.cookieEnabled === 'boolean' ? navigator.cookieEnabled : false,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
    };
    setBrowserInfo(info);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined' || !(navigator as any).permissions) return;
    const names = ['notifications', 'microphone', 'camera', 'geolocation'] as const;
    let cancelled = false;
    const load = async () => {
      const next: Record<string, string> = {};
      for (const name of names) {
        try {
          const status = await (navigator as any).permissions.query({ name });
          next[name] = status.state;
          status.onchange = () => {
            if (cancelled) return;
            setPermissionStates((prev) => ({ ...prev, [name]: status.state }));
          };
        } catch {
          next[name] = 'unsupported';
        }
      }
      if (!cancelled) setPermissionStates(next);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) setSettingsSearch('');
  }, [isOpen]);
  const handleCancel = useCallback(() => {
    revertThemePreview();
    onClose();
  }, [revertThemePreview, onClose]);
  if (!isOpen) return null;
  const accent = settings.accentHex || '#60a5fa';
  const appearance = settings.appearance || normalizeAppearanceSettings(undefined, true);
  const blockedUsers = Array.isArray(settings.blockedUsers) ? settings.blockedUsers : [];
  const isChitterSyncAccount = authProvider === "chittersync";
  const showLegacyConversion = isLegacyAccount && !isChitterSyncAccount;
  const tabLabels = useMemo(
    () => [
      { id: 'appearance', label: 'Appearance', icon: faPalette },
      { id: 'notifications', label: 'Notifications', icon: faBell },
      { id: 'voice', label: 'Voice', icon: faMicrophone },
      { id: 'privacy', label: 'Privacy', icon: faShield },
      { id: 'status', label: 'Status', icon: faCirclePlay },
      { id: 'account', label: 'Account', icon: faUser },
      { id: 'connections', label: 'Connections', icon: faLink },
      { id: 'browser', label: 'Browser', icon: faGlobe },
      { id: 'guides', label: 'Guides & Feedback', icon: faBook },
      { id: 'dev', label: 'Dev', icon: faCode },
      ...(secretsUnlocked ? [{ id: 'secrets', label: 'Secrets', icon: faKey }] : []),
      { id: 'about', label: 'About', icon: faInfoCircle },
    ],
    [secretsUnlocked]
  );
  const filteredTabs = useMemo(() => {
    const query = settingsSearch.trim().toLowerCase();
    if (!query) return tabLabels;
    return tabLabels.filter((tabItem) => tabItem.label.toLowerCase().includes(query));
  }, [tabLabels, settingsSearch]);
  useEffect(() => {
    const query = settingsSearch.trim();
    if (!query) return;
    if (!filteredTabs.find((tabItem) => tabItem.id === tab) && filteredTabs.length > 0) {
      setTab(filteredTabs[0].id as typeof tab);
    }
  }, [settingsSearch, filteredTabs, tab]);
  const messageStyle = appearance.messageStyle || settings.chatStyle || "sleek";
  const previewAccent = settings.accentHex || '#60a5fa';
  const previewMention = settings.mentionColorHex || '#f97316';
  const previewPin = settings.pinColorHex || '#facc15';
  const previewBubbleBase = messageStyle === 'bubbles' ? '#0b1222' : messageStyle === 'sleek' ? '#0b1222' : messageStyle === 'retro' ? '#0d1b2a' : '#0b1222';
  const previewCardStyle = (isSelf = false): React.CSSProperties => {
    if (messageStyle === 'minimal_log') {
      return { padding: '4px 0', borderBottom: '1px dashed rgba(148,163,184,0.2)' };
    }
      if (messageStyle === 'classic') {
        return { padding: '8px 10px', borderRadius: 8, borderWidth: 1, borderStyle: 'solid', borderColor: '#1f2937', background: '#0b1222' };
      }
    if (messageStyle === 'thread_forward') {
      return { padding: '10px 12px', borderRadius: 10, borderLeft: `3px solid ${previewAccent}`, background: '#0b1222' };
    }
    if (messageStyle === 'focus') {
      return { padding: '10px 12px', borderRadius: 12, background: isSelf ? 'rgba(37,99,235,0.18)' : '#0b1222' };
    }
      if (messageStyle === 'retro') {
        return { padding: '8px 10px', borderRadius: 0, borderWidth: 1, borderStyle: 'solid', borderColor: '#1f2937', background: previewBubbleBase };
      }
    if (messageStyle === 'bubbles') {
      return { padding: '10px 12px', borderRadius: 16, background: isSelf ? 'rgba(37,99,235,0.18)' : previewBubbleBase };
    }
      return { padding: '10px 12px', borderRadius: 12, borderWidth: 1, borderStyle: 'solid', borderColor: '#1f2937', background: previewBubbleBase };
    };
  const themeStops = settings.customThemeStops && settings.customThemeStops.length >= 2 ? settings.customThemeStops : cloneStops(DEFAULT_CUSTOM_THEME_STOPS);
  const themeAngle = normalizeAngle(settings.customThemeAngle ?? DEFAULT_CUSTOM_THEME_ANGLE);
  const gradientPreview =
    (settings.customThemeGradient && settings.customThemeGradient.trim().length ? settings.customThemeGradient : null) ||
    buildGradientFromStops(themeStops, themeAngle) ||
    DEFAULT_CUSTOM_THEME_GRADIENT;
  const updateThemeStops = (updater: (stops: ThemeStop[]) => ThemeStop[]) => {
    setSettings((prev) => {
      const current = prev.customThemeStops && prev.customThemeStops.length >= 2 ? cloneStops(prev.customThemeStops) : cloneStops(DEFAULT_CUSTOM_THEME_STOPS);
      const nextStops = sanitizeStops(updater(current));
      const nextAngle = normalizeAngle(prev.customThemeAngle ?? themeAngle);
      const gradient = buildGradientFromStops(nextStops, nextAngle) || prev.customThemeGradient || DEFAULT_CUSTOM_THEME_GRADIENT;
      return { ...prev, customThemeStops: nextStops, customThemeAngle: nextAngle, customThemeGradient: gradient };
    });
  };
  const updateThemeAngle = (nextAngle: number) => {
    setSettings((prev) => {
      const current = prev.customThemeStops && prev.customThemeStops.length >= 2 ? cloneStops(prev.customThemeStops) : cloneStops(DEFAULT_CUSTOM_THEME_STOPS);
      const safeAngle = normalizeAngle(nextAngle);
      const gradient = buildGradientFromStops(current, safeAngle) || prev.customThemeGradient || DEFAULT_CUSTOM_THEME_GRADIENT;
      return { ...prev, customThemeStops: sanitizeStops(current), customThemeAngle: safeAngle, customThemeGradient: gradient };
    });
  };
  const handleThemeImageUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setSettings((prev) => ({ ...prev, customThemeImage: result }));
      }
    };
    reader.readAsDataURL(file);
  };
  const Switch = ({ checked }: { checked: boolean }) => {
    const knobOffset = checked ? 14 : 0;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: 2,
          borderRadius: 999,
          border: `1px solid ${checked ? accent : '#4b5563'}`,
          background: '#020617',
          width: 32,
          height: 18,
          position: 'relative',
          pointerEvents: 'none'
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 2,
            top: 2,
            width: 14,
            height: 14,
            borderRadius: 999,
            background: checked ? '#16a34a' : '#4b5563',
            color: '#0b1120',
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translateX(${knobOffset}px)`,
            transition: 'transform 140ms ease-out'
          }}
        >
          {checked ? 'ON' : 'OFF'}
        </span>
      </span>
    );
  };
  const GuideSlider = ({ value, onChange }: { value: number; onChange: (v: number)=>void }) => (
    <div className="range-row" style={{ width: 240 }}>
      <div style={{ flex: 1, position: 'relative', height: 4, borderRadius: 999, background: '#111827' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${value}%`, background: accent, borderRadius: 999 }} />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e)=> onChange(Number(e.target.value))}
        style={{ width: 120 }}
      />
      <span className="range-value">{value}%</span>
    </div>
  );
  return (
    <div
      className="fixed inset-0 flex items-center justify-center h-dvh w-full overflow-x-hidden"
      style={{
        background: 'rgba(0,0,0,0.6)',
        zIndex: 80,
        padding: isMobileLayout ? 0 : 16,
      }}
    >
      <div
        className="glass w-full max-w-5xl h-[90dvh] flex flex-col md:flex-row rounded-xl"
        style={{
          width: isMobileLayout ? '100%' : undefined,
          borderRadius: isMobileLayout ? 0 : 12,
          overflow: 'visible',
          minHeight: 0,
        }}
      >
        <div className="flex flex-1 min-h-0 min-w-0 flex-col md:flex-row">
          <aside
            className="w-full md:w-64 shrink-0 min-h-0"
            style={{
              borderRight: isMobileLayout ? 'none' : '1px solid #2a3344',
              borderBottom: isMobileLayout ? '1px solid #2a3344' : 'none',
              background: '#0b1222',
              color: '#e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
            }}
          >
          <div style={{ padding: 12, borderBottom: '1px solid #2a3344', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span>Settings</span>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                try {
                  await performLogout();
                } catch {}
                try {
                  router.push("/");
                } catch {
                  if (typeof window !== "undefined") window.location.href = "/";
                }
              }}
              style={{ padding: "4px 8px", fontSize: 12, borderRadius: 999, border: "1px solid #1f2937", color: "#f97373" }}
            >
              Log out
            </button>
          </div>
          <div style={{ padding: 10, borderBottom: isMobileLayout ? '1px solid #2a3344' : 'none' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={settingsSearch}
              onChange={(e) => setSettingsSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSettingsSearch('');
              }}
              placeholder="Search settings"
              aria-label="Search settings tabs"
              className="input-dark"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            {settingsSearch.trim().length > 0 && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setSettingsSearch('')}
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 10, border: '1px solid #1f2937' }}
              >
                Clear
              </button>
            )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden md:overflow-y-auto md:overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: isMobileLayout ? 'row' : 'column',
                flexWrap: isMobileLayout ? 'nowrap' : 'wrap',
                gap: 6,
                paddingTop: isMobileLayout ? 8 : 8,
                paddingBottom: isMobileLayout ? 8 : 12,
                paddingLeft: isMobileLayout ? 12 : 10,
                paddingRight: isMobileLayout ? 12 : 10,
                overflowX: 'auto',
                flex: '1 1 auto',
                minHeight: 0,
                scrollPaddingBottom: 12,
              }}
            >
            {filteredTabs.length === 0 ? (
              <div style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 12 }}>No matches.</div>
            ) : (
              filteredTabs.map((tabItem) => {
                const lockedConnections = !isChitterSyncAccount && tabItem.id === 'connections';
                return (
                  <button
                    key={tabItem.id}
                    className="btn-ghost"
                    onClick={() => setTab(tabItem.id as typeof tab)}
                    onMouseEnter={() => setHoveredTab(tabItem.id)}
                    onMouseLeave={() => setHoveredTab((prev) => (prev === tabItem.id ? null : prev))}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      color: tab === tabItem.id ? '#e2e8f0' : '#cbd5f5',
                      background: tab === tabItem.id ? 'rgba(59,130,246,0.18)' : (hoveredTab === tabItem.id ? 'rgba(30,41,59,0.6)' : 'transparent'),
                      border: '1px solid',
                      borderColor: tab === tabItem.id ? 'rgba(226,232,240,0.5)' : 'transparent',
                      borderRadius: 12,
                      whiteSpace: 'nowrap',
                      flex: isMobileLayout ? '0 0 auto' : undefined,
                      width: isMobileLayout ? 'auto' : '100%',
                      transition: 'background 120ms ease, color 120ms ease, transform 120ms ease',
                      position: 'relative',
                      opacity: lockedConnections ? 0.85 : 1,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        filter: lockedConnections ? 'blur(1.2px)' : undefined,
                      }}
                    >
                      <FontAwesomeIcon icon={tabItem.icon} style={{ fontSize: 12, opacity: 0.85 }} />
                      {tabItem.label}
                    </span>
                    {lockedConnections && (
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#e2e8f0' }}>
                        <FontAwesomeIcon icon={faLock} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
            </div>
          </div>
          <div style={{ padding: 12, borderTop: '1px solid #111827', fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>@{username}</div>
          </aside>
          <main className="flex-1 min-h-0 min-w-0 flex flex-col">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #2a3344', color: '#e5e7eb' }}>
              <div style={{ fontWeight: 600 }}>User Settings - {tab.charAt(0).toUpperCase() + tab.slice(1)}</div>
              <button onClick={handleCancel} className="btn-ghost" style={{ padding: '4px 8px' }}>Close</button>
            </div>
            <div
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 break-words [overflow-wrap:anywhere]"
            style={{
              color: '#e5e7eb',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            {loading ? (
              <div style={{ color: '#94a3b8' }}>Loading...</div>
            ) : (
              <>
                {tab === 'appearance' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ display: 'grid', gap: 6, minWidth: 160 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Theme</span>
                        <select value={settings.theme || 'dark'} onChange={(e)=> setSettings(s => ({ ...s, theme: e.target.value as Settings['theme'] }))} className="input-dark" style={{ padding: 8 }}>
                          <option value="system">System</option>
                          <option value="dark">Dark</option>
                          <option value="light">Light</option>
                          <option value="midnight">Midnight</option>
                          <option value="sunset">Sunset</option>
                          <option value="forest">Forest</option>
                          <option value="ocean">Ocean</option>
                          <option value="neon">Neon</option>
                          <option value="custom">Custom</option>
                        </select>
                      </label>
                      {settings.theme === 'custom' && (
                        <div style={{ display: 'grid', gap: 10, minWidth: 260 }}>
                          <div
                            style={{
                              borderRadius: 12,
                              border: '1px solid #1f2937',
                              background: gradientPreview,
                              padding: 12,
                              minHeight: 120,
                              color: '#f8fafc',
                              display: 'grid',
                              gap: 4,
                              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
                            }}
                          >
                            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(255,255,255,0.75)' }}>
                              Custom palette preview
                            </div>
                            <div style={{ fontWeight: 600 }}>Frosted shells & chat surfaces</div>
                            <div style={{ fontSize: 12, maxWidth: 360 }}>
                              Every surface, card, and bubble inherits these tones instantly after you save.
                            </div>
                          </div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <span style={{ color: '#9ca3af', fontSize: 12 }}>Gradient stops</span>
                            {themeStops.map((stop, idx) => (
                              <div
                                key={`gradient-stop-${idx}`}
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '8px 10px',
                                  borderRadius: 10,
                                  border: '1px solid #1f2937',
                                  background: '#020617',
                                }}
                              >
                                <div style={{ fontSize: 12, color: '#9ca3af', minWidth: 60 }}>Stop {idx + 1}</div>
                                <input
                                  type="color"
                                  aria-label={`Stop ${idx + 1} color`}
                                  value={stop.color}
                                  onChange={(e)=> updateThemeStops((stops) => {
                                    const next = cloneStops(stops);
                                    next[idx] = { ...next[idx], color: e.target.value };
                                    return next;
                                  })}
                                />
                                <div className="range-row" style={{ flex: 1, minWidth: 160 }}>
                                  <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={Math.round(stop.position)}
                                    onChange={(e)=> updateThemeStops((stops) => {
                                      const next = cloneStops(stops);
                                      next[idx] = { ...next[idx], position: clamp(Number(e.target.value), 0, 100) };
                                      return next;
                                    })}
                                  />
                                  <span className="range-value">{Math.round(stop.position)}%</span>
                                </div>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={Math.round(stop.position)}
                                  onChange={(e)=> updateThemeStops((stops) => {
                                    const next = cloneStops(stops);
                                    next[idx] = { ...next[idx], position: clamp(Number(e.target.value), 0, 100) };
                                    return next;
                                  })}
                                  style={{ width: 70, background: '#0b1222', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: 8, padding: '4px 6px' }}
                                />
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  disabled={themeStops.length <= 2}
                                  onClick={()=> updateThemeStops((stops) => {
                                    if (stops.length <= 2) return stops;
                                    return stops.filter((_, stopIdx) => stopIdx !== idx);
                                  })}
                                  style={{ padding: '4px 8px', opacity: themeStops.length <= 2 ? 0.4 : 1 }}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn-ghost"
                                disabled={themeStops.length >= 5}
                                onClick={()=> updateThemeStops((stops) => {
                                  if (stops.length >= 5) return stops;
                                  const nextPosition = clamp(Math.round((100 / (stops.length + 1)) * stops.length), 0, 100);
                                  return [...stops, { color: '#ffffff', position: nextPosition }];
                                })}
                                style={{ padding: '6px 10px', opacity: themeStops.length >= 5 ? 0.5 : 1 }}
                              >
                                Add stop
                              </button>
                              <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>2-5 stops supported.</span>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <span style={{ color: '#9ca3af', fontSize: 12 }}>Angle ({themeAngle} deg)</span>
                            <div className="range-row">
                              <input
                                type="range"
                                min={0}
                                max={360}
                                value={themeAngle}
                                onChange={(e)=> updateThemeAngle(Number(e.target.value))}
                              />
                              <span className="range-value">{themeAngle}°</span>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <span style={{ color: '#9ca3af', fontSize: 12 }}>Background image (optional)</span>
                            <input
                              type="url"
                              value={settings.customThemeImage || ''}
                              onChange={(e)=> setSettings(s => ({ ...s, customThemeImage: e.target.value }))}
                              placeholder="https://example.com/wallpaper.jpg"
                              className="input-dark"
                              style={{ padding: 8 }}
                            />
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <label className="btn-ghost" style={{ padding: '6px 10px', cursor: 'pointer' }}>
                                Upload image
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e)=> {
                                    handleThemeImageUpload(e.target.files?.[0] || null);
                                    if (e.target) e.target.value = '';
                                  }}
                                />
                              </label>
                              {settings.customThemeImage && (
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  onClick={()=> setSettings(s => ({ ...s, customThemeImage: '' }))}
                                  style={{ padding: '6px 10px' }}
                                >
                                  Clear image
                                </button>
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              Uploaded images are stored locally as data URLs and rendered beneath your gradient.
                            </span>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'grid', gap: 8, minWidth: 260, flex: '1 1 100%' }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Message Style</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                          {MESSAGE_STYLE_OPTIONS.map((opt) => {
                            const selected = messageStyle === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                className="btn-ghost"
                                onClick={() => setSettings(s => ({ ...s, chatStyle: opt.value as Settings['chatStyle'], appearance: { ...s.appearance, messageStyle: opt.value } }))}
                                style={{
                                  textAlign: 'left',
                                  padding: 10,
                                  borderRadius: 10,
                                  border: selected ? `1px solid ${settings.accentHex || '#60a5fa'}` : '1px solid #1f2937',
                                  background: selected ? '#0b1222' : '#020617',
                                  color: '#e2e8f0',
                                  display: 'grid',
                                  gap: 6,
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{opt.label}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{opt.description}</div>
                                <div style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #1f2937', background: '#0b1222', display: 'grid', gap: 4 }}>
                                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                    {opt.value === 'minimal_log' && '12:21 user: hello there'}
                                    {opt.value === 'focus' && 'Recent messages stay vivid'}
                                    {opt.value === 'thread_forward' && '1 reply in thread'}
                                    {opt.value === 'retro' && '[SYS] call started'}
                                    {opt.value === 'bubbles' && 'Bubble preview'}
                                    {opt.value === 'classic' && 'Classic row preview'}
                                    {opt.value === 'sleek' && 'Sleek card preview'}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ padding: 12, borderRadius: 10, border: '1px solid #1f2937', background: '#020617', display: 'grid', gap: 10 }}>
                        <div style={{ fontWeight: 600 }}>Style preview</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>Alex · 12:21</div>
                            <div style={previewCardStyle(false)}>
                              <div style={{ fontSize: 13, color: '#e5e7eb' }}>
                                New chat style active. Here is a normal message.
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>You · 12:22 · edited</div>
                            <div style={{ ...previewCardStyle(true), borderLeft: `3px solid ${previewPin}` }}>
                              <div style={{ fontSize: 13, color: '#e5e7eb' }}>
                                Replying to <span style={{ color: previewAccent }}>@alex</span> with a
                                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 6, background: `${previewMention}22`, color: previewMention }}>mention</span>.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <label style={{ display: 'grid', gap: 6, minWidth: 160 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Font Size</span>
                        <select value={settings.messageFontSize || 'medium'} onChange={(e)=> setSettings(s => ({ ...s, messageFontSize: e.target.value as any }))} className="input-dark" style={{ padding: 8 }}>
                          <option value="small">Small (13px)</option>
                          <option value="medium">Medium (15px)</option>
                          <option value="large">Large (17px)</option>
                          <option value="extraLarge">Extra Large (19px)</option>
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 6, minWidth: 140 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Accent</span>
                        <input type="color" value={settings.accentHex || '#60a5fa'} onChange={(e)=> setSettings(s => ({ ...s, accentHex: e.target.value }))} />
                      </label>
                      <label style={{ display: 'grid', gap: 6, minWidth: 140 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Bold color</span>
                        <input type="color" value={settings.boldColorHex || '#f472b6'} onChange={(e)=> setSettings(s => ({ ...s, boldColorHex: e.target.value }))} />
                      </label>
                      <label style={{ display: 'grid', gap: 6, minWidth: 140 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Italics color</span>
                        <input type="color" value={settings.italicColorHex || '#a3e635'} onChange={(e)=> setSettings(s => ({ ...s, italicColorHex: e.target.value }))} />
                      </label>
                      <label style={{ display: 'grid', gap: 6, minWidth: 140 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Pinned border</span>
                        <input type="color" value={settings.pinColorHex || '#facc15'} onChange={(e)=> setSettings(s => ({ ...s, pinColorHex: e.target.value }))} />
                      </label>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, border: '1px solid #1f2937', background: '#020617', display: 'grid', gap: 10 }}>
                      <div style={{ fontWeight: 600 }}>Profiles</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        Switch between saved appearance layouts. Profiles are stored locally and sync support is coming soon.
                      </div>
                      <label style={{ display: 'grid', gap: 6, maxWidth: 280 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Active profile</span>
                        <select
                          value={activeProfileId || ''}
                          onChange={(e)=> handleSelectProfile(e.target.value)}
                          className="input-dark"
                          style={{ padding: 8 }}
                        >
                          {appearanceProfiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>{profile.name}</option>
                          ))}
                          {!appearanceProfiles.length && <option value="">Default</option>}
                        </select>
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button type="button" className="btn-ghost" onClick={handleCreateProfile} style={{ padding: '6px 10px' }}>New</button>
                        <button type="button" className="btn-ghost" onClick={handleDuplicateProfile} style={{ padding: '6px 10px' }}>Duplicate</button>
                        <button type="button" className="btn-ghost" onClick={handleRenameProfile} style={{ padding: '6px 10px' }}>Rename</button>
                        <button type="button" className="btn-ghost" onClick={handleUpdateProfile} style={{ padding: '6px 10px' }}>Update from current</button>
                        <button type="button" className="btn-ghost" onClick={handleDeleteProfile} style={{ padding: '6px 10px', color: appearanceProfiles.length > 1 ? '#f87171' : '#6b7280' }} disabled={appearanceProfiles.length <= 1}>Delete</button>
                      </div>
                      <button type="button" disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#0b1222', border: '1px solid #1f2937', cursor: 'not-allowed', opacity: 0.7 }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Sync profiles across devices (coming soon)</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Requires the auth revamp before this can go live.</div>
                        </div>
                        <Switch checked={syncProfilesEnabled} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, compact: !s.compact }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Compact density</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Tighten spacing in message lists.</div>
                        </div>
                        <Switch checked={!!settings.compact} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, compactSidebar: !(s as any).compactSidebar } as any))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Compact sidebar</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Use a narrower layout for havens and channels.</div>
                        </div>
                        <Switch checked={!!(settings as any).compactSidebar} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, sidebarHavenIconOnly: !(s as any).sidebarHavenIconOnly } as any))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Icon-only havens</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Show only haven avatars in the left sidebar.</div>
                        </div>
                        <Switch checked={!!(settings as any).sidebarHavenIconOnly} />
                      </button>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Haven columns (1-5)</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={Math.max(1, Math.min(5, Number(settings.havenColumns) || 1))}
                          onChange={(e)=> {
                            const value = Math.max(1, Math.min(5, parseInt(e.target.value || "1", 10) || 1));
                            setSettings(s => ({ ...s, havenColumns: value }));
                          }}
                          className="input-dark"
                          style={{ padding: 8 }}
                        />
                      </label>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, showTimestamps: !(s.showTimestamps !== false) }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Show timestamps</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Display time next to each message.</div>
                        </div>
                        <Switch checked={settings.showTimestamps !== false} />
                      </button>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Message grouping</span>
                        <select
                          value={appearance.messageGrouping || 'compact'}
                          onChange={(e)=> setSettings(s => ({ ...s, appearance: { ...s.appearance, messageGrouping: e.target.value as AppearanceSettings['messageGrouping'] } }))}
                          className="input-dark"
                          style={{ padding: 8 }}
                        >
                          <option value="none">None (show header every message)</option>
                          <option value="compact">Compact (5 min window)</option>
                          <option value="aggressive">Aggressive (30 min window)</option>
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Timestamp granularity</span>
                        <select
                          value={appearance.timestampGranularity || 'perMessage'}
                          onChange={(e)=> setSettings(s => ({ ...s, appearance: { ...s.appearance, timestampGranularity: e.target.value as AppearanceSettings['timestampGranularity'] } }))}
                          className="input-dark"
                          style={{ padding: 8 }}
                        >
                          <option value="perMessage">Per message</option>
                          <option value="perGroup">Only on group headers</option>
                        </select>
                      </label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <label style={{ display: 'grid', gap: 6, minWidth: 180 }}>
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>Time format</span>
                          <select
                            value={appearance.timeFormat || resolveDefaultTimeFormat()}
                            onChange={(e)=> setSettings(s => ({ ...s, appearance: { ...s.appearance, timeFormat: e.target.value as AppearanceSettings['timeFormat'] } }))}
                            className="input-dark"
                            style={{ padding: 8 }}
                          >
                            <option value="12h">12-hour</option>
                            <option value="24h">24-hour</option>
                          </select>
                        </label>
                        <label style={{ display: 'grid', gap: 6, minWidth: 180 }}>
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>Time display</span>
                          <select
                            value={appearance.timeDisplay || 'absolute'}
                            onChange={(e)=> setSettings(s => ({ ...s, appearance: { ...s.appearance, timeDisplay: e.target.value as AppearanceSettings['timeDisplay'] } }))}
                            className="input-dark"
                            style={{ padding: 8 }}
                          >
                            <option value="absolute">Absolute (5:27 AM)</option>
                            <option value="relative">Relative (6m ago)</option>
                            <option value="hybrid">Hybrid (hover for relative)</option>
                          </select>
                        </label>
                      </div>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>System message emphasis</span>
                        <select
                          value={appearance.systemMessageEmphasis || 'prominent'}
                          onChange={(e)=> setSettings(s => ({ ...s, appearance: { ...s.appearance, systemMessageEmphasis: e.target.value as AppearanceSettings['systemMessageEmphasis'] } }))}
                          className="input-dark"
                          style={{ padding: 8 }}
                        >
                          <option value="prominent">Prominent</option>
                          <option value="normal">Normal</option>
                          <option value="dimmed">Dimmed</option>
                          <option value="collapsible">Collapsible</option>
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Reading width</span>
                        <select
                          value={appearance.maxContentWidth ? String(appearance.maxContentWidth) : 'auto'}
                          onChange={(e)=> {
                            const value = e.target.value === 'auto' ? null : Number(e.target.value);
                            setSettings(s => ({ ...s, appearance: { ...s.appearance, maxContentWidth: Number.isFinite(value) ? value : null } }));
                          }}
                          className="input-dark"
                          style={{ padding: 8 }}
                        >
                          <option value="auto">Auto</option>
                          <option value="720">720px</option>
                          <option value="840">840px</option>
                          <option value="960">960px</option>
                          <option value="1080">1080px</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={()=> setSettings(s => ({ ...s, appearance: { ...s.appearance, fillScreen: !s.appearance?.fillScreen } }))}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div>Fill screen layout</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Let the main canvas stretch edge-to-edge.</div>
                        </div>
                        <Switch checked={appearance.fillScreen === true} />
                      </button>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Accent intensity</span>
                        <select
                          value={appearance.accentIntensity || 'normal'}
                          onChange={(e)=> setSettings(s => ({ ...s, appearance: { ...s.appearance, accentIntensity: e.target.value as AppearanceSettings['accentIntensity'] } }))}
                          className="input-dark"
                          style={{ padding: 8 }}
                        >
                          <option value="subtle">Subtle</option>
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </label>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, appearance: { ...s.appearance, readingMode: !s.appearance?.readingMode } }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Reading mode</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Hide avatars and reactions for distraction-free scrollback.</div>
                        </div>
                        <Switch checked={appearance.readingMode === true} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, showReadingModeButton: s.showReadingModeButton === false ? true : false }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Show reading mode button</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Toggle the eye icon in the chat header.</div>
                        </div>
                        <Switch checked={settings.showReadingModeButton !== false} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, reduceMotion: !s.reduceMotion }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Reduce motion</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Turn off most animations.</div>
                        </div>
                        <Switch checked={!!settings.reduceMotion} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, streamerMode: !s.streamerMode }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Streamer mode</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Mask usernames while sharing your screen.</div>
                        </div>
                        <Switch checked={!!settings.streamerMode} />
                      </button>
                      {settings.streamerMode && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#010914', border: '1px solid #1f2937' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ color: '#9ca3af', fontSize: 12 }}>Mask style</div>
                            <select
                              value={settings.streamerModeStyle || 'blur'}
                              onChange={(e)=> setSettings(s => ({ ...s, streamerModeStyle: e.target.value as 'blur'|'shorten' }))}
                              className="input-dark"
                              style={{ padding: 6 }}
                            >
                              <option value="blur">Blur names</option>
                              <option value="shorten">Shorten names</option>
                            </select>
                          </div>
                          {settings.streamerModeStyle === 'blur' && (
                            <button
                              type="button"
                              onClick={() => setSettings((s) => ({ ...s, streamerModeHoverReveal: s.streamerModeHoverReveal === false ? true : false }))}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}
                            >
                              <div style={{ textAlign: 'left' }}>
                                <div>Hover to reveal</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>Hover the privacy markers to briefly show full names.</div>
                              </div>
                              <Switch checked={settings.streamerModeHoverReveal !== false} />
                            </button>
                          )}
                        </div>
                      )}
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, showOnlineCount: !(s.showOnlineCount !== false) }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Show online count</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Show total online users in the header.</div>
                        </div>
                        <Switch checked={settings.showOnlineCount !== false} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, monospaceMessages: !(s as any).monospaceMessages } as any))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Monospace messages</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Render messages in a code-like font.</div>
                        </div>
                        <Switch checked={!!(settings as any).monospaceMessages} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, callHavensServers: !s.callHavensServers }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Call Havens 'Servers'</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Rename Haven labels across the UI.</div>
                        </div>
                        <Switch checked={!!settings.callHavensServers} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, showTips: s.showTips === false ? true : false }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Show tips banner</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Display a small getting-started panel in chat.</div>
                        </div>
                        <Switch checked={settings.showTips !== false} />
                      </button>
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #111827' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Message quick buttons</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                          Choose which actions show on hover for your own messages and for others. Drag to reorder; double-click to remove a button.
                        </div>
                        {(() => {
                          const allKeys = ['reply','react','pin','edit','delete','history','more'];
                          const labels: Record<string,string> = {
                            reply: 'Reply',
                            react: 'React',
                            pin: 'Pin/Unpin',
                            edit: 'Edit',
                            delete: 'Delete',
                            history: 'Edit history',
                            more: 'More menu',
                          };
                          const own = Array.isArray(settings.quickButtonsOwn) && settings.quickButtonsOwn.length ? settings.quickButtonsOwn : ['reply','react','more'];
                          const others = Array.isArray(settings.quickButtonsOthers) && settings.quickButtonsOthers.length ? settings.quickButtonsOthers : ['reply','react','more'];
                          const applyOwn = (next: string[]) => setSettings(s => ({ ...s, quickButtonsOwn: next }));
                          const applyOthers = (next: string[]) => setSettings(s => ({ ...s, quickButtonsOthers: next }));
                          const renderRow = (title: string, list: string[], onChange: (next: string[]) => void) => (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{title}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {list.map((key, idx) => (
                                  <button
                                    key={key + idx}
                                    type="button"
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)); e.dataTransfer.effectAllowed = 'move'; }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const from = Number(e.dataTransfer.getData('text/plain'));
                                      if (isNaN(from) || from === idx) return;
                                      const next = list.slice();
                                      const [moved] = next.splice(from, 1);
                                      next.splice(idx, 0, moved);
                                      onChange(next);
                                    }}
                                    onDoubleClick={() => onChange(list.filter((_, i) => i !== idx))}
                                    style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid #1f2937', background: '#020617', fontSize: 11, cursor: 'grab' }}
                                  >
                                    {labels[key] || key}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                          const addRow = (label: string, list: string[], onChange: (next: string[]) => void) => {
                            const remaining = allKeys.filter(k => !list.includes(k));
                            if (remaining.length === 0) return null;
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (!v) return;
                                    if (!list.includes(v)) onChange([...list, v]);
                                  }}
                                  className="input-dark"
                                  style={{ padding: 4, fontSize: 11 }}
                                >
                                  <option value="">Add...</option>
                                  {remaining.map(k => (
                                    <option key={k} value={k}>{labels[k] || k}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          };
                          return (
                            <>
                              {renderRow('Your messages', own, applyOwn)}
                              {addRow('Add for your messages', own, applyOwn)}
                              {renderRow("Others' messages", others, applyOthers)}
                              {addRow('Add for others', others, applyOthers)}
                              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                                Tip: keep <strong>More menu</strong> so you can still reach the full context menu.
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
                {tab === 'notifications' && (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <button
                          type="button"
                          onClick={()=> setSettings(s => {
                            const current = s.notifications?.mentions !== false;
                            return { ...s, notifications: { ...(s.notifications||{}), mentions: !current } };
                          })}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div>Mentions</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>Show alerts and highlights when someone @mentions you.</div>
                          </div>
                          <Switch checked={settings.notifications?.mentions !== false} />
                        </button>
                        <button
                          type="button"
                          onClick={()=> setSettings(s => {
                            const current = s.notifications?.pins !== false;
                            return { ...s, notifications: { ...(s.notifications||{}), pins: !current } };
                          })}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div>Pins</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>Notify when messages are pinned in your channels.</div>
                          </div>
                          <Switch checked={settings.notifications?.pins !== false} />
                        </button>
                        <button
                          type="button"
                          onClick={()=> setSettings(s => {
                            const current = s.notifications?.soundEnabled !== false;
                            return { ...s, notifications: { ...(s.notifications||{}), soundEnabled: !current } };
                          })}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div>Sound</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>Play notification sounds for configured events.</div>
                          </div>
                          <Switch checked={settings.notifications?.soundEnabled !== false} />
                        </button>
                        <button
                          type="button"
                          onClick={handleDesktopNotificationsToggle}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div>Desktop notifications</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>Show alerts when the app is unfocused. if this is the first time you're enabling this, you may need to enable desktop notifications in your browser settings. if you are in incognito mode or on mobile, this may not work.</div>
                          </div>
                          <Switch checked={desktopNotificationsEnabled} />
                        </button>
                        <button
                          type="button"
                          onClick={()=> setSettings(s => ({ ...s, callsEnabled: !s.callsEnabled }))}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div>DM voice calls</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>Allow starting and receiving voice calls in direct messages.</div>
                          </div>
                          <Switch checked={settings.callsEnabled !== false} />
                        </button>
                        <button
                          type="button"
                          onClick={()=> setSettings(s => {
                            const current = s.callRingSound !== false;
                            return { ...s, callRingSound: !current };
                          })}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div>Incoming call sound</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>Play a sound when someone starts a call with you.</div>
                          </div>
                          <Switch checked={settings.callRingSound !== false} />
                        </button>
                        <Dropdown
                          label="Ringtone"
                          options={ringtoneOptions}
                          value={settings.callRingtone || "Drive"}
                          onChange={(opt) => {
                            stopPreview();
                            setSettings((s) => ({ ...s, callRingtone: opt.value }));
                          }}
                        />
                      </div>
                      <div className="range-row">
                        <span style={{ color: '#9ca3af', fontSize: 12, minWidth: 60 }}>Volume</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(((settings.notifications?.volume ?? 0.6) * 100))}
                          onChange={(e)=> setSettings(s => ({ ...s, notifications: { ...(s.notifications||{}), volume: Math.max(0, Math.min(1, Number(e.target.value)/100)) } }))}
                        />
                        <span className="range-value">{Math.round(((settings.notifications?.volume ?? 0.6) * 100))}%</span>
                      </div>
                    </div>
                  )}
                
                {tab === 'voice' && (
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      Voice settings apply to calls and voice channels. These are stored per-device for quick tuning. assure you have a working microphone and speakers, then adjust these settings while in a call for best results. advanced device selection will appear here once browser permission is granted. if you change these settings while not in a call, they will be applied as soon as possible, but you may need to toggle a setting or restart the app to trigger them. if you experience issues with echo or background noise, try enabling noise suppression and echo cancellation. if your voice is too quiet or loud to others, adjust the input and output volumes. if you want to test how you sound to others, enable the mic test tone to hear a preview of your microphone with all settings applied. if you are in incognito mode, your input may not work.
                    </div>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>Input volume</span>
                      <div className="range-row">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={settings.voice?.inputVolume ?? 0.85}
                          onChange={(e)=> setSettings(s => ({ ...s, voice: { ...(s.voice || {}), inputVolume: Number(e.target.value) } }))}
                        />
                        <span className="range-value">{Math.round((settings.voice?.inputVolume ?? 0.85) * 100)}%</span>
                      </div>
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>Output volume</span>
                      <div className="range-row">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={settings.voice?.outputVolume ?? 0.9}
                          onChange={(e)=> setSettings(s => ({ ...s, voice: { ...(s.voice || {}), outputVolume: Number(e.target.value) } }))}
                        />
                        <span className="range-value">{Math.round((settings.voice?.outputVolume ?? 0.9) * 100)}%</span>
                      </div>
                    </label>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, voice: { ...(s.voice || {}), noiseSuppression: !(s.voice?.noiseSuppression !== false) } }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <span>Noise suppression</span>
                        <Switch checked={settings.voice?.noiseSuppression !== false} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, voice: { ...(s.voice || {}), echoCancellation: !(s.voice?.echoCancellation !== false) } }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <span>Echo cancellation</span>
                        <Switch checked={settings.voice?.echoCancellation !== false} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, voice: { ...(s.voice || {}), autoGain: !(s.voice?.autoGain !== false) } }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <span>Auto gain</span>
                        <Switch checked={settings.voice?.autoGain !== false} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, voice: { ...(s.voice || {}), pushToTalk: !(s.voice?.pushToTalk === true) } }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <span>Push to talk</span>
                        <Switch checked={settings.voice?.pushToTalk === true} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, voice: { ...(s.voice || {}), micTestTone: !(s.voice?.micTestTone === true) } }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <span>Mic test tone</span>
                        <Switch checked={settings.voice?.micTestTone === true} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Note: advanced device selection will appear here once browser permission is granted.
                    </div>
                  </div>
                )}
{tab === 'privacy' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, blurOnUnfocused: !s.blurOnUnfocused }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Blur when unfocused</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Hide message text, usernames, and media when this tab loses focus.</div>
                        </div>
                        <Switch checked={!!settings.blurOnUnfocused} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, showBlockActions: s.showBlockActions === false ? true : false }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Show block actions</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Allow blocking from profile actions.</div>
                        </div>
                        <Switch checked={settings.showBlockActions !== false} />
                      </button>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, border: '1px solid #1f2937', background: '#020617', display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Blocked users</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>Messages from blocked users are hidden everywhere.</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          value={blockInput}
                          onChange={(e)=> setBlockInput(e.target.value)}
                          placeholder="Username"
                          className="input-dark"
                          style={{ padding: '6px 10px', minWidth: 180 }}
                        />
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            const trimmed = blockInput.trim();
                            if (!trimmed) return;
                            if (!blockedUsers.includes(trimmed)) {
                              setSettings((s) => ({ ...s, blockedUsers: [...blockedUsers, trimmed] }));
                            }
                            setBlockInput("");
                          }}
                          style={{ padding: '6px 10px' }}
                        >
                          Block
                        </button>
                      </div>
                      {blockedUsers.length === 0 ? (
                        <div style={{ fontSize: 11, color: '#6b7280' }}>No blocked users.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: 6 }}>
                          {blockedUsers.map((user) => (
                            <div key={user} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, border: '1px solid #1f2937' }}>
                              <span>@{user}</span>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => setConfirmBlockRemoval(user)}
                                style={{ padding: '4px 8px', color: '#f87171' }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {tab === 'status' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 6, maxWidth: 240 }}>
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>Status</span>
                      <select value={settings.status || 'online'} onChange={(e)=> setSettings(s => ({ ...s, status: e.target.value as any }))} className="input-dark" style={{ padding: 8 }}>
                        <option value="online">Online</option>
                        <option value="idle">Idle</option>
                        <option value="dnd">Do Not Disturb</option>
                        <option value="offline">Offline</option>
                      </select>
                    </label>
                    
                    <div style={{ display: 'grid', gap: 8, border: '1px solid #1f2937', background: '#0b1222', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>Steam Rich Presence</div>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Steam ID (64-bit)</span>
                        <input
                          value={settings.steamId || ''}
                          onChange={(e)=> setSettings(s => ({ ...s, steamId: e.target.value }))}
                          placeholder="7656119..."
                          className="input-dark"
                          style={{ padding: 8 }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={()=> setSettings(s => ({ ...s, steamRichPresence: !s.steamRichPresence }))}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div>Show Steam activity</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Display the game you are currently playing on Steam.</div>
                        </div>
                        <Switch checked={settings.steamRichPresence === true} />
                      </button>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        Requires your Steam profile to be public.
                      </div>
                    </div>

<label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>Status message</span>
                      <input
                        value={settings.statusMessage || ''}
                        onChange={(e)=> setSettings(s => ({ ...s, statusMessage: e.target.value.slice(0, MAX_STATUS_MESSAGE) }))}
                        placeholder="What are you up to?"
                        className="input-dark"
                        style={{ padding: 8 }}
                      />
                      <span style={{ color: '#6b7280', fontSize: 11 }}>
                        {Math.max(0, MAX_STATUS_MESSAGE - (settings.statusMessage || '').length)} characters left.
                      </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={settings.dndIsCosmetic === true}
                        onChange={(e) => setSettings(s => ({ ...s, dndIsCosmetic: e.target.checked }))}
                      />
                      <div style={{ display: 'grid', gap: 2 }}>
                        <span style={{ fontWeight: 600 }}>DND is cosmetic only</span>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>Keep notifications and sounds even when DND is enabled.</span>
                      </div>
                    </label>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ color: '#9ca3af', fontSize: 12 }}>Rich presence (manual)</div>
                      <select
                        value={settings.richPresence?.type || 'none'}
                        onChange={(e)=> setSettings(s => {
                          const next = e.target.value;
                          if (next === 'none') return { ...s, richPresence: undefined };
                          return { ...s, richPresence: { ...(s.richPresence || {}), type: next as any } };
                        })}
                        className="input-dark"
                        style={{ padding: 8, maxWidth: 240 }}
                      >
                        <option value="none">None</option>
                        <option value="game">Playing a game</option>
                        <option value="music">Listening to music</option>
                        <option value="custom">Custom activity</option>
                      </select>
                      {settings.richPresence?.type && (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <input
                            value={settings.richPresence?.title || ''}
                            onChange={(e)=> setSettings(s => ({ ...s, richPresence: { ...(s.richPresence || {}), title: e.target.value.slice(0, MAX_RICH_TITLE) } }))}
                            placeholder={settings.richPresence?.type === 'music' ? 'Track or playlist' : 'Activity title'}
                            className="input-dark"
                            style={{ padding: 8 }}
                          />
                          <input
                            value={settings.richPresence?.details || ''}
                            onChange={(e)=> setSettings(s => ({ ...s, richPresence: { ...(s.richPresence || {}), details: e.target.value.slice(0, MAX_RICH_DETAILS) } }))}
                            placeholder="Details (optional)"
                            className="input-dark"
                            style={{ padding: 8 }}
                          />
                          <div style={{ color: '#6b7280', fontSize: 11 }}>
                            Automatic game/music presence will be added after the new auth integration ships.
                          </div>
                        </div>
                      )}
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={settings.autoIdleEnabled !== false}
                        onChange={(e) => setSettings(s => ({ ...s, autoIdleEnabled: e.target.checked }))}
                      />
                      <div style={{ display: 'grid', gap: 2 }}>
                        <span style={{ fontWeight: 600 }}>Auto-idle</span>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>Set status to Idle after 5 minutes of inactivity (desktop and mobile).</span>
                      </div>
                    </label>
                  </div>
                )}
                {tab === 'account' && (
                  <div style={{ display: 'grid', gap: 16 }}>
                      <button
                        type="button"
                        onClick={()=> setSettings(s => ({ ...s, syncProfileToChitterSync: !s.syncProfileToChitterSync }))}
                        disabled={!isChitterSyncAccount}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: isChitterSyncAccount ? 'pointer' : 'not-allowed', opacity: isChitterSyncAccount ? 1 : 0.6 }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div>Sync profile to ChitterSync</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            Keeps display name, bio, pronouns, website, and location synced to your ChitterSync account.
                          </div>
                        </div>
                        <Switch checked={settings.syncProfileToChitterSync === true} />
                      </button>

                    
                      <button
                        type="button"
                        onClick={cleanupLegacySettings}
                        className="btn-ghost"
                        style={{ padding: '6px 10px', border: '1px dashed #334155', color: '#cbd5f5' }}
                      >
                        Remove legacy settings
                      </button>


                      <button
                        type="button"
                        onClick={() => setTab('connections')}
                        className="btn-ghost"
                        style={{ padding: '6px 10px', border: '1px solid #1f2937' }}
                      >
                        More connections
                      </button>

{syncWarning && (
                      <div style={{ padding: 10, borderRadius: 8, background: '#3f0c0c', border: '1px solid #ef4444', color: '#fecaca', fontSize: 13 }}>
                        {syncWarning}
                      </div>
                    )}
                    {showLegacyConversion ? (
                      <>
                        <div>
                          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Account conversion</div>
                          <p style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.4 }}>
                            We detected that @{username} is still using the legacy ChitterHaven auth. Convert once to link this profile with the ChitterSync cloud so
                            your havens, DMs, and devices stay in sync everywhere.
                          </p>
                          <ul style={{ marginLeft: 18, color: '#9ca3af', fontSize: 12 }}>
                            <li>Your password will be re-encrypted using new AES-GCM keys.</li>
                            <li>You'll be signed out after the migration is complete.</li>
                            <li>All apps, including mobile apps, will share the same preferences.</li>
                            <li>You will gain the ability to use the full ChitterSync ecosystem.</li>
                            <li>This migration is irreversible and cannot be undone.</li>
                            <li>The old auth system will be deprecated February 10th, 2026.</li>
                            <li>Converting your account is not required but is recommended.</li>
                          </ul>
                        </div>
                        {convertMessage && (
                          <div style={{ padding: 10, borderRadius: 8, background: '#052e16', border: '1px solid #166534', color: '#bbf7d0', fontSize: 13 }}>
                            {convertMessage}
                          </div>
                        )}
                        {convertError && (
                          <div style={{ padding: 10, borderRadius: 8, background: '#3f0c0c', border: '1px solid #ef4444', color: '#fecaca', fontSize: 13 }}>
                            {convertError}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            setConvertError(null);
                            setConvertMessage(null);
                            setConverting(true);
                              try {
                                const res = await fetch('/api/account/convert', { method: 'POST' });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) {
                                  throw new Error(data?.error || 'Conversion failed.');
                                } 
                                if (data?.url) {
                                  window.location.href = data.url;
                                  return;
                                }
                                setConvertMessage('Conversion link ready. Please sign back in using the new auth service.');
                                await performLogout();
                                await fetchSettings();
                              } catch (err: any) {
                                setConvertError(err?.message || 'Conversion failed.');
                              } finally {
                              setConverting(false);
                            }
                          }}
                          disabled={converting}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: '1px solid #1f2937',
                            background: converting ? '#1f2937' : '#0b1120',
                            color: '#fcd34d',
                            fontWeight: 600,
                            cursor: converting ? 'default' : 'pointer',
                            transition: 'opacity 120ms ease',
                            opacity: converting ? 0.7 : 1,
                          }}
                        >
                          {converting ? 'Converting...' : 'Convert account'}
                        </button>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          Having trouble? Contact support@chittersync.com with your username for manual migration assistance.
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>ChitterSync cloud settings</div>
                            <span
                              style={{
                                fontSize: 10,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                                padding: '2px 6px',
                                borderRadius: 999,
                                border: '1px solid rgba(59,130,246,0.5)',
                                color: '#93c5fd',
                                background: 'rgba(30,58,138,0.25)',
                              }}
                            >
                              Connected via ChitterSync
                            </span>
                          </div>
                          <p style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.4 }}>
                            @{username} is linked to the new auth platform. Any changes you save here sync instantly to every ChitterSync app you sign in to.
                          </p>
                        </div>
                        <div style={{ display: 'grid', gap: 4, fontSize: 13, color: '#e5e7eb' }}>
                          <div>Linked account: <span style={{ color: '#93c5fd' }}>@{username}</span></div>
                          <div>
                            Last synced:{' '}
                            <span style={{ color: '#93c5fd' }}>
                              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Awaiting first sync'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { void fetchSettings(); }}
                          disabled={loading || !isChitterSyncAccount}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: '1px solid #1f2937',
                            background: loading || !isChitterSyncAccount ? '#1f2937' : '#0b1120',
                            color: loading || !isChitterSyncAccount ? '#6b7280' : '#93c5fd',
                            fontWeight: 600,
                            cursor: loading || !isChitterSyncAccount ? 'default' : 'pointer',
                            transition: 'opacity 120ms ease',
                            opacity: loading || !isChitterSyncAccount ? 0.7 : 1,
                          }}
                        >
                          {loading ? 'Refreshing...' : 'Refresh from cloud'}
                        </button>
                        {!isChitterSyncAccount && (
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            Sign in with ChitterSync to refresh cloud settings.
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          Preferences saved from mobile, desktop, or the auth portal share the same source of truth. Reload if you change them elsewhere.
                        </div>
                          <div style={{ display: 'grid', gap: 10 }}>
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>Linked accounts</div>
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window === "undefined") return;
                                const returnTo = `${window.location.origin}/steam/callback`;
                                const realm = window.location.origin;
                                const params = new URLSearchParams({
                                  "openid.ns": "http://specs.openid.net/auth/2.0",
                                  "openid.mode": "checkid_setup",
                                  "openid.return_to": returnTo,
                                  "openid.realm": realm,
                                  "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
                                  "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
                                });
                                const url = `https://steamcommunity.com/openid/login?${params.toString()}`;
                                const width = 520;
                                const height = 720;
                                const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
                                const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
                                window.open(
                                  url,
                                  "steam_link",
                                  `popup=yes,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`,
                                );
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid #1f2937',
                                background: '#0b1120',
                                color: '#e2e8f0',
                              }}
                            >
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600 }}>Steam</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                  {settings.steamId ? `Connected: ${settings.steamId}` : "Connect your Steam account"}
                                </div>
                              </div>
                              <span style={{ fontSize: 11, color: settings.steamId ? '#22c55e' : '#94a3b8' }}>
                                {settings.steamId ? "Connected" : "Connect"}
                              </span>
                            </button>
                            {settings.steamId && (
                              <button
                                type="button"
                                onClick={() => setSettings((s) => ({ ...s, steamId: "", steamRichPresence: false }))}
                                className="btn-ghost"
                                style={{ padding: '6px 10px', color: '#f87171', border: '1px dashed #334155' }}
                              >
                                Disconnect Steam
                              </button>
                            )}
                            {[
                              { label: "Discord", hint: "Coming soon" },
                              { label: "Spotify", hint: "Coming soon" },
                            ].map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                disabled
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: 10,
                                  border: '1px solid #1f2937',
                                  background: '#0b1120',
                                  color: '#9ca3af',
                                  opacity: 0.7,
                                  cursor: 'not-allowed',
                                }}
                              >
                                <div style={{ textAlign: 'left' }}>
                                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                                  <div style={{ fontSize: 11, color: '#6b7280' }}>{item.hint}</div>
                                </div>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>Unavailable</span>
                              </button>
                            ))}
                          </div>
                        <div style={{ display: 'grid', gap: 10 }}>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>Account lists</div>
                          <CustomDropdown
                            label="Friends"
                            items={accountFriends.friends.map((friend) => `@${friend}`)}
                            emptyLabel="No friends yet."
                          />
                          <CustomDropdown
                            label="Blocked users"
                            items={blockedUsers.map((user) => `@${user}`)}
                            emptyLabel="No blocked users."
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
                {tab === 'about' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>About ChitterHaven</div>
                      <div style={{ fontSize: 13 }}>
                        <div>Version: <span style={{ color: '#93c5fd' }}>0.2.0</span></div>
                        <div>License: <span style={{ color: '#93c5fd' }}>Personal / non-commercial use</span></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Your account</div>
                      {aboutLoading && !aboutUser && (
                        <div style={{ color: '#94a3b8' }}>Loading...</div>
                      )}
                      {!aboutLoading && (
                        <div style={{ fontSize: 13 }}>
                          <div>User ID: <span style={{ color: '#93c5fd' }}>{aboutUser?.username ?? username}</span></div>
                          {aboutUser?.iat && (
                            <div>
                              Account created:{' '}
                              <span style={{ color: '#93c5fd' }}>
                                {new Date(aboutUser.iat * 1000).toLocaleDateString()}
                              </span>
                              {(() => {
                                const days = Math.floor((Date.now() - aboutUser.iat * 1000) / (1000 * 60 * 60 * 24));
                                return isFinite(days) && days >= 0 ? (
                                  <span style={{ color: '#9ca3af' }}> ({days} day{days === 1 ? '' : 's'} ago)</span>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Usage (this device)</div>
                      <div style={{ fontSize: 13 }}>
                        <div>Total havens joined (local): <span style={{ color: '#93c5fd' }}>{aboutStats.havens}</span></div>
                        <div>Total DMs opened (local): <span style={{ color: '#93c5fd' }}>{aboutStats.dms}</span></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Telemetry</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        ChitterHaven stores your data in encrypted JSON files on the server and uses a JWT cookie for authentication.
                        Basic usage metrics like havens and DMs on this device are kept locally in your browser.
                      </div>
                    </div>
                  </div>
                )}
                {tab === 'secrets' && secretsUnlocked && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#050c1a', display: 'grid', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>Desktop companion</div>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>Oneko</div>
                        <p style={{ margin: 0, color: '#94a3b1', fontSize: 13 }}>
                          Summon the retro cursor-chasing cat. Once enabled it will follow your mouse throughout the app.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, enableOneko: !s.enableOneko }))}
                        className="btn-ghost"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10 }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>Enable Oneko</div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>{settings.enableOneko ? 'cat follow mouse (real).' : 'Tap to let the kitty roam again.'}</div>
                        </div>
                        <Switch checked={!!settings.enableOneko} />
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      Saving your settings keeps Oneko enabled between sessions. Use the demo toggle again if you ever want to rediscover other secrets.
                    </div>
                  </div>
                )}
                
                {tab === 'connections' && (
                  <div style={{ position: 'relative', display: 'grid', gap: 16 }}>
                    {!isChitterSyncAccount && (
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.alert("Please link your account in order to use connections to other platforms");
                          }
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 5,
                          background: 'rgba(2,6,23,0.55)',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(148,163,184,0.2)',
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          color: '#e2e8f0',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Link your account to unlock connections"
                      >
                        <FontAwesomeIcon icon={faLock} />
                        <span>Connections locked</span>
                      </button>
                    )}
                    {!isChitterSyncAccount && (
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          border: '1px solid rgba(148,163,184,0.35)',
                          background: 'rgba(2,6,23,0.6)',
                          color: '#e2e8f0',
                          fontSize: 13,
                        }}
                      >
                        Please link your account in order to use connections to other platforms
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      Manage connected services for this account.
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Linked accounts</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setTab('account')}
                          className="btn-ghost"
                          style={{ padding: '6px 10px' }}
                        >
                          Back to Account
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Steam</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>
                          {settings.steamId ? `Connected: ${settings.steamId}` : 'Not connected'}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window === 'undefined') return;
                            const returnTo = `${window.location.origin}/steam/callback`;
                            const realm = window.location.origin;
                            const params = new URLSearchParams({
                              'openid.ns': 'http://specs.openid.net/auth/2.0',
                              'openid.mode': 'checkid_setup',
                              'openid.return_to': returnTo,
                              'openid.realm': realm,
                              'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
                              'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
                            });
                            const url = `https://steamcommunity.com/openid/login?${params.toString()}`;
                            const width = 520;
                            const height = 720;
                            const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
                            const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
                            window.open(url, 'steam_link', `popup=yes,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`);
                          }}
                          className="btn-ghost"
                          style={{ padding: '8px 10px' }}
                          title="Purpose: presence"
                        >
                          {settings.steamId ? 'Reconnect Steam' : 'Connect Steam'}
                        </button>
                        {settings.steamId && (
                          <button
                            type="button"
                            onClick={() => setSettings((s) => ({ ...s, steamId: '', steamRichPresence: false }))}
                            className="btn-ghost"
                            style={{ padding: '6px 10px', color: '#f87171', border: '1px dashed #334155' }}
                            title="Purpose: presence"
                          >
                            Disconnect Steam
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>More connections</div>
                      {[
                        { label: 'Google', purpose: 'syncing' },
                        { label: 'Apple', purpose: 'syncing' },
                        { label: 'Microsoft', purpose: 'syncing' },
                        { label: 'GitHub', purpose: 'SDK' },
                        { label: 'Xbox', purpose: 'presence' },
                        { label: 'PlayStation', purpose: 'presence' },
                        { label: 'Epic Games', purpose: 'presence' },
                        { label: 'Roblox', purpose: 'presence' },
                        { label: 'YouTube', purpose: 'presence' },
                        { label: 'Twitch', purpose: 'presence' },
                        { label: 'Apple Music', purpose: 'presence' },
                        { label: 'SoundCloud', purpose: 'presence' },
                        { label: 'Reddit', purpose: 'other' },
                        { label: 'CurseForge', purpose: 'SDK' },
                        { label: 'Modrinth', purpose: 'SDK' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          disabled
                          title={`Purpose: ${item.purpose}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid #1f2937',
                            background: '#0b1120',
                            color: '#9ca3af',
                            opacity: 0.7,
                            cursor: 'not-allowed',
                          }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600 }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>Purpose: {item.purpose}</div>
                          </div>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>Unavailable</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'browser' && (
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      Browser details and permission controls are managed locally by your device.
                    </div>
                    <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 12, border: '1px solid #1f2937', background: '#020617' }}>
                      <div style={{ fontWeight: 600 }}>Browser info</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>User agent</div>
                      <div style={{ fontSize: 12, color: '#e5e7eb', wordBreak: 'break-word' }}>{browserInfo.userAgent || 'Unknown'}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 12 }}>
                        <div>
                          <div style={{ color: '#9ca3af' }}>Platform</div>
                          <div style={{ color: '#e5e7eb' }}>{browserInfo.platform || 'Unknown'}</div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af' }}>Language</div>
                          <div style={{ color: '#e5e7eb' }}>{browserInfo.language || 'Unknown'}</div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af' }}>Online</div>
                          <div style={{ color: '#e5e7eb' }}>{browserInfo.online ? 'Yes' : 'No'}</div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af' }}>Cookies</div>
                          <div style={{ color: '#e5e7eb' }}>{browserInfo.cookiesEnabled ? 'Enabled' : 'Disabled'}</div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af' }}>Device memory</div>
                          <div style={{ color: '#e5e7eb' }}>{browserInfo.deviceMemory ? `${browserInfo.deviceMemory} GB` : 'Unknown'}</div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af' }}>CPU cores</div>
                          <div style={{ color: '#e5e7eb' }}>{browserInfo.hardwareConcurrency || 'Unknown'}</div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af' }}>Screen</div>
                          <div style={{ color: '#e5e7eb' }}>{browserInfo.screen || 'Unknown'}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Permissions</div>
                      {[
                        { key: 'notifications', label: 'Notifications', request: async () => {
                          if (typeof Notification === 'undefined') return;
                          await Notification.requestPermission();
                        }},
                        { key: 'microphone', label: 'Microphone', request: async () => {
                          if (!navigator.mediaDevices?.getUserMedia) return;
                          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                          stream.getTracks().forEach((t) => t.stop());
                        }},
                        { key: 'camera', label: 'Camera', request: async () => {
                          if (!navigator.mediaDevices?.getUserMedia) return;
                          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                          stream.getTracks().forEach((t) => t.stop());
                        }},
                        { key: 'geolocation', label: 'Location', request: async () => {
                          if (!navigator.geolocation) return;
                          navigator.geolocation.getCurrentPosition(() => undefined, () => undefined);
                        }},
                      ].map((perm) => (
                        <div
                          key={perm.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid #1f2937',
                            background: '#0b1120',
                          }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600 }}>{perm.label}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>
                              Status: {permissionStates[perm.key] || 'unknown'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={async () => {
                              try {
                                await perm.request();
                              } catch {}
                            }}
                            style={{ padding: '6px 10px' }}
                          >
                            Request
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'guides' && (
                  <div style={{ display: 'grid', gap: 14, fontSize: 13 }}>
                    <div style={{ color: '#9ca3af' }}>
                      Quick tips for using ChitterHaven features. These are read-only; changing them here won't affect your real messages.
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Mentions & replies</div>
                      <ul style={{ marginLeft: 16, color: '#e5e7eb' }}>
                        <li>Type <code>@username</code> to mention someone. Your own handle is highlighted using your mention color.</li>
                        <li>Hover a message to reveal actions. Click <strong>Reply</strong> to quote the message and jump back to it later.</li>
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Reactions & pins</div>
                      <ul style={{ marginLeft: 16, color: '#e5e7eb' }}>
                        <li>Use <strong>Add Reaction</strong> to react with emojis; Shift+hover shows extra actions.</li>
                        <li>Pin important messages (pin color is configurable in Appearance) and view them via the thumbtack icon in the header.</li>
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Havens / Servers & channels</div>
                      <ul style={{ marginLeft: 16, color: '#e5e7eb' }}>
                        <li>Left sidebar lists Havens (or Servers, if you enabled that label), plus Direct Messages.</li>
                        <li>Each Haven has its own channels; use the GǣNew ChannelGǥ button to add one and choose its type.</li>
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Invites & DMs</div>
                      <ul style={{ marginLeft: 16, color: '#e5e7eb' }}>
                        <li>Use the mail icon in the Channels column to generate invite codes with expiry and max uses.</li>
                        <li>Friends live under Direct Messages; accept requests to auto-create DM threads.</li>
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Practice controls</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                        <button type="button" onClick={()=> setGuideChecked(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div>Example toggle</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>Play with the custom switch control.</div>
                          </div>
                          <Switch checked={guideChecked} />
                        </button>
                        <GuideSlider value={guideLevel} onChange={setGuideLevel} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Feedback</div>
                      <p style={{ color: '#9ca3af', marginBottom: 6 }}>Spotted a bug or have an idea?</p>
                      <textarea
                        placeholder="Tell us what you like, what feels confusing, or what you'd like to see next."
                        rows={4}
                        style={{ width: '100%', resize: 'vertical', padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#020617', color: '#e5e7eb' }}
                        onBlur={async (e) => {
                          const text = e.target.value.trim();
                          if (!text) return;
                          try {
                            await fetch('/api/audit-log', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ type: 'feedback', from: username, message: text })
                            });
                            e.target.value = '';
                          } catch {}
                        }}
                      />
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Feedback is saved with your username so we can understand context; nothing is shared publicly.</div>
                    </div>
                  </div>
                )}
                {tab === 'dev' && (
                  <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
                    <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#020617', display: 'grid', gap: 6 }}>
                      <div style={{ fontWeight: 600 }}>Demo toggle</div>
                      <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>
                        Tap this switch thirty times to unlock the secret settings vault.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDemoToggleArmed((prev) => !prev);
                          setSecretClicks((prev) => Math.min(SECRET_THRESHOLD, prev + 1));
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, border: '1px solid #1f2937', background: '#050c1a' }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600 }}>Demo mode</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            {secretsUnlocked
                              ? 'Secrets unlocked!'
                              : `${Math.max(0, SECRET_THRESHOLD - secretClicks)} taps to go.`}
                          </div>
                        </div>
                        <Switch checked={demoToggleArmed} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, callrfMobileSizing: !s.callrfMobileSizing }))}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, border: '1px solid #1f2937', background: '#050c1a' }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>CallRF mobile sizing</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          Force mobile layout by viewport when enabled. Off disables mobile layout entirely.
                        </div>
                      </div>
                      <Switch checked={settings.callrfMobileSizing === true} />
                    </button>
                    <div style={{ color: '#9ca3af' }}>
                      Developer tools and diagnostics. These options are for debugging; they don&apos;t change how messages are stored on the server.
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        <strong>Context menu debug</strong>
                        <div>Alt/Option + right-click to open a debug context menu. You can copy raw message JSON, room keys, and basic session info.</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        <strong>IDs</strong>
                        <div>Messages use generated IDs; rooms are named as <code>HAVEN__CHANNEL</code> for channels or the DM id for direct messages.</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        <strong>Logging</strong>
                        <div>Use your browser devtools console and network tab to inspect calls to <code>/api/history</code>, <code>/api/permissions</code>, and <code>/api/socketio</code>.</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid #2a3344', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#07101a' }}>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 13 }}>remember to save your changes</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={handleCancel} style={{ padding: '6px 10px', color: '#f87171' }}>Cancel</button>
              <button className="btn-ghost" onClick={save} style={{ padding: '6px 10px', color: '#93fd98' }}>Save</button>
            </div>
          </div>
          {confirmBlockRemoval && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 95 }}>
              <div style={{ width: 'min(360px, 92vw)', background: '#0b1222', border: '1px solid #1f2937', borderRadius: 12, padding: 16, color: '#e5e7eb', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Remove blocked user?</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>Unblock @{confirmBlockRemoval} and allow messages again.</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn-ghost" onClick={() => setConfirmBlockRemoval(null)} style={{ padding: '6px 10px' }}>Cancel</button>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setSettings((s) => ({ ...s, blockedUsers: blockedUsers.filter((u) => u !== confirmBlockRemoval) }));
                      setConfirmBlockRemoval(null);
                    }}
                    style={{ padding: '6px 10px', color: '#f87171' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
          </main>
        </div>
      </div>
    </div>
  );
}
