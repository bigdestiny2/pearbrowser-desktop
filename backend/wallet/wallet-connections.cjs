'use strict'

// Session-scoped wallet connections keyed by (browserSessionId, tabId,
// driveKey) and bound to the tab's exclusive loopback origin plus the exact
// manifest fingerprint, chain and asset granted at consent time. Device-local
// and in-memory only; a connection ends on disconnect, tab close, session
// shutdown or wallet lock. No secrets are ever stored here.

const STABLE_TESTNET = require('./networks/stable-testnet.cjs')

const HEX64_RE = /^[0-9a-f]{64}$/
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,128}$/
const TAB_ID_RE = /^[A-Za-z0-9_-]{1,128}$/
const LOOPBACK_ORIGIN_RE = /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/

function connectionError (code, message) {
  const err = new Error(message || code)
  err.code = code
  return err
}

function requireTupleKey (tuple) {
  if (!tuple || typeof tuple !== 'object' || Array.isArray(tuple)) {
    throw connectionError('bad-request', 'connection tuple must be a record')
  }
  const { browserSessionId, tabId, driveKey } = tuple
  if (typeof browserSessionId !== 'string' || !SESSION_ID_RE.test(browserSessionId)) {
    throw connectionError('bad-request', 'browserSessionId is invalid')
  }
  if (typeof tabId !== 'string' || !TAB_ID_RE.test(tabId)) {
    throw connectionError('bad-request', 'tabId is invalid')
  }
  if (typeof driveKey !== 'string' || !HEX64_RE.test(driveKey)) {
    throw connectionError('bad-request', 'driveKey is invalid')
  }
  return { browserSessionId, tabId, driveKey }
}

function keyOf ({ browserSessionId, tabId, driveKey }) {
  return browserSessionId + ' ' + tabId + ' ' + driveKey
}

function requirePermissions (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw connectionError('bad-request', 'permissions must be a record')
  }
  return {
    connect: value.connect === true,
    pay: value.pay === true,
    signApp: value.signApp === true
  }
}

class WalletConnections {
  constructor (opts = {}) {
    if (opts.now !== undefined && typeof opts.now !== 'function') throw new Error('now must be a function')
    this._now = typeof opts.now === 'function' ? opts.now : Date.now
    this._connections = new Map()
  }

  _summary (record) {
    return Object.freeze({
      browserSessionId: record.browserSessionId,
      tabId: record.tabId,
      driveKey: record.driveKey,
      walletTabOrigin: record.walletTabOrigin,
      manifestSha256: record.manifestSha256,
      chainId: record.chainId,
      assetId: record.assetId,
      permissions: Object.freeze({ ...record.permissions }),
      connectedAt: record.connectedAt
    })
  }

  // Idempotent per tuple: an identical repeated connect returns the existing
  // record; any binding change (origin, manifest, chain, asset, permissions)
  // replaces it with a fresh record.
  connect (tuple) {
    const key = requireTupleKey(tuple)
    const { walletTabOrigin, manifestSha256, chainId, assetId } = tuple
    if (typeof walletTabOrigin !== 'string' || walletTabOrigin.length > 128 || !LOOPBACK_ORIGIN_RE.test(walletTabOrigin)) {
      throw connectionError('bad-request', 'walletTabOrigin is invalid')
    }
    if (typeof manifestSha256 !== 'string' || !HEX64_RE.test(manifestSha256)) {
      throw connectionError('bad-request', 'manifestSha256 is invalid')
    }
    if (chainId !== STABLE_TESTNET.chain.caip2) throw connectionError('unsupported-chain', 'chainId is not supported')
    if (assetId !== STABLE_TESTNET.paymentAsset.id) throw connectionError('unsupported-asset', 'assetId is not supported')
    // Fail closed: omitted permissions grant nothing. Callers (the wallet
    // service) always pass the explicit manifest-derived grants.
    const permissions = requirePermissions(tuple.permissions || { connect: false, pay: false, signApp: false })

    const mapKey = keyOf(key)
    const existing = this._connections.get(mapKey)
    if (
      existing &&
      existing.walletTabOrigin === walletTabOrigin &&
      existing.manifestSha256 === manifestSha256 &&
      existing.chainId === chainId &&
      existing.assetId === assetId &&
      existing.permissions.connect === permissions.connect &&
      existing.permissions.pay === permissions.pay &&
      existing.permissions.signApp === permissions.signApp
    ) {
      return this._summary(existing)
    }
    const record = {
      ...key,
      walletTabOrigin,
      manifestSha256,
      chainId,
      assetId,
      permissions,
      connectedAt: this._now()
    }
    this._connections.set(mapKey, record)
    return this._summary(record)
  }

  _lookup (tuple) {
    const key = requireTupleKey(tuple)
    const record = this._connections.get(keyOf(key))
    if (!record) throw connectionError('not-connected', 'app is not connected to the wallet')
    return record
  }

  assertConnected (tuple) {
    return this._summary(this._lookup(tuple))
  }

  isConnected (tuple) {
    try {
      this._lookup(tuple)
      return true
    } catch {
      return false
    }
  }

  disconnect (tuple) {
    const key = requireTupleKey(tuple)
    if (!this._connections.delete(keyOf(key))) {
      throw connectionError('not-connected', 'app is not connected to the wallet')
    }
    return Object.freeze({ disconnected: true, ...key })
  }

  revokeTab (browserSessionId, tabId) {
    let removed = 0
    for (const [mapKey, record] of this._connections) {
      if (record.browserSessionId === browserSessionId && record.tabId === tabId) {
        this._connections.delete(mapKey)
        removed++
      }
    }
    return removed
  }

  revokeSession (browserSessionId) {
    let removed = 0
    for (const [mapKey, record] of this._connections) {
      if (record.browserSessionId === browserSessionId) {
        this._connections.delete(mapKey)
        removed++
      }
    }
    return removed
  }

  revokeAll () {
    const removed = this._connections.size
    this._connections.clear()
    return removed
  }

  list () {
    return Object.freeze([...this._connections.values()].map(record => this._summary(record)))
  }
}

module.exports = { WalletConnections }
