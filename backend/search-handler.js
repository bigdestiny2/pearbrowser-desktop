// search-handler.js — the CMD_SEARCH "local-first + optional background federate"
// contract, extracted from index.js so it is Node-testable (index.js itself
// needs Bare globals). The renderer gets local (hop-0) results synchronously at
// first paint (~5ms). If it asked to federate AND a query planner exists, the
// trusted-peer set arrives later as EVT_SEARCH_FEDERATED pushes correlated by
// queryId: optional incremental `phase:"batch"` payloads as peers finish, then
// a final `phase:"enriched"` payload. A newer query supersedes older in-flight
// federations, so stale enrichments never overwrite fresher results.
//
// Deps are injected as getters (the live values are mutable boot-time globals in
// index.js) plus an emit callback, so the whole contract is unit-testable.

const MAX_QUERY_CHARS = 512
const MAX_SEARCH_LIMIT = 100

function normalizeSearchRequest (data = {}) {
  const query = String(data.query || '').normalize('NFKC').trim().slice(0, MAX_QUERY_CHARS)
  const rawLimit = Number(data.limit == null ? 50 : data.limit)
  const limit = Number.isFinite(rawLimit)
    ? Math.max(0, Math.min(MAX_SEARCH_LIMIT, Math.floor(rawLimit)))
    : 50
  return { query, limit }
}

function createSearchHandler ({ getPersonalIndex, getQueryPlanner, emit, onError, now } = {}) {
  const clock = typeof now === 'function' ? now : () => Date.now()
  const fail = typeof onError === 'function'
    ? onError
    : (e) => console.error('[search] federation failed:', e && e.message)
  let queryId = 0

  return async function handleSearch (data) {
    const personalIndex = getPersonalIndex()
    const { query, limit } = normalizeSearchRequest(data)
    const now0 = clock()
    const id = ++queryId

    if (!personalIndex) {
      return { results: [], stats: { docs: 0 }, phase: 'first-paint', federating: false, queryId: id }
    }

    const results = await personalIndex.search(query, { now0, limit })
    const queryPlanner = getQueryPlanner()
    const federating = !!(data && data.federated) && !!queryPlanner

    if (federating) {
      const emitFederated = (fed, phase) => {
        if (id !== queryId) return // superseded by a newer query — drop the stale event
        if (typeof emit !== 'function') return
        emit({
          queryId: id,
          results: (fed && fed.results) || [],
          phase: (fed && fed.phase) || phase,
          verifyBudgetExhausted: !!(fed && fed.verifyBudgetExhausted),
          digestHit: !!(fed && fed.digestHit),
          fallbackPull: !!(fed && fed.fallbackPull),
          partial: !!(fed && fed.partial),
          provenance: (fed && fed.provenance) || null,
          peerFetchStats: Array.isArray(fed && fed.peerFetchStats) ? fed.peerFetchStats : []
        })
      }
      // fire-and-forget; never blocks the synchronous first-paint reply
      Promise.resolve(queryPlanner.planAndSearch(query, { now0, limit, onPeerBatch: (batch) => emitFederated(batch, 'batch') }))
        .then((fed) => emitFederated(fed, 'enriched'))
        .catch(fail)
    }

    return { results, stats: await personalIndex.stats(), phase: 'first-paint', federating, queryId: id }
  }
}

module.exports = { createSearchHandler, normalizeSearchRequest, MAX_QUERY_CHARS, MAX_SEARCH_LIMIT }
