// Browser-state device-sync INTEGRATION tests — real encrypted Autobase
// convergence between two+ devices (runs under node, like names.test.js).
//
// The pure reducer (linearize/applyView) is covered by browser-state.test.js.
// This file exercises what the reducer can't: real replication, writer
// promotion, read-only append rejection, over-the-wire tombstones, encryption
// gating, and restart determinism — the sequences a real second device hits.
// Patterns adapted from scripts/browser-state-sync-smoke.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import b4a from 'b4a'
import syncMod from '../backend/browser-state-sync.cjs'
const { BrowserStateSync } = syncMod

// Shared device-pairing secret (in the app: a random 32-byte key in the invite).
const ENC = b4a.alloc(32, 0x5a)

const tmps = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
function wire (a, b) {
  const s1 = a.replicate(true)
  const s2 = b.replicate(false)
  s1.on('error', () => {}); s2.on('error', () => {})
  s1.pipe(s2).pipe(s1)
  return () => { try { s1.destroy() } catch {} try { s2.destroy() } catch {} }
}
async function until (label, predicate, ms = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await predicate()) return true; await sleep(120) }
  throw new Error(`timeout waiting for: ${label}`)
}
const urls = (s) => (s.bookmarks || []).map((b) => b.url).sort()
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Spin up devices + replication links, then tear everything down deterministically
// so `node --test` exits cleanly (close bases, then stores, then unwire).
async function withDevices (fn) {
  const opened = []
  const unwires = []
  const mk = async ({ dir, ...opts } = {}) => {
    const d = dir || await mkdtemp(join(tmpdir(), 'bss-test-'))
    if (!dir) tmps.push(d)
    const store = new Corestore(d)
    const sync = await new BrowserStateSync(store, { encryptionKey: ENC, ...opts }).ready()
    const dev = { sync, store, dir: d }
    opened.push(dev)
    return dev
  }
  const link = (a, b) => unwires.push(wire(a.store, b.store))
  try {
    await fn({ mk, link })
  } finally {
    for (const u of unwires) { try { u() } catch {} }
    for (const { sync } of opened) { try { await sync.close() } catch {} }
    for (const { store } of opened) { try { await store.close() } catch {} }
  }
}

// Promote `b` to a writer of `a`'s base and wait until b sees itself writable.
async function promote (a, b) {
  await a.sync.addWriter(b.sync.localKey)
  await until('writer promoted', async () => { await b.sync.update(); return b.sync.writable })
}

test('full pairing dance: pair → read-only → promote → converge', async () => {
  await withDevices(async ({ mk, link }) => {
    const A = await mk({ bootstrap: null, namespace: 'A' })
    assert.equal(A.sync.writable, true) // creator is writable
    await A.sync.addBookmark({ url: 'hyper://alpha', title: 'Alpha', addedAt: 1 })

    const B = await mk({ bootstrap: A.sync.key })
    link(A, B)
    await until('B replicates A\'s bookmark', async () => urls(await B.sync.state()).includes('hyper://alpha'))
    assert.equal((await B.sync.state()).writable, false) // read-only before invite

    await promote(A, B)
    await B.sync.addBookmark({ url: 'hyper://beta', title: 'Beta', addedAt: 2 })

    await until('A and B converge', async () => {
      await A.sync.update(); await B.sync.update()
      const a = urls(await A.sync.state()); const b = urls(await B.sync.state())
      return a.length === 2 && eq(a, b)
    })
    assert.deepEqual(urls(await A.sync.state()), ['hyper://alpha', 'hyper://beta'])
  })
})

test('a read-only (un-promoted) device cannot append', async () => {
  await withDevices(async ({ mk, link }) => {
    const A = await mk({ bootstrap: null, namespace: 'A' })
    const B = await mk({ bootstrap: A.sync.key })
    link(A, B)
    await until('B paired', async () => { await B.sync.update(); return B.sync.localKey.length > 0 })
    assert.equal(B.sync.writable, false)
    await assert.rejects(() => B.sync.addBookmark({ url: 'hyper://x', title: 'X' }))
  })
})

test('add-before-update: concurrent adds from both devices both survive', async () => {
  await withDevices(async ({ mk, link }) => {
    const A = await mk({ bootstrap: null, namespace: 'A' })
    const B = await mk({ bootstrap: A.sync.key })
    link(A, B)
    await until('B sees the base', async () => { await B.sync.update(); return true })
    await promote(A, B)

    await Promise.all([
      A.sync.addBookmark({ url: 'hyper://from-a', title: 'A', addedAt: 1 }),
      B.sync.addBookmark({ url: 'hyper://from-b', title: 'B', addedAt: 2 }),
    ])
    await until('both adds converge', async () => {
      await A.sync.update(); await B.sync.update()
      const a = urls(await A.sync.state()); const b = urls(await B.sync.state())
      return a.length === 2 && eq(a, b)
    })
    assert.deepEqual(urls(await A.sync.state()), ['hyper://from-a', 'hyper://from-b'])
  })
})

test('tombstone wins over the wire: B removes a bookmark A added', async () => {
  await withDevices(async ({ mk, link }) => {
    const A = await mk({ bootstrap: null, namespace: 'A' })
    await A.sync.addBookmark({ url: 'hyper://doomed', title: 'Doomed', addedAt: 1 })
    const B = await mk({ bootstrap: A.sync.key })
    link(A, B)
    await until('B sees doomed', async () => urls(await B.sync.state()).includes('hyper://doomed'))
    await promote(A, B)

    await B.sync.removeBookmark('hyper://doomed')
    await until('removal converges to empty on both', async () => {
      await A.sync.update(); await B.sync.update()
      return urls(await A.sync.state()).length === 0 && urls(await B.sync.state()).length === 0
    })
    assert.deepEqual(urls(await A.sync.state()), [])
  })
})

test('title conflict on the same url converges deterministically', async () => {
  await withDevices(async ({ mk, link }) => {
    const A = await mk({ bootstrap: null, namespace: 'A' })
    const B = await mk({ bootstrap: A.sync.key })
    link(A, B)
    await until('B sees the base', async () => { await B.sync.update(); return true })
    await promote(A, B)

    await Promise.all([
      A.sync.addBookmark({ url: 'hyper://same', title: 'TitleFromA', addedAt: 1 }),
      B.sync.addBookmark({ url: 'hyper://same', title: 'TitleFromB', addedAt: 2 }),
    ])
    await until('both devices agree on one record', async () => {
      await A.sync.update(); await B.sync.update()
      const a = await A.sync.state(); const b = await B.sync.state()
      return a.bookmarks.length === 1 && b.bookmarks.length === 1 &&
             a.bookmarks[0].title === b.bookmarks[0].title
    })
    // both converge to the SAME single record + title (linearization is deterministic)
    const a = await A.sync.state(); const b = await B.sync.state()
    assert.equal(a.bookmarks.length, 1)
    assert.equal(a.bookmarks[0].url, 'hyper://same')
    assert.equal(a.bookmarks[0].title, b.bookmarks[0].title)
  })
})

test('a device without the encryption key replicates bytes but cannot read', async () => {
  await withDevices(async ({ mk, link }) => {
    const A = await mk({ bootstrap: null, namespace: 'A' })
    await A.sync.addBookmark({ url: 'hyper://secret', title: 'Secret', addedAt: 1 })
    const C = await mk({ bootstrap: A.sync.key, encryptionKey: null })
    link(A, C)
    for (let i = 0; i < 16; i++) { await C.sync.update().catch(() => {}); await sleep(120) }
    const leaked = urls(await C.sync.state().catch(() => ({ bookmarks: [] })))
    assert.equal(leaked.length, 0) // no plaintext without the key
  })
})

test('restart determinism: reopening from disk rebuilds the same view', async () => {
  await withDevices(async ({ mk }) => {
    const A = await mk({ bootstrap: null, namespace: 'A' })
    await A.sync.addBookmark({ url: 'hyper://one', title: 'One', addedAt: 1 })
    await A.sync.addBookmark({ url: 'hyper://two', title: 'Two', addedAt: 2 })
    await A.sync.removeBookmark('hyper://one')
    const before = urls(await A.sync.state())
    const key = A.sync.key
    const dir = A.dir
    await A.sync.close(); await A.store.close()

    // reopen on the same on-disk store
    const A2 = await mk({ dir, bootstrap: key, namespace: 'A' })
    const after = urls(await A2.sync.state())
    assert.deepEqual(after, before)
    assert.deepEqual(after, ['hyper://two'])
    assert.equal(A2.sync.writable, true) // reopened owner stays writable
  })
})

test.after(async () => {
  for (const dir of tmps) { try { await rm(dir, { recursive: true, force: true }) } catch {} }
})
