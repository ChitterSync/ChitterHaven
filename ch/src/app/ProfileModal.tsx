"use client";
import React, { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faUserPlus, faUserCheck, faUserXmark, faCommentDots, faLink, faLocationDot, faEdit } from "@fortawesome/free-solid-svg-icons";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  me: string;
  contextLabel?: string;
  blockedUsers?: string[];
  showBlockActions?: boolean;
  onToggleBlock?: (user: string, nextBlocked: boolean) => void;
  callPresence?: {
    color: string;
    label: string;
    icon: React.ReactNode;
    location?: string | null;
    participants: { user: string; avatar: string }[];
  };
};

type RichPresence = { type: "game" | "music" | "custom"; title: string; details?: string };

export default function ProfileModal({ isOpen, onClose, username, me, contextLabel, blockedUsers, showBlockActions, onToggleBlock, callPresence }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [friends, setFriends] = useState<{ friends: string[]; incoming: string[]; outgoing: string[] }>({ friends: [], incoming: [], outgoing: [] });
  const [status, setStatus] = useState<string>("offline");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [richPresence, setRichPresence] = useState<RichPresence | null>(null);
  const [mutual, setMutual] = useState<{ havens: string[]; groupDMs: { id: string; users: string[] }[] }>({ havens: [], groupDMs: [] });
  const [selfHavens, setSelfHavens] = useState<string[]>([]);
  const [selfHavenMap, setSelfHavenMap] = useState<Record<string, string>>({});
  const [selfGroupDMs, setSelfGroupDMs] = useState<{ id: string; users: string[]; title?: string }[]>([]);
  const [confirmAction, setConfirmAction] = useState<null | { title: string; body: string; confirmLabel: string; onConfirm: () => void }>(null);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [syncProfileToChitterSync, setSyncProfileToChitterSync] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string>("");
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const uploadImage = async (file: File, opts: { maxWidth: number; maxHeight: number; quality?: number }) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      throw new Error("Offline");
    }
    const maxBytes = 4 * 1024 * 1024;
    const quality = typeof opts.quality === "number" ? opts.quality : 0.85;

    const resizeImage = async () => {
      if (typeof window === "undefined") return file;
      try {
        const img = await createImageBitmap(file);
        const scale = Math.min(1, opts.maxWidth / img.width, opts.maxHeight / img.height);
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (!blob) return file;
        return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
      } catch {
        return file;
      }
    };

    const processed = await resizeImage();
    if (processed.size > maxBytes) {
      throw new Error("Image is too large after compression.");
    }

    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(processed);
    });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: processed.name, data: dataUrl, type: processed.type }),
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timeout));
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.error || "Upload failed");
    return d?.url as string;
  };

  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/profile?user=${encodeURIComponent(username)}`).then(r => r.json()).then(setProfile).catch(()=>{});
    fetch('/api/friends').then(r=>r.json()).then(setFriends).catch(()=>{});
    fetch(`/api/user-status?users=${encodeURIComponent(username)}`)
      .then(r=>r.json())
      .then(d => {
        setStatus(d.statuses?.[username] || 'offline');
        setStatusMessage(d.statusMessages?.[username] || '');
        setRichPresence(d.richPresence?.[username] || null);
      })
      .catch(()=>{});
    (async () => {
      try {
        const settingsRes = await fetch('/api/settings');
        const settingsJson = await settingsRes.json().catch(() => ({}));
        const settingsPayload = settingsJson?.settings || settingsJson || {};
        setSyncProfileToChitterSync(settingsPayload?.syncProfileToChitterSync === true);
        const rawHavens = settingsPayload?.havens;
        const havenEntries =
          rawHavens && typeof rawHavens === 'object'
            ? Object.entries(rawHavens)
            : [];
        const havenMap = havenEntries.reduce<Record<string, string>>((acc, [key, value]) => {
          if (Array.isArray(value)) {
            acc[key] = key;
            return acc;
          }
          if (value && typeof value === 'object' && typeof (value as any).name === 'string') {
            acc[key] = String((value as any).name);
            return acc;
          }
          acc[key] = key;
          return acc;
        }, {});
        setSelfHavenMap(havenMap);
        if (username === me) {
          const havenNames = Object.values(havenMap).filter(Boolean);
          setSelfHavens(Array.from(new Set(havenNames)));
        }
      } catch {
        setSelfHavenMap({});
        if (username === me) setSelfHavens([]);
      }
      if (username === me) {
        try {
          const dmsRes = await fetch('/api/dms');
          const dmsJson = await dmsRes.json().catch(() => ({}));
          type DmEntry = { id: string; users: string[]; title?: string; group?: boolean };
          const dms: DmEntry[] = Array.isArray(dmsJson?.dms)
            ? dmsJson.dms.filter(
                (dm: unknown): dm is DmEntry =>
                  !!dm &&
                  typeof (dm as DmEntry).id === "string" &&
                  Array.isArray((dm as DmEntry).users),
              )
            : [];
          const groups = dms
            .filter((dm) => dm.group && dm.users.includes(me))
            .map((dm) => ({ id: dm.id, users: dm.users, title: dm.title }));
          setSelfGroupDMs(groups);
        } catch {
          setSelfGroupDMs([]);
        }
        setMutual({ havens: [], groupDMs: [] });
      } else {
        fetch(`/api/mutual?user=${encodeURIComponent(username)}`).then(r=>r.json()).then(setMutual).catch(()=>{});
        setSelfHavens([]);
        setSelfGroupDMs([]);
      }
    })();
    setEditMode(false);
    setProfileNotice("");
  }, [isOpen, username, me]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateLayout = () => setIsMobileLayout(window.innerWidth < 720);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
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

  if (!isOpen) return null;
  const isFriend = Array.isArray(friends?.friends) && friends.friends.includes(username);
  const hasOutgoing = Array.isArray(friends?.outgoing) && friends.outgoing.includes(username);
  const hasIncoming = Array.isArray(friends?.incoming) && friends.incoming.includes(username);
  const isBlocked = Array.isArray(blockedUsers) && blockedUsers.includes(username);
  const isSelf = username === me;

  const sendAction = async (action: string) => {
    await fetch('/api/friends', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ action, target: username }) });
    const f = await fetch('/api/friends').then(r=>r.json());
    setFriends(f);
  };
  const openConfirm = (payload: { title: string; body: string; confirmLabel: string; onConfirm: () => void }) => {
    setConfirmAction(payload);
  };
  const closeConfirm = () => setConfirmAction(null);

  const dotColor = status === 'online' ? '#22c55e' : status === 'idle' ? '#f59e0b' : status === 'dnd' ? '#ef4444' : '#6b7280';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: isMobileLayout ? 'stretch' : 'center',
        justifyContent: isMobileLayout ? 'flex-start' : 'center',
        zIndex: 80,
        padding: isMobileLayout ? 0 : 16,
      }}
    >
      <div
        className="glass"
        style={{
          width: isMobileLayout ? '100%' : 'min(560px, 95vw)',
          height: isMobileLayout ? '100%' : undefined,
          borderRadius: isMobileLayout ? 0 : 14,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isMobileLayout ? '100vh' : '90vh',
        }}
      >
        {/* Banner + avatar layer */}
        <div style={{ position: 'relative', zIndex: 0 }}>
          <div style={{ height: isMobileLayout ? 120 : 140, background: profile?.bannerUrl ? `url(${profile.bannerUrl}) center/cover no-repeat` : 'linear-gradient(90deg,#1f2937,#0f172a)' }} />
          <img
            src={profile?.avatarUrl || '/favicon.ico'}
            alt={profile?.displayName || username}
            {...avatarLoadProps}
            style={{
              position: 'absolute',
              left: isMobileLayout ? 16 : 18,
              bottom: isMobileLayout ? -26 : -32,
              width: isMobileLayout ? 58 : 72,
              height: isMobileLayout ? 58 : 72,
              borderRadius: '50%',
              border: '3px solid #0b1222',
              objectFit: 'cover',
              zIndex: 3,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          />
        </div>
        <div style={{ padding: isMobileLayout ? 16 : 18, paddingTop: isMobileLayout ? 42 : 52, overflowY: 'auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, color: '#e5e7eb', fontWeight: 600 }}>{profile?.displayName || username}</span>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: dotColor }} />
                {contextLabel ? (
                  <span style={{ background: '#0b1222', border: '1px solid #1f2937', color: '#93c5fd', borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>{contextLabel}</span>
                ) : null}
                {callPresence && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(37,99,235,0.15)', borderRadius: 999, padding: '2px 8px', color: callPresence.color, fontSize: 11 }}>
                    {callPresence.icon}
                    {callPresence.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>@{username}{profile?.pronouns ? ` - ${profile.pronouns}`: ''}</div>
            </div>
            <button className="btn-ghost" onClick={onClose} style={{ marginLeft: isMobileLayout ? 0 : 'auto', padding: '6px 10px' }}><FontAwesomeIcon icon={faXmark} /></button>
          </div>
          {statusMessage && (
            <div
              style={{
                position: 'relative',
                marginTop: 8,
                marginLeft: isMobileLayout ? 0 : 92,
                padding: '8px 12px',
                borderRadius: 18,
                border: '1px solid #1f2937',
                background: 'rgba(8,15,28,0.92)',
                color: '#e2e8f0',
                fontSize: 12,
                maxWidth: 340,
                zIndex: 2,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: -10,
                  top: 12,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'rgba(8,15,28,0.92)',
                  border: '1px solid #1f2937',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: -18,
                  top: 4,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'rgba(8,15,28,0.92)',
                  border: '1px solid #1f2937',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: -24,
                  top: -2,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'rgba(8,15,28,0.92)',
                  border: '1px solid #1f2937',
                }}
              />
              <div style={{ whiteSpace: 'pre-wrap' }}>{statusMessage}</div>
            </div>
          )}
          {richPresence && richPresence.title && (
            <div
              style={{
                marginTop: statusMessage ? 10 : 8,
                marginLeft: isMobileLayout ? 0 : 92,
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #1f2937',
                background: '#0b1222',
                color: '#e2e8f0',
                display: 'grid',
                gap: 6,
                maxWidth: 360,
              }}
            >
              <div style={{ fontSize: 11, color: '#93c5fd', letterSpacing: 0.3 }}>Rich Presence</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {richPresence.type === 'music' ? 'Listening to' : richPresence.type === 'game' ? 'Playing' : 'Activity'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{richPresence.title}</div>
              {richPresence.details && (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{richPresence.details}</div>
              )}
            </div>
          )}
{callPresence && (
            <div style={{ marginTop: 12, border: '1px solid #1f2937', background: '#010914', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 600, color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                {callPresence.icon}
                <span>Currently in call</span>
              </div>
              {callPresence.location && (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{callPresence.location}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {callPresence.participants.slice(0, 6).map((p) => (
                  <div key={`profile-call-${p.user}`} title={p.user} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #1f2937', overflow: 'hidden' }}>
                    <img src={p.avatar} alt={p.user} {...avatarLoadProps} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
                {callPresence.participants.length === 0 && <div style={{ color: '#9ca3af', fontSize: 12 }}>No participants listed.</div>}
              </div>
            </div>
          )}
          {profile?.bio && (
            <div style={{ marginTop: 12, color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>{profile.bio}</div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            {profile?.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faLink} /> Website</a>
            )}
            {profile?.location && (
              <div className="btn-ghost" style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faLocationDot} /> {profile.location}</div>
            )}
          </div>
          {username === me && (
            <div style={{ marginTop: 12 }}>
              {!editMode ? (
                <button className="btn-ghost" onClick={() => { setDraft({
                  displayName: profile?.displayName || '',
                  avatarUrl: profile?.avatarUrl || '',
                  bannerUrl: profile?.bannerUrl || '',
                  bio: profile?.bio || '',
                  pronouns: profile?.pronouns || '',
                  website: profile?.website || '',
                  location: profile?.location || ''
                }); setEditMode(true); }} style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faEdit} /> Edit Profile</button>
              ) : (
                <div style={{ border: '1px solid #1f2937', background: '#0b1222', borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12 }}>Display Name</label>
                    <input value={draft.displayName} onChange={(e)=> setDraft((d:any)=>({ ...d, displayName: e.target.value }))} className="input-dark" style={{ padding: 8 }} />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12 }}>Pronouns</label>
                    <input value={draft.pronouns} onChange={(e)=> setDraft((d:any)=>({ ...d, pronouns: e.target.value }))} className="input-dark" style={{ padding: 8 }} />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12 }}>Bio</label>
                    <textarea value={draft.bio} onChange={(e)=> setDraft((d:any)=>({ ...d, bio: e.target.value }))} className="input-dark" style={{ padding: 8, minHeight: 80 }} />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12 }}>Website (https://…)</label>
                    <input value={draft.website} onChange={(e)=> setDraft((d:any)=>({ ...d, website: e.target.value }))} className="input-dark" style={{ padding: 8 }} />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12 }}>Location</label>
                    <input value={draft.location} onChange={(e)=> setDraft((d:any)=>({ ...d, location: e.target.value }))} className="input-dark" style={{ padding: 8 }} />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12 }}>Avatar</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={draft.avatarUrl || profile?.avatarUrl || '/favicon.ico'} alt="avatar" {...avatarLoadProps} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                        <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e)=> { const f = e.currentTarget.files?.[0]; if (f) { try { const url = await uploadImage(f, { maxWidth: 512, maxHeight: 512, quality: 0.82 }); setDraft((d:any)=>({ ...d, avatarUrl: url })); } catch { setProfileNotice("Uploads are blocked while offline."); } } }} />
                      <button className="btn-ghost" onClick={()=> avatarInputRef.current?.click()} style={{ padding: '6px 10px' }}>Upload</button>
                      <button className="btn-ghost" onClick={async ()=> { const link = prompt('Paste image URL'); if (link) setDraft((d:any)=>({ ...d, avatarUrl: link })); }} style={{ padding: '6px 10px' }}>Set from Link</button>
                      <button className="btn-ghost" onClick={()=> setDraft((d:any)=>({ ...d, avatarUrl: '' }))} style={{ padding: '6px 10px', color: '#f87171' }}>Clear</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12 }}>Banner</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 32, background: (draft.bannerUrl || profile?.bannerUrl) ? `url(${draft.bannerUrl || profile?.bannerUrl}) center/cover no-repeat` : '#111827', borderRadius: 6 }} />
                        <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e)=> { const f = e.currentTarget.files?.[0]; if (f) { try { const url = await uploadImage(f, { maxWidth: 1600, maxHeight: 600, quality: 0.8 }); setDraft((d:any)=>({ ...d, bannerUrl: url })); } catch { setProfileNotice("Uploads are blocked while offline."); } } }} />
                      <button className="btn-ghost" onClick={()=> bannerInputRef.current?.click()} style={{ padding: '6px 10px' }}>Upload</button>
                      <button className="btn-ghost" onClick={async ()=> { const link = prompt('Paste image URL'); if (link) setDraft((d:any)=>({ ...d, bannerUrl: link })); }} style={{ padding: '6px 10px' }}>Set from Link</button>
                      <button className="btn-ghost" onClick={()=> setDraft((d:any)=>({ ...d, bannerUrl: '' }))} style={{ padding: '6px 10px', color: '#f87171' }}>Clear</button>
                    </div>
                  </div>
                    {profileNotice && (
                      <div style={{ padding: 8, borderRadius: 8, background: '#0b1222', border: '1px solid #1f2937', color: '#93c5fd', fontSize: 12 }}>
                        {profileNotice}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn-ghost" onClick={()=> setEditMode(false)} style={{ padding: '6px 10px' }}>Cancel</button>
                      <button className="btn-ghost" onClick={async ()=>{
                        try {
                          if (typeof window !== "undefined" && !navigator.onLine) {
                            const pending = { ...draft, syncToChitterSync: syncProfileToChitterSync };
                            try { window.localStorage.setItem("ch_pending_profile", JSON.stringify(pending)); } catch {}
                            setProfileNotice("Offline: saved locally. Changes will sync when you’re back online.");
                            setProfile((prev: any) => ({ ...(prev || {}), ...draft }));
                            setEditMode(false);
                            return;
                          }
                          await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ ...draft, syncToChitterSync: syncProfileToChitterSync }) });
                          const p = await fetch(`/api/profile?user=${encodeURIComponent(username)}`).then(r=>r.json());
                          setProfile(p);
                          setEditMode(false);
                        } catch {}
                      }} style={{ padding: '6px 10px', color: '#93c5fd' }}>Save</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Actions */}
          {username !== me && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {!isFriend && !hasOutgoing && !hasIncoming && (
                <button className="btn-primary" onClick={()=>sendAction('request')} style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faUserPlus} /> Add Friend</button>
              )}
              {hasOutgoing && (
                <button className="btn-ghost" onClick={()=>sendAction('cancel')} style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faUserXmark} /> Cancel Request</button>
              )}
              {hasIncoming && (
                <>
                  <button className="btn-primary" onClick={()=>sendAction('accept')} style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faUserCheck} /> Accept</button>
                  <button className="btn-ghost" onClick={()=>sendAction('decline')} style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faUserXmark} /> Decline</button>
                </>
              )}
              {isFriend && (
                <button
                  className="btn-ghost"
                  onClick={() => openConfirm({
                    title: 'Remove friend?',
                    body: `Remove @${username} from your friends list.`,
                    confirmLabel: 'Remove',
                    onConfirm: async () => {
                      await sendAction('remove');
                      closeConfirm();
                    },
                  })}
                  style={{ padding: '6px 10px' }}
                >
                  <FontAwesomeIcon icon={faUserXmark} /> Remove Friend
                </button>
              )}
              <button className="btn-ghost" style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faCommentDots} /> Message</button>
              {showBlockActions !== false && (
                <button
                  className="btn-ghost"
                  onClick={() => openConfirm({
                    title: isBlocked ? 'Unblock user?' : 'Block user?',
                    body: isBlocked
                      ? `Allow @${username} to message you again.`
                      : `Hide @${username}'s messages across ChitterHaven.`,
                    confirmLabel: isBlocked ? 'Unblock' : 'Block',
                    onConfirm: () => {
                      if (onToggleBlock) onToggleBlock(username, !isBlocked);
                      closeConfirm();
                    },
                  })}
                  style={{ padding: '6px 10px', color: isBlocked ? '#93c5fd' : '#f87171' }}
                >
                  <FontAwesomeIcon icon={faUserXmark} /> {isBlocked ? 'Unblock' : 'Block'}
                </button>
              )}
            </div>
          )}
        </div>
        {/* Friends + Havens/DMs */}
        {(isSelf || (Array.isArray(mutual?.havens) && mutual.havens.length > 0) || (Array.isArray(mutual?.groupDMs) && mutual.groupDMs.length > 0)) && (
          <div style={{ padding: 16, paddingTop: 0 }}>
            {isSelf && Array.isArray(friends?.friends) && friends.friends.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 4 }}>Friends</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {friends.friends.map((friend) => (
                    <span key={friend} className="btn-ghost" style={{ padding: '4px 8px' }}>@{friend}</span>
                  ))}
                </div>
              </div>
            )}
            {(isSelf ? selfHavens.length > 0 : mutual.havens.length > 0) && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 4 }}>{isSelf ? 'Your Havens' : 'Mutual Havens'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(isSelf ? selfHavens : mutual.havens).map(h => {
                    const label = isSelf ? h : (selfHavenMap[h] || h);
                    return (
                      <span key={h} className="btn-ghost" style={{ padding: '4px 8px' }}>{label}</span>
                    );
                  })}
                </div>
              </div>
            )}
            {(isSelf ? selfGroupDMs.length > 0 : mutual.groupDMs.length > 0) && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 4 }}>{isSelf ? 'Your Group DMs' : 'Mutual Group DMs'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(isSelf ? selfGroupDMs : mutual.groupDMs).map(g => {
                    const title = (g as any).title ? String((g as any).title) : '';
                    const fallback = g.users.slice(0, 3).join(', ');
                    const overflow = g.users.length > 3 ? '...' : '';
                    return (
                      <span key={g.id} className="btn-ghost" title={g.users.join(', ')} style={{ padding: '4px 8px' }}>
                        {title ? `Group DM: ${title}` : `Group DM (${g.users.length}): ${fallback}${overflow}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {confirmAction && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90 }}>
            <div style={{ width: 'min(360px, 92vw)', background: '#0b1222', border: '1px solid #1f2937', borderRadius: 12, padding: 16, color: '#e5e7eb', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{confirmAction.title}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>{confirmAction.body}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn-ghost" onClick={closeConfirm} style={{ padding: '6px 10px' }}>Cancel</button>
                <button className="btn-ghost" onClick={confirmAction.onConfirm} style={{ padding: '6px 10px', color: '#f87171' }}>{confirmAction.confirmLabel}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
