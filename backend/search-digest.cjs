// Lighthouse Phase 2 — the DIGEST tier. PURE, CommonJS. A contact's full index
// is tens of MB (bench: ~56 MB @8k docs after per-doc signing), too big to
// replicate wholesale for social fan-out. The digest is a docId Bloom filter +
// a top-term head (~tens of KB) replicated by DEFAULT; the full shard is pulled
// only on a digest hit. Closes the byte-budget gap that made naive fan-out
// non-viable. See docs/P2P-SEARCH-RESEARCH.md.

const crypto = require('hypercore-crypto')
const b4a = require('b4a')

// Two independent 32-bit hashes of a key via a single BLAKE2b digest, used for
// Bloom double-hashing (h_i = h1 + i*h2). h2 forced odd so it never degenerates.
function hashPair (str) {
  const h = crypto.data(b4a.from(String(str)))
  const h1 = ((h[0] << 24) >>> 0) + (h[1] << 16) + (h[2] << 8) + h[3]
  const h2 = (((h[4] << 24) >>> 0) + (h[5] << 16) + (h[6] << 8) + h[7]) | 1
  return [h1 >>> 0, h2 >>> 0]
}

function optimalM (n, p) { return Math.max(8, Math.ceil(-(n * Math.log(p)) / (Math.log(2) ** 2))) }
function optimalK (m, n) { return Math.max(1, Math.round((m / Math.max(1, n)) * Math.log(2))) }

function bloomBuild (items, { p = 0.001 } = {}) {
  const pp = Math.min(Math.max(Number(p) || 0.001, 1e-12), 0.5)
  const vals = [...new Set((items || []).filter((x) => typeof x === 'string' && x))]
  const m = optimalM(Math.max(1, vals.length), pp)
  const k = optimalK(m, vals.length)
  const bytes = new Uint8Array(Math.ceil(m / 8))
  for (const val of vals) {
    const [h1, h2] = hashPair(val)
    for (let i = 0; i < k; i++) {
      const bit = (h1 + i * h2) % m
      bytes[Math.floor(bit / 8)] |= (1 << (bit % 8))
    }
  }
  return { m, k, n: vals.length, bits: b4a.toString(b4a.from(bytes), 'base64') }
}

function bloomMayContain (filter, value) {
  if (!filter || typeof filter.bits !== 'string' || !filter.bits ||
      !Number.isInteger(filter.m) || filter.m <= 0 ||
      !Number.isInteger(filter.k) || filter.k <= 0) return false
  let bytes
  try { bytes = b4a.from(filter.bits, 'base64') } catch { return false }
  if (bytes.length !== Math.ceil(filter.m / 8)) return false
  const [h1, h2] = hashPair(value)
  for (let i = 0; i < filter.k; i++) {
    const bit = (h1 + i * h2) % filter.m
    if (!(bytes[Math.floor(bit / 8)] & (1 << (bit % 8)))) return false
  }
  return true
}

// Build a digest from the author's docIds + per-term document frequencies.
// termDf: [{ term, df }]. p = target false-positive rate. topK = head size.
function buildDigest (docIds, termDf = [], { p = 0.001, termP = 0.001, topK = 2048 } = {}) {
  const ids = [...new Set(docIds || [])]
  const docBloom = bloomBuild(ids, { p })
  const termRows = [...(termDf || [])]
    .filter((t) => t && typeof t.term === 'string' && t.term && Number.isFinite(t.df))
  const topTerms = [...(termDf || [])]
    .filter((t) => t && typeof t.term === 'string' && Number.isFinite(t.df))
    .sort((a, b) => (b.df - a.df) || (a.term < b.term ? -1 : a.term > b.term ? 1 : 0))
    .slice(0, topK)
    .map((t) => t.term)
  // The top-term head is a hot-query optimization, not a complete term
  // directory. A separate all-term Bloom filter prevents rare terms from being
  // silently skipped during federated fanout.
  const termBloom = bloomBuild(termRows.map((t) => t.term), { p: termP })
  return {
    v: 2,
    m: docBloom.m,
    k: docBloom.k,
    n: ids.length,
    bits: docBloom.bits,
    topTerms,
    termM: termBloom.m,
    termK: termBloom.k,
    termN: termBloom.n,
    termBits: termBloom.bits
  }
}

function digestMayContainDoc (digest, docId) {
  // Validate the UNTRUSTED digest before use. A malformed digest (missing bits,
  // m/k ≤ 0, or wrong bit-buffer length) must fail CLOSED (no-hit), never
  // fail-open to "probably present" for every docId — otherwise a corrupt or
  // hostile digest triggers false withholding accusations and pointless pulls.
  return bloomMayContain({ bits: digest && digest.bits, m: digest && digest.m, k: digest && digest.k }, docId)
}

// True if the peer's head advertises this query term — the cheap pre-check that
// decides whether to open a full-shard replication to this contact at all.
function digestHasTerm (digest, term) {
  return !!(digest && Array.isArray(digest.topTerms) && digest.topTerms.includes(term))
}

function digestMayContainTerm (digest, term) {
  if (digestHasTerm(digest, term)) return true
  if (!digest || typeof digest.termBits !== 'string') return false
  return bloomMayContain({ bits: digest.termBits, m: digest.termM, k: digest.termK }, term)
}

// Whether it's worth pulling this contact's full shard for a query: any query
// term in the head, OR (for rarer terms not in the head) we fall back to
// pulling — callers can choose. Here: head hit on ANY query term.
function digestWorthPulling (digest, queryTerms) {
  return (queryTerms || []).some((t) => digestMayContainTerm(digest, t))
}

// True serialized wire size of the digest (for fan-out budgeting) — the actual
// JSON bytes that replicate, not a lossy bloom+head estimate.
function digestBytes (digest) {
  try { return b4a.byteLength(JSON.stringify(digest)) } catch { return 0 }
}

module.exports = {
  buildDigest, digestMayContainDoc, digestHasTerm, digestMayContainTerm, digestWorthPulling, digestBytes,
  bloomBuild, bloomMayContain, hashPair, optimalM, optimalK
}
