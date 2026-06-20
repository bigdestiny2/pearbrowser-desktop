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
const ib = require('./identity-binding.cjs')
const Hyperbee = require('hyperbee')
const b4a = require('b4a')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const JOIN_WINDOW_MS = 60_000
// per-peer cap on how long we wait for a replicated index to sync before
// scanning it, so a dead/slow peer can't stall the federated query.
const PEER_FETCH_TIMEOUT_MS = 4000
// per-app signing domain for search postings (mirrors the PersonalIndex sign
// hook + identity-binding-publisher.signDocSync).
const DOC_NAMESPACE = 'lighthouse-doc-v2'
// hard cap on per-doc signature verifications per query: a per-row verify of a
// hostile peer's whole shard (~200k sigs ≈ 8s) is a DoS; 256 keeps the verify
// pass interactive while covering the visible window.
const MAX_VERIFIES_PER_WINDOW = 256

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
  constructor ({ personalIndex, contacts, identity, swarm, store, budget, bindingPublisher, log } = {}) {
    if (!identity) throw new Error('QueryPlanner requires identity')
    this.personalIndex = personalIndex || null
    this.contacts = contacts || null
    this.identity = identity
    this.swarm = swarm || null
    this.store = store || null
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

  // Verify one peer's matched docs against the peer's RESOLVED search key,
  // turning survivors into ranking candidates. Per-doc-lazy + bounded: stop at
  // the shared per-query verify budget; drop a peer after a single bad signature
  // (junk/forging-peer DoS bound); an unresolvable peer is dropped without
  // spending a verify. `hits`: [{ tf, rec }] where rec is the peer's d! record.
  _verifyPeerHits (peerRoot, searchPubkey, hits, ctx) {
    if (!searchPubkey) return []
    const out = []
    for (const { tf, rec } of (hits || [])) {
      if (ctx.verifies >= MAX_VERIFIES_PER_WINDOW) { ctx.exhausted = true; break }
      ctx.verifies++
      if (!rec || !ib.verifyAppSig('search', sc.canonDocBytes(rec), rec.sig, searchPubkey, DOC_NAMESPACE)) break
      out.push({
        docId: rec.docId, driveKey: rec.driveKey, path: rec.path, title: rec.title,
        tf: tf || 1, publishedAt: rec.publishedAt || 0, contentHash: rec.h || '', signerPubkey: searchPubkey,
      })
    }
    return out
  }

  // Turn fetched + key-resolved peer data into verified mergeFederated sources,
  // sharing ONE verify budget across all peers this query.
  // peerData: [{ rootPubkey, searchPubkey, hits }].
  _verifyPeerSources (peerData) {
    const ctx = { verifies: 0, exhausted: false }
    const sources = []
    for (const peer of (peerData || [])) {
      if (!peer || !peer.rootPubkey) continue
      const candidates = this._verifyPeerHits(peer.rootPubkey, peer.searchPubkey, peer.hits, ctx)
      if (candidates.length) sources.push({ rootPubkey: peer.rootPubkey, candidates })
      if (ctx.exhausted) break
    }
    this._verifyBudgetExhausted = ctx.exhausted
    return sources
  }

  // Live peer fetch (Step 5c): for each frontier peer, resolve their binding
  // (search key + index core key) from the DHT via their contact bindingKey,
  // replicate their index core over the shared swarm, and scan it for query
  // hits. Best-effort + fully graceful — a peer with no binding key, a failed
  // resolve, or a sync timeout is skipped, so search degrades to local/partial.
  // Returns [{ rootPubkey, searchPubkey, hits }] for the RowVerifier.
  async _fetchPeerHits (peerRoots, query) {
    if (!this.store || !this.swarm || !this.bindingPublisher || !this.contacts) return []
    const out = []
    for (const peerRoot of (peerRoots || [])) {
      if (!this.budget.canConnect()) break
      try {
        const contact = await this.contacts.lookup(peerRoot).catch(() => null)
        if (!contact || !contact.bindingKey) continue
        const resolved = await this.bindingPublisher.resolve({ contactPubkey: peerRoot, dhtPubkey: contact.bindingKey })
        if (!resolved || !resolved.searchPubkey || !resolved.indexKey) continue
        const core = this.store.get({ key: b4a.from(resolved.indexKey, 'hex') })
        await core.ready()
        try { this.swarm.join(core.discoveryKey, { server: false, client: true }) } catch (_) { /* already joined */ }
        this.budget.noteConnect(); this.budget.touch(peerRoot, core)
        // bounded best-effort sync, then scan whatever blocks we have
        await Promise.race([core.update({ wait: true }), sleep(PEER_FETCH_TIMEOUT_MS)]).catch(() => {})
        const bee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' })
        await bee.ready()
        const hits = await sc.searchSignedHits(bee, query)
        if (hits.length) out.push({ rootPubkey: peerRoot, searchPubkey: resolved.searchPubkey, hits })
      } catch (err) {
        this.log('[search] peer fetch skipped ' + String(peerRoot).slice(0, 8) + ': ' + (err && err.message))
      }
    }
    return out
  }

  // Federated query: hop-0 self candidates + trusted-peer candidates, deduped
  // (best-trust-wins) and ranked together exactly once. Returns the enriched set;
  // the synchronous local-first reply lives in the CMD_SEARCH handler (Step 4).
  async planAndSearch (query, { now0 = 0, limit = 50 } = {}) {
    if (!this.personalIndex) return { results: [], verifyBudgetExhausted: false, phase: 'enriched' }
    const { selfRoot, contactRoots, graph } = await this._trustSnapshot()

    const selfCandidates = await sc.searchCandidates(this.personalIndex.bee, query, { tier: 'self', trustHop: 0 })

    // plan the peer fan-out (frontier + budget), then replicate + verify peers
    const queryTerms = sc.tokenize(query).map((t) => t.term)
    const frontier = fr.buildFrontier(contactRoots, graph, { digests: this._digestCache, warm: this.budget.warmRoots() })
    this.budget.beginQuery()
    const plan = fr.planFanout(frontier, queryTerms, this.budget.toBudgetArg())
    // v1: peer digests aren't replicated yet, so the digest-first plan.pull is
    // empty — fetch the frontier directly, still bounded by the connection
    // budget. Digest-first gating activates once digests are wired.
    const fetchRoots = (plan.pull.length ? plan.pull : frontier).map((f) => f.rootPubkey)
    const peerData = await this._fetchPeerHits(fetchRoots, query)
    const peerSources = this._verifyPeerSources(peerData)

    const sources = [{ rootPubkey: selfRoot, candidates: selfCandidates }, ...peerSources]
    const results = sf.mergeFederated(sources, graph, { now0, limit })
    return { results, verifyBudgetExhausted: this._verifyBudgetExhausted, phase: 'enriched' }
  }
}

module.exports = { QueryPlanner, SearchFanoutBudget }
