// NOSTR1 — the verifying reducer (nostr-events-apply) + the event store
// (nostr-events-store on the encrypted-Autobase helper). The BIP-340 crypto
// primitives are tested separately (nostr-events-ops.test.js → secp256k1-bundle).
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import b4a from 'b4a'
import secpMod from '../backend/secp256k1-bundle.cjs'
import opsMod from '../backend/nostr-events-ops.cjs'
import applyMod from '../backend/nostr-events-apply.cjs'
import storeMod from '../backend/nostr-events-store.cjs'
const secp = secpMod; const ops = opsMod; const apply = applyMod
const { NostrEventStore } = storeMod

const ENC = b4a.alloc(32, 0x5a)
const sk = '11'.repeat(32)
const pk = secp.schnorrGetPublicKey(sk)
const signed = (content, extra = {}) =>
  secp.nip01Sign({ pubkey: pk, created_at: 1700000000, kind: 1, tags: [], content, ...extra }, sk)

// --- the verifying reducer (pure) -------------------------------------------

test('verifyEvent: valid passes; tampered content, bad sig, malformed all fail', () => {
  const ev = signed('gm')
  assert.equal(apply.verifyEvent(ev).ok, true)
  assert.equal(apply.verifyEvent({ ...ev, content: 'evil' }).ok, false) // id no longer commits to content
  assert.equal(apply.verifyEvent({ ...ev, sig: ev.sig.slice(0, -2) + '00' }).ok, false)
  assert.equal(apply.verifyEvent({ ...ev, pubkey: 'nothex' }).ok, false) // malformed
})

test('applyView dedups by id, drops invalid, materializes valid events', () => {
  const a = signed('first')
  const b = signed('second')
  const view = apply.applyView([
    ops.addEventOp(a), ops.addEventOp(b), ops.addEventOp(a), // duplicate a
    ops.addEventOp({ ...b, content: 'tampered' }), // id mismatch → dropped
    { type: 'garbage' },
  ])
  assert.equal(view.events.length, 2)
  assert.deepEqual(view.events.map((e) => e.content).sort(), ['first', 'second'])
})

// --- the store on the encrypted-Autobase helper -----------------------------

test('NostrEventStore stores valid events, dedups by id, drops forged', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nostr-'))
  const cs = new Corestore(dir)
  await cs.ready()
  const s = await new NostrEventStore(cs, { encryptionKey: ENC }).ready()
  try {
    await s.addEvent(signed('hello'))
    await s.addEvent(signed('hello')) // same content → same id → dedup
    await s.addEvent(signed('world'))
    await s.addEvent({ ...signed('x'), content: 'forged' }) // id mismatch → dropped at apply
    const evs = await s.listEvents()
    assert.deepEqual(evs.map((e) => e.content).sort(), ['hello', 'world'])
    assert.ok(evs.every((e) => apply.verifyEvent(e).ok)) // everything stored re-verifies
  } finally { await s.close(); await cs.close(); await rm(dir, { recursive: true, force: true }) }
})
