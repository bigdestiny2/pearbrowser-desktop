// Live smoke for ENCRYPTED multi-device browser-state sync (Rollout Phase 4).
// Two devices that share the encryption key converge on the same bookmark set
// over real autobase; a third device WITHOUT the key replicates the bytes but
// cannot read them. Run on demand (not part of `npm test`):
//
//   node scripts/browser-state-sync-smoke.js
//
// Exit 0 = converged, encryption enforced, restart deterministic.

import Corestore from 'corestore'
import b4a from 'b4a'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import syncMod from '../backend/browser-state-sync.cjs'
const { BrowserStateSync } = syncMod

// The shared device-pairing secret. In the app this is a random 32-byte key
// carried in the pairing invite alongside the bootstrap key.
const ENC = b4a.alloc(32, 0x5a)

const tmps = []
async function tmpStore () {
  const dir = await mkdtemp(join(tmpdir(), 'bss-smoke-'))
  tmps.push(dir)
  return new Corestore(dir)
}
function wire (a, b) {
  const s1 = a.replicate(true)
  const s2 = b.replicate(false)
  s1.on('error', () => {}); s2.on('error', () => {})
  s1.pipe(s2).pipe(s1)
  return () => { try { s1.destroy() } catch {} try { s2.destroy() } catch {} }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function until (label, predicate, ms = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await predicate()) return true; await sleep(150) }
  throw new Error(`timeout waiting for: ${label}`)
}
function assert (cond, msg) { if (!cond) throw new Error('ASSERT FAILED: ' + msg) }
const urls = (s) => s.bookmarks.map((b) => b.url).sort()

async function main () {
  console.log('🔐 Encrypted multi-device browser-state sync smoke\n')

  // --- Device A creates the encrypted sync base --------------------------
  const storeA = await tmpStore()
  const A = await new BrowserStateSync(storeA, { bootstrap: null, encryptionKey: ENC, namespace: 'devA' }).ready()
  console.log('  · A created   key:', A.key.slice(0, 16) + '…  writable:', A.writable)
  assert(A.writable, 'creator must be writable')
  await A.addBookmark({ url: 'hyper://alpha', title: 'Alpha', addedAt: 1 })

  // --- Device B pairs (same key + encryption key) ------------------------
  const storeB = await tmpStore()
  const B = await new BrowserStateSync(storeB, { bootstrap: A.key, encryptionKey: ENC }).ready()
  const unwireB = wire(storeA, storeB)
  console.log('  · B paired    writerKey:', B.localKey.slice(0, 16) + '…  writable:', B.writable)

  await until('B (with key) reads A\'s bookmark', async () => urls(await B.state()).includes('hyper://alpha'))
  const roB = await B.state()
  assert(roB.writable === false, 'B must be read-only before invite')
  console.log('  · B reads (read-only):', urls(roB).join(', '))

  // A invites B as a writer.
  await A.addWriter(B.localKey)
  await until('B becomes writable', async () => { await B.update(); return B.writable })
  console.log('  · B is now writable:', B.writable)

  // --- Concurrent edits from both devices --------------------------------
  await Promise.all([
    A.addBookmark({ url: 'hyper://beta', title: 'Beta', addedAt: 2 }),
    B.addBookmark({ url: 'hyper://gamma', title: 'Gamma', addedAt: 3 })
  ])
  await B.removeBookmark('hyper://alpha') // remove the one A added at boot

  await until('A and B converge', async () => {
    await A.update(); await B.update()
    const a = urls(await A.state()); const b = urls(await B.state())
    return a.length > 0 && JSON.stringify(a) === JSON.stringify(b)
  })
  const finalA = urls(await A.state()); const finalB = urls(await B.state())
  console.log('\n  A bookmarks:', finalA.join(', '))
  console.log('  B bookmarks:', finalB.join(', '))
  assert(JSON.stringify(finalA) === JSON.stringify(finalB), 'A and B must converge')
  assert(JSON.stringify(finalA) === JSON.stringify(['hyper://beta', 'hyper://gamma']), 'expected beta+gamma (alpha removed)')

  // --- Compaction: checkpoint current state and prune local view history ---
  const compactedA = await A.compact()
  await until('B reads A\'s compacted checkpoint', async () => {
    await A.update(); await B.update()
    const b = await B.state()
    return JSON.stringify(urls(b)) === JSON.stringify(finalA) &&
      b.retentionAudit &&
      b.retentionAudit.compactedOps >= 4
  })
  const compactedB = await B.state()
  console.log('  · compacted retained ops:', compactedA.retentionAudit.retainedOps, '| checkpointed:', compactedA.retentionAudit.compactedOps)
  assert(compactedA.retentionAudit.retainedOps <= 2, 'compaction should prune older local view operations')
  assert(compactedB.retentionAudit.compactedOps >= 4, 'paired device must apply compact checkpoint evidence')

  // --- Device C has the bytes but NOT the key → cannot read --------------
  const storeC = await tmpStore()
  const C = await new BrowserStateSync(storeC, { bootstrap: A.key, encryptionKey: null }).ready()
  const unwireC = wire(storeA, storeC)
  for (let i = 0; i < 20; i++) { await C.update().catch(() => {}); await sleep(150) }
  const leaked = urls(await C.state().catch(() => ({ bookmarks: [] })))
  console.log('  C (no key) reads:', leaked.length ? leaked.join(', ') : '(nothing — encrypted)')
  assert(leaked.length === 0, 'a device without the encryption key must not read bookmarks')

  // --- Restart determinism: reopen A by key + key ------------------------
  // Close the bases AND the underlying stores: BrowserStateSync now namespaces
  // its Autobase substore, so sync.close() frees only that substore and leaves
  // the root Corestore open — the on-disk reopen needs the store fully closed
  // first (two Corestores on one dir would otherwise overlap).
  unwireB(); unwireC()
  await A.close(); await B.close(); await C.close()
  await storeA.close(); await storeB.close(); await storeC.close()
  const storeA2 = new Corestore(tmps[0])
  const A2 = await new BrowserStateSync(storeA2, { bootstrap: A.key, encryptionKey: ENC, namespace: 'devA' }).ready()
  const reopenedState = await A2.state()
  const reopened = urls(reopenedState)
  console.log('  · A reopened from disk:', reopened.join(', '), '| writable:', A2.writable)
  assert(JSON.stringify(reopened) === JSON.stringify(finalA), 'reopened view must match (op log rebuilds same view)')
  assert(A2.writable, 'reopened owner must stay writable')
  assert(reopenedState.storageAudit && reopenedState.storageAudit.ok, 'storage audit must be within sync snapshot bounds')
  assert(reopenedState.retentionAudit && reopenedState.retentionAudit.compactedOps >= 4, 'retention audit must preserve compaction evidence after restart')
  await A2.close(); await storeA2.close()

  console.log('RESULT:', JSON.stringify({
    ok: true,
    devices: 3,
    bookmarks: finalA.length,
    writerPromotion: B.writable === true,
    keylessReaderBlocked: leaked.length === 0,
    restartDeterministic: JSON.stringify(reopened) === JSON.stringify(finalA),
    storageAuditOk: reopenedState.storageAudit.ok,
    storageLimits: reopenedState.storageAudit.limits,
    retentionAuditOk: reopenedState.retentionAudit.ok,
    retainedOps: reopenedState.retentionAudit.retainedOps,
    compactedOps: reopenedState.retentionAudit.compactedOps
  }))
  console.log('\n✅ PASS — encrypted sync converges, key-gated, compacted, restart deterministic')
}

main()
  .then(async () => { await cleanup(); process.exit(0) })
  .catch(async (err) => {
    console.error('RESULT:', JSON.stringify({ ok: false, error: err && err.message }))
    console.error('\n❌ FAIL:', err && err.message)
    await cleanup()
    process.exit(1)
  })

async function cleanup () {
  for (const dir of tmps) { try { await rm(dir, { recursive: true, force: true }) } catch {} }
}
