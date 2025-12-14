"use client";
import React, { useState } from "react";
import { CATEGORIES, filterEmojis } from "../emojiData";

type Props = {
  onPick: (char: string) => void;
  initialQuery?: string;
  initialCategory?: typeof CATEGORIES[number]["key"] | undefined;
  maxDisplay?: number;
  className?: string;
  showSearch?: boolean;
  onClose?: () => void;
};

export default function EmojiPicker({ onPick, initialQuery = "", initialCategory, maxDisplay = 200, className = "", showSearch = true, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<typeof CATEGORIES[number]["key"] | undefined>(initialCategory);

  const list = filterEmojis(query, category).slice(0, maxDisplay);

  return (
    <div className={className} style={{ color: '#e5e7eb' }}>
      {showSearch && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emojis"
            className="input-dark"
            style={{ flex: 1, padding: 8, borderRadius: 8, background: '#031226', border: '1px solid #0f172a', color: '#e5e7eb' }}
          />
          <button className="btn-ghost" onClick={() => { setQuery(''); setCategory(undefined); }} style={{ padding: 8 }}>Clear</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className="btn-ghost"
            onClick={() => setCategory((prev) => (prev === cat.key ? undefined : cat.key))}
            style={{ padding: '6px 8px', borderRadius: 8, background: category === cat.key ? '#071127' : 'transparent', color: category === cat.key ? '#93c5fd' : '#e5e7eb' }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {list.map((e) => (
          <button
            key={e.char + e.name}
            onClick={() => {
              onPick(e.char);
              setQuery('');
              setCategory(undefined);
              onClose && onClose();
            }}
            title={e.name}
            style={{ padding: 8, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer', fontSize: 18 }}
          >
            {e.char}
          </button>
        ))}
      </div>
    </div>
  );
}
