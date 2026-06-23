// NostrBindingStore — the live half of NOSTR2. nostr-bind.cjs is PURE (it
// neither persists nor bumps epochs); identity.makeNostrBinding/makeNostrRevocation
// mint records but store nothing. This module persists the user's current
// cross-curve binding + a monotonic epoch + revocations in the PersonalIndex
// `meta!` namespace, EXACTLY mirroring IdentityBindingPublisher (the Lighthouse
// search-key binding). Every dependency is injected → Node-testable with a real
// Corestore-backed PersonalIndex + the real Identity.
//
// The Nostr key is seed-derived and STABLE, so re-binding after a revoke mints a
// HIGHER epoch that re-links (resolveNostrBind: highest-epoch non-revoked wins).
//
// SECURITY (threat #10): bind()/revoke() take NO caller payload — the signed
// canonical bytes are constructed backend-side by identity.makeNostrBinding /
// makeNostrRevocation. The renderer can trigger a bind/revoke but can NEVER get
// the root key to sign attacker-chosen bytes through this path.

const nb = require('./nostr-bind.cjs')
const nip19 = require('./nip19.cjs')
const b4a = require('b4a')

const BINDING_META = 'nostrBinding'
const EPOCH_META = 'nostrBindingEpoch'
const revokeKey = (epoch) => 'nostrRevoke!' + epoch

class NostrBindingStore {
  constructor ({ identity, personalIndex, log } = {}) {
    if (!identity) throw new Error('NostrBindingStore requires identity')
    if (!personalIndex) throw new Error('NostrBindingStore requires personalIndex')
    this.identity = identity
    this.personalIndex = personalIndex
    this.log = typeof log === 'function' ? log : () => {}
  }

  async ready () {
    if (!this.personalIndex.bee) throw new Error('personalIndex not ready (no bee)')
    return this
  }

  _rootPubkeyHex () {
    return b4a.toString(this.identity.getSigningKeypair().publicKey, 'hex')
  }

  async _revocationsForRoot (rootHex, maxEpoch) {
    const out = []
    const end = Number.isInteger(maxEpoch) && maxEpoch > 0 ? maxEpoch : 0
    for (let epoch = 1; epoch <= end; epoch++) {
      const rev = await this.personalIndex.getMeta(revokeKey(epoch), null)
      if (rev && nb.verifyNostrRevoke(rev, rootHex)) out.push(rev)
    }
    return out
  }

  async getRevocations () {
    const rootHex = this._rootPubkeyHex()
    const epoch = await this.personalIndex.getMeta(EPOCH_META, 0)
    return this._revocationsForRoot(rootHex, epoch)
  }

  // Current public state for the UI: npub, the attested epoch, and whether the
  // binding is linked/revoked/stale/unverified. Resolved through the audited
  // state resolver so the UI and wire semantics agree.
  async getState () {
    const rootHex = this._rootPubkeyHex()
    const nostrPubkey = this.identity.getNostrPublicKey()
    const binding = await this.personalIndex.getMeta(BINDING_META, null)
    const epoch = await this.personalIndex.getMeta(EPOCH_META, 0)
    const revocations = await this._revocationsForRoot(rootHex, epoch)
    const resolved = nb.resolveNostrBindState(rootHex, binding ? [binding] : [], revocations)
    let status = resolved.status
    if (status === 'linked' && resolved.nostrPubkey !== nostrPubkey) status = 'stale'
    return {
      nostrPubkey,
      npub: nip19.npubEncode(nostrPubkey),
      rootPubkey: rootHex,
      epoch,
      status,
      linked: status === 'linked',
      revoked: status === 'revoked',
      stale: status === 'stale',
      binding: binding || null,
      revocation: resolved.revocation || null,
      revocations,
    }
  }

  // Mint + persist a binding at epoch+1 (monotonic). Self-verifies before
  // persisting — fail closed: a bad signer wiring must never be stored.
  async bind () {
    const rootHex = this._rootPubkeyHex()
    const epoch = (await this.personalIndex.getMeta(EPOCH_META, 0)) + 1
    const binding = this.identity.makeNostrBinding(epoch)
    if (!this.identity.verifyNostrBinding(binding, rootHex)) {
      throw new Error('nostr binding self-verify failed — root/nostr signer wiring is wrong')
    }
    await this.personalIndex.putMeta(BINDING_META, binding)
    await this.personalIndex.putMeta('nostrBinding!' + epoch, binding)
    await this.personalIndex.putMeta(EPOCH_META, epoch)
    this.log('[nostr-bind] linked epoch ' + epoch + ' npub=' + binding.nostrPubkey.slice(0, 12) + '…')
    return this.getState()
  }

  // Root-signed revocation of the current binding's epoch → unlinks. Idempotent
  // when there is nothing to revoke.
  async revoke () {
    const binding = await this.personalIndex.getMeta(BINDING_META, null)
    if (!binding) return this.getState()
    const rev = this.identity.makeNostrRevocation(binding.epoch)
    await this.personalIndex.putMeta(revokeKey(binding.epoch), rev)
    this.log('[nostr-bind] revoked epoch ' + binding.epoch)
    return this.getState()
  }
}

module.exports = { NostrBindingStore }
