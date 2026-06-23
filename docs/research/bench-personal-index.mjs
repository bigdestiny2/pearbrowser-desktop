// Benchmark for the "Lighthouse" personal inverted index (P2P search research).
// Answers the completeness critic's #1 follow-up with real numbers:
//   A. Is the proposed `t!<term>!<invScore>!<docId>` range-scan structure fast
//      at interactive scale (single-term top-k, 2-term AND, 3-term AND)?
//   B. The personal-index BYTE budget (the load-bearing privacy claim is
//      "batch-replicate the friend's whole small index" — is it actually small?).
//   C. The schema-sheets `list()` cliff, modeled by a full createReadStream
//      .toArray()-style materialization + JS filter vs a targeted range scan,
//      at 100 / 1k / 10k / 50k rows.
//
// Plain hyperbee + corestore (the exact primitives Lighthouse builds on), so
// the numbers transfer. Run: node docs/research/bench-personal-index.mjs
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import { mkdtemp, rm, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ns = (n) => Number(n) / 1e6 // ns bigint -> ms
const now = () => process.hrtime.bigint()
const pad = (n) => String(n).padStart(18, '0')

async function dirBytes (dir) {
  let total = 0
  const stack = [dir]
  while (stack.length) {
    const d = stack.pop()
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) stack.push(p)
      else { try { total += (await stat(p)).size } catch {} }
    }
  }
  return total
}

// Zipfian vocabulary: term i has weight ~ 1/(i+1). Returns a sampler.
function zipf (vocabSize) {
  const weights = new Float64Array(vocabSize)
  let sum = 0
  for (let i = 0; i < vocabSize; i++) { weights[i] = 1 / (i + 1); sum += weights[i] }
  const cdf = new Float64Array(vocabSize)
  let acc = 0
  for (let i = 0; i < vocabSize; i++) { acc += weights[i] / sum; cdf[i] = acc }
  // deterministic LCG so runs are comparable
  let seed = 0x2545F491
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  return {
    rnd,
    term () {
      const r = rnd()
      // binary search cdf
      let lo = 0, hi = vocabSize - 1
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid }
      return 'w' + lo
    },
  }
}

// A realistic signed posting value: 64-byte sig + 32-byte signer pubkey + score.
function postingValue (score, z) {
  return {
    sc: score,
    s: b4a.toString(crypto.randomBytes ? crypto.randomBytes(64) : Buffer.alloc(64), 'base64'),
    k: b4a.toString(crypto.randomBytes ? crypto.randomBytes(32) : Buffer.alloc(32), 'hex'),
  }
}

async function buildPersonalIndex (docs, avgTerms, vocab) {
  const dir = await mkdtemp(join(tmpdir(), 'bench-pidx-'))
  const store = new Corestore(dir)
  await store.ready()
  const bee = new Hyperbee(store.get({ name: 'idx' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
  await bee.ready()
  const z = zipf(vocab)

  const t0 = now()
  let postings = 0
  let batch = bee.batch()
  let pending = 0
  const flush = async () => { await batch.flush(); batch = bee.batch(); pending = 0 }
  for (let d = 0; d < docs; d++) {
    const docId = b4a.toString(crypto.data ? crypto.data(b4a.from('doc' + d)) : crypto.randomBytes(16), 'hex').slice(0, 16)
    // term count ~ avgTerms +/- spread, capped at 64
    const tcount = Math.min(64, Math.max(3, Math.round(avgTerms * (0.5 + z.rnd()))))
    const seen = new Set()
    await batch.put('d!' + docId, { t: 'Doc ' + d, u: 'hyper://' + docId, p: '/' })
    pending++
    for (let i = 0; i < tcount; i++) {
      const term = z.term()
      if (seen.has(term)) continue
      seen.add(term)
      const localScore = Math.floor(z.rnd() * 1e6)
      const invScore = pad(Number.MAX_SAFE_INTEGER - localScore)
      await batch.put('t!' + term + '!' + invScore + '!' + docId, postingValue(localScore, z))
      pending++; postings++
    }
    if (pending >= 2000) await flush()
  }
  await batch.flush()
  const buildMs = ns(now() - t0)
  // flush cores to disk before measuring
  await bee.core.update().catch(() => {})
  const bytes = await dirBytes(dir)
  return { dir, store, bee, z, docs, postings, buildMs, bytes }
}

async function scanTerm (bee, term, limit) {
  const out = []
  for await (const e of bee.createReadStream({ gte: 't!' + term + '!', lt: 't!' + term + '!~', limit })) {
    // docId is the last '!'-segment of the key
    const k = e.key
    out.push(k.slice(k.lastIndexOf('!') + 1))
  }
  return out
}

async function timeQuery (bee, terms, limit) {
  const t0 = now()
  const lists = []
  for (const term of terms) lists.push(new Set(await scanTerm(bee, term, limit)))
  // intersect smallest-first
  lists.sort((a, b) => a.size - b.size)
  let res = lists[0]
  for (let i = 1; i < lists.length; i++) {
    const next = new Set()
    for (const d of res) if (lists[i].has(d)) next.add(d)
    res = next
  }
  return { ms: ns(now() - t0), hits: res.size, listSizes: lists.map((l) => l.size) }
}

function median (xs) { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

async function benchPersonal () {
  console.log('\n=== A/B. Personal inverted index — range-scan structure + byte budget ===')
  console.log('docs | postings | build(ms) | on-disk(MB) | bytes/posting | 1-term p50(ms) | 2-AND p50 | 3-AND p50')
  for (const docs of [500, 2000, 8000]) {
    const idx = await buildPersonalIndex(docs, 30, 4000)
    // pick hot (low-index) and warm terms for queries
    const hot = ['w0', 'w1', 'w2', 'w5', 'w10', 'w25', 'w60', 'w150']
    const one = [], two = [], three = []
    for (let i = 0; i < 8; i++) {
      one.push((await timeQuery(idx.bee, [hot[i % hot.length]], 500)).ms)
      two.push((await timeQuery(idx.bee, [hot[i % hot.length], hot[(i + 3) % hot.length]], 500)).ms)
      three.push((await timeQuery(idx.bee, [hot[i % hot.length], hot[(i + 2) % hot.length], hot[(i + 4) % hot.length]], 500)).ms)
    }
    const mb = (idx.bytes / 1048576)
    console.log(
      `${String(idx.docs).padStart(4)} | ${String(idx.postings).padStart(8)} | ${idx.buildMs.toFixed(0).padStart(9)} | ${mb.toFixed(2).padStart(11)} | ${(idx.bytes / idx.postings).toFixed(0).padStart(13)} | ${median(one).toFixed(2).padStart(14)} | ${median(two).toFixed(2).padStart(9)} | ${median(three).toFixed(2).padStart(8)}`
    )
    await idx.store.close()
    await rm(idx.dir, { recursive: true, force: true })
  }
}

async function benchListCliff () {
  console.log('\n=== C. schema-sheets list() cliff — full materialization vs targeted range scan ===')
  console.log('rows | full-scan+filter p50(ms) | targeted range-scan p50(ms) | speedup')
  for (const rows of [100, 1000, 10000, 50000]) {
    const dir = await mkdtemp(join(tmpdir(), 'bench-list-'))
    const store = new Corestore(dir)
    await store.ready()
    const bee = new Hyperbee(store.get({ name: 'sheet' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready()
    const z = zipf(rows)
    let batch = bee.batch()
    for (let i = 0; i < rows; i++) {
      // rows-by-schema-time key, like schema-sheets `rows-by-schema-time`
      const key = 'row!apps!' + pad(i) + '!' + i
      await batch.put(key, { id: 'app' + i, name: 'App ' + i, cat: 'c' + (i % 20), driveKey: 'k'.repeat(64) })
      if (i > 0 && i % 2000 === 0) { await batch.flush(); batch = bee.batch() }
    }
    await batch.flush()

    // full materialization (models SchemaSheets.list(): .toArray() then JS filter)
    const fulls = [], targets = []
    for (let r = 0; r < 5; r++) {
      let t0 = now()
      const all = []
      for await (const e of bee.createReadStream({ gte: 'row!apps!', lt: 'row!apps!~' })) all.push(e.value)
      const filtered = all.filter((v) => v.cat === 'c7') // a JMESPath-equivalent JS filter
      fulls.push(ns(now() - t0))
      // targeted: if there were a secondary index on cat, you'd range-scan it.
      // model that with a direct key range (best case the structure enables).
      t0 = now()
      const hit = []
      for await (const e of bee.createReadStream({ gte: 'row!apps!' + pad(7), lt: 'row!apps!' + pad(7) + '~', limit: 50 })) hit.push(e.value)
      targets.push(ns(now() - t0))
      void filtered
    }
    const f = median(fulls), t = median(targets)
    console.log(`${String(rows).padStart(5)} | ${f.toFixed(2).padStart(24)} | ${t.toFixed(2).padStart(27)} | ${(f / t).toFixed(1).padStart(6)}x`)
    await store.close()
    await rm(dir, { recursive: true, force: true })
  }
}

async function main () {
  console.log('Lighthouse personal-index + list()-cliff benchmark (hyperbee/corestore)')
  await benchPersonal()
  await benchListCliff()
  console.log('\ndone.')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
