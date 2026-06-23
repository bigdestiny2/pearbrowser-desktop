# Implementation Plan — Four Tracks, One Substrate

> Status: **Build-ready program roadmap** · Stack: Holepunch / Pear — Bare (CJS) + Chromium · Date: 2026-06-17
> Branch grounded: `feat/phase5-relay-directory`
> Source docs (read these for rationale): [`00-overview.md`](./00-overview.md) · [`naming.md`](./naming.md) · [`payments.md`](./payments.md) · [`nostr-bridge.md`](./nostr-bridge.md) · [`privacy-routing.md`](./privacy-routing.md)
> Shipped reference pattern: `backend/autobee-catalog-{ops,apply,manager}.cjs` + [`../AUTOBEE-RESEARCH.md`](../AUTOBEE-RESEARCH.md) — *signed op → verify-and-drop → deterministic wall-clock-free reducer → HiveRelay pin.*

This is the single sequenced plan that implements **all four tracks** (naming, payments, nostr, privacy-routing) as one program. It is concrete enough that an engineer can start **Phase 0 (P0)** from it. Every file path is absolute-from-repo-root and grounded against the real tree; every new RPC constant lists the numeric id and the **mirror obligation** (`backend/constants.js` ↔ `ui/boot.js` — verified hand-mirrored: `CMD_IDENTITY_SIGN:74`, `CMD_LOAD_CATALOG_INDEX:176`, `CMD_CONTACTS_ADD:92`).

> **⚠ Reconciliation with the Lighthouse search track (2026-06-17).** The parallel
> `search(phase1–5)` work already shipped the **shared substrate** this plan's
> §1 specifies — so naming/payments/nostr **reuse it, not rebuild it** (decision:
> "reuse Lighthouse modules as the substrate"). Concretely:
> - `backend/identity-binding.cjs` = the IdentityBinding + detached `verifyAppSig`
>   (same `pear.app.<id>:<ns>:` tag). It is **already generic** (`rootPubkey →
>   subPubkey`, named "search"). **Phase N2 is superseded** — naming binds its
>   name key via `makeBinding`/`verifyBinding`/`resolveSearchKey`. *Open coordination:*
>   add a `purpose` domain field to the binding (`name`/`merchant`/`nostr`/`search`)
>   so one binding can't be cross-purpose-replayed — a small, coordinated change to
>   the shared module, scheduled at N2.
> - `backend/search-frontier.cjs` `verifyIndexPointer` = the **social-graph Sybil
>   gate** (shared primitive #7). `backend/search-completeness.cjs`
>   `verifyAnchor`/`verifyFreshness` = **omission/eclipse detection** (program wall #2).
> - P0's `identity.verify()`/`verifyForApp()` (instance method + `CMD_IDENTITY_VERIFY`)
>   stays as the **Bare/RPC layer**; pure verify-and-drop in the tracks uses the
>   `.cjs` `verifyAppSig`/`verifyBinding`.
> - Infra builds on its **own branch** (`feat/p2p-infra-naming`) off the search
>   substrate, to avoid colliding with active `search(*)` commits.

---

## 0. Thesis & dependency graph

**The thesis — four projections of one substrate.** These are *not four features.* Each is *a signed assertion bound to an Ed25519 identity, ingested through a verify-and-drop edge, reduced by a deterministic wall-clock-free reducer, made durable by HiveRelay pinning, and resolved relative to a social trust graph rather than a global registrar.* Naming binds `name → key`; payments binds `sale → receipt`; nostr binds `event → author`; privacy-routing wraps the transport all three ride on. The same five shared primitives appear in all four — build them once, and the four tracks become thin schema-and-policy layers.

**The L0→L4 dependency graph (from the overview):**

```
 L0  identity.verify() / verifyForApp()  ── THE root gate (sodium.crypto_sign_verify_detached)
      │  zero deps itself; every signed-record consumer needs it
      ├───────────────┬────────────────────────┬─────────────────────────┐
      ▼               ▼                        ▼                         ▼
 L1a Schnorr     L1b IdentityBinding     L1c per-app subkeys       (per-session/
 verify          (root-signed:           getAppKeypair             per-invoice key
 (net-new,       name/merchant/          ── SHIPPED ──             derivation,
  nostr only)    nostr/routing)                                    generalizes L1c)
      └───────────────┴────────────────────────┴─────────────────────────┘
                                   ▼
 L2  self-certify DHT pointer     Autobee op-log + reducer     verify-and-drop directory ingest
     (relay-record.js) SHIPPED    (autobee-catalog) SHIPPED    (index-room-client.js) SHIPPED
                                   ▼
 L3  HiveRelay pin (Hyperdrive-shaped)    +    social-graph Sybil gate (contacts, attack-edge bound)
                                   ▼
 L4  TRACK PAYLOADS
       • naming     (petname store, name rooms, ranker)
       • payments   (settlement adapters, receipt ledger, escrow)
       • nostr      (event store, feed, NIP-07 signer, legacy relays)
       • privacy-routing (transport wrapper consumed by ALL of the above)
```

**Reading it:** L0 `identity.verify()` blocks everything trust-bearing and has no deps of its own — it is the single highest-leverage first commit. L1–L3 are *mostly already shipped* (the Autobee trio, `relay-record.js`, `index-room-client.js`, HiveRelay seeding, Contacts); the genuinely net-new shared crypto is **Schnorr verify** (nostr only) and the **IdentityBinding** record shape (shared by all four). privacy-routing sits beside the transport under L4 — payments and nostr ship a v1 *without* it (bounded, documented metadata risk) and *upgrade* to route through it; specify its descriptor schema early, build it last.

**Build spine (overview §4):** `verify()` → naming → payments → nostr → privacy-routing, with **Lightning as one shared spike** gated for payments + nostr together.

---

## 1. Shared substrate (build once)

The 5 shared primitives + the L0 root gate. "Exists today" = reuse verbatim; "net-new" = build in the phase named.

| # | Shared primitive | Exists today (file path) | Net-new work | Shared interface |
|---|---|---|---|---|
| **L0** | **`identity.verify()` / `verifyForApp()`** | `backend/identity.js` — `sign`(:292), `signForApp`(:262), `getAppKeypair`(:229) present; **NO verify** (`crypto_sign_verify_detached` bundled in `sodium-universal`, unsurfaced) | ~15-line `verify(payload, sigHex, pubHex)` + tag-reconstructing `verifyForApp(driveKeyHex, payload, ns, {signature, publicKey})`; `CMD_IDENTITY_VERIFY = 75` | `verify(payload, signatureHex, publicKeyHex) -> bool`; `verifyForApp(...) -> bool`. Un-stubs `backend/anongpt-buyer.js:238` (`verify.ok`). **The single highest-leverage first commit — Phase P0.** |
| 1 | **Ed25519 identity + per-app subkeys** | `backend/identity.js` — `getAppKeypair(driveKeyHex)`(:229) = `ed25519.seed_keypair(SHA-256(rootSeed‖"pear-app-v1:"‖driveKey))`; `signForApp`(:262) | per-domain separators: `getNameKeypair` (`pear-name-v1:`), `getNostrKeypair` (`pear-nostr-v1:`, secp256k1), per-session/per-invoice subkeys | `getXKeypair(scope) -> {publicKey, secretKey}`; deterministic, same root+scope = same key forever |
| 2 | **Self-certifying DHT mutable record** | `backend/relay-record.js` — `resolveRelayRecord(dht, pubkey)`(:39) via `dht.mutableGet` (sig-verified); `resolveBootstrapRelays`(:60); `RELAY_RECORD_VERSION` | clone shape into `name-record.js`, `merchant-record.js`, `routing-record.js` (each `*_RECORD_VERSION=1`, versioned decode) | `resolveXRecord(dht, pubkey) -> decoded|null`; "malicious node serves stale, never forges" |
| 3 | **Autobee op-log + deterministic reducer** | `backend/autobee-catalog-{ops,apply,manager}.cjs` — `validateOp`(ops:89) tri-state, `linearize`(apply:26) on `(seq,writer,stableHash)`, `applyView`(apply:35); no wall-clock; `MAX_OP_BYTES`, `hasUnsafeKey` | clone trio per track w/ new op types + **new reducer policy** (naming: first-claim/revoke-wins; receipts: monotonic finality; nostr: replaceable/addressable) | pure `.cjs`: `validateOp(op) -> {ok|retain|reject}`, `linearize(tagged)`, `applyView(nodes)`; Node-testable, no Autobase import |
| 4 | **Verify-and-drop directory ingest** | `backend/index-room-client.js` `IndexRoomClient`(:61), `listRelayDirectory`(:120), `verification:'relay-listed'`(:56); `backend/relay-directory.js` `mergeRelayDirectory`(:24) | new index-room schemas: `name-directory`, `merchant-directory`, `nostr-event`/`nostr-relay-list`, `routing-node` — each with a `verify(doc)` row verifier | `listX()` re-verifies every signed row, **drops on failure** ("index, not authority") |
| 5 | **HiveRelay always-on pinning** | `backend/index.js` — `hiveRelay.seed(key,{replicas:3})` (:457,:1746); `relayClient.bootstrapFromDht`(:1662); `BOOTSTRAP_RELAYS`(constants:196) | pin name rooms / receipt+escrow ledgers / event mirror / routing descriptors — **all Hyperdrive-shaped** (AutoHeal floor) | `hiveRelay.seed(keyHex, {replicas:3, discoveryKey})`; durable mirror stored Hyperdrive-shaped |
| — | **Social-graph Sybil gate** | `backend/contacts.js` — Hyperbee `contact!<rootPubkey>`(:12), `lookup`(:64), `add`(:71), `parseInviteURL`(:123, signed ceremony) | `endorserBreadth` = distinct frontier root-pubkeys; ranker consumes it (one engine — see §4) | influence bounded by **attack edges, not nodes**; adding a contact is a signed ceremony, not free |

**Highest-leverage first commit (call-out):** `identity.verify()` / `verifyForApp()` + `CMD_IDENTITY_VERIFY = 75`. It is the explicit Phase-0 prerequisite of *three* tracks simultaneously (naming N1, payments PAY0, nostr NOSTR0), it un-stubs the already-shipped `anongpt-buyer.js` fail-closed receipt path (immediate user-visible value), and it has zero dependencies. Nothing else is built before it.

---

## 2. The phases — the spine

Sequence follows the overview (Slice 0 verify → naming → payments → nostr → privacy-routing), with each track's per-doc rollout expanded into numbered program phases. **ID prefixes:** `P0` (shared root), `SEC0` (seed-at-rest gate, §5), `N0..N6` (naming), `PAY0..PAY6` (payments), `NOSTR0..NOSTR8` (nostr), `PRIV0..PRIV4` (privacy-routing). **Gating spikes (defined in §5, go/no-go before their dependents exit):** `SPIKE-AUTOBEE-DURABILITY` (gates N5/PAY1/PAY6/NOSTR1), `SPIKE-SCHNORR-BARE` (gates NOSTR0..NOSTR8), `SPIKE-LN` (shared Lightning rail, gates PAY-Lightning/NOSTR8).

**Phase/spike count:** 30 build phases (P0=1; SEC0=1; N0–N6=7; PAY0–PAY6=7; NOSTR0–NOSTR8=9; PRIV0–PRIV4=5) + 3 gating spikes (`SPIKE-AUTOBEE-DURABILITY`, `SPIKE-SCHNORR-BARE`, `SPIKE-LN`) = **33 sequenced items.** (SEC0 and the two new spikes are this revision's lock-down additions; durability and Schnorr-under-Bare are now *proven before* they're depended on, and seed-at-rest gates first real-user money/identity.)

**Constant-numbering ground truth (verified):** `CMD_IDENTITY_SIGN=74`, `CMD_LOAD_CATALOG_INDEX=176`, sync `180–187`, `CMD_BRIDGE=200`, `CMD_RUN_APP_IN_TAB=201`. **Free CMD ranges:** `75` (verify), `188–199` (nostr), `210–249` (payments), `250–269` (naming), `270–289` (routing). **EVT ground truth:** EVT block is occupied through `EVT_PEAR_APP_EXITED=108`; **next free EVT id is 109** (the nostr doc's draft `EVT_NOSTR_EVENT=108` collides — use `109+`). **Every new CMD_/EVT_ MUST be added to `backend/constants.js` AND mirrored by hand into `ui/boot.js`.**

---

### P0 — Shared root gate: `identity.verify()` + `verifyForApp()`
- **Goal.** Ship the one missing crypto primitive that gates the anti-forgery half of every track; un-stub `anongpt-buyer.js`.
- **Track / doc-section.** Shared substrate; overview §2.1 Slice 0; payments §7.1a; naming §7.4; nostr §7.2.
- **Deliverables.**
  - TOUCH `backend/identity.js`: add `verify(payload, signatureHex, publicKeyHex)` (wrap `sodium.crypto_sign_verify_detached`) + `verifyForApp(driveKeyHex, payload, namespace, {signature, publicKey})` (reconstruct the `pear.app.<driveKey>:<namespace>:` tag from `signForApp`:264 before verifying).
  - TOUCH `backend/anongpt-buyer.js:238`: replace the stub (`verify.ok=false, reason:'…phase-1b'`) with a real `identity.verifyForApp(...)` call.
  - TOUCH `backend/index.js`: `rpc.handle(C.CMD_IDENTITY_VERIFY, …)`.
  - TOUCH `backend/constants.js` + `ui/boot.js`: `CMD_IDENTITY_VERIFY = 75` (mirror).
  - Reuses: primitive #1 (identity).
- **Tests/verification.** Node unit test `test/identity-verify.test.js`: known-good sign→verify round-trip; tamper → false; wrong pubkey → false; `verifyForApp` tag-mismatch (different driveKey/namespace) → false. Smoke: drive an `anongpt-buyer` receipt end-to-end and assert `verify.ok===true`. **Exit:** all green; `anongpt-buyer` no longer ships fail-closed.
- **Depends on.** Nothing.
- **Effort.** S.
- **Flagged?** No (pure additive primitive).

---

### SEC0 — Shared: seed-at-rest hardening (gates first real-user money/identity)
- **Goal.** Encrypt the root BIP-39 seed at rest so the *first* real-user money or public-identity flag can be honestly enabled. Full go/no-go and rationale: **§5 (`SEC0`)** — kept there because the keystore move is likely its own Bare porting spike, not a free clause.
- **Track / doc-section.** Shared substrate; payments T11 (Critical); `identity.js` header ("Not encrypted at rest … future improvement is to use the OS keystore").
- **Deliverables.** TOUCH `backend/identity.js`: wrap `identity.json`'s seed behind an OS-keystore-backed (or, fallback, passphrase-derived scrypt/argon2-in-Bare) wrapping key; migrate existing plaintext seeds on first launch. **May require a porting spike** (no Node `keytar` under Bare — needs a Bare-reachable OS-keychain path); treat that as part of this phase's risk, not PAY6's "M."
- **Tests/verification.** Round-trip: seed encrypts at rest, decrypts on unlock; first-launch migration of an existing plaintext `identity.json`; wrong-key/passphrase → fail-closed. **Exit:** root seed no longer sits plaintext at rest; the gate for real-user enablement of PAY2 / NOSTR2 / N2 is satisfiable.
- **Depends on.** P0. **Gates (real-user enablement of):** PAY2, NOSTR2, N2.
- **Effort.** M (+ likely a Bare keystore porting spike — see §5).
- **Flagged?** No (it's a hardening gate, not a user-facing flag) — but its *completion* is the precondition that flips PAY2/NOSTR2/N2 from dev-only to real-user.

---

### N0 — Naming: pure foundations (no flag, no network)
- **Goal.** Land the framework-free, Node-testable building blocks; de-risk everything downstream.
- **Track / doc-section.** naming §9 Phase 0; §7.2, §7.5.
- **Deliverables.**
  - CREATE `backend/name-record.js` (mirror `backend/relay-record.js`): `NAME_RECORD_VERSION=1`, `decodeNameRecord`, `resolveNameRecord(dht, nameSubPubkey)` via `mutableGet` (b4a-only, no Autobase import). Record shape `{v, n, k, s, l?}` (name, drive key, monotonic seq, optional link).
  - CREATE `backend/name-normalize.cjs`: pure NFKC normalizer + confusable-skeleton (homograph defense).
  - CREATE the `name-binding` schema constant (copy `apps` block, `backend/sheets-catalog.js:24`): `name`, `driveKey|link` (anyOf), `binderPubkey`, `bindingSig`, `verification` enum (reuse `['unverified','relay-listed','author-signed']`).
  - FIX the `MAX_SHEETS_ROWS` export bug (imported-but-unexported → `undefined`, bounds nothing) — `backend/sheets-catalog.js`.
  - Reuses: primitives #2, #4.
- **Tests/verification.** `test/name-record.test.js` (versioned decode, reject bad version/fields), `test/name-normalize.test.js` (NFKC idempotence, Cyrillic `раypal`→skeleton collision, zero-width strip). **Exit:** pure modules pass under plain `node`; `MAX_SHEETS_ROWS` exported and bounds reads.
- **Depends on.** P0 (for later verify; N0 itself ships independently).
- **Effort.** S.
- **Flagged?** No (ships nothing user-visible).

### N1 — Naming: petnames + decaying bootstrap aliases (flagged)
- **Goal.** Day-one win: `keet` resolves; users save private aliases. No Sybil surface (local petnames + curated bootstrap only).
- **Track / doc-section.** naming §9 Phase 1; §7.3, §7.6, §7.7 steps 0–1+4.
- **Deliverables.**
  - CREATE `backend/names.js` (mirror `backend/contacts.js`): local Hyperbee `pearbrowser-names-v1`, `pet!<name>→{key,link?,…}`, `seen!<keyHex>→{lastNickname,…}`; `lookup/put/remove/list`.
  - TOUCH `backend/constants.js` + `ui/boot.js`: `NAME_ALIASES` (typed successor to `ui/shell.js:33` `FEATURED_APPS`), `NAME_DIRECTORY` seed (parallel to `BOOTSTRAP_RELAYS`); `CMD_NAME_RESOLVE=250`, `CMD_NAME_PETNAME_LIST=251`, `CMD_NAME_PETNAME_SET=252`, `CMD_NAME_PETNAME_REMOVE=253`, `CMD_NAME_LOAD_DIRECTORY=254` (mirror all).
  - TOUCH `backend/index.js`: `resolveName()` steps 0–1+4 wired into the `normalizeDriveKey` (:19) unknown-format fall-through (:26); `requireNaming()` flag gate (model on `requireAutobee`:817); `experimentalNaming` user-data setting.
  - TOUCH `ui/shell.js` `go()`(:507): render `resolving …` + provenance chip; replace `FEATURED_APPS` literal path.
  - Reuses: primitives #1, #2, #5; #4 for the directory.
- **Tests/verification.** `test/names.test.js` (petname CRUD), `test/resolve-name.test.js` (pure resolver: petname HIT offline, bootstrap floor rank, decay). Smoke: type `keet`, assert resolves to bootstrap key with `prov:'curated'`. **Exit:** bare word resolves; private alias persists; disabled flag → no boot impact.
- **Depends on.** N0.
- **Effort.** M.
- **Flagged?** Yes (`experimentalNaming`, off by default).

### N2 — Naming: IdentityBinding + name keys (anti-Sybil unblock, flagged)
- **Goal.** Ship the verifier-backed binding that makes third-party name trust provable.
- **Track / doc-section.** naming §9 Phase 2; §7.4.
- **Deliverables.**
  - TOUCH `backend/identity.js`: `getNameKeypair(name)` (`pear-name-v1:` separator). (`verify()` already landed in P0.)
  - CREATE the `IdentityBinding` record `{rootPubkey, nameSubPubkey, sig_by_root}` published to `meta!binding` + DHT (`mutablePut`, self-certifying). **This is the canonical cross-track binding shape — see §4.**
  - Reuses: primitive #1, #2; P0 verify.
- **Tests/verification.** `test/identity-binding.test.js` (root-signs-subkey verifies; forged sub → reject; frontier-membership gate). **Exit:** a `name` row is acceptable only if sig checks against `nameSubPubkey` AND an `IdentityBinding` ties it to a frontier `rootPubkey`.
- **Depends on.** P0, N1. **For real-user enablement of the binding (the moment a user publishes an `IdentityBinding` derived from the root seed): `SEC0` (seed-at-rest hardening) — binding a public, durable identity to an unencrypted-at-rest root is the same T11 exposure as money.**
- **Effort.** M.
- **Flagged?** Yes (`experimentalNaming`).

### N3 — Naming: pointer publish + claim/revoke (flagged)
- **Goal.** Names survive drive-key rotation; first publishers can claim.
- **Track / doc-section.** naming §9 Phase 3; §7.2, §7.4.
- **Deliverables.**
  - TOUCH `backend/index.js`: `CMD_NAME_CLAIM=255`, `CMD_NAME_REVOKE=256` (mirror). Publish signed pointer (`dht.mutablePut`) + in-drive `/.well-known/pear-name-attest` (`signForApp(driveKey, 'pear.name:<name>:<driveKey>', 'name')`) for the `author-signed` tier.
  - TOUCH `backend/index.js` `resolveName()`: add step 2 (pointer resolution via `resolveNameRecord` + seq/sig check).
  - Reuses: `name-record.js`, primitive #5 (pin pointer).
- **Tests/verification.** Pointer round-trip; IPNS seq discipline (higher seq supersedes); only drive-anchored bindings earn `author-signed`. Smoke: rotate a drive key, assert the name follows. **Exit:** rotation-survival demonstrated.
- **Depends on.** N2.
- **Effort.** M.
- **Flagged?** Yes.

### N4 — Naming: endorsement rooms + trust-relative ranking (flagged)
- **Goal.** "find pearmail" resolves over your trust graph; squatting becomes a ranking problem.
- **Track / doc-section.** naming §9 Phase 4; §7.5, §7.7 step 3.
- **Deliverables.**
  - CREATE `backend/name-row-verifier.js`: `RowVerifier` (IdentityBinding + sig + frontier membership) → drop bad rows.
  - CREATE the **shared endorsement ranker** `backend/endorsement-rank.cjs` (pure): `socialProximity × endorserBreadth × tier × coList`, deterministic, no `Date.now`. **This is the ONE ranking engine — see §4; name resolution (here) and nostr NIP-89 endorsement-scoring (NOSTR6) consume the same module.** (Catalogue *dedup* is a separate shipped concern — `getAggregatedApps` / `ui/shell.js:1505` — not a ranker consumer.)
  - TOUCH `backend/index.js` `resolveName()`: add step 3 + disambiguation chooser; `name-binding` rooms loaded via existing sheets/index path; `name-directory` consumed through `IndexRoomClient` verify-and-drop.
  - Reuses: primitive #4, #—(Sybil gate), `endorsement-rank.cjs`.
- **Tests/verification.** `test/endorsement-rank.test.js` (determinism, Sybil army behind one edge ≠ breadth, coList boost). Smoke: two curators endorsing the same name → ranked chooser. **Exit:** ranked resolution with provenance; forged rows dropped.
- **Depends on.** N2 (binding), N3.
- **Effort.** L.
- **Flagged?** Yes.

### N5 — Naming: scoped multi-writer namespaces (flagged, durability-gated)
- **Goal.** Brands/teams curate delegated sub-namespaces.
- **Track / doc-section.** naming §9 Phase 5; §7.5.
- **Deliverables.** CREATE `backend/name-registry-{ops,apply}.cjs` (clone Autobee trio) with op types `name.claim`/`name.release`/`name.rotate`/`name.revoke`/`writer.add` and a **new reducer policy**: first-claim-wins within deterministic order, revoke-wins, rotate-supersedes. A `pearname://` scheme (`ui/lib/keys.js` `parseCatalogRef`:138 precedent). Reuses primitive #3.
- **Tests/verification.** Reducer policy tests (first-claim, revoke-wins, no clock-skew resurrection); two-writer convergence smoke; **and the durability acceptance test from `SPIKE-AUTOBEE-DURABILITY`: take all registry writers offline, then re-resolve a `name.claim` pulled fresh from HiveRelay.** **Exit:** scoped namespace converges deterministically **AND a claim survives all writers going offline** (this exit was previously unreachable — it implicitly required the durability proof that `SPIKE-AUTOBEE-DURABILITY` now supplies; before the spike goes green, N5 cannot exit).
- **Depends on.** N4; `SPIKE-AUTOBEE-DURABILITY` (go) — the registry is a multi-writer Autobee whose whole value (a name that outlives its publisher) is the property the spike proves.
- **Effort.** L.
- **Flagged?** Yes (experimental).

### N6 — Naming: optional domain attestation (NIP-05 layer)
- **Goal.** A "domain-verified" badge for publishers who own a domain — never the primary binding.
- **Track / doc-section.** naming §9 Phase 6; §7 Approach D. **Shares the `/.well-known` + badge with nostr NIP-05 — see §4.**
- **Deliverables.** Fetch `/.well-known/pear.json` over the Hyperdrive-backed HTTP bridge; "domain-verified" badge component (shared with NIP-05). Reuses primitive #4 provenance UX.
- **Tests/verification.** Badge renders only on a valid domain attestation that matches the key. **Exit:** badge is additive, key stays canonical.
- **Depends on.** N4. **Effort.** S. **Flagged?** Yes (defer; nice-to-have).

---

### PAY0 — Payments: the verifier (no flag)
- **Goal.** Foundation already mostly delivered by P0; confirm payments-side wiring.
- **Track / doc-section.** payments §9 Phase 0; §7.1a.
- **Deliverables.** (P0 ships `verify`/`verifyForApp` + `CMD_IDENTITY_VERIFY=75`.) Payments-side: assert `anongpt-buyer` un-stub holds; no new code beyond P0. Reuses P0.
- **Tests/verification.** Covered by P0 tests. **Exit:** = P0 exit.
- **Depends on.** P0. **Effort.** S. **Flagged?** No.

### PAY1 — Payments: signed receipt op-log (flagged)
- **Goal.** Tamper-evident, buyer-verifiable, deterministically-ordered receipt ledger.
- **Track / doc-section.** payments §9 Phase 1; §7.2.
- **Deliverables.**
  - CREATE `backend/payment-receipt-{ops,apply}.cjs` + `backend/payment-receipt-manager.cjs` (clone Autobee trio). Ops: `receipt.issue`/`receipt.finalize`/`receipt.refund`/`dispute.open`/`dispute.evidence`. `SCHEMA_VERSION=1`, `MAX_OP_BYTES=16*1024`, `validateOp` tri-state, `hasUnsafeKey`, **no wall-clock**.
  - Reducer rules: `finality` **monotonic** (`pending<settling<final`); `receipt.issue` whole-record keyed `receiptId=sha256(merchantSub‖saleNonce)`; **apply re-verifies `sig`** via `identity.verifyForApp` before materializing (unverifiable op retained-but-excluded). View keys: `receipt!<id>`, `receipt-by-sale!<saleId>`, `finality!<id>`, `voucher!<refundId>`, `dispute!<id>!<seq>`.
  - **Encrypted Autobase** (`encryptionKey`) per merchant ledger via the **shared encrypted-Autobase blind-pin helper (§4)** — build it here if PAY1 lands before PRIV0, else import it from PRIV0; do **not** hand-roll the `encryptionKey` setup twice. Writer membership gated to counterparties; lazily required behind `experimentalSignedReceipts`.
  - TOUCH `backend/constants.js`+`ui/boot.js`: `CMD_RECEIPT_ISSUE=212`, `CMD_RECEIPT_VERIFY=213`, `CMD_RECEIPT_LIST=214`, `CMD_RECEIPT_FINALIZE=215`, `CMD_REFUND_VOUCHER_ISSUE=216` (mirror).
  - Reuses: primitives #1, #3, #5; P0 verify; shared blind-pin helper (§4).
- **Tests/verification.** `test/payment-receipt-apply.test.js` (concurrent issue/finalize, restart determinism, forged-sig rejection, monotonic finality). Two-writer smoke: convergence + non-counterparty replicates bytes but reads nothing (encryption). Durability smoke (from `SPIKE-AUTOBEE-DURABILITY`): both writers offline → relay re-serves the ledger. **Exit:** deterministic, encrypted, forge-resistant ledger; no settlement wiring yet.
- **Depends on.** PAY0; `SPIKE-AUTOBEE-DURABILITY` (go) — a receipt ledger that vanishes when both counterparties go offline is not a ledger; the spike proves it re-serves from HiveRelay.
- **Effort.** M.
- **Flagged?** Yes (`experimentalSignedReceipts`, off).

### PAY2 — Payments: real on-chain confirmation in POS (flagged) — *closes the worst correctness bug*
- **Goal.** A `crypto_btc`/`crypto_usdc` sale never shows "paid" before settlement is confirmed. Replaces "QR and hope."
- **Track / doc-section.** payments §9 Phase 2; §7.3a, §6 Candidate B.
- **Deliverables.**
  - Vendor `pear-exchange/app/backend/escrow-btc.js`'s on-chain client (`fetchUTXOs`, `monitorAddress`, `monitorConfirmations`, `broadcastTx`) as a **shared `.cjs`** (see §4 module-sharing).
  - CREATE `pear-pos/app/backend/processors/onchain.js` (`OnchainAdapter`, template `processors/btcpay.js`): `createTransaction`→per-sale receive address + median FX + `invoice:created`; `collectPaymentMethod`→`monitorAddress`; `confirmPayment`→`monitorConfirmations` → `CAPTURED` at `requiredConfs`.
  - TOUCH `pear-pos/app/backend/processors/registry.js`: `PROCESSOR_TYPES.ONCHAIN`; crypto slot accepts `onchain`; lazy `_requireAdapter`.
  - TOUCH `pear-pos/app/backend/payments.js` (~496–554): the load-bearing fix — route `crypto_*` through `getActiveCryptoProcessor().createTransaction→collect→confirm`; mark paid **only on CAPTURED**; emit a `receipt.issue` op (PAY1) signed via `identity.signForApp(storefrontDriveKey, receipt, 'receipt')`.
  - Reuses: PAY1 ledger, vendored on-chain client.
- **Tests/verification.** Testnet-first (`config.network`). Smoke: simulated deposit → confirmations tick → `CAPTURED` → receipt op appended. **Exit:** sale marked paid only after N confs; highest-priority correctness gap closed.
- **Depends on.** PAY1. **For real-user (mainnet) enablement of `experimentalOnchainConfirm`: `SEC0` (seed-at-rest hardening) must have shipped — no real money flows against an unencrypted-at-rest root seed (threat T11, Critical).**
- **Effort.** L.
- **Flagged?** Yes (`experimentalOnchainConfirm`).

### PAY3 — Payments: merchant identity binding (flagged)
- **Goal.** A receipt's merchant pubkey is bindable to a storefront/root identity, self-certifying + re-verifiable.
- **Track / doc-section.** payments §9 Phase 3; §7.1b.
- **Deliverables.**
  - CREATE `backend/merchant-record.js` (clone `relay-record.js`): doc `{v, merchantRootPubkey, posSubPubkey, storefrontDriveKey, displayName, issuedAt}`, signed by root, `dht.mutablePut(rootPubkey)`. **Same `IdentityBinding` family as N2 — see §4.**
  - TOUCH `backend/index.js`+constants+boot: `CMD_MERCHANT_BIND_PUBLISH=210`, `CMD_MERCHANT_BIND_RESOLVE=211` (mirror). `CMD_RECEIPT_VERIFY` (PAY1) resolves the binding + `verifyForApp`s the receipt → `verify.ok=true`.
  - **Selective-disclosure boundary:** merchant publicly bound (accountability); buyer never bound — each invoice derives an ephemeral per-invoice subkey (consumed by privacy-routing PRIV0). 
  - Reuses: primitive #2, #4; P0 verify.
- **Tests/verification.** `test/merchant-record.test.js` (self-certify resolve, forged binding dropped); buyer-side receipt verify smoke. **Exit:** buyer verifies a receipt against a re-verified merchant binding.
- **Depends on.** PAY1, P0.
- **Effort.** M.
- **Flagged?** Yes.

### PAY4 — Payments: trust-minimized FX + Cashu rail (flagged)
- **Goal.** Multi-source median FX stamped into receipts; an offline-transferable ecash rail.
- **Track / doc-section.** payments §9 Phase 4; §7.5, §7.3b.
- **Deliverables.** Vendor `pear-exchange/.../price-feeds.js` (median + `rejectOutliers`, `minSources`); replace `payments.js:usdToBtc()` single-CoinGecko; stamp `fxQuote{median,sources,at}` into the receipt. CREATE `pear-pos/app/backend/processors/cashu.js` (`CashuAdapter`, reuse `escrow-cashu.js` NUT-11) against a **real configured mint** (replace `mint.example.com`); redeem-at-mint = double-spend prevention; surface mint-custody caveat in UI. Reuses PAY1 receipts.
- **Tests/verification.** Median/outlier-rejection unit tests; Cashu redeem smoke against a test mint. **Exit:** FX auditable in receipt; ecash redeem confirms before "paid."
- **Depends on.** PAY2 (adapter seam), PAY3 (receipt verify). **Effort.** M. **Flagged?** Yes.

### PAY5 — Payments: escrow + disputes in POS (flagged, experimental)
- **Goal.** Held-funds / marketplace flows with non-custodial 2-of-3 dispute resolution.
- **Track / doc-section.** payments §9 Phase 5; §7.4.
- **Deliverables.** CREATE `pear-pos/app/backend/processors/escrow.js` wrapping `pear-exchange` `createEscrowAPI` (2-of-3 P2WSH; arbiter key is a **third party**, not the operator — T9/legal). `CMD_ESCROW_FUND=220`/`RELEASE=221`/`REFUND=222`, `CMD_DISPUTE_OPEN=223`/`EVIDENCE=224` (mirror). Encrypted append-only evidence log (PAY1 dispute ops); `pending→escrowed→settling→final` UI state machine. Reuses PAY1, vendored escrow.
- **Tests/verification.** State-machine + signature-threshold tests; dispute-evidence immutability. **Exit:** funds release only on 2-of-3; evidence un-rewritable. MVP = single pre-agreed arbiter.
- **Depends on.** PAY2, PAY3. **Effort.** L. **Flagged?** Yes.

### PAY6 — Payments: durability + multi-relay pinning hardening
- **Goal.** Receipts/escrow survive both parties offline; no single-relay choke.
- **Track / doc-section.** payments §9 Phase 6; §7.2 durability, T10/T11.
- **Deliverables.** Pin receipt/escrow rooms `hiveRelay.seed(…,{replicas:3})` **Hyperdrive-shaped**; let merchants pin their own. (Seed-at-rest / OS-keystore is **no longer a trailing clause here** — it was promoted to its own gating phase `SEC0`, which must precede real-money enablement; see §5 and PAY2.) Reuses primitive #5. **Consumes privacy-routing PRIV0 encryption + PRIV2's split-pinner relay-through (pin-relay ≠ fetch-relay).**
- **Tests/verification.** Both-writers-offline → relay re-serves ledger (this is exactly the `SPIKE-AUTOBEE-DURABILITY` acceptance test, exercised here on the real receipt/escrow rooms); pin-relay ≠ fetch-relay. **Exit:** durable, multi-relay, index-not-authority.
- **Depends on.** PAY1, PRIV0, `SPIKE-AUTOBEE-DURABILITY` (go) — this phase *is* the program's durability promise made real; it cannot be claimed before the spike proves re-serve-after-all-writers-offline. **Effort.** M. **Flagged?** Yes.

---

### NOSTR0 — Nostr: crypto foundation (flagged-internal) — *first net-new crypto (Schnorr)*
- **Goal.** secp256k1/Schnorr verify + nostr key derivation; the gate that blocks every later nostr phase. (The risky "does a Schnorr bundle even load under Bare?" question is hoisted out into `SPIKE-SCHNORR-BARE` — §5; NOSTR0 *consumes* its outcome rather than discovering it.)
- **Track / doc-section.** nostr §9 Phase 0; §7.2; Flag F.
- **Deliverables.**
  - TOUCH `package.json`: **promote `@noble/secp256k1` to a declared dep** (today only a `p2p-hiverelay` transitive — latent breakage).
  - CONSUME `SPIKE-SCHNORR-BARE`'s `backend/secp256k1-bundle.cjs` (the Bare-loadable Schnorr verify+sign module the spike landed and CI-gated); wire it in — do **not** rediscover the bundling here.
  - TOUCH `backend/identity.js`: `getNostrKeypair()` (`SHA-256(rootSeed‖"pear-nostr-v1:")` → secp256k1 x-only), `nostrSign`, `nostrVerify`. (`identity.verify` Ed25519 already in P0.)
  - Reuses: primitive #1; P0; `SPIKE-SCHNORR-BARE` bundle.
- **Tests/verification.** `test/nostr-events-ops.test.js` **id-serialization + Schnorr fixture vectors against a known-good signer** (Flag F) — NIP-01 strict escaping byte-exactness. **Exit:** Schnorr sign/verify + id-hash match fixtures; bundle (already CI-gated under Bare by `SPIKE-SCHNORR-BARE`) wired into `getNostrKeypair`/`nostrSign`/`nostrVerify`. **This gate blocks NOSTR1+.**
- **Depends on.** P0, `SPIKE-SCHNORR-BARE` (go).
- **Effort.** S (the highest-risk net-new crypto dependency is now de-risked inside `SPIKE-SCHNORR-BARE`; what remains is key-derivation + wiring).
- **Flagged?** No user surface; internal.

### NOSTR1 — Nostr: event store + reducer (flagged, internal)
- **Goal.** A queryable local event view; the Autobee pattern applied to NIP-01 events.
- **Track / doc-section.** nostr §9 Phase 1; §7.3.
- **Deliverables.**
  - CREATE `backend/nostr-events-ops.cjs` (PURE): `validateEvent` (7 fields, recompute `id=sha256(serialize([0,pubkey,created_at,kind,tags,content]))`, **Schnorr-verify `sig`**, clamp, kind whitelist, unknown kind → `retain:true`), `MAX_EVENT_BYTES`, `hasUnsafeKey`.
  - CREATE `backend/nostr-events-apply.cjs` (PURE): `linearize` by **writer+seq, never `created_at`**; view keys `evt!<id>`, `replaceable!<kind>:<pubkey>`, `addr!<kind>:<pubkey>:<d>`; monotonic-epoch tiebreak with advisory `(created_at,id)` fallback.
  - CREATE `backend/nostr-event-store.cjs` (manager, clone `autobee-catalog-manager.cjs`): Autobase over shared `store`, `writer.add` multi-device.
  - TOUCH constants+boot: `CMD_NOSTR_PUBLISH=191`, `CMD_NOSTR_QUERY=192` (mirror). Flag `nostrBridge.enabled`.
  - Reuses: primitive #3; NOSTR0 Schnorr.
- **Tests/verification.** validate/dedup/replaceable/addressable reduction; hostile-reorder determinism; durability smoke (from `SPIKE-AUTOBEE-DURABILITY`): writers offline → event view re-serves from HiveRelay. **Exit:** publish→local view→query, no network.
- **Depends on.** NOSTR0 (which carries `SPIKE-SCHNORR-BARE` — the reducer's `Schnorr-verify sig` path is unbuildable until the bundle is proven under Bare); `SPIKE-AUTOBEE-DURABILITY` (go) — the event store is an Autobase whose mirror must survive all writers offline, the same risk as receipts.
- **Effort.** M.
- **Flagged?** Yes (`nostrBridge.enabled`).

### NOSTR2 — Nostr: identity binding + revocation (flagged)
- **Goal.** Cross-curve `IdentityBinding`, honestly surfaced as "linked (attested)," never "verified."
- **Track / doc-section.** nostr §9 Phase 2; §7.2.
- **Deliverables.** `CMD_NOSTR_STATUS=188`, `CMD_NOSTR_BIND=189`, `CMD_NOSTR_REVOKE=190`, `EVT_NOSTR_BIND_STATE=110` (mirror). Mint canonical `pear-nostr-bind-v1` payload requiring **two signatures** (Ed25519 root via `identity.sign` + Schnorr via `nostrSign`); verifier checks both, drops on either failure (extends `index-room-client.js` verify-and-drop to two curves). Bind **only the root pubkey** (not a `signForApp` subkey). Revoke-wins by monotonic **epoch**. HiveRelay-pinned **Hyperdrive-shaped** mirror via `requestSeed` — durability of that mirror after writers go offline is proven by `SPIKE-AUTOBEE-DURABILITY` (§5), not assumed. UI: honest "linked (attested)" + revocation chip (R9). **Same IdentityBinding family — §4.** Reuses primitive #1, #5; P0 + NOSTR0.
- **Tests/verification.** `test/nostr-binding.test.js` (both-sigs-required; single-curve forge → drop; epoch revoke-wins). **Exit:** binding mints/verifies/revokes; UI never says "verified."
- **Depends on.** NOSTR0 (carries `SPIKE-SCHNORR-BARE`), NOSTR1, `SPIKE-AUTOBEE-DURABILITY` (durable revocation mirror). **For real-user enablement of the `nostrBridge` identity flag: `SEC0` (seed-at-rest hardening) — the nostr root key must not sit unencrypted before users bind a public identity to it.** **Effort.** M. **Flagged?** Yes.

### NOSTR3 — Nostr: native read path + Feed tab — *first user-visible, fully-P2P, offline-first milestone (Approach A)*
- **Goal.** A working Feed over the HiveRelay-native event mirror.
- **Track / doc-section.** nostr §9 Phase 3; §7.4 native, §7.6.
- **Deliverables.** TOUCH `backend/index-room-client.js`: add `nostr-event` + `nostr-relay-list` schemas to `INDEX_SCHEMAS`(:30) + `listNostrEvents()` (verify-and-drop, re-verify each Schnorr sig). `CMD_NOSTR_FEED=193`, `EVT_NOSTR_EVENT=109` (mirror). CREATE `ui/lib/nostr.js` (NIP-19 bech32 codec); TOUCH `ui/lib/keys.js` `parseCatalogRef`(:138) → `parseNostrRef` (`npub`/`nevent`/`nprofile`/`naddr`). TOUCH `ui/shell.js`: `feed:` in `TAB_META`(:96) + a `Feed` component (template: `Apps`:1663); live push via `EVT_NOSTR_EVENT`. Reuses primitive #2, #4.
- **Tests/verification.** NIP-19 codec round-trip; verify-and-drop on a forged row; Feed renders from local view. **Exit:** offline-first Feed tab live (Approach A complete).
- **Depends on.** NOSTR1, NOSTR2. **Effort.** L. **Flagged?** Yes.

### NOSTR4 — Nostr: legacy `wss://` bridge (EXPERIMENTAL, flagged)
- **Goal.** Real Nostr interop — follow any npub.
- **Track / doc-section.** nostr §9 Phase 4; §7.4 legacy, Approach B.
- **Deliverables.** CREATE `backend/legacy-relay-pool.cjs` over `bare-ws` (declared dep, `package.json:52`): REQ/EVENT/EOSE/CLOSE, **NIP-65 outbox routing** (read from authors' *write* relays, publish mentions to targets' *read* relays — Flag A), per-relay circuit breakers (`relay-client.js` pattern). **All inbound funnel through the NOSTR1 reducer.** `CMD_NOSTR_RELAYS=194`, `CMD_NOSTR_FOLLOW=195` (mirror). Off by default. Reuses NOSTR1 reducer.
- **Tests/verification.** REQ/EVENT/EOSE state machine; both transports converge to one view; circuit-breaker trips. **Exit:** follow an external npub (Approach B available). **Consumes privacy-routing PRIV2** for IP-hiding on publish.
- **Depends on.** NOSTR3. **Effort.** L. **Flagged?** Yes (off).

### NOSTR5 — Nostr: page signer `window.pear.nostr` (flagged)
- **Goal.** NIP-07 signer for web apps; nsec sealed in the worklet.
- **Track / doc-section.** nostr §9 Phase 5; §7.5.
- **Deliverables.** CREATE `PEAR_NOSTR_SHIM` (next to `PEAR_SWARM_V1_SHIM`/`PEAR_ANONGPT_SHIM`, `pear-bridge.js:716`); TOUCH `hyper-proxy.js`: `setPearNostrShim` + inject in `_injectHtmlHead`(:340) (CSP hashing automatic, :125). TOUCH `http-bridge.js`: token-gated `/api/nostr/{pubkey,sign,publish,query}` behind `_requireToken`(:72). NIP-07 surface `getPublicKey()`/`signEvent()` (**no `getRelays()`** — Flag B); kind-whitelist + impersonation guard before signing; per-app consent. Reuses the `signForApp` namespace-guard precedent.
- **Tests/verification.** Page signs only whitelisted kinds; impersonation rejected; secret never crosses the bridge. **Exit:** a page signs an event without seeing the nsec.
- **Depends on.** NOSTR2. **Effort.** M. **Flagged?** Yes.

### NOSTR6 — Nostr: app discovery via NIP-89
- **Goal.** Decentralized "open with…" + social endorsement, merged into the catalogue.
- **Track / doc-section.** nostr §9 Phase 6; §2, §5 [S6].
- **Deliverables.** Ingest `kind:31990` (app manifest ≈ `app.upsert`) + `kind:31989` (endorsement ≈ naming endorsement rows); surface via `getAggregatedApps`-style merge (existing dedup collapses identical apps; **ranking** of the distinct, trust-weighted results is what's new here). **MUST consume the shared `endorsement-rank.cjs` from N4 — one engine for name resolution AND NIP-89 endorsement-scoring (see §4); do not fork.** Reuses N4 ranker; existing `getAggregatedApps` dedup.
- **Tests/verification.** `kind:31990/31989` reduce into catalogue; ranking matches naming's. **Exit:** NIP-89 handlers ranked by the same follow-graph engine.
- **Depends on.** NOSTR3, **N4** (shared ranker). **Effort.** M. **Flagged?** Yes.

### NOSTR7 — Nostr: HiveRelay Nostr-relay façade (deferred / research, Approach C)
- **Goal.** Pear's backbone *is* a Nostr relay; bidirectional by construction.
- **Track / doc-section.** nostr §9 Phase 7; Approach C.
- **Deliverables.** A sidecar terminating the Nostr WS protocol, serving Phase-1 data model to external clients (additive deployment, not new client code). Reuses NOSTR1 store.
- **Tests/verification.** External client reads a Pear-published event. **Exit:** go/no-go per §5 deferrals.
- **Depends on.** NOSTR3. **Effort.** L. **Flagged?** Yes (deferred).

### NOSTR8 — Nostr: payments (NIP-47 NWC / NIP-57 zaps) — *gated on the shared Lightning spike*
- **Goal.** Bring-your-own-wallet controller (app holds zero keys) + social zaps.
- **Track / doc-section.** nostr §9 Phase 8; §5 [S12][S13]. **Same deferral as payments Candidate D + Lightning — see §4, §5.**
- **Deliverables.** Worklet holds the NWC secret, brokers `pay_invoice` (NIP-44 preferred); `CMD_NOSTR_*` NWC commands (free 196–199). NIP-57 zaps need out-of-process LNURL/Lightning. **Consumes the single Lightning rail from `SPIKE-LN`.** Reuses NOSTR1, NOSTR4 transport.
- **Tests/verification.** NWC `make_invoice`/`pay_invoice` round-trip against a test wallet. **Exit:** one Lightning rail, consumed by both POS and feed.
- **Depends on.** `SPIKE-LN` (go), NOSTR4. **Effort.** L. **Flagged?** Yes (off; experimental).

---

### PRIV0 — Privacy-routing: metadata-minimizing defaults (ships first, no flag) — *the bulk of the value*
- **Goal.** Retire the highest-likelihood leaks at ~zero latency cost; pays off across all four tracks.
- **Track / doc-section.** privacy-routing §11 Phase 0; §8.1 (L0).
- **Deliverables.**
  - TOUCH `backend/hyper-proxy.js` `_doHybridFetch`(:686): flip the relay race from unconditional `Promise.any([relay,p2p])` to **P2P-first** (start P2P; fire relay only after a short P2P-miss grace window). Relay stops seeing fetches it didn't serve (PR2).
  - **Encrypt everything the relay pins** via the **shared encrypted-Autobase blind-pin helper (§4)** — build it here if PRIV0 lands before PAY1, else import the one PAY1 landed (`encryptionKey`, the `browser-state-sync.cjs`/`BrowserStateSync` precedent `index.js:846`): receipt ledgers, name rooms, bindings → relay holds ciphertext (PR2/PR3).
  - TOUCH `backend/swarm-grants.js`: **per-session topic rotation** — `topic=H(baseTopic‖epoch‖sessionSalt)` for rotation-tolerant flows (PR9).
  - TOUCH `backend/identity.js`: **ephemeral per-invoice / per-session subkeys** (generalize `getAppKeypair`'s domain separation) — payments' per-invoice buyer key + nostr's per-session posting key. Zero network cost (PR5).
  - Reuses: primitives #1, #5; shared blind-pin helper (§4); no net-new record.
- **Tests/verification.** `test/hybrid-fetch-order.test.js` (relay fires only on P2P miss); encrypted-pin round-trip (non-counterparty reads ciphertext); topic-rotation derivation determinism; ephemeral-key uniqueness across invoices/sessions. **Exit:** relay no longer sees most fetches; pins are ciphertext; keys/topics unlinkable per session. **Retires PR2/PR3/PR4/PR5/PR9 (private flows).**
- **Depends on.** P0 (verify available; not blocking the cheap layers).
- **Effort.** M.
- **Flagged?** No (L0 ships unconditionally) — but stage the relay-race flip behind a kill-switch setting for rollback safety.

### PRIV1 — Privacy-routing: firewall + routing-node directory primitive (flagged)
- **Goal.** Stop strangers freely holepunching your IP; lay the directory L1/L2 both need.
- **Track / doc-section.** privacy-routing §11 Phase 1; §8.2.1, §8.5.
- **Deliverables.** TOUCH `backend/index.js:1536`: construct `Hyperswarm` with a `firewall` predicate / `relayThrough` (accept direct only from grant/contact peers, relay the rest) (PR1). CREATE `backend/routing-record.js` (clone `relay-record.js`): descriptor `{routingPubkey, transportAddr-hint, capabilities:[relay-through|onion-hop], maxBandwidth, epoch, sig}`, self-certifying `dht.mutableGet`. Add a `routing-node` schema to `index-room-client.js` consumed verify-and-drop. `CMD_ROUTING_LIST=270` (mirror). Directory *state* may live in an Autobee room (deterministic, no wall-clock); **payloads never touch Autobee.** Reuses primitives #2, #4.
- **Tests/verification.** `test/routing-record.test.js` (self-certify, forged descriptor dropped); firewall rejects non-grant peer, relay-through fallback covers it. **Exit:** stranger-holepunch surface closed; directory primitive live (no multi-hop yet).
- **Depends on.** PRIV0. **Effort.** M. **Flagged?** Yes.

### PRIV2 — Privacy-routing: single-hop relay-through for high-stakes requests (flagged)
- **Goal.** Hide IP from the *destination* on settlement / name lookup / nostr publish — honestly labeled "proxied."
- **Track / doc-section.** privacy-routing §11 Phase 2; §8.2.2, Approach B.
- **Deliverables.**
  - CREATE `backend/routing-relay.js` — the relay-through transport module (the real consumer-facing entry point the four dependents import; mirrors how `relay-client.js` fronts the relay transport). Exposes `dialThrough(routingPubkey, target) -> {send(reqFrame), close()}` and a hop-side `serveRelayThrough(stream)` that forwards-and-returns without persisting payloads (payloads **never** touch Autobee — PRIV1 invariant).
  - **Hop selection.** Pull a candidate from the PRIV1 `routing-node` directory whose descriptor advertises `capabilities:[relay-through]`, is **social-gated** (Sybil gate / contact-or-grant frontier), and is **different from the pinner** for the same room (R3 — split the choke). Refuse and re-pick if the only candidate is the pin-relay.
  - **Dial/teardown lifecycle.** `CMD_ROUTING_DIAL=271` (mirror) opens the hop: a `DIAL` handshake frame `{v, routingPubkey, ephemeralClientPubkey, nonce, sig}` → hop replies `{v, ephemeralHopPubkey, nonce, sig}`; both sides derive a per-dial session key (X25519 ECDH over the ephemeral pair, the per-session-subkey precedent from PRIV0 / `getAppKeypair` domain separation) so the request body is opaque to passive observers between client and hop. Stream stays open for the single high-stakes exchange, then explicit teardown (`close` frame) or idle-timeout GC; ephemeral keys are discarded on teardown (unlinkable per dial).
  - **Request-forwarding wire format.** After handshake, the client sends one length-prefixed `REQUEST` frame `{v, dialId, kind:'settle'|'name-resolve'|'nostr-publish', target, body}` (body = the opaque destination request); the hop forwards `body` to `target`, streams back one or more `RESPONSE` frames `{v, dialId, seq, status, body}`, then `END`. `dialId` ties frames to the dial; unknown/duplicate `dialId` is dropped.
  - **Timeout / hop-down behavior.** A dial that doesn't complete its handshake within `DIAL_TIMEOUT_MS` (or whose hop stops sending before `END`) tears down, marks that descriptor cold (PRIV1 circuit-breaker pattern, like `relay-client.js`), and **re-picks a different social-gated hop**; after `MAX_HOP_RETRIES` exhausted, the call **fails closed and surfaces an error** to the dependent phase (never silently falls back to a direct, IP-revealing dial — that would defeat the whole phase). The caller decides whether to retry direct with an explicit "this will reveal your IP" consent.
  - UI labels it "proxied," not "anonymous" (R4/PR11 — one hop is not sender-anonymity; that's PRIV3). Reuses PRIV1 directory + `routing-record.js`; the Sybil gate; PRIV0 ephemeral keys.
- **Tests/verification.** `test/routing-relay.test.js`: handshake + key-agreement round-trip; `REQUEST`/`RESPONSE`/`END` frame round-trip; destination sees hop IP, not user IP; **pin-relay ≠ route-hop enforced** (hop-selection refuses the pinner); hop-down mid-dial → re-pick → fail-closed after retries (no silent direct fallback); idle teardown discards ephemeral keys. **Exit:** high-stakes single requests IP-hidden at one hop, with a specified, testable dial/forward/teardown lifecycle. **Consumed by PAY2/PAY6, N3/N4, NOSTR4.**
- **Depends on.** PRIV1. **Effort.** M. **Flagged?** Yes.

### PRIV3 — Privacy-routing: onion overlay (opt-in, latency-gated, built last)
- **Goal.** Sender anonymity vs a non-global, non-coalition adversary on high-stakes paths only.
- **Track / doc-section.** privacy-routing §11 Phase 3; §8.3 (L2), Approach C.
- **Deliverables.** N-hop onion circuits over Hyperswarm relay-through, layered (Sphinx-style fixed-size) encryption per hop; social-gated + **path-diverse** hop selection (no two hops same operator/AS); optional padding/batching tier. `CMD_ROUTING_CIRCUIT=272` (mirror). **Never the browse default (C1).** Reuses PRIV1 directory.
- **Tests/verification.** No single hop links source↔destination; path-diversity enforced; padding buckets sizes. **Hard gates before ship (go/no-go, §5):** (a) anonymity-set analysis (min users + honest relays), (b) relay-availability/incentive story, (c) strictly opt-in. **Exit:** all three gates clear; honest scope stated in UI.
- **Depends on.** PRIV2; shared anonymity-set open problem (§6). **Effort.** L. **Flagged?** Yes (gated on analysis).

### PRIV4 — Privacy-routing: power-user external-network escape hatch (track)
- **Goal.** Documented "route through my own Tor/I2P" for users who already run one.
- **Track / doc-section.** privacy-routing §11 Phase 4; §8.4, Approach D.
- **Deliverables.** A documented escape-hatch config; **not built** (external daemon is off-thesis, not in Bare). Reuses nothing net-new.
- **Tests/verification.** Doc + manual config validated. **Exit:** escape hatch documented, not a dependency.
- **Depends on.** PRIV2. **Effort.** S. **Flagged?** Yes (track only).

---

### SPIKE-LN — Shared Lightning rail spike (gates PAY-N + NOSTR8)
- **Goal.** Decide whether a single Lightning rail (Breez-Liquid WASM) runs under Bare; if yes, build it **once** for both POS and feed.
- **Track / doc-section.** overview §4 deferral; payments §9 Phase N + §10 Q4; nostr §9 Phase 8.
- **Deliverables.** Spike `Breez-Liquid-WASM-under-Bare` (payments [23]); evaluate NWC (NIP-47) bring-your-own-wallet as the fallback rail; watch for a Holepunch/Keet payments SDK. One shared rail module consumed by POS (`processors/lightning.js`) and the feed (NOSTR8).
- **Tests/verification.** WASM bundle loads + signs an invoice under Bare in CI. **Go/no-go:** §5.
- **Depends on.** P0. **Effort.** L. **Flagged?** Yes (research gate).

---

## 3. First three commits

The literal first three PRs, in order. Each is independently mergeable.

1. **`feat(identity): verify() + verifyForApp() + CMD_IDENTITY_VERIFY=75` (Phase P0).**
   Files: `backend/identity.js` (add `verify`, `verifyForApp`), `backend/anongpt-buyer.js` (un-stub `:238` `verify.ok`), `backend/index.js` (`rpc.handle(C.CMD_IDENTITY_VERIFY)`), `backend/constants.js` + `ui/boot.js` (`CMD_IDENTITY_VERIFY=75`, mirrored), `test/identity-verify.test.js` (round-trip / tamper / wrong-key / tag-mismatch). *The single highest-leverage commit — unblocks three tracks, ships immediate value.*

2. **`feat(naming): pure foundations — name-record + NFKC/confusable normalizer + name-binding schema` (Phase N0).**
   Files: CREATE `backend/name-record.js` (mirror `relay-record.js`), CREATE `backend/name-normalize.cjs`, add the `name-binding` schema constant (copy `sheets-catalog.js:24`), FIX the `MAX_SHEETS_ROWS` export bug in `backend/sheets-catalog.js`, `test/name-record.test.js` + `test/name-normalize.test.js`. *No flag, no network — de-risks the whole naming track under plain Node.*

3. **`feat(privacy): L0 metadata defaults — P2P-first relay race + encrypted pins + per-session/per-invoice keys` (Phase PRIV0).**
   Files: `backend/hyper-proxy.js` (`_doHybridFetch:686` → P2P-first w/ grace window, behind a kill-switch setting), `backend/identity.js` (ephemeral per-invoice/per-session subkey derivation), `backend/swarm-grants.js` (per-session topic rotation `H(base‖epoch‖salt)`), encrypted `encryptionKey` on relay-pinned rooms, `test/hybrid-fetch-order.test.js`. *Cheap, default-on, cross-track — retires the highest-likelihood metadata leaks (PR2/PR3/PR5/PR9) before any IP-linked history accrues.*

---

## 4. Cross-track shared schemas (don't build twice)

Each row is **one shared module/record** with the consuming phases. Build it in the phase that lands it first; every later consumer imports, never re-implements.

| Shared thing | Single shared module/record | Built in | Consumed by |
|---|---|---|---|
| **`IdentityBinding`** (root-signs-subkey/cross-key) | one canonical `{rootPubkey, subPubkey, sig_by_root}` family — `meta!binding` + DHT self-certifying. Variants: name (N2), merchant (`merchant-record.js`, PAY3), nostr cross-curve (NOSTR2, two sigs), routing (PRIV1). Same verify-and-drop discipline + `identity.verify`. | **N2** (canonical), generalized | PAY3, NOSTR2, PRIV1 — all four tracks |
| **NIP-05 ↔ naming `/.well-known` + badge** | the `/.well-known/{pear,nostr}.json` convention + one "domain-verified / linked (attested)" **badge component** | **N6** (`/.well-known/pear.json`) | nostr NIP-05 serving (a publisher serves both from the same Hyperdrive-backed HTTP bridge); same honest-trust UX surface |
| **NIP-89 ↔ naming — ONE endorsement-ranking engine** | `backend/endorsement-rank.cjs` (pure: `socialProximity × endorserBreadth × tier × coList`, deterministic, no `Date.now`) | **N4** | name resolution (N4), **NIP-89 discovery + endorsement-scoring (NOSTR6)** — do **not** fork the ranker. *Note: catalogue **dedup** is a separate, already-shipped concern (collapse identical apps, keep most-trustworthy) and is NOT a ranker consumer — `getAggregatedApps` (`catalog-manager.js:458`) + the browser-side dedup (`ui/shell.js:1505`) dedup by stable identity today; ranking orders distinct trust-weighted results, which is what NOSTR6 applies to NIP-89 endorsements merged into the catalogue.* |
| **NIP-47 / NIP-57 ↔ payments Lightning** | one Lightning rail module (Breez-Liquid WASM or NWC fallback) | **SPIKE-LN** then `processors/lightning.js` | POS (`pear-pos`) + the feed (NOSTR8) — one rail, two consumers |
| **privacy-routing wraps settlement + fan-out + browsing** | PRIV0 ephemeral keys + encrypted pins; PRIV2 single-hop; the `routing-node` directory (`routing-record.js`) | **PRIV0 / PRIV1 / PRIV2** | payments settlement (PAY2/PAY6 discharges T4/T10), nostr publish/fan-out (NOSTR4, row 6), name lookup (N3/N4), browsing — all *consume*, none re-implement |
| **Vendored non-custodial `.cjs` (escrow/crypto/price)** | shared `.cjs` package extracting `escrow-btc.js`, `escrow-cashu.js`, `crypto.js`, `price-feeds.js` from `pear-exchange` (Bare-`require` + Node import — the Autobee precedent) | **PAY2** (first extraction) | PAY2 (on-chain), PAY4 (Cashu+FX), PAY5 (escrow) |
| **Encrypted-Autobase blind-pin helper** | one `encryptionKey` setup that wraps an Autobase/room so the relay pins **ciphertext only** (the `BrowserStateSync` / `encryptionKey` precedent, `index.js:846`) — relay holds bytes it cannot read | **whichever of PAY1 / PRIV0 lands first** | PAY1 ("Encrypted Autobase per merchant ledger") **and** PRIV0 ("encrypt everything the relay pins") — second-to-land **imports** it; do not duplicate the encryption setup |
| **Self-certifying DHT record + verify-and-drop ingest** | `relay-record.js` shape + `index-room-client.js` verify-and-drop | **SHIPPED** | cloned by `name-record.js` (N0), `merchant-record.js` (PAY3), `routing-record.js` (PRIV1), `nostr-event` schema (NOSTR3) |

---

## 5. Spikes & deferrals

Each gated item with go/no-go criteria.

- **SPIKE-AUTOBEE-DURABILITY — re-serve a ledger/registry after ALL writers go offline (the program's single biggest risk).** Today the plan offers a *rule* — "store every durable mirror Hyperdrive-shaped" — not a *proof*. This spike turns the rule into a measured property before any phase bets a ledger/registry/binding on it. **Acceptance / go criterion (one concrete test):** pin a small Encrypted-Autobase room (the receipt-ledger shape) to HiveRelay; take **every writer offline**; from a **fresh node that was never a writer**, re-open the room and **re-serve a receipt op pulled entirely from HiveRelay** (`hiveRelay.seed(…,{replicas:3})` + `requestSeed`), reduced deterministically with byte-identical view. **Go:** the cold reader reconstructs the view with all writers offline. **No-go:** if HiveRelay's AutoHeal only durably serves Hyperdrive-shaped cores (the `AUTOBEE-RESEARCH.md` "Do Not Do Yet" caveat — "do not promise HiveRelay durability until all required Autobee cores are understood"), then either (a) snapshot each Autobase view into a Hyperdrive-shaped core that *is* pinned, or (b) keep multi-writer registries (N5) deferred and ship only the single-writer / petname tiers. **Blocks (must be green before these can exit):** N5, PAY1, PAY6, NOSTR1, and the durable-mirror clause of NOSTR2. **Depends on.** P0. **Effort.** M (spike).
- **SPIKE-SCHNORR-BARE — a Bare-loadable Schnorr (secp256k1 / BIP-340) verify+sign (split out of NOSTR0; the highest-risk net-new crypto dependency).** Hoisted out of NOSTR0 because `@noble/secp256k1` is **ESM** and dynamic `import()` is **broken under Bare** (`sheets-catalog.js:80` — the same wall that forced the `sheets-bundle.cjs` prebuild). **Go:** a Bare-loadable **CJS** `backend/secp256k1-bundle.cjs` exposes BIP-340 schnorr `verify` + `sign` that **passes the NIP-01 / BIP-340 test vectors in CI under Bare specifically** (the `sheets-bundle.cjs` CI-load precedent), with `@noble/secp256k1` promoted from transitive to a declared dep. **No-go fallback:** vendor a minimal **audited** BIP-340 implementation (needs a security pass before ship). **Blocks (must be green before these can exit):** NOSTR0 (which wires the bundle into `getNostrKeypair`/`nostrSign`/`nostrVerify`) and therefore NOSTR0..NOSTR8 transitively. **Depends on.** P0. **Effort.** M (spike).
- **SEC0 — seed-at-rest hardening / OS keystore (promoted out of PAY6; GATES first real-user money/identity).** The root BIP-39 seed is **unencrypted at rest today** (`backend/identity.js` header: "Not encrypted at rest … A future improvement is to use the OS keystore"); payments threat **T11 is Critical**. This is **not** the "M" hidden inside PAY6's tail clause — under Bare the keystore move is likely its own **porting spike** (no Node `keytar`; needs a Bare-reachable OS-keychain path or an app-managed passphrase-derived wrapping key). **Deliverable.** Encrypt `identity.json`'s seed at rest behind an OS-keystore-backed (or passphrase-derived) wrapping key; migrate existing plaintext seeds on first launch. **Go (if it stays a spike):** a Bare-reachable OS-keystore binding exists on the target platforms; **No-go fallback:** passphrase-derived wrapping key (scrypt/argon2-in-Bare) until a keystore path lands. **GATES (real-user enablement, not the off-by-default dev flag):** PAY2 (mainnet money), NOSTR2 (public identity binding), N2 (durable name binding) — none enable for real users against a plaintext-at-rest root. **Depends on.** P0. **Effort.** M (+ likely a porting spike — do not assume it's free).
- **SPIKE-LN — Breez-Liquid-WASM-under-Bare (shared by payments + nostr — build the rail ONCE).** The single Lightning deferral shared by payments (Candidate D + Lightning) and nostr (NIP-47 NWC, NIP-57 zaps). **Go:** the Breez-Liquid WASM/JS bundle [23] loads under **Bare specifically** (not just browser/Node) and signs an invoice in CI. **No-go fallback:** ship NWC (NIP-47) bring-your-own-wallet first (pure JS, app holds zero keys), revisit WASM later. **Blocks:** PAY-N (Lightning), NOSTR8. *Do not build two rails.*
- **NOSTR7 — HiveRelay Nostr-relay façade (Approach C).** **Go:** there is demand to serve Pear events to external Nostr clients AND the index-room schema (designed in NOSTR3) needs no rewrite. **No-go:** stays deferred; the data model already supports it additively.
- **PRIV3 — onion overlay.** **Go (all three required):** (a) anonymity-set analysis yields concrete min user-count + honest-relay-count + path-diversity thresholds; (b) a relay-availability/incentive story that doesn't reintroduce pay-to-route corruption; (c) strictly opt-in, never browse default. **No-go:** do not ship — a mode that *looks* anonymous to 50 users is worse than none (PR12).
- **PRIV4 — external Tor/I2P transport.** **Track, don't build** — external daemon is off-thesis and not in Bare; document an escape hatch only.
- **N5 — scoped multi-writer namespaces.** **Go:** `SPIKE-AUTOBEE-DURABILITY` green (a claim re-serves after all writers offline) — this replaces the old vague "Autobee durability over HiveRelay resolved" with the concrete proof above. **No-go:** ship N1–N4 (petname + pointer + endorsement) which need no shared multi-writer registry.
- **Cashu mint selection (PAY4).** **Go:** a concrete mint (or Fedimint federation) chosen with custody/trust surfaced to merchants. **No-go:** ship on-chain (PAY2) only; Cashu is additive.
- **Nostr key-derivation path (NOSTR0, Open Q1).** Decide Pear-specific `SHA-256(rootSeed‖"pear-nostr-v1:")` (not cross-client-reproducible) vs NIP-06 (portable nsec). Default: Pear-specific; revisit if export portability is demanded.

---

## 6. Risk register & program-level open problems

| Risk | Likelihood | Impact | Mitigation / owner phase |
|---|---|---|---|
| **`identity.verify()` slips** — three tracks block on it | Low (S effort) | Critical | P0 is the first commit; no other trust-bearing work starts before it |
| **Schnorr bundle won't load under Bare** (the highest-risk net-new crypto dep) | Med | High (blocks nostr) | **Now a gated spike, `SPIKE-SCHNORR-BARE` (§5)**, split out of NOSTR0 so NOSTR0 is no longer "M-with-a-hidden-crypto-risk": Bare-specific fixture-vector CI gate (Flag F); fallback = minimal vendored **audited** BIP-340. NOSTR0..NOSTR8 cannot exit until it's green |
| **Breez-Liquid WASM not Bare-compatible** | Med | Med (Lightning slips) | SPIKE-LN go/no-go; NWC pure-JS fallback rail |
| **EVT-id collision** — nostr draft used `EVT_NOSTR_EVENT=108` (taken by `EVT_PEAR_APP_EXITED`) | Med (if copied verbatim) | Med | Plan assigns `EVT_NOSTR_EVENT=109`, `EVT_NOSTR_BIND_STATE=110`; **audit all new EVT ids before merge** |
| **Constant drift** `constants.js` vs `ui/boot.js` | Med | Med (silent RPC breakage) | Every phase's deliverables name the mirror obligation; add a CI check that the two maps agree |
| **Autobee durability over HiveRelay unresolved** — *the program's single biggest risk* | High (open) | Critical (registries/ledgers/bindings ephemeral) | **Resolved from a rule into a proof: `SPIKE-AUTOBEE-DURABILITY` (§5)** — re-serve a receipt/registry op from HiveRelay after **all** writers go offline, pulled fresh, before any phase bets on it. The "store every durable mirror Hyperdrive-shaped" rule is now the spike's *go criterion*, not an unverified assumption. **Hard-gates N5, PAY1, PAY6, NOSTR1** (+ NOSTR2's durable-mirror clause); no-go fallback = Hyperdrive-shaped view snapshots or defer multi-writer registries |
| **Root seed unencrypted at rest** (T11, `identity.js` header) | High (today) | Critical (stolen seed = stolen money + identity) | **Promoted out of PAY6's tail into its own gating phase `SEC0` (§5)** — OS-keystore/passphrase-wrapped seed at rest (likely its own Bare porting spike); **gates real-user enablement of PAY2 / NOSTR2 / N2**; no real money or public identity binds against a plaintext-at-rest root |
| **Relay-race flip regresses reachability** (PRIV0) | Med | Med | Ship behind a kill-switch setting; P2P-miss grace window tuned; relay fallback always present |
| **Onion overlay shipped below anonymity-set floor** | Med | High (false confidence, PR12) | PRIV3 hard-gated on a set-size analysis; honest UX; never browse default |

**Program-level shared walls (the overview's three — solve once, not four times):**
1. **Non-ossifying bootstrap.** Naming's bootstrap aliases, the relay directory, the Nostr relay seed, and the routing-node seed are all a baked-in trust root that must decay as the real graph grows. *Owner:* multi-relay swappable bootstrap (`resolveBootstrapRelays`) + auto-add a trust edge on every install/bookmark/contact + decay bootstrap weight (N1 decay, PRIV1 directory). Softened, not eliminated — inherent to Zooko's triangle.
2. **Omission / eclipse detection (completeness, not authenticity).** Every primitive proves a served record is *authentic*; none proves the set is *complete*. A captured relay serves a consistent-but-partial namespace / ledger / feed / routing directory. *Owner:* cross-check ≥2 independent sources + `treeLength`/head comparison + per-epoch signed Bloom/MPHF commitments (raises the bar; a cheap robust anti-omission proof is **open**). Shared ceiling: "index, not authority."
3. **Durability of mutable pointers under churn.** Name pointers, merchant bindings, Nostr bindings, and routing descriptors all expire and need republish; all inherit the "HiveRelay AutoHeals only Hyperdrive-shaped cores" caveat. *Program-wide rule:* **store every durable mirror Hyperdrive-shaped** — and that rule is now **verified, not assumed**, by `SPIKE-AUTOBEE-DURABILITY` (§5) before N5/PAY1/PAY6/NOSTR1 bet on it. Republish cadence (who republishes when the publisher is offline) is **open** (naming Q4).

Other carried open problems: root-key compromise & social recovery (no recovery for a stolen BIP-39 root; competing-succession tiebreak with no wall-clock is open); offline double-spend *prevention* (only detection — bounded credit-risk, payments Q1); fair dispute adjudication (escrow-with-arbiter, not trustless, payments Q2); cross-curve "same-human" proof impossible (trust assertion + social graph + honest UX, nostr §8).

---

## 7. Gantt-ish milestone view (dependencies + parallelism)

```
LEGEND: ██ = on critical path   ░░ = can run in parallel   ▓▓ = gated/deferred   ◄══ X ══ = hard-gated on spike/phase X (cannot exit until X is green)
Time →            Q1 ───────────────►  Q2 ───────────────►  Q3 ───────────────►  Q4 ─────►

L0 ROOT GATE
  P0 verify()     ██  (first commit; blocks everything trust-bearing)

SHARED GATES      (proven BEFORE their dependents can exit)
  SPIKE-AUTOBEE-DURABILITY ▓▓ ══╗ (re-serve a ledger after ALL writers offline; gates N5,PAY1,PAY6,NOSTR1)
  SPIKE-SCHNORR-BARE       ▓▓ ══╣ (Bare-loadable BIP-340 verify+sign; gates NOSTR0..8)
  SEC0 seed-at-rest        ░░ ══╣ (OS-keystore/passphrase; gates REAL-USER PAY2,NOSTR2,N2 — may need a porting spike)
  SPIKE-LN                 ▓▓ ══╝ (Breez-Liquid-WASM-under-Bare; gates PAY-Lightning,NOSTR8)

NAMING            (lowest Sybil surface — validates the substrate first)
  N0 pure found.   ░░██ (parallel w/ P0; pure modules)
  N1 petname+boot       ████
  N2 binding/keys            ██──┐ (needs P0; REAL-USER enable ◄── SEC0)
  N3 pointer/claim                ████
  N4 rooms+RANKER ◄────────────────────██──┐  (ranker shared → NOSTR6 NIP-89 scoring)
  N5 scoped ns ▓▓ ◄══ SPIKE-AUTOBEE-DURABILITY (was: "gated: durability") ══        ▓▓▓▓
  N6 NIP-05 badge ◄── shared w/ nostr ──────────────────░░░░

PAYMENTS          (fixes the worst correctness bug; reuses what naming proved)
  PAY0 = P0
  PAY1 receipts ◄══ SPIKE-AUTOBEE-DURABILITY ══  ░░████ (parallel w/ N2–N3; clones Autobee trio)
  PAY2 onchain confirm           ██████  ★ closes "QR-and-hope" gap (REAL-USER/mainnet enable ◄── SEC0)
  PAY3 merchant bind ◄── IdentityBinding family (N2) ──██
  PAY4 FX + Cashu                       ░░████
  PAY5 escrow/disputes                       ▓▓████
  PAY6 durability ◄══ SPIKE-AUTOBEE-DURABILITY ══ + consumes PRIV0/PRIV2 ──────────░░██

NOSTR             (first net-new crypto; atop a battle-tested Ed25519 substrate)
  NOSTR0 Schnorr ◄══ SPIKE-SCHNORR-BARE ══ (S now; spike carries the risk)  ████
  NOSTR1 event store ◄══ SPIKE-AUTOBEE-DURABILITY ══            ████
  NOSTR2 binding ◄── IdentityBinding family ────────██ (REAL-USER enable ◄── SEC0; durable mirror ◄── durability spike)
  NOSTR3 feed tab ★ first P2P milestone                ████
  NOSTR4 legacy wss ◄── consumes PRIV2 ──────────────────░░████
  NOSTR5 page signer                                     ░░██
  NOSTR6 NIP-89 ◄════ MUST reuse N4 ranker ════════════════████
  NOSTR7 façade ▓▓ deferred                                     ▓▓▓▓
  NOSTR8 NWC/zaps ▓▓ ◄── gated on SPIKE-LN ──────────────────────▓▓████
  (all NOSTR0..8 transitively gated on SPIKE-SCHNORR-BARE via NOSTR0)

PRIVACY-ROUTING   (specify schema early, build last; wraps the other three)
  PRIV0 L0 defaults ██ (3rd commit; ships early, default-on, cross-track value)
  PRIV1 firewall+dir       ░░████  (routing-record specified early)
  PRIV2 1-hop proxy ◄── consumed by PAY2/PAY6, N3/N4, NOSTR4 ──████ (routing-relay.js: dial/forward/teardown)
  PRIV3 onion ▓▓ (gated: anonymity-set analysis)                    ▓▓▓▓▓▓
  PRIV4 ext-tor ▓▓ track-only
```

**What runs in parallel:** N0 alongside P0 (pure, no deps). Once P0 lands, **naming (N1+), payments receipts-design (PAY1), and PRIV0** can proceed concurrently — PAY1 clones the Autobee trio independently of naming, and PRIV0 is config/discipline with no record dependency. The **three gating spikes can all start right after P0 in parallel** with the early build phases: `SPIKE-AUTOBEE-DURABILITY` (de-risks the durable-mirror promise), `SPIKE-SCHNORR-BARE` (de-risks the only net-new crypto), and `SEC0` (seed-at-rest) — front-loading them keeps the program's biggest risks off the critical path. **Serialization / hard gates:** N4's `endorsement-rank.cjs` must land before NOSTR6 (one engine); the `IdentityBinding` family (N2) precedes PAY3 + NOSTR2 + PRIV1; PRIV0/PRIV2 precede PAY6 + NOSTR4's IP-hiding; **`SPIKE-AUTOBEE-DURABILITY` gates N5/PAY1/PAY6/NOSTR1 before they can exit; `SPIKE-SCHNORR-BARE` gates NOSTR0..NOSTR8; `SEC0` gates real-user enablement of PAY2/NOSTR2/N2;** SPIKE-LN gates all Lightning. **Never-default / hard-gated:** PRIV3 (onion), N5 (multi-writer durability), NOSTR7/NOSTR8 (façade/payments).
