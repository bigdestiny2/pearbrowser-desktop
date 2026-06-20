// Contract test for identity.js ephemeral sub-key derivation (I5): per-invoice
// and per-session keypairs for payments / nostr / privacy-routing unlinkability.
// identity.js requires bare-* (Bare-only), so — like identity-verify.test.js — we
// MIRROR its derivation EXACTLY and lock the algorithm + the security properties.
// If identity.js's _deriveSubkey tag or scheme changes, this test must change too.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import sodium from 'sodium-universal'
import b4a from 'b4a'

// mirror of identity.js _deriveSubkey: subSeed = SHA-256(seed || tag || input)
function deriveSubkey (seed, tag, input) {
  const subSeed = createHash('sha256').update(seed).update(tag).update(input).digest()
  const publicKey = b4a.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  const secretKey = b4a.alloc(sodium.crypto_sign_SECRETKEYBYTES)
  sodium.crypto_sign_seed_keypair(publicKey, secretKey, subSeed)
  return { publicKey, secretKey }
}
const hex = (b) => b4a.toString(b, 'hex')
const INVOICE = 'pear-invoice-v1:'; const SESSION = 'pear-session-v1:'; const APP = 'pear-app-v1:'

test('invoice keypair is deterministic from (seed, nonce) and signs verifiably', () => {
  const seed = randomBytes(16)
  const a = deriveSubkey(seed, INVOICE, 'sale-123')
  const b = deriveSubkey(seed, INVOICE, 'sale-123')
  assert.equal(hex(a.publicKey), hex(b.publicKey)) // re-derivable for the same sale
  const msg = b4a.from('receipt', 'utf-8')
  const sig = b4a.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(sig, msg, a.secretKey)
  assert.equal(sodium.crypto_sign_verify_detached(sig, msg, a.publicKey), true)
})

test('different invoice nonces give unlinkable keys', () => {
  const seed = randomBytes(16)
  assert.notEqual(hex(deriveSubkey(seed, INVOICE, 'sale-1').publicKey), hex(deriveSubkey(seed, INVOICE, 'sale-2').publicKey))
})

test('domain separation: the same input under invoice/session/app yields 3 distinct keys', () => {
  const seed = randomBytes(16)
  const keys = [INVOICE, SESSION, APP].map((tag) => hex(deriveSubkey(seed, tag, 'x').publicKey))
  assert.equal(new Set(keys).size, 3)
})

test('a different root seed yields a different invoice key (no cross-user linkage)', () => {
  assert.notEqual(
    hex(deriveSubkey(randomBytes(16), INVOICE, 'sale-1').publicKey),
    hex(deriveSubkey(randomBytes(16), INVOICE, 'sale-1').publicKey)
  )
})

test('session keys are unlinkable across salts but stable within one', () => {
  const seed = randomBytes(16)
  assert.equal(hex(deriveSubkey(seed, SESSION, 'salt-A').publicKey), hex(deriveSubkey(seed, SESSION, 'salt-A').publicKey))
  assert.notEqual(hex(deriveSubkey(seed, SESSION, 'salt-A').publicKey), hex(deriveSubkey(seed, SESSION, 'salt-B').publicKey))
})
