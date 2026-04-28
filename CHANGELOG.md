# Changelog

## v0.3.1 — 2026-04-28

Patch release fixing the empty-directory race + wiring up a fresh,
alive homepage drive + a default app catalog.

### Fixed

- **Proxy `drive.entry()` no-wait race** in `backend/hyper-proxy.js`.
  Freshly opened drives (just joined the swarm seconds ago) returned
  `null` from `drive.entry()` before any blocks had arrived, so the
  proxy wrongly fell back to the empty directory listing. Now waits up
  to 8s for `drive.update({ wait: true })` before deciding whether
  `index.html` exists. Hyper:// pages render correctly on first paint
  even when the local cache is cold.

### New

- **`DEFAULT_URL`** now points at the live, freshly-published
  pearbrowser-home drive:
  `hyper://efd7b0c6c38de88359c01d1211c963d08f49064ab964a5c2a5c34e09fb857a52/`
  Pinned on 5 HiveRelays for 365 days; publisher storage retained so
  future updates can re-publish to the same key.
- **`DEFAULT_CATALOG_KEY`** auto-loads on first Apps-tab visit when no
  catalog has been pinned yet. Curated entry-point listing
  pearbrowser-desktop, hiverelay, p2pbuilders. Drive key:
  `0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75`
- **Companion drives** also live + pinned (linked from the catalog,
  not the desktop default):
  - `hyper://ea607230f7b9a5f854c664901b2c34faf1c6f5b7cee6fc3bca02ac682fd02754/` — **p2phiverelay**
  - `hyper://f0cd01e3565a9eb5d811f3f46f0595ad6b2e87652304789bef3fe4501b3db42a/` — **p2pbuilders**

### Operator scripts

Three new helpers under `scripts/` for managing pinned drives:
- `pin-self-on-hiverelay.js` — pin the desktop's own production bundle
- `publish-and-pin.js` — publish a directory + pin in one shot
- `extract-drive.js` — recover content from a still-seeded drive
- `unseed-drive.js` — send signed unseed for a drive
- `list-drive.js` — diagnose what a drive's manifest contains

---

## v0.3.0 — 2026-04-28

`swarm.v1` — direct Hyperswarm access for `hyper://` pages. Same URL,
same drive — pages that know how to ask for direct P2P get it; pages
that don't keep working unchanged. See `docs/SWARM-V1.md` for the full
spec.

### New

- **`window.pear.swarm.v1`** injected on every `text/html` response.
  Pages call `await window.pear.swarm.v1.join(topicHex, { ... })` and
  get back a Channel with `peer` / `message` / `peer-leave` / `error` /
  `closed` events plus `peers[]` and `destroy()`. Wire is base64; the
  shim hands you `Uint8Array` on inbound, accepts `Uint8Array` /
  `ArrayBuffer` on outbound.
- **Three trust tiers** for topic-join policy:
  - **A — drive-derived**: `sha256("pear.swarm.v1:" + driveKey + subtopic)`
    — no consent prompt, ~90% of in-app realtime use cases.
  - **B — autobase / mint-then-rejoin**: persisted grant, no prompt.
  - **C — arbitrary 32-byte topic**: requires a consent sheet
    (`EVT_SWARM_REQUEST` → modal → `CMD_SWARM_RESOLVE`). Persisted in
    `swarm-grants.bee`, replicates cross-device. Revocable in
    Settings → Connected Apps.
- **Rate limits** enforced server-side: 8 channels per app, 10 joins
  per minute, 1 MB/s per peer outbound, 64 peers per channel
  (newest-wins), 1 pending consent at a time.
- **`SwarmConsent`** modal mirroring `LoginConsent`: shows the app
  name, requested topic, and what approving means (DHT discovery
  reveals your IP; messages travel direct, no logging).
- **Connected Apps** in Settings now lists swarm-grants alongside
  login-grants, grouped by app, with per-grant Revoke buttons.
- **`examples/echo-peer/`** — 100-line `hyper://` page that exercises
  the full Channel API end-to-end. Doubles as a smoke test.

### Internals

- New: `backend/swarm-bridge.js` (Channel manager + multiplexer +
  rate-limit enforcement + topic-policy dispatch)
- New: `backend/swarm-grants.js` (Hyperbee-backed Tier C grants)
- Extended: `backend/http-bridge.js` (`POST /api/swarm/{join,send,leave}`,
  `GET /api/swarm/events` SSE, token-on-URL fallback for EventSource)
- Extended: `backend/hyper-proxy.js` (per-page api-token meta + shim
  injection in HTML `<head>`)
- Extended: `backend/index.js` (`openSwarmConsent` ceremony mirroring
  the login one, four new RPC handlers for grant management)
- New constants: `CMD_SWARM_RESOLVE=120`,
  `CMD_SWARM_LIST_GRANTS=121`, `CMD_SWARM_REVOKE_GRANT=122`,
  `CMD_SWARM_REVOKE_ALL_FOR_APP=123`, `EVT_SWARM_REQUEST=107`

### Why SSE instead of WebSocket

Originally specced as WS. Switched to **Server-Sent Events**:
- plain HTTP — no upgrade handler needed in `bare-http1`
- `EventSource` is universally supported in iframes
- the `swarm-bridge.js` `Channel._attachStream` interface is
  transport-agnostic so a WS path can drop in later if we want it

Page-side API is identical regardless of transport.

### Same-URL upgrade property

Pages feature-detect:

```js
if (window.pear?.swarm?.v1) {
  // v0.3.0+ — direct P2P
} else {
  // older PearBrowser — fall back to /api/sync/* over the proxy
}
```

Old PearBrowser desktops keep working unchanged. New ones light up
direct paths the page already knew how to ask for. **No flag day.
No redistribution.** v0.3 is a wire-protocol upgrade, not a fork.

---

## v0.2.0 — 2026-04-28

A focused "ship hard" release that closes major UX gaps and lights up backend
features that were already plumbed but had no UI.

### New

- **Multi-tab browsing.** Real Chrome-style tab strip above the URL bar.
  Each tab keeps its own back/forward history, URL bar value, and iframe
  state. Inactive tabs stay alive (hidden via `visibility: hidden`) so
  state survives switches.
- **Keyboard shortcuts** while the Browse pane is mounted:
  `⌘T` new tab · `⌘W` close tab · `⌘L` focus URL bar · `⌘R` reload ·
  `⌘⇧I` / `⌘⌥I` open devtools · `⌘1`–`⌘9` switch tabs.
- **Devtools button** in the URL bar (and `⌘⇧I`) — opens devtools for the
  active tab's iframe via `Pear.Window.openDevTools()` when the runtime
  exposes it. Falls back to a hint if not.
- **Login consent dialog.** When a `hyper://` page calls
  `window.pear.login()` the worklet fires `EVT_LOGIN_REQUEST`; the UI now
  shows a modal with the app name + drive key + (optional) reason, with
  per-scope toggles so you can narrow what's granted. Approve / Cancel
  resolves via `CMD_LOGIN_RESOLVE`.
- **Settings → Profile editor.** Display name, bio, avatar URL, website,
  email — what apps see when you grant a sign-in. Each field is opt-in.
- **Settings → Connected Apps.** Lists every login grant the user has
  issued, with scopes + expiry. Per-row "Revoke" or bulk "Revoke all".
- **Settings → Relays.** Add / remove / mark-primary relay URLs. Toggle
  hybrid-fetch mode on/off (pure-P2P fallback).
- **Settings → Restore from phrase.** Pairs with the existing Backup
  Phrase reveal. Validates the BIP-39 mnemonic via
  `CMD_IDENTITY_VALIDATE_PHRASE` first, gates the destructive call
  behind a confirm, then fires `CMD_IDENTITY_IMPORT_PHRASE`.
- **Apps → catalog persistence.** The most recently loaded catalog
  auto-loads on next launch. Recently-used catalog keys appear as
  one-click chips under the input. Visible loading spinner while a
  catalog is fetching, friendly empty-state when nothing loads.

### Fixed

- **Clean boot — no more uncaught exception.** `pear-electron`'s
  `runtime.start()` return shape changed; the bare `pipe.on('close', ...)`
  calls threw `[uncaughtException]` every boot. Now we detect what we got
  and only attach listeners that exist.

### Internal

- New components: `LoginConsent`, `ProfileSection`, `ConnectedAppsSection`,
  `RelaysSection`, plus a rewritten `Browse` with multi-tab state.
- New CSS for modal overlay, login-consent layout, tab strip, recent-catalog
  chips, restore form, settings-pill, danger button variant.

---

## v0.1.0 — 2026-04-20

Initial public commit of the desktop fork (forked from
[bigdestiny2/PearBrowser](https://github.com/bigdestiny2/PearBrowser),
the mobile-focused project).
