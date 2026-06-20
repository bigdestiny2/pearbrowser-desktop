// QueryPlanner — Lighthouse federated-search orchestration. Wires the dormant
// PURE Phase 1–5 modules (search-federation / search-frontier / search-core)
// into one query that pulls hop-0 self results then trusted-peer results, ranked
// together. The pure modules stay untouched; this module owns the live state
// (the connection budget) and — in Step 5 — the peer I/O + per-doc verify.
//
// CommonJS, deps injected → Node-testable with a real Corestore-backed
// PersonalIndex and stubbed identity/contacts (no live swarm needed for the
// local-only path).

const sf = require('./search-federation.cjs')
const fr = require('./search-frontier.cjs')
const sc = require('./search-core.cjs')
const b4a = require('b4a')

const JOIN_WINDOW_MS = 60_000

// Live connection budget for first-party search fan-out. Wraps search-frontier's
// PURE DEFAULT_BUDGET (maxFrontier/maxConnectsPerQuery/maxLiveSessions) with the
// mutable state the pure planner can't hold: a warm-session LRU, a rolling
// per-minute join-rate window, and a per-query cold-connect counter. It joins
// the SHARED swarm directly (like CatalogManager/SiteManager), NOT through the
// per-page SwarmBridge firewall — search is first-party backend infra.
class SearchFanoutBudget {
  constructor (opts = {}) {
    const { now, ...overrides } = opts
    Object.assign(this, fr.DEFAULT_BUDGET, { maxNewJoinsPerMinute: 30 }, overrides)
    this._now = typeof now === 'function' ? now : () => Date.now()
    this.sessions = new Map() // rootPubkey -> { core, lastUsed } (LRU by insertion order)
    this._joinTimestamps = []
    this._queryConnects = 0
  }

  beginQuery () { this._queryConnects = 0 }

  _joinsInWindow () {
    const cutoff = this._now() - JOIN_WINDOW_MS
    this._joinTimestamps = this._joinTimestamps.filter((t) => t >= cutoff)
    return this._joinTimestamps.length
  }

  canConnect () {
    return this._queryConnects < this.maxConnectsPerQuery &&
      this.sessions.size < this.maxLiveSessions &&
      this._joinsInWindow() < this.maxNewJoinsPerMinute
  }

  noteConnect () { this._queryConnects++; this._joinTimestamps.push(this._now()) }

  warmRoots () { return new Set(this.sessions.keys()) }

  // LRU insert/refresh. Evicts (and closes) the least-recently-used session when
  // the live ceiling is hit. Map iteration order = insertion order, so the first
  // key is the oldest; re-touching deletes+reinserts to move it to the tail.
  touch (root, core) {
    if (this.sessions.has(root)) {
      this.sessions.delete(root)
    } else if (this.sessions.size >= this.maxLiveSessions) {
      const oldest = this.sessions.keys().next().value
      const ev = this.sessions.get(oldest)
      this.sessions.delete(oldest)
      if (ev && ev.core && typeof ev.core.close === 'function') { try { ev.core.close() } catch {} }
    }
    this.sessions.set(root, { core, lastUsed: this._now() })
  }

  // The arg handed to the PURE fr.planFanout — remaining cold-connect slots this
  // query, so the pure planner never plans more connects than the budget allows.
  toBudgetArg () {
    return {
      maxFrontier: this.maxFrontier,
      maxConnectsPerQuery: Math.max(0, this.maxConnectsPerQuery - this._queryConnects),
      maxLiveSessions: this.maxLiveSessions,
    }
  }
}

class QueryPlanner {
  constructor ({ personalIndex, contacts, identity, swarm, budget, bindingPublisher, log } = {}) {
    if (!identity) throw new Error('QueryPlanner requires identity')
    this.personalIndex = personalIndex || null
    this.contacts = contacts || null
    this.identity = identity
    this.swarm = swarm || null
    this.budget = budget || new SearchFanoutBudget()
    this.bindingPublisher = bindingPublisher || null
    this.log = typeof log === 'function' ? log : () => {}
    this._digestCache = new Map() // rootPubkey -> peer digest (populated in Step 5)
    this._verifyBudgetExhausted = false
  }

  // Freeze the trust graph for this query: self at hop 0, direct contacts at
  // hop 1 ('followed'), everyone else 'default'. v1 derives follow edges from the
  // flat Contacts set; TRUST-room edges (sf.trustRowsToEdges) land with Tiers 1/2.
  async _trustSnapshot () {
    const selfRoot = b4a.toString(this.identity.getSigningKeypair().publicKey, 'hex')
    const contactsList = this.contacts ? await this.contacts.list({ limit: 1000 }).catch(() => []) : []
    const contactRoots = []
    for (const c of contactsList || []) { if (c && c.pubkey) contactRoots.push(c.pubkey) }
    const edges = contactRoots.map((to) => ({ from: selfRoot, to }))
    const graph = sf.buildTrustGraph(selfRoot, edges, { maxFollowHops: 2 })
    return { selfRoot, contactRoots, graph }
  }

  // Peer replication + per-doc-lazy verify land in Step 5. Until then this is a
  // clean no-op: the frontier + budget are still planned (and unit-tested), but
  // no network I/O happens, so a query degrades to local-only results.
  async _fetchPeerSources (plan /*, query, ctx */) {
    this._verifyBudgetExhausted = false
    void plan
    return []
  }

  // Federated query: hop-0 self candidates + trusted-peer candidates, deduped
  // (best-trust-wins) and ranked together exactly once. Returns the enriched set;
  // the synchronous local-first reply lives in the CMD_SEARCH handler (Step 4).
  async planAndSearch (query, { now0 = 0, limit = 50 } = {}) {
    if (!this.personalIndex) return { results: [], verifyBudgetExhausted: false, phase: 'enriched' }
    const { selfRoot, contactRoots, graph } = await this._trustSnapshot()

    const selfCandidates = await sc.searchCandidates(this.personalIndex.bee, query, { tier: 'self', trustHop: 0 })

    // plan the peer fan-out (frontier + budget). v1 performs no peer I/O.
    const queryTerms = sc.tokenize(query).map((t) => t.term)
    const frontier = fr.buildFrontier(contactRoots, graph, { digests: this._digestCache, warm: this.budget.warmRoots() })
    this.budget.beginQuery()
    const plan = fr.planFanout(frontier, queryTerms, this.budget.toBudgetArg())
    const peerSources = await this._fetchPeerSources(plan, query, { now0, limit, graph })

    const sources = [{ rootPubkey: selfRoot, candidates: selfCandidates }, ...peerSources]
    const results = sf.mergeFederated(sources, graph, { now0, limit })
    return { results, verifyBudgetExhausted: this._verifyBudgetExhausted, phase: 'enriched' }
  }
}

module.exports = { QueryPlanner, SearchFanoutBudget }
