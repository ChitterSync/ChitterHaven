"use client";

// --- imports (yes, it's a lot).
import type React from "react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faReply,
  faEdit,
  faTrash,
  faGear,
  faThumbtack,
  faFaceSmile,
  faXmark,
  faAt,
  faPaperclip,
  faClockRotateLeft,
  faUsers,
  faHashtag,
  faEnvelope,
  faPlus,
  faServer,
  faBars,
  faMagnifyingGlass,
  faPaperPlane,
  faLock,
  faPhone,
  faMicrophone,
  faMicrophoneSlash,
  faCopy,
  faLink,
  faVolumeXmark,
  faHouse,
  faUser,
  faHeadphonesSimple,
  faSlash,
  faVideo,
  faVideoSlash,
  faDisplay,
  faUpRightAndDownLeftFromCenter,
  faDownLeftAndUpRightToCenter,
  faUserPlus,
  faChevronRight,
  faChevronDown,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import { EMOJI_LIST, filterEmojis, CATEGORIES } from "./emojiData";
import { parseCHInline, resolveCH } from "./chTokens";
import UpdateNewsModal from "./UpdateNewsModal";
import {
  APP_VERSION,
  UPDATE_LAST_SEEN_KEY,
  filterHighlightsForAudience,
  getUpdateEntry,
  type UpdateHighlight,
} from "./updateNews";

const ServerSettingsModal = dynamic(() => import("./ServerSettingsModal"));
const UserSettingsModal = dynamic(() => import("./UserSettingsModal"));
const ProfileModal = dynamic(() => import("./ProfileModal"));
import NavController from "./components/NavController";
import HomePanel from "./components/HomePanel";
import ProfilePanel from "./components/ProfilePanel";
import MobileApp from "./components/MobileApp";
import Oneko from "./components/Oneko";
import EmojiPicker from "./components/EmojiPicker";
import InviteCard, { type InvitePreview } from "./components/InviteCard";

// --- UI constants (aka the stuff you tweak at 2am).
const SOUND_DIALING = "/sounds/Dialing.wav";
const SOUND_PING = "/sounds/Ping.wav";
const SOUND_MUTE = "/sounds/UI/droplet/mute.wav";
const SOUND_UNMUTE = "/sounds/UI/droplet/unmute.wav";
const DEFAULT_PIP_WIDTH = 360;
const DEFAULT_PIP_HEIGHT = 220;
const MIN_PIP_WIDTH = 260;
const MIN_PIP_HEIGHT = 170;
const PIP_MARGIN = 12;
const PIP_TOP_MARGIN = 72;
const MAX_GROUP_DM_MEMBERS = 25;
const MAX_GROUP_DM_TARGETS = MAX_GROUP_DM_MEMBERS - 1;
const DEFAULT_CUSTOM_THEME_GRADIENT = "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(30,27,75,0.95))";
const COLOR_PANEL = "var(--ch-panel)";
const COLOR_PANEL_ALT = "var(--ch-panel-alt)";
const COLOR_PANEL_STRONG = "var(--ch-panel-strong)";
const COLOR_CARD = "var(--ch-card)";
const COLOR_CARD_ALT = "var(--ch-card-alt)";
const COLOR_BORDER = "var(--ch-border)";
const COLOR_TEXT = "var(--ch-text)";
const COLOR_TEXT_MUTED = "var(--ch-text-muted)";
const BORDER = `1px solid ${COLOR_BORDER}`;
const BORDER_THICK = `2px solid ${COLOR_BORDER}`;
const INVITE_CODE_RE = /(CHINV-[A-Z0-9]{4,})/i;
const LOCAL_DESKTOP_NOTIF_KEY = "desktop_notifications_enabled";
const CALL_REJOIN_KEY = "ch_last_call";

// --- theme + appearance helpers (boring, but necessary).
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
const DEFAULT_CUSTOM_THEME_STOPS: ThemeStop[] = [
  { color: "#60a5fa", position: 0 },
  { color: "#4338ca", position: 55 },
  { color: "#7c3aed", position: 100 },
];
const DEFAULT_CUSTOM_THEME_ANGLE = 135;
const APPEARANCE_WIDTHS = [720, 840, 960, 1080];
const MAX_STATUS_MESSAGE = 140;
const MAX_RICH_TITLE = 80;
const MAX_RICH_DETAILS = 160;

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const cloneThemeStops = (stops: ThemeStop[]): ThemeStop[] => stops.map((stop) => ({ ...stop }));

const gradientStopRegex = /(rgba?\([^\)]+\)|#[0-9a-f]{3,8})(?:\s+(-?\d+(?:\.\d+)?))?/gi;

const sanitizeThemeStops = (incoming?: ThemeStop[] | null): ThemeStop[] => {
  if (!Array.isArray(incoming)) return cloneThemeStops(DEFAULT_CUSTOM_THEME_STOPS);
  const normalized = incoming
    .filter((stop): stop is ThemeStop => !!stop && typeof stop.color === "string")
    .map((stop) => ({
      color: stop.color.trim() || "#ffffff",
      position: clampNumber(Number.isFinite(Number(stop.position)) ? Number(stop.position) : 0, 0, 100),
    }))
    .filter((stop) => stop.color.length > 0)
    .slice(0, 5);
  if (normalized.length < 2) return cloneThemeStops(DEFAULT_CUSTOM_THEME_STOPS);
  return normalized.sort((a, b) => a.position - b.position);
};

const parseStopsFromGradient = (gradient?: string): ThemeStop[] | null => {
  if (!gradient) return null;
  const matches = Array.from(gradient.matchAll(gradientStopRegex));
  if (!matches.length) return null;
  const stops = matches
    .map((match, idx, list) => {
      const color = match[1]?.trim();
      if (!color) return null;
      const posRaw = match[2];
      if (posRaw !== undefined) {
        return { color, position: clampNumber(Number(posRaw), 0, 100) };
      }
      if (list.length === 1) {
        return { color, position: idx === 0 ? 0 : 100 };
      }
      const inferred = (idx / (list.length - 1)) * 100;
      return { color, position: clampNumber(inferred, 0, 100) };
    })
    .filter((stop): stop is ThemeStop => !!stop);
  if (stops.length < 2) return null;
  return cloneThemeStops(stops.slice(0, 5)).sort((a, b) => a.position - b.position);
};

const normalizeThemeAngle = (value?: number): number => {
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
  return normalizeThemeAngle(Number(angleMatch[1]));
};

const sanitizeStatusMessage = (value?: string) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_STATUS_MESSAGE) : "";
};

const sanitizeRichPresence = (raw?: { type?: string; title?: string; details?: string } | null) => {
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
  const accentIntensity = base.accentIntensity === "subtle" || base.accentIntensity === "bold" ? base.accentIntensity : "normal";
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

const buildGradientFromStops = (stops: ThemeStop[], angle: number): string | null => {
  if (!Array.isArray(stops) || stops.length < 2) return null;
  const sorted = cloneThemeStops(stops).sort((a, b) => a.position - b.position);
  return `linear-gradient(${angle}deg, ${sorted.map((stop) => `${stop.color} ${stop.position}%`).join(", ")})`;
};

const RINGTONES: Record<string, string> = {
  Drive: "/sounds/ringtones/Drive.wav",
  Bandwidth: "/sounds/ringtones/Bandwidth.wav",
  Drift: "/sounds/ringtones/Drift.wav",
  Progress: "/sounds/ringtones/Progress.wav",
  Spooky: "/sounds/ringtones/Spooky.wav",
};
const DEFAULT_RINGTONE_KEY: keyof typeof RINGTONES = "Drive";
const DEFAULT_RINGTONE_SRC = RINGTONES[DEFAULT_RINGTONE_KEY];

const BASE_HAVENS: HavenMap = {
  ChitterHaven: { id: "ChitterHaven", name: "ChitterHaven", channels: ["general", "random"] },
};

const cloneHavens = (source: HavenMap): HavenMap =>
  Object.fromEntries(
    Object.entries(source).map(([id, record]) => [id, { ...record, channels: [...record.channels] }]),
  );

const sanitizeHavens = (raw: any): HavenMap => {
  if (!raw || typeof raw !== "object") {
    return cloneHavens(BASE_HAVENS);
  }
  const cleaned: HavenMap = {};
  Object.entries(raw).forEach(([id, value]) => {
    if (typeof id !== "string") return;
    if (Array.isArray(value)) {
      const normalized = Array.from(
        new Set(
          value
            .filter((ch): ch is string => typeof ch === "string")
            .map((ch) => ch.trim())
            .filter(Boolean),
        ),
      );
      if (normalized.length > 0) cleaned[id] = { id, name: id, channels: normalized };
      return;
    }
    if (value && typeof value === "object") {
      const name = typeof (value as any).name === "string" && (value as any).name.trim().length
        ? String((value as any).name).trim()
        : id;
      const channelsRaw = Array.isArray((value as any).channels) ? (value as any).channels : [];
      const normalized: string[] = Array.from(
        new Set(
          channelsRaw
            .filter((ch: any): ch is string => typeof ch === "string")
            .map((ch: string) => ch.trim())
            .filter(Boolean),
        ),
      );
      if (normalized.length > 0) cleaned[id] = { id, name, channels: normalized };
    }
  });
  return Object.keys(cleaned).length > 0 ? cleaned : cloneHavens(BASE_HAVENS);
};

const hasRingtone = (name: string): name is keyof typeof RINGTONES =>
  Object.prototype.hasOwnProperty.call(RINGTONES, name);

const hexToRgb = (hex?: string): { r: number; g: number; b: number } | null => {
  if (!hex) return null;
  let value = hex.replace("#", "");
  if (value.length === 3) {
    value = value.split("").map((ch) => ch + ch).join("");
  }
  if (value.length !== 6) return null;
  const num = parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const rgbaFromHex = (hex?: string, alpha = 1) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(99,102,241,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
};

const contrastColorFor = (background?: string, light = "#f8fafc", dark = "#020617") => {
  const rgb = hexToRgb(background);
  if (!rgb) return light;
  const { r, g, b } = rgb;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? dark : light;
};

// --- settings cleanup (because user data is messy).
const normalizeUserSettings = (raw: any) => {
  const base = { ...(raw || {}) };
  const hasExistingSettings = !!(raw && Object.keys(raw).length);
  const notif = base.notifications || {};
  base.notifications = {
    mentions: notif.mentions !== false,
    pins: notif.pins !== false,
    soundEnabled: notif.soundEnabled !== false,
    volume: typeof notif.volume === "number" ? notif.volume : 0.6,
  };
  base.callRingSound = base.callRingSound !== false;
  base.blurOnUnfocused = base.blurOnUnfocused !== false;
  base.streamerMode = !!base.streamerMode;
  base.streamerModeStyle = base.streamerModeStyle === 'shorten' ? 'shorten' : 'blur';
  base.streamerModeHoverReveal = base.streamerModeHoverReveal !== false;
  base.sidebarHavenIconOnly = base.sidebarHavenIconOnly === true;
  const columns = Number(base.havenColumns);
  base.havenColumns = Number.isFinite(columns) ? Math.min(5, Math.max(1, Math.round(columns))) : 1;
  const gradientString =
    typeof base.customThemeGradient === 'string' && base.customThemeGradient.trim().length
      ? base.customThemeGradient.trim()
      : DEFAULT_CUSTOM_THEME_GRADIENT;
  const parsedStops = parseStopsFromGradient(gradientString);
  base.customThemeStops = sanitizeThemeStops(base.customThemeStops || parsedStops || null);
  const parsedAngle = parseAngleFromGradient(gradientString);
  base.customThemeAngle = normalizeThemeAngle(base.customThemeAngle ?? parsedAngle ?? DEFAULT_CUSTOM_THEME_ANGLE);
  const normalizedGradient = gradientString || buildGradientFromStops(base.customThemeStops, base.customThemeAngle) || DEFAULT_CUSTOM_THEME_GRADIENT;
  base.customThemeGradient = normalizedGradient;
  base.customThemeImage = typeof base.customThemeImage === 'string' ? base.customThemeImage : '';
  if (base.chatStyle === 'classic' || base.chatStyle === 'bubbles') {
    base.chatStyle = base.chatStyle;
  } else if (base.chatStyle === 'minimal_log' || base.chatStyle === 'focus' || base.chatStyle === 'thread_forward' || base.chatStyle === 'retro') {
    base.chatStyle = base.chatStyle;
  } else {
    base.chatStyle = 'sleek';
  }
  const key = typeof base.callRingtone === "string" && hasRingtone(base.callRingtone)
    ? base.callRingtone
    : DEFAULT_RINGTONE_KEY;
  base.callRingtone = key;
  base.enableOneko = base.enableOneko === true;
  base.callrfMobileSizing = base.callrfMobileSizing === true;
  base.appearance = normalizeAppearanceSettings((base as any).appearance, hasExistingSettings);
  if (!base.appearance?.messageStyle) {
    base.appearance = { ...base.appearance, messageStyle: base.chatStyle };
  }
  base.statusMessage = sanitizeStatusMessage((base as any).statusMessage);
  base.dndIsCosmetic = (base as any).dndIsCosmetic === true;
  base.richPresence = sanitizeRichPresence((base as any).richPresence);
  base.disableMinorUpdatePopups = (base as any).disableMinorUpdatePopups === true;
  base.disableMajorUpdatePopups = (base as any).disableMajorUpdatePopups === true;
  base.showReadingModeButton = (base as any).showReadingModeButton !== false;
  base.showBlockActions = (base as any).showBlockActions !== false;
  base.blockedUsers = Array.isArray((base as any).blockedUsers)
    ? Array.from(new Set((base as any).blockedUsers.filter((u: any) => typeof u === "string").map((u: string) => u.trim()).filter(Boolean)))
    : [];
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
  return base;
};

// Simple attachment renderers
type Attachment = { url: string; name: string; type?: string; size?: number };
const getExt = (name?: string) => (name || "").split(".").pop()?.toLowerCase() || "";
const isImage = (mimeType?: string, filename?: string) =>
  (mimeType || "").startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(getExt(filename));
const isVideo = (mimeType?: string, filename?: string) =>
  (mimeType || "").startsWith("video/") || ["mp4", "mov", "webm", "ogg"].includes(getExt(filename));
const isAudio = (mimeType?: string, filename?: string) =>
  (mimeType || "").startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(getExt(filename));

// Simple, deterministic invite code for a haven (local-only)
const havenCode = (havenId: string) => {
  const base = havenId.trim() || "haven";
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  const code = Math.abs(hash).toString(36).toUpperCase();
  return `CH-${code.slice(0, 6)}`;
};

const extractInviteCode = (text?: string) => {
  if (!text || typeof text !== "string") return null;
  const match = text.match(INVITE_CODE_RE);
  if (!match || !match[1]) return null;
  return match[1].toUpperCase();
};

function AttachmentViewer({ attachment }: { attachment: Attachment }) {
  if (isImage(attachment.type, attachment.name)) return (
    <div style={{ border: BORDER, borderRadius: 8, padding: 6, background: COLOR_PANEL }}>
      <a href={attachment.url} target="_blank" rel="noreferrer">
        <img src={attachment.url} alt={attachment.name} style={{ maxWidth: 360, borderRadius: 6 }} />
      </a>
    </div>
  );
  if (isVideo(attachment.type, attachment.name)) return (
    <div style={{ border: BORDER, borderRadius: 8, padding: 6, background: COLOR_PANEL }}>
      <video src={attachment.url} controls style={{ maxWidth: 420, borderRadius: 6 }} />
    </div>
  );
  if (isAudio(attachment.type, attachment.name)) return (
    <div style={{ border: BORDER, borderRadius: 8, padding: 6, background: COLOR_PANEL }}>
      <audio src={attachment.url} controls />
    </div>
  );
  return (
    <div style={{ border: BORDER, borderRadius: 8, padding: 6, background: COLOR_PANEL }}>
      <a href={attachment.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{attachment.name}</a>
    </div>
  );
}

type ReactionMap = { [emoji: string]: string[] };
type Message = {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  edited?: boolean;
  replyToId?: string | null;
  reactions?: ReactionMap;
  pinned?: boolean;
  attachments?: Attachment[];
  editHistory?: { text: string; timestamp: number }[];
};

type RichPresence = { type: "game" | "music" | "custom"; title: string; details?: string };

type HavenRecord = { id: string; name: string; channels: string[] };
type HavenMap = Record<string, HavenRecord>;

type CallParticipant = {
  user: string;
  status: "ringing" | "connected";
  muted?: boolean;
  deafened?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
};
type DMThread = { id: string; users: string[]; title?: string; group?: boolean; owner?: string; moderators?: string[]; avatarUrl?: string };

const mergeParticipantLists = (base: CallParticipant[], updates: CallParticipant[]) => {
  const map = new Map<string, CallParticipant>();
  const push = (item: CallParticipant) => {
    if (!item || !item.user) return;
    const prev = map.get(item.user);
    const status =
      item.status === "connected" || prev?.status === "connected"
        ? "connected"
        : item.status || "ringing";
    map.set(item.user, {
      user: item.user,
      status,
      muted: typeof item.muted === "boolean" ? item.muted : prev?.muted,
      deafened: typeof item.deafened === "boolean" ? item.deafened : prev?.deafened,
      videoEnabled: typeof item.videoEnabled === "boolean" ? item.videoEnabled : prev?.videoEnabled,
      screenSharing: typeof item.screenSharing === "boolean" ? item.screenSharing : prev?.screenSharing,
    });
  };
  base.forEach(push);
  updates.forEach(push);
  return Array.from(map.values());
};

const normalizeParticipantPayload = (incoming: any): CallParticipant | null => {
  if (!incoming) return null;
  if (typeof incoming === "string") return { user: incoming, status: "ringing" };
  if (typeof incoming.user === "string") {
    return {
      user: incoming.user,
      status: incoming.status === "connected" ? "connected" : "ringing",
      muted: typeof incoming.muted === "boolean" ? incoming.muted : undefined,
      deafened: typeof incoming.deafened === "boolean" ? incoming.deafened : undefined,
      videoEnabled: typeof incoming.videoEnabled === "boolean" ? incoming.videoEnabled : undefined,
      screenSharing: typeof incoming.screenSharing === "boolean" ? incoming.screenSharing : undefined,
    };
  }
  return null;
};

export default function Main({ username }: { username: string }) {
  const [showServerSettings, setShowServerSettings] = useState(false);
  // Havens: { [havenId]: { id, name, channels } }
  const loadLastLocation = () => {
    if (typeof window === "undefined") return { haven: "__dms__", channel: "", dm: null as string | null };
    try {
      const raw = localStorage.getItem("lastLocation");
      if (!raw) return { haven: "__dms__", channel: "", dm: null as string | null };
      const parsed = JSON.parse(raw);
      const haven = typeof parsed?.haven === "string" ? parsed.haven : "__dms__";
      const channel = typeof parsed?.channel === "string" ? parsed.channel : "";
      const dm = typeof parsed?.dm === "string" ? parsed.dm : null;
      return { haven, channel, dm };
    } catch {
      return { haven: "__dms__", channel: "", dm: null as string | null };
    }
  };
  const [havens, setHavens] = useState<HavenMap>(() => cloneHavens(BASE_HAVENS));
  const [havensLoaded, setHavensLoaded] = useState(false);
  const last = loadLastLocation();
  const [selectedHaven, setSelectedHaven] = useState<string>(last.haven || "__dms__");
  const [selectedChannel, setSelectedChannel] = useState<string>(last.channel || "");
  const [dms, setDMs] = useState<DMThread[]>([]);
  const [selectedDM, setSelectedDM] = useState<string | null>(last.dm);
  const lastSelectedDMRef = useRef<string | null>(last.dm);
  const havensSyncInitialized = useRef(false);
  useEffect(() => {
    if (selectedDM) lastSelectedDMRef.current = selectedDM;
  }, [selectedDM]);
  const applyRemoteHavens = (incoming: any) => {
    setHavens(sanitizeHavens(incoming));
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [newChannelType, setNewChannelType] = useState<'text'|'voice'>('text');
  const [newHaven, setNewHaven] = useState("");
  const [newHavenType, setNewHavenType] = useState<'standard'|'community'>('standard');
  const [havenAction, setHavenAction] = useState<'create'|'join'>('join');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadItems, setUploadItems] = useState<{ id: string; name: string; type: string; size: number; progress: number; status: 'uploading'|'done'|'error'; url?: string; localUrl?: string }[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, string>>({});
  const [statusMessageMap, setStatusMessageMap] = useState<Record<string, string>>({});
  const [richPresenceMap, setRichPresenceMap] = useState<Record<string, RichPresence>>({});
  const [profileUser, setProfileUser] = useState<string | null>(null);
  const [profileContext, setProfileContext] = useState<string | undefined>(undefined);
  const [profileLauncherHover, setProfileLauncherHover] = useState(false);
  const statusColor = (s?: string) => (s === "online" ? "#22c55e" : s === "idle" ? "#f59e0b" : s === "dnd" ? "#ef4444" : "#6b7280");
  const formatRichPresence = (presence?: RichPresence) => {
    if (!presence || !presence.title) return null;
    const prefix = presence.type === "music" ? "Listening to" : presence.type === "game" ? "Playing" : "Activity";
    const details = presence.details ? ` - ${presence.details}` : "";
    return `${prefix} ${presence.title}${details}`;
  };
  const applyUserStatusPayload = (payload: any) => {
    if (!payload || typeof payload !== "object") return;
    if (payload.statuses) {
      setPresenceMap((prev) => ({ ...prev, ...payload.statuses }));
    }
    if (payload.statusMessages) {
      setStatusMessageMap((prev) => ({ ...prev, ...payload.statusMessages }));
    }
    if (payload.richPresence) {
      setRichPresenceMap((prev) => ({ ...prev, ...payload.richPresence }));
    }
  };
  const [showPinned, setShowPinned] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Active navigation controller: determines which content is focused.
  const [activeNav, setActiveNav] = useState<string>(() => { try { return localStorage.getItem('activeNav') || 'havens'; } catch { return 'havens'; } });
  useEffect(() => { try { localStorage.setItem('activeNav', activeNav); } catch {} }, [activeNav]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(LOCAL_DESKTOP_NOTIF_KEY);
      setDesktopNotificationsEnabled(stored === "true");
    } catch {}
  }, []);
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ enabled: boolean }>;
      if (custom?.detail && typeof custom.detail.enabled === "boolean") {
        setDesktopNotificationsEnabled(custom.detail.enabled);
      }
    };
    window.addEventListener("ch_desktop_notifications", handler as EventListener);
    return () => window.removeEventListener("ch_desktop_notifications", handler as EventListener);
  }, []);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [quickIndex, setQuickIndex] = useState(0);
  const [showMembers, setShowMembers] = useState(false);
  const [havenMembers, setHavenMembers] = useState<string[]>([]);
  const [membersQuery, setMembersQuery] = useState("");
  const [havenMembersLoading, setHavenMembersLoading] = useState(false);
  const havenMembersCacheRef = useRef<Record<string, string[]>>({});
  const [havenMemberRoles, setHavenMemberRoles] = useState<Record<string, string[]>>({});
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [windowFocused, setWindowFocused] = useState(true);
  const [invitePreviews, setInvitePreviews] = useState<Record<string, InvitePreview>>({});
  const [invitePreviewStatus, setInvitePreviewStatus] = useState<Record<string, "loading" | "error" | "ready">>({});
  const [inviteJoinStatus, setInviteJoinStatus] = useState<Record<string, "idle" | "joining" | "success" | "error">>({});
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(false);
  type Toast = { id: string; title: string; body?: string; type?: 'info'|'success'|'warn'|'error' };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const dialingAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);
  const notify = (t: Omit<Toast,'id'>) => {
    const status = (userSettings.status as string) || 'online';
    if (status === 'dnd' && !userSettings.dndIsCosmetic) return;
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = { id, ...t } as Toast;
    setToasts(prev => [...prev, toast]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
    try {
      if (userSettings?.notifications?.soundEnabled) {
        const audio = new Audio(SOUND_PING);
        audio.volume = Math.max(0, Math.min(1, userSettings?.notifications?.volume ?? 0.6));
        audio.play().catch(()=>{});
      }
    } catch {}
  };

  const resolveRoomLabel = useCallback((room: string) => {
    if (!room) return "ChitterHaven";
    if (room.includes("__")) {
      const parts = room.split("__");
      const haven = parts[0] || "";
      const channel = parts[1] || "";
      const havenLabel = getHavenName(haven);
      return channel ? `${havenLabel} #${channel}` : havenLabel;
    }
    const dm = dms.find((entry) => entry.id === room);
    return dm ? getDMTitle(dm) : "Direct Message";
  }, [dms]);

  const navigateToRoom = useCallback((room: string) => {
    if (!room) return;
    if (room.includes("__")) {
      const parts = room.split("__");
      const haven = parts[0] || "";
      const channel = parts[1] || "";
      if (haven) {
        setSelectedHaven(haven);
        setSelectedChannel(channel || (orderedChannelsFor(haven)[0] || "general"));
        setSelectedDM(null);
      }
      return;
    }
    setSelectedHaven("__dms__");
    setSelectedChannel("");
    setSelectedDM(room);
  }, [havens]);

  const formatElapsedClock = (seconds: number) => {
    const clamped = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(clamped / 3600);
    const mins = Math.floor((clamped % 3600) / 60);
    const secs = clamped % 60;
    const mm = hrs > 0 ? mins.toString().padStart(2, '0') : mins.toString();
    const hh = hrs > 0 ? `${hrs}:` : '';
    return `${hh}${mm}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDurationHuman = (seconds: number) => {
    const clamped = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(clamped / 3600);
    const mins = Math.floor((clamped % 3600) / 60);
    const secs = clamped % 60;
    if (hrs) return `${hrs}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
    if (mins) return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    return `${secs}s`;
  };

  const postCallSystemMessage = useCallback(async (room: string | null | undefined, payload: { text: string; systemType: string; meta?: Record<string, any> }) => {
    if (!room) return;
    try {
      const body = {
        room,
        msg: {
          user: username,
          text: payload.text,
          systemType: payload.systemType,
          systemMeta: payload.meta,
        },
      };
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (data?.message) {
        socketRef.current?.emit("message", { room, msg: data.message });
        if (selectedHaven === "__dms__" && selectedDM === room) {
          setMessages((prev) => [...prev, data.message]);
        }
      }
    } catch {}
  }, [selectedDM, selectedHaven, setMessages, username]);
  const updateSelfParticipantRef = useRef<(patch: Partial<Omit<CallParticipant, 'user'>>) => void>(() => {});
  const updateSelfParticipant = useCallback((patch: Partial<Omit<CallParticipant, 'user'>>) => {
    try {
      updateSelfParticipantRef.current?.(patch);
    } catch {}
  }, []);

  // --- DM voice call helpers ---
  const attachLocalPreview = useCallback(() => {
    const stream = screenShareStreamRef.current || cameraStreamRef.current;
    const targets = [localVideoRef.current, pipLocalVideoRef.current];
    targets.forEach((video) => {
      if (!video) return;
      video.srcObject = stream || null;
      if (stream) video.play?.().catch(() => {});
    });
  }, []);
  const attachRemoteVideo = useCallback((incomingStream?: MediaStream) => {
    const stream = incomingStream || remoteStreamRef.current;
    if (!stream) {
      setRemoteVideoAvailable(false);
      [remoteVideoRef.current, pipRemoteVideoRef.current].forEach((video) => {
        if (video) video.srcObject = null;
      });
      return;
    }
    const hasVideo = stream.getVideoTracks().some((track) => track.readyState !== 'ended');
    setRemoteVideoAvailable(hasVideo);
    [remoteVideoRef.current, pipRemoteVideoRef.current].forEach((video) => {
      if (!video) return;
      if (!hasVideo) {
        video.srcObject = null;
        return;
      }
      video.srcObject = stream;
      video.play?.().catch(() => {});
    });
  }, []);
  const requestRenegotiationRef = useRef<() => void>(() => {});
  const triggerRenegotiation = useCallback(() => {
    try {
      requestRenegotiationRef.current?.();
    } catch (err) {
      console.warn('Renegotiation trigger failed', err);
    }
  }, []);

  const setupPeer = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pc.onicecandidate = (ev) => {
      const room = activeCallDM || selectedDM;
      if (ev.candidate && socketRef.current && room) {
        socketRef.current.emit('ice-candidate', { room, candidate: ev.candidate, from: username });
      }
    };
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      remoteStreamRef.current = stream;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.muted = isDeafened;
        remoteAudioRef.current.volume = isDeafened ? 0 : Math.max(0, Math.min(1, userSettings?.notifications?.volume ?? 0.6));
        remoteAudioRef.current.play?.().catch(() => {});
      }
      if (ev.track.kind === 'video') {
        attachRemoteVideo(stream);
        ev.track.onended = () => {
          setRemoteVideoAvailable(false);
        };
      }
    };
    pc.onnegotiationneeded = () => {
      if (!hasJoinedCallRef.current) return;
      triggerRenegotiation();
    };
    pcRef.current = pc;
    return pc;
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !next;
      });
    }
    try {
      const clip = new Audio(next ? SOUND_MUTE : SOUND_UNMUTE);
      clip.volume = Math.max(0, Math.min(1, userSettings?.notifications?.volume ?? 0.6));
      clip.play().catch(() => {});
    } catch {}
    updateSelfParticipant({ muted: next });
  };

  const toggleDeafen = () => {
    const next = !isDeafened;
    setIsDeafened(next);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = next;
      remoteAudioRef.current.volume = next ? 0 : Math.max(0, Math.min(1, userSettings?.notifications?.volume ?? 0.6));
      if (!next) remoteAudioRef.current.play?.().catch(() => {});
    }
    updateSelfParticipant({ deafened: next });
  };

  const stopCamera = useCallback(() => {
    cameraSendersRef.current.forEach((sender) => {
      try {
        pcRef.current?.removeTrack(sender);
      } catch {}
    });
    cameraSendersRef.current = [];
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOn(false);
    if (!isScreenSharingRef.current) {
      [localVideoRef.current, pipLocalVideoRef.current].forEach((video) => {
        if (video) video.srcObject = null;
      });
    } else {
      attachLocalPreview();
    }
    updateSelfParticipant({ videoEnabled: false });
    if (callStateRef.current === 'in-call') {
      triggerRenegotiation();
    }
  }, [attachLocalPreview, triggerRenegotiation, updateSelfParticipant]);

  const stopScreenShare = useCallback(() => {
    screenShareSendersRef.current.forEach((sender) => {
      try {
        pcRef.current?.removeTrack(sender);
      } catch {}
    });
    screenShareSendersRef.current = [];
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach((track) => track.stop());
      screenShareStreamRef.current = null;
    }
    setIsScreenSharing(false);
    updateSelfParticipant({ screenSharing: false });
    attachLocalPreview();
    if (callStateRef.current === 'in-call') {
      triggerRenegotiation();
    }
  }, [attachLocalPreview, triggerRenegotiation, updateSelfParticipant]);

  const requestCameraStream = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera capture is not supported in this environment.');
    }
    const isRecoverableCameraError = (error: any) => {
      if (!error) return false;
      const name = `${error?.name || ''}`;
      const message = `${error?.message || ''}`.toLowerCase();
      return (
        name === 'NotReadableError' ||
        name === 'TrackStartError' ||
        name === 'OverconstrainedError' ||
        name === 'NotFoundError' ||
        message.includes('could not start video source') ||
        message.includes('device in use') ||
        message.includes('hardware access')
      );
    };
    const tryConstraints = async (constraints: MediaStreamConstraints) => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (constraints.audio) {
        const videoTracks = stream.getVideoTracks();
        const videoOnly = new MediaStream(videoTracks);
        stream.getAudioTracks().forEach((track) => track.stop());
        return videoOnly;
      }
      return stream;
    };
    const preferredConstraints: MediaStreamConstraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: false,
    };
    const fallbackConstraints: MediaStreamConstraints = { video: true, audio: true };
    try {
      return await tryConstraints(preferredConstraints);
    } catch (err: any) {
      if (!isRecoverableCameraError(err)) throw err;
      try {
        return await tryConstraints(fallbackConstraints);
      } catch (fallbackError) {
        if (navigator.mediaDevices?.enumerateDevices) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter((d) => d.kind === 'videoinput');
            if (videoInputs.length === 0) {
              throw new Error('No camera detected. Please connect a camera and try again.');
            }
            for (const device of videoInputs) {
              try {
                return await tryConstraints({
                  video: { deviceId: { exact: device.deviceId } },
                  audio: false,
                });
              } catch {}
            }
          } catch (enumError) {
            throw enumError;
          }
        }
        throw fallbackError instanceof Error ? fallbackError : err;
      }
    }
  }, []);

  const toggleCamera = async () => {
    if (isCameraOn) {
      stopCamera();
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      notify({ title: 'Camera unavailable', body: 'Your browser cannot access a camera in this context.', type: 'error' });
      return;
    }
    try {
      const stream = await requestCameraStream();
      cameraStreamRef.current = stream;
      screenShareError && setScreenShareError(null);
      const pc = setupPeer();
      cameraSendersRef.current.forEach((sender) => {
        try {
          pc.removeTrack(sender);
        } catch {}
      });
      cameraSendersRef.current = [];
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        cameraSendersRef.current.push(sender);
        track.onended = () => stopCamera();
      });
      setIsCameraOn(true);
      setShowFullscreenCall(true);
      attachLocalPreview();
      updateSelfParticipant({ videoEnabled: true });
      triggerRenegotiation();
    } catch (err: any) {
      const fallbackMessage =
        err?.message && err.message.length
          ? err.message
          : 'Could not access your camera. Make sure no other application is using it and that you granted permission.';
      notify({ title: 'Camera unavailable', body: fallbackMessage, type: 'error' });
      updateSelfParticipant({ videoEnabled: false });
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      notify({ title: 'Screen share unsupported', body: 'Your browser does not support screen sharing.', type: 'error' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenShareStreamRef.current = stream;
      const pc = setupPeer();
      screenShareSendersRef.current.forEach((sender) => {
        try {
          pc.removeTrack(sender);
        } catch {}
      });
      screenShareSendersRef.current = [];
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        screenShareSendersRef.current.push(sender);
        track.onended = () => stopScreenShare();
      });
      setIsScreenSharing(true);
      setShowFullscreenCall(true);
      setScreenShareError(null);
      attachLocalPreview();
      updateSelfParticipant({ screenSharing: true });
      triggerRenegotiation();
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const msg = err?.message || 'Could not start screen sharing.';
      setScreenShareError(msg);
      notify({ title: 'Screen share failed', body: msg, type: 'error' });
    }
  };

  const ringAgain = () => {
    if (!pcRef.current || !selectedDM) return;
    const desc = pcRef.current.localDescription;
    if (!desc) return;
    const dm = dms.find(d => d.id === selectedDM);
    const targets = dm ? dm.users.filter(u => u !== username) : [];
    socketRef.current?.emit('call-offer', { room: selectedDM, offer: desc, from: username, targets });
  };

  const clearCallRejoin = useCallback(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.removeItem(CALL_REJOIN_KEY); } catch {}
  }, []);

  const declineCall = (room?: string | null) => {
    const target = room || incomingCall?.room || activeCallDM;
    if (!target) return;
    clearCallRejoin();
    try {
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
    } catch {}
    ringAudioRef.current = null;
    pendingOfferRef.current = null;
    socketRef.current?.emit('call-decline', { room: target, from: username });
    if (incomingCall?.room === target) setIncomingCall(null);
    if (!hasJoinedCallRef.current) {
      if (activeCallDM === target) {
        setActiveCallDM(null);
        setCallParticipants([]);
      }
      setCallState('idle');
      setCallError(null);
    }
    markJoined(false);
  };

  const endCall = () => {
    const endedRoom = activeCallDM;
    const startedAt = callStartedAt;
    clearCallRejoin();
    if (endedRoom) {
      socketRef.current?.emit('call-ended', { room: endedRoom, from: username, startedAt, endedAt: Date.now(), participants: callParticipantsRef.current });
      try { fetch('/api/audit-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'call-end', message: `Call ended in ${endedRoom}`, meta: { room: endedRoom } }) }); } catch {}
    }
    setCallState('idle');
    setCallError(null);
    setIncomingCall(null);
    setActiveCallDM(null);
    setCallStartedAt(null);
    setCallInitiator(null);
    setCallSummarySent(false);
    setCallElapsed(0);
    setCallParticipants([]);
    markJoined(false);
    if (dialingAudioRef.current) {
      try {
        dialingAudioRef.current.pause();
        dialingAudioRef.current.currentTime = 0;
      } catch {}
      dialingAudioRef.current = null;
    }
    if (ringAudioRef.current) {
      try {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      } catch {}
      ringAudioRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(t => t.stop());
      remoteStreamRef.current = null;
    }
    // Record call summary in DM history if we have a duration, only once, by the initiator
    if (endedRoom && startedAt && !callSummarySent && callInitiator && callInitiator === username) {
      const durationSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      (async () => {
        try {
          await postCallSystemMessage(endedRoom, {
            text: `Voice call ended  -  Total time ${formatDurationHuman(durationSec)}`,
            systemType: 'call-summary',
            meta: { durationSec, startedAt, endedAt: Date.now(), initiator: callInitiator },
          });
        } catch {}
      })();
      setCallSummarySent(true);
    }
  };

  const startCall = async () => {
    if (!selectedDM || selectedHaven !== '__dms__') return;
    if (callState !== 'idle') return;
    if (!callsEnabled) return;
    try {
      setCallError(null);
      setCallState('calling');
      setActiveCallDM(selectedDM);
      setIncomingCall(null);
      setCallInitiator(username);
      setCallSummarySent(false);
      setCallStartedAt(null);
      setIncomingCall(null);
      const dm = dms.find(d => d.id === selectedDM);
      const initialRoster = Array.from(new Set([username, ...(dm ? dm.users : [])]))
        .filter(Boolean)
        .map(user => ({
          user,
          status: user === username ? 'connected' as const : 'ringing' as const,
          muted: user === username ? isMuted : undefined,
          deafened: user === username ? isDeafened : undefined,
          videoEnabled: user === username ? isCameraOn : undefined,
          screenSharing: user === username ? isScreenSharing : undefined,
        }));
      const syncedRoster = applyParticipantUpdate(initialRoster, { reset: true });
      if (dialingAudioRef.current) {
        try {
          dialingAudioRef.current.pause();
          dialingAudioRef.current.currentTime = 0;
        } catch {}
        dialingAudioRef.current = null;
      }
      try {
        const dial = new Audio(SOUND_DIALING);
        dial.loop = true;
        dial.volume = Math.max(0, Math.min(1, userSettings?.notifications?.volume ?? 0.6));
        dial.play().catch(() => {});
        dialingAudioRef.current = dial;
      } catch {}
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      markJoined(true);
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      const pc = setupPeer();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const targetDm = dm;
      const targets = targetDm ? targetDm.users.filter(u => u !== username) : [];
      pendingOfferRef.current = null;
      socketRef.current?.emit('call-offer', { room: selectedDM, offer, from: username, targets });
      socketRef.current?.emit('call-state', { room: selectedDM, state: 'calling', from: username, participants: syncedRoster });
      await postCallSystemMessage(selectedDM, {
        text: `Voice call started by ${displayNameFor(username)}  -  ${formatElapsedClock(0)} elapsed`,
        systemType: 'call-start',
        meta: { initiator: username, startedAt: Date.now() },
      });
      setIsMuted(false);
      updateSelfParticipant({ muted: false, deafened: false, status: 'connected', videoEnabled: isCameraOn, screenSharing: isScreenSharing });
    } catch (e: any) {
      setCallState('idle');
      markJoined(false);
      if (dialingAudioRef.current) {
        try {
          dialingAudioRef.current.pause();
          dialingAudioRef.current.currentTime = 0;
        } catch {}
        dialingAudioRef.current = null;
      }
      setCallError(e?.message || 'Could not start call');
    }
  };

  // Friends home state for DMs root
  const [friendsState, setFriendsState] = useState<{ friends: string[]; incoming: string[]; outgoing: string[] }>({ friends: [], incoming: [], outgoing: [] });
  const [friendsTab, setFriendsTab] = useState<'all'|'online'|'pending'>('all');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendName, setAddFriendName] = useState("");
  const [showGroupDM, setShowGroupDM] = useState(false);
  const [groupDMName, setGroupDMName] = useState("");
  const [groupDMAvatar, setGroupDMAvatar] = useState("");
  const [groupDMSelection, setGroupDMSelection] = useState<string[]>([]);
  const [groupDMSearch, setGroupDMSearch] = useState("");
  const [groupDMError, setGroupDMError] = useState<string | null>(null);
  const [groupDMLoading, setGroupDMLoading] = useState(false);
  const [groupAddSelection, setGroupAddSelection] = useState<string[]>([]);
  const [groupAddQuery, setGroupAddQuery] = useState("");
  const [groupAddError, setGroupAddError] = useState<string | null>(null);
  const [groupAddSaving, setGroupAddSaving] = useState(false);
  const [groupSettingsTarget, setGroupSettingsTarget] = useState<string | null>(null);
  const [groupSettingsDraft, setGroupSettingsDraft] = useState<{ name: string; avatarUrl: string; moderators: string[] }>({
    name: "",
    avatarUrl: "",
    moderators: [],
  });
  const [groupSettingsSaving, setGroupSettingsSaving] = useState(false);
  const [groupSettingsError, setGroupSettingsError] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<any>(() => normalizeUserSettings({}));
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [localUpdateSeenVersion, setLocalUpdateSeenVersion] = useState<string | null>(null);
  const [showUpdateNews, setShowUpdateNews] = useState(false);
  const [updateNewsHighlights, setUpdateNewsHighlights] = useState<UpdateHighlight[]>([]);
  const [pendingUpdateCheck, setPendingUpdateCheck] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [dmsLoaded, setDmsLoaded] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const updateEntry = useMemo(() => getUpdateEntry(APP_VERSION), []);
  const accent = userSettings.accentHex || '#60a5fa';
  const boldColor = userSettings.boldColorHex || '#ffffff';
  const italicColor = userSettings.italicColorHex || '#ffffff';
  const pinColor = userSettings.pinColorHex || '#facc15';
  const mentionColor = userSettings.mentionColorHex || '#f97316';
  const appearance: AppearanceSettings = userSettings.appearance || normalizeAppearanceSettings(undefined, true);
  const messageGrouping = appearance.messageGrouping || 'compact';
  const timeFormat = appearance.timeFormat || resolveDefaultTimeFormat();
  const timeDisplay = appearance.timeDisplay || 'absolute';
  const timestampGranularity = appearance.timestampGranularity || 'perMessage';
  const systemMessageEmphasis = appearance.systemMessageEmphasis || 'prominent';
  const maxContentWidth = typeof appearance.maxContentWidth === 'number' ? appearance.maxContentWidth : null;
  const accentIntensity = appearance.accentIntensity || 'normal';
  const readingMode = appearance.readingMode === true;
  const fillScreen = appearance.fillScreen === true;
  const overflowDefaultsRef = useRef<{ html: string; body: string; height: string } | null>(null);
  const currentStatus: string = (userSettings.status as string) || 'online';
  const autoIdleEnabled = (userSettings as any).autoIdleEnabled !== false; // default on
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    if (!overflowDefaultsRef.current) {
      overflowDefaultsRef.current = {
        html: html.style.overflow,
        body: body.style.overflow,
        height: body.style.height,
      };
    }
    const defaults = overflowDefaultsRef.current;
    if (fillScreen) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.height = "100%";
      body.dataset.chFillScreen = "true";
    } else {
      html.style.overflow = defaults.html;
      body.style.overflow = defaults.body;
      body.style.height = defaults.height;
      delete body.dataset.chFillScreen;
    }
    try {
      window.dispatchEvent(new CustomEvent("ch_fill_screen", { detail: { enabled: fillScreen } }));
    } catch {}
    return () => {
      html.style.overflow = defaults.html;
      body.style.overflow = defaults.body;
      body.style.height = defaults.height;
      delete body.dataset.chFillScreen;
    };
  }, [fillScreen]);
  const [autoIdle, setAutoIdle] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimeoutMs = 5 * 60 * 1000; // 5 minutes
  const labelHavens = userSettings.callHavensServers ? 'Servers' : 'Havens';
  const labelHaven = userSettings.callHavensServers ? 'Server' : 'Haven';
  const getHavenName = useCallback((id: string) => havens[id]?.name || id, [havens]);
  const getHavenChannels = useCallback((id: string) => havens[id]?.channels || [], [havens]);
  const findHavenIdByName = useCallback((name: string) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return null;
    const match = Object.values(havens).find((entry) => entry.name.toLowerCase() === normalized);
    return match ? match.id : null;
  }, [havens]);
  const showTipsBanner = userSettings.showTips !== false;
  const callsEnabled = (userSettings as any).callsEnabled !== false;
  const callRingSound = (userSettings as any).callRingSound !== false;
  const callRingtoneKey = typeof (userSettings as any).callRingtone === 'string' && hasRingtone((userSettings as any).callRingtone)
    ? (userSettings as any).callRingtone
    : DEFAULT_RINGTONE_KEY;
  const callRingtoneSrc = RINGTONES[callRingtoneKey] || DEFAULT_RINGTONE_SRC;
  const compact = !!userSettings.compact;
  const showTimestamps = userSettings.showTimestamps !== false;
  const reduceMotion = !!userSettings.reduceMotion;
  const blurOnUnfocused = !!(userSettings as any).blurOnUnfocused;
  const streamerMode = !!(userSettings as any).streamerMode;
  const streamerModeStyle: 'blur' | 'shorten' = (userSettings as any).streamerModeStyle === 'shorten' ? 'shorten' : 'blur';
  const streamerModeHoverReveal = (userSettings as any).streamerModeHoverReveal !== false;
  const showReadingModeButton = (userSettings as any).showReadingModeButton !== false;
  const showBlockActions = (userSettings as any).showBlockActions !== false;
  const allowMobileSizing = (userSettings as any).callrfMobileSizing === true;
  const blockedUsers = useMemo(() => new Set(Array.isArray((userSettings as any).blockedUsers) ? (userSettings as any).blockedUsers : []), [userSettings]);
  const messageStyle: AppearanceSettings["messageStyle"] =
    appearance.messageStyle ||
    (userSettings.chatStyle === 'classic' || userSettings.chatStyle === 'bubbles' || userSettings.chatStyle === 'minimal_log' || userSettings.chatStyle === 'focus' || userSettings.chatStyle === 'thread_forward' || userSettings.chatStyle === 'retro'
      ? (userSettings.chatStyle as AppearanceSettings["messageStyle"])
      : 'sleek');
  const isBubbles = messageStyle === 'bubbles';
  const isClassic = messageStyle === 'classic';
  const isMinimalLog = messageStyle === 'minimal_log';
  const isFocusStyle = messageStyle === 'focus';
  const isThreadForward = messageStyle === 'thread_forward';
  const isRetro = messageStyle === 'retro';
  const isSleek = messageStyle === 'sleek';
  const maybeNotifyDesktop = useCallback((opts: { room: string; sender: string; text?: string }) => {
    if (!desktopNotificationsEnabled) return;
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (windowFocused && typeof document !== "undefined" && !document.hidden) return;
    const privacyMode = streamerMode || blurOnUnfocused;
    const label = resolveRoomLabel(opts.room);
    const title = privacyMode ? "New message" : `${label} - @${opts.sender}`;
    const body = privacyMode ? "Open ChitterHaven to view messages." : (opts.text || "").slice(0, 140);
    try {
      const notification = new Notification(title, { body });
      notification.onclick = () => {
        try { window.focus(); } catch {}
        navigateToRoom(opts.room);
        try { notification.close(); } catch {}
      };
    } catch {}
  }, [blurOnUnfocused, desktopNotificationsEnabled, navigateToRoom, resolveRoomLabel, streamerMode, windowFocused]);
  const replyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach((m) => {
      if (m.replyToId) {
        counts[m.replyToId] = (counts[m.replyToId] || 0) + 1;
      }
    });
    return counts;
  }, [messages]);
  const groupIds = useMemo(() => {
    const isSameDayLocal = (a?: number, b?: number) => {
      if (!a || !b) return false;
      const da = new Date(a);
      const db = new Date(b);
      return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
    };
    const ids: string[] = [];
    let lastGroupId = "";
    messages.forEach((msg, idx) => {
      const prevMessage = messages[idx - 1];
      const showDateDivider = idx === 0 || !isSameDayLocal(prevMessage?.timestamp, msg.timestamp);
      const isSystemMessage = !!(msg as any).systemType;
      const prevIsSystem = !!(prevMessage as any)?.systemType;
      const groupingWindowMs = messageGrouping === 'aggressive' ? 30 * 60 * 1000 : messageGrouping === 'compact' ? 5 * 60 * 1000 : 0;
      const isGrouped =
        messageGrouping !== 'none' &&
        !showDateDivider &&
        !!prevMessage &&
        !isSystemMessage &&
        !prevIsSystem &&
        prevMessage.user === msg.user &&
        (msg.timestamp - prevMessage.timestamp) <= groupingWindowMs;
      const messageKey = msg.id ? `${msg.id}-${idx}` : `${msg.user}-${msg.timestamp}-${idx}`;
      const groupId = isGrouped && lastGroupId ? lastGroupId : messageKey;
      ids.push(groupId);
      lastGroupId = groupId;
    });
    return ids;
  }, [messages, messageGrouping]);
  const showHavenIconsOnly = !!(userSettings as any).sidebarHavenIconOnly;
  const havenColumns = Math.max(1, Math.min(5, Number((userSettings as any).havenColumns) || 1));
  const privacyBlurActive = blurOnUnfocused && !windowFocused;
  const fontMap: Record<string, number> = { small: 13, medium: 15, large: 17 };
  const msgFontSize = fontMap[userSettings.messageFontSize || 'medium'] || 14;
  const codeColor = (userSettings as any).codeColorHex || '#a5b4fc';
  // default to compact sidebar unless explicitly disabled
  const compactSidebar = (userSettings as any).compactSidebar !== false;
  const navSidebarWidth = compactSidebar ? "var(--ch-sidebar-width-compact)" : "var(--ch-sidebar-width)";
  const channelSidebarWidth = compactSidebar ? "var(--ch-channel-width-compact)" : "var(--ch-channel-width)";
  const monospaceMessages = !!(userSettings as any).monospaceMessages;
  const quickButtonsOwn: string[] = Array.isArray((userSettings as any).quickButtonsOwn) ? (userSettings as any).quickButtonsOwn : ['reply','react','copy','more'];
  const quickButtonsOthers: string[] = Array.isArray((userSettings as any).quickButtonsOthers) ? (userSettings as any).quickButtonsOthers : ['reply','react','copy','more'];
  const effectiveStatus = autoIdle && currentStatus === 'online' ? 'idle' : currentStatus;
  const statusForUser = (user: string) => {
    if (!user) return 'offline';
    if (user === username) return effectiveStatus;
    return presenceMap[user] || 'offline';
  };
  const isUserOnline = (user: string) => statusForUser(user) !== 'offline';
  const ROLE_PRIORITY: Record<string, number> = { Owner: 0, Admin: 1, Moderator: 2, Member: 3, Guest: 4 };
  const rolePriorityFor = (user: string) => {
    const roles = havenMemberRoles[user] || [];
    let rank = 99;
    roles.forEach((role) => {
      const score = ROLE_PRIORITY[role] ?? 50;
      if (score < rank) rank = score;
    });
    return rank;
  };
  const sortChannels = useCallback((channels: string[]) => {
    return channels.slice().sort((a, b) => a.localeCompare(b));
  }, []);
  const orderedChannelsFor = useCallback((havenId: string) => {
    return sortChannels(getHavenChannels(havenId));
  }, [getHavenChannels, sortChannels]);
  const isBooting = !(settingsLoaded && dmsLoaded && friendsLoaded);
  const [havenFilter, setHavenFilter] = useState("");
  const [havenSearchOpen, setHavenSearchOpen] = useState(false);
  const [dmFilter, setDmFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteDays, setInviteDays] = useState<number>(1);
  const [inviteMaxUses, setInviteMaxUses] = useState<number>(1);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [activeCallDM, setActiveCallDM] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ room: string; from: string } | null>(null);
  const [callInitiator, setCallInitiator] = useState<string | null>(null);
  const [callSummarySent, setCallSummarySent] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callElapsed, setCallElapsed] = useState<number>(0);
  const [callParticipants, setCallParticipants] = useState<CallParticipant[]>([]);
  const callParticipantsRef = useRef<CallParticipant[]>([]);
  const callRosterDirtyRef = useRef(false);
  const [hasJoinedCall, setHasJoinedCall] = useState(false);
  const hasJoinedCallRef = useRef(false);
  const markJoined = (joined: boolean) => {
    hasJoinedCallRef.current = joined;
    setHasJoinedCall(joined);
  };
  const [callState, setCallState] = useState<'idle' | 'calling' | 'in-call'>('idle');
  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  const callEndTimerRef = useRef<number | null>(null);
  const ringFallbackTimerRef = useRef<number | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipLocalVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipRemoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  const cameraSendersRef = useRef<RTCRtpSender[]>([]);
  const screenShareSendersRef = useRef<RTCRtpSender[]>([]);
  const [pipSize, setPipSize] = useState<{ width: number; height: number }>({
    width: DEFAULT_PIP_WIDTH,
    height: DEFAULT_PIP_HEIGHT,
  });
  const [pipPosition, setPipPosition] = useState<{ x: number; y: number }>({
    x: PIP_MARGIN,
    y: PIP_TOP_MARGIN,
  });
  const pipInteractionRef = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const isScreenSharingRef = useRef(isScreenSharing);
  const [showFullscreenCall, setShowFullscreenCall] = useState(false);
  const [remoteVideoAvailable, setRemoteVideoAvailable] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const renegotiationLockRef = useRef(false);
  const [userProfileCache, setUserProfileCache] = useState<Record<string, { displayName: string; avatarUrl: string }>>({});
  const [streamerRevealKey, setStreamerRevealKey] = useState<string | null>(null);
  const beginStreamerReveal = useCallback((key: string) => {
    setStreamerRevealKey((prev) => (prev === key ? prev : key));
  }, []);
  const endStreamerReveal = useCallback((key: string) => {
    setStreamerRevealKey((prev) => (prev === key ? null : prev));
  }, []);
  const markAvatarLoaded = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.dataset.loaded = "true";
  }, []);
  const avatarLoadProps = {
    "data-avatar": "true",
    "data-loaded": "false",
    onLoad: markAvatarLoaded,
    onError: markAvatarLoaded,
  } as const;
  type DisplayNameOptions = { haven?: string | null; allowFriend?: boolean; fallback?: string };
  const displayNameFor = (user: string, opts?: DisplayNameOptions) => {
    const havenKey =
      typeof opts?.haven !== 'undefined'
        ? opts?.haven
        : selectedHaven && selectedHaven !== '__dms__'
          ? selectedHaven
          : null;
    const allowFriend = opts?.allowFriend !== false;
    const havenNick = havenKey
      ? userSettings?.havenNicknames?.[havenKey]?.[user]
      : undefined;
    if (havenNick && havenNick.trim()) return havenNick.trim();
    if (allowFriend) {
      const friendNick = userSettings?.friendNicknames?.[user];
      if (friendNick && friendNick.trim()) return friendNick.trim();
    }
    const profile = userProfileCache[user];
    const label = profile?.displayName?.trim();
    return label && label.length ? label : opts?.fallback || user;
  };
  const initialsFor = (label: string) => {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return label.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const colorForString = (input: string, offset = 0) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash + offset * 53) % 360;
    const lightness = offset ? 58 : 45;
    return `hsl(${hue}, 70%, ${lightness}%)`;
  };
  const havenBadgeFor = (havenId: string) => {
    const name = getHavenName(havenId);
    return {
      background: `linear-gradient(135deg, ${colorForString(name)}, ${colorForString(name, 1)})`,
      initials: initialsFor(name).slice(0, 2),
    };
  };
  const renderHavenLabel = (havenId: string, revealKey: string) => {
    const name = getHavenName(havenId);
    return renderDisplayName(`haven:${havenId}`, { labelOverride: name, revealKey });
  };
  const renderFriendRow = (
    user: string,
    actions?: React.ReactNode,
    opts?: { key?: string; highlight?: boolean },
  ) => {
    const revealKey = `friend-${user}`;
    const avatar = userProfileCache[user]?.avatarUrl || '/favicon.ico';
    const dot = statusColor(presenceMap[user]);
    const statusMessage = statusMessageMap[user];
    const richPresence = formatRichPresence(richPresenceMap[user]);
    return (
      <div
        key={opts?.key || user}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          border: BORDER,
          background: opts?.highlight ? COLOR_CARD : COLOR_PANEL,
          borderRadius: 10,
          marginBottom: 8,
        }}
      >
        <div
          style={{ position: 'relative', width: 36, height: 36, flex: '0 0 auto' }}
          onMouseEnter={() => beginStreamerReveal(revealKey)}
          onMouseLeave={() => endStreamerReveal(revealKey)}
        >
          <img
            src={avatar}
            alt={user}
            {...avatarLoadProps}
            style={{ width: 36, height: 36, borderRadius: '50%', border: BORDER, objectFit: 'cover' }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: `2px solid ${COLOR_PANEL}`,
              background: dot,
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            onClick={() => { setProfileUser(user); setProfileContext(selectedHaven !== '__dms__' ? 'Viewing Haven Profile' : undefined); }}
            style={{ color: accent, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {renderDisplayName(user, { revealKey })}
          </button>
          {statusMessage && (
            <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, marginTop: 2, whiteSpace: 'pre-wrap' }}>
              {statusMessage}
            </div>
          )}
          {richPresence && (
            <div style={{ fontSize: 11, color: '#93c5fd', marginTop: statusMessage ? 2 : 4 }}>
              {richPresence}
            </div>
          )}
        </div>
        {actions && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {actions}
          </span>
        )}
      </div>
    );
  };
  const isGroupDMThread = (dm?: DMThread | null) => !!dm && (dm.group || (dm.users?.length || 0) > 2);
  const dmMembersWithoutSelf = (dm?: DMThread | null) => (dm ? dm.users.filter((u) => u !== username) : []);
  const dmOwner = (dm?: DMThread | null) => {
    if (!dm) return undefined;
    if (dm.owner && dm.users.includes(dm.owner)) return dm.owner;
    return dm.users[0];
  };
  const dmModerators = (dm?: DMThread | null) => {
    if (!dm || !Array.isArray(dm.moderators)) return [];
    return dm.moderators.filter((user) => dm.users.includes(user));
  };
  const currentIsGroupOwner = (dm?: DMThread | null) => dmOwner(dm) === username;
  const currentIsGroupModerator = (dm?: DMThread | null) => {
    if (!dm || !isGroupDMThread(dm)) return false;
    if (currentIsGroupOwner(dm)) return true;
    const mods = dmModerators(dm);
    return mods.includes(username);
  };
  const canManageGroupDM = (dm?: DMThread | null) => !!dm && isGroupDMThread(dm) && currentIsGroupModerator(dm);
  const getDMAvatar = (dm?: DMThread | null) => (dm && typeof dm.avatarUrl === 'string' ? dm.avatarUrl.trim() : "");
  const getDMTitle = (dm?: DMThread | null) => {
    if (!dm) return "Direct Message";
    const members = dmMembersWithoutSelf(dm);
    if (isGroupDMThread(dm)) {
      if (dm.title && dm.title.trim()) return dm.title.trim();
      const preview = members.slice(0, 3).map((user) => displayNameFor(user)).join(", ");
      if (members.length > 3) return `${preview} +${members.length - 3}`;
      return preview || "Group DM";
    }
    return members.length ? members.map((user) => displayNameFor(user)).join(", ") : "Direct Message";
  };
  const dmSearchHaystack = (dm: DMThread) => {
    const members = dmMembersWithoutSelf(dm);
    const displayNames = members.map((user) => displayNameFor(user));
    return [getDMTitle(dm), ...members, ...displayNames].join(" ").toLowerCase();
  };
  const getUserAvatar = (user: string) => userProfileCache[user]?.avatarUrl || '/favicon.ico';
  const renderDMLabel = (dm?: DMThread | null, opts?: { revealKey?: string }) => {
    if (!dm) {
      return renderDisplayName('dm:unknown', { labelOverride: 'Direct Message', revealKey: opts?.revealKey, allowFriend: false });
    }
    const revealKey = opts?.revealKey;
    if (isGroupDMThread(dm)) {
      const label = getDMTitle(dm);
      return renderDisplayName(`group:${dm.id}`, { labelOverride: label, revealKey, allowFriend: false });
    }
    const members = dmMembersWithoutSelf(dm);
    if (!members.length) return renderDisplayName('dm:unknown', { labelOverride: 'Direct Message', revealKey });
    return (
      <Fragment>
        {members.map((user, idx) => (
          <Fragment key={`${dm.id || 'dm'}-${user}`}>
            {idx > 0 && ', '}
            {renderDisplayName(user, { revealKey })}
          </Fragment>
        ))}
      </Fragment>
    );
  };
  const renderDMHandles = (dm?: DMThread | null) => {
    if (!dm) return null;
    const handles = isGroupDMThread(dm) ? dm.users : dmMembersWithoutSelf(dm);
    if (!handles.length) return null;
    return handles.map((user, idx) => (
      <Fragment key={`handle-${dm.id || 'dm'}-${user}`}>
        {idx > 0 && ', '}
        @{user}
      </Fragment>
    ));
  };
  const formatAbsoluteTime = (timestamp?: number) => {
    const date = timestamp ? new Date(timestamp) : new Date();
    const hour12 = timeFormat === '12h' ? true : timeFormat === '24h' ? false : undefined;
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12 });
  };
  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'just now';
    const diffMs = Date.now() - timestamp;
    if (diffMs < 30 * 1000) return 'just now';
    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  };
  const formatTimestampLabel = (timestamp?: number) => {
    const absolute = formatAbsoluteTime(timestamp);
    const relative = formatRelativeTime(timestamp);
    if (timeDisplay === 'relative') {
      return { label: relative, title: absolute };
    }
    if (timeDisplay === 'hybrid') {
      return { label: absolute, title: relative };
    }
    return { label: absolute, title: undefined };
  };
  const formatDateLine = (timestamp?: number) => {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };
  const isSameDay = (a?: number, b?: number) => {
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  };
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSettingsUpdate = (event: Event) => {
      const custom = event as CustomEvent<any>;
      if (custom?.detail) {
        setUserSettings(normalizeUserSettings(custom.detail));
      }
    };
    window.addEventListener('ch_settings_updated', handleSettingsUpdate as EventListener);
    return () => window.removeEventListener('ch_settings_updated', handleSettingsUpdate as EventListener);
  }, []);
  const shortenName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return "...";
    if (trimmed.length <= 2) return `${trimmed.slice(0, 1)}...`;
    if (trimmed.length <= 4) return `${trimmed.slice(0, 2)}...`;
    return `${trimmed.slice(0, 1)}...${trimmed.slice(-1)}`;
  };
  const renderDisplayName = (
    user: string,
    opts?: { prefix?: string; revealKey?: string; labelOverride?: string; haven?: string | null; allowFriend?: boolean },
  ): React.ReactNode => {
    const raw = opts?.labelOverride ?? displayNameFor(user, { haven: opts?.haven, allowFriend: opts?.allowFriend });
    const prefix = opts?.prefix || '';
    if (!streamerMode) return `${prefix}${raw}`;
    if (streamerModeStyle === 'shorten') {
      return `${prefix}${shortenName(raw)}`;
    }
    const revealKey = opts?.revealKey;
    const canReveal = !!revealKey && streamerModeHoverReveal && streamerRevealKey === revealKey;
    if (canReveal) {
      return `${prefix}${raw}`;
    }
    return (
      <>
        {prefix}
        <span
          className="ch-streamer-mask"
          data-hoverable={streamerModeHoverReveal ? 'true' : 'false'}
          onMouseEnter={() => revealKey && streamerModeHoverReveal && beginStreamerReveal(revealKey)}
          onMouseLeave={() => revealKey && streamerModeHoverReveal && endStreamerReveal(revealKey)}
        >
          <span className="ch-streamer-mask-text">{raw}</span>
        </span>
      </>
    );
  };
  const isCallSystemMessage = (msg: Message | Partial<Message>) => {
    const type = (msg as any)?.systemType;
    return type === 'call-summary' || type === 'call-start';
  };
  const profileFetchesRef = useRef<Set<string>>(new Set());

  const applyParticipantUpdate = (updates: CallParticipant[], opts?: { reset?: boolean }) => {
    let merged: CallParticipant[] = [];
    setCallParticipants((prev) => {
      merged = mergeParticipantLists(opts?.reset ? [] : prev, updates);
      return merged;
    });
    callParticipantsRef.current = merged;
    return merged;
  };
  const emitCallStateUpdate = useCallback((opts?: { participants?: CallParticipant[]; state?: 'idle' | 'calling' | 'in-call'; room?: string | null; useBeacon?: boolean }) => {
    const targetRoom = opts?.room || activeCallDM || selectedDM;
    if (!targetRoom) {
      callRosterDirtyRef.current = false;
      return;
    }
    const state = opts?.state || callStateRef.current;
    const payloadParticipants = opts?.participants ?? callParticipantsRef.current;
    if (state !== 'idle' && (!payloadParticipants || payloadParticipants.length === 0)) {
      callRosterDirtyRef.current = false;
      return;
    }
    const payload = {
      room: targetRoom,
      state,
      from: username,
      startedAt: callStartedAt || undefined,
      participants: payloadParticipants,
    };
    try {
      const shouldBeacon = opts?.useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
      if (shouldBeacon) {
        try {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon('/api/call-sync', blob);
        } catch {
          socketRef.current?.emit('call-state', payload);
        }
      } else {
        socketRef.current?.emit('call-state', payload);
      }
    } catch {}
    callRosterDirtyRef.current = false;
  }, [activeCallDM, selectedDM, username, callStartedAt]);
  const realUpdateSelfParticipant = useCallback((patch: Partial<Omit<CallParticipant, 'user'>>) => {
    const existing = callParticipantsRef.current.find((p) => p.user === username);
    if (!existing) return;
    const next: CallParticipant = {
      user: username,
      status: patch.status || existing.status || (callStateRef.current === 'in-call' ? 'connected' : 'ringing'),
      muted: typeof patch.muted === 'boolean' ? patch.muted : existing.muted,
      deafened: typeof patch.deafened === 'boolean' ? patch.deafened : existing.deafened,
      videoEnabled: typeof patch.videoEnabled === 'boolean' ? patch.videoEnabled : existing.videoEnabled,
      screenSharing: typeof patch.screenSharing === 'boolean' ? patch.screenSharing : existing.screenSharing,
    };
    applyParticipantUpdate([next]);
    callRosterDirtyRef.current = true;
  }, [username, applyParticipantUpdate]);
  useEffect(() => {
    updateSelfParticipantRef.current = realUpdateSelfParticipant;
  }, [realUpdateSelfParticipant]);
  useEffect(() => {
    callParticipantsRef.current = callParticipants;
  }, [callParticipants]);
  const rejoinCall = useCallback(async (room: string) => {
    if (!room || callStateRef.current !== 'idle') return;
    if (!callsEnabled) return;
    const dm = dms.find(d => d.id === room);
    if (!dm) {
      clearCallRejoin();
      return;
    }
    try {
      setCallError(null);
      setCallState('calling');
      setActiveCallDM(room);
      setIncomingCall(null);
      setCallInitiator(null);
      setCallSummarySent(false);
      setCallStartedAt(null);
      const initialRoster = Array.from(new Set([username, ...dm.users]))
        .filter(Boolean)
        .map(user => ({
          user,
          status: user === username ? 'connected' as const : 'ringing' as const,
          muted: user === username ? isMuted : undefined,
          deafened: user === username ? isDeafened : undefined,
          videoEnabled: user === username ? isCameraOn : undefined,
          screenSharing: user === username ? isScreenSharing : undefined,
        }));
      const syncedRoster = applyParticipantUpdate(initialRoster, { reset: true });
      if (dialingAudioRef.current) {
        try {
          dialingAudioRef.current.pause();
          dialingAudioRef.current.currentTime = 0;
        } catch {}
        dialingAudioRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      markJoined(true);
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      const pc = setupPeer();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const targets = dm.users.filter(u => u !== username);
      pendingOfferRef.current = null;
      socketRef.current?.emit('call-offer', { room, offer, from: username, targets });
      socketRef.current?.emit('call-state', { room, state: 'calling', from: username, participants: syncedRoster });
      updateSelfParticipant({ muted: isMuted, deafened: isDeafened, status: 'connected', videoEnabled: isCameraOn, screenSharing: isScreenSharing });
    } catch (e: any) {
      setCallState('idle');
      markJoined(false);
      setCallError(e?.message || 'Could not rejoin call');
      clearCallRejoin();
    }
  }, [applyParticipantUpdate, callsEnabled, clearCallRejoin, dms, isCameraOn, isDeafened, isMuted, isScreenSharing, updateSelfParticipant, username]);
  useEffect(() => {
    if (!callRosterDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      emitCallStateUpdate();
    }, 75);
    return () => window.clearTimeout(timer);
  }, [callParticipants, emitCallStateUpdate]);
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (callStateRef.current === 'idle') return;
      const room = activeCallDM || selectedDM;
      if (!room) return;
      try { localStorage.setItem(CALL_REJOIN_KEY, JSON.stringify({ room, at: Date.now() })); } catch {}
      const remaining = callParticipantsRef.current.filter((p) => p.user !== username);
      const nextState: 'idle' | 'calling' | 'in-call' = remaining.length ? callStateRef.current : 'idle';
      emitCallStateUpdate({ room, participants: remaining, state: nextState, useBeacon: true });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeCallDM, selectedDM, username, emitCallStateUpdate]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (callState !== 'idle' && activeCallDM) {
      try { localStorage.setItem(CALL_REJOIN_KEY, JSON.stringify({ room: activeCallDM, at: Date.now() })); } catch {}
    } else {
      clearCallRejoin();
    }
  }, [callState, activeCallDM, clearCallRejoin]);
  const [havenIcons, setHavenIcons] = useState<Record<string, string>>({});
  const [havenOrder, setHavenOrder] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("havenOrder");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [draggingHaven, setDraggingHaven] = useState<string | null>(null);
  const [draggingChannel, setDraggingChannel] = useState<string | null>(null);
  // Context menu
  type CtxTarget = { type: 'message'|'channel'|'dm'|'blank'|'attachment'|'call'; id?: string; data?: any; debug?: boolean };
  const [ctxMenu, setCtxMenu] = useState<{ open: boolean; x: number; y: number; target: CtxTarget } | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | { title: string; body: string; confirmLabel: string; onConfirm: () => void }>(null);
  const [collapsedSystemMessages, setCollapsedSystemMessages] = useState<Record<string, boolean>>({});
  const [focusHoverGroupId, setFocusHoverGroupId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newSinceScroll, setNewSinceScroll] = useState(0);
  const roomKey = () => `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [shakeVoice, setShakeVoice] = useState(false);
  const [showNewHavenModal, setShowNewHavenModal] = useState(false);
  const [shakeHavenType, setShakeHavenType] = useState(false);
  const closeNewHavenModal = useCallback(() => {
    setShowNewHavenModal(false);
  }, []);
  const [chResolved, setChResolved] = useState<Record<string, string>>({});
  const [permState, setPermState] = useState<{
    canPin: boolean;
    canManageMessages: boolean;
    canManageServer: boolean;
    canManageChannels: boolean;
    canSend: boolean;
    canReact: boolean;
    canUpload: boolean;
  }>({ canPin: true, canManageMessages: true, canManageServer: true, canManageChannels: true, canSend: true, canReact: true, canUpload: true });
  const [adminQuickButtons, setAdminQuickButtons] = useState<{ own: string[]; others: string[] } | null>(null);

  const requestRenegotiation = useCallback(async () => {
    const pc = pcRef.current;
    const room = activeCallDM || selectedDM;
    if (!pc || !room || callStateRef.current !== 'in-call' || renegotiationLockRef.current) return;
    if ((pc as any).signalingState === 'closed' || (pc as any).connectionState === 'closed') return;
    renegotiationLockRef.current = true;
    try {
      const offer = await pc.createOffer();
      if ((pc as any).signalingState === 'closed' || (pc as any).connectionState === 'closed') return;
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('call-renegotiate', { room, offer, from: username });
    } catch (err) {
      console.warn('Renegotiation failed', err);
    } finally {
      renegotiationLockRef.current = false;
    }
  }, [activeCallDM, selectedDM, username]);
  useEffect(() => {
    requestRenegotiationRef.current = requestRenegotiation;
  }, [requestRenegotiation]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const normalizedCallParticipants = callParticipants.filter((p): p is CallParticipant => !!p && !!p.user);
  const callParticipantUsers = normalizedCallParticipants.map((p) => p.user);
  const isUserInActiveCall = (user?: string | null) => !!user && callState !== 'idle' && callParticipantUsers.includes(user);
  const getCallLocationInfo = () => {
    if (callState === 'idle') return null;
    if (activeCallDM) {
      const dm = dms.find((d) => d.id === activeCallDM);
      const label = isGroupDMThread(dm) ? `Group DM  -  ${getDMTitle(dm)}` : `DM  -  ${getDMTitle(dm)}`;
      return { type: 'dm', label, channel: null as string | null };
    }
    if (selectedHaven !== '__dms__' && selectedChannel) {
      return { type: 'channel', label: `${getHavenName(selectedHaven)}  -  #${selectedChannel}`, channel: selectedChannel };
    }
    return { type: 'unknown', label: 'Active Call', channel: null as string | null };
  };
  type CallStatusMeta = { type: 'talking' | 'mutedSelf' | 'muted' | 'deafened'; color: string; label: string };
  const getCallStatusMeta = (user?: string | null): CallStatusMeta | null => {
    if (!isUserInActiveCall(user)) return null;
    const participant = user ? normalizedCallParticipants.find((p) => p.user === user) : null;
    const participantMuted = typeof participant?.muted === 'boolean' ? participant.muted : undefined;
    const participantDeafened = typeof participant?.deafened === 'boolean' ? participant.deafened : undefined;
    if (user === username) {
      if (isDeafened || participantDeafened) return { type: 'deafened', color: '#f97316', label: 'Deafened' };
      if (isMuted || participantMuted) return { type: 'mutedSelf', color: '#ef4444', label: 'Muted (you)' };
    } else {
      if (participantDeafened) return { type: 'deafened', color: '#f97316', label: 'Deafened' };
      if (participantMuted) return { type: 'muted', color: '#facc15', label: 'Muted' };
    }
    return { type: 'talking', color: '#22c55e', label: 'In Call' };
  };
  const renderCallStatusIconGraphic = (meta: CallStatusMeta, size = 14) => {
    if (meta.type === 'deafened') {
      return (
        <span style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesomeIcon icon={faHeadphonesSimple} style={{ color: meta.color, fontSize: size }} />
          <FontAwesomeIcon icon={faSlash} style={{ color: meta.color, fontSize: size * 0.9, position: 'absolute', transform: 'rotate(-20deg)' }} />
        </span>
      );
    }
    const icon = meta.type === 'talking' ? faPhone : faMicrophoneSlash;
    return <FontAwesomeIcon icon={icon} style={{ color: meta.color, fontSize: size }} />;
  };
  const renderCallStatusBadge = (user?: string, opts?: { showLabel?: boolean }) => {
    const meta = getCallStatusMeta(user);
    if (!meta) return null;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: meta.color, fontSize: 11, fontWeight: 600 }}>
        {renderCallStatusIconGraphic(meta, 13)}
        {opts?.showLabel && <span>{meta.label}</span>}
      </span>
    );
  };
  const getCallPresenceForUser = (user?: string | null) => {
    const meta = getCallStatusMeta(user);
    if (!meta) return null;
    const locationInfo = getCallLocationInfo();
    return {
      color: meta.color,
      label: meta.label,
      icon: renderCallStatusIconGraphic(meta, 13),
      location: locationInfo?.label || null,
      participants: normalizedCallParticipants.map((p) => ({ user: p.user, avatar: userProfileCache[p.user]?.avatarUrl || '/favicon.ico' })),
    };
  };
  const viewingCallDM =
    !!(
      callState !== 'idle' &&
      selectedHaven === '__dms__' &&
      activeCallDM &&
      (
        (selectedDM && selectedDM === activeCallDM) ||
        (!selectedDM && lastSelectedDMRef.current === activeCallDM)
      )
    );
  const defaultCallMeta: CallStatusMeta = { type: 'talking', color: '#22c55e', label: 'In Call' };
  const callLocationInfo = getCallLocationInfo();
  const callParticipantPreview = normalizedCallParticipants.slice(0, 5);
  const extraCallParticipants = Math.max(0, normalizedCallParticipants.length - callParticipantPreview.length);
  const pipParticipantPreview = normalizedCallParticipants.slice(0, 4);
  const pipParticipantOverflow = Math.max(0, normalizedCallParticipants.length - pipParticipantPreview.length);
  const showGlobalCallBar = callState !== 'idle' && !viewingCallDM;
  const showCallPiP = showGlobalCallBar && !showFullscreenCall;
  const viewerCallMeta = getCallStatusMeta(username) || defaultCallMeta;
  const dmFilterNormalized = dmFilter.trim().toLowerCase();
  const filteredDMs = dmFilterNormalized
    ? dms.filter((dm) => dmSearchHaystack(dm).includes(dmFilterNormalized))
    : dms;
  const groupDMSearchValue = groupDMSearch.trim().toLowerCase();
  const sortedFriends = [...friendsState.friends].sort((a, b) => a.localeCompare(b));
  const filteredGroupFriends = groupDMSearchValue
    ? sortedFriends.filter((user) => {
        const display = displayNameFor(user).toLowerCase();
        return user.toLowerCase().includes(groupDMSearchValue) || display.includes(groupDMSearchValue);
      })
    : sortedFriends;
  const ensureProfile = (user?: string | null) => {
    if (!user) return;
    if (userProfileCache[user] || profileFetchesRef.current.has(user)) return;
    profileFetchesRef.current.add(user);
    fetch(`/api/profile?user=${encodeURIComponent(user)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setUserProfileCache((prev) => ({
          ...prev,
          [user]: {
            displayName: data.displayName || user,
            avatarUrl: data.avatarUrl || "",
          },
        }));
      })
      .catch(() => {})
      .finally(() => {
        profileFetchesRef.current.delete(user);
      });
  };

  const beginPipInteraction = useCallback(
    (mode: "move" | "resize") => (event: React.MouseEvent) => {
      if (isMobile) return;
      event.preventDefault();
      pipInteractionRef.current = {
        mode,
        startX: event.clientX,
        startY: event.clientY,
        originX: pipPosition.x,
        originY: pipPosition.y,
        originWidth: pipSize.width,
        originHeight: pipSize.height,
      };
    },
    [isMobile, pipPosition.x, pipPosition.y, pipSize.height, pipSize.width]
  );

  useEffect(() => {
    callParticipants.forEach((p) => ensureProfile(p.user));
  }, [callParticipants, userProfileCache]);

  useEffect(() => {
    messages.forEach((m) => ensureProfile(m.user));
  }, [messages, userProfileCache]);

  useEffect(() => {
    dms.forEach((dm) => dm.users.forEach((user) => ensureProfile(user)));
  }, [dms, userProfileCache]);

  // Keep a simple elapsed timer while a call is active
  useEffect(() => {
    if (!callStartedAt || callState === 'idle') {
      setCallElapsed(0);
      return;
    }
    const update = () => {
      setCallElapsed(Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [callStartedAt, callState]);

  // Persist havens per-account (skip initial hydrate to avoid redundant writes)
  useEffect(() => {
    if (!havensLoaded) return;
    if (!havensSyncInitialized.current) {
      havensSyncInitialized.current = true;
      return;
    }
    (async () => {
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ havens }),
        });
      } catch {
        // Ignore failures; next mutation will retry.
      }
    })();
  }, [havens, havensLoaded]);
  useEffect(() => {
    try {
      const payload = { haven: selectedHaven, channel: selectedChannel, dm: selectedDM };
      localStorage.setItem("lastLocation", JSON.stringify(payload));
    } catch {}
  }, [selectedHaven, selectedChannel, selectedDM, username]);
  useEffect(() => {
    if (typeof window !== "undefined" && havenOrder.length) {
      try {
        localStorage.setItem("havenOrder", JSON.stringify(havenOrder));
      } catch {}
    }
  }, [havenOrder]);
  useEffect(() => {
    const keys = Object.keys(havens);
    setHavenOrder(prev => {
      if (!prev || prev.length === 0) return keys;
      const existing = prev.filter(h => keys.includes(h));
      const extras = keys.filter(h => !existing.includes(h));
      return [...existing, ...extras];
    });
  }, [havens]);

  // Ensure channel/DM selection is valid; if not, fall back to defaults
  useEffect(() => {
    if (selectedHaven === '__dms__') {
      if (selectedDM && !dms.find(dm => dm.id === selectedDM)) {
        setSelectedDM(null);
      }
      // default to friends tab if no DM selected
      if (!selectedDM) {
        setSelectedChannel('');
      }
    } else {
      const channels = orderedChannelsFor(selectedHaven);
      if (!channels.includes(selectedChannel)) {
        setSelectedChannel(channels[0] || '');
      }
      // ensure we exit DM mode
      if (selectedDM) setSelectedDM(null);
    }
  }, [selectedHaven, selectedChannel, havens, dms, selectedDM]);

  // Load DMs from server and persist locally for quick access
  useEffect(() => {
    let ignore = false;
    fetch('/api/dms')
      .then(r => r.json())
      .then(d => {
        if (ignore) return;
        if (Array.isArray(d.dms)) {
          setDMs(d.dms);
          try { localStorage.setItem('dms', JSON.stringify(d.dms)); } catch {}
        }
        setDmsLoaded(true);
      })
      .catch(() => {
        // fallback to localStorage if server unavailable
        try { const s = localStorage.getItem('dms'); if (s) setDMs(JSON.parse(s)); } catch {}
        setDmsLoaded(true);
      });
    return () => { ignore = true; };
  }, []);

  // Lazy-fetch haven icons
  useEffect(() => {
    const keys = Object.keys(havens);
    keys.forEach((h) => {
      if (havenIcons[h]) return;
      fetch(`/api/server-settings?haven=${encodeURIComponent(h)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.icon) setHavenIcons(prev => ({ ...prev, [h]: d.icon }));
        })
        .catch(() => {});
    });
  }, [havens]);

  // Load user settings + haven layout
  const loadUserSettings = async () => {
    try {
      const r = await fetch('/api/settings');
      const d = await r.json();
      const payload = d && typeof d === 'object' && 'settings' in d ? (d.settings as any) : d;
      const isEmpty = !payload || (typeof payload === 'object' && Object.keys(payload).length === 0);
      setIsFirstLogin(isEmpty);
      setUserSettings(normalizeUserSettings(payload));
      applyRemoteHavens(payload?.havens);
    } catch {
      setIsFirstLogin(false);
      setUserSettings(normalizeUserSettings({}));
      applyRemoteHavens(null);
    } finally {
      setSettingsLoaded(true);
      setHavensLoaded(true);
    }
  };
  const updateAppearance = useCallback(async (patch: Partial<AppearanceSettings>) => {
    const nextAppearance = { ...(userSettings.appearance || {}), ...patch };
    const next = normalizeUserSettings({ ...userSettings, appearance: nextAppearance });
    setUserSettings(next);
    try { window.dispatchEvent(new CustomEvent('ch_settings_updated', { detail: next })); } catch {}
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearance: nextAppearance }),
      });
    } catch {}
  }, [userSettings]);
  const updateUserSettings = useCallback(async (patch: Record<string, any>) => {
    const next = normalizeUserSettings({ ...userSettings, ...patch });
    setUserSettings(next);
    try { window.dispatchEvent(new CustomEvent('ch_settings_updated', { detail: next })); } catch {}
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
  }, [userSettings]);
  const toggleBlockUser = useCallback(async (target: string, nextBlocked: boolean) => {
    if (!target) return;
    const current = Array.isArray((userSettings as any).blockedUsers) ? (userSettings as any).blockedUsers : [];
    const updated = nextBlocked
      ? Array.from(new Set([...current, target]))
      : current.filter((u: string) => u !== target);
    await updateUserSettings({ blockedUsers: updated });
  }, [updateUserSettings, userSettings]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(UPDATE_LAST_SEEN_KEY);
      if (saved) setLocalUpdateSeenVersion(saved);
    } catch {}
  }, []);
  useEffect(() => { loadUserSettings(); }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!dmsLoaded || !settingsLoaded) return;
    if (callStateRef.current !== 'idle') return;
    try {
      const raw = window.localStorage.getItem(CALL_REJOIN_KEY);
      if (!raw) return;
      const payload = JSON.parse(raw);
      const room = typeof payload?.room === 'string' ? payload.room : '';
      const age = typeof payload?.at === 'number' ? Date.now() - payload.at : Number.POSITIVE_INFINITY;
      if (!room || age > 5 * 60 * 1000) {
        clearCallRejoin();
        return;
      }
      setSelectedHaven('__dms__');
      setSelectedDM(room);
      rejoinCall(room);
    } catch {
      clearCallRejoin();
    }
  }, [dmsLoaded, settingsLoaded, rejoinCall, clearCallRejoin]);

  const updateAudienceContext = useMemo(
    () => ({
      isMobile,
      isAdmin: permState.canManageServer,
      isMod: permState.canManageMessages || permState.canManageChannels,
    }),
    [isMobile, permState.canManageChannels, permState.canManageMessages, permState.canManageServer],
  );

  const markUpdateNewsSeen = useCallback(async () => {
    setShowUpdateNews(false);
    setPendingUpdateCheck(false);
    setLocalUpdateSeenVersion(APP_VERSION);
    setUserSettings((prev: any) => ({ ...(prev || {}), lastSeenUpdateVersion: APP_VERSION }));
    try { localStorage.setItem(UPDATE_LAST_SEEN_KEY, APP_VERSION); } catch {}
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSeenUpdateVersion: APP_VERSION }),
      });
    } catch {}
  }, []);

  const handleViewReleaseNotes = useCallback(() => {
    void markUpdateNewsSeen();
    if (typeof window !== "undefined") {
      window.location.assign("/release-notes");
    }
  }, [markUpdateNewsSeen]);

  const evaluateUpdateNews = useCallback(() => {
    if (!settingsLoaded || !updateEntry) return;
    if (showUpdateNews) return;
    if (isFirstLogin) return;
    if (localUpdateSeenVersion === APP_VERSION || userSettings?.lastSeenUpdateVersion === APP_VERSION) return;
    if (userSettings?.streamerMode) return;
    if (userSettings?.blurOnUnfocused && typeof document !== "undefined" && !document.hasFocus()) {
      setPendingUpdateCheck(true);
      return;
    }
    const filteredHighlights = filterHighlightsForAudience(updateEntry, updateAudienceContext);
    const allowMajor = userSettings?.disableMajorUpdatePopups !== true;
    const autoHighlights = filteredHighlights.filter(
      (item) => item.severity === "security" || (item.severity === "major" && allowMajor),
    );
    if (autoHighlights.length === 0) return;
    setUpdateNewsHighlights(autoHighlights);
    setShowUpdateNews(true);
    setPendingUpdateCheck(false);
  }, [
    settingsLoaded,
    updateEntry,
    showUpdateNews,
    isFirstLogin,
    localUpdateSeenVersion,
    userSettings?.lastSeenUpdateVersion,
    userSettings?.streamerMode,
    userSettings?.blurOnUnfocused,
    userSettings?.disableMajorUpdatePopups,
    updateAudienceContext,
  ]);

  useEffect(() => {
    evaluateUpdateNews();
  }, [evaluateUpdateNews]);

  useEffect(() => {
    if (!pendingUpdateCheck) return;
    const handleFocus = () => {
      if (typeof document !== "undefined" && document.hasFocus()) {
        evaluateUpdateNews();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [pendingUpdateCheck, evaluateUpdateNews]);

  // Load friends lists for DMs home
  const reloadFriends = async () => {
    try {
      const res = await fetch('/api/friends');
      const data = await res.json();
      const fs = {
        friends: Array.isArray(data.friends) ? data.friends : [],
        incoming: Array.isArray(data.incoming) ? data.incoming : [],
        outgoing: Array.isArray(data.outgoing) ? data.outgoing : [],
      };
      setFriendsState(fs);
      // fetch presence for all listed users (best-effort)
      const all = [...fs.friends, ...fs.incoming, ...fs.outgoing];
      if (all.length > 0) {
        const res2 = await fetch(`/api/user-status?users=${encodeURIComponent(all.join(','))}`);
        const d2 = await res2.json();
        applyUserStatusPayload(d2);
      }
    } catch {} finally {
      setFriendsLoaded(true);
    }
  };
  useEffect(() => { reloadFriends(); }, []);

  const friendAction = async (action: 'request'|'accept'|'decline'|'cancel'|'remove', target: string) => {
    try {
      await fetch('/api/friends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, target }) });
      await reloadFriends();
      if (action === 'accept') {
        // refresh DMs after accept to include ensured DM
        const r = await fetch('/api/dms');
        const d = await r.json();
        if (Array.isArray(d.dms)) setDMs(d.dms);
      }
    } catch {}
  };

  const resetGroupDMModal = useCallback(() => {
    setGroupDMName("");
    setGroupDMAvatar("");
    setGroupDMSelection([]);
    setGroupDMSearch("");
    setGroupDMError(null);
    setGroupDMLoading(false);
  }, []);
  const closeGroupDMModal = useCallback(() => {
    resetGroupDMModal();
    setShowGroupDM(false);
  }, [resetGroupDMModal]);
  const closeGroupSettingsModal = useCallback(() => {
    setGroupSettingsTarget(null);
    setGroupSettingsDraft({ name: "", avatarUrl: "", moderators: [] });
    setGroupSettingsError(null);
    setGroupSettingsSaving(false);
    setGroupAddSelection([]);
    setGroupAddQuery("");
    setGroupAddError(null);
    setGroupAddSaving(false);
  }, []);
  const openGroupSettingsModal = useCallback(
    (dmId: string) => {
      const dm = dms.find((entry) => entry.id === dmId);
      if (!dm) return;
      setGroupSettingsTarget(dmId);
      setGroupSettingsDraft({
        name: dm.title || "",
        avatarUrl: dm.avatarUrl || "",
        moderators: dmModerators(dm),
      });
      setGroupSettingsError(null);
      setGroupSettingsSaving(false);
      setGroupAddSelection([]);
      setGroupAddQuery("");
      setGroupAddError(null);
      setGroupAddSaving(false);
    },
    [dms],
  );
  const saveGroupSettings = useCallback(async () => {
    if (!groupSettingsTarget) return;
    setGroupSettingsSaving(true);
    setGroupSettingsError(null);
    try {
      const res = await fetch('/api/dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'group-meta',
          dmId: groupSettingsTarget,
          title: groupSettingsDraft.name,
          avatarUrl: groupSettingsDraft.avatarUrl,
          moderators: groupSettingsDraft.moderators,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.dm) {
        throw new Error(data?.error || 'Could not update group settings');
      }
      setDMs((prev) => prev.map((dm) => (dm.id === data.dm.id ? data.dm : dm)));
      try {
        socketRef.current?.emit('dm-updated', { dm: data.dm });
      } catch {}
      notify({ title: 'Group updated', type: 'success' });
      closeGroupSettingsModal();
    } catch (err: any) {
      setGroupSettingsError(err?.message || 'Unable to update group settings');
    } finally {
      setGroupSettingsSaving(false);
    }
  }, [groupSettingsDraft.avatarUrl, groupSettingsDraft.moderators, groupSettingsDraft.name, groupSettingsTarget, closeGroupSettingsModal]);
  const removeGroupMember = useCallback(
    async (user: string) => {
      if (!groupSettingsTarget) return;
      setGroupSettingsSaving(true);
      setGroupSettingsError(null);
      try {
        const res = await fetch('/api/dms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'group-remove', dmId: groupSettingsTarget, target: user }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.dm) {
          throw new Error(data?.error || 'Unable to update members');
        }
        setDMs((prev) => prev.map((dm) => (dm.id === data.dm.id ? data.dm : dm)));
        try {
          socketRef.current?.emit('dm-updated', { dm: data.dm });
        } catch {}
        if (data?.removed) {
          setDMs((prev) => prev.filter((dm) => dm.id !== groupSettingsTarget));
          if (selectedDM === groupSettingsTarget) setSelectedDM(null);
          closeGroupSettingsModal();
          notify({ title: 'Left group DM', type: 'info' });
          return;
        }
        setGroupSettingsDraft((prev) => ({
          ...prev,
          moderators: prev.moderators.filter((m) => m !== user),
        }));
      } catch (err: any) {
        setGroupSettingsError(err?.message || 'Unable to update members');
      } finally {
        setGroupSettingsSaving(false);
      }
    },
    [groupSettingsTarget, selectedDM, closeGroupSettingsModal],
  );
  const toggleDraftModerator = useCallback((user: string) => {
    setGroupSettingsDraft((prev) => {
      const exists = prev.moderators.includes(user);
      if (exists) {
        return { ...prev, moderators: prev.moderators.filter((m) => m !== user) };
      }
      return { ...prev, moderators: [...prev.moderators, user] };
    });
  }, []);
  const toggleGroupDMUser = (user: string) => {
    setGroupDMSelection((prev) => {
      if (prev.includes(user)) {
        const next = prev.filter((u) => u !== user);
        if (next.length !== prev.length) setGroupDMError(null);
        return next;
      }
      if (prev.length >= MAX_GROUP_DM_TARGETS) {
        setGroupDMError(`You can add up to ${MAX_GROUP_DM_TARGETS} friends (${MAX_GROUP_DM_MEMBERS} people total including you).`);
        return prev;
      }
      setGroupDMError(null);
      return [...prev, user];
    });
  };
  const handleGroupDMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupDMSelection.length < 2) {
      setGroupDMError("Select at least two friends to start a group DM.");
      return;
    }
    if (groupDMSelection.length > MAX_GROUP_DM_TARGETS) {
      setGroupDMError(`Group DMs support up to ${MAX_GROUP_DM_TARGETS} friends (${MAX_GROUP_DM_MEMBERS} total).`);
      return;
    }
    setGroupDMLoading(true);
    try {
      const payload = {
        action: 'group',
        targets: groupDMSelection,
        title: groupDMName.trim(),
        avatarUrl: groupDMAvatar.trim(),
      };
      const res = await fetch('/api/dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.dm) {
        throw new Error(data?.error || 'Could not create group DM');
      }
      setDMs((prev) => {
        const filtered = prev.filter((dm) => dm.id !== data.dm.id);
        return [...filtered, data.dm];
      });
      try {
        socketRef.current?.emit('dm-added', { dm: data.dm });
      } catch {}
      if (data?.existed) {
        notify({ title: 'Existing group found', body: 'Reopening your previous conversation.', type: 'info' });
      } else {
        notify({ title: 'Group DM created', type: 'success' });
      }
      setSelectedHaven('__dms__');
      setSelectedDM(data.dm.id);
      closeGroupDMModal();
    } catch (err: any) {
      setGroupDMError(err?.message || 'Could not create group DM');
    } finally {
      setGroupDMLoading(false);
    }
  };
  const toggleGroupAddUser = (user: string) => {
    setGroupAddSelection((prev) => {
      if (prev.includes(user)) {
        const next = prev.filter((u) => u !== user);
        if (next.length !== prev.length) setGroupAddError(null);
        return next;
      }
      const dm = groupSettingsTarget ? dms.find((entry) => entry.id === groupSettingsTarget) : null;
      const currentCount = dm?.users?.length || 0;
      if (currentCount + prev.length + 1 > MAX_GROUP_DM_MEMBERS) {
        setGroupAddError(`Group DMs support up to ${MAX_GROUP_DM_MEMBERS} people.`);
        return prev;
      }
      setGroupAddError(null);
      return [...prev, user];
    });
  };
  const addMembersToGroup = useCallback(async () => {
    if (!groupSettingsTarget || groupAddSelection.length === 0) return;
    setGroupAddSaving(true);
    setGroupAddError(null);
    try {
      const res = await fetch('/api/dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'group-add', dmId: groupSettingsTarget, targets: groupAddSelection }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.dm) {
        throw new Error(data?.error || 'Unable to add members');
      }
      setDMs((prev) => prev.map((dm) => (dm.id === data.dm.id ? data.dm : dm)));
      try {
        socketRef.current?.emit('dm-updated', { dm: data.dm });
      } catch {}
      setGroupAddSelection([]);
      setGroupAddQuery("");
      notify({ title: 'Members added', type: 'success' });
    } catch (err: any) {
      setGroupAddError(err?.message || 'Unable to add members');
    } finally {
      setGroupAddSaving(false);
    }
  }, [groupAddSelection, groupSettingsTarget, dms]);

  const ensureDM = async (target: string) => {
    try {
      const r = await fetch('/api/dms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ensure', target }) });
      const d = await r.json();
      if (d && d.dm && d.dm.id) {
        setDMs(prev => (prev.some((x:any) => x.id === d.dm.id) ? prev : [...prev, d.dm]));
        setSelectedHaven('__dms__');
        setSelectedDM(d.dm.id);
      }
    } catch {}
  };

  // Detect mobile viewport
  useEffect(() => {
    const onResize = () => {
      if (typeof window === 'undefined') return;
      if (!allowMobileSizing) {
        setIsMobile(false);
        setShowMobileNav(false);
        return;
      }
      setIsMobile(window.innerWidth < 768);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [allowMobileSizing]);

  // Load messages for selected channel or DM
  useEffect(() => {
    let ignore = false;
    if (!socketRef.current) {
      socketRef.current = io({ path: "/api/socketio" });
    }
    const room = `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
    socketRef.current.emit("join-room", room);
    // Fetch all messages for the room
    fetch(`/api/history?room=${encodeURIComponent(room)}`)
      .then(res => res.json())
      .then(data => {
        if (ignore) return;
        const list: Message[] = Array.isArray(data.messages) ? data.messages : [];
        const seen = new Set<string>();
        const unique = list.filter(m => m && typeof m.id === 'string' && !seen.has(m.id) && seen.add(m.id));
        setMessages(unique);
      });

    // Handler to add new messages only if they are not already present
    const handleSocketMessage = (msg: Message) => {
      setMessages((prev) => {
        // Prevent duplicates (by id)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.user !== username) {
        const isMention = (msg.text || '').includes(`@${username}`);
        notify({ title: isMention ? 'Mention' : 'New message', body: `${msg.user}: ${(msg.text || '').slice(0, 80)}`, type: isMention ? 'success' : 'info' });
        maybeNotifyDesktop({ room, sender: msg.user, text: msg.text || '' });
      }
    };
    const handleReact = (payload: { message: Message }) => setMessages(prev => prev.map(m => m.id === payload.message.id ? payload.message : m));
    const handlePin = (payload: { message: Message }) => {
      setMessages(prev => prev.map(m => m.id === payload.message.id ? payload.message : m));
      try {
        if (payload.message?.pinned && userSettings?.notifications?.pins) {
          const preview = (payload.message.text || '').slice(0, 64);
          notify({ title: 'Message pinned', body: preview, type: 'info' });
        }
      } catch {}
    };
    const handleEditEvent = (payload: { message: Message }) => setMessages(prev => prev.map(m => m.id === payload.message.id ? payload.message : m));
    const handleDeleteEvent = (payload: { messageId: string }) => setMessages(prev => prev.filter(m => m.id !== payload.messageId));
    const dmAddedHandler = (payload: { dm: DMThread }) => {
      const dm = payload?.dm;
      if (!dm || !Array.isArray(dm.users) || !dm.users.includes(username)) return;
      setDMs((prev) => {
        const exists = prev.some((existing) => existing.id === dm.id);
        if (exists) {
          return prev.map((existing) => (existing.id === dm.id ? dm : existing));
        }
        return [...prev, dm];
      });
    };
    const dmUpdatedHandler = (payload: { dm: DMThread }) => {
      const dm = payload?.dm;
      if (!dm || typeof dm.id !== 'string') return;
      setDMs((prev) => {
        const includesSelf = Array.isArray(dm.users) && dm.users.includes(username);
        if (!includesSelf) {
          const filtered = prev.filter((entry) => entry.id !== dm.id);
          if (filtered.length !== prev.length && selectedDM === dm.id) {
            setSelectedDM(null);
          }
          if (groupSettingsTarget === dm.id) {
            closeGroupSettingsModal();
          }
          return filtered;
        }
        const exists = prev.some((entry) => entry.id === dm.id);
        if (exists) {
          return prev.map((entry) => (entry.id === dm.id ? dm : entry));
        }
        return [...prev, dm];
      });
    };
    socketRef.current.on("message", handleSocketMessage);
    socketRef.current.on("dm-added", dmAddedHandler);
    socketRef.current.on("dm-updated", dmUpdatedHandler);
    socketRef.current.on("react", handleReact);
    socketRef.current.on("pin", handlePin);
    socketRef.current.on("edit", handleEditEvent);
    socketRef.current.on("delete", handleDeleteEvent);
    return () => {
      ignore = true;
      socketRef.current?.off("message", handleSocketMessage);
      socketRef.current?.off("dm-added", dmAddedHandler);
      socketRef.current?.off("dm-updated", dmUpdatedHandler);
      socketRef.current?.off("react", handleReact);
      socketRef.current?.off("pin", handlePin);
      socketRef.current?.off("edit", handleEditEvent);
      socketRef.current?.off("delete", handleDeleteEvent);
    };
  }, [selectedHaven, selectedChannel, selectedDM, username, groupSettingsTarget, closeGroupSettingsModal]);

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" as const : "smooth" });
    } else {
      setNewSinceScroll((n) => n + 1);
    }
  }, [messages, reduceMotion, isAtBottom]);

  // Resolve ChitterHaven tokens inside message text
  useEffect(() => {
    messages.forEach((msg) => {
      if (!msg.id || !msg.text || !msg.text.includes("{CH:")) return;
      if (chResolved[msg.id]) return;
      const nodes = parseCHInline(msg.text);
      const parts = nodes.map(async (node) => {
        if ((node as any).type === "text") return (node as any).text as string;
        const token = node as any;
        const res = await resolveCH(token);
        if (res.kind === "text") return res.text;
        if (res.kind === "url") return res.url;
        if (res.kind === "card") return res.title;
        return "[Unknown]";
      });
      Promise.all(parts)
        .then((joined) => {
          setChResolved((prev) =>
            prev[msg.id!] ? prev : { ...prev, [msg.id!]: joined.join("") }
          );
        })
        .catch(() => {});
    });
  }, [messages, chResolved]);

  useEffect(() => {
    const codes = new Set<string>();
    messages.forEach((msg) => {
      const code = extractInviteCode(msg.text);
      if (code) codes.add(code);
    });
    codes.forEach((code) => {
      if (invitePreviews[code] || invitePreviewStatus[code]) return;
      setInvitePreviewStatus((prev) => ({ ...prev, [code]: "loading" }));
      fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", code }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data?.error || "Invite unavailable");
          }
          const preview: InvitePreview = {
            code: data?.invite?.code || code,
            haven: data?.invite?.haven || data?.haven?.name || code,
            name: data?.haven?.name || data?.invite?.haven || code,
            icon: data?.haven?.icon || null,
            memberCount: typeof data?.haven?.memberCount === "number" ? data.haven.memberCount : null,
            maxUses: data?.invite?.maxUses ?? null,
            uses: data?.invite?.uses ?? null,
            expiresAt: data?.invite?.expiresAt ?? null,
          };
          setInvitePreviews((prev) => ({ ...prev, [code]: preview }));
          setInvitePreviewStatus((prev) => ({ ...prev, [code]: "ready" }));
          setInviteErrors((prev) => {
            const next = { ...prev };
            delete next[code];
            return next;
          });
        })
        .catch((err: any) => {
          setInvitePreviewStatus((prev) => ({ ...prev, [code]: "error" }));
          setInviteErrors((prev) => ({ ...prev, [code]: err?.message || "Invite unavailable" }));
        });
    });
  }, [messages, invitePreviews, invitePreviewStatus]);

  const loadHavenMembers = useCallback(
    async (target: string, opts?: { force?: boolean }) => {
      if (!target || target === '__dms__') return;
      if (!opts?.force && havenMembersCacheRef.current[target]) {
        if (target === selectedHaven) {
          setHavenMembers(havenMembersCacheRef.current[target]);
        }
        return;
      }
      setHavenMembersLoading(true);
      try {
        const res = await fetch(`/api/haven-members?haven=${encodeURIComponent(target)}`);
        const data = await res.json().catch(() => null);
        const rawList = Array.isArray(data?.users) ? data.users : [];
        const uniqueList = Array.from(new Set([username, ...rawList])).sort();
        havenMembersCacheRef.current[target] = uniqueList;
        if (target === selectedHaven) {
          setHavenMembers(uniqueList);
        }
        if (uniqueList.length > 0) {
          fetch(`/api/user-status?users=${encodeURIComponent(uniqueList.join(','))}`)
            .then((r) => r.json())
            .then((s) => {
              applyUserStatusPayload(s);
            })
            .catch(() => {});
        }
      } catch {
        if (!havenMembersCacheRef.current[target] && target === selectedHaven) {
          setHavenMembers([]);
        }
      } finally {
        if (target === selectedHaven) {
          setHavenMembersLoading(false);
        }
      }
    },
    [selectedHaven, username],
  );

  useEffect(() => {
    if (!selectedHaven || selectedHaven === '__dms__') {
      setHavenMembers([]);
      return;
    }
    loadHavenMembers(selectedHaven);
  }, [selectedHaven, loadHavenMembers]);

  useEffect(() => {
    if (showMembers && selectedHaven && selectedHaven !== '__dms__') {
      loadHavenMembers(selectedHaven, { force: true });
    }
  }, [showMembers, selectedHaven, loadHavenMembers]);

  // Load permissions for current haven and compute Discord-like abilities
  useEffect(() => {
    const haven = selectedHaven;
    if (!haven || haven === '__dms__') {
      setPermState({ canPin: true, canManageMessages: true, canManageServer: true, canManageChannels: true, canSend: true, canReact: true, canUpload: true });
      setAdminQuickButtons(null);
      return;
    }
    let ignore = false;
    fetch(`/api/permissions?haven=${encodeURIComponent(haven)}`)
      .then(r => r.json())
      .then(data => {
        if (ignore) return;
        const perms = data?.permissions || {};
        setHavenMemberRoles((perms.members || {}) as Record<string, string[]>);
        const rolesMap: Record<string, string[]> = perms.roles || {};
        const memberRoles: string[] = (perms.members?.[username] || []) as string[];
        const everyone: string[] = (perms.defaults?.everyone || []) as string[];
        const set = new Set<string>(everyone);
        memberRoles.forEach(role => {
          (rolesMap[role] || []).forEach((p: string) => set.add(p));
        });
        const all = set.has('*');
        const has = (p: string) => all || set.has(p);
        setPermState({
          canPin: has('pin_messages') || has('manage_messages'),
          canManageMessages: has('manage_messages'),
          canManageServer: has('manage_server'),
          canManageChannels: has('manage_channels'),
          canSend: has('send_messages'),
          canReact: has('add_reactions'),
          canUpload: has('upload_files'),
        });
        if (data?.quickButtonsAdmin && typeof data.quickButtonsAdmin === 'object') {
          const qb = data.quickButtonsAdmin;
          const own = Array.isArray(qb.own) ? qb.own : null;
          const others = Array.isArray(qb.others) ? qb.others : null;
          if (own && others) setAdminQuickButtons({ own, others });
          else setAdminQuickButtons(null);
        } else {
          setAdminQuickButtons(null);
        }
      })
      .catch(() => {
        if (ignore) return;
        setHavenMemberRoles({});
        setPermState({ canPin: true, canManageMessages: true, canManageServer: true, canManageChannels: true, canSend: true, canReact: true, canUpload: true });
        setAdminQuickButtons(null);
      });
    return () => { ignore = true; };
  }, [selectedHaven, username]);

  // Global presence listener
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io({ path: "/api/socketio" });
    }
    const handler = (data: { user: string; status: string }) => setPresenceMap(prev => ({ ...prev, [data.user]: data.status }));
    const countHandler = (data: { count: number }) => { if (typeof data?.count === 'number') setOnlineCount(data.count); };
    socketRef.current.on('presence', handler);
    socketRef.current.on('online-count', countHandler);
  const offerHandler = async (data: { room: string; offer: RTCSessionDescriptionInit; from: string }) => {
    if (!callsEnabled) return;
    pendingOfferRef.current = data.offer;
    setActiveCallDM(data.room);
    setCallInitiator(data.from || null);
      const dm = dms.find(d => d.id === data.room);
      const rosterUsers = Array.from(new Set([data.from, ...(dm ? dm.users : []), username])).filter(Boolean);
      const roster = rosterUsers.map(user => ({ user, status: user === data.from ? 'connected' as const : 'ringing' as const }));
      applyParticipantUpdate(roster, { reset: true });
      setCallSummarySent(false);

      // If we're already in this DM, auto-accept the call
      // Show an incoming call popup and start ringtone if enabled
      setIncomingCall({ room: data.room, from: data.from });
      try {
        if (ringAudioRef.current) {
          ringAudioRef.current.pause();
          ringAudioRef.current.currentTime = 0;
        }
      } catch {}
      ringAudioRef.current = null;
      if (callRingSound) {
        try {
          const ring = new Audio(callRingtoneSrc);
          ring.loop = true;
          ring.volume = Math.max(0, Math.min(1, userSettings?.notifications?.volume ?? 0.6));
          ring.play().catch(() => {});
          ringAudioRef.current = ring;
        } catch {}
      }
    };
    const answerHandler = async (data: { room: string; answer: RTCSessionDescriptionInit; from: string }) => {
      const room = data.room;
      if (!(room === activeCallDM || room === selectedDM || !activeCallDM)) return;
      if (!pcRef.current) return;
      try {
        if (!activeCallDM) setActiveCallDM(room);
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState('in-call');
        const startedAt = Date.now();
        setCallStartedAt(startedAt);
        const dm = dms.find(d => d.id === room);
        const updatedRoster = applyParticipantUpdate([
          { user: data.from, status: 'connected' },
          {
            user: username,
            status: 'connected',
            muted: isMuted,
            deafened: isDeafened,
            videoEnabled: isCameraOn,
            screenSharing: isScreenSharing,
          },
          ...(dm ? dm.users.map(user => ({ user, status: 'ringing' as const })) : []),
        ]);
        if (!callInitiator) setCallInitiator(username);
        socketRef.current?.emit('call-state', { room, state: 'in-call', from: username, startedAt, participants: updatedRoster });
        if (dialingAudioRef.current) {
          try {
            dialingAudioRef.current.pause();
            dialingAudioRef.current.currentTime = 0;
          } catch {}
          dialingAudioRef.current = null;
        }
        if (ringAudioRef.current) {
          try {
            ringAudioRef.current.pause();
            ringAudioRef.current.currentTime = 0;
          } catch {}
          ringAudioRef.current = null;
        }
      } catch (e: any) {
        setCallError(e?.message || 'Could not establish call');
        setCallState('idle');
      }
    };
    const iceHandler = async (data: { room: string; candidate: RTCIceCandidateInit; from: string }) => {
      if (!(data.room === activeCallDM || data.room === selectedDM || (!activeCallDM && !selectedDM))) return;
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {}
    };
    const callStateHandler = (data: any) => {
      const { room, state, startedAt, from, participants } = data || {};
      if (!room) return;
      const isTrackedRoom =
        room === activeCallDM ||
        room === selectedDM ||
        (incomingCall?.room === room && callState === 'idle');
      if (!isTrackedRoom) return;
      const normalizedList = Array.isArray(participants)
        ? (participants
            .map(normalizeParticipantPayload)
            .filter(Boolean) as CallParticipant[])
        : null;
      if (normalizedList && normalizedList.length) {
        applyParticipantUpdate(normalizedList, { reset: true });
        const selfParticipant = normalizedList.find((p) => p.user === username);
        if (selfParticipant) {
          if (typeof selfParticipant.muted === 'boolean') setIsMuted(selfParticipant.muted);
          if (typeof selfParticipant.deafened === 'boolean') setIsDeafened(selfParticipant.deafened);
        }
        // When we see participants supplied, cancel any fallback timers
        if (ringFallbackTimerRef.current) { window.clearTimeout(ringFallbackTimerRef.current); ringFallbackTimerRef.current = null; }
        if (callEndTimerRef.current) { window.clearTimeout(callEndTimerRef.current); callEndTimerRef.current = null; }
        // audit log: record call start
        try { fetch('/api/audit-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'call-start', message: `Call started in ${room}`, meta: { room } }) }); } catch {}
      } else if (callParticipantsRef.current.length === 0) {
        const dmUsers = dms.find((d) => d.id === room)?.users || [];
        const fallback: CallParticipant[] = [];
        if (from) fallback.push({ user: from, status: state === "in-call" ? "connected" : "ringing" });
        fallback.push(
          ...dmUsers.map((user) => ({ user, status: "ringing" as const }))
        );
        if (fallback.length) applyParticipantUpdate(fallback, { reset: true });
      }
        if (state === 'in-call') {
          setActiveCallDM(room);
          setCallState('in-call');
          if (startedAt) setCallStartedAt(startedAt);
        // Cancel any previously scheduled end or ring fallbacks
        if (ringFallbackTimerRef.current) { window.clearTimeout(ringFallbackTimerRef.current); ringFallbackTimerRef.current = null; }
        if (callEndTimerRef.current) { window.clearTimeout(callEndTimerRef.current); callEndTimerRef.current = null; }
        } else if (state === 'calling') {
          setActiveCallDM(room);
          const isInitiator = callInitiator === username;
          if (isInitiator || callState !== 'idle') {
            if (callState === 'idle') setCallState('calling');
            if (ringFallbackTimerRef.current) { window.clearTimeout(ringFallbackTimerRef.current); ringFallbackTimerRef.current = null; }
            ringFallbackTimerRef.current = window.setTimeout(() => {
              try {
                const connected = callParticipantsRef.current.filter(p => p.status === 'connected').length;
                if (callStateRef.current === 'calling' && connected === 0) {
                  setCallState('idle');
                }
              } catch {}
            }, 60 * 1000);
          }
      } else if (state === 'idle') {
        // allow a tiny grace window for transient transitions before fully ending
        if (callEndTimerRef.current) window.clearTimeout(callEndTimerRef.current);
        callEndTimerRef.current = window.setTimeout(() => {
          // Only end if still idle
          if (callStateRef.current === 'idle') endCall();
        }, 2000);
      }
    };
    const callDeclineHandler = (data: any) => {
      const { room, from } = data || {};
      if (!room || !from) return;
      const relevant =
        room === activeCallDM ||
        room === selectedDM ||
        (incomingCall?.room === room && callState === 'idle');
      if (!relevant) return;
      setCallParticipants((prev) => prev.filter((p) => p.user !== from));
      if (callInitiator === username && room === activeCallDM && callState === 'calling') {
        notify({ title: `${from} declined the call`, type: 'warn' });
      }
    };
    const callEndedHandler = (data: any) => {
      const { room } = data || {};
      if (!room) return;
      if (room === activeCallDM) {
        endCall();
      }
    };
    const renegotiateOfferHandler = async (data: { room: string; offer: RTCSessionDescriptionInit; from: string }) => {
      const { room, offer } = data || {};
      if (!room || !offer) return;
      const relevant =
        room === activeCallDM ||
        room === selectedDM ||
        (!activeCallDM && !selectedDM);
      if (!relevant || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketRef.current?.emit('call-renegotiate-answer', { room, answer, from: username });
      } catch (e) {
        console.warn('Failed to handle renegotiation offer', e);
      }
    };
    const renegotiateAnswerHandler = async (data: { room: string; answer: RTCSessionDescriptionInit }) => {
      const { room, answer } = data || {};
      if (!room || !answer) return;
      const relevant =
        room === activeCallDM ||
        room === selectedDM ||
        (!activeCallDM && !selectedDM);
      if (!relevant || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.warn('Failed to apply renegotiation answer', e);
      }
    };
    socketRef.current.on('call-offer', offerHandler);
    socketRef.current.on('call-answer', answerHandler);
    socketRef.current.on('ice-candidate', iceHandler);
    socketRef.current.on('call-state', callStateHandler);
    socketRef.current.on('call-decline', callDeclineHandler);
    socketRef.current.on('call-ended', callEndedHandler);
    socketRef.current.on('call-renegotiate', renegotiateOfferHandler);
    socketRef.current.on('call-renegotiate-answer', renegotiateAnswerHandler);
    return () => {
      socketRef.current?.off('presence', handler);
      socketRef.current?.off('online-count', countHandler);
      socketRef.current?.off('call-offer', offerHandler);
      socketRef.current?.off('call-answer', answerHandler);
      socketRef.current?.off('ice-candidate', iceHandler);
      socketRef.current?.off('call-state', callStateHandler);
      socketRef.current?.off('call-decline', callDeclineHandler);
      socketRef.current?.off('call-ended', callEndedHandler);
      socketRef.current?.off('call-renegotiate', renegotiateOfferHandler);
      socketRef.current?.off('call-renegotiate-answer', renegotiateAnswerHandler);
    };
  }, [selectedDM, username, activeCallDM, callState, callStartedAt, dms, incomingCall, callInitiator, notify, isMuted, isDeafened, isCameraOn, isScreenSharing]);

  // Broadcast my current status when settings or socket change
  useEffect(() => {
    if (!socketRef.current) return;
    try {
      socketRef.current.emit('presence', { user: username, status: effectiveStatus });
      setPresenceMap(prev => ({ ...prev, [username]: effectiveStatus }));
    } catch {}
  }, [effectiveStatus, username]);

  // Sync remote audio element with deafen/volume changes
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isDeafened;
      remoteAudioRef.current.volume = isDeafened ? 0 : Math.max(0, Math.min(1, userSettings?.notifications?.volume ?? 0.6));
      if (!isDeafened) remoteAudioRef.current.play?.().catch(() => {});
    }
  }, [isDeafened, userSettings?.notifications?.volume]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPipPosition({
      x: Math.max(PIP_MARGIN, window.innerWidth - (DEFAULT_PIP_WIDTH + PIP_MARGIN * 2)),
      y: Math.max(PIP_TOP_MARGIN, window.innerHeight - (DEFAULT_PIP_HEIGHT + PIP_MARGIN * 2)),
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleMove = (event: MouseEvent) => {
      const ctx = pipInteractionRef.current;
      if (!ctx) return;
      event.preventDefault();
      if (ctx.mode === "move") {
        const deltaX = event.clientX - ctx.startX;
        const deltaY = event.clientY - ctx.startY;
        const maxX = Math.max(PIP_MARGIN, window.innerWidth - ctx.originWidth - PIP_MARGIN);
        const maxY = Math.max(PIP_TOP_MARGIN, window.innerHeight - ctx.originHeight - PIP_MARGIN);
        setPipPosition({
          x: Math.min(Math.max(PIP_MARGIN, ctx.originX + deltaX), maxX),
          y: Math.min(Math.max(PIP_TOP_MARGIN, ctx.originY + deltaY), maxY),
        });
      } else if (ctx.mode === "resize") {
        const deltaX = event.clientX - ctx.startX;
        const deltaY = event.clientY - ctx.startY;
        const width = Math.min(Math.max(MIN_PIP_WIDTH, ctx.originWidth + deltaX), window.innerWidth - PIP_MARGIN * 2);
        const height = Math.min(Math.max(MIN_PIP_HEIGHT, ctx.originHeight + deltaY), window.innerHeight - PIP_MARGIN - PIP_TOP_MARGIN);
        setPipSize({ width, height });
        setPipPosition((prev) => ({
          x: Math.min(prev.x, Math.max(PIP_MARGIN, window.innerWidth - width - PIP_MARGIN)),
          y: Math.min(prev.y, Math.max(PIP_TOP_MARGIN, window.innerHeight - height - PIP_MARGIN)),
        }));
      }
    };
    const handleUp = () => {
      pipInteractionRef.current = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setPipPosition((prev) => {
        const maxX = Math.max(PIP_MARGIN, window.innerWidth - pipSize.width - PIP_MARGIN);
        const maxY = Math.max(PIP_TOP_MARGIN, window.innerHeight - pipSize.height - PIP_MARGIN);
        return {
          x: Math.min(Math.max(PIP_MARGIN, prev.x), maxX),
          y: Math.min(Math.max(PIP_TOP_MARGIN, prev.y), maxY),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pipSize.height, pipSize.width]);

  useEffect(() => {
    if (!showFullscreenCall) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFullscreenCall(false);
    };
    window.addEventListener('keydown', handleKey);
    attachLocalPreview();
    attachRemoteVideo();
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [showFullscreenCall, attachLocalPreview, attachRemoteVideo]);

  useEffect(() => {
    if (callState === 'idle') {
      setShowFullscreenCall(false);
      stopCamera();
      stopScreenShare();
      setRemoteVideoAvailable(false);
      setScreenShareError(null);
    }
  }, [callState, stopCamera, stopScreenShare]);

  useEffect(() => {
    if (callState === "idle") {
      pipInteractionRef.current = null;
      if (pipLocalVideoRef.current) pipLocalVideoRef.current.srcObject = null;
      if (pipRemoteVideoRef.current) pipRemoteVideoRef.current.srcObject = null;
      return;
    }
    attachLocalPreview();
    attachRemoteVideo();
  }, [callState, attachLocalPreview, attachRemoteVideo]);

  // Auto-idle: mark activity and toggle idle when inactive
  useEffect(() => {
    if (!autoIdleEnabled) {
      setAutoIdle(false);
      return;
    }
    const mark = () => {
      lastActivityRef.current = Date.now();
      if (autoIdle) setAutoIdle(false);
    };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, mark, { passive: true }));
    const timer = setInterval(() => {
      if (!autoIdleEnabled) return;
      if (currentStatus !== 'online') {
        if (autoIdle) setAutoIdle(false);
        return;
      }
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= idleTimeoutMs && !autoIdle) setAutoIdle(true);
    }, 10000);
    return () => {
      events.forEach(ev => window.removeEventListener(ev, mark));
      clearInterval(timer);
    };
  }, [autoIdleEnabled, currentStatus, autoIdle]);

  useEffect(() => {
    if (!showNewHavenModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNewHavenModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showNewHavenModal, closeNewHavenModal]);

  // Close context menu on click elsewhere / Escape
  useEffect(() => {
    const onClick = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenu(null); };
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('click', onClick); window.removeEventListener('keydown', onKey); };
  }, []);

  const openCtx = (e: React.MouseEvent, target: CtxTarget) => {
    e.preventDefault();
    const debug = !!(e as any).altKey;
    setCtxMenu({ open: true, x: e.clientX, y: e.clientY, target: { ...target, debug } as any });
  };

  const copyText = async (text: string) => { try { await navigator.clipboard.writeText(text); } catch {} };

  const handleCtxAction = async (act: string) => {
    if (!ctxMenu) return;
    const t = ctxMenu.target;
    if (t.type === 'message' && t.id) {
      const msg = messages.find(m => m.id === t.id);
      if (!msg) return setCtxMenu(null);
      if (act === 'reply') handleReply(msg);
      if (act === 'react') { if (permState.canReact) setPickerFor(msg.id); }
      if (act === 'edit') { if (msg.user === username) handleEdit(msg.id, msg.text); }
      if (act === 'delete') { if (msg.user === username || permState.canManageMessages) handleDelete(msg.id); }
      if (act === 'pin') { if (permState.canPin) togglePin(msg.id, !msg.pinned); }
       if (act === 'copy_text') copyText(msg.text || '');
       if (act === 'copy_id') copyText(msg.id);
       if (act === 'copy_user') copyText(msg.user);
       if (act === 'copy_time') copyText(new Date(msg.timestamp).toISOString());
       if (act === 'copy_raw') copyText(JSON.stringify(msg, null, 2));
       if (act === 'copy_room') copyText(roomKey());
      if (act === 'copy_link') {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('room', roomKey());
          url.searchParams.set('mid', msg.id);
          copyText(url.toString());
        } catch {}
      }
    }
    if (t.type === 'attachment' && t.data) {
      const a = t.data as { url: string; name?: string; type?: string };
      if (act === 'set_avatar' || act === 'set_banner') {
        try {
          const body: any = {};
          if (act === 'set_avatar') body.avatarUrl = a.url;
          if (act === 'set_banner') body.bannerUrl = a.url;
          await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
          notify({ title: act === 'set_avatar' ? 'Avatar updated' : 'Banner updated', type: 'success' });
        } catch {
          notify({ title: 'Update failed', body: 'Could not update profile image', type: 'error' });
        }
      }
    }
    if (t.type === 'channel' && t.data) {
      const ch = String(t.data);
      if (act === 'copy') copyText(ch);
      if (act === 'rename' && permState.canManageChannels) {
        const next = prompt('Rename channel', ch);
        if (next && next !== ch) {
          setHavens(prev => {
            const current = prev[selectedHaven];
            if (!current) return prev;
            const arr = current.channels.slice();
            const idx = arr.indexOf(ch);
            if (idx >= 0) arr[idx] = next;
            return { ...prev, [selectedHaven]: { ...current, channels: arr } };
          });
          if (selectedChannel === ch) setSelectedChannel(next);
        }
      }
      if (act === 'delete' && permState.canManageChannels) {
        setHavens(prev => {
          const current = prev[selectedHaven];
          if (!current) return prev;
          const arr = current.channels.filter(c => c !== ch);
          return { ...prev, [selectedHaven]: { ...current, channels: arr } };
        });
        if (selectedChannel === ch) setSelectedChannel(orderedChannelsFor(selectedHaven)[0] || '');
      }
    }
    if (t.type === 'dm' && t.data) {
      const dm = t.data as DMThread;
      if (act === 'copy_users') copyText(dm.users.join(', '));
      if (act === 'close') setDMs(prev => prev.filter(x => x.id !== dm.id));
      if (act === 'group_settings' && dm.id && isGroupDMThread(dm) && canManageGroupDM(dm)) {
        openGroupSettingsModal(dm.id);
      }
    }
    if (t.type === 'call') {
      const room = activeCallDM || selectedDM || (t.data && t.data.room);
      if (!room) return;
      const dmUsers = dms.find(dm => dm.id === room)?.users || [];
      const roster = callParticipants.length ? callParticipants.map(p => p.user) : dmUsers;
      if (act === 'open_dm') {
        setSelectedHaven('__dms__');
        setSelectedDM(room);
        setActiveCallDM(room);
        setTimeout(() => {
          const el = chatScrollRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        }, 50);
      }
      if (act === 'hangup') {
        if (hasJoinedCallRef.current) endCall();
        else declineCall(room);
      }
      if (act === 'ring_again') {
        ringAgain();
      }
      if (act === 'copy_link') {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('room', room);
          copyText(url.toString());
          notify({ title: 'Call link copied', type: 'success' });
        } catch {}
      }
      if (act === 'copy_call_id') {
        copyText(room);
        notify({ title: 'Call ID copied', type: 'success' });
      }
      if (act === 'copy_participants') {
        if (roster && roster.length) {
          copyText(roster.join(', '));
          notify({ title: 'Participants copied', type: 'success' });
        } else {
          notify({ title: 'No participants', type: 'warn' });
        }
      }
    }
    if (t.type === 'blank') {
      if (act === 'copy_debug') {
        const debug = {
          me: username,
          haven: selectedHaven,
          channel: selectedChannel,
          room: roomKey()
        };
        copyText(JSON.stringify(debug, null, 2));
      }
    }
    setCtxMenu(null);
  };

  const dismissTips = async () => {
    setUserSettings((prev: any) => ({ ...prev, showTips: false }));
    try {
      const next = { ...(userSettings || {}), showTips: false };
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch {}
  };

  // Quick Switcher (Ctrl/Cmd + K)
  type QuickItem = { id: string; label: string; type: 'haven'|'channel'|'dm'|'dmhome'; haven?: string; channel?: string; dmId?: string };
  const getQuickItems = (): QuickItem[] => {
    const items: QuickItem[] = [];
    items.push({ id: 'd:home', label: 'Friends  -  Direct Messages', type: 'dmhome' });
    Object.keys(havens).forEach(h => {
      const havenName = getHavenName(h);
      items.push({ id: `h:${h}`, label: `Haven  -  ${havenName}`, type: 'haven', haven: h });
      orderedChannelsFor(h).forEach(ch => items.push({ id: `c:${h}:${ch}`, label: `#${ch}  -  ${havenName}`, type: 'channel', haven: h, channel: ch }));
    });
    dms.forEach(dm => {
      const prefix = isGroupDMThread(dm) ? 'Group DM' : 'DM';
      items.push({ id: `d:${dm.id}`, label: `${prefix}  -  ${getDMTitle(dm)}`, type: 'dm', dmId: dm.id });
    });
    return items;
  };
  const filterQuickItems = (items: QuickItem[], q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return items.slice(0, 40);
    return items.filter(i => i.label.toLowerCase().includes(s)).slice(0, 40);
  };
  const selectQuickItem = (it: QuickItem) => {
    setQuickOpen(false);
    if (it.type === 'dmhome') {
      setSelectedHaven('__dms__');
      setSelectedDM(null);
      setSelectedChannel('');
    } else if (it.type === 'haven' && it.haven) {
      setSelectedHaven(it.haven);
      setSelectedDM(null);
      setSelectedChannel(getHavenChannels(it.haven)[0] || '');
    } else if (it.type === 'channel' && it.haven && it.channel) {
      setSelectedHaven(it.haven);
      setSelectedDM(null);
      setSelectedChannel(it.channel);
    } else if (it.type === 'dm' && it.dmId) {
      setSelectedHaven('__dms__');
      setSelectedChannel('');
      setSelectedDM(it.dmId);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k';
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setQuickOpen(true);
        setQuickQuery('');
        setQuickIndex(0);
      }
      if (!quickOpen) return;
      if (e.key === 'Escape') setQuickOpen(false);
      if (e.key === 'ArrowDown') { e.preventDefault(); setQuickIndex(i => i + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setQuickIndex(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const items = filterQuickItems(getQuickItems(), quickQuery);
        const sel = items[Math.min(quickIndex, Math.max(0, items.length - 1))];
        if (sel) selectQuickItem(sel);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quickOpen, quickQuery, quickIndex, havens, dms, selectedHaven, selectedChannel]);

  // When entering a DM, fetch presence for participants (best-effort)
  useEffect(() => {
    if (!selectedDM) return;
    const dm = dms.find(d => d.id === selectedDM);
    if (!dm) return;
    const others = dm.users.filter(u => u !== username);
    if (others.length === 0) return;
    (async () => {
      try {
        const r = await fetch(`/api/user-status?users=${encodeURIComponent(others.join(','))}`);
        const d = await r.json();
        applyUserStatusPayload(d);
      } catch {}
    })();
  }, [selectedDM, dms, username]);

  useEffect(() => {
    const room = `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
    const handleTyping = (data: { user: string; room: string }) => {
      if (data.room !== room || data.user === username) return;
      setTypingUsers((prev) => {
        if (!prev.includes(data.user)) return [...prev, data.user];
        return prev;
      });
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== data.user));
      }, 2500);
    };
    socketRef.current?.on("typing", handleTyping);
    return () => {
      socketRef.current?.off("typing", handleTyping);
    };
  }, [selectedHaven, selectedChannel, selectedDM, username]);

  const sendMessage = () => {
    if (input.trim()) {
      const room = `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
      const msg: any = { user: username, text: input };
      if (replyTo?.id) msg.replyToId = replyTo.id;
      if (pendingFiles.length > 0) msg.attachments = pendingFiles;
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, msg })
      })
        .then(res => res.json())
        .then(data => {
          if (data.message) {
            socketRef.current?.emit("message", { room, msg: data.message });
            setMessages((prev) => [...prev, data.message]);
          }
        });
      setInput("");
      setReplyTo(null);
      setPendingFiles([]);
    }
  };

  const handleDelete = (id: string) => {
    const room = `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, action: "delete", messageId: id })
    }).then(res => {
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        socketRef.current?.emit("delete", { room, messageId: id });
      }
    });
  };

  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const handleEdit = (id: string, text: string) => {
    setEditId(id);
    setEditText(text);
  };
  const handleEditSubmit = (id: string) => {
    const room = `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, action: "edit", messageId: id, newText: editText })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.message) {
          setMessages((prev) => prev.map((m) => m.id === id ? data.message : m));
          socketRef.current?.emit("edit", { room, message: data.message });
          setEditId(null);
          setEditText("");
        }
      });
  };

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    setInput(`@${msg.user} `);
  };

  // Reactions & Pinning
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const commonEmojis = ["??","??","??","??","??","??"];
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiCategory, setEmojiCategory] = useState<typeof CATEGORIES[number]['key']>('smileys');
  const toggleReaction = (messageId: string, emoji: string) => {
    const room = `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, action: "react", messageId, emoji, user: username })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setMessages(prev => prev.map(m => m.id === messageId ? data.message : m));
          socketRef.current?.emit("react", { room, message: data.message });
        }
      });
  };
  const togglePin = (id: string, pin: boolean) => {
    const room = `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, action: "pin", messageId: id, pin })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setMessages(prev => prev.map(m => m.id === id ? data.message : m));
          socketRef.current?.emit("pin", { room, message: data.message });
        }
      });
  };

  // Edit history viewer
  const [showEditHistory, setShowEditHistory] = useState<{ id: string; items: { text: string; timestamp: number }[] } | null>(null);
  const openEditHistory = async (id: string) => {
    const room = `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
    const r = await fetch("/api/history", { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ room, action: 'history', messageId: id }) });
    const d = await r.json();
    if (d.success) setShowEditHistory({ id, items: d.history || [] });
  };

  const handleHavenChange = (haven: string) => {
    setSelectedHaven(haven);
    // Default to first channel in haven
    const channels = orderedChannelsFor(haven);
    setSelectedChannel(channels[0] || "");
  };

  const navigateToLocation = (loc: { haven?: string; channel?: string; dm?: string | null }) => {
    if (!loc || typeof loc !== 'object') return;
    // If a haven is provided, navigate to that haven and optionally channel/dm
    if (loc.haven) {
      setSelectedHaven(loc.haven);
      setSelectedDM(loc.dm ?? null);
      if (loc.channel) {
        setSelectedChannel(loc.channel);
      } else {
        setSelectedChannel(orderedChannelsFor(loc.haven)[0] || "");
      }
      return;
    }
    // If dm explicitly provided (even null), switch to DMs view
    if (Object.prototype.hasOwnProperty.call(loc, 'dm')) {
      setSelectedHaven('__dms__');
      setSelectedDM(loc.dm ?? null);
      setSelectedChannel('');
    }
  };

  const handleChannelChange = (channel: string) => {
    setSelectedChannel(channel);
  };

  const createInvite = async () => {
    if (!selectedHaven || selectedHaven === '__dms__' || creatingInvite) return;
    setCreatingInvite(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          haven: selectedHaven,
          days: inviteDays,
          maxUses: inviteMaxUses,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) {
        notify({ title: "Invite error", body: data?.error || "Could not create invite", type: "error" });
      } else {
        setInviteCode(data.code);
        try { await navigator.clipboard.writeText(data.code); } catch {}
        notify({ title: "Invite created", body: data.code, type: "success" });
      }
    } catch {
      notify({ title: "Invite error", body: "Could not create invite", type: "error" });
    } finally {
      setCreatingInvite(false);
    }
  };

  const joinInvite = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setInviteJoinStatus((prev) => ({ ...prev, [normalized]: "joining" }));
    try {
      let preview = invitePreviews[normalized];
      if (!preview) {
        try {
          const previewRes = await fetch("/api/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "preview", code: normalized }),
          });
          const previewData = await previewRes.json().catch(() => ({}));
          if (previewRes.ok) {
            preview = {
              code: previewData?.invite?.code || normalized,
              haven: previewData?.invite?.haven || normalized,
              name: previewData?.haven?.name || previewData?.invite?.haven || normalized,
              icon: previewData?.haven?.icon || null,
              memberCount: typeof previewData?.haven?.memberCount === "number" ? previewData.haven.memberCount : null,
              maxUses: previewData?.invite?.maxUses ?? null,
              uses: previewData?.invite?.uses ?? null,
              expiresAt: previewData?.invite?.expiresAt ?? null,
            } as InvitePreview;
            setInvitePreviews((prev) => ({ ...prev, [normalized]: preview! }));
            setInvitePreviewStatus((prev) => ({ ...prev, [normalized]: "ready" }));
            setInviteErrors((prev) => {
              const next = { ...prev };
              delete next[normalized];
              return next;
            });
          }
        } catch {}
      }
      const previewHaven = preview?.haven;
      if (previewHaven && havens[previewHaven]) {
        setSelectedHaven(previewHaven);
        setSelectedChannel(orderedChannelsFor(previewHaven)[0] || "general");
        setSelectedDM(null);
        setInviteJoinStatus((prev) => ({ ...prev, [normalized]: "success" }));
        notify({ title: "Opened server", body: preview?.name || getHavenName(previewHaven), type: "success" });
        return;
      }
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consume", code: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.haven) {
        throw new Error(data?.error || "Invite invalid");
      }
      const havenId = String(data.haven);
      const havenDisplay = data?.info?.name || havenId;
      const alreadyJoined = !!havens[havenId];
      if (!alreadyJoined) {
        setHavens((prev) => ({
          ...prev,
          [havenId]: prev[havenId]?.channels?.length
            ? prev[havenId]
            : { id: havenId, name: havenDisplay, channels: ["general"] },
        }));
      }
      setSelectedHaven(havenId);
      setSelectedChannel(orderedChannelsFor(havenId)[0] || "general");
      setSelectedDM(null);
      notify({
        title: alreadyJoined ? "Opened server" : "Joined server",
        body: havenDisplay,
        type: "success",
      });
      setInviteJoinStatus((prev) => ({ ...prev, [normalized]: "success" }));
    } catch (err: any) {
      notify({ title: "Invite error", body: err?.message || "Invite invalid", type: "error" });
      setInviteJoinStatus((prev) => ({ ...prev, [normalized]: "error" }));
    }
  };

  const handleCreateChannel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newChannel.trim().replace(/\s+/g, "-").toLowerCase();
    if (name && !getHavenChannels(selectedHaven).includes(name)) {
      setHavens(prev => ({
        ...prev,
        [selectedHaven]: {
          ...(prev[selectedHaven] || { id: selectedHaven, name: getHavenName(selectedHaven), channels: [] }),
          channels: [...getHavenChannels(selectedHaven), name],
        },
      }));
      setNewChannel("");
      setSelectedChannel(name);
      setShowNewChannelModal(false);
    }
  };

  const handleCreateHaven = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = newHaven.trim();
    const name = raw.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 24);
    const displayName = raw.replace(/\s+/g, " ").trim().slice(0, 48);
    if (!raw) return;
    if (havenAction === 'join') {
      const upper = raw.toUpperCase();
      // If it looks like a server invite, try consuming it first
      if (upper.startsWith('CHINV-')) {
        try {
          const res = await fetch("/api/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "consume", code: raw }),
          });
          const data = await res.json();
          if (res.ok && data?.haven) {
            const hId = String(data.haven);
            const hDisplay = data?.info?.name || hId;
            if (!havens[hId]) {
              setHavens(prev => ({ ...prev, [hId]: { id: hId, name: hDisplay, channels: ["general"] } }));
            }
            setSelectedHaven(hId);
            setSelectedChannel(orderedChannelsFor(hId)[0] || "general");
            setNewHaven("");
            setShowNewHavenModal(false);
            return;
          }
          notify({ title: 'Invite invalid', body: data?.error || 'Invite expired or exhausted', type: 'error' });
          return;
        } catch {
          notify({ title: 'Invite error', body: 'Could not reach invite server', type: 'error' });
          return;
        }
      }
      // Try direct haven name first
      if (name && havens[name]) {
        setSelectedHaven(name);
        setSelectedChannel(orderedChannelsFor(name)[0] || 'general');
        setNewHaven("");
        setShowNewHavenModal(false);
        return;
      }
      const matchByName = findHavenIdByName(raw);
      if (matchByName) {
        setSelectedHaven(matchByName);
        setSelectedChannel(orderedChannelsFor(matchByName)[0] || 'general');
        setNewHaven("");
        setShowNewHavenModal(false);
        return;
      }
      // Then try treat input as local deterministic invite code
      let found: string | null = null;
      for (const h of Object.keys(havens)) {
        if (havenCode(h) === upper) {
          found = h;
          break;
        }
      }
      if (found) {
        setSelectedHaven(found);
        setSelectedChannel(orderedChannelsFor(found)[0] || 'general');
        setNewHaven("");
        setShowNewHavenModal(false);
        return;
      }
      notify({ title: 'Haven not found', body: `No haven, invite code, or link "${raw}" exists on this client.`, type: 'warn' });
      return;
    }
    const newId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? (crypto as any).randomUUID()
      : `haven-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    if (!havens[newId]) {
      setHavens(prev => ({ ...prev, [newId]: { id: newId, name: displayName || name || newId, channels: ["general"] } }));
      // Set creator as Owner role for this haven
      try {
        const res = await fetch("/api/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ haven: newId, action: "set-owner", user: username })
        });
        if (!res.ok) {
          throw new Error(await res.text().catch(() => 'Failed'));
        }
        try {
          await fetch("/api/server-settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ haven: newId, name: displayName || name || newId, channels: ["general"] })
          });
        } catch {}
      } catch (err: any) {
        notify({
          title: "Owner assignment failed",
          body: typeof err?.message === 'string' ? err.message : 'Please verify permissions inside Haven Settings.',
          type: "error",
        });
      }
    }
    setSelectedHaven(newId);
    setSelectedChannel("general");
    setNewHaven("");
    setShowNewHavenModal(false);
  };

  // Typing + mentions
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionList, setMentionList] = useState<{ username: string; displayName: string; avatarUrl: string }[]>([]);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [mentionAnchor, setMentionAnchor] = useState<{ start: number; end: number } | null>(null);
  const [mentionPopupStyle, setMentionPopupStyle] = useState<React.CSSProperties>({});
  const mentionPopupRef = useRef<HTMLDivElement | null>(null);
  const getMentionContext = (value: string, cursor: number) => {
    const upto = value.slice(0, cursor);
    const atIndex = upto.lastIndexOf("@");
    if (atIndex < 0) return null;
    const prevChar = atIndex > 0 ? upto[atIndex - 1] : " ";
    if (prevChar && !/\s/.test(prevChar)) return null;
    const query = upto.slice(atIndex + 1);
    if (query.includes(" ") || query.includes("\n")) return null;
    return { start: atIndex, end: cursor, query };
  };
  const updateMentionPopupPosition = useCallback(() => {
    if (!mentionOpen || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const spaceAbove = rect.top - 16;
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const maxHeight = Math.min(320, Math.max(spaceAbove, spaceBelow));
    const placeAbove = spaceAbove >= 160 || spaceAbove >= spaceBelow;
    const top = placeAbove ? rect.top - maxHeight - 8 : rect.bottom + 8;
    setMentionPopupStyle({
      position: "fixed",
      left,
      top,
      width,
      maxHeight: Math.max(140, maxHeight),
      overflowY: "auto",
      zIndex: 120,
    });
  }, [mentionOpen]);
  const applyMentionSelection = (username: string) => {
    const el = inputRef.current;
    if (!el) return;
    const value = el.value;
    const cursor = el.selectionStart ?? value.length;
    const anchor = mentionAnchor || getMentionContext(value, cursor);
    const start = anchor?.start ?? cursor;
    const before = value.slice(0, start);
    const after = value.slice(cursor);
    const insert = `@${username} `;
    const next = `${before}${insert}${after}`;
    setInput(next);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionAnchor(null);
    setMentionActiveIndex(0);
    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = before.length + insert.length;
        el.setSelectionRange(pos, pos);
      } catch {}
    });
  };
  useEffect(() => {
    let ignore = false;
    if (!mentionOpen) return;
    const q = mentionQuery.trim();
    (async () => {
      try {
        const res = await fetch(`/api/user-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!ignore) {
          const results = Array.isArray(data.results) ? data.results : [];
          const normalized = results.filter((entry: any): entry is { username: string; displayName: string; avatarUrl: string } =>
            entry &&
            typeof entry.username === "string" &&
            typeof entry.displayName === "string" &&
            typeof entry.avatarUrl === "string",
          );
          setMentionList(normalized.filter((entry) => !blockedUsers.has(entry.username)));
        }
      } catch {
        if (!ignore) setMentionList([]);
      }
    })();
    return () => { ignore = true; };
  }, [mentionOpen, mentionQuery, blockedUsers]);

  useEffect(() => {
    if (!mentionOpen) return;
    setMentionActiveIndex(0);
  }, [mentionOpen, mentionList.length]);

  useEffect(() => {
    if (!mentionOpen) return;
    updateMentionPopupPosition();
    const handleResize = () => updateMentionPopupPosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [mentionOpen, updateMentionPopupPosition]);

  useEffect(() => {
    if (!mentionOpen) return;
    const handleClick = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mentionPopupRef.current?.contains(target)) return;
      if (inputRef.current?.contains(target)) return;
      setMentionOpen(false);
      setMentionQuery("");
      setMentionAnchor(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [mentionOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setInput(nextValue);
    const cursor = e.target.selectionStart ?? nextValue.length;
    const ctx = getMentionContext(nextValue, cursor);
    if (ctx) {
      setMentionOpen(true);
      setMentionQuery(ctx.query);
      setMentionAnchor({ start: ctx.start, end: cursor });
      setMentionActiveIndex(0);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
      setMentionAnchor(null);
    }
    const room = roomKey();
    try { localStorage.setItem(`draft:${room}` , nextValue); } catch {}
    socketRef.current?.emit("typing", { user: username, room });
  };

  // Load draft on room change
  useEffect(() => {
    const room = roomKey();
    try {
      const saved = localStorage.getItem(`draft:${room}`);
      if (saved != null) setInput(saved);
      else setInput("");
    } catch { setInput(""); }
    setNewSinceScroll(0);
    setIsAtBottom(true);
  }, [selectedHaven, selectedChannel, selectedDM]);

  // Upload helpers
  const startUpload = async (file: File) => {
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const localUrl = URL.createObjectURL(file);
    setUploadItems(prev => [...prev, { id, name: file.name, type: file.type || 'application/octet-stream', size: file.size, progress: 0, status: 'uploading', localUrl }]);
    await doUpload(file.name, file.type, file, id);
  };
  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        notify({ title: "File too large", body: `${file.name} exceeds 25MB limit`, type: "warn" });
        continue;
      }
      try {
        await startUpload(file);
      } catch {}
    }
    setUploading(false);
  }, [startUpload]);
  const doUpload = async (name: string, type: string, blob: Blob, id: string) => {
    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => { reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
    await new Promise<void>((resolveUp) => {
      const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/upload'); xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) { const pct = Math.min(100, Math.round((ev.loaded / ev.total) * 100)); setUploadItems(prev => prev.map(u => u.id === id ? { ...u, progress: pct } : u)); } };
      xhr.onreadystatechange = () => { if (xhr.readyState === 4) { try { const json = JSON.parse(xhr.responseText || '{}'); if (xhr.status >= 200 && xhr.status < 300) { setPendingFiles(prev => [...prev, { url: json.url, name: json.name, type: json.type, size: json.size }]); setUploadItems(prev => prev.filter(u => u.id !== id)); } else { setUploadItems(prev => prev.map(u => u.id === id ? { ...u, status: 'error' } : u)); } } catch { setUploadItems(prev => prev.map(u => u.id === id ? { ...u, status: 'error' } : u)); } resolveUp(); } };
      xhr.send(JSON.stringify({ name, data: dataUrl, type }));
    });
  };

  // Shift key tracking for expanded hover tools
  const [shiftDown, setShiftDown] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftDown(true); };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftDown(false); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
  const shellFilterParts: string[] = [];
  if (isBooting) shellFilterParts.push('blur(4px)');
  if (privacyBlurActive) shellFilterParts.push('blur(10px)');
  const shellFilter = shellFilterParts.length ? shellFilterParts.join(' ') : 'none';
  const shellPointerEvents = isBooting ? 'none' : 'auto';
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleFocus = () => setWindowFocused(true);
    const handleBlur = () => setWindowFocused(false);
    const handleVisibility = () => {
      if (typeof document === "undefined") return;
      setWindowFocused(!document.hidden);
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, []);
  const overlayMessage = "Tab unfocused - focus ChitterHaven to reveal";
  const overlayBackground = 'rgba(2,6,23,0.55)';
  const privacyOverlay = !privacyBlurActive ? null : (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 20,
        background: overlayBackground,
        color: COLOR_TEXT,
        fontWeight: 600,
        letterSpacing: 0.5,
        zIndex: 120,
        pointerEvents: 'none',
        opacity: privacyBlurActive ? 1 : 0,
        transition: 'opacity 200ms ease'
      }}
    >
      {overlayMessage}
    </div>
  );
  const streamerBadge = streamerMode ? (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 130,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid rgba(99,102,241,0.4)',
        background: 'rgba(15,23,42,0.85)',
        color: '#c7d2fe',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.5,
        pointerEvents: 'none'
      }}
    >
      Streamer Mode
    </div>
  ) : null;
  const viewerAvatar = userProfileCache[username]?.avatarUrl || '/favicon.ico';
  const viewerDisplay = displayNameFor(username);
  const openSelfProfile = () => {
    setProfileContext("Your Profile");
    setProfileUser(username);
  };
  const profileLauncher = (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 131,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}
      onMouseEnter={() => setProfileLauncherHover(true)}
      onMouseLeave={() => setProfileLauncherHover(false)}
    >
      <button
        type="button"
        onClick={openSelfProfile}
        title="View your profile"
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '2px solid rgba(99,102,241,0.4)',
          boxShadow: '0 10px 24px rgba(0,0,0,0.4)',
          background: '#020617',
          padding: 0,
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <img
          src={viewerAvatar}
          alt="Your profile"
          {...avatarLoadProps}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </button>
      <div
        style={{
          marginLeft: 12,
          padding: '10px 18px',
          background: 'rgba(2,6,23,0.94)',
          border: '1px solid rgba(99,102,241,0.45)',
          borderRadius: 18,
          boxShadow: '0 16px 32px rgba(2,6,23,0.6)',
          minWidth: 150,
          display: 'flex',
          flexDirection: 'column',
          opacity: profileLauncherHover ? 1 : 0,
          transform: profileLauncherHover ? 'translateX(0)' : 'translateX(-8px)',
          pointerEvents: profileLauncherHover ? 'auto' : 'none',
          transition: 'opacity 160ms ease, transform 160ms ease',
        }}
      >
        <div style={{ fontWeight: 600, color: COLOR_TEXT, fontSize: 13 }}>{viewerDisplay}</div>
        <div style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>@{username}</div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          className="ch-shell"
          style={{
            display: "flex",
            height: isMobile ? "calc(100vh - 1rem)" : "70vh",
            width: "100%",
            maxWidth: isMobile ? "100%" : 1100,
            minWidth: 320,
            margin: isMobile ? "0.5rem auto" : "2rem auto",
            border: BORDER,
            borderRadius: isMobile ? 10 : 14,
            background: "var(--ch-shell-bg)",
            backgroundSize: "var(--ch-shell-bg-size, cover)",
            backgroundPosition: "var(--ch-shell-bg-position, center)",
            backgroundRepeat: "var(--ch-shell-bg-repeat, no-repeat)",
            boxShadow: isMobile ? "0 8px 24px rgba(0,0,0,0.4)" : "0 12px 40px rgba(0,0,0,0.35)",
            filter: shellFilter,
            pointerEvents: shellPointerEvents,
            transition: 'filter 220ms ease'
          }}
        >
          <MobileApp
            activeNav={activeNav}
            setActiveNav={setActiveNav}
            isMobile={isMobile}
            setShowMobileNav={setShowMobileNav}
            havens={havens}
            setSelectedHaven={setSelectedHaven}
            selectedHaven={selectedHaven}
            dms={dms}
            selectedDM={selectedDM}
            setSelectedDM={setSelectedDM}
            setShowUserSettings={setShowUserSettings}
            setShowServerSettings={setShowServerSettings}
            setSelectedChannel={setSelectedChannel}
            selectedChannel={selectedChannel}
            messages={messages}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            typingUsers={typingUsers}
            showTimestamps={showTimestamps}
            showMobileNav={showMobileNav}
            currentAvatarUrl={(userProfileCache && userProfileCache[username] && userProfileCache[username].avatarUrl) || '/favicon.ico'}
            accent={accent}
            appearance={appearance}
            lastSelectedDMRef={lastSelectedDMRef}
            setFriendsTab={typeof setFriendsTab !== 'undefined' ? (setFriendsTab as any) : undefined}
            statusMessageMap={statusMessageMap}
            richPresenceMap={richPresenceMap}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            handleReply={handleReply}
            editId={editId}
            editText={editText}
            setEditText={setEditText}
            handleEditSubmit={handleEditSubmit}
            cancelEdit={() => { setEditId(null); setEditText(''); }}
            toggleReaction={toggleReaction}
            username={username}
            invitePreviews={invitePreviews}
            invitePreviewStatus={invitePreviewStatus}
            inviteErrors={inviteErrors}
            inviteJoinStatus={inviteJoinStatus}
            joinInvite={joinInvite}
            onUploadFiles={handleUploadFiles}
          />
        </div>
        {!isMobile && profileLauncher}
        {streamerBadge}
        {privacyOverlay}
      </>
    );
  }

  return (
    <>
      <div
        className="ch-shell"
        style={{
          display: "flex",
          height: fillScreen ? "100vh" : (isMobile ? "calc(100vh - 1rem)" : "70vh"),
          width: "100%",
          maxWidth: fillScreen ? "100%" : (isMobile ? "100%" : 1100),
          minWidth: 320,
          margin: fillScreen ? "0" : (isMobile ? "0.5rem auto" : "2rem auto"),
          border: fillScreen ? "none" : BORDER,
          borderRadius: fillScreen ? 0 : (isMobile ? 10 : 14),
          background: "var(--ch-shell-bg)",
          backgroundSize: "var(--ch-shell-bg-size, cover)",
          backgroundPosition: "var(--ch-shell-bg-position, center)",
          backgroundRepeat: "var(--ch-shell-bg-repeat, no-repeat)",
          boxShadow: fillScreen ? "none" : (isMobile ? "0 8px 24px rgba(0,0,0,0.4)" : "0 12px 40px rgba(0,0,0,0.35)"),
          filter: shellFilter,
          pointerEvents: shellPointerEvents,
          transition: 'filter 220ms ease'
        }}
      >
      <NavController
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobile={isMobile}
        setShowMobileNav={setShowMobileNav}
        setSelectedHaven={setSelectedHaven}
        setSelectedChannel={setSelectedChannel}
        setSelectedDM={setSelectedDM}
        havens={havens}
        selectedHaven={selectedHaven}
        selectedDM={selectedDM}
        navigateToLocation={typeof navigateToLocation !== 'undefined' ? (navigateToLocation as any) : undefined}
        setShowUserSettings={setShowUserSettings}
        setShowServerSettings={setShowServerSettings}
        accent={accent}
        lastSelectedDMRef={lastSelectedDMRef}
        setFriendsTab={typeof setFriendsTab !== 'undefined' ? (setFriendsTab as any) : undefined}
      />
      {/* Havens sidebar */}
      <aside style={{ width: navSidebarWidth, background: COLOR_PANEL, borderRight: BORDER, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: BORDER, color: COLOR_TEXT, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FontAwesomeIcon icon={faServer} /> {labelHavens}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setHavenSearchOpen((prev) => !prev)}
                aria-label="Toggle haven search"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: BORDER,
                  background: havenSearchOpen ? COLOR_CARD : COLOR_PANEL_ALT,
                  color: COLOR_TEXT,
                  cursor: 'pointer',
                }}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
              <input
                value={havenFilter}
                onChange={(e)=> setHavenFilter(e.target.value)}
                placeholder="Search havens"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 36,
                  width: havenSearchOpen ? 140 : 0,
                  opacity: havenSearchOpen ? 1 : 0,
                  pointerEvents: havenSearchOpen ? 'auto' : 'none',
                  transition: 'width 160ms ease, opacity 160ms ease',
                  padding: havenSearchOpen ? '4px 8px' : 0,
                  borderRadius: 8,
                  border: BORDER,
                  background: COLOR_PANEL_ALT,
                  color: COLOR_TEXT,
                  fontSize: 13,
                }}
              />
            </div>
            {selectedHaven !== '__dms__' && permState.canManageServer && (
              <button title="Server Settings" style={{ background: 'none', border: BORDER, borderRadius: 8, color: accent, cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center' }} onClick={() => setShowServerSettings(true)}>
                <FontAwesomeIcon icon={faGear} />
              </button>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: showHavenIconsOnly ? 8 : 12 }}>
          <div
            key="__dms__"
            onClick={() => { setSelectedHaven('__dms__'); setSelectedChannel(''); setSelectedDM(null); }}
            title="Direct Messages"
            style={{
              padding: showHavenIconsOnly ? 4 : '10px 10px',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: showHavenIconsOnly ? 'center' : 'flex-start',
              gap: showHavenIconsOnly ? 0 : 8,
              cursor: 'pointer',
              background: showHavenIconsOnly ? 'transparent' : (selectedHaven === '__dms__' ? COLOR_CARD : COLOR_PANEL),
              color: selectedHaven === '__dms__' ? accent : COLOR_TEXT,
              fontWeight: selectedHaven === '__dms__' ? 700 : 500,
              border: showHavenIconsOnly ? 'none' : BORDER,
              borderLeft: showHavenIconsOnly ? undefined : (selectedHaven === '__dms__' ? `3px solid ${accent}` : '3px solid transparent'),
              borderRadius: showHavenIconsOnly ? 999 : 10,
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#111c32', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR_TEXT, border: selectedHaven === '__dms__' ? `2px solid ${accent}` : BORDER }}>
              <FontAwesomeIcon icon={faEnvelope} />
            </div>
            {!showHavenIconsOnly && <span>DMs</span>}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${showHavenIconsOnly ? Math.min(5, havenColumns) : 1}, minmax(0, 1fr))`,
            gap: showHavenIconsOnly ? 12 : 0,
          }}>
            {Object.keys(havens)
              .filter(h => getHavenName(h).toLowerCase().includes(havenFilter.trim().toLowerCase()))
              .map(haven => {
                const active = selectedHaven === haven;
                const revealKey = `haven-${haven}`;
                const badge = havenBadgeFor(haven);
                const iconSrc = havenIcons[haven];
                return (
                  <div
                    key={haven}
                    onClick={() => handleHavenChange(haven)}
                    title={`${labelHaven} ${getHavenName(haven)}  -  Code: ${havenCode(haven)}`}
                    style={{
                      padding: showHavenIconsOnly ? 6 : '10px 10px',
                      marginBottom: showHavenIconsOnly ? 0 : 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: showHavenIconsOnly ? 'center' : 'flex-start',
                      gap: showHavenIconsOnly ? 0 : 10,
                      cursor: 'pointer',
                      background: showHavenIconsOnly ? 'transparent' : (active ? COLOR_CARD : COLOR_PANEL),
                      color: active ? accent : COLOR_TEXT,
                      fontWeight: active ? 700 : 500,
                      border: showHavenIconsOnly ? 'none' : BORDER,
                      borderLeft: showHavenIconsOnly ? undefined : (active ? `3px solid ${accent}` : '3px solid transparent'),
                      borderRadius: showHavenIconsOnly ? 999 : 10,
                    }}
                  >
                    <div
                      style={{
                        width: showHavenIconsOnly ? 42 : 34,
                        height: showHavenIconsOnly ? 42 : 34,
                        borderRadius: '50%',
                        background: badge.background,
                        color: '#f8fafc',
                        fontWeight: 700,
                        fontSize: showHavenIconsOnly ? 16 : 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: active ? `2px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
                      }}
                      onMouseEnter={() => beginStreamerReveal(revealKey)}
                      onMouseLeave={() => endStreamerReveal(revealKey)}
                    >
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          alt={`${renderHavenLabel(haven, revealKey)} icon`}
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        badge.initials
                      )}
                    </div>
                    {!showHavenIconsOnly && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {renderHavenLabel(haven, revealKey)}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
        <div style={{ padding: 10, borderTop: BORDER }}>
          <button
            type="button"
            className="btn-ghost"
            title="Join or create haven"
            onClick={() => { setNewHaven(""); setNewHavenType('standard'); setHavenAction('create'); setShowNewHavenModal(true); }}
            style={{ width: '100%', justifyContent: 'center', padding: '8px 10px', color: accent, borderRadius: 8, border: BORDER, background: '#020617' }}
          >
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} /> New Haven
          </button>
        </div>
      </aside>
      {activeNav === 'home' && <HomePanel isMobile={isMobile} />}
      {activeNav === 'profile' && <ProfilePanel isMobile={isMobile} />}

      {/* Mobile-optimized application shell */}
      {isMobile && (
        <MobileApp
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          isMobile={isMobile}
          setShowMobileNav={setShowMobileNav}
          showMobileNav={showMobileNav}
          havens={havens}
          setSelectedHaven={setSelectedHaven}
          selectedHaven={selectedHaven}
          dms={dms}
          selectedDM={selectedDM}
          setSelectedDM={setSelectedDM}
          setShowUserSettings={setShowUserSettings}
          setShowServerSettings={setShowServerSettings}
          setSelectedChannel={setSelectedChannel}
          selectedChannel={selectedChannel}
          username={username}
          messages={messages}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          typingUsers={typingUsers}
          showTimestamps={showTimestamps}
          currentAvatarUrl={(userProfileCache && userProfileCache[username] && userProfileCache[username].avatarUrl) || '/favicon.ico'}
          userProfileCache={userProfileCache}
          accent={accent}
          appearance={appearance}
          lastSelectedDMRef={lastSelectedDMRef}
          setFriendsTab={typeof setFriendsTab !== 'undefined' ? (setFriendsTab as any) : undefined}
          friendsState={friendsState}
          friendsTab={friendsTab}
          friendAction={friendAction}
          ensureDM={ensureDM}
          statusMessageMap={statusMessageMap}
          richPresenceMap={richPresenceMap}
          presenceMap={presenceMap}
          callsEnabled={callsEnabled}
          callState={callState}
          startCall={startCall}
          endCall={endCall}
          activeCallDM={activeCallDM}
          callParticipants={callParticipants}
          callElapsed={callElapsed}
          callInitiator={callInitiator}
          isMuted={isMuted}
          isDeafened={isDeafened}
          toggleMute={toggleMute}
          toggleDeafen={toggleDeafen}
          invitePreviews={invitePreviews}
          invitePreviewStatus={invitePreviewStatus}
          inviteErrors={inviteErrors}
          inviteJoinStatus={inviteJoinStatus}
          joinInvite={joinInvite}
          onUploadFiles={handleUploadFiles}
        />
      )}

      {/* Mobile-only Profile view */}
      {isMobile && activeNav === 'profile' && (
        <div className="block md:hidden" style={{ width: '100%', padding: 12, background: '#071127', borderBottom: BORDER }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, color: COLOR_TEXT }}><FontAwesomeIcon icon={faUser} /> Profile</div>
            <button className="btn-ghost" onClick={() => setShowUserSettings(true)} style={{ padding: '6px 8px' }}>Edit</button>
          </div>
          <div style={{ color: '#9ca3af' }}>Mobile profile view  -  separate from desktop profile UI.</div>
        </div>
      )}
      {/* Channels / DMs sidebar */}
      <aside style={{ width: channelSidebarWidth, background: COLOR_PANEL_ALT, borderRight: BORDER, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: BORDER, color: COLOR_TEXT, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FontAwesomeIcon icon={selectedHaven === "__dms__" ? faEnvelope : faHashtag} />
            {selectedHaven === "__dms__" ? 'Direct Messages' : 'Channels'}
          </span>
          {selectedHaven !== "__dms__" && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowInvitePanel(v => !v)}
                title="Create invite"
                style={{ padding: '4px 6px' }}
              >
                <FontAwesomeIcon icon={faEnvelope} />
              </button>
              {inviteCode && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={async () => { try { await navigator.clipboard.writeText(inviteCode); notify({ title: 'Invite copied', body: inviteCode, type: 'info' }); } catch {} }}
                  title="Copy last invite code"
                  style={{ padding: '4px 6px', fontSize: 11 }}
                >
                  Copy
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: 10, borderBottom: BORDER }}>
          {showInvitePanel && selectedHaven !== '__dms__' && (
            <div style={{ marginBottom: 8, padding: 8, borderRadius: 8, border: BORDER, background: '#020617', color: COLOR_TEXT, fontSize: 12 }}>
              <div style={{ marginBottom: 6 }}>Invite to <span style={{ color: accent }}>{getHavenName(selectedHaven)}</span></div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#9ca3af' }}>Expires in:</span>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {[1, 7, 30, 0].map(d => (
                    <button
                      key={d}
                      type="button"
                      className="btn-ghost"
                      onClick={() => setInviteDays(d)}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        borderRadius: 999,
                        border: inviteDays === d ? `1px solid ${accent}` : BORDER,
                        color: inviteDays === d ? accent : COLOR_TEXT
                      }}
                    >
                      {d === 0 ? 'Never' : `${d}d`}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#9ca3af' }}>Max uses:</span>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {[1, 5, 10, 0].map(n => (
                    <button
                      key={n}
                      type="button"
                      className="btn-ghost"
                      onClick={() => setInviteMaxUses(n)}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        borderRadius: 999,
                        border: inviteMaxUses === n ? `1px solid ${accent}` : BORDER,
                        color: inviteMaxUses === n ? accent : COLOR_TEXT
                      }}
                    >
                      {n === 0 ? 'Unlimited' : n}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={createInvite}
                disabled={creatingInvite}
                style={{ padding: '4px 8px', fontSize: 12, color: accent, opacity: creatingInvite ? 0.7 : 1 }}
              >
                {creatingInvite ? 'Creating...' : 'Generate Invite'}
              </button>
              {inviteCode && (
                <div style={{ marginTop: 6, color: '#9ca3af' }}>Last invite: <span style={{ color: COLOR_TEXT }}>{inviteCode}</span></div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: COLOR_PANEL, border: BORDER, borderRadius: 8, padding: '6px 8px' }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ color: '#9ca3af' }} />
            {selectedHaven === "__dms__" ? (
              <input value={dmFilter} onChange={(e)=> setDmFilter(e.target.value)} placeholder="Search DMs" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: COLOR_TEXT, fontSize: 13 }} />
            ) : (
              <input value={channelFilter} onChange={(e)=> setChannelFilter(e.target.value)} placeholder="Search channels" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: COLOR_TEXT, fontSize: 13 }} />
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {selectedHaven === "__dms__" ? (
            <>
              <div key="friends-home" onClick={() => setSelectedDM(null)} style={{ padding: '10px 12px', cursor: 'pointer', background: selectedDM === null ? COLOR_CARD : 'transparent', color: selectedDM === null ? accent : COLOR_TEXT, fontWeight: selectedDM === null ? 700 : 500, borderRadius: 10, border: selectedDM === null ? BORDER : '1px solid transparent', marginBottom: 6 }}>
                <FontAwesomeIcon icon={faEnvelope} /> Friends
              </div>
              {filteredDMs.length === 0 ? (
                <div style={{ color: '#9ca3af', padding: 12 }}>
                  {dms.length === 0 ? 'No DMs yet.' : 'No DMs match your search.'}
                </div>
              ) : (
                filteredDMs.map(dm => {
                  const revealKey = `dm-${dm.id}`;
                  const members = dmMembersWithoutSelf(dm);
                  const isGroup = isGroupDMThread(dm);
                  const first = members[0];
                  const avatar = first ? userProfileCache[first]?.avatarUrl || '/favicon.ico' : '/favicon.ico';
                  const groupAvatar = getDMAvatar(dm);
                  const showGroupAvatar = isGroup && !!groupAvatar;
                  const dotColor = statusColor(first ? presenceMap[first] : undefined);
                  const statusMessage = !isGroup && first ? statusMessageMap[first] : "";
                  const richPresence = !isGroup && first ? formatRichPresence(richPresenceMap[first]) : null;
                  const extraMembers = Math.max(0, members.length - 3);
                  const previewNames = members.slice(0, 3).map((user, idx) => (
                    <Fragment key={`${dm.id}-${user}`}>
                      {idx > 0 && ', '}
                      {renderDisplayName(user, { revealKey })}
                    </Fragment>
                  ));
                  const titleNode = renderDMLabel(dm, { revealKey });
                  const titleText = getDMTitle(dm);
                  return (
                    <div
                      key={dm.id}
                      onClick={() => { setSelectedDM(dm.id); }}
                      onContextMenu={(e) => openCtx(e, { type: 'dm', data: dm })}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        background: selectedDM === dm.id ? COLOR_CARD : 'transparent',
                        color: selectedDM === dm.id ? accent : COLOR_TEXT,
                        fontWeight: selectedDM === dm.id ? 700 : 500,
                        borderRadius: 10,
                        border: selectedDM === dm.id ? BORDER : '1px solid transparent',
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <div
                        style={{ position: 'relative', width: 40, flex: '0 0 auto', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={() => beginStreamerReveal(revealKey)}
                        onMouseLeave={() => endStreamerReveal(revealKey)}
                      >
                        {isGroup ? (
                          showGroupAvatar ? (
                            <img
                              src={groupAvatar}
                              alt={titleText || 'Group avatar'}
                              {...avatarLoadProps}
                              style={{ width: 40, height: 40, borderRadius: '35%', border: BORDER, objectFit: 'cover', background: COLOR_PANEL }}
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {members.slice(0, 3).map((user, idx) => {
                                const profile = userProfileCache[user];
                                const src = profile?.avatarUrl || '/favicon.ico';
                                return (
                                  <img
                                    key={`${dm.id}-avatar-${user}`}
                                    src={src}
                                    alt={user}
                                    {...avatarLoadProps}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: '50%',
                                      border: BORDER,
                                      objectFit: 'cover',
                                      marginLeft: idx === 0 ? 0 : -10,
                                      background: COLOR_PANEL,
                                    }}
                                  />
                                );
                              })}
                              {extraMembers > 0 && (
                                <div style={{ marginLeft: -10, width: 26, height: 26, borderRadius: '50%', border: BORDER, background: COLOR_PANEL_STRONG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                                  +{extraMembers}
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <>
                            <img
                              src={avatar}
                              alt={first || 'DM'}
                              {...avatarLoadProps}
                              style={{ width: 36, height: 36, borderRadius: '50%', border: BORDER, objectFit: 'cover' }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                border: `2px solid ${COLOR_PANEL}`,
                                background: dotColor
                              }}
                            />
                          </>
                        )}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>{titleNode}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          {isGroup ? (
                            <>
                              {previewNames}
                              {extraMembers > 0 && <> +{extraMembers}</>}
                              <span style={{ opacity: 0.7 }}> -  {dm.users.length} members</span>
                            </>
                          ) : (
                            previewNames
                          )}
                        </span>
                        {!isGroup && statusMessage && (
                          <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>{statusMessage}</span>
                        )}
                        {!isGroup && richPresence && (
                          <span style={{ fontSize: 11, color: '#93c5fd' }}>{richPresence}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          ) : (
            orderedChannelsFor(selectedHaven)
              .filter(ch => ch.toLowerCase().includes(channelFilter.trim().toLowerCase()))
              .map((ch) => (
                <div key={ch} onClick={() => { setSelectedDM(null); handleChannelChange(ch); }} onContextMenu={(e) => openCtx(e, { type: 'channel', data: ch })} style={{ padding: '10px 12px', cursor: 'pointer', background: selectedChannel === ch ? COLOR_CARD : 'transparent', color: selectedChannel === ch ? accent : COLOR_TEXT, fontWeight: selectedChannel === ch ? 700 : 500, borderRadius: 10, border: selectedChannel === ch ? BORDER : '1px solid transparent', marginBottom: 6 }}>
                  <FontAwesomeIcon icon={faHashtag} /> #{ch}
                </div>
              ))
          )}
        </div>
        {selectedHaven === "__dms__" ? (
          <div style={{ padding: 12, borderTop: BORDER, background: COLOR_PANEL_ALT }}>
            <button
              type="button"
              className="btn-ghost"
              title="Start a group DM"
              onClick={() => { resetGroupDMModal(); setShowGroupDM(true); }}
              style={{ width: '100%', justifyContent: 'center', padding: '8px 10px', color: accent, borderRadius: 8, border: BORDER, background: '#020617' }}
            >
              <FontAwesomeIcon icon={faUsers} style={{ marginRight: 6 }} /> New Group DM
            </button>
          </div>
        ) : (
          permState.canManageChannels && (
            <div style={{ padding: 12, borderTop: BORDER, background: COLOR_PANEL_ALT }}>
              <button
                type="button"
                className="btn-ghost"
                title="Create channel"
                onClick={() => { setNewChannel(""); setNewChannelType('text'); setShowNewChannelModal(true); }}
                style={{ width: '100%', justifyContent: 'center', padding: '8px 10px', color: accent, borderRadius: 8, border: BORDER, background: '#020617' }}
              >
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} /> New Channel
              </button>
            </div>
          )
        )}
      </aside>
      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: 'relative' }}>
        <div style={{ padding: 16, borderBottom: "1px solid #333", color: "#fff", fontWeight: 600, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          {isMobile && (
            <button className="btn-ghost" onClick={() => setShowMobileNav(true)} title="Open navigation" style={{ padding: '6px 8px' }}>
              <FontAwesomeIcon icon={faBars} />
            </button>
          )}
          {selectedHaven === "__dms__" && !selectedDM ? (
            <>
              <FontAwesomeIcon icon={faEnvelope} /> Friends
              <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                <button className="btn-ghost" onClick={() => setFriendsTab('all')} style={{ padding: '6px 10px', color: friendsTab === 'all' ? '#93c5fd' : undefined }}>All</button>
                <button className="btn-ghost" onClick={() => setFriendsTab('online')} style={{ padding: '6px 10px', color: friendsTab === 'online' ? '#93c5fd' : undefined }}>Online</button>
                <button className="btn-ghost" onClick={() => setFriendsTab('pending')} style={{ padding: '6px 10px', color: friendsTab === 'pending' ? '#93c5fd' : undefined }}>Pending</button>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {showAddFriend && (
                  <form onSubmit={(e)=>{ e.preventDefault(); const t = addFriendName.trim(); if (t) { friendAction('request', t); setAddFriendName(''); setShowAddFriend(false);} }} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      value={addFriendName}
                      onChange={(e)=> setAddFriendName(e.target.value)}
                      placeholder="Add friend by username"
                      className="input-dark"
                      style={{ padding: '6px 8px', width: 'min(360px, 42vw)', minWidth: 220, flex: '1 1 220px', boxSizing: 'border-box' }}
                    />
                    <button className="btn-ghost" type="submit" style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faPlus} /> Add</button>
                  </form>
                )}
                {!showAddFriend && (
                  <button className="btn-ghost" onClick={()=> setShowAddFriend(true)} title="Add Friend" style={{ padding: '6px 10px' }}>
                    <FontAwesomeIcon icon={faPlus} /> Add Friend
                  </button>
                )}
                {userSettings.showOnlineCount !== false && (() => {
                  const onlineUsers = Object.entries(presenceMap)
                    .filter(([_, s]) => s && s !== 'offline')
                    .map(([u]) => u)
                    .sort();
                  const title = onlineUsers.length
                    ? `Online (${onlineUsers.length}): ${onlineUsers.join(', ')}`
                    : 'Online: 0';
                  return (
                    <span className="btn-ghost" style={{ padding: '6px 8px', color: '#9ca3af' }} title={title}>
                      <FontAwesomeIcon icon={faUsers} /> {onlineCount}
                    </span>
                  );
                })()}
                <button className="btn-ghost" onClick={() => setShowUserSettings(true)} title="User settings" style={{ padding: '6px 8px' }}>
                  <FontAwesomeIcon icon={faGear} />
                </button>
              </div>
            </>
          ) : selectedHaven === "__dms__" && selectedDM ? (
            (() => {
              const dm = dms.find(d => d.id === selectedDM);
              const members = dmMembersWithoutSelf(dm);
              const isGroup = isGroupDMThread(dm);
              const titleRevealKey = `dm-title-${dm?.id || 'dm'}`;
              const titleLabel = renderDMLabel(dm, { revealKey: titleRevealKey });
              const handlesLine = renderDMHandles(dm);
              const first = members[0];
              const statusMessage = !isGroup && first ? statusMessageMap[first] : "";
              const richPresence = !isGroup && first ? formatRichPresence(richPresenceMap[first]) : null;
              const dotColor = statusColor(first ? presenceMap[first] : undefined);
              const groupAvatar = isGroup ? getDMAvatar(dm) : "";
              const showGroupSettingsButton = isGroup && canManageGroupDM(dm);
              const totalMembers = dm?.users?.length || (members.length + 1);
              const remainingSlots = MAX_GROUP_DM_MEMBERS - totalMembers;
              const renderGroupAvatar = () => {
                if (!isGroup) return null;
                if (groupAvatar) {
                  return <img src={groupAvatar} alt={getDMTitle(dm)} {...avatarLoadProps} style={{ width: 44, height: 44, borderRadius: '35%', border: BORDER, objectFit: 'cover' }} />;
                }
                const previewMembers = (dm?.users || []).slice(0, 3);
                return (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {previewMembers.map((user, idx) => (
                      <img
                        key={`gdm-avatar-${user}`}
                        src={getUserAvatar(user)}
                        alt={user}
                        {...avatarLoadProps}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: BORDER,
                          objectFit: 'cover',
                          marginLeft: idx === 0 ? 0 : -10,
                          background: COLOR_PANEL,
                        }}
                      />
                    ))}
                    {totalMembers > previewMembers.length && (
                      <div style={{ marginLeft: -10, width: 26, height: 26, borderRadius: '50%', border: BORDER, background: COLOR_PANEL_STRONG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                        +{totalMembers - previewMembers.length}
                      </div>
                    )}
                  </div>
                );
              };
              const renderDirectAvatar = () => {
                const target = members[0];
                const avatar = target ? getUserAvatar(target) : '/favicon.ico';
                return (
                  <>
                    <img src={avatar} alt={target || 'DM'} {...avatarLoadProps} style={{ width: 44, height: 44, borderRadius: '50%', border: BORDER, objectFit: 'cover' }} />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: `2px solid ${COLOR_PANEL}`,
                        background: dotColor,
                      }}
                    />
                  </>
                );
              };
              return (
                <>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: isGroup ? '35%' : '50%',
                      border: BORDER,
                      background: COLOR_PANEL_ALT,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      position: 'relative',
                      cursor: showGroupSettingsButton ? 'pointer' : 'default',
                    }}
                    title={isGroup && showGroupSettingsButton ? 'Group settings' : undefined}
                    onClick={() => showGroupSettingsButton && dm && openGroupSettingsModal(dm.id)}
                  >
                    {isGroup ? renderGroupAvatar() : renderDirectAvatar()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: accent, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      {titleLabel}
                      {!isGroup && renderCallStatusBadge(first)}
                    </span>
                    {handlesLine && (
                      <span style={{ fontSize: 12, color: COLOR_TEXT_MUTED, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {handlesLine}
                      </span>
                    )}
                    {!isGroup && statusMessage && (
                      <span style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>{statusMessage}</span>
                    )}
                    {!isGroup && richPresence && (
                      <span style={{ fontSize: 11, color: '#93c5fd' }}>{richPresence}</span>
                    )}
                    {isGroup && (
                      <span style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>
                        {totalMembers} member{totalMembers === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {showReadingModeButton && (
                      <button
                        className="btn-ghost"
                        onClick={() => updateAppearance({ readingMode: !readingMode })}
                        title={readingMode ? 'Exit reading mode' : 'Reading mode'}
                        style={{ padding: '6px 8px' }}
                      >
                        <FontAwesomeIcon icon={readingMode ? faEyeSlash : faEye} />
                      </button>
                    )}
                    {isGroup && showGroupSettingsButton && remainingSlots > 0 && dm && (
                      <button
                        className="btn-ghost"
                        onClick={() => openGroupSettingsModal(dm.id)}
                        title="Add members"
                        style={{ padding: '6px 8px' }}
                      >
                        <FontAwesomeIcon icon={faUserPlus} />
                      </button>
                    )}
                    {callsEnabled && (
                      <button
                        className="btn-ghost"
                        onClick={startCall}
                        title={callState === 'in-call' ? 'Already in call' : 'Start voice call'}
                        style={{ padding: '6px 8px', color: callState === 'in-call' ? '#22c55e' : undefined }}
                      >
                        <FontAwesomeIcon icon={faPhone} />
                      </button>
                    )}
                    {userSettings.showOnlineCount !== false && dm && (() => {
                      const roster = Array.isArray(dm.users) ? dm.users : [];
                      const onlineMembers = roster.filter((member) => isUserOnline(member));
                      if (onlineMembers.length === 0) return null;
                      const title = roster.length ? `Participants (${roster.length}): ${roster.join(', ')}` : 'Participants';
                      return (
                        <span className="btn-ghost" style={{ padding: '6px 8px', color: '#9ca3af' }} title={title}>
                          <FontAwesomeIcon icon={faUsers} /> {onlineMembers.length}/{roster.length || '...'} online
                        </span>
                      );
                    })()}
                    <button className="btn-ghost" onClick={() => setShowPinned(true)} title="Pinned messages" style={{ padding: '6px 8px' }}>
                      <FontAwesomeIcon icon={faThumbtack} />
                    </button>
                    <button className="btn-ghost" onClick={() => setShowUserSettings(true)} title="User settings" style={{ padding: '6px 8px' }}>
                      <FontAwesomeIcon icon={faGear} />
                    </button>
                  </div>
                </>
              );
            })()
          ) : (
            <>
              <FontAwesomeIcon icon={faServer} /> {getHavenName(selectedHaven)} {selectedChannel && (<span style={{ color: accent }}>/ #{selectedChannel}</span>)}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {userSettings.showOnlineCount !== false && selectedHaven !== '__dms__' && (() => {
                  const onlineMembers = havenMembers.filter((member) => isUserOnline(member));
                  if (onlineMembers.length === 0) return null;
                  const title = havenMembers.length
                    ? `Members (${havenMembers.length}): ${havenMembers.join(', ')}`
                    : 'Members';
                  return (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setShowMembers((v) => !v)}
                      title={title}
                      style={{ padding: '6px 8px', color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <FontAwesomeIcon icon={faUsers} />
                      <span>{onlineMembers.length}/{havenMembers.length || '...'} online</span>
                    </button>
                  );
                })()}
                {showReadingModeButton && (
                  <button
                    className="btn-ghost"
                    onClick={() => updateAppearance({ readingMode: !readingMode })}
                    title={readingMode ? 'Exit reading mode' : 'Reading mode'}
                    style={{ padding: '6px 8px' }}
                  >
                    <FontAwesomeIcon icon={readingMode ? faEyeSlash : faEye} />
                  </button>
                )}
                <button className="btn-ghost" onClick={() => setShowPinned(true)} title="Pinned messages" style={{ padding: '6px 8px' }}>
                  <FontAwesomeIcon icon={faThumbtack} />
                </button>
                <button className="btn-ghost" onClick={() => setShowUserSettings(true)} title="User settings" style={{ padding: '6px 8px' }}>
                  <FontAwesomeIcon icon={faGear} />
                </button>
              </div>
            </>
          )}
        </div>
        {showGlobalCallBar && callLocationInfo && (
          <div style={{ margin: '8px 16px', padding: '10px 14px', borderRadius: 12, background: '#030711', border: BORDER, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLOR_TEXT, fontWeight: 600 }}>
              {renderCallStatusIconGraphic(viewerCallMeta, 16)}
              <span>In Call</span>
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12 }}>{callLocationInfo.label}</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              {callParticipantPreview.map((p) => {
                const meta: CallStatusMeta = getCallStatusMeta(p.user) || { type: 'talking', color: '#22c55e', label: 'In Call' };
                return (
                  <div key={`call-preview-${p.user}`} style={{ position: 'relative', width: 32, height: 32 }}>
                    <img src={userProfileCache[p.user]?.avatarUrl || '/favicon.ico'} alt={p.user} {...avatarLoadProps} style={{ width: 32, height: 32, borderRadius: '50%', border: BORDER, objectFit: 'cover', filter: 'blur(0.6px)' }} />
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.5)', borderRadius: '50%' }}>
                      {renderCallStatusIconGraphic(meta, 12)}
                    </span>
                  </div>
                );
              })}
              {extraCallParticipants > 0 && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR_TEXT, fontSize: 12 }}>+{extraCallParticipants}</div>
              )}
            </div>
          </div>
        )}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: isClassic ? COLOR_PANEL_ALT : isBubbles ? "#040910" : isMinimalLog ? "#05080f" : isFocusStyle ? "#050b14" : isThreadForward ? "#050b16" : isRetro ? "#040b12" : "#030712",
            padding: compact ? 12 : 16,
            paddingBottom: (compact ? 12 : 16) + (viewingCallDM ? 140 : 0),
            color: "#fff",
            borderRadius: 0,
            minHeight: 0,
            position: 'relative'
          }}
          ref={chatScrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
            setIsAtBottom(atBottom);
            if (atBottom) setNewSinceScroll(0);
          }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={async (e) => { e.preventDefault(); const files = Array.from(e.dataTransfer?.files || []); for (const f of files) { if (f.size > 25*1024*1024) { alert(`File ${f.name} exceeds 25MB limit`); continue; } await startUpload(f); } }}
        >
          <div style={{ maxWidth: maxContentWidth ? `${maxContentWidth}px` : '100%', margin: '0 auto', width: '100%' }}>
          {viewingCallDM && (() => {
            const dmId = selectedDM && selectedDM === activeCallDM ? selectedDM : activeCallDM;
            const dm = dms.find(d => d.id === dmId);
            const fallback = (dm ? dm.users : []).map(user => ({ user, status: 'ringing' as const }));
            const participantCards = (callParticipants.length ? callParticipants : fallback).filter(p => !!p.user);
            const label = callState === 'calling' ? 'Calling...' : 'In call';
            return (
              <div
                onContextMenu={(e) => openCtx(e, { type: 'call', data: { room: activeCallDM } })}
                style={{
                  position: 'fixed',
                  bottom: isMobile ? 76 : 96,
                  left: isMobile ? 8 : '50%',
                  transform: isMobile ? 'none' : 'translateX(-50%)',
                  width: isMobile ? 'calc(100vw - 16px)' : 'min(920px, 94vw)',
                  zIndex: 82,
                  padding: 12,
                  borderRadius: 12,
                  background: COLOR_PANEL,
                  border: BORDER,
                  color: COLOR_TEXT,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.35)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: callState === 'calling' ? '#f59e0b' : '#22c55e', display: 'inline-block' }} />
                  <div style={{ fontWeight: 700 }}>{label}</div>
                  {callInitiator && (() => {
                    const revealKey = `call-init-${callInitiator}`;
                    const initiatorAvatar = userProfileCache[callInitiator]?.avatarUrl || '/favicon.ico';
                    return (
                      <div style={{ fontSize: 12, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: BORDER }}
                          onMouseEnter={() => beginStreamerReveal(revealKey)}
                          onMouseLeave={() => endStreamerReveal(revealKey)}
                        >
                          <img src={initiatorAvatar} alt={callInitiator} {...avatarLoadProps} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span>Started by {renderDisplayName(callInitiator, { prefix: '@', revealKey })}</span>
                      </div>
                    );
                  })()}
                  <div style={{ marginLeft: 'auto', color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}>
                    {`${Math.floor(callElapsed / 60).toString().padStart(1, '0')}:${(callElapsed % 60).toString().padStart(2, '0')}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  {participantCards.map(part => {
                    const user = part.user;
                    const profile = userProfileCache[user];
                    const avatar = profile?.avatarUrl || '/favicon.ico';
                    const display = profile?.displayName || user;
                    const color = part.status === 'connected' ? '#22c55e' : '#f59e0b';
                    const meta: CallStatusMeta = getCallStatusMeta(user) || { type: 'talking', color, label: 'In Call' };
                    const revealKey = `callbar-${user}`;
                    return (
                      <div key={user} style={{ padding: '6px 10px', borderRadius: 8, border: BORDER, background: COLOR_PANEL_ALT, display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, flex: '1 1 220px' }}>
                        <div
                          style={{ position: 'relative', width: 44, height: 44, flex: '0 0 auto' }}
                          onMouseEnter={() => beginStreamerReveal(revealKey)}
                          onMouseLeave={() => endStreamerReveal(revealKey)}
                        >
                          <img
                            src={avatar}
                            alt={display}
                            {...avatarLoadProps}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              border: `2px solid ${color}`,
                              filter: 'blur(1px)',
                              objectFit: 'cover'
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(2,6,23,0.55)',
                              borderRadius: '50%',
                            }}
                          >
                            {renderCallStatusIconGraphic(meta, 18)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div style={{ fontWeight: 600 }}>
                            {renderDisplayName(user, { revealKey })}
                            {user === username ? ' (you)' : ''}
                          </div>
                          <div style={{ fontSize: 12, color }}>{part.status === 'connected' ? 'Connected' : 'Ringing'}</div>
                        </div>
                      </div>
                    );
                  })}
                  {participantCards.length === 0 && (
                    <div style={{ color: '#9ca3af', fontSize: 12 }}>No participants yet.</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="btn-ghost"
                    style={{ padding: '8px 12px', borderRadius: 8, border: BORDER, background: isMuted ? COLOR_PANEL_STRONG : COLOR_PANEL_ALT, color: COLOR_TEXT }}
                  >
                    <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} /> {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleDeafen}
                    className="btn-ghost"
                    style={{ padding: '8px 12px', borderRadius: 8, border: BORDER, background: isDeafened ? COLOR_PANEL_STRONG : COLOR_PANEL_ALT, color: COLOR_TEXT }}
                  >
                    <FontAwesomeIcon icon={faVolumeXmark} /> {isDeafened ? 'Undeafen' : 'Deafen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHaven('__dms__');
                      if (activeCallDM) setSelectedDM(activeCallDM);
                      setShowMobileNav(false);
                      setTimeout(() => {
                        const el = chatScrollRef.current;
                        if (el) el.scrollTop = el.scrollHeight;
                      }, 50);
                    }}
                    className="btn-ghost"
                    style={{ padding: '8px 12px', borderRadius: 8, border: BORDER, background: COLOR_PANEL_ALT, color: COLOR_TEXT }}
                  >
                    <FontAwesomeIcon icon={faPhone} /> Jump to DM
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFullscreenCall(true)}
                    className="btn-ghost"
                    style={{ padding: '8px 12px', borderRadius: 8, border: BORDER, background: COLOR_PANEL_ALT, color: COLOR_TEXT }}
                  >
                    <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} /> Full Screen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasJoinedCallRef.current) endCall();
                      else declineCall(activeCallDM);
                    }}
                    className="btn-ghost"
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #7f1d1d', background: '#7f1d1d', color: '#fff', marginLeft: 'auto' }}
                  >
                    Hang up
                  </button>
                </div>
              </div>
            );
          })()}
          {showTipsBanner && !(selectedHaven === "__dms__" && !selectedDM) && (
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, border: BORDER, background: 'rgba(15,23,42,0.9)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontSize: 18, marginTop: 2 }}>
                <FontAwesomeIcon icon={faServer} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Welcome to ChitterHaven</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  Right-click messages for more actions, Shift+hover to see moderation tools, and use Ctrl/Cmd+K for the quick switcher.
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={dismissTips} style={{ padding: '4px 8px', fontSize: 12 }}>
                Got it
              </button>
            </div>
          )}
          {selectedHaven === "__dms__" && !selectedDM ? (
            <div>
              {friendsTab !== 'pending' && (
                <div>
                  {(() => {
                    const list = friendsTab === 'online'
                      ? friendsState.friends.filter(u => (presenceMap[u] || 'offline') !== 'offline')
                      : friendsState.friends;
                    if (list.length === 0) return <div style={{ color: COLOR_TEXT_MUTED }}>No friends {friendsTab === 'online' ? 'online' : 'yet'}.</div>;
                    return list.map((u) =>
                      renderFriendRow(
                        u,
                        <>
                          <button className="btn-ghost" onClick={()=> ensureDM(u)} style={{ padding: '6px 10px' }}>Message</button>
                          <button
                            className="btn-ghost"
                            onClick={() => setConfirmAction({
                              title: 'Remove friend?',
                              body: `Remove @${u} from your friends list.`,
                              confirmLabel: 'Remove',
                              onConfirm: async () => {
                                await friendAction('remove', u);
                                setConfirmAction(null);
                              },
                            })}
                            style={{ padding: '6px 10px', color: '#f87171' }}
                          >
                            Remove
                          </button>
                        </>,
                      )
                    );
                  })()}
                </div>
              )}
              {friendsTab === 'pending' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 6 }}>Incoming</div>
                    {friendsState.incoming.length === 0 ? (
                      <div style={{ color: COLOR_TEXT_MUTED }}>No incoming requests.</div>
                    ) : (
                      friendsState.incoming.map(u =>
                        renderFriendRow(
                          u,
                          <>
                            <button className="btn-ghost" onClick={()=> friendAction('accept', u)} style={{ padding: '6px 10px', color: '#22c55e' }}>Accept</button>
                            <button className="btn-ghost" onClick={()=> friendAction('decline', u)} style={{ padding: '6px 10px', color: '#f87171' }}>Decline</button>
                          </>,
                          { key: `incoming-${u}` }
                        )
                      )
                    )}
                  </div>
                  <div>
                    <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 6 }}>Outgoing</div>
                    {friendsState.outgoing.length === 0 ? (
                      <div style={{ color: COLOR_TEXT_MUTED }}>No outgoing requests.</div>
                    ) : (
                      friendsState.outgoing.map(u =>
                        renderFriendRow(
                          u,
                          <button className="btn-ghost" onClick={()=> friendAction('cancel', u)} style={{ padding: '6px 10px', color: '#f59e0b' }}>Cancel</button>,
                          { key: `outgoing-${u}` }
                        )
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Fragment>
          {messages.map((msg, idx) => {
            if (blockedUsers.has(msg.user)) return null;
            const messageKey = msg.id ? `${msg.id}-${idx}` : `${msg.user}-${msg.timestamp}-${idx}`;
            const revealKey = `msg-${messageKey}`;
            const avatarSrc = (userProfileCache[msg.user]?.avatarUrl) || '/favicon.ico';
            const isOwn = msg.user === username;
            const prevMessage = messages[idx - 1];
            const showDateDivider = idx === 0 || !isSameDay(prevMessage?.timestamp, msg.timestamp);
            const isSystemMessage = !!(msg as any).systemType;
            const prevIsSystem = !!(prevMessage as any)?.systemType;
            const groupingWindowMs = messageGrouping === 'aggressive' ? 30 * 60 * 1000 : messageGrouping === 'compact' ? 5 * 60 * 1000 : 0;
            const isGrouped =
              messageGrouping !== 'none' &&
              !showDateDivider &&
              !!prevMessage &&
              !isSystemMessage &&
              !prevIsSystem &&
              prevMessage.user === msg.user &&
              (msg.timestamp - prevMessage.timestamp) <= groupingWindowMs;
            const groupId = groupIds[idx] || messageKey;
            const replyCount = msg.id ? replyCounts[msg.id] || 0 : 0;
            const hasReplies = replyCount > 0;
            const showHeader = !isGrouped && !isSystemMessage;
            const showAvatar = showHeader && !readingMode;
            const showTimestamp = showTimestamps && (!isGrouped || timestampGranularity === 'perMessage');
            const timeMeta = showTimestamp ? formatTimestampLabel(msg.timestamp) : null;
            const systemKey = msg.id || messageKey;
            const isCollapsible = isSystemMessage && systemMessageEmphasis === 'collapsible';
            const isCollapsed = isCollapsible && (collapsedSystemMessages[systemKey] ?? true);
            const paddingVal = isBubbles ? 12 : isMinimalLog ? (compact ? 4 : 6) : compact ? 6 : 8;
            const baseRadius = isBubbles ? 22 : isRetro ? 6 : isMinimalLog ? 6 : 10;
            let backgroundColor = '#0c1524';
            let borderStyle: string | undefined = '1px solid #131c2d';
            let textColor = COLOR_TEXT;
            if (isClassic) {
              backgroundColor = COLOR_PANEL_STRONG;
              borderStyle = BORDER;
            } else if (isBubbles) {
              backgroundColor = isOwn ? (accentIntensity === 'subtle' ? COLOR_PANEL_STRONG : accent) : COLOR_PANEL_STRONG;
              borderStyle = accentIntensity === 'subtle' && isOwn ? '1px solid rgba(148,163,184,0.25)' : 'none';
              textColor = contrastColorFor(backgroundColor);
            } else if (isMinimalLog) {
              backgroundColor = 'transparent';
              borderStyle = 'none';
              textColor = COLOR_TEXT;
            } else if (isRetro) {
              backgroundColor = isOwn ? 'rgba(10,16,28,0.92)' : 'rgba(6,10,20,0.85)';
              borderStyle = '1px solid rgba(148,163,184,0.22)';
            } else if (isFocusStyle) {
              backgroundColor = isOwn ? 'rgba(12,18,30,0.72)' : 'rgba(8,14,26,0.62)';
              borderStyle = '1px solid rgba(148,163,184,0.14)';
            } else {
              backgroundColor = isOwn
                ? 'rgba(23,33,62,0.78)'
                : 'rgba(9,14,30,0.68)';
              borderStyle = '1px solid rgba(99,102,241,0.12)';
            }
            const messageCardStyle: React.CSSProperties = {
              marginBottom: isMinimalLog ? 0 : (isBubbles ? 12 : (compact ? 10 : 16)),
              marginTop: isGrouped ? (isBubbles ? 2 : 6) : 0,
              position: "relative",
              padding: paddingVal,
              borderRadius: baseRadius,
              background: backgroundColor,
              border: borderStyle,
              transition: isFocusStyle ? "none" : "background 0.2s, transform 0.2s, box-shadow 0.2s",
              color: textColor,
              boxShadow: isMinimalLog
                ? 'none'
                : isBubbles
                ? '0 12px 32px rgba(0,0,0,0.35)'
                : isSleek
                  ? '0 14px 32px rgba(2,6,23,0.55)'
                  : '0 4px 14px rgba(0,0,0,0.2)',
              width: isBubbles ? 'fit-content' : '100%',
              marginLeft: isBubbles && isOwn ? 'auto' : undefined,
              marginRight: isBubbles && !isOwn ? 'auto' : undefined,
              maxWidth: isBubbles ? 'min(72%, 540px)' : '100%',
            };
            if (accentIntensity === 'bold') {
              (messageCardStyle as any)['--ch-selection'] = rgbaFromHex(accent, 0.35);
            }
            if (isSleek) {
              messageCardStyle.backdropFilter = 'blur(18px)';
              messageCardStyle.border = borderStyle;
              messageCardStyle.background = backgroundColor;
            }
            if (isMinimalLog) {
              messageCardStyle.borderBottom = '1px solid rgba(148,163,184,0.14)';
              messageCardStyle.borderRadius = 0;
              messageCardStyle.padding = compact ? 4 : 6;
            }
            if (isThreadForward && hasReplies) {
              messageCardStyle.paddingLeft = Math.max(typeof messageCardStyle.padding === 'number' ? messageCardStyle.padding : paddingVal, 24);
            }
            if (isFocusStyle) {
              const focusWindow = 20;
              const isOlder = idx < messages.length - focusWindow;
              if (isOlder && focusHoverGroupId !== groupId) {
                messageCardStyle.opacity = 0.6;
              }
            }
            if (isSystemMessage) {
              if (systemMessageEmphasis === 'normal') {
                messageCardStyle.opacity = 0.9;
                messageCardStyle.padding = Math.max(6, paddingVal - 2);
              } else if (systemMessageEmphasis === 'dimmed') {
                messageCardStyle.opacity = 0.65;
                messageCardStyle.padding = Math.max(6, paddingVal - 2);
              }
              if (isMinimalLog) {
                messageCardStyle.background = 'transparent';
                messageCardStyle.border = 'none';
                messageCardStyle.borderBottom = '1px solid rgba(148,163,184,0.2)';
                messageCardStyle.padding = '6px 2px';
                messageCardStyle.marginBottom = 8;
                messageCardStyle.textAlign = 'center';
              } else if (isBubbles) {
                messageCardStyle.background = 'transparent';
                messageCardStyle.border = 'none';
                messageCardStyle.boxShadow = 'none';
                messageCardStyle.padding = '6px 10px';
                messageCardStyle.marginBottom = 8;
                messageCardStyle.textAlign = 'center';
              } else if (isRetro) {
                messageCardStyle.background = 'transparent';
                messageCardStyle.border = 'none';
                messageCardStyle.boxShadow = 'none';
                messageCardStyle.padding = '6px 8px';
                messageCardStyle.textAlign = 'center';
              }
            }
            if (!isBubbles) {
              messageCardStyle.borderLeft = msg.pinned ? `3px solid ${pinColor}` : "3px solid transparent";
            } else {
              messageCardStyle.borderTopLeftRadius = isOwn ? 18 : 6;
              messageCardStyle.borderTopRightRadius = isOwn ? 6 : 18;
              messageCardStyle.borderBottomLeftRadius = 18;
              messageCardStyle.borderBottomRightRadius = 18;
              if (msg.pinned) {
                messageCardStyle.boxShadow = `0 0 0 2px rgba(250,204,21,0.45), ${messageCardStyle.boxShadow}`;
              }
            }
            const metaColor = isBubbles && isOwn ? 'rgba(248,250,252,0.75)' : isMinimalLog ? '#cbd5e1' : '#a1a1aa';
            const timestampColor = isBubbles ? 'rgba(203,213,225,0.8)' : isRetro ? '#9ca3af' : '#666';
            const replyBackground = isBubbles ? 'rgba(15,23,42,0.7)' : COLOR_PANEL;
            const replyBorder = isBubbles ? '1px solid rgba(30,41,59,0.8)' : BORDER;
            const timestampFontFamily = (isMinimalLog || isRetro) ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : undefined;
            const avatarSize = isMinimalLog ? 26 : isRetro ? 34 : 38;
            const actionContent = (() => {
              if (shiftDown) {
                return (
                  <>
                    {permState.canPin && (
                      <button onClick={() => togglePin(msg.id, !msg.pinned)} className="btn-ghost" title={msg.pinned ? 'Unpin' : 'Pin'} style={{ padding: '2px 6px' }}>
                        <FontAwesomeIcon icon={faThumbtack} />
                      </button>
                    )}
                    <button onClick={() => openEditHistory(msg.id)} className="btn-ghost" title="Edit history" style={{ padding: '2px 6px' }}>
                      <FontAwesomeIcon icon={faClockRotateLeft} />
                    </button>
                    {((msg.user === username && !isCallSystemMessage(msg)) || permState.canManageMessages) && (
                      <>
                        {msg.user === username && !isCallSystemMessage(msg) && (
                          <button onClick={() => handleEdit(msg.id, msg.text)} className="btn-ghost" title="Edit" style={{ padding: '2px 6px' }}>
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(msg.id)} className="btn-ghost" title="Delete" style={{ padding: '2px 6px', color: boldColor }}>
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </>
                    )}
                  </>
                );
              }
              const isOwnMsg = msg.user === username;
              const base = isOwnMsg ? quickButtonsOwn : quickButtonsOthers;
              const havenPreset = adminQuickButtons && (permState.canManageServer || permState.canManageMessages)
                ? (isOwnMsg ? adminQuickButtons.own : adminQuickButtons.others)
                : null;
              const keys = (havenPreset && havenPreset.length ? havenPreset : base) || [];
              const uniqueKeys = Array.from(new Set(keys));
              const buttons: React.ReactElement[] = [];
              uniqueKeys.forEach(key => {
                if (key === 'reply') {
                  buttons.push(
                    <button key="qb-reply" onClick={() => handleReply(msg)} className="btn-ghost" title="Reply" style={{ padding: '2px 6px' }}>
                      <FontAwesomeIcon icon={faReply} />
                    </button>
                  );
                  return;
                }
                if (key === 'react') {
                  if (!permState.canReact) return;
                  buttons.push(
                    <button key="qb-react" onClick={() => setPickerFor(p => p === msg.id ? null : msg.id)} className="btn-ghost" title="Add Reaction" style={{ padding: '2px 6px' }}>
                      <FontAwesomeIcon icon={faFaceSmile} />
                    </button>
                  );
                  return;
                }
                if (key === 'pin') {
                  if (!permState.canPin) return;
                  buttons.push(
                    <button key="qb-pin" onClick={() => togglePin(msg.id, !msg.pinned)} className="btn-ghost" title={msg.pinned ? 'Unpin' : 'Pin'} style={{ padding: '2px 6px' }}>
                      <FontAwesomeIcon icon={faThumbtack} />
                    </button>
                  );
                  return;
                }
                if (key === 'edit') {
                  if (!(isOwnMsg && !isCallSystemMessage(msg))) return;
                  buttons.push(
                    <button key="qb-edit" onClick={() => handleEdit(msg.id, msg.text)} className="btn-ghost" title="Edit" style={{ padding: '2px 6px' }}>
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                  );
                  return;
                }
                if (key === 'delete') {
                  if (!(isOwnMsg || permState.canManageMessages)) return;
                  buttons.push(
                    <button key="qb-delete" onClick={() => handleDelete(msg.id)} className="btn-ghost" title="Delete" style={{ padding: '2px 6px', color: boldColor }}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  );
                  return;
                }
                if (key === 'history') {
                  buttons.push(
                    <button key="qb-history" onClick={() => openEditHistory(msg.id)} className="btn-ghost" title="Edit history" style={{ padding: '2px 6px' }}>
                      <FontAwesomeIcon icon={faClockRotateLeft} />
                    </button>
                  );
                  return;
                }
                if (key === 'copy') {
                  buttons.push(
                    <button key="qb-copy" onClick={() => copyText(msg.text || '')} className="btn-ghost" title="Copy text" style={{ padding: '2px 6px' }}>
                      <FontAwesomeIcon icon={faCopy} />
                    </button>
                  );
                  return;
                }
                if (key === 'link') {
                  buttons.push(
                    <button
                      key="qb-link"
                      onClick={() => {
                        try {
                          const url = new URL(window.location.href);
                          url.searchParams.set('room', roomKey());
                          url.searchParams.set('mid', msg.id);
                          copyText(url.toString());
                          notify({ title: 'Link copied', type: 'success' });
                        } catch {}
                      }}
                      className="btn-ghost"
                      title="Copy link"
                      style={{ padding: '2px 6px' }}
                    >
                      <FontAwesomeIcon icon={faLink} />
                    </button>
                  );
                  return;
                }
                if (key === 'more') {
                  buttons.push(
                    <button
                      key="qb-more"
                      onClick={(e) => {
                        e.preventDefault();
                        setCtxMenu({ open: true, x: (e as any).clientX, y: (e as any).clientY, target: { type: 'message', id: msg.id } });
                      }}
                      className="btn-ghost"
                      title="More"
                      style={{ padding: '2px 6px' }}
                    >
                      <FontAwesomeIcon icon={faBars} />
                    </button>
                  );
                }
              });
              if (!buttons.length) {
                buttons.push(
                  <button
                    key="qb-more-fallback"
                    onClick={(e) => {
                      e.preventDefault();
                      setCtxMenu({ open: true, x: (e as any).clientX, y: (e as any).clientY, target: { type: 'message', id: msg.id } });
                    }}
                    className="btn-ghost"
                    title="More"
                    style={{ padding: '2px 6px' }}
                  >
                    <FontAwesomeIcon icon={faBars} />
                  </button>
                );
              }
              return buttons;
            })();
            const allowActions = !readingMode && !isSystemMessage;
            const hasActions = allowActions && (Array.isArray(actionContent) ? actionContent.length > 0 : !!actionContent);
            const messageCardClasses = ['ch-message-card'];
            messageCardClasses.push(`style-${messageStyle}`);
            if (isSystemMessage) {
              messageCardClasses.push('is-system');
            }
            if (isBubbles) {
              messageCardClasses.push('is-bubble');
              messageCardClasses.push(isOwn ? 'is-own' : 'is-other');
            }
            const dateLabel = formatDateLine(msg.timestamp);
            const collapsedStyle: React.CSSProperties = {
              ...messageCardStyle,
              padding: Math.max(6, paddingVal - 2),
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            };
            const systemTextStyle: React.CSSProperties = isSystemMessage && systemMessageEmphasis === 'dimmed'
              ? { fontSize: msgFontSize - 1 }
              : {};
            const systemContent = isSystemMessage ? (() => {
              const label = msg.text || '';
              const timeLabel = showTimestamp && timeMeta ? timeMeta.label : null;
              const baseStyle: React.CSSProperties = { color: metaColor, ...systemTextStyle };
              if (isMinimalLog) {
                return (
                  <div style={{ ...baseStyle, fontSize: msgFontSize - 2, letterSpacing: 0.4 }}>
                    -- {label} --
                    {timeLabel && <span style={{ marginLeft: 8, fontSize: 11, color: timestampColor, fontFamily: timestampFontFamily }}>[{timeLabel}]</span>}
                  </div>
                );
              }
              if (isRetro) {
                return (
                  <div style={{ ...baseStyle, fontSize: msgFontSize - 2, fontFamily: timestampFontFamily }}>
                    [SYSTEM] {label}
                    {timeLabel && <span style={{ marginLeft: 8, color: timestampColor }}>[{timeLabel}]</span>}
                  </div>
                );
              }
              if (isBubbles) {
                return (
                  <div style={{ ...baseStyle, fontSize: msgFontSize - 2 }}>
                    {label}
                    {timeLabel && <span style={{ marginLeft: 8, fontSize: 11, color: timestampColor }}>{timeLabel}</span>}
                  </div>
                );
              }
              if (isClassic || isThreadForward) {
                return (
                  <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', gap: 8, fontSize: msgFontSize - 2 }}>
                    {timeLabel && <span style={{ fontSize: 11, color: timestampColor, fontFamily: timestampFontFamily }}>{timeLabel}</span>}
                    <span>{label}</span>
                  </div>
                );
              }
              if (isSleek || isFocusStyle) {
                return (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(2,6,23,0.55)', color: metaColor, fontSize: msgFontSize - 2 }}>
                      {label}
                      {timeLabel && <span style={{ marginLeft: 8, fontSize: 11, color: timestampColor }}>{timeLabel}</span>}
                    </span>
                  </div>
                );
              }
              return <div style={baseStyle}>{label}</div>;
            })() : null;
            const inviteCode = extractInviteCode(msg.text || "");
            const invitePreview = inviteCode ? invitePreviews[inviteCode] : null;
            const inviteStatus = inviteCode ? invitePreviewStatus[inviteCode] : undefined;
            const inviteError = inviteCode ? inviteErrors[inviteCode] : null;
            const inviteJoin = inviteCode ? inviteJoinStatus[inviteCode] : "idle";
            const inviteHaven = invitePreview?.haven || inviteCode || "";
            const inviteAlreadyJoined = inviteHaven ? !!havens[inviteHaven] : false;
            return (
            <Fragment key={messageKey}>
              {showDateDivider && (
                <div className="ch-date-divider">
                  <span>{dateLabel}</span>
                </div>
              )}
              {isCollapsible && isCollapsed ? (
                <div
                  ref={(el) => { if (msg.id) messageRefs.current[msg.id] = el; }}
                  onClick={() => setCollapsedSystemMessages((prev) => ({ ...prev, [systemKey]: false }))}
                  style={collapsedStyle}
                  className={messageCardClasses.join(' ')}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                  <div style={{ fontSize: msgFontSize - 1, color: metaColor, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.text}
                  </div>
                  {showTimestamp && timeMeta && (
                    <span style={{ fontSize: 11, color: timestampColor }} title={timeMeta.title || undefined}>{timeMeta.label}</span>
                  )}
                </div>
              ) : (
              <div
                ref={(el) => { if (msg.id) messageRefs.current[msg.id] = el; }}
                onContextMenu={(e) => openCtx(e, { type: 'message', id: msg.id })}
                onMouseEnter={() => { if (isFocusStyle) setFocusHoverGroupId(groupId); }}
                onMouseLeave={() => { if (isFocusStyle) setFocusHoverGroupId(null); }}
                style={messageCardStyle}
                className={messageCardClasses.join(' ')}
              >
              {/* In-box actions: show on hover. Configurable quick buttons, Shift = full tools */}
              {hasActions && (
                <div
                  className={`ch-message-actions${isBubbles ? ' ch-message-actions-bubble' : ''}`}
                  data-shift={shiftDown ? 'full' : 'quick'}
                  data-own={isOwn ? 'own' : 'other'}
                >
                  {actionContent}
                </div>
              )}
              {isThreadForward && hasReplies && (
                <div className="ch-branch-indicator" aria-hidden="true">
                  <span className="ch-branch-line" />
                  <span className="ch-branch-hook" />
                </div>
              )}
              {(showHeader || showTimestamp) && (
                <div style={{ fontSize: isMinimalLog ? msgFontSize - 2 : msgFontSize - 1, color: metaColor, marginBottom: compact ? 4 : 6, wordBreak: "break-word", whiteSpace: "pre-line", display: 'flex', alignItems: 'center', gap: 10 }}>
                  {showAvatar && (
                    <div
                      className="ch-message-avatar"
                      style={{ position: 'relative', width: avatarSize, height: avatarSize, flex: '0 0 auto' }}
                      onMouseEnter={() => beginStreamerReveal(revealKey)}
                      onMouseLeave={() => endStreamerReveal(revealKey)}
                    >
                      <img
                        src={avatarSrc}
                        alt={displayNameFor(msg.user)}
                        {...avatarLoadProps}
                        style={{
                          width: avatarSize,
                          height: avatarSize,
                          borderRadius: '50%',
                          border: BORDER,
                          objectFit: 'cover'
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          border: `2px solid ${COLOR_PANEL}`,
                          background: statusColor(presenceMap[msg.user]),
                        }}
                      />
                    </div>
                  )}
                  {showTimestamp && timeMeta && isMinimalLog && (
                    <span style={{ fontSize: 11, color: timestampColor, fontFamily: timestampFontFamily }} title={timeMeta.title || undefined}>[{timeMeta.label}]</span>
                  )}
                  {showHeader && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => { setProfileUser(msg.user); setProfileContext(selectedHaven !== '__dms__' ? 'Viewing Haven Profile' : undefined); }}
                        style={{ color: isBubbles ? textColor : accent, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {renderDisplayName(msg.user, { revealKey })}
                      </button>
                      {renderCallStatusBadge(msg.user)}
                      {isThreadForward && hasReplies && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(148,163,184,0.2)', color: '#cbd5e1', background: 'rgba(2,6,23,0.6)' }}>
                          {replyCount} repl{replyCount === 1 ? 'y' : 'ies'}
                        </span>
                      )}
                    </div>
                  )}
                  {showTimestamp && timeMeta && !isMinimalLog && (
                    <span style={{ marginLeft: showHeader ? 8 : 0, fontSize: 11, color: timestampColor, fontFamily: timestampFontFamily }} title={timeMeta.title || undefined}>{timeMeta.label}</span>
                  )}
                  {msg.edited && <span style={{ marginLeft: 6, fontSize: 10, color: "#facc15" }}>(edited)</span>}
                  {isCollapsible && (
                    <button
                      type="button"
                      onClick={() => setCollapsedSystemMessages((prev) => ({ ...prev, [systemKey]: true }))}
                      className="btn-ghost"
                      style={{ padding: '2px 6px', marginLeft: 'auto' }}
                      title="Collapse"
                    >
                      <FontAwesomeIcon icon={faChevronDown} />
                    </button>
                  )}
                </div>
              )}
              {msg.replyToId && (() => {
                const parent = messages.find(m => m.id === msg.replyToId);
                if (!parent) return null;
                return (
                  <div onClick={() => { const el = messageRefs.current[msg.replyToId!]; el?.scrollIntoView({ behavior: "smooth", block: "center" }); }} style={{ fontSize: 12, color: COLOR_TEXT_MUTED, background: replyBackground, border: replyBorder, borderRadius: 6, padding: 6, marginBottom: 6, cursor: "pointer" }}>
                    <FontAwesomeIcon icon={faReply} style={{ marginRight: 6 }} /> Replying to <strong>{renderDisplayName(parent.user, { prefix: '@', revealKey })}</strong>: <span style={{ opacity: 0.8 }}>{parent.text.slice(0, 64)}{parent.text.length > 64 ? "..." : ""}</span>
                  </div>
                );
              })()}
              {editId === msg.id ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    style={{ flex: 1, background: "#18181b", color: "#fff", border: "1px solid #333", borderRadius: 4, padding: 4, fontSize: 14 }}
                  />
                  <button onClick={() => handleEditSubmit(msg.id)} style={{ background: "#60a5fa", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Save</button>
                  <button onClick={() => setEditId(null)} style={{ background: "#23232a", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <div style={{ wordBreak: "break-word", whiteSpace: "pre-line", fontSize: msgFontSize, fontFamily: monospaceMessages ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : undefined, ...systemTextStyle }}>
                  {isSystemMessage ? (
                    systemContent
                  ) : (
                    <>
                      {inviteCode && (
                        <div style={{ marginBottom: 8 }}>
                          <InviteCard
                            preview={invitePreview}
                            status={inviteStatus}
                            error={inviteError}
                            isJoined={inviteAlreadyJoined}
                            isBusy={inviteJoin === "joining"}
                            onJoin={() => inviteCode && joinInvite(inviteCode)}
                          />
                        </div>
                      )}
                      {(() => {
                        const base = chResolved[msg.id] ?? msg.text ?? "";
                        const withMentions = base.replace(new RegExp(`@${username}\\b`, 'g'), `**[@${username}](mention://self)**`);
                        return (
                          <ReactMarkdown
                            // `breaks` is supported at runtime but missing in the type defs
                            // @ts-expect-error `breaks` is a valid react-markdown prop
                            breaks
                            components={{
                              a: (props: any) => {
                                const href = props.href || '';
                                if (href === 'mention://self') {
                                  return <span style={{ color: mentionColor, fontWeight: 600 }}>{props.children}</span>;
                                }
                                return <a {...props} style={{ color: accent }} />;
                              },
                              code: (props: any) => {
                                const { children, ...rest } = props;
                                const text = String(children ?? '');
                                return (
                                  <code
                                    {...rest}
                                    onDoubleClick={() => { try { navigator.clipboard.writeText(text); } catch {} }}
                                    style={{
                                      background: "#23232a",
                                      color: codeColor,
                                      padding: "2px 4px",
                                      borderRadius: 4,
                                    }}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                              strong: (props) => <strong {...props} style={{ color: boldColor }} />,
                              em: (props) => <em {...props} style={{ color: italicColor }} />,
                              blockquote: (props) => <blockquote {...props} style={{ borderLeft: `3px solid ${accent}`, margin: 0, paddingLeft: 12, color: "#a1a1aa" }} />,
                              img: (props) => {
                                const { alt, ...rest } = props as React.ImgHTMLAttributes<HTMLImageElement>;
                                // Right-click images in markdown to set avatar/banner
                                return (
                                  <img
                                    {...rest}
                                    alt={alt ?? ""}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      const src = (rest.src as string) || "";
                                      const name = alt || "";
                                      openCtx(e as any, { type: "attachment", data: { url: src, name, type: "image/*" } });
                                    }}
                                    style={{ maxWidth: "360px", borderRadius: 6, border: BORDER, background: COLOR_PANEL }}
                                  />
                                );
                              },
                              li: (props) => <li {...props} style={{ marginLeft: 16 }} />,
                            }}
                          >
                            {withMentions}
                          </ReactMarkdown>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
              {msg.attachments && msg.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {msg.attachments.map((a, i) => (
                    <div key={`${msg.id}-att-${i}`} onContextMenu={(e)=> openCtx(e, { type: 'attachment', data: a })} title={isImage(a.type, a.name) ? 'Right click: set as avatar/banner' : undefined}>
                      <AttachmentViewer attachment={a} />
                    </div>
                  ))}
                </div>
              )}
              {(msg.reactions && Object.keys(msg.reactions).length > 0) && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, opacity: readingMode ? 0.5 : 1 }}>
                  {Object.entries(msg.reactions).map(([emoji, users]) => {
                    const reacted = users.includes(username);
                    const count = users.length;
                    return (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(msg.id, emoji)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: isMinimalLog ? "1px 6px" : "2px 8px",
                          borderRadius: 999,
                          border: BORDER,
                          background: reacted ? COLOR_CARD : COLOR_PANEL,
                          color: reacted ? "#93c5fd" : isMinimalLog ? "#94a3b8" : "#cbd5e1",
                          cursor: "pointer",
                          opacity: isMinimalLog ? 0.85 : 1,
                        }}
                      >
                        <span style={{ fontSize: isMinimalLog ? 12 : 14 }}>{emoji}</span>
                        <span style={{ fontSize: isMinimalLog ? 10 : 12 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {pickerFor === msg.id && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, zIndex: 70 }}>
                  <div className="glass" style={{ width: 'min(720px, 92vw)', maxHeight: '70vh', overflow: 'hidden', borderRadius: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottom: BORDER }}>
                      <div style={{ color: COLOR_TEXT, fontWeight: 600 }}>Add Reaction</div>
                      <button onClick={() => setPickerFor(null)} className="btn-ghost" style={{ padding: '4px 8px' }}><FontAwesomeIcon icon={faXmark} /></button>
                    </div>
                    <div style={{ padding: 10 }}>
                      <EmojiPicker onPick={(ch) => { toggleReaction(pickerFor!, ch); setPickerFor(null); }} onClose={() => setPickerFor(null)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
            </Fragment>
            );
          })}
      {typingUsers.length > 0 && (
        <div style={{ color: "#60a5fa", fontSize: 13, margin: "8px 0 0 16px" }}>
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}
      <div ref={messagesEndRef} />
      </Fragment>
      )}
          {(!isAtBottom || newSinceScroll > 0) && (
            <div style={{ position: 'absolute', right: 16, bottom: 16 }}>
              <button className="btn-ghost" onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' as ScrollBehavior }); setIsAtBottom(true); setNewSinceScroll(0); }} style={{ padding: '8px 12px', border: BORDER, borderRadius: 999, background: COLOR_PANEL, color: COLOR_TEXT }}>
                Jump to latest {newSinceScroll > 0 ? `(${newSinceScroll})` : ''}
              </button>
            </div>
          )}
          </div>
        </div>
        {/* Members sidebar with smooth slide + search */}
        {selectedHaven !== '__dms__' && (
          <aside style={{ position: 'absolute', top: 0, right: showMembers ? 0 : -260, bottom: 0, width: 260, borderLeft: BORDER, background: COLOR_PANEL, padding: 12, transition: 'right 160ms ease', pointerEvents: showMembers ? 'auto' : 'none', opacity: showMembers ? 1 : 0.0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: BORDER, paddingBottom: 8 }}>
              <div style={{ color: COLOR_TEXT, fontWeight: 600 }}>
                Members
              </div>
              <button className="btn-ghost" onClick={() => setShowMembers(false)} title="Close" style={{ padding: '4px 8px' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div style={{ paddingTop: 8 }}>
              <input value={membersQuery} onChange={(e)=> setMembersQuery(e.target.value)} placeholder="Search members" className="input-dark" style={{ width: '100%', padding: 8, borderRadius: 8 }} />
              <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, marginTop: 6 }}>
                {havenMembersLoading
                  ? 'Loading members...'
                  : `${havenMembers.filter((name) => isUserOnline(name)).length} online / ${havenMembers.length} total`}
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 88px)', paddingTop: 8 }}>
              {havenMembersLoading && havenMembers.length === 0 ? (
                <div style={{ color: COLOR_TEXT_MUTED }}>Fetching members...</div>
              ) : havenMembers.length === 0 ? (
                <div style={{ color: COLOR_TEXT_MUTED }}>No members found.</div>
              ) : (() => {
                const query = membersQuery.trim().toLowerCase();
                const filtered = havenMembers.filter(name => name.toLowerCase().includes(query));
                const ordered = filtered.slice().sort((a, b) => {
                  const onlineA = isUserOnline(a) ? 0 : 1;
                  const onlineB = isUserOnline(b) ? 0 : 1;
                  if (onlineA !== onlineB) return onlineA - onlineB;
                  const roleA = rolePriorityFor(a);
                  const roleB = rolePriorityFor(b);
                  if (roleA !== roleB) return roleA - roleB;
                  return a.localeCompare(b);
                });
                return ordered.map((name) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderBottom: BORDER }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor(statusForUser(name)) }} />
                    <button onClick={() => { setProfileUser(name); setProfileContext('Viewing Haven Profile'); }} className="btn-ghost" style={{ padding: 0, color: COLOR_TEXT }}>@{name}</button>
                  </div>
                ));
              })()}
            </div>
          </aside>
        )}
        {!(selectedHaven === "__dms__" && !selectedDM) && (
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(); }}
          style={{
            display: "flex",
            alignItems: "center",
            borderTop: BORDER,
            padding: 12,
            background: "rgba(17,24,39,0.6)",
            position: 'relative'
          }}
        >
          {/* Reply bar */}
          {replyTo && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 12, right: 12, background: COLOR_PANEL, border: BORDER, borderRadius: 10, zIndex: 11, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faReply} />
              <div style={{ color: COLOR_TEXT, fontSize: 13 }}>
                Replying to <strong>@{replyTo.user}</strong>: <span style={{ color: COLOR_TEXT_MUTED }}>{replyTo.text.slice(0, 80)}{replyTo.text.length > 80 ? '...' : ''}</span>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setReplyTo(null)} style={{ marginLeft: 'auto', padding: '4px 8px' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          )}
          {/* Mention popup */}
          {mentionOpen && (
            <div ref={mentionPopupRef} style={{ background: COLOR_PANEL, border: BORDER, borderRadius: 10, ...mentionPopupStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottom: BORDER }}>
                <div style={{ color: COLOR_TEXT, fontWeight: 600 }}>@ Mention</div>
                <button type="button" className="btn-ghost" onClick={() => setMentionOpen(false)} style={{ padding: '2px 6px' }}><FontAwesomeIcon icon={faXmark} /></button>
              </div>
              <div style={{ padding: 8 }}>
                <input value={mentionQuery} onChange={(e)=> setMentionQuery(e.target.value)} placeholder="Search users" className="input-dark" style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                {mentionList.map((u, idx) => {
                  const isActive = idx === mentionActiveIndex;
                  return (
                    <div
                      key={u.username}
                      onClick={() => applyMentionSelection(u.username)}
                      style={{
                        padding: '8px 12px',
                        borderBottom: BORDER,
                        cursor: 'pointer',
                        color: COLOR_TEXT,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor(presenceMap[u.username]) }} />
                      <span>@{u.username}</span>
                      <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 12 }}>{u.displayName}</span>
                    </div>
                  );
                })}
                {mentionList.length === 0 && (
                  <div style={{ padding: 12, color: COLOR_TEXT_MUTED }}>No users found</div>
                )}
              </div>
            </div>
          )}
          {/* Upload previews + progress */}
          {(uploadItems.length > 0 || pendingFiles.length > 0) && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 12, right: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {uploadItems.map(u => (
                <div key={u.id} style={{ border: BORDER, background: COLOR_PANEL, borderRadius: 8, padding: 8, width: 260 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {u.type?.startsWith('image/') && u.localUrl ? (
                      <img src={u.localUrl} alt={u.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>{u.name}</span>
                    )}
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{(u.size/1024).toFixed(1)} KB</div>
                  </div>
                  <div style={{ marginTop: 6, height: 6, background: COLOR_PANEL_STRONG, borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${u.progress}%`, height: '100%', background: '#60a5fa', transition: 'width .15s linear' }} />
                  </div>
                </div>
              ))}
              {pendingFiles.map((f, i) => (
                <div key={`pf-${i}`} style={{ border: BORDER, background: COLOR_PANEL, borderRadius: 8, padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {f.type?.startsWith('image/') ? (
                    <img src={f.url} alt={f.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <span style={{ color: '#cbd5e1' }}>{f.name}</span>
                  )}
                  {typeof f.size === 'number' && <span style={{ fontSize: 11, color: '#9ca3af' }}>{(f.size/1024).toFixed(1)} KB</span>}
                  <button className="btn-ghost" onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ marginLeft: 'auto', padding: '4px 8px' }}><FontAwesomeIcon icon={faXmark} /></button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (!permState.canSend) return;
              if (mentionOpen) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (mentionList.length > 0) {
                    setMentionActiveIndex((idx) => Math.min(mentionList.length - 1, idx + 1));
                  }
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (mentionList.length > 0) {
                    setMentionActiveIndex((idx) => Math.max(0, idx - 1));
                  }
                  return;
                }
                if (e.key === "Enter") {
                  const target = mentionList[mentionActiveIndex];
                  if (target) {
                    e.preventDefault();
                    applyMentionSelection(target.username);
                    return;
                  }
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMentionOpen(false);
                  setMentionQuery("");
                  setMentionAnchor(null);
                  return;
                }
              }
              if (e.key === "Enter" && (e.ctrlKey || !e.shiftKey)) { e.preventDefault(); sendMessage(); }
              if (e.key === 'ArrowUp' && !input) {
                const mine = [...messages].filter(m => m.user === username).pop();
                if (mine) { e.preventDefault(); handleEdit(mine.id, mine.text); }
              }
            }}
            placeholder={permState.canSend
              ? (selectedDM ? `Message ${(() => { const dm = dms.find(d => d.id === selectedDM); return dm ? getDMTitle(dm) : 'DM'; })()}` : `Message #${selectedChannel}`)
              : "You don\u2019t have permission to send messages in this channel"}
            disabled={!permState.canSend}
            style={{
              flex: 1,
              marginRight: 8,
              background: "#18181b",
              color: permState.canSend ? "#fff" : "#6b7280",
              border: "1px solid #333",
              borderRadius: 4,
              padding: 8,
              fontSize: 16,
              opacity: permState.canSend ? 1 : 0.7
            }}
          />
          <label title={uploading ? "Uploading..." : "Attach file (max 25MB)"} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={async (e) => {
              const inputEl = e.currentTarget as HTMLInputElement;
              const files = Array.from(inputEl.files || []);
              if (files.length === 0) return;
              setUploading(true);
              try {
                for (const f of files) {
                  if (f.size > 25 * 1024 * 1024) { alert(`File ${f.name} exceeds 25MB limit`); continue; }
                  await startUpload(f);
                }
              } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }} />
            <button type="button" className="btn-ghost" style={{ padding: '8px 10px' }} onClick={() => fileInputRef.current?.click()}>
              <FontAwesomeIcon icon={faPaperclip} />
            </button>
          </label>
          {permState.canSend && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const el = inputRef.current;
                if (!el) {
                  setMentionOpen(true);
                  return;
                }
                const value = el.value;
                const pos = el.selectionStart ?? value.length;
                const before = value.slice(0, pos);
                const after = value.slice(pos);
                const next = `${before}@${after}`;
                setInput(next);
                requestAnimationFrame(() => {
                  try {
                    el.focus();
                    const cursor = before.length + 1;
                    el.setSelectionRange(cursor, cursor);
                    const ctx = getMentionContext(next, cursor);
                    if (ctx) {
                      setMentionOpen(true);
                      setMentionQuery(ctx.query);
                      setMentionAnchor({ start: ctx.start, end: ctx.end });
                    }
                  } catch {}
                });
              }}
              title="Mention someone (@)"
              style={{ marginRight: 8, padding: "8px 10px" }}
            >
              <FontAwesomeIcon icon={faAt} />
            </button>
          )}
          <button
            type="submit"
            className="btn-ghost"
            title="Send"
            disabled={!permState.canSend}
            style={{ padding: '8px 10px', opacity: permState.canSend ? 1 : 0.4 }}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </form>
        )}
      </div>
      {/* Incoming call popup when not in DM */}
      {incomingCall && callState === 'idle' && (
        <div
          style={{
            position: 'fixed',
            top: isMobile ? 12 : 16,
            right: isMobile ? 8 : 16,
            zIndex: 85,
            padding: 10,
            borderRadius: 10,
            border: BORDER,
            background: 'rgba(15,23,42,0.96)',
            color: COLOR_TEXT,
            maxWidth: isMobile ? 'calc(100vw - 16px)' : 320,
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
          }}
        >
          {(() => {
            const dm = dms.find(d => d.id === incomingCall.room);
            const label = dm
              ? `${isGroupDMThread(dm) ? 'Group DM' : 'Direct Message'}  -  ${getDMTitle(dm)}`
              : 'Direct Message';
            return (
              <>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Incoming call</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                  {incomingCall.from} is calling you in <span style={{ color: COLOR_TEXT }}>{label}</span>.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      declineCall(incomingCall.room);
                    }}
                    style={{ padding: '4px 8px', fontSize: 12 }}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      const room = incomingCall.room;
                      const caller = incomingCall.from;
                      const offer = pendingOfferRef.current;
                      if (!offer) return;
                      setIncomingCall(null);
                      try {
                        setCallError(null);
                        setActiveCallDM(room);
                        setCallState('calling');
                        setSelectedHaven('__dms__');
                        setSelectedDM(room);
                        try {
                          if (ringAudioRef.current) {
                            ringAudioRef.current.pause();
                            ringAudioRef.current.currentTime = 0;
                          }
                        } catch {}
                        ringAudioRef.current = null;
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        localStreamRef.current = stream;
                        markJoined(true);
                        if (localAudioRef.current) {
                          localAudioRef.current.srcObject = stream;
                        }
                        const pc = setupPeer();
                        stream.getTracks().forEach(t => pc.addTrack(t, stream));
                        await pc.setRemoteDescription(new RTCSessionDescription(offer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socketRef.current?.emit('call-answer', { room, answer, from: username });
                        setCallState('in-call');
                        const startedAt = Date.now();
                        setCallStartedAt(startedAt);
                        const roster = applyParticipantUpdate([
                          {
                            user: username,
                            status: 'connected',
                            muted: isMuted,
                            deafened: isDeafened,
                            videoEnabled: isCameraOn,
                            screenSharing: isScreenSharing,
                          },
                          { user: caller, status: 'connected' },
                        ]);
                        socketRef.current?.emit('call-state', { room, state: 'in-call', from: username, startedAt, participants: roster });
                      } catch (e: any) {
                        setCallError(e?.message || 'Could not join call');
                        setCallState('idle');
                      }
                    }}
                    style={{ padding: '4px 8px', fontSize: 12, borderRadius: 999, border: '1px solid #16a34a', color: '#bbf7d0' }}
                  >
                    Accept
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
      {/* Call dock when viewing other pages */}
      {callState !== 'idle' && activeCallDM && !viewingCallDM && (() => {
        const dm = dms.find(d => d.id === activeCallDM);
        const roster = callParticipants.length
          ? callParticipants
          : (dm ? dm.users.map(user => ({ user, status: 'ringing' as const })) : []);
        const preview = roster.slice(0, 3);
        const extra = roster.length - preview.length;
        const label = callState === 'calling' ? 'Calling...' : 'In call';
        const title = dm
          ? `${isGroupDMThread(dm) ? 'Group DM' : 'Direct Message'}  -  ${getDMTitle(dm)}`
          : 'Direct Message';
        return (
          <div
            onContextMenu={(e) => openCtx(e, { type: 'call', data: { room: activeCallDM } })}
            style={{
              position: 'fixed',
              bottom: isMobile ? 76 : 18,
              left: isMobile ? 8 : 16,
              zIndex: 80,
              padding: 12,
              borderRadius: 12,
              border: BORDER,
              background: 'rgba(15,23,42,0.95)',
              color: COLOR_TEXT,
              width: isMobile ? 'calc(100vw - 16px)' : 320,
              boxShadow: '0 12px 30px rgba(0,0,0,0.45)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: callState === 'calling' ? '#f59e0b' : '#22c55e', display: 'inline-block' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{title}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                {preview.map((part) => {
                  const profile = userProfileCache[part.user];
                  const avatar = profile?.avatarUrl || '/favicon.ico';
                  const color = part.status === 'connected' ? '#22c55e' : '#f59e0b';
                  return (
                    <img
                      key={part.user}
                      src={avatar}
                      alt={part.user}
                      {...avatarLoadProps}
                      title={`${part.user}  -  ${part.status === 'connected' ? 'Connected' : 'Ringing'}`}
                      style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${color}` }}
                    />
                  );
                })}
                {extra > 0 && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: COLOR_PANEL_STRONG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                    +{extra}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={toggleMute}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: BORDER,
                  background: isMuted ? COLOR_PANEL_STRONG : COLOR_PANEL_ALT,
                  color: COLOR_TEXT,
                }}
              >
                <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} /> {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowFullscreenCall(true)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: BORDER, background: COLOR_PANEL_ALT, color: COLOR_TEXT }}
              >
                <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} /> Full Screen
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={endCall}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #7f1d1d', background: '#7f1d1d', color: '#fff' }}
              >
                Hang Up
              </button>
            </div>
          </div>
        );
      })()}
      {showCallPiP && activeCallDM && (
        <div
          style={{
            position: 'fixed',
            left: pipPosition.x,
            top: pipPosition.y,
            width: pipSize.width,
            height: pipSize.height,
            minWidth: MIN_PIP_WIDTH,
            minHeight: MIN_PIP_HEIGHT,
            borderRadius: 18,
            border: BORDER,
            background: 'rgba(4,7,17,0.95)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
            color: COLOR_TEXT,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 115,
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
          }}
        >
          <div
            onMouseDown={beginPipInteraction('move')}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              gap: 10,
              borderBottom: '1px solid rgba(100,116,139,0.25)',
              cursor: isMobile ? 'default' : 'move',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'rgba(59,130,246,0.15)' }}>
                {renderCallStatusIconGraphic(viewerCallMeta, 14)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: COLOR_TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {callLocationInfo?.label || 'Direct Call'}
                </span>
                <span style={{ fontWeight: 600 }}>Live Call</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: '#cbd5f5' }}>
                {`${Math.floor(callElapsed / 60).toString().padStart(1, '0')}:${(callElapsed % 60).toString().padStart(2, '0')}`}
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={toggleMute}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                style={{ padding: '6px 8px', borderRadius: 999, border: BORDER, background: isMuted ? COLOR_PANEL_STRONG : COLOR_PANEL_ALT, color: COLOR_TEXT }}
              >
                <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} />
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowFullscreenCall(true)}
                title="Open call controls"
                style={{ padding: '6px 8px', borderRadius: 999, border: BORDER, background: COLOR_PANEL_ALT, color: COLOR_TEXT }}
              >
                <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, gap: 8, minHeight: 0 }}>
            <div style={{ flex: 1, position: 'relative', borderRadius: 14, border: BORDER, background: '#01050e', overflow: 'hidden' }}>
              {remoteVideoAvailable ? (
                <video
                  ref={pipRemoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: COLOR_TEXT_MUTED, fontSize: 12, padding: '0 16px', textAlign: 'center' }}>
                  <FontAwesomeIcon icon={faVideo} style={{ fontSize: 22, color: '#60a5fa' }} />
                  <span>Waiting for someone to share a camera or screen.</span>
                </div>
              )}
              {(isCameraOn || isScreenSharing) && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    width: Math.max(120, Math.min(180, pipSize.width / 2.5)),
                    borderRadius: 12,
                    border: BORDER,
                    overflow: 'hidden',
                    background: 'rgba(4,7,17,0.85)',
                  }}
                >
                  <video
                    ref={pipLocalVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: Math.max(80, Math.min(140, pipSize.height * 0.45)),
                      objectFit: isScreenSharing ? 'contain' : 'cover',
                      background: COLOR_PANEL_STRONG,
                    }}
                  />
                </div>
              )}
            </div>
            <div style={{ borderRadius: 12, border: BORDER, background: 'rgba(3,6,16,0.8)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minHeight: 54 }}>
              {pipParticipantPreview.length === 0 ? (
                <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>Waiting for participants...</div>
              ) : (
                pipParticipantPreview.map((p) => {
                  const profile = userProfileCache[p.user];
                  const avatar = profile?.avatarUrl || '/favicon.ico';
                  const meta = getCallStatusMeta(p.user) || defaultCallMeta;
                  const revealKey = `pip-${p.user}`;
                  return (
                    <div
                      key={`pip-${p.user}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(8,13,26,0.9)' }}
                      onMouseEnter={() => beginStreamerReveal(revealKey)}
                      onMouseLeave={() => endStreamerReveal(revealKey)}
                    >
                      <div style={{ position: 'relative', width: 28, height: 28 }}>
                        <img src={avatar} alt={p.user} {...avatarLoadProps} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', bottom: -4, right: -4 }}>
                          {renderCallStatusIconGraphic(meta, 10)}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{renderDisplayName(p.user, { revealKey })}</span>
                    </div>
                  );
                })
              )}
              {pipParticipantOverflow > 0 && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px dashed rgba(148,163,184,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                  +{pipParticipantOverflow}
                </div>
              )}
            </div>
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(100,116,139,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {callLocationInfo?.label || 'Direct Call'}
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={endCall}
              style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid #7f1d1d', background: '#7f1d1d', color: '#fff' }}
            >
              Hang Up
            </button>
          </div>
          {!isMobile && (
            <div
              onMouseDown={beginPipInteraction('resize')}
              style={{
                position: 'absolute',
                width: 22,
                height: 22,
                bottom: 4,
                right: 4,
                cursor: 'nwse-resize',
                borderRight: '2px solid rgba(148,163,184,0.4)',
                borderBottom: '2px solid rgba(148,163,184,0.4)',
                borderBottomRightRadius: 8,
              }}
            />
          )}
        </div>
      )}
      {showGroupDM && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
          }}
          onClick={closeGroupDMModal}
        >
          <div
            className="glass"
            style={{ width: 'min(520px, 94vw)', maxHeight: '90vh', overflow: 'hidden', borderRadius: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottom: BORDER }}>
              <div style={{ fontWeight: 600 }}>New Group DM</div>
              <button className="btn-ghost" onClick={closeGroupDMModal} style={{ padding: '4px 8px' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <form onSubmit={handleGroupDMSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, color: COLOR_TEXT }}>
              <div style={{ fontSize: 13, color: COLOR_TEXT_MUTED }}>
                Select up to {MAX_GROUP_DM_TARGETS} friends ({MAX_GROUP_DM_MEMBERS} people total with you) to start a group conversation.
              </div>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Group name (optional)</span>
                <input
                  value={groupDMName}
                  onChange={(e) => setGroupDMName(e.target.value)}
                  className="input-dark"
                  placeholder="e.g. Game Squad"
                  style={{ padding: 8, borderRadius: 8 }}
                />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
                  <span>Select friends</span>
                  <span>{groupDMSelection.length + 1}/{MAX_GROUP_DM_MEMBERS} members</span>
                </div>
                <input
                  value={groupDMSearch}
                  onChange={(e) => setGroupDMSearch(e.target.value)}
                  placeholder="Search friends"
                  className="input-dark"
                  style={{ padding: 8, borderRadius: 8 }}
                />
                <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredGroupFriends.length === 0 ? (
                    <div style={{ color: COLOR_TEXT_MUTED, fontSize: 13 }}>
                      {friendsState.friends.length === 0 ? 'Add some friends to start a group DM.' : 'No friends match your search.'}
                    </div>
                  ) : (
                    filteredGroupFriends.map((user) => {
                      const selected = groupDMSelection.includes(user);
                      const disabled = !selected && groupDMSelection.length >= MAX_GROUP_DM_TARGETS;
                      const avatar = userProfileCache[user]?.avatarUrl || '/favicon.ico';
                      const status = presenceMap[user];
                      return (
                        <label
                          key={`gdm-${user}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 10,
                            border: BORDER,
                            background: selected ? COLOR_CARD : COLOR_PANEL_ALT,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.45 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleGroupDMUser(user)}
                            disabled={disabled}
                            style={{ accentColor: accent }}
                          />
                          <div style={{ position: 'relative' }}>
                            <img src={avatar} alt={user} {...avatarLoadProps} style={{ width: 32, height: 32, borderRadius: '50%', border: BORDER, objectFit: 'cover' }} />
                            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', border: '2px solid #0f172a', background: statusColor(status) }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 600 }}>{renderDisplayName(user, { revealKey: `gdm-${user}` })}</span>
                            <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>@{user}</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
              {groupDMError && (
                <div style={{ color: '#fca5a5', fontSize: 12 }}>
                  {groupDMError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn-ghost" onClick={closeGroupDMModal} style={{ padding: '6px 10px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-ghost"
                  disabled={groupDMSelection.length < 2 || groupDMLoading}
                  style={{
                    padding: '6px 14px',
                    color: groupDMSelection.length >= 2 && !groupDMLoading ? accent : '#6b7280',
                    cursor: groupDMSelection.length >= 2 && !groupDMLoading ? 'pointer' : 'not-allowed',
                  }}
                >
                  {groupDMLoading ? 'Creating...' : 'Create Group DM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {groupSettingsTarget && (() => {
        const dm = dms.find((entry) => entry.id === groupSettingsTarget);
        if (!dm) return null;
        const members = dm.users;
        const owner = dmOwner(dm);
        const moderators = dmModerators(dm);
        const isOwner = owner === username;
        const isModerator = currentIsGroupModerator(dm);
        const canRemoveMember = (member: string) => {
          if (!isModerator) return member === username;
          if (member === owner) return isOwner && member === username;
          if (member === username) return true;
          if (isOwner) return true;
          return !moderators.includes(member);
        };
        const addableFriends = friendsState.friends.filter((friend) => !members.includes(friend));
        const addQuery = groupAddQuery.trim().toLowerCase();
        const filteredAddable = addQuery
          ? addableFriends.filter((friend) => friend.toLowerCase().includes(addQuery) || displayNameFor(friend).toLowerCase().includes(addQuery))
          : addableFriends;
        const remainingSlots = MAX_GROUP_DM_MEMBERS - members.length;
        const showAddSection = isGroupDMThread(dm) && remainingSlots > 0 && addableFriends.length > 0;
        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 95,
            }}
            onClick={closeGroupSettingsModal}
          >
            <div
              className="glass"
              style={{ width: 'min(520px, 96vw)', maxHeight: '92vh', overflow: 'hidden', borderRadius: 16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottom: BORDER }}>
                <div style={{ fontWeight: 600 }}>Group Settings</div>
                <button className="btn-ghost" onClick={closeGroupSettingsModal} style={{ padding: '4px 8px' }}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, color: COLOR_TEXT, maxHeight: 'calc(92vh - 120px)', overflowY: 'auto' }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>Group name</span>
                  <input
                    value={groupSettingsDraft.name}
                    onChange={(e) => setGroupSettingsDraft((prev) => ({ ...prev, name: e.target.value }))}
                    className="input-dark"
                    style={{ padding: 8, borderRadius: 8 }}
                    placeholder="Group name"
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>Avatar URL</span>
                  <input
                    value={groupSettingsDraft.avatarUrl}
                    onChange={(e) => setGroupSettingsDraft((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                    className="input-dark"
                    style={{ padding: 8, borderRadius: 8 }}
                    placeholder="https://example.com/avatar.png"
                  />
                  {groupSettingsDraft.avatarUrl && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={groupSettingsDraft.avatarUrl} alt="Preview" {...avatarLoadProps} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', border: BORDER }} />
                      <span style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>Preview</span>
                    </div>
                  )}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Members</div>
                  {members.map((member) => {
                    const profile = userProfileCache[member];
                    const avatar = profile?.avatarUrl || '/favicon.ico';
                    const display = renderDisplayName(member, { revealKey: `group-settings-${member}` });
                    const isMemberOwner = member === owner;
                    const isMemberModerator = moderators.includes(member);
                    const removable = canRemoveMember(member);
                    const allowModToggle = isOwner && !isMemberOwner;
                    const checked = groupSettingsDraft.moderators.includes(member);
                    return (
                      <div
                        key={`group-settings-${member}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: BORDER,
                          background: '#030617',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <img src={avatar} alt={member} {...avatarLoadProps} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: BORDER }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {display}
                              {isMemberOwner && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>Owner</span>}
                              {!isMemberOwner && isMemberModerator && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>Moderator</span>}
                            </span>
                            <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>@{member}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 11, color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="checkbox"
                              disabled={!allowModToggle}
                              checked={allowModToggle ? checked : isMemberModerator}
                              onChange={() => allowModToggle && toggleDraftModerator(member)}
                            />
                            Mod
                          </label>
                          <button
                            className="btn-ghost"
                            disabled={!removable || groupSettingsSaving}
                            onClick={() => {
                              if (!removable) return;
                              const label = member === username ? 'Leave this group DM?' : `Remove ${member}?`;
                              if (typeof window === 'undefined' || window.confirm(label)) {
                                removeGroupMember(member);
                              }
                            }}
                            style={{ padding: '4px 8px', color: removable ? '#f87171' : '#475569' }}
                          >
                            {member === username ? 'Leave' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {groupSettingsError && (
                  <div style={{ color: '#fca5a5', fontSize: 12 }}>{groupSettingsError}</div>
                )}
                {showAddSection && (
                  <div style={{ border: BORDER, borderRadius: 12, padding: 12, background: '#020617', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Add members ({members.length}/{MAX_GROUP_DM_MEMBERS})</span>
                      <span>{remainingSlots} open seat{remainingSlots === 1 ? '' : 's'}</span>
                    </div>
                    <input
                      value={groupAddQuery}
                      onChange={(e) => setGroupAddQuery(e.target.value)}
                      placeholder="Search friends"
                      className="input-dark"
                      style={{ padding: 8, borderRadius: 8 }}
                    />
                    <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {filteredAddable.length === 0 ? (
                        <div style={{ color: COLOR_TEXT_MUTED, fontSize: 12 }}>No friends available.</div>
                      ) : (
                        filteredAddable.map((friend) => {
                          const disabled = !groupAddSelection.includes(friend) && groupAddSelection.length >= remainingSlots;
                          return (
                            <label
                              key={`add-${friend}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                padding: '6px 8px',
                                borderRadius: 8,
                                border: BORDER,
                                opacity: disabled ? 0.5 : 1,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img src={getUserAvatar(friend)} alt={friend} {...avatarLoadProps} style={{ width: 28, height: 28, borderRadius: '50%', border: BORDER }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontWeight: 600 }}>{renderDisplayName(friend, { revealKey: `add-${friend}`, allowFriend: true })}</span>
                                  <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>@{friend}</span>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={groupAddSelection.includes(friend)}
                                onChange={() => toggleGroupAddUser(friend)}
                                disabled={disabled}
                              />
                            </label>
                          );
                        })
                      )}
                    </div>
                    {groupAddError && <div style={{ color: '#fca5a5', fontSize: 12 }}>{groupAddError}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={addMembersToGroup}
                        disabled={groupAddSelection.length === 0 || groupAddSaving}
                        style={{ padding: '6px 12px', color: groupAddSelection.length ? accent : '#6b7280' }}
                      >
                        {groupAddSaving ? 'Adding...' : 'Add Members'}
                      </button>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={closeGroupSettingsModal}
                    style={{ padding: '6px 10px' }}
                    disabled={groupSettingsSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={saveGroupSettings}
                    disabled={groupSettingsSaving}
                    style={{ padding: '6px 14px', color: groupSettingsSaving ? '#6b7280' : accent }}
                  >
                    {groupSettingsSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {showServerSettings && (
        <ServerSettingsModal
          isOpen={showServerSettings}
          onClose={() => setShowServerSettings(false)}
          havenName={selectedHaven}
          havenLabel={getHavenName(selectedHaven)}
        />
      )}
      {showUserSettings && (
        <UserSettingsModal
          isOpen={showUserSettings}
          onClose={() => setShowUserSettings(false)}
          username={username}
          onStatusChangeAction={(status: string) => {
            try { socketRef.current?.emit('presence', { user: username, status }); } catch {}
            setPresenceMap((prev) => ({ ...prev, [username]: status }));
          }}
          onSavedAction={(s: any) => setUserSettings(normalizeUserSettings(s))}
        />
      )}
      {updateEntry && (
        <UpdateNewsModal
          open={showUpdateNews}
          entry={updateEntry}
          highlights={updateNewsHighlights}
          isMobile={isMobile}
          onDismiss={() => { void markUpdateNewsSeen(); }}
          onViewNotes={updateEntry.fullNotesMarkdown ? handleViewReleaseNotes : undefined}
        />
      )}
      {showPinned && (() => {
        const pinned = messages.filter(m => m.pinned && !blockedUsers.has(m.user));
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
            <div className="glass" style={{ width: 'min(640px, 90vw)', maxHeight: '70vh', overflowY: 'auto', padding: 16, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLOR_TEXT, fontWeight: 600 }}>
                  <FontAwesomeIcon icon={faThumbtack} /> Pinned Messages
                </div>
                <button className="btn-ghost" onClick={() => setShowPinned(false)} style={{ padding: '4px 8px' }}><FontAwesomeIcon icon={faXmark} /></button>
              </div>
              {pinned.length === 0 ? (
                <div style={{ color: COLOR_TEXT_MUTED, fontSize: 14 }}>No pinned messages.</div>
              ) : (
                pinned.map(pm => {
                  const meta = formatTimestampLabel(pm.timestamp);
                  const dateLabel = formatDateLine(pm.timestamp);
                  return (
                    <div key={pm.id} onClick={() => { setShowPinned(false); const el = messageRefs.current[pm.id]; el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} style={{ padding: 10, border: BORDER, borderRadius: 8, marginBottom: 8, cursor: 'pointer', background: COLOR_PANEL_ALT }}>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                        <strong style={{ color: '#93c5fd' }}>@{pm.user}</strong>{' '}
                        <span title={meta.title || undefined}>{dateLabel}  -  {meta.label}</span>
                      </div>
                      <div style={{ fontSize: 14, color: COLOR_TEXT }}>{pm.text}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}
      {showEditHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 67 }}>
          <div className="glass" style={{ width: 'min(640px,90vw)', maxHeight: '70vh', overflow: 'auto', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: BORDER }}>
              <div style={{ color: COLOR_TEXT, fontWeight: 600 }}>Edit History</div>
              <button className="btn-ghost" onClick={() => setShowEditHistory(null)} style={{ padding: '4px 8px' }}><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <div style={{ padding: 12 }}>
              {showEditHistory.items.length === 0 ? (
                <div style={{ color: COLOR_TEXT_MUTED }}>No prior edits.</div>
              ) : (
                showEditHistory.items.slice().reverse().map((h, i) => {
                  const meta = formatTimestampLabel(h.timestamp);
                  const dateLabel = formatDateLine(h.timestamp);
                  return (
                    <div key={i} style={{ borderBottom: BORDER, padding: '8px 0' }}>
                      <div style={{ fontSize: 12, color: '#9ca3af' }} title={meta.title || undefined}>
                        {dateLabel}  -  {meta.label}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', color: COLOR_TEXT }}>{h.text}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      {showNewHavenModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 73 }}
          onClick={closeNewHavenModal}
        >
          <div className="glass" style={{ width: 'min(420px, 92vw)', borderRadius: 12, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div style={{ fontWeight: 600 }}>Create Haven</div>
              <button className="btn-ghost" onClick={closeNewHavenModal} style={{ padding: '4px 8px' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <form
              onSubmit={handleCreateHaven}
              style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, color: COLOR_TEXT }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => setHavenAction('create')}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 999,
                    border: '1px solid ' + (havenAction === 'create' ? accent : COLOR_PANEL_STRONG),
                    background: havenAction === 'create' ? '#020617' : '#020617',
                    color: COLOR_TEXT,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Create Haven
                </button>
                <button
                  type="button"
                  onClick={() => setHavenAction('join')}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 999,
                    border: '1px solid ' + (havenAction === 'join' ? accent : COLOR_PANEL_STRONG),
                    background: havenAction === 'join' ? '#020617' : '#020617',
                    color: COLOR_TEXT,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Join Haven
                </button>
              </div>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{havenAction === 'create' ? 'Haven name' : 'Haven name to join'}</span>
                <input
                  autoFocus
                  value={newHaven}
                  onChange={e => setNewHaven(e.target.value)}
                  placeholder={havenAction === 'create' ? 'e.g. ChitterHaven' : 'Exact haven name'}
                  className="input-dark"
                  style={{ padding: 8, borderRadius: 8 }}
                />
              </label>
              {havenAction === 'create' && (
                <Fragment>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Haven type</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setNewHavenType('standard')}
                      style={{
                        flex: 1,
                        minWidth: 140,
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid ' + (newHavenType === 'standard' ? accent : COLOR_PANEL_STRONG),
                        background: '#020617',
                        color: COLOR_TEXT,
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: COLOR_PANEL_STRONG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FontAwesomeIcon icon={faServer} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Standard Haven</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>Chat with friends and communities.</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Community havens coming soon"
                      onClick={() => {
                        setShakeHavenType(true);
                        setTimeout(() => setShakeHavenType(false), 160);
                      }}
                      style={{
                        flex: 1,
                        minWidth: 140,
                        padding: 10,
                        borderRadius: 10,
                        border: '1px dashed #4b5563',
                        background: '#020617',
                        color: '#6b7280',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'not-allowed',
                        opacity: 0.5,
                        position: 'relative',
                        transform: shakeHavenType ? 'translateX(-3px)' : 'translateX(0)',
                        transition: 'transform 80ms ease'
                      }}
                    >
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: '#020617', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FontAwesomeIcon icon={faLock} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Community Haven</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Coming soon</div>
                      </div>
                    </button>
                  </div>
                </Fragment>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={closeNewHavenModal} style={{ padding: '6px 10px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-ghost"
                  disabled={!newHaven.trim()}
                  style={{
                    padding: '6px 10px',
                    color: newHaven.trim() ? accent : '#6b7280',
                    cursor: newHaven.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  {havenAction === 'create' ? 'Create' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showNewChannelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 72 }}>
          <div className="glass" style={{ width: 'min(420px, 92vw)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div style={{ fontWeight: 600 }}>Create Channel</div>
              <button className="btn-ghost" onClick={() => setShowNewChannelModal(false)} style={{ padding: '4px 8px' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <form
              onSubmit={handleCreateChannel}
              style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, color: COLOR_TEXT }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Channel name</span>
                <input
                  autoFocus
                  value={newChannel}
                  onChange={e => setNewChannel(e.target.value)}
                  placeholder="e.g. general"
                  className="input-dark"
                  style={{ padding: 8, borderRadius: 8 }}
                />
              </label>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Channel type</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setNewChannelType('text')}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid ' + (newChannelType === 'text' ? accent : COLOR_PANEL_STRONG),
                    background: newChannelType === 'text' ? '#020617' : '#020617',
                    color: COLOR_TEXT,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: COLOR_PANEL_STRONG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesomeIcon icon={faHashtag} />
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Text Channel</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Chat with messages and media.</div>
                  </div>
                </button>
                <button
                  type="button"
                  title="Voice channels coming soon"
                  onClick={() => {
                    setShakeVoice(true);
                    setTimeout(() => setShakeVoice(false), 160);
                  }}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: 10,
                    borderRadius: 10,
                    border: '1px dashed #4b5563',
                    background: '#020617',
                    color: '#6b7280',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'not-allowed',
                    opacity: 0.5,
                    position: 'relative',
                    transform: shakeVoice ? 'translateX(-3px)' : 'translateX(0)',
                    transition: 'transform 80ms ease'
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: '#020617', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesomeIcon icon={faLock} />
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Voice Channel</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Coming soon</div>
                  </div>
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowNewChannelModal(false)} style={{ padding: '6px 10px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-ghost"
                  disabled={!newChannel.trim()}
                  style={{
                    padding: '6px 10px',
                    color: newChannel.trim() ? accent : '#6b7280',
                    cursor: newChannel.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {profileUser && (
        <ProfileModal
          isOpen={!!profileUser}
          onClose={() => setProfileUser(null)}
          username={profileUser}
          me={username}
          contextLabel={profileContext}
          callPresence={getCallPresenceForUser(profileUser) || undefined}
          blockedUsers={Array.isArray(userSettings.blockedUsers) ? userSettings.blockedUsers : []}
          showBlockActions={showBlockActions}
          onToggleBlock={toggleBlockUser}
        />
      )}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 95 }}>
          {toasts.map(t => (
            <div key={t.id} style={{ minWidth: 260, maxWidth: 360, background: COLOR_PANEL, border: BORDER, borderLeft: `3px solid ${t.type==='success'?'#22c55e':t.type==='warn'?'#f59e0b':t.type==='error'?'#ef4444':'#60a5fa'}`, borderRadius: 8, padding: 10, color: COLOR_TEXT, boxShadow: '0 10px 24px rgba(0,0,0,0.35)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
              {t.body && <div style={{ color: '#cbd5e1', fontSize: 13 }}>{t.body}</div>}
            </div>
          ))}
        </div>
      )}
      {ctxMenu?.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setCtxMenu(null)}>
          <div
            style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, background: COLOR_PANEL, border: BORDER, borderRadius: 8, minWidth: 200, color: COLOR_TEXT, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {ctxMenu.target.type === 'message' && (
              <>
                <button className="btn-ghost" onClick={() => handleCtxAction('reply')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  <FontAwesomeIcon icon={faReply} /> Reply
                </button>
                <button className="btn-ghost" onClick={() => handleCtxAction('react')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  <FontAwesomeIcon icon={faFaceSmile} /> Add Reaction
                </button>
                <button className="btn-ghost" onClick={() => handleCtxAction('pin')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  <FontAwesomeIcon icon={faThumbtack} /> Pin/Unpin
                </button>
                <button className="btn-ghost" onClick={() => handleCtxAction('copy_text')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  Copy Text
                </button>
                <button className="btn-ghost" onClick={() => handleCtxAction('copy_id')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  Copy Message ID
                </button>
                <button className="btn-ghost" onClick={() => handleCtxAction('copy_link')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  Copy Link
                </button>
                <button className="btn-ghost" onClick={() => handleCtxAction('copy_user')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  Copy Username
                </button>
                <button className="btn-ghost" onClick={() => handleCtxAction('copy_time')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  Copy Timestamp
                </button>
                {ctxMenu.target.debug && (
                  <>
                    <button className="btn-ghost" onClick={() => handleCtxAction('copy_raw')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12 }}>
                      Copy Raw JSON
                    </button>
                    <button className="btn-ghost" onClick={() => handleCtxAction('copy_room')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12 }}>
                      Copy Room Key
                    </button>
                  </>
                )}
                <div style={{ borderTop: BORDER, margin: '4px 0' }} />
                <button className="btn-ghost" onClick={() => handleCtxAction('edit')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  <FontAwesomeIcon icon={faEdit} /> Edit
                </button>
                <button className="btn-ghost" onClick={() => handleCtxAction('delete')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', color: '#f87171' }}>
                  <FontAwesomeIcon icon={faTrash} /> Delete
                </button>
              </>
            )}
            {ctxMenu.target.type === 'attachment' && (() => {
              const a = ctxMenu.target.data as { url: string; name?: string; type?: string };
              const isImg = isImage(a?.type, a?.name);
              return (
                <>
                  {isImg ? (
                    <>
                      <button className="btn-ghost" onClick={() => handleCtxAction('set_avatar')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Set as Avatar</button>
                      <button className="btn-ghost" onClick={() => handleCtxAction('set_banner')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Set as Banner</button>
                    </>
                  ) : (
                    <div style={{ padding: '8px 12px', color: '#9ca3af' }}>Not an image</div>
                  )}
                </>
              );
            })()}
            {ctxMenu.target.type === 'channel' && (
              <>
                <button className="btn-ghost" onClick={() => handleCtxAction('copy')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Copy Name</button>
                <button className="btn-ghost" onClick={() => handleCtxAction('rename')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Rename</button>
                <button className="btn-ghost" onClick={() => handleCtxAction('delete')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', color: '#f87171' }}>Delete</button>
              </>
            )}
            {ctxMenu.target.type === 'dm' && (() => {
              const dm = ctxMenu.target.data as DMThread | undefined;
              const canManage = dm && isGroupDMThread(dm) && canManageGroupDM(dm);
              return (
                <>
                  <button className="btn-ghost" onClick={() => handleCtxAction('copy_users')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Copy Users</button>
                  {canManage && (
                    <button className="btn-ghost" onClick={() => handleCtxAction('group_settings')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                      Group Settings
                    </button>
                  )}
                  <button className="btn-ghost" onClick={() => handleCtxAction('close')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', color: '#f87171' }}>Close DM</button>
                </>
              );
            })()}
            {ctxMenu.target.type === 'call' && (
              <>
                <button className="btn-ghost" onClick={() => handleCtxAction('open_dm')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Open Call Screen</button>
                <button className="btn-ghost" onClick={() => handleCtxAction('copy_call_id')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Copy Call ID</button>
                <button className="btn-ghost" onClick={() => handleCtxAction('copy_link')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Copy Call Link</button>
                <button className="btn-ghost" onClick={() => handleCtxAction('copy_participants')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Copy Participants</button>
                <button className="btn-ghost" onClick={() => handleCtxAction('hangup')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', color: '#f87171' }}>Hang Up</button>
              </>
            )}
            {ctxMenu.target.type === 'blank' && (
              <>
                {permState.canManageServer && (
                  <button className="btn-ghost" onClick={() => setShowServerSettings(true)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Server Settings</button>
                )}
                {ctxMenu.target.debug && (
                  <button className="btn-ghost" onClick={() => handleCtxAction('copy_debug')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12 }}>
                    Copy Debug Info
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 96 }}>
          <div style={{ width: 'min(360px, 92vw)', background: '#0b1222', border: '1px solid #1f2937', borderRadius: 12, padding: 16, color: '#e5e7eb', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{confirmAction.title}</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>{confirmAction.body}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setConfirmAction(null)} style={{ padding: '6px 10px' }}>Cancel</button>
              <button className="btn-ghost" onClick={confirmAction.onConfirm} style={{ padding: '6px 10px', color: '#f87171' }}>{confirmAction.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
      {isMobile && showMobileNav && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', zIndex: 70 }}>
          <div style={{ width: '82vw', maxWidth: 360, background: COLOR_PANEL, borderRight: BORDER, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div style={{ fontWeight: 600 }}>Navigate</div>
              <button className="btn-ghost" onClick={() => setShowMobileNav(false)} style={{ padding: '4px 8px' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div style={{ padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Havens</div>
              {Object.keys(havens).map((h) => (
                <div key={h} onClick={() => { setSelectedHaven(h); setSelectedChannel(orderedChannelsFor(h)[0] || ''); setSelectedDM(null); setShowMobileNav(false); }} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: selectedHaven === h ? COLOR_CARD : 'transparent', color: selectedHaven === h ? '#93c5fd' : COLOR_TEXT }}>
                  <FontAwesomeIcon icon={faUsers} style={{ marginRight: 8 }} /> {getHavenName(h)}
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Channels in {getHavenName(selectedHaven)}</div>
              {orderedChannelsFor(selectedHaven).map((ch) => (
                <div key={ch} onClick={() => { setSelectedChannel(ch); setSelectedDM(null); setShowMobileNav(false); }} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: selectedChannel === ch ? COLOR_CARD : 'transparent', color: selectedChannel === ch ? '#93c5fd' : COLOR_TEXT }}>
                  <FontAwesomeIcon icon={faHashtag} style={{ marginRight: 8 }} /> #{ch}
                </div>
              ))}
            </div>
            <div style={{ padding: 12, color: COLOR_TEXT, flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Direct Messages</div>
              {dms.length === 0 && (<div style={{ color: COLOR_TEXT_MUTED, fontSize: 13 }}>No direct messages.</div>)}
              {dms.map((dm) => {
                const isGroup = isGroupDMThread(dm);
                return (
                  <div key={dm.id} onClick={() => { setSelectedHaven('__dms__'); setSelectedDM(dm.id); setShowMobileNav(false); }} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: selectedDM === dm.id ? COLOR_CARD : 'transparent', color: selectedDM === dm.id ? '#93c5fd' : COLOR_TEXT, display: 'flex', alignItems: 'center' }}>
                    <FontAwesomeIcon icon={isGroup ? faUsers : faEnvelope} style={{ marginRight: 8 }} /> {getDMTitle(dm)}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 1 }} onClick={() => setShowMobileNav(false)} />
        </div>
      )}
          {/* Mobile bottom tab bar */}
          {isMobile && (
            <div style={{ position: 'fixed', left: 8, right: 8, bottom: 'calc(8px + env(safe-area-inset-bottom))', height: 56, zIndex: 80, display: 'flex', justifyContent: 'space-between', gap: 8, paddingBottom: 'env(safe-area-inset-bottom)', userSelect: 'none' }}>
              <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-around', background: 'linear-gradient(180deg, rgba(7,12,20,0.9), rgba(9,14,24,0.85))', borderRadius: 12, padding: '8px 10px', border: BORDER }}>
                <button
                  type="button"
                  aria-label="Home"
                  title="Home"
                  className="btn-ghost"
                  onClick={() => { setActiveNav('home'); setShowMobileNav(false); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: activeNav === 'home' ? '#93c5fd' : COLOR_TEXT }}
                >
                  <FontAwesomeIcon icon={faHouse} />
                  <div style={{ fontSize: 11 }}>Home</div>
                </button>

                <button
                  type="button"
                  aria-label="Havens"
                  title="Havens"
                  className="btn-ghost"
                  onClick={() => { setActiveNav('havens'); setShowMobileNav(false); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: selectedHaven !== '__dms__' ? '#93c5fd' : COLOR_TEXT }}
                >
                  <FontAwesomeIcon icon={faServer} />
                  <div style={{ fontSize: 11 }}>Havens</div>
                </button>

                <button
                  type="button"
                  aria-label="Profile"
                  title="Profile"
                  className="btn-ghost"
                  onClick={() => { setActiveNav('profile'); setShowMobileNav(false); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: activeNav === 'profile' ? '#93c5fd' : COLOR_TEXT }}
                >
                  <FontAwesomeIcon icon={faUser} />
                  <div style={{ fontSize: 11 }}>Profile</div>
                </button>

                <button
                  type="button"
                  aria-label="Direct messages"
                  title="Direct Messages"
                  className="btn-ghost"
                  onClick={() => { setActiveNav('activity'); navigateToLocation({ haven: '__dms__', dm: lastSelectedDMRef.current ?? null }); setShowMobileNav(false); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: selectedHaven === '__dms__' && !!selectedDM ? '#93c5fd' : COLOR_TEXT }}
                >
                  <FontAwesomeIcon icon={faEnvelope} />
                  <div style={{ fontSize: 11 }}>DMs</div>
                </button>

                <button
                  type="button"
                  aria-label="Activity"
                    title="Activity"
                  className="btn-ghost"
                  onClick={() => { setActiveNav('activity'); navigateToLocation({ haven: '__dms__', dm: null }); setFriendsTab('all'); setShowMobileNav(false); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: selectedHaven === '__dms__' && !selectedDM ? '#93c5fd' : COLOR_TEXT }}
                >
                  <FontAwesomeIcon icon={faUsers} />
                  <div style={{ fontSize: 11 }}>Activity</div>
                </button>
              </div>
            </div>
          )}
      {quickOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, zIndex: 75 }}>
          <div className="glass" style={{ width: 'min(720px, 92vw)', maxHeight: '70vh', overflow: 'hidden', borderRadius: 14 }}>
            <div style={{ padding: 12, borderBottom: BORDER }}>
              <input autoFocus value={quickQuery} onChange={(e: any) => { setQuickQuery(e.target.value); setQuickIndex(0); }} placeholder="Quick switch (Ctrl/Cmd + K)" style={{ width: '100%', padding: 10, borderRadius: 10 }} className="input-dark" />
            </div>
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {(() => {
                const items = filterQuickItems(getQuickItems(), quickQuery);
                return items.length === 0 ? (
                  <div style={{ padding: 16, color: COLOR_TEXT_MUTED }}>No matches</div>
                ) : (
                  items.map((it, idx) => (
                    <div key={it.id}
                      onClick={() => selectQuickItem(it)}
                      style={{ padding: '10px 14px', borderBottom: BORDER, cursor: 'pointer', background: idx === Math.min(quickIndex, items.length - 1) ? COLOR_PANEL : 'transparent', color: COLOR_TEXT }}>
                      {it.label}
                    </div>
                  ))
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {isBooting && (
        <div
          className="ch-loading-border"
          style={{
            ['--chAccent' as any]: accent,
          }}
        />
      )}
      {callState !== 'idle' && showFullscreenCall && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.92)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: isMobile ? 12 : 32,
          }}
        >
          <div
            style={{
              width: 'min(1200px, 96vw)',
              height: 'min(760px, 94vh)',
              background: '#050c11',
              borderRadius: 24,
              border: BORDER,
              boxShadow: '0 30px 80px rgba(0,0,0,0.65)',
              padding: isMobile ? 16 : 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              color: COLOR_TEXT,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {callLocationInfo?.label || 'Direct Call'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Live Call</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontVariantNumeric: 'tabular-nums', color: '#cbd5f5' }}>
                  {`${Math.floor(callElapsed / 60).toString().padStart(1, '0')}:${(callElapsed % 60).toString().padStart(2, '0')}`}
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  title="Exit fullscreen"
                  onClick={() => setShowFullscreenCall(false)}
                  style={{ padding: '6px 10px', borderRadius: 999, border: BORDER, background: COLOR_PANEL_ALT, color: COLOR_TEXT }}
                >
                  <FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} />
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  title="Close"
                  onClick={() => setShowFullscreenCall(false)}
                  style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #7f1d1d', background: '#7f1d1d', color: '#fff' }}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '2fr minmax(260px, 1fr)', gap: 16 }}>
              <div style={{ position: 'relative', borderRadius: 20, border: `1px solid ${COLOR_PANEL_ALT}`, background: '#000', overflow: 'hidden' }}>
                {remoteVideoAvailable ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={isDeafened}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'radial-gradient(circle at top, rgba(59,130,246,0.15), transparent)' }}>
                    <FontAwesomeIcon icon={faVideo} style={{ fontSize: 32, color: '#1d4ed8' }} />
                    <div style={{ fontSize: 14, color: '#9ca3af', maxWidth: 360, textAlign: 'center' }}>
                      Waiting for participants to share their video. You can still talk, mute, or share your screen.
                    </div>
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    width: isMobile ? 140 : 200,
                    borderRadius: 16,
                    border: BORDER,
                    background: 'rgba(5,12,26,0.85)',
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {isScreenSharing ? 'Sharing Screen' : isCameraOn ? 'Camera Preview' : 'Preview'}
                  </div>
                  {isCameraOn || isScreenSharing ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: '100%', borderRadius: 12, background: COLOR_PANEL_STRONG, minHeight: 90, objectFit: isScreenSharing ? 'contain' : 'cover' }}
                    />
                  ) : (
                    <div style={{ padding: 18, borderRadius: 12, border: `1px dashed ${COLOR_BORDER}`, textAlign: 'center', color: '#9ca3af' }}>
                      Camera off
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
                <div style={{ borderRadius: 16, border: `1px solid ${COLOR_PANEL_ALT}`, background: '#050b18', padding: 12, flex: 1, overflowY: 'auto' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Participants</div>
                  {normalizedCallParticipants.length === 0 ? (
                    <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>No one else is connected yet.</div>
                  ) : (
                    normalizedCallParticipants.map((p) => {
                      const profile = userProfileCache[p.user];
                      const avatar = profile?.avatarUrl || '/favicon.ico';
                      const meta = getCallStatusMeta(p.user) || { type: 'talking', color: '#22c55e', label: 'In Call' };
                      const revealKey = `fullscreen-${p.user}`;
                      return (
                        <div key={`fullscreen-participant-${p.user}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #0b1324' }}>
                          <div
                            style={{ position: 'relative' }}
                            onMouseEnter={() => beginStreamerReveal(revealKey)}
                            onMouseLeave={() => endStreamerReveal(revealKey)}
                          >
                            <img src={avatar} alt={p.user} {...avatarLoadProps} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${meta.color}` }} />
                            <span style={{ position: 'absolute', bottom: -2, right: -2 }}>{renderCallStatusIconGraphic(meta, 12)}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{renderDisplayName(p.user, { revealKey })} {p.user === username && <span style={{ color: COLOR_TEXT_MUTED }}>(you)</span>}</div>
                            <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>{meta.label}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {screenShareError && (
                  <div style={{ borderRadius: 12, border: '1px solid #7f1d1d', background: 'rgba(127,29,29,0.15)', color: '#fecaca', padding: 10, fontSize: 12 }}>
                    {screenShareError}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {viewerCallMeta.label}  -  {callLocationInfo?.label || 'Direct Call'}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={toggleMute}
                  style={{ padding: '10px 16px', borderRadius: 999, border: BORDER, background: isMuted ? COLOR_PANEL_STRONG : COLOR_PANEL_ALT, color: COLOR_TEXT, minWidth: 120 }}
                >
                  <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} /> {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={toggleCamera}
                  style={{ padding: '10px 16px', borderRadius: 999, border: BORDER, background: isCameraOn ? COLOR_PANEL_STRONG : COLOR_PANEL_ALT, color: COLOR_TEXT, minWidth: 150 }}
                >
                  <FontAwesomeIcon icon={isCameraOn ? faVideoSlash : faVideo} /> {isCameraOn ? 'Stop Camera' : 'Start Camera'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={toggleScreenShare}
                  style={{ padding: '10px 16px', borderRadius: 999, border: BORDER, background: isScreenSharing ? COLOR_PANEL_STRONG : COLOR_PANEL_ALT, color: COLOR_TEXT, minWidth: 160 }}
                >
                  <FontAwesomeIcon icon={faDisplay} /> {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={toggleDeafen}
                  style={{ padding: '10px 16px', borderRadius: 999, border: BORDER, background: isDeafened ? COLOR_PANEL_STRONG : COLOR_PANEL_ALT, color: COLOR_TEXT, minWidth: 130 }}
                >
                  <FontAwesomeIcon icon={faVolumeXmark} /> {isDeafened ? 'Undeafen' : 'Deafen'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={endCall}
                  style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid #7f1d1d', background: '#7f1d1d', color: '#fff', minWidth: 120 }}
                >
                  Hang Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {(callState !== 'idle' || localStreamRef.current || remoteStreamRef.current) && (
        <>
          <audio ref={localAudioRef} autoPlay muted playsInline style={{ display: 'none' }} />
          <audio ref={remoteAudioRef} autoPlay playsInline muted={isDeafened} style={{ display: 'none' }} />
        </>
      )}
      </div>
      {profileLauncher}
      {streamerBadge}
      {privacyOverlay}
      {userSettings?.enableOneko && <Oneko />}
      <style jsx global>{`
        .ch-shell {
          position: relative;
        }
        .ch-loading-border {
          position: absolute;
          inset: 0;
          margin: auto;
          border-radius: 16px;
          pointer-events: none;
          --p: 0%;
          border: 2px solid transparent;
          background:
            conic-gradient(var(--chAccent) 0 var(--p), transparent var(--p) 100%) border-box;
          animation: ch-border-fill 1.8s linear infinite;
        }
        @keyframes ch-border-fill {
          0% { --p: 0%; opacity: 1; }
          70% { --p: 100%; opacity: 1; }
          85% { opacity: 0; }
          100% { opacity: 1; --p: 0%; }
        }
        .ch-streamer-mask {
          position: relative;
          display: inline-flex;
          align-items: center;
          padding: 0 1px;
        }
        .ch-streamer-mask-text {
          filter: blur(6px);
          display: inline-block;
          transition: filter 140ms ease;
        }
        .ch-date-divider {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin: 18px 0 10px;
          color: #a5b4fc;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .ch-date-divider::before,
        .ch-date-divider::after {
          content: "";
          flex: 1;
          border-bottom: 1px solid rgba(148,163,184,0.25);
          opacity: 0.9;
        }
        .ch-message-card {
          position: relative;
        }
        .ch-message-card.style-retro::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 100% 3px;
          opacity: 0.35;
          pointer-events: none;
          border-radius: inherit;
        }
        .ch-branch-indicator {
          position: absolute;
          left: 6px;
          top: 12px;
          bottom: 12px;
          width: 12px;
          pointer-events: none;
        }
        .ch-branch-line {
          position: absolute;
          left: 5px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(148,163,184,0.25);
        }
        .ch-branch-hook {
          position: absolute;
          left: 5px;
          top: 10px;
          width: 10px;
          height: 10px;
          border-bottom: 1px solid rgba(148,163,184,0.3);
          border-left: 1px solid rgba(148,163,184,0.3);
          border-bottom-left-radius: 6px;
        }
        .ch-message-card ::selection {
          background: var(--ch-selection, rgba(148,163,184,0.25));
          color: #fff;
        }
        .ch-message-actions {
          position: absolute;
          top: 6px;
          right: 6px;
          display: flex;
          gap: 6px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 150ms ease;
        }
        .ch-message-card:hover .ch-message-actions {
          opacity: 1;
          pointer-events: auto;
        }
        .ch-message-card.is-bubble {
          position: relative;
        }
        .ch-message-actions-bubble {
          top: -32px;
          background: rgba(5,13,28,0.95);
          border: 1px solid rgba(148,163,184,0.25);
          border-radius: 999px;
          padding: 4px 8px;
          box-shadow: 0 14px 30px rgba(0,0,0,0.45);
          right: auto;
          left: 12px;
        }
        .ch-message-actions-bubble[data-own="own"] {
          left: auto;
          right: 12px;
        }
        .ch-message-actions-bubble::after {
          content: "";
          position: absolute;
          bottom: -6px;
          left: 26px;
          width: 12px;
          height: 12px;
          background: inherit;
          border-left: 1px solid rgba(148,163,184,0.25);
          border-bottom: 1px solid rgba(148,163,184,0.25);
          transform: rotate(45deg);
        }
        .ch-message-actions-bubble[data-own="own"]::after {
          left: auto;
          right: 26px;
        }
      `}</style>
    </>
  );
}
