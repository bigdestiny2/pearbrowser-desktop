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

test('verifyBinding authenticates against the Contacts-held root (+ purpose)', () => {
  const root = crypto.keyPair()
  const attacker = crypto.keyPair()
  const rootHex = hex(root.publicKey)
  const search1 = hex(crypto.keyPair().publicKey)

  const binding = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: search1, purpose: 'search', version: 1 }, signer(root))
  assert.equal(ib.verifyBinding(binding, rootHex, 'search'), true)

  // MITM: attacker presents a binding claiming the victim's rootPubkey but signs
  // it with their own key → fails against the Contacts-held root pubkey.
  const forged = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: hex(attacker.publicKey), purpose: 'search', version: 1 }, signer(attacker))
  assert.equal(ib.verifyBinding(forged, rootHex, 'search'), false)
  // and a binding for a different root must not verify against rootHex
  const otherBinding = ib.makeBinding({ rootPubkey: hex(attacker.publicKey), searchPubkey: search1, purpose: 'search', version: 1 }, signer(attacker))
  assert.equal(ib.verifyBinding(otherBinding, rootHex, 'search'), false)
})

test('cross-purpose replay: a binding for one purpose never satisfies another', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const sk = hex(crypto.keyPair().publicKey)
  // a perfectly valid NOSTR binding (right root, right signature)...
  const nostr = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: sk, purpose: 'nostr', version: 1 }, signer(root))
  assert.equal(ib.verifyBinding(nostr, rootHex, 'nostr'), true)
  // ...must NOT verify as a SEARCH binding, even with the valid root signature
  assert.equal(ib.verifyBinding(nostr, rootHex, 'search'), false)
  // and resolveSearchKey (purpose 'search') ignores it entirely
  assert.equal(ib.resolveSearchKey(rootHex, [nostr], []), null)
  // makeBinding requires a purpose
  assert.throws(() => ib.makeBinding({ rootPubkey: rootHex, searchPubkey: sk, version: 1 }, signer(root)), /purpose/)
})

test('resolveSearchKey rotates to the highest non-revoked version', () => {
  const root = crypto.keyPair()
  const rootHex = hex(root.publicKey)
  const sk1 = hex(crypto.keyPair().publicKey)
  const sk2 = hex(crypto.keyPair().publicKey)
  const b1 = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: sk1, purpose: 'search', version: 1 }, signer(root))
  const b2 = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: sk2, purpose: 'search', version: 2 }, signer(root))

  assert.equal(ib.resolveSearchKey(rootHex, [b1, b2], []), sk2, 'highest version wins (rotation)')

  // revoke v2 → falls back to v1
  const rev = ib.makeRevocation({ rootPubkey: rootHex, searchPubkey: sk2, purpose: 'search', version: 2 }, signer(root))
  assert.equal(ib.resolveSearchKey(rootHex, [b1, b2], [rev]), sk1, 'revoked version drops out')

  // a revocation signed by the wrong key is ignored
  const attacker = crypto.keyPair()
  const fakeRev = ib.makeRevocation({ rootPubkey: rootHex, searchPubkey: sk2, purpose: 'search', version: 2 }, signer(attacker))
  assert.equal(ib.resolveSearchKey(rootHex, [b1, b2], [fakeRev]), sk2, 'forged revocation ignored')
})

test('resolveSearchKey breaks equal-version equivocation deterministically', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const skA = 'aa'.repeat(32); const skB = 'bb'.repeat(32) // real 64-hex; skA < skB
  const bA = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: skA, purpose: 'search', version: 2 }, signer(root))
  const bB = ib.makeBinding({ rootPubkey: rootHex, searchPubkey: skB, purpose: 'search', version: 2 }, signer(root))
  // same resolution regardless of array order; smaller searchPubkey wins
  assert.equal(ib.resolveSearchKey(rootHex, [bA, bB], []), ib.resolveSearchKey(rootHex, [bB, bA], []))
  assert.equal(ib.resolveSearchKey(rootHex, [bB, bA], []), skA)
})

test('verifyBinding rejects a non-integer (string) version and non-string searchPubkey', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const cB = 'pear.idbinding.v3:' + JSON.stringify({ p: 'search', r: rootHex, s: 'sk', v: '10' }, ['p', 'r', 's', 'v'])
  const evilB = { kind: 'binding', v: 3, rootPubkey: rootHex, searchPubkey: 'sk', purpose: 'search', version: '10', sig: signer(root)(cB) }
  assert.equal(ib.verifyBinding(evilB, rootHex, 'search'), false, 'string version must not verify')
  assert.equal(ib.resolveSearchKey(rootHex, [evilB], []), null)
  const cS = 'pear.idbinding.v3:' + JSON.stringify({ p: 'search', r: rootHex, s: 5, v: 1 }, ['p', 'r', 's', 'v'])
  const evilS = { kind: 'binding', v: 3, rootPubkey: rootHex, searchPubkey: 5, purpose: 'search', version: 1, sig: signer(root)(cS) }
  assert.equal(ib.verifyBinding(evilS, rootHex, 'search'), false, 'non-string searchPubkey must not verify')
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

test('digest keeps a top-term head plus all-term rare query gating', () => {
  const termDf = [
    { term: 'chat', df: 100 }, { term: 'peer', df: 80 }, { term: 'rare', df: 1 },
    { term: 'video', df: 50 },
  ]
  const digest = dg.buildDigest(['d1', 'd2'], termDf, { topK: 3 })
  assert.deepEqual(digest.topTerms, ['chat', 'peer', 'video']) // top-3 by df
  assert.equal(dg.digestHasTerm(digest, 'chat'), true)
  assert.equal(dg.digestHasTerm(digest, 'rare'), false) // not in the hot-term head
  assert.equal(dg.digestMayContainTerm(digest, 'rare'), true) // still present in the all-term filter
  assert.equal(dg.digestWorthPulling(digest, ['rare', 'video']), true)  // 'video' in head
  assert.equal(dg.digestWorthPulling(digest, ['rare', 'nope']), true)   // rare term still pulls
  assert.equal(dg.digestWorthPulling(digest, ['nope']), false)          // true miss skips
})

test('digest size is small (KB-scale) for thousands of docs', () => {
  const ids = Array.from({ length: 8000 }, (_, i) => 'id' + i)
  const terms = Array.from({ length: 5000 }, (_, i) => ({ term: 't' + i, df: i }))
  const digest = dg.buildDigest(ids, terms, { p: 0.001, topK: 2048 })
  const kb = dg.digestBytes(digest) / 1024
  assert.ok(kb < 60, `digest ~${kb.toFixed(1)} KB should be tens of KB, not the multi-MB full index`)
})
