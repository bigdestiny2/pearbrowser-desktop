# HiveRelay Backbone — Relay-Side Response (Index Layer built)

**From:** the `p2p-hiverelay` operator/relay engineer.
**Re:** [`HIVERELAY-BACKBONE-HANDOVER.md`](./HIVERELAY-BACKBONE-HANDOVER.md) (Schema-Sheets Index Layer).
**Status:** relay side **built + tested** — `P2P-Hiverelay#74` (branch `feat/index-layer`). Additive, off by default.

> ⚠️ **Off-GitHub** (same as the handover): names relay operator/ops details. Keep private / share directly.

---

## 1. TL;DR — the contract is met, with two corrections you must wire

The desktop's §2 dependencies are satisfied, **but two things differ from the
handover and change your client code**:

1. **`gatewayUrl` now lives in the capability doc.** The handover's
   `relay-directory` schema made `gatewayUrl` required, but `buildCapabilityDoc`
   never emitted one. We added it (additive; `schemaVersion` stays 1). Read it
   from `doc.gatewayUrl`. A relay whose operator hasn't configured a public URL
   emits `gatewayUrl: null` and simply **won't appear** in `/index/relays`.
2. **`relay-directory` rows carry the full signed doc — re-verify against THAT, not the projected fields.** A row's projected view (`health`, `capacity`,
   `reputation`, normalized `gatewayUrl`) is **lossy** and drops/derives fields,
   so it **cannot** reconstruct the signed payload. Each row therefore includes
   the original signed capability doc verbatim under **`row.doc`**. Re-verify
   with `verifyCapabilityDoc(row.doc)` and only then trust the derived view.
   `row.capabilitySig` is a convenience copy of `doc.signature`, **not**
   sufficient for verification on its own (the projected row lacks the signed
   field set, and the sig is keyed as `capabilitySig`, not `signature`).

---

## 2. The big architectural fact: the index is an out-of-process SIDECAR

The handover assumed `new SchemaSheets(node.store.namespace(...))` run in-process
via `core/plugin-loader.js`. **That is not viable on the current relay.** A spike
established that `schema-sheets@3` is built on **corestore-7 / hypercore-11 /
ajv-8**, which collide with the relay's **corestore-6 / hypercore-10 / ajv-6**
(an in-process install crashes — `ajv-formats@3` binds the relay's ajv-6).

So the index runs as a **dependency-isolated sidecar process**
(`services/index-sidecar`, `p2p-hiverelay-index`) with its own `node_modules` and
its own corestore-7 store. It reads the relay's public HTTP (`/catalog.json`,
`/.well-known/hiverelay.json`), projects rows into the room, serves the §2 query
routes, and the relay reverse-proxies `/index/*` so you still hit a single
`gatewayUrl`. This bridges until the relay's own hypercore-11 migration lands,
after which it can move in-process as originally envisioned.

**For you this changes nothing about consumption:** the room is a normal
schema-sheets room. Note it is **corestore-7 / hypercore-11** — your client is
already that generation (you use schema-sheets), so blind-replication is direct.

---

## 3. What's implemented (§2 conformance)

| Contract item | Status / note |
|---|---|
| `indexRoom` in capability doc | ✅ additive, signed, `schemaVersion` 1; also in `/catalog.json` envelope |
| `GET /api/index/room` | ✅ `{ indexRoom, discoveryKey, schemas, queries }` |
| `GET /index/pins\|relays\|manifests\|verifications` | ✅ (relay-proxied to the sidecar) |
| filters `?query=` `?type=` `?gte=` `?lte=` | ✅ — see §4 for exact semantics |
| pagination | ✅ `page`/`pageSize` + `total`/`totalPages`/`hasNext`/`hasPrev` |
| public read-only room (no enc key) | ✅ blind-replicate with the `z32` key only |
| `/catalog.json`, `/v1/hyper/*`, `/.well-known` unchanged | ✅ |
| 4 schemas (pin-registry, relay-directory, app-manifest, verification) | ✅ per §3.2 |

---

## 4. Query semantics (read before you build the query UI)

- **`?query=`** is a **FILTER**, not a projection. A row is included iff the
  JMESPath expression matches it (the documented `[?field=='x']` style works);
  the row payload is returned **intact**. Projection-style queries (e.g.
  `pubkey`, `[].x`) are treated as filters, never as a reshape — so the response
  rows are always the full objects. An invalid expression → `400`.
- **`?type=`** convenience filter on the row's `type`.
- **`?gte=`/`?lte=`** bound the **projection write-time** (the value surfaced as
  `_updatedAt`), **not** a content field like `publishedAt`. Don't use them to
  range over content time.
- Rows include `_uuid` and `_updatedAt` meta alongside the schema fields.

---

## 5. Answers to the handover's §6 decisions

1. **🚧 Bootstrap relay (§6.1)** — operator config; the canonical bootstrap
   `gatewayUrl` + `indexRoom` z32 to bake into the client is **TBD on our side**
   (one decision pending). Will send the values directly.
2. **Plugin API surface (§6.2)** — moot: the sidecar reads the relay over HTTP,
   not via plugin-loader. (FWIW the registries are reachable via `start(ctx).node.*`, not the constructor — but you don't need that.)
3. **Curated, per-relay room (§6.3/§6.4)** — yes. Sidecar is the sole writer;
   membership name `relay:<pubkey-prefix>`.
4. **Verifications (§6.5)** — accept + client-filter in v1.
5. **Bare/ESM (§6.6)** — non-issue relay-side (sidecar runs on Node).

---

## 6. Deferred to Phase 2 (not in this build)

- `pin-registry` `pending`/`rejected` states (need the operator-authed
  pending-seeds feed; v1 projects only `accepted`/`anchored`/`unseeded`).
- `verification` rows from invited verifier peers (multi-writer room).
- deterministic room key (today: created once + persisted + advertised).
- Autobase input-log rotation (debounce bounds churn; long-term growth TBD).

---

## 7. Where things are

- Relay design + spike numbers + tier model: `docs/INDEX-LAYER.md` in the
  `p2p-hiverelay` repo (PR `#74`).
- Tiering for fallback: Tier-0 `/catalog.json` → Tier-1 `catalogBeeKey`
  (Bare-native Hyperbee, shipped v0.18.0) → Tier-2 `indexRoom` (this). A relay
  with no sidecar omits `indexRoom`; fall back to Tier-1/0.
