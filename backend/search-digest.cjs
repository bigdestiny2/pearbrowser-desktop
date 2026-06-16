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

// Build a digest from the author's docIds + per-term document frequencies.
// termDf: [{ term, df }]. p = target false-positive rate. topK = head size.
function buildDigest (docIds, termDf = [], { p = 0.001, topK = 2048 } = {}) {
  const ids = [...new Set(docIds || [])]
  const m = optimalM(Math.max(1, ids.length), p)
  const k = optimalK(m, ids.length)
  const bytes = new Uint8Array(Math.ceil(m / 8))
  for (const id of ids) {
    const [h1, h2] = hashPair(id)
    for (let i = 0; i < k; i++) {
      const bit = (h1 + i * h2) % m
      bytes[bit >> 3] |= (1 << (bit & 7))
    }
  }
  const topTerms = [...(termDf || [])]
    .filter((t) => t && typeof t.term === 'string')
    .sort((a, b) => (b.df - a.df) || (a.term < b.term ? -1 : 1))
    .slice(0, topK)
    .map((t) => t.term)
  return { v: 1, m, k, n: ids.length, bits: b4a.toString(b4a.from(bytes), 'base64'), topTerms }
}

function digestMayContainDoc (digest, docId) {
  if (!digest || !digest.bits) return false
  const bytes = b4a.from(digest.bits, 'base64')
  const { m, k } = digest
  const [h1, h2] = hashPair(docId)
  for (let i = 0; i < k; i++) {
    const bit = (h1 + i * h2) % m
    if (!(bytes[bit >> 3] & (1 << (bit & 7)))) return false // definitely absent
  }
  return true // probably present
}

// True if the peer's head advertises this query term — the cheap pre-check that
// decides whether to open a full-shard replication to this contact at all.
function digestHasTerm (digest, term) {
  return !!(digest && Array.isArray(digest.topTerms) && digest.topTerms.includes(term))
}

// Whether it's worth pulling this contact's full shard for a query: any query
// term in the head, OR (for rarer terms not in the head) we fall back to
// pulling — callers can choose. Here: head hit on ANY query term.
function digestWorthPulling (digest, queryTerms) {
  return (queryTerms || []).some((t) => digestHasTerm(digest, t))
}

// Approximate serialized byte size of the digest (for budgeting).
function digestBytes (digest) {
  const bloom = digest && digest.bits ? Math.ceil(digest.bits.length * 3 / 4) : 0
  const head = digest && digest.topTerms ? digest.topTerms.join(',').length : 0
  return bloom + head
}

module.exports = {
  buildDigest, digestMayContainDoc, digestHasTerm, digestWorthPulling, digestBytes,
  hashPair, optimalM, optimalK,
}
