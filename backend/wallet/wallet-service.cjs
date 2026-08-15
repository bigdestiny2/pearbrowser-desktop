'use strict'

// WalletService — browser-owned orchestrator for the WDK wallet preview.
// Composes WalletPolicy / WalletConnections / WalletJournal / wallet-vault
// around the narrow WdkEngineAdapter interface. Owns the vault files under
// <storage>/wallet/wdk-v1/, the serialized global Argon2 unlock, the
// resettable auto-lock timer and the single in-flight consent prompt.
//
// Page-facing methods take the full connection tuple plus an opaque document
// token; token verification is delegated to the injected verifyDocumentToken
// callback (default: deny) so Phase D can plug in the real check. All outputs
// are frozen plain records; errors carry a stable err.code vocabulary.

const fs = require('fs')
const path = require('path')
const b4a = require('b4a')
const sodium = require('sodium-universal')
const STABLE_TESTNET = require('./networks/stable-testnet.cjs')
const walletVault = require('./wallet-vault.cjs')
const {
  buildAppSignIntent,
  buildPaymentIntent,
  appSignIntentDigest,
  paymentIntentDigest
} = require('./canonical-intent.cjs')
const { WalletPolicy } = require('./wallet-policy.cjs')
const { WalletConnections } = require('./wallet-connections.cjs')
const {
  PERMISSION_CONNECT,
  PERMISSION_PAY,
  PERMISSION_SIGN_APP,
  validateWalletManifest
} = require('./wallet-manifest.cjs')

const WALLET_ID = 'wdk-v1'
const PROTOCOL = 'pear.wallet.v1'
const DEFAULT_AUTO_LOCK_MS = 15 * 60 * 1000
const VAULT_FILE = 'vault.json'
const SEED_FILE = 'seed.bin'
const ENTROPY_FILE = 'entropy.bin'
const INTENT_ID_RE = /^wpi_[a-zA-Z0-9_-]{16,96}$/
const HEX64_RE = /^[0-9a-f]{64}$/

// Only one Argon2 unlock may run globally at a time; every service instance
// chains onto this queue.
let unlockQueue = Promise.resolve()

function fail (code, message) {
  const err = new Error(message || code)
  err.code = code
  return err
}

function safeZero (value) {
  try {
    if (!b4a.isBuffer(value) && !(value instanceof Uint8Array)) return
    if (value.byteLength === 0) return
    sodium.sodium_memzero(value)
  } catch {}
}

function newIntentId () {
  const bytes = b4a.alloc(12)
  sodium.randombytes_buf(bytes)
  return 'wpi_' + b4a.toString(bytes, 'hex')
}

function denyDocumentToken () {
  return Promise.resolve(false)
}

async function writeFileAtomic (file, data) {
  const tmp = file + '.tmp-' + process.pid
  await fs.promises.writeFile(tmp, data, { mode: 0o600 })
  await fs.promises.rename(tmp, file)
}

class WalletService {
  /**
   * @param {object} opts
   * @param {string} opts.storage — per-profile storage directory
   * @param {object} opts.engine — WdkEngineAdapter (or a test double with the same surface)
   * @param {WalletPolicy} [opts.policy]
   * @param {WalletConnections} [opts.connections]
   * @param {WalletJournal} [opts.journal]
   * @param {object} [opts.logger]
   * @param {Function} [opts.now]
   * @param {number} [opts.autoLockMs] — default 15 minutes
   * @param {Function} [opts.verifyDocumentToken] — async ({ tuple, token, method }) => boolean; default deny
   */
  constructor (opts = {}) {
    if (!opts || typeof opts.storage !== 'string' || opts.storage.length === 0) {
      throw new Error('WalletService requires a storage directory')
    }
    if (!opts.engine || typeof opts.engine !== 'object') throw new Error('WalletService requires a WDK engine')
    for (const method of ['initialize', 'lock', 'getAddress', 'prepareTransfer', 'signPrepared', 'broadcastSigned', 'getTransaction', 'signAppPayload', 'beginMnemonicCeremony', 'finishMnemonicCeremony']) {
      if (typeof opts.engine[method] !== 'function') throw new Error(`WDK engine is missing ${method}`)
    }
    if (opts.now !== undefined && typeof opts.now !== 'function') throw new Error('now must be a function')
    this._storage = opts.storage
    this._engine = opts.engine
    this._now = typeof opts.now === 'function' ? opts.now : Date.now
    this._policy = opts.policy || new WalletPolicy({ now: this._now })
    this._connections = opts.connections || new WalletConnections({ now: this._now })
    this._journal = opts.journal || null
    this._logger = opts.logger || null
    this._verifyDocumentToken = typeof opts.verifyDocumentToken === 'function'
      ? opts.verifyDocumentToken
      : denyDocumentToken
    this._autoLockMs = Number.isSafeInteger(opts.autoLockMs) && opts.autoLockMs > 0
      ? opts.autoLockMs
      : DEFAULT_AUTO_LOCK_MS
    this._walletDir = path.join(this._storage, 'wallet', WALLET_ID)
    this._address = null
    this._pending = null
    this._autoLockTimer = null
  }

  get directory () { return this._walletDir }
  get promptTtlMs () { return this._policy.promptTtlMs }

  // Phase D installs the real document-token registry through this setter;
  // until then the constructor default (or a deny placeholder) fails closed.
  setDocumentTokenVerifier (fn) {
    if (typeof fn !== 'function') throw fail('bad-request', 'document token verifier must be a function')
    this._verifyDocumentToken = fn
  }

  _vaultPath () { return path.join(this._walletDir, VAULT_FILE) }
  _seedPath () { return path.join(this._walletDir, SEED_FILE) }
  _entropyPath () { return path.join(this._walletDir, ENTROPY_FILE) }

  // Structural vault failures (truncated, non-canonical or tampered JSON) are
  // not authentication failures: surface them as vault-corrupt so chrome does
  // not re-prompt for a "wrong" passphrase. Only an AEAD MAC mismatch — a
  // genuine wrong passphrase — maps to bad-passphrase.
  _unwrapVaultKey (vaultText, passphrase) {
    try {
      walletVault.parseVault(vaultText, WALLET_ID)
    } catch {
      throw fail('vault-corrupt', 'wallet vault is corrupt or tampered')
    }
    try {
      return walletVault.unwrapKey(vaultText, passphrase, WALLET_ID)
    } catch {
      throw fail('bad-passphrase', 'wallet passphrase is incorrect')
    }
  }

  _hasVault () {
    try {
      return fs.statSync(this._vaultPath()).isFile()
    } catch {
      return false
    }
  }

  _log (operation, outcomeCode) {
    if (!this._logger || typeof this._logger.info !== 'function') return
    try {
      const pending = this._logger.info.call(this._logger, {
        operation,
        outcomeCode,
        lifecycleState: this._engine.state || 'unknown'
      })
      if (pending && typeof pending.catch === 'function') pending.catch(() => {})
    } catch {}
  }

  async _journalAppend (entry, opts) {
    if (!this._journal) return null
    return this._journal.append(entry, opts)
  }

  async _journalSafe (entry) {
    try {
      return await this._journalAppend(entry)
    } catch {
      return null
    }
  }

  _iso (ms) {
    return new Date(ms).toISOString()
  }

  // ---------------------------------------------------------------- lifecycle

  async status () {
    const unlocked = this._engine.state === 'ready'
    const state = unlocked ? 'unlocked' : this._hasVault() ? 'locked' : 'absent'
    const result = {
      state,
      walletId: WALLET_ID,
      networkId: STABLE_TESTNET.networkId,
      releasePosture: STABLE_TESTNET.releasePosture
    }
    if (unlocked && this._address) result.address = this._address
    return Object.freeze(result)
  }

  async _runGenesisCeremony (input) {
    const begun = await this._engine.beginMnemonicCeremony(input)
    try {
      return await this._engine.finishMnemonicCeremony({ ceremonyId: begun.ceremonyId, outcome: 'complete' })
    } catch (err) {
      try {
        await this._engine.finishMnemonicCeremony({ ceremonyId: begun.ceremonyId, outcome: 'cancel' })
      } catch {}
      throw err
    }
  }

  async _persistGenesis (material, passphrase, verb) {
    const { encryptedSeed, encryptedEntropy, encryptionKey } = material
    try {
      const vaultText = walletVault.wrapKey(encryptionKey, passphrase, WALLET_ID)
      await fs.promises.mkdir(this._walletDir, { recursive: true, mode: 0o700 })
      // The vault file is written last: its presence marks a complete wallet.
      await writeFileAtomic(this._seedPath(), encryptedSeed)
      await writeFileAtomic(this._entropyPath(), encryptedEntropy)
      await writeFileAtomic(this._vaultPath(), vaultText)
      this._log(verb, 'ok')
      return Object.freeze({ [verb]: true, state: 'locked', walletId: WALLET_ID })
    } finally {
      safeZero(encryptedSeed)
      safeZero(encryptedEntropy)
      safeZero(encryptionKey)
    }
  }

  async createWallet (passphrase) {
    if (this._hasVault()) throw fail('wallet-exists', 'a wallet vault already exists')
    const material = await this._runGenesisCeremony({ type: 'create' })
    return this._persistGenesis(material, passphrase, 'created')
  }

  async restoreWallet (passphrase, mnemonic) {
    if (this._hasVault()) throw fail('wallet-exists', 'a wallet vault already exists')
    if (!b4a.isBuffer(mnemonic) && !(mnemonic instanceof Uint8Array)) {
      throw fail('bad-request', 'mnemonic must be a mutable byte buffer')
    }
    const material = await this._runGenesisCeremony({ type: 'restore', mnemonic })
    return this._persistGenesis(material, passphrase, 'restored')
  }

  // Backup challenge: proves the passphrase, then opens a one-shot mnemonic
  // ceremony while the operational wallet is locked. Chrome displays the
  // returned mnemonic and calls finishBackup() with the user's outcome.
  async backupWallet (passphrase) {
    if (!this._hasVault()) throw fail('not-found', 'wallet vault is absent')
    if (this._engine.state === 'ready') {
      throw fail('bad-request', 'lock the wallet before starting a backup ceremony')
    }
    let encryptionKey = null
    let encryptedEntropy = null
    try {
      const vaultText = await fs.promises.readFile(this._vaultPath(), 'utf8')
      encryptionKey = this._unwrapVaultKey(vaultText, passphrase)
      encryptedEntropy = await fs.promises.readFile(this._entropyPath())
      const begun = await this._engine.beginMnemonicCeremony({
        type: 'backup',
        encryptedEntropy,
        encryptionKey
      })
      // The engine has overwritten both buffers by now.
      encryptedEntropy = null
      encryptionKey = null
      this._log('backup', 'ok')
      return Object.freeze({ ceremonyId: begun.ceremonyId, mnemonic: begun.mnemonic })
    } finally {
      safeZero(encryptionKey)
      safeZero(encryptedEntropy)
    }
  }

  async finishBackup (input = {}) {
    await this._engine.finishMnemonicCeremony(input)
    return Object.freeze({ completed: true })
  }

  unlock (passphrase) {
    const run = unlockQueue.then(() => this._unlock(passphrase), () => this._unlock(passphrase))
    unlockQueue = run.catch(() => {})
    return run
  }

  async _unlock (passphrase) {
    if (this._engine.state === 'ready') return this.status()
    if (!this._hasVault()) throw fail('not-found', 'wallet vault is absent')
    let vaultText
    try {
      vaultText = await fs.promises.readFile(this._vaultPath(), 'utf8')
    } catch {
      throw fail('not-found', 'wallet vault is absent')
    }
    let encryptionKey = null
    let encryptedSeed = null
    try {
      encryptionKey = this._unwrapVaultKey(vaultText, passphrase)
      encryptedSeed = await fs.promises.readFile(this._seedPath())
      // The engine takes ownership of both buffers and overwrites them before
      // initialize() settles, on success and on failure.
      await this._engine.initialize({
        encryptedSeed,
        encryptionKey,
        compiledConfig: STABLE_TESTNET
      })
      encryptedSeed = null
      encryptionKey = null
      const account = await this._engine.getAddress(0)
      this._address = account.address
      this._armAutoLock()
      this._log('unlock', 'ok')
      return this.status()
    } finally {
      safeZero(encryptionKey)
      safeZero(encryptedSeed)
    }
  }

  async lock () {
    this._clearAutoLock()
    const pending = this._pending
    this._pending = null
    if (pending) {
      this._policy.releasePrompt(pending.intentId)
      await this._journalSafe({
        type: 'outcome',
        intentId: pending.intentId,
        driveKey: pending.driveKey,
        manifestSha256: pending.manifestSha256,
        state: 'cancelled',
        reason: 'wallet-lock'
      })
    }
    this._connections.revokeAll()
    this._address = null
    const result = await this._engine.lock()
    this._log('lock', 'ok')
    return Object.freeze({
      locked: true,
      disposeOutcome: result && typeof result.disposeOutcome === 'string' ? result.disposeOutcome : 'not-active'
    })
  }

  // --------------------------------------------------------------- auto-lock

  _clearAutoLock () {
    if (this._autoLockTimer) {
      clearTimeout(this._autoLockTimer)
      this._autoLockTimer = null
    }
  }

  _armAutoLock () {
    this._clearAutoLock()
    if (this._engine.state !== 'ready') return
    this._autoLockTimer = setTimeout(() => {
      this._autoLockTimer = null
      this.lock().catch(() => {})
    }, this._autoLockMs)
    if (typeof this._autoLockTimer.unref === 'function') this._autoLockTimer.unref()
  }

  // Only chrome-driven or freshly approved wallet activity refreshes the idle
  // timer; page read calls (status/capabilities/transaction) never do.
  _refreshActivity () {
    if (this._engine.state === 'ready') this._armAutoLock()
  }

  // ------------------------------------------------------------ page helpers

  _requireUnlocked () {
    if (this._engine.state !== 'ready') throw fail('wallet-locked', 'wallet is locked')
  }

  async _verifyPageCall (tuple, token, method) {
    let authorized = false
    try {
      authorized = await this._verifyDocumentToken({ tuple, token, method })
    } catch {
      authorized = false
    }
    if (authorized !== true) throw fail('not-authorized', 'document token is not authorized')
  }

  _requireTuple (tuple) {
    if (!tuple || typeof tuple !== 'object' || Array.isArray(tuple)) {
      throw fail('bad-request', 'connection tuple must be a record')
    }
    // walletTabOrigin rides along so the document-token verifier can bind the
    // token to the exact tab origin (spec §4.5); WalletConnections ignores it.
    return {
      browserSessionId: tuple.browserSessionId,
      tabId: tuple.tabId,
      driveKey: tuple.driveKey,
      walletTabOrigin: tuple.walletTabOrigin
    }
  }

  _requireIntentId (intentId) {
    if (typeof intentId !== 'string' || !INTENT_ID_RE.test(intentId)) {
      throw fail('bad-request', 'intentId is invalid')
    }
    return intentId
  }

  // -------------------------------------------------------------- page-facing

  capabilities () {
    return Object.freeze({
      protocol: PROTOCOL,
      v: 1,
      walletId: WALLET_ID,
      releasePosture: STABLE_TESTNET.releasePosture,
      chainIds: Object.freeze([STABLE_TESTNET.chain.caip2]),
      assetIds: Object.freeze([STABLE_TESTNET.paymentAsset.id]),
      permissions: Object.freeze([PERMISSION_CONNECT, PERMISSION_PAY, PERMISSION_SIGN_APP])
    })
  }

  async connect (tuple, token, manifest) {
    this._requireUnlocked()
    const key = this._requireTuple(tuple)
    await this._verifyPageCall(key, token, 'connect')
    const grants = validateWalletManifest(manifest)
    if (!grants.connect) throw fail('bad-request', `manifest does not declare ${PERMISSION_CONNECT}`)
    const connection = this._connections.connect({
      ...key,
      walletTabOrigin: tuple.walletTabOrigin,
      manifestSha256: grants.manifestSha256,
      chainId: STABLE_TESTNET.chain.caip2,
      assetId: STABLE_TESTNET.paymentAsset.id,
      permissions: { connect: grants.connect, pay: grants.pay, signApp: grants.signApp }
    })
    await this._journalSafe({
      type: 'connect',
      driveKey: connection.driveKey,
      manifestSha256: connection.manifestSha256,
      browserSessionId: connection.browserSessionId,
      tabId: connection.tabId
    })
    this._refreshActivity()
    return Object.freeze({
      connected: true,
      driveKey: connection.driveKey,
      manifestSha256: connection.manifestSha256,
      chainId: connection.chainId,
      assetId: connection.assetId,
      permissions: connection.permissions
    })
  }

  async disconnect (tuple, token) {
    const key = this._requireTuple(tuple)
    await this._verifyPageCall(key, token, 'disconnect')
    return this._disconnect(key)
  }

  // Browser-chrome revoke path: chrome holds no document token and is
  // trusted, so it skips token verification. Pages must use disconnect().
  async revokeConnection (tuple) {
    const key = this._requireTuple(tuple)
    return this._disconnect(key)
  }

  async _disconnect (key) {
    const result = this._connections.disconnect(key)
    const pending = this._pending
    if (
      pending &&
      pending.tuple.browserSessionId === key.browserSessionId &&
      pending.tuple.tabId === key.tabId &&
      pending.tuple.driveKey === key.driveKey
    ) {
      this._pending = null
      this._policy.releasePrompt(pending.intentId)
      await this._journalSafe({
        type: 'outcome',
        intentId: pending.intentId,
        driveKey: pending.driveKey,
        manifestSha256: pending.manifestSha256,
        state: 'cancelled',
        reason: 'disconnect'
      })
    }
    await this._journalSafe({ type: 'disconnect', driveKey: key.driveKey })
    return result
  }

  listConnections () {
    return this._connections.list()
  }

  async _openPrompt (kind, key, intent, extra = {}) {
    const connection = this._connections.assertConnected(key)
    this._policy.checkPrepare(connection.driveKey)
    const intentId = newIntentId()
    const acquired = this._policy.acquirePrompt(intentId)
    let intentJournaled = false
    try {
      const createdAt = this._now()
      const pending = {
        type: kind,
        intentId,
        tuple: key,
        driveKey: connection.driveKey,
        manifestSha256: connection.manifestSha256,
        intent,
        createdAt,
        expiresAt: acquired.expiresAt,
        ...extra
      }
      await this._journalAppend({
        type: 'intent',
        intentId,
        driveKey: connection.driveKey,
        manifestSha256: connection.manifestSha256,
        intentType: kind,
        intent
      }, extra.idempotency ? { idempotency: { ...extra.idempotency, intentId } } : undefined)
      intentJournaled = true
      await this._journalAppend({
        type: 'prompt',
        intentId,
        driveKey: connection.driveKey,
        manifestSha256: connection.manifestSha256,
        expiresAt: pending.expiresAt
      })
      // The journal awaits above are a blind window: a lock, revoke or
      // disconnect may have landed while the prompt was not yet visible in
      // this._pending. Re-check before exposing it; the catch releases the
      // policy slot and journals the cancellation.
      this._requireUnlocked()
      this._connections.assertConnected(key)
      this._policy.recordPrepare(connection.driveKey)
      this._pending = pending
      this._refreshActivity()
      return Object.freeze({
        type: kind,
        intentId,
        intent,
        expiresAt: pending.expiresAt
      })
    } catch (err) {
      this._policy.releasePrompt(intentId)
      if (intentJournaled) {
        await this._journalSafe({
          type: 'outcome',
          intentId,
          driveKey: connection.driveKey,
          manifestSha256: connection.manifestSha256,
          state: 'cancelled',
          reason: err && err.code === 'wallet-locked'
            ? 'wallet-lock'
            : err && err.code === 'not-connected' ? 'not-connected' : 'abort'
        })
      }
      throw err
    }
  }

  async requestPayment (tuple, token, paymentInput) {
    this._requireUnlocked()
    const key = this._requireTuple(tuple)
    await this._verifyPageCall(key, token, 'requestPayment')
    const connection = this._connections.assertConnected(key)
    if (!connection.permissions.pay) throw fail('bad-request', `manifest does not declare ${PERMISSION_PAY}`)
    if (!paymentInput || typeof paymentInput !== 'object' || Array.isArray(paymentInput)) {
      throw fail('bad-request', 'payment input must be a record')
    }
    if (paymentInput.chainId !== connection.chainId) throw fail('unsupported-chain', 'chainId is not supported')
    if (paymentInput.assetId !== connection.assetId) throw fail('unsupported-asset', 'assetId is not supported')
    const intent = buildPaymentIntent({
      ...paymentInput,
      driveKey: connection.driveKey,
      manifestSha256: connection.manifestSha256
    })
    const digest = paymentIntentDigest(intent)
    const intentDigest = b4a.toString(digest, 'hex')
    // Spec §8.3: (driveKey, manifestSha256, idempotencyKey) is reserved
    // atomically with the intent append, before any engine work. A retry
    // with the same key and fingerprint returns the reserved intent's
    // current state; the same key with a different fingerprint conflicts.
    const replay = await this._idempotentReplay(connection, intent.idempotencyKey, intentDigest)
    if (replay) return replay
    try {
      return await this._openPrompt('payment', key, intent, {
        intentDigest,
        idempotency: {
          driveKey: connection.driveKey,
          manifestSha256: connection.manifestSha256,
          idempotencyKey: intent.idempotencyKey,
          intentDigest
        }
      })
    } catch (err) {
      // A concurrent same-key request won the reservation race inside the
      // serialized journal append; settle this retry from the winning record.
      if (err && err.code === 'idempotency-conflict' && err.existing) {
        const settled = await this._idempotentReplay(connection, intent.idempotencyKey, intentDigest)
        if (settled) return settled
      }
      throw err
    }
  }

  async _idempotentReplay (connection, idempotencyKey, intentDigest) {
    if (!this._journal || typeof this._journal.lookupIdempotency !== 'function') return null
    const record = await this._journal.lookupIdempotency(
      connection.driveKey,
      connection.manifestSha256,
      idempotencyKey
    )
    if (!record) return null
    if (record.intentDigest !== intentDigest) {
      throw fail('idempotency-conflict', 'idempotencyKey was already used for a different payment')
    }
    return this._intentCurrentState(record.intentId)
  }

  // Idempotent replay: reconstruct the reserved intent's current state
  // without opening a second prompt or touching the engine (spec §8.3). A
  // still-open prompt is returned as-is — the consent broker rejects the
  // duplicate park with wallet-busy, so the retry never raises a second
  // consent modal and the in-flight request keeps sole ownership of it.
  async _intentCurrentState (intentId) {
    const pending = this._pending
    if (pending && pending.intentId === intentId) {
      return Object.freeze({
        type: pending.type,
        intentId,
        intent: pending.intent,
        expiresAt: pending.expiresAt
      })
    }
    const entries = await this._journal.getByIntentId(intentId)
    const intentEntry = entries.find(entry => entry.type === 'intent')
    let state = null
    let code = null
    let transactionHash = null
    for (const entry of entries) {
      if (entry.type === 'rejection') state = 'rejected'
      if (entry.type === 'broadcast' && typeof entry.transactionHash === 'string') {
        transactionHash = entry.transactionHash
        state = 'submitted'
      }
      if (entry.type === 'outcome') {
        if (entry.state === 'error') {
          state = 'failed'
          code = typeof entry.code === 'string' ? entry.code : null
        } else if (typeof entry.state === 'string') {
          state = entry.state
        }
        if (typeof entry.transactionHash === 'string') transactionHash = entry.transactionHash
      }
    }
    if (state === null) {
      // Reserved but never settled (a restart while the prompt was open).
      // The in-memory prompt is gone, so it can never settle: close it out —
      // the reservation stays immutable under its key and a deliberate new
      // attempt needs a new idempotency key (spec §8.3).
      if (entries.some(entry => entry.type === 'approval')) {
        // Approved but never broadcast: the engine outcome is unknowable
        // until reconcile ships; report the uncertain terminal state.
        state = 'uncertain'
      } else {
        state = 'expired'
        await this._journalSafe({
          type: 'outcome',
          intentId,
          driveKey: intentEntry ? intentEntry.driveKey : undefined,
          manifestSha256: intentEntry ? intentEntry.manifestSha256 : undefined,
          state: 'expired',
          reason: 'restart'
        })
      }
    }
    const result = {
      intentId,
      state,
      createdAt: this._iso(intentEntry ? intentEntry.ts : this._now()),
      updatedAt: this._iso(this._now())
    }
    if (code) result.code = code
    if (transactionHash) result.transactionHash = transactionHash
    if (state === 'submitted' && intentEntry && intentEntry.intent) {
      result.chainId = intentEntry.intent.chainId
      result.assetId = intentEntry.intent.assetId
    }
    return Object.freeze(result)
  }

  async signAppPayload (tuple, token, input) {
    this._requireUnlocked()
    const key = this._requireTuple(tuple)
    await this._verifyPageCall(key, token, 'signAppPayload')
    const connection = this._connections.assertConnected(key)
    if (!connection.permissions.signApp) throw fail('bad-request', `manifest does not declare ${PERMISSION_SIGN_APP}`)
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw fail('bad-request', 'app-sign input must be a record')
    }
    const intent = buildAppSignIntent({
      driveKey: connection.driveKey,
      manifestSha256: connection.manifestSha256,
      payloadHash: input.payloadHash
    })
    const digest = appSignIntentDigest(intent)
    return this._openPrompt('sign-app', key, intent, {
      intentDigest: b4a.toString(digest, 'hex')
    })
  }

  // One-shot prompt resolution, driven by browser chrome. Consumes the pending
  // record before touching the engine so retries and races fail closed.
  async resolvePrompt (intentId, approved) {
    this._requireIntentId(intentId)
    this._requireUnlocked()
    const pending = this._pending
    if (!pending || pending.intentId !== intentId) throw fail('not-found', 'no such pending prompt')
    if (this._now() > pending.expiresAt) {
      this._pending = null
      this._policy.releasePrompt(intentId)
      await this._journalSafe({
        type: 'outcome',
        intentId,
        driveKey: pending.driveKey,
        manifestSha256: pending.manifestSha256,
        state: 'expired'
      })
      throw fail('prompt-expired', 'wallet prompt has expired')
    }

    // Consume before engine work.
    this._pending = null
    this._policy.releasePrompt(intentId)
    const base = {
      intentId,
      driveKey: pending.driveKey,
      manifestSha256: pending.manifestSha256
    }
    try {
      this._connections.assertConnected(pending.tuple)
    } catch (err) {
      await this._journalSafe({ type: 'outcome', ...base, state: 'cancelled', reason: 'not-connected' })
      throw err
    }

    if (approved !== true) {
      await this._journalAppend({ type: 'rejection', ...base })
      this._log('resolve-prompt', 'rejected')
      return Object.freeze({
        intentId,
        state: 'rejected',
        createdAt: this._iso(pending.createdAt),
        updatedAt: this._iso(this._now())
      })
    }

    await this._journalAppend({ type: 'approval', ...base, intentDigest: pending.intentDigest })
    this._refreshActivity()
    if (pending.type === 'payment') return this._settlePayment(pending, base)
    return this._settleSignApp(pending, base)
  }

  async _settlePayment (pending, base) {
    const { intent } = pending
    this._policy.checkPayment(pending.driveKey, intent.amountAtomic)
    let transactionHash
    try {
      const prepared = await this._engine.prepareTransfer(intent.recipient, intent.amountAtomic)
      // Enforce the compiled fee ceiling before signing: the worst-case fee
      // of the prepared intent must stay under the manifest ceiling.
      this._policy.checkFee(
        typeof prepared.maxFeeAtomic === 'string' ? prepared.maxFeeAtomic : prepared.estimatedFeeAtomic
      )
      const signed = await this._engine.signPrepared(prepared)
      const broadcast = await this._engine.broadcastSigned(signed)
      transactionHash = broadcast.transactionHash
    } catch (err) {
      const code = typeof err?.code === 'string' ? err.code : 'operation-failed'
      await this._journalSafe({ type: 'outcome', ...base, state: 'error', code })
      this._log('payment', code)
      throw err
    }
    // The payment is on chain: a journal failure past this point must not
    // misreport it as failed — return the hash and let a follow-up reconcile
    // repair the journal.
    try {
      await this._journalAppend({ type: 'broadcast', ...base, transactionHash })
      await this._journalAppend({ type: 'outcome', ...base, transactionHash, state: 'submitted' })
    } catch (journalErr) {
      this._log('payment-journal', journalErr && typeof journalErr.code === 'string' ? journalErr.code : 'failed')
    }
    this._policy.recordPayment(pending.driveKey)
    this._refreshActivity()
    this._log('payment', 'submitted')
    return Object.freeze({
      intentId: pending.intentId,
      state: 'submitted',
      chainId: intent.chainId,
      assetId: intent.assetId,
      transactionHash,
      createdAt: this._iso(pending.createdAt),
      updatedAt: this._iso(this._now())
    })
  }

  async _settleSignApp (pending, base) {
    const { intent } = pending
    try {
      const result = await this._engine.signAppPayload({
        driveKey: intent.driveKey,
        manifestSha256: intent.manifestSha256,
        payloadHash: intent.payloadHash
      })
      // Journal only the digest and address — never the raw signature.
      await this._journalAppend({
        type: 'sign-app',
        ...base,
        digest: b4a.toString(result.digest, 'hex'),
        address: result.address
      })
      this._refreshActivity()
      this._log('sign-app', 'ok')
      return Object.freeze({
        intentId: pending.intentId,
        state: 'signed',
        signature: result.signature,
        address: result.address,
        digest: result.digest,
        createdAt: this._iso(pending.createdAt),
        updatedAt: this._iso(this._now())
      })
    } catch (err) {
      const code = typeof err?.code === 'string' ? err.code : 'operation-failed'
      await this._journalSafe({ type: 'outcome', ...base, state: 'error', code })
      this._log('sign-app', code)
      throw err
    }
  }

  async transaction (tuple, token, intentId) {
    const key = this._requireTuple(tuple)
    await this._verifyPageCall(key, token, 'transaction')
    const connection = this._connections.assertConnected(key)
    this._requireIntentId(intentId)
    if (!this._journal) throw fail('not-found', 'no such intent')
    const entries = await this._journal.getByIntentId(intentId)
    const intentEntry = entries.find(entry => entry.type === 'intent')
    if (
      !intentEntry ||
      intentEntry.driveKey !== connection.driveKey ||
      intentEntry.manifestSha256 !== connection.manifestSha256
    ) {
      throw fail('not-found', 'no such intent')
    }

    let state = 'awaiting_approval'
    let transactionHash = null
    for (const entry of entries) {
      if (entry.type === 'rejection') state = 'denied'
      if (entry.type === 'broadcast' && typeof entry.transactionHash === 'string') {
        transactionHash = entry.transactionHash
        state = 'submitted'
      }
      if (entry.type === 'outcome') {
        if (entry.state === 'error') state = 'failed'
        else if (typeof entry.state === 'string') state = entry.state
        if (typeof entry.transactionHash === 'string') transactionHash = entry.transactionHash
      }
    }

    const result = {
      intentId,
      state,
      updatedAt: this._iso(this._now())
    }
    if (transactionHash) {
      result.transactionHash = transactionHash
      if (this._engine.state === 'ready') {
        const live = await this._engine.getTransaction(transactionHash)
        result.state = live.state
        result.confirmations = live.confirmations
        result.blockNumber = live.blockNumber
      }
    }
    return Object.freeze(result)
  }
}

module.exports = {
  DEFAULT_AUTO_LOCK_MS,
  WALLET_ID,
  WalletService
}
