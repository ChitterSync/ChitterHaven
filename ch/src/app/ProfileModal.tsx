"use client";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faUserPlus, faUserCheck, faUserXmark, faCommentDots, faLink, faLocationDot, faEdit } from "@fortawesome/free-solid-svg-icons";

type Props = { isOpen: boolean; onClose: () => void; username: string; me: string; contextLabel?: string };

export default function ProfileModal({ isOpen, onClose, username, me, contextLabel }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [friends, setFriends] = useState<{ friends: string[]; incoming: string[]; outgoing: string[] }>({ friends: [], incoming: [], outgoing: [] });
  const [status, setStatus] = useState<string>("offline");
  const [mutual, setMutual] = useState<{ havens: string[]; groupDMs: { id: string; users: string[] }[] }>({ havens: [], groupDMs: [] });
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const uploadImage = async (file: File) => {
    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => { reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    const r = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, data: dataUrl, type: file.type }) });
    const d = await r.json();
    return d?.url as string;
  };

  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/profile?user=${encodeURIComponent(username)}`).then(r => r.json()).then(setProfile).catch(()=>{});
    fetch('/api/friends').then(r=>r.json()).then(setFriends).catch(()=>{});
    fetch(`/api/user-status?users=${encodeURIComponent(username)}`).then(r=>r.json()).then(d => setStatus(d.statuses?.[username] || 'offline')).catch(()=>{});
    fetch(`/api/mutual?user=${encodeURIComponent(username)}`).then(r=>r.json()).then(setMutual).catch(()=>{});
    setEditMode(false);
  }, [isOpen, username]);

  if (!isOpen) return null;
  const isFriend = friends.friends.includes(username);
  const hasOutgoing = friends.outgoing.includes(username);
  const hasIncoming = friends.incoming.includes(username);

  const sendAction = async (action: string) => {
    await fetch('/api/friends', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ action, target: username }) });
    const f = await fetch('/api/friends').then(r=>r.json());
    setFriends(f);
  };

  const dotColor = status === 'online' ? '#22c55e' : status === 'idle' ? '#f59e0b' : status === 'dnd' ? '#ef4444' : '#6b7280';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
      <div className="glass" style={{ width: 'min(560px, 95vw)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Banner */}
        <div style={{ height: 140, background: profile?.bannerUrl ? `url(${profile.bannerUrl}) center/cover no-repeat` : 'linear-gradient(90deg,#1f2937,#0f172a)' }} />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: -32 }}>
            <img src={profile?.avatarUrl || '/favicon.ico'} alt={profile?.displayName || username} style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid #0b1222' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, color: '#e5e7eb', fontWeight: 600 }}>{profile?.displayName || username}</span>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: dotColor }} />
                {contextLabel ? (
                  <span style={{ background: '#0b1222', border: '1px solid #1f2937', color: '#93c5fd', borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>{contextLabel}</span>
                ) : null}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>@{username}{profile?.pronouns ? ` • ${profile.pronouns}`: ''}</div>
            </div>
            <button className="btn-ghost" onClick={onClose} style={{ marginLeft: 'auto', padding: '6px 10px' }}><FontAwesomeIcon icon={faXmark} /></button>
          </div>
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
                      <img src={draft.avatarUrl || profile?.avatarUrl || '/favicon.ico'} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e)=> { const f = e.currentTarget.files?.[0]; if (f) { const url = await uploadImage(f); setDraft((d:any)=>({ ...d, avatarUrl: url })); } }} />
                      <button className="btn-ghost" onClick={()=> avatarInputRef.current?.click()} style={{ padding: '6px 10px' }}>Upload</button>
                      <button className="btn-ghost" onClick={async ()=> { const link = prompt('Paste image URL'); if (link) setDraft((d:any)=>({ ...d, avatarUrl: link })); }} style={{ padding: '6px 10px' }}>Set from Link</button>
                      <button className="btn-ghost" onClick={()=> setDraft((d:any)=>({ ...d, avatarUrl: '' }))} style={{ padding: '6px 10px', color: '#f87171' }}>Clear</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12 }}>Banner</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 32, background: (draft.bannerUrl || profile?.bannerUrl) ? `url(${draft.bannerUrl || profile?.bannerUrl}) center/cover no-repeat` : '#111827', borderRadius: 6 }} />
                      <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e)=> { const f = e.currentTarget.files?.[0]; if (f) { const url = await uploadImage(f); setDraft((d:any)=>({ ...d, bannerUrl: url })); } }} />
                      <button className="btn-ghost" onClick={()=> bannerInputRef.current?.click()} style={{ padding: '6px 10px' }}>Upload</button>
                      <button className="btn-ghost" onClick={async ()=> { const link = prompt('Paste image URL'); if (link) setDraft((d:any)=>({ ...d, bannerUrl: link })); }} style={{ padding: '6px 10px' }}>Set from Link</button>
                      <button className="btn-ghost" onClick={()=> setDraft((d:any)=>({ ...d, bannerUrl: '' }))} style={{ padding: '6px 10px', color: '#f87171' }}>Clear</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn-ghost" onClick={()=> setEditMode(false)} style={{ padding: '6px 10px' }}>Cancel</button>
                    <button className="btn-ghost" onClick={async ()=>{
                      try {
                        await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(draft) });
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
                <button className="btn-ghost" onClick={()=>sendAction('remove')} style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faUserXmark} /> Remove Friend</button>
              )}
              <button className="btn-ghost" style={{ padding: '6px 10px' }}><FontAwesomeIcon icon={faCommentDots} /> Message</button>
            </div>
          )}
        </div>
        {/* Mutuals */}
        {(mutual.havens.length > 0 || mutual.groupDMs.length > 0) && (
          <div style={{ padding: 16, paddingTop: 0 }}>
            {mutual.havens.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 4 }}>{username === me ? 'Your Havens' : 'Mutual Havens'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {mutual.havens.map(h => (
                    <span key={h} className="btn-ghost" style={{ padding: '4px 8px' }}>{h}</span>
                  ))}
                </div>
              </div>
            )}
            {mutual.groupDMs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 4 }}>{username === me ? 'Your Group DMs' : 'Mutual Group DMs'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {mutual.groupDMs.map(g => (
                    <span key={g.id} className="btn-ghost" title={g.users.join(', ')} style={{ padding: '4px 8px' }}>
                      Group DM ({g.users.length}): {g.users.slice(0,3).join(', ')}{g.users.length>3?'…':''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
