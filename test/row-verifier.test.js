// Step 5b — the federated RowVerifier (QueryPlanner._verifyPeerSources). Each
// peer doc is verified against the peer's RESOLVED search key before it can rank;
// bad signatures, unresolvable peers, and oversized shards are bounded. Uses real
// d! records (search-core) signed by a per-peer key; no swarm needed.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import scMod from '../backend/search-core.cjs'
import ibMod from '../backend/identity-binding.cjs'
import sfMod from '../backend/search-federation.cjs'
import qpMod from '../backend/query-planner.js'
const sc = scMod; const ib = ibMod; const sf = sfMod
const { QueryPlanner } = qpMod

const hex = (b) => b4a.toString(b, 'hex')
const DOC_NS = 'lighthouse-doc-v2'

// a peer with a search keypair and `docs` signed into real d! records as hits
function peerWithDocs (docs) {
  const kp = crypto.keyPair()
  const sign = (canonDoc) => ({
    sig: hex(crypto.sign(ib.appMessage('search', JSON.stringify(canonDoc), DOC_NS), kp.secretKey)),
    pubkey: hex(kp.publicKey),
  })
  const hits = docs.map((d, i) => {
    const { records } = sc.buildDocRecords(d, sign)
    return { tf: i + 1, rec: records.find(([k]) => k.startsWith('d!'))[1] }
  })
  return { rootPubkey: 'peer-' + hex(kp.publicKey).slice(0, 8), searchPubkey: hex(kp.publicKey), hits, kp }
}
const mkPlanner = () => new QueryPlanner({ identity: { getSigningKeypair: () => crypto.keyPair() } })

test('verifies a peer\'s validly-signed docs into candidates', () => {
  const planner = mkPlanner()
  const peer = peerWithDocs([
    { driveKey: 'd1', path: '/', title: 'A', body: 'alpha beta' },
    { driveKey: 'd2', path: '/', title: 'B', body: 'gamma delta' },
  ])
  const sources = planner._verifyPeerSources([peer])
  assert.equal(sources.length, 1)
  assert.equal(sources[0].candidates.length, 2)
  assert.equal(planner._verifyBudgetExhausted, false)
  assert.equal(sources[0].candidates[0].signerPubkey, peer.searchPubkey) // resolved key, not self-asserted
})

test('drops an unresolvable peer (no search key) without spending a verify', () => {
  const planner = mkPlanner()
  const peer = peerWithDocs([{ driveKey: 'd1', path: '/', title: 'A', body: 'alpha beta' }])
  peer.searchPubkey = null
  assert.deepEqual(planner._verifyPeerSources([peer]), [])
})

test('drops a peer after a single forged posting (junk-peer DoS bound)', () => {
  const planner = mkPlanner()
  const peer = peerWithDocs([
    { driveKey: 'd1', path: '/', title: 'A', body: 'alpha beta' },
    { driveKey: 'd2', path: '/', title: 'B', body: 'gamma delta' },
    { driveKey: 'd3', path: '/', title: 'C', body: 'epsilon zeta' },
  ])
  peer.hits[1].rec = { ...peer.hits[1].rec, title: 'FORGED' } // tamper after signing
  const sources = planner._verifyPeerSources([peer])
  assert.equal(sources.length, 1)
  assert.equal(sources[0].candidates.length, 1)        // only the valid doc before the forgery
  assert.equal(sources[0].candidates[0].title, 'A')
})

test('a single peer is capped at the per-peer limit (fairness, not global exhaustion)', () => {
  const planner = mkPlanner()
  const docs = Array.from({ length: 300 }, (_, i) => ({ driveKey: 'd' + i, path: '/', title: 'T' + i, body: 'common term here' }))
  const sources = planner._verifyPeerSources([peerWithDocs(docs)])
  assert.equal(sources[0].candidates.length, 128)      // per-peer cap
  assert.equal(planner._verifyBudgetExhausted, false)  // one peer can't exhaust the global budget
})

test('per-peer cap leaves room for other peers (no starvation)', () => {
  const planner = mkPlanner()
  const p1 = peerWithDocs(Array.from({ length: 300 }, (_, i) => ({ driveKey: 'a' + i, path: '/', title: 'A' + i, body: 'common term here' })))
  const p2 = peerWithDocs([{ driveKey: 'b1', path: '/', title: 'B', body: 'common term here' }])
  const sources = planner._verifyPeerSources([p1, p2])
  assert.equal(sources.length, 2)                      // both peers represented
  assert.equal(sources[0].candidates.length, 128)      // p1 capped
  assert.equal(sources[1].candidates.length, 1)        // p2 still served
})

test('the shared budget caps total verifies across many peers', () => {
  const planner = mkPlanner()
  const peers = [0, 1, 2].map((n) =>
    peerWithDocs(Array.from({ length: 200 }, (_, i) => ({ driveKey: `p${n}d${i}`, path: '/', title: `P${n}T${i}`, body: 'common term here' }))))
  const sources = planner._verifyPeerSources(peers)
  const total = sources.reduce((s, x) => s + x.candidates.length, 0)
  assert.equal(total, 256)                             // global ceiling = 128 + 128
  assert.equal(planner._verifyBudgetExhausted, true)
})

test('mergeFederated dedups self vs peer — the self copy (hop 0) wins', () => {
  const graph = sf.buildTrustGraph('self', [{ from: 'self', to: 'peer' }], { maxFollowHops: 2 })
  const cand = (sig) => ({ docId: 'X', driveKey: 'dX', path: '/', title: 'X', tf: 3, publishedAt: 0, contentHash: '', signerPubkey: sig })
  const merged = sf.mergeFederated([
    { rootPubkey: 'self', candidates: [cand('selfkey')] },
    { rootPubkey: 'peer', candidates: [cand('peerkey')] },
  ], graph, { now0: 0, limit: 10 })
  assert.equal(merged.length, 1)
  assert.equal(merged[0].trustHop, 0)
  assert.equal(merged[0].tier, 'self')
})
