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

  // The revocation persisted for a binding's own epoch (if any), validated
  // against the root — fail-closed (a malformed/forged stored rev is ignored).
  async _revocationFor (binding, rootHex) {
    if (!binding) return null
    const rev = await this.personalIndex.getMeta(revokeKey(binding.epoch), null)
    return (rev && nb.verifyNostrRevoke(rev, rootHex)) ? rev : null
  }

  // Current public state for the UI: npub, the attested epoch, and whether the
  // binding is currently LINKED (attested · not revoked). Resolved through the
  // audited resolveNostrBind so the "linked" verdict matches the wire semantics.
  async getState () {
    const rootHex = this._rootPubkeyHex()
    const nostrPubkey = this.identity.getNostrPublicKey()
    const binding = await this.personalIndex.getMeta(BINDING_META, null)
    const epoch = await this.personalIndex.getMeta(EPOCH_META, 0)
    const rev = await this._revocationFor(binding, rootHex)
    const active = nb.resolveNostrBind(rootHex, binding ? [binding] : [], rev ? [rev] : [])
    return {
      nostrPubkey,
      npub: nip19.npubEncode(nostrPubkey),
      rootPubkey: rootHex,
      epoch,
      linked: active === nostrPubkey,
      binding: binding || null,
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
