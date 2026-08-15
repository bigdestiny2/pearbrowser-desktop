import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  PAYMENT_INTENT_SCHEME,
  buildAppSignIntent,
  buildPaymentIntent,
  appSignIntentDigest,
  paymentIntentDigest
} = require('../backend/wallet/canonical-intent.cjs')
const { APP_PAYLOAD_SCHEME, appPayloadDigest } = require('../backend/wallet/app-payload.cjs')
const STABLE_TESTNET = require('../backend/wallet/networks/stable-testnet.cjs')

const DRIVE_KEY = 'ab'.repeat(32)
const MANIFEST_SHA256 = 'cd'.repeat(32)
const PAYLOAD_HASH = 'ef'.repeat(32)
const RECIPIENT = '0x1111111111111111111111111111111111111111'

function validInput (overrides = {}) {
  return {
    driveKey: DRIVE_KEY,
    manifestSha256: MANIFEST_SHA256,
    chainId: 'eip155:2201',
    assetId: 'stable-testnet-usdt0',
    recipient: RECIPIENT,
    amountAtomic: '1250000',
    reference: 'order-1842',
    idempotencyKey: 'checkout:order-1842:attempt-1',
    ...overrides
  }
}

function codeOf (fn) {
  try {
    fn()
  } catch (err) {
    return err.code
  }
  throw new Error('expected the call to throw')
}

test('buildPaymentIntent returns a frozen canonical record', () => {
  const intent = buildPaymentIntent(validInput())
  assert.equal(Object.isFrozen(intent), true)
  assert.deepEqual(Object.keys(intent).sort(), [
    'amountAtomic',
    'assetId',
    'chainId',
    'driveKey',
    'idempotencyKey',
    'manifestSha256',
    'recipient',
    'reference',
    'scheme',
    'v'
  ])
  assert.equal(intent.scheme, PAYMENT_INTENT_SCHEME)
  assert.equal(intent.v, 1)
  assert.equal(intent.chainId, STABLE_TESTNET.chain.caip2)
  assert.equal(intent.assetId, STABLE_TESTNET.paymentAsset.id)
})

test('reference is optional and NFC-normalized', () => {
  const input = validInput()
  delete input.reference
  const intent = buildPaymentIntent(input)
  assert.equal(intent.reference, null)
  const decomposed = buildPaymentIntent(validInput({ reference: 'Café' }))
  assert.equal(decomposed.reference, 'Café')
})

test('paymentIntentDigest is deterministic and a 32-byte buffer', () => {
  const a = paymentIntentDigest(buildPaymentIntent(validInput()))
  const b = paymentIntentDigest(buildPaymentIntent(validInput()))
  assert.equal(a.length, 32)
  assert.deepEqual(a, b)
  const mutated = paymentIntentDigest(buildPaymentIntent(validInput({ amountAtomic: '1250001' })))
  assert.notDeepEqual(a, mutated)
})

test('paymentIntentDigest re-validates its input', () => {
  assert.equal(codeOf(() => paymentIntentDigest({ scheme: PAYMENT_INTENT_SCHEME })), 'bad-request')
  assert.equal(codeOf(() => paymentIntentDigest(validInput())), 'bad-request') // missing scheme/v keys
})

test('chainId and assetId must match the frozen manifest exactly', () => {
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ chainId: 'eip155:1' }))), 'unsupported-chain')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ chainId: 'EIP155:2201' }))), 'unsupported-chain')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ assetId: 'stable-testnet-native-usdt0' }))), 'unsupported-asset')
})

test('recipient must be a non-zero EVM address', () => {
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ recipient: '0x1234' }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ recipient: '0x' + '00'.repeat(20) }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ recipient: RECIPIENT.toUpperCase() }))), 'bad-request') // 0X prefix rejected
  assert.equal(buildPaymentIntent(validInput({ recipient: '0x' + 'A1'.repeat(20) })).recipient, '0x' + 'A1'.repeat(20)) // checksummed hex ok
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ recipient: 42 }))), 'bad-request')
})

test('amountAtomic is a strict positive decimal-string integer at most maxPaymentAtomic', () => {
  for (const bad of ['01', '1.0', '1e6', '+1', ' 1', '1 ', '-5', '', '0', 100, '0x10']) {
    assert.equal(codeOf(() => buildPaymentIntent(validInput({ amountAtomic: bad }))), 'bad-request', String(bad))
  }
  const cap = STABLE_TESTNET.paymentAsset.maxPaymentAtomic
  assert.equal(buildPaymentIntent(validInput({ amountAtomic: cap })).amountAtomic, cap)
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ amountAtomic: (BigInt(cap) + 1n).toString() }))), 'cap-exceeded')
})

test('reference is display-only, control-free and at most 140 UTF-8 bytes', () => {
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ reference: 'a'.repeat(141) }))), 'bad-request')
  assert.equal(buildPaymentIntent(validInput({ reference: '₮'.repeat(46) })).reference.length, 46) // 138 bytes ok
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ reference: '₮'.repeat(47) }))), 'bad-request') // 141 bytes
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ reference: 'line\nbreak' }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ reference: 'bell\u0007' }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ reference: 5 }))), 'bad-request')
})

test('reference rejects Unicode format characters (Cf) but keeps normal text', () => {
  // Bidi overrides/embeddings and zero-width characters could spoof the
  // consent modal display.
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ reference: 'pay\u202Eed' }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ reference: 'a\u202Ab' }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ reference: 'in\u200Bvisible' }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ reference: 'soft\u00ADhyphen' }))), 'bad-request')
  // Normal text, including non-ASCII letters, stays accepted.
  assert.equal(buildPaymentIntent(validInput({ reference: 'café 日本語 ₮' })).reference, 'café 日本語 ₮')
})

test('idempotencyKey is 16-128 chars of a safe charset', () => {
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ idempotencyKey: 'short' }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ idempotencyKey: 'a'.repeat(129) }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ idempotencyKey: 'has space inside!' }))), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ idempotencyKey: 'emoji-🔥-key-0000' }))), 'bad-request')
  assert.equal(buildPaymentIntent(validInput({ idempotencyKey: 'a' .repeat(128) })).idempotencyKey.length, 128)
})

test('unknown or missing fields are rejected', () => {
  assert.equal(codeOf(() => buildPaymentIntent(validInput({ memo: 'x' }))), 'bad-request')
  const missing = validInput()
  delete missing.recipient
  assert.equal(codeOf(() => buildPaymentIntent(missing)), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent(null)), 'bad-request')
  assert.equal(codeOf(() => buildPaymentIntent([])), 'bad-request')
})

test('buildAppSignIntent wraps the app-payload scheme and digest', () => {
  const intent = buildAppSignIntent({ driveKey: DRIVE_KEY, manifestSha256: MANIFEST_SHA256, payloadHash: PAYLOAD_HASH })
  assert.equal(Object.isFrozen(intent), true)
  assert.equal(intent.scheme, APP_PAYLOAD_SCHEME)
  const digest = appSignIntentDigest(intent)
  assert.deepEqual(digest, appPayloadDigest({ driveKey: DRIVE_KEY, manifestSha256: MANIFEST_SHA256, payloadHash: PAYLOAD_HASH }))
  assert.equal(codeOf(() => buildAppSignIntent({ driveKey: 'zz', manifestSha256: MANIFEST_SHA256, payloadHash: PAYLOAD_HASH })), 'bad-request')
  assert.equal(codeOf(() => buildAppSignIntent({ driveKey: DRIVE_KEY, manifestSha256: MANIFEST_SHA256 })), 'bad-request')
})
