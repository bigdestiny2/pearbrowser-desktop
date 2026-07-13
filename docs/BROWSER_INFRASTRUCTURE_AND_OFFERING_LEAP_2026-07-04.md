# PearBrowser Infrastructure And Offering Leap - 2026-07-04

## Executive Thesis

PearBrowser does not need a larger pile of disconnected features. The browser is
already a broad P2P-native surface: hyper browsing, apps, publishing, search,
naming, Nostr, identity, sync, swarm APIs, native packaging, and mobile parity
tracks exist.

The largest margin improvement is to make PearBrowser the dependable launchpad
for the rest of the Pear ecosystem:

- every app has a verifiable manifest, origin, runtime contract, and availability
  state;
- every release claim is backed by a dated evidence artifact;
- every relay/catalog/search result is treated as an index until verified;
- desktop and mobile share one app-platform contract instead of drifting;
- the user sees simple, trustworthy product surfaces instead of raw P2P plumbing.

## Source-Backed Read

This plan is based on the local `00-brain` vault plus the current browser docs.
Most important source anchors:

- `00-brain/compiled-vault-brain-2026-06-23/Reports/2026-06-30 - PearBrowser - P2P App Audit.md`
- `00-brain/compiled-vault-brain-2026-06-23/Reports/2026-07-02 - PearBrowser Origin Isolation Migration Design.md`
- `00-brain/compiled-vault-brain-2026-06-23/Reports/2026-07-02 - Hiverelay Unified Release Board Refresh.md`
- `00-brain/compiled-vault-brain-2026-06-23/Context Packs/P2P Browser Architecture Context Pack.md`
- `00-brain/compiled-vault-brain-2026-06-23/Topics/App Catalogs.md`
- `00-brain/compiled-vault-brain-2026-06-23/Topics/Relay-Backed Availability.md`
- `00-brain/compiled-vault-brain-2026-06-23/Topics/Identity And Storage.md`
- `pearbrowser-desktop/docs/RELEASE_NETWORK_EVIDENCE_2026-07-02.md`
- `pearbrowser-desktop/docs/ORIGIN_ISOLATION_MIGRATION_2026-07-02.md`
- `pearbrowser-desktop/docs/HIVERELAY-SCHEMA-SHEETS-DESIGN.md`
- `pearbrowser-desktop/docs/SEARCH-HANDOVER.md`
- `PearBrowser/docs/CURRENT_STATUS_AUDIT_2026-06-23.md`

## Current Leverage

### What Is Strong

- Desktop has 512/512 passing local tests recorded in the latest release evidence
  note, plus focused release, bridge, origin-isolation, packaging, and evidence
  checker tests.
- Mobile has source-level validation, bridge parity, native shell contracts, and
  a concrete release preflight.
- SSE bearer-query fallback has been replaced by one-time ticket flow on desktop
  and mobile tracks.
- Per-drive origin isolation has a feature-flagged desktop core:
  `PEARBROWSER_PER_DRIVE_ORIGINS=1`.
- Catalog, search, naming, Nostr, identity, and relay modules are already split
  into testable backend pieces.
- Hiverelay has strong local release-board tooling and availability/verifier
  primitives.

### What Still Blocks Trust

- Desktop is source-green but not announcement-ready: GUI rows, real-DHT/fresh
  peer rows, Peercord trust review, mobile distribution rows, and final release
  decision rows remain operator gates.
- Origin isolation is implemented behind a flag, but actual browser GUI storage,
  CSP, tab lifecycle, and real-app bridge proof remain open.
- Mobile still lacks production signing, TestFlight/App Store Connect, Play or
  Firebase validation, and broader real-device evidence.
- Hiverelay public release rows are externally blocked: npm latest for
  `p2p-hiveservices`, release-distribution preflight values, GHCR image tag,
  Umbrel, StartOS, fleet rollout, and final verifier evidence.
- Desktop and mobile share concepts but not yet one visible conformance package
  for app runtime behavior.

## Ranked Bets

### 1. Evidence-First Release Operating System

Turn release readiness from scattered manual notes into one browser release
certificate.

Deliverables:

- `pearbrowser release:certify` that runs local checks, consumes operator
  evidence JSON, and prints one PASS/BLOCKED board for desktop, mobile, Hiverelay
  availability, origin isolation, public trust, and announcement decision.
- A small schema for evidence rows shared by desktop and mobile release logs.
- Strict distinction between source-green, externally-proven, deferred, and
  intentionally blocked.
- A public-safe summary generator for release notes and website claims.

Why it moves the margin:

Users and app developers will trust PearBrowser only when availability,
distribution, origin isolation, and store readiness are observable facts. This
also stops stale README claims from outpacing proof.

First slice:

- Normalize `docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md` and
  `docs/RELEASE_NETWORK_EVIDENCE_2026-07-02.md` into a single machine-readable
  desktop evidence board.
- Add mobile evidence rows as explicit dependencies instead of prose.

### 2. Close Origin Isolation And Flip It Default-On

Finish the existing per-drive loopback-port migration and make it the normal app
runtime path.

Deliverables:

- Completed Peerit/Pearfeed GUI evidence artifact verified by
  `check:origin-isolation-smoke-evidence`.
- Browser proof for distinct `location.origin`, localStorage, IndexedDB, cookies,
  strict CSP, tab close/navigation listener release, and real app bridge calls.
- LRU/default-on policy for drive-scoped listeners.
- Rollback and diagnostics when listener allocation fails.

Why it moves the margin:

PearBrowser becomes a real app platform instead of a shared-origin proxy with
token gating. This is the security boundary that lets the catalogue grow without
turning every app into mutual XSS/storage risk.

First slice:

- Run or automate the generated
  `docs/origin-isolation-smoke-plan-peerit-pearfeed-2026-07-02.json` flow.
- Add the completed artifact and make release evidence consume it.

### 3. Shared App Runtime Contract Package

Extract the browser app-platform contract into a small shared package consumed by
desktop, mobile, tests, app templates, and docs.

Deliverables:

- Canonical bridge contract for `window.pear.login`, identity, sync, swarm.v1,
  SSE ticketing, trusted origins, origin-bound tokens, and app metadata.
- Golden fixtures for desktop injected bridge templates, iOS Swift bridge,
  Android Kotlin bridge, and React Native bridge.
- Contract tests that fail when desktop/mobile diverge.
- Author-facing compatibility kit: manifest validator, CSP checker, launch-mode
  checker, and sample app.

Why it moves the margin:

The browser offering becomes "build once for PearBrowser" instead of "hope each
host shell behaves the same." It also makes future app certification cheap.

First slice:

- Create a `packages/app-runtime-contract` candidate with JSON fixtures and
  route/token invariants only. Do not move runtime code yet.

### 4. Schema-Sheets Catalog And Relay Directory As First-Class Product

Promote the existing schema-sheets direction from design/partial integration into
the main app discovery and relay discovery layer.

Deliverables:

- Canonical `apps` / `app-manifest` schema with required launch type,
  safe target, publisher provenance, version, categories, and verification state.
- Debounced Apps search backed by `CMD_SHEETS_LIST`, with offline aggregate
  fallback.
- Relay directory rows from Hiverelay index rooms, replacing single hardcoded or
  static relay assumptions.
- Verification and capability signatures rechecked client-side before display.
- Featured apps as signed catalogue data, not hardcoded UI arrays.

Why it moves the margin:

This turns PearBrowser from "a browser with an app list" into a distributed app
store with verifiable manifests, queryable catalogs, and relay-backed
availability.

First slice:

- Make Apps search call the existing sheets/catalog backend where available,
  while preserving current aggregate fallback and safety normalizers.

### 5. Availability UX And Relay Proof Surfaces

Expose relay-backed availability in the product as a user/developer trust
surface.

Deliverables:

- App cards show availability state: locally cached, relay pinned, fresh-peer
  verified, stale, missing blobs, standalone trust required.
- Site publisher shows durable replication progress from actual relay proof,
  not just "published".
- Settings includes relay capability cards with version, transports, region,
  indexRoom, verifier state, and last proof.
- Developer diagnostics can inspect drive key, current length, relay proof,
  catalog row provenance, and launch mode.

Why it moves the margin:

The product promise is "the publisher can be offline and the app still launches."
That promise should be visible and testable inside the browser.

First slice:

- Thread existing verifier outputs into app/catalog rows as badges with
  conservative labels: `Pinned`, `Fresh-peer verified`, `Needs proof`, `Blocked`.

### 6. Public-Trust Native Distribution

Move native desktop install from "packages exist" to "normal users can install
without warnings or guesswork."

Deliverables:

- Signed and notarized macOS `.dmg`.
- Windows signing path for `.msix`.
- Linux AppImage metadata and optional `.deb` after demand is proven.
- Homebrew Cask and WinGet manifest generation tied to verified GitHub release
  assets and SHA-256 sidecars.
- Clean-host install smoke artifacts.

Why it moves the margin:

Distribution friction is product friction. The browser can be technically
excellent and still lose users at the first OS warning.

First slice:

- Use the existing `check:public-trust-readiness` and generated signing secret
  plan to produce a concrete owner checklist for `v0.5.2`.

### 7. Developer Offering: Certify, Simulate, Publish

Package the app author workflow as a first-class offering.

Deliverables:

- `pearbrowser app doctor <path-or-key>`: manifest, launch type, CSP, bridge,
  SSE, sync, identity, and origin-isolation checks.
- App template with tested `window.pear` feature detection and strict CSP.
- "Run in tab" certification for hypersites, "standalone window" certification
  for Pear desktop apps.
- Publisher workflow: build, publish Hyperdrive, pin on Hiverelay, update
  schema-sheets manifest, verify fresh-peer launch.

Why it moves the margin:

The ecosystem grows when third-party apps can ship without reading a pile of
internal notes.

First slice:

- Convert `PEARBROWSER-APP-COMPAT-STANDARD.md` into executable examples and a
  lightweight manifest checker.

### 8. Identity, Device Sync, And Revocation As Product

Make identity and storage boundaries clear to normal users while preserving the
strong technical split.

Deliverables:

- Connected apps show per-app pubkey, granted scopes, last use, storage usage,
  sync groups, and revoke.
- Device sync has explicit pairing, recovery, and revocation stories.
- Backup/restore proves root identity recovery does not imply app storage
  confusion.
- Browser reset signs unseed/revocation actions before deleting pinned state.

Why it moves the margin:

PearBrowser is strongest when users understand "my identity, my devices, my app
grants, my replicated data" without needing to understand Corestore namespaces.

First slice:

- Add an internal grant/device diagnostic model before polishing UI.

### 9. Performance And Reliability Observatory

Give the browser a local observability layer for P2P behavior.

Deliverables:

- Metrics for hyper proxy first byte, relay fallback, fresh-peer verification,
  search first paint, federated result latency, swarm session caps, indexed doc
  count, and app launch timing.
- Bounded local log export for release evidence.
- Runtime smoke that checks DHT, proxy, relay, storage, and current tab app
  health without becoming the renderer.

Why it moves the margin:

P2P failures often look like "nothing happened." Observable local state turns
support, QA, and demos into engineering loops.

First slice:

- Extend `runtime-rpc-smoke.mjs` outputs into a structured diagnostic snapshot
  that release evidence can consume.

### 10. Trust-Centered Product Polish

Use the existing primitives to make the UI feel like a trustworthy P2P browser,
not a lab instrument.

Deliverables:

- App cards: publisher, launch mode, available version, relay proof, trust
  decision, origin-isolation status.
- Search rows: matched terms, local/federated source, provenance, digest/partial
  state, budget exhaustion.
- Name resolution: local petname, owned registry, trusted-contact claim, curated
  alias, conflict UI.
- Nostr: compact binding/revocation state plus hidden/quarantined event browser.

Why it moves the margin:

PearBrowser's offering is not only raw decentralization. It is legible trust.

First slice:

- Add result-row explanations for local search, because the data is already
  available and the release docs call it out as the next product improvement.

## Suggested Execution Order

### Week 1: Make Trust Measurable

- Consolidate release evidence into one board.
- Run or prepare the origin-isolation GUI proof artifact.
- Produce a public-trust native distribution owner checklist.
- Keep Hiverelay release external blockers visible as upstream dependencies, not
  browser-local TODOs.

### Weeks 2-4: Turn Browser Into App Platform

- Extract app runtime contract fixtures.
- Add desktop/mobile conformance checks around SSE tickets, origin-bound tokens,
  identity, sync, and swarm.
- Add manifest/launch-mode checker for app authors.
- Close origin isolation default-on policy.

### Weeks 4-8: Upgrade Discovery And Availability

- Promote schema-sheets Apps search and manifest rows.
- Add relay directory consumption and capability verification UI.
- Surface app availability badges from verifier/proof state.
- Convert Featured Apps into signed data.

### Weeks 8-12: Improve Offering Depth

- Developer "certify, simulate, publish" workflow.
- Trust Center and app diagnostics.
- Search explanations, naming conflict UI, Nostr quarantine browser.
- Real-peer performance sampling for search and relay launch flows.

## Guardrails

- Do not reintroduce bearer tokens in EventSource URLs. SSE stays ticket-only.
- Do not automate Peercord trust-prompt approval. Human review is part of the
  trust boundary.
- Do not call Hiverelay externally released until npm latest, GHCR, preflight,
  Umbrel, StartOS, fleet, and final verifier evidence are green.
- Do not broaden Hiverelay's public story into AI/payment/custody/service
  marketplace claims while the browser depends on Core Availability.
- Do not treat schema-sheets rooms as authority. They are indexes; verify
  capability signatures, attestations, anchor proofs, and publisher identity.
- Keep desktop and mobile behavior convergent through fixtures, not prose.
- Keep local-first defaults: no query leaves the device unless the user enables
  federation.

## First Five Concrete Tickets

1. Browser release certificate v0:
   - input: current desktop release evidence log, release network evidence,
     mobile preflight JSON, origin-isolation evidence JSON;
   - output: one JSON board plus Markdown summary.

2. Origin isolation proof closure:
   - run the Peerit/Pearfeed smoke plan with `PEARBROWSER_PER_DRIVE_ORIGINS=1`;
   - verify with `check:origin-isolation-smoke-evidence`;
   - attach to release evidence.

3. App runtime contract fixtures:
   - define golden bridge and route fixtures;
   - assert desktop and mobile do not diverge on login, identity, sync, swarm,
     SSE ticket, and origin token behavior.

4. App manifest checker:
   - validate safe link/drive key, launch type, CSP expectations, icon refs,
     publisher fields, and schema-sheets compatibility;
   - add fixtures for hypersite and standalone apps.

5. Availability badges:
   - map existing verifier and catalog proof states into conservative app-card
     labels;
   - never show `verified` unless the proof source is explicit.

## Success Definition

PearBrowser has improved by a large margin when a new user can install it through
a trusted native package, open a signed catalogue, launch an origin-isolated app,
see whether the app is relay-backed and fresh-peer verified, grant/revoke app
capabilities, and understand search/name results by provenance.

For developers, success means they can run one doctor command, publish one
manifest, pin through Hiverelay, and know whether their app will behave the same
on desktop and mobile.
