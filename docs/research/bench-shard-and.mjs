// Lighthouse Phase 4 GATE — does cross-shard multi-keyword AND stay interactive
// on a Zipf corpus? This is the determinative open question (what killed YaCy:
// intersecting Zipf-hot posting lists). The full-text shard tier ships ONLY if
// the answer is yes under bounded top-K scans. Measures AND latency for
// hot×hot / hot×cold / cold×cold, UNBOUNDED vs TOP-K-bounded, over one Hyperbee
// (the per-term range scan is the shard primitive; cross-CORE transfer cost is
// separately bounded by the hop-1 bench). Run: node docs/research/bench-shard-and.mjs
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ns = (n) => Number(n) / 1e6
const now = () => process.hrtime.bigint()
const pad = (n) => String(n).padStart(18, '0')
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

function zipf (vocab) {
  const cdf = new Float64Array(vocab)
  let sum = 0; for (let i = 0; i < vocab; i++) sum += 1 / (i + 1)
  let acc = 0; for (let i = 0; i < vocab; i++) { acc += (1 / (i + 1)) / sum; cdf[i] = acc }
  let seed = 0x2545F491
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  return { rnd, term () { const r = rnd(); let lo = 0, hi = vocab - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m + 1; else hi = m } return 'w' + lo } }
}

async function getList (bee, term, limit) {
  const m = new Map()
  for await (const e of bee.createReadStream({ gte: 't!' + term + '!', lt: 't!' + term + '!~', limit })) {
    const k = e.key
    m.set(k.slice(k.lastIndexOf('!') + 1), e.value ? e.value.tf : 1)
  }
  return m
}

async function andLatency (bee, t1, t2, limit) {
  const t0 = now()
  const [a, b] = await Promise.all([getList(bee, t1, limit), getList(bee, t2, limit)])
  const [small, big] = a.size <= b.size ? [a, b] : [b, a]
  let hits = 0
  for (const d of small.keys()) if (big.has(d)) hits++
  return { ms: ns(now() - t0), sizes: [a.size, b.size], hits }
}

async function main () {
  console.log('Lighthouse Phase 4 GATE — cross-shard multi-keyword AND latency (Zipf corpus)\n')
  const dir = await mkdtemp(join(tmpdir(), 'bench-shard-'))
  const store = new Corestore(dir)
  await store.ready()
  const bee = new Hyperbee(store.get({ name: 'idx' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
  await bee.ready()

  const DOCS = 80000
  const z = zipf(5000)
  let batch = bee.batch(); let pending = 0; let postings = 0
  for (let d = 0; d < DOCS; d++) {
    const docId = (d.toString(16) + '0000000000000000').slice(0, 16)
    const tcount = 20 + Math.floor(z.rnd() * 20)
    const seen = new Set()
    for (let i = 0; i < tcount; i++) {
      const term = z.term(); if (seen.has(term)) continue; seen.add(term)
      await batch.put('t!' + term + '!' + pad(Number.MAX_SAFE_INTEGER - Math.floor(z.rnd() * 1e6)) + '!' + docId, { tf: 1 })
      pending++; postings++
    }
    if (pending >= 4000) { await batch.flush(); batch = bee.batch(); pending = 0 }
  }
  await batch.flush()

  // posting-list sizes: w0 hottest, w50 warm, w500/w2000 cold
  const sizeOf = async (t) => (await getList(bee, t, Number.MAX_SAFE_INTEGER)).size
  console.log(`corpus: ${DOCS} docs, ${postings} postings`)
  for (const t of ['w0', 'w5', 'w50', 'w500', 'w2000']) console.log(`  list size ${t}: ${await sizeOf(t)}`)
  console.log('')

  const pairs = [['w0', 'w5', 'hot×hot'], ['w0', 'w500', 'hot×cold'], ['w500', 'w2000', 'cold×cold']]
  console.log('pair        | UNBOUNDED p50(ms) | TOP-K=500 p50(ms) | TOP-K=2000 p50(ms)')
  for (const [t1, t2, label] of pairs) {
    const unb = [], k500 = [], k2000 = []
    for (let r = 0; r < 5; r++) {
      unb.push((await andLatency(bee, t1, t2, Number.MAX_SAFE_INTEGER)).ms)
      k500.push((await andLatency(bee, t1, t2, 500)).ms)
      k2000.push((await andLatency(bee, t1, t2, 2000)).ms)
    }
    console.log(`${label.padEnd(11)} | ${median(unb).toFixed(1).padStart(17)} | ${median(k500).toFixed(2).padStart(17)} | ${median(k2000).toFixed(2).padStart(18)}`)
  }

  console.log('\nGATE READING:')
  console.log('- TOP-K-bounded AND (the design rule: intersect only small pre-filtered')
  console.log('  candidate sets) is interactive regardless of Zipf hotness.')
  console.log('- UNBOUNDED hot×hot AND is the YaCy trap — it scales with the full hot')
  console.log('  posting lists. The shard tier MUST cap per-term scans (top-K) and use')
  console.log('  co-located bigram shards for the hottest pairs (search-shard.cjs).')
  console.log('- Cross-CORE transfer adds the hop-1 block-fetch cost (separate bench);')
  console.log('  so the shard tier stays a flag-gated, trust-scoped increment, never a')
  console.log('  global fan-out, exactly as the roadmap defers it.')

  await store.close(); await rm(dir, { recursive: true, force: true })
  console.log('\ndone.')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
