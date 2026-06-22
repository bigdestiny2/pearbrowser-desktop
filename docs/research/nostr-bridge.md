# Nostr Bridge & Gateway for the Pear Ecosystem — Design Doc

> Status: design / pre-implementation · Author: lead designer · Date: 2026-06-17
> Reference patterns: [`docs/AUTOBEE-RESEARCH.md`](../AUTOBEE-RESEARCH.md), [`docs/P2P-SEARCH-RESEARCH.md`](../P2P-SEARCH-RESEARCH.md), `backend/autobee-catalog-{ops,apply,manager}.cjs`
>
> This revision re-grounds every codebase anchor against the live tree (the file grew; several
> `index.js` line numbers in earlier drafts were stale — corrected throughout and flagged in §3).
> Note: `backend/index.js` is currently modified-but-uncommitted (`git status` shows `M`); the
> `index.js` anchors below describe the working-tree state on 2026-06-17. Anchors in every other
> file are committed and verify exactly.

> **Current implementation note (2026-06-22):** a desktop trusted-contact Nostr
> bridge subset has since landed: deterministic Nostr keys, binding/revoke
> records, local event storage, ingest, and trusted feed aggregation. This
> document remains the broader design for a public gateway/NIP expansion. See
> [`../ARCHITECTURE_AND_CAPABILITIES.md`](../ARCHITECTURE_AND_CAPABILITIES.md).

---

## 1. Executive Summary

This document specifies a **Nostr bridge and gateway** for PearBrowser: a Bare-side backend module plus a page-facing API that let Pear users participate in the [Nostr](https://github.com/nostr-protocol/nips) network — publish and read signed events, follow authors, discover apps via NIP-89 handlers, optionally receive Lightning zaps — while preserving Pear's offline-first, no-central-server, P2P posture. The hard constraint that shapes the entire design is a **curve mismatch**: Pear's identity stack is Ed25519 (`backend/identity.js`), while Nostr mandates secp256k1/BIP-340 Schnorr ([NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)). **The two curves share no key and no derivation that makes them "the same."** The bridge therefore maintains a *separate, deterministically-derived* secp256k1 Nostr keypair and a **mutually-signed, revocable attestation** binding it to the Pear Ed25519 **root** identity — and this binding is irreducibly a *trust assertion*, never a cryptographic proof of "same human." The UI must say **"linked (attested)"**, never "verified."

Ingested Nostr events are reduced through the **exact append-log + deterministic-reducer pattern just shipped for the Autobee catalogue** (`backend/autobee-catalog-{ops,apply,manager}.cjs`): a pure NIP-01-validating op schema, a **wall-clock-free** reducer that orders by writer+seq (never `created_at`), and a verify-and-drop ingest edge that mirrors `index-room-client.js`. The bridge is **HiveRelay-native first** — events live in a content-addressed, Hyperdrive-shaped Pear store that the always-on backbone AutoHeals — with an **optional, flagged** legacy `wss://` relay transport over the already-declared `bare-ws`, fronted by the same circuit-breaker discipline as `relay-client.js`. Web apps get a NIP-07-style `window.pear.nostr` signer injected by `hyper-proxy.js`, with the secret `nsec` sealed in the worklet (page never sees it, exactly as the Ed25519 root is sealed today). Rollout is phased; every phase is independently shippable and the risky pieces (Schnorr, page signer, legacy relays, payments) ship behind feature flags, with a byte-exact NIP-01 fixture-vector gate before anything depends on Schnorr.

---

## 2. Problem & Why It Matters

PearBrowser today is a self-contained P2P application platform: apps are Hyperdrives, identity is a sealed Ed25519 root (`backend/identity.js`), discovery runs over HyperDHT/Hyperswarm, and durability comes from HiveRelay. What it has **no** answer for is **interoperable social presence and cross-ecosystem discovery**. There is no feed, no follow graph, no way for a Pear user or app to be *addressed and discovered by people outside the Pear network*, and no bridge to the largest open, censorship-resistant social protocol that already solved key-based identity and relay fan-out.

Nostr matters here specifically because it is **structurally the same shape as Pear's own primitives**:

- A Nostr **event is a single signed append-log entry** — the same mental model as a Hypercore block or an Autobase op.
- A Nostr **relay is a non-authoritative replication point**, not a source of truth — exactly HiveRelay's "always-on signed seed" role, and exactly the "relay is an index, not an authority" stance already enforced in `backend/index-room-client.js` (verify-and-drop, `:126–128`).
- Nostr's **replaceable / addressable events** (`d`-keyed `kind:30023`, `naddr` coordinates) are the *same* "latest-wins keyed record" pattern as the Autobee catalogue reducer's `app!<id>` upsert.
- Nostr's **NIP-89 app handlers** (`kind:31990` manifest + `kind:31989` social endorsement) map almost 1:1 onto the planned catalogue endorsement work and the existing `app-manifest` index-room schema.

A bridge is therefore not bolting on a foreign system — it is **translating between two append-log/relay architectures that already agree on first principles**, with one genuine friction (curve mismatch) and a handful of trust/freshness seams to manage. The payoff: Pear users get a portable social identity and a discovery surface reaching the entire Nostr world; Pear apps get a Nostr-native "open with…" and endorsement channel; and HiveRelay can optionally *become* a Nostr relay façade, turning Pear's backbone into infrastructure the wider Nostr ecosystem can use.

---

## 3. Current State in Our Codebase (grounded)

At the time of this 2026-06-17 design, there was **no feed / social / Nostr / secp256k1 / Schnorr / WebSocket-relay code anywhere in the tree.** The current desktop branch now has a trusted-contact bridge subset, while the broader public gateway described below remains design work. Everything below should be read as the original seam analysis into working machinery. **All line anchors below were verified against the live working tree on 2026-06-17;** `index.js` anchors reflect its modified-but-uncommitted state, all other files are committed and verify exactly.

### 3.1 Identity — `backend/identity.js`
A complete Ed25519 stack, BIP-39 backed. `class Identity` (`:117`), instantiated **once** at boot: `identity = new Identity(storagePath)` (`index.js:1530`).
- Root seed: `entropyToSeed` (`:111`) = `SHA-512(entropy).slice(0,32)` — a *simplified, non-PBKDF2* derivation (file comment `:105–113`). `getSigningKeypair()` (`:201`) via `sodium.crypto_sign_seed_keypair`. The root keypair is cached and **never leaves the worklet** (`:197–200`).
- Deterministic per-app subkeys: `getAppKeypair(driveKeyHex)` (`:229`) — `subSeed = SHA-256(rootSeed ‖ "pear-app-v1:" ‖ driveKeyHex)` (`:239–243`), cached in `this._appKeypairs` (`:235`). Same user+app → same pubkey forever; different apps → uncorrelated pubkeys.
- Signing: `sign(payload)` (root, `:292`) and `signForApp(driveKeyHex, payload, namespace='')` (`:262`) with domain-separator tag `pear.app.<driveKeyHex>:<namespace>:` (`:264`). Both reject empty and cap at 64 KB (`:269–270`), and return `{ signature: hex, publicKey: hex, algorithm: 'ed25519', tag? }` (`:274–279`).
- **Gaps confirmed:** (a) **no `verify()`** on `Identity` — `crypto_sign_verify_detached` is bundled in `sodium-universal` but unsurfaced. (b) Subkeys have **zero cryptographic link** to the root pubkey (the `subSeed` hash is one-way). (c) Ed25519 only; **Nostr needs secp256k1/BIP-340 — no key reuse, no shared derivation path is possible.**

### 3.2 Append-log + deterministic reducer — `backend/autobee-catalog-{ops,apply,manager}.cjs`
The reference pattern the bridge mirrors file-for-file. Verified:
- **`-ops.cjs`** (pure, `.cjs` so it loads under Bare *and* Node-test): `SCHEMA_VERSION = 1`; ops carry `v` (`:14`); `MAX_OP_BYTES = 16*1024` (`:21`). `hasUnsafeKey` (`:34`) recursively rejects `__proto__/prototype/constructor`. `sanitizeApp` (`:49`) whitelists+clamps every field. `validateOp` (`:89`) returns a three-way verdict: `{ok:true}` (apply) / `{ok:false, retain:true}` (keep in log, ignore in view — forward-compat for unknown versions/types) / `{ok:false, retain:false}` (reject before append). **No wall-clock anywhere.**
- **`-apply.cjs`** (pure reducer): `linearize(tagged)` (`:26`) totally orders by `(seq, writer, stableStringify(op))` — **never time**. `applyView` (`:35`) folds ordered ops; `toCatalogData` (`:67`) projects to the shared DTO.
- **`-manager.cjs`**: `AutobeeCatalogManager` (`:19`) wraps `new Autobase(store, bootstrap, { open, apply })` (`:32`); the `apply` fn records each op under `op!<paddedIndex>` and handles `writer.add` via `host.addWriter(...)`. `catalog()` (`:72`) re-materializes via the **pure** reducer — *Autobase owns ordering+replication, PearBrowser owns conflict semantics, "they can't drift."*

A **second** production multi-writer append-log already exists: `backend/pear-bridge.js` "Sync Groups" — `createSyncGroup(appId, applyFn)` (`:54`), exposed to pages via `/api/sync/*`.

### 3.3 Heterogeneous-source aggregation — `backend/catalog-manager.js`
`CatalogManager` — `new CatalogManager(store, swarm)` at **`index.js:1620`** (earlier drafts said `:1508`/`:1590` — **stale, corrected against the working tree**). The canonical "many P2P sources → one normalized DTO" example: five source types (Hyperdrive `catalog.json`, Hyperbee KV, Autobee op-log, schema-sheets room, relay index room), all producing `{ version, name, apps[] }`. `getAggregatedApps()` (`:458`) merges+dedups by `app.id`, **higher version wins** (`_versionGreater :519`); id-less rows never dedup. The merge/sort/dedup discipline is exactly what a feed view needs.

### 3.4 Relay / DHT backbone
- **`backend/relay-record.js`** — `resolveRelayRecord(dht, pubkey)` (`:39`): `dht.mutableGet(key)` **signature-verifies** an Ed25519-signed `{gatewayUrl, indexRoom}` record (`:7–9`, *"a malicious DHT node can only serve stale data, never forge"*). `resolveBootstrapRelays(dht, seeds)` (`:60`). Node-safe (b4a-only) for unit tests.
- **`backend/index-room-client.js`** — `IndexRoomClient` (`:61`): read-only schema-sheets consumer; `INDEX_SCHEMAS = ['relay-directory','app-manifest','verification','pin-registry']` (`:30`). Pluggable `verify(doc)` hook (`:65`); `listRelayDirectory` **re-verifies every signed row and drops the rest** (`:126–128`, `if (!verified) continue`). `manifestRowToApp` (`:42`) maps rows → app DTO. The room is joined **read-only** (`swarm.join(dk, { server:false, client:true })`, `:79`). **A `nostr-event` schema and a NIP-65 relay-list schema are natural additions here.**
- **`backend/relay-client.js`** — `RelayClient` (`:13`): HTTP fast-path with **per-relay circuit breakers** (`_maxFailures=3`, 60 s reset), `fetch` with exponential backoff, `requestSeed` (pin POST), `listRelays`/`bootstrapFromDht` discovery. The circuit-breaker logic is the resiliency template for a flagged legacy `wss://` pool.
- **Boot wiring (corrected):** `DEFAULT_RELAYS` at **`index.js:1697`** (earlier drafts `:1566`/`:1648` — **stale**); `relayClient = new RelayClient(...)` at **`:1702`**; fire-and-forget `relayClient.bootstrapFromDht(swarm.dht, C.BOOTSTRAP_RELAYS)` at **`:1720`** feeds discovered index rooms into `catalogManager.loadCatalogIndexRoom`. `BOOTSTRAP_RELAYS` lives in `constants.js`.
- **HiveRelay durable pin:** `hiveRelay.seed(keyHex, { replicas: 3, timeout, discoveryKey })` at **`index.js:515`** (inside a `pinDriveBestEffort`-style helper) and **`:1878`**; this pin path is called after catalog writes. **Caveat (P2P-SEARCH-RESEARCH §3, internal/unverified): HiveRelay is documented to AutoHeal Hyperdrive-shaped cores but only best-effort raw-seed bare Hyperbee/Autobase — durable event/binding mirrors should therefore be Hyperdrive-shaped. The `hiveRelay.seed(key,{replicas:3})` pin path is confirmed present in tree; the AutoHeal-vs-raw-seed asymmetry is sourced only to an internal research doc and is not independently verified against a primary HiveRelay source.**

### 3.5 Page-facing surface — `hyper-proxy.js` + `http-bridge.js` + `pear-bridge.js`
- **`hyper-proxy.js`** `_injectHtmlHead(content, driveKeyHex, reqPath)` (`:340`) injects into every `text/html` response: `<base>`, a per-page `pear-api-token` meta (`issueApiToken`, `:344`), the always-on `window.pear.swarm.v1` shim, and the gated `window.pear.anongpt` shim. `injectCspShimHashes` (`:125`) auto-adds CSP `script-src 'sha256-…'` hashes so shims run under strict CSP **without `'unsafe-inline'`**. Shims set at boot via `setPearSwarmShim` (`:209`) / `setAnongptShim` (`:219`); `setHttpBridge` (`:198`) routes `/api/*`.
- **`pear-bridge.js`**: `PEAR_SWARM_V1_SHIM` (`:519`), `PEAR_ANONGPT_SHIM` (`:680`), both exported at `:716`.
- **`http-bridge.js`**: `class HttpBridge` (`:15`); **every route gates on `_requireToken(req, res)`** (`:72`) — per-app auth. `GET /api/identity` (`:258`) returns the **per-app subkey** pubkey; `POST /api/identity/sign` (`:278`) calls `this._identity.signForApp(...)` (`:290`). `/api/swarm/*` shows the **SSE streaming pattern** (`SwarmBridge.attachStream`) — the template for a live `EVT_NOSTR_EVENT` push / `/api/nostr/subscribe` stream. `HttpBridge` constructed at **`index.js:1761`**.

### 3.6 RPC contract, constants, UI shell, scheme router, trust graph
- **`backend/rpc.js`** `WorkletRPC`: 8-hex length-prefixed JSON frames; `rpc.handle(cmd, fn)`, `rpc.event(evt, data)`. UI mirror `ui/rpc-client.js`.
- **`backend/constants.js`**: integer cmd/evt ids, dispatched in `index.js` via flat `rpc.handle(C.CMD_*, …)` blocks, **hand-mirrored in `ui/boot.js` `const C = {…}`** (`:25`). **Verified free blocks:** commands `188–199` are free (catalog/sheets/index use 10–19 + 170–176, sync 180–187, bridge 200–203); **events end at `EVT_PEAR_APP_EXITED = 108`, so `109+` is free** for an `EVT_NOSTR_*` block. The `boot.js` mirror likewise ends at `EVT_PEAR_APP_EXITED: 108` (`:119`).
- **`ui/lib/keys.js`**: `normalizeUrl` (`:122`), `parseCatalogRef(raw)` (`:138`) — scheme router mapping `autobee://`/`hyperbee://`/bare-key → `{key, bee, autobee, kind}`; z32⇄hex helpers (`z32FromHex :89`, `hexFromZ32 :94`). **A `parseNostrRef` (NIP-19 `npub`/`nevent`/`nprofile`/`naddr`) sits beside it.**
- **`ui/shell.js`**: top-level tabs are a single `TAB_META` object (`:96`) rendered via `Object.entries(TAB_META).map(...)` (`:3896`); each screen mounts via one line, e.g. `${tab === 'apps' && html\`<${Apps} rpc=${rpc} C=${C} .../>\`}` (`:3908`). The `Apps` component is the structural template for a `Feed`. **A "Feed" tab is one `TAB_META` entry + one mount line + a `Feed` component.**
- **`backend/contacts.js`**: `class Contacts` (`:22`); pubkeys are **the OTHER user's ROOT pubkey, not their per-app sub-key** (`:12`). `add({pubkey,…})` (`:71`); the invite ceremony rejects an invalid sig if present (`:120`). This is the Sybil-gate substrate, keyed on root pubkey.

### 3.7 Dependencies — `package.json` (verified)
| Need | Status |
|---|---|
| `autobase` 7.27.3, `hyperbee` 2.27.3, `hyperdrive` 13.3.2, `corestore` 7.9.2, `hyperswarm` 4.17.0, `b4a`, `bare-ws` 2.1.0 | **Declared** (`package.json:45–60`) |
| `hyperdht`, `sodium-universal`, `z32` | Present transitively (via hyperswarm/hiverelay); `swarm.dht` is live (`index.js:1720`) |
| **`@noble/secp256k1` 3.1.0** (Schnorr/BIP-340) | **Present ONLY as a `p2p-hiverelay` transitive** (`node_modules/p2p-hiverelay/package.json:60`) — **NOT a declared pearbrowser dep.** Must be **promoted to a declared dependency** and **vendored as a CJS bundle** (`secp256k1-bundle.cjs`) the way the schema-sheets bundle is — **dynamic `import()` is broken under Bare** (documented in `sheets-catalog.js`; build via a `scripts/build-secp256k1-bundle`). `@noble/hashes` 2.2.0 is alongside it (`:59`). |

---

## 4. Requirements & Constraints

**R1 — Bare runtime reality.** All backend code runs under Bare (Node-like, CommonJS). Pure logic modules ship as `.cjs` so they load under Bare *and* `node --test`. **No dynamic `import()`** — secp256k1/Schnorr must be a vendored CJS bundle.

**R2 — Offline-first / no central server.** A user must be able to author, sign, and queue events while fully offline; publication is best-effort and asynchronous. Truth lives in a local content-addressed store; relays (Nostr or Hive) are *replication points, never the source of truth*.

**R3 — Deterministic, wall-clock-free reduction.** The merged event view is computed by a **pure reducer ordered by writer+seq / monotonic epoch**, never `created_at` ([AUTOBEE-RESEARCH.md] rule, `autobee-catalog-apply.cjs`). `created_at` is **advisory, display-only**. This makes hostile reordering and clock-skew forgery unable to change the merged view.

**R4 — Cross-curve, key-sealed.** Ed25519 root and secp256k1 nsec both stay sealed in the worklet (`identity.js:197`). Pages sign via NIP-07 RPC; the `nsec` is never serialized to a page. Bindings attest the **root** Ed25519 pubkey, never a per-app subkey (subkeys carry no link to the human — §3.1 gap b).

**R5 — Verify-and-drop everywhere.** Every signature (Ed25519 *and* Schnorr) is re-checked at the ingest edge; failures are dropped, never logged-as-trusted. Transport membership (a schema-sheets room) is **never** authority — `sheets.join()` auto-promotes any keyholder on a writable room (we join read-only, but the discipline holds).

**R6 — Sybil/abuse pressure.** secp256k1 keys are free to mint. Trust is **social-graph-gated** via `contacts.js` (root-pubkey-keyed), **never PoW-based** (NIP-13 PoW is at most a low-tier admission filter). Bound influence by *attack edges, not node count*. Reuse `autobee-catalog-ops.cjs` hardening verbatim: byte caps, prototype-pollution scan, per-writer rate budgets, drop-a-writer-wholesale revocation.

**R7 — HiveRelay durability floor.** Durable event/binding mirrors should be **Hyperdrive-shaped** so they get AutoHeal; per internal research (P2P-SEARCH-RESEARCH §3, unverified against a primary source) bare Hyperbee/Autobase cores are only best-effort raw-seeded. Either way, the seed pin path itself (`hiveRelay.seed(key,{replicas:3})`) is confirmed present in tree (`index.js:515`/`:1878`); the Hyperdrive-shaping requirement rests on the internal-doc characterization and should be re-confirmed before it becomes load-bearing.

**R8 — Constant lockstep.** Any `CMD_NOSTR_*` / `EVT_NOSTR_*` must be added to **both** `backend/constants.js` (and its `module.exports`) **and** `ui/boot.js`'s `C` object, or the feature silently no-ops.

**R9 — Honest trust UX.** Linkage renders as **"linked (attested)"** + provenance + revocation state, **never** an absolute "verified." This is a contract, not a nicety (threat 1).

---

## 5. Prior-Art Survey

Filter labels in the table: relevance to a Bare/Pear bridge. Source numbers map to §11.

| System | Approach | Pros | Cons | Relevance to us | src# |
|---|---|---|---|---|---|
| **Nostr relays + events (NIP-01)** | Signed JSON events (secp256k1 **Schnorr**) over WebSocket relays; `REQ`/`EVENT`/`EOSE`/`OK`/`CLOSED` filter protocol | Dead-simple; huge existing relay/client network; durable store-and-forward; censorship-resistant via relay choice | secp256k1 ≠ our Ed25519 (needs parallel key/signer); relays semi-centralized & must be always-on; no holepunch/P2P; spam-prone | The bridge runs a Nostr key + (optional) WS relay client inside Bare; relays *complement*, not replace, Hyperswarm/HiveRelay | 1 |
| **NIP-05 DNS identity** | `/.well-known/nostr.json?name=` maps `name@domain`→hex pubkey | Human-readable; cheap; reuses DNS | Spec is explicit: **"identification, not verification"**; DNS = central trust root; overlaps our naming | Could map Pear ids → npubs, but DNS is a downgrade from Ed25519/DHT naming — study, don't centralize on it | 2 |
| **NIP-19 bech32** | `npub`/`nsec`/`note` + TLV `nprofile`/`nevent`/`naddr` display strings (relay hints in TLV) | Safe copy/paste/QR | UI-only, never on wire; yet another encoding | Needed for any UI showing Nostr ids; encode/decode in the Chromium layer (`ui/lib/nostr.js`) | 3 |
| **NIP-23 long-form** | `kind:30023` Markdown, addressable via `d` tag (`title`/`summary`/`published_at`) | Editable/replaceable articles; portable | Markdown-only, no HTML; relies on relays | Maps cleanly onto our site/blog publishing; mirror a Hyperdrive draft → `30023` | 4 |
| **NIP-65 relay lists (outbox)** | `kind:10002` `r` tags (read/write markers) | Decentralized discovery routing **without** a DHT | Client-side relay-set mgmt; redundant fetches | Our equivalent is DHT/HiveRelay discovery — NIP-65 is the analog to study; mirror as an index-room schema | 7 |
| **NIP-89 app handlers** | `kind:31990` handler (`k` tags + platform URLs w/ NIP-19 placeholder) / `kind:31989` user recommendation | Decentralized "which app opens this kind" + endorsement graph | Two-event indirection; relies on relays | **Direct analog to our app-catalogue + "apps my contacts recommend"**; maps onto `app-manifest` schema | 8 |
| **NIP-07 signer** | `window.nostr.getPublicKey/signEvent` (+ optional nip04/nip44) | Keys never leave signer; clean web seam | Browser-extension assumption; secp256k1 | **The integration point**: inject `window.pear.nostr`, service `signEvent` from the Bare key store via token-gated `/api/nostr/*` | 9 |
| **NIP-57 zaps** | `kind:9734` request / `kind:9735` receipt + LNURL/Lightning | Real-money rails; spam deterrent; mature | Off-protocol Lightning dependency | Optional monetization layer; overlaps any HiveRelay economics | 5 |
| **NIP-47 NWC** | Remote wallet RPC over relays (`13194`/`23194`/`23195`/`23197`; `nip44_v2` enc) | Reuses relays as encrypted RPC; wallet stays remote | Needs a wallet service; enc-version sprawl | Pattern worth copying for app↔backend encrypted RPC | 6 |
| **NIP-94 / Blossom** | `kind:1063` file metadata (`url`/`m`/`x`=sha256/`size`); Blossom SHA-256 HTTP blobs, auth via signed `kind:24242` event | Content-addressed; integrity-verifiable; server-agnostic | Bytes off-protocol; HTTP hosts (not P2P) | Mirror Hyperdrive content to Blossom for Nostr reach; SHA-256 addressing ≈ our Hypercore model | 10,11,12,13 |
| **iroh-gossip** | Topic pub/sub (32-byte `TopicId`); HyParView membership + Plumtree epidemic broadcast trees over QUIC | Brokerless; resilient to churn; no always-on server | Weaker delivery guarantees; redundant traffic; **no durable store** (offline = miss) | Decentralized analog to a Nostr relay's broadcast; comparable to Hyperswarm topic gossip — same durability gap HiveRelay fills | 15 |
| **iroh-docs** | Multi-writer signed KV; range-based set reconciliation (recursive fingerprints); namespace+author keypairs; entries carry timestamps; bytes in iroh-blobs (BLAKE3) | Efficient sync; clean author/namespace model; mature | Entries are timestamped and the community characterizes same-key resolution as newest-timestamp-wins (**clock-forgeable if so** — see note); Rust (not Bare/CJS); separate stack | **Direct competitor to Autobase/Autobee**; *if* iroh-docs resolves same-key conflicts by timestamp, our op-log + deterministic `apply()` avoids that wall-clock conflict (R3) | 16 |
| **iroh relays + holepunch** | Ed25519 `NodeId`; QUIC; direct-first, relay-fallback (QUIC Address Discovery + holepunch coord) | Same model we already use; battle-tested | Separate runtime; another relay fleet | **Confirms** our HyperDHT + HiveRelay design (`relay-client.js`/`BOOTSTRAP_RELAYS`) is mainstream / "iroh-inspired" | 14,17 |

**Key takeaways for us.** (i) Nostr's secp256k1-Schnorr vs our Ed25519 is a **hard, verified incompatibility** (src 1) — a bridge needs a distinct Nostr key surfaced through a NIP-07-style signer. (ii) iroh-docs is the closest external analog to Autobee (multi-writer signed KV, range-based set reconciliation, BLAKE3, namespace+author keypairs, timestamped entries — all confirmed at primary sources). It is **commonly characterized** as resolving same-key conflicts by newest-timestamp (LWW), which would be exactly the clock-forgeable property our deterministic reducer rejects (R3) — but that specific conflict-resolution rule is **not stated in the primary iroh docs we could reach** (they confirm only that timestamps are tracked), so treat the LWW contrast as a likely-but-unconfirmed motivation, not a verified fact. (iii) iroh relays (Ed25519 `NodeId`, QUIC, direct-first/relay-fallback — primary-confirmed) confirm HiveRelay's always-on-backbone shape is standard.

---

## 6. Candidate Approaches

### A. Thin client — pure `wss://` relay pool, no Pear-side store
Run a `bare-ws` relay-pool client; ingest/publish straight to public relays; keep events only in memory + a UI cache.
- **Pros:** smallest surface; immediate interop with the live Nostr network; no new store.
- **Cons:** violates **R2** (offline-first) and **R7** — no durable, censorship-proof copy; relay censorship/equivocation (threat 6) is unmitigated; reorder/replay hostile reducer (threat 8) is unmanaged; depends on always-on third-party servers. **Rejected as the primary** — kept as the *optional flagged transport*.

### B. Pear-native event store + Nostr export façade (HiveRelay-first)
Events live in a content-addressed, **Hyperdrive-shaped** Pear store, reduced via the Autobee op-log+reducer pattern; a façade publishes/mirrors selected events to Nostr relays and exposes a read-only NIP-01 `REQ` surface so external Nostr clients can read Pear-authored events.
- **Pros:** satisfies **R2/R3/R7** fully; reuses `autobee-catalog-*` verbatim; durable + deterministic + offline-first; relay censorship is a liveness issue, not a truth issue; HiveRelay can become a Nostr relay façade (the §2 payoff).
- **Cons:** more code; the freshness-vs-durability trilemma (threat 5/§8.5) must be managed explicitly; external reach for *un-mirrored* events requires the relay façade to be online.

### C. Autobase multi-writer "relay-room" (gossip-style)
Model a topic/feed as an Autobase whose writers are admitted via the contacts graph; reduce with a NIP-01 reducer; gossip over Hyperswarm.
- **Pros:** fully decentralized, brokerless (the iroh-gossip shape, src 15); inherits Autobase ordering; clean Sybil gate via writer admission.
- **Cons:** writer-set management is heavy for an open social graph; offline writers miss data unless pinned (the iroh-gossip durability gap, src 15) — needs HiveRelay anyway; weaker interop with the *existing* Nostr relay network.

### D. Hybrid (recommended) = **B as the core + A as a flagged egress/ingress + C's writer-admission discipline for trust**
The Pear-native store (B) is the source of truth and the offline-first author surface. The legacy `wss://` pool (A) is an **optional, circuit-broken, flagged** transport for reach into the public Nostr network. Trust/Sybil gating borrows C's *writer-admission-via-contacts* idea, applied as an *ingest filter* (events from secp256k1 keys not endorsed in the trust frontier are quarantined, not reduced into the visible feed).

**Recommendation: D.** It is the only candidate that satisfies R1–R9 simultaneously, reuses the just-shipped Autobee machinery verbatim, and degrades gracefully (offline → local store still works; relays down → HiveRelay mirror still serves; legacy transport flag off → still a working Pear-internal social layer).

---

## 7. Recommended Design (mapped onto our primitives)

### 7.1 Identity & cross-curve binding

**New Nostr keypair (deterministic, sealed).** Add to `Identity` (`backend/identity.js`):
```
getNostrKeypair()        // secp256k1; secret = HKDF/SHA-256(this._seed ‖ "pear-nostr-v1:") clamped to a valid scalar
nostrSign(eventId)       // BIP-340 Schnorr over the 32-byte event id (net-new, via secp256k1-bundle.cjs)
nostrVerify(id, sig, pk) // BIP-340 verify (net-new)
verify(msg, sig, pk)     // Ed25519 — surface crypto_sign_verify_detached (bundled, currently unexposed)
```
The nsec is cached in a private field and **never leaves the worklet** (same discipline as `_keypair`/`_appKeypairs`). Derivation is domain-separated exactly like `getAppKeypair` (`identity.js:239–243`) but with a fresh `"pear-nostr-v1:"` tag and clamped to a valid secp256k1 scalar.

**The binding (mutual, bidirectional, revocable).** Canonical payload `pear-nostr-bind-v1`:
```json
{ "v": 1, "purpose": "pear-nostr-bind-v1", "edPub": "<root ed25519 hex>",
  "secpPub": "<x-only nostr hex>", "epoch": 3, "scope": "feed" }
```
- The **Ed25519 root** signs it (`identity.sign`, NOT `signForApp` — bind the human-stable key, §3.1 gap b, threat 2).
- The **secp256k1 nsec** Schnorr-signs the *same canonical bytes* (`stableStringify`, no whitespace).
- A verifier accepts the link **only if both signatures verify** (`identity.verify` + `nostrVerify`) — this is the `index-room-client.js` verify-and-drop loop (`:126–128`) extended to two curves, plus the `contacts.js:120` reject-on-invalid-sig.
- **Revocation is revoke-wins by monotonic `epoch`** (not wall-clock), applied deterministically regardless of arrival order — mirrors the catalogue reducer's "remove wins only if later in deterministic op order." A higher-`epoch` binding (or an explicit `purpose:"pear-nostr-revoke-v1"` record) supersedes a lower one. The binding/revocation is mirrored to **both** networks (HiveRelay store + Nostr relays).
- The UI renders **"linked (attested) · epoch N"**, never "verified" (R9, threat 1).

The binding record is published as a **Nostr event** (a custom replaceable `kind`, `d = edPub`) *and* stored in the Pear event store, so each network can independently surface and revoke it.

### 7.2 Event store — the Autobee pattern, applied to NIP-01

Three new pure/wrapper modules mirroring `autobee-catalog-{ops,apply,manager}.cjs`:

**`backend/nostr-events-ops.cjs`** (pure, `.cjs`):
- `SCHEMA_VERSION = 1`; `MAX_EVENT_BYTES` (mirror `MAX_OP_BYTES`).
- `hasUnsafeKey` **verbatim** from `autobee-catalog-ops.cjs:34` (prototype-pollution scan over `tags`/`content`).
- `validateEvent(ev)`:
  1. Shape: exactly `{id,pubkey,created_at,kind,tags,content,sig}` (NIP-01, src 1).
  2. **Recompute `id = sha256_hex(JSON.stringify([0,pubkey,created_at,kind,tags,content]))`** with NIP-01's exact no-whitespace UTF-8 serialization; reject if `id` mismatches.
  3. **Schnorr-verify `sig`** over `id` with `pubkey` (`nostrVerify`).
  4. Three-way verdict like `validateOp` (`:89`): `{ok:true}` / `{ok:false, retain:true}` (unknown kind/version — keep, ignore in view, forward-compat) / `{ok:false, retain:false}` (malformed/oversized/bad-sig — reject before append).

**`backend/nostr-events-apply.cjs`** (pure reducer):
- `linearize` orders by **writer+seq / monotonic epoch**, NOT `created_at` (R3). `created_at` is carried for **display only**.
- **Dedup by event `id`** (keyed `evt!<id>`), exactly as `getAggregatedApps` dedups by `app.id`.
- Replaceable/addressable kinds (`30023`, `10002`, `31990`, `31989`, the binding kind): keyed `repl!<kind>:<pubkey>:<d>` — latest-in-deterministic-order wins; `created_at` may *inform display tie-breaks* but is **never** the deciding key (a writer with a skewed clock cannot win — the property a timestamp-LWW design, as iroh-docs is commonly characterized, would lack, src 16).
- **Ingest Sybil gate (candidate D):** an event whose `pubkey` is not endorsed in the user's trust frontier (`contacts.js`, transitively to depth N) is reduced into a **quarantine view**, not the visible feed. Influence is bounded by *attack edges, not node count* (R6).

**`backend/nostr-event-store.cjs`**: wraps `new Autobase(store, bootstrap, { open, apply })` exactly like `AutobeeCatalogManager` (`-manager.cjs:32`); `apply` records each validated event under `evt!<id>` / `repl!…` in a Hyperbee view; `events(filter)` re-materializes via the **pure** reducer. The backing core is **Hyperdrive-shaped** so HiveRelay AutoHeals it (R7). After each write, call the existing best-effort pin helper (`index.js`, the `hiveRelay.seed(...)` path at `:515`/`:1878`).

### 7.3 Transports

**HiveRelay-native (always on).** Events + bindings live in the Hyperdrive-shaped store, seeded via `hiveRelay.seed(key, { replicas: 3 })` and pinnable via `relayClient.requestSeed`. Discovery of *other users'* event stores rides the **self-certifying relay records** (`relay-record.js` — `mutableGet` verifies the Ed25519 sig, so a malicious DHT node serves stale, never forged). Add a `nostr-event` (and `nostr-relay-list`/NIP-65) schema to `index-room-client.js`'s `INDEX_SCHEMAS` (`:30`) and a `listNostrEvents` mirroring `listRelayDirectory`'s verify-and-drop loop (`:120–146`).

**Legacy `wss://` pool (optional, flagged: `experimentalNostrLegacyRelays`).** `backend/legacy-relay-pool.cjs` over the declared `bare-ws` (`package.json:52`), reusing `relay-client.js`'s **per-relay circuit-breaker** discipline (`_maxFailures=3`, 60 s reset). Implements the NIP-01 wire frames (`EVENT`/`REQ`/`CLOSE` → `EVENT`/`OK`/`EOSE`/`CLOSED`/`NOTICE`, src 1). **Multi-relay fan-out ≥3** on publish; on read, **cross-check the same `id` across relays and flag equivocation** rather than trusting any single relay (threat 6). Relay-set routing follows NIP-65 outbox semantics (src 7) where relay lists are available.

### 7.4 Page-facing NIP-07 signer

- **`backend/pear-bridge.js`**: add `PEAR_NOSTR_SHIM` (a `window.pear.nostr` exposing `getPublicKey()`, `signEvent(event)`, optional `nip44` encrypt/decrypt per src 9), exported alongside `PEAR_SWARM_V1_SHIM`/`PEAR_ANONGPT_SHIM` (`:716`).
- **`backend/hyper-proxy.js`**: add `setPearNostrShim(...)` (mirror `setPearSwarmShim` `:209`); inject in `_injectHtmlHead` (`:340`) gated by per-app consent; `injectCspShimHashes` (`:125`) auto-authorizes the shim hash so it runs under strict CSP.
- **`backend/http-bridge.js`**: a token-gated `/api/nostr/*` route block, each behind `_requireToken` (`:72`):
  - `GET  /api/nostr/pubkey` → `identity.getNostrKeypair().publicKey` (x-only hex).
  - `POST /api/nostr/sign` → builds NIP-01 `id`, runs a **kind-whitelist + impersonation guard** (no signing of the binding/revocation kinds or kinds outside the app's grant), then `identity.nostrSign(id)`. **The nsec never reaches the page** (R4, identical guarantee to `signForApp`).
  - `POST /api/nostr/publish` → enqueue to the event store (+ optional legacy fan-out if flagged).
  - `GET  /api/nostr/subscribe` (SSE) → live feed push, mirroring the `/api/swarm/*` `attachStream` pattern (`http-bridge.js` `/api/swarm` block).

### 7.5 RPC commands, events, constants (lockstep — R8)

Add to **both** `backend/constants.js` (+ `module.exports`) **and** `ui/boot.js` `C`. Using the verified-free command block **188–199** and event block **109+**:

| New constant | Value | Purpose |
|---|---|---|
| `CMD_NOSTR_GET_IDENTITY` | 188 | return nostr x-only pubkey + binding/epoch state |
| `CMD_NOSTR_BIND` | 189 | create/refresh the mutual binding (bumps epoch) |
| `CMD_NOSTR_REVOKE` | 190 | revoke binding (epoch+1), mirror to both networks |
| `CMD_NOSTR_PUBLISH` | 191 | sign+enqueue an event |
| `CMD_NOSTR_QUERY` | 192 | query the reduced feed (filter: kinds/authors/#e/#p/since/until/limit) |
| `CMD_NOSTR_FOLLOW` | 193 | add author to trust-frontier ingest allowlist |
| `CMD_NOSTR_LOAD_RELAY_LIST` | 194 | load a NIP-65 / index-room relay list |
| `CMD_NOSTR_LEGACY_SET_ENABLED` | 195 | toggle the flagged `wss://` pool |
| `EVT_NOSTR_EVENT` | 109 | live push of a newly-reduced event |
| `EVT_NOSTR_BINDING_CHANGED` | 110 | binding/epoch/quarantine state change |

`backend/index.js`: instantiate `nostrBridge` in the boot block near `new CatalogManager(...)` (`:1620`) and `new HttpBridge(...)` (`:1761`); register the flat `rpc.handle(C.CMD_NOSTR_*, …)` handlers; thread `{ identity, eventStore, legacyPool, contacts }` into `HttpBridge`.

### 7.6 UI

- **`ui/lib/nostr.js`** (new): `parseNostrRef` (NIP-19 `npub`/`nsec`/`note`/`nprofile`/`nevent`/`naddr` decode, src 3) beside `parseCatalogRef`; bech32 encode for display; reuse `z32FromHex`/`hexFromZ32` patterns.
- **`ui/shell.js`**: one `TAB_META` entry (`:96`) + one mount line (`tab === 'feed' && html\`<${Feed} rpc=${rpc} C=${C} …/>\``, beside `:3908`) + a `Feed` component modeled on `Apps` (RPC list + filter + cards). Binding state shows **"linked (attested) · epoch N"** with provenance + a revoke control (R9).

### 7.7 End-to-end flows

**Publish (note `kind:1`):** page calls `window.pear.nostr.signEvent(ev)` → `/api/nostr/sign` (`_requireToken`, kind-whitelist) → worklet builds NIP-01 `id`, Schnorr-signs → `CMD_NOSTR_PUBLISH` → `validateEvent` (recompute id + verify sig + caps + pollution scan) → append to Hyperdrive-shaped store under `evt!<id>` → `pinDriveBestEffort` → optional ≥3-relay fan-out if `experimentalNostrLegacyRelays`. `EVT_NOSTR_EVENT` pushes to the Feed.

**Ingest:** index-room `listNostrEvents` (verify-and-drop) and/or legacy `REQ` stream → `validateEvent` (drop bad sig/oversized/polluted) → trust-frontier gate (`contacts.js`) → reduced into visible feed or quarantine → deterministic reducer dedups by `id`, latest-in-order wins for replaceable kinds. Same `id` seen across relays with divergent content → **flag equivocation**, don't trust (threat 6).

**Bind:** `CMD_NOSTR_BIND` → root `identity.sign` + `nostrSign` over the canonical `pear-nostr-bind-v1` bytes → published as a replaceable Nostr event **and** stored locally → `EVT_NOSTR_BINDING_CHANGED`. Verifier re-checks **both** sigs before rendering "linked (attested)."

---

## 8. Threat Model & Failure Modes

| # | Threat | Likelihood | Impact | Mitigation (grounded) |
|---|---|---|---|---|
| 1 | **Cross-key impersonation** — attacker asserts a victim's Pear↔Nostr link; UI renders "verified" | High | High | **Mutual bidirectional attestation: both curves sign** the canonical `pear-nostr-bind-v1`; verify **Ed25519 *and* Schnorr** before any linkage (verify-and-drop, `index-room-client.js:126–128`; reject-on-invalid-sig, `contacts.js:120`). **UI says "linked (attested)", never "verified"** (R9). *Net-new: Schnorr verify.* |
| 2 | **Subkey confusion** — binding a per-app `signForApp` subkey lets one app stand in for the user's whole Nostr identity (subkeys have zero crypto link to root, `identity.js:239–243`) | Med | High | **Bind only the ROOT pubkey** — the stable identity the contacts graph is keyed on (`contacts.js:12`). App posting uses a root-authorized, domain-separated chain (`pear.app.<driveKey>:<ns>:`, `identity.js:264`). A subkey sig alone never stands for the human. |
| 3 | **Replay / cross-context sig reuse** — a valid binding/event lifted to another relay/app/bridge | Med | Med | Domain separation already in the signer (`identity.js:264`) + binding `purpose`+`scope` fields (can't be lifted). NIP-01 `id` self-commits to all fields. **Monotonic `created_at` floor per pubkey at ingest** + **dedup by `id`** (`evt!<id>`). |
| 4 | **Forgery via missing verification** — bridge trusts unchecked sigs, or trusts *room membership* as authority (`sheets.join()` auto-promotes any keyholder on a writable room) | High | High | **Re-verify every signature at the edge, drop on failure; never trust transport/membership.** Ship `index-room-client.js:126–128` verbatim. Add `identity.verify` (Ed25519, bundled-but-unsurfaced) + Schnorr verify (net-new). We join index rooms read-only (`:79`). |
| 5 | **Content-addressing bait-and-switch** — an event references a `hyper://` key, then is *legitimately replaced* (NIP-01 replaceable semantics) to repoint at a hostile drive; or inline content mutated relay-side | High | Med-High | **Event = mutable pointer; 32-byte drive key = immutable truth; never conflate** (the `relay-record.js:7–9` tiering). **Pin to a specific drive key, never a mutable handle.** On replacement, surface "pointer changed" and require the new target to re-satisfy the binding. Durable inline → bytes in a Hyperdrive, `hyper://`+`sha256` in the event (NIP-94 shape, src 10). |
| 6 | **Relay censorship / equivocation** — a relay drops/reorders/withholds events (incl. binding/revocation) or serves divergent views | High | Med | **Multi-relay fan-out ≥3 + self-certifying records + Pear-side Hyperdrive-shaped durable mirror** (`hiveRelay.seed(key,{replicas:3})`, `relayClient.requestSeed`). Relay discovery rides `dht.mutableGet` (verifies sig — stale-not-forged, `relay-record.js:7–9`). Cross-check the same `id` across relays → flag, don't trust. |
| 7 | **Spam / Sybil** — secp256k1 keys are free to mint; open-relay firehose floods ingest | High | Med | **Social-graph Sybil gate, not PoW.** A bridged Nostr id is **invisible (quarantined) until its Ed25519 side is endorsed in the user's trust frontier** (`contacts.js`, root-pubkey-keyed). Bound influence by *attack edges, not node count*. Plus `autobee-catalog-ops.cjs` hardening verbatim (byte caps, per-writer budgets, drop-a-writer revocation). NIP-13 PoW is a low-tier admission filter at most, **never** the trust basis. |
| 8 | **Event poisoning / resource exhaustion** — oversized events, prototype-pollution JSON keys, malformed tags, unbounded reindex | Med | Med | **Reuse `autobee-catalog-ops.cjs` validation verbatim:** `hasUnsafeKey` recursive scan (`:34`), `> MAX_EVENT_BYTES` reject, whitelist+clamp, schema-version every record (unknown kind/version → retain-but-ignore). **Wall-clock-free reducer** (orders by writer+seq) so hostile reordering can't change the merged view (R3). |
| 9 | **Revocation lag / key-compromise resurrection** — a compromised binding resurrects after propagation lag; NIP-09 deletion is advisory and widely ignored | Med | Med | **Revoke-wins by monotonic `epoch`** (not wall-clock), applied deterministically regardless of arrival order (mirrors the catalogue reducer's remove-wins-if-later). Mirror revocation to **both** networks. Defense-in-depth: short-TTL re-publication of validity (trades availability for safety — open question §10). |
| 10 | **Malicious page signs under the user's identity** via injected `window.pear.nostr` | Med | High | **Token-gated `/api/nostr/sign`** behind `_requireToken` (`http-bridge.js:72`), **nsec sealed in the worklet** (page never sees it, same guarantee as `identity.js:197`), **kind-whitelist + impersonation guard** before signing (extends the `signForApp` namespace-guard precedent), per-app consent like the swarm/login flows. |

### The hardest unsolved problems (carried into rollout, never "fixed")
**8.1 Cross-curve binding has no "same-key" proof.** The bridge can prove *two keyholders co-signed a link*; it can never prove same-human or absence of coercion/key-theft. Linkage is irreducibly a trust assertion. Defenses: the social graph (threat 7), cheap revocation (threat 9), and a **UX contract that never renders "verified"** (R9). No protocol change removes this.

**8.2 Mutable freshness vs content-addressed durability (the trilemma).** Nostr *needs* `created_at` to pick the current replaceable event; our reducer *forbids* wall-clock. **No single placement is simultaneously fresh, censorship-proof, and deterministically authoritative.** Best compromise: mutable pointer for liveness + content-hash pin for truth + monotonic epoch for authoritative ordering + `created_at` advisory for *display only* — still accepts **transient staleness under partition.**

**8.3 Revocation completeness across two independent gossip layers.** A revocation must land on **both** Nostr relays (operator-discretion retention; NIP-09 advisory) **and** HyperDHT/HiveRelay (short-TTL mutable pointers; per internal research, only best-effort seeding for bare cores — unverified against a primary HiveRelay source). Neither guarantees delivery and they fail independently. No protocol fix — only short-TTL validity re-publication (operationally heavy, reduces availability for safety).

---

## 9. Phased Rollout Plan

Each phase is independently shippable; risky phases are feature-flagged. The Schnorr gate (Phase 1) blocks everything downstream.

- **Phase 0 — Crypto foundation & CI gate (no user-facing change).** Promote `@noble/secp256k1` to a declared dependency; build `backend/secp256k1-bundle.cjs` (CJS vendored bundle, `scripts/build-secp256k1-bundle`, mirroring the sheets-bundle build). Add `identity.verify` (surface `crypto_sign_verify_detached`). **CI gate:** `test/nostr-events-ops.test.js` must pass **byte-exact NIP-01 id-serialization + Schnorr sign/verify fixture vectors against a known-good signer** under both `node --test` and a Bare-load check. *Nothing downstream ships until this is green.*

- **Phase 1 — Nostr key + binding (flagged `experimentalNostr`).** `identity.getNostrKeypair`/`nostrSign`/`nostrVerify`; the `pear-nostr-bind-v1` mutual binding with revoke-wins-by-epoch; `CMD_NOSTR_GET_IDENTITY`/`BIND`/`REVOKE`. UI: a Settings panel showing the npub and **"linked (attested) · epoch N"** + revoke. Bindings stored locally only (no network yet).

- **Phase 2 — Event store (Autobee pattern).** `nostr-events-{ops,apply}.cjs` + `nostr-event-store.cjs` (Hyperdrive-shaped, HiveRelay-seeded). `CMD_NOSTR_PUBLISH`/`QUERY`; deterministic reducer; dedup by `id`; replaceable-kind keying. Local author + read; no external transport. Reuse `autobee-catalog-ops.cjs` hardening verbatim.

- **Phase 3 — Pear-native distribution.** Add `nostr-event` + NIP-65 relay-list schemas to `index-room-client.js` (`INDEX_SCHEMAS`); `listNostrEvents` (verify-and-drop); discovery via self-certifying relay records. `CMD_NOSTR_LOAD_RELAY_LIST`/`FOLLOW`; trust-frontier ingest gate via `contacts.js` (quarantine for un-endorsed authors). Feed tab in `ui/shell.js`. **This is a complete Pear-internal social layer with zero `wss://` dependency.**

- **Phase 4 — NIP-07 page signer (flagged `experimentalNostrSigner`).** `PEAR_NOSTR_SHIM` + `setPearNostrShim`; token-gated `/api/nostr/{pubkey,sign,publish,subscribe}`; kind-whitelist + impersonation guard; per-app consent; SSE live push (`EVT_NOSTR_EVENT`). nsec stays sealed.

- **Phase 5 — Legacy `wss://` egress/ingress (flagged `experimentalNostrLegacyRelays`, off by default).** `legacy-relay-pool.cjs` over `bare-ws` with circuit breakers; NIP-01 wire frames; multi-relay fan-out ≥3; equivocation cross-check; NIP-65 outbox routing. Mirror bindings/revocations to both networks. **This is the only phase that depends on third-party servers; it is opt-in.**

- **Phase 6 — Relay façade & app handlers (flagged).** HiveRelay exposes a read-only NIP-01 `REQ` surface so external Nostr clients read Pear-authored events; NIP-89 (`kind:31990`/`31989`) app-handler publish/ingest wired into the catalogue endorsement surface.

- **Phase 7 — Payments (flagged `experimentalNostrZaps`, optional).** NIP-57 zap request/receipt; optionally NIP-47 NWC for app↔wallet RPC. Entirely opt-in; off the critical path.

---

## 10. Open Questions

1. **secp256k1 secret derivation:** plain domain-separated SHA-256 (like `getAppKeypair`) vs RFC-5869 HKDF — and the exact scalar-clamping/rejection-sampling to guarantee a valid BIP-340 secret. Pin before Phase 0 fixtures freeze.
2. **Short-TTL validity re-publication (threat 9):** is the availability cost acceptable, and what window N balances safety vs liveness across two networks we don't control? (§8.3.)
3. **Trust-frontier depth:** how many hops in `contacts.js` define "endorsed," and how is the quarantine→visible promotion surfaced to the user without becoming a spam vector itself? (R6, threat 7.)
4. **Replaceable-kind tie-breaks:** when two replaceable events tie in deterministic order, is `created_at` an acceptable *display-only* tie-break, or must we expose both to the user? (R3 vs §8.2.)
5. **Relay façade scope (Phase 6):** which kinds/authors does HiveRelay serve externally, and what rate/abuse limits apply to anonymous `REQ`?
6. **NIP-44 in the shim:** do we expose `nip44` encrypt/decrypt in `window.pear.nostr` in Phase 4, or defer until a concrete DM/NWC consumer exists?
7. **Blossom/NIP-94 bytes:** do we mirror Hyperdrive content to a Blossom host for Nostr-client reach, or publish `hyper://`+`sha256` and accept that pure-Nostr clients can't fetch P2P bytes? (src 10–13; BUD numbering is in flux — verify against `hzrd149/blossom` `buds/` before implementing.)

---

## 11. Sources

1. NIP-01 — Basic protocol, events & relays (event id serialization, Schnorr/secp256k1): https://github.com/nostr-protocol/nips/blob/master/01.md
2. NIP-05 — DNS-based internet identifiers ("identification, not verification"): https://github.com/nostr-protocol/nips/blob/master/05.md
3. NIP-19 — bech32-encoded entities (`npub`/`nsec`/`note`/`nprofile`/`nevent`/`naddr`): https://github.com/nostr-protocol/nips/blob/master/19.md
4. NIP-23 — Long-form content (`kind:30023`): https://github.com/nostr-protocol/nips/blob/master/23.md
5. NIP-57 — Lightning zaps (`kind:9734`/`9735`): https://github.com/nostr-protocol/nips/blob/master/57.md
6. NIP-47 — Nostr Wallet Connect (`13194`/`23194`/`23195`/`23197`, NIP-44): https://github.com/nostr-protocol/nips/blob/master/47.md
7. NIP-65 — Relay list metadata / outbox model (`kind:10002`): https://github.com/nostr-protocol/nips/blob/master/65.md
8. NIP-89 — Recommended application handlers (`kind:31990`/`31989`): https://github.com/nostr-protocol/nips/blob/master/89.md
9. NIP-07 — `window.nostr` browser signer: https://github.com/nostr-protocol/nips/blob/master/07.md
10. NIP-94 — File metadata (`kind:1063`, `x`=sha256): https://github.com/nostr-protocol/nips/blob/master/94.md
11. Blossom BUD-01 — blob retrieval / SHA-256 addressing: https://github.com/hzrd149/blossom/blob/master/buds/01.md
12. Blossom BUD-02 — upload (`PUT /upload`): https://github.com/hzrd149/blossom/blob/master/buds/02.md
13. Blossom BUD-11 — authorization event `kind:24242`: https://github.com/hzrd149/blossom/blob/master/buds/11.md
14. iroh docs — overview/architecture (QUIC, public-key node identity, direct-first/relay-fallback): https://docs.iroh.computer/ ; relays concept: https://docs.iroh.computer/concepts/relays ; `NodeId` is an Ed25519 public key: https://docs.rs/iroh-net/latest/iroh_net/type.NodeId.html
15. iroh-gossip — epidemic broadcast pub/sub (HyParView + Plumtree): https://docs.iroh.computer/connecting/gossip
16. iroh-docs — multi-writer signed KV + range-based set reconciliation, namespace+author keypairs, BLAKE3 content, timestamped entries: https://docs.rs/iroh-docs/latest/iroh_docs/ ; https://docs.iroh.computer/protocols/kv-crdts . **Note:** the "newest-timestamp-wins (LWW) for the same key" conflict-resolution rule used as the R3 contrast is a common *community* characterization and is **not stated in the primary iroh docs reachable here** — they confirm only that entries are timestamped. Treat the LWW property as unconfirmed at the primary-source level.
17. iroh — holepunching & Ed25519 NodeId (repo): https://github.com/n0-computer/iroh
18. NIP-13 — Proof of Work (admission-filter only, not trust basis): https://github.com/nostr-protocol/nips/blob/master/13.md
19. NIP-09 — Event deletion (advisory): https://github.com/nostr-protocol/nips/blob/master/09.md
20. BIP-340 — Schnorr signatures over secp256k1: https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki

**Internal cross-references (not external prior-art):** `docs/AUTOBEE-RESEARCH.md`; `docs/P2P-SEARCH-RESEARCH.md`; `backend/autobee-catalog-{ops,apply,manager}.cjs`; `backend/identity.js`; `backend/relay-record.js`; `backend/index-room-client.js`; `backend/contacts.js`; `backend/http-bridge.js`; `backend/hyper-proxy.js`; `backend/pear-bridge.js`. The Autobee op-log + deterministic-reducer design is the local counterpart to iroh-docs (src 16); the proposed key divergence — deterministic op-log ordering vs timestamp-LWW — is what would make our reducer robust against clock-forgery *if* iroh-docs indeed resolves same-key conflicts by timestamp (a common but, at the primary-source level, unconfirmed characterization — see src 16 note).
