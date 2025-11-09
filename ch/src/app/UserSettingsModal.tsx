"use client";

import { useEffect, useState } from "react";

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
  reduceMotion?: boolean;
  showOnlineCount?: boolean;
  notifications?: { mentions?: boolean; pins?: boolean; soundEnabled?: boolean; volume?: number };
  status?: "online" | "idle" | "dnd" | "offline";
};

export default function UserSettingsModal({ isOpen, onClose, username, onStatusChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>({});
  const [tab, setTab] = useState<'appearance'|'notifications'|'status'>('appearance');

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/settings');
        const d = await r.json();
        setSettings(d || {});
      } catch {}
      setLoading(false);
    })();
  }, [isOpen]);

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

  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
      <div className="glass" style={{ width: 'min(760px, 94vw)', borderRadius: 12, overflow: 'hidden', display: 'flex', minHeight: 420 }}>
        <div style={{ width: 220, borderRight: '1px solid #2a3344', background: '#0b1222', color: '#e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #2a3344', fontWeight: 600 }}>Settings</div>
          <button className="btn-ghost" onClick={()=> setTab('appearance')} style={{ textAlign: 'left', padding: '10px 12px', color: tab==='appearance' ? '#93c5fd' : undefined }}>Appearance</button>
          <button className="btn-ghost" onClick={()=> setTab('notifications')} style={{ textAlign: 'left', padding: '10px 12px', color: tab==='notifications' ? '#93c5fd' : undefined }}>Notifications</button>
          <button className="btn-ghost" onClick={()=> setTab('status')} style={{ textAlign: 'left', padding: '10px 12px', color: tab==='status' ? '#93c5fd' : undefined }}>Status</button>
          <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid #111827', fontSize: 12, color: '#9ca3af' }}>@{username}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #2a3344', color: '#e5e7eb' }}>
            <div style={{ fontWeight: 600 }}>User Settings — {tab.charAt(0).toUpperCase() + tab.slice(1)}</div>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 8px' }}>Close</button>
          </div>
          <div style={{ padding: 12, color: '#e5e7eb' }}>
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
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={!!settings.compact} onChange={(e)=> setSettings(s => ({ ...s, compact: e.target.checked }))} /> Compact density
                      </label>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={!!(settings as any).compactSidebar} onChange={(e)=> setSettings(s => ({ ...s, compactSidebar: e.target.checked } as any))} /> Compact sidebar
                      </label>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={settings.showTimestamps !== false} onChange={(e)=> setSettings(s => ({ ...s, showTimestamps: e.target.checked }))} /> Show timestamps
                      </label>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={!!settings.reduceMotion} onChange={(e)=> setSettings(s => ({ ...s, reduceMotion: e.target.checked }))} /> Reduce motion
                      </label>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={settings.showOnlineCount !== false} onChange={(e)=> setSettings(s => ({ ...s, showOnlineCount: e.target.checked }))} /> Show online count
                      </label>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={!!(settings as any).monospaceMessages} onChange={(e)=> setSettings(s => ({ ...s, monospaceMessages: e.target.checked } as any))} /> Monospace messages
                      </label>
                    </div>
                  </div>
                )}
                {tab === 'notifications' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={!!settings.notifications?.mentions} onChange={(e)=> setSettings(s => ({ ...s, notifications: { ...(s.notifications||{}), mentions: e.target.checked } }))} /> Mentions
                      </label>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={!!settings.notifications?.pins} onChange={(e)=> setSettings(s => ({ ...s, notifications: { ...(s.notifications||{}), pins: e.target.checked } }))} /> Pins
                      </label>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={!!settings.notifications?.soundEnabled} onChange={(e)=> setSettings(s => ({ ...s, notifications: { ...(s.notifications||{}), soundEnabled: e.target.checked } }))} /> Sound
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#9ca3af', fontSize: 12, minWidth: 60 }}>Volume</span>
                      <input type="range" min={0} max={100} value={Math.round(((settings.notifications?.volume ?? 0.6) * 100))} onChange={(e)=> setSettings(s => ({ ...s, notifications: { ...(s.notifications||{}), volume: Math.max(0, Math.min(1, Number(e.target.value)/100)) } }))} />
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
