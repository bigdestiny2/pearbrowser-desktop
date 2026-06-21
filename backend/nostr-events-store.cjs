// NOSTR1 — a personal Nostr event store: an ENCRYPTED Autobase op-log of signed
// events, materialized through the verifying reducer so only valid, deduped
// events survive. Built on the durability-proven encrypted-autobase-helper
// (SPIKE-AUTOBEE-DURABILITY), so it syncs across the user's own devices and a
// blind relay can pin it. CommonJS — Bare requires it, Node tests it.

const { createEncryptedAutobaseManager } = require('./encrypted-autobase-helper.cjs')
const { addEventOp, OP_ADD_EVENT } = require('./nostr-events-ops.cjs')
const { verifyEvent } = require('./nostr-events-apply.cjs')

class NostrEventStore {
  constructor (store, opts = {}) {
    // apply verifies the event (three-way verdict) and dedups by id; invalid or
    // duplicate events never reach the materialized view.
    const applyOp = async (op, view) => {
      if (!op || op.type !== OP_ADD_EVENT) return
      const ev = op.event
      if (!ev || !verifyEvent(ev).ok) return
      const existing = await view.get('ev!' + ev.id).catch(() => null)
      if (existing) return
      await view.put('ev!' + ev.id, ev)
    }
    this.mgr = createEncryptedAutobaseManager(store, { ...opts, applyOp, viewName: 'nostr-events' })
  }

  async ready () { await this.mgr.ready(); return this }
  get key () { return this.mgr.key }
  get writable () { return this.mgr.writable }
  get localKey () { return this.mgr.localKey }
  get discoveryKey () { return this.mgr.discoveryKey }

  async addEvent (event) { await this.mgr.append(addEventOp(event)) }
  async addWriter (writerKeyHex) { await this.mgr.addWriter(writerKeyHex) }
  async update () { await this.mgr.update() }

  async listEvents () {
    await this.mgr.update()
    const out = []
    for await (const e of this.mgr.view.createReadStream({ gte: 'ev!', lt: 'ev!~' })) out.push(e.value)
    return out
  }

  async close () { await this.mgr.close() }
}

module.exports = { NostrEventStore }
