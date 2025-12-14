"use client";
import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faChevronLeft, faReply, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import NavController from "./NavController";
import EmojiPicker from "./EmojiPicker";

type Props = {
  activeNav: string;
  setActiveNav: (s: string) => void;
  isMobile: boolean;
  setShowMobileNav: (b: boolean) => void;
  havens: { [k: string]: string[] };
  setSelectedHaven: (h: string) => void;
  selectedHaven: string;
  dms: { id: string; users: string[] }[];
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
  showMobileNav: boolean;
  setShowMobileNav: (b: boolean) => void;
  currentAvatarUrl?: string;
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
};

export default function MobileApp(props: Props) {
  const { activeNav, setActiveNav, isMobile, setShowMobileNav, havens, setSelectedHaven, selectedHaven, dms, selectedDM, setSelectedDM, setShowUserSettings, setShowServerSettings, setSelectedChannel, selectedChannel, username, messages, input, setInput, sendMessage, typingUsers, showMobileNav, currentAvatarUrl, accent, lastSelectedDMRef, setFriendsTab, handleEdit, handleDelete, handleReply, editId, editText, setEditText, handleEditSubmit, cancelEdit, toggleReaction } = props;
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [openEmojiFor, setOpenEmojiFor] = useState<string | null>(null);

  useEffect(() => {
    try {
      const el = messagesRef.current;
      if (el && isAtBottom) {
        // scroll to bottom on new messages only when user is at bottom
        el.scrollTop = el.scrollHeight;
      }
    } catch {}
  }, [messages, isAtBottom]);

  // reserve calculation for bottom padding so fixed nav + composer don't overlap content on mobile
  const _navHeight = 56; // NavController bottom bar height
  const _composerHeight = 64; // composer + padding
  const safeBottomPad = isMobile ? _navHeight + _composerHeight + 16 : 12;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Mobile header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #0f172a', background: 'linear-gradient(180deg, #071127, #06101a)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-ghost" onClick={() => setShowMobileNav(true)} style={{ padding: 8 }} aria-label="Open">
            <FontAwesomeIcon icon={faChevronLeft} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}</div>
        </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => setShowUserSettings && setShowUserSettings(true)} aria-label="Search" style={{ padding: 8 }}>
              <FontAwesomeIcon icon={faSearch} />
            </button>
            {currentAvatarUrl ? (
              <img src={currentAvatarUrl} alt={username} style={{ width: 36, height: 36, borderRadius: 18, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.03)' }} onClick={() => setShowUserSettings && setShowUserSettings(true)} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 18, background: '#0b1222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e5e7eb' }}>{username?.charAt(0)?.toUpperCase() ?? 'U'}</div>
            )}
          </div>
      </div>

      {/* Main content area */}
      {/* adjust bottom padding so fixed nav / FAB don't overlap content on mobile */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {activeNav === 'home' && (
          <div>
            <div style={{ padding: 12, borderRadius: 12, background: '#071127', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Welcome back</div>
              <div style={{ color: '#9ca3af' }}>Quick actions and recent activity optimized for mobile.</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <button className="btn-ghost" style={{ padding: 12, borderRadius: 12, background: '#0b1222', textAlign: 'left' }} onClick={() => setActiveNav('havens')}>Jump to Havens</button>
              <button className="btn-ghost" style={{ padding: 12, borderRadius: 12, background: '#0b1222', textAlign: 'left' }} onClick={() => setActiveNav('activity')}>Open Activity</button>
            </div>
          </div>
        )}

        {activeNav === 'havens' && (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Your Havens</div>
            {Object.keys(havens).length === 0 && <div style={{ color: '#94a3b8' }}>No havens yet.</div>}
            {Object.keys(havens).map(h => (
              <div key={h} onClick={() => { setSelectedHaven(h); setSelectedChannel && setSelectedChannel(havens[h][0] || ''); setActiveNav('channels'); }} style={{ padding: 12, borderRadius: 12, background: selectedHaven === h ? '#0f172a' : '#071127', marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{h}</div>
                <div style={{ color: '#9ca3af', fontSize: 13 }}>{(havens[h] || []).slice(0,3).map(c => `#${c}`).join(' • ')}</div>
              </div>
            ))}
          </div>
        )}

        {activeNav === 'activity' && (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Activity</div>
            <div style={{ color: '#9ca3af' }}>Friends, recent DMs, and notifications.</div>
            <div style={{ marginTop: 12 }}>
              {dms.length === 0 && <div style={{ color: '#94a3b8' }}>No direct messages.</div>}
              {dms.map(dm => (
                <div key={dm.id} onClick={() => { setSelectedDM(dm.id); setActiveNav('activity'); }} style={{ padding: 12, borderRadius: 12, background: selectedDM === dm.id ? '#0f172a' : '#071127', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{dm.users.filter(u => u !== username).join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeNav === 'profile' && (
          <div>
            <div style={{ padding: 12, borderRadius: 12, background: '#071127' }}>
              <div style={{ fontWeight: 700 }}>{username}</div>
              <div style={{ color: '#9ca3af' }}>Tap to edit your profile and account settings.</div>
            </div>
          </div>
        )}

        {/* Channel / message view */}
        {(activeNav === 'channels' || activeNav === 'activity') && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{activeNav === 'channels' ? `Channels in ${selectedHaven}` : 'Messages'}</div>

            {/* reserve space at the bottom to avoid overlap with fixed nav + composer */}
            <div ref={messagesRef} onScroll={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
              setIsAtBottom(atBottom);
            }} style={{ flex: 1, overflowY: 'auto', paddingBottom: safeBottomPad }}>
              {messages.length === 0 && <div style={{ color: '#94a3b8' }}>No messages yet.</div>}
              {messages.map((m, idx) => (
                <div key={m.id || idx} style={{ padding: 10, borderRadius: 10, background: m.user === username ? '#05203a' : '#071127', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{m.user}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-ghost" title="Reply" onClick={() => handleReply && handleReply(m)} style={{ padding: 6 }}>
                        <FontAwesomeIcon icon={faReply} />
                      </button>
                      {m.user === username && (
                        <>
                          <button className="btn-ghost" title="Edit" onClick={() => handleEdit && handleEdit(m.id, m.text)} style={{ padding: 6 }}>
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button className="btn-ghost" title="Delete" onClick={() => handleDelete && handleDelete(m.id)} style={{ padding: 6 }}>
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </>
                      )}
                      <button className="btn-ghost" title="React" onClick={() => setOpenEmojiFor(openEmojiFor === m.id ? null : m.id)} style={{ padding: 6 }}>
                        <span style={{ fontSize: 14 }}>😊</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ color: '#e5e7eb', marginTop: 6 }}>{m.text}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(m.reactions && Object.keys(m.reactions).length > 0) ? Object.entries(m.reactions).map(([emo, users]: any) => {
                      const count = Array.isArray(users) ? users.length : 0;
                      const active = Array.isArray(users) && users.includes(username);
                      return (
                        <button key={emo} onClick={() => toggleReaction && toggleReaction(m.id, emo)} className="btn-ghost" style={{ padding: '4px 8px', borderRadius: 12, background: active ? '#05203a' : 'transparent', border: '1px solid rgba(255,255,255,0.03)', color: active ? '#93c5fd' : '#e5e7eb' }}>
                          <span style={{ marginRight: 6 }}>{emo}</span>
                          <span style={{ fontSize: 12, opacity: 0.9 }}>{count}</span>
                        </button>
                      );
                    }) : null}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>{new Date(m.timestamp || Date.now()).toLocaleTimeString()}</div>

                  {/* Inline edit UI */}
                  {editId === m.id && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <input value={editText || ''} onChange={(e) => setEditText && setEditText(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: '#031226', border: '1px solid #0f172a', color: '#e5e7eb' }} />
                      <button className="btn-primary" onClick={() => handleEditSubmit && handleEditSubmit(m.id)} style={{ padding: '6px 10px', borderRadius: 8 }}>Save</button>
                      <button className="btn-ghost" onClick={() => cancelEdit && cancelEdit()} style={{ padding: '6px 10px', borderRadius: 8 }}>Cancel</button>
                    </div>
                  )}
                  {/* emoji picker inline */}
                  {openEmojiFor === m.id && (
                    <div style={{ marginTop: 8, padding: 8, background: '#06101a', borderRadius: 10, border: '1px solid #0f172a' }}>
                      <EmojiPicker onPick={(char) => { toggleReaction && toggleReaction(m.id, char); setOpenEmojiFor(null); }} onClose={() => setOpenEmojiFor(null)} />
                    </div>
                  )}
                </div>
              ))}
              {typingUsers && typingUsers.length > 0 && (
                <div style={{ color: '#9ca3af', fontSize: 13 }}>{typingUsers.join(', ')} typing…</div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #0f172a', paddingTop: 8, marginBottom: isMobile ? 8 : 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Message #channel or DM"
                  style={{ flex: 1, padding: 10, borderRadius: 10, background: '#031226', border: '1px solid #0f172a', color: '#e5e7eb' }}
                />
                <button className="btn-primary" onClick={() => sendMessage()} style={{ padding: '8px 12px', borderRadius: 10 }}>Send</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile navigation drawer */}
      {showMobileNav && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', zIndex: 100 }}>
          <div style={{ width: '82vw', maxWidth: 360, background: '#0b1222', borderRight: '1px solid #2a3344', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #2a3344', color: '#e5e7eb' }}>
              <div style={{ fontWeight: 600 }}>Navigate</div>
              <button className="btn-ghost" onClick={() => setShowMobileNav(false)} style={{ padding: '4px 8px' }}>
                <FontAwesomeIcon icon={faChevronLeft} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
            <div style={{ padding: 12, borderBottom: '1px solid #111827', color: '#e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Havens</div>
              {Object.keys(havens).map((h) => (
                <div key={h} onClick={() => { setSelectedHaven(h); setSelectedChannel && setSelectedChannel(havens[h][0] || ''); setSelectedDM && setSelectedDM(null); setShowMobileNav(false); setActiveNav('channels'); }} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: selectedHaven === h ? '#111a2e' : 'transparent', color: selectedHaven === h ? '#93c5fd' : '#e5e7eb' }}>
                  {h}
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderBottom: '1px solid #111827', color: '#e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Channels in {selectedHaven}</div>
              {(havens[selectedHaven] || []).map((ch) => (
                <div key={ch} onClick={() => { setSelectedChannel && setSelectedChannel(ch); setSelectedDM && setSelectedDM(null); setShowMobileNav(false); setActiveNav('activity'); }} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: selectedHaven === ch ? '#111a2e' : 'transparent', color: selectedChannel === ch ? '#93c5fd' : '#e5e7eb' }}>
                  #{ch}
                </div>
              ))}
            </div>
            <div style={{ padding: 12, color: '#e5e7eb', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Direct Messages</div>
              {dms.length === 0 && (<div style={{ color: '#94a3b8', fontSize: 13 }}>No direct messages.</div>)}
              {dms.map((dm) => (
                <div key={dm.id} onClick={() => { setSelectedHaven('__dms__'); setSelectedDM(dm.id); setShowMobileNav(false); setActiveNav('activity'); }} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: selectedDM === dm.id ? '#111a2e' : 'transparent', color: selectedDM === dm.id ? '#93c5fd' : '#e5e7eb', display: 'flex', alignItems: 'center' }}>
                  <div style={{ marginRight: 8 }}>{dm.users.filter(u => u !== username).join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }} onClick={() => setShowMobileNav(false)} />
        </div>
      )}

      {/* Floating action button */}
      <div style={{ position: 'fixed', right: 18, bottom: isMobile ? 140 : 80, zIndex: 90 }}>
        <button className="btn-primary" style={{ width: 56, height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => alert('Create new — hook this up')}>
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
      {/* Jump to bottom button */}
      {!isAtBottom && (
        <div style={{ position: 'fixed', right: 18, bottom: isMobile ? 200 : 140, zIndex: 95 }}>
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
