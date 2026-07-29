/**
 * Contacts — the user's social graph.
 *
 * Phase D of the identity plan. A Hyperbee inside the user's Corestore
 * listing people the user has added (scanned their QR / accepted an
 * invite). Any app with the `contacts:read` scope can query it via
 * `window.pear.contacts.list()`.
 *
 * Data layout:
 *   contact!<pubkey>   { displayName, addedAt, tags?, avatar?, notes?, signature?, verifiedAt?, bindingKey? }
 *
 * Pubkeys are the OTHER user's ROOT pubkey (not their per-app sub-key).
 * Since each user's root pubkey is derived from their BIP-39 seed, it's
 * stable forever and unique — the right identifier for a "person."
 */

const Hyperbee = require('hyperbee')

const MAX_CONTACTS = 10_000

class Contacts {
  /**
   * @param {Corestore} store
   * @param {object} [opts]
   * @param {(payload:string, signatureHex:string, publicKeyHex:string)=>boolean} [opts.verify]
   *        Ed25519 verifier (typically `identity.verify`). When present, an
   *        invite that carries a `signature` is checked and the import is
   *        REJECTED if it doesn't verify (fail closed). When absent, a signed
   *        invite is refused rather than imported unverified.
   * @param {()=>number} [opts.now] injectable clock (for deterministic tests)
   */
  constructor (store, opts = {}) {
    if (!store) throw new Error('Contacts requires a Corestore')
    this.store = store
    this._verify = typeof opts.verify === 'function' ? opts.verify : null
    this._now = typeof opts.now === 'function' ? opts.now : () => Date.now()
    this._bee = null
    this._ready = false
  }

  async ready () {
    if (this._ready) return
    const core = this.store.get({ name: 'pearbrowser-contacts-v1' })
    this._bee = new Hyperbee(core, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json',
    })
    await this._bee.ready()
    this._ready = true
  }

  _requireReady () {
    if (!this._ready) throw new Error('Contacts not ready — call ready() first')
  }

  _validatePubkey (pubkey) {
    if (typeof pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(pubkey)) {
      throw new Error('Invalid pubkey — expected 64-char hex')
    }
    return pubkey.toLowerCase()
  }

  async list ({ limit = 1000 } = {}) {
    this._requireReady()
    const out = []
    let count = 0
    const cap = Math.min(Math.max(1, limit), 1000)
    for await (const entry of this._bee.createReadStream({ gte: 'contact!', lt: 'contact!~' })) {
      out.push({ pubkey: entry.key.slice('contact!'.length), ...entry.value })
      if (++count >= cap) break
    }
    return out
  }

  async lookup (pubkey) {
    this._requireReady()
    const key = this._validatePubkey(pubkey)
    const entry = await this._bee.get('contact!' + key)
    return entry ? { pubkey: key, ...entry.value } : null
  }

  /**
   * Add (or update) a contact. If `signature` is present it must be an ed25519
   * signature by the contact's OWN root key (== `pubkey`) over the canonical
   * message `pear.contact:<pubkey>:<displayName>` — or, when a binding key is
   * supplied, `pear.contact:<pubkey>:<displayName>:<bindingKey>` — proving the
   * invite wasn't tampered with (a swapped name OR binding key fails the check).
   * Verification FAILS CLOSED. A `bindingKey` (which makes the contact a trusted
   * federated-search peer) is stored ONLY when it arrived inside a verified
   * signature; an unsigned/unverified binding key is dropped, so an attacker
   * can't forge a pubkey↔index link the user never authenticated.
   */
  async add ({ pubkey, displayName, avatar, tags, notes, signature, bindingKey }) {
    this._requireReady()
    const key = this._validatePubkey(pubkey)
    const trimmedName = typeof displayName === 'string' ? displayName.trim().slice(0, 128) : ''
    // format-check only — TRUST comes from the verified signature below, which
    // binds this exact key so a swapped bk fails verification rather than silently
    // pointing federated search at an attacker-chosen DHT record.
    const bkLower = typeof bindingKey === 'string' && /^[0-9a-f]{64}$/i.test(bindingKey) ? bindingKey.toLowerCase() : null

    const hasSig = signature != null && signature !== ''
    let verifiedAt = null
    let storedSig = null
    if (hasSig) {
      if (typeof signature !== 'string' || !/^[0-9a-f]+$/i.test(signature)) {
        throw new Error('contact invite signature malformed — expected hex')
      }
      if (!this._verify) {
        throw new Error('contact invite carries a signature but no verifier is configured')
      }
      // the signature binds the binding key too (when present): swap either the
      // name or the bk and this message no longer matches the signed bytes.
      const message = bkLower
        ? `pear.contact:${key}:${trimmedName}:${bkLower}`
        : `pear.contact:${key}:${trimmedName}`
      let ok = false
      try { ok = this._verify(message, signature, key) === true } catch (_) { ok = false }
      if (!ok) throw new Error('contact invite signature invalid — refusing tampered invite')
      verifiedAt = this._now()
      storedSig = signature.toLowerCase()
    }

    // a binding key is trusted for federated search ONLY if it rode in a VERIFIED
    // signature (which bound it); otherwise it is dropped (fail safe).
    const trustedBk = (verifiedAt && bkLower) ? bkLower : null

    const existing = await this._bee.get('contact!' + key)
    const record = {
      displayName: trimmedName,
      addedAt: existing ? existing.value.addedAt : this._now(),
      avatar: typeof avatar === 'string' ? avatar.slice(0, 1024) : null,
      tags: Array.isArray(tags) ? tags.map(String).slice(0, 16) : [],
      notes: typeof notes === 'string' ? notes.slice(0, 512) : null,
      signature: hasSig ? storedSig : (existing ? (existing.value.signature ?? null) : null),
      verifiedAt: hasSig ? verifiedAt : (existing ? (existing.value.verifiedAt ?? null) : null),
      bindingKey: trustedBk || (existing ? (existing.value.bindingKey ?? null) : null),
      updatedAt: this._now(),
    }
    // enforce cap
    const count = (await this.list({ limit: MAX_CONTACTS })).length
    if (!existing && count >= MAX_CONTACTS) {
      throw new Error(`Contact cap reached (${MAX_CONTACTS})`)
    }
    await this._bee.put('contact!' + key, record)
    return { pubkey: key, ...record }
  }

  async update (pubkey, updates) {
    this._requireReady()
    const key = this._validatePubkey(pubkey)
    const existing = await this._bee.get('contact!' + key)
    if (!existing) return null
    const next = {
      ...existing.value,
      ...updates,
      pubkey: undefined,       // never allow overwriting key
      addedAt: existing.value.addedAt,
      // verification state is set only by add() after a real signature check;
      // update() must never let a caller forge it.
      signature: existing.value.signature ?? null,
      verifiedAt: existing.value.verifiedAt ?? null,
      bindingKey: existing.value.bindingKey ?? null,
      updatedAt: this._now(),
    }
    delete next.pubkey
    await this._bee.put('contact!' + key, next)
    return { pubkey: key, ...next }
  }

  async remove (pubkey) {
    this._requireReady()
    const key = this._validatePubkey(pubkey)
    await this._bee.del('contact!' + key)
  }

  /**
   * Parse a `p2p-contact://invite?pk=<hex>&name=<url-encoded>&sig=<hex>` URL
   * into a contact record. `sig` is optional (ed25519 signature over
   * `pear.contact:<pubkey>:<displayName>` by the contact's root key —
   * proves the QR wasn't tampered with). If sig is present + invalid
   * we reject the import.
   */
  static parseInviteURL (url) {
    try {
      const u = new URL(url)
      if (u.protocol !== 'p2p-contact:' || u.hostname !== 'invite') return null
      const pk = u.searchParams.get('pk')
      const name = u.searchParams.get('name') || ''
      const sig = u.searchParams.get('sig')
      const bk = u.searchParams.get('bk') // lighthouse-binding DHT key (optional)
      if (!pk || !/^[0-9a-f]{64}$/i.test(pk)) return null
      return { pubkey: pk.toLowerCase(), displayName: name, signature: sig, bindingKey: bk || null }
    } catch {
      return null
    }
  }

  async close () {
    if (this._bee) {
      try { await this._bee.close() } catch (_) {}
      this._bee = null
    }
    this._ready = false
  }
}

module.exports = { Contacts, MAX_CONTACTS }
