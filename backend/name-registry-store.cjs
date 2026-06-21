// N5 — the multi-writer name registry store: an Autobase op-log of owner-signed
// name ops, materialized through the deterministic reducer (name-registry-apply
// decide) so the same first-claim/revoke/rotate/homograph policy the pure tests
// pin also governs the live, replicated view. Built on the durability-proven
// encrypted-autobase-helper (SPIKE-AUTOBEE-DURABILITY GREEN), so a claim survives
// all writers going offline (re-served from a blind relay). writer.add is the
// helper's reserved ADD_WRITER op. CommonJS — Bare requires it, Node tests it.

const { createEncryptedAutobaseManager } = require('./encrypted-autobase-helper.cjs')
const { normalize } = require('./name-normalize.cjs')
const ops = require('./name-registry-ops.cjs')
const { verifyOpAuthenticity, decide } = require('./name-registry-apply.cjs')

class NameRegistry {
  constructor (store, opts = {}) {
    // The reducer: verify the op, read the current name entry + the entry that
    // owns this op's skeleton, run the SAME pure `decide` as applyView, then write.
    const applyOp = async (op, view) => {
      const auth = verifyOpAuthenticity(op)
      if (!auth) return
      const { normalized, skeleton: sk } = auth
      const curRec = await view.get('name!' + normalized).catch(() => null)
      const current = curRec ? curRec.value : null
      let skelOwner = null
      const skelRec = await view.get('skel!' + sk).catch(() => null)
      if (skelRec && skelRec.value && skelRec.value !== normalized) {
        const so = await view.get('name!' + skelRec.value).catch(() => null)
        skelOwner = so ? so.value : null
      }
      const d = decide({ current, skelOwner, normalized, skeleton: sk }, op)
      if (!d.write) return
      await view.put('name!' + normalized, d.write)
      if (d.skelSet) await view.put('skel!' + sk, normalized)
      if (d.skelDel) {
        const s = await view.get('skel!' + sk).catch(() => null)
        if (s && s.value === normalized) await view.del('skel!' + sk)
      }
    }
    this.mgr = createEncryptedAutobaseManager(store, { ...opts, applyOp, viewName: 'name-registry' })
  }

  async ready () { await this.mgr.ready(); return this }
  get key () { return this.mgr.key }
  get writable () { return this.mgr.writable }
  get localKey () { return this.mgr.localKey }

  // Append a pre-signed op (built with the name-registry-ops builders + the
  // owner's signer). The store never holds a key — signing stays with the caller.
  async append (op) { await this.mgr.append(op) }
  async addWriter (writerKeyHex) { await this.mgr.addWriter(writerKeyHex) }
  async update () { await this.mgr.update() }

  // Convenience signers: build + append in one call. ownerSign(msg) -> ed25519 hex.
  async claim ({ name, target, owner }, ownerSign) { await this.append(ops.claimOp({ name, target, owner }, ownerSign)) }
  async rotate ({ name, target, owner, version }, ownerSign) { await this.append(ops.rotateOp({ name, target, owner, version }, ownerSign)) }
  async release ({ name, owner }, ownerSign) { await this.append(ops.releaseOp({ name, owner }, ownerSign)) }
  async revoke ({ name, owner }, ownerSign) { await this.append(ops.revokeOp({ name, owner }, ownerSign)) }

  // Resolve a typed name → the active entry (target/owner/version) or null.
  async resolve (name) {
    await this.mgr.update()
    const normalized = normalize(name)
    const e = await this.mgr.view.get('name!' + normalized).catch(() => null)
    const v = e && e.value
    return (v && v.status === 'active') ? { name: v.name, normalized, target: v.target, owner: v.owner, version: v.version } : null
  }

  // All currently-active names.
  async list () {
    await this.mgr.update()
    const out = []
    for await (const e of this.mgr.view.createReadStream({ gte: 'name!', lt: 'name!~' })) {
      if (e.value && e.value.status === 'active') out.push(e.value)
    }
    return out
  }

  async close () { await this.mgr.close() }
}

module.exports = { NameRegistry }
