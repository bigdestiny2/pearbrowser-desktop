# Lighthouse — P2P Search Engine (Handover)

**Audience:** whoever continues the Lighthouse search engine (search/federation engineer).
**Status:** Phase 0 (local self-search) **built, wired, and live in the UI.** Phases 1–5 (federation, trust, completeness) **built as pure modules + tested**, not yet stitched into the live query path.
**Full design:** [`P2P-SEARCH-RESEARCH.md`](./P2P-SEARCH-RESEARCH.md) (the synthesis of TermShard / Trustweave / HiveSearch / Constellation into a federation-of-signed-indexes model). Phase roadmap also in [`research/IMPLEMENTATION-PLAN.md`](./research/IMPLEMENTATION-PLAN.md).

> **Verification baseline (re-run before trusting this doc):**
> `node --test test/search-core.test.js test/personal-index.test.js test/search-shard.test.js test/search-federation.test.js test/search-frontier.test.js test/search-completeness.test.js test/index-room-client.test.js test/identity-binding.test.js`
> → **58 tests, 58 pass** as of this handover. Every engine module is pure/`.cjs` and runs under plain Node *and* Bare.

---

## 1. What this is (one paragraph)

Lighthouse is PearBrowser's **decentralized full-text search**: a local-first personal index that federates over a **social trust graph** instead of a global crawler. You browse a `hyper://` page, it gets tokenized, signed by your per-app "search" subkey, and stored in a local Hyperbee; the Library-tab search box queries it with **zero network and sub-5 ms latency**. Above that local floor sit five P2P tiers — signed-descriptor federation, mandatory identity-binding, a compression/privacy digest tier, DHT index-pointers with capped fan-out, and completeness/withholding detection — each a **pure, deterministic, separately-tested module**. The ranker reads no wall clock and coerces every input to a finite number, so the same query + trust-graph snapshot ranks identically on any device. The whole engine is **~1,234 lines across 9 modules** (`backend/search-*.cjs`, `personal-index.cjs`, `index-room-client.js`); the trust primitives (`identity-binding.cjs`, `search-frontier.cjs`, `search-completeness.cjs`) are deliberately generic so the naming / payments / nostr tracks reuse them as shared substrate.

---

## 2. Architecture — the modules

| Module | Phase | Purpose |
|---|---|---|
| [`search-core.cjs`](../backend/search-core.cjs) (229 L) | 0 | Pure engine: tokenize (NFKC, lowercase, 40-word stoplist, cap 64 terms/doc), `buildDocRecords` (signed `d!` doc record + thin `t!` postings bound by a posting-set hash), `searchIndex` (range-scan → AND-intersect → rank), and `rankCandidates` (v2 deterministic ranker). |
| [`personal-index.cjs`](../backend/personal-index.cjs) (130 L) | 0 | `PersonalIndex` — Hyperbee-over-Corestore local store. `indexDoc` / `removeDoc` / `search` / `stats`, serialized mutations (lock on `meta!count`/`seq`), LRU eviction by indexing-recency at `maxDocs` (default 20k). |
| [`search-shard.cjs`](../backend/search-shard.cjs) (74 L) | 4 | Pure shard routing: `shardOf(term)=hash%N`, `planCrossShardAnd` (group terms by shard, single-vs-cross), co-located bigram-shard hint for Zipf-hot pairs. |
| [`search-federation.cjs`](../backend/search-federation.cjs) (175 L) | 1 | `buildTrustGraph` (hop/tier from contact edges), `trustRowsToEdges` (verified-fields-only), `mergeFederated` (deterministic dedup-and-rank across federated sources). |
| [`identity-binding.cjs`](../backend/identity-binding.cjs) (129 L) | 2 | The cross-track anti-forgery primitive: `makeBinding`/`verifyBinding` (root pubkey → rotatable search subkey), `verifyAppSig` (domain-separated per-app signature), `makeRevocation`/`resolveSearchKey`. **Shared with naming N2, payments PAY3, nostr NOSTR2.** |
| [`search-digest.cjs`](../backend/search-digest.cjs) (93 L) | 2 | Compression/privacy tier: Bloom filter (docId membership) + top-term head. `buildDigest`/`digestMayContainDoc`/`digestWorthPulling`. ~KB-scale; gates whether a peer's full shard is worth replicating. Fails **closed**. |
| [`search-frontier.cjs`](../backend/search-frontier.cjs) (109 L) | 3 | `makeIndexPointer`/`verifyIndexPointer`/`resolveIndexKey` (root-signed DHT record: contact → index key), `planFanout` (cap-respecting multi-hop planner honoring SwarmBridge session limits), `buildFrontier`. |
| [`search-completeness.cjs`](../backend/search-completeness.cjs) (132 L) | 5 | Three-layer integrity: signed completeness **anchors** (truncation/fork detection), **withholding** detection by deterministic sampling (catch with prob `1-(1-f)^R`), **PoR freshness** nonce challenge. |
| [`index-room-client.js`](../backend/index-room-client.js) (163 L) | 5 | Read-only relay-index consumer: blind-replicate a relay's descriptor room, **re-verify each row client-side, drop failures before aggregation** ("the room is an index, not an authority"). Pairs with the HiveRelay backbone — see [`HIVERELAY-BACKBONE-HANDOVER.md`](./HIVERELAY-BACKBONE-HANDOVER.md). |

**The v2 ranker** (`rankCandidates`) is capped-additive in log space: `W.text·ln(eps+BM25_tf) + ln(1+W.trust·f_hop) + ln(1+W.endorse·f_breadth) + ln(1+W.recency·f_age) + ln(1+W.tier·f_tier)` with weights `{text 1.0, trust 0.9, endorse 0.6, recency 0.5, tier 0.7}`, `K1=1.2`, endorser breadth **capped at 8** (Sybil-proofing), 30-day recency half-life, and an MMR-lite diversity penalty per `driveKey`. Ties break `score desc → contentHash → signerPubkey` so the order is total and source-iteration-independent.

---

## 3. End-to-end data flow (the live Phase-0 spine)

**Index path** (committed, live): browse `hyper://<key>/path` → iframe `onLoad` fires [`indexPage()`](../ui/shell.js) → extracts `{title, text}` (same-origin via the proxy, 200 KB cap; degrades to title-only if cross-origin) → `CMD_SEARCH_INDEX` ([index.js:332](../backend/index.js#L332)) → `personalIndex.indexDoc()` → `buildDocRecords` tokenizes (title weighted ×2), signs the `d!` record via `identity.signForApp('search', canonDoc, 'lighthouse-doc-v2')`, writes `d!`+`t!` keys → LRU-evicts if over cap. Best-effort, never throws into the render path.

**Query path** (committed, live): Library-tab search box → `CMD_SEARCH` ([index.js:324](../backend/index.js#L324)) → `personalIndex.search(query, {now0: Date.now(), limit})` → `searchIndex` tokenizes, range-scans `t!term!<invScore>!<docId>` (best-first via inverted score, `perTerm` cap), AND-intersects (smallest list first), fetches `d!` records, `rankCandidates` → results render as clickable `hyper://` links. `now0` is injected at the RPC boundary — the engine itself never reads the clock.

**Signing identity:** the `sign` fn is wired at boot ([index.js:1633](../backend/index.js#L1633)) as `identity.signForApp('search', …, 'lighthouse-doc-v2')`, prefixing a domain-separated tag `pear.app.search:lighthouse-doc-v2:` before the Ed25519 detached sign. Phase 0 **stamps but does not verify** signatures (you trust your own subkey); verification switches on in the federated phases.

---

## 4. Current state — phase by phase

| Phase | Deliverable | State | Commit |
|---|---|---|---|
| **0** | PersonalIndex engine + deterministic ranker | ✅ **BUILT + WIRED + LIVE** | `be8b905`, `826b04b` |
| **0** | Live backend wiring (`CMD_SEARCH`/`_INDEX`) + UI search box + browse-time indexer | ✅ **COMMITTED** (supersedes the deferred notes in [`lighthouse-phase0-wiring.md`](./research/lighthouse-phase0-wiring.md)) | `3c32ebb`, `b7addc7` |
| **1** | Signed-descriptor federation engine + trust graph | ⚠️ **Module built + tested; not wired into the query path** | `cb1b0ca` |
| **2** | IdentityBinding + per-app verify + digest tier | ⚠️ **Module built + tested; binding not published** | `be9a7e9` |
| **3** | DHT index-pointers + cap-respecting fan-out | ⚠️ **Module built + tested; no live fan-out** | `f83fb80` |
| **4** | Full-text shard router + AND-latency GATE | ⚠️ **Router + planner built; no shard replication wiring** | `8cd24e8` |
| **5** | Completeness anchors + withholding + PoR | ⚠️ **Module built + tested; no RowVerifier in the query path** | `b58c49d` |
| — | Hardening: 24 adversarial fixes + 3 follow-up rounds | ✅ **DONE** | `0c53ed4`, `bf9bae8`, `9f7813a`, `b2cc5bd` |

**Bottom line:** local self-search works end-to-end today. Everything above hop-0 is a **tested kit of parts without a harness** — the modules exist and pass adversarial tests, but no code yet calls them from `CMD_SEARCH` to actually fan a query out over the trust graph and merge verified peer results.

**Benchmarks** ([`bench-results-personal-index.md`](./research/bench-results-personal-index.md)): local 3-term AND **< 5 ms at ~200k postings**; the GATE is **TOP-K=500 per term** — it drops hot×hot AND from **1148 ms → 8.8 ms** (the cliff that killed YaCy). Unbounded full-list intersection is forbidden in production.

---

## 5. KEEP — do not touch (load-bearing invariants)

- **The ranker is pure and clock-free.** `rankCandidates`/`searchIndex` never call `Date.now()`/`Math.random()` — `now0` is injected. Determinism is the whole basis of cross-device agreement and the deterministic dither tie-break. Don't introduce a clock read inside the fold.
- **Every ranker input is coerced to a finite number.** A hostile `tf`/date/`NaN` must never poison `_score` — a `NaN` comparator breaks the total order. Tests assert this ([search-core.test.js:94](../test/search-core.test.js)).
- **`.cjs` purity.** The engine modules are CommonJS so they load under Bare *and* are Node-testable. Keep them dependency-light and side-effect-free. `backend/index.js` lazy-requires `personal-index.cjs` and **fails soft** (`personalIndex = null`) if Bare can't resolve it — search disables, boot survives.
- **AND intersection is TOP-K bounded, always.** Never intersect full Zipf-hot posting lists globally.
- **Trust graph is keyed by ROOT pubkey.** Endorser-breadth (the Sybil bound) counts **distinct roots**, not subkeys — one attacker with N subkeys under one root cannot inflate breadth. `verifyAppSig` binds postings to a root via IdentityBinding.
- **Verify-and-drop, never verify-and-trust-the-room.** Relay/descriptor rows are re-verified client-side and dropped on failure *before* ranking (`index-room-client.js`). The room is an index, not an authority.
- **`search-digest` fails closed** — a malformed/hostile digest returns "not present", never a false hit that could trigger a wrongful withholding accusation.

---

## 6. What's left — the integration gaps (in priority order)

These are the pieces between "tested modules" and "federated search that ships":

1. **The QueryPlanner / RowVerifier harness.** The thing that, on `CMD_SEARCH`, freezes a trust-graph snapshot, runs `planFanout`, pulls digests, decides which peers to replicate, verifies rows (`verifyAppSig` + `verifyBinding` + completeness anchors), drops failures, and feeds survivors to `mergeFederated`. **Specified in [`P2P-SEARCH-RESEARCH.md`](./P2P-SEARCH-RESEARCH.md) §6.5; not implemented.** This is the keystone — most other gaps close once it exists.
2. **Publish the IdentityBinding.** `signForApp('search', …)` derives a deterministic but **unsigned** subkey; until a `{rootPubkey, searchSubPubkey, sig_by_root}` record is published (DHT `mutablePut` + `meta!binding` in the personal index), a subkey is non-attributable and "distinct endorser" / "drop-a-writer-wholesale" are unenforceable. This is the **shared showstopper** across Phases 1–4 — and is exactly the canonical binding the naming track is building at **N2** (see `IMPLEMENTATION-PLAN.md` §4). Build it once, in `identity-binding.cjs`, for both.
3. **Wire `IndexRoomClient` aggregation into ranking.** Rows are replicated + re-verified today but not merged into `mergeFederated`. Connect the relay-index read path to the query path (depends on #1).
4. **Full-text shard replication.** `search-shard.cjs` plans routing but there is no sharded-Hyperbee replication/serving layer yet. Keep posting corpora in **term-prefix Hyperbees, not Autobase** (Autobase `list()` materializes every row — ~100 ms main-thread block at 50k rows; `MAX_SHEETS_ROWS` is imported-but-unenforced).
5. **PoR challenge–response on the wire.** `search-completeness.cjs` has the primitives; nothing issues live freshness challenges or feeds verdicts into down-ranking yet. Note `verifyFreshness` proves length-liveness only — callers must separately check the returned `treeHash` against a prior anchor to catch same-length forks.
6. **Deferred niceties:** query-privacy fast-path, incremental freshness, storage-eviction discipline across shards, in-drive `/.well-known/lighthouse-attest`. All designed, none wired. Query privacy is **local-first by default** — a plaintext query to any non-local index leaks terms; the digest tier is mandatory for hop-1+ sources.

---

## 7. Risks to watch

- **Bare `.cjs` resolution** — verify on first real Bare run that the lazy `require` of the `.cjs` engine resolves; the catch disables search gracefully, but you want it *on*. If it fails, rename to `.js` + a CommonJS test shim.
- **IdentityBinding is the single point everything trusts** — get its publish + revocation + rotation story right before federation ships; it gates four tracks.
- **Digest false-positives vs. wrongful accusation** — withholding detection assumes the digest is correct; a corrupt digest must fail closed (it does) so it never manufactures a false omission flag.
- **Eventual consistency** — a freshly-published peer row may lag; expose a sync indicator and never let stale data fail a query (degrade to a narrower frontier, don't crash).
- **HiveRelay seeds Hyperbee cores best-effort only** (it's Hyperdrive-shaped); the relay is the durability floor, not a ranking authority — PoR must check seeded tree-length against a published manifest.

---

## 8. Where things are

- **Engine:** [`backend/search-core.cjs`](../backend/search-core.cjs), [`personal-index.cjs`](../backend/personal-index.cjs), [`search-shard.cjs`](../backend/search-shard.cjs), [`search-federation.cjs`](../backend/search-federation.cjs), [`search-frontier.cjs`](../backend/search-frontier.cjs), [`search-digest.cjs`](../backend/search-digest.cjs), [`search-completeness.cjs`](../backend/search-completeness.cjs), [`identity-binding.cjs`](../backend/identity-binding.cjs), [`index-room-client.js`](../backend/index-room-client.js).
- **Wiring:** [`backend/index.js`](../backend/index.js) (`CMD_SEARCH` :324, `CMD_SEARCH_INDEX` :332, PersonalIndex boot :1633, close :1854), [`backend/constants.js`](../backend/constants.js) (`CMD_SEARCH=177`, `CMD_SEARCH_INDEX=178`), [`ui/shell.js`](../ui/shell.js) (`indexPage` browse-time indexer + Library-tab search UI).
- **Tests (58, all green):** `test/search-core.test.js`, `personal-index.test.js`, `search-shard.test.js`, `search-federation.test.js`, `search-frontier.test.js`, `search-completeness.test.js`, `index-room-client.test.js`, `identity-binding.test.js`.
- **Design + benches:** [`P2P-SEARCH-RESEARCH.md`](./P2P-SEARCH-RESEARCH.md) (full synthesis + prior-art lessons), [`research/IMPLEMENTATION-PLAN.md`](./research/IMPLEMENTATION-PLAN.md) (four-track roadmap), [`research/bench-results-personal-index.md`](./research/bench-results-personal-index.md), [`research/bench-personal-index.mjs`](./research/bench-personal-index.mjs) / [`bench-shard-and.mjs`](./research/bench-shard-and.mjs), [`research/lighthouse-phase0-wiring.md`](./research/lighthouse-phase0-wiring.md) (superseded wiring notes).
- **Shared substrate:** `identity-binding.cjs` / `search-frontier.cjs` / `search-completeness.cjs` are reused by the P2P-infra tracks (naming/payments/nostr) — see [`research/IMPLEMENTATION-PLAN.md`](./research/IMPLEMENTATION-PLAN.md) §4 and [`HIVERELAY-BACKBONE-HANDOVER.md`](./HIVERELAY-BACKBONE-HANDOVER.md).
