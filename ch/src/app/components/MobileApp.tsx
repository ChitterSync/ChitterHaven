"use client";
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faChevronLeft,
  faChevronRight,
  faChevronDown,
  faReply,
  faEdit,
  faTrash,
  faPhone,
  faMicrophone,
  faMicrophoneSlash,
  faVolumeXmark,
  faBars,
  faEnvelope,
  faHashtag,
  faGear,
  faServer,
  faAt,
  faFaceSmile,
  faPaperclip,
} from "@fortawesome/free-solid-svg-icons";
import NavController from "./NavController";
import EmojiPicker from "./EmojiPicker";
import InviteCard, { type InvitePreview } from "./InviteCard";

const COLOR_PANEL = "var(--ch-panel)";
const COLOR_PANEL_ALT = "var(--ch-panel-alt)";
const COLOR_PANEL_STRONG = "var(--ch-panel-strong)";
const COLOR_CARD = "var(--ch-card)";
const COLOR_CARD_ALT = "var(--ch-card-alt)";
const COLOR_BORDER = "var(--ch-border)";
const COLOR_TEXT = "var(--ch-text)";
const COLOR_TEXT_MUTED = "var(--ch-text-muted)";
const BORDER = `1px solid ${COLOR_BORDER}`;
const INVITE_CODE_RE = /(CHINV-[A-Z0-9]{4,})/i;
const SWIPE_THRESHOLD = 60;
const SWIPE_MAX = 90;
const statusColor = (status?: string) => {
  if (status === "online") return "#22c55e";
  if (status === "idle") return "#f59e0b";
  if (status === "dnd") return "#ef4444";
  return "#6b7280";
};
const resolveDefaultTimeFormat = (): AppearanceSettings["timeFormat"] => {
  try {
    const resolved = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
    const cycle = resolved.hourCycle;
    if (cycle === "h23" || cycle === "h24") return "24h";
  } catch {}
  return "12h";
};

const extractInviteCode = (text?: string) => {
  if (!text || typeof text !== "string") return null;
  const match = text.match(INVITE_CODE_RE);
  if (!match || !match[1]) return null;
  return match[1].toUpperCase();
};

type MobileDM = {
  id: string;
  users: string[];
  title?: string;
  group?: boolean;
  owner?: string;
  moderators?: string[];
  avatarUrl?: string;
};

type RichPresence = { type: "game" | "music" | "custom"; title: string; details?: string };
type HavenRecord = { id: string; name: string; channels: string[] };
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
  activeNav: string;
  setActiveNav: (s: string) => void;
  isMobile: boolean;
  setShowMobileNav: (b: boolean) => void;
  havens: Record<string, HavenRecord>;
  setSelectedHaven: (h: string) => void;
  selectedHaven: string;
  dms: MobileDM[];
  selectedDM: string | null;
  setSelectedDM: (d: string | null) => void;
  setShowUserSettings?: (b: boolean) => void;
  setShowServerSettings?: (b: boolean) => void;
  setSelectedChannel?: (c: string) => void;
  selectedChannel?: string;
  accent?: string;
  lastSelectedDMRef?: React.RefObject<string | null>;
  setFriendsTab?: (t: any) => void;
  username: string;
  messages: any[];
  input: string;
  setInput: (s: string) => void;
  sendMessage: () => void;
  typingUsers: string[];
  showTimestamps?: boolean;
  presenceMap?: Record<string, string>;
  userProfileCache?: Record<string, { displayName?: string; avatarUrl?: string }>;
  statusMessageMap?: Record<string, string>;
  richPresenceMap?: Record<string, RichPresence>;
  friendsState?: { friends: string[]; incoming: string[]; outgoing: string[] };
  friendsTab?: "all" | "online" | "pending";
  showMobileNav: boolean;
  setShowMobileNav: (b: boolean) => void;
  currentAvatarUrl?: string;
  appearance?: AppearanceSettings;
  // message actions
  handleEdit?: (id: string, text: string) => void;
  handleDelete?: (id: string) => void;
  handleReply?: (msg: any) => void;
  editId?: string | null;
  editText?: string;
  setEditText?: (s: string) => void;
  handleEditSubmit?: (id: string) => void;
  cancelEdit?: () => void;
  toggleReaction?: (messageId: string, emoji: string) => void;
  callsEnabled?: boolean;
  callState?: "idle" | "calling" | "in-call";
  startCall?: () => void;
  endCall?: () => void;
  activeCallDM?: string | null;
  callParticipants?: { user: string; status: string }[];
  callElapsed?: number;
  callInitiator?: string | null;
  isMuted?: boolean;
  isDeafened?: boolean;
  toggleMute?: () => void;
  toggleDeafen?: () => void;
  friendAction?: (action: "request" | "accept" | "decline" | "cancel" | "remove", target: string) => void;
  ensureDM?: (user: string) => void;
  renderDisplayName?: (user: string, opts?: { revealKey?: string; labelOverride?: string }) => React.ReactNode;
  renderDMLabel?: (dm?: MobileDM | null, opts?: { revealKey?: string }) => React.ReactNode;
  renderDMHandles?: (dm?: MobileDM | null) => React.ReactNode;
  invitePreviews?: Record<string, InvitePreview>;
  invitePreviewStatus?: Record<string, "loading" | "error" | "ready">;
  inviteErrors?: Record<string, string>;
  inviteJoinStatus?: Record<string, "idle" | "joining" | "success" | "error">;
  joinInvite?: (code: string) => void;
  onUploadFiles?: (files: File[]) => void;
};

export default function MobileApp(props: Props) {
  const {
    activeNav,
    setActiveNav,
    isMobile,
    setShowMobileNav,
    havens,
    setSelectedHaven,
    selectedHaven,
    dms,
    selectedDM,
    setSelectedDM,
    setShowUserSettings,
    setShowServerSettings,
    setSelectedChannel,
    selectedChannel,
    username,
    messages,
    input,
    setInput,
    sendMessage,
    typingUsers,
    showTimestamps,
    presenceMap = {},
    userProfileCache = {},
    statusMessageMap = {},
    richPresenceMap = {},
    friendsState,
    friendsTab,
    showMobileNav,
    currentAvatarUrl,
    accent,
    appearance,
    lastSelectedDMRef,
    setFriendsTab,
    handleEdit,
    handleDelete,
    handleReply,
    editId,
    editText,
    setEditText,
    handleEditSubmit,
    cancelEdit,
    toggleReaction,
    callsEnabled,
    callState = "idle",
    startCall,
    endCall,
    activeCallDM,
    callParticipants,
    callElapsed = 0,
    callInitiator,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    friendAction,
    ensureDM,
    renderDisplayName,
    renderDMLabel,
    renderDMHandles,
    invitePreviews = {},
    invitePreviewStatus = {},
    inviteErrors = {},
    inviteJoinStatus = {},
    joinInvite,
    onUploadFiles,
  } = props;
  const markAvatarLoaded = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.dataset.loaded = "true";
  }, []);
  const avatarLoadProps = {
    "data-avatar": "true",
    "data-loaded": "false",
    onLoad: markAvatarLoaded,
    onError: markAvatarLoaded,
  } as const;
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [openEmojiFor, setOpenEmojiFor] = useState<string | null>(null);
  const [dmMenuOpen, setDmMenuOpen] = useState(false);
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const [collapsedSystemMessages, setCollapsedSystemMessages] = useState<Record<string, boolean>>({});
  const [activityTab, setActivityTab] = useState<"dms" | "friends">("dms");
  const [localFriendsTab, setLocalFriendsTab] = useState<"all" | "online" | "pending">("all");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionList, setMentionList] = useState<{ username: string; displayName: string; avatarUrl: string }[]>([]);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [mentionAnchor, setMentionAnchor] = useState<{ start: number; end: number } | null>(null);
  const [mentionPopupStyle, setMentionPopupStyle] = useState<React.CSSProperties>({});
  const mentionPopupRef = useRef<HTMLDivElement | null>(null);
  const [swipeState, setSwipeState] = useState<{ id: string; offset: number } | null>(null);
  const swipeStartRef = useRef<{ id: string; startX: number; startY: number; offset: number } | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<any | null>(null);
  const [emojiSheetOpen, setEmojiSheetOpen] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const longPressTimerRef = useRef<number | null>(null);
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
  const updateMentionPopupPosition = () => {
    if (!mentionOpen || !inputRef.current) return;
    const width = Math.min(360, window.innerWidth - 16);
    const left = 8;
    const bottom = Math.max(12, (composerHeight || 64) + keyboardOffset + 8);
    setMentionPopupStyle({
      position: "fixed",
      left,
      right: 8,
      bottom,
      width,
      maxHeight: Math.min(260, window.innerHeight * 0.4),
      overflowY: "auto",
      zIndex: 120,
    });
  };
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
  const resizeComposerInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = Math.min(160, Math.floor(window.innerHeight * 0.3));
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };
  const normalizedAppearance = appearance || {};
  const messageGrouping = normalizedAppearance.messageGrouping || "compact";
  const messageStyle = normalizedAppearance.messageStyle || "sleek";
  const sortChannels = (channels: string[]) => channels.slice().sort((a, b) => a.localeCompare(b));
  const orderedChannelsFor = (havenId: string) => sortChannels(havens[havenId]?.channels || []);
  const replyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach((m) => {
      if (m.replyToId) {
        counts[m.replyToId] = (counts[m.replyToId] || 0) + 1;
      }
    });
    return counts;
  }, [messages]);
  const timeFormat = normalizedAppearance.timeFormat || resolveDefaultTimeFormat();
  const timeDisplay = normalizedAppearance.timeDisplay || "absolute";
  const bottomInset = Math.max(140, composerHeight + keyboardOffset + 90);
  useEffect(() => {
    let ignore = false;
    if (!mentionOpen) return;
    const q = mentionQuery.trim();
    (async () => {
      try {
        const res = await fetch(`/api/user-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!ignore) setMentionList(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (!ignore) setMentionList([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [mentionOpen, mentionQuery]);

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
  }, [mentionOpen, input]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (!composerRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setComposerHeight(entry.contentRect.height);
    });
    observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, []);

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
  useEffect(() => {
    resizeComposerInput();
  }, [input]);
  const timestampGranularity = normalizedAppearance.timestampGranularity || "perMessage";
  const systemMessageEmphasis = normalizedAppearance.systemMessageEmphasis || "prominent";
  const maxContentWidth = typeof normalizedAppearance.maxContentWidth === "number" ? normalizedAppearance.maxContentWidth : null;
  const accentIntensity = normalizedAppearance.accentIntensity || "normal";
  const readingMode = normalizedAppearance.readingMode === true;
  const formatAbsoluteTime = (timestamp?: number) => {
    const date = timestamp ? new Date(timestamp) : new Date();
    const hour12 = timeFormat === "12h" ? true : timeFormat === "24h" ? false : undefined;
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12 });
  };
  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return "just now";
    const diffMs = Date.now() - timestamp;
    if (diffMs < 30 * 1000) return "just now";
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
    if (timeDisplay === "relative") {
      return { label: relative, title: absolute };
    }
    if (timeDisplay === "hybrid") {
      return { label: absolute, title: relative };
    }
    return { label: absolute, title: undefined };
  };
  const effectiveFriendsTab = friendsTab ?? localFriendsTab;
  const setEffectiveFriendsTab = setFriendsTab ?? setLocalFriendsTab;
  const isGroupDMThread = (dm?: { id: string; users: string[]; group?: boolean }) => !!dm && (dm.group || (dm.users?.length || 0) > 2);
  const dmMembersWithoutSelf = (dm?: { users: string[] }) => (dm ? dm.users.filter((u) => u !== username) : []);
  const getDMTitle = (dm?: { users: string[]; title?: string; group?: boolean }) => {
    if (!dm) return 'Direct Message';
    const members = dmMembersWithoutSelf(dm);
    if (isGroupDMThread(dm)) {
      if (dm.title && dm.title.trim()) return dm.title.trim();
      const preview = members.slice(0, 3).join(', ');
      if (members.length > 3) return `${preview} +${members.length - 3}`;
      return preview || 'Group DM';
    }
    return members.length ? members.join(', ') : 'Direct Message';
  };
  const getDMAvatar = (dm?: { avatarUrl?: string }) => (dm && dm.avatarUrl ? dm.avatarUrl.trim() : '');
  const renderDMTitleNode = (dm?: MobileDM | null, revealKey?: string) =>
    renderDMLabel ? renderDMLabel(dm || undefined, { revealKey }) : getDMTitle(dm || undefined);
  const renderDMHandlesNode = (dm?: MobileDM | null) => {
    if (renderDMHandles) return renderDMHandles(dm || undefined);
    const members = dmMembersWithoutSelf(dm || undefined);
    if (!members.length) return null;
    return members.map((user, idx) => (
      <Fragment key={`mobile-handle-${dm?.id || 'dm'}-${user}`}>
        {idx > 0 && ', '}
        @{user}
      </Fragment>
    ));
  };
  const handleBackNav = () => {
    if (activeNav === "channels") {
      setActiveNav("havens");
      return;
    }
    if (activeNav === "activity" && selectedDM) {
      setSelectedDM(null);
      return;
    }
    if (activeNav === "profile") {
      setActiveNav("home");
    }
  };
  const headerTitle = activeNav === "channels"
    ? (selectedHaven === "__dms__" ? "Channels" : (havens[selectedHaven]?.name || selectedHaven || "Channels"))
    : activeNav === "activity"
      ? (selectedDM ? "Direct Message" : "Activity")
      : activeNav.charAt(0).toUpperCase() + activeNav.slice(1);
  const renderName = (user: string, revealKey: string) =>
    renderDisplayName ? renderDisplayName(user, { revealKey }) : user;
  const renderNameWithPrefix = (user: string, prefix: string, revealKey: string) =>
    renderDisplayName ? renderDisplayName(user, { revealKey, prefix }) : `${prefix}${user}`;
  const formatRichPresence = (presence?: RichPresence) => {
    if (!presence || !presence.title) return null;
    const prefix = presence.type === "music" ? "Listening to" : presence.type === "game" ? "Playing" : "Activity";
    const details = presence.details ? ` - ${presence.details}` : "";
    return `${prefix} ${presence.title}${details}`;
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
    try {
      const el = messagesRef.current;
      if (el && isAtBottom) {
        // scroll to bottom on new messages only when user is at bottom
        el.scrollTop = el.scrollHeight;
      }
    } catch {}
  }, [messages, isAtBottom]);

  const MOBILE_NAV_HEIGHT = 56;
  const COMPOSER_HEIGHT = 68;
  const safeBottomPad = isMobile ? MOBILE_NAV_HEIGHT + COMPOSER_HEIGHT + 16 : 12;
  const dmMeta = selectedDM ? dms.find((dm) => dm.id === selectedDM) : null;
  const otherDmUsers = dmMembersWithoutSelf(dmMeta || undefined);
  const dmTitle = getDMTitle(dmMeta || undefined);
  const dmTitleNode = renderDMTitleNode(dmMeta || undefined, selectedDM ? `mobile-dm-header-${selectedDM}` : undefined);
  const dmHandlesLine = renderDMHandlesNode(dmMeta || undefined);
  const dmIsGroup = isGroupDMThread(dmMeta || undefined);
  const dmGroupAvatar = getDMAvatar(dmMeta || undefined);
  const dmStatusMessage = !dmIsGroup && otherDmUsers[0] ? statusMessageMap[otherDmUsers[0]] : "";
  const dmRichPresence = !dmIsGroup && otherDmUsers[0] ? formatRichPresence(richPresenceMap[otherDmUsers[0]]) : null;
  const fallbackCallParticipants = dmMeta ? dmMeta.users.map((user) => ({ user, status: "ringing" as const })) : [];
  const mergedCallParticipants = (callParticipants && callParticipants.length ? callParticipants : fallbackCallParticipants).filter(
    (p): p is { user: string; status: string } => !!p && typeof p.user === "string",
  );
  const normalizedCallParticipants = mergedCallParticipants;
  const mobileCallsEnabled = !!callsEnabled && selectedHaven === "__dms__" && !!selectedDM;
  const callInSelectedDM = mobileCallsEnabled && activeCallDM === selectedDM && callState !== "idle";
  const callElsewhere = !!callsEnabled && callState !== "idle" && activeCallDM && (!selectedDM || activeCallDM !== selectedDM);
  const callMinutes = Math.floor(Math.max(0, callElapsed || 0) / 60);
  const callSeconds = Math.max(0, Math.floor((callElapsed || 0) % 60));
  const callTimer = `${callMinutes}:${callSeconds.toString().padStart(2, "0")}`;
  const muted = !!isMuted;
  const deafened = !!isDeafened;
  const participantPreview = mergedCallParticipants.slice(0, 4);
  const remainingParticipants = Math.max(0, mergedCallParticipants.length - participantPreview.length);
  const canCompose =
    (!!selectedDM) ||
    (selectedHaven && selectedHaven !== "__dms__" && !!selectedChannel);
  const participantInitials = (value?: string) => {
    if (!value) return "??";
    const trimmed = value.trim();
    if (!trimmed) return "??";
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return trimmed.slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };
  const [showCallOverlay, setShowCallOverlay] = useState(false);
  useEffect(() => {
    if (callState === "idle") setShowCallOverlay(false);
  }, [callState]);
  useEffect(() => {
    if (callInSelectedDM) setShowCallOverlay(true);
  }, [callInSelectedDM]);
  const jumpToActiveCall = () => {
    if (!activeCallDM) return;
    setSelectedHaven("__dms__");
    setSelectedDM(activeCallDM);
    setActiveNav("activity");
    setShowMobileNav(false);
  };
  useEffect(() => {
    if (!selectedDM) setDmMenuOpen(false);
  }, [selectedDM]);
  useEffect(() => {
    if (selectedDM) setActivityTab("dms");
  }, [selectedDM]);
  useEffect(() => {
    if (!selectedHaven || selectedHaven === "__dms__") setChannelMenuOpen(false);
  }, [selectedHaven]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minWidth: 0, overflowX: 'hidden' }}>
      {/* Mobile header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${COLOR_PANEL_ALT}`, background: `linear-gradient(180deg, ${COLOR_CARD}, ${COLOR_CARD_ALT})`, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {(activeNav === "channels" || (activeNav === "activity" && selectedDM) || activeNav === "profile") ? (
            <button className="btn-ghost" onClick={handleBackNav} style={{ padding: 10, minWidth: 44, minHeight: 44 }} aria-label="Back">
              <FontAwesomeIcon icon={faChevronLeft} /> <span style={{ marginLeft: 6, fontSize: 12 }}>Back</span>
            </button>
          ) : (
            <button className="btn-ghost" onClick={() => setShowMobileNav(true)} style={{ padding: 10, minWidth: 44, minHeight: 44 }} aria-label="Open navigation">
              <FontAwesomeIcon icon={faBars} />
            </button>
          )}
          <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headerTitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => setShowUserSettings && setShowUserSettings(true)} aria-label="User settings" style={{ padding: 10, minWidth: 44, minHeight: 44 }}>
            <FontAwesomeIcon icon={faGear} />
          </button>
          {setShowServerSettings && selectedHaven && selectedHaven !== "__dms__" && (
            <button
              className="btn-ghost"
              onClick={() => setShowServerSettings(true)}
              aria-label="Server settings"
              style={{ padding: 10, minWidth: 44, minHeight: 44 }}
            >
              <FontAwesomeIcon icon={faServer} />
            </button>
          )}
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt={username}
              {...avatarLoadProps}
              style={{ width: 36, height: 36, borderRadius: 18, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.03)' }}
              onClick={() => setActiveNav('profile')}
            />
          ) : (
            <div
              style={{ width: 36, height: 36, borderRadius: 18, background: COLOR_PANEL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR_TEXT }}
              onClick={() => setActiveNav('profile')}
            >
              {username?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      {/* adjust bottom padding so fixed nav / FAB don't overlap content on mobile */}
      <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', padding: 12, paddingBottom: bottomInset, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {activeNav === 'home' && (
          <div>
            <div style={{ padding: 12, borderRadius: 12, background: COLOR_CARD, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Welcome back</div>
              <div style={{ color: COLOR_TEXT_MUTED }}>Quick actions and recent activity optimized for mobile.</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <button className="btn-ghost" style={{ padding: 12, borderRadius: 12, background: COLOR_PANEL, textAlign: 'left' }} onClick={() => setActiveNav('havens')}>Jump to Havens</button>
              <button className="btn-ghost" style={{ padding: 12, borderRadius: 12, background: COLOR_PANEL, textAlign: 'left' }} onClick={() => setActiveNav('activity')}>Open Activity</button>
            </div>
          </div>
        )}

        {activeNav === 'havens' && (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Your Havens</div>
            {selectedHaven && selectedHaven !== '__dms__' && (
              <div style={{ padding: 12, borderRadius: 12, background: COLOR_PANEL_ALT, border: BORDER, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{havens[selectedHaven]?.name || selectedHaven}</div>
                  <div style={{ color: COLOR_TEXT_MUTED, fontSize: 13 }}>
                    {orderedChannelsFor(selectedHaven).length ? `Channels: ${orderedChannelsFor(selectedHaven).slice(0, 3).map((c) => `#${c}`).join(', ')}` : 'No channels yet.'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-ghost" onClick={() => setChannelMenuOpen(true)} style={{ padding: '6px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FontAwesomeIcon icon={faHashtag} /> Channels
                  </button>
                  <button className="btn-ghost" onClick={() => { setSelectedHaven('__dms__'); setSelectedChannel && setSelectedChannel(''); }} style={{ padding: '6px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FontAwesomeIcon icon={faEnvelope} /> DMs
                  </button>
                  {setShowServerSettings && (
                    <button className="btn-ghost" onClick={() => setShowServerSettings(true)} style={{ padding: '6px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FontAwesomeIcon icon={faServer} /> Settings
                    </button>
                  )}
                </div>
              </div>
            )}
            {Object.keys(havens).length === 0 && <div style={{ color: 'COLOR_TEXT_MUTED' }}>No havens yet.</div>}
            {Object.keys(havens).map(h => (
              <div key={h} onClick={() => { setSelectedHaven(h); setSelectedChannel && setSelectedChannel(orderedChannelsFor(h)[0] || ''); setActiveNav('channels'); }} style={{ padding: 12, borderRadius: 12, background: selectedHaven === h ? COLOR_PANEL_ALT : COLOR_CARD, marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{havens[h]?.name || h}</div>
                <div style={{ color: COLOR_TEXT_MUTED, fontSize: 13 }}>{(havens[h]?.channels || []).slice(0,3).map(c => `#${c}`).join('  -  ')}</div>
              </div>
            ))}
          </div>
        )}

        {activeNav === 'activity' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Activity</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className="btn-ghost"
                  onClick={() => setActivityTab("dms")}
                  style={{ padding: '6px 10px', borderRadius: 999, color: activityTab === 'dms' ? '#93c5fd' : COLOR_TEXT }}
                >
                  DMs
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setActivityTab("friends")}
                  style={{ padding: '6px 10px', borderRadius: 999, color: activityTab === 'friends' ? '#93c5fd' : COLOR_TEXT }}
                >
                  Friends
                </button>
              </div>
            </div>
            {selectedDM ? (
              <div style={{ padding: 12, borderRadius: 12, background: COLOR_PANEL_ALT, border: BORDER, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontWeight: 700 }}>Chatting with</div>
                  <div style={{ color: COLOR_TEXT_MUTED, fontSize: 13, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {dmTitleNode || dmTitle || 'Unknown user'}
                  </div>
                  {dmHandlesLine && (
                    <div style={{ color: '#94a3b8', fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {dmHandlesLine}
                    </div>
                  )}
                  {!dmIsGroup && dmStatusMessage && (
                    <div style={{ color: '#cbd5f5', fontSize: 12 }}>{dmStatusMessage}</div>
                  )}
                  {!dmIsGroup && dmRichPresence && (
                    <div style={{ color: '#93c5fd', fontSize: 11 }}>{dmRichPresence}</div>
                  )}
                </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn-ghost"
                      onClick={() => setSelectedDM(null)}
                      title="Back"
                    aria-label="Back"
                    style={{ padding: 10, borderRadius: 999, width: 42, height: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => setDmMenuOpen(true)}
                    title="Direct messages"
                    aria-label="Direct messages"
                    style={{ padding: 10, borderRadius: 999, width: 42, height: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FontAwesomeIcon icon={faBars} />
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        if (callState === 'in-call') {
                          setShowCallOverlay(true);
                          return;
                        }
                        if (!startCall) return;
                        startCall();
                        setShowCallOverlay(true);
                      }}
                      title={callState === 'in-call' ? 'Return to call' : 'Start call'}
                      style={{
                        padding: 10,
                        borderRadius: 999,
                        width: 42,
                        height: 42,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: COLOR_PANEL_STRONG,
                        border: BORDER,
                        color: callState !== 'idle' ? '#22c55e' : COLOR_TEXT,
                      }}
                    >
                      <FontAwesomeIcon icon={faPhone} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>Use DM Menu to switch conversations without leaving the chat.</div>
              </div>
            ) : (
              <div style={{ color: COLOR_TEXT_MUTED, marginBottom: 12 }}>Friends, recent DMs, and notifications.</div>
            )}
            {!selectedDM && activityTab === 'dms' && (
              <div style={{ marginTop: 12 }}>
                {dms.length === 0 && <div style={{ color: 'COLOR_TEXT_MUTED' }}>No direct messages.</div>}
                {dms.map(dm => {
                  const isGroup = isGroupDMThread(dm);
                  const members = dmMembersWithoutSelf(dm);
                  const title = getDMTitle(dm);
                  const groupAvatar = getDMAvatar(dm);
                  const initials = title.charAt(0).toUpperCase();
                  const revealKey = `mobile-dm-card-${dm.id}`;
                  const titleNode = renderDMTitleNode(dm, revealKey);
                  const handlesNode = renderDMHandlesNode(dm);
                  const statusMessage = !isGroup && members[0] ? statusMessageMap[members[0]] : "";
                  const richPresence = !isGroup && members[0] ? formatRichPresence(richPresenceMap[members[0]]) : null;
                  return (
                    <div
                      key={dm.id}
                      onClick={() => {
                        setSelectedHaven('__dms__');
                        setSelectedChannel && setSelectedChannel('');
                        setSelectedDM(dm.id);
                        setActiveNav('activity');
                      }}
                      style={{ padding: 12, borderRadius: 12, background: selectedDM === dm.id ? COLOR_PANEL_ALT : COLOR_CARD, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: '35%', border: BORDER, background: '#040c1a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {groupAvatar ? (
                          <img src={groupAvatar} alt={title} {...avatarLoadProps} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontWeight: 700 }}>{initials}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ fontWeight: 700, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {titleNode || title || members.join(', ') || 'Direct Message'}
                        </div>
                        <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {handlesNode || (isGroup ? `${dm.users.length} members` : members.map((user, idx) => (
                            <Fragment key={`mobile-handle-inline-${dm.id}-${user}`}>
                              {idx > 0 && ', '}
                              @{user}
                            </Fragment>
                          )))}
                        </div>
                        {!isGroup && statusMessage && (
                          <div style={{ fontSize: 11, color: '#cbd5f5' }}>{statusMessage}</div>
                        )}
                        {!isGroup && richPresence && (
                          <div style={{ fontSize: 11, color: '#93c5fd' }}>{richPresence}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!selectedDM && activityTab === 'friends' && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button
                    className="btn-ghost"
                    onClick={() => setEffectiveFriendsTab("all")}
                    style={{ padding: '6px 10px', borderRadius: 999, color: effectiveFriendsTab === 'all' ? '#93c5fd' : COLOR_TEXT }}
                  >
                    All
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => setEffectiveFriendsTab("online")}
                    style={{ padding: '6px 10px', borderRadius: 999, color: effectiveFriendsTab === 'online' ? '#93c5fd' : COLOR_TEXT }}
                  >
                    Online
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => setEffectiveFriendsTab("pending")}
                    style={{ padding: '6px 10px', borderRadius: 999, color: effectiveFriendsTab === 'pending' ? '#93c5fd' : COLOR_TEXT }}
                  >
                    Pending
                  </button>
                </div>
                {!friendsState && (
                  <div style={{ color: COLOR_TEXT_MUTED }}>Friends data not loaded.</div>
                )}
                {friendsState && effectiveFriendsTab !== 'pending' && (() => {
                  const sorted = [...friendsState.friends].sort((a, b) => a.localeCompare(b));
                  const list = effectiveFriendsTab === 'online'
                    ? sorted.filter((friend) => (presenceMap[friend] || 'offline') !== 'offline')
                    : sorted;
                  if (list.length === 0) {
                    return <div style={{ color: COLOR_TEXT_MUTED }}>No friends found.</div>;
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {list.map((friend) => {
                        const avatar = userProfileCache[friend]?.avatarUrl || '/favicon.ico';
                        const revealKey = `mobile-friend-${friend}`;
                        const statusMessage = statusMessageMap[friend] || "";
                        const richPresence = formatRichPresence(richPresenceMap[friend]);
                        return (
                          <div
                            key={`friend-${friend}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '10px 12px',
                              borderRadius: 12,
                              border: BORDER,
                              background: COLOR_PANEL_ALT,
                            }}
                          >
                            <div style={{ position: 'relative', width: 38, height: 38 }}>
                              <img src={avatar} alt={friend} {...avatarLoadProps} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: BORDER }} />
                              <span style={{ position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: '50%', border: `2px solid ${COLOR_PANEL}`, background: statusColor(presenceMap[friend]) }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: 600 }}>{renderName(friend, revealKey)}</span>
                              <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>@{friend}</span>
                              {statusMessage && (
                                <span style={{ fontSize: 11, color: '#cbd5f5' }}>{statusMessage}</span>
                              )}
                              {richPresence && (
                                <span style={{ fontSize: 11, color: '#93c5fd' }}>{richPresence}</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {ensureDM && (
                                <button className="btn-ghost" onClick={() => ensureDM(friend)} style={{ padding: '6px 8px' }}>
                                  Message
                                </button>
                              )}
                              {friendAction && (
                                <button className="btn-ghost" onClick={() => friendAction('remove', friend)} style={{ padding: '6px 8px', color: '#f87171' }}>
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {friendsState && effectiveFriendsTab === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Incoming</div>
                      {friendsState.incoming.length === 0 ? (
                        <div style={{ color: COLOR_TEXT_MUTED }}>No incoming requests.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {friendsState.incoming.map((friend) => {
                            const avatar = userProfileCache[friend]?.avatarUrl || '/favicon.ico';
                            const revealKey = `mobile-incoming-${friend}`;
                            return (
                              <div key={`incoming-${friend}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: BORDER, background: COLOR_PANEL_ALT }}>
                                <img src={avatar} alt={friend} {...avatarLoadProps} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: BORDER }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600 }}>{renderName(friend, revealKey)}</div>
                                  <div style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>@{friend}</div>
                                </div>
                                {friendAction && (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn-ghost" onClick={() => friendAction('accept', friend)} style={{ padding: '6px 8px', color: '#22c55e' }}>
                                      Accept
                                    </button>
                                    <button className="btn-ghost" onClick={() => friendAction('decline', friend)} style={{ padding: '6px 8px', color: '#f87171' }}>
                                      Decline
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Outgoing</div>
                      {friendsState.outgoing.length === 0 ? (
                        <div style={{ color: COLOR_TEXT_MUTED }}>No outgoing requests.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {friendsState.outgoing.map((friend) => {
                            const avatar = userProfileCache[friend]?.avatarUrl || '/favicon.ico';
                            const revealKey = `mobile-outgoing-${friend}`;
                            return (
                              <div key={`outgoing-${friend}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: BORDER, background: COLOR_PANEL_ALT }}>
                                <img src={avatar} alt={friend} {...avatarLoadProps} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: BORDER }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600 }}>{renderName(friend, revealKey)}</div>
                                  <div style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>@{friend}</div>
                                </div>
                                {friendAction && (
                                  <button className="btn-ghost" onClick={() => friendAction('cancel', friend)} style={{ padding: '6px 8px', color: '#f59e0b' }}>
                                    Cancel
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeNav === 'profile' && (
          <div>
            <div style={{ padding: 12, borderRadius: 12, background: COLOR_CARD }}>
              <div style={{ fontWeight: 700 }}>{username}</div>
              <div style={{ color: COLOR_TEXT_MUTED }}>Tap to edit your profile and account settings.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn-ghost"
                  onClick={() => setShowUserSettings && setShowUserSettings(true)}
                  style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <FontAwesomeIcon icon={faGear} /> User Settings
                </button>
                {setShowServerSettings && selectedHaven && selectedHaven !== "__dms__" && (
                  <button
                    className="btn-ghost"
                    onClick={() => setShowServerSettings(true)}
                    style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <FontAwesomeIcon icon={faServer} /> Server Settings
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Channel / message view */}
        {(activeNav === 'channels' || activeNav === 'activity') && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{activeNav === 'channels' ? `Channels in ${havens[selectedHaven]?.name || selectedHaven}` : 'Messages'}</div>

            {mobileCallsEnabled && (
              <div
                style={{
                  borderRadius: 28,
                  background: callInSelectedDM
                    ? 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(2,6,23,0.85))'
                    : 'linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.85))',
                  padding: 22,
                  marginBottom: 16,
                  border: '1px solid rgba(148,163,184,0.25)',
                  boxShadow: '0 25px 60px rgba(2,6,23,0.55)',
                }}
              >
                {callInSelectedDM ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#c7d2fe' }}>
                        {callState === 'calling' ? 'Connecting' : 'Voice Connected'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 20, fontWeight: 600, color: '#f8fafc' }}>{dmTitle || 'Direct Call'}</span>
                        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', color: '#cbd5f5', fontWeight: 600 }}>
                          {callTimer}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {mergedCallParticipants.length} participant{mergedCallParticipants.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {participantPreview.map((part) => (
                        <div
                          key={part.user}
                          style={{
                            borderRadius: 20,
                            border: '1px solid rgba(148,163,184,0.25)',
                            background: 'rgba(15,23,42,0.6)',
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                          }}
                        >
                          <div
                            style={{
                              width: 62,
                              height: 62,
                              borderRadius: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 20,
                              textTransform: 'uppercase',
                              color: '#fff',
                              border: `2px solid ${part.status === 'connected' ? '#22c55e' : '#f97316'}`,
                              background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(2,132,199,0.45))',
                            }}
                          >
                            {participantInitials(part.user)}
                          </div>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{part.user === username ? 'You' : part.user}</div>
                          <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.65)' }}>
                            {part.status === 'connected' ? 'Connected' : 'Ringing'}
                          </div>
                        </div>
                      ))}
                      {remainingParticipants > 0 && (
                        <div
                          style={{
                            borderRadius: 20,
                            border: '1px dashed rgba(148,163,184,0.4)',
                            background: 'rgba(15,23,42,0.4)',
                            padding: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            color: '#cbd5f5',
                          }}
                        >
                          +{remainingParticipants} more
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={toggleMute}
                        disabled={!toggleMute}
                        aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: 24,
                          border: 'none',
                          background: muted ? '#dc2626' : 'rgba(15,23,42,0.85)',
                          color: '#fff',
                          fontSize: 22,
                          boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
                          opacity: toggleMute ? 1 : 0.4,
                        }}
                      >
                        <FontAwesomeIcon icon={muted ? faMicrophoneSlash : faMicrophone} />
                      </button>
                      <button
                        type="button"
                        onClick={toggleDeafen}
                        disabled={!toggleDeafen}
                        aria-label={deafened ? 'Undeafen' : 'Deafen'}
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: 24,
                          border: 'none',
                          background: deafened ? '#f97316' : 'rgba(15,23,42,0.85)',
                          color: '#fff',
                          fontSize: 22,
                          boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
                          opacity: toggleDeafen ? 1 : 0.4,
                        }}
                      >
                        <FontAwesomeIcon icon={faVolumeXmark} />
                      </button>
                      <button
                        type="button"
                        onClick={endCall}
                        disabled={!endCall}
                        aria-label="End call"
                        style={{
                          flex: '1 0 180px',
                          minHeight: 70,
                          borderRadius: 24,
                          border: 'none',
                          background: 'linear-gradient(120deg, #ef4444, #b91c1c)',
                          color: '#fff',
                          fontSize: 18,
                          fontWeight: 600,
                          boxShadow: '0 20px 35px rgba(239,68,68,0.35)',
                          opacity: endCall ? 1 : 0.4,
                        }}
                      >
                        <FontAwesomeIcon icon={faPhone} /> Hang Up
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCallOverlay(true)}
                      style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 18,
                        border: '1px solid rgba(148,163,184,0.25)',
                        background: 'rgba(15,23,42,0.65)',
                        color: '#e0e7ff',
                        fontWeight: 600,
                      }}
                    >
                      Open Call UI
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 18, color: '#f8fafc' }}>Start a voice call</div>
                      <div style={{ fontSize: 13, color: '#cbd5f5', marginTop: 4 }}>
                        {dmTitle ? `Call ${dmTitle}` : 'Invite someone to call'}
                      </div>
                      {callElsewhere && (
                        <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                          Another call is active. Jump in to join.
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!startCall) return;
                          startCall();
                          setShowCallOverlay(true);
                        }}
                        className="btn-primary"
                        style={{ flex: '1 0 180px', padding: 14, borderRadius: 999, opacity: startCall ? 1 : 0.6 }}
                      >
                        <FontAwesomeIcon icon={faPhone} /> Start Call
                      </button>
                      {callElsewhere && (
                        <button
                          type="button"
                          onClick={jumpToActiveCall}
                          className="btn-ghost"
                          style={{ flex: '1 0 160px', padding: 14, borderRadius: 999 }}
                        >
                          View Active Call
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {showCallOverlay && callInSelectedDM && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(2,6,23,0.92)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 130,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    width: 'min(520px, 96vw)',
                    borderRadius: 28,
                    border: '1px solid rgba(148,163,184,0.3)',
                    background: 'linear-gradient(160deg, rgba(13,23,42,0.95), rgba(5,8,22,0.92))',
                    color: '#f8fafc',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    maxHeight: '90vh',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#94a3b8' }}>
                        {dmTitle || 'Direct Call'}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>Live Call</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: '#cbd5f5' }}>{callTimer}</span>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setShowCallOverlay(false)}
                        style={{ padding: '6px 10px', borderRadius: 999 }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                      {normalizedCallParticipants.map((participant) => (
                        <div
                          key={`overlay-participant-${participant.user}`}
                          style={{
                            borderRadius: 20,
                            border: '1px solid rgba(148,163,184,0.25)',
                            background: 'rgba(15,23,42,0.75)',
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 70,
                              height: 70,
                              borderRadius: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 22,
                              fontWeight: 700,
                              border: `2px solid ${participant.status === 'connected' ? '#22c55e' : '#f97316'}`,
                              background: 'linear-gradient(130deg, rgba(59,130,246,0.35), rgba(14,165,233,0.35))',
                            }}
                          >
                            {participantInitials(participant.user)}
                          </div>
                          <div style={{ fontWeight: 600 }}>{participant.user === username ? `${participant.user} (You)` : participant.user}</div>
                          <div style={{ fontSize: 12, color: '#cbd5f5' }}>
                            {participant.status === 'connected' ? 'Connected' : 'Ringing'}
                          </div>
                        </div>
                      ))}
                      {normalizedCallParticipants.length === 0 && (
                        <div
                          style={{
                            borderRadius: 20,
                            border: '1px dashed rgba(148,163,184,0.3)',
                            background: 'rgba(15,23,42,0.6)',
                            padding: 20,
                            textAlign: 'center',
                            color: '#94a3b8',
                          }}
                        >
                          No other participants connected yet.
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={toggleMute}
                        disabled={!toggleMute}
                        style={{
                          flex: '1 0 140px',
                          padding: 12,
                          borderRadius: 18,
                          border: 'none',
                          background: muted ? '#dc2626' : 'rgba(15,23,42,0.85)',
                          color: '#fff',
                          fontWeight: 600,
                          opacity: toggleMute ? 1 : 0.4,
                        }}
                      >
                        <FontAwesomeIcon icon={muted ? faMicrophoneSlash : faMicrophone} /> {muted ? 'Unmute' : 'Mute'}
                      </button>
                      <button
                        type="button"
                        onClick={toggleDeafen}
                        disabled={!toggleDeafen}
                        style={{
                          flex: '1 0 140px',
                          padding: 12,
                          borderRadius: 18,
                          border: 'none',
                          background: deafened ? '#f97316' : 'rgba(15,23,42,0.85)',
                          color: '#fff',
                          fontWeight: 600,
                          opacity: toggleDeafen ? 1 : 0.4,
                        }}
                      >
                        <FontAwesomeIcon icon={faVolumeXmark} /> {deafened ? 'Undeafen' : 'Deafen'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCallOverlay(false);
                        if (endCall) endCall();
                      }}
                      style={{
                        width: '100%',
                        padding: 14,
                        borderRadius: 22,
                        border: 'none',
                        background: 'linear-gradient(120deg, #ef4444, #b91c1c)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      End Call
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* reserve space at the bottom to avoid overlap with fixed nav + composer */}
            <div ref={messagesRef} onScroll={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
              setIsAtBottom(atBottom);
            }} style={{ flex: 1, overflowY: 'auto', paddingBottom: safeBottomPad }}>
              <div style={{ maxWidth: maxContentWidth ? `${maxContentWidth}px` : '100%', margin: '0 auto', width: '100%' }}>
              {messages.length === 0 && <div style={{ color: 'COLOR_TEXT_MUTED' }}>No messages yet.</div>}
              {messages.map((m, idx) => {
                const messageKey = m.id ? `${m.id}-${idx}` : `${m.user}-${m.timestamp}-${idx}`;
                const revealKey = `mobile-msg-${messageKey}`;
                const prevMessage = messages[idx - 1];
                const showDateDivider = idx === 0 || !isSameDay(prevMessage?.timestamp, m.timestamp);
                const isSystemMessage = !!(m as any).systemType;
                const prevIsSystem = !!(prevMessage as any)?.systemType;
                const isBubbles = messageStyle === "bubbles";
                const isClassic = messageStyle === "classic";
                const isMinimalLog = messageStyle === "minimal_log";
                const isFocusStyle = messageStyle === "focus";
                const isThreadForward = messageStyle === "thread_forward";
                const isRetro = messageStyle === "retro";
                const groupingWindowMs = messageGrouping === "aggressive" ? 30 * 60 * 1000 : messageGrouping === "compact" ? 5 * 60 * 1000 : 0;
                const isGrouped =
                  messageGrouping !== "none" &&
                  !showDateDivider &&
                  !!prevMessage &&
                  !isSystemMessage &&
                  !prevIsSystem &&
                  prevMessage.user === m.user &&
                  (m.timestamp - prevMessage.timestamp) <= groupingWindowMs;
                const replyCount = m.id ? replyCounts[m.id] || 0 : 0;
                const hasReplies = replyCount > 0;
                const showHeader = !isGrouped && !isSystemMessage;
                const showAvatar = showHeader && !readingMode;
                const showTimestamp = (showTimestamps !== false) && (!isGrouped || timestampGranularity === "perMessage");
                const timeMeta = showTimestamp ? formatTimestampLabel(m.timestamp) : null;
                const systemKey = m.id || messageKey;
                const isCollapsible = isSystemMessage && systemMessageEmphasis === "collapsible";
                const isCollapsed = isCollapsible && (collapsedSystemMessages[systemKey] ?? true);
                const systemOpacity = isSystemMessage
                  ? (systemMessageEmphasis === "dimmed" ? 0.65 : systemMessageEmphasis === "normal" ? 0.9 : 1)
                  : 1;
                const dateLabel = formatDateLine(m.timestamp);
                const ownMessage = m.user === username;
                const bubbleBackground = ownMessage ? (accentIntensity === "subtle" ? COLOR_PANEL_STRONG : COLOR_PANEL_STRONG) : COLOR_CARD;
                const baseBackground = isClassic
                  ? COLOR_PANEL_STRONG
                  : isMinimalLog
                    ? "transparent"
                    : isRetro
                      ? "rgba(6,10,20,0.85)"
                      : isFocusStyle
                        ? "rgba(8,14,26,0.62)"
                        : bubbleBackground;
                const avatarUrl =
                  (m as any).avatarUrl ||
                  userProfileCache[m.user]?.avatarUrl ||
                  '/favicon.ico';
                let cardBackground = isBubbles ? bubbleBackground : baseBackground;
                const cardRadius = isBubbles ? 14 : isRetro ? 6 : 12;
                let cardShadow = isMinimalLog ? 'none' : '0 10px 30px rgba(0,0,0,0.35)';
                let cardBorder = isMinimalLog ? 'none' : `1px solid ${COLOR_PANEL_ALT}`;
                const threadBorder = isThreadForward && hasReplies ? '3px solid rgba(148,163,184,0.25)' : undefined;
                const focusDim = isFocusStyle && idx < Math.max(0, messages.length - 20);
                const timestampFontFamily = (isMinimalLog || isRetro) ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : undefined;
                if (isSystemMessage && (isMinimalLog || isBubbles || isRetro)) {
                  cardBackground = "transparent";
                  cardBorder = "none";
                  cardShadow = "none";
                }
                const systemContent = isSystemMessage ? (() => {
                  const label = m.text || '';
                  const timeLabel = showTimestamp && timeMeta ? timeMeta.label : null;
                  if (isMinimalLog) {
                    return (
                      <div style={{ fontSize: 11, color: COLOR_TEXT_MUTED, letterSpacing: 0.4 }}>
                        -- {label} --
                        {timeLabel && <span style={{ marginLeft: 8, fontFamily: timestampFontFamily }}>[{timeLabel}]</span>}
                      </div>
                    );
                  }
                  if (isRetro) {
                    return (
                      <div style={{ fontSize: 11, color: COLOR_TEXT_MUTED, fontFamily: timestampFontFamily }}>
                        [SYSTEM] {label}
                        {timeLabel && <span style={{ marginLeft: 8 }}>[{timeLabel}]</span>}
                      </div>
                    );
                  }
                  if (isBubbles) {
                    return (
                      <div style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>
                        {label}
                        {timeLabel && <span style={{ marginLeft: 8 }}>{timeLabel}</span>}
                      </div>
                    );
                  }
                  if (isClassic || isThreadForward) {
                    return (
                      <div style={{ fontSize: 11, color: COLOR_TEXT_MUTED, display: 'flex', gap: 8, alignItems: 'center' }}>
                        {timeLabel && <span style={{ fontFamily: timestampFontFamily }}>{timeLabel}</span>}
                        <span>{label}</span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ fontSize: 11, color: COLOR_TEXT_MUTED }}>
                      {label}
                      {timeLabel && <span style={{ marginLeft: 8 }}>{timeLabel}</span>}
                    </div>
                  );
                })() : null;
                const inviteCode = extractInviteCode(m.text || "");
                const invitePreview = inviteCode ? invitePreviews[inviteCode] : null;
                const inviteStatus = inviteCode ? invitePreviewStatus[inviteCode] : undefined;
                const inviteError = inviteCode ? inviteErrors[inviteCode] : null;
                const inviteJoin = inviteCode ? inviteJoinStatus[inviteCode] : "idle";
                const inviteHaven = invitePreview?.haven || inviteCode || "";
                const inviteAlreadyJoined = inviteHaven ? !!havens[inviteHaven] : false;
                const swipeId = m.id || messageKey;
                const swipeOffset = swipeState?.id === swipeId ? swipeState.offset : 0;
                const canSwipeActions = ownMessage && !!handleEdit && !!handleDelete;
                const handleTouchStart = (e: React.TouchEvent) => {
                  if (isSystemMessage) return;
                  const touch = e.touches[0];
                  swipeStartRef.current = {
                    id: swipeId,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    offset: 0,
                  };
                  setSwipeState({ id: swipeId, offset: 0 });
                  if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = window.setTimeout(() => {
                    if (handleReply || canSwipeActions) {
                      setActionSheetMessage(m);
                    }
                  }, 450);
                };
                const handleTouchMove = (e: React.TouchEvent) => {
                  const state = swipeStartRef.current;
                  if (!state || state.id !== swipeId) return;
                  const touch = e.touches[0];
                  const dx = touch.clientX - state.startX;
                  const dy = touch.clientY - state.startY;
                  if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
                  if (longPressTimerRef.current) {
                    window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                  const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx));
                  swipeStartRef.current = { ...state, offset: clamped };
                  setSwipeState({ id: swipeId, offset: clamped });
                  if (Math.abs(dx) > 10) e.preventDefault();
                };
                const handleTouchEnd = () => {
                  const state = swipeStartRef.current;
                  if (!state || state.id !== swipeId) return;
                  if (longPressTimerRef.current) {
                    window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                  const offset = state.offset;
                  swipeStartRef.current = null;
                  setSwipeState(null);
                  if (offset > SWIPE_THRESHOLD && handleReply) {
                    handleReply(m);
                    return;
                  }
                  if (offset < -SWIPE_THRESHOLD && canSwipeActions) {
                    setActionSheetMessage(m);
                  }
                };
                return (
                  <Fragment key={messageKey}>
                    {showDateDivider && (
                      <div style={{ textAlign: 'center', margin: '18px 0 12px', position: 'relative' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 14px',
                            borderRadius: 999,
                            border: BORDER,
                            background: COLOR_PANEL,
                            color: COLOR_TEXT_MUTED,
                            fontSize: 11,
                            letterSpacing: 0.4,
                          }}
                        >
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    {isCollapsible && isCollapsed ? (
                      <div
                        data-mid={m.id}
                        style={{
                          padding: isMinimalLog ? 8 : 10,
                          borderRadius: cardRadius,
                          background: cardBackground,
                          marginBottom: isMinimalLog ? 0 : 12,
                          boxShadow: cardShadow,
                          border: cardBorder,
                          borderLeft: threadBorder,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          opacity: focusDim ? 0.6 : systemOpacity,
                        }}
                        onClick={() => setCollapsedSystemMessages((prev) => ({ ...prev, [systemKey]: false }))}
                      >
                        <FontAwesomeIcon icon={faChevronRight} />
                        <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.text}
                        </div>
                        {showTimestamp && timeMeta && (
                          <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED }} title={timeMeta.title || undefined}>{timeMeta.label}</span>
                        )}
                      </div>
                    ) : (
                    <div
                      data-mid={m.id}
                      style={{
                        padding: isMinimalLog ? 8 : 12,
                        borderRadius: cardRadius,
                        background: cardBackground,
                        marginBottom: isMinimalLog ? 0 : (isGrouped ? 6 : 12),
                        boxShadow: cardShadow,
                        border: cardBorder,
                        borderLeft: threadBorder,
                        opacity: focusDim ? 0.6 : systemOpacity,
                        transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                        transition: swipeOffset ? "none" : "transform 120ms ease",
                        touchAction: "pan-y",
                      }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {showAvatar && (
                            <div style={{ position: 'relative', width: 38, height: 38, flex: '0 0 auto' }}>
                              <img
                                src={avatarUrl}
                                alt={m.user}
                                {...avatarLoadProps}
                                style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: BORDER }}
                              />
                              <span
                                style={{
                                  position: 'absolute',
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  border: `2px solid ${COLOR_PANEL}`,
                                  background: statusColor(presenceMap[m.user]),
                                  bottom: 2,
                                  right: 2,
                                }}
                              />
                            </div>
                          )}
                          {showHeader && (
                            <div style={{ display: 'flex', flexDirection: isMinimalLog ? 'row' : 'column', gap: isMinimalLog ? 8 : 2, alignItems: isMinimalLog ? 'center' : 'flex-start' }}>
                              {isMinimalLog && showTimestamp && timeMeta && (
                                <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED, fontFamily: timestampFontFamily }} title={timeMeta.title || undefined}>[{timeMeta.label}]</span>
                              )}
                              <span style={{ color: COLOR_TEXT, fontWeight: 600, fontSize: 13 }}>
                                {renderName(m.user, revealKey)}
                              </span>
                              {isThreadForward && hasReplies && (
                                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, border: '1px solid rgba(148,163,184,0.2)', color: '#cbd5e1', background: 'rgba(2,6,23,0.6)' }}>
                                  {replyCount} repl{replyCount === 1 ? 'y' : 'ies'}
                                </span>
                              )}
                              {!isMinimalLog && showTimestamp && timeMeta && (
                                <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED, fontFamily: timestampFontFamily }} title={timeMeta.title || undefined}>{timeMeta.label}</span>
                              )}
                            </div>
                          )}
                          {!showHeader && showTimestamp && timeMeta && (
                            <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED, fontFamily: timestampFontFamily }} title={timeMeta.title || undefined}>{timeMeta.label}</span>
                          )}
                        </div>
                        {!readingMode && !isSystemMessage && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-ghost" title="Reply" onClick={() => handleReply && handleReply(m)} style={{ padding: 8, minWidth: 44, minHeight: 44 }}>
                              <FontAwesomeIcon icon={faReply} />
                            </button>
                            {ownMessage && (
                              <>
                                <button className="btn-ghost" title="Edit" onClick={() => handleEdit && handleEdit(m.id, m.text)} style={{ padding: 8, minWidth: 44, minHeight: 44 }}>
                                  <FontAwesomeIcon icon={faEdit} />
                                </button>
                                <button className="btn-ghost" title="Delete" onClick={() => handleDelete && handleDelete(m.id)} style={{ padding: 8, minWidth: 44, minHeight: 44 }}>
                                  <FontAwesomeIcon icon={faTrash} />
                                </button>
                              </>
                            )}
                            <button className="btn-ghost" title="React" onClick={() => setOpenEmojiFor(openEmojiFor === m.id ? null : m.id)} style={{ padding: 8, minWidth: 44, minHeight: 44 }}>
                              <span style={{ fontSize: 14 }}>dY~S</span>
                            </button>
                          </div>
                        )}
                        {isCollapsible && (
                          <button
                            className="btn-ghost"
                            title="Collapse"
                            onClick={() => setCollapsedSystemMessages((prev) => ({ ...prev, [systemKey]: true }))}
                            style={{ padding: 6 }}
                          >
                            <FontAwesomeIcon icon={faChevronDown} />
                          </button>
                        )}
                      </div>
                      <div style={{ color: COLOR_TEXT, marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: 15, textAlign: isSystemMessage && (isMinimalLog || isBubbles || isRetro) ? 'center' : undefined }}>
                        {isSystemMessage ? (
                          systemContent
                        ) : (
                          <>
                            {inviteCode && (
                              <div style={{ marginBottom: 8 }}>
                                <InviteCard
                                  preview={invitePreview || undefined}
                                  status={inviteStatus}
                                  error={inviteError}
                                  isJoined={inviteAlreadyJoined}
                                  isBusy={inviteJoin === "joining"}
                                  onJoin={() => inviteCode && joinInvite && joinInvite(inviteCode)}
                                />
                              </div>
                            )}
                            {m.text}
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(m.reactions && Object.keys(m.reactions).length > 0 && !readingMode)
                          ? Object.entries(m.reactions).map(([emo, users]: any) => {
                              const count = Array.isArray(users) ? users.length : 0;
                              const active = Array.isArray(users) && users.includes(username);
                              return (
                                <button
                                  key={emo}
                                  onClick={() => toggleReaction && toggleReaction(m.id, emo)}
                                  className="btn-ghost"
                                  style={{
                                    padding: isMinimalLog ? '2px 6px' : '4px 8px',
                                    borderRadius: 12,
                                    background: active ? COLOR_PANEL_ALT : 'transparent',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: active ? '#93c5fd' : isMinimalLog ? COLOR_TEXT_MUTED : COLOR_TEXT,
                                    opacity: isMinimalLog ? 0.85 : 1,
                                  }}
                                >
                                  <span style={{ marginRight: 6, fontSize: isMinimalLog ? 12 : 14 }}>{emo}</span>
                                  <span style={{ fontSize: isMinimalLog ? 10 : 12, opacity: 0.9 }}>{count}</span>
                                </button>
                              );
                            })
                          : null}
                      </div>

                      {/* Inline edit UI */}
                      {editId === m.id && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <input value={editText || ''} onChange={(e) => setEditText && setEditText(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: COLOR_CARD_ALT, border: `1px solid ${COLOR_PANEL_ALT}`, color: COLOR_TEXT }} />
                          <button className="btn-primary" onClick={() => handleEditSubmit && handleEditSubmit(m.id)} style={{ padding: '6px 10px', borderRadius: 8 }}>Save</button>
                          <button className="btn-ghost" onClick={() => cancelEdit && cancelEdit()} style={{ padding: '6px 10px', borderRadius: 8 }}>Cancel</button>
                        </div>
                      )}
                      {/* emoji picker inline */}
                      {openEmojiFor === m.id && (
                        <div style={{ marginTop: 8, padding: 8, background: COLOR_CARD_ALT, borderRadius: 10, border: `1px solid ${COLOR_PANEL_ALT}` }}>
                          <EmojiPicker onPick={(char) => { toggleReaction && toggleReaction(m.id, char); setOpenEmojiFor(null); }} onClose={() => setOpenEmojiFor(null)} />
                        </div>
                      )}
                      {m.replyToId && (() => {
                        const parent = messages.find(msg => msg.id === m.replyToId);
                        if (!parent) return null;
                        return (
                          <div
                            onClick={() => {
                              if (!parent.id) return;
                              const el = messagesRef.current?.querySelector(`[data-mid="${parent.id}"]`) as HTMLElement | null;
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            style={{ fontSize: 12, color: COLOR_TEXT_MUTED, background: COLOR_CARD_ALT, border: `1px solid ${COLOR_PANEL_ALT}`, borderRadius: 8, padding: 6, marginTop: 10, cursor: 'pointer' }}
                          >
                            <FontAwesomeIcon icon={faReply} style={{ marginRight: 6 }} />
                            Replying to <strong>{renderNameWithPrefix(parent.user, '@', revealKey)}</strong>: <span style={{ opacity: 0.8 }}>{parent.text.slice(0, 64)}{parent.text.length > 64 ? "..." : ""}</span>
                          </div>
                        );
                      })()}
                    </div>
                    )}
                  </Fragment>
                );
              })}
              {typingUsers && typingUsers.length > 0 && (
                <div style={{ color: COLOR_TEXT_MUTED, fontSize: 13 }}>{typingUsers.join(', ')} typing...</div>
              )}
              </div>
            </div>

            {canCompose && <div style={{ borderTop: `1px solid ${COLOR_PANEL_ALT}`, paddingTop: 8, marginBottom: isMobile ? 8 : 0 }} />}
          </div>
        )}
      </div>

      {dmMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', zIndex: 110 }}
          onClick={() => setDmMenuOpen(false)}
        >
          <div
            style={{ width: '100%', maxHeight: '80vh', background: COLOR_PANEL, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTop: BORDER, paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(148,163,184,0.4)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div style={{ fontWeight: 600 }}>Direct Messages</div>
              <button className="btn-ghost" onClick={() => setDmMenuOpen(false)} style={{ padding: '6px 10px', minHeight: 44 }}>
                Close
              </button>
            </div>
            <div style={{ padding: 12, color: COLOR_TEXT, flex: 1, overflowY: 'auto' }}>
              {dms.length === 0 && (<div style={{ color: 'COLOR_TEXT_MUTED', fontSize: 13 }}>No direct messages.</div>)}
              {dms.map((dm) => {
                const revealKey = `mobile-dm-menu-${dm.id}`;
                const handles = renderDMHandlesNode(dm);
                const isGroup = isGroupDMThread(dm);
                const members = dmMembersWithoutSelf(dm);
                const statusMessage = !isGroup && members[0] ? statusMessageMap[members[0]] : "";
                const richPresence = !isGroup && members[0] ? formatRichPresence(richPresenceMap[members[0]]) : null;
                return (
                  <div
                    key={dm.id}
                    onClick={() => { setSelectedHaven('__dms__'); setSelectedDM(dm.id); setDmMenuOpen(false); setShowMobileNav(false); setActiveNav('activity'); }}
                    style={{ padding: '12px 10px', borderRadius: 10, cursor: 'pointer', background: selectedDM === dm.id ? COLOR_CARD : 'transparent', color: selectedDM === dm.id ? '#93c5fd' : COLOR_TEXT, minHeight: 52 }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600, display: 'flex', flexWrap: 'wrap', gap: 4 }}>{renderDMTitleNode(dm, revealKey)}</span>
                      {handles && (
                        <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {handles}
                        </span>
                      )}
                      {!isGroup && statusMessage && (
                        <span style={{ fontSize: 11, color: '#cbd5f5' }}>{statusMessage}</span>
                      )}
                      {!isGroup && richPresence && (
                        <span style={{ fontSize: 11, color: '#93c5fd' }}>{richPresence}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {actionSheetMessage && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', zIndex: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setActionSheetMessage(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(420px, 94vw)', borderRadius: 18, marginBottom: 16, background: COLOR_PANEL, border: BORDER, padding: 12 }}
          >
            <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, marginBottom: 8 }}>Message actions</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {handleReply && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    handleReply(actionSheetMessage);
                    setActionSheetMessage(null);
                  }}
                  style={{ padding: '12px 14px', textAlign: 'left', minHeight: 44 }}
                >
                  <FontAwesomeIcon icon={faReply} /> Reply
                </button>
              )}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  if (handleEdit && actionSheetMessage?.id) handleEdit(actionSheetMessage.id, actionSheetMessage.text || '');
                  setActionSheetMessage(null);
                }}
                style={{ padding: '12px 14px', textAlign: 'left', minHeight: 44 }}
              >
                <FontAwesomeIcon icon={faEdit} /> Edit message
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  if (handleDelete && actionSheetMessage?.id) handleDelete(actionSheetMessage.id);
                  setActionSheetMessage(null);
                }}
                style={{ padding: '12px 14px', textAlign: 'left', color: '#fca5a5', minHeight: 44 }}
              >
                <FontAwesomeIcon icon={faTrash} /> Delete message
              </button>
              <button type="button" className="btn-ghost" onClick={() => setActionSheetMessage(null)} style={{ padding: '12px 14px', minHeight: 44 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {channelMenuOpen && selectedHaven && selectedHaven !== '__dms__' && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', zIndex: 110 }}
          onClick={() => setChannelMenuOpen(false)}
        >
          <div
            style={{ width: '100%', maxHeight: '80vh', background: COLOR_PANEL, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTop: BORDER, paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(148,163,184,0.4)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div>
                <div style={{ fontWeight: 600 }}>Channels</div>
                <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>{havens[selectedHaven]?.name || selectedHaven}</div>
              </div>
              <button className="btn-ghost" onClick={() => setChannelMenuOpen(false)} style={{ padding: '6px 10px', minHeight: 44 }}>
                Close
              </button>
            </div>
            <div style={{ padding: 12, color: COLOR_TEXT, flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Switch Haven</div>
              {Object.keys(havens).map((h) => (
                <button
                  key={h}
                  className="btn-ghost"
                  onClick={() => {
                    setSelectedHaven(h);
                    const firstChannel = orderedChannelsFor(h)[0] || '';
                    setSelectedChannel && setSelectedChannel(firstChannel);
                  }}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    marginBottom: 6,
                    borderRadius: 10,
                    border: selectedHaven === h ? `1px solid ${accent}` : BORDER,
                    color: selectedHaven === h ? accent : COLOR_TEXT,
                    padding: '12px 10px',
                    minHeight: 48,
                  }}
                >
                  {havens[h]?.name || h}
                </button>
              ))}
            </div>
            <div style={{ padding: 12, color: COLOR_TEXT, flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Channels in {havens[selectedHaven]?.name || selectedHaven}</div>
              {orderedChannelsFor(selectedHaven).length === 0 && <div style={{ color: 'COLOR_TEXT_MUTED', fontSize: 13 }}>No channels yet.</div>}
              {orderedChannelsFor(selectedHaven).map((channel) => (
                <button
                  key={channel}
                  className="btn-ghost"
                  onClick={() => {
                    setSelectedChannel && setSelectedChannel(channel);
                    setChannelMenuOpen(false);
                    setShowMobileNav(false);
                    setActiveNav('channels');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 10px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    minHeight: 48,
                    textAlign: 'left',
                    background: selectedChannel === channel ? COLOR_CARD : 'transparent',
                    color: selectedChannel === channel ? '#93c5fd' : COLOR_TEXT,
                  }}
                >
                  #{channel}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Mobile navigation sheet */}
      {showMobileNav && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', zIndex: 110 }}
          onClick={() => setShowMobileNav(false)}
        >
          <div
            style={{ width: '100%', maxHeight: '85vh', background: COLOR_PANEL, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTop: BORDER, paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(148,163,184,0.4)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div style={{ fontWeight: 600 }}>Navigate</div>
              <button className="btn-ghost" onClick={() => setShowMobileNav(false)} style={{ padding: '6px 10px', minHeight: 44 }}>
                Close
              </button>
            </div>
            <div style={{ padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Havens</div>
              {Object.keys(havens).map((h) => (
                <button
                  key={h}
                  className="btn-ghost"
                  onClick={() => { setSelectedHaven(h); setSelectedChannel && setSelectedChannel(orderedChannelsFor(h)[0] || ''); setSelectedDM && setSelectedDM(null); setShowMobileNav(false); setActiveNav('channels'); }}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 10px', borderRadius: 10, marginBottom: 6, background: selectedHaven === h ? COLOR_CARD : 'transparent', color: selectedHaven === h ? '#93c5fd' : COLOR_TEXT, minHeight: 48 }}
                >
                  {havens[h]?.name || h}
                </button>
              ))}
            </div>
            <div style={{ padding: 12, borderBottom: BORDER, color: COLOR_TEXT }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Channels in {havens[selectedHaven]?.name || selectedHaven}</div>
              {orderedChannelsFor(selectedHaven).map((ch) => (
                <button
                  key={ch}
                  className="btn-ghost"
                  onClick={() => { setSelectedChannel && setSelectedChannel(ch); setSelectedDM && setSelectedDM(null); setShowMobileNav(false); setActiveNav('channels'); }}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 10px', borderRadius: 10, marginBottom: 6, background: selectedChannel === ch ? COLOR_CARD : 'transparent', color: selectedChannel === ch ? '#93c5fd' : COLOR_TEXT, minHeight: 48 }}
                >
                  #{ch}
                </button>
              ))}
            </div>
            <div style={{ padding: 12, color: COLOR_TEXT, flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Direct Messages</div>
              {dms.length === 0 && (<div style={{ color: 'COLOR_TEXT_MUTED', fontSize: 13 }}>No direct messages.</div>)}
              {dms.map((dm) => {
                const revealKey = `mobile-dm-drawer-${dm.id}`;
                const handles = renderDMHandlesNode(dm);
                const isGroup = isGroupDMThread(dm);
                const members = dmMembersWithoutSelf(dm);
                const statusMessage = !isGroup && members[0] ? statusMessageMap[members[0]] : "";
                const richPresence = !isGroup && members[0] ? formatRichPresence(richPresenceMap[members[0]]) : null;
                return (
                  <div
                    key={dm.id}
                    onClick={() => { setSelectedHaven('__dms__'); setSelectedDM(dm.id); setShowMobileNav(false); setActiveNav('activity'); }}
                    style={{ padding: '12px 10px', borderRadius: 10, cursor: 'pointer', background: selectedDM === dm.id ? COLOR_CARD : 'transparent', color: selectedDM === dm.id ? '#93c5fd' : COLOR_TEXT, minHeight: 52 }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600, display: 'flex', flexWrap: 'wrap', gap: 4 }}>{renderDMTitleNode(dm, revealKey)}</span>
                      {handles && (
                        <span style={{ fontSize: 11, color: COLOR_TEXT_MUTED, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {handles}
                        </span>
                      )}
                      {!isGroup && statusMessage && (
                        <span style={{ fontSize: 11, color: '#cbd5f5' }}>{statusMessage}</span>
                      )}
                      {!isGroup && richPresence && (
                        <span style={{ fontSize: 11, color: '#93c5fd' }}>{richPresence}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Jump to bottom button */}
      {!isAtBottom && (
        <div style={{ position: 'fixed', right: 18, bottom: Math.max(200, composerHeight + keyboardOffset + 80), zIndex: 95 }}>
          <button
            className="btn-primary"
            onClick={() => {
              try {
                const el = messagesRef.current;
                if (el) {
                  el.scrollTop = el.scrollHeight;
                  setIsAtBottom(true);
                }
              } catch {}
            }}
            style={{ padding: '8px 12px', borderRadius: 999 }}
          >
            Jump to bottom
          </button>
        </div>
      )}
      {canCompose && (
        <div
          ref={composerRef}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: keyboardOffset,
            background: COLOR_CARD_ALT,
            padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
            borderTop: `1px solid ${COLOR_PANEL_ALT}`,
            zIndex: 95,
          }}
        >
          {mentionOpen && (
            <div ref={mentionPopupRef} style={{ background: COLOR_PANEL, border: BORDER, borderRadius: 12, ...mentionPopupStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottom: BORDER }}>
                <div style={{ color: COLOR_TEXT, fontWeight: 600 }}>Mention someone</div>
                <button type="button" className="btn-ghost" onClick={() => setMentionOpen(false)} style={{ padding: '6px 10px', minHeight: 44 }}>
                  Close
                </button>
              </div>
              <div style={{ padding: 10 }}>
                <input
                  value={mentionQuery}
                  onChange={(e) => setMentionQuery(e.target.value)}
                  placeholder="Search users"
                  className="input-dark"
                  style={{ width: '100%', padding: 10, borderRadius: 10, minHeight: 44 }}
                />
              </div>
              <div>
                {mentionList.map((u, idx) => {
                  const isActive = idx === mentionActiveIndex;
                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => applyMentionSelection(u.username)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderBottom: BORDER,
                        cursor: 'pointer',
                        color: COLOR_TEXT,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: statusColor(presenceMap[u.username]) }} />
                      <span>@{u.username}</span>
                      <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 12 }}>{u.displayName}</span>
                    </button>
                  );
                })}
                {mentionList.length === 0 && (
                  <div style={{ padding: 12, color: COLOR_TEXT_MUTED }}>No users found</div>
                )}
              </div>
            </div>
          )}
          {emojiSheetOpen && (
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: composerHeight + keyboardOffset + 8, zIndex: 120, padding: '0 12px' }}>
              <div style={{ background: COLOR_PANEL, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottom: BORDER }}>
                  <div style={{ fontWeight: 600 }}>Pick an emoji</div>
                  <button type="button" className="btn-ghost" onClick={() => setEmojiSheetOpen(false)} style={{ padding: '6px 10px', minHeight: 44 }}>
                    Close
                  </button>
                </div>
                <div style={{ maxHeight: '40vh', overflow: 'auto' }}>
                  <EmojiPicker onPick={(char) => { setInput((prev) => `${prev}${char}`); setEmojiSheetOpen(false); }} onClose={() => setEmojiSheetOpen(false)} />
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEmojiSheetOpen(true)}
              style={{ padding: 10, minWidth: 44, minHeight: 44, borderRadius: 12 }}
              aria-label="Emoji"
            >
              <FontAwesomeIcon icon={faFaceSmile} />
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const el = inputRef.current;
                if (!el) return;
                const cursor = el.selectionStart ?? input.length;
                const next = `${input.slice(0, cursor)}@${input.slice(cursor)}`;
                setInput(next);
                setMentionOpen(true);
                setMentionQuery("");
                setMentionAnchor({ start: cursor, end: cursor + 1 });
                setMentionActiveIndex(0);
                requestAnimationFrame(() => {
                  try { el.focus(); el.setSelectionRange(cursor + 1, cursor + 1); } catch {}
                });
              }}
              style={{ padding: 10, minWidth: 44, minHeight: 44, borderRadius: 12 }}
              aria-label="Mention"
            >
              <FontAwesomeIcon icon={faAt} />
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => uploadInputRef.current?.click()}
              disabled={!onUploadFiles}
              style={{ padding: 10, minWidth: 44, minHeight: 44, borderRadius: 12, opacity: onUploadFiles ? 1 : 0.5 }}
              aria-label="Attach file"
            >
              <FontAwesomeIcon icon={faPaperclip} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={(e) => {
                const nextValue = e.target.value;
                setInput(nextValue);
                resizeComposerInput();
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
              }}
              onKeyDown={(e) => {
                if (mentionOpen && (e.key === "Enter" || e.key === "Tab")) {
                  const target = mentionList[mentionActiveIndex];
                  if (target) {
                    e.preventDefault();
                    applyMentionSelection(target.username);
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message #channel or DM"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 14,
                background: COLOR_CARD_ALT,
                border: `1px solid ${COLOR_PANEL_ALT}`,
                color: COLOR_TEXT,
                fontSize: 15,
                lineHeight: 1.5,
                minHeight: 44,
                maxHeight: 160,
                resize: 'none',
              }}
            />
            <button className="btn-primary" onClick={() => sendMessage()} style={{ padding: '10px 14px', borderRadius: 12, minHeight: 44 }}>
              Send
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length && onUploadFiles) onUploadFiles(files);
                if (uploadInputRef.current) uploadInputRef.current.value = '';
              }}
            />
          </div>
        </div>
      )}
      {/* Nav controller (desktop hidden, mobile bottom bar visible) */}
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
        setShowUserSettings={setShowUserSettings}
        setShowServerSettings={setShowServerSettings}
        accent={accent}
        lastSelectedDMRef={lastSelectedDMRef}
        setFriendsTab={setFriendsTab}
      />
    </div>
  );
}
