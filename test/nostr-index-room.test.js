// NOSTR3 — Pear-native distribution reader. The index-room verify-and-drop edge
// (nostrRowToEvent + verifyNostrRows) that turns relay-served rows into trusted
// NIP-01 events: a relay/peer is an INDEX, never an authority, so it can only
// serve events, never forge them. Then the full pipeline — relay integrity
// (verifyNostrRows) → consumer trust gate (partitionByTrust) — is exercised.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import secpMod from '../backend/secp256k1-bundle.cjs'
import nbMod from '../backend/nostr-bind.cjs'
import ingestMod from '../backend/nostr-ingest.cjs'
import idxMod from '../backend/index-room-client.js'
import { tamperLastHexByte } from './helpers/hex.js'
const secp = secpMod; const nb = nbMod
const { buildNostrTrustSet, partitionByTrust } = ingestMod
const { nostrRowToEvent, verifyNostrRows, INDEX_SCHEMAS } = idxMod

const hex = (b) => b4a.toString(b, 'hex')
const rootSigner = (kp) => (msg) => hex(crypto.sign(b4a.from(msg, 'utf-8'), kp.secretKey))
const nostrSigner = (skHex) => (msg32Hex) => secp.schnorrSign(msg32Hex, skHex)
const npk = (skHex) => secp.schnorrGetPublicKey(skHex)
const mkBind = (rootKp, nostrSk, epoch = 1) =>
  nb.makeNostrBind({ rootPubkey: hex(rootKp.publicKey), nostrPubkey: npk(nostrSk), epoch }, rootSigner(rootKp), nostrSigner(nostrSk))
const ev = (nostrSk, content) =>
  secp.nip01Sign({ pubkey: npk(nostrSk), created_at: 1700000000, kind: 1, tags: [], content }, nostrSk)
const row = (json) => ({ json }) // a schema-sheets row wraps its payload under .json

test("'nostr-event' is a registered index schema", () => {
  assert.ok(INDEX_SCHEMAS.includes('nostr-event'))
})

test('nostrRowToEvent: flat event, nested .event, and corrupt rows', () => {
  const e = ev('11'.repeat(32), 'gm')
  assert.deepEqual(nostrRowToEvent(row(e)), e) // event stored flat as the row json
  assert.deepEqual(nostrRowToEvent(row({ event: e, meta: 1 })), e) // nested under .event
  assert.equal(nostrRowToEvent(row(null)), null)
  assert.equal(nostrRowToEvent({}), null)
  assert.equal(nostrRowToEvent(null), null)
})

test('verifyNostrRows: keeps valid, drops forged / tampered / malformed (verify-and-drop)', () => {
  const sk = '11'.repeat(32)
  const good = ev(sk, 'real')
  const tampered = { ...ev(sk, 'orig'), content: 'evil' } // id no longer commits
  const badSigBase = ev(sk, 'x')
  const badSig = { ...badSigBase, sig: tamperLastHexByte(badSigBase.sig) }
  const malformed = { id: 'nothex', pubkey: 'no', sig: 'no', created_at: 0, kind: 1, tags: [], content: '' }

  const { events, dropped } = verifyNostrRows([row(good), row(tampered), row(badSig), row(malformed), row(null)])
  assert.deepEqual(events.map((e) => e.content), ['real'])
  assert.equal(dropped.length, 4)
})

// The headline guarantee: a relay can serve anything; integrity is re-checked
// (forgery dropped) and trust is gated (untrusted authors quarantined, not fed).
test('distribution pipeline: verifyNostrRows → partitionByTrust', () => {
  const root = crypto.keyPair(); const rootHex = hex(root.publicKey)
  const trustedSk = '11'.repeat(32)
  const sybilSk = '99'.repeat(32)

  // a verified contact attests the trusted author's nostr key (NOSTR2 binding)
  const trust = buildNostrTrustSet(
    [{ pubkey: rootHex, verifiedAt: 1 }],
    (r) => r.toLowerCase() === rootHex ? { binds: [mkBind(root, trustedSk)], revocations: [] } : {}
  )

  // the relay serves a hostile mix: a trusted event, a genuine-but-untrusted
  // (sybil) event, and a forged event (tampered after signing)
  const served = [
    row(ev(trustedSk, 'from a trusted peer')),
    row(ev(sybilSk, 'from a sybil')),
    row({ ...ev(trustedSk, 'orig'), content: 'forged by the relay' }),
  ]

  const verified = verifyNostrRows(served).events // relay integrity edge
  assert.equal(verified.length, 2) // the forged row was dropped before trust is even considered

  const { accepted, quarantined, dropped } = partitionByTrust(verified, trust) // consumer trust gate
  assert.deepEqual(accepted.map((e) => e.content), ['from a trusted peer'])
  assert.deepEqual(quarantined.map((e) => e.content), ['from a sybil'])
  assert.equal(dropped.length, 0) // everything here already passed verify
})
