// Regression for the N5-wiring review HIGH finding, applied to the device-sync
// consumer: a BrowserStateSync Autobase's close() must NOT tear down the SHARED
// root Corestore (which backs Hyperdrive / UserData / Names / replication for the
// whole app). The CMD_SYNC_CREATE "Set up sync" flow mints an Autobase then
// closes it; on the RAW root store that store.close() killed everything. Fix:
// BrowserStateSync namespaces its Autobase into a FIXED substore, so close()
// frees only that substore and reopen-by-key still finds the minted writer.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import b4a from 'b4a'
import syncMod from '../backend/browser-state-sync.cjs'
const { BrowserStateSync } = syncMod
const ENC = b4a.toString(b4a.alloc(32, 0x5a), 'hex')

async function newStore () {
  const dir = await mkdtemp(join(tmpdir(), 'bss-shared-'))
  const store = new Corestore(dir); await store.ready()
  return { store, dir }
}

test('closing a BrowserStateSync leaves the shared root Corestore + siblings alive', async () => {
  const { store, dir } = await newStore()
  try {
    const bee = new Hyperbee(store.get({ name: 'userdata' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready(); await bee.put('k', 1)
    const sync = await new BrowserStateSync(store, { bootstrap: null, encryptionKey: ENC }).ready()
    await sync.addBookmark({ url: 'hyper://alpha', title: 'Alpha', addedAt: 1 })
    await sync.close()
    assert.equal(store.closed, false, 'root store must stay open after the sync consumer closes')
    await bee.put('after', 2) // a sibling Hyperbee on the same root still works
    assert.equal((await bee.get('after')).value, 2)
    await bee.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})

test('BrowserStateSync mint→close→reopen on a shared store (the CMD_SYNC_CREATE sequence)', async () => {
  const { store, dir } = await newStore()
  try {
    const bee = new Hyperbee(store.get({ name: 'userdata' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready()
    // Mint with a unique throwaway namespace (as the live "Set up sync" did), then
    // close — the root store must survive so setSettings can persist the key.
    const mint = await new BrowserStateSync(store, { bootstrap: null, encryptionKey: ENC, namespace: 'bss-mint-once' }).ready()
    const key = mint.key
    assert.equal(mint.writable, true)
    await mint.close()
    assert.equal(store.closed, false, 'root store must stay open after the mint closes')
    await bee.put('settings', { syncKey: key }) // the setSettings that used to crash on a dead store
    // Reopen by key (no namespace, as ensureBrowserSync does) — must find the
    // minted writer in the fixed substore and stay writable.
    const reg = await new BrowserStateSync(store, { bootstrap: key, encryptionKey: ENC }).ready()
    assert.equal(reg.writable, true, 'reopen-by-key must stay writable (mint writer recovered)')
    await reg.addBookmark({ url: 'hyper://beta', title: 'Beta', addedAt: 2 })
    const st = await reg.state()
    assert.deepEqual(st.bookmarks.map((b) => b.url), ['hyper://beta'])
    await reg.close(); await bee.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})
