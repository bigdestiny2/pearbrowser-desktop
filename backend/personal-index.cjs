// PersonalIndex — Phase 0 self-search store. A per-user Hyperbee of signed
// search records (backend/search-core.cjs schema) over the app's Corestore,
// mirroring the Contacts/UserData core pattern. Indexes pages the user browses
// / bookmarks; queried fully locally (zero network, sub-5ms — see
// docs/research/bench-results-personal-index.md). LRU-capped by doc count.
//
// CommonJS so Bare requires it and Node tests it. The `sign` hook is injected
// (identity.signForApp in the app; omitted/stubbed in tests) — at hop-0 you
// trust your own subkey, so the per-doc signature is recorded for forward-
// compatibility with the networked phases but not verified locally.

const Hyperbee = require('hyperbee')
const sc = require('./search-core.cjs')

const DEFAULT_NAME = 'pearbrowser-searchindex-v1'
const DEFAULT_MAX_DOCS = 20000
const padSeq = (n) => String(n).padStart(16, '0')
const orderKey = (seq) => 'o!' + padSeq(seq)

class PersonalIndex {
  constructor (store, opts = {}) {
    this.store = store
    this.name = opts.name || DEFAULT_NAME
    this.sign = typeof opts.sign === 'function' ? opts.sign : null
    this.maxDocs = opts.maxDocs || DEFAULT_MAX_DOCS
    this.bee = null
  }

  async ready () {
    this.bee = new Hyperbee(this.store.get({ name: this.name }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await this.bee.ready()
    return this
  }

  async _meta (key, dflt) {
    const e = await this.bee.get('meta!' + key).catch(() => null)
    return e && e.value != null ? e.value : dflt
  }

  // Index (or re-index) one document. Re-indexing the same (driveKey,path)
  // refreshes its recency and replaces stale postings. Returns the docId, or
  // null if the page had no indexable terms.
  async indexDoc (doc) {
    const { records, docId, terms } = sc.buildDocRecords(doc, this.sign)
    if (!terms.length) return null

    const existing = await this.bee.get(sc.docKey(docId)).catch(() => null)
    if (existing && existing.value) await this._removeByRecord(docId, existing.value)

    const seq = (await this._meta('seq', 0)) + 1
    const count = await this._meta('count', 0)
    const dk = sc.docKey(docId)
    const batch = this.bee.batch()
    for (const [k, v] of records) {
      // stamp the doc record with its order seq for O(1) eviction
      await batch.put(k, k === dk ? { ...v, seq } : v)
    }
    await batch.put(orderKey(seq), docId)
    await batch.put('meta!seq', seq)
    await batch.put('meta!count', count + 1)
    await batch.flush()

    await this._evictIfNeeded()
    return docId
  }

  async _removeByRecord (docId, drec) {
    const batch = this.bee.batch()
    for (const { term, tf } of (drec.terms || [])) await batch.del(sc.postingKey(term, tf, docId))
    await batch.del(sc.docKey(docId))
    if (drec.seq != null) await batch.del(orderKey(drec.seq))
    const count = await this._meta('count', 0)
    await batch.put('meta!count', Math.max(0, count - 1))
    await batch.flush()
  }

  async removeDoc (docId) {
    const e = await this.bee.get(sc.docKey(docId)).catch(() => null)
    if (!e || !e.value) return false
    await this._removeByRecord(docId, e.value)
    return true
  }

  // Evict the least-recently-indexed docs until under the doc cap.
  async _evictIfNeeded () {
    let count = await this._meta('count', 0)
    let guard = 0
    while (count > this.maxDocs && guard++ < this.maxDocs + 16) {
      let oldest = null
      for await (const entry of this.bee.createReadStream({ gte: 'o!', lt: 'o!~', limit: 1 })) oldest = entry
      if (!oldest) break
      await this.removeDoc(oldest.value)
      count = await this._meta('count', 0)
    }
  }

  // Query the index. `now0` (ms) is the single query-time stamp threaded into
  // the deterministic ranker; pass Date.now() from the caller (never read
  // inside the ranking fold).
  async search (query, opts = {}) {
    return sc.searchIndex(this.bee, query, { tier: 'self', trustHop: 0, ...opts })
  }

  async stats () {
    return { docs: await this._meta('count', 0), name: this.name }
  }

  async close () { try { if (this.bee) await this.bee.close() } catch {} }
}

module.exports = { PersonalIndex }
