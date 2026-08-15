import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  MANIFEST_MAX_BYTES,
  validateWalletManifest
} = require('../backend/wallet/wallet-manifest.cjs')
const { canonicalizeReleaseData } = require('../backend/wallet/canonical-json.cjs')
const { sha256 } = require('@noble/hashes/sha2.js')

function manifest (permissions, extra = {}) {
  return {
    name: 'Example test checkout',
    entry: '/index.html',
    ...(permissions !== undefined ? { permissions } : {}),
    ...extra
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

test('exact wallet permission strings map to grants', () => {
  const result = validateWalletManifest(manifest(['pear.wallet.v1.connect', 'pear.wallet.v1.pay', 'pear.wallet.v1.sign-app']))
  assert.equal(result.connect, true)
  assert.equal(result.pay, true)
  assert.equal(result.signApp, true)
  assert.match(result.manifestSha256, /^[0-9a-f]{64}$/)
  assert.equal(Object.isFrozen(result), true)
})

test('manifestSha256 is the SHA-256 of the canonical manifest', () => {
  const value = manifest(['pear.wallet.v1.connect'])
  const expected = Buffer.from(sha256(Buffer.from(canonicalizeReleaseData(value), 'utf8'))).toString('hex')
  assert.equal(validateWalletManifest(value).manifestSha256, expected)
})

test('missing or partial permissions report false grants without throwing', () => {
  assert.deepEqual(validateWalletManifest(manifest(undefined)), { connect: false, pay: false, signApp: false, manifestSha256: validateWalletManifest(manifest(undefined)).manifestSha256 })
  const partial = validateWalletManifest(manifest(['pear.wallet.v1.connect', 'pear.wallet.v1.pay']))
  assert.equal(partial.connect, true)
  assert.equal(partial.pay, true)
  assert.equal(partial.signApp, false)
})

test('unknown permission strings are ignored', () => {
  const result = validateWalletManifest(manifest(['pear.other.v2.admin', 'pear.wallet.v1.pays']))
  assert.equal(result.connect, false)
  assert.equal(result.pay, false)
  assert.equal(result.signApp, false)
})

test('permissions must be an array of bounded strings', () => {
  assert.equal(codeOf(() => validateWalletManifest(manifest('pear.wallet.v1.pay'))), 'bad-request')
  assert.equal(codeOf(() => validateWalletManifest(manifest([42]))), 'bad-request')
  assert.equal(codeOf(() => validateWalletManifest(manifest(['x'.repeat(129)]))), 'bad-request')
})

test('prototype-polluting keys are rejected at any depth', () => {
  assert.equal(codeOf(() => validateWalletManifest(JSON.parse('{"__proto__": {"polluted": true}}'))), 'bad-request')
  assert.equal(codeOf(() => validateWalletManifest(JSON.parse('{"nested": {"constructor": {}}}'))), 'bad-request')
  assert.equal(codeOf(() => validateWalletManifest(JSON.parse('{"a": [{"prototype": {}}]}'))), 'bad-request')
})

test('non-plain and oversized manifests are rejected', () => {
  assert.equal(codeOf(() => validateWalletManifest(null)), 'bad-request')
  assert.equal(codeOf(() => validateWalletManifest([])), 'bad-request')
  assert.equal(codeOf(() => validateWalletManifest('{}')), 'bad-request')
  const oversized = manifest(['pear.wallet.v1.pay'], { blob: 'x'.repeat(MANIFEST_MAX_BYTES) })
  assert.equal(codeOf(() => validateWalletManifest(oversized)), 'bad-request')
})

test('results are cached by manifestSha256', () => {
  const value = manifest(['pear.wallet.v1.connect'], { tag: 'cache-check' })
  const first = validateWalletManifest(value)
  const clone = JSON.parse(JSON.stringify(value))
  const second = validateWalletManifest(clone)
  assert.equal(first, second) // identical cached record for an equal manifest
})
