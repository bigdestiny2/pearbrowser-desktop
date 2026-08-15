'use strict'

// Canonical payment and app-sign intents. The backend builds and hashes these
// exact plain records before any chrome prompt; the approval, journal and
// idempotency layers only ever see this fixed projection. Every validator
// fails closed with a coded error (err.code) and never coerces its input.

const b4a = require('b4a')
const { sha256 } = require('@noble/hashes/sha2.js')
const { canonicalizeReleaseData } = require('./canonical-json.cjs')
const { APP_PAYLOAD_SCHEME, appPayloadDigest } = require('./app-payload.cjs')
const STABLE_TESTNET = require('./networks/stable-testnet.cjs')

const PAYMENT_INTENT_SCHEME = 'pb-pay-v1'
const PAYMENT_INTENT_KEYS = Object.freeze([
  'scheme',
  'v',
  'driveKey',
  'manifestSha256',
  'chainId',
  'assetId',
  'recipient',
  'amountAtomic',
  'reference',
  'idempotencyKey'
])
const PAYMENT_INPUT_REQUIRED_KEYS = Object.freeze([
  'driveKey',
  'manifestSha256',
  'chainId',
  'assetId',
  'recipient',
  'amountAtomic',
  'idempotencyKey'
])
const APP_SIGN_INTENT_KEYS = Object.freeze(['scheme', 'driveKey', 'manifestSha256', 'payloadHash'])
const HEX64_RE = /^[0-9a-f]{64}$/
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const ATOMIC_RE = /^(0|[1-9][0-9]*)$/
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9._:-]{16,128}$/
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const REFERENCE_MAX_BYTES = 140

function intentError (code, message) {
  const err = new Error(message || code)
  err.code = code
  return err
}

function requirePlainRecord (value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw intentError('bad-request', `${label} must be a record`)
  }
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) {
    throw intentError('bad-request', `${label} must be a plain record`)
  }
}

function requireExactKeys (value, required, optional, label) {
  requirePlainRecord(value, label)
  const keys = Reflect.ownKeys(value)
  if (keys.some(key => typeof key !== 'string')) throw intentError('bad-request', `${label} has unsupported keys`)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !('value' in descriptor) || descriptor.get || descriptor.set) {
      throw intentError('bad-request', `${label} has unsupported accessors`)
    }
    if (!required.includes(key) && !optional.includes(key)) {
      throw intentError('bad-request', `${label} has an unknown field`)
    }
  }
  for (const key of required) {
    if (!keys.includes(key)) throw intentError('bad-request', `${label} is missing ${key}`)
  }
}

function requireHex64 (value, label) {
  if (typeof value !== 'string' || !HEX64_RE.test(value)) throw intentError('bad-request', `${label} is invalid`)
  return value
}

function requireChainId (value) {
  if (value !== STABLE_TESTNET.chain.caip2) throw intentError('unsupported-chain', 'chainId is not supported')
  return value
}

function requireAssetId (value) {
  if (value !== STABLE_TESTNET.paymentAsset.id) throw intentError('unsupported-asset', 'assetId is not supported')
  return value
}

function requireRecipient (value) {
  if (typeof value !== 'string' || !ADDRESS_RE.test(value) || value.toLowerCase() === ZERO_ADDRESS) {
    throw intentError('bad-request', 'recipient is invalid')
  }
  return value
}

function requireAmountAtomic (value) {
  if (typeof value !== 'string' || !ATOMIC_RE.test(value)) throw intentError('bad-request', 'amountAtomic is invalid')
  const amount = BigInt(value)
  if (amount === 0n) throw intentError('bad-request', 'amountAtomic must be positive')
  if (amount > BigInt(STABLE_TESTNET.paymentAsset.maxPaymentAtomic)) {
    throw intentError('cap-exceeded', 'amountAtomic exceeds the payment ceiling')
  }
  return value
}

// Display-only, never on chain: NFC-normalized UTF-8, C0/C1 controls and
// Unicode format characters (Cf — bidi overrides, zero-width joiners/spaces,
// soft hyphens, …) rejected to keep the consent modal spoof-free, bounded to
// 140 bytes.
const FORMAT_CHAR_RE = /\p{Cf}/u
function requireReference (value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw intentError('bad-request', 'reference must be a string')
  const normalized = value.normalize('NFC')
  for (const character of normalized) {
    const codePoint = character.codePointAt(0)
    if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      throw intentError('bad-request', 'reference contains control characters')
    }
  }
  if (FORMAT_CHAR_RE.test(normalized)) {
    throw intentError('bad-request', 'reference contains format characters')
  }
  if (b4a.byteLength(normalized, 'utf8') > REFERENCE_MAX_BYTES) {
    throw intentError('bad-request', 'reference exceeds 140 bytes')
  }
  return normalized
}

function requireIdempotencyKey (value) {
  if (typeof value !== 'string' || !IDEMPOTENCY_KEY_RE.test(value)) {
    throw intentError('bad-request', 'idempotencyKey is invalid')
  }
  return value
}

function buildPaymentIntent (input = {}) {
  requireExactKeys(input, PAYMENT_INPUT_REQUIRED_KEYS, ['reference'], 'payment input')
  const intent = {
    scheme: PAYMENT_INTENT_SCHEME,
    v: 1,
    driveKey: requireHex64(input.driveKey, 'driveKey'),
    manifestSha256: requireHex64(input.manifestSha256, 'manifestSha256'),
    chainId: requireChainId(input.chainId),
    assetId: requireAssetId(input.assetId),
    recipient: requireRecipient(input.recipient),
    amountAtomic: requireAmountAtomic(input.amountAtomic),
    reference: requireReference(input.reference),
    idempotencyKey: requireIdempotencyKey(input.idempotencyKey)
  }
  return Object.freeze(intent)
}

function validatePaymentIntent (value) {
  requireExactKeys(value, PAYMENT_INTENT_KEYS, [], 'payment intent')
  if (value.scheme !== PAYMENT_INTENT_SCHEME) throw intentError('bad-request', 'payment intent scheme is invalid')
  if (value.v !== 1) throw intentError('bad-request', 'payment intent version is invalid')
  return Object.freeze({
    scheme: PAYMENT_INTENT_SCHEME,
    v: 1,
    driveKey: requireHex64(value.driveKey, 'driveKey'),
    manifestSha256: requireHex64(value.manifestSha256, 'manifestSha256'),
    chainId: requireChainId(value.chainId),
    assetId: requireAssetId(value.assetId),
    recipient: requireRecipient(value.recipient),
    amountAtomic: requireAmountAtomic(value.amountAtomic),
    reference: requireReference(value.reference),
    idempotencyKey: requireIdempotencyKey(value.idempotencyKey)
  })
}

function paymentIntentDigest (intent) {
  const validated = validatePaymentIntent(intent)
  return b4a.from(sha256(b4a.from(canonicalizeReleaseData(validated), 'utf8')))
}

function buildAppSignIntent (input = {}) {
  requireExactKeys(input, ['driveKey', 'manifestSha256', 'payloadHash'], [], 'app-sign input')
  return Object.freeze({
    scheme: APP_PAYLOAD_SCHEME,
    driveKey: requireHex64(input.driveKey, 'driveKey'),
    manifestSha256: requireHex64(input.manifestSha256, 'manifestSha256'),
    payloadHash: requireHex64(input.payloadHash, 'payloadHash')
  })
}

function appSignIntentDigest (intent) {
  requireExactKeys(intent, APP_SIGN_INTENT_KEYS, [], 'app-sign intent')
  if (intent.scheme !== APP_PAYLOAD_SCHEME) throw intentError('bad-request', 'app-sign intent scheme is invalid')
  return appPayloadDigest({
    driveKey: intent.driveKey,
    manifestSha256: intent.manifestSha256,
    payloadHash: intent.payloadHash
  })
}

module.exports = {
  APP_SIGN_INTENT_KEYS,
  PAYMENT_INPUT_REQUIRED_KEYS,
  PAYMENT_INTENT_KEYS,
  PAYMENT_INTENT_SCHEME,
  REFERENCE_MAX_BYTES,
  appSignIntentDigest,
  buildAppSignIntent,
  buildPaymentIntent,
  paymentIntentDigest,
  validatePaymentIntent
}
