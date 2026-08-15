'use strict'

// WalletDocuments — per top-level-document wallet tokens (spec §4.5).
//
// A wallet document token is a 128-bit CSPRNG value minted by the HyperProxy
// ONLY into HTML responses that pass the wallet injection gate, delivered as
// <meta name="pear-wallet-doc">. It is the second credential every wallet
// route requires alongside the general pear-api-token.
//
// Binding model (see docs/WDK_WALLET_V0.9_SPEC.md §4.4 addendum): the current
// architecture has no per-tab loopback listeners, so the strongest available
// binding is ONE LIVE TOKEN PER DRIVE. Minting a token for a drive revokes
// every prior token for that drive (single epoch), so a reload, navigation or
// a second tab loading the same app invalidates the predecessor document's
// wallet authority — fail-closed, never ambiguous. The tuple tab binding
// (tabKeyForDrive) is therefore a per-drive document slot; the connection it
// keys survives a same-drive reload exactly as §4.5 allows.
//
// Tokens live only in memory, are compared constant-time, are never logged,
// and expire after ttlMs (default 30 minutes) at the latest.

const b4a = require('b4a')
const sodium = require('sodium-universal')

const DEFAULT_TTL_MS = 30 * 60 * 1000
const TOKEN_BYTES = 16 // 128-bit
const HEX64_RE = /^[0-9a-f]{64}$/
const TAB_KEY_RE = /^[A-Za-z0-9_-]{1,128}$/

// The wallet connection tuple's tabId (see WalletConnections TAB_ID_RE:
// [A-Za-z0-9_-] only — no separators). One document slot per drive.
function tabKeyForDrive (driveKeyHex) {
  return 'doc-' + String(driveKeyHex || '').toLowerCase()
}

// Length-checked constant-time string compare. Tokens are fixed-size hex, so
// a length mismatch is not secret-dependent.
function constantTimeEqual (a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

class WalletDocuments {
  /**
   * @param {object} [opts]
   * @param {number} [opts.ttlMs] — default 30 minutes
   * @param {Function} [opts.now]
   */
  constructor (opts = {}) {
    if (opts.now !== undefined && typeof opts.now !== 'function') throw new Error('now must be a function')
    this._now = typeof opts.now === 'function' ? opts.now : Date.now
    this._ttlMs = Number.isSafeInteger(opts.ttlMs) && opts.ttlMs > 0 ? opts.ttlMs : DEFAULT_TTL_MS
    this._byDrive = new Map() // driveKeyHex -> { token, driveKeyHex, origin, tabKey, epoch, issuedAt, expiresAt }
    this._epochs = new Map() // driveKeyHex -> epoch counter, swept alongside its token
  }

  get size () {
    this._sweep()
    return this._byDrive.size
  }

  _sweep () {
    const now = this._now()
    for (const [driveKeyHex, record] of this._byDrive) {
      if (now > record.expiresAt) {
        this._byDrive.delete(driveKeyHex)
        // Sweep the epoch alongside its token so the map cannot grow forever.
        this._epochs.delete(driveKeyHex)
      }
    }
  }

  /**
   * Mint a fresh document token for a gated HTML response. Revokes the
   * drive's previous token (single live epoch per drive).
   * @returns {{ token: string, expiresAt: number }}
   */
  issue ({ driveKeyHex, origin, tabKey }) {
    const keyHex = String(driveKeyHex || '').toLowerCase()
    if (!HEX64_RE.test(keyHex)) throw new Error('driveKeyHex is invalid')
    if (typeof origin !== 'string' || origin.length === 0) throw new Error('origin is invalid')
    if (typeof tabKey !== 'string' || !TAB_KEY_RE.test(tabKey)) throw new Error('tabKey is invalid')

    this._sweep()
    this._byDrive.delete(keyHex) // revoke the drive's previous document token
    const epoch = (this._epochs.get(keyHex) || 0) + 1
    this._epochs.set(keyHex, epoch)

    const bytes = b4a.alloc(TOKEN_BYTES)
    sodium.randombytes_buf(bytes)
    const now = this._now()
    this._byDrive.set(keyHex, {
      token: b4a.toString(bytes, 'hex'),
      driveKeyHex: keyHex,
      origin,
      tabKey,
      epoch,
      issuedAt: now,
      expiresAt: now + this._ttlMs
    })
    return { token: this._byDrive.get(keyHex).token, expiresAt: now + this._ttlMs }
  }

  /**
   * Verify a presented token against a wallet connection tuple. Matches the
   * WalletService verifyDocumentToken signature. Fails closed on any
   * mismatch; unknown, stale, cross-drive, cross-origin and cross-tab tokens
   * are indistinguishable.
   * @param {object} args
   * @param {object} args.tuple — { browserSessionId, tabId, driveKey, walletTabOrigin }
   * @param {string} args.token — presented document token
   * @param {string} [args.method] — page-facing method name (informational)
   * @returns {Promise<boolean>}
   */
  async verify ({ tuple, token, method } = {}) {
    void method
    try {
      if (!tuple || typeof tuple !== 'object') return false
      if (typeof token !== 'string' || token.length !== TOKEN_BYTES * 2) return false
      const keyHex = String(tuple.driveKey || '').toLowerCase()
      if (!HEX64_RE.test(keyHex)) return false
      this._sweep()
      const record = this._byDrive.get(keyHex)
      if (!record) return false
      if (this._now() > record.expiresAt) return false
      if (!constantTimeEqual(record.token, token)) return false
      if (record.origin !== tuple.walletTabOrigin) return false
      if (record.tabKey !== tuple.tabId) return false
      return true
    } catch {
      return false
    }
  }

  /** Revoke every live document token for a drive. Returns true if one existed. */
  revokeForDrive (driveKeyHex) {
    this._sweep()
    const keyHex = String(driveKeyHex || '').toLowerCase()
    const removed = this._byDrive.delete(keyHex)
    if (removed) this._epochs.delete(keyHex)
    return removed
  }

  /** Revoke a specific token (constant-time scan). Returns true if found. */
  revoke (token) {
    if (typeof token !== 'string') return false
    this._sweep()
    for (const [driveKeyHex, record] of this._byDrive) {
      if (constantTimeEqual(record.token, token)) {
        this._byDrive.delete(driveKeyHex)
        this._epochs.delete(driveKeyHex)
        return true
      }
    }
    return false
  }
}

module.exports = {
  DEFAULT_TTL_MS,
  TOKEN_BYTES,
  WalletDocuments,
  tabKeyForDrive
}
