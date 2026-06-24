function asResults (value) {
  if (Array.isArray(value)) return { results: value, partial: false, provenance: null, peerFetchStats: [] }
  if (!value || typeof value !== 'object') return { results: [], partial: false, provenance: null, peerFetchStats: [] }
  return {
    results: Array.isArray(value.results) ? value.results : [],
    partial: !!value.partial,
    provenance: value.provenance || null,
    peerFetchStats: Array.isArray(value.peerFetchStats) ? value.peerFetchStats : []
  }
}

function relevanceEntries (relevant) {
  if (!relevant || typeof relevant !== 'object') return []
  return Object.entries(relevant)
    .map(([docId, score]) => [docId, Number(score) || 0])
    .filter(([, score]) => score > 0)
}

function dcg (scores) {
  let total = 0
  for (let i = 0; i < scores.length; i++) {
    total += (Math.pow(2, scores[i]) - 1) / Math.log2(i + 2)
  }
  return total
}

function scoreQuery (results, relevant, k = 10) {
  const entries = relevanceEntries(relevant)
  const relevantIds = new Set(entries.map(([docId]) => docId))
  const top = results.slice(0, k)
  const topIds = top.map((r) => r && r.docId).filter(Boolean)
  let firstRelevantRank = 0
  let hits = 0
  const gains = []

  for (let i = 0; i < topIds.length; i++) {
    const rel = Number(relevant[topIds[i]]) || 0
    gains.push(rel)
    if (rel > 0) {
      hits++
      if (!firstRelevantRank) firstRelevantRank = i + 1
    }
  }

  const ideal = entries.map(([, score]) => score).sort((a, b) => b - a).slice(0, k)
  const idealDcg = dcg(ideal)
  return {
    recallAtK: relevantIds.size ? hits / relevantIds.size : 1,
    reciprocalRank: firstRelevantRank ? 1 / firstRelevantRank : 0,
    ndcg: idealDcg ? dcg(gains) / idealDcg : 1,
    firstRelevantRank,
    hits,
    relevant: relevantIds.size
  }
}

function percentile (values, p) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

async function runEvaluation ({ queries, search, k = 10, now0 = Date.now() } = {}) {
  if (!Array.isArray(queries)) throw new Error('queries must be an array')
  if (typeof search !== 'function') throw new Error('search function required')

  const rows = []
  for (const spec of queries) {
    const t0 = Date.now()
    const raw = await search(spec.query, { limit: k, now0 })
    const elapsed = Date.now() - t0
    const normalized = asResults(raw)
    const metrics = scoreQuery(normalized.results, spec.relevant || {}, k)
    rows.push({
      id: spec.id || spec.query,
      query: spec.query,
      expected: Object.keys(spec.relevant || {}),
      topDocIds: normalized.results.slice(0, k).map((r) => r.docId),
      latencyMs: elapsed,
      partial: normalized.partial,
      provenance: normalized.provenance,
      peerFetchStats: normalized.peerFetchStats,
      ...metrics
    })
  }

  const n = rows.length || 1
  const latencies = rows.map((row) => row.latencyMs)
  const aggregate = {
    queries: rows.length,
    mrr: rows.reduce((sum, row) => sum + row.reciprocalRank, 0) / n,
    recallAtK: rows.reduce((sum, row) => sum + row.recallAtK, 0) / n,
    ndcg: rows.reduce((sum, row) => sum + row.ndcg, 0) / n,
    latencyMsP50: percentile(latencies, 50),
    latencyMsP95: percentile(latencies, 95),
    partialQueries: rows.filter((row) => row.partial).length,
    failedQueries: rows.filter((row) => row.recallAtK < 1).map((row) => row.id)
  }
  return { k, aggregate, queries: rows }
}

module.exports = {
  runEvaluation,
  scoreQuery,
  dcg,
  percentile
}
