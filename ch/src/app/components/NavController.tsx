"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faServer, faEnvelope, faUser, faUsers } from "@fortawesome/free-solid-svg-icons";

const COLOR_BORDER = "var(--ch-border)";
const COLOR_TEXT = "var(--ch-text)";
const COLOR_ACCENT_TEXT = "rgb(var(--accent))";
const BORDER = `1px solid ${COLOR_BORDER}`;

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
    lastSelectedDMRef,
    setFriendsTab,
  } = props;

  if (!isMobile) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', left: 8, right: 8, bottom: 'calc(8px + env(safe-area-inset-bottom))', height: 56, zIndex: 80, display: 'flex', justifyContent: 'space-between', gap: 8, paddingBottom: 'env(safe-area-inset-bottom)', userSelect: 'none' }}>
      <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-around', background: 'linear-gradient(180deg, rgba(7,12,20,0.9), rgba(9,14,24,0.85))', borderRadius: 12, padding: '8px 10px', border: BORDER }}>
        <button
          type="button"
          aria-label="Home"
          title="Home"
          className="btn-ghost"
          onClick={() => { setActiveNav('home'); setShowMobileNav(false); }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: activeNav === 'home' ? COLOR_ACCENT_TEXT : COLOR_TEXT }}
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
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: selectedHaven !== '__dms__' ? COLOR_ACCENT_TEXT : COLOR_TEXT }}
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
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: activeNav === 'profile' ? COLOR_ACCENT_TEXT : COLOR_TEXT }}
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
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: selectedHaven === '__dms__' && !!selectedDM ? COLOR_ACCENT_TEXT : COLOR_TEXT }}
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
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', color: selectedHaven === '__dms__' && !selectedDM ? COLOR_ACCENT_TEXT : COLOR_TEXT }}
        >
          <FontAwesomeIcon icon={faUsers} />
          <div style={{ fontSize: 11 }}>Activity</div>
        </button>
      </div>
    </div>
  );
}
