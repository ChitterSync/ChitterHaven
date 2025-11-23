"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Dropdown, { type DropdownOption } from "./components/Dropdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCirclePlay, faCirclePause } from "@fortawesome/free-solid-svg-icons";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onStatusChange?: (status: string) => void;
  onSaved?: (settings: Settings) => void;
};

type Settings = {
  theme?: "dark" | "light" | "system";
  compact?: boolean;
  showTimestamps?: boolean;
  chatStyle?: 'modern' | 'classic';
  messageFontSize?: 'small'|'medium'|'large';
  accentHex?: string;
  boldColorHex?: string;
  italicColorHex?: string;
  pinColorHex?: string;
  mentionColorHex?: string;
  callHavensServers?: boolean;
  showTips?: boolean;
  reduceMotion?: boolean;
  showOnlineCount?: boolean;
  callsEnabled?: boolean;
  callRingSound?: boolean;
  callRingtone?: string;
   quickButtonsOwn?: string[];
   quickButtonsOthers?: string[];
  notifications?: { mentions?: boolean; pins?: boolean; soundEnabled?: boolean; volume?: number };
  status?: "online" | "idle" | "dnd" | "offline";
  autoIdleEnabled?: boolean;
};

const RINGTONE_OPTIONS = ["Drive", "Bandwidth", "Drift", "Progress", "Spooky"];

const normalizeSettings = (raw?: Settings | null): Settings => {
  const base: Settings = { ...(raw || {}) };
  const notif = base.notifications || {};
  base.notifications = {
    mentions: notif.mentions !== false,
    pins: notif.pins !== false,
    soundEnabled: notif.soundEnabled !== false,
    volume: typeof notif.volume === "number" ? notif.volume : 0.6,
  };
  if (base.callRingSound === undefined) base.callRingSound = true;
  if (!base.callRingtone || !RINGTONE_OPTIONS.includes(base.callRingtone)) base.callRingtone = "Drive";
  return base;
};

export default function UserSettingsModal({ isOpen, onClose, username, onStatusChange, onSaved }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => normalizeSettings({}));
  const [previewing, setPreviewing] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [tab, setTab] = useState<'appearance'|'notifications'|'status'|'guides'|'dev'|'about'>('appearance');
  const [guideChecked, setGuideChecked] = useState(true);
  const [guideLevel, setGuideLevel] = useState(60);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [aboutUser, setAboutUser] = useState<any>(null);
  const [aboutStats, setAboutStats] = useState<{ havens: number; dms: number }>({ havens: 0, dms: 0 });

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/settings');
        const d = await r.json();
        setSettings(normalizeSettings(d || {}));
      } catch {}
      setLoading(false);
    })();
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
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || tab !== 'about' || aboutUser || aboutLoading) return;
    (async () => {
      setAboutLoading(true);
      try {
        const r = await fetch('/api/me');
        const d = await r.json();
        if (d && d.user) setAboutUser(d.user);
      } catch {}
      setAboutLoading(false);
    })();
  }, [isOpen, tab, aboutUser, aboutLoading]);

  const save = async () => {
    try {
      const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const d = await r.json();
      if (d?.settings?.status && onStatusChange) onStatusChange(d.settings.status);
      if (d?.settings && onSaved) onSaved(d.settings);
      try { window.dispatchEvent(new CustomEvent('ch_settings_updated', { detail: (d?.settings || {}) })); } catch {}
    } catch {}
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

  if (!isOpen) return null;
  const accent = settings.accentHex || '#60a5fa';

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
          {checked ? '✔' : '✕'}
        </span>
      </span>
    );
  };

  const GuideSlider = ({ value, onChange }: { value: number; onChange: (v: number)=>void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 220 }}>
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
      <span style={{ color: '#e5e7eb', fontSize: 11 }}>{value}%</span>
    </div>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
      <div className="glass" style={{ width: 'min(760px, 94vw)', borderRadius: 12, overflow: 'hidden', display: 'flex', minHeight: 420, maxHeight: '80vh' }}>
        <div style={{ width: 220, borderRight: '1px solid #2a3344', background: '#0b1222', color: '#e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #2a3344', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span>Settings</span>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                try {
                  await fetch("/api/logout", { method: "POST" });
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
          <button className="btn-ghost" onClick={()=> setTab('appearance')} style={{ textAlign: 'left', padding: '10px 12px', color: tab==='appearance' ? '#93c5fd' : undefined }}>Appearance</button>
          <button className="btn-ghost" onClick={()=> setTab('notifications')} style={{ textAlign: 'left', padding: '10px 12px', color: tab==='notifications' ? '#93c5fd' : undefined }}>Notifications</button>
          <button className="btn-ghost" onClick={()=> setTab('status')} style={{ textAlign: 'left', padding: '10px 12px', color: tab==='status' ? '#93c5fd' : undefined }}>Status</button>
          <button className="btn-ghost" onClick={()=> setTab('guides')} style={{ textAlign: 'left', padding: '10px 12px', color: tab==='guides' ? '#93c5fd' : undefined }}>Guides & Feedback</button>
          <button className="btn-ghost" onClick={()=> setTab('dev')} style={{ textAlign: 'left', padding: '10px 12px', color: tab==='dev' ? '#93c5fd' : undefined }}>Dev</button>
          <button className="btn-ghost" onClick={()=> setTab('about')} style={{ textAlign: 'left', padding: '10px 12px', color: tab==='about' ? '#93c5fd' : undefined }}>About</button>
          <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid #111827', fontSize: 12, color: '#9ca3af' }}>@{username}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #2a3344', color: '#e5e7eb' }}>
            <div style={{ fontWeight: 600 }}>User Settings — {tab.charAt(0).toUpperCase() + tab.slice(1)}</div>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 8px' }}>Close</button>
          </div>
          <div style={{ padding: 12, color: '#e5e7eb', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {loading ? (
              <div style={{ color: '#94a3b8' }}>Loading…</div>
            ) : (
              <>
                {tab === 'appearance' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ display: 'grid', gap: 6, minWidth: 160 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Theme</span>
                        <select value={settings.theme || 'dark'} onChange={(e)=> setSettings(s => ({ ...s, theme: e.target.value as any }))} className="input-dark" style={{ padding: 8 }}>
                          <option value="dark">Dark</option>
                          <option value="light">Light</option>
                          <option value="system">System</option>
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 6, minWidth: 160 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Style</span>
                        <select value={settings.chatStyle || 'modern'} onChange={(e)=> setSettings(s => ({ ...s, chatStyle: e.target.value as any }))} className="input-dark" style={{ padding: 8 }}>
                          <option value="modern">Modern</option>
                          <option value="classic">Classic</option>
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 6, minWidth: 160 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Font Size</span>
                        <select value={settings.messageFontSize || 'medium'} onChange={(e)=> setSettings(s => ({ ...s, messageFontSize: e.target.value as any }))} className="input-dark" style={{ padding: 8 }}>
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
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
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, showTimestamps: !(s.showTimestamps !== false) }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Show timestamps</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Display time next to each message.</div>
                        </div>
                        <Switch checked={settings.showTimestamps !== false} />
                      </button>
                      <button type="button" onClick={()=> setSettings(s => ({ ...s, reduceMotion: !s.reduceMotion }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 8, background: '#020617', border: '1px solid #1f2937', cursor: 'pointer' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>Reduce motion</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Turn off most animations.</div>
                        </div>
                        <Switch checked={!!settings.reduceMotion} />
                      </button>
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
                          <div>Call Havens “Servers”</div>
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
                                  <option value="">Add…</option>
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
                              {renderRow('Others’ messages', others, applyOthers)}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#9ca3af', fontSize: 12, minWidth: 60 }}>Volume</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(((settings.notifications?.volume ?? 0.6) * 100))}
                          onChange={(e)=> setSettings(s => ({ ...s, notifications: { ...(s.notifications||{}), volume: Math.max(0, Math.min(1, Number(e.target.value)/100)) } }))}
                        />
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
                {tab === 'about' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>About ChitterHaven</div>
                      <div style={{ fontSize: 13 }}>
                        <div>Version: <span style={{ color: '#93c5fd' }}>0.1.0</span></div>
                        <div>License: <span style={{ color: '#93c5fd' }}>Personal / non-commercial use</span></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Your account</div>
                      {aboutLoading && !aboutUser && (
                        <div style={{ color: '#94a3b8' }}>Loading…</div>
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
                {tab === 'guides' && (
                  <div style={{ display: 'grid', gap: 14, fontSize: 13 }}>
                    <div style={{ color: '#9ca3af' }}>
                      Quick tips for using ChitterHaven features. These are read-only; changing them here won’t affect your real messages.
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
                        <li>Each Haven has its own channels; use the “New Channel” button to add one and choose its type.</li>
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
                        placeholder="Tell us what you like, what feels confusing, or what you’d like to see next."
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button className="btn-ghost" onClick={onClose} style={{ padding: '6px 10px' }}>Cancel</button>
                  <button className="btn-ghost" onClick={save} style={{ padding: '6px 10px', color: '#93c5fd' }}>Save</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
