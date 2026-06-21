// NOSTR3 — the Pear-native ingest gate. Two fail-closed seams: verify-and-drop
// (forged/tampered events never enter) and the trust-frontier gate (only authors
// ATTESTED by a verified contact, via a NOSTR2 binding, reach the visible feed;
// everyone else is QUARANTINED, not dropped — recoverable when trust changes).
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import secpMod from '../backend/secp256k1-bundle.cjs'
import nbMod from '../backend/nostr-bind.cjs'
import ingestMod from '../backend/nostr-ingest.cjs'
const secp = secpMod; const nb = nbMod
const { buildNostrTrustSet, partitionByTrust, repartitionQuarantine } = ingestMod

const hex = (b) => b4a.toString(b, 'hex')
const rootSigner = (kp) => (msg) => hex(crypto.sign(b4a.from(msg, 'utf-8'), kp.secretKey))
const nostrSigner = (skHex) => (msg32Hex) => secp.schnorrSign(msg32Hex, skHex)
const npk = (skHex) => secp.schnorrGetPublicKey(skHex)
const mkBind = (rootKp, nostrSk, epoch = 1) =>
  nb.makeNostrBind({ rootPubkey: hex(rootKp.publicKey), nostrPubkey: npk(nostrSk), epoch }, rootSigner(rootKp), nostrSigner(nostrSk))
// a NIP-01 event authored by a given nostr secret
const ev = (nostrSk, content) =>
  secp.nip01Sign({ pubkey: npk(nostrSk), created_at: 1700000000, kind: 1, tags: [], content }, nostrSk)

// a getBindings backed by a plain { rootHex: {binds,revocations} } map
const bindingsFrom = (map) => (root) => map[root.toLowerCase()] || { binds: [], revocations: [] }

test('verified contact → attested author ACCEPTED; unknown QUARANTINED; forged DROPPED', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const sk = '11'.repeat(32)
  const contacts = [{ pubkey: rootHex, verifiedAt: 123 }]
  const trust = buildNostrTrustSet(contacts, bindingsFrom({ [rootHex]: { binds: [mkBind(root, sk)], revocations: [] } }))
  assert.equal(trust.get(npk(sk)), rootHex) // attested author maps to the contact root

  const good = ev(sk, 'gm from a trusted peer')
  const stranger = ev('99'.repeat(32), 'gm from a sybil')
  const forged = { ...ev(sk, 'real'), content: 'tampered' } // id no longer commits → bad

  const { accepted, quarantined, dropped } = partitionByTrust([good, stranger, forged], trust)
  assert.deepEqual(accepted.map((e) => e.content), ['gm from a trusted peer'])
  assert.deepEqual(quarantined.map((e) => e.content), ['gm from a sybil'])
  assert.equal(dropped.length, 1)
  assert.equal(dropped[0].reason, 'id mismatch')
})

test('UNVERIFIED contact confers no trust (fail-closed) — attested author quarantined', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const sk = '11'.repeat(32)
  const contacts = [{ pubkey: rootHex, verifiedAt: null }] // present but not signature-verified
  const trust = buildNostrTrustSet(contacts, bindingsFrom({ [rootHex]: { binds: [mkBind(root, sk)], revocations: [] } }))
  assert.equal(trust.size, 0)
  const { accepted, quarantined } = partitionByTrust([ev(sk, 'hi')], trust)
  assert.equal(accepted.length, 0)
  assert.equal(quarantined.length, 1)
})

test('a FORGED binding never enters the trust set (resolveNostrBind rejects it)', () => {
  const victim = crypto.keyPair(); const victimHex = hex(victim.publicKey)
  const attacker = crypto.keyPair()
  const sk = '11'.repeat(32)
  // attacker claims the victim's root but signs the root half with their OWN key
  const forgedBind = nb.makeNostrBind(
    { rootPubkey: victimHex, nostrPubkey: npk(sk), epoch: 1 },
    rootSigner(attacker), nostrSigner(sk)
  )
  const contacts = [{ pubkey: victimHex, verifiedAt: 1 }]
  const trust = buildNostrTrustSet(contacts, bindingsFrom({ [victimHex]: { binds: [forgedBind], revocations: [] } }))
  assert.equal(trust.size, 0) // forged binding contributes nothing
  const { quarantined } = partitionByTrust([ev(sk, 'impersonation')], trust)
  assert.equal(quarantined.length, 1) // author is NOT trusted
})

test('a revoked binding drops the author back to quarantine', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const sk = '11'.repeat(32)
  const rev = nb.makeNostrRevoke({ rootPubkey: rootHex, nostrPubkey: npk(sk), epoch: 1 }, rootSigner(root))
  const contacts = [{ pubkey: rootHex, verifiedAt: 1 }]
  const trust = buildNostrTrustSet(contacts, bindingsFrom({ [rootHex]: { binds: [mkBind(root, sk)], revocations: [rev] } }))
  assert.equal(trust.size, 0)
  assert.equal(partitionByTrust([ev(sk, 'after revoke')], trust).quarantined.length, 1)
})

test('higher-epoch rebind: only the CURRENT attested key is trusted', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const oldSk = '11'.repeat(32); const newSk = '22'.repeat(32)
  const contacts = [{ pubkey: rootHex, verifiedAt: 1 }]
  const trust = buildNostrTrustSet(contacts, bindingsFrom({
    [rootHex]: { binds: [mkBind(root, oldSk, 1), mkBind(root, newSk, 2)], revocations: [] },
  }))
  assert.equal(trust.size, 1)
  assert.equal(trust.get(npk(newSk)), rootHex) // epoch 2 wins
  const { accepted, quarantined } = partitionByTrust([ev(newSk, 'current'), ev(oldSk, 'stale')], trust)
  assert.deepEqual(accepted.map((e) => e.content), ['current'])
  assert.deepEqual(quarantined.map((e) => e.content), ['stale'])
})

test('self binding surfaces the user\'s own posts in their feed', () => {
  const me = crypto.keyPair(); const meHex = hex(me.publicKey)
  const sk = '33'.repeat(32)
  const trust = buildNostrTrustSet([], () => ({}), { self: { rootPubkey: meHex, binds: [mkBind(me, sk)], revocations: [] } })
  assert.equal(trust.get(npk(sk)), meHex)
  assert.equal(partitionByTrust([ev(sk, 'my note')], trust).accepted.length, 1)
})

test('dedup by id within a batch and against knownIds (idempotent re-ingest)', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const sk = '11'.repeat(32)
  const trust = buildNostrTrustSet([{ pubkey: rootHex, verifiedAt: 1 }], bindingsFrom({ [rootHex]: { binds: [mkBind(root, sk)], revocations: [] } }))
  const a = ev(sk, 'once')
  const r1 = partitionByTrust([a, a], trust) // same id twice in one batch
  assert.equal(r1.accepted.length, 1)
  const r2 = partitionByTrust([a], trust, { knownIds: new Set([a.id]) }) // already reduced
  assert.equal(r2.accepted.length, 0)
})

test('repartitionQuarantine promotes held events once the author becomes attested', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const sk = '11'.repeat(32)
  const noTrust = buildNostrTrustSet([], () => ({}))
  const held = partitionByTrust([ev(sk, 'early')], noTrust).quarantined
  assert.equal(held.length, 1)
  // later: a verified contact's binding for this exact nostr key arrives
  const trust = buildNostrTrustSet([{ pubkey: rootHex, verifiedAt: 1 }], bindingsFrom({ [rootHex]: { binds: [mkBind(root, sk)], revocations: [] } }))
  const promoted = repartitionQuarantine(held, trust)
  assert.equal(promoted.accepted.length, 1)
  assert.equal(promoted.quarantined.length, 0)
})
