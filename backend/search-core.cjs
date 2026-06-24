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
const MAX_EXCERPT_CHARS = 320
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

function phraseTokens (text) {
  if (typeof text !== 'string' || !text) return []
  const norm = text.normalize('NFKC').toLowerCase()
  const out = []
  for (const raw of norm.split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 2 || raw.length > 40) continue
    if (STOPWORDS.has(raw)) continue
    out.push(raw)
  }
  return out
}

function hashHex (str) {
  return b4a.toString(crypto.data(b4a.from(String(str))), 'hex')
}

function compactText (value, max = MAX_EXCERPT_CHARS) {
  if (typeof value !== 'string') return ''
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

function cleanString (value, max = 256) {
  if (typeof value !== 'string') return null
  const s = value.normalize('NFKC').trim().slice(0, max)
  return s || null
}

// Result/source metadata is signed when present, but kept deliberately compact:
// only stable scalar fields that explain where a row came from. Unknown object
// shape is not copied into the signed record because app rows can be large and
// schema-specific.
function normalizeSource (source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null
  const out = {}
  for (const [from, to, max] of [
    ['kind', 'kind', 40],
    ['appSlug', 'appSlug', 64],
    ['recordType', 'recordType', 64],
    ['recordKey', 'recordKey', 256],
    ['author', 'author', 128],
    ['authorPubkey', 'authorPubkey', 128],
    ['outbox', 'outbox', 128],
    ['appDriveKey', 'appDriveKey', 128],
    ['rawAppId', 'rawAppId', 128],
    ['scopedAppId', 'scopedAppId', 128],
    ['verifiedAs', 'verifiedAs', 64],
    ['availability', 'availability', 64]
  ]) {
    const s = cleanString(source[from], max)
    if (s) out[to] = s
  }
  return Object.keys(out).length ? out : null
}

function makeExcerpt (doc) {
  const explicit = compactText(doc && doc.excerpt)
  if (explicit) return explicit
  const body = compactText(doc && doc.body)
  if (body) return body
  return compactText(doc && doc.title, 200)
}

function uniqueSorted (values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => cmp(a, b))
}

// Parse a small user-facing query language while still preserving the old free
// text path. Filters are additive and local-only:
//   app:peerit       source.appSlug
//   type:post        source.recordType
//   kind:app-data    source.kind
//   author:<key>     source author/outbox
// A trailing '*' means prefix match, e.g. "hyp*". Quoted phrases run as a
// high-confidence lane over stored display fields before falling back to normal
// AND/OR execution.
function parseQuery (query) {
  const raw = String(query || '').normalize('NFKC').trim()
  const filters = {}
  let text = raw.replace(/(?:^|\s)(app|type|kind|source|author):("[^"]+"|\S+)/ig, (m, key, value) => {
    const v = value.replace(/^"|"$/g, '').trim().toLowerCase()
    if (!v) return ' '
    if (key.toLowerCase() === 'app') filters.appSlug = v
    else if (key.toLowerCase() === 'type') filters.recordType = v
    else if (key.toLowerCase() === 'author') filters.author = v
    else filters.sourceKind = v
    return ' '
  })
  const phraseTerms = []
  const phrases = []
  text = text.replace(/"([^"]+)"/g, (_, phrase) => {
    const terms = phraseTokens(phrase)
    if (terms.length) {
      phraseTerms.push(...terms)
      phrases.push(terms)
    }
    return ' '
  })
  const prefixes = []
  text = text.replace(/(^|\s)([\p{L}\p{N}][\p{L}\p{N}_-]{1,39})\*/gu, (_, lead, prefix) => {
    const term = tokenize(prefix).map((t) => t.term)[0]
    if (term) prefixes.push(term)
    return lead || ' '
  })
  const terms = uniqueSorted([...phraseTerms, ...tokenize(text).map((t) => t.term)])
  return { raw, terms, prefixes: uniqueSorted(prefixes), phrases, filters }
}

// Stable doc id = hash(len(driveKey)|driveKey|path)[:16]. Length-prefixed so
// (driveKey,path) is unambiguous (a NUL separator could be forged across the
// boundary). Identifies a page across re-crawls.
function docIdFor (driveKey, path) {
  const dk = String(driveKey || ''); const p = String(path || '/')
  return hashHex(dk.length + '|' + dk + '|' + p).slice(0, 16)
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
  // Injective canonical encoding: JSON of sorted [term, tf, field] triples. A
  // delimiter-join ('term:tf:field' | …) collides when a term contains the
  // delimiters, which would let a tamperer alter the posting set undetected.
  // canonNum keeps non-finite tf/field DISTINCT (JSON.stringify maps NaN /
  // Infinity / undefined / null all to `null`, which would collide distinct
  // tampered posting sets under one integrity hash).
  const canonNum = (x) => Number.isFinite(x) ? x : 'nf:' + String(x)
  const canon = [...terms]
    .sort((a, b) => (a.term < b.term ? -1 : a.term > b.term ? 1 : 0))
    .map((t) => [t.term, canonNum(t.tf), canonNum(t.field || 1)])
  return hashHex(JSON.stringify(canon))
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
  const excerpt = makeExcerpt(doc)
  const source = normalizeSource(doc && doc.source)
  const link = cleanString(doc && doc.link, 512)
  if (excerpt) canonDoc.excerpt = excerpt
  if (source) canonDoc.source = source
  if (link) canonDoc.link = link
  const signed = sign ? sign(canonDoc) : { sig: '', pubkey: '' }
  const records = []
  records.push([docKey(docId), { ...canonDoc, sig: signed.sig, signerPubkey: signed.pubkey }])
  for (const { term, tf } of terms) {
    records.push([postingKey(term, tf, docId), { tf, ff: 1 }])
  }
  return { docId, terms, records }
}

// The EXACT bytes buildDocRecords signed for a doc: the canonDoc (the d! record
// minus sig + signerPubkey) in its original key order. Shared by the signer
// (PersonalIndex sign hook) and the federated RowVerifier so a peer's posting
// signature is checked over identical bytes — any tampering changes these bytes
// and fails the check.
function canonDocBytes (rec) {
  const canon = {
    v: rec.v,
    docId: rec.docId,
    driveKey: rec.driveKey,
    path: rec.path,
    title: rec.title,
    terms: rec.terms,
    h: rec.h,
    publishedAt: rec.publishedAt
  }
  const excerpt = compactText(rec.excerpt)
  const source = normalizeSource(rec.source)
  const link = cleanString(rec.link, 512)
  if (excerpt) canon.excerpt = excerpt
  if (source) canon.source = source
  if (link) canon.link = link
  return JSON.stringify(canon)
}

// FNV-1a over a string → a deterministic [0,1) dither for exploration that
// never reads a clock or RNG, so rankings are reproducible.
function fnvUnit (str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0 }
  return (h >>> 0) / 0xffffffff
}

// Stable 3-way string compare for deterministic, antisymmetric tie-breaks.
function cmp (a, b) { return a < b ? -1 : a > b ? 1 : 0 }

const RANK = {
  W: { text: 1.0, trust: 0.9, endorse: 0.6, recency: 0.5, tier: 0.7 }, // feature weights
  // ε-floor kept SHALLOW: with a tiny eps, ln(eps) is a deep cliff so a single
  // zero/low feature (e.g. 0 endorsers) would dominate the log-product and bury
  // a strong text match. 0.15 keeps every feature's contribution bounded.
  EPS: 0.15,
  E_CAP: 8, // hard cap on endorser breadth (sybil-proof)
  HALFLIFE_DAYS: 30,
  LAMBDA: 0.05, // exploration dither magnitude (small, deterministic)
  TIER: { self: 1.0, followed: 0.8, default: 0.5 },
  K1: 1.2 // BM25-style tf saturation
}

// The v2 ranker: a pure, deterministic, capped-additive-in-log-space score.
// `candidates`: [{ docId, driveKey, path, title, tf, trustHop, endorsers,
//   publishedAt, tier, contentHash, signerPubkey }]. `now0` is the single
// query-time timestamp, passed IN (never read inside the fold). Returns
// candidates sorted best-first with a `_score`, after MMR diversity by driveKey.
function rankCandidates (candidates, { now0 = 0, diversity = true } = {}) {
  const eps = RANK.EPS
  const clamp01 = (x) => Math.max(0, Math.min(1, x))
  // Text relevance is the PRIMARY base (low text → low score, correct). Every
  // other feature is a NON-NEGATIVE boost via ln(1 + w·f): an absent feature
  // (0 endorsers, an old doc) contributes ln(1)=0 (neutral), so it can never
  // bury a strong text match — fixing the ε-cliff where a single zero feature
  // dominated the log-product. Boosts are bounded by their weights.
  const boost = (w, f) => Math.log(1 + w * clamp01(f))
  // Coerce EVERY feature input to a finite number with a NEUTRAL default —
  // any non-numeric tf/trustHop/endorsers/publishedAt (a peer-supplied ISO
  // date string, a typo) must never poison _score with NaN, which would make
  // the order comparator non-transitive. This is the deterministic trust
  // boundary; it self-defends all inputs, not just some.
  const num = (x, dflt) => { const v = Number(x); return Number.isFinite(v) ? v : dflt }
  const scored = candidates.map((c) => {
    // clamp tf ≥ 0: a hostile negative tf hits the BM25 pole at -K1 and inverts
    // to MAX relevance (tf=-5 → ratio 1.3 → clamped to 1.0).
    const tfc = Math.max(0, num(c.tf, 0))
    const f1 = tfc / (tfc + RANK.K1)                                       // text (BM25-ish saturation)
    const f2 = 1 / (1 + Math.max(0, num(c.trustHop, 0)))                   // trust proximity (hop-0 → 1)
    const f3 = Math.min(Math.max(0, num(c.endorsers, 0)), RANK.E_CAP) / RANK.E_CAP // endorser breadth, capped
    const pub = num(c.publishedAt, 0)
    const ageDays = now0 && pub ? Math.max(0, (now0 - pub) / 86400000) : 0
    const f4 = Math.pow(2, -ageDays / RANK.HALFLIFE_DAYS)                  // recency half-life
    // typeof-number guard: a prototype-chain tier key ('__proto__', 'toString'…)
    // would resolve RANK.TIER[c.tier] to an object (!= null), making f5 an object
    // → NaN _score → a non-transitive comparator that breaks the total order.
    const f5raw = RANK.TIER[c.tier]
    const f5 = typeof f5raw === 'number' ? f5raw : RANK.TIER.default
    const logScore = RANK.W.text * Math.log(eps + clamp01(f1)) +
      boost(RANK.W.trust, f2) + boost(RANK.W.endorse, f3) +
      boost(RANK.W.recency, f4) + boost(RANK.W.tier, f5)
    const dither = RANK.LAMBDA * fnvUnit(c.docId || c.path || '')
    const score = logScore + dither
    // backstop: never let a non-finite score reach the comparator
    return { ...c, _score: Number.isFinite(score) ? score : -Infinity }
  })
  // total order: score desc, then contentHash, then signerPubkey (deterministic,
  // antisymmetric — never returns 1 for equal operands)
  const order = (a, b) => (b._score - a._score) ||
    cmp(a.contentHash || '', b.contentHash || '') ||
    cmp(a.signerPubkey || '', b.signerPubkey || '')
  scored.sort(order)
  if (!diversity) return scored
  // greedy MMR-lite: lightly penalize repeats of the same driveKey so one site
  // can't monopolize the page. Pure (penalty depends only on prior selections).
  const seen = new Map()
  for (const c of scored) {
    const n = seen.get(c.driveKey) || 0
    c._score -= 0.15 * n
    seen.set(c.driveKey, n + 1)
  }
  scored.sort(order)
  return scored
}

function getPlan (query) {
  return query && Array.isArray(query.terms) && Array.isArray(query.prefixes)
    ? query
    : parseQuery(query)
}

function planUnits (plan) {
  return [
    ...plan.terms.map((term) => ({ term, prefix: false })),
    ...plan.prefixes.map((term) => ({ term, prefix: true }))
  ]
}

function termMapOf (rec) {
  const map = new Map()
  for (const t of (rec && rec.terms) || []) {
    if (!t || typeof t.term !== 'string') continue
    const tf = Number.isFinite(Number(t.tf)) ? Number(t.tf) : 1
    map.set(t.term, Math.max(map.get(t.term) || 0, tf))
  }
  return map
}

function sourceValue (rec, key) {
  const s = (rec && rec.source) || {}
  if (key === 'kind') return (s.kind || 'page').toLowerCase()
  return typeof s[key] === 'string' ? s[key].toLowerCase() : ''
}

function matchesFilters (rec, filters = {}) {
  if (filters.appSlug && sourceValue(rec, 'appSlug') !== filters.appSlug) return false
  if (filters.recordType && sourceValue(rec, 'recordType') !== filters.recordType) return false
  if (filters.sourceKind && sourceValue(rec, 'kind') !== filters.sourceKind) return false
  if (filters.author) {
    const author = filters.author.toLowerCase()
    const candidates = ['author', 'authorPubkey', 'outbox']
      .map((key) => sourceValue(rec, key))
      .filter(Boolean)
    if (!candidates.some((v) => v === author || v.startsWith(author))) return false
  }
  return true
}

function termMatches (terms, term, prefix) {
  if (!prefix) return terms.has(term)
  for (const key of terms.keys()) if (key.startsWith(term)) return true
  return false
}

function phraseFields (rec) {
  const fields = [rec && rec.title, rec && rec.excerpt, rec && rec.path, rec && rec.link]
  const source = rec && rec.source
  if (source) fields.push(Object.values(source).join(' '))
  return fields
    .map((value) => phraseTokens(String(value || '')).join(' '))
    .filter(Boolean)
}

function phraseMatchesPlan (rec, plan) {
  const phrases = Array.isArray(plan && plan.phrases) ? plan.phrases : []
  if (!phrases.length) return true
  const fields = phraseFields(rec)
  return phrases.every((terms) => {
    const needle = Array.isArray(terms) ? terms.join(' ') : String(terms || '')
    return needle && fields.some((field) => field.includes(needle))
  })
}

function editDistanceAtMost (a, b, max) {
  if (a === b) return true
  if (!a || !b || Math.abs(a.length - b.length) > max) return false
  if (a.length === b.length) {
    for (let i = 0; i < a.length - 1; i++) {
      if (a[i] === b[i + 1] && a[i + 1] === b[i] &&
          a.slice(0, i) === b.slice(0, i) &&
          a.slice(i + 2) === b.slice(i + 2)) return true
    }
  }
  let prev = new Array(b.length + 1)
  let cur = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    let rowMin = cur[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (cur[j] < rowMin) rowMin = cur[j]
    }
    if (rowMin > max) return false
    const tmp = prev; prev = cur; cur = tmp
  }
  return prev[b.length] <= max
}

function editDistanceBounded (a, b, max) {
  if (!editDistanceAtMost(a, b, max)) return max + 1
  if (a === b) return 0
  if (a.length === b.length) {
    for (let i = 0; i < a.length - 1; i++) {
      if (a[i] === b[i + 1] && a[i + 1] === b[i] &&
          a.slice(0, i) === b.slice(0, i) &&
          a.slice(i + 2) === b.slice(i + 2)) return 1
    }
  }
  let prevPrev = null
  let prev = new Array(b.length + 1)
  let cur = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], (prevPrev ? prevPrev[j - 2] : j - 2) + 1)
      }
    }
    prevPrev = prev
    const tmp = prev; prev = cur; cur = tmp
  }
  return Math.min(prev[b.length], max + 1)
}

async function nearestIndexedTerm (bee, term, { scanLimit = 5000 } = {}) {
  if (!term || term.length < 4) return term
  const max = term.length >= 6 ? 2 : 1
  let best = null
  let bestDistance = max + 1
  let seen = ''
  let scanned = 0
  for await (const e of bee.createReadStream({ gte: 't!', lt: 't!~' })) {
    if (++scanned > scanLimit) break
    const indexed = String(e.key || '').split('!')[1] || ''
    if (!indexed || indexed === seen) continue
    seen = indexed
    if (Math.abs(indexed.length - term.length) > max) continue
    const distance = editDistanceBounded(term, indexed, max)
    if (distance < bestDistance || (distance === bestDistance && (best == null || indexed < best))) {
      best = indexed
      bestDistance = distance
      if (distance === 0) break
    }
  }
  return bestDistance <= max ? best : term
}

async function fuzzyPlan (bee, plan, opts = {}) {
  const replacements = []
  let changed = false
  for (const term of plan.terms) {
    const replacement = await nearestIndexedTerm(bee, term, opts)
    replacements.push(replacement)
    if (replacement !== term) changed = true
  }
  if (!changed) return null
  return { ...plan, terms: uniqueSorted(replacements), fuzzyOf: plan.terms }
}

function recordMatchesPlan (rec, plan, mode, { requirePhrases = false } = {}) {
  if (!matchesFilters(rec, plan.filters)) return false
  const terms = termMapOf(rec)
  const units = planUnits(plan)
  if (!units.length) return false
  if (requirePhrases && !phraseMatchesPlan(rec, plan)) return false
  if (mode === 'or') return units.some((u) => termMatches(terms, u.term, u.prefix))
  return units.every((u) => termMatches(terms, u.term, u.prefix))
}

function matchTf (rec, plan) {
  const terms = termMapOf(rec)
  let tf = 0
  for (const term of plan.terms) tf += terms.get(term) || 0
  for (const prefix of plan.prefixes) {
    for (const [term, n] of terms) if (term.startsWith(prefix)) tf += n
  }
  return tf || 1
}

function fieldHits (rec, plan) {
  const needles = [...plan.terms, ...plan.prefixes]
  if (!needles.length) return []
  const fields = [
    ['title', rec && rec.title],
    ['excerpt', rec && rec.excerpt],
    ['path', rec && rec.path],
    ['link', rec && rec.link]
  ]
  const source = rec && rec.source
  if (source) {
    fields.push(['source', Object.values(source).join(' ')])
  }
  const hits = new Set()
  for (const [name, value] of fields) {
    const text = String(value || '').normalize('NFKC').toLowerCase()
    if (!text) continue
    for (const n of needles) {
      if (text.includes(n)) { hits.add(name); break }
    }
  }
  return [...hits].sort((a, b) => cmp(a, b))
}

async function readPostingList (bee, unit, perTerm) {
  const gte = unit.prefix ? `t!${unit.term}` : `t!${unit.term}!`
  const lt = unit.prefix ? `t!${unit.term}~` : `t!${unit.term}!~`
  const out = new Map()
  for await (const e of bee.createReadStream({ gte, lt, limit: perTerm })) {
    const k = e.key
    const docId = k.slice(k.lastIndexOf('!') + 1)
    out.set(docId, (out.get(docId) || 0) + (e.value && e.value.tf ? e.value.tf : 1))
  }
  return out
}

// Extract candidate rows (PRE-rank) for a query over a ready Hyperbee holding v2
// records. Exact mode scans bounded posting windows, anchors on the smallest
// list, then verifies the remaining terms against the signed d! term set. That
// keeps the hot-term cap while avoiding the classic "common rare" recall loss
// from intersecting two independently-capped lists.
async function scanHits (bee, query, { perTerm = 500, mode = 'and', requirePhrases = false } = {}) {
  const plan = getPlan(query)
  const units = planUnits(plan)
  if (units.length === 0) return []
  const lists = []
  for (const unit of units) {
    const postings = await readPostingList(bee, unit, perTerm)
    if (mode !== 'or' && postings.size === 0) return []
    lists.push({ unit, postings })
  }
  const docIds = new Set()
  if (mode === 'or') {
    for (const { postings } of lists) for (const docId of postings.keys()) docIds.add(docId)
  } else {
    lists.sort((a, b) => (a.postings.size - b.postings.size) || cmp(a.unit.term, b.unit.term))
    for (const docId of lists[0].postings.keys()) docIds.add(docId)
  }
  const out = []
  for (const docId of docIds) {
    const rec = await bee.get(docKey(docId)).catch(() => null)
    const value = rec && rec.value ? rec.value : null
    if (!value || !recordMatchesPlan(value, plan, mode, { requirePhrases })) continue
    out.push({ docId, tf: matchTf(value, plan), rec: value, matchMode: requirePhrases ? 'phrase' : (mode === 'or' ? 'soft-or' : 'and') })
  }
  return out
}

async function searchCandidates (bee, query, { perTerm = 500, tier = 'self', trustHop = 0, softFallback = true, fuzzyFallback = true } = {}) {
  const plan = getPlan(query)
  let resultPlan = plan
  let resultMode = 'and'
  let hits = []
  if (Array.isArray(plan.phrases) && plan.phrases.length > 0) {
    hits = await scanHits(bee, plan, { perTerm, mode: 'and', requirePhrases: true })
    if (hits.length) resultMode = 'phrase'
  }
  if (hits.length === 0) hits = await scanHits(bee, plan, { perTerm, mode: 'and' })
  if (fuzzyFallback && hits.length === 0 && plan.terms.length > 0) {
    const fp = await fuzzyPlan(bee, plan)
    if (fp) {
      const fuzzyHits = await scanHits(bee, fp, { perTerm, mode: 'and' })
      if (fuzzyHits.length) {
        hits = fuzzyHits
        resultPlan = fp
        resultMode = 'fuzzy'
      }
    }
  }
  if (softFallback && hits.length === 0 && planUnits(plan).length > 1) {
    hits = await scanHits(bee, plan, { perTerm, mode: 'or' })
    resultMode = 'soft-or'
  }
  if (softFallback && fuzzyFallback && hits.length === 0 && plan.terms.length > 0 && planUnits(plan).length > 1) {
    const fp = await fuzzyPlan(bee, plan)
    if (fp) {
      const fuzzyHits = await scanHits(bee, fp, { perTerm, mode: 'or' })
      if (fuzzyHits.length) {
        hits = fuzzyHits
        resultPlan = fp
        resultMode = 'fuzzy-or'
      }
    }
  }
  return hits.map(({ docId, tf, rec }) => {
    const d = rec || { docId, driveKey: '', path: '/', title: docId }
    return {
      docId,
      driveKey: d.driveKey,
      path: d.path,
      title: d.title,
      tf,
      excerpt: d.excerpt || '',
      source: d.source || null,
      link: d.link || null,
      fieldHits: fieldHits(d, resultPlan),
      matchMode: resultMode === 'and'
        ? (recordMatchesPlan(d, plan, 'and') ? 'and' : 'soft-or')
        : resultMode,
      publishedAt: d.publishedAt || 0,
      tier,
      trustHop,
      endorsers: 0,
      contentHash: d.h || '',
      signerPubkey: d.signerPubkey || ''
    }
  })
}

// Query hits as SIGNED rows for federated verification: [{ tf, rec }] where rec
// is the peer's full d! record (with sig + signerPubkey). Rows without a record
// are dropped (nothing to verify). The RowVerifier checks each rec against the
// peer's resolved search key before it can rank.
async function searchSignedHits (bee, query, { perTerm = 500 } = {}) {
  const plan = getPlan(query)
  let hits = []
  if (Array.isArray(plan.phrases) && plan.phrases.length > 0) {
    hits = await scanHits(bee, plan, { perTerm, mode: 'and', requirePhrases: true })
  }
  if (hits.length === 0) hits = await scanHits(bee, plan, { perTerm, mode: 'and' })
  if (hits.length === 0 && plan.terms.length > 0) {
    const fp = await fuzzyPlan(bee, plan)
    if (fp) hits = await scanHits(bee, fp, { perTerm, mode: 'and' })
  }
  if (hits.length === 0 && planUnits(plan).length > 1) hits = await scanHits(bee, plan, { perTerm, mode: 'or' })
  const out = []
  for (const { tf, rec } of hits) if (rec) out.push({ tf, rec })
  return out
}

// End-to-end local query over a ready Hyperbee: candidates → deterministic rank.
async function searchIndex (bee, query, { limit = 200, perTerm = 500, now0 = 0, tier = 'self', trustHop = 0 } = {}) {
  const candidates = await searchCandidates(bee, query, { perTerm, tier, trustHop })
  if (candidates.length === 0) return []
  const n = Math.max(0, Math.floor(Number(limit) || 0))
  return rankCandidates(candidates, { now0 }).slice(0, n)
}

module.exports = {
  SCHEMA_VERSION, MAX_TERMS_PER_DOC, MAX_EXCERPT_CHARS, STOPWORDS, RANK,
  tokenize, phraseTokens, docIdFor, invScore, postingKey, docKey, postingSetHash,
  parseQuery, normalizeSource, makeExcerpt,
  buildDocRecords, canonDocBytes, rankCandidates,
  scanHits, searchCandidates, searchSignedHits, searchIndex,
  editDistanceAtMost, editDistanceBounded, nearestIndexedTerm, fuzzyPlan,
  fnvUnit, hashHex
}
