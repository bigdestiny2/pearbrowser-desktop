// Lighthouse Phase 4 — full-text shard tier router. PURE, CommonJS. The global
// full-text layer is research-grade and FLAG-GATED on proving cross-shard
// multi-keyword AND stays interactive (docs/research/bench-shard-and.mjs). This
// module owns the deterministic term→shard routing + the cross-shard AND plan;
// it never decides to ship the tier — that's the gate's call.
//
// Sharding: a term lives in shard = hash(term) mod numShards (prefix sharding).
// A hot term-PAIR can additionally live in a co-located BIGRAM shard so the
// head-of-distribution AND is a single-shard intersection, not cross-host — the
// mitigation for the Zipf scatter-gather cost.

const crypto = require('hypercore-crypto')
const b4a = require('b4a')

function hash32 (str) {
  const h = crypto.data(b4a.from(String(str)))
  return (((h[0] << 24) >>> 0) + (h[1] << 16) + (h[2] << 8) + h[3]) >>> 0
}

// Deterministic shard id in [0, numShards) for a term.
function shardOf (term, numShards = 256) {
  return hash32(term) % numShards
}

// Inverted-index posting key within a shard (same shape as the personal index).
const shardPostingKey = (term, invScore, docId) => `t!${term}!${invScore}!${docId}`
// Co-located bigram posting key: a pre-intersected list for an ordered term pair.
function bigramKey (t1, t2, invScore, docId) {
  const [a, b] = t1 < t2 ? [t1, t2] : [t2, t1]
  return `tt!${a}_${b}!${invScore}!${docId}`
}
function bigramShardOf (t1, t2, numShards = 256) {
  const [a, b] = t1 < t2 ? [t1, t2] : [t2, t1]
  return shardOf(a + '_' + b, numShards)
}

// Plan a multi-keyword AND across shards. Returns:
//   single   — true if every query term routes to ONE shard (cheap, server-side
//              intersection; the case that stays interactive)
//   shards   — the distinct shard ids that must be contacted
//   byShard  — Map<shardId, terms[]>
//   bigram   — for the two rarest-looking terms, the co-located bigram shard +
//              key prefix to TRY first (single-shard if the index built it),
//              converting the worst cross-host AND into one shard fetch.
function planCrossShardAnd (queryTerms, numShards = 256) {
  const terms = [...new Set((queryTerms || []).filter((t) => typeof t === 'string' && t))]
  const byShard = new Map()
  for (const t of terms) {
    const s = shardOf(t, numShards)
    if (!byShard.has(s)) byShard.set(s, [])
    byShard.get(s).push(t)
  }
  const shards = [...byShard.keys()]
  const plan = { terms, single: shards.length <= 1, shards, byShard, bigram: null }
  if (terms.length >= 2) {
    const [t1, t2] = terms
    plan.bigram = { shard: bigramShardOf(t1, t2, numShards), keyPrefix: `tt!${[t1, t2].sort().join('_')}!` }
  }
  return plan
}

module.exports = { hash32, shardOf, shardPostingKey, bigramKey, bigramShardOf, planCrossShardAnd }
