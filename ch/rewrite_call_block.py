# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/app/Main.tsx')
text = path.read_text(encoding='utf-8')
start_token = '          {selectedHaven === "__dms__" && selectedDM && activeCallDM === selectedDM && callState !== \'idle\' && (() => {'
end_token = '          {showTipsBanner'
start = text.find(start_token)
if start == -1:
    raise SystemExit('start token not found')
end = text.find(end_token, start)
if end == -1:
    raise SystemExit('end token not found')
new_block = '''          {selectedHaven === "__dms__" && selectedDM && activeCallDM === selectedDM && callState !== 'idle' && (() => {
            const dm = dms.find(d => d.id === selectedDM);
            const fallback = (dm ? dm.users : []).map(user => ({ user, status: 'ringing' as const }));
            const participantCards = (callParticipants.length ? callParticipants : fallback).filter(p => !!p.user);
            const label = callState === 'calling' ? 'Calling…' : 'In call';
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
                  background: '#0b1222',
                  border: '1px solid #1f2937',
                  color: '#e5e7eb',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.35)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: callState === 'calling' ? '#f59e0b' : '#22c55e', display: 'inline-block' }} />
                  <div style={{ fontWeight: 700 }}>{label}</div>
                  {callInitiator && <div style={{ fontSize: 12, color: '#a5b4fc' }}>Started by @{callInitiator}</div>}
                  <div style={{ marginLeft: 'auto', color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}>
                    {${Math.floor(callElapsed / 60).toString().padStart(1, '0')}:}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  {participantCards.map(part => {
                    const user = part.user;
                    const profile = userProfileCache[user];
                    const avatar = profile?.avatarUrl || '/favicon.ico';
                    const display = profile?.displayName || user;
                    const color = part.status === 'connected' ? '#22c55e' : '#f59e0b';
                    return (
                      <div key={user} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #1f2937', background: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, flex: '1 1 220px' }}>
                        <img src={avatar} alt={display} style={{ width: 32, height: 32, borderRadius: '50%', border: 2px solid  }} />
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div style={{ fontWeight: 600 }}>{display}{user === username ? ' (you)' : ''}</div>
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
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #1f2937', background: isMuted ? '#111827' : '#0f172a', color: '#e5e7eb' }}
                  >
                    <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} /> {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleDeafen}
                    className="btn-ghost"
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid '#1f2937', background: isDeafened ? '#111827' : '#0f172a', color: '#e5e7eb' }}
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
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid '#1f2937', background: '#0f172a', color: '#e5e7eb' }}
                  >
                    <FontAwesomeIcon icon={faPhone} /> Jump to DM
                  </button>
                  <button
                    type="button"
                    onClick={endCall}
                    className="btn-ghost"
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid '#7f1d1d', background: '#7f1d1d', color: '#fff', marginLeft: 'auto' }}
                  >
                    Hang up
                  </button>
                </div>
              </div>
            );
          })()}\n'''
text = text[:start] + new_block + text[end:]
path.write_text(text, encoding='utf-8')
