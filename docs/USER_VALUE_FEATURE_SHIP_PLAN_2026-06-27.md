# PearBrowser User Value Ship Plan

Created: 2026-06-27

This plan turns the current product analysis into a staged implementation
program. The goal is to make PearBrowser feel fast, trustworthy, and useful to
normal users while preserving the local-first and decentralized security model.

## Principles

- Ship shared foundations first: telemetry, batched metadata, reusable trust
  DTOs, and shared UI widgets should support several surfaces at once.
- Keep trust visible but calm. Users should see what is signed, pinned,
  verified, local, or federated without reading protocol docs.
- Keep local-first defaults. Network federation, public relay behavior, and
  broad sync should remain opt-in or clearly explained.
- Keep performance work evidence-driven. Add timing and source telemetry before
  tuning caches, startup, or fetch behavior.

## Track 1: Trust Center For Apps And Sites

User outcome: every app or site has a compact "why should I trust this?"
surface that explains publisher identity, catalogue source, verification state,
relay durability, app permissions, swarm grants, and release history.

Deliverables:

1. Backend trust summary DTO.
   - Inputs: drive info, catalogue row metadata, login grants, swarm grants,
     relay pin snapshot, app launch mode, and available signed provenance.
   - Proposed command: `CMD_TRUST_SUMMARY`.
   - Tests: DTO normalization and safe fallback when any subsystem is missing.

2. Reusable Trust Center modal.
   - Entry points: Apps detail/action row, About this site, Sites editor publish
     result, and Settings connected-app grants.
   - UI states: trusted/signed, unsigned, relay-pinned, local-only, unknown,
     standalone-app warning, revoked/unseeded where known.

3. App/site permission view.
   - Login scopes, profile fields, app sync groups, arbitrary swarm topics, and
     per-app revoke actions in one place.

Status:

- Shipped Trust Center helper v1 for apps and sites, including catalog source,
  signed/unsigned state, launch mode, relay pin evidence, live availability,
  login/profile grants, arbitrary swarm grants, and community moderation state.
- Shipped release-history evidence in Trust Center summaries. Catalog rows now
  preserve bounded `releaseHistory` entries plus `publishedAt`/`updatedAt`,
  personal sites track `createdAt`/`updatedAt`/`publishedAt`, and Trust Center
  surfaces the current version, release count, latest release date, latest note,
  and site lifecycle dates.
- Shipped backend `CMD_TRUST_SUMMARY` DTO so app/site trust summaries are
  available through RPC with live drive info, login grants, and swarm grants
  where available.
- Shipped publisher identity as first-class Trust Center evidence. App and site
  summaries now badge and summarize `author`/`publisher` names plus
  `publisherKey`/`publisherPubkey` keys, and the backend DTO exposes the
  normalized publisher object for native callers.
- Shipped signed release-log readiness. Trust Center now recognizes
  `signedReleaseHistory`, `signedReleases`, `releaseManifests`, and signature /
  signer fields on normal release rows, badges signed release-manifest evidence,
  summarizes signed release counts, and exposes `signedReleaseCount` through the
  backend DTO.
- Remaining: richer cryptographic verification once publishers standardize a
  canonical signed release-manifest envelope.

## Track 2: Decentralized Search As Signature UX

User outcome: search results explain why they are present and how much of the
trusted network was searched.

Deliverables:

1. Result-level explanation model.
   - Inputs already exist: matched fields, local vs trusted tier, source kind,
     availability, digest hit/fallback/partial flags, verify budget, peer fetch
     stats, and provenance.
   - Add row-level copy and tooltip-friendly labels.

2. Search run summary.
   - Show local docs searched, trusted peers planned/pulled/completed, digest
     skips, partial state, and verification budget exhaustion.

3. Trusted peer setup nudge.
   - When federation is enabled but no searchable peers exist, guide users to
     add a contact invite rather than showing a silent empty network.

Tests:

- `CMD_SEARCH` contract for provenance shape.
- UI helper tests for explanation labels and badge ordering.
- QueryPlanner tests for peer fetch stats/partial-state coverage.

Status:

- Shipped decentralized-search result explanations and run-provenance badges.
  Results now explain local vs trusted-peer origin, source type, verified app
  data, matched fields, match mode, and availability. Search runs summarize
  planned/pulled/completed peers, digest hits/skips, partial states, and
  verification-budget caps.
- Shipped a trusted-peer setup cue. When federated search runs with no
  searchable trusted frontier, the provenance helper surfaces a local-only state
  and nudges users to add a verified contact invite.

## Track 3: Graduate Encrypted Device Sync

User outcome: PearBrowser follows the user across devices without an account.

Deliverables:

1. Expand sync ops beyond bookmarks.
   - Tabs/session, settings, history, profile, trusted contacts, and app grants
     need separate op types and conflict rules.

2. Recovery and pairing UX.
   - Clear invite handling, writer promotion status, revoke/reset pairing, and
     backup phrase relationship.

3. Production-readiness gates.
   - Encryption-key handling audit, storage growth bounds, relay pin status, and
     device-sync smoke in release evidence.

Tests:

- Pure reducer convergence per data type.
- Multi-device smoke for tabs/settings/profile/contact conflicts.
- Negative tests for devices without encryption keys.

Status:

- Shipped encrypted tab/session snapshots alongside bookmarks. Each paired
  writer can publish its current open-tab set, and other devices can reopen
  synced tabs from the Device sync panel.
- Shipped allowlisted settings snapshots. Writer devices can push non-secret
  preferences such as feature flags, recent catalogue pointers, My Catalog key,
  onboarding state, and standalone-warning state into the encrypted sync base;
  paired devices can explicitly apply the synced snapshot locally.
- Shipped allowlisted profile snapshots. Writer devices can push their profile
  fields into the encrypted sync base, and paired devices can explicitly apply
  the synced profile locally. App grants are handled by separate permission
  snapshot ops.
- Shipped bounded browsing-history snapshots. Writer devices can push their
  recent local history into the encrypted sync base, and paired devices can
  explicitly replace local history with the synced snapshot while preserving
  visit timestamps.
- Shipped contacts snapshots. Writer devices can push saved contacts into the
  encrypted sync base, and paired devices can explicitly replace local
  contacts. Searchable peer binding keys are preserved only when the contact
  invite signature re-verifies on the receiving device.
- Shipped app-grant snapshots. Writer devices can push stored sign-in/profile /
  contact grants plus persistent swarm-topic grants into the encrypted sync
  base, and paired devices can explicitly replace local permission stores from
  that snapshot.
- Shipped recovery / revocation controls. A device can locally forget saved
  sync keys, or rotate into a fresh encrypted sync group that carries local
  browser state forward while leaving old paired devices on the old group.
- Shipped release-evidence smoke coverage for encrypted device sync. The
  desktop evidence collector now runs `scripts/browser-state-sync-smoke.js`,
  which proves writer promotion, multi-device convergence, keyless-reader
  failure, and restart determinism with a structured evidence payload.
- Shipped storage-growth bounds evidence for encrypted device sync. Synced
  session/device snapshots are capped, all heavy snapshot types expose count
  limits and per-op byte ceilings through `storageAudit`, the Device Sync panel
  shows current usage against those caps, and release evidence reports whether
  the sync smoke stayed within bounds.
- Shipped production-readiness key-handling audit for encrypted device sync.
  Regular sync status refreshes no longer return the pairing encryption key;
  the Device Sync panel keeps the invite hidden until the user explicitly
  reveals or copies it, and `keyAudit` reports local key presence plus synced
  settings exclusion without exposing raw secrets.
- Shipped append-only log compaction / retention controls for long-lived sync
  groups. Writer devices can append an encrypted compacted-state checkpoint,
  paired devices reset from that checkpoint and prune old local view entries,
  `retentionAudit` reports retained/checkpointed operations, and release
  evidence now includes retention compaction from the live sync smoke.
- Remaining: no planned Track 3 v1 gaps; future work should focus on product
  polish, recovery backup UX, and real-world multi-device soak testing.

## Track 4: Publisher And App Developer Diagnostics

User outcome: PearBrowser becomes the workshop for shipping P2P apps/sites.

Deliverables:

1. "Ship check" command and UI.
   - Validate manifest, icon, launch mode, bundle size, relay availability,
     pinned length, required files, Pear app compatibility, and third-party
     trust warnings.

2. Site publish report.
   - Durable relay evidence, public URL, unseed capability state, storage size,
     and recovery instructions.

3. App compatibility report.
   - Standalone vs hypersite detection, pear-request worker presence, manifest
     permissions, and catalogue row completeness.

Tests:

- Pure manifest/compatibility checks.
- Fresh-peer verifier script output mapping into the UI DTO.

Status:

- Shipped `CMD_SHIP_CHECK` and reusable report UI for Community app
  submissions and the Sites editor. Checks cover manifest completeness, icon
  sizing, launch mode, bundle size, relay/pin evidence, required site files,
  and raw script warnings.
- Shipped app compatibility diagnostics. App Ship Check now reports whether a
  pear:// app marked for in-tab launch has pear-request worker evidence, warns
  when a window-style bundle is mislabeled as hypersite, and treats static
  hyper:// apps as direct browser-tab apps that do not need a worker.
- Shipped fresh-peer verifier evidence mapping. Ship Check accepts
  `scripts/verify-app-full.js` result payloads, reports pass/warn states for
  sampled blob availability from a clean peer, and includes a ready-to-run
  verifier command when evidence is missing.
- Shipped one-click in-app fresh-peer verifier. Apps and Sites Ship Check
  reports can launch an isolated temporary Corestore/Hyperswarm verifier from
  the backend, feed the result back into Ship Check, and update the same
  pass/warn report without relying on packaged script spawning.
- Remaining: optional hardening to run the verifier in a separate OS process if
  Pear exposes a packaged-app-safe isolated process runner.

## Track 5: Better App Discovery Loops

User outcome: people can find, endorse, collect, and share apps naturally.

Deliverables:

1. Better source chips and catalogue provenance.
   - Curated, community, personal, collaborative, sheets, relay index, signed,
     unsigned, and fallback reason.

2. "Add to my catalog" everywhere.
   - Apps detail, search result, browsed site About panel, and publish result.

3. Endorsement/import flow.
   - Save a row from another catalogue into My Catalog with attribution and
     safe metadata editing.

4. Moderation status.
   - Pending/approved/rejected community submissions, with relay response
     reasons where available.

Status:

- Shipped v1 source chips and import attribution for Apps/My Catalog rows.
  Saving a row from another catalogue now stores bounded `importedFrom`
  provenance, app discovery search includes original catalogue fields, and the
  Apps detail modal can add a row directly to My Catalog.
- Shipped add-to-catalog actions for Library/Sites search results and the
  browsed-site About panel. These create My Catalog on first save and preserve
  search/About provenance.
- Shipped add-to-catalog from site publish results, preserving publish
  provenance and relay pin evidence on the saved My Catalog row.
- Shipped richer community submission state in end-user views. Pending,
  approved, and rejected rows now keep bounded moderation evidence, relay
  response text, submitted/reviewed timestamps, and reviewer labels through
  catalog normalization, My Catalog imports, source chips, search text, and the
  Trust Center summary.
- Shipped moderator queue polish. Relay pending rows now preserve bounded
  manifest-like metadata when the relay provides it, the in-app operator panel
  shows a compact manifest preview, approval forwards the preview manifest for
  catalogue promotion, and rejection includes an operator-entered reason.
- Remaining: no planned Track 5 v1 gaps; future polish depends on relays
  exposing richer signed submission manifests and reviewer audit logs.

## Performance Program

### Instrument First

Deliverables:

- Timestamped boot progress events.
- Fetch timing/source/cache telemetry from the proxy.
- Batched drive metadata RPC for app grids and trust surfaces.
- Status/diagnostics UI section for boot timeline and fetch mix.

Status:

- Shipped durable boot timeline capture in the backend status snapshot. Boot
  progress events are retained with elapsed/delta timing, coarse manager stages,
  proxy readiness, tab-runtime availability, and final ready state.
- Shipped Settings diagnostics for startup timeline, fetch mix, storage sampling
  age, and raw live status. Formatting helpers are split into
  `ui/lib/performance-diagnostics.js` with focused tests.

### Shorten Critical Startup

Deliverables:

- Lazy initialization plan for Nostr feed, name registry writes, app data
  indexing, device sync, moderation, and other rare surfaces.
- Boot timing budget per manager.

Status:

- Shipped startup deferral diagnostics. `CMD_GET_STATUS` now reports the lazy
  state for encrypted device sync, Nostr identity/feed, federated name
  resolution, app-data indexing/reindexing, and community moderation so rare
  surfaces remain visibly outside the critical boot path.
- Shipped startup budget diagnostics. The backend computes stage-level boot
  budget rows from the retained boot timeline, Settings shows target vs actual
  startup timing plus deferred-surface badges, and source-contract tests guard
  the lazy Nostr/app-data/device-sync/moderation boundaries.

### Batch Drive Metadata

Deliverables:

- `CMD_GET_DRIVE_INFOS` accepts multiple keys and returns per-key success/error
  entries.
- Apps grid switches from per-card polling to a single batched refresh.
- Viewport-aware polling so large catalogs only refresh live metadata for
  visible/near-visible app cards plus the open detail panel.

Status:

- Shipped batched drive metadata RPC and Apps grid batching. App cards consume
  one `CMD_GET_DRIVE_INFOS` refresh instead of each card running its own
  `CMD_GET_DRIVE_INFO` loop.
- Shipped viewport-aware Apps metadata polling. The catalog grid observes
  near-viewport cards and polls only those bundle keys, while preserving a
  non-observer fallback and always including the open detail app.

### Improve Content Streaming

Deliverables:

- True ranged reads for large Hyperdrive files where supported.
- Avoid buffering large media/app bundles into the normal memory cache.
- Preserve existing P2P-first relay privacy behavior.

Status:

- Shipped P2P byte-range streaming for non-HTML Hyperdrive assets, including
  206/416 handling, `Accept-Ranges`, `Content-Range`, and fetch telemetry.
- Shipped full-file P2P streaming for large non-HTML cache misses. Large media
  and bundle assets now use Hyperdrive `createReadStream()` instead of
  `drive.get()` buffering when the local P2P drive exposes stream metadata;
  smaller assets and unsupported drives keep the existing hybrid fallback.
- Shipped relay-side byte-range streaming passthrough. The relay client exposes
  a streaming fetch API for range-capable gateways, and the proxy falls back to
  relay streaming for non-HTML byte ranges when local P2P range streaming is
  unavailable while preserving HTML injection on buffered paths.
- Remaining: full-file relay streaming can expand later if gateway metadata
  exposes safe non-HTML size/type hints before response bodies are read.

### Avoid Full Storage Walks

Deliverables:

- Low-priority or incremental storage accounting.
- Expose "last sampled at" and "sampling" states in Settings.

Status:

- Shipped low-priority incremental storage sampling. Storage usage now walks the
  storage directory iteratively, yields between bounded chunks, and no longer
  starts a filesystem scan on the critical boot path; the first sample is queued
  after READY and periodic quota checks reuse the shared sampler.
- Shipped storage sampling progress diagnostics. Backend status exposes
  `storageSampleProgress` with scanned file/folder counts, bytes seen, pause
  count, and running/complete/error state; Settings renders the low-priority
  scan progress alongside last-sampled age and errors.

### Split The Frontend Monolith

Deliverables:

- Extract shared search widgets, trust widgets, Apps, Browse, Sites, Settings,
  and consent modals into focused modules.
- Keep behavior stable with pure helper tests before moving large components.

Status:

- Shipped the first component extraction: the encrypted Device Sync settings
  surface now lives in `ui/components/device-sync.js`, with `ui/shell.js`
  retaining only the Settings composition hook-up.
- Shipped shared trust/discovery widget extraction:
  `ui/components/trust-widgets.js` now owns Trust Center badges, the app trust
  detail panel, site trust badges, and catalog source chips.
- Shipped search display extraction: `ui/components/search-results.js` now owns
  decentralized-search result explanations, result badges, run-provenance
  badges, result URL derivation, and search-result catalog-entry conversion.
- Shipped stateful federated-search extraction:
  `ui/components/federated-search.js` now owns the reusable P2P search
  container used by the Sites surface, keeping peer-search event correlation,
  catalog save actions, and provenance badges outside the shell monolith.
- Shipped stateful Library extraction: `ui/components/library.js` now owns the
  Library search/bookmarks/history surface plus trusted-peer invite management,
  keeping local search state, federated event handling, and contact invite UI
  outside the shell monolith.
- Shipped consent/onboarding modal extraction:
  `ui/components/consent-modals.js` now owns login consent, swarm-topic
  consent, first-launch onboarding, and the shared login scope labels consumed
  by Settings permission views.
- Shipped stateful Settings extraction:
  `ui/components/settings.js` now owns profile, permission center, relays,
  Nostr identity/feed, name registry, diagnostics, experimental flags, and
  device-sync settings. The shell passes the live Browse tab snapshot into
  Settings so encrypted device sync can publish/open tab state without reaching
  across component scope.
- Shipped stateful Sites extraction:
  `ui/components/sites.js` now owns P2P site search/discovery, the block editor,
  publishing, ship checks, relay pin evidence, and My Catalog sharing for
  published sites. Shared app-card primitives were also lifted into
  `ui/components/app-icon.js`, `ui/components/permission-evidence.js`, and
  `ui/lib/catalog-apps.js` so Apps and Sites use the same icon, grant-evidence,
  search, and dedupe rules.
- Shipped stateful Browse extraction:
  `ui/components/browse.js` now owns the multi-tab browser surface, URL bar,
  name resolution, autocomplete, About-this-site panel, in-page hyper:// link
  routing, page indexing, and keyboard shortcuts. The App frame still owns the
  persisted tab/session state and passes the default landing URL explicitly.
- Shipped stateful Apps extraction:
  `ui/components/apps.js` now owns Featured apps, Pear-link launch, catalog
  loading/facets, My Catalog editing, installed app actions, community
  submissions, collaborative catalog controls, moderator tools, app trust
  details, and viewport-aware drive metadata polling. `ui/shell.js` is now the
  application frame for tabs, boot/status events, Browse session persistence,
  and consent/onboarding modals.
- Shipped catalog action extraction: `ui/components/catalog-actions.js` now
  owns the My Catalog writer hook, add-to-catalog button, and catalog target
  matching helper used by About-site, Apps, Search, and Sites publish flows.
- Shipped publisher diagnostics report extraction:
  `ui/components/ship-check-report.js` now owns the reusable Ship Check results
  surface used by app submissions and site publishing.
- Remaining: consider a smaller follow-up split inside `ui/components/apps.js`
  if future app-discovery work makes the catalog, submission, or moderation
  panels grow independently.

## Rollout Order

1. Foundation: timestamped boot events, batched drive metadata, shared search
   explanation helpers, and this ship plan.
2. Search UX: row explanations and run summary.
3. Trust Center v1: app/site modal backed by existing drive/catalog/grant data.
4. App discovery loops: source chips and add-to-my-catalog flows.
5. Publisher diagnostics: ship check command and UI.
6. Device sync graduation: expand ops and pairing/recovery UX.
7. Deeper performance: startup deferral, streaming reads, and storage sampling.
8. Frontend split: extract modules once shared widgets are stable.

## Completion Evidence

The overall program is complete only when each track has:

- a source-backed spec or DTO contract;
- user-facing UI wired into the relevant surfaces;
- backend behavior covered by focused tests;
- UI helper/component behavior covered where practical;
- release/manual smoke checklist entries where live network or third-party app
  execution is required;
- no degraded security boundary compared with the current docs.
