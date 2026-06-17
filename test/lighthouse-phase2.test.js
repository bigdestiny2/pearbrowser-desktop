// Phase-2 tests: identity-binding (per-app verify + versioned/revocable binding
// with first-use MITM defense) and the digest tier (Bloom + top-terms head).
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import ib from '../backend/identity-binding.cjs'
import dg from '../backend/search-digest.cjs'

const hex = (buf) => b4a.toString(buf, 'hex')
function signer (kp) { return (msg) => hex(crypto.sign(typeof msg === 'string' ? b4a.from(msg, 'utf-8') : msg, kp.secretKey)) }

// --- identity-binding: per-app signature verify --------------------------------

test('verifyAppSig validates a domain-separated per-app signature', () => {
  const kp = crypto.keyPair()
  const payload = JSON.stringify({ docId: 'abc', t: 'hi' })
  const sig = signer(kp)(ib.appMessage('search', payload, 'lighthouse-doc-v2'))
  assert.equal(ib.verifyAppSig('search', payload, sig, hex(kp.publicKey), 'lighthouse-doc-v2'), true)
  // wrong namespace / app / payload all fail (no cross-context replay)
  assert.equal(ib.verifyAppSig('search', payload, sig, hex(kp.publicKey), 'other-ns'), false)
  assert.equal(ib.verifyAppSig('mail', payload, sig, hex(kp.publicKey), 'lighthouse-doc-v2'), false)
  assert.equal(ib.verifyAppSig('search', payload + 'x', sig, hex(kp.publicKey), 'lighthouse-doc-v2'), false)
})

// --- identity-binding: versioned binding + first-use auth ----------------------

test('verifyBinding authenticates against the Contacts-held root, not a self-asserted one', () => {
  const root = crypto.keyPair()
  const attacker = crypto.keyPair()
  const rootHex = hex(root.publicKey)
  const search1 = hex(crypto.keyPair().publicKey)

  const binding = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: search1, version: 1 }, signer(root))
  assert.equal(ib.verifyBinding(binding, rootHex), true)

  // MITM: attacker presents a binding claiming the victim's rootPubkey but signs
  // it with their own key → fails against the Contacts-held root pubkey.
  const forged = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: hex(attacker.publicKey), version: 1 }, signer(attacker))
  assert.equal(ib.verifyBinding(forged, rootHex), false)
  // and a binding for a different root must not verify against rootHex
  const otherHex = hex(attacker.publicKey)
  const otherBinding = ib.makeBinding({ rootPubkey: otherHex, searchPubkey: search1, version: 1 }, signer(attacker))
  assert.equal(ib.verifyBinding(otherBinding, rootHex), false)
})

test('resolveSearchKey rotates to the highest non-revoked version', () => {
  const root = crypto.keyPair()
  const rootHex = hex(root.publicKey)
  const sk1 = hex(crypto.keyPair().publicKey)
  const sk2 = hex(crypto.keyPair().publicKey)
  const b1 = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: sk1, version: 1 }, signer(root))
  const b2 = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: sk2, version: 2 }, signer(root))

  assert.equal(ib.resolveSearchKey(rootHex, [b1, b2], []), sk2, 'highest version wins (rotation)')

  // revoke v2 → falls back to v1
  const rev = ib.makeRevocation({ rootPubkey: rootHex, searchPubkey: sk2, version: 2 }, signer(root))
  assert.equal(ib.resolveSearchKey(rootHex, [b1, b2], [rev]), sk1, 'revoked version drops out')

  // a revocation signed by the wrong key is ignored
  const attacker = crypto.keyPair()
  const fakeRev = ib.makeRevocation({ rootPubkey: rootHex, searchPubkey: sk2, version: 2 }, signer(attacker))
  assert.equal(ib.resolveSearchKey(rootHex, [b1, b2], [fakeRev]), sk2, 'forged revocation ignored')
})

test('resolveSearchKey breaks equal-version equivocation deterministically', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const bA = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: 'aaa', version: 2 }, signer(root))
  const bB = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: 'bbb', version: 2 }, signer(root))
  // same resolution regardless of array order; smaller searchPubkey wins
  assert.equal(ib.resolveSearchKey(rootHex, [bA, bB], []), ib.resolveSearchKey(rootHex, [bB, bA], []))
  assert.equal(ib.resolveSearchKey(rootHex, [bB, bA], []), 'aaa')
})

// --- digest tier --------------------------------------------------------------

test('malformed/hostile digest fails CLOSED (no fail-open to true)', () => {
  // a digest with k=0 must not report every docId as "probably present"
  assert.equal(dg.digestMayContainDoc({ bits: 'AAAA', m: 16, k: 0 }, 'anyid'), false)
  assert.equal(dg.digestMayContainDoc({ bits: '', m: 0, k: 1 }, 'anyid'), false)
  assert.equal(dg.digestMayContainDoc({ bits: 'AA', m: 99999, k: 3 }, 'anyid'), false) // wrong bit-length
  assert.equal(dg.digestMayContainDoc(null, 'anyid'), false)
  // a truthy NON-string bits must fail closed, not throw (DoS the verifier)
  assert.equal(dg.digestMayContainDoc({ bits: 999, m: 16, k: 3 }, 'anyid'), false)
  assert.equal(dg.digestMayContainDoc({ bits: {}, m: 16, k: 3 }, 'anyid'), false)
})

test('digest has no false negatives and bounded false positives', () => {
  const present = Array.from({ length: 2000 }, (_, i) => 'docid' + i.toString(16).padStart(16, '0'))
  const digest = dg.buildDigest(present, [], { p: 0.001 })
  for (const id of present) assert.equal(dg.digestMayContainDoc(digest, id), true) // no false negatives

  let fp = 0
  const trials = 4000
  for (let i = 0; i < trials; i++) {
    if (dg.digestMayContainDoc(digest, 'absent' + i.toString(16))) fp++
  }
  assert.ok(fp / trials < 0.02, `false-positive rate ${fp}/${trials} should be well under 2% (target 0.1%)`)
})

test('digest head keeps the highest-df terms and gates fan-out', () => {
  const termDf = [
    { term: 'chat', df: 100 }, { term: 'peer', df: 80 }, { term: 'rare', df: 1 },
    { term: 'video', df: 50 },
  ]
  const digest = dg.buildDigest(['d1', 'd2'], termDf, { topK: 3 })
  assert.deepEqual(digest.topTerms, ['chat', 'peer', 'video']) // top-3 by df
  assert.equal(dg.digestHasTerm(digest, 'chat'), true)
  assert.equal(dg.digestHasTerm(digest, 'rare'), false)
  assert.equal(dg.digestWorthPulling(digest, ['rare', 'video']), true)  // 'video' in head
  assert.equal(dg.digestWorthPulling(digest, ['rare', 'nope']), false)  // skip this contact
})

test('digest size is small (KB-scale) for thousands of docs', () => {
  const ids = Array.from({ length: 8000 }, (_, i) => 'id' + i)
  const terms = Array.from({ length: 5000 }, (_, i) => ({ term: 't' + i, df: i }))
  const digest = dg.buildDigest(ids, terms, { p: 0.001, topK: 2048 })
  const kb = dg.digestBytes(digest) / 1024
  assert.ok(kb < 60, `digest ~${kb.toFixed(1)} KB should be tens of KB, not the multi-MB full index`)
})
