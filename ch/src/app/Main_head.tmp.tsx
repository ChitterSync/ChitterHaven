"use client";

import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReply, faEdit, faTrash, faGear, faThumbtack, faFaceSmile, faXmark, faAt, faPaperclip, faClockRotateLeft, faUsers, faHashtag, faEnvelope, faPlus, faServer, faBars, faMagnifyingGlass, faPaperPlane, faLock, faPhone, faMicrophone, faMicrophoneSlash, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { EMOJI_LIST, filterEmojis, CATEGORIES } from "./emojiData";
import { parseCHInline, resolveCH } from "./chTokens";

const ServerSettingsModal = dynamic(() => import("./ServerSettingsModal"));
const UserSettingsModal = dynamic(() => import("./UserSettingsModal"));
const ProfileModal = dynamic(() => import("./ProfileModal"));

const SOUND_DIALING = "/sounds/Dialing.wav";
const SOUND_RINGTONE = "/sounds/ChitterSync ChitterHaven Ringtone 1.wav";
const SOUND_PING = "/sounds/Ping.wav";

// Simple attachment renderers
type Attachment = { url: string; name: string; type?: string; size?: number };
const getExt = (name?: string) => (name || "").split(".").pop()?.toLowerCase() || "";
const isImage = (t?: string, n?: string) => (t || "").startsWith("image/") || ["png","jpg","jpeg","gif","webp","bmp"].includes(getExt(n));
const isVideo = (t?: string, n?: string) => (t || "").startsWith("video/") || ["mp4","mov","webm","ogg"].includes(getExt(n));
const isAudio = (t?: string, n?: string) => (t || "").startsWith("audio/") || ["mp3","wav","ogg","m4a"].includes(getExt(n));

// Simple, deterministic invite code for a haven (local-only)
const havenCode = (name: string) => {
  const base = name.trim() || "haven";
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  const code = Math.abs(hash).toString(36).toUpperCase();
  return `CH-${code.slice(0, 6)}`;
};

function AttachmentViewer({ a }: { a: Attachment }) {
  if (isImage(a.type, a.name)) return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 6, background: '#0b1222' }}>
      <a href={a.url} target="_blank" rel="noreferrer">
        <img src={a.url} alt={a.name} style={{ maxWidth: 360, borderRadius: 6 }} />
      </a>
    </div>
  );
  if (isVideo(a.type, a.name)) return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 6, background: '#0b1222' }}>
      <video src={a.url} controls style={{ maxWidth: 420, borderRadius: 6 }} />
    </div>
  );
  if (isAudio(a.type, a.name)) return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 6, background: '#0b1222' }}>
      <audio src={a.url} controls />
    </div>
  );
  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 6, background: '#0b1222' }}>
      <a href={a.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{a.name}</a>
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

export default function Main({ username }: { username: string }) {
  const [showServerSettings, setShowServerSettings] = useState(false);
  // Havens: { [havenName]: string[] (channels) }
  const [havens, setHavens] = useState<{ [key: string]: string[] }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("havens");
      if (saved) return JSON.parse(saved);
    }
    return { "ChitterHaven": ["general", "random"] };
  });
  const [selectedHaven, setSelectedHaven] = useState<string>("__dms__");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [dms, setDMs] = useState<{ id: string; users: string[] }[]>([]);
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
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
  const [profileUser, setProfileUser] = useState<string | null>(null);
  const [profileContext, setProfileContext] = useState<string | undefined>(undefined);
  const statusColor = (s?: string) => (s === "online" ? "#22c55e" : s === "idle" ? "#f59e0b" : s === "dnd" ? "#ef4444" : "#6b7280");
  const [showPinned, setShowPinned] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [quickIndex, setQuickIndex] = useState(0);
  const [showMembers, setShowMembers] = useState(false);
  const [havenMembers, setHavenMembers] = useState<string[]>([]);
  const [membersQuery, setMembersQuery] = useState("");
  const [showUserSettings, setShowUserSettings] = useState(false);
  type Toast = { id: string; title: string; body?: string; type?: 'info'|'success'|'warn'|'error' };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const dialingAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);
  const notify = (t: Omit<Toast,'id'>) => {
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

  // --- DM voice call helpers ---
  const setupPeer = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pc.onicecandidate = (ev) => {
      if (ev.candidate && socketRef.current && selectedDM) {
        socketRef.current.emit('ice-candidate', { room: selectedDM, candidate: ev.candidate, from: username });
      }
    };
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      remoteStreamRef.current = stream;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
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
  };

  const ringAgain = () => {
    if (!pcRef.current || !selectedDM) return;
    const desc = pcRef.current.localDescription;
    if (!desc) return;
    const dm = dms.find(d => d.id === selectedDM);
    const targets = dm ? dm.users.filter(u => u !== username) : [];
    socketRef.current?.emit('call-offer', { room: selectedDM, offer: desc, from: username, targets });
  };

  const endCall = () => {
    const endedRoom = activeCallDM;
    const startedAt = callStartedAt;
    setCallState('idle');
    setCallError(null);
    setIncomingCall(null);
    setActiveCallDM(null);
    setCallStartedAt(null);
    setCallInitiator(null);
    setCallSummarySent(false);
    setCallElapsed(0);
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
          const mins = Math.floor(durationSec / 60);
          const secs = durationSec % 60;
          const human = mins ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;
          const room = endedRoom;
          const msg: any = { user: username, text: `Voice call ended \u2022 ${human}`, systemType: 'call-summary' };
          const res = await fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room, msg })
          });
          const data = await res.json();
          if (data.message) {
            socketRef.current?.emit("message", { room, msg: data.message });
            if (selectedHaven === "__dms__" && selectedDM === room) {
              setMessages(prev => [...prev, data.message]);
            }
          }
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
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      const pc = setupPeer();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const dm = dms.find(d => d.id === selectedDM);
      const targets = dm ? dm.users.filter(u => u !== username) : [];
      pendingOfferRef.current = null;
      socketRef.current?.emit('call-offer', { room: selectedDM, offer, from: username, targets });
      setIsMuted(false);
    } catch (e: any) {
      setCallState('idle');
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
  const [groupDMSelection, setGroupDMSelection] = useState<string[]>([]);
  const [userSettings, setUserSettings] = useState<any>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dmsLoaded, setDmsLoaded] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const accent = userSettings.accentHex || '#60a5fa';
  const boldColor = userSettings.boldColorHex || '#ffffff';
  const italicColor = userSettings.italicColorHex || '#ffffff';
  const pinColor = userSettings.pinColorHex || '#facc15';
  const mentionColor = userSettings.mentionColorHex || '#f97316';
  const currentStatus: string = (userSettings.status as string) || 'online';
  const labelHavens = userSettings.callHavensServers ? 'Servers' : 'Havens';
  const labelHaven = userSettings.callHavensServers ? 'Server' : 'Haven';
  const showTipsBanner = userSettings.showTips !== false;
  const callsEnabled = (userSettings as any).callsEnabled !== false;
  const callRingSound = !!(userSettings as any).callRingSound;
  const compact = !!userSettings.compact;
  const showTimestamps = userSettings.showTimestamps !== false;
  const reduceMotion = !!userSettings.reduceMotion;
  const fontMap: Record<string, number> = { small: 13, medium: 14, large: 16 };
  const msgFontSize = fontMap[userSettings.messageFontSize || 'medium'] || 14;
  const codeColor = (userSettings as any).codeColorHex || '#a5b4fc';
  const compactSidebar = !!(userSettings as any).compactSidebar;
  const monospaceMessages = !!(userSettings as any).monospaceMessages;
  const quickButtonsOwn: string[] = Array.isArray((userSettings as any).quickButtonsOwn) ? (userSettings as any).quickButtonsOwn : ['reply','react','more'];
  const quickButtonsOthers: string[] = Array.isArray((userSettings as any).quickButtonsOthers) ? (userSettings as any).quickButtonsOthers : ['reply','react','more'];
  const isBooting = !(settingsLoaded && dmsLoaded && friendsLoaded);
  const [havenFilter, setHavenFilter] = useState("");
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
  type CtxTarget = { type: 'message'|'channel'|'dm'|'blank'|'attachment'; id?: string; data?: any; debug?: boolean };
  const [ctxMenu, setCtxMenu] = useState<{ open: boolean; x: number; y: number; target: CtxTarget } | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newSinceScroll, setNewSinceScroll] = useState(0);
  const roomKey = () => `${selectedDM || `${selectedHaven}__${selectedChannel}`}`;
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [shakeVoice, setShakeVoice] = useState(false);
  const [showNewHavenModal, setShowNewHavenModal] = useState(false);
  const [shakeHavenType, setShakeHavenType] = useState(false);
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
  const [callState, setCallState] = useState<'idle' | 'calling' | 'in-call'>('idle');
  const [callError, setCallError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

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

  // Persist havens to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("havens", JSON.stringify(havens));
    }
  }, [havens]);
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

  // Load user settings
  const loadUserSettings = async () => {
    try {
      const r = await fetch('/api/settings');
      const d = await r.json();
      setUserSettings(d || {});
    } catch {}
    setSettingsLoaded(true);
  };
  useEffect(() => { loadUserSettings(); }, []);

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
        if (d2 && d2.statuses) setPresenceMap((prev) => ({ ...prev, ...d2.statuses }));
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
      setIsMobile(window.innerWidth < 768);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
    socketRef.current.on("message", handleSocketMessage);
    socketRef.current.on("react", handleReact);
    socketRef.current.on("pin", handlePin);
    socketRef.current.on("edit", handleEditEvent);
    socketRef.current.on("delete", handleDeleteEvent);
    return () => {
      ignore = true;
      socketRef.current?.off("message", handleSocketMessage);
      socketRef.current?.off("react", handleReact);
      socketRef.current?.off("pin", handlePin);
      socketRef.current?.off("edit", handleEditEvent);
      socketRef.current?.off("delete", handleDeleteEvent);
    };
  }, [selectedHaven, selectedChannel, selectedDM]);

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

  // Load haven members when sidebar is open in a haven
  useEffect(() => {
    let ignore = false;
    if (!showMembers || selectedHaven === '__dms__') return;
    fetch(`/api/haven-members?haven=${encodeURIComponent(selectedHaven)}`)
      .then(r => r.json())
      .then(d => {
        if (ignore) return;
        const list = Array.isArray(d.users) ? d.users : [];
        setHavenMembers(list);
        if (list.length > 0) {
          fetch(`/api/user-status?users=${encodeURIComponent(list.join(','))}`)
            .then(r=>r.json())
            .then(s => { if (!ignore && s?.statuses) setPresenceMap(prev => ({ ...prev, ...s.statuses })); })
            .catch(()=>{});
        }
      })
      .catch(()=>{});
    return () => { ignore = true; };
  }, [showMembers, selectedHaven]);

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
      setCallSummarySent(false);

      // If we're already in this DM, auto-accept the call
      if (selectedHaven === '__dms__' && selectedDM === data.room) {
        try {
          setCallError(null);
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
          if (localAudioRef.current) {
            localAudioRef.current.srcObject = stream;
          }
          const pc = setupPeer();
          stream.getTracks().forEach(t => pc.addTrack(t, stream));
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.emit('call-answer', { room: data.room, answer, from: username });
          setCallState('in-call');
          setCallStartedAt(Date.now());
        } catch (e: any) {
          setCallError(e?.message || 'Could not join call');
          setCallState('idle');
        }
        return;
      }

      // Otherwise, show an incoming call popup and start ringtone if enabled
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
          const ring = new Audio(SOUND_RINGTONE);
          ring.loop = true;
          ring.volume = Math.max(0, Math.min(1, userSettings?.notifications?.volume ?? 0.6));
          ring.play().catch(() => {});
          ringAudioRef.current = ring;
        } catch {}
      }
    };
    const answerHandler = async (data: { room: string; answer: RTCSessionDescriptionInit; from: string }) => {
      if (!selectedDM || data.room !== selectedDM) return;
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState('in-call');
        setCallStartedAt(Date.now());
        if (!callInitiator) setCallInitiator(username);
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
      if (!selectedDM || data.room !== selectedDM) return;
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {}
    };
    socketRef.current.on('call-offer', offerHandler);
    socketRef.current.on('call-answer', answerHandler);
    socketRef.current.on('ice-candidate', iceHandler);
    return () => {
      socketRef.current?.off('presence', handler);
      socketRef.current?.off('online-count', countHandler);
      socketRef.current?.off('call-offer', offerHandler);
      socketRef.current?.off('call-answer', answerHandler);
      socketRef.current?.off('ice-candidate', iceHandler);
    };
  }, [selectedDM, username]);

  // Broadcast my current status when settings or socket change
  useEffect(() => {
    if (!socketRef.current) return;
    try {
      socketRef.current.emit('presence', { user: username, status: currentStatus });
      setPresenceMap(prev => ({ ...prev, [username]: currentStatus }));
    } catch {}
  }, [currentStatus, username]);

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
            const arr = (prev[selectedHaven] || []).slice();
            const idx = arr.indexOf(ch);
            if (idx >= 0) arr[idx] = next;
            const out = { ...prev, [selectedHaven]: arr };
            return out;
          });
          if (selectedChannel === ch) setSelectedChannel(next);
        }
      }
      if (act === 'delete' && permState.canManageChannels) {
        setHavens(prev => {
          const arr = (prev[selectedHaven] || []).filter(c => c !== ch);
          const out = { ...prev, [selectedHaven]: arr };
          return out;
        });
        if (selectedChannel === ch) setSelectedChannel(havens[selectedHaven]?.[0] || '');
      }
    }
    if (t.type === 'dm' && t.data) {
      const dm = t.data as { id: string; users: string[] };
      if (act === 'copy_users') copyText(dm.users.join(', '));
      if (act === 'close') setDMs(prev => prev.filter(x => x.id !== dm.id));
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
    items.push({ id: 'd:home', label: 'Friends — Direct Messages', type: 'dmhome' });
    Object.keys(havens).forEach(h => {
      items.push({ id: `h:${h}`, label: `Haven · ${h}`, type: 'haven', haven: h });
      (havens[h] || []).forEach(ch => items.push({ id: `c:${h}:${ch}`, label: `#${ch} — ${h}`, type: 'channel', haven: h, channel: ch }));
    });
    dms.forEach(dm => items.push({ id: `d:${dm.id}`, label: `DM · ${dm.users.filter(u => u !== username).join(', ')}`, type: 'dm', dmId: dm.id }));
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
      setSelectedChannel(havens[it.haven]?.[0] || '');
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
        if (d && d.statuses) setPresenceMap(prev => ({ ...prev, ...d.statuses }));
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
  const commonEmojis = ["👍","❤️","😂","😮","🎉","👀"];
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
    setSelectedChannel(havens[haven][0] || "");
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

  const handleCreateChannel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newChannel.trim().replace(/\s+/g, "-").toLowerCase();
    if (name && !havens[selectedHaven].includes(name)) {
      setHavens(prev => ({
        ...prev,
        [selectedHaven]: [...prev[selectedHaven], name]
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
            const hName = String(data.haven);
            if (!havens[hName]) {
              setHavens(prev => ({ ...prev, [hName]: ["general"] }));
            }
            setSelectedHaven(hName);
            setSelectedChannel((havens[hName] && havens[hName][0]) || "general");
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
        setSelectedChannel(havens[name][0] || 'general');
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
        setSelectedChannel(havens[found][0] || 'general');
        setNewHaven("");
        setShowNewHavenModal(false);
        return;
      }
      notify({ title: 'Haven not found', body: `No haven, invite code, or link "${raw}" exists on this client.`, type: 'warn' });
      return;
    }
    if (!havens[name]) {
      setHavens(prev => ({ ...prev, [name]: ["general"] }));
      // Set creator as Owner role for this haven
      try {
        await fetch("/api/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ haven: name, action: "set-owner", user: username })
        });
      } catch {}
    }
    setSelectedHaven(name);
    setSelectedChannel("general");
    setNewHaven("");
    setShowNewHavenModal(false);
  };

  // Typing + mentions
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionList, setMentionList] = useState<{ username: string; displayName: string; avatarUrl: string }[]>([]);
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
    return () => { ignore = true; };
  }, [mentionOpen, mentionQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    const room = roomKey();
    try { localStorage.setItem(`draft:${room}` , e.target.value); } catch {}
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

  // Hover state for message hover controls + shift key tracking used elsewhere in the component
  const [hoveredMsg, setHoveredMsgState] = useState<string | null>(null);
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

  // Provide a compatible setter used throughout the component.
  // Accepts either a string (id) or an updater function like React's setState.
  const setHoveredMsg = (idOrUpdater: string | ((prev: string | null) => string | null)) => {
    if (typeof idOrUpdater === "function") {
      setHoveredMsgState(prev => (idOrUpdater as (prev: string | null) => string | null)(prev));
    } else {
      setHoveredMsgState(idOrUpdater);
    }
  };
  return (
      <div
        className="ch-shell"
        style={{
          display: "flex",
          height: isMobile ? "calc(100vh - 1rem)" : "70vh",
          width: "100%",
          maxWidth: isMobile ? "100%" : 1100,
          minWidth: 320,
          margin: isMobile ? "0.5rem auto" : "2rem auto",
          border: "1px solid #2a3344",
          borderRadius: isMobile ? 10 : 14,
          background: "linear-gradient(180deg, rgba(15,23,42,0.85), rgba(17,24,39,0.82))",
          boxShadow: isMobile ? "0 8px 24px rgba(0,0,0,0.4)" : "0 12px 40px rgba(0,0,0,0.35)",
          filter: isBooting ? 'blur(4px)' : 'none',
          pointerEvents: isBooting ? 'none' : 'auto'
        }}
      >
      {/* Havens sidebar */}
      <aside style={{ width: compactSidebar ? 120 : 160, background: '#0b1222', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #111827', color: '#e5e7eb', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FontAwesomeIcon icon={faServer} /> {labelHavens}</span>
          {selectedHaven !== '__dms__' && permState.canManageServer && (
            <button title="Server Settings" style={{ background: 'none', border: '1px solid #1f2937', borderRadius: 8, color: accent, cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center' }} onClick={() => setShowServerSettings(true)}>
              <FontAwesomeIcon icon={faGear} />
            </button>
          )}
        </div>
        <div style={{ padding: 10, borderBottom: '1px solid #111827' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 8, padding: '6px 8px' }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ color: '#9ca3af' }} />
            <input value={havenFilter} onChange={(e)=> setHavenFilter(e.target.value)} placeholder="Search havens" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e5e7eb', fontSize: 13 }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          <div key="__dms__" onClick={() => { setSelectedHaven('__dms__'); setSelectedChannel(''); setSelectedDM(null); }} title="Direct Messages" style={{ padding: '10px 10px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: selectedHaven === '__dms__' ? '#111a2e' : '#0b1222', color: selectedHaven === '__dms__' ? accent : '#e5e7eb', fontWeight: selectedHaven === '__dms__' ? 700 : 500, border: '1px solid #1f2937', borderLeft: selectedHaven === '__dms__' ? `3px solid ${accent}` : '3px solid transparent', borderRadius: 10 }}>
            <FontAwesomeIcon icon={faEnvelope} /> <span>Direct Messages</span>
          </div>
          {Object.keys(havens)
            .filter(h => h.toLowerCase().includes(havenFilter.trim().toLowerCase()))
            .map(haven => (
              <div key={haven} onClick={() => handleHavenChange(haven)} title={`${labelHaven} ${haven} · Code: ${havenCode(haven)}`} style={{ padding: '10px 10px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: selectedHaven === haven ? '#111a2e' : '#0b1222', color: selectedHaven === haven ? accent : '#e5e7eb', fontWeight: selectedHaven === haven ? 700 : 500, border: '1px solid #1f2937', borderLeft: selectedHaven === haven ? `3px solid ${accent}` : '3px solid transparent', borderRadius: 10 }}>
                <FontAwesomeIcon icon={faServer} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{haven}</span>
              </div>
            ))}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid #111827' }}>
          <button
            type="button"
            className="btn-ghost"
            title="Join or create haven"
            onClick={() => { setNewHaven(""); setNewHavenType('standard'); setHavenAction('create'); setShowNewHavenModal(true); }}
            style={{ width: '100%', justifyContent: 'center', padding: '8px 10px', color: accent, borderRadius: 8, border: '1px solid #1f2937', background: '#020617' }}
          >
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} /> New Haven
          </button>
        </div>
      </aside>
      {/* Channels / DMs sidebar */}
      <aside style={{ width: compactSidebar ? 180 : 220, background: '#0f172a', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #111827', color: '#e5e7eb', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
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
        <div style={{ padding: 10, borderBottom: '1px solid #111827' }}>
          {showInvitePanel && selectedHaven !== '__dms__' && (
            <div style={{ marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#020617', color: '#e5e7eb', fontSize: 12 }}>
              <div style={{ marginBottom: 6 }}>Invite to <span style={{ color: accent }}>{selectedHaven}</span></div>
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
                        border: inviteDays === d ? `1px solid ${accent}` : '1px solid #1f2937',
                        color: inviteDays === d ? accent : '#e5e7eb'
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
                        border: inviteMaxUses === n ? `1px solid ${accent}` : '1px solid #1f2937',
                        color: inviteMaxUses === n ? accent : '#e5e7eb'
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
                {creatingInvite ? 'Creating…' : 'Generate Invite'}
              </button>
              {inviteCode && (
                <div style={{ marginTop: 6, color: '#9ca3af' }}>Last invite: <span style={{ color: '#e5e7eb' }}>{inviteCode}</span></div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0b1222', border: '1px solid #1f2937', borderRadius: 8, padding: '6px 8px' }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ color: '#9ca3af' }} />
            {selectedHaven === "__dms__" ? (
              <input value={dmFilter} onChange={(e)=> setDmFilter(e.target.value)} placeholder="Search DMs" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e5e7eb', fontSize: 13 }} />
            ) : (
              <input value={channelFilter} onChange={(e)=> setChannelFilter(e.target.value)} placeholder="Search channels" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e5e7eb', fontSize: 13 }} />
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {selectedHaven === "__dms__" ? (
            <>
              <div key="friends-home" onClick={() => setSelectedDM(null)} style={{ padding: '10px 12px', cursor: 'pointer', background: selectedDM === null ? '#111a2e' : 'transparent', color: selectedDM === null ? accent : '#e5e7eb', fontWeight: selectedDM === null ? 700 : 500, borderRadius: 10, border: selectedDM === null ? '1px solid #1f2937' : '1px solid transparent', marginBottom: 6 }}>
                <FontAwesomeIcon icon={faEnvelope} /> Friends
              </div>
              {dms.length === 0 ? (
                <div style={{ color: '#9ca3af', padding: 12 }}>No DMs yet.</div>
              ) : (
                dms
                  .filter(dm => dm.users.filter(u => u !== username).join(', ').toLowerCase().includes(dmFilter.trim().toLowerCase()))
                  .map(dm => {
                    const others = dm.users.filter(u => u !== username);
                    const status = statusColor(presenceMap[others[0]]);
                    return (
                      <div key={dm.id} onClick={() => { setSelectedDM(dm.id); }} onContextMenu={(e) => openCtx(e, { type: 'dm', data: dm })} style={{ padding: '10px 12px', cursor: 'pointer', background: selectedDM === dm.id ? '#111a2e' : 'transparent', color: selectedDM === dm.id ? accent : '#e5e7eb', fontWeight: selectedDM === dm.id ? 700 : 500, borderRadius: 10, border: selectedDM === dm.id ? '1px solid #1f2937' : '1px solid transparent', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: status }} />
                        <FontAwesomeIcon icon={faUsers} /> {others.join(', ')}
                      </div>
                    );
                  })
              )}
            </>
          ) : (
            (havens[selectedHaven] || [])
              .filter(ch => ch.toLowerCase().includes(channelFilter.trim().toLowerCase()))
              .map((ch) => (
                <div key={ch} onClick={() => { setSelectedDM(null); handleChannelChange(ch); }} onContextMenu={(e) => openCtx(e, { type: 'channel', data: ch })} style={{ padding: '10px 12px', cursor: 'pointer', background: selectedChannel === ch ? '#111a2e' : 'transparent', color: selectedChannel === ch ? accent : '#e5e7eb', fontWeight: selectedChannel === ch ? 700 : 500, borderRadius: 10, border: selectedChannel === ch ? '1px solid #1f2937' : '1px solid transparent', marginBottom: 6 }}>
                  <FontAwesomeIcon icon={faHashtag} /> #{ch}
                </div>
              ))
          )}
        </div>
        {selectedHaven !== "__dms__" && permState.canManageChannels && (
          <div style={{ padding: 12, borderTop: '1px solid #111827', background: '#0f172a' }}>
            <button
              type="button"
              className="btn-ghost"
              title="Create channel"
              onClick={() => { setNewChannel(""); setNewChannelType('text'); setShowNewChannelModal(true); }}
              style={{ width: '100%', justifyContent: 'center', padding: '8px 10px', color: accent, borderRadius: 8, border: '1px solid #1f2937', background: '#020617' }}
            >
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} /> New Channel
            </button>
          </div>
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
                    <input value={addFriendName} onChange={(e)=> setAddFriendName(e.target.value)} placeholder="Add friend by username" className="input-dark" style={{ padding: '6px 8px', width: 220 }} />
                    <button className="btn-ghost" type="submit" style={{ padding: '6px 10px' }}>
                      <FontAwesomeIcon icon={faUserPlus} />
                    </button>
                  </form>
                )}
                {!showAddFriend && (
                  <button className="btn-ghost" onClick={()=> setShowAddFriend(true)} title="Add Friend" style={{ padding: '6px 10px' }}>
                    <FontAwesomeIcon icon={faUserPlus} />
                  </button>
                )}
                <button
                  className="btn-ghost"
                  onClick={() => { setShowGroupDM(true); setGroupDMName(""); setGroupDMSelection([]); }}
                  title="New Group DM"
                  style={{ padding: '6px 10px' }}
                >
                  <FontAwesomeIcon icon={faUsers} /> New Group
                </button>
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
              const others = dm ? dm.users.filter(u => u !== username) : [];
              const title = others.join(', ') || 'Direct Message';
              const dotColor = statusColor(presenceMap[others[0]]);
              return (
                <>
                  <FontAwesomeIcon icon={faEnvelope} />
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor, display: 'inline-block', marginLeft: 8, marginRight: 6 }} />
                  <span style={{ color: accent }}>{title}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
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
              <FontAwesomeIcon icon={faServer} /> {selectedHaven} {selectedChannel && (<span style={{ color: accent }}>/ #{selectedChannel}</span>)}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {userSettings.showOnlineCount !== false && (() => {
                  const onlineUsers = Object.entries(presenceMap)
                    .filter(([_, s]) => s && s !== 'offline')
                    .map(([u]) => u)
                    .sort();
                  const title = onlineUsers.length
                    ? `Online (${onlineUsers.length}): ${onlineUsers.join(', ')}`
                    : 'Online: 0';
                  return (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setShowMembers(v => !v)}
                      title={title}
                      style={{ padding: '6px 8px', color: '#9ca3af' }}
                    >
                      <FontAwesomeIcon icon={faUsers} /> {onlineCount}
                    </button>
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
          )}
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: userSettings.chatStyle === 'classic' ? "#0f172a" : "linear-gradient(180deg, rgba(15,23,42,0.45), rgba(17,24,39,0.35))",
            padding: compact ? 12 : 16,
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
          {selectedHaven === "__dms__" && selectedDM && activeCallDM === selectedDM && callState !== 'idle' && (
            <div style={{ marginBottom: 8, padding: 8, borderRadius: 8, background: '#111827', border: '1px solid #1f2937', fontSize: 12, color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22c55e', display: 'inline-block' }} />
              <span>Voice call in progress</span>
              <span style={{ marginLeft: 'auto', color: '#a5b4fc' }}>
                {`${Math.floor(callElapsed / 60)
                  .toString()
                  .padStart(1, '0')}:${(callElapsed % 60).toString().padStart(2, '0')}`}
              </span>
            </div>
          )}
          {showTipsBanner && !(selectedHaven === "__dms__" && !selectedDM) && (
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, border: '1px solid #1f2937', background: 'rgba(15,23,42,0.9)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
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
                    if (list.length === 0) return <div style={{ color: '#94a3b8' }}>No friends {friendsTab === 'online' ? 'online' : 'yet'}.</div>;
                    return list.map(u => (
                      <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #1f2937', background: '#0b1222', borderRadius: 10, marginBottom: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: statusColor(presenceMap[u]), display: 'inline-block' }} />
                        <span style={{ fontWeight: 600 }}>{u}</span>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <button className="btn-ghost" onClick={()=> ensureDM(u)} style={{ padding: '6px 10px' }}>Message</button>
                          <button className="btn-ghost" onClick={()=> friendAction('remove', u)} style={{ padding: '6px 10px', color: '#f87171' }}>Remove</button>
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              )}
              {friendsTab === 'pending' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 6 }}>Incoming</div>
                    {friendsState.incoming.length === 0 ? (
                      <div style={{ color: '#94a3b8' }}>No incoming requests.</div>
                    ) : (
                      friendsState.incoming.map(u => (
                        <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #1f2937', background: '#0b1222', borderRadius: 10, marginBottom: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: statusColor(presenceMap[u]), display: 'inline-block' }} />
                          <span style={{ fontWeight: 600 }}>{u}</span>
                          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                            <button className="btn-ghost" onClick={()=> friendAction('accept', u)} style={{ padding: '6px 10px', color: '#22c55e' }}>Accept</button>
                            <button className="btn-ghost" onClick={()=> friendAction('decline', u)} style={{ padding: '6px 10px', color: '#f87171' }}>Decline</button>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 6 }}>Outgoing</div>
                    {friendsState.outgoing.length === 0 ? (
                      <div style={{ color: '#94a3b8' }}>No outgoing requests.</div>
                    ) : (
                      friendsState.outgoing.map(u => (
                        <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #1f2937', background: '#0b1222', borderRadius: 10, marginBottom: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: statusColor(presenceMap[u]), display: 'inline-block' }} />
                          <span style={{ fontWeight: 600 }}>{u}</span>
                          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                            <button className="btn-ghost" onClick={()=> friendAction('cancel', u)} style={{ padding: '6px 10px', color: '#f59e0b' }}>Cancel</button>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
          <>
          {messages.map((msg, idx) => (
            <div key={msg.id || `${msg.user}-${msg.timestamp}-${idx}`}
              ref={(el) => { if (msg.id) messageRefs.current[msg.id] = el; }}
              onContextMenu={(e) => openCtx(e, { type: 'message', id: msg.id })}
              style={{ marginBottom: compact ? 10 : 16, position: "relative", padding: compact ? 6 : 8, borderRadius: 6, background: "#23232a", transition: "background 0.2s", borderLeft: msg.pinned ? `3px solid ${pinColor}` : "3px solid transparent" }}
              onMouseEnter={() => setHoveredMsg(msg.id)}
              onMouseLeave={() => setHoveredMsg(prev => prev === msg.id ? null : prev)}
            >
              {/* In-box actions: show on hover. Configurable quick buttons, Shift = full tools */}
              {hoveredMsg === msg.id && (
                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 6 }}>
                  {(() => {
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
                          {((msg.user === username && (msg as any).systemType !== 'call-summary') || permState.canManageMessages) && (
                            <>
                              {msg.user === username && (msg as any).systemType !== 'call-summary' && (
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
                    const isOwn = msg.user === username;
                    const base = isOwn ? quickButtonsOwn : quickButtonsOthers;
                    const havenPreset = adminQuickButtons && (permState.canManageServer || permState.canManageMessages)
                      ? (isOwn ? adminQuickButtons.own : adminQuickButtons.others)
                      : null;
                    const keys = (havenPreset && havenPreset.length ? havenPreset : base) || [];
                    const uniqueKeys = Array.from(new Set(keys));
                    const buttons: JSX.Element[] = [];
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
                        if (!(isOwn && (msg as any).systemType !== 'call-summary')) return;
                        buttons.push(
                          <button key="qb-edit" onClick={() => handleEdit(msg.id, msg.text)} className="btn-ghost" title="Edit" style={{ padding: '2px 6px' }}>
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                        );
                        return;
                      }
                      if (key === 'delete') {
                        if (!(isOwn || permState.canManageMessages)) return;
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
                      // Fallback to More if user removed everything
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
                  })()}
                </div>
              )}
              <div style={{ fontSize: msgFontSize - 1, color: "#a1a1aa", marginBottom: compact ? 4 : 6, wordBreak: "break-word", whiteSpace: "pre-line", display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor(presenceMap[msg.user]), marginRight: 6 }} />
                <button onClick={() => { setProfileUser(msg.user); setProfileContext(selectedHaven !== '__dms__' ? 'Viewing Haven Profile' : undefined); }} style={{ color: accent, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{msg.user}</button>
                {showTimestamps && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#666" }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                )}
                {msg.edited && <span style={{ marginLeft: 6, fontSize: 10, color: "#facc15" }}>(edited)</span>}
              </div>
              {msg.replyToId && (() => {
                const parent = messages.find(m => m.id === msg.replyToId);
                if (!parent) return null;
                return (
                  <div onClick={() => { const el = messageRefs.current[msg.replyToId!]; el?.scrollIntoView({ behavior: "smooth", block: "center" }); }} style={{ fontSize: 12, color: "#94a3b8", background: "#0b1222", border: "1px solid #1f2937", borderRadius: 6, padding: 6, marginBottom: 6, cursor: "pointer" }}>
                    <FontAwesomeIcon icon={faReply} style={{ marginRight: 6 }} /> Replying to <strong>@{parent.user}</strong>: <span style={{ opacity: 0.8 }}>{parent.text.slice(0, 64)}{parent.text.length > 64 ? "..." : ""}</span>
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
                <div style={{ wordBreak: "break-word", whiteSpace: "pre-line", fontSize: msgFontSize, fontFamily: monospaceMessages ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : undefined }}>
                  {(() => {
                    const base = chResolved[msg.id] ?? msg.text ?? "";
                    const withMentions = base.replace(new RegExp(`@${username}\\b`, 'g'), `**[@${username}](mention://self)**`);
                    return (
                  <ReactMarkdown
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
                      img: (props: any) => (
                        // Right-click images in markdown to set avatar/banner
                        <img
                          {...props}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            const src = props.src || '';
                            const alt = props.alt || '';
                            openCtx(e as any, { type: 'attachment', data: { url: src, name: alt, type: 'image/*' } });
                          }}
                          style={{ maxWidth: '360px', borderRadius: 6, border: '1px solid #1f2937', background: '#0b1222' }}
                        />
                      ),
                      li: (props) => <li {...props} style={{ marginLeft: 16 }} />,
                    }}
                  >
                    {withMentions}
                  </ReactMarkdown>
                    );
                  })()}
                </div>
              )}
              {msg.attachments && msg.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {msg.attachments.map((a, i) => (
                    <div key={`${msg.id}-att-${i}`} onContextMenu={(e)=> openCtx(e, { type: 'attachment', data: a })} title={isImage(a.type, a.name) ? 'Right click: set as avatar/banner' : undefined}>
                      <AttachmentViewer a={a} />
                    </div>
                  ))}
                </div>
              )}
              {(msg.reactions && Object.keys(msg.reactions).length > 0) && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {Object.entries(msg.reactions).map(([emoji, users]) => {
                    const reacted = users.includes(username);
                    const count = users.length;
                    return (
                      <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 999, border: "1px solid #1f2937", background: reacted ? "#111a2e" : "#0b1222", color: reacted ? "#93c5fd" : "#cbd5e1", cursor: "pointer" }}>
                        <span style={{ fontSize: 14 }}>{emoji}</span>
                        <span style={{ fontSize: 12 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {pickerFor === msg.id && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, zIndex: 70 }}>
                  <div className="glass" style={{ width: 'min(720px, 92vw)', maxHeight: '70vh', overflow: 'hidden', borderRadius: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid #2a3344' }}>
                      <div style={{ color: '#e5e7eb', fontWeight: 600 }}>Add Reaction</div>
                      <button onClick={() => setPickerFor(null)} className="btn-ghost" style={{ padding: '4px 8px' }}><FontAwesomeIcon icon={faXmark} /></button>
                    </div>
                    <div style={{ padding: 10, borderBottom: '1px solid #111827', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ color: '#9ca3af', fontSize: 12 }}>Quick:</div>
                      {commonEmojis.map((e) => (
                        <button key={e} onClick={() => { toggleReaction(pickerFor!, e); setPickerFor(null); }} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #1f2937', background: '#0b1222', cursor: 'pointer', fontSize: 18 }}>{e}</button>
                      ))}
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        {CATEGORIES.map(cat => (
                          <button key={cat.key} className="btn-ghost" onClick={() => setEmojiCategory(cat.key)} style={{ padding: '4px 8px', borderColor: emojiCategory === cat.key ? '#93c5fd' : undefined, color: emojiCategory === cat.key ? '#93c5fd' : undefined }}>{cat.label}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: 10 }}>
                      <input value={emojiQuery} onChange={(e) => setEmojiQuery(e.target.value)} placeholder="Search emojis" className="input-dark" style={{ width: '100%', padding: 10 }} />
                    </div>
                    <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0,1fr))', gap: 6 }}>
                      {filterEmojis(emojiQuery, emojiCategory).map((em) => (
                        <button key={em.char+em.name} title={em.name} onClick={() => { toggleReaction(pickerFor!, em.char); setPickerFor(null); }} style={{ background: '#0f172a', border: '1px solid #1f2937', padding: 6, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>{em.char}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
      {typingUsers.length > 0 && (
        <div style={{ color: "#60a5fa", fontSize: 13, margin: "8px 0 0 16px" }}>
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}
      <div ref={messagesEndRef} />
      </>
      )}
          {(!isAtBottom || newSinceScroll > 0) && (
            <div style={{ position: 'absolute', right: 16, bottom: 16 }}>
              <button className="btn-ghost" onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' as ScrollBehavior }); setIsAtBottom(true); setNewSinceScroll(0); }} style={{ padding: '8px 12px', border: '1px solid #1f2937', borderRadius: 999, background: '#0b1222', color: '#e5e7eb' }}>
                Jump to latest {newSinceScroll > 0 ? `(${newSinceScroll})` : ''}
              </button>
            </div>
          )}
        </div>
        {/* Members sidebar with smooth slide + search */}
        {selectedHaven !== '__dms__' && (
          <aside style={{ position: 'absolute', top: 0, right: showMembers ? 0 : -260, bottom: 0, width: 260, borderLeft: '1px solid #2a3344', background: '#0b1222', padding: 12, transition: 'right 160ms ease', pointerEvents: showMembers ? 'auto' : 'none', opacity: showMembers ? 1 : 0.0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #111827', paddingBottom: 8 }}>
              <div style={{ color: '#e5e7eb', fontWeight: 600 }}>
                Members
              </div>
              <button className="btn-ghost" onClick={() => setShowMembers(false)} title="Close" style={{ padding: '4px 8px' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div style={{ paddingTop: 8 }}>
              <input value={membersQuery} onChange={(e)=> setMembersQuery(e.target.value)} placeholder="Search members" className="input-dark" style={{ width: '100%', padding: 8, borderRadius: 8 }} />
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 88px)', paddingTop: 8 }}>
              {havenMembers.length === 0 ? (
                <div style={{ color: '#94a3b8' }}>No members found.</div>
              ) : (() => {
                const query = membersQuery.trim().toLowerCase();
                const filtered = havenMembers.filter(name => name.toLowerCase().includes(query));
                const online = filtered.filter(name => (presenceMap[name] || 'offline') !== 'offline');
                const offline = filtered.filter(name => (presenceMap[name] || 'offline') === 'offline');
                const ordered = [...online, ...offline];
                return ordered.map((name) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderBottom: '1px solid #111827' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor(presenceMap[name]) }} />
                    <button onClick={() => { setProfileUser(name); setProfileContext('Viewing Haven Profile'); }} className="btn-ghost" style={{ padding: 0, color: '#e5e7eb' }}>@{name}</button>
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
            borderTop: "1px solid #2a3344",
            padding: 12,
            background: "rgba(17,24,39,0.6)",
            position: 'relative'
          }}
        >
          {/* Reply bar */}
          {replyTo && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 12, right: 12, background: '#0b1222', border: '1px solid #1f2937', borderRadius: 10, zIndex: 11, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faReply} />
              <div style={{ color: '#e5e7eb', fontSize: 13 }}>
                Replying to <strong>@{replyTo.user}</strong>: <span style={{ color: '#94a3b8' }}>{replyTo.text.slice(0, 80)}{replyTo.text.length > 80 ? '…' : ''}</span>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setReplyTo(null)} style={{ marginLeft: 'auto', padding: '4px 8px' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          )}
          {/* Mention popup */}
          {mentionOpen && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 12, background: '#0b1222', border: '1px solid #1f2937', borderRadius: 10, zIndex: 10, width: 360, maxHeight: '40vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #111827' }}>
                <div style={{ color: '#e5e7eb', fontWeight: 600 }}>@ Mention</div>
                <button type="button" className="btn-ghost" onClick={() => setMentionOpen(false)} style={{ padding: '2px 6px' }}><FontAwesomeIcon icon={faXmark} /></button>
              </div>
              <div style={{ padding: 8 }}>
                <input value={mentionQuery} onChange={(e)=> setMentionQuery(e.target.value)} placeholder="Search users" className="input-dark" style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                {mentionList.map(u => (
                  <div key={u.username} onClick={() => { const at = `@${u.username} `; const el = inputRef.current; if (el) { const pos = el.selectionStart || el.value.length; const v = el.value; const b = v.slice(0, pos); const a = v.slice(pos); el.value = b + at + a; setInput(el.value); setMentionOpen(false); setMentionQuery(""); el.focus(); el.setSelectionRange((b+at).length, (b+at).length); } }} style={{ padding: '8px 12px', borderBottom: '1px solid #111827', cursor: 'pointer', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor(presenceMap[u.username]) }} />
                    <span>@{u.username}</span>
                    <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 12 }}>{u.displayName}</span>
                  </div>
                ))}
                {mentionList.length === 0 && (
                  <div style={{ padding: 12, color: '#94a3b8' }}>No users found</div>
                )}
              </div>
            </div>
          )}
          {/* Upload previews + progress */}
          {(uploadItems.length > 0 || pendingFiles.length > 0) && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 12, right: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {uploadItems.map(u => (
                <div key={u.id} style={{ border: '1px solid #1f2937', background: '#0b1222', borderRadius: 8, padding: 8, width: 260 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {u.type?.startsWith('image/') && u.localUrl ? (
                      <img src={u.localUrl} alt={u.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>{u.name}</span>
                    )}
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{(u.size/1024).toFixed(1)} KB</div>
                  </div>
                  <div style={{ marginTop: 6, height: 6, background: '#111827', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${u.progress}%`, height: '100%', background: '#60a5fa', transition: 'width .15s linear' }} />
                  </div>
                </div>
              ))}
              {pendingFiles.map((f, i) => (
                <div key={`pf-${i}`} style={{ border: '1px solid #1f2937', background: '#0b1222', borderRadius: 8, padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
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
              if (e.key === "@") { setMentionOpen(true); setMentionQuery(""); }
              if (e.key === "Enter" && (e.ctrlKey || !e.shiftKey)) { e.preventDefault(); sendMessage(); }
              if (e.key === 'ArrowUp' && !input) {
                const mine = [...messages].filter(m => m.user === username).pop();
                if (mine) { e.preventDefault(); handleEdit(mine.id, mine.text); }
              }
            }}
            placeholder={permState.canSend
              ? (selectedDM ? `Message ${(() => { const dm = dms.find(d => d.id === selectedDM); return dm ? dm.users.filter(u => u !== username).join(', ') : 'DM'; })()}` : `Message #${selectedChannel}`)
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
            <button type="button" className="btn-ghost" onClick={() => setMentionOpen(true)} title="Mention someone (@)" style={{ marginRight: 8, padding: "8px 10px" }}>
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
            border: '1px solid #1f2937',
            background: 'rgba(15,23,42,0.96)',
            color: '#e5e7eb',
            maxWidth: isMobile ? 'calc(100vw - 16px)' : 320,
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
          }}
        >
          {(() => {
            const dm = dms.find(d => d.id === incomingCall.room);
            const others = dm ? dm.users.filter(u => u !== username) : [];
            const label = others.length ? others.join(', ') : 'Direct Message';
            return (
              <>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Incoming call</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                  {incomingCall.from} is calling you in <span style={{ color: '#e5e7eb' }}>{label}</span>.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      try {
                        if (ringAudioRef.current) {
                          ringAudioRef.current.pause();
                          ringAudioRef.current.currentTime = 0;
                        }
                      } catch {}
                      ringAudioRef.current = null;
                      setIncomingCall(null);
                      pendingOfferRef.current = null;
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
                        setCallStartedAt(Date.now());
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
