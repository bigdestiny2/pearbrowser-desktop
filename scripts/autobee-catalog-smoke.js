// Live two-writer convergence smoke test for the Autobee collaborative
// catalog (Rollout Phase 1 — docs/AUTOBEE-RESEARCH.md). Exercises REAL
// autobase: two independent Corestores, a writer-invite handshake,
// concurrent edits, bidirectional replication, and convergence — plus a
// read-only (non-writer) instance.
//
// Run on demand (NOT part of `npm test`, since it spins up swarmless
// replication and can take a few seconds):
//
//   node scripts/autobee-catalog-smoke.js
//
// Exit 0 = converged + all assertions held; non-zero = failure.

import Corestore from 'corestore'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// Manager is CommonJS (backend/, Bare-native); default-import + destructure.
import managerMod from '../backend/autobee-catalog-manager.cjs'
const { AutobeeCatalogManager } = managerMod

const tmps = []
async function tmpStore () {
  const dir = await mkdtemp(join(tmpdir(), 'autobee-smoke-'))
  tmps.push(dir)
  return new Corestore(dir)
}

// Pipe two corestores together so their cores replicate live.
function wire (a, b) {
  const s1 = a.replicate(true)
  const s2 = b.replicate(false)
  s1.on('error', () => {})
  s2.on('error', () => {})
  s1.pipe(s2).pipe(s1)
  return () => { try { s1.destroy() } catch {} try { s2.destroy() } catch {} }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Poll until predicate() or timeout — autobase needs a few ticks to linearize
// across the replication stream.
async function until (label, predicate, ms = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await predicate()) return true
    await sleep(150)
  }
  throw new Error(`timeout waiting for: ${label}`)
}

function assert (cond, msg) { if (!cond) throw new Error('ASSERT FAILED: ' + msg) }

async function main () {
  console.log('🐝 Autobee collaborative-catalog smoke test\n')

  // --- Writer A boots a fresh catalog ------------------------------------
  const storeA = await tmpStore()
  // Explicit namespace so the create (bootstrap=null) and the later reopen
  // (bootstrap=A.key) address the SAME local view core. (Load-by-key in the
  // app defaults the namespace to the stable bootstrap key, so this only
  // matters for the create-then-reopen path the smoke exercises.)
  const A = await new AutobeeCatalogManager(storeA, { namespace: 'smoke' }).ready()
  console.log('  · A booted   autobase key:', A.key.slice(0, 16) + '…  writable:', A.writable)
  assert(A.writable, 'creator A must be writable')

  await A.rename('Shared Picks')
  await A.upsertApp({ id: 'keet', name: 'Keet', driveKey: 'a'.repeat(64) })

  // --- Writer B joins as a read-only replica first -----------------------
  const storeB = await tmpStore()
  const B = await new AutobeeCatalogManager(storeB, { bootstrap: A.key }).ready()
  const unwire = wire(storeA, storeB)
  console.log('  · B booted   local key:', B.localKey.slice(0, 16) + '…  writable:', B.writable)

  // B can read A's catalog even before being granted write.
  await until('B sees Keet (read-only replica)', async () => {
    const cat = (await B.catalog()).apps.map((a) => a.id)
    return cat.includes('keet')
  })
  const roView = await B.catalog()
  assert(roView.writable === false, 'B must report writable:false before invite')
  console.log('  · B (read-only) sees apps:', roView.apps.map((a) => a.id).join(', '), '| writable:', roView.writable)

  // --- A invites B as a writer -------------------------------------------
  await A.addWriter(B.localKey)
  await until('B becomes writable after invite', async () => {
    await B.update()
    return B.writable
  })
  console.log('  · B is now writable:', B.writable)

  // --- Concurrent edits from both writers --------------------------------
  await Promise.all([
    A.upsertApp({ id: 'pearpass', name: 'PearPass', driveKey: 'b'.repeat(64) }),
    B.upsertApp({ id: 'hiveworm', name: 'HiveWorm', driveKey: 'c'.repeat(64) })
  ])
  // B removes the app A added at boot; later linear order decides the winner.
  await B.removeApp('keet')

  // --- Converge ----------------------------------------------------------
  await until('A and B converge', async () => {
    await A.update(); await B.update()
    const a = (await A.catalog()).apps.map((x) => x.id).sort()
    const b = (await B.catalog()).apps.map((x) => x.id).sort()
    return a.length > 0 && JSON.stringify(a) === JSON.stringify(b)
  })

  const finalA = await A.catalog()
  const finalB = await B.catalog()
  const idsA = finalA.apps.map((x) => x.id).sort()
  const idsB = finalB.apps.map((x) => x.id).sort()
  console.log('\n  A view:', finalA.name, '→', idsA.join(', '))
  console.log('  B view:', finalB.name, '→', idsB.join(', '))

  assert(JSON.stringify(idsA) === JSON.stringify(idsB), 'A and B must converge to identical app sets')
  assert(finalA.name === finalB.name && finalA.name === 'Shared Picks', 'catalog name must converge')
  assert(idsA.includes('pearpass') && idsA.includes('hiveworm'), 'both concurrent upserts must survive')

  // --- Restart determinism: reopen A's store from disk -------------------
  // The manager now namespaces its Autobase substore, so A.close() frees only
  // that substore and leaves storeA open — close storeA before reopening a fresh
  // Corestore on the same dir (two Corestores on one dir would otherwise overlap).
  unwire()
  await A.close(); await storeA.close()
  const storeA2 = await reopen()
  const A2 = await new AutobeeCatalogManager(storeA2, { bootstrap: A.key, namespace: 'smoke' }).ready()
  const reopened = await A2.catalog()
  console.log('  · A reopened from disk →', reopened.apps.map((x) => x.id).sort().join(', '))
  assert(JSON.stringify(reopened.apps.map((x) => x.id).sort()) === JSON.stringify(idsA),
    'reopened view must match pre-restart view (op log rebuilds same view)')

  await B.close(); await storeB.close()
  await A2.close(); await storeA2.close()

  await createPatternScenario()

  console.log('\n✅ PASS — converged, read-only enforced, restart deterministic, owner-create verified')
}

// Reopen the same on-disk corestore (last temp dir A used).
async function reopen () {
  const dir = tmps[0]
  return new Corestore(dir)
}

// Mirrors catalog-manager.createAutobeeCatalog: mint the autobase key under a
// throwaway namespace, close, then reopen by key (default key-derived
// namespace) — it must still be writable — then rename + add an app. This is
// the exact owner-create dance the RPC layer performs.
async function createPatternScenario () {
  console.log('\n  — owner-create pattern (mint → reopen-by-key) —')
  const dir = await mkdtemp(join(tmpdir(), 'autobee-smoke-create-'))
  tmps.push(dir)

  // mint.close() now frees only the manager's namespaced substore (not the whole
  // Corestore), so close the mint store before reopening a fresh one on the dir.
  const mintStore = new Corestore(dir)
  const mint = await new AutobeeCatalogManager(mintStore, { bootstrap: null, namespace: 'mint' }).ready()
  const keyHex = mint.key
  await mint.close(); await mintStore.close()

  const ownerStore = new Corestore(dir)
  const owner = await new AutobeeCatalogManager(ownerStore, { bootstrap: keyHex }).ready()
  assert(owner.writable, 'owner reopened by key must be writable')
  await owner.rename('My Picks')
  await owner.upsertApp({ id: 'app1', name: 'App One', driveKey: 'd'.repeat(64) })
  const cat = await owner.catalog()
  console.log('  · created → name:', cat.name, '| apps:', cat.apps.map((a) => a.id).join(','), '| writable:', cat.writable)
  assert(cat.name === 'My Picks' && cat.apps.length === 1 && cat.writable,
    'created catalog must be writable with the rename + app applied')
  await owner.close(); await ownerStore.close()
}

main()
  .then(async () => { await cleanup(); process.exit(0) })
  .catch(async (err) => { console.error('\n❌ FAIL:', err && err.message); await cleanup(); process.exit(1) })

async function cleanup () {
  for (const dir of tmps) { try { await rm(dir, { recursive: true, force: true }) } catch {} }
}
