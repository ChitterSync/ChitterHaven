"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse } from "@fortawesome/free-solid-svg-icons";

export default function HomePanel({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      {/* Desktop-only Home view */}
      <div className="hidden md:block" style={{ width: '100%', padding: 16, background: '#071127', borderRadius: 8, margin: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <FontAwesomeIcon icon={faHouse} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>Home</div>
        </div>
        <div style={{ color: '#9ca3af' }}>Desktop dashboard and overview content lives here — shown only on md+ screens.</div>
      </div>

      {/* Mobile handled by MobileApp for a distinct mobile experience */}
    </>
  );
}
