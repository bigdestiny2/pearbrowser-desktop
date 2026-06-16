// Lighthouse search core — Phase 0 (self-search) engine. PURE + framework-free,
// CommonJS (.cjs) so Bare can require() it and Node can default-import it for
// tests. This is the engine every later phase reuses unchanged (docs/
// P2P-SEARCH-RESEARCH.md). It owns: tokenization, the v2 on-disk schema
// (per-doc signing → thin t! postings bound by a postingSetHash), and the v2
// deterministic capped-additive-in-log-space ranker. No wall-clock is read
// inside any ranking fold (`now0` is passed in), so ranking is a pure function
// of (candidate set + static trust graph) — deterministic across runs/devices.

const crypto = require('hypercore-crypto')
const b4a = require('b4a')

const SCHEMA_VERSION = 2
const MAX_TERMS_PER_DOC = 64
const INV_WIDTH = 18 // zero-pad width for inverted-score keys

// A compact English stoplist — enough to drop the highest-frequency noise
// without an external dep. Tuned for recall, not linguistic completeness.
const STOPWORDS = new Set(('a an and are as at be but by for from has have he her his ' +
  'i in is it its of on or that the their them they this to was were will with you your ' +
  'we our not no do does did so if then than too can could would should how what when where ' +
  'which who whom why all any each more most other some such only own same up out off over').split(' '))

// Lowercase, NFKC-normalize, split on non-alphanumerics, drop stopwords + very
// short tokens, count term frequency, cap at MAX_TERMS_PER_DOC most-frequent
// terms. Returns [{ term, tf }] sorted by term (canonical order for signing).
function tokenize (text) {
  if (typeof text !== 'string' || !text) return []
  const norm = text.normalize('NFKC').toLowerCase()
  const tf = new Map()
  for (const raw of norm.split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 2 || raw.length > 40) continue
    if (STOPWORDS.has(raw)) continue
    tf.set(raw, (tf.get(raw) || 0) + 1)
  }
  // keep the MAX_TERMS_PER_DOC highest-tf terms (ties by term for determinism)
  const top = [...tf.entries()]
    .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
    .slice(0, MAX_TERMS_PER_DOC)
  return top.map(([term, n]) => ({ term, tf: n })).sort((a, b) => (a.term < b.term ? -1 : a.term > b.term ? 1 : 0))
}

function hashHex (str) {
  return b4a.toString(crypto.data(b4a.from(String(str))), 'hex')
}

// Stable doc id = sha256(driveKey \0 path)[:16]. Identifies a page across re-crawls.
function docIdFor (driveKey, path) {
  return hashHex(String(driveKey || '') + '\0' + String(path || '/')).slice(0, 16)
}

// invScore makes a forward Hyperbee range scan return highest-score-first.
function invScore (localScore) {
  const s = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(localScore) || 0)))
  return String(Number.MAX_SAFE_INTEGER - s).padStart(INV_WIDTH, '0')
}

const postingKey = (term, localScore, docId) => `t!${term}!${invScore(localScore)}!${docId}`
const docKey = (docId) => `d!${docId}`

// Hash binding the thin t! postings to the per-doc signature: a peer cannot
// inject/alter/drop a posting without breaking this (recomputed at verify).
function postingSetHash (terms) {
  const canon = [...terms].sort((a, b) => (a.term < b.term ? -1 : 1)).map((t) => `${t.term}:${t.tf}:${t.field || 1}`).join('|')
  return hashHex(canon)
}

// Build the v2 records for one document: one signed d! record carrying the
// canonical posting set + ONE sig, plus thin t! postings. `sign(payload)` is
// injected (identity.signForApp in the app; a stub in tests) and returns
// { sig, pubkey }. localScore defaults to tf (term-frequency-as-score at hop-0).
function buildDocRecords (doc, sign) {
  const { driveKey = '', path = '/', title = '', body = '', publishedAt = 0 } = doc
  const terms = tokenize(`${title} ${title} ${body}`) // title weighted 2x
  const docId = docIdFor(driveKey, path)
  const h = postingSetHash(terms)
  const canonDoc = { v: SCHEMA_VERSION, docId, driveKey, path, title: String(title).slice(0, 200), terms, h, publishedAt }
  const signed = sign ? sign(canonDoc) : { sig: '', pubkey: '' }
  const records = []
  records.push([docKey(docId), { ...canonDoc, sig: signed.sig, signerPubkey: signed.pubkey }])
  for (const { term, tf } of terms) {
    records.push([postingKey(term, tf, docId), { tf, ff: 1 }])
  }
  return { docId, terms, records }
}

// FNV-1a over a string → a deterministic [0,1) dither for exploration that
// never reads a clock or RNG, so rankings are reproducible.
function fnvUnit (str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0 }
  return (h >>> 0) / 0xffffffff
}

const RANK = {
  W: { text: 1.0, trust: 0.9, endorse: 0.6, recency: 0.5, tier: 0.7 }, // feature weights
  EPS: 1e-3,        // ε-floor: no single zero feature annihilates the product
  E_CAP: 8,         // hard cap on endorser breadth (sybil-proof)
  HALFLIFE_DAYS: 30,
  LAMBDA: 0.05,     // exploration dither magnitude (small, deterministic)
  TIER: { self: 1.0, followed: 0.8, default: 0.5 },
  K1: 1.2,          // BM25-style tf saturation
}

// The v2 ranker: a pure, deterministic, capped-additive-in-log-space score.
// `candidates`: [{ docId, driveKey, path, title, tf, trustHop, endorsers,
//   publishedAt, tier, contentHash, signerPubkey }]. `now0` is the single
// query-time timestamp, passed IN (never read inside the fold). Returns
// candidates sorted best-first with a `_score`, after MMR diversity by driveKey.
function rankCandidates (candidates, { now0 = 0, diversity = true } = {}) {
  const eps = RANK.EPS
  const ln = (x) => Math.log(eps + Math.max(0, Math.min(1, x)))
  const scored = candidates.map((c) => {
    const f1 = (c.tf || 0) / ((c.tf || 0) + RANK.K1)                       // text (BM25-ish saturation)
    const f2 = 1 / (1 + (c.trustHop == null ? 0 : c.trustHop))             // PPR-lite by hop (hop-0 → 1)
    const f3 = Math.min(c.endorsers || 0, RANK.E_CAP) / RANK.E_CAP         // endorser breadth, hard-capped
    const ageDays = now0 && c.publishedAt ? Math.max(0, (now0 - c.publishedAt) / 86400000) : 0
    const f4 = Math.pow(2, -ageDays / RANK.HALFLIFE_DAYS)                  // recency half-life
    const f5 = RANK.TIER[c.tier] != null ? RANK.TIER[c.tier] : RANK.TIER.default
    const logScore = RANK.W.text * ln(f1) + RANK.W.trust * ln(f2) + RANK.W.endorse * ln(f3) +
      RANK.W.recency * ln(f4) + RANK.W.tier * ln(f5)
    const dither = RANK.LAMBDA * fnvUnit(c.docId || c.path || '')
    return { ...c, _score: logScore + dither }
  })
  // total order: score desc, then contentHash, then signerPubkey (deterministic)
  scored.sort((a, b) => (b._score - a._score) ||
    ((a.contentHash || '') < (b.contentHash || '') ? -1 : (a.contentHash || '') > (b.contentHash || '') ? 1 : 0) ||
    ((a.signerPubkey || '') < (b.signerPubkey || '') ? -1 : 1))
  if (!diversity) return scored
  // greedy MMR-lite: lightly penalize repeats of the same driveKey so one site
  // can't monopolize the page. Pure (penalty depends only on prior selections).
  const seen = new Map()
  for (const c of scored) {
    const n = seen.get(c.driveKey) || 0
    c._score -= 0.15 * n
    seen.set(c.driveKey, n + 1)
  }
  scored.sort((a, b) => (b._score - a._score) ||
    ((a.contentHash || '') < (b.contentHash || '') ? -1 : 1))
  return scored
}

// End-to-end query over a ready Hyperbee holding v2 records: tokenize → bounded
// range-scan per term → AND-intersect by docId → fetch d! records → rank.
// `tier`/`trustHop` describe the source (hop-0 self = {tier:'self', trustHop:0}).
async function searchIndex (bee, query, { limit = 200, perTerm = 500, now0 = 0, tier = 'self', trustHop = 0 } = {}) {
  const qterms = tokenize(query).map((t) => t.term)
  if (qterms.length === 0) return []
  // gather per-term posting lists: docId → summed tf
  const lists = []
  for (const term of qterms) {
    const m = new Map()
    for await (const e of bee.createReadStream({ gte: `t!${term}!`, lt: `t!${term}!~`, limit: perTerm })) {
      const k = e.key
      const docId = k.slice(k.lastIndexOf('!') + 1)
      m.set(docId, (m.get(docId) || 0) + (e.value && e.value.tf ? e.value.tf : 1))
    }
    lists.push(m)
  }
  // AND intersection over the smallest list first
  lists.sort((a, b) => a.size - b.size)
  let hits = lists[0]
  for (let i = 1; i < lists.length; i++) {
    const next = new Map()
    for (const [d, tf] of hits) if (lists[i].has(d)) next.set(d, tf + lists[i].get(d))
    hits = next
  }
  // hydrate doc records + assemble candidates
  const candidates = []
  for (const [docId, tf] of hits) {
    const rec = await bee.get(docKey(docId)).catch(() => null)
    const d = rec && rec.value ? rec.value : { docId, driveKey: '', path: '/', title: docId }
    candidates.push({
      docId, driveKey: d.driveKey, path: d.path, title: d.title, tf,
      publishedAt: d.publishedAt || 0, tier, trustHop, endorsers: 0,
      contentHash: d.h || '', signerPubkey: d.signerPubkey || '',
    })
  }
  return rankCandidates(candidates, { now0 }).slice(0, limit)
}

module.exports = {
  SCHEMA_VERSION, MAX_TERMS_PER_DOC, STOPWORDS, RANK,
  tokenize, docIdFor, invScore, postingKey, docKey, postingSetHash,
  buildDocRecords, rankCandidates, searchIndex, fnvUnit, hashHex,
}
