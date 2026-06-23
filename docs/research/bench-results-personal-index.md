# Benchmark: Lighthouse personal index + schema-sheets `list()` cliff

Run `node docs/research/bench-personal-index.mjs` (plain `hyperbee` + `corestore` — the
exact primitives Lighthouse builds on, so the numbers transfer). Answers the P2P-search
completeness critic's load-bearing unknowns. Machine: local dev (Darwin, Node 22). Medians.

## A/B — personal inverted index (`t!<term>!<invScore>!<docId>` range-scan + byte budget)

| docs | postings | build (ms) | on-disk (MB) | bytes/posting | 1-term p50 | 2-AND p50 | 3-AND p50 |
|-----:|---------:|-----------:|-------------:|--------------:|-----------:|----------:|----------:|
| 500  | 12,459   | 420        | 4.27         | 359           | 0.37 ms    | 0.84 ms   | 1.76 ms   |
| 2000 | 49,871   | 1,853      | 18.08        | 380           | 1.13 ms    | 1.29 ms   | 2.72 ms   |
| 8000 | 199,683  | 15,617     | 80.87        | 425           | 1.22 ms    | 1.72 ms   | 4.48 ms   |

## C — schema-sheets `list()` cliff (full materialization + JS filter vs targeted range scan)

| rows   | full-scan + filter p50 | targeted range-scan p50 | speedup |
|-------:|-----------------------:|------------------------:|--------:|
| 100    | 0.33 ms                | 0.04 ms                 | 8.7×    |
| 1,000  | 2.63 ms                | 0.08 ms                 | 32.7×   |
| 10,000 | 22.11 ms               | 0.12 ms                 | 186×    |
| 50,000 | 99.12 ms               | 0.17 ms                 | 596×    |

## What this settles (and changes in the design)

1. **The range-scan index is comfortably interactive.** Sub-5 ms for 3-term AND at ~200k
   postings. The "600 ms budget" is a *non-issue for the local/personal path*; the unknown
   is the **networked fan-out** (cold swarm connect + Hyperbee path-block replication +
   per-row verify), which is where the budget must actually be decomposed. Local query is
   ~free.
2. **Per-posting byte budget (~400 B) makes whole-index social replication expensive for
   heavy users.** 8k docs ≈ 81 MB. The privacy mechanism "batch-replicate the friend's
   whole small index" does NOT hold past a few thousand docs. Design implications:
   - **Sign per-document, not per-posting.** ~25 terms/doc share one signature over the
     canonical doc-posting set → ~25× fewer sigs. Cuts bytes/posting from ~400 → est. ~250
     AND collapses verification cost (the DoS surface) from per-posting to per-doc.
   - **Add a digest tier for social fan-out:** replicate a contact's *docId Bloom filter +
     top-K terms* (kilobytes) by default; pull the full shard only on a query hit or for
     close contacts. Caps the replication cost the whole social thesis rests on.
   - **Cap the personal index** (byte budget, not just row count) with LRU eviction of
     low-score postings — mirrors the existing history cap discipline.
3. **The `list()` cliff is real but gentle.** ≤10k rows is fine (≤22 ms); 50k is a ~100 ms
   main-thread block (and JMESPath adds more). Confirms the boundary: **schema-sheets/Autobee
   descriptor rooms are correct for catalog/resource/trust rows (hundreds–~10k); the per-doc
   corpus (millions of postings) must live in docId-sharded Hyperbees, never a sheets room.**
   The `MAX_SHEETS_ROWS` export bug matters precisely because rooms approaching 10k rows are
   where an (absent) bound would start to matter.

These three findings raise confidence in the index data structure, and turn two of the
critic's "unsourced numbers" into concrete design changes (per-doc signing + digest tier).


---

## v2 micro-benchmarks — closing the two "owed" numbers (`bench-personal-index-v2.mjs`)

The re-score judge flagged two numbers as modeled, not measured. Both now measured.

### D — per-doc signing + thin `t!` postings: byte reduction (vs v1's 425 B/posting)

| docs | postings | on-disk (MB) | bytes/posting | reduction |
|-----:|---------:|-------------:|--------------:|----------:|
| 2000 | 49,871   | 11.92        | 251           | **41% smaller** |
| 8000 | 199,683  | 56.17        | 295           | **31% smaller** |

**Correction to the v2 addendum:** the modeled **−68%** is actually **−31–41% measured** (81 → 56 MB at 8k docs). The model assumed thin postings drop to ~3 B; in reality the `t!<term>!<invScore>!<docId>` **key length** + B-tree overhead dominate a thin posting, and per-doc signing doesn't touch the key. Per-doc signing still helps (and slashes verify cost — see below), but **the index stays tens of MB**, which makes the **digest tier mandatory, not an optimization** (you cannot rely on replicating a contact's whole index). Getting smaller would require shorter keys (interned term ids, binary keyEncoding) — a separate lever.

### E — hop-1 (one contact) cold path-block replication: round-trips

Author index: 5000 docs / 124,779 postings / 32.8 MB. Reader opens the same core by key, sparse, over an in-process replication pipe (so the RTT-bound quantity is **block round-trips**, not wall-clock).

| term (by freq) | cold round-trips (blocks) | cold scan (ms, in-proc) | warm scan (ms) | hits |
|---|---:|---:|---:|---:|
| w0  | 569 | 107 | 1.6 | 500 |
| w1  | 548 | 67  | 1.0 | 500 |
| w5  | 579 | 79  | 0.8 | 500 |
| w25 | 525 | 52  | 0.7 | 500 |
| w150| 109 | 9   | 0.2 | 80  |

Mean **~477 block round-trips** for a 500-result cold scan. In-process wall-clock is ~50–107 ms (≈0 RTT); over a real link this is **hundreds of blocks (~MBs) of transfer** — with hypercore request-pipelining it's not 477×RTT, but it is decisively **hundreds of ms to seconds, far above the 250 ms first-paint cap**. Warm (cached) re-scan is ~1 ms (local speed).

**This validates the v2 architecture and settles the latency question:**
1. **Only hop-0 (local) is interactive** — confirms the design's 250 ms first-paint cap is hop-0-only.
2. **Hop-1-cold must be background-streamed**, never block first paint.
3. **The digest-first fan-out (Bloom + top-terms, ~34 KB ≈ a handful of blocks) is mandatory** — naive "replicate the contact's index and scan" is ~477 blocks/query; the digest avoids it entirely for non-matching peers and gates the expensive full-shard pull to confirmed hits.

Net: the two owed numbers are measured. One (byte reduction) is **less favorable than modeled** but reinforces the digest decision; the other (hop-1 cold cost) **confirms the hop-0-only interactivity model**. The design's architecture holds; one optimistic figure is corrected.

---

## Phase 4 GATE — cross-shard multi-keyword AND latency (`bench-shard-and.mjs`)

The determinative question for the full-text shard tier (what killed YaCy):
does intersecting Zipf-hot posting lists across shards stay interactive?
Corpus: 80k docs / 1.93M postings. Hottest term `w0` = 70,964 postings (89% of
docs), `w5` = 29,798.

| pair      | UNBOUNDED p50 | TOP-K=500 p50 | TOP-K=2000 p50 |
|-----------|--------------:|--------------:|---------------:|
| hot×hot   | **1148 ms**   | **8.8 ms**    | 25.5 ms        |
| hot×cold  | 686 ms        | 4.1 ms        | 13.0 ms        |
| cold×cold | 0.1 ms        | 0.07 ms       | 0.07 ms        |

**Gate verdict: PASS, conditionally.** Cross-shard AND is interactive **iff
per-term scans are top-K-bounded** (the design's "intersect only small
pre-filtered candidate sets" rule): hot×hot drops from 1148 ms (the YaCy trap)
to **8.8 ms** at K=500. Unbounded full-list intersection is non-interactive and
must never be done. So the shard tier ships only with (a) hard top-K caps per
term and (b) co-located bigram shards for the hottest pairs (`search-shard.cjs`
`planCrossShardAnd().bigram`) — and stays a flag-gated, trust-scoped increment
(cross-CORE transfer adds the hop-1 block-fetch cost), never a global fan-out.
