// Tests for backend/capability-verify.cjs — re-verification of a relay's signed
// capability doc at the consumption boundary (I2). Signs docs exactly as the
// relay's capability-doc.js does (canonical payload + sodium ed25519), so these
// lock the desktop verifier to the relay's signing scheme.
import test from 'node:test'
import assert from 'node:assert/strict'
import sodium from 'sodium-universal'
import b4a from 'b4a'
import cvMod from '../backend/capability-verify.cjs'
const { verifyCapabilityDoc, canonicalSignablePayload, SIGNATURE_VERSION } = cvMod

function keypair () {
  const pk = b4a.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  const sk = b4a.alloc(sodium.crypto_sign_SECRETKEYBYTES)
  sodium.crypto_sign_keypair(pk, sk)
  return { pk, sk }
}
// mirror the relay's buildCapabilityDoc signing
function signDoc (fields, kp) {
  const doc = { ...fields, pubkey: b4a.toString(kp.pk, 'hex') }
  const sig = b4a.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(sig, canonicalSignablePayload(doc), kp.sk)
  doc.signature = { v: SIGNATURE_VERSION, sig: b4a.toString(sig, 'hex') }
  return doc
}

test('a relay-signed capability doc verifies', () => {
  const doc = signDoc({ schemaVersion: 1, gatewayUrl: 'https://r.example', region: 'eu', features: ['pin', 'index'] }, keypair())
  assert.equal(verifyCapabilityDoc(doc), true)
})

test('a tampered field fails (the signature covers every field)', () => {
  const kp = keypair()
  const doc = signDoc({ schemaVersion: 1, gatewayUrl: 'https://r.example' }, kp)
  assert.equal(verifyCapabilityDoc({ ...doc, gatewayUrl: 'https://evil.example' }), false)
})

test('a doc claiming a different identity fails (pubkey mismatch)', () => {
  const doc = signDoc({ schemaVersion: 1, gatewayUrl: 'https://r' }, keypair())
  assert.equal(verifyCapabilityDoc({ ...doc, pubkey: b4a.toString(keypair().pk, 'hex') }), false)
})

test('missing / malformed / wrong-version signatures fail closed', () => {
  const base = signDoc({ schemaVersion: 1, gatewayUrl: 'https://r' }, keypair())
  assert.equal(verifyCapabilityDoc({ ...base, signature: undefined }), false)
  assert.equal(verifyCapabilityDoc({ ...base, signature: { v: 1, sig: 'xyz' } }), false)
  assert.equal(verifyCapabilityDoc({ ...base, signature: { v: 99, sig: base.signature.sig } }), false)
  assert.equal(verifyCapabilityDoc({ ...base, pubkey: 'short' }), false)
  assert.equal(verifyCapabilityDoc(null), false)
})

test('key-order independence: re-encoding the doc with shuffled keys still verifies', () => {
  const doc = signDoc({ region: 'eu', gatewayUrl: 'https://r', features: ['z', 'a'], schemaVersion: 1 }, keypair())
  // simulate a server→client JSON re-encode that reorders the top-level keys
  const reencoded = JSON.parse(JSON.stringify({
    signature: doc.signature, pubkey: doc.pubkey, schemaVersion: doc.schemaVersion,
    features: doc.features, gatewayUrl: doc.gatewayUrl, region: doc.region,
  }))
  assert.equal(verifyCapabilityDoc(reencoded), true)
})
