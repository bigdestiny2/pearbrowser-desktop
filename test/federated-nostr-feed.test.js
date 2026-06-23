// FederatedNostrFeed — focused Nostr bridge gap coverage from the 2026-06-21
// audit. A trusted contact's remote revocation records must be applied before
// their Nostr author key is admitted to the visible federated feed.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import secpMod from '../backend/secp256k1-bundle.cjs'
import nbMod from '../backend/nostr-bind.cjs'
import feedMod from '../backend/federated-nostr-feed.cjs'

const secp = secpMod
const nb = nbMod
const { FederatedNostrFeed } = feedMod

const hex = (b) => b4a.toString(b, 'hex')
const rootSigner = (kp) => (msg) => hex(crypto.sign(b4a.from(msg, 'utf-8'), kp.secretKey))
const nostrSigner = (skHex) => (msg32Hex) => secp.schnorrSign(msg32Hex, skHex)
const npk = (skHex) => secp.schnorrGetPublicKey(skHex)
const mkBind = (rootKp, nostrSk, epoch = 1) =>
  nb.makeNostrBind({ rootPubkey: hex(rootKp.publicKey), nostrPubkey: npk(nostrSk), epoch }, rootSigner(rootKp), nostrSigner(nostrSk))
const mkEvent = (nostrSk, content) =>
  secp.nip01Sign({ pubkey: npk(nostrSk), created_at: 1700000000, kind: 1, tags: [], content }, nostrSk)

function feedFor ({ root, nostrBind, nostrRevocations = [], events }) {
  const rootHex = hex(root.publicKey)
  return new FederatedNostrFeed({
    listContacts: async () => [{ pubkey: rootHex, displayName: 'Alice', verifiedAt: 1, bindingKey: 'aa'.repeat(32) }],
    resolveBinding: async () => ({ nostrEventKey: 'bb'.repeat(32), nostrBind, nostrRevocations }),
    openEventStore: async () => ({ listEvents: async () => events }),
    now: () => 1700000000,
    stepTimeoutMs: 100,
  })
}

test('linked remote Nostr bind admits the contact author into the federated feed', async () => {
  const root = crypto.keyPair()
  const sk = '11'.repeat(32)
  const feed = feedFor({ root, nostrBind: mkBind(root, sk), events: [mkEvent(sk, 'hello from Alice')] })

  const events = await feed.events()
  assert.deepEqual(events.map((e) => e.content), ['hello from Alice'])
  assert.equal(events[0]._via, 'Alice')
})

test('remote Nostr revocation record blocks the advertised author key', async () => {
  const root = crypto.keyPair()
  const rootHex = hex(root.publicKey)
  const sk = '11'.repeat(32)
  const bind = mkBind(root, sk, 1)
  const rev = nb.makeNostrRevoke({ rootPubkey: rootHex, nostrPubkey: npk(sk), epoch: 1 }, rootSigner(root))
  const feed = feedFor({
    root,
    nostrBind: bind,
    nostrRevocations: [rev],
    events: [mkEvent(sk, 'should stay out of the trusted feed')],
  })

  assert.deepEqual(await feed.events(), [])
})

test('eventsWithDiagnostics reports contact notes hidden by revoked binding', async () => {
  const root = crypto.keyPair()
  const rootHex = hex(root.publicKey)
  const sk = '11'.repeat(32)
  const bind = mkBind(root, sk, 1)
  const rev = nb.makeNostrRevoke({ rootPubkey: rootHex, nostrPubkey: npk(sk), epoch: 1 }, rootSigner(root))
  const feed = feedFor({
    root,
    nostrBind: bind,
    nostrRevocations: [rev],
    events: [mkEvent(sk, 'hidden by revocation')],
  })

  const res = await feed.eventsWithDiagnostics()
  assert.deepEqual(res.events, [])
  assert.equal(res.hidden.contactsEligible, 1)
  assert.equal(res.hidden.bindingUntrusted, 1)
  assert.equal(res.hidden.quarantined, 1)
  assert.equal(res.hidden.byReason.revoked, 2)
})
