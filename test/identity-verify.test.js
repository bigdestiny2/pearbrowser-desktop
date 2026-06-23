// Contract test for the Phase-P0 Ed25519 verifier (backend/identity.js
// verify() / verifyForApp()).
//
// backend/identity.js requires bare-fs/bare-path/bare-crypto (Bare-only), so
// it cannot be imported under Node. Instead we mirror its verify() and
// verifyForApp() here EXACTLY and exercise them against real ed25519 from
// sodium-universal — locking the algorithm and the `pear.app.<driveKey>:<ns>:`
// domain-separator tag (signForApp():264). If identity.js's tag or verify
// logic changes, this test must change with it.
import test from 'node:test'
import assert from 'node:assert/strict'
import sodium from 'sodium-universal'
import b4a from 'b4a'

// --- mirror of backend/identity.js verify()/verifyForApp() -----------------
function verify (payload, signatureHex, publicKeyHex) {
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
function verifyForApp (driveKeyHex, payload, namespace = '', signed = {}) {
  const tag = `pear.app.${driveKeyHex}:${namespace}:`
  const message = b4a.concat([
    b4a.from(tag, 'utf-8'),
    typeof payload === 'string' ? b4a.from(payload, 'utf-8') : b4a.from(payload || []),
  ])
  return verify(message, signed.signature, signed.publicKey)
}

// --- mirror of signForApp()/sign() so the test can mint real signatures ----
function keypairFromSeed (seedHex) {
  const seed = b4a.from(seedHex, 'hex')
  const publicKey = b4a.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  const secretKey = b4a.alloc(sodium.crypto_sign_SECRETKEYBYTES)
  sodium.crypto_sign_seed_keypair(publicKey, secretKey, seed)
  return { publicKey: b4a.toString(publicKey, 'hex'), secretKey }
}
function signRaw (payload, secretKey) {
  const message = typeof payload === 'string' ? b4a.from(payload, 'utf-8') : payload
  const signature = b4a.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(signature, message, secretKey)
  return b4a.toString(signature, 'hex')
}
function signApp (driveKeyHex, payload, namespace, secretKey) {
  const tag = `pear.app.${driveKeyHex}:${namespace}:`
  const message = b4a.concat([b4a.from(tag, 'utf-8'), b4a.from(payload, 'utf-8')])
  return signRaw(message, secretKey)
}

const SEED = 'a'.repeat(64)
const DRIVE = '0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75'

test('verify(): valid signature round-trips', () => {
  const kp = keypairFromSeed(SEED)
  const sig = signRaw('hello world', kp.secretKey)
  assert.equal(verify('hello world', sig, kp.publicKey), true)
})

test('verify(): tampered payload fails', () => {
  const kp = keypairFromSeed(SEED)
  const sig = signRaw('hello world', kp.secretKey)
  assert.equal(verify('hello w0rld', sig, kp.publicKey), false)
})

test('verify(): wrong public key fails', () => {
  const kp = keypairFromSeed(SEED)
  const other = keypairFromSeed('b'.repeat(64))
  const sig = signRaw('hello world', kp.secretKey)
  assert.equal(verify('hello world', sig, other.publicKey), false)
})

test('verify(): malformed/empty input fails closed (no throw)', () => {
  const kp = keypairFromSeed(SEED)
  assert.equal(verify('hi', 'not-hex', kp.publicKey), false)
  assert.equal(verify('hi', 'abcd', kp.publicKey), false)       // wrong length
  assert.equal(verify('hi', signRaw('hi', kp.secretKey), 'zz'), false)
  assert.equal(verify('', signRaw('x', kp.secretKey), kp.publicKey), false) // empty payload
})

test('verifyForApp(): tag round-trips', () => {
  const kp = keypairFromSeed(SEED)
  const sig = signApp(DRIVE, 'order-42', 'pos', kp.secretKey)
  assert.equal(verifyForApp(DRIVE, 'order-42', 'pos', { signature: sig, publicKey: kp.publicKey }), true)
})

test('verifyForApp(): cross-app / cross-namespace replay fails (tag mismatch)', () => {
  const kp = keypairFromSeed(SEED)
  const sig = signApp(DRIVE, 'order-42', 'pos', kp.secretKey)
  // same sig, different driveKey → reconstructed tag differs → reject
  assert.equal(verifyForApp('f'.repeat(64), 'order-42', 'pos', { signature: sig, publicKey: kp.publicKey }), false)
  // same sig, different namespace → reject
  assert.equal(verifyForApp(DRIVE, 'order-42', 'login', { signature: sig, publicKey: kp.publicKey }), false)
  // tampered payload → reject
  assert.equal(verifyForApp(DRIVE, 'order-43', 'pos', { signature: sig, publicKey: kp.publicKey }), false)
})
