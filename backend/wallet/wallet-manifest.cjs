'use strict'

// Validates an app's manifest.json for wallet permissions and reports which
// exact pear.wallet.v1.* permissions it declares. Fail-closed: non-plain
// records, prototype-polluting keys, accessor/symbol keys, unsupported values
// and oversized manifests are rejected with coded errors. Results are cached
// in a small LRU keyed by the manifest's canonical SHA-256.

const b4a = require('b4a')
const { sha256 } = require('@noble/hashes/sha2.js')
const { canonicalizeReleaseData } = require('./canonical-json.cjs')

const PERMISSION_CONNECT = 'pear.wallet.v1.connect'
const PERMISSION_PAY = 'pear.wallet.v1.pay'
const PERMISSION_SIGN_APP = 'pear.wallet.v1.sign-app'
const WALLET_PERMISSIONS = Object.freeze([PERMISSION_CONNECT, PERMISSION_PAY, PERMISSION_SIGN_APP])
const MANIFEST_MAX_BYTES = 64 * 1024
const PERMISSION_MAX_LENGTH = 128
const CACHE_MAX_ENTRIES = 32

const DANGEROUS_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype'])

const cache = new Map()

function manifestError (code, message) {
  const err = new Error(message || code)
  err.code = code
  return err
}

function isPlainRecord (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function scanDangerousKeys (value) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) scanDangerousKeys(item)
    return
  }
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.includes(key)) {
      throw manifestError('bad-request', 'manifest contains a forbidden key')
    }
    scanDangerousKeys(value[key])
  }
}

function cacheGet (manifestSha256) {
  const hit = cache.get(manifestSha256)
  if (!hit) return null
  cache.delete(manifestSha256)
  cache.set(manifestSha256, hit)
  return hit
}

function cacheSet (manifestSha256, result) {
  cache.set(manifestSha256, result)
  while (cache.size > CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value)
  }
}

function validateWalletManifest (manifest) {
  if (!isPlainRecord(manifest)) throw manifestError('bad-request', 'manifest must be a plain record')
  scanDangerousKeys(manifest)
  let canonical
  try {
    canonical = canonicalizeReleaseData(manifest)
  } catch {
    throw manifestError('bad-request', 'manifest is not canonical release data')
  }
  if (b4a.byteLength(canonical, 'utf8') > MANIFEST_MAX_BYTES) {
    throw manifestError('bad-request', 'manifest exceeds its size limit')
  }
  const manifestSha256 = b4a.toString(sha256(b4a.from(canonical, 'utf8')), 'hex')
  const cached = cacheGet(manifestSha256)
  if (cached) return cached

  let permissions = []
  if (manifest.permissions !== undefined) {
    if (!Array.isArray(manifest.permissions)) throw manifestError('bad-request', 'manifest permissions must be an array')
    for (const permission of manifest.permissions) {
      if (typeof permission !== 'string' || permission.length === 0 || permission.length > PERMISSION_MAX_LENGTH) {
        throw manifestError('bad-request', 'manifest permission entries are invalid')
      }
    }
    permissions = manifest.permissions
  }

  const result = Object.freeze({
    connect: permissions.includes(PERMISSION_CONNECT),
    pay: permissions.includes(PERMISSION_PAY),
    signApp: permissions.includes(PERMISSION_SIGN_APP),
    manifestSha256
  })
  cacheSet(manifestSha256, result)
  return result
}

module.exports = {
  MANIFEST_MAX_BYTES,
  PERMISSION_CONNECT,
  PERMISSION_PAY,
  PERMISSION_SIGN_APP,
  WALLET_PERMISSIONS,
  validateWalletManifest
}
