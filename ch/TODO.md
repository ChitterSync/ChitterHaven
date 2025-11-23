# ChitterHaven TODO (pre-auth hardening)

The auth revamp (migrating fully to the shared `auth.chittersync.com` service and removing legacy JWT flows) should land **after** these outstanding UX / feature tasks are wrapped up.

## 1. Voice & Call Experience
- [ ] Fix DM call synchronization bugs (remote participant immediately drops / ringing never stops) across desktop + mobile.
- [ ] Add an in-DM call screen with participant list, ringing indicator, mute/deafen controls, and popup shortcut from the dock.
- [ ] Ensure call summary messages fire exactly once and remain uneditable (already blocked server-side, but add server tests).
- [ ] Make the call banner responsive and persistent above the composer and add context-menu actions (view profile, copy call ID, etc.).

## 2. Server Settings Modal
- [ ] Load actual member / role data; hook up searching, role assignment, and kick/ban actions.
- [ ] Surface real channel listings (text + voice) with drag-and-drop ordering and creation inline.
- [ ] Implement Audit Log + Integrations + Danger Zone tabs (real data and mutation endpoints).
- [ ] Enforce permission checks client + server (no opening modal without `canManageServer`).

## 3. Mobile / Responsive UX
- [ ] Rebuild navigation for <768px screens (slide-over sidebars, bottom tab bar for Havens/DMs/Friends/Settings).
- [ ] Ensure calling UI, context menus, and dropdowns adapt to touch + mobile viewport.
- [ ] Persist “last open page” per device and gracefully fall back to Friends tab when nothing stored.
- [ ] Add media queries for compact sidebar + channel list that now defaults on.

## 4. Messaging Enhancements
- [ ] Message quick button editor: hook up drag/drop persistence per role; expose admin overrides in Server Settings.
- [ ] Context menus: add Copy Timestamp / Copy Username / call-related actions.
- [ ] Guarantee multiline markdown + custom code block styling render identically on server/client (prevent hydration warnings).
- [ ] Finish conversions to ID-based storage (users, havens, channels) and ship migration script with selective keeps.

## 5. Notifications & Themes
- [ ] Finish ringtone selector UI (play/pause already implemented, need server persistence + mobile support).
- [ ] Default all notification toggles on for fresh users (done client-side, confirm server defaults/migrations).
- [ ] Add push-notification prep (service worker stub + backend queue) so we can later wire mobile/desktop notifications.

## 6. Misc Polish
- [ ] Custom dropdown component: extract to shared UI kit with tests, ensure action buttons announce properly to screen readers.
- [ ] Loading shell animation: confirm all async boot states flip `isBooting` to false so blur disappears.
- [ ] Health checks / `/api/health` should assert encrypted JSON files are readable & writable.
- [ ] Clean up temporary files (`Main_head.tmp.tsx`, etc.) that still break parsers if referenced.

Once these are complete and tested, we can safely focus on the centralized auth migration (cookie domain, R2-backed sessions, requireUser everywhere, etc.).
