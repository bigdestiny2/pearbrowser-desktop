// Regression for the N5-wiring review HIGH finding: a helper-built Autobase's
// close() must NOT tear down the SHARED root Corestore (which backs Hyperdrive /
// UserData / Names / replication for the whole app). The first name claim used
// to mint+close an Autobase holding the RAW root store → store.close() killed
// everything. Fix: each consumer gets its own namespaced substore.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import helperMod from '../backend/encrypted-autobase-helper.cjs'
import storeMod from '../backend/name-registry-store.cjs'
const { createEncryptedAutobaseManager } = helperMod
const { NameRegistry } = storeMod
const hex = (x) => b4a.toString(x, 'hex')
const signer = (kp) => (msg) => hex(crypto.sign(b4a.from(msg, 'utf-8'), kp.secretKey))
const ENC = b4a.alloc(32, 7)

async function newStore () {
  const dir = await mkdtemp(join(tmpdir(), 'eab-shared-'))
  const store = new Corestore(dir); await store.ready()
  return { store, dir }
}

test('closing a helper Autobase leaves the shared root Corestore + siblings alive', async () => {
  const { store, dir } = await newStore()
  try {
    const bee = new Hyperbee(store.get({ name: 'userdata' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready(); await bee.put('k', 1)
    const m = await createEncryptedAutobaseManager(store, { applyOp: async () => {}, encryptionKey: ENC, viewName: 'thing' }).ready()
    await m.append({ x: 1 })
    await m.close()
    assert.equal(store.closed, false, 'root store must stay open after a consumer closes')
    await bee.put('after', 2) // a sibling Hyperbee on the same root still works
    assert.equal((await bee.get('after')).value, 2)
    await bee.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})

test('NameRegistry mint→close→reopen on a shared store (the ensureNameRegistry sequence)', async () => {
  const { store, dir } = await newStore()
  const ka = crypto.keyPair()
  try {
    const bee = new Hyperbee(store.get({ name: 'userdata' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready()
    const mint = await new NameRegistry(store, { bootstrap: null, encryptionKey: ENC, namespace: 'name-registry' }).ready()
    const key = mint.key
    await mint.close()
    assert.equal(store.closed, false)
    await bee.put('settings', { nameRegKey: key }) // the setSettings that used to crash on a dead store
    const reg = await new NameRegistry(store, { bootstrap: key, encryptionKey: ENC, namespace: 'name-registry' }).ready()
    await reg.claim({ name: 'alice', target: 'aa'.repeat(32), owner: hex(ka.publicKey) }, signer(ka))
    assert.equal((await reg.resolve('alice')).target, 'aa'.repeat(32))
    await reg.close(); await bee.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})

test('two helper consumers coexist on ONE shared store without colliding', async () => {
  const { store, dir } = await newStore()
  try {
    const A = await createEncryptedAutobaseManager(store, { applyOp: async (op, v) => { await v.put('a!' + op.n, op) }, encryptionKey: ENC, viewName: 'cons-a' }).ready()
    const B = await createEncryptedAutobaseManager(store, { applyOp: async (op, v) => { await v.put('b!' + op.n, op) }, encryptionKey: ENC, viewName: 'cons-b' }).ready()
    assert.notEqual(A.key, B.key, 'distinct viewName ⇒ distinct base identity (no deterministic local-core collision)')
    await A.append({ n: '1' }); await B.append({ n: '2' })
    await A.update(); await B.update()
    await A.close()
    assert.equal(store.closed, false) // closing A must not kill B's root
    await B.append({ n: '3' }); await B.update() // B still fully operational
    await B.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})
