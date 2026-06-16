# HiveRelay + Schema-Sheets: A Structured P2P Data Layer for the PearBrowser Catalogue and Relay Backbone

**Status:** Design / implementation-ready
**Date:** 2026-06-16
**Scope:** `pearbrowser-desktop` (catalogue + UI), `p2p-hiverelay` (relay backbone), `p2p-hiverelay-verifier` (trust), `p2p-hiverelay-client` (gateway client)
**Credits:** `schema-sheets` by **ryanramage**. The pattern of a Holepunch-native browser shipping a schema-sheets room as its app catalogue is taken from **Drache93's Pear Browser** (`/tmp/pear-browser-ref`), which is the inspiration for this whole design.

---

## 1. Executive Summary + Core Idea

PearBrowser today carries **three** bespoke catalogue read formats (Hyperdrive `/catalog.json`, Hyperbee `app!ID`, Autobee `op!N`) and a **HiveRelay backbone** built on flat files (`forks.json`, `pending-seeds.json`), a hardcoded relay list, and signed-but-unqueryable capability docs. Each format reinvents a slice of the same missing primitive: a **validated, queryable, multiwriter, signed, durable structured data store** that replicates over the Holepunch swarm.

**Core idea: make one primitive — `schema-sheets` — the structured P2P data layer that sits under BOTH the app catalogue and the relay backbone.**

`schema-sheets` (ryanramage) is a multiwriter P2P database: **one Autobase + one HyperDB view per "room"**, addressed by a single `z32` room link that encodes `key(32) ++ encryptionKey(32)`. It gives us, in one Holepunch-native dependency, the four capabilities every current format is missing:

1. **Schema validation** — `ajv.compile(schema)` + `validate(json)` runs at apply time and rejects bad rows with `code 501` (`/tmp/ss-study/package/routes/sheets.mjs:42-48`).
2. **A query language** — `list(schemaId, {gte, lte, query})` runs JMESPath per row (`index.mjs:184-187`) over a built-in time index, instead of brute prefix scans.
3. **Real multiwriter membership** — first append by a new writer auto-adds it (`routes/members.mjs:2-8`); curated mode gates it.
4. **Signed provenance** — every row is stamped with `memberkey = ctx.writer`, and `addRowAttestation` verifies a `keet-identity-key` signature over the row JSON (`routes/sheets.mjs:100-121`).

A schema-sheets room is an Autobase, so its `base.discoveryKey` **pins on HiveRelay through the exact `hiveRelay.seed()` path the desktop already uses for drives** (`backend/index.js:1500-1503`). That single fact is what makes this design cheap: durability — the autobee killer — comes for free, and so does an HTTP fast-path served by the relay gateway.

This doc specifies two complementary applications of that one primitive:

- **Design A — The Catalogue on schema-sheets:** one validated, queryable, multiwriter catalogue *room* replaces the drive/bee/autobee trio as the canonical app catalogue, with real server-side search, signed app provenance, curated/open membership, and run-in-tab gating driven by a validated `type` field.
- **Design B — The Backbone on schema-sheets:** one schema-sheets *index room per relay*, written through from the relay's existing registries, exposes a **pin registry**, a **relay directory** (killing the hardcoded relay list), an **app manifest**, and **verifier/reputation** rows — additively, with the existing seeding engine and verifier kept as the source of truth.

The two designs **share one infrastructure** (the same `schema-sheets` dependency, the same `keet-identity-key` membership/attestation, the same `z32` room-link convention, the same `hiveRelay.seed()` pin path). The reconciliation in §6 makes the relay's index room and the catalogue room cooperate rather than collide: the relay *serves and pins* the catalogue room, and the catalogue's `app-manifest` rows and the backbone's `app-manifest` schema are unified into a single shape.

---

## 2. Background — What Exists Today and Its Limits

### 2.1 The catalogue: three read formats

`backend/catalog-manager.js` loads catalogs through three code paths, each producing the **same in-memory DTO** `{version, name, source, sourceKey, writable, apps[]}` (the abstraction seam this design preserves):

| Format | Loader | `source` | Limits |
|---|---|---|---|
| Hyperdrive `/catalog.json` | `loadCatalog` (`catalog-manager.js:25`) | `hyperdrive` | Single-writer; whole-file JSON; no query; icons base64-inlined at load. The default (`DEFAULT_CATALOG_KEY`). |
| Hyperbee `app!ID` | `loadCatalogBee` (`:80`) | `hyperbee` | Single-writer; prefix scans only; effectively dead in prod. |
| Autobee `op!N` | `loadCatalogAutobee` (`:210`, `autobee-catalog-*.cjs`) | `autobee` | Multiwriter via op-log, but **no schema validation**, **no query language**, manual 64-hex writer-key copy-paste membership (`CMD_AUTOBEE_ADD_WRITER`), and — fatally — **the catalogue vanishes when all writers go offline** (no independent indexer/pinner).

Cross-cutting limits shared by all three:

- **No validation** — any field shape is accepted; `_safeJSONParse` is the only defense.
- **No real search** — the UI does a client-side `Array.filter` substring match (`ui/shell.js` `filteredApps`); the backend `searchApps` is unused.
- **Weak trust** — apps are keyed by `id` with "highest version wins," so any actor can shadow an app id with a higher version; there is no publisher provenance.
- **Hardcoded data** — `FEATURED_APPS` is a 6-entry array in `ui/shell.js:33-94`, not data.
- **Field drift** — some apps carry only a `driveKey` (installable), others only a `link` (launch-only, e.g. Keet/PearPass); nothing enforces "carry at least one."

### 2.2 The HiveRelay backbone

The relay (`p2p-hiverelay`) is structurally sound but flat:

- **`AppRegistry`** (`core/app-registry.js`) — extends `EventEmitter`, emits `change` on every mutation (`set`/`update`/`delete`/`anchored`/`unanchored`/`anchor-update`, lines 136-232). It is the durability source of truth (anchor tracking, dedup, atomic persist, `_shouldRedactEntry` for private entries).
- **`seedingRegistry`** — distributed multi-log over Protomux; the seed/unseed protocol; `getActiveRequests()`/`getRelaysForApp()`.
- **`reputation`** — `getRecord`/`getLeaderboard`.
- **`fork-detector` + `forks.json`** — quarantine logic (`schemaVersion 1`).
- **`capability-doc`** (`core/capability-doc.js`) — a sodium-signed, TOFU-pubkey JSON doc (`schemaVersion 1`), served at `/.well-known/hiverelay.json`. Its signature covers a canonical sort of *all* fields, so **unknown fields are additive-safe** (header explicitly says "unknown fields MUST be ignored").
- **HTTP gateway** (`core/relay-node/api.js`) — `/catalog.json` (paginated/typed/anchored, redaction-aware), `/api/registry`, `/api/anchors/<key>/proof`, the `/v1/hyper/:key/*` byte fast-path.
- **`p2p-hiverelay-verifier`** — independent (zero `p2p-hiverelay` dep, own Ed25519 via Node `crypto`). `verifyRelays`/`compareDrive`/`auditAnchors`/`fetchAnchorProof` fetch `/catalog.json` + `/.well-known/hiverelay.json` and validate `hiverelay-anchor-proof-v1` signatures.
- **`p2p-hiverelay-client` / `backend/relay-client.js`** — HTTP fast-path with circuit breakers, but the relay list is **hardcoded** `['http://127.0.0.1:9100']` (`relay-client.js:13`). `setRelays()` exists but nothing populates it.

**Limits:** no queryable index (everything is a flat file or a per-request HTTP scan); no relay discovery (the hardcoded list); the capability doc is signed but you cannot *query across* relays; verifier verdicts are computed but never stored/shared; `pending-seeds.json` and the seed state live in separate flat structures.

---

## 3. Schema-Sheets: Capability + Limit Summary

**Credit: `schema-sheets` by ryanramage. Inspiration: Drache93's Pear Browser, which already ships its app catalogue as a schema-sheets room** (`/tmp/pear-browser-ref/app.js`: `new SchemaSheets(store, key, {encryptionKey}); await ready(); swarm.join(sheets.base.discoveryKey); await join(username)`).

All references below are to `/tmp/ss-study/package` (the studied copy of the dependency), verified against the actual source.

### Capabilities (verified in source)

| Capability | Where | Notes |
|---|---|---|
| One Autobase + HyperDB view per room | `index.mjs` | Room link = `z32.encode(key32 ++ encryptionKey32)` (README join flow). |
| Schema definition | `addNewSchema(name, jsonSchema)` `index.mjs:96` | Validated at creation (`ajv.compile`, `INVALID_SCHEMA` on bad schema). |
| Row CRUD | `addRow` `:139`, `updateRow` `:153`, `deleteRow` `:167` | Row UUID = `z32` of 32 random bytes; stable identity. |
| **ajv validation at apply time** | `routes/sheets.mjs:42-48` | Rejects invalid rows with `code 501 SCHEMA_VALIDATION_FAILED` + `validate.errors`. |
| **Provenance** | `routes/sheets.mjs:35,52` | Every row stamped `memberkey = ctx.writer`. |
| **Time index** | collection `rows-by-schema-time` `contract.js:380` | `list(schemaId, {gte, lte})` windows by row time. |
| **JMESPath query** | `index.mjs:184-187` | `compile(opts.query)` + `TreeInterpreter.search` per row; null matches dropped. |
| Saved queries | `addQuery` `:201`, `listQueries` `:232`, collection `queries-by-schema` | Named facets replicate to clients. |
| **Signed attestations** | `addRowAttestation` `:275` / `routes/sheets.mjs:100-121` | `Identity.verify(proof, JSON.stringify(row.json))` via `keet-identity-key`; `code 401` on forgery; `code 409` if already attested. |
| List attestations | `listRowAttestations` `:290`, collection `row-attestations-by-row` | Non-empty ⇒ signed. |
| **Open multiwriter** | `routes/members.mjs:2-8` | First append (`ctx.seq === 0`) by a new writer auto-calls `host.addWriter`; host itself is the indexer. |

### Limits / caveats (each becomes a §8 risk)

- **Type:module ESM** (`package.json`) — the desktop backend is CommonJS under **Bare**. Must load via `await import('schema-sheets')`. `index.js` already proves dynamic `import()` works under Bare (`:1322`).
- **Open-by-default membership** — without gating, anyone with the link can write. A real design fork (curated vs open), not a config flag.
- **No in-place mutate** — `updateRow` appends a new op; busy writers grow the Autobase core (write amplification).
- **JMESPath over a full scan** — `list()` pulls all rows for a `schemaId`+time-range into memory, then filters in JS. Same O(n) the flat formats had; needs pagination for thousands of rows.
- **Eventually consistent** — `list()` reflects only locally-applied ops; a just-submitted row may not appear instantly across peers. No 15s blind-wait like the legacy `_waitForData`.
- **The z32 link embeds the encryption key** — anyone with the link can read (and, in open mode, write). Public-by-design; cannot be unlisted once shared.
- **`additionalProperties:false` rejects unknown future fields** — no "retain unknown" semantics like the autobee reducer. Forward-compat is a per-schema decision (§8).
- **`keet-identity-key` + `b4a` under Bare** — attestation route deps must load in the Bare runtime; confirm early (§8).
- **Not yet installed** — `schema-sheets` is in `/tmp/ss-study` only; `pearbrowser-desktop/node_modules/schema-sheets` does **not** exist. Installing + pinning it (and its `hyperdb`/`autobase`/`@jmespath-community/jmespath`/`ajv` transitive deps) against the existing Pear stack is **Phase 0**.

---

## 4. Design A — The Catalogue on Schema-Sheets

**Goal:** one schema-sheets room is the canonical catalogue. Its `z32` room link becomes THE catalogue address, replacing `DEFAULT_CATALOG_KEY`.

### 4.1 Schema

`sheets.addNewSchema('apps', …)` with this JSON-schema (the convergence point that resolves the link-vs-driveKey field drift):

```js
{ type:'object',
  properties:{
    name:{type:'string',maxLength:200},
    iconRef:{type:'string',maxLength:300},        // drive path OR small (<=8KB) data: URI
    description:{type:'string',maxLength:1000},
    driveKey:{type:'string',pattern:'^[0-9a-f]{64}$'},  // installable apps
    link:{type:'string',maxLength:300},           // pear://… launch-only apps (Keet/PearPass)
    type:{enum:['standalone','hypersite']},       // window vs run-in-tab gating
    author:{type:'string',maxLength:200},
    categories:{type:'array',items:{type:'string',maxLength:60},maxItems:12},
    version:{type:'string',maxLength:40},
    publishedAt:{type:'integer'},
    manifestHash:{type:'string',pattern:'^[0-9a-f]{64}$'},
    verification:{enum:['unverified','relay-listed','author-signed']}
  },
  required:['name','type'],
  anyOf:[{required:['driveKey']},{required:['link']}],   // MUST carry one
  additionalProperties:false }
```

Each app is a **row**: `sheets.addRow('apps', appJson, publishedAt)`. The row UUID is the stable, **globally unique** catalogue identity — which alone kills the "higher-version shadows real app" attack. HyperDB indexes `rows-by-schema-time` and `rows-by-member-time`; `memberkey` is built-in publisher provenance.

A second schema, **`app-suggestions`** (same shape), is the open community inbox for curated rooms (see Membership).

> **Forward-compat decision (reconciled with §8):** ship `apps` with `additionalProperties:false` (strict validation matters more for the user-facing catalogue), but add fields only via `updateSchema`, never by relying on unknown-field retention.

### 4.2 Search (no new index code)

The two built-in indexes do all the work:

- **Recent:** `sheets.list('apps', {gte:0, lte:Date.now()})` returns rows ordered by `[schemaId,time]`; pass `reverse`+`limit` through `_opts` for "newest 50." (Phase 0 test confirms `find()` forwards `reverse`/`limit` to the HyperDB iterator; if not, add pagination in the wrapper.)
- **By category / text:** `list('apps', {query:"[?type=='standalone']"})`, `"[?contains(categories,'games')]"`, substring `"[?contains(name,'keet') || contains(description,'chat')]"`. **A query language at the data layer instead of brute prefix scans.**
- **Saved facets:** `addQuery('apps','Trending Games', …, true)`; the Apps UI renders them as chips.
- **Trending (OPTIONAL / v2):** there is no event log, so it requires a second `app-events` schema (`{appId, kind:['install','launch','view']}`) that clients write to, then group-count by `appId`. **Telemetry is privacy-sensitive in a privacy-first browser — keep this out of v1; ship only recent + by-category** (open question §8).

### 4.3 Contribution (app submission)

- New RPC `CMD_SHEETS_ADD_ROW {roomLink, schema, json, time}` → `sheets.addRow`. Returns `{uuid}` or surfaces ajv `code 501` errors to the UI.
- The UI "+ Catalog" button and My-Catalog add-form call `CMD_SHEETS_ADD_ROW` (instead of `CMD_MYCATALOG_ADD_APP`) when the source is a sheets room.
- In curated rooms, community submissions go to `app-suggestions`; a curator promotes a row into `apps`.

### 4.4 Membership (who can publish)

Stock schema-sheets is **open** (auto-`addWriter` on `seq 0`). Two modes:

- **CURATED (default for the canonical room):** the room is created by the relay operator; only the operator identity is writer/indexer. Community apps land in `app-suggestions`; relay-gating happens at *pin* time (the relay pins only chosen rooms).
- **OPEN community rooms:** anyone `sheets.join(username)` + `addRow`; identity-gating via attestations; relay-gating still at pin time.

**Verification** uses the built-in attestation primitive. `CMD_SHEETS_ATTEST {roomLink, uuid}` signs `row.json` with the user's keet identity (reusing `CMD_IDENTITY_SIGN`, `index.js:783`) then `addRowAttestation`. The UI shows `verification='author-signed'` when `listRowAttestations(uuid)` is non-empty.

> **`verification` enum semantics (decision):** treat it as **derived, not freely writable** — `'unverified'` is the default, `'relay-listed'` is settable only by the relay writer, `'author-signed'` is shown only when a valid attestation exists. This closes the "any writer claims any verification level" hole.

### 4.5 Migration (coexist first, then deprecate)

The in-memory DTO is the seam — **keep it**. Add a 4th `source` value `'sheets'` and a cache key `'sheets:<z32>'` next to the existing `bare-hex` / `bee:<hex>` / `autobee:<hex>` namespacing (namespacing is load-bearing — preserve it). `getAggregatedApps`/`listCatalogs`/`unloadCatalog` branch on the new entry type exactly as they branch on `drive|bee|manager`.

- **Phase 1 (coexist):** land `sheets-catalog.js` + `CMD_SHEETS_*` and a relay-published sheets room; the desktop loads it **in addition to** the existing Hyperdrive default. Both feed `getAggregatedApps`. Nothing removed.
- **Phase 2 (cutover):** flip the default to the sheets `z32` link; auto-seed on first Apps-tab visit (reuse `defaultCatalogSeeded`). Legacy loaders stay for user-pinned catalogs.
- **Phase 3 (deprecate):** mark `CMD_LOAD_CATALOG_BEE` + the `CMD_AUTOBEE_*` trio + `autobee-catalog-*.cjs` as legacy; remove only after telemetry shows zero legacy loads.

**One-time migration script** `scripts/migrate-catalog-to-sheets.js`: read the current Hyperdrive `/catalog.json` (and any bee/autobee), normalize each entry to the `apps` schema (infer `type`: `hypersite` if link-only htmx else `standalone`; set `driveKey` OR `link`; default `verification:'relay-listed'`, `publishedAt:now`, `manifestHash` from hashing the app drive's `manifest.json`), then `addRow` each. Run from the operator box (`~/Desktop/pearbrowser-publishers`) so the canonical room is operator-owned.

**Backward compat:** `parseCatalogRef` keeps returning `{key,bee,autobee,kind}` for old scheme strings; add `kind:'sheets'`. Persisted `recentCatalogs` still route. My-Catalog (writable Hyperdrive) stays as-is for now.

### 4.6 UI + run-in-tab integration

- **Search box:** replace the client-side `filteredApps` substring `useMemo` (`shell.js`) with a **debounced `CMD_SHEETS_LIST`** passing a JMESPath built from `{query, category, source}`. Keep the `useMemo` as a thin offline fallback. This is the "real search box that calls `sheets.list` with JMESPath."
- **Run-in-tab gating:** the app-card already has Launch/Install; add the `type` switch `FEATURED_APPS` uses — `type==='standalone'` → `CMD_LAUNCH_PEAR_LINK` (window), `type==='hypersite'` → `CMD_RUN_APP_IN_TAB`. Since `type` is now a **validated field on every row**, the hardcoded `FEATURED_APPS` array (`shell.js:33-94`) becomes **data**: seed those 6 rows into the canonical room and render Featured from `list('apps', {query:"[?author=='pearbrowser']"})` or a featured flag.
- **Routing:** `catalogLoadPlan` (`shell.js:123`) + `parseCatalogRef` (`keys.js:138`) gain a `sheets://` scheme (or bare z32) → `CMD_SHEETS_LOAD`. A 52-char z32 decoding to 64 bytes (key+enc) routes to sheets; a 32-byte z32 / 64-hex stays drive.
- **Icons:** do NOT base64-inline at load. `iconRef` is either a drive path the UI lazily fetches (via `CMD_GET_DRIVE_INFO`/proxy) or a small `data:` URI inline in the row. Letter-fallback otherwise (already in `shell.js`). **Pick path-fetch as the default to avoid Autobase bloat** (open question §8).

### 4.7 Backend module + constants

New `backend/sheets-catalog.js` wraps schema-sheets and exposes the same surface `CatalogManager` gives the RPC layer (mirror `/tmp/pear-browser-ref/app.js`). New constants (`backend/constants.js`): `CMD_SHEETS_LOAD=170`, `CMD_SHEETS_LIST=171`, `CMD_SHEETS_ADD_ROW=172`, `CMD_SHEETS_UPDATE_ROW=173`, `CMD_SHEETS_DELETE_ROW=174`, `CMD_SHEETS_LIST_SCHEMAS=175`, `CMD_SHEETS_ATTEST=176`, `CMD_SHEETS_LIST_ATTEST=177`, `CMD_SHEETS_JOIN=178`, `CMD_SHEETS_ADD_WRITER=179`.

`getAggregatedApps` replacement: for each loaded sheets room, `sheets.list('apps')` → map each row to the existing in-memory DTO app shape, tagging `{catalogKey:roomZ32, catalogName, id:row.uuid, publisherKey:row.memberkey}`. Dedup by `uuid` globally; cross-room same-app collapse becomes opt-in by `driveKey`.

---

## 5. Design B — Backbone Improvements

**Goal:** one schema-sheets room **per relay** (`node.indexRoom`), mounted alongside `node.appRegistry` / `node.seedingRegistry` / `node.reputation`, as a **queryable, signed mirror** of the registries. The registries stay the write-through source of truth (durability + fast path kept). This is **additive — no fork of `p2p-hiverelay`.**

Four named schemas (all `type:'object'`):

### (a) `pin-registry` — queryable view of `forks.json` + `pending-seeds.json` (not the durability source)

One row per `appKey`. Fields include `appKey` (64hex, required), `type` (`app|drive|dataset|media`), `name`, `version`, `author`, `parentKey`, `mountPath`, `categories`, `sizeBytes`, `anchored`, `anchoredLength`, `anchoredAt`, `storageClass`, `availabilityClass`, `durability`, `revocable`, **`seedState`** (`pending|accepted|anchored|unseeded|rejected` — folds `pending-seeds.json` + registry state into one column), `relayPubkey`, `verified` (derived). Required: `[appKey, type, seedState]`. `addRow('pin-registry', json, anchoredAt||seededAt)` so the time index = pin-event time (`list({gte,lte})` = "what got pinned this week"). Identity = `appKey`: keep an in-mem `Map<appKey, rowUuid>` and **`updateRow`** on state transitions so there is exactly one row per app.

### (b) `relay-directory` — the discoverable relay directory (kills the hardcoded list)

One row per relay advertising itself — a **thin signed projection of `buildCapabilityDoc`**. Fields mirror the capability doc: `pubkey` (required), `name`, `description`, `software`, `version`, `region`, `runtime`, `supported_transports`, `features`, **`gatewayUrl`** (required — the HTTP fast-path base), `limitation{}`, `health{anchoredCount,totalCount,anchorRatio,lastSeen}`, `capacity{usedBytes,maxStorageBytes}`, `reputation{score,relaysServed}` (from `node.reputation.getRecord`). Time index = `lastSeen` (heartbeat). **`json.capabilitySig` copies the capability doc's own signature so clients re-verify via `verifyCapabilityDoc` WITHOUT trusting the room writer.**

### (c) `app-manifest` — the install/launch contract (resolves the field drift)

Fields: `appId` (required), `appKey` (64hex|null), `driveKey` (64hex|null), `link` (`pear://`|`hyper://`|null), `name` (required), `description`, `author`, `version`, `icon`, `categories`, `launchType` (`standalone|hypersite`), `entrypoint`, `publisherPubkey` (keet-identity), `publishedAt`, `sizeBytes`. Required: `[appId, name]`, with `anyOf:[{required:[driveKey]},{required:[link]}]` so a manifest is **both installable and launchable**. **This schema is unified with Design A's `apps` schema — see §6.**

### (d) `verification` — reputation/verifier output tied to `p2p-hiverelay-verifier`

Two layers:
1. **Built-in attestations** on `app-manifest` rows: `addRowAttestation(manifestRowUuid, proof, keetUsername)` where `proof` is a publisher/verifier `keet-identity` signature over the manifest JSON.
2. A **`verification` schema** for relay-level/cross-relay verifier verdicts: `subjectAppKey` (required), `verifierPubkey` (required), `verdict` (`agree|diverge|anchored|unanchored`, required), `method` (`capability-divergence|anchor-proof|catalog-divergence` — the three checks `compareDrive`/`auditAnchors`/`verifyRelays` produce), `checkedRelays`, `divergenceCount`, `anchorProofSig` (the `/api/anchors/<key>/proof` signature, re-validated with Node Ed25519), `attestedAt`. Time index = `attestedAt`; `list('verification', {query:'[?verdict==`diverge`]'})` surfaces flagged apps.

> **Forward-compat decision (reconciled with §8):** set `additionalProperties:true` on `pin-registry` and `app-manifest` (the backbone must tolerate future fields written by newer relays), `additionalProperties:false` on `relay-directory` and `verification` (tighter, trust-bearing).

### Indexes / saved queries

All field filtering rides JMESPath on the `schemaId`+time scan. Persist canonical facets via `addQuery`, e.g. `addQuery(pinRegistryId,'anchored-only','[?anchored==`true`]')`, `addQuery(relayDirId,'alive-high-rep','[?reputation.score >= `0.7`]')`.

### Room key + membership

Room key derived deterministically from the relay identity (`sodium hash(relay pubkey + 'hiverelay-index-room-v1')`) so it is stable across restarts and discoverable. Publish the `z32` room link in the capability doc as a **new additive field `indexRoom`** (`schemaVersion` stays 1; verifier ignores unknown fields). The **public** index room ships WITHOUT an encryption key (clients blind-replicate read-only). The relay calls `join('relay:<pubkey-prefix>')` once at boot; only the relay (+ invited verifier peers) are writers.

### Plug-in points (named, additive)

- **Relay (plugin, not fork):** ship `p2p-hiverelay-index` via the existing `core/plugin-loader.js`. It instantiates `new SchemaSheets(store.namespace('hiverelay-index'), roomKey)` and subscribes to events the relay **already emits**:
  - `AppRegistry` `change` events → `addRow`/`updateRow` on `pin-registry` + `app-manifest`. Zero changes to `AppRegistry`.
  - `seedingRegistry.getActiveRequests()` → `pin-registry` rows with `seedState='pending'/'accepted'`.
  - `reputation.getRecord` → `relay-directory.reputation` each heartbeat.
  - Heartbeats its own `relay-directory` row every N seconds from `buildCapabilityDoc(...)`, copying `doc.signature` into `json.capabilitySig`.
- **New HTTP routes** in `core/relay-node/api.js _handle` (same `if (path === …)` style, GET branch): `GET /api/index/room` (returns `{indexRoom:'<z32>', schemas:[…], queries:[…]}`); `GET /index/pins?query=&gte=&lte=&type=`, `/index/relays`, `/index/manifests`, `/index/verifications` (server-side `list()` over the room — HTTP fast-path **with** query). `/catalog.json` is **unchanged** (verifier depends on it).
- **Client (`backend/relay-client.js`):** add `query(room, jmespath, range)` (GET `/index/*`, reusing `_httpGet` + circuit breakers) and `listRelays()` (GET `/index/relays`) to **replace the hardcoded `['http://127.0.0.1:9100']`**: bootstrap from one seed relay, then self-populate `setRelays()` from the directory.
- **New `backend/index-room-client.js`:** thin `SchemaSheets` wrapper joining the `z32` from the capability doc, for P2P query when the gateway is down.
- **`backend/catalog-manager.js`:** a 4th loader `loadCatalogIndexRoom` (scheme `hiveindex://<z32>`) normalizing `app-manifest` rows to the same DTO (`source:'hiveindex'`, cache key `hiveindex:<keyhex>`); new `CMD_LOAD_CATALOG_INDEX`; `parseCatalogRef`/`catalogLoadPlan` gain `hiveindex://`.
- **Verifier (`p2p-hiverelay-verifier`):** unchanged for HTTP checks. New **optional** `verifyManifestAttestation(manifestRow, attestationRow)` re-running `Identity.verify` — kept independent. A verifier peer invited as a room writer can write `verification` rows.

### Backbone migration

`forks.json` (fork-detector internal) is **never** retired. `pending-seeds.json` stays as a local write-ahead buffer; only the read path moves to `/index/pins?query=[?seedState=='pending']`, and only after the room proves stable. `/catalog.json` + `/.well-known/hiverelay.json` are **unchanged** (verifier contract). All three legacy catalog formats keep working — the index room is a fourth source merged by `getAggregatedApps`. A relay without the plugin omits `indexRoom`; clients fall back to `/catalog.json`. **Fully optional on both ends.**

---

## 6. What to KEEP vs REPLACE (and conflict reconciliation)

### Shared infrastructure reconciliation (the two designs unified)

The catalogue (Design A) and the backbone (Design B) describe the *same* schema-sheets primitive applied to overlapping data. To avoid two parallel app schemas and two membership systems, reconcile as follows:

1. **One `app-manifest`/`apps` schema, shared.** Design A's `apps` schema and Design B's `app-manifest` schema are **merged into one canonical schema** that carries both `driveKey` and `link` (`anyOf`), `type`/`launchType` (one field — use `type` ∈ `{standalone,hypersite}`), `manifestHash`, `verification`, `publisherPubkey`/`memberkey`. The catalogue room uses it as `apps`; the relay index room references the identical shape. Migration scripts and the row→DTO mapper are written once.
2. **One membership/identity layer.** Both designs use `keet-identity-key` for attestations and the same open-vs-curated writer model. The canonical catalogue room and the relay's index room both default to **curated** (operator/relay is sole writer; community → `app-suggestions` / invited verifier peers).
3. **The relay serves AND pins the catalogue room.** This is the key reconciliation: the canonical catalogue room (Design A) is itself **a schema-sheets room the relay pins** via `pinSheetsBestEffort(roomKeyHex, sheets.base.discoveryKey)` → the same `hiveRelay.seed(keyHex, {replicas:3, discoveryKey})` used by `pinDriveBestEffort` (`index.js:1500`). The relay operator runs a headless schema-sheets joined as **indexer** (Drache93 uses `BlindPeering.addAutobaseBackground`; the relay does the same) so the catalogue is durable with no writer online — **fixing the autobee "vanishes when writers offline" limit.** The relay gateway can additionally expose `GET /v1/catalogue/<z32>` (or reuse `/index/manifests`) returning `list('apps')` JSON for the bare-http1 fast path. So Design B's `/index/manifests` route and Design A's catalogue room are the **same data over the same gateway** — not two stores.
4. **One z32 room-link convention** (`z32(key32 ++ encryptionKey32)`), one `hiveindex://`/`sheets://` routing family in `parseCatalogRef`. The public index room and a public catalogue room differ only in whether the encryption key is shared.

### KEEP (do not touch)

**Catalogue:**
- The in-memory DTO `{version,name,source,sourceKey,writable,apps[]}` + `{catalogKey,catalogName}` tagging — the seam that lets sheets coexist with legacy.
- `CMD_GET_CATALOG_APPS` / `listCatalogs` / `unloadCatalog` contracts and the cache-key namespacing in the `catalogs` Map.
- The app-card render, Install/Launch/Update buttons, the `type` field gating.
- `pinDriveBestEffort` / `hiveRelay.seed` (`index.js:1500`) — reused verbatim for room discovery keys.
- `app-manager.install` (driveKey → Hyperdrive → swarm.join → wait `/index.html`) — unchanged; sheets supplies validated driveKeys.
- `_safeJSONParse` prototype-pollution defense (redundant for sheets rows, kept for legacy loaders).

**Backbone:**
- HTTP gateway fast-path (`/v1/hyper/:key/*`, `/catalog.json`) — verifier depends on it; faster than P2P for first byte.
- The seeding engine: `AppRegistry`, `seedingRegistry`, the seed/unseed protocol — durability source of truth; the room only **observes** `change` events.
- The verifier's independence + `verifyRelays`/`compareDrive`/`auditAnchors`/`fetchAnchorProof` + the `hiverelay-anchor-proof-v1` tag.
- `capability-doc.js` signing (sodium detached sig, TOFU), `seeding-manifest.js`, `fork-detector.js` + `forks.json`.
- All three existing catalog formats and their exact key schemas (during coexistence).

### REPLACE / RETIRE (behind the dual-run window)

- The three bespoke read formats' raison d'être: `loadCatalogBee` + `scripts/publish-catalog-bee.js` + `scripts/lib/catalog-bee.js` and the autobee trio (`autobee-catalog-*.cjs`) — superseded by schema-sheets. Retire after Phase 3.
- Client-side substring `Array.filter` search (`filteredApps`) and the unused backend `searchApps` → `CMD_SHEETS_LIST` + JMESPath.
- The hardcoded `FEATURED_APPS` array → data rows (`categories ⊇ ['featured']` or `author=='pearbrowser'`).
- The ad-hoc trust model (id-keyed highest-version-wins, no provenance) → `uuid` identity + `memberkey` provenance + `addRowAttestation` signatures.
- Manual 64-hex writer-key copy-paste membership (`CMD_AUTOBEE_ADD_WRITER`) → `sheets.join(username)` + keet-identity attestations.
- The hardcoded client relay list (`relay-client.js:13`) → bootstrapped from `/index/relays`.
- `pending-seeds.json` as a **client read source** → `/index/pins?query=[?seedState=='pending']` (the file stays as a local write-ahead buffer).

---

## 7. Phased Implementation Plan

Each phase is independently shippable and testable. Effort is rough engineer-days for one engineer.

### Phase 0 — Dependency landing + Bare smoke (1–2 d)
**Deliverable:** `schema-sheets` (+ `hyperdb`/`autobase`/`@jmespath-community/jmespath`/`ajv`/`ajv-formats`/`keet-identity-key`/`b4a`) installed in `pearbrowser-desktop`, version-pinned against the existing Pear stack; a smoke test that `await import('schema-sheets')` loads under **Bare** and `Identity.verify` runs under Bare; confirm `list()` forwards `reverse`/`limit`. **Gate for everything else.**
**Test:** Bare import smoke; round-trip `addNewSchema`/`addRow`/`list` over a tmp Corestore (mirror `scripts/autobee-catalog-smoke.js`).

### Phase 1 — Catalogue schema + read path (coexist) (3–4 d)
**Deliverable:** `backend/sheets-catalog.js`; `CMD_SHEETS_LOAD`/`CMD_SHEETS_LIST`/`CMD_SHEETS_LIST_SCHEMAS`; the canonical `apps` schema; the row→DTO mapper; a 4th `source:'sheets'` in `getAggregatedApps`/`listCatalogs`/`unloadCatalog`; `sheets://` routing in `parseCatalogRef`/`catalogLoadPlan`. The desktop loads a sheets room **in addition to** the Hyperdrive default. Relay pins it via `pinSheetsBestEffort`.
**Test:** ajv rejects a row missing both driveKey+link (501) and bad `version`; valid standalone accepted. JMESPath category/substring/recent queries return expected subsets. DTO output byte-identical to the legacy Hyperdrive path. Coexistence: both sources merge; `unloadCatalog('sheets:<z32>')` drops only the sheets entry.

### Phase 2 — Search UI + run-in-tab + Featured-as-data (2–3 d)
**Deliverable:** debounced `CMD_SHEETS_LIST` wired to the Apps search box (JMESPath built from a constrained whitelist template); `useMemo` demoted to offline fallback; `type` gating (`standalone`→window, `hypersite`→run-in-tab); `FEATURED_APPS` seeded as rows and rendered from a query.
**Test:** typing issues `CMD_SHEETS_LIST` with the built JMESPath and renders results; `hypersite` shows Run-in-tab, `standalone` shows Open-in-window; JMESPath injection probes (`` `]|@| `` etc.) are escaped/rejected.

### Phase 3 — Contribution + membership + attestation (3–4 d)
**Deliverable:** `CMD_SHEETS_ADD_ROW`/`CMD_SHEETS_UPDATE_ROW`/`CMD_SHEETS_DELETE_ROW`; `app-suggestions` schema + curated-mode gating; `CMD_SHEETS_ATTEST`/`CMD_SHEETS_LIST_ATTEST` (reusing `CMD_IDENTITY_SIGN`); `CMD_SHEETS_JOIN`/`CMD_SHEETS_ADD_WRITER`; `verification` shown as derived. The "+ Catalog"/My-Catalog add-form submit to sheets rows. **This is the phase that decides curated-vs-open for the canonical room** (open question — must settle before Phase 5 cutover).
**Test:** two replicating instances — writer B `addRow`, writer A sees it after `base.update`, `row.memberkey === B`. Valid attestation accepted, forged proof → 401, duplicate → 409. Curated mode: a non-operator write lands in `app-suggestions`, not `apps`.

### Phase 4 — Backbone index room: pin registry + manifest write-through (4–5 d)
**Deliverable:** `p2p-hiverelay-index` plugin via `core/plugin-loader.js`; `pin-registry` + `app-manifest` schemas; `AppRegistry` `change` → `addRow`/`updateRow` (one row per appKey via in-mem Map); debounced anchor-check writes; `GET /api/index/room` + `GET /index/pins` + `/index/manifests` routes; additive `indexRoom` field in `buildCapabilityDoc`; respect `_shouldRedactEntry` exactly as `/catalog.json`.
**Test:** `change` events (set/update/setAnchored/clearAnchored/delete) drive row creation/`seedState` flips with no manual calls; `updateRow` keeps one row per appKey. `buildCapabilityDoc` with `indexRoom` still passes `verifyCapabilityDoc` and adds **no** new verifier divergence. `GET /index/pins` matches the P2P `list()` byte-for-byte; `/catalog.json` snapshot unchanged.

### Phase 5 — Relay directory + client bootstrap + verification rows (3–4 d)
**Deliverable:** `relay-directory` schema + heartbeat (with `capabilitySig`); `verification` schema + verifier-peer-as-writer; `GET /index/relays` + `/index/verifications`; `relay-client.listRelays()` replaces the hardcoded list (bootstrap from one seed relay, self-populate `setRelays()`); `backend/index-room-client.js`; `loadCatalogIndexRoom` + `CMD_LOAD_CATALOG_INDEX` + `hiveindex://`. **Requires a well-known bootstrap relay z32/gatewayUrl baked in** (open question §8).
**Test:** `listRelays()` bootstraps and self-populates; circuit breaker still trips on a dead directory entry. `relay-directory` rows re-verify via `verifyCapabilityDoc` against `capabilitySig`. `verification` rows replicate from an invited verifier peer; `[?verdict==`diverge`]` surfaces flagged apps. Relay without the plugin → client falls back to `/catalog.json`, no errors.

### Phase 6 — Cutover + migration + deprecation (2–3 d)
**Deliverable:** flip the default catalog to the sheets `z32` (Phase A2); `scripts/migrate-catalog-to-sheets.js` + `scripts/migrate-bee-to-room.js`; auto-seed on first Apps-tab visit; mark `CMD_LOAD_CATALOG_BEE` + autobee trio as legacy (remove only after telemetry shows zero legacy loads); move `pending-seeds.json` read path to `/index/pins`.
**Test:** every legacy `/catalog.json` entry becomes a valid `apps`/`app-manifest` row (type inferred, driveKey-or-link present, manifestHash computed, zero ajv failures); old Hyperbee/Autobee catalogs still load (no regression).

**Critical path:** Phase 0 → 1 → 2 (catalogue user value ships after Phase 2). Phases 4–5 (backbone) depend only on Phase 0 and can run in parallel with 1–3 if a second engineer is available. Phase 6 depends on 1–5. Total: ~18–25 engineer-days serial; ~12–15 with two engineers parallelizing catalogue vs backbone.

---

## 8. Risks + Open Questions

### Risks

1. **Bare/ESM dependency surface (HIGH, Phase 0 gate).** `schema-sheets` is ESM under a CommonJS Bare backend; a transitive dep may use a Node-only API, and `keet-identity-key` attestation must run under Bare. *Mitigation:* smoke-import under Bare in Phase 0 before any other work; if attestations fail under Bare, they become Node-relay-only (verification still works server-side).
2. **JMESPath injection (HIGH).** JMESPath built from raw user text is an injection/exfiltration surface. *Mitigation:* build from a constrained whitelist template (whitelisted fields, escaped literals), never concatenate raw input; cap result size. Covered by Phase 2 tests.
3. **Open multiwriter on a public room (HIGH).** Without gating, anyone with the link writes to the canonical catalogue → spam. *Mitigation:* ship curated mode (operator-only writer; community → `app-suggestions`) — a real design fork, settled in Phase 3.
4. **Write amplification / Autobase growth (MEDIUM, backbone).** Every `AppRegistry change` (incl. periodic anchor checks) becomes an append; `updateRow` has no in-place mutate. *Mitigation:* debounce anchor-check writes (only on material `anchoredLength` change); lean on the 5s `AppRegistry` save debounce as the batching boundary.
5. **Trust: a malicious room writer can inject fake rows (MEDIUM).** Membership gates *who* writes, not truthfulness. *Mitigation:* clients re-verify — `relay-directory` rows via `capabilitySig`/`verifyCapabilityDoc`, manifest rows via keet attestations, anchored claims via `auditAnchors`/`/api/anchors/<key>/proof`. **The room is an index, not an authority.**
6. **Eventual consistency (MEDIUM).** A just-submitted app may not appear instantly; no 15s blind-wait. *Mitigation:* optimistic UI insert + `base.update()` refresh + a "syncing" indicator.
7. **Room-key exposure / redaction (MEDIUM, backbone).** The deterministic room key is computable by anyone (intended for the public read-only room) — operators must NOT put private entries in it; respect `_shouldRedactEntry`/`redactPrivate` exactly as `/catalog.json`.
8. **`manifestHash` is advisory (MEDIUM).** A malicious publisher can claim any hash; real authenticity needs verifying it against the actual app drive at install time (`app-manager`). The field alone is advisory until that check lands.
9. **JMESPath full-scan at scale (MEDIUM).** `list()` pulls all rows into memory then filters. *Mitigation:* push pagination into the HTTP `/index/*` and `CMD_SHEETS_LIST` routes (reuse `/catalog.json`'s page/pageSize pattern).
10. **Forward-compat (`additionalProperties`) (MEDIUM).** No "retain unknown" semantics. *Decision (reconciled):* `apps`/`relay-directory`/`verification` strict (`false`); `pin-registry`/`app-manifest` permissive (`true`) for cross-relay forward-compat.
11. **z32 link is public-by-design (LOW).** Embeds the encryption key; cannot be unlisted once shared — document explicitly.
12. **Boot/bundle cost (LOW).** schema-sheets pulls `hyperdb`+`autobase`+`@jmespath-community/jmespath`; verify it doesn't regress desktop boot vs the lightweight Hyperbee path (Phase 0 measurement).
13. **Determinism (LOW, backbone).** Autobase linearizes ops, but `addRow` `time` is wall-clock — clients must treat `time` as advisory, not a total order (same caveat as the autobee reducer).

### Open Questions (with recommended defaults)

1. **Curated vs open for the CANONICAL room.** *Recommend: curated* (relay operator is sole writer; community → `app-suggestions`). Must settle before Phase 6 cutover.
2. **"My Catalog" future.** Stay a writable Hyperdrive, become the user joining the canonical room as a writer, or their own sheets room? *Recommend: leave Hyperdrive as-is in v1; revisit after Phase 3.* Decides whether `CMD_MYCATALOG_*` is retired or re-pointed.
3. **Trending in v1 or v2?** *Recommend: v2 (none in v1)* — telemetry is privacy-sensitive; ship only recent + by-category. If v1, require an opt-in/aggregate-only event model.
4. **Icon strategy.** Inline `data:` URI (simple, bloats Autobase) vs lazy drive-path fetch (no bloat, needs the drive online). *Recommend: drive-path fetch as default,* `data:` URI capped at 8KB only for tiny launch-only apps.
5. **Does the gateway expose HTTP `/v1/catalogue/<z32>` / `/index/manifests` JSON, or do desktops always read over the swarm?** *Recommend: expose HTTP* for cold-start latency; P2P is the fallback when the gateway is down. (Reconciled in §6 — they are the same data.)
6. **`verification` enum: writable or derived?** *Recommend: derived* — `relay-listed` settable only by the relay writer, `author-signed` only via a valid attestation, `unverified` default.
7. **One room per relay vs one shared global room.** *Recommend: per-relay rooms (each relay sole writer) + client-side merge,* avoiding shared-room membership/conflict policy. Confirm scale expectations.
8. **Bootstrap discovery.** Per-relay self-published directories need at least one well-known bootstrap room z32 / seed `gatewayUrl` baked in to replace the single hardcoded `127.0.0.1:9100`. Must resolve before Phase 5.
9. **Index-room plugin vs desktop-bootstrap mount.** *Recommend: plugin via `core/plugin-loader.js`* ("no fork") — confirm the plugin API exposes `appRegistry`/`seedingRegistry`/`reputation` events.
10. **Anchor-proof binding.** Should `verification` rows REQUIRE a valid `anchorProofSig` (relay validates in a custom route) before acceptance, or accept any writer's verdict and let clients filter? *Recommend: accept + client-filter in v1; tighten later.*
11. **Migration cadence.** Auto-ingest legacy Hyperbee/Hyperdrive catalogs on relay boot (risks duplication across the room and `/catalog.json`) vs publisher-opt-in via the migrate script. *Recommend: publisher-opt-in* to avoid duplication.
12. **Cross-room dedup policy.** `uuid`-only (no cross-room collapse) vs collapse by `driveKey` (and which row wins). *Recommend: uuid-only in v1; opt-in driveKey collapse later, winner = most attestations then relay-listed then highest version.*
13. **Confirm `find()` forwards `reverse`/`limit`** to the HyperDB iterator so `recent` pages server-side; if not, add pagination in the wrapper (Phase 0).
