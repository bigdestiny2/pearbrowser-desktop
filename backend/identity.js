/**
 * Identity — user's root keypair with BIP-39 seed phrase backup.
 *
 * Phase 1 ticket 3 of the Holepunch alignment plan. Matches the Keet-style
 * identity model: one root keypair per user that can be exported as a seed
 * phrase and restored on a new device.
 *
 * Storage:
 *   - The entropy (raw 16/32 bytes for BIP-39 128/256-bit) is persisted at
 *     `<storagePath>/identity.json`. Not encrypted at rest by default — we're
 *     inside the app's sandbox — but SEC0 (see below) can wrap it in an
 *     argon2id+secretbox vault.
 *   - The derived keypair is ed25519 (matches noise-curve25519 / Hyperswarm
 *     keypair shape).
 *
 * BIP-39 layer (v2, 2026-07 — standards-compliant):
 *   - 256-bit entropy → 24-word mnemonic, via Holepunch's `bip39-mnemonic`
 *     (pure JS over sodium-universal, so it runs under Bare).
 *   - The seed is the REAL BIP-39 PBKDF2-HMAC-SHA512 output (not the pre-v2
 *     SHA-512(entropy) shortcut), so a phrase minted here restores in Keet,
 *     hardware wallets, and any BIP-39 tool. Portable by construction.
 *   - HARD CUTOVER from v1: the same phrase now derives DIFFERENT pubkeys than
 *     the old SHA-512 path, so pre-v2 identities must be regenerated.
 */

const fs = require('bare-fs')
const path = require('bare-path')
const crypto = require('bare-crypto')
const b4a = require('b4a')
const bip39 = require('bip39-mnemonic')

// sodium-universal is already in the dependency graph via hyperswarm /
// autobase. We use it for ed25519 detached signing so pages can sign
// arbitrary payloads with the user's root identity.
let sodium = null
try { sodium = require('sodium-universal') } catch (_) { /* optional */ }

// --- BIP-39 helpers (standards-compliant, via Holepunch bip39-mnemonic) ------
//
// Thin wrappers so the rest of the file (and external importers) keep the same
// names, but every call now routes through the canonical BIP-39 implementation
// used by Keet/keet-identity-key. Mnemonics interoperate with any BIP-39 tool.

function entropyToMnemonic (entropyBytes) {
  if (!b4a.isBuffer(entropyBytes) && !(entropyBytes instanceof Uint8Array)) {
    throw new TypeError('entropy must be a Buffer/Uint8Array')
  }
  return bip39.entropyToMnemonic(b4a.from(entropyBytes))
}

function mnemonicToEntropy (mnemonic) {
  if (typeof mnemonic !== 'string') throw new TypeError('mnemonic must be a string')
  // bip39-mnemonic normalizes + validates the checksum, throwing on a bad phrase.
  return b4a.from(bip39.mnemonicToEntropy(mnemonic))
}

function validateMnemonic (mnemonic) {
  try { return bip39.validateMnemonic(mnemonic) } catch (_) { return false }
}

/**
 * Derive the 32-byte ed25519 seed from BIP-39 entropy — the REAL BIP-39 path:
 * entropy → mnemonic → PBKDF2-HMAC-SHA512 → 64-byte seed, of which we take the
 * first 32 bytes as the ed25519 / Corestore-namespace seed.
 *
 * ASYNC (PBKDF2 is intentionally slow). Callers cache the result on this._seed
 * so getSeed()/getAppKeypair()/sign() stay synchronous once ready() resolves.
 */
async function entropyToSeed (entropyBytes) {
  const mnemonic = bip39.entropyToMnemonic(b4a.from(entropyBytes))
  const seed = await bip39.mnemonicToSeed(mnemonic)
  return b4a.from(seed).slice(0, 32)
}

// --- Identity manager ---

class Identity {
  constructor (storagePath) {
    if (!storagePath) throw new Error('Identity requires a storagePath')
    this.storagePath = storagePath
    this.file = path.join(storagePath, 'identity.json')
    this._entropy = null
    this._seed = null
    // SEC0 — seed-at-rest encryption. When the on-disk seed is an encrypted vault
    // the identity boots LOCKED (entropy unavailable until unlock(passphrase));
    // _passphrase is held in memory so persist/rotate can re-encrypt.
    this._passphrase = null
    this._locked = false
    this._encryptedVault = null
  }

  /**
   * Load or generate the user's identity.
   * On first run: generates fresh 16-byte entropy and persists.
   * On subsequent runs: loads the saved entropy.
   */
  async ready () {
    try {
      const raw = fs.readFileSync(this.file, 'utf-8')
      const data = JSON.parse(raw)
      // SEC0: an encrypted-at-rest vault — boot LOCKED, never regenerate (that
      // would destroy the user's seed). unlock(passphrase) loads it.
      if (data && data.v === 2 && data.enc === 'argon2id-secretbox') {
        this._encryptedVault = data
        this._locked = true
        return
      }
      if (data && typeof data.entropy === 'string') {
        this._entropy = b4a.from(data.entropy, 'hex')
        if (this._entropy.length !== 16 && this._entropy.length !== 32) {
          throw new Error('Persisted entropy has invalid length')
        }
        this._seed = await entropyToSeed(this._entropy)
        return
      }
    } catch (err) {
      if (err && err.code !== 'ENOENT') {
        console.warn('[Identity] load failed, regenerating:', err.message)
      }
    }
    // Generate fresh 256-bit entropy (24-word mnemonic — the Keet standard).
    this._entropy = crypto.randomBytes(32)
    this._seed = await entropyToSeed(this._entropy)
    this._persist()
  }

  _persist () {
    try {
      if (!fs.existsSync(this.storagePath)) fs.mkdirSync(this.storagePath, { recursive: true })
    } catch (_) {}
    let payload
    if (this._passphrase) {
      // SEC0: encrypt the seed at rest (argon2id + secretbox).
      const sv = require('./seed-vault.cjs')
      payload = { ...sv.encryptEntropy(this._entropy, this._passphrase), createdAt: Date.now() }
    } else {
      payload = { version: 1, entropy: b4a.toString(this._entropy, 'hex'), createdAt: Date.now() }
    }
    fs.writeFileSync(this.file, JSON.stringify(payload))
  }

  /** Is the on-disk seed encrypted (SEC0)? */
  isEncryptedAtRest () { return !!this._passphrase || !!this._encryptedVault }

  /** Is the identity locked (encrypted on disk, not yet unlocked this session)? */
  isLocked () { return !!this._locked }

  /**
   * SEC0 — encrypt the seed at rest under `passphrase`. The seed must already be
   * unlocked/loaded. Rewrites identity.json as an argon2id+secretbox vault and
   * holds the passphrase in memory so rotate/save re-encrypt.
   */
  encryptSeedAtRest (passphrase) {
    if (this._locked || !this._entropy) throw new Error('Identity must be unlocked to encrypt')
    if (typeof passphrase !== 'string' || passphrase.length === 0) throw new Error('passphrase required')
    this._passphrase = passphrase
    this._persist()
  }

  /**
   * Unlock an encrypted-at-rest identity with `passphrase`. Fails CLOSED (throws)
   * on the wrong passphrase. No-op if already unlocked.
   */
  async unlock (passphrase) {
    if (!this._locked) return true
    const sv = require('./seed-vault.cjs')
    const entropy = sv.decryptEntropy(this._encryptedVault, passphrase)
    if (entropy.length !== 16 && entropy.length !== 32) throw new Error('decrypted entropy has invalid length')
    this._entropy = entropy
    this._seed = await entropyToSeed(entropy)
    this._passphrase = passphrase
    this._locked = false
    this._encryptedVault = null
    return true
  }

  /** Raw seed bytes (32 bytes). Pass into Corestore.namespace(seed). */
  getSeed () {
    if (!this._seed) throw new Error('Identity not ready')
    return this._seed
  }

  /** Raw entropy bytes (16 or 32 bytes). */
  getEntropy () {
    if (!this._entropy) throw new Error('Identity not ready')
    return b4a.from(this._entropy)
  }

  /** 12-word (or 24-word) mnemonic backup phrase. */
  getMnemonic () {
    if (!this._entropy) throw new Error('Identity not ready')
    return entropyToMnemonic(this._entropy)
  }

  /** Public key derived from seed (placeholder — actual pubkey comes from Corestore). */
  getPublicKeyHex (corestore) {
    if (corestore && corestore.primaryKey) {
      return b4a.toString(corestore.primaryKey, 'hex')
    }
    // Fallback: hash of the seed
    return b4a.toString(crypto.createHash('sha256').update(this._seed).digest(), 'hex')
  }

  /**
   * Derive the ROOT ed25519 keypair from the seed. Cached. Returns
   * `{ publicKey: Buffer(32), secretKey: Buffer(64) }`.
   *
   * The root keypair NEVER leaves the worklet. Pages interact via
   * per-app sub-keypairs (see getAppKeypair()) — that's what they
   * see and sign with.
   */
  getSigningKeypair () {
    if (this._keypair) return this._keypair
    if (!sodium) throw new Error('sodium-universal not available — ed25519 signing disabled')
    if (!this._seed) throw new Error('Identity not ready')

    const publicKey = b4a.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
    const secretKey = b4a.alloc(sodium.crypto_sign_SECRETKEYBYTES)
    sodium.crypto_sign_seed_keypair(publicKey, secretKey, this._seed)
    this._keypair = { publicKey, secretKey }
    return this._keypair
  }

  /**
   * Derive a deterministic per-app ed25519 sub-keypair from the root
   * seed + drive key. Same user + same app = same pubkey, forever,
   * across all devices that share the root seed — but different apps
   * see DIFFERENT pubkeys for the same user, so apps can't correlate
   * users across each other without explicit consent.
   *
   * Derivation:  subSeed = SHA-256(rootSeed || "pear-app-v1:" || driveKey)
   *              (subPub, subPriv) = ed25519.seed_keypair(subSeed)
   *
   * `driveKeyHex` is the hex-encoded 32-byte Hyperdrive key of the app
   * as served by PearBrowser's proxy. For the "browser-itself" context
   * (e.g. Settings screen), pass the literal string "browser".
   *
   * Phase A of the identity plan — see docs/IDENTITY_PLAN.md.
   */
  getAppKeypair (driveKeyHex) {
    if (!sodium) throw new Error('sodium-universal not available')
    if (!this._seed) throw new Error('Identity not ready')
    if (typeof driveKeyHex !== 'string' || driveKeyHex.length === 0) {
      throw new Error('driveKeyHex must be a non-empty string')
    }
    if (!this._appKeypairs) this._appKeypairs = new Map()
    const cached = this._appKeypairs.get(driveKeyHex)
    if (cached) return cached

    const hash = crypto.createHash('sha256')
    hash.update(this._seed)
    hash.update('pear-app-v1:')
    hash.update(driveKeyHex)
    const subSeed = hash.digest()

    const publicKey = b4a.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
    const secretKey = b4a.alloc(sodium.crypto_sign_SECRETKEYBYTES)
    sodium.crypto_sign_seed_keypair(publicKey, secretKey, subSeed)

    const keypair = { publicKey, secretKey, driveKeyHex }
    this._appKeypairs.set(driveKeyHex, keypair)
    return keypair
  }

  /**
   * Derive a deterministic ed25519 sub-keypair under the root seed for a domain
   * `tag` + `input`:  subSeed = SHA-256(rootSeed || tag || input). Domain-
   * separated so the SAME input under DIFFERENT tags (app / invoice / session)
   * yields UNLINKABLE keys. Pure: same seed + tag + input ⇒ same keypair on every
   * device, forever; the root secret never leaves the worklet.
   */
  _deriveSubkey (tag, input) {
    if (!sodium) throw new Error('sodium-universal not available')
    if (!this._seed) throw new Error('Identity not ready')
    if (typeof input !== 'string' || input.length === 0) throw new Error('input must be a non-empty string')
    const hash = crypto.createHash('sha256')
    hash.update(this._seed)
    hash.update(tag)
    hash.update(input)
    const subSeed = hash.digest()
    const publicKey = b4a.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
    const secretKey = b4a.alloc(sodium.crypto_sign_SECRETKEYBYTES)
    sodium.crypto_sign_seed_keypair(publicKey, secretKey, subSeed)
    return { publicKey, secretKey }
  }

  /**
   * Per-invoice keypair (Payments / Privacy-routing PRIV0). Deterministic from
   * the sale nonce so buyer + seller can both re-derive it for the same sale, yet
   * UNLINKABLE across invoices and from the root/app keys. Zero network cost.
   */
  getInvoiceKeypair (saleNonce) {
    return { ...this._deriveSubkey('pear-invoice-v1:', String(saleNonce == null ? '' : saleNonce)), saleNonce }
  }

  /**
   * Per-session keypair (Nostr / PRIV0). Deterministic from a session salt the
   * caller picks at random — session isolation + unlinkability across sessions,
   * recoverable within one.
   */
  getSessionKeypair (sessionSalt) {
    return { ...this._deriveSubkey('pear-session-v1:', String(sessionSalt == null ? '' : sessionSalt)), sessionSalt }
  }

  // --- Nostr (secp256k1 / BIP-340) — NOSTR0 -----------------------------------
  // Derived deterministically from the root seed via the Bare-loadable
  // secp256k1-bundle.cjs (SPIKE-SCHNORR-BARE). The nsec (secret) stays SEALED in
  // here — callers only get the public key + sign/verify, never the secret.

  _nostrSecretHex () {
    if (!this._seed) throw new Error('Identity not ready')
    const hash = crypto.createHash('sha256')
    hash.update(this._seed)
    hash.update('pear-nostr-v1:')
    return b4a.toString(hash.digest(), 'hex')
  }

  /** The user's Nostr x-only public key (hex). Stable across devices/restores. */
  getNostrPublicKey () {
    return require('./secp256k1-bundle.cjs').schnorrGetPublicKey(this._nostrSecretHex())
  }

  /** Schnorr-sign a 32-byte message hash with the Nostr key. We supply aux
   *  randomness from bare-crypto (the bundle's default uses a WebCrypto global
   *  that isn't guaranteed under Bare). */
  nostrSign (msg32Hex, auxRandHex) {
    const aux = auxRandHex || b4a.toString(crypto.randomBytes(32), 'hex')
    return require('./secp256k1-bundle.cjs').schnorrSign(msg32Hex, this._nostrSecretHex(), aux)
  }

  /** Verify ANY party's Nostr (BIP-340) signature — pure, needs only the pubkey. */
  nostrVerify (sigHex, msg32Hex, pubkeyHex) {
    return require('./secp256k1-bundle.cjs').schnorrVerify(sigHex, msg32Hex, pubkeyHex)
  }

  /** Sign a NIP-01 event { kind, created_at, tags, content } with our Nostr key —
   *  fills pubkey, computes the event id, attaches the signature. */
  nostrSignEvent (ev, auxRandHex) {
    const secp = require('./secp256k1-bundle.cjs')
    const aux = auxRandHex || b4a.toString(crypto.randomBytes(32), 'hex')
    return secp.nip01Sign({ ...ev, pubkey: this.getNostrPublicKey() }, this._nostrSecretHex(), aux)
  }

  /** NOSTR2 — mint a cross-curve binding linking our pear root ↔ our Nostr key,
   *  signed by BOTH (ed25519 root + secp256k1 nostr). `epoch` is monotonic. */
  makeNostrBinding (epoch, auxRandHex) {
    const nb = require('./nostr-bind.cjs')
    const rootPubkey = b4a.toString(this.getSigningKeypair().publicKey, 'hex')
    return nb.makeNostrBind(
      { rootPubkey, nostrPubkey: this.getNostrPublicKey(), epoch },
      (msg) => this.sign(msg).signature, // ed25519 root attestation
      (msg32Hex) => this.nostrSign(msg32Hex, auxRandHex) // secp256k1 nostr attestation
    )
  }

  /** Verify a peer's cross-curve binding against their (Contacts-held) root. */
  verifyNostrBinding (bind, expectedRootPubkey) {
    return require('./nostr-bind.cjs').verifyNostrBind(bind, expectedRootPubkey)
  }

  /** NOSTR2 — mint a ROOT-signed revocation of the binding at `epoch` (you can
   *  unilaterally unlink from your pear side; revoke-wins by epoch). Root-signed
   *  only — no nostr counter-signature needed to unlink. */
  makeNostrRevocation (epoch) {
    const nb = require('./nostr-bind.cjs')
    const rootPubkey = b4a.toString(this.getSigningKeypair().publicKey, 'hex')
    return nb.makeNostrRevoke(
      { rootPubkey, nostrPubkey: this.getNostrPublicKey(), epoch },
      (msg) => this.sign(msg).signature
    )
  }

  /**
   * Sign with the per-app sub-key (not the root). Safe to expose to
   * pages — the root remains sealed inside the worklet.
   *
   * `driveKeyHex` scopes the signing keypair; the payload is also
   * wrapped with a domain-separator tag so one app's signature can't
   * be replayed in another app's context.
   */
  signForApp (driveKeyHex, payload, namespace = '') {
    const { publicKey, secretKey } = this.getAppKeypair(driveKeyHex)
    const tag = `pear.app.${driveKeyHex}:${namespace}:`
    const message = b4a.concat([
      b4a.from(tag, 'utf-8'),
      typeof payload === 'string' ? b4a.from(payload, 'utf-8') : b4a.from(payload || []),
    ])
    if (message.length === 0) throw new Error('payload must be non-empty')
    if (message.length > 64 * 1024) throw new Error('payload too large (>64KB)')

    const signature = b4a.alloc(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(signature, message, secretKey)
    return {
      signature: b4a.toString(signature, 'hex'),
      publicKey: b4a.toString(publicKey, 'hex'),
      algorithm: 'ed25519',
      tag,
    }
  }

  /**
   * Sign a binary or UTF-8 string payload with the user's root keypair.
   * Returns `{ signature: <hex>, publicKey: <hex>, algorithm: 'ed25519' }`.
   *
   * NOTE: Pages that call `window.pear.identity.sign(data)` get this
   * signature back. Validate the payload namespace on the caller side
   * so a malicious page can't trick a user into signing on their behalf
   * for a different app. A future hardening step can prefix-wrap the
   * payload with a domain separator tag (e.g. `PEAR-APP-<driveKey>:`).
   */
  sign (payload) {
    const { publicKey, secretKey } = this.getSigningKeypair()
    const message = typeof payload === 'string'
      ? b4a.from(payload, 'utf-8')
      : b4a.from(payload || [])
    if (message.length === 0) throw new Error('payload must be non-empty')
    if (message.length > 64 * 1024) throw new Error('payload too large (>64KB)')

    const signature = b4a.alloc(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(signature, message, secretKey)
    return {
      signature: b4a.toString(signature, 'hex'),
      publicKey: b4a.toString(publicKey, 'hex'),
      algorithm: 'ed25519'
    }
  }

  /**
   * Verify an Ed25519 detached signature over a payload — the counterpart to
   * sign(). PURE: needs only the public key, never the root seed, so it can
   * verify ANY party's signature, not just our own. This is the anti-forgery
   * gate every signed-record consumer (naming, payments, nostr, routing) in
   * docs/research/ depends on (Phase P0 of IMPLEMENTATION-PLAN.md).
   *
   * Returns a boolean. Never throws on malformed / attacker-controlled input
   * (fail-closed → false); throws only if the crypto backend is missing, the
   * same hard-environment failure sign() raises.
   */
  verify (payload, signatureHex, publicKeyHex) {
    if (!sodium) throw new Error('sodium-universal not available — ed25519 verify disabled')
    try {
      const signature = b4a.from(String(signatureHex), 'hex')
      const publicKey = b4a.from(String(publicKeyHex), 'hex')
      if (signature.length !== sodium.crypto_sign_BYTES) return false
      if (publicKey.length !== sodium.crypto_sign_PUBLICKEYBYTES) return false
      const message = typeof payload === 'string' ? b4a.from(payload, 'utf-8') : b4a.from(payload || [])
      if (message.length === 0) return false
      return sodium.crypto_sign_verify_detached(signature, message, publicKey)
    } catch {
      return false
    }
  }

  /**
   * Verify a per-app signature produced by signForApp(). Reconstructs the
   * `pear.app.<driveKey>:<namespace>:` domain-separator tag (signForApp():264)
   * before verifying, so a signature minted for one (app, namespace) can't be
   * replayed in another. `signed` is the { signature, publicKey } shape
   * signForApp() returns.
   *
   * NOTE: this confirms the signature is valid for the PROVIDED publicKey; the
   * caller must still bind that pubkey to an expected identity (see the
   * IdentityBinding record in the naming/payments designs) to prevent a
   * forger from simply presenting their own key.
   */
  verifyForApp (driveKeyHex, payload, namespace = '', signed = {}) {
    const tag = `pear.app.${driveKeyHex}:${namespace}:`
    const message = b4a.concat([
      b4a.from(tag, 'utf-8'),
      typeof payload === 'string' ? b4a.from(payload, 'utf-8') : b4a.from(payload || []),
    ])
    return this.verify(message, signed.signature, signed.publicKey)
  }

  /**
   * Replace the current identity with one derived from a user-provided phrase.
   * The caller is responsible for closing the current Corestore and reopening
   * a new one after this — data stored under the old identity is NOT migrated.
   */
  async restoreFromMnemonic (mnemonic) {
    const entropy = mnemonicToEntropy(mnemonic)
    this._entropy = entropy
    this._seed = await entropyToSeed(entropy)
    this._persist()
  }

  /**
   * Generate a fresh identity and replace the persisted one.
   * Same caveat as restoreFromMnemonic — data from old identity is orphaned.
   */
  async rotate () {
    this._entropy = crypto.randomBytes(32)
    this._seed = await entropyToSeed(this._entropy)
    this._persist()
  }
}

module.exports = {
  Identity,
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
  entropyToSeed, // NOTE: now async (standards-compliant BIP-39 PBKDF2)
  mnemonicToSeed: bip39.mnemonicToSeed,
  generateMnemonic: bip39.generateMnemonic,
}
