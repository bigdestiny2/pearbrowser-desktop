// NostrBindingStore — the live persistence half of NOSTR2. Uses a REAL
// PersonalIndex over a temp Corestore + a stub identity that mirrors identity.js
// crypto EXACTLY (ed25519 root via hypercore-crypto, secp256k1 nostr via the
// bundle, canonical bytes via nostr-bind.cjs) — identity.js itself is Bare-only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import secpMod from '../backend/secp256k1-bundle.cjs'
import nbMod from '../backend/nostr-bind.cjs'
import piMod from '../backend/personal-index.cjs'
import storeMod from '../backend/nostr-binding-store.cjs'
const secp = secpMod; const nb = nbMod
const { PersonalIndex } = piMod
const { NostrBindingStore } = storeMod

const hex = (b) => b4a.toString(b, 'hex')

// faithful stub of the methods NostrBindingStore calls on identity (mirrors
// backend/identity.js makeNostrBinding / makeNostrRevocation / verifyNostrBinding).
function makeStubIdentity (nostrSk = 'ab'.repeat(32)) {
  const rootKp = crypto.keyPair()
  const rootHex = hex(rootKp.publicKey)
  const npk = secp.schnorrGetPublicKey(nostrSk)
  const sign = (msg) => ({ signature: hex(crypto.sign(b4a.from(msg, 'utf-8'), rootKp.secretKey)) })
  return {
    rootHex, npk, rootKp,
    getSigningKeypair: () => rootKp,
    getNostrPublicKey: () => npk,
    sign,
    nostrSign: (msg32Hex) => secp.schnorrSign(msg32Hex, nostrSk),
    makeNostrBinding: (epoch) => nb.makeNostrBind(
      { rootPubkey: rootHex, nostrPubkey: npk, epoch },
      (msg) => sign(msg).signature,
      (msg32Hex) => secp.schnorrSign(msg32Hex, nostrSk)
    ),
    verifyNostrBinding: (bind, expectedRoot) => nb.verifyNostrBind(bind, expectedRoot),
    makeNostrRevocation: (epoch) => nb.makeNostrRevoke(
      { rootPubkey: rootHex, nostrPubkey: npk, epoch },
      (msg) => sign(msg).signature
    ),
  }
}

async function withStore (fn) {
  const dir = await mkdtemp(join(tmpdir(), 'nbs-'))
  const cs = new Corestore(dir)
  await cs.ready()
  const pi = await new PersonalIndex(cs).ready()
  const id = makeStubIdentity()
  const store = await new NostrBindingStore({ identity: id, personalIndex: pi }).ready()
  try { await fn({ store, id, pi, cs, dir }) }
  finally { await pi.close(); await cs.close(); await rm(dir, { recursive: true, force: true }) }
}

test('initial state: npub present, not linked, epoch 0', () => withStore(async ({ store, id }) => {
  const st = await store.getState()
  assert.equal(st.nostrPubkey, id.npk)
  assert.ok(st.npub.startsWith('npub1'))
  assert.equal(st.rootPubkey, id.rootHex)
  assert.equal(st.epoch, 0)
  assert.equal(st.linked, false)
  assert.equal(st.binding, null)
}))

test('bind links at epoch 1; the stored binding verifies against the root', () => withStore(async ({ store, id }) => {
  const st = await store.bind()
  assert.equal(st.linked, true)
  assert.equal(st.epoch, 1)
  assert.equal(st.binding.epoch, 1)
  assert.equal(id.verifyNostrBinding(st.binding, id.rootHex), true)
}))

test('state persists across a fresh store instance (survives restart)', () => withStore(async ({ store, id, pi }) => {
  await store.bind()
  const reopened = await new NostrBindingStore({ identity: id, personalIndex: pi }).ready()
  const st = await reopened.getState()
  assert.equal(st.linked, true)
  assert.equal(st.epoch, 1)
}))

test('revoke unlinks; re-bind mints a higher epoch that re-links', () => withStore(async ({ store }) => {
  await store.bind() // epoch 1, linked
  let st = await store.revoke()
  assert.equal(st.linked, false)
  assert.equal(st.epoch, 1) // epoch counter unchanged by revoke

  st = await store.bind() // epoch 2 — higher than the epoch-1 revoke → re-links
  assert.equal(st.linked, true)
  assert.equal(st.epoch, 2)
}))

test('revoke is idempotent when there is nothing bound', () => withStore(async ({ store }) => {
  const st = await store.revoke()
  assert.equal(st.linked, false)
  assert.equal(st.epoch, 0)
}))

test('a FORGED revocation in the meta store is ignored (fail-closed) → stays linked', () => withStore(async ({ store, id, pi }) => {
  const st = await store.bind() // epoch 1, linked
  // an attacker writes a revocation for epoch 1 signed by a DIFFERENT root
  const attacker = makeStubIdentity()
  const forgedRev = attacker.makeNostrRevocation(1) // root-signed by the wrong key, wrong nostrPubkey too
  await pi.putMeta('nostrRevoke!1', forgedRev)
  const after = await store.getState()
  assert.equal(after.linked, true, 'forged revocation must not unlink')
  assert.equal(after.epoch, 1)
}))
