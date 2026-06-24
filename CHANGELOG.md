# Changelog

## v0.5.0 hotfix — 2026-06-24

Shipped as production pear release length `33841` on the stable
`pear://tco5k7…` key.

- Added a browser-side app sync metadata registry so remembered scoped sync
  groups are classified by source app and raw app id.
- Added Lighthouse indexing for public Peerit and P2PBuilders communities,
  boards, posts, and comments as app-routed search documents.
- Reindex known app sync groups on startup, so searchable app data recovers
  after relaunch once a remembered group can be reopened.
- Preserved `hyper://.../#/...` hash routes through the proxy navigation path,
  so search results can open directly into Peerit/P2PBuilders routes.
- Verified `npm test` at `455/455`, production release contents at length
  `33841`, and the live app catalogue with Peercord, peerit, and HiveWorm.

## v0.5.0 — 2026-06-23

The peer-to-peer platform release. v0.4.x made PearBrowser a browser and
decentralized app store; v0.5.0 turns it into a full local-first P2P
platform — a federated search engine, a Nostr bridge, a self-certifying
naming layer, a unified catalogue, and **peerit**, the front page of the
P2P internet. Everything that crosses the network is signature-verified
and fail-closed. Shipped as production pear release length `18614` on the
same stable key `pear://tco5k7…` — existing installs hot-sync on next
launch.

### Added

- **peerit — "the front page of the P2P internet"** — a peer-to-peer
  Reddit (communities, posts, threaded comments, votes in a shared
  Autobase+Hyperbee log) published as a browsable `hypersite`
  (`hyper://ec6e2d6d…/`). Opens as the active front tab on every fresh
  launch alongside the landing page, and is pinned to the top of the
  Sites discovery grid.
- **Federated search** — local-first personal index returns first-paint
  results instantly, then optionally enriches from trusted peers in the
  background: signed-descriptor federation, `QueryPlanner` +
  `SearchFanoutBudget`, root→search-key `IdentityBinding`, per-doc lazy
  `RowVerifier`, digest-first fan-out gating, completeness anchors with
  truncation/fork detection, and contact-invite exchange. Bounded
  queries; nothing leaves the device unless the user asks. Hardened
  across four adversarial-review rounds.
- **Nostr bridge** (Phases 0–3) — a deterministic secp256k1/BIP-340
  identity derived from the PearBrowser seed; a verifying event store +
  reducer; cross-curve identity binding (`pear-nostr-bind`) with
  revocation; a verify-and-drop ingest gate with a trust frontier;
  publish + query of your own NIP-01 event log; and a trusted-contact
  federated feed. Not a general public relay client.
- **Naming — the N5 name registry** — `pearname://` and typed names
  resolve through local petnames, owned registry records, trusted-contact
  federation, and curated defaults, with provenance preserved and
  Unicode/homograph guardrails. N5 is a scoped, durability-gated
  multi-writer registry with cross-user federation (resolve a contact's
  claimed names). Behind an `experimentalNaming` Settings toggle.
- **Unified catalogue + My Catalog + collaborative catalogs** — one
  source manifest feeds the offline seed, the published Hyperbee, and the
  relay firehose, so they can't drift; `dedupeApps()` collapses them by
  key. Create writable personal catalogs and multi-writer Autobee
  catalogs; submit apps to the community list (relay-pinned, moderator
  reviewed). New rows: peerit, Peercord, anonGPT, Pear Dealroom, Pear
  Tickets, PearPoker, HiveWorm — with per-app icons and run-in-tab for
  hypersites.
- **`window.pear.swarm.v1`** — direct Hyperswarm access for `hyper://`
  pages with three trust tiers, per-app rate limits, and persistent
  grants.
- **Open-on-launch** — boots straight into the loaded landing hyperdrive;
  the first-launch onboarding modal is no longer in the way. Static sites
  run directly from the catalogue.
- **Identity & security** — `verify()` / `verifyForApp()`, per-app
  sub-keys, seed-at-rest encryption (SEC0), a binding `purpose` field for
  cross-purpose replay defense, ephemeral per-invoice/per-session key
  derivation, and fail-closed contact-invite signature verification.
- **anonGPT** buyer flow with signed receipts; **device sync**
  (experimental Settings panel).

### Changed

- App/site icons render throughout the browser (resolver + upload + dev
  convention) instead of glyph placeholders.
- The Apps page separates standalone apps from browsable sites; the P2P
  Sites tab gained a search box and a published-site list.

### Fixed

- Settings form fields in a multi-field row (e.g. Author + Categories on
  the Submit form) now flex equally instead of the second collapsing and
  overlapping the first.
- Cold-drive first-paint and assorted browser reliability fixes;
  P2P-first relay race in the hyper-proxy; Sites-page de-duplication.

### Infrastructure

- A durable HiveRelay publisher seeder (launchd) keeps the
  heavy-history production key reachable 24/7; `release-prod.sh` pins the
  new length and confirms reachability; relay-directory capability docs
  are re-verified at consumption; the bern (EU) relay pubkey is baked into
  the bootstrap set.

## v0.4.5 — 2026-05-15

Defensive error path for backend boot failures. v0.4.4 introduced the
release pipeline that catches partial-pin regressions on our side
before they ship — but a community user (clarky) hit a different
failure mode where the renderer port-scanned all 5 RPC ports and got
a cryptic `Could not reach backend on any port 9876-9880 (ws error)`
message with zero diagnostic info. The Bare main process was missing
or crashed before binding `ws.Server`, but the renderer had no way to
know which.

### Fixed

- **`index.js` (Bare main process)** — `bootBackend()` is now wrapped
  in `try/catch`. On failure, prints a banner-style multi-line
  diagnostic to `pear run --dev` output with the error, code, stack,
  and the three most common causes + their fixes. Then STILL binds
  the WS server so the renderer has something to talk to — emits a
  structured `backend-boot-failed` event over the same wire format the
  renderer already speaks. Brief delay then closes the socket.
- **`ui/main.js` (renderer)** — listens for `event:backend-boot-failed`
  on the RPC client. When fired, renders the boot-failed message + code
  + full stack directly in the splash screen along with the recommended
  fix (clear cache + relaunch). Screenshot the splash → paste into a
  bug report; helpers don't need to walk anyone through `--dev`.
- **`ui/boot.js`** — when ALL port scans fail (different mode: main
  process itself didn't start at all), the error message now tells
  the user the likely cause (stale partial download from a prior
  release) and exactly how to clear the cache + relaunch.

### Why this matters

The boot-failure surface is now self-diagnosing. If a future user
hits a wedge state — stale cache, missing native addon, runtime
mismatch — they see the actual error message in the app window
instead of an opaque port-scan loop. Field-debuggability moves from
"DM the maintainer your `--dev` log" to "screenshot the splash."

Smoke-tested: normal happy path is unchanged — `[rpc] WS listening on
:9876`, renderer connects, all 5 hiverelay relay connections come up.
Behavior change is failure-path only.

---

## v0.4.4 — 2026-05-14

Closes the silent partial-pin failure mode that was making
`pear run pear://tco5...` hang on fresh machines, picks up the
HiveRelay 0.8.12 SDK, and fixes the broken in-app HiveRelay client
in the v0.4.3 release.

### Fixed

- **In-app HiveRelay client now actually initializes.** v0.4.3
  shipped with `backend/index.js` importing `p2p-hiverelay-client`
  (the v0.8.11+ package name) but bundled `^0.8.5` deps — which
  predated the monorepo split, so `p2p-hiverelay-client` didn't exist
  as a standalone package at stage time. The deployed app logged
  `[hiverelay] init failed: MODULE_NOT_FOUND` and the
  Settings → Publish path was non-functional. v0.4.4 ships with
  `^0.8.12` deps which include `p2p-hiverelay-client` as a real
  package; init succeeds end-to-end.
- **`scripts/pin-self-on-hiverelay.js`** — `maxStorage` raised from
  256 MB to 1 GB. The 256 MB cap was set when the drive was ~9 MB;
  with `pear-electron` now bundling the Chromium runtime *into* the
  staged drive, the v0.4.3 drive is ~365 MB. Relays were accepting
  the seed request, replicating metadata fully, then stalling
  mid-blob-download at the cap. End-user symptom: `pear info` works,
  `pear run` hangs forever on first launch. Now sized at 2× the
  drive with headroom for future growth, and the SEED_OPTS comment
  block explains how to re-size if it grows past ~700 MB.

### Added

- **`scripts/verify-pin.js`** — boots a fresh corestore in a temp
  dir, joins the production drive's swarm, reads the drive length,
  and round-trips an actual blob block (not just metadata). Exits
  non-zero if the blob fetch times out. This is the diagnostic that
  catches a partial pin — `pear info` is not enough, because it only
  proves metadata is reachable.
- **`scripts/release-prod.sh`** — now does `stage → release → pin →
  verify` as one pipeline. The verify step retries every 90s for up
  to 10 minutes. If it never passes, exit code 2 — a release that
  hasn't propagated to the network can no longer silently ship as
  "succeeded".

### Upstream — HiveRelay 0.8.11 picked up

Filed [`FEEDBACK-PEARBROWSER-PIN-CAP-FAILURE.md`](https://github.com/bigdestiny2/P2P-Hiverelay/blob/main/docs/FEEDBACK-PEARBROWSER-PIN-CAP-FAILURE.md)
with the HiveRelay maintainers. Same-day turnaround:

- ✅ Fix (1) — relay rejects seed when `drive.byteLength > maxStorage`,
  emits `seed-aborted` event after metadata sync and unseeds locally
- ✅ Fix (4) — SDK computes a sane `maxStorage` default (`observed × 4`,
  falls back to 1 GB), emits `seed-cap-warning` when declared cap is
  too small
- ✅ Fix (5) — HiveRelay shipped `docs/PUBLISHING.md`
- ⏳ Fixes (2) `seed-progress` and (3) `client.queryContent()` queued for
  v0.8.12 (need protocol design)

Picked up on our end:
- Bumped `p2p-hiverelay{,-client,-verifier}` `^0.8.5` → `^0.8.12`
- Migrated the SDK import path across `scripts/pin-self-on-hiverelay.js`,
  `scripts/publish-and-pin.js`, `scripts/check-relays.js`,
  `scripts/unseed-drive.js`. The 0.8.11 monorepo split moved the client
  SDK from `p2p-hiverelay/client` (a sub-export) to the dedicated
  `p2p-hiverelay-client` package
- Wired `seed-cap-warning`, `seed-aborted`, and (0.8.12+) `seed-cap-raised`
  listeners into the pin script so every relevant relay-side decision
  prints clearly. With our 1 GB cap vs. the 478 MB recommended by the SDK,
  no warning/abort fires — clean pin handshake

### v0.8.12 follow-up — re-seed gap fixed

After v0.8.11 deploy we observed that re-pins on already-pinned drives
returned `alreadySeeded: true` immediately, never re-applying new opts
or re-triggering `drive.download('/')`. Filed as ask (6) in the same
feedback doc. HiveRelay shipped v0.8.12 the same session:

- `seedApp` on `alreadySeeded` now reconciles new opts against the
  stored entry. Raised cap → updates entry + emits `seed-cap-raised` +
  restarts `eagerReplicate`. Lowered cap → emits `seed-cap-warning`,
  keeps prior cap. Same opts → no-op
- `_eagerReplicate` extracted from inline closure to class method,
  callable from fresh-seed *and* re-pin paths, with a `source` field
  on emitted events for traceability
- Production relays bounced to clear pre-v0.8.11 partial-pin state.
  Our re-pin against the fresh registries went through the full code
  path under the 1 GB cap; backfill is in progress

Remaining v0.8.12 items still queued: (2) `seed-progress` / (3)
`client.queryContent()` — both publisher-facing availability signals,
both need protocol-shape discussion.

---

## v0.4.3 — 2026-05-12

Docs + release-pipeline cleanup. No user-facing app changes.

### Changed

- **README rewrite** to reflect v0.4.x reality — multi-tab, tab
  persistence, URL autocomplete, about-site panel, `window.pear.swarm.v1`,
  capability badges, "Moving to a new device?" identity framing.
  Adds a companion-projects table (hyper-fetch / hiveworm / HiveRelay /
  mobile PearBrowser) and an honest note about `pear run` being
  deprecated in Pear runtime v2.4.0 (still works, distribution path to
  signed installers is future work).
- **Release pipeline simplified** — `scripts/release-prod.sh` now does
  the two-step `pear stage` + (deprecated) `pear release` flow. The
  earlier attempt at full multisig (`pear provision` + `pear multisig`
  quorum-cosigning) was rolled back: that's a multi-publisher feature,
  ceremony with no security gain for a solo 1-of-1 quorum. `pear.json`
  retains the link config + a comment explaining how/when to migrate
  to multisig.
- **`pear.stage.ignore` updated** for Pear runtime v2.4.0 (which
  dropped the default auto-ignores). Now explicitly ignores `.git`,
  `.github`, `.DS_Store` (top-level + nested), `.claude`, `docs`,
  `examples`, `scripts`, `CHANGELOG.md`, `README.md`, `appling`,
  `pearbrowser-storage`. Prevents future stages from polluting the
  staged drive with VCS/Mac noise + publisher tooling.

### First release using the new pipeline

This is the first release published via `scripts/release-prod.sh`
instead of the manual `pear stage production .` + `pear release
production .` we used through v0.4.2. End-to-end test of the new
two-step flow.

---

## v0.4.2 — 2026-05-12

Production reliability — picks up the **p2p-hiverelay 0.8.5** SDK
which fixes a discoveryKey-derivation bug that was causing 0-peer
seed-requests in earlier releases.

### Fixed (via dependency upgrade, see commit `997be16`)

- **Seed-requests now reach the right DHT topic.** The 0.4.x
  hiverelay client SDK derived the seed-request `discoveryKey` via
  plain BLAKE2b — but Hypercore/Hyperdrive use a *keyed* BLAKE2b
  (key = ASCII `"hypercore"`). Relays accepted the signed seed, then
  looked for the publisher on a DHT topic the publisher wasn't
  announcing — explaining the intermittent "0 acceptances" we saw
  during the v0.3.x → v0.4.x dev cycle. Fixed upstream in 0.8.0;
  default derivation is now correct and `opts.discoveryKey` is
  honoured.
- Explicitly passes `discoveryKey: site.drive.discoveryKey` to
  `seed()` as defence-in-depth — guarantees relays look on the
  right DHT topic regardless of any future SDK derivation drift.

### Internal

- `package.json`: `p2p-hiverelay 0.4.2 → 0.8.5`, plus added
  `p2p-hiverelay-client 0.8.5` and `p2p-hiverelay-verifier 0.8.5`
  (the client SDK was split into its own ESM package in 0.5.x;
  verifier is new in 0.6.0).
- `backend/index.js`: swapped CommonJS `require('p2p-hiverelay/client')`
  for `await import('p2p-hiverelay-client')` — old subpath no longer
  exists; new package is `"type": "module"`.
- README: updated Publish section to mention the new SDK's
  `waitForDurable()` confirms at least one relay has actually
  replicated before reporting success.

### Operator scripts

- `scripts/check-relays.js` — standalone HiveRelay discovery
  diagnostic. Boots a throwaway HiveRelayClient and prints each
  relay that appears in the DHT. Companion to the existing
  `pin-self-on-hiverelay`, `publish-and-pin`, `extract-drive`,
  `unseed-drive`, `list-drive` scripts.

---

## v0.4.1 — 2026-05-04

Tiny patch — surface relay capability advertisements in Settings.

### New

- **Settings → Relays** now probes each configured relay's
  `/.well-known/hiverelay.json` on mount and shows version, region,
  and supported transport pills below each relay URL. The new
  `dht-relay-ws` transport (which unlocks `hyper://` reading from
  any browser via [hyper-fetch](https://github.com/bigdestiny2/hyper-fetch))
  gets a distinct accent-orange pill so users can see at a glance
  which relays are fully featured.
- Capability check is renderer-side `fetch()` with a 6 s per-relay
  timeout — no new RPC handler needed. Failed checks degrade
  gracefully ("capability check failed: timeout").

---

## v0.4.0 — 2026-05-04 — "First-run delight"

Consumer polish wave, focused on what a brand-new user sees in their
first 60 seconds + giving the browser the basic stickiness that
makes it feel like a real browser.

### New

- **First-launch onboarding overlay.** Three slides — welcome, a
  short three-thing pitch, and a 2×2 grid of curated first sites
  (homepage, HiveWorm, HiveRelay site, P2P Builders) to land in.
  Skippable. Persisted via `pearbrowser.onboardingDone` in user-data
  settings — never shown again. Deliberately does NOT force a
  backup-phrase reveal: that's framed as a Settings → Identity
  feature for the "moving to a new device" use case.
- **Tab persistence + restore across launches.** Tab state is now
  serialized to `pearbrowser.browseTabs` in user-data settings on
  every change (debounced 800ms), and restored on next boot. You'll
  pick up exactly where you left off — same tabs, same active tab.
- **Tabs no longer destroyed on main-tab switch.** Lifted browse
  tabs[] state up to App level — switching to Apps or Settings and
  back no longer wipes your open tabs. (This was a long-standing
  bug; the lift fixes it as a side effect of the persistence work.)
- **"About this site" panel** (ⓘ button in the URL bar). Shows the
  current URL, drive key in both hex and z-base-32 forms (copy
  buttons for each), scheme + path, and a one-click bookmark toggle.
  Live drive metadata (length, peer count, replicas) lands in a
  near-future patch.
- **URL bar autocomplete** drawing from your bookmarks + history
  Hyperbees. Bookmarks rank above history; prefix matches above
  substring matches; cap of 8 results. ↑ ↓ arrows to navigate, Enter
  to pick, Esc to dismiss. Refreshes the source on focus, debounced
  to once per 30s so it never blocks typing.

### Changed

- **Settings → Identity** restructured. The backup-phrase section is
  now framed as **"Moving to a new device?"** with explanation of
  what the phrase actually does and the security tradeoffs, instead
  of presenting it as a generic "make sure you back up your
  identity" tax. Reveal-phrase + restore-from-phrase flows
  unchanged.

### Internal

- New components: `Onboarding`, `AboutSite` in `ui/shell.js`.
- New helpers: `parseDriveAddress` (URL → {hex, z32, path, scheme}).
- App-level state lifted from Browse: `tabs`, `browseActiveId`,
  `tabsRestored`, `onboardingState`.
- Browse component takes `tabs/setTabs/activeId/setActiveId` as
  props instead of owning the state.
- New CSS sections: onboarding overlay/slides/dots, about-card,
  copy-btn-small, urlbar-suggestions.

---

## v0.3.3 — 2026-04-29

### Changed

- **Apps tab Featured slot:** Pear Doctor → **HiveWorm**
  (`pear://d1xbkcpcbi1xa8dexp49rsendra5r67w3qh5a9k8t44oemm4k16y`).
  HiveWorm is a perpetual P2P life-sim using `window.pear.swarm.v1`
  for direct peer gossip. Pinned on 5 HiveRelays for 365 days.
  Source: <https://github.com/bigdestiny2/hiveworm>

---

## v0.3.2 — 2026-04-28

Tiny patch — point `DEFAULT_URL` at the **third and final** homepage
drive, this one published via the desktop's own block editor (so
future edits work in-place via the Sites tab).

### Changed

- `DEFAULT_URL` → `hyper://2d6c2be92f07e10ed5a4b07b5c1286a56f0c1220c79ad3c3293b069f8c946763/`
  Pinned on 4 HiveRelays. Block source lives at `/.blocks.json` inside
  the drive — open the site in Sites → Edit to update.
- Catalog (`0c35d12fd9b1…`) `homepage` field updated to match.

### Cleanup

- Previous `fec1568a…` and `efd7b0c6c38d…` homepage drives unseeded
  via `scripts/unseed-drive.js`. Their content stays alive only as
  long as ad-hoc peers replicate it — no relay backstop.

---

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
