// Regression for the N5-wiring review HIGH finding, applied to the collaborative
// (Autobee) catalog consumer: an AutobeeCatalogManager Autobase's close() must
// NOT tear down the SHARED root Corestore (Hyperdrive / UserData / Names /
// replication). createAutobeeCatalog mints an Autobase then closes it; on the RAW
// root store that store.close() killed everything. Fix: the manager namespaces
// its Autobase into a per-catalog (`_ns`-keyed) substore, so close() frees only
// that substore, multiple catalogs stay isolated, and reopen-by-key still finds
// the minted writer.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import managerMod from '../backend/autobee-catalog-manager.cjs'
const { AutobeeCatalogManager } = managerMod

async function newStore () {
  const dir = await mkdtemp(join(tmpdir(), 'acat-shared-'))
  const store = new Corestore(dir); await store.ready()
  return { store, dir }
}

test('closing an AutobeeCatalogManager leaves the shared root Corestore + siblings alive', async () => {
  const { store, dir } = await newStore()
  try {
    const bee = new Hyperbee(store.get({ name: 'userdata' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready(); await bee.put('k', 1)
    const cat = await new AutobeeCatalogManager(store, { bootstrap: null, namespace: 'one' }).ready()
    await cat.upsertApp({ id: 'keet', name: 'Keet', driveKey: 'a'.repeat(64) })
    await cat.close()
    assert.equal(store.closed, false, 'root store must stay open after the catalog consumer closes')
    await bee.put('after', 2) // a sibling Hyperbee on the same root still works
    assert.equal((await bee.get('after')).value, 2)
    await bee.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})

test('catalog mint→close→reopen on a shared store (the createAutobeeCatalog sequence)', async () => {
  const { store, dir } = await newStore()
  try {
    const bee = new Hyperbee(store.get({ name: 'userdata' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready()
    // Mint under a unique throwaway namespace (as createAutobeeCatalog does), close,
    // then reopen by key — the root must survive and the reopen must stay writable.
    const mint = await new AutobeeCatalogManager(store, { bootstrap: null, namespace: 'mint-once' }).ready()
    const key = mint.key
    await mint.close()
    assert.equal(store.closed, false, 'root store must stay open after the mint closes')
    await bee.put('settings', { catalogKey: key }) // a write that used to crash on a dead store
    const owner = await new AutobeeCatalogManager(store, { bootstrap: key }).ready()
    assert.equal(owner.writable, true, 'reopen-by-key must stay writable (mint writer recovered)')
    await owner.rename('My Picks')
    await owner.upsertApp({ id: 'app1', name: 'App One', driveKey: 'd'.repeat(64) })
    const data = await owner.catalog()
    assert.equal(data.name, 'My Picks')
    assert.deepEqual(data.apps.map((a) => a.id), ['app1'])
    await owner.close(); await bee.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})

test('two catalogs coexist on ONE shared store without colliding', async () => {
  const { store, dir } = await newStore()
  try {
    const A = await new AutobeeCatalogManager(store, { bootstrap: null, namespace: 'cat-a' }).ready()
    const B = await new AutobeeCatalogManager(store, { bootstrap: null, namespace: 'cat-b' }).ready()
    assert.notEqual(A.key, B.key, 'distinct namespaces ⇒ distinct catalog keys (no writer-core collision)')
    await A.upsertApp({ id: 'a', name: 'A', driveKey: 'a'.repeat(64) })
    await B.upsertApp({ id: 'b', name: 'B', driveKey: 'b'.repeat(64) })
    await A.close()
    assert.equal(store.closed, false) // closing A must not kill B's root
    await B.upsertApp({ id: 'b2', name: 'B2', driveKey: 'c'.repeat(64) }) // B still fully operational
    assert.deepEqual((await B.catalog()).apps.map((x) => x.id).sort(), ['b', 'b2'])
    await B.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})
