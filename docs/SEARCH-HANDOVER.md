# Lighthouse — P2P Search Engine (Handover)

**Audience:** whoever continues the Lighthouse search engine (search/federation engineer).
**Status:** Local self-search is built, wired, and live in the UI. The trusted-peer federation harness is now stitched into the live query path through `QueryPlanner`: `CMD_SEARCH` returns local first-paint results immediately, then emits one correlated `EVT_SEARCH_FEDERATED` update when federation is requested and a planner is available. The lower-level trust, digest, frontier, shard, and completeness modules remain pure/tested and are consumed by that planner where the current v1 network shape has enough data.
**Full design:** [`P2P-SEARCH-RESEARCH.md`](./P2P-SEARCH-RESEARCH.md) (the synthesis of TermShard / Trustweave / HiveSearch / Constellation into a federation-of-signed-indexes model). Phase roadmap also in [`research/IMPLEMENTATION-PLAN.md`](./research/IMPLEMENTATION-PLAN.md).

> **Verification baseline (re-run before trusting this doc):**
> `npm test`
> → **402 tests, 402 pass** as of the 2026-06-23 release pass. Focused search coverage lives in `test/search-core.test.js`, `test/personal-index.test.js`, `test/search-shard.test.js`, `test/search-federation.test.js`, `test/search-frontier.test.js`, `test/search-completeness.test.js`, `test/query-planner.test.js`, `test/row-verifier.test.js`, `test/cmd-search-contract.test.js`, `test/index-room-client.test.js`, and `test/identity-binding.test.js`. Engine modules stay pure/`.cjs` where they need to load under both Node and Bare.

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

## 3. End-to-end data flow

**Index path** (committed, live): browse `hyper://<key>/path` → iframe `onLoad` fires [`indexPage()`](../ui/shell.js) → extracts `{title, text}` (same-origin via the proxy, 200 KB cap; degrades to title-only if cross-origin) → `CMD_SEARCH_INDEX` ([index.js:332](../backend/index.js#L332)) → `personalIndex.indexDoc()` → `buildDocRecords` tokenizes (title weighted ×2), signs the `d!` record via `identity.signForApp('search', canonDoc, 'lighthouse-doc-v2')`, writes `d!`+`t!` keys → LRU-evicts if over cap. Best-effort, never throws into the render path.

**Query path** (committed, live): Library-tab or Sites-tab search box → `CMD_SEARCH` → `search-handler.js` normalizes/clamps the request → `personalIndex.search(query, {now0: Date.now(), limit})` → `searchIndex` tokenizes, range-scans `t!term!<invScore>!<docId>` (best-first via inverted score, `perTerm` cap), AND-intersects (smallest list first), fetches `d!` records, `rankCandidates` → local results render as clickable `hyper://` links. `now0` is injected at the RPC boundary — the engine itself never reads the clock.

**Federated query path** (committed, live): if the request has `{ federated: true }` and `QueryPlanner` initialized, the same handler returns the local results immediately with `federating: true`, then runs `queryPlanner.search()` in the background. The planner verifies peer sources, merges deterministic federated candidates, and emits `EVT_SEARCH_FEDERATED` with the original `queryId`; the renderer ignores stale events whose `queryId` no longer matches the active search. `CMD_SEARCH_FEDERATED` is an explicit alias that forces this mode.

**Signing identity:** the `sign` fn is wired at boot ([index.js:1633](../backend/index.js#L1633)) as `identity.signForApp('search', …, 'lighthouse-doc-v2')`, prefixing a domain-separated tag `pear.app.search:lighthouse-doc-v2:` before the Ed25519 detached sign. Phase 0 **stamps but does not verify** signatures (you trust your own subkey); verification switches on in the federated phases.

---

## 4. Current state — phase by phase

| Phase | Deliverable | State | Commit |
|---|---|---|---|
| **0** | PersonalIndex engine + deterministic ranker | ✅ **BUILT + WIRED + LIVE** | `be8b905`, `826b04b` |
| **0** | Live backend wiring (`CMD_SEARCH`/`_INDEX`) + UI search box + browse-time indexer | ✅ **COMMITTED** (supersedes the deferred notes in [`lighthouse-phase0-wiring.md`](./research/lighthouse-phase0-wiring.md)) | `3c32ebb`, `b7addc7` |
| **1** | Signed-descriptor federation engine + trust graph | ✅ **Built + wired through QueryPlanner for opt-in trusted-peer search** | `cb1b0ca` |
| **2** | IdentityBinding + per-app verify + digest tier | ✅ **Binding primitives, signed hits, digest checks, and metadata publication path built/tested** | `be9a7e9` |
| **3** | DHT index-pointers + cap-respecting fan-out | ✅ **Planner path built/tested; live benefit depends on trusted contacts advertising binding/index metadata** | `f83fb80` |
| **4** | Full-text shard router + AND-latency GATE | ⚠️ **Router/planner built; broad shard replication remains future work** | `8cd24e8` |
| **5** | Completeness anchors + withholding + PoR | ✅ **Verification primitives and RowVerifier coverage built; live coverage depends on peers publishing anchors** | `b58c49d` |
| — | Hardening: 24 adversarial fixes + 3 follow-up rounds | ✅ **DONE** | `0c53ed4`, `bf9bae8`, `9f7813a`, `b2cc5bd` |

**Bottom line:** local self-search works end-to-end today, and opt-in trusted-peer federation is part of the live `CMD_SEARCH` path. The remaining work is not "wire a harness"; it is operational maturity: more real peers publishing digest/index metadata, real-swarm latency sampling, and richer UI explanations for why a federated result was included or withheld.

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

## 6. What's left — release and post-release gaps

These are the pieces between "federated search is live and defensible" and "federated search is easy to explain and tune at community scale":

1. **Real-peer performance sampling.** The planner budgets cold connects and live sessions, but the release-day suite still needs a multi-peer trusted-contact measurement once there are real users/peers with advertised indexes.
2. **Result explanations.** Preserve and surface matched terms, source tier, verification state, digest fallback/partial state, and budget exhaustion at the result row level.
3. **Full-text shard replication.** `search-shard.cjs` plans routing, but broad term-prefix Hyperbee replication/serving is still a later lane. Keep posting corpora in **term-prefix Hyperbees, not Autobase**.
4. **PoR challenge–response on the wire.** `search-completeness.cjs` has the primitives; live freshness challenges should feed verdicts into down-ranking once peers publish anchors consistently.
5. **Deferred privacy fast-paths.** Query privacy remains **local-first by default**. Any relay/hashed-term fast path must stay opt-in and honestly labelled.

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
- **Wiring:** [`backend/index.js`](../backend/index.js) (`CMD_SEARCH`, `CMD_SEARCH_FEDERATED`, `CMD_SEARCH_INDEX`, PersonalIndex boot, QueryPlanner boot), [`backend/search-handler.js`](../backend/search-handler.js), [`backend/constants.js`](../backend/constants.js) (`CMD_SEARCH=177`, `CMD_SEARCH_INDEX=178`, `CMD_SEARCH_FEDERATED=262`, `EVT_SEARCH_FEDERATED=108`), [`ui/shell.js`](../ui/shell.js) (`indexPage` browse-time indexer + Library/Sites search UI).
- **Tests:** `test/search-core.test.js`, `personal-index.test.js`, `search-shard.test.js`, `search-federation.test.js`, `search-frontier.test.js`, `search-completeness.test.js`, `query-planner.test.js`, `row-verifier.test.js`, `cmd-search-contract.test.js`, `index-room-client.test.js`, `identity-binding.test.js`; the full release run is `npm test` (`402/402` on 2026-06-23).
- **Design + benches:** [`P2P-SEARCH-RESEARCH.md`](./P2P-SEARCH-RESEARCH.md) (full synthesis + prior-art lessons), [`research/IMPLEMENTATION-PLAN.md`](./research/IMPLEMENTATION-PLAN.md) (four-track roadmap), [`research/bench-results-personal-index.md`](./research/bench-results-personal-index.md), [`research/bench-personal-index.mjs`](./research/bench-personal-index.mjs) / [`bench-shard-and.mjs`](./research/bench-shard-and.mjs), [`research/lighthouse-phase0-wiring.md`](./research/lighthouse-phase0-wiring.md) (superseded wiring notes).
- **Shared substrate:** `identity-binding.cjs` / `search-frontier.cjs` / `search-completeness.cjs` are reused by the P2P-infra tracks (naming/payments/nostr) — see [`research/IMPLEMENTATION-PLAN.md`](./research/IMPLEMENTATION-PLAN.md) §4 and [`HIVERELAY-BACKBONE-HANDOVER.md`](./HIVERELAY-BACKBONE-HANDOVER.md).
