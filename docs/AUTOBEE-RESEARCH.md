# Autobee Research Notes

Date: 2026-06-10

Autobee is a promising Holepunch building block for multi-writer local-first state in PearBrowser. The strongest near-term use is not replacing existing storage, but adding a feature-flagged prototype for collaborative catalogs.

## Sources

- Autobee repo: <https://github.com/holepunchto/autobee>
- README: <https://github.com/holepunchto/autobee/blob/main/README.md>
- Package metadata: <https://github.com/holepunchto/autobee/blob/main/package.json>
- Main implementation: <https://github.com/holepunchto/autobee/blob/main/index.js>
- Tests: <https://github.com/holepunchto/autobee/tree/main/test>
- PearBrowser catalog manager: `backend/catalog-manager.js`
- PearBrowser user data: `backend/user-data.js`
- PearBrowser site manager: `backend/site-manager.js`
- PearBrowser app sync bridge: `backend/pear-bridge.js`, `backend/http-bridge.js`

## Upstream Summary

Autobee describes itself as an unstoppable, scalable multi-writer Hyperbee. Each peer writes operations to its own local Hypercore. A user-provided deterministic `apply(nodes, view, host)` function merges those operations into a shared Hyperbee view. Once peers replicate and apply the same operations, their views converge.

Current upstream state:

- Package: `autobee`
- Version observed: `1.0.8`
- License: Apache-2.0
- Runtime dependencies include `hyperbee2`, `hypercore`, `autobee-encryption`, `autobee-wakeup`, `compact-encoding`, `hyperschema`, and related ready/safety utilities.
- The README explicitly marks the project as experimental and under heavy development, with expected breaking changes.
- Tests cover basic persistence, batching, concurrent writes, encryption, writer management, wakeup, updates, optimistic behavior, and fast-forward behavior.

Core API shape:

- `new Autobee(store, [key], [options])`
- Options include `apply`, `open`, `close`, `update`, `encryptionKey`, `encrypted`, `keyPair`, and `optimistic`.
- Important properties: `key`, `discoveryKey`, `id`, `local`, `view`/`bee`, `writable`, `isIndexer`.
- Important methods: `append`, `update`, `updated`, `flush`, `replicate`, `wakeup`, `setLocal`, `views`.
- Apply host methods include `addWriter`, `removeWriter`, `ackWriter`, `interrupt`, and `createAnchor`.

## Local Fit

### 1. Collaborative My Catalogs

This is the best first target.

Current state:

- `backend/catalog-manager.js` already supports Hyperbee-backed catalog loading via `loadCatalogBee`.
- My Catalog currently uses a writable Hyperdrive with `/catalog.json`.
- Existing My Catalog mutations already preserve writable/read-only behavior:
  - `addAppToCatalog`
  - `removeAppFromCatalog`
  - `renameMyCatalog`
  - `updateAppInCatalog`
- The Apps tab already supports source filtering, aggregated catalogs, and editable My Catalog metadata.

Autobee opportunity:

- Represent catalog edits as operations:
  - `catalog.rename`
  - `app.upsert`
  - `app.remove`
  - `writer.add`
  - `writer.remove`
  - later: `app.endorse`, `app.note`, `app.block`
- Materialize the view into keys similar to the existing Hyperbee catalog shape:
  - `meta!name`
  - `meta!version`
  - `app!<id>`
  - `writer!<key>`
  - `audit!<seq>` or `audit!<appId>!<seq>` if needed
- Preserve UI behavior by returning the same app/catalog DTOs used today.

Why this is low-risk:

- Catalog data is public or intentionally shareable.
- Conflict semantics are understandable.
- Read-only mode maps directly to Autobee writer membership.
- The current Apps UI needs minimal conceptual change.

### 2. Multi-Device Browser State

Good second target after catalogs.

Current state:

- `backend/user-data.js` stores bookmarks, history, settings, session, and tabs in separate local Hyperbees.
- The file already notes that multi-device convergence was intended as a future Autobase-style refinement.

Autobee opportunity:

- Start with bookmarks and tabs.
- Defer history until privacy and retention semantics are clear.
- Use encrypted Autobee groups for private browser state.
- Add diagnostics for writer/device state before broad rollout.

Risks:

- Backup and restore need a clean story.
- Multiple devices can race on settings and tabs.
- History is sensitive and should not be the first synced dataset.

### 3. Shared Site Drafts

Good later target.

Current state:

- `backend/site-manager.js` publishes final site bytes into Hyperdrive.
- Block-editor source is persisted in `/.blocks.json`.

Autobee opportunity:

- Use Autobee for collaborative draft operations and comments.
- Keep final publishing as a single-owner Hyperdrive snapshot.
- Owner approval remains required before publishing raw HTML/CSS/JS.

Recommended model:

- Autobee stores draft source, comments, and edit history.
- Hyperdrive stores published output.
- HiveRelay continues to pin the published Hyperdrive.

### 4. Per-App Replicated KV

Worth exploring after the browser-owned use cases.

Current state:

- `backend/pear-bridge.js` and `backend/http-bridge.js` already expose app sync concepts behind drive-scoped tokens.

Autobee opportunity:

- Replace or simplify custom app sync plumbing with an Autobee-backed replicated KV.
- Keep the existing token/origin/rate-limit boundaries.
- Treat this as app-facing API design, not just a storage swap.

## Product Ideas

- Collaborative personal catalogs with co-curators.
- "Apps my contacts recommend" discovery.
- Catalog reviewer notes and signed endorsements.
- Shared bookmark folders and tab groups.
- Multi-device profile and settings sync.
- Shared site drafts with comments and owner-only publish.
- Sync diagnostics panel showing writers, peers, last update, encryption state, and local writable status.
- Catalog trust graph combining default catalogs, personal catalogs, contacts, endorsements, and local blocks.

## Threat Model Questions

- Who can add or remove writers?
- Can a webpage or app trick the user into granting writer power?
- What is the revoke-wins rule when old writer-add or grant operations arrive late?
- Are apply functions deterministic under reorder, rollback, and fast-forward?
- Are op schemas size-limited and versioned?
- Can malicious peers force storage growth or expensive reindexing?
- Are sync invite keys treated as capabilities?
- What metadata leaks when a device joins an Autobee discovery topic?
- How are encrypted group keys generated, stored, backed up, rotated, and revoked?
- Can stale profile or swarm grants resurrect after multi-device lag?
- Can app metadata be downgraded or poisoned without publisher identity checks?

## Design Constraints

- Wrap Autobee behind PearBrowser-owned manager interfaces.
- Pin exact Autobee versions during experiments.
- Do not expose Autobee objects directly to UI or page APIs.
- Keep numeric RPC constants mirrored in `backend/constants.js` and `ui/boot.js`.
- Keep writable/read-only semantics explicit in every returned DTO.
- Make all conflict handling deterministic and schema-versioned.
- Do not use wall-clock time inside `apply` for conflict resolution.
- Keep private datasets encrypted by default.
- Treat writer invites and encryption keys as sensitive capabilities.

## Proposed Prototype

Build a feature-flagged collaborative catalog prototype.

Suggested files:

- `backend/autobee-catalog-manager.js`
- `backend/autobee-catalog-ops.js`
- `backend/autobee-catalog-apply.js`
- `test/autobee-catalog-manager.test.js` or equivalent local smoke script
- Later, RPC handlers in `backend/index.js` and mirrored constants in `ui/boot.js`

Prototype scope:

1. Create an Autobee-backed catalog.
2. Append `catalog.rename`.
3. Append `app.upsert`.
4. Append `app.remove`.
5. Add a second writer.
6. Simulate concurrent edits from two Corestores.
7. Replicate both directions.
8. Verify both materialized views converge.
9. Verify a non-writer can load/read but cannot append.
10. Verify removed writer behavior once upstream semantics are understood.

Initial operation schema:

```json
{
  "v": 1,
  "type": "app.upsert",
  "id": "app-id-or-drive-key",
  "app": {
    "id": "app-id-or-drive-key",
    "name": "Example",
    "description": "Short description",
    "driveKey": "64-char-hex-or-pear-key",
    "version": "1.0.0",
    "author": "Publisher",
    "categories": ["tool"]
  }
}
```

Conflict rules for first spike:

- Catalog name: last applied operation by deterministic op order wins.
- App upsert/remove: remove wins only if it is later in deterministic op order.
- App metadata: whole-record replacement, no field-level merge.
- App `id` and `driveKey` are stable and cannot be changed by metadata edit.
- Unknown op types are ignored but retained in the log.
- Oversized ops are rejected before append.

~~Open question: define "deterministic op order" from Autobee node data without relying on local timestamps.~~

**Resolved (Phase 1):** Autobase already linearizes nodes into one
deterministic order shared by every replica — `apply()` receives nodes in
that order, with no wall-clock involved. The view Hyperbee records each op in
apply-order (`op!<index>`); the materialized catalog is rebuilt by the pure
reducer `applyView()`. Autobase owns ordering + replication, PearBrowser owns
conflict semantics, and the two cannot drift. For pure unit tests (no
autobase) the same total order is modeled by sorting node tags on
`(seq, writerKey, stableHash)` — see `scripts/lib/autobee-catalog-apply.js`
`linearize()`.

## Acceptance Criteria

The prototype is useful only if:

- Two independent Corestores converge on the same catalog view. ✅
- The same op log rebuilds the same Hyperbee view after restart. ✅
- Read-only instances expose `writable: false`. ✅
- Existing Apps DTO shape can be produced from the Autobee view. ✅ (`toCatalogData()`)
- Basic malicious inputs are rejected or ignored:
  - giant records ✅
  - prototype pollution keys ✅
  - missing drive keys ✅
  - invalid writer keys ✅
  - unknown op versions ✅ (retained-but-ignored, forward-compat)
- Tests cover concurrent add/edit/remove and restart. ✅

**All met** — see `test/autobee-catalog.test.js` (pure reducer, in `npm test`)
and `scripts/autobee-catalog-smoke.js` (live two-writer autobase convergence,
run on demand).

## Rollout Plan

Phase 0: Research doc and dependency watch. ✅

Phase 1: Local-only Autobee catalog smoke test. No UI. ✅ **Done** — pure
reducer + ops (`backend/autobee-catalog-{ops,apply}.cjs`),
`test/autobee-catalog.test.js`, and `scripts/autobee-catalog-smoke.js` (live
two-writer convergence against autobase 7.27.3). All acceptance criteria
above pass.

Phase 2: Hidden backend manager behind a feature flag. Load an Autobee
catalog alongside Hyperdrive and Hyperbee catalogs. ✅ **Done**:
- `backend/autobee-catalog-{ops,apply,manager}.cjs` — CommonJS so Bare can
  require it and Node can default-import it for tests (single source, no
  drift). Manager mirrors the proven `backend/pear-bridge.js` Autobase usage.
- `CMD_LOAD_CATALOG_AUTOBEE = 19` in `backend/constants.js`, mirrored in
  `ui/boot.js`.
- `catalog-manager.js` gains `loadCatalogAutobee()` and integrates autobee
  entries into refresh / aggregate / listCatalogs (`source: 'autobee'`,
  `writable`) / unload / close. Manager is **lazily** required so a disabled
  experiment can never affect boot.
- `index.js` handler is gated server-side by the `experimentalAutobeeCatalogs`
  user-data setting (fails closed) so a stale renderer can't enable it.
- UI `parseCatalogRef()` routes `autobee://<key>` → the new command;
  `catalogLoadPlan()` centralizes drive/hyperbee/autobee routing.

  To enable for testing (no UI toggle yet — that's Phase 3), set the flag via
  RPC, e.g. `CMD_USERDATA_SET_SETTINGS { updates: { experimentalAutobeeCatalogs: true } }`,
  then load an `autobee://<key>` ref in the Apps tab.

Phase 3: Experimental UI for "Create collaborative catalog" and "Invite
writer" — plus a Settings toggle for `experimentalAutobeeCatalogs`. **Next.**

Phase 4: Multi-device bookmarks/tabs experiment using the same adapter pattern.

Phase 5: Shared site drafts if catalog and browser-state experiments behave well.

## Do Not Do Yet

- Do not migrate profile grants or swarm grants first.
- Do not replace My Catalog storage without an import/export path.
- Do not expose writer management to apps.
- Do not promise HiveRelay durability until all required Autobee cores are understood.
- Do not treat upstream APIs as stable until the breaking-change warning is removed or we pin and vendor a known-good version.

## Notes For Future Work

- Check whether `hyperbee2` can coexist cleanly with current `hyperbee` usage in this app.
- Validate Pear runtime/Bare compatibility for Autobee dependencies.
- Fix the profile field mismatch before any profile sync work: UI references `name`, while backend profile fields use `displayName`.
- Consider a generic `ReplicatedKVManager` interface so catalogs, bookmarks, and app sync can share diagnostics and lifecycle code.
- Add a "Sync Diagnostics" UI before users depend on collaborative state.
