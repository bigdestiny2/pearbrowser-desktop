# PearBrowser Project Review - 2026-06-21

## Scope

This review covers the two browser trees in this workspace:

- `pearbrowser-desktop`: the main Pear desktop browser, app catalogue, site publisher, search, naming, Nostr, and P2P runtime.
- `PearBrowser`: the mobile sibling with React Native plus native Android/iOS shells and the Bare worklet backend.

The deep audit focused on the systems explicitly requested for review: search engine, naming, Nostr bridge, and catalogue. I also checked the broader feature surface through code inspection and the available automated test suites.

## Current State

Overall state: strong for local and protocol-level correctness. The desktop project has a broad test suite around the hard parts: Hyperbee/Autobee catalogues, encrypted Autobase durability, signed search records, name registry convergence, Nostr bindings/events, relay directory verification, browser-state sync, tabs, and query planning. The mobile project is smaller but its TypeScript, backend syntax, native bridge constants, app catalogue verification, swarm bridge, trusted origins, and stream bridge tests are green.

Original 2026-06-21 limitation: live Pear GUI launch, live DHT/HiveRelay replication, real default Hyperbee availability from the public network, and mobile simulator/device runtime were not exercised in that first pass. The 2026-06-23 release pass closed the network/catalogue gaps: the live PearBrowser Network Hyperbee, production browser drive, Peercord bundle drive, and Keet bundle drive were fresh-peer verified with real network access. The mobile pass also fixed missing `ExpoLinking`, added stale-Corestore recovery, proved the tracked SwiftUI iOS shell reaches green `Connected` on simulator, proved generated Expo iOS Debug builds with `ExpoLinking` autolinked, and proved Android native debug APK assembly plus emulator launch to a green `Connected` Home screen with a verified JDK 17. Remaining manual/runtime gaps are Pear's trust prompt for actually executing Peercord, generated Expo iOS Release/Hermes cleanup if that compatibility shell remains release-targeted, signed Android release APK/AAB distribution checks, broader real-device validation, and app-store-style distribution checks.

## Feature Inventory

### Desktop Browse

The desktop browser supports multi-tab Hyperdrive browsing through a localhost proxy, tab history, persisted session state, bookmarks/history-backed autocomplete, site metadata display, in-tab headless Pear app rendering, and injected `window.pear` APIs for login, swarm, sync, identity, and selected app-specific shims.

Health: good. The tab state helper tests cover normalization, history navigation, restore, and pinned-tab ordering. The proxy and bridge are covered indirectly through broader backend tests.

### Apps and Catalogue

The catalogue layer now supports several catalogue sources:

- Hyperdrive `catalog.json`.
- Hyperbee catalogues with `app!<id>` rows.
- Schema-sheets catalogues.
- Relay index-room catalogues.
- Personal writable Hyperdrive "My Catalog".
- Feature-flagged Autobee collaborative catalogues.

Health: good, but complex. The architecture is coherent and intentionally layered, but the UI/backend string shapes differ (`hyperbee://<key>` in settings vs `bee:<key>` in backend cache keys), so scheme normalization matters.

Pre-existing local work had already moved the default catalogue toward the "PearBrowser Network" Hyperbee and added migration from the dead `0c35...` Hyperdrive key. This direction looks correct: the live/default catalogue is updatable, and the offline schema-sheets seed provides a fallback source for first-run catalogue population.

### Search Engine

The Lighthouse search stack is well put together:

- Local personal Hyperbee index.
- NFKC tokenization, bounded terms, deterministic doc IDs.
- Per-doc signed records and thin posting rows bound by `postingSetHash`.
- Deterministic ranking with bounded feature boosts and stable tie-breaks.
- Federated search through trusted contacts, identity bindings, row verification, and fanout budgeting.
- Completeness anchors, digest/proof helpers, and shard planning.

Health: strong. The test suite covers tokenization, ranking stability, hostile input handling, signed-hit verification, trust graph behavior, frontier planning, completeness anchors, and federation merge behavior.

Remaining design note: `QueryPlanner` still comments that peer digests are not fully replicated in v1, so federation may fetch the frontier directly when no digest pull plan is available. That is bounded, but true digest-first efficiency depends on the follow-up wiring.

### Naming

Naming has a layered model:

- URL bar recognizes bare names and `pearname://`.
- Local petnames have highest precedence.
- Multi-writer name registry uses owner-signed claims, first-claim-wins, monotonic rotations, release/revoke, and homograph skeleton reservations.
- Curated aliases provide a bootstrap floor for names like Keet/PearPass.
- Federated name resolution verifies contact-owned claims and drops unverified or mismatched owners.

Health: good. The core normalization, registry, convergence, and federated resolution tests are green. The trust model is honest about provenance: local petname, registry, curated, or contact-derived sources are distinguishable.

Remaining product note: naming is still described as experimental in code comments, and the UI could make name provenance more discoverable without adding friction.

### Nostr Bridge

The Nostr work is thoughtful and defensive:

- Stable Nostr key derived from the Pear identity seed.
- `npub` display encoding.
- Mutual cross-curve binding: Pear Ed25519 root signs the Nostr key, and the Nostr Schnorr key signs the Pear root.
- Root-signed revocation.
- Local NIP-01 event store with verify-and-drop reducer.
- Optional federated trusted-contact feed where contact events must match the contact's attested Nostr key.

Health: good. Tests cover Nostr key derivation, NIP-01 signing/verification, binding tamper cases, revocation semantics, event store verification, query filters, ingest partitioning, and index-room rows.

Remaining product note: this is a P2P trusted-contact Nostr bridge, not a general public Nostr relay client yet. That distinction should stay clear in UI and docs.

### Mobile

The mobile tree is catching up on native-shell parity. Current local changes add Android RPC methods for navigation/catalog loading, expose `EVT_CATALOG_UPDATED`, route Explore taps to `hyper://<driveKey>`, and make native `BrowseScreen` ask the worklet for a localhost proxy URL and bridge token before loading Hyperdrive pages.

Health: tests pass. Needs simulator/device smoke to confirm WebView injection timing and native navigation behavior under real Android WebView lifecycle.

## Changes Made In This Pass

### Search

- Added `normalizeSearchRequest()` in `backend/search-handler.js`.
- NFKC-normalizes and trims search queries.
- Caps query text at 512 characters.
- Clamps result limit to `0..100` before both local index search and federated planner search.
- Added regression coverage in `test/cmd-search-contract.test.js`.

Impact: prevents hostile or accidental renderer inputs from expanding into expensive local scans or federated peer fanout.

### Catalogue

- Added pure `backend/catalog-safety.cjs`.
- Made catalogue JSON parsing recursively strip `__proto__`, `constructor`, and `prototype` through nested objects and arrays.
- Made catalogue app search tolerate empty/non-string queries.
- Added `test/catalog-manager-safety.test.js`.
- Added `catalogCacheKeyForRef()` in `ui/lib/keys.js`.
- Fixed Apps-tab unload persistence so removing `bee:<key>` also removes stored `hyperbee://<key>` recents.
- Updated the catalogue input placeholder to mention hex, z32, `hyperbee://`, and `autobee://`.

Impact: closes a nested catalogue prototype-pollution gap, prevents catalogue search throw paths, and makes catalogue removal stick for scheme-qualified catalogue refs.

### Nostr

- Added pre-signing payload checks in `CMD_NOSTR_PUBLISH`.
- Rejects content beyond the reducer cap before signing.
- Uses the shared `MAX_TAGS` cap instead of duplicating `2000`.
- Checks serialized draft event size against `MAX_EVENT_BYTES` before doing Schnorr signing.

Impact: avoids spending signing work on events the reducer would reject anyway and keeps publish input bounds aligned with the event-store schema.

## Verification

Desktop:

```sh
npm test
```

Original result: 346 tests passed, 0 failed.

2026-06-23 release result: `npm test` passed `402/402`, including the catalogue, Peercord, search, naming, Nostr, sync, and command-mirror additions that landed after this review.

Focused desktop checks:

```sh
node --test test/keys.test.js test/cmd-search-contract.test.js test/catalog-manager-safety.test.js
node --check backend/catalog-safety.cjs
node --check backend/catalog-manager.js
node --check backend/index.js
node --check backend/search-handler.js
```

Result: focused tests passed, syntax checks passed.

Mobile:

```sh
npm test
```

Original result: 95 tests passed, 0 failed.

2026-06-23 release result: `npm test` passed `124/124` after the mobile audit cleanup.

## Review Notes

- The desktop test suite initially showed one transient failure on the first run, but two later full runs were green. If this recurs, inspect the longer-running Autobase/durability tests first.
- Live default-catalog availability is now proven by `node scripts/verify-live-catalog.js --expect-app peercord --expect-app hiveworm`: signed Hyperbee metadata present, catalogue length `206`, 13 apps, peers found, Peercord/HiveWorm rows present.
- Production browser release availability is now proven by `node scripts/verify-pin.js --expect 16898`: drive length `16898`, `/CHANGELOG.md` blob sampled, peers found.
- Peercord bundle availability is now proven by `node scripts/verify-app-full.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord --samples 12 --timeout 90`: 14,730 entries, 12 sampled blobs present, 0 missing.
- The mobile Browse and catalogue changes pass tests, `ExpoLinking` is now present, generated Expo iOS Debug and Release simulator builds pass, the tracked SwiftUI iOS shell launches to `Connected`, Android native debug APK assembly plus emulator launch pass with Eclipse Temurin 17, and Android release APK/AAB plus disposable-key signing verification pass. Production Apple/Android signing, broader real-device validation, and distribution checks are still required before app-store-style release.
- The search system is technically strong; the next meaningful optimization is completing digest-first peer gating so trusted-peer search does less direct frontier fetching.
- The catalogue system is feature-complete but has many source formats. Keep the key-shape helpers centralized so future UI code does not reintroduce `hyperbee://` vs `bee:` mismatches.
