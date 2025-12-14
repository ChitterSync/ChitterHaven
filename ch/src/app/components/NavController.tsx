"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faServer, faHashtag, faEnvelope, faGear, faUser, faBars, faUsers } from "@fortawesome/free-solid-svg-icons";

type Props = {
  activeNav: string;
  setActiveNav: (s: string) => void;
  isMobile: boolean;
  setShowMobileNav: (b: boolean) => void;
  setSelectedHaven?: (h: any) => void;
  setSelectedChannel?: (c: string) => void;
  setSelectedDM?: (d: string | null) => void;
  havens?: { [k: string]: string[] };
  selectedHaven?: string;
  selectedDM?: string | null;
  navigateToLocation?: (loc: { haven: string; channel?: string; dm?: string | null }) => void;
  setShowUserSettings?: (b: boolean) => void;
  setShowServerSettings?: (b: boolean) => void;
  accent?: string;
  lastSelectedDMRef?: React.RefObject<string | null>;
  setFriendsTab?: (t: any) => void;
};

export default function NavController(props: Props) {
  const {
    activeNav,
    setActiveNav,
    isMobile,
    setShowMobileNav,
    setSelectedHaven,
    setSelectedChannel,
    setSelectedDM,
    havens,
    selectedHaven,
    selectedDM,
    navigateToLocation,
    setShowUserSettings,
    setShowServerSettings,
    accent,
    lastSelectedDMRef,
    setFriendsTab,
  } = props;

  return (
    <>
      {/* Desktop nav (hidden on mobile) */}
      <div className="hidden md:flex" style={{ gap: 8, alignItems: 'center', padding: '8px 12px', position: 'absolute', left: 16, top: 12, zIndex: 60 }}>
        <button className="btn-ghost" title="Home" onClick={() => { setActiveNav('home'); setShowMobileNav(false); }} style={{ padding: '6px 8px', borderRadius: 8, border: activeNav === 'home' ? `1px solid ${accent}` : '1px solid transparent', background: activeNav === 'home' ? '#071127' : 'transparent' }}>
          <FontAwesomeIcon icon={faHouse} />
        </button>
        <button className="btn-ghost" title="Havens" onClick={() => { setActiveNav('havens'); try { setSelectedHaven && setSelectedHaven(prev => prev || Object.keys(havens || {})[0] || '__dms__'); } catch {} ; setSelectedChannel && setSelectedChannel(''); setSelectedDM && setSelectedDM(null); setShowMobileNav(false); }} style={{ padding: '6px 8px', borderRadius: 8, border: activeNav === 'havens' ? `1px solid ${accent}` : '1px solid transparent', background: activeNav === 'havens' ? '#071127' : 'transparent' }}>
          <FontAwesomeIcon icon={faServer} />
        </button>
        <button className="btn-ghost" title="Channels" onClick={() => { setActiveNav('channels'); setShowMobileNav(false); }} style={{ padding: '6px 8px', borderRadius: 8, border: activeNav === 'channels' ? `1px solid ${accent}` : '1px solid transparent', background: activeNav === 'channels' ? '#071127' : 'transparent' }}>
          <FontAwesomeIcon icon={faHashtag} />
        </button>
        <button className="btn-ghost" title="Activity" onClick={() => { setActiveNav('activity'); try { setSelectedHaven && setSelectedHaven('__dms__'); setSelectedChannel && setSelectedChannel(''); setSelectedDM && setSelectedDM(null); } catch {} setShowMobileNav(false); }} style={{ padding: '6px 8px', borderRadius: 8, border: activeNav === 'activity' ? `1px solid ${accent}` : '1px solid transparent', background: activeNav === 'activity' ? '#071127' : 'transparent' }}>
          <FontAwesomeIcon icon={faEnvelope} />
        </button>
        <button className="btn-ghost" title="Settings" onClick={() => { setActiveNav('settings'); setShowUserSettings && setShowUserSettings(true); setShowMobileNav(false); }} style={{ padding: '6px 8px', borderRadius: 8, border: activeNav === 'settings' ? `1px solid ${accent}` : '1px solid transparent', background: activeNav === 'settings' ? '#071127' : 'transparent' }}>
          <FontAwesomeIcon icon={faGear} />
        </button>
        <button className="btn-ghost" title="Profile" onClick={() => { setActiveNav('profile'); setShowMobileNav(false); }} style={{ padding: '6px 8px', borderRadius: 8, border: activeNav === 'profile' ? `1px solid ${accent}` : '1px solid transparent', background: activeNav === 'profile' ? '#071127' : 'transparent' }}>
          <FontAwesomeIcon icon={faUser} />
        </button>
      </div>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <div style={{ position: 'fixed', left: 8, right: 8, bottom: 'calc(8px + env(safe-area-inset-bottom))', height: 56, zIndex: 80, display: 'flex', justifyContent: 'space-between', gap: 8, paddingBottom: 'env(safe-area-inset-bottom)', userSelect: 'none' }}>
          <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-around', background: 'linear-gradient(180deg, rgba(7,12,20,0.9), rgba(9,14,24,0.85))', borderRadius: 12, padding: '8px 10px', border: '1px solid #1f2937' }}>
            <button
              type="button"
              aria-label="Home"
              title="Home"
              className="btn-ghost"
              onClick={() => { setActiveNav('home'); setShowMobileNav(false); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: activeNav === 'home' ? '#93c5fd' : '#e5e7eb' }}
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
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: selectedHaven !== '__dms__' ? '#93c5fd' : '#e5e7eb' }}
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
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: activeNav === 'profile' ? '#93c5fd' : '#e5e7eb' }}
            >
              <FontAwesomeIcon icon={faUser} />
              <div style={{ fontSize: 11 }}>Profile</div>
            </button>

            <button
              type="button"
              aria-label="Direct messages"
              title="Direct Messages"
              className="btn-ghost"
              onClick={() => { setActiveNav('activity'); try { setSelectedHaven && setSelectedHaven('__dms__'); setSelectedDM && setSelectedDM(lastSelectedDMRef?.current ?? null); } catch {} setShowMobileNav(false); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: selectedHaven === '__dms__' && !!selectedDM ? '#93c5fd' : '#e5e7eb' }}
            >
              <FontAwesomeIcon icon={faEnvelope} />
              <div style={{ fontSize: 11 }}>DMs</div>
            </button>

            <button
              type="button"
              aria-label="Activity"
              title="Activity"
              className="btn-ghost"
              onClick={() => { setActiveNav('activity'); try { setSelectedHaven && setSelectedHaven('__dms__'); setSelectedDM && setSelectedDM(null); setFriendsTab && setFriendsTab('all'); } catch {} setShowMobileNav(false); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: selectedHaven === '__dms__' && !selectedDM ? '#93c5fd' : '#e5e7eb' }}
            >
              <FontAwesomeIcon icon={faUsers} />
              <div style={{ fontSize: 11 }}>Activity</div>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
