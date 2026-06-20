// Tests for backend/encrypted-autobase-helper.cjs — the reusable encrypted
// multi-writer Autobase manager (I4). Real Autobase convergence over a direct
// corestore wire (no swarm), with a trivial append-log consumer applyOp.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import b4a from 'b4a'
import helperMod from '../backend/encrypted-autobase-helper.cjs'
const { createEncryptedAutobaseManager, addWriterOp } = helperMod

const ENC = b4a.alloc(32, 0x5a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const tmps = []
function wireStores (a, b) {
  const s1 = a.replicate(true); const s2 = b.replicate(false)
  s1.on('error', () => {}); s2.on('error', () => {})
  s1.pipe(s2).pipe(s1)
  return () => { try { s1.destroy() } catch {} try { s2.destroy() } catch {} }
}
async function until (label, pred, ms = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await pred()) return true; await sleep(120) }
  throw new Error('timeout: ' + label)
}
// trivial consumer reducer: append each op to an ordered log
const applyOp = async (op, view) => {
  const head = await view.get('meta!count').catch(() => null)
  const count = head && Number.isFinite(head.value) ? head.value : 0
  await view.put('item!' + String(count).padStart(12, '0'), op)
  await view.put('meta!count', count + 1)
}
async function items (mgr) {
  await mgr.update()
  const out = []
  for await (const e of mgr.view.createReadStream({ gte: 'item!', lt: 'item!~' })) out.push(e.value)
  return out
}

async function withManagers (fn) {
  const opened = []
  const unwires = []
  const mk = async ({ encryptionKey = ENC, ...opts } = {}) => {
    const dir = await mkdtemp(join(tmpdir(), 'eab-')); tmps.push(dir)
    const store = new Corestore(dir)
    const mgr = await createEncryptedAutobaseManager(store, { applyOp, encryptionKey, ...opts }).ready()
    const dev = { mgr, store }
    opened.push(dev)
    return dev
  }
  const wire = (a, b) => unwires.push(wireStores(a.store, b.store))
  try { await fn({ mk, wire }) }
  finally {
    for (const u of unwires) { try { u() } catch {} }
    for (const { mgr } of opened) { try { await mgr.close() } catch {} }
    for (const { store } of opened) { try { await store.close() } catch {} }
  }
}

test('two encrypted managers converge after writer promotion', async () => {
  await withManagers(async ({ mk, wire }) => {
    const A = await mk({ bootstrap: null, namespace: 'A' })
    assert.equal(A.mgr.writable, true)
    await A.mgr.append({ v: 'a1' })

    const B = await mk({ bootstrap: A.mgr.key })
    wire(A, B)
    await until('B replicates a1', async () => (await items(B.mgr)).some((x) => x.v === 'a1'))
    assert.equal(B.mgr.writable, false) // read-only before invite

    await A.mgr.addWriter(B.mgr.localKey)
    await until('B writable', async () => { await B.mgr.update(); return B.mgr.writable })
    await B.mgr.append({ v: 'b1' })

    await until('converge', async () => {
      const a = (await items(A.mgr)).map((x) => x.v).sort()
      const b = (await items(B.mgr)).map((x) => x.v).sort()
      return a.length === 2 && JSON.stringify(a) === JSON.stringify(b)
    })
    assert.deepEqual((await items(A.mgr)).map((x) => x.v).sort(), ['a1', 'b1'])
  })
})

test('a manager without the encryption key replicates bytes but cannot read', async () => {
  await withManagers(async ({ mk, wire }) => {
    const A = await mk({ bootstrap: null, namespace: 'A' })
    await A.mgr.append({ v: 'secret' })
    const C = await mk({ bootstrap: A.mgr.key, encryptionKey: null }) // no key
    wire(A, C)
    for (let i = 0; i < 16; i++) { await C.mgr.update().catch(() => {}); await sleep(120) }
    const leaked = await items(C.mgr).catch(() => [])
    assert.equal(leaked.length, 0) // no plaintext without the key
  })
})

test('addWriterOp rejects a non-hex writer key', () => {
  assert.throws(() => addWriterOp('not-hex'), /64-char hex/)
  assert.equal(addWriterOp('aa'.repeat(32)).type, '__autobase_add_writer__')
})

test.after(async () => {
  for (const dir of tmps) { try { await rm(dir, { recursive: true, force: true }) } catch {} }
})
