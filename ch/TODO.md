# ChitterHaven TODO (pre-auth hardening)

The auth revamp (migrating fully to the shared `auth.chittersync.com` service and removing legacy JWT flows) should land **after** these outstanding UX / feature tasks are wrapped up.

-## 1. Voice & Call Experience
- [x] Fix DM call synchronization bugs (remote participant immediately drops / ringing never stops) across desktop + mobile.
- [x] Add an in-DM call screen with participant list, ringing indicator, mute/deafen controls, and popup shortcut from the dock.
- [x] Ensure call summary messages fire exactly once and remain uneditable (already blocked server-side, added server smoke-test).
- [x] Make the call banner responsive and persistent above the composer and add context-menu actions (view profile, copy call ID, etc.).

-## 2. Server Settings Modal
- [x] Load actual member / role data; hook up searching, role assignment, and kick/ban actions.
- [ ] Surface real channel listings (text + voice) with drag-and-drop ordering and creation inline.
- [x] Implement Audit Log + Integrations + Danger Zone tabs (real data and mutation endpoints).
- [x] Enforce permission checks client + server (no opening modal without `canManageServer`).

## 3. Mobile / Responsive UX
 - [x] Rebuild navigation for <768px screens (slide-over sidebars, bottom tab bar for Havens/DMs/Friends/Settings).
 - [x] Ensure calling UI, context menus, and dropdowns adapt to touch + mobile viewport.
 - [x] Persist “last open page” per device and gracefully fall back to Friends tab when nothing stored.
- [x] Add media queries for compact sidebar + channel list that now defaults on.

-## 4. Messaging Enhancements
## 4. Messaging Enhancements
- [ ] Message quick button editor: hook up drag/drop persistence per role; expose admin overrides in Server Settings.
- [x] Context menus: add Copy Timestamp / Copy Username / call-related actions.
- [ ] Guarantee multiline markdown + custom code block styling render identically on server/client (prevent hydration warnings).
- [ ] Finish conversions to ID-based storage (users, havens, channels) and ship migration script with selective keeps.

## 5. Notifications & Themes
- [ ] Finish ringtone selector UI (play/pause already implemented, need server persistence + mobile support).
- [ ] Default all notification toggles on for fresh users (done client-side, confirm server defaults/migrations).
- [ ] Add push-notification prep (service worker stub + backend queue) so we can later wire mobile/desktop notifications.

-## 6. Misc Polish
## 6. Misc Polish
- [x] Custom dropdown component: extract to shared UI kit with tests, ensure action buttons announce properly to screen readers.
- [ ] Loading shell animation: confirm all async boot states flip `isBooting` to false so blur disappears.
- [ ] Health checks / `/api/health` should assert encrypted JSON files are readable & writable.
- [ ] Clean up temporary files (`Main_head.tmp.tsx`, etc.) that still break parsers if referenced.

## 7. Auth / Login
- [x] Add show/hide password toggle on the login screen (eye / eye-slash toggle)

Once these are complete and tested, we can safely focus on the centralized auth migration (cookie domain, R2-backed sessions, requireUser everywhere, etc.).

## Manual test checklist (Appearance)
- Verify message grouping settings (none/compact/aggressive) update headers and timestamps as expected.
- Validate time format/time display settings across message headers, pinned list, and edit history.
- Toggle system message emphasis styles, including collapsible behavior for call events.
- Test max content width options and reading mode (avatars/actions/reactions) in DM + channel views.
- Confirm appearance profiles create/switch/duplicate/delete locally and apply instantly without reload.

## Manual QA checklist (UX bugfixes)
- Click channel rows (ex: #random) to verify they always switch channels without opening User Settings.
- Click "New Group DM" and "Add Friend" to verify they always trigger their intended flows.
- Open Create Haven, confirm Cancel, Escape, and backdrop click all close the modal.
- Open Friends/Add Friend and verify placeholder reads "Add friend by username" without truncation at normal and large font sizes.

## Manual QA checklist (Message styles)
- Switch each message style in Appearance and verify it applies instantly in a DM and a channel.
- Check hover actions, reactions, and reply indicators for each style (minimal log, focus, thread forward, retro).
- Verify system messages render with the correct style and stay readable in light/dark themes.
- Confirm mobile message list remains readable and actions remain usable in every style.
