// NOSTR2 — cross-curve binding (pear-nostr-bind). Both an ed25519 root sig and a
// secp256k1 schnorr sig must verify, so NEITHER side can be claimed without that
// side's secret. ed25519 via hypercore-crypto, secp256k1 via the real bundle.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import secpMod from '../backend/secp256k1-bundle.cjs'
import nbMod from '../backend/nostr-bind.cjs'
const secp = secpMod; const nb = nbMod

const hex = (b) => b4a.toString(b, 'hex')
const rootSigner = (kp) => (msg) => hex(crypto.sign(b4a.from(msg, 'utf-8'), kp.secretKey))
const nostrSigner = (skHex) => (msg32Hex) => secp.schnorrSign(msg32Hex, skHex)
const npk = (skHex) => secp.schnorrGetPublicKey(skHex)
const mkBind = (rootKp, nostrSk, epoch = 1) =>
  nb.makeNostrBind({ rootPubkey: hex(rootKp.publicKey), nostrPubkey: npk(nostrSk), epoch }, rootSigner(rootKp), nostrSigner(nostrSk))

test('a properly dual-signed cross-curve binding verifies', () => {
  const root = crypto.keyPair()
  assert.equal(nb.verifyNostrBind(mkBind(root, '11'.repeat(32)), hex(root.publicKey)), true)
})

test('tampering the nostr pubkey or epoch breaks the signatures', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const bind = mkBind(root, '11'.repeat(32))
  assert.equal(nb.verifyNostrBind({ ...bind, nostrPubkey: npk('22'.repeat(32)) }, rootHex), false)
  assert.equal(nb.verifyNostrBind({ ...bind, epoch: 2 }, rootHex), false)
  assert.equal(nb.verifyNostrBind({ ...bind, nostrSig: bind.nostrSig.slice(0, -2) + '00' }, rootHex), false)
  assert.equal(nb.verifyNostrBind({ ...bind, rootSig: bind.rootSig.slice(0, -2) + '00' }, rootHex), false)
})

test('cannot bind a Nostr key you do NOT control (forged nostr attestation)', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  // attacker controls the root, claims the victim's nostr key, but signs the nostr
  // half with their OWN nostr secret → the schnorr sig fails against the claimed key.
  const forged = nb.makeNostrBind(
    { rootPubkey: rootHex, nostrPubkey: npk('22'.repeat(32)), epoch: 1 },
    rootSigner(root), nostrSigner('33'.repeat(32))
  )
  assert.equal(nb.verifyNostrBind(forged, rootHex), false)
})

test('cannot bind a pear root you do NOT control (forged root attestation)', () => {
  const victim = crypto.keyPair(); const attacker = crypto.keyPair()
  const nostrSk = '11'.repeat(32)
  // attacker controls the nostr key, claims the victim's root, signs the root half
  // with their OWN key → the ed25519 sig fails against the victim root.
  const forged = nb.makeNostrBind(
    { rootPubkey: hex(victim.publicKey), nostrPubkey: npk(nostrSk), epoch: 1 },
    rootSigner(attacker), nostrSigner(nostrSk)
  )
  assert.equal(nb.verifyNostrBind(forged, hex(victim.publicKey)), false)
})

test('a binding for one root does not verify against another', () => {
  const a = crypto.keyPair(); const b = crypto.keyPair()
  assert.equal(nb.verifyNostrBind(mkBind(a, '11'.repeat(32)), hex(b.publicKey)), false)
})

test('resolveNostrBind: highest epoch wins, revoke-wins, forged revoke ignored', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const b1 = mkBind(root, '11'.repeat(32), 1)
  const b2 = mkBind(root, '22'.repeat(32), 2)
  assert.equal(nb.resolveNostrBind(rootHex, [b1, b2], []), npk('22'.repeat(32)))

  const rev = nb.makeNostrRevoke({ rootPubkey: rootHex, nostrPubkey: npk('22'.repeat(32)), epoch: 2 }, rootSigner(root))
  assert.equal(nb.resolveNostrBind(rootHex, [b1, b2], [rev]), npk('11'.repeat(32)))

  const attacker = crypto.keyPair()
  const fakeRev = nb.makeNostrRevoke({ rootPubkey: rootHex, nostrPubkey: npk('22'.repeat(32)), epoch: 2 }, rootSigner(attacker))
  assert.equal(nb.resolveNostrBind(rootHex, [b1, b2], [fakeRev]), npk('22'.repeat(32)))
})

test('malformed hex fields are rejected explicitly (not coerced) — NOSTR2 review hardening', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const bind = mkBind(root, '11'.repeat(32))
  // non-hex / wrong-length pubkeys and sigs fail closed at the format gate
  assert.equal(nb.verifyNostrBind({ ...bind, rootPubkey: 'z'.repeat(64) }, 'z'.repeat(64)), false)
  assert.equal(nb.verifyNostrBind({ ...bind, nostrSig: 'zz' }, rootHex), false) // short/non-hex sig
  assert.equal(nb.verifyNostrBind({ ...bind, rootSig: bind.rootSig.slice(0, -1) }, rootHex), false) // odd length
})

test('makeNostrBind requires a positive integer epoch', () => {
  const root = crypto.keyPair()
  assert.throws(() => nb.makeNostrBind({ rootPubkey: hex(root.publicKey), nostrPubkey: npk('11'.repeat(32)), epoch: 0 }, rootSigner(root), nostrSigner('11'.repeat(32))), /epoch/)
})
