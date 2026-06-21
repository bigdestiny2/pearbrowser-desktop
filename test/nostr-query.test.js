// NOSTR Phase 2 — the NIP-01 query filter (pure) + a store publish→query
// integration: sign real events, store them in a NostrEventStore, query back.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import secpMod from '../backend/secp256k1-bundle.cjs'
import storeMod from '../backend/nostr-events-store.cjs'
import qMod from '../backend/nostr-query.cjs'
const secp = secpMod
const { NostrEventStore } = storeMod
const { matchesFilter, queryEvents } = qMod

const skA = '11'.repeat(32); const pkA = secp.schnorrGetPublicKey(skA)
const skB = '22'.repeat(32); const pkB = secp.schnorrGetPublicKey(skB)
const sign = (sk, { kind = 1, created_at = 1700000000, tags = [], content }) =>
  secp.nip01Sign({ pubkey: secp.schnorrGetPublicKey(sk), created_at, kind, tags, content }, sk)

test('matchesFilter: kinds/authors/ids (AND across fields, OR within a list), since/until, #tags', () => {
  const ev = sign(skA, { kind: 1, created_at: 1000, tags: [['e', 'evt1'], ['p', pkB]], content: 'hi' })
  assert.equal(matchesFilter(ev, {}), true)
  assert.equal(matchesFilter(ev, { kinds: [1, 2] }), true)
  assert.equal(matchesFilter(ev, { kinds: [2] }), false)
  assert.equal(matchesFilter(ev, { authors: [pkA] }), true)
  assert.equal(matchesFilter(ev, { authors: [pkB] }), false)
  assert.equal(matchesFilter(ev, { ids: [ev.id] }), true)
  assert.equal(matchesFilter(ev, { since: 999 }), true)
  assert.equal(matchesFilter(ev, { since: 1001 }), false)
  assert.equal(matchesFilter(ev, { until: 1000 }), true)
  assert.equal(matchesFilter(ev, { until: 999 }), false)
  assert.equal(matchesFilter(ev, { '#e': ['evt1'] }), true)
  assert.equal(matchesFilter(ev, { '#e': ['other'] }), false)
  assert.equal(matchesFilter(ev, { '#p': [pkB] }), true)
  assert.equal(matchesFilter(ev, { kinds: [1], authors: [pkB] }), false) // AND: author fails
})

test('queryEvents: newest-first, limit, deterministic', () => {
  const a = sign(skA, { created_at: 100, content: 'old' })
  const b = sign(skA, { created_at: 300, content: 'new' })
  const c = sign(skA, { created_at: 200, content: 'mid' })
  assert.deepEqual(queryEvents([a, b, c], { kinds: [1] }).map((e) => e.content), ['new', 'mid', 'old'])
  const limited = queryEvents([a, b, c], { limit: 2 })
  assert.equal(limited.length, 2)
  assert.equal(limited[0].content, 'new') // newest survive the cap
})

test('NostrEventStore: store signed events (unencrypted), then queryEvents filters them', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nq-'))
  const cs = new Corestore(dir); await cs.ready()
  const es = await new NostrEventStore(cs, { encryptionKey: null }).ready() // public event log
  try {
    await es.addEvent(sign(skA, { kind: 1, created_at: 100, content: 'first' }))
    await es.addEvent(sign(skA, { kind: 1, created_at: 200, content: 'second' }))
    await es.addEvent(sign(skA, { kind: 0, created_at: 150, content: '{"name":"meta"}' })) // a kind:0 profile
    const all = await es.listEvents()
    assert.equal(all.length, 3)
    assert.deepEqual(queryEvents(all, { kinds: [1], limit: 50 }).map((e) => e.content), ['second', 'first'])
    assert.equal(queryEvents(all, { kinds: [0] }).length, 1)
    assert.ok(es.discoveryKey) // exposed for swarm join (Phase 3 contact replication)
  } finally { await es.close(); await cs.close(); await rm(dir, { recursive: true, force: true }) }
})
