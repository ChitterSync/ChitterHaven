"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

export default function ProfilePanel({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      {/* Desktop-only Profile view */}
      <div className="hidden md:block" style={{ width: '100%', padding: 16, background: '#071127', borderRadius: 8, margin: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <FontAwesomeIcon icon={faUser} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>Profile</div>
        </div>
        <div style={{ color: '#9ca3af' }}>Profile panel and account info for desktop screens (hidden on mobile).</div>
      </div>

      {/* Mobile handled by MobileApp for a distinct mobile experience */}
    </>
  );
}
