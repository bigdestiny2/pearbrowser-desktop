# P2P-Infra Design Docs — Cross-Cutting Overview

> Status: design / RFC index · Stack: Holepunch / Pear — Bare (CJS) + Chromium · Date: 2026-06-17
> Branch grounded: `feat/phase5-relay-directory`
> Ties together: [`naming.md`](./naming.md) · [`payments.md`](./payments.md) · [`privacy-routing.md`](./privacy-routing.md) · [`nostr-bridge.md`](./nostr-bridge.md)
> Shared reference patterns: [`../AUTOBEE-RESEARCH.md`](../AUTOBEE-RESEARCH.md) · `backend/autobee-catalog-{ops,apply,manager}.cjs` · [`../P2P-SEARCH-RESEARCH.md`](../P2P-SEARCH-RESEARCH.md) · [`../HIVERELAY-SCHEMA-SHEETS-DESIGN.md`](../HIVERELAY-SCHEMA-SHEETS-DESIGN.md)

> **Doc set.** All four track docs — `naming.md`, `payments.md`, `nostr-bridge.md`, and `privacy-routing.md` — are present and grounded against the tree. The privacy-routing track is "scoped here, specified there": this overview frames its role from the cross-cutting hooks the other three docs expose (transaction-graph correlation, relay/DHT metadata leakage, per-invoice/per-session unlinkability), and `privacy-routing.md` carries the full threat model + layered mitigation roadmap. The two are consistent — privacy-routing discharges payments T4/T10, nostr row 6, and naming's multi-relay-bootstrap need in one transport-layer track, built last (it validates against the other tracks' real traffic) but with its descriptor schema specified early.

---

## 1. The one-line thesis

These four tracks are **not four features — they are four projections of one substrate.** Every one of them is, at its core, *a signed assertion bound to an Ed25519 identity, ingested through a verify-and-drop edge, reduced by a deterministic wall-clock-free reducer, made durable by HiveRelay pinning, and resolved relative to a social trust graph rather than a global registrar.* Naming binds `name → key`; payments binds `sale → receipt`; nostr binds `event → author`; privacy-routing wraps the transport all three ride on. The same five primitives appear in all four. Build the primitives once, correctly, and the four tracks become thin schema-and-policy layers on top.

---

## 2. How the four pieces interlock

### 2.1 The shared primitive stack (build once, reuse four times)

| Shared primitive | Where it lives today | naming | payments | nostr | privacy-routing |
|---|---|---|---|---|---|
| **Ed25519 identity + per-app subkeys** (`getAppKeypair`, `signForApp`) | `backend/identity.js` | name-subkey (`pear-name-v1:`) | pos-subkey + receipt sig | root↔Nostr binding (cross-curve) | per-session routing keys |
| **`identity.verify()` / `verifyForApp()`** — *missing today* | `backend/identity.js` (absent; `crypto_sign_verify_detached` is bundled but unsurfaced) | **hard gate** on anti-Sybil | **hard gate** (un-stubs `anongpt-buyer`) | **hard gate** (+ net-new Schnorr verify) | verify routed-record sigs |
| **Self-certifying DHT mutable record** (`dht.mutableGet` verifies sig) | `backend/relay-record.js` | name pointer (rotation survival) | merchant-identity binding | Nostr relay/binding pointer | routing-node / relay descriptor |
| **Autobee op-log + deterministic reducer** (`validateOp` tri-state, `linearize`, no wall-clock) | `backend/autobee-catalog-{ops,apply,manager}.cjs` | scoped name registry (claim/revoke) | signed receipt ledger | Nostr event store | (routing uses it only for directory state) |
| **Verify-and-drop directory ingest** ("index, not authority") | `backend/index-room-client.js`, `backend/relay-directory.js` | name-directory rows | merchant directory rows | `nostr-event` / `nostr-relay-list` rows | routing-node directory |
| **HiveRelay always-on pinning** (`hiveRelay.seed(key,{replicas:3})`) | `backend/index.js`, relay client | pin name rooms | pin receipt/escrow ledger | pin event mirror (Hyperdrive-shaped) | pin routing descriptors |
| **Social-graph Sybil gate** (Contacts keyed on root pubkey; bound by *attack edges, not nodes*) | `backend/contacts.js` | endorser breadth | merchant trust | unendorsed npubs invisible | trusted-relay selection |

The punchline: **`identity.verify()` is the single most load-bearing missing primitive in the entire program.** All three identity-bearing tracks (naming Phase 2, payments Phase 0, nostr Phase 0) independently re-derive the same blocker. It is ~15 lines wrapping `sodium.crypto_sign_verify_detached`, and it gates the anti-Sybil / anti-forgery half of every other track. It must be the very first thing built, once, shared.

### 2.2 Concrete cross-track overlaps (where the same data model serves two tracks)

These are not analogies — they are the *same record under two names*, and should share a schema and a verifier rather than be implemented twice:

- **Nostr NIP-05 ↔ naming.** NIP-05 (`name@domain → /.well-known/nostr.json`) is structurally identical to naming's optional Approach-D domain-attestation tier (`/.well-known/pear.json`, "domain-verified" badge). Both are "borrow DNS for a *hint*, keep the key canonical." A publisher who serves one can serve the other from the same Hyperdrive-backed HTTP bridge; the naming resolver's provenance-chip UX and the Nostr "linked (attested)" UX are the same honest-trust surface. **Share the `/.well-known` convention and the badge component.**

- **Nostr NIP-89 ↔ naming ↔ the app catalogue.** NIP-89 `kind:31990` (app manifest) ≈ the schema-sheets `app-manifest` / Autobee `app.upsert`; `kind:31989` (social endorsement) ≈ naming's curator/contact `name` endorsement rows. All three are "a signed `name/handle → key` binding ranked by the follow graph." The nostr doc explicitly notes this "directly overlaps the app-catalogue work." **One endorsement-ranking engine should serve catalogue dedup, name resolution, and NIP-89 discovery.**

- **Nostr zaps / NIP-47 ↔ payments.** NIP-47 (Nostr Wallet Connect) is payments-track **Candidate D** verbatim (bring-your-own-wallet controller, app holds zero keys); NIP-57 (zaps) is the social-tipping projection of the same Lightning rail. The payments doc defers both behind the Breez-Liquid-WASM-under-Bare spike; the nostr doc defers NWC to its Phase 8. **These are the same deferral — sequence them together, gated on the same WASM spike, so a Lightning rail lands once and both the POS and the feed consume it.**

- **privacy-routing wraps both payments and browsing.** The payments threat model already names T4 (transaction-graph correlation: stable merchant pubkey + DHT topic + pin pattern clusters customers) and T10 (relay = metadata choke point); the nostr threat model names row 6 (relay can correlate/equivocate) and the per-invoice-key unlinkability need. **privacy-routing is the track that discharges these threats for *all* of them at once** — it is a transport-layer wrapper (onion/mixnet-style routing over Hyperswarm, rotating topics, decoupling the settlement/publish path from the browsing path) that every other track *consumes* rather than reimplements. Payments' "per-invoice ephemeral subkey," nostr's "rotate swarm topics per session," and naming's "multi-relay swappable bootstrap" are all the *same* metadata-unlinkability requirement; privacy-routing should own it. Without it, each track ships a partial, inconsistent privacy story.

### 2.3 The shared open problems (don't solve four times)

All four docs independently hit the same three walls, which means these are *program-level* research items, not per-track ones:

1. **Cold-start bootstrap is a soft central authority.** Naming's bootstrap alias set, the relay directory, the Nostr relay seed, and the routing-node seed are all "a baked-in trust root that must decay as the real graph grows." Solve *non-ossifying bootstrap* once.
2. **Omission/eclipse detection (completeness, not authenticity).** Every primitive proves a served record is *authentic*; none proves the set is *complete*. A captured relay can serve a consistent-but-partial namespace / ledger / feed. Shared ceiling of "index, not authority."
3. **Durability of mutable pointers under churn.** Name pointers, merchant bindings, Nostr bindings, and routing descriptors all expire and need republish; all inherit the open "HiveRelay best-effort-seeds bare Hyperbee/Autobase, only AutoHeals Hyperdrive-shaped cores" caveat. **Store every durable mirror Hyperdrive-shaped** — a program-wide rule.

---

## 3. Dependency graph (what must come first)

```
                       ┌─────────────────────────────────────────────┐
                       │  L0  identity.verify() / verifyForApp()      │   ← THE root gate
                       │      (sodium.crypto_sign_verify_detached)    │
                       └───────────────┬─────────────────────────────┘
                                       │ (every signed-record consumer needs it)
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                               ▼
┌───────────────┐          ┌──────────────────────┐         ┌──────────────────┐
│ L1a Schnorr   │          │ L1b IdentityBinding  │         │ L1c per-app sub- │
│ verify (net-  │          │ (root-signed:        │         │ key derivation   │
│ new, nostr)   │          │  name / merchant /   │         │ already shipped  │
│               │          │  nostr / routing)    │         │ (getAppKeypair)  │
└──────┬────────┘          └─────────┬────────────┘         └────────┬─────────┘
       │                             │                               │
       │   ┌─────────────────────────┴───────────────┐               │
       ▼   ▼                                          ▼               ▼
┌──────────────────┐   ┌───────────────────┐   ┌──────────────────────────────┐
│ L2 self-certify  │   │ L2 Autobee op-log │   │ L2 verify-and-drop directory │
│  DHT pointer     │   │  + reducer        │   │  ingest (index-room-client)  │
│ (relay-record)   │   │ (autobee-catalog) │   │                              │
│  ── SHIPPED ──   │   │  ── SHIPPED ──    │   │  ── SHIPPED ──               │
└────────┬─────────┘   └─────────┬─────────┘   └───────────────┬──────────────┘
         │                       │                             │
         └───────────┬───────────┴──────────────┬─────────────┘
                     ▼                           ▼
          ┌────────────────────┐   ┌──────────────────────────────────┐
          │ L3 HiveRelay pin   │   │ L3 social-graph Sybil gate       │
          │ (Hyperdrive-shaped)│   │ (contacts, attack-edge bound)    │
          └─────────┬──────────┘   └─────────────────┬────────────────┘
                    └──────────────┬─────────────────┘
                                   ▼
   ┌───────────────────────────────────────────────────────────────────────┐
   │ L4  TRACK PAYLOADS                                                      │
   │   • naming      (petname store, name rooms, ranker)                    │
   │   • payments    (settlement adapters, receipt ledger, escrow)          │
   │   • nostr       (event store, feed, NIP-07 signer, legacy relays)      │
   │   • privacy-routing  (transport wrapper consumed by ALL of the above)  │
   └───────────────────────────────────────────────────────────────────────┘
```

**Reading the graph:**
- **L0 `identity.verify()` blocks everything trust-bearing.** No track's anti-forgery half ships without it. It has zero dependencies itself.
- **L1–L3 are mostly already shipped** (the Autobee trio, `relay-record.js`, `index-room-client.js`, HiveRelay seeding, Contacts) — the four tracks are deliberately designed to *reuse*, not rebuild. The genuinely net-new shared crypto is **Schnorr verify** (nostr only) and the **IdentityBinding** record shape (shared by all four, root-signs-subkey/cross-key).
- **privacy-routing sits beside the transport, under L4** — payments and nostr can ship a v1 *without* it (accepting the documented metadata leakage as bounded risk), then *upgrade* to route through it. It is a cross-cutting enhancer, not a hard blocker — which is exactly why it should be specified early but built after the first track proves the substrate.

---

## 4. Recommended build sequence

The sequencing principle: **build the shared substrate first, then ship the track with the highest leverage-per-line and the lowest external dependency, then let the others fall out as schema layers.**

### Slice 0 — `identity.verify()` + `verifyForApp()` (the highest-leverage first slice)

One ~15-line addition to `backend/identity.js` wrapping `sodium.crypto_sign_verify_detached`, plus a tag-reconstructing `verifyForApp`, plus `CMD_IDENTITY_VERIFY = 75`. **Rationale:** it is the explicit Phase-0 prerequisite of *three* tracks simultaneously (naming Phase 2, payments Phase 0, nostr Phase 0), it un-stubs the already-shipped `anongpt-buyer.js` fail-closed receipt path (immediate user-visible value), and it has no dependencies of its own. Nothing else should be built before it. *This is the single best first commit in the whole program.*

### Slice 1 — naming Phase 0–1 (proves the substrate with zero Sybil surface)

Naming's pure foundations (`name-record.js` mirroring `relay-record.js`, NFKC/confusable normalizer, schema constants — all framework-free, Node-testable) plus the petname store + bootstrap aliases. **Rationale:** it is the *only* track whose first user-visible slice ships with **no third-party trust and therefore no Sybil surface** (local petnames + a curated bootstrap set), it fixes a concrete dead-end today (typing `keet` fails), it replaces the frozen `FEATURED_APPS` literal, and it exercises the self-certifying-pointer + directory-ingest pattern that payments and nostr then clone. Lowest risk, fastest win, validates the shared L2 primitives end-to-end.

### Slice 2 — payments Phase 0–2 (closes the highest-priority *correctness* gap)

With `verify()` in hand: ship the signed-receipt op-log (clone the Autobee trio), then wire **real on-chain settlement confirmation** into the POS `crypto_btc`/`crypto_usdc` path (reuse `pear-exchange`'s `monitorAddress`/`monitorConfirmations`). **Rationale:** today the crypto sale path shows a QR and marks `pending` with *zero* settlement verification — the single most severe correctness bug across all four docs (a merchant can be told "paid" when no money arrived). It reuses the receipt-ledger pattern Slice 1 just proved, and the IdentityBinding shape generalizes directly to the merchant binding.

### Slice 3 — nostr Phase 0–3 (interoperability + the cross-curve binding)

Promote `@noble/secp256k1`, vendor the Schnorr bundle, add the net-new Schnorr verify and the cross-curve `IdentityBinding`, then the event store (clone the Autobee trio *again* — third reuse), native read path, and Feed tab. **Rationale:** this is the first track that needs net-new crypto (Schnorr), so it should follow once the Ed25519 substrate is battle-tested by two prior tracks; its event store, verify-and-drop ingest, and binding are by-now-familiar clones; it unlocks ecosystem reach. Sequence its NIP-89 discovery to *merge into* the naming/catalogue endorsement engine from Slice 1, not fork it.

### Slice 4 — privacy-routing (retrofit the transport under all three)

Build the routing wrapper and route payments' settlement path, nostr's publish/fan-out path, and browsing's swarm traffic through it; discharge payments T4/T10 and nostr row-6 in one place. **Rationale:** it can only be validated against *real* traffic from the other tracks, so it follows them; it is an upgrade (turns "bounded metadata risk" into "unlinkable"), not a blocker. Specify its schema early (so the directory and descriptor records are routing-aware from the start), build it last.

### Deferred / spike-gated (shared across tracks)

**Lightning** — the single deferral shared by payments (Candidates D + Lightning) and nostr (NIP-47 NWC, NIP-57 zaps). Gate all of it on **one** Breez-Liquid-WASM-under-Bare spike; when it lands, ship a single Lightning rail that both the POS and the feed consume. Do not build two.

### Sequencing rationale in one line

`verify()` → naming (no Sybil surface, validates substrate) → payments (fixes the worst correctness bug) → nostr (adds net-new crypto + reach) → privacy-routing (retrofits unlinkability) → Lightning (one shared spike).

---

## 5. Track synopses

**Naming** — [`naming.md`](./naming.md). A petname-first, trust-scoped P2P naming layer that supplies the missing "memorable" corner of Zooko's triangle without ever lying about it: the 32-byte key stays canonical, a publisher's claimed nickname carries an "unverified" badge, and a user's saved petname is local-memorable-and-secure. Resolution runs a 4-tier trust frontier (Tier 0 local petname Hyperbee → Tier 1 contacts-bound bindings → Tier 2 followed schema-sheets name rooms with per-row verify-then-drop → Tier 3 baked-in `pear-aliases`-style hint), with no global registrar. It reuses the self-certifying `mutableGet` pointer for live key-rotation survival and the Autobee op-log + pure reducer with a first-owner-wins / owner-only-rotation / epoch-wins policy. The one new crypto prerequisite (`IdentityBinding` + `identity.verify()`) is shared with P2P-search; rollout is flag-gated behind `CMD_RESOLVE_NAME` in `shell.js` `go()`.

**Payments** — [`payments.md`](./payments.md). Upgrades `pear-pos`/`pear-exchange` to P2P-native payments. The core is Candidate B+C: add `OnchainAdapter` and `CashuAdapter` behind POS's existing `PaymentProcessorAdapter`/`registry` crypto slot (reusing `pear-exchange`'s already-built `monitorAddress`/`monitorConfirmations`/`broadcastTx` and NUT-11 Cashu) so the `crypto_btc`/`crypto_usdc` branches finally *confirm settlement before marking paid* — closing the highest-priority gap (today: QR-and-hope, zero verification); and ship the foundational `verify()`/`verifyForApp()`, signed Autobee-logged receipts pinned by HiveRelay, and a root-signed self-certifying merchant-identity binding cloned from `relay-record.js`. Candidate A (legacy BTCPay) is opt-in; Candidate D (NWC) and Lightning are deferred behind a Breez-Liquid-WASM-under-Bare spike. Phased 0→6: verifier → receipt log → on-chain confirm → merchant binding → median FX + Cashu → escrow/disputes → durability.

**Privacy-routing** — [`privacy-routing.md`](./privacy-routing.md). The transport-layer track that discharges the metadata-correlation threats every other track names: payments T4 (stable merchant pubkey + DHT topic + pin pattern clusters customers) and T10 (relay as metadata choke point), nostr's relay-correlation/equivocation (row 6), and the per-invoice / per-session unlinkability requirement common to all three. Its starting premise is that Pear gives self-certifying *authenticity* almost for free (`dht.mutableGet` verifies sigs) but *unlinkability* nowhere, and the leaks are in shipped defaults — vanilla `new Hyperswarm()` (`index.js:1536`) exposes the user's IP:port to every co-swarming peer by construction, and the default-on parallel relay race (`hyper-proxy.js:_doHybridFetch`) lets the HiveRelay gateway observe `{drive key, path, timing, IP}` on nearly every fetch. The design is four opt-in, honestly-labeled layers organized around the governing latency↔anonymity tradeoff: L0 metadata-minimizing defaults (flip the relay race P2P-first, encrypt pinned ledgers/rooms, per-session topic rotation, ephemeral per-invoice/per-session keys — ~zero latency, ships unconditionally, carries most of the value); L1 firewall + single-hop relay-through for high-stakes requests (honestly "proxied," not "anonymous"); L2 an onion/mixnet overlay for the high-anonymity tier (opt-in, latency-gated, never the browse default, blocked on an anonymity-set + honest-relay-count analysis); and L3 a power-user external-Tor/I2P escape hatch (tracked, not built). The one net-new shared record is a self-certifying, social-graph-gated **routing-node directory** (clone `relay-record.js` + verify-and-drop) — everything else is config and key-derivation discipline on shipped code. It explicitly refuses to claim Tor-equivalence: a global passive adversary and a circuit-owning Sybil coalition are out of scope, and exit-node legal liability is bounded by keeping relays Pear-content-only (no open-internet egress). It *wraps* the other tracks rather than being consumed by them; specify its descriptor schema early, build it last after the first track proves the substrate.

**Nostr bridge** — [`nostr-bridge.md`](./nostr-bridge.md). A HiveRelay-native-first Nostr bridge (Approach D): build Approach A (events live in a Pear Autobase/Hyperbee view, advertised via new `nostr-event`/`nostr-relay-list` index-room schemas, pinned Hyperdrive-shaped) as the always-on, offline-first, abuse-hardened substrate; add Approach B (a flagged `bare-ws` legacy `wss://` relay pool with NIP-65 outbox routing) for real Nostr interop; design the schema so Approach C (HiveRelay as a relay façade) is a later additive deployment, not a rewrite. The framing constraint is a curve mismatch — Pear is Ed25519, Nostr mandates secp256k1/Schnorr — handled by a separate deterministically-derived Nostr key bound to the Pear root via a *mutually-signed, epoch-revocable attestation* surfaced as "linked (attested)," never "verified." All inbound events from every transport funnel through one verify-and-reduce path cloned from `autobee-catalog-{ops,apply}`, and a NIP-07 `window.pear.nostr` signer is injected with the secret sealed in the worklet.

---

## 6. The one thing to take away

Four docs, one substrate. The fastest path through the whole program is: **ship `identity.verify()` first** (it unblocks three tracks and un-stubs shipped code in ~15 lines), then **naming** (the only track with no Sybil surface in its first slice — it proves the shared primitives safely), then **payments** (it fixes the worst correctness bug — settlement marked paid without confirmation — and reuses what naming proved), then **nostr** (it adds the only net-new crypto, Schnorr, atop a now-battle-tested Ed25519 substrate), then **privacy-routing** as a transport retrofit that gives all three consistent unlinkability. Lightning is one deferred spike shared by payments and nostr, not two. Everywhere: signed assertion → verify-and-drop → deterministic reducer → HiveRelay pin (Hyperdrive-shaped) → trust-graph ranking; relay is index, not authority; key is canonical, names/handles are honest hints.
