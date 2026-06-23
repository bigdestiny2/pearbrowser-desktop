// Contract test for identity.js Nostr key derivation (NOSTR0). identity.js is
// Bare-only, so — like identity-verify/ephemeral-keys — we MIRROR its derivation
// (SHA-256(seed || 'pear-nostr-v1:')) and exercise the REAL secp256k1-bundle.cjs.
// Locks the derivation tag + the sign/verify + NIP-01 path. If identity.js's tag
// or wiring changes, this test must change too.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import b4a from 'b4a'
import secpMod from '../backend/secp256k1-bundle.cjs'
const secp = secpMod

// mirror of identity.js _nostrSecretHex(): SHA-256(seed || 'pear-nostr-v1:')
const nostrSecretHex = (seed) => b4a.toString(createHash('sha256').update(seed).update('pear-nostr-v1:').digest(), 'hex')

test('Nostr keypair is deterministic from the root seed and signs verifiably', () => {
  const seed = randomBytes(32) // identity._seed is 32 bytes
  const sk = nostrSecretHex(seed)
  assert.equal(nostrSecretHex(seed), sk) // deterministic
  const pk = secp.schnorrGetPublicKey(sk)
  assert.match(pk, /^[0-9a-f]{64}$/) // x-only pubkey
  const msg = secp.sha256Hex('a nostr note')
  const sig = secp.schnorrSign(msg, sk)
  assert.equal(secp.schnorrVerify(sig, msg, pk), true)
  assert.equal(secp.schnorrVerify(sig, secp.sha256Hex('tampered'), pk), false)
})

test('a different root seed yields a different Nostr key', () => {
  assert.notEqual(
    secp.schnorrGetPublicKey(nostrSecretHex(randomBytes(32))),
    secp.schnorrGetPublicKey(nostrSecretHex(randomBytes(32)))
  )
})

test('NIP-01 event signing with the derived Nostr key verifies and is content-bound', () => {
  const seed = randomBytes(32)
  const sk = nostrSecretHex(seed)
  const pk = secp.schnorrGetPublicKey(sk)
  const signed = secp.nip01Sign({ pubkey: pk, created_at: 1700000000, kind: 1, tags: [['t', 'pear']], content: 'gm from pear' }, sk)
  assert.equal(signed.pubkey, pk)
  assert.match(signed.id, /^[0-9a-f]{64}$/)
  assert.equal(secp.nip01Verify(signed), true)
  assert.equal(secp.nip01Verify({ ...signed, content: 'evil' }), false) // id commits to content
})
