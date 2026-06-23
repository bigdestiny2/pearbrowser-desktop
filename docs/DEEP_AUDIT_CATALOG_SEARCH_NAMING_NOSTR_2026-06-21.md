# Deep Audit: Catalogue, Search, Naming, and Nostr Bridge

Date: 2026-06-21

This pass reviewed the four discovery surfaces that have to agree with each other:

- Catalogue: where app records enter the browser.
- Search: how signed/resource rows become ranked navigable results.
- Naming: how human labels resolve to app targets.
- Nostr bridge: how Pear identity and Nostr identity/event stores are cross-attested.

Overall state: the system has the right shape. The strongest parts are the clear separation between local-first data, signed identity bindings, deterministic reducers, and trust-gated federation. The main quality gap was consistency at the boundaries: link-only apps, stale advertised metadata, and duplicate normalization rules across catalogue/search/naming.

## Fixes Landed In This Pass

### P1 - Nostr unlinks could leave stale published trust metadata

Before this pass, a local Nostr revoke removed the local binding but did not immediately refresh the advertised Pear identity binding. A contact could keep resolving the last advertised `nostrBind` until some unrelated future publish happened.

Fixed:

- `backend/index.js:1606` now republishes identity metadata after `CMD_NOSTR_REVOKE`.
- `backend/index.js:2125` initializes `NostrBindingStore` before `IdentityBindingPublisher`, so boot-time DHT advertisements include an existing linked Nostr binding.
- `backend/identity-binding-publisher.js:196` publishes wrapper metadata with a DHT-specific sequence, not the search-key binding version.

Why it matters: Nostr trust is revocation-sensitive. A local unlink must make contacts stop trusting old Nostr authorship as soon as the next binding fetch happens.

### P1 - DHT binding sequence reused the wrong version concept

The DHT mutable record contains more than the search binding: digest, name registry key, Nostr event key, and Nostr bind metadata. The old sequence strategy tied DHT writes to the search binding version, so metadata-only refreshes could fail or appear stale.

Fixed:

- `backend/identity-binding-publisher.js:29` adds `bindingDhtSeq`.
- `backend/identity-binding-publisher.js:191` uses a wrapper-level sequence for every DHT metadata publish.
- Tests now prove metadata can refresh while the search binding version remains stable.

Why it matters: search-key rotation and metadata freshness are different clocks. Keeping them separate prevents subtle DHT overwrite/staleness bugs.

### P1 - Collaborative catalogue accepted weak app targets

Collaborative Autobee catalogues could preserve malformed drive keys or unsafe app links into the op log path. The reducer was deterministic, but the app target boundary was too loose.

Fixed:

- `backend/autobee-catalog-ops.cjs:24` defines strict 64-hex drive keys and an app-link allowlist.
- `backend/autobee-catalog-ops.cjs:51` sanitizes app records before constructing ops.
- `backend/autobee-catalog-ops.cjs:101` rejects missing targets, bad drive keys, bad links, oversized ops, and prototype pollution.
- `backend/autobee-catalog-manager.cjs:77` validates before append and returns clear errors.
- `ui/shell.js:1396` validates the collaborative add form before sending the backend request.

Why it matters: collaborative catalogues are replicated input. Bad targets should be rejected before append, not merely ignored later.

### P2 - Link-only apps were not consistently navigable from search

Search descriptor rows could carry `pear://` links, but parts of the UI rebuilt every result as `hyper://<driveKey>`. That broke link-only results and made catalogue/search disagree.

Fixed:

- `backend/search-federation.cjs:113` preserves descriptor `link`.
- `ui/shell.js:2502` and `ui/shell.js:4094` prefer `link`, then already-schemed `driveKey`, then synthesize `hyper://`.
- `backend/app-manager.js:23` now gives a clear error if install is attempted without a valid Hyperdrive key.

Why it matters: the catalogue now treats `driveKey` apps and first-class `pear://` or `file://` links as distinct valid targets, while install remains honest that only Hyperdrive-backed apps can be installed.

### P2 - Petnames accepted arbitrary link schemes

Petnames are a high-trust local shortcut. Allowing arbitrary schemes made it too easy to store surprising targets.

Fixed:

- `backend/names.cjs:17` now allows only `hyper://`, `pear://`, and `file://`.
- Tests reject a `javascript:` petname link.

Why it matters: naming should be permissive enough for Pear-native app links, but not a generic URL launcher for unsafe schemes.

### P2 - Hyper refs in catalogue forms needed one normal extraction path

Collaborative catalogue app entry needed to accept bare 64-hex keys, z32 keys, and `hyper://<key>/path`, while rejecting non-Hyperdrive app links unless they are explicitly link apps.

Fixed:

- `ui/lib/keys.js:132` adds `driveKeyFromHyperRef`.
- `ui/shell.js:1399` uses it in the collaborative catalogue add form.

Why it matters: users can paste common Hyper refs without accidentally creating malformed catalogue rows.

## What Is Working Well

### Catalogue

- The catalogue manager already supports several source types: Hyperdrive JSON, Hyperbee, Autobee, schema-sheets, and relay index room.
- The Autobee reducer is deterministic and has a good pure validation/reducer split.
- Browser-side catalogue dedupe in `ui/shell.js:1502` correctly thinks in stable app identity terms: `driveKey`, then `link`, then `id`.

### Search

- Search uses signed rows, trust graph tiers, deterministic merge/rank, and bounded fan-out.
- `search-handler` now clamps input size and limits.
- `resourceRowToCandidate` now retains `link`, so search can represent non-Hyperdrive app targets.

### Naming

- Local petnames, own registry, federated contacts, and curated aliases are layered in the right authority order.
- Federated names intentionally surface candidate count rather than pretending there is one global namespace.
- Homograph normalization and registry ownership checks are already present.

### Nostr Bridge

- The cross-curve binding model is sound: Pear root identity anchors the Nostr pubkey, and Nostr events are accepted only after binding verification.
- The bridge is local-first and trust-gated by Pear contacts, which is the right default for this browser.
- Boot ordering and revoke advertisement are now aligned with the trust model.

## Current Implementation Baseline

Since the first audit, the code has closed several of the originally identified contract gaps:

- Catalogue rows now pass through shared safety helpers in `backend/catalog-safety.cjs`, and `CatalogManager.getAggregatedApps()` uses stable app identity rather than id-only dedupe.
- My Catalog writes accept valid drive-backed apps plus safe `hyper://`, `pear://`, and `file://` link-only apps, while rejecting targetless rows.
- Renderer harness coverage now proves a link-only My Catalog app can be added, duplicate-suppressed by link, and launched through its `pear://` link.
- Catalogue search now uses one richer metadata text builder in both backend and renderer paths.
- Name registry claim/rotate accepts the same safe target universe as petnames and catalogues: 64-hex drive keys plus `hyper://`, `pear://`, and `file://` links.
- Federated Nostr feed resolution consumes advertised remote revocation records before admitting a contact author's Nostr events.

## Remaining Improvement Opportunities

### 1. Collapse catalogue DTO normalization further upstream

Current issue: shared catalogue normalization is in place at the manager/safety boundary, but individual source loaders still do source-specific mapping before they reach the canonical DTO. Hyperdrive JSON, Hyperbee rows, Autobee rows, schema-sheets rows, relay index rows, seed data, and personal-catalog edits should all be treated as adapters into the same final app DTO.

Recommended improvement:

- Make `normalizeCatalogApp` the only exported path for app row shape decisions.
- Keep source adapters very thin: source read -> raw object -> canonical DTO.
- Add source-name/source-key tags after validation, not before.
- Preserve UI dedupe as a defensive final pass, but keep backend aggregate policy authoritative.

Expected impact: fewer future key/link mismatches and easier source-specific tests.

### 2. Add live source-adapter coverage for link-only catalog entries

Current issue: backend, source-level tests, and the deterministic renderer harness now cover safe link-only personal-catalog entries. The remaining proof gap is live/source-adapter breadth: every catalog source should demonstrate that link-only rows enter the aggregate as the same canonical DTO shape.

Recommended improvement:

- Add source-specific fixtures for Hyperdrive JSON, Hyperbee, Autobee, schema-sheets, and relay index rows that contain safe link-only apps.
- Verify each source produces the same canonical fields and stable identity.
- Keep the renderer harness as the user-facing regression for My Catalog behavior.

Expected impact: source adapters cannot drift back into subtly different target rules.

### 3. Make digest-first federated search visible and measurable

Current issue: search ranking and verification are strong, and publisher metadata includes compact digests, but the product still needs clearer query-time evidence of whether peer selection used digest gating or a wider fallback.

Recommended improvement:

- Cache peer digests before query fan-out where practical.
- Carry `digestHit`, `fallbackPull`, `verifyBudgetExhausted`, and `partial` flags through the search response.
- Surface partial/fallback provenance when a query had to pull peers without digest gating.

Expected impact: less bandwidth, lower latency, and clearer search trust diagnostics.

### 4. Add search result provenance beyond source chips

Current issue: results have trust tiers, signatures, and deterministic ranking, but the UI still does not explain why a result won: matched fields, signer tier, row source, digest status, or budget exhaustion.

Recommended improvement:

- Carry snippet/provenance fields from candidate creation through ranking.
- Show compact chips such as `title match`, `trusted contact`, `relay-listed`, `author-signed`, `digest hit`, and `partial`.
- Keep the detailed verification trail available in an expandable inspector.

Expected impact: search becomes more legible and auditable, especially once federated results are common.

### 5. Surface naming ambiguity in the URL bar

Current issue: the backend returns `candidates` for federated name resolution, but the UI mainly shows source/provenance. A user typing a common name should know if multiple trusted contacts map it differently.

Recommended improvement:

- If `candidates > 1`, show an ambiguity chip or chooser.
- Allow expanding to see each contact's target.
- Keep deterministic lowest-pubkey winner as the default for replica stability.

Expected impact: users understand contact-scoped naming rather than mistaking it for global DNS.

### 6. Expose Nostr quarantine and author-state diagnostics

Current issue: the ingest layer partitions accepted, quarantined, and dropped events with `linked`, `revoked`, `stale`, and `unverified` author state, but the visible feed only shows accepted events. That is safe, but opaque.

Recommended improvement:

- Add a collapsed "hidden contact notes" view for quarantined events.
- Show why a note is hidden: unverified author, stale binding, revoked binding, future-dated event, or failed signature.
- Keep public relay events out of the trusted feed unless they pass the same binding verification.

Expected impact: the Nostr bridge remains fail-closed while users can understand why expected contact notes are absent.

### 7. Decide whether the Nostr bridge should support legacy public relays

Current state: this is a Pear-native, contact-trusted Nostr event bridge. It is not yet a public `wss://` relay bridge.

Recommended improvement:

- Keep public relay ingress/egress off by default.
- If enabled, use a quarantined relay pool with circuit breakers and explicit provenance.
- Never merge public relay events into trusted contact feeds without binding verification.

Expected impact: the bridge can interoperate with wider Nostr without weakening the browser's trust model.

## Recommended Next Implementation Order

1. Tighten source adapters so all catalogue source formats enter one canonical DTO path earlier.
2. Wire digest cache/provenance through federated search and show result-level explanation chips.
3. Add naming ambiguity UI for contact-derived names.
4. Add Nostr quarantine/revocation/stale diagnostics to the feed UI.
5. Treat public `wss://` relay support as an explicit opt-in feature after the Pear-native bridge is solid.

## Verification

Focused verification after the fixes:

- `node --test test/keys.test.js test/names.test.js test/autobee-catalog.test.js test/identity-binding-publisher.test.js test/search-federation.test.js`
- Result: 45 passed, 0 failed.

Full suite verification was also run during this review pass and later expanded as more tests landed:

- Desktop `npm test` in `pearbrowser-desktop`: then-current pass was 384 passed, 0 failed; later addenda supersede this count.
- Mobile/outer `npm test` in `PearBrowser`: then-current pass was 102 passed, 0 failed; later addenda supersede this count.

## Addendum: Deeper Pass On 2026-06-22

This follow-up pass went back through the same four surfaces with a stricter question: which supported capabilities are still unreachable, misleading, stale, or weakly validated at the UI/product boundary?

### Additional Fixes Landed

#### P2 - schema-sheets and relay index catalogs were backend-only

The backend had mature loaders for schema-sheets catalogs (`CMD_SHEETS_LOAD`) and relay index rooms (`CMD_LOAD_CATALOG_INDEX`), but the Apps tab parser and command mirror only exposed Hyperdrive, Hyperbee, and Autobee references.

Fixed:

- `ui/boot.js` now mirrors `CMD_SHEETS_LOAD` and `CMD_LOAD_CATALOG_INDEX`.
- `ui/lib/keys.js` parses `sheets://` and `hiveindex://`, including recent-catalog cache key matching.
- `ui/shell.js` routes key-based catalog loaders with `{ keyHex }` and link-based loaders with `{ link }`.
- The Apps catalog input now advertises `sheets://` and `hiveindex://`.

Why it matters: the catalog system already had the right multi-source architecture, but two source types were effectively hidden from users and could not persist/reload correctly from the primary UI.

#### P3 - About-site metadata showed `Invalid Date`

The About panel rendered `Updated ${new Date(driveInfo.updatedAt)}` even when harness/live drive metadata lacked `updatedAt`.

Fixed:

- `ui/shell.js` now omits the timestamp unless `updatedAt` is finite and positive.
- The fetch-mode footer remains visible.

Why it matters: this was a small UX defect, but it undermined trust in the technical details panel.

#### P3 - Hyperbee manifest validation drifted after empty catalogs were allowed

Allowing `apps: []` for new community catalogs was reasonable, but the same change also allowed missing or non-array `apps` to silently normalize as empty.

Fixed:

- `scripts/lib/catalog-bee.js` now requires `apps` to be an explicit array.
- `test/catalog-bee.test.js` documents that `apps: []` is allowed while missing/non-array `apps` is rejected.

Why it matters: empty catalogs should be intentional; malformed manifests should not become valid catalog bees by accident.

### Deeper Findings

Catalogue is now better connected end to end. The remaining high-value cleanup is to make each source loader a thinner adapter into the existing canonical DTO helper, so Hyperdrive JSON, Hyperbee, Autobee, schema-sheets, relay index rows, seed data, and personal-catalog edits all share one target/metadata policy.

Search remains strong at the trust/ranking layer. The next practical improvement is product legibility: preserve and show match/provenance details so a user can tell why a local or federated result ranked, whether it came from a trusted contact, and whether verification or digest completeness was partial.

Naming has good authority layering, homograph defenses, and target parity with catalogues: registry claims can now point at drive keys or safe app links. The next improvement is UX clarity around federated ambiguity when multiple trusted contacts claim the same name.

Nostr bridge is sound as a Pear-native trusted-contact feed, not a public relay bridge. Remote revocation records now flow through `federated-nostr-feed`; the next improvement is operational transparency: expose quarantine/revocation/stale state in the UI instead of silently hiding non-admitted contact notes.

### Verification Added

- `node --test test/catalog-bee.test.js test/keys.test.js test/constants-mirror.test.js`: 22 passed, 0 failed.
- Desktop `npm test` in `pearbrowser-desktop`: then-current pass was 384 passed, 0 failed; later addenda supersede this count.
- Renderer harness retest: About footer no longer contained `Invalid Date`; Apps catalog input advertised `sheets://` and `hiveindex://`.

## Addendum: Discovery-Surface Retest On 2026-06-22

This pass went one level deeper on the boundary between source contracts and visible product behavior.

### Additional Fixes Landed

#### P2 - Catalog target normalization still accepted unsafe targets

The shared catalog normalizer centralized metadata shape, but still preserved arbitrary `driveKey` strings, arbitrary link schemes, and targetless id-only rows. That meant malformed catalog rows could still reach aggregate/catalog search/UI consumers and only fail later.

Fixed:

- `backend/catalog-safety.cjs` now keeps only valid 64-hex/z32/`hyper://` drive keys.
- Catalog app links are limited to `hyper://`, `pear://`, and `file://`.
- Targetless rows are dropped before aggregation.
- `test/catalog-manager-safety.test.js` covers unsafe drive keys, unsafe schemes, targetless rows, allowed Pear links, and `hyper://` link key extraction.
- `test/catalog-bee.test.js` now uses real 64-hex fixture drive keys, so the publisher path cannot hide fake keys.

Why it matters: catalogue, search, and naming now agree on the safe target universe instead of relying on downstream launch/install guards.

#### P3 - Harness name and Nostr contracts drifted from the real backend

The UI harness did not return `created: true` for the name registry status, so the name list/release/revoke path was not visible. Its Nostr mock also returned only `linked: false` on revoke, while the real state model has explicit `status: "revoked"`.

Fixed:

- The harness now mirrors the real name registry status shape and statefully mutates name rows on claim/release/revoke.
- The harness now returns explicit `linked` and `revoked` Nostr statuses so the renderer exercises the real status UI.

Why it matters: the renderer audit now tests the actual product contracts rather than a weaker mock.

### Renderer Evidence Added

- Apps: source chip unload reached the no-catalog empty state.
- Apps: Pear Calc detail modal install refreshed the Installed section.
- My Catalog: empty startup created a default personal catalog with share-key controls.
- Library search: local search returned a navigable indexed result; trusted-peer search showed `trusted · hop 1` provenance.
- Names: a listed `pearname://demo` row exposed Release/Revoke; each action refreshed to the empty-list state.
- Nostr: identity moved `linked (attested) · epoch 1` → `revoked · epoch 2` → `linked (attested) · epoch 2`.

### Verification Added

- `node --test test/catalog-manager-safety.test.js test/catalog-bee.test.js test/keys.test.js test/names.test.js test/name-registry.test.js test/federated-name-resolver.test.js test/search-federation.test.js test/nostr-bind.test.js test/nostr-ingest.test.js test/nostr-binding-store.test.js`: 88 passed, 0 failed.
- Desktop `npm test` in `pearbrowser-desktop`: 379 passed, 0 failed.
- Renderer harness discovery-surface retest: catalogue unload, install, My Catalog creation, local/federated search, name release/revoke, and Nostr link/revoke/relink all passed.

## Addendum: Relay And Login Bridge Retest On 2026-06-22

This pass chased two remaining boundary gaps that sit next to the requested surfaces: relay capability discovery and the `window.pear.login` bridge consent UI.

### Additional Fix Landed

#### P3 - Relay capability transport pills were too strict

The Settings relay UI already fetched `/.well-known/hiverelay.json` and showed version/region, but transport pills only rendered when the document used `supported_transports`. A shorthand `transports` array rendered no transport pills even though the data was present.

Fixed:

- `ui/shell.js` now prefers `supported_transports` and falls back to `transports`.
- The UI keeps the existing timeout and failure behavior unchanged.
- The renderer harness now mocks a transports-shaped relay capability document so the fallback stays tested.

Why it matters: relay discovery is an operator/user diagnostic surface; hiding advertised transports makes a healthy relay look less capable than it is.

### Renderer Evidence Added

- Relays: mocked capability doc rendered relay URL, `v1.2.3`, `local-test`, `hyperswarm`, and `dht-relay-ws`.
- Login bridge: mocked `EVT_LOGIN_REQUEST` opened the real consent modal with app name, requested profile/contact scopes, existing-grant context, and closed cleanly on Sign in.
- Fresh Browser log filtering showed zero current warning/error logs for the relay/login pass.

### Verification Added

- Renderer harness relay/login bridge retest: passed.
- Desktop `npm test` in `pearbrowser-desktop`: 379 passed, 0 failed.

## Addendum: Mobile Source Inventory Correction On 2026-06-22

The canonical feature tracker was rechecked from the workspace root, not only from `pearbrowser-desktop`.

### Correction

The tracker generator had force-marked all Mobile rows as source-missing because it only considered the desktop checkout. The sibling `../PearBrowser` source tree is present and includes:

- React Native screens under `PearBrowser/app/screens`.
- Shared mobile backend and bridge code under `PearBrowser/backend` and `PearBrowser/app/lib`.
- iOS-native SwiftUI screens under `PearBrowser/ios-native`.
- Android-native Compose screens under `PearBrowser/android-native`.
- Mobile/outer tests under `PearBrowser/test`.

Fixed:

- Removed the blanket Mobile source-missing override in the tracker generator.
- Updated mobile coverage evidence from `96/96` to the current `102/102` `PearBrowser npm test` pass.
- Kept simulator/device UI gaps explicit as pending runtime/UI work instead of falsely blocking them as absent source.

### Verification Added

- `npm test` in sibling `PearBrowser`: 102 passed, 0 failed.

## Addendum: Deeper Catalogue/Search/Naming/Nostr Review On 2026-06-22

This follow-up pass reviewed the four requested surfaces for product coherence, not only protocol correctness. The main theme: the cryptographic/trust layers were strong, but a few UI and DTO boundaries were still narrower or looser than the rest of the system.

### Fixes Landed

#### P2 - Personal catalog could not save valid link-only apps

The catalogue model supports drive-backed apps and safe app links (`pear://`, `file://`, plus `hyper://` drive links), and collaborative Autobee catalogs already accepted link-only entries. The older personal-catalog writer still required `driveKey`, so a valid Pear app visible in the Apps grid could fail when added to My Catalog.

Fixed:

- Added `sanitizePersonalCatalogEntry()` to the pure `backend/catalog-safety.cjs` module.
- Personal catalog writes now accept valid drive/hyper/pear/file targets and reject targetless rows.
- My Catalog duplicate checks compare id, drive key, and link, so link-only rows do not expose stale `+ Catalog` actions.
- Added regression coverage without importing Bare-only runtime modules into Node tests.
- Added renderer harness coverage for a unique link-only app, including `+ Catalog`, duplicate suppression by link, and `pear://` launch.

#### P3 - Catalogue search did not search the metadata users see

Backend catalogue search matched only name/description. The Apps page matched name/description/author. Neither searched categories, catalogue name, source type, id, version, verification, link, or drive key, even though those are shown or used as facets.

Fixed:

- Added shared `catalogAppSearchText()` in `backend/catalog-safety.cjs`.
- Renderer Apps filtering now mirrors the same metadata field set.
- Search placeholder now reflects category/catalog search.
- Tests cover category, catalogue-name, version, and author matches.

#### P3 - URL-bar naming prefilter was ASCII-only

The backend name normalizer and registry tests already support Unicode normalization, homograph skeletons, and fullwidth/case variants. The URL bar’s cheap `looksLikeName()` prefilter only accepted ASCII tokens, so a valid non-ASCII name could be claimed but not typed directly into Browse.

Fixed:

- `ui/lib/keys.js` now NFKC-normalizes the prefilter and accepts Unicode letter/number tokens.
- It still rejects schemes, domains, paths, spaces, and 64-hex/z32 drive keys.
- Tests cover Cyrillic and fullwidth tokens plus the existing rejection cases.

#### P3 - Nostr feed UX did not mirror backend caps/recovery

The backend already enforces Nostr event content/tag/serialized-size caps. The composer did not mirror the 64KB content cap, so a user could type or paste too much and only learn after submit. Successful Nostr identity/feed reloads also did not clear stale error text.

Fixed:

- Nostr note textarea now uses the backend content cap as `maxLength`.
- Nostr identity/feed reloads clear stale errors after success.
- Protocol validation remains backend-owned.

### Remaining Improvement Backlog

- Catalogue: continue tightening source adapters so every catalog format maps link-only rows through the same canonical DTO path.
- Search: the signed/federated search core is solid; the next useful product improvement is result explanations: matched terms, source tier, whether verification budget was exhausted, and whether completeness/digest checks were partial.
- Naming: the trust model is strong, but provenance could be more visible at point of use for contact-derived names, especially when multiple trusted contacts claim the same name.
- Nostr: this remains a Pear-native trusted-contact feed, not a public `wss://` relay client. The next UX step is showing quarantined/revoked/stale contact events separately so users understand why a contact note is hidden.

### Verification Added

- Focused suite: `node --test test/catalog-manager-safety.test.js test/catalog-bee.test.js test/keys.test.js test/names.test.js test/name-registry.test.js test/federated-name-resolver.test.js test/resolve-name.test.js test/search-federation.test.js test/cmd-search-contract.test.js test/nostr-bind.test.js test/nostr-ingest.test.js test/nostr-binding-store.test.js test/nostr-query.test.js`: 109 passed, 0 failed.
- Desktop `npm test` in `pearbrowser-desktop`: 384 passed, 0 failed.
- Renderer harness link-only My Catalog retest: `autoLinkOnlyCatalog` recorded `hasAddButton=true`, `duplicate-suppressed` with `saved=true`, and `launched-link pear://link-only-harness-app`.

## Addendum: Second Deepening On Catalogue, Search, Naming, And Nostr On 2026-06-22

This pass looked for weaker seams between the already-tested desktop implementation and the sibling mobile/native implementation, plus places where correct backend behavior was still opaque to users.

### Additional Fixes Landed

#### P2 - Mobile catalogue normalization lagged desktop safety

Desktop catalogue rows were already flowing through a stricter safe-target model, but the React Native/mobile backend path still accepted unsafe or targetless catalog rows. Explore could render a row that had no launchable target, and link-only Pear apps did not preserve their target cleanly through the mobile visit path.

Fixed:

- `PearBrowser/backend/catalog-manager.js` now normalizes catalog apps with the same core target rules: valid 64-hex or z32 drive keys, safe `hyper://`, `pear://`, and `file://` links, and no targetless rows.
- Mobile catalogue search now uses normalized visible metadata, including name, description, author, id, version, category, source/catalog, verification, link, and drive key.
- `PearBrowser/app/screens/ExploreScreen.tsx` filters unsafe rows before render and preserves safe link-only rows.
- `PearBrowser/app/App.tsx` launches safe `hyper://`, `pear://`, and `file://` targets directly instead of wrapping every non-http value as `hyper://`.

Why it matters: the catalogue is a trust boundary and a launch surface. Desktop and mobile should agree on what is a real, safe, launchable app.

#### P3 - Federated search did not explain source quality

The planner could verify and merge signed peer results, but the UI did not say whether a result batch came from digest-positive peers, fallback pulls, a partial verification budget, or an exhausted verification budget. The planner also had an inefficient fallback path that could spend fetch budget on peers whose digest already proved they did not match the query.

Fixed:

- `backend/query-planner.js` now prefers digest-hit peers, skips known digest misses, and fallback-pulls only peers with unknown or missing digest state.
- Federated search results now carry `digestHit`, `fallbackPull`, `partial`, and structured `provenance` fields.
- `backend/search-handler.js` forwards the provenance fields through `EVT_SEARCH_FEDERATED`.
- `ui/shell.js` renders compact provenance chips beside the trusted-peer search controls in Library and P2P Sites.

Why it matters: federated search can now be evaluated by the user and by tests as "complete enough", "fallback-derived", or "verification-budget-limited" instead of a single opaque result list.

### Rechecked Naming And Nostr

- Naming remains structurally strong: the registry path normalizes names, uses homograph skeletons, supports release/revoke, and resolves trusted contact claims. The remaining improvement is UX visibility when more than one trusted contact claims the same name.
- Nostr remains a Pear-native trusted-contact bridge rather than a public relay client. The backend already binds Nostr pubkeys to Pear contacts and honors revocation. The remaining improvement is a separate hidden/quarantined event view so users can understand why revoked, stale, or untrusted contact notes are absent from the feed.

### Verification Added

- Desktop focused search provenance tests: `node --test test/query-planner.test.js test/cmd-search-contract.test.js`: 16 passed, 0 failed.
- Desktop full suite: `npm test` in `pearbrowser-desktop`: 396 passed, 0 failed.
- Mobile focused catalogue tests: `node --test test/catalog-normalizer.test.js test/mobile-screen-harness.test.js` in `PearBrowser`: 21 passed, 0 failed.
- Mobile full suite: `npm test` in `PearBrowser`: 117 passed, 0 failed.

### Remaining Backlog

- Catalogue: native Explore link-only parity is now closed by the following addendum; live signed-catalog replication and physical device tap-through remain runtime QA.
- Search: add term-level explanations in each result row, not only batch-level provenance chips.
- Naming: surface ambiguity and candidate provenance more clearly at point of navigation.
- Nostr: add a user-visible quarantine/hidden-events panel and keep public relay support opt-in only.

## Addendum: Native Catalogue And Mobile Consent Retest On 2026-06-22

This pass closed the main gap left by the second deepening: native mobile screens now use the same safe catalogue target model as desktop and React Native, and the permission/consent rows have stronger proof than source review alone.

### Additional Fixes Landed

#### P2 - Native Explore still treated catalog rows as drive-key-only

React Native Explore could now preserve safe link-only `pear://` and `file://` app rows, but iOS SwiftUI and Android Compose Explore still assumed every launchable card needed a drive key. That meant the same catalogue could behave differently depending on platform.

Fixed:

- iOS `ExploreScreen.swift` now carries optional `driveKey` and `link` targets.
- Android `ExploreScreen.kt` now carries optional `driveKey` and `link` targets.
- Both native paths normalize safe `hyper://`, `pear://`, and `file://` links, derive drive keys from `hyper://` links, and reject rows without a safe target.
- Added cross-platform source-contract tests so RN, iOS, and Android Explore cannot drift silently again.

#### P3 - Root mobile consent flows needed click-level proof

The backend login/swarm grant logic was already tested, but the root React Native `App.tsx` modal wiring had not been exercised with injected events.

Fixed:

- Added a VM-based App harness that injects `EVT_LOGIN_REQUEST` and verifies both Deny and Allow resolutions.
- Added equivalent coverage for `EVT_SWARM_REQUEST`, including topic/protocol context and `swarmResolve` decisions.

#### P3 - Native permission/privacy rows needed explicit source contracts

Connected Apps and Trusted Sites existed in native source, but the tracker still leaned too heavily on backend parity and runtime notes.

Fixed:

- iOS Connected Apps tests now assert sign-in grants, swarm grants, individual revoke, revoke-all, and routing from Settings/MainView.
- iOS Trusted Sites tests now assert mode/list/add/remove helpers, HTTPS prompt behavior, Browse trust-current-origin wiring, and shared RPC helpers.

#### P3 - iOS native profile editing was only implicitly tracked

The iOS native app has a real Settings route for editing profile fields that later flow through `pear.login` profile scopes. The tracker previously covered desktop profile editing and broad iOS parity, but did not give this mobile profile surface its own story or focused proof.

Fixed:

- Added explicit story `US-098` for iOS native profile editing.
- Added source-contract coverage for `PROFILE_GET`, `PROFILE_UPDATE`, and `PROFILE_CLEAR` command IDs.
- Verified `SettingsScreen` routes to `ProfileEditScreen` through `MainView`.
- Verified visible profile fields and opt-in sharing copy for `profile:name`, `profile:contact`, and `profile:read`.

### Current Assessment

- Catalogue: desktop, React Native, iOS, and Android now agree on safe catalogue targets and link-only app preservation. Remaining work is live signed-catalog replication and physical device tap-through, not model parity.
- Search: federated search now exposes digest/fallback/partial provenance. The next improvement is term-level match explanations inside result rows.
- Naming: backend normalization, homograph checks, claim/release/revoke, and URL-bar Unicode prefilter are coherent. The next improvement is clearer UX for ambiguous trusted-contact claims.
- Nostr: the Pear-native trusted-contact bridge remains correct and bounded. The next improvement is a visible hidden/quarantined events panel for revoked, stale, or untrusted contact notes.

### Verification Added

- Mobile focused consent/native/catalog/privacy suite: 31 passed, 0 failed.
- Mobile connected-apps/profile focused suite: 6 passed, 0 failed.
- Desktop mobile source-contract suite: 6 passed, 0 failed.
- Full `PearBrowser npm test`: 124 passed, 0 failed.
- Full desktop `npm test`: 397 passed, 0 failed.
- iOS simulator Debug build: `BUILD SUCCEEDED`.
- Android native Kotlin compile: `BUILD SUCCESSFUL`.

## Addendum: Command Surface And Nostr Diagnostics Deepening On 2026-06-22

This pass went below feature behavior and checked the declared command/API surface against actual backend handlers and UI mirrors. The main finding was not a broken user journey, but drift risk: a renderer command should never exist without a backend handler, and declared catalogue/search APIs should be callable and test-guarded.

### Additional Fixes Landed

#### P2 - Renderer command surface could drift from backend handlers

`ui/boot.js` mirrored `CMD_SEARCH_FEDERATED` and `CMD_LOAD_TEMPLATE`, but `backend/index.js` did not handle those commands directly. The sheets catalogue design also declared `CMD_SHEETS_LIST` and `CMD_SHEETS_LIST_SCHEMAS`, while the renderer mirror only exposed the load path.

Fixed:

- Added an explicit `CMD_SEARCH_FEDERATED` handler that forces `federated: true` through the existing local-first search handler.
- Added a safe `CMD_LOAD_TEMPLATE` handler returning built-in starter site templates, closing the dangling site-builder command.
- Mirrored `CMD_SHEETS_LIST` and `CMD_SHEETS_LIST_SCHEMAS` in `ui/boot.js`.
- Added `SheetsCatalog.listSchemas()` and `CatalogManager.listSheetsSchemas()` so schema-sheets callers can inspect sanitized `{ name, schemaId }` rows over RPC.
- Extended `constants-mirror.test.js` so every renderer-mirrored command must have a backend `rpc.handle`.

Why it matters: this turns command-surface completeness into a regression test. A future catalogue/search/naming/Nostr button cannot silently point at an unhandled numeric command.

#### P3 - Nostr feed still hid trust-gate outcomes too quietly

The trusted-contact Nostr feed correctly admitted only verified, attested contact events. Revoked, stale, untrusted, malformed, or future-dated activity stayed out of the visible feed, but the UI could not explain why expected contact notes were absent.

Fixed:

- `FederatedNostrFeed` now has `eventsWithDiagnostics()`, preserving the existing `events()` API while also reporting hidden counts.
- `CMD_NOSTR_QUERY` returns hidden diagnostics when federated mode is enabled.
- The Nostr feed UI now renders a compact hidden-contact-activity summary when the trust gate hides contact activity.
- Focused tests verify revoked contact events remain invisible while diagnostics report the hidden revoked activity.

Why it matters: the bridge remains fail-closed, but users now get operational visibility when the bridge is protecting them.

### Rechecked Catalogue, Search, Naming, And Nostr

- Catalogue: safe-target normalization and link-only parity are now strong across desktop, React Native, iOS, and Android. The remaining product improvement is debounced Apps search that calls `CMD_SHEETS_LIST` for loaded sheets catalogues, with the current aggregate filter retained as offline fallback.
- Search: batch provenance is visible and explicit `CMD_SEARCH_FEDERATED` is now a real command. The next improvement remains term-level result explanations.
- Naming: command coverage is coherent; Unicode prefilter, homograph checks, safe targets, and release/revoke paths remain covered. The next improvement remains ambiguity UI for competing trusted-contact claims.
- Nostr: hidden/revoked contact activity is now summarized. The next improvement is a fuller quarantine browser for inspected hidden events, plus any public `wss://` relay support as explicit opt-in.

### Verification Added

- Focused command/sheets/Nostr diagnostics suite: `node --test test/constants-mirror.test.js test/sheets-catalog-query.test.js test/federated-nostr-feed.test.js`: 19 passed, 0 failed.
- Command-surface audit script: renderer commands without backend handlers returned `[]`.
- Full desktop suite: `npm test` in `pearbrowser-desktop`: 400 passed, 0 failed.
- Full mobile suite: `npm test` in `PearBrowser`: 124 passed, 0 failed.

## Addendum: Release Recheck On 2026-06-23

This pass rechecked the discovery surfaces against the actual release branch after
Peercord was added to the featured apps and default PearBrowser Network
catalogue.

### Current State

- Catalogue: Peercord is present in the versioned catalogue source, generated
  offline seed, featured Apps UI, resolver alias, and live Hyperbee catalogue.
  It is intentionally marked as a standalone Pear app because the upstream
  Peercord release is a desktop Pear app, not a pear-request worker.
- Search: the local-first and federated search contracts remain green,
  including bounded query handling, digest-first fanout, stale-query
  suppression, signed-result verification, and provenance fields.
- Naming: petnames, registry rows, curated aliases, and trusted-contact claims
  still resolve through the shared safe-target universe, including `pear://`
  link-only apps such as Peercord.
- Nostr bridge: the shipped surface remains the Pear-native trusted-contact
  bridge with binding/revocation diagnostics, not a public relay client.

### Verification Added

- Full desktop suite: `npm test` in `pearbrowser-desktop`: 415 passed, 0 failed.
- GitHub Actions Desktop CI passes on the release branch, including source
  checkouts, HiveRelay layout guard, install, tests, and high-severity
  dependency audit.
- Full mobile suite: `npm test` in `PearBrowser`: 136 passed, 0 failed.
- Live relay check with real DHT access: 1 unique HiveRelay reachable and 7 live
  relay connections.
- Live catalogue check: signed `PearBrowser Network` Hyperbee at length 256,
  14 apps, Peercord, peerit, and HiveWorm rows present, Peercord marked
  `standalone`, and peerit marked `hypersite`.
- Production drive check: fresh peer reached length 18552 and fetched 11652
  bytes from `/backend/anongpt-buyer.js`; a fresh-peer metadata scan also
  confirmed `/.landing-seed.mjs`, `/pearbrowser-storage`, `/docs`, `/scripts`,
  `/examples`, and `/test` are absent from the production drive.
- Deep bundle checks: PearBrowser homepage, Peercord, and Keet all returned
  peers and had zero missing sampled blobs. Latest samples: PearBrowser
  homepage `2/2`, Peercord `12/12`, Keet `12/12`.

Restricted/sandboxed network runs can false-negative DHT discovery. The release
gate should use real DHT access, as the verifier scripts do when run from the
publisher box or a normal remote host.
