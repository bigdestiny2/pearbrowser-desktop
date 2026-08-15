'use strict'

// Scoped app attestation digests. The wallet never signs raw app payloads or
// generic messages; it only signs this fixed-shape canonical digest, so a
// signature can never alias transaction data or another protocol's message.

const b4a = require('b4a')
const { sha256 } = require('@noble/hashes/sha2.js')
const { canonicalizeReleaseData } = require('./canonical-json.cjs')

const APP_PAYLOAD_SCHEME = 'pb-app-sig-v1'
const APP_PAYLOAD_KEYS = Object.freeze(['driveKey', 'manifestSha256', 'payloadHash'])
const HEX_32_PATTERN = /^[0-9a-f]{64}$/

function requireHex32 (value, label) {
  if (typeof value !== 'string' || !HEX_32_PATTERN.test(value)) throw new Error(`${label} is invalid`)
  return value
}

function appPayloadDigest (input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('app payload input must be a record')
  }
  const proto = Object.getPrototypeOf(input)
  if (proto !== Object.prototype && proto !== null) throw new Error('app payload input must be a plain record')
  const keys = Reflect.ownKeys(input)
  if (keys.length !== APP_PAYLOAD_KEYS.length || APP_PAYLOAD_KEYS.some(key => !keys.includes(key))) {
    throw new Error('app payload input has an invalid schema')
  }
  const digest = sha256(b4a.from(canonicalizeReleaseData({
    scheme: APP_PAYLOAD_SCHEME,
    driveKey: requireHex32(input.driveKey, 'driveKey'),
    manifestSha256: requireHex32(input.manifestSha256, 'manifestSha256'),
    payloadHash: requireHex32(input.payloadHash, 'payloadHash')
  }), 'utf8'))
  return b4a.from(digest)
}

module.exports = {
  APP_PAYLOAD_SCHEME,
  appPayloadDigest
}
