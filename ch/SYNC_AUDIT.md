# ChitterHaven synchronization audit

## Current event flow

- `server.ts` owns the HTTP server and initializes the single Socket.IO signaling server.
- `src/pages/api/socketio.ts` authenticates sockets, authorizes room membership, broadcasts realtime events, and holds temporary call state.
- `src/lib/realtime/manager.ts` owns the browser Socket.IO client, network/reconnect lifecycle, diagnostics, cross-tab status broadcast, and reconciliation callbacks.
- `src/app/Main.tsx` registers UI subscriptions and merges realtime events into existing React state.
- REST endpoints remain authoritative for friends, DMs, history, settings, profile, and presence reconciliation.

## Phase 1 repairs

- Replaced component-owned `io()` construction with one session-scoped realtime manager.
- Added connected, connecting, reconnecting, disconnected, and offline states.
- Added Socket.IO exponential backoff with jitter and browser online/offline control.
- Added reconnect, visibility, and wake reconciliation.
- Added account-switch socket teardown.
- Added bounded event ID tracking, server sequences, duplicate detection, and sequence-gap reconciliation.
- Added BroadcastChannel connection-status coordination and `window.__CHITTERHAVEN_REALTIME__` diagnostics.
- Added authoritative friend/DM/presence reconciliation with a stale-fetch race guard.
- Added event metadata to message, edit, delete, presence, typing, call-state, and friend events.

## Phase 2-4 repairs

- Added duplicate-safe message writes using `clientMutationId` in the existing canonical JSON payload.
- Added optimistic `sending`, `sent`, `failed`, and realtime-confirmed `delivered` message states.
- Added authoritative active-room history reconciliation after reconnect, visibility recovery, and wake.
- Added 25-second presence heartbeats, 75-second server expiration, and multi-device presence aggregation.
- Added throttled typing-start, explicit typing-stop, and local four-second expiry.
- Persisted active call snapshots in PostgreSQL through the existing `ServerSetting` model.
- Added 90-second ringing expiry, stale-call cleanup, restart hydration, and first-device-wins call acceptance.

## Final durability phase

- Normalized messages, conversations, users, friends, presence, calls, and realtime status into external entity stores. WebRTC media objects remain component-local because they are browser resources rather than synchronized entities.
- Added database-reserved monotonic event sequence blocks, a realtime event journal, per-client durable sync cursors, client cursor persistence, and sequence-gap reconciliation.
- Added an explicit retry action for failed idempotent message mutations.
- Added durable room read state, last-read message receipts, server-owned unread counters, and read events shared with other sessions.
- Replaced the temporary `ServerSetting` call snapshot blob with dedicated `CallSession` and `CallParticipant` tables.
- Added durable device presence sessions, heartbeat timestamps, disconnect/expiry persistence, and `lastSeen` reconciliation.
- Expanded `BroadcastChannel` coordination to relay normalized domain envelopes for messages, reads, conversations, friends, presence, typing, and calls. Event IDs keep cross-tab and socket delivery duplicate-safe.
- Replaced component-owned call and typing adapters with manager-owned subscription sets and deterministic unsubscribe functions.

The database additions are in `prisma/migrations/20260813000000_durable_realtime/migration.sql` and must be deployed before starting this version against an existing database.

## Manual verification checklist

1. Sign in as two separate accounts in separate browser profiles and verify messages, edits, deletes, friend changes, and calls appear without refresh.
2. Open two tabs for one account and verify duplicate events do not duplicate messages, calls, or notifications.
3. Disable the network, send or change state, restore it, and verify connection status moves through offline/reconnecting/connected and REST reconciliation repairs state.
4. Refresh during a ringing and active call and verify the server snapshot restores the call where supported.
5. Hide a tab for more than 45 seconds, restore it, and verify wake reconciliation runs.
6. Restart the Node server while clients remain open and verify Socket.IO reconnects and friends/DMs/presence reconcile.
7. Force-close a WebSocket and verify exponential reconnect without manually refreshing.
8. Inspect `window.__CHITTERHAVEN_REALTIME__` for connection state, session ID, last event ID, sequence, reconciliation time, and reconnect attempts.
9. Send a message while offline or force the history request to fail, restore connectivity, and use the inline Retry action; verify only one server message exists.
10. Read a DM in one tab and verify its unread count clears in other tabs and remains cleared after restart.
11. Restart the server and verify newly emitted event sequences remain above pre-restart sequences and active call/presence metadata hydrates from PostgreSQL.

## Known limitations

- Reliable WebRTC connectivity across restrictive networks requires configured TURN credentials.
- Call metadata survives restart, but WebRTC media must renegotiate after reconnect because SDP and ICE are intentionally ephemeral and are never written to storage.
- Event gaps trigger authoritative REST reconciliation rather than replaying transient signaling payloads. This deliberately avoids persisting SDP, ICE candidates, typing indicators, or other short-lived sensitive data.
