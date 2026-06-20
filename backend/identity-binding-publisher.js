// IdentityBindingPublisher — Lighthouse Phase 2 wiring.
//
// identity-binding.cjs is PURE (makeBinding / verifyBinding / resolveSearchKey);
// it neither persists nor publishes anything. This module is the live half: it
//   1. loads-or-creates the user's ROTATABLE search sub-keypair (a random
//      hypercore-crypto keypair persisted in the PersonalIndex under
//      meta!searchkey — NOT the seed-derived getAppKeypair('search'), which can
//      never rotate, per the identity-binding.cjs header),
//   2. mints a root-signed binding (root pubkey -> current search pubkey) at a
//      monotonic version, persisting it + its history + any revocation in the
//      PersonalIndex meta namespace, and
//   3. publishes the binding as a self-certifying DHT mutable record keyed by a
//      stable per-user key (getAppKeypair('lighthouse-binding')), and resolves a
//      CONTACT's current search key by mutableGet + verifyBinding against the
//      root pubkey held in Contacts (the MITM defense — never a self-asserted
//      root).
//
// CommonJS (backend is type:commonjs) and Node-testable: every dependency is
// injected, so tests pass a real Corestore-backed PersonalIndex plus stub
// identity / contacts / dht.

const crypto = require('hypercore-crypto')
const b4a = require('b4a')

const SEARCH_KEY_META = 'searchkey'
const BINDING_META = 'binding'
const BINDING_VERSION_META = 'bindingVersion'
// stable per-user key for the binding's DHT mutable record
const DHT_BINDING_NAMESPACE = 'lighthouse-binding'
// per-app signing domain for search postings (mirrors PersonalIndex sign hook
// + identity-binding.verifyAppSig); a posting signed here verifies there.
const DOC_NAMESPACE = 'lighthouse-doc-v2'

class IdentityBindingPublisher {
  constructor ({ ib, identity, personalIndex, contacts, dht, log } = {}) {
    if (!ib) throw new Error('IdentityBindingPublisher requires ib (identity-binding.cjs)')
    if (!identity) throw new Error('IdentityBindingPublisher requires identity')
    if (!personalIndex) throw new Error('IdentityBindingPublisher requires personalIndex')
    this.ib = ib
    this.identity = identity
    this.personalIndex = personalIndex
    this.contacts = contacts || null
    this.dht = dht || null
    this.log = typeof log === 'function' ? log : () => {}
    this._searchKp = null // cached bound search keypair (Buffers), loaded in ready()
  }

  async ready () {
    if (!this.personalIndex.bee) throw new Error('personalIndex not ready (no bee)')
    // Eagerly load/create the rotatable search keypair so signDocSync() is
    // available synchronously once boot completes (the PersonalIndex sign hook
    // is synchronous and runs whenever a page is indexed).
    this._searchKp = await this._ensureSearchKeypair()
    return this
  }

  _rootPubkeyHex () {
    return b4a.toString(this.identity.getSigningKeypair().publicKey, 'hex')
  }

  // identity.sign(msg) -> { signature: hex, ... }; the ib.* makers want a
  // (msgString) -> sigHex callback.
  _rootSign (msg) {
    return this.identity.sign(msg).signature
  }

  async _loadSearchKeypair () {
    const rec = await this.personalIndex.getMeta(SEARCH_KEY_META, null)
    if (!rec || !rec.publicKey || !rec.secretKey) return null
    return { publicKey: b4a.from(rec.publicKey, 'hex'), secretKey: b4a.from(rec.secretKey, 'hex') }
  }

  async _createSearchKeypair () {
    const kp = crypto.keyPair()
    await this.personalIndex.putMeta(SEARCH_KEY_META, {
      publicKey: b4a.toString(kp.publicKey, 'hex'),
      secretKey: b4a.toString(kp.secretKey, 'hex'),
    })
    this._searchKp = kp
    return kp
  }

  // Load the persisted search keypair, creating + persisting one on first use.
  // Cached on this._searchKp so signDocSync() needs no await.
  async _ensureSearchKeypair () {
    if (this._searchKp) return this._searchKp
    const loaded = await this._loadSearchKeypair()
    this._searchKp = loaded || await this._createSearchKeypair()
    return this._searchKp
  }

  // Sign a search-doc payload with the BOUND (rotatable) search key over the
  // same domain-separated tag identity-binding.verifyAppSig checks, so a peer
  // who resolved our search key can verify this posting. Synchronous: the key is
  // preloaded in ready(); throws if not loaded so the caller can fall back.
  signDocSync (payload) {
    if (!this._searchKp) throw new Error('search keypair not loaded')
    const msg = this.ib.appMessage('search', payload, DOC_NAMESPACE)
    const sig = crypto.sign(msg, this._searchKp.secretKey)
    return { sig: b4a.toString(sig, 'hex'), pubkey: b4a.toString(this._searchKp.publicKey, 'hex') }
  }

  async _currentVersion () { return this.personalIndex.getMeta(BINDING_VERSION_META, 0) }
  async getCurrentBinding () { return this.personalIndex.getMeta(BINDING_META, null) }

  /**
   * Publish (or refresh) the binding for the user's current search key.
   * - First call (no key): create the search key, mint binding v1, publish.
   * - Subsequent calls without rotate: idempotent refresh — re-publish the
   *   existing binding to the DHT, no new version.
   * - rotate:true: mint a fresh search key, revoke the old binding, mint a new
   *   binding at version+1.
   * Returns { searchPubkey, version, dhtPubkey }.
   */
  async publish ({ rotate = false } = {}) {
    const rootHex = this._rootPubkeyHex()
    let searchKp = this._searchKp || await this._ensureSearchKeypair()
    const current = await this.getCurrentBinding()
    const keyMatchesCurrent = searchKp && current &&
      current.searchPubkey === b4a.toString(searchKp.publicKey, 'hex')

    let binding
    let version
    if (!rotate && keyMatchesCurrent) {
      // idempotent refresh of the already-published binding
      binding = current
      version = current.version
    } else {
      if (rotate && current) {
        const rev = this.ib.makeRevocation(
          { rootPubkey: rootHex, searchPubkey: current.searchPubkey, version: current.version },
          (m) => this._rootSign(m)
        )
        await this.personalIndex.putMeta('revoke!' + current.version, rev)
      }
      if (rotate || !searchKp) searchKp = await this._createSearchKeypair()
      const searchHex = b4a.toString(searchKp.publicKey, 'hex')
      version = (await this._currentVersion()) + 1
      binding = this.ib.makeBinding({ rootPubkey: rootHex, searchPubkey: searchHex, version }, (m) => this._rootSign(m))
      // fail closed: a bad signer wiring must never reach the DHT
      if (!this.ib.verifyBinding(binding, rootHex)) {
        throw new Error('binding self-verify failed — root signer wiring is wrong')
      }
      await this.personalIndex.putMeta(BINDING_META, binding)
      await this.personalIndex.putMeta('binding!' + version, binding)
      await this.personalIndex.putMeta(BINDING_VERSION_META, version)
    }

    let dhtPubkey = null
    if (this.dht) {
      const dhtKp = this.identity.getAppKeypair(DHT_BINDING_NAMESPACE)
      dhtPubkey = b4a.toString(dhtKp.publicKey, 'hex')
      const value = b4a.from(JSON.stringify({ ...binding, dhtPubkey }), 'utf-8')
      // REAL hyperdht signature: mutablePut(keyPair, value, { seq })
      await this.dht.mutablePut(dhtKp, value, { seq: version })
    }
    this.log('[binding] published v' + version + ' search=' + binding.searchPubkey.slice(0, 12) + '…')
    return { searchPubkey: binding.searchPubkey, version, dhtPubkey }
  }

  /**
   * Resolve a contact's CURRENT search pubkey. `contactPubkey` is their ROOT
   * pubkey (the trust anchor held in Contacts); `dhtPubkey` is their advertised
   * lighthouse-binding DHT key. Fails closed to null: unknown contact, no DHT,
   * missing record, or a binding that doesn't verify against the contact's root.
   */
  async resolve ({ contactPubkey, dhtPubkey } = {}) {
    if (!contactPubkey || !dhtPubkey) return null
    // frontier gate: only resolve roots we actually have in Contacts
    if (this.contacts) {
      const known = await this.contacts.lookup(contactPubkey).catch(() => null)
      if (!known) return null
    }
    if (!this.dht) return null
    let res
    try { res = await this.dht.mutableGet(b4a.from(dhtPubkey, 'hex')) } catch { return null }
    if (!res || res.value == null) return null
    let rec
    try { rec = JSON.parse(b4a.toString(res.value, 'utf-8')) } catch { return null }
    // authenticate against the Contacts-held root, NOT rec.rootPubkey
    return this.ib.resolveSearchKey(contactPubkey, [rec], [])
  }
}

module.exports = { IdentityBindingPublisher }
