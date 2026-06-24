// Tests for backend/query-planner.js — the federated-search orchestrator.
// Step 3 covers the SearchFanoutBudget and the LOCAL-ONLY planAndSearch path
// (peer I/O is a clean no-op until Step 5). Real Corestore-backed PersonalIndex;
// identity + contacts stubbed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import piMod from '../backend/personal-index.cjs'
import qpMod from '../backend/query-planner.js'
const { PersonalIndex } = piMod
const { QueryPlanner, SearchFanoutBudget } = qpMod

const hex = (b) => b4a.toString(b, 'hex')
const fakeCore = () => ({ closed: false, close () { this.closed = true } })

function fakeIdentity () {
  const root = crypto.keyPair()
  return { rootHex: hex(root.publicKey), getSigningKeypair: () => root }
}
function fakeContacts () {
  let list = []
  return { list: async () => list, _set: (l) => { list = l } }
}

async function withPlanner (fn) {
  const dir = await mkdtemp(join(tmpdir(), 'query-planner-'))
  const store = new Corestore(dir)
  await store.ready()
  const personalIndex = await new PersonalIndex(store).ready()
  const identity = fakeIdentity()
  const contacts = fakeContacts()
  const planner = new QueryPlanner({ personalIndex, contacts, identity, budget: new SearchFanoutBudget() })
  try { return await fn({ planner, personalIndex, identity, setContacts: contacts._set }) }
  finally { await personalIndex.close(); await store.close(); await rm(dir, { recursive: true, force: true }) }
}

// --- SearchFanoutBudget ------------------------------------------------------

test('budget: per-query connect counter resets on beginQuery and caps at maxConnectsPerQuery', () => {
  const b = new SearchFanoutBudget({ maxConnectsPerQuery: 2, maxLiveSessions: 10, maxNewJoinsPerMinute: 100 })
  b.beginQuery()
  assert.equal(b.canConnect(), true)
  b.noteConnect(); assert.equal(b.canConnect(), true)
  b.noteConnect(); assert.equal(b.canConnect(), false) // 2 reached this query
  b.beginQuery(); assert.equal(b.canConnect(), true)   // reset for the next query
})

test('budget: toBudgetArg reflects remaining cold-connect slots', () => {
  const b = new SearchFanoutBudget({ maxConnectsPerQuery: 4 })
  b.beginQuery()
  assert.equal(b.toBudgetArg().maxConnectsPerQuery, 4)
  b.noteConnect()
  assert.equal(b.toBudgetArg().maxConnectsPerQuery, 3)
})

test('budget: LRU touch evicts + closes the least-recently-used session at the ceiling', () => {
  const b = new SearchFanoutBudget({ maxLiveSessions: 2 })
  const c1 = fakeCore(); const c2 = fakeCore(); const c3 = fakeCore()
  b.touch('r1', c1); b.touch('r2', c2)
  assert.equal(b.sessions.size, 2)
  b.touch('r3', c3) // over ceiling → evict r1 (oldest)
  assert.equal(b.sessions.size, 2)
  assert.equal(c1.closed, true)
  assert.deepEqual([...b.warmRoots()].sort(), ['r2', 'r3'])
})

test('budget: re-touching an existing session refreshes it (not evicted as oldest)', () => {
  const b = new SearchFanoutBudget({ maxLiveSessions: 2 })
  const c1 = fakeCore(); const c2 = fakeCore(); const c3 = fakeCore()
  b.touch('r1', c1); b.touch('r2', c2)
  b.touch('r1', c1)  // r1 now most-recent; r2 is oldest
  b.touch('r3', c3)  // evicts r2, keeps r1
  assert.equal(c2.closed, true)
  assert.equal(c1.closed, false)
  assert.deepEqual([...b.warmRoots()].sort(), ['r1', 'r3'])
})

test('budget: per-minute join-rate window gates new connects', () => {
  let t = 1_000_000
  const b = new SearchFanoutBudget({ maxNewJoinsPerMinute: 2, now: () => t })
  b.beginQuery()
  b.noteConnect(); b.noteConnect()
  assert.equal(b._joinsInWindow(), 2)
  assert.equal(b.canConnect(), false) // join window full
  t += 61_000                         // roll past the 60s window
  assert.equal(b._joinsInWindow(), 0)
})

// --- QueryPlanner ------------------------------------------------------------

test('planAndSearch local-only path matches personalIndex.search exactly', async () => {
  await withPlanner(async ({ planner, personalIndex }) => {
    await personalIndex.indexDoc({ driveKey: 'd1', path: '/', title: 'Keet', body: 'encrypted peer to peer chat' })
    await personalIndex.indexDoc({ driveKey: 'd2', path: '/', title: 'PearPass', body: 'peer to peer password manager' })
    await personalIndex.indexDoc({ driveKey: 'd3', path: '/', title: 'Recipes', body: 'bake bread at home peer' })
    const now0 = 1700000000000
    const direct = await personalIndex.search('peer', { now0, limit: 50 })
    const fed = await planner.planAndSearch('peer', { now0, limit: 50 })
    assert.ok(fed.results.length > 0)
    assert.deepEqual(fed.results.map((r) => r.docId), direct.map((r) => r.docId))
    assert.deepEqual(fed.results.map((r) => r.driveKey), direct.map((r) => r.driveKey))
    // self results are tagged hop-0 / self by the merge
    assert.ok(fed.results.every((r) => r.trustHop === 0 && r.tier === 'self'))
    assert.equal(fed.verifyBudgetExhausted, false)
    assert.equal(fed.digestHit, false)
    assert.equal(fed.fallbackPull, false)
    assert.equal(fed.partial, false)
    assert.deepEqual(fed.provenance, {
      digestHit: false,
      fallbackPull: false,
      partial: false,
      plannedPeers: 0,
      pulledPeers: 0,
      digestSkipped: 0
    })
  })
})

test('planAndSearch returns [] for a no-match query (federation no-op)', async () => {
  await withPlanner(async ({ planner, personalIndex }) => {
    await personalIndex.indexDoc({ driveKey: 'd1', path: '/', title: 'Keet', body: 'encrypted chat' })
    const fed = await planner.planAndSearch('nonexistentterm', { now0: 1, limit: 50 })
    assert.deepEqual(fed.results, [])
  })
})

test('_trustSnapshot puts direct contacts at hop 1 (followed), others at default', async () => {
  await withPlanner(async ({ planner, setContacts }) => {
    const friend = 'aa'.repeat(32)
    setContacts([{ pubkey: friend }])
    const snap = await planner._trustSnapshot()
    assert.equal(snap.graph.hopOf(snap.selfRoot), 0)
    assert.equal(snap.graph.tierOf(snap.selfRoot), 'self')
    assert.equal(snap.graph.hopOf(friend), 1)
    assert.equal(snap.graph.tierOf(friend), 'followed')
    assert.equal(snap.graph.tierOf('bb'.repeat(32)), 'default')
    assert.deepEqual(snap.contactRoots, [friend])
  })
})

test('_trustSnapshot ingests bounded signed TRUST rows into graph and frontier bindings', async () => {
  await withPlanner(async ({ planner, setContacts }) => {
    const friend = '66'.repeat(32)
    const curator = '77'.repeat(32)
    const unreachable = '88'.repeat(32)
    const bindingKey = '99'.repeat(32)
    setContacts([{ pubkey: friend }])
    planner.getTrustRows = async () => [
      { memberkey: b4a.from(friend, 'hex'), json: { curatorRoot: curator, bindingKey } },
      { memberkey: b4a.from(unreachable, 'hex'), json: { curatorRoot: 'aa'.repeat(32), bindingKey: 'bb'.repeat(32) } },
      { memberkey: b4a.from(friend, 'hex'), curatorRoot: 'cc'.repeat(32), bindingKey: 'dd'.repeat(32) }
    ]

    const snap = await planner._trustSnapshot()
    assert.deepEqual(snap.contactRoots, [friend])
    assert.deepEqual(snap.frontierRoots, [friend, curator])
    assert.equal(snap.graph.hopOf(friend), 1)
    assert.equal(snap.graph.hopOf(curator), 2)
    assert.equal(snap.graph.tierOf(curator), 'followed')
    assert.equal(snap.trustedBindings.get(curator).bindingKey, bindingKey)
    assert.equal(snap.trustedBindings.has('aa'.repeat(32)), false)
  })
})

test('_fetchOnePeerHits may resolve a reachable TRUST-row binding for a non-contact peer', async () => {
  await withPlanner(async ({ planner }) => {
    const peer = '77'.repeat(32)
    const bindingKey = '99'.repeat(32)
    let resolveArg = null
    planner.contacts = { lookup: async () => null }
    planner.bindingPublisher = {
      resolve: async (arg) => {
        resolveArg = arg
        return null
      }
    }
    planner._trustedPeerBindings = new Map([[peer, { bindingKey, vouchedBy: '66'.repeat(32), hop: 1 }]])

    const res = await planner._fetchOnePeerHits(peer, 'peer', ['peer'], Date.now() + 1000)
    assert.deepEqual(resolveArg, { contactPubkey: peer, dhtPubkey: bindingKey, allowUnlisted: true })
    assert.equal(res.stat.reason, 'no-binding')
  })
})

test('planAndSearch pulls digest-hit peers and skips known digest misses', async () => {
  await withPlanner(async ({ planner, setContacts }) => {
    const hit = '11'.repeat(32)
    const miss = '22'.repeat(32)
    const unknown = '33'.repeat(32)
    setContacts([{ pubkey: hit }, { pubkey: miss }, { pubkey: unknown }])
    planner._digestCache.set(hit, { v: 1, topTerms: ['peer'] })
    planner._digestCache.set(miss, { v: 1, topTerms: ['recipes'] })

    let fetched = []
    planner._fetchPeerHits = async (roots) => { fetched = roots; return [] }

    const fed = await planner.planAndSearch('peer', { now0: 1, limit: 50 })
    assert.deepEqual(fetched, [hit])
    assert.equal(fed.digestHit, true)
    assert.equal(fed.fallbackPull, false)
    assert.equal(fed.partial, true)
    assert.equal(fed.provenance.plannedPeers, 3)
    assert.equal(fed.provenance.pulledPeers, 1)
    assert.equal(fed.provenance.digestSkipped, 1)
  })
})

test('planAndSearch marks no-digest peer fanout as fallback and partial', async () => {
  await withPlanner(async ({ planner, setContacts }) => {
    const friend = '44'.repeat(32)
    setContacts([{ pubkey: friend }])

    let fetched = []
    planner._fetchPeerHits = async (roots) => { fetched = roots; return [] }

    const fed = await planner.planAndSearch('peer', { now0: 1, limit: 50 })
    assert.deepEqual(fetched, [friend])
    assert.equal(fed.digestHit, false)
    assert.equal(fed.fallbackPull, true)
    assert.equal(fed.partial, true)
    assert.deepEqual(fed.provenance, {
      digestHit: false,
      fallbackPull: true,
      partial: true,
      plannedPeers: 1,
      pulledPeers: 1,
      digestSkipped: 0
    })
  })
})

test('planAndSearch emits incremental peer batches as verified peer data arrives', async () => {
  await withPlanner(async ({ planner, setContacts }) => {
    const friend = '55'.repeat(32)
    setContacts([{ pubkey: friend }])

    const peerData = { rootPubkey: friend, searchPubkey: 'p', hits: [{ tf: 4, rec: { docId: 'remote' } }] }
    planner._fetchPeerHits = async (roots, query, opts = {}) => {
      assert.deepEqual(roots, [friend])
      await opts.onPeerData(peerData, { rootPubkey: friend, reason: 'ok', hits: 1 }, [{ rootPubkey: friend, reason: 'ok', hits: 1 }])
      return [peerData]
    }
    planner._verifyPeerSources = (rows) => rows.map((row) => ({
      rootPubkey: row.rootPubkey,
      candidates: [{
        docId: 'remote',
        driveKey: 'remote-drive',
        path: '/',
        title: 'Remote peer search',
        tf: 4,
        publishedAt: 0,
        contentHash: 'remote-hash',
        signerPubkey: row.searchPubkey
      }]
    }))

    const batches = []
    const fed = await planner.planAndSearch('peer', {
      now0: 1,
      limit: 50,
      onPeerBatch: (payload) => batches.push(payload)
    })

    assert.equal(batches.length, 1)
    assert.equal(batches[0].phase, 'batch')
    assert.equal(batches[0].partial, true)
    assert.deepEqual(batches[0].results.map((r) => r.docId), ['remote'])
    assert.equal(batches[0].provenance.completedPeers, 1)
    assert.deepEqual(fed.results.map((r) => r.docId), ['remote'])
    assert.equal(fed.phase, 'enriched')
  })
})
