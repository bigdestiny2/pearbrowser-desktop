'use strict'

// Sliding-window rate limits, amount/fee ceilings and the global single-prompt
// in-flight cap for the wallet service. Pure and in-memory: an injectable
// now() drives every window and expiry check so tests control time.

const STABLE_TESTNET = require('./networks/stable-testnet.cjs')

const HEX64_RE = /^[0-9a-f]{64}$/
const ATOMIC_RE = /^(0|[1-9][0-9]*)$/
const PROMPT_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/

function policyError (code, message) {
  const err = new Error(message || code)
  err.code = code
  return err
}

function requireDriveKey (value) {
  if (typeof value !== 'string' || !HEX64_RE.test(value)) throw policyError('bad-request', 'driveKey is invalid')
  return value
}

function prune (stamps, windowMs, now) {
  while (stamps.length > 0 && now - stamps[0] >= windowMs) stamps.shift()
  return stamps
}

class WalletPolicy {
  constructor (opts = {}) {
    if (opts.now !== undefined && typeof opts.now !== 'function') throw new Error('now must be a function')
    this._now = typeof opts.now === 'function' ? opts.now : Date.now
    this.prepareLimit = opts.prepareLimit ?? 5
    this.prepareWindowMs = opts.prepareWindowMs ?? 60 * 1000
    this.paymentLimit = opts.paymentLimit ?? 20
    this.paymentWindowMs = opts.paymentWindowMs ?? 60 * 60 * 1000
    this.promptTtlMs = opts.promptTtlMs ?? 120 * 1000
    this._prepares = new Map()
    this._payments = new Map()
    this._prompt = null
  }

  // Pruned live stamp list for a drive; empty buckets are dropped so the
  // maps do not grow unboundedly over time.
  _stamps (map, driveKey, windowMs) {
    const stamps = map.get(driveKey)
    if (!stamps) return []
    prune(stamps, windowMs, this._now())
    if (stamps.length === 0) {
      map.delete(driveKey)
      return []
    }
    return stamps
  }

  checkAmount (amountAtomic) {
    if (typeof amountAtomic !== 'string' || !ATOMIC_RE.test(amountAtomic)) {
      throw policyError('bad-request', 'amountAtomic is invalid')
    }
    const amount = BigInt(amountAtomic)
    if (amount === 0n) throw policyError('bad-request', 'amountAtomic must be positive')
    if (amount > BigInt(STABLE_TESTNET.paymentAsset.maxPaymentAtomic)) {
      throw policyError('cap-exceeded', 'amountAtomic exceeds the payment ceiling')
    }
    return amountAtomic
  }

  checkFee (feeAtomic) {
    if (typeof feeAtomic !== 'string' || !ATOMIC_RE.test(feeAtomic)) {
      throw policyError('bad-request', 'feeAtomic is invalid')
    }
    if (BigInt(feeAtomic) > BigInt(STABLE_TESTNET.nativeFeeAsset.maxFeeAtomic)) {
      throw policyError('cap-exceeded', 'feeAtomic exceeds the fee ceiling')
    }
    return feeAtomic
  }

  checkPrepare (driveKey) {
    requireDriveKey(driveKey)
    const stamps = this._stamps(this._prepares, driveKey, this.prepareWindowMs)
    if (stamps.length >= this.prepareLimit) {
      throw policyError('rate-limited', 'payment preparation rate limit reached')
    }
    return true
  }

  recordPrepare (driveKey) {
    requireDriveKey(driveKey)
    const stamps = this._stamps(this._prepares, driveKey, this.prepareWindowMs)
    stamps.push(this._now())
    this._prepares.set(driveKey, stamps)
    return stamps.length
  }

  checkPayment (driveKey, amountAtomic) {
    requireDriveKey(driveKey)
    this.checkAmount(amountAtomic)
    const stamps = this._stamps(this._payments, driveKey, this.paymentWindowMs)
    if (stamps.length >= this.paymentLimit) {
      throw policyError('rate-limited', 'hourly payment limit reached')
    }
    return true
  }

  recordPayment (driveKey) {
    requireDriveKey(driveKey)
    const stamps = this._stamps(this._payments, driveKey, this.paymentWindowMs)
    stamps.push(this._now())
    this._payments.set(driveKey, stamps)
    return stamps.length
  }

  // Global in-flight prompt cap: exactly one prompt may exist at a time.
  acquirePrompt (id) {
    if (typeof id !== 'string' || !PROMPT_ID_RE.test(id)) throw policyError('bad-request', 'prompt id is invalid')
    if (this._prompt) throw policyError('wallet-busy', 'another wallet prompt is already pending')
    const acquiredAt = this._now()
    this._prompt = { id, acquiredAt, expiresAt: acquiredAt + this.promptTtlMs }
    return Object.freeze({ id, expiresAt: this._prompt.expiresAt })
  }

  assertPrompt (id) {
    if (!this._prompt || this._prompt.id !== id) throw policyError('not-found', 'no such pending prompt')
    if (this._now() > this._prompt.expiresAt) throw policyError('prompt-expired', 'wallet prompt has expired')
    return true
  }

  releasePrompt (id) {
    if (this._prompt && this._prompt.id === id) {
      this._prompt = null
      return true
    }
    return false
  }

  get pendingPrompt () {
    if (!this._prompt) return null
    return Object.freeze({ id: this._prompt.id, expiresAt: this._prompt.expiresAt })
  }
}

module.exports = { WalletPolicy }
