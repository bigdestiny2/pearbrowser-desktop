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

## Remaining Improvement Opportunities

### 1. Centralize catalogue app normalization

Current issue: every source type still has its own app normalization behavior. Hyperbee loading currently pushes raw values directly from `app!` rows (`backend/catalog-manager.js:207`), while Autobee, schema-sheets, relay index, and local JSON all have slightly different target rules.

Recommended improvement:

- Add a shared `normalizeCatalogApp(input, { source })` helper.
- Return a canonical app DTO with:
  - `id`
  - `name`
  - `driveKey`
  - `link`
  - `version`
  - `categories`
  - `verification`
  - `catalogKey`
  - `catalogName`
- Use the same helper from Hyperdrive JSON, Hyperbee, Autobee apply, schema-sheets rows, relay index rows, and local seed scripts.

Expected impact: fewer link/key mismatches, easier tests, and less UI compensation.

### 2. Move stable app dedupe into the backend aggregate

Current issue: `CatalogManager.getAggregatedApps()` dedupes by `app.id` only (`backend/catalog-manager.js:466`). The UI has smarter stable-target dedupe (`ui/shell.js:1502`), but backend consumers still see duplicates if two catalogues use different ids for the same `driveKey` or `link`.

Recommended improvement:

- Backend aggregate key should be:
  - `drive:<driveKey>` if drive key exists.
  - `link:<normalizedLink>` if link exists.
  - `id:<id>` otherwise.
- Keep the existing version-wins rule, but incorporate verification/trust where available.
- Leave UI dedupe as a defensive final pass, not the primary policy.

Expected impact: Apps tab, command search, API consumers, and future relay sync all see one canonical app list.

### 3. Make digest-first search real, not just planned

Current issue: the planner has digest-first structure, but peer digests are not yet replicated into the warm cache. `backend/query-planner.js:237` falls back to fetching the full frontier when `plan.pull` is empty.

Recommended improvement:

- Publish compact search digests whenever index metadata is refreshed.
- Replicate/contact-cache digests before query-time fan-out.
- Surface partial/fallback provenance when a query had to pull peers without digest gating.

Expected impact: less bandwidth, lower latency, and stronger resistance to low-value peers.

### 4. Add search result provenance beyond source chips

Current issue: results have trust tiers, but the UI does not yet explain why a result won: matched fields, endorsers, signature tier, row source, or digest status.

Recommended improvement:

- Carry snippet/provenance fields from candidate creation through ranking.
- Show compact chips such as `name match`, `trusted contact`, `relay-listed`, `author-signed`, and `partial`.
- Keep the detailed verification trail available in an expandable inspector.

Expected impact: search becomes more legible and auditable, especially once federated results are common.

### 5. Surface naming ambiguity in the URL bar

Current issue: the backend returns `candidates` for federated name resolution (`backend/federated-name-resolver.cjs:77`, `backend/index.js:1417`), but the UI mainly shows source/provenance. A user typing a common name should know if multiple trusted contacts map it differently.

Recommended improvement:

- If `candidates > 1`, show an ambiguity chip or chooser.
- Allow expanding to see each contact's target.
- Keep deterministic lowest-pubkey winner as the default for replica stability.

Expected impact: users understand contact-scoped naming rather than mistaking it for global DNS.

### 6. Allow name registry targets to represent first-class app links

Current issue: local registry claim and rotate only accept 64-hex drive keys (`backend/index.js:1481`, `backend/index.js:1494`). Petnames now support `pear://` and `file://`, but registry names do not.

Recommended improvement:

- Extend registry target schema to support `{ type: "drive", key }` and `{ type: "link", link }`.
- Apply the same scheme allowlist as petnames/catalogue links.
- Keep old 64-hex targets as a backward-compatible shorthand.

Expected impact: naming and catalogue can both address the same class of app targets.

### 7. Carry remote Nostr revocations through federation

Current issue: local revoke advertisement is fixed, but `backend/federated-nostr-feed.cjs:57` builds per-contact trust with `revocations: []`. It trusts the single advertised bind, but does not yet ingest a richer revocation history from the contact.

Recommended improvement:

- Include revocation records in the advertised binding metadata or event-store side channel.
- Feed those records into `buildNostrTrustSet`.
- Add a UI state for `linked`, `revoked`, `stale`, and `unverified` author bindings.

Expected impact: Nostr authorship survives rotation and revocation scenarios more honestly.

### 8. Decide whether the Nostr bridge should support legacy public relays

Current state: this is a Pear-native, contact-trusted Nostr event bridge. It is not yet a public `wss://` relay bridge.

Recommended improvement:

- Keep public relay ingress/egress off by default.
- If enabled, use a quarantined relay pool with circuit breakers and explicit provenance.
- Never merge public relay events into trusted contact feeds without binding verification.

Expected impact: the bridge can interoperate with wider Nostr without weakening the browser's trust model.

## Recommended Next Implementation Order

1. Build `normalizeCatalogApp` and move backend aggregate dedupe to stable app identity.
2. Extend name registry target schema to support link targets.
3. Wire digest replication/cache so federated search uses digest-first fan-out in practice.
4. Add naming ambiguity UI and richer search provenance chips.
5. Add remote Nostr revocation ingestion and status UI.
6. Treat public `wss://` relay support as an explicit opt-in feature after the Pear-native bridge is solid.

## Verification

Focused verification after the fixes:

- `node --test test/keys.test.js test/names.test.js test/autobee-catalog.test.js test/identity-binding-publisher.test.js test/search-federation.test.js`
- Result: 45 passed, 0 failed.

Full suite verification was also run during this review pass:

- Desktop `npm test` in `pearbrowser-desktop`: 348 passed, 0 failed.
- Mobile/outer `npm test` in `PearBrowser`: 96 passed, 0 failed.

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

Catalogue is now better connected end to end. The remaining high-value cleanup is still shared app normalization: Hyperdrive JSON, Hyperbee, Autobee, schema-sheets, and relay index rows should all pass through one canonical DTO helper and one backend dedupe policy based on `driveKey`, then `link`, then `id`.

Search remains strong at the trust/ranking layer. The next practical improvement is product legibility: preserve and show match/provenance details so a user can tell why a local or federated result ranked, whether it came from a trusted contact, and whether verification or digest completeness was partial.

Naming has good authority layering and homograph defenses. The next improvement is parity with catalog targets: the name registry only claims 64-hex drive keys, while petnames and catalog entries can represent safe `pear://` and `file://` links. A typed name should eventually be able to target the same safe app/link universe as the catalog.

Nostr bridge is sound as a Pear-native trusted-contact feed, not a public relay bridge. The next improvement is operational transparency: expose quarantine/revocation state in the UI and carry remote revocation records through `federated-nostr-feed`, rather than relying only on the current advertised bind.

### Verification Added

- `node --test test/catalog-bee.test.js test/keys.test.js test/constants-mirror.test.js`: 22 passed, 0 failed.
- Desktop `npm test` in `pearbrowser-desktop`: 355 passed, 0 failed.
- Renderer harness retest: About footer no longer contained `Invalid Date`; Apps catalog input advertised `sheets://` and `hiveindex://`.
