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
  addBookmarkOp, removeBookmarkOp, addWriterOp, validateOp, OP_ADD_WRITER
} = require('./browser-state-ops.cjs')
const { applyView, toStateData } = require('./browser-state-apply.cjs')

function toBuf (v) {
  if (v == null) return null
  return typeof v === 'string' ? Buffer.from(v, 'hex') : v
}

class BrowserStateSync {
  constructor (store, opts = {}) {
    this.store = store
    this.bootstrap = toBuf(opts.bootstrap)
    this.encryptionKey = toBuf(opts.encryptionKey)
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
          await view.put('op!' + String(count).padStart(12, '0'), op)
          count++
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
    // root alive. The namespace MUST be a FIXED string (there is exactly ONE sync
    // base per store), NOT keyed by `_ns`: the CMD_SYNC_CREATE mint runs with
    // bootstrap=null and reopen-by-key runs with `_ns`=key, so an `_ns`-keyed
    // substore would split mint and reopen apart. A fixed substore keeps the mint's
    // writer core where reopen-by-key looks (mirrors N5's ensureNameRegistry).
    const baseStore = typeof this.store.namespace === 'function'
      ? this.store.namespace('bss-browser-state') : this.store
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
  async addWriter (writerKeyHex) { await this.base.append(addWriterOp(writerKeyHex)) }
  async update () { await this.base.update() }

  // Materialize the bookmark set from the linearized op log via the pure
  // reducer — the single source of truth for conflict resolution.
  async state () {
    await this.base.update()
    const view = this.base.view
    const ops = []
    for await (const entry of view.createReadStream({ gte: 'op!', lt: 'op!~' })) {
      ops.push(entry.value)
    }
    const data = toStateData(applyView(ops))
    return { ...data, writable: this.writable, key: this.key, writerKey: this.localKey }
  }

  async close () { try { if (this.base) await this.base.close() } catch {} }
}

module.exports = { BrowserStateSync }
