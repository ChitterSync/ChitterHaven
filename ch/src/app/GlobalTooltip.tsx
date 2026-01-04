"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Coords = { top: number; left: number };

export default function GlobalTooltip() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState<string>("");
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 });
  const [alignCenter, setAlignCenter] = useState(false);
  const curEl = useRef<HTMLElement | null>(null);
  const restoreMap = useRef(new WeakMap<HTMLElement, string>());
  const isCoarseRef = useRef(false);

  useEffect(() => {
    isCoarseRef.current = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    const positionNear = (el: HTMLElement, ev?: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const coarse = isCoarseRef.current;
      const baseTop = (ev ? ev.clientY : rect.bottom) + window.scrollY + (coarse ? 12 : 10);
      const baseLeft = (ev ? ev.clientX : rect.left) + window.scrollX;
      const left = coarse ? rect.left + rect.width / 2 + window.scrollX : baseLeft;
      setAlignCenter(coarse);
      const top = baseTop;
      setCoords({ top, left });
    };

    const findTooltipTarget = (start: EventTarget | null): HTMLElement | null => {
      let el = start as HTMLElement | null;
      while (el && el !== document.body) {
        if (el.hasAttribute("data-tooltip") || el.hasAttribute("title")) return el;
        el = el.parentElement;
      }
      return null;
    };

    const show = (el: HTMLElement, ev?: MouseEvent) => {
      let tip = el.getAttribute("data-tooltip");
      if (!tip) {
        const t = el.getAttribute("title");
        if (t) {
          restoreMap.current.set(el, t);
          el.removeAttribute("title");
          tip = t;
        }
      }
      if (!tip) return;
      curEl.current = el;
      setText(tip);
      positionNear(el, ev);
      setVisible(true);
    };

    const hide = () => {
      const el = curEl.current;
      if (el) {
        const orig = restoreMap.current.get(el);
        if (orig) {
          // restore title on hide to preserve semantics/aria
          el.setAttribute("title", orig);
          restoreMap.current.delete(el);
        }
      }
      curEl.current = null;
      setVisible(false);
      setText("");
    };

    const onOver = (e: MouseEvent) => {
      const el = findTooltipTarget(e.target);
      if (!el) return;
      show(el, e);
    };
    const onMove = (e: MouseEvent) => {
      if (!curEl.current) return;
      positionNear(curEl.current, e);
    };
    const onOut = (e: MouseEvent) => {
      if (!curEl.current) return;
      // If moving to a descendant of the same element, ignore
      const related = e.relatedTarget as Node | null;
      if (related && curEl.current.contains(related)) return;
      hide();
    };
    const onFocusIn = (e: FocusEvent) => {
      const el = findTooltipTarget(e.target);
      if (!el) return;
      show(el);
    };
    const onFocusOut = () => hide();
    const onPointerDown = (e: PointerEvent) => {
      if (!isCoarseRef.current) return;
      const el = findTooltipTarget(e.target);
      if (!el) {
        hide();
        return;
      }
      if (curEl.current === el && visible) {
        hide();
        return;
      }
      show(el);
    };

    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [visible]);

  if (typeof window === "undefined") return null;

  return createPortal(
    visible ? (
      <div
        style={{
          position: "absolute",
          top: coords.top,
          left: coords.left,
          transform: alignCenter ? "translateX(-50%)" : undefined,
          zIndex: 9999,
          background: "#0b1222",
          color: "#e5e7eb",
          border: "1px solid #1f2937",
          borderRadius: 8,
          padding: "6px 8px",
          fontSize: 12,
          pointerEvents: "none",
          boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          maxWidth: alignCenter ? 260 : 320,
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </div>
    ) : null,
    document.body
  );
}
