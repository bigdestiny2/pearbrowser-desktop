# HiveRelay Backbone — Schema-Sheets Index Layer (Handover)

**Audience:** whoever owns the HiveRelay backbone (`p2p-hiverelay` operator / relay engineer).
**Status:** design complete, ready to build. **Scope:** additive, **no fork of `p2p-hiverelay`.**
**Full design:** [`HIVERELAY-SCHEMA-SHEETS-DESIGN.md`](./HIVERELAY-SCHEMA-SHEETS-DESIGN.md) (Design B, §5/§6/§8).

> ⚠️ **Off-GitHub:** this doc + the design name relay operator/ops details. Keep it in a
> private repo or share directly — do not push to a public remote.

---

## 1. What we're building (one paragraph)

Mount **one [`schema-sheets`](https://www.npmjs.com/package/schema-sheets) room per relay**
(`node.indexRoom`) next to the existing `appRegistry` / `seedingRegistry` / `reputation`,
as a **queryable, signed P2P mirror** of those registries. The registries stay the
**write-through source of truth** (durability + the HTTP fast-path are untouched); the room
is a read-optimised, JMESPath-queryable, signed index that clients (and other relays) can
replicate and query — over the swarm **or** the gateway. schema-sheets is by **ryanramage**;
the pattern (P2P apps + a queryable room) is from **Drache93's Pear Browser**.

This replaces the desktop's hardcoded relay list and flat-file reads (`forks.json`,
`pending-seeds.json`) with a discoverable, structured, verifiable layer — **additively**.
A relay without the plugin simply omits the `indexRoom` field; clients fall back to
`/catalog.json`. Optional on both ends.

---

## 2. The integration contract (what the desktop will consume)

The desktop client side (Phases 4–5 on our end) depends on exactly these from the relay:

1. **`indexRoom` in the capability doc.** Add one **additive** field to `buildCapabilityDoc`
   output: `indexRoom: "<z32>"` (the room link). `schemaVersion` **stays 1**; the signature
   canonically covers it; the verifier already ignores unknown fields. Nothing else in the
   capability doc changes.
2. **Gateway query routes** (HTTP fast-path, GET, server-side `list()` over the room):
   - `GET /api/index/room` → `{ indexRoom:"<z32>", schemas:[…], queries:[…] }`
   - `GET /index/pins?query=&gte=&lte=&type=` → `pin-registry` rows
   - `GET /index/relays` → `relay-directory` rows  ← **the bootstrap the desktop needs to kill its hardcoded `127.0.0.1:9100`**
   - `GET /index/manifests?query=…` → `app-manifest` rows (this is *also* the catalogue read path — see §4)
   - `GET /index/verifications?query=…` → `verification` rows
   - Pagination: reuse `/catalog.json`'s `page`/`pageSize` pattern (rows are full-scanned then JMESPath-filtered).
   - `/catalog.json`, `/v1/hyper/:key/*`, `/.well-known/hiverelay.json` are **unchanged** (verifier depends on them).
3. **The room is public read-only.** Ship it **without** an encryption key so clients
   blind-replicate read-only (`z32 = key32` only, no enc key). Respect `_shouldRedactEntry` /
   `redactPrivate` exactly as `/catalog.json` does — never put private entries in the room.
4. **At least one well-known bootstrap relay** (`gatewayUrl` and/or `indexRoom` z32) baked
   into the client, so `relay-client.listRelays()` has a seed to self-populate from. **This
   is the one blocking decision — see §6.**

If the relay provides (1)–(4), the desktop's relay-directory bootstrap, P2P catalogue, and
verification UI all light up. Everything else below is the relay-side implementation.

---

## 3. The relay-side build (Phases 4–5)

Run as a plugin (`p2p-hiverelay-index`) via the existing **`core/plugin-loader.js`** — no
core changes. It instantiates `new SchemaSheets(store.namespace('hiverelay-index'), roomKey)`
and subscribes to events the relay **already emits**.

### 3.1 Room key + membership
- Room key = `sodium hash(relay_pubkey ++ 'hiverelay-index-room-v1')` → stable across
  restarts, deterministically discoverable. Publish its `z32` as `indexRoom` in the capability doc.
- **Curated:** the relay calls `join('relay:<pubkey-prefix>')` once at boot; only the relay
  (+ invited verifier peers) are writers. Run a headless indexer so the room stays durable
  with no other writer online (Drache93 uses `BlindPeering.addAutobaseBackground`; do the same).

### 3.2 Four schemas (`addNewSchema`)
- **`pin-registry`** — one row per `appKey` (`updateRow` on state transitions; keep an in-mem
  `Map<appKey,rowUuid>`). Fields incl. `appKey`(req), `type`, `name`, `version`, `sizeBytes`,
  `anchored`, `anchoredLength`, `seedState`∈`{pending,accepted,anchored,unseeded,rejected}`
  (folds in `pending-seeds.json`), `relayPubkey`, `verified`(derived). `additionalProperties:true`.
  Time index = pin-event time. Source: `AppRegistry change` + `seedingRegistry.getActiveRequests()`.
- **`relay-directory`** — one row per relay, a thin **signed projection of `buildCapabilityDoc`**:
  `pubkey`(req), `gatewayUrl`(req), `software`, `version`, `region`, `features`, `limitation{}`,
  `health{anchoredCount,totalCount,anchorRatio,lastSeen}`, `capacity{}`, `reputation{}` (from
  `reputation.getRecord`). **Copy `doc.signature` into `json.capabilitySig`** so clients
  re-verify via `verifyCapabilityDoc` **without trusting the room writer.** `additionalProperties:false`.
  Heartbeat every N seconds; time index = `lastSeen`.
- **`app-manifest`** — the install/launch contract, **unified with the desktop's `apps`
  schema** (§4): `appId`(req), `name`(req), `driveKey`|`link` (`anyOf` — both installable &
  launchable), `type`∈`{standalone,hypersite}`, `manifestHash`, `author`, `version`, `icon`,
  `categories`, `publisherPubkey`, `publishedAt`, `sizeBytes`. `additionalProperties:true`.
- **`verification`** — verifier verdicts: `subjectAppKey`(req), `verifierPubkey`(req),
  `verdict`∈`{agree,diverge,anchored,unanchored}`(req), `method`∈`{capability-divergence,
  anchor-proof,catalog-divergence}`, `anchorProofSig`, `attestedAt`. `additionalProperties:false`.
  Plus built-in `addRowAttestation` on `app-manifest` rows for publisher/verifier keet signatures.

### 3.3 Wiring (event-driven, zero registry changes)
- `AppRegistry 'change'` → `addRow`/`updateRow` on `pin-registry` + `app-manifest`.
  **Debounce** anchor-check writes (only on material `anchoredLength` change) — lean on the
  existing 5s `AppRegistry` save debounce as the batching boundary (avoids Autobase write-amp).
- `reputation.getRecord` → `relay-directory.reputation` each heartbeat.
- New HTTP routes in `core/relay-node/api.js _handle` (same `if (path === …)` GET style).
- Verifier (`p2p-hiverelay-verifier`): **unchanged** for HTTP checks. Optional new
  `verifyManifestAttestation(manifestRow, attestationRow)` re-running `Identity.verify`. A
  verifier peer invited as a room writer can write `verification` rows.

---

## 4. The key reconciliation: the relay serves AND pins the catalogue

The **canonical app catalogue** (desktop Design A) is **itself a schema-sheets room the relay
pins** — `pinSheetsBestEffort(roomKeyHex, sheets.base.discoveryKey)` → the same
`hiveRelay.seed(keyHex,{replicas:3,discoveryKey})` used for drives (`index.js:1500`). So the
relay's `/index/manifests` route and the desktop's catalogue room are **the same data over the
same gateway — not two stores.** A headless indexer keeps it durable with no writer online,
which **fixes the autobee "catalogue vanishes when writers go offline" failure.** The
`app-manifest`/`apps` schema is **one shared schema** (§3.2), so there's one mapper and one
migration path.

---

## 5. KEEP — do not touch

- The **seeding engine** (`AppRegistry`, `seedingRegistry`, seed/unseed protocol) — durability
  source of truth. The room only **observes** `change` events.
- The **HTTP gateway fast-path** (`/v1/hyper/:key/*`, `/catalog.json`) — verifier depends on it.
- The **verifier**'s independence: `verifyRelays` / `compareDrive` / `auditAnchors` /
  `fetchAnchorProof` + the `hiverelay-anchor-proof-v1` tag.
- **Proof-of-relay / custody** (`verifyCustodyEntry`), `capability-doc.js` signing (sodium
  detached, TOFU), `seeding-manifest.js`, `fork-detector.js` + `forks.json`.
- `pending-seeds.json` stays a **local write-ahead buffer** — only its *client read path*
  moves to `/index/pins`.

The room is an **index, not an authority**: clients re-verify relay rows via `capabilitySig`,
manifest rows via keet attestations, anchored claims via `auditAnchors` / the anchor-proof route.

---

## 6. Decisions needed from the relay side (blockers marked)

1. **🚧 BOOTSTRAP (blocks the desktop's Phase 5).** Bake at least one well-known relay
   `gatewayUrl` + `indexRoom` z32 into the client to replace the single hardcoded
   `127.0.0.1:9100`. Which relay is the canonical bootstrap?
2. **Plugin API surface.** Confirm `core/plugin-loader.js` exposes `appRegistry` /
   `seedingRegistry` / `reputation` (with their `change`/event emitters) to a plugin. If not,
   what's the supported hook?
3. **Curated vs open** for the per-relay index room. *Recommended: curated* (relay sole writer;
   community → `app-suggestions` / invited verifier peers).
4. **One room per relay + client-side merge** vs one shared global room. *Recommended: per-relay*
   (each relay sole writer, avoids shared-room conflict policy).
5. **Anchor-proof binding.** Should `verification` rows REQUIRE a valid `anchorProofSig` (relay
   validates in a custom route) before acceptance, or accept any writer's verdict and let
   clients filter? *Recommended: accept + client-filter in v1.*
6. **Bare/ESM smoke (shared gate with the desktop).** `schema-sheets` is ESM with
   `hyperdb`/`autobase`/`jmespath`/`ajv`/`keet-identity-key` transitive deps; confirm they run
   under the relay's runtime, and that `keet-identity-key` attestation works there. (The desktop
   solves the same under Bare by bundling to CJS — see Phase 0.)

---

## 7. Risks to watch

- **Write amplification / Autobase growth** — every `change` is an append; `updateRow` has no
  in-place mutate. Debounce to material changes only.
- **Trust** — membership gates *who* writes, not truthfulness; the room is a signed index, not
  an oracle. Clients must re-verify (capability sig / attestations / anchor proofs).
- **Room-key exposure** — the deterministic key is public by design (read-only room); never put
  redactable/private entries in it.
- **Eventual consistency** — a just-written row may lag; expose `base.update()` + a sync indicator.

---

## 8. Where things are

- Full design + phased plan + schema field lists: [`HIVERELAY-SCHEMA-SHEETS-DESIGN.md`](./HIVERELAY-SCHEMA-SHEETS-DESIGN.md) §5, §6, §7 (Phases 4–5), §8.
- Relay core: `p2p-hiverelay` `0.20.2` from the local HiveRelay workspace — `core/index.js`, `core/relay-node/api.js`, `core/plugin-loader.js`.
- Verifier: `p2p-hiverelay-verifier`. Client: `p2p-hiverelay-client`.
- Desktop integration points it consumes: `backend/relay-client.js`, `backend/catalog-manager.js`, `backend/index-room-client.js` (new).
- schema-sheets reference usage: Drache93's Pear Browser `app.js`.
