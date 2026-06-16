// Autobase-backed collaborative catalog manager (EXPERIMENTAL — feature
// flagged, off by default). CommonJS (.cjs) so Bare can require() it and Node
// can default-import it for the smoke test. Models the proven in-app Autobase
// usage in backend/pear-bridge.js (Sync Groups).
//
// Architecture: Autobase provides a replicated, linearized OP LOG; the view
// Hyperbee records each op in apply-order under `op!<index>`; the materialized
// catalog is produced by the PURE, unit-tested reducer (autobee-catalog-apply).
// Autobase owns ordering + replication, PearBrowser owns conflict semantics —
// they can't drift. No wall-clock anywhere.

const Autobase = require('autobase')
const Hyperbee = require('hyperbee')
const {
  upsertOp, removeOp, renameOp, addWriterOp, validateOp, OP_ADD_WRITER
} = require('./autobee-catalog-ops.cjs')
const { applyView, toCatalogData } = require('./autobee-catalog-apply.cjs')

class AutobeeCatalogManager {
  constructor (store, opts = {}) {
    this.store = store
    // Accept bootstrap as a hex string or Buffer (or null for a new catalog).
    const b = opts.bootstrap || null
    this.bootstrap = typeof b === 'string' ? Buffer.from(b, 'hex') : b
    this._ns = opts.namespace ||
      (this.bootstrap ? Buffer.from(this.bootstrap).toString('hex') : 'local')
    this.base = null
  }

  async ready () {
    const ns = this._ns
    this.base = new Autobase(this.store, this.bootstrap, {
      valueEncoding: 'json',
      open: (store) => new Hyperbee(store.get({ name: `autobee-catalog-${ns}-view` }), {
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
    })
    await this.base.ready()
    return this
  }

  get writable () { return !!(this.base && this.base.writable) }
  get key () { return this.base && this.base.key ? Buffer.from(this.base.key).toString('hex') : '' }
  get discoveryKey () { return this.base && this.base.discoveryKey ? Buffer.from(this.base.discoveryKey) : null }
  get localKey () { return this.base && this.base.local && this.base.local.key ? Buffer.from(this.base.local.key).toString('hex') : '' }

  async rename (name) { await this.base.append(renameOp(name)) }
  async upsertApp (app) { await this.base.append(upsertOp(app)) }
  async removeApp (id) { await this.base.append(removeOp(id)) }
  async addWriter (localKeyHex) { await this.base.append(addWriterOp(localKeyHex)) }

  async update () { await this.base.update() }

  // Materialize the catalog DTO from the linearized op log via the pure
  // reducer — the single source of truth for conflict resolution.
  async catalog () {
    await this.base.update()
    const view = this.base.view
    const ops = []
    for await (const entry of view.createReadStream({ gte: 'op!', lt: 'op!~' })) {
      ops.push(entry.value)
    }
    return toCatalogData(applyView(ops), this.key, this.writable)
  }

  async close () { try { if (this.base) await this.base.close() } catch {} }
}

module.exports = { AutobeeCatalogManager }
