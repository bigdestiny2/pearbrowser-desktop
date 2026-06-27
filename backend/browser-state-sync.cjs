// Encrypted multi-device browser-state sync manager (EXPERIMENTAL, Rollout
// Phase 4). An Autobase op-log of the user's OWN bookmark edits, ENCRYPTED so
// only the user's paired devices (which hold the encryption key) can read it.
// CommonJS so Bare can require() it and Node can default-import it for the
// smoke. Same op-log architecture as autobee-catalog-manager: Autobase owns
// ordering + replication; the PURE reducer (browser-state-apply) materializes
// the bookmark set. No wall-clock.
//
// Pairing model (your own devices): one device creates the sync base and gets
// an invite = { key (bootstrap), encryptionKey, writerKey }. Another device
// opens with the same key + encryptionKey, hands over ITS writerKey, and the
// first device addWriter()s it. Encryption key + writer invite are sensitive
// capabilities — they ARE the keys to your synced data.

const Autobase = require('autobase')
const Hyperbee = require('hyperbee')
const {
  addBookmarkOp, removeBookmarkOp, putSessionOp, putHistoryOp, putContactsOp, putAppGrantsOp, putSettingsOp, putProfileOp, compactStateOp, addWriterOp, validateOp, syncStorageAudit, syncRetentionAudit, OP_ADD_WRITER, OP_COMPACT
} = require('./browser-state-ops.cjs')
const { applyView, toStateData } = require('./browser-state-apply.cjs')

const DEFAULT_STORAGE_NAME = 'bss-browser-state'
const STORAGE_NAME_RE = /^bss-browser-state(?:-[0-9a-f]{16})?$/i

function toBuf (v) {
  if (v == null) return null
  return typeof v === 'string' ? Buffer.from(v, 'hex') : v
}

function normalizeStorageName (value) {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return STORAGE_NAME_RE.test(s) ? s : DEFAULT_STORAGE_NAME
}

function opKey (index) {
  return 'op!' + String(index).padStart(12, '0')
}

function opIndexFromKey (key) {
  const n = Number.parseInt(String(key || '').slice(3), 10)
  return Number.isFinite(n) ? n : null
}

async function pruneViewOpsBefore (view, beforeIndex) {
  if (!Number.isFinite(beforeIndex) || beforeIndex <= 0) return 0
  const keys = []
  for await (const entry of view.createReadStream({ gte: 'op!', lt: opKey(beforeIndex) })) {
    keys.push(entry.key)
  }
  for (const key of keys) await view.del(key)
  return keys.length
}

class BrowserStateSync {
  constructor (store, opts = {}) {
    this.store = store
    this.bootstrap = toBuf(opts.bootstrap)
    this.encryptionKey = toBuf(opts.encryptionKey)
    this.storageName = normalizeStorageName(opts.storageName)
    this._ns = opts.namespace ||
      (this.bootstrap ? Buffer.from(this.bootstrap).toString('hex') : 'local')
    this.base = null
  }

  async ready () {
    const ns = this._ns
    const handlers = {
      valueEncoding: 'json',
      open: (store) => new Hyperbee(store.get({ name: `browser-state-${ns}-view` }), {
        extension: false, keyEncoding: 'utf-8', valueEncoding: 'json'
      }),
      apply: async (nodes, view, host) => {
        const head = await view.get('meta!count').catch(() => null)
        let count = head && Number.isFinite(head.value) ? head.value : 0
        for (const node of nodes) {
          const op = node.value
          if (op && op.type === OP_ADD_WRITER && /^[0-9a-f]{64}$/i.test(op.key || '')) {
            await host.addWriter(Buffer.from(op.key, 'hex'), { indexer: true })
            continue
          }
          const verdict = validateOp(op)
          if (!verdict.ok && !verdict.retain) continue
          await view.put(opKey(count), op)
          count++
          if (op && op.type === OP_COMPACT) {
            const checkpointIndex = count - 1
            await pruneViewOpsBefore(view, checkpointIndex)
            await view.put('meta!compactedBefore', checkpointIndex)
          }
        }
        await view.put('meta!count', count)
      }
    }
    if (this.encryptionKey) handlers.encryptionKey = this.encryptionKey
    // CRITICAL: give the Autobase its OWN namespaced substore rather than the raw
    // store. base.close() runs store.close(); on the shared ROOT Corestore that
    // tears down Hyperdrive/UserData/Names/replication for the WHOLE app (a single
    // consumer's close kills everything — verified by the shared-store regression
    // test). A namespace session's close() frees only its own cores, leaving the
    // root alive. `storageName` must stay stable for a given sync group: the
    // CMD_SYNC_CREATE mint runs with bootstrap=null and reopen-by-key runs with
    // `_ns`=key, so keying the substore by `_ns` would split mint and reopen apart.
    // The default fixed name preserves existing installs; rotations use a fresh
    // local storageName so a new encrypted group can coexist with the old one.
    const baseStore = typeof this.store.namespace === 'function'
      ? this.store.namespace(this.storageName) : this.store
    this.base = new Autobase(baseStore, this.bootstrap, handlers)
    await this.base.ready()
    return this
  }

  get writable () { return !!(this.base && this.base.writable) }
  get key () { return this.base && this.base.key ? Buffer.from(this.base.key).toString('hex') : '' }
  get discoveryKey () { return this.base && this.base.discoveryKey ? Buffer.from(this.base.discoveryKey) : null }
  get localKey () { return this.base && this.base.local && this.base.local.key ? Buffer.from(this.base.local.key).toString('hex') : '' }

  async addBookmark (bm) { await this.base.append(addBookmarkOp(bm)) }
  async removeBookmark (url) { await this.base.append(removeBookmarkOp(url)) }
  async putSession (session) { await this.base.append(putSessionOp(session)) }
  async putHistory (history) { await this.base.append(putHistoryOp(history)) }
  async putContacts (contacts) { await this.base.append(putContactsOp(contacts)) }
  async putAppGrants (grants) { await this.base.append(putAppGrantsOp(grants)) }
  async putSettings (settings) { await this.base.append(putSettingsOp(settings)) }
  async putProfile (profile) { await this.base.append(putProfileOp(profile)) }
  async addWriter (writerKeyHex) { await this.base.append(addWriterOp(writerKeyHex)) }
  async update () { await this.base.update() }
  async compact () {
    if (!this.writable) throw new Error('This device is read-only.')
    const current = await this.state()
    const op = compactStateOp(current)
    const verdict = validateOp(op)
    if (!verdict.ok) throw new Error(`Cannot compact sync state: ${verdict.reason || 'invalid snapshot'}`)
    await this.base.append(op)
    await this.base.update()
    return await this.state()
  }

  // Materialize the bookmark set from the linearized op log via the pure
  // reducer — the single source of truth for conflict resolution.
  async state () {
    await this.base.update()
    const view = this.base.view
    const ops = []
    let retainedOps = 0
    let lastCompactIndex = null
    for await (const entry of view.createReadStream({ gte: 'op!', lt: 'op!~' })) {
      retainedOps++
      if (entry.value && entry.value.type === OP_COMPACT) lastCompactIndex = opIndexFromKey(entry.key)
      ops.push(entry.value)
    }
    const data = toStateData(applyView(ops))
    const countNode = await view.get('meta!count').catch(() => null)
    const compactedNode = await view.get('meta!compactedBefore').catch(() => null)
    const retentionAudit = syncRetentionAudit({
      totalOps: countNode && Number.isFinite(countNode.value) ? countNode.value : retainedOps,
      retainedOps,
      compactedBefore: compactedNode && Number.isFinite(compactedNode.value) ? compactedNode.value : 0,
      lastCompactIndex
    })
    return { ...data, storageAudit: syncStorageAudit(data), retentionAudit, writable: this.writable, key: this.key, writerKey: this.localKey }
  }

  async close () { try { if (this.base) await this.base.close() } catch {} }
}

module.exports = { BrowserStateSync, DEFAULT_STORAGE_NAME, normalizeStorageName }
