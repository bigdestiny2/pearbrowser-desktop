// Autobase-backed collaborative catalog manager (EXPERIMENTAL — Rollout
// Phase 1, docs/AUTOBEE-RESEARCH.md). Feature-flagged, no UI, not wired into
// the Bare backend. autobase/hyperbee are loaded lazily so importing this
// module is safe where the experiment is disabled.
//
// Architecture (honors "view must be deterministic, derived only from
// store + nodes"): Autobase provides a replicated, linearized OP LOG; the
// view Hyperbee simply records each op in apply-order under `op!<index>`.
// The materialized catalog is produced by the PURE, unit-tested reducer
// (autobee-catalog-apply.js). So Autobase owns ordering + replication, and
// PearBrowser owns the conflict semantics — and they can't drift, because
// catalog() rebuilds from the same applyView() the tests cover.

import {
  upsertOp, removeOp, renameOp, addWriterOp, validateOp, OP_ADD_WRITER
} from './autobee-catalog-ops.js'
import { applyView, toCatalogData } from './autobee-catalog-apply.js'

async function load (name) {
  const mod = await import(name)
  return mod.default || mod
}

export class AutobeeCatalogManager {
  constructor (store, { bootstrap = null } = {}) {
    this.store = store
    this.bootstrap = bootstrap
    this.base = null
  }

  async ready () {
    const Autobase = await load('autobase')
    const Hyperbee = await load('hyperbee')

    this.base = new Autobase(this.store, this.bootstrap, {
      valueEncoding: 'json',
      open: (store) => new Hyperbee(store.get('catalog'), {
        extension: false, keyEncoding: 'utf-8', valueEncoding: 'json'
      }),
      apply: async (nodes, view, host) => {
        const head = await view.get('meta!count').catch(() => null)
        let count = head && Number.isFinite(head.value) ? head.value : 0
        for (const node of nodes) {
          const op = node.value
          // Writer management — never enters the catalog view.
          if (op && op.type === OP_ADD_WRITER && /^[0-9a-f]{64}$/i.test(op.key || '')) {
            await host.addWriter(Buffer.from(op.key, 'hex'), { indexer: true })
            continue
          }
          // Defense in depth: drop ops that should never have been appended.
          // (unknown-version/unknown-type carry retain:true and ARE logged so
          // newer clients can interpret them — matches the schema rules.)
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
