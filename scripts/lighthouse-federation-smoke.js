// Live smoke for Lighthouse FEDERATED search (Step 5c). Node A indexes docs and
// publishes its IdentityBinding (bound search key + index core key); Node B, who
// has A as a contact carrying A's binding DHT key, replicates A's index over a
// direct wire and runs the REAL QueryPlanner.planAndSearch — finding and
// cryptographically verifying A's doc, then rejecting a tampered index. Run on
// demand (NOT part of `npm test`, like the other swarm smokes):
//
//   node scripts/lighthouse-federation-smoke.js
//
// The direct corestore wire stands in for the swarm transport (swarm.join is a
// no-op here); everything else — binding resolve, replication, signed-hit scan,
// per-doc verify, trust-ranked merge — is the production code path.
import Corestore from 'corestore'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import piMod from '../backend/personal-index.cjs'
import ibMod from '../backend/identity-binding.cjs'
import pubMod from '../backend/identity-binding-publisher.js'
import qpMod from '../backend/query-planner.js'
const { PersonalIndex } = piMod
const ib = ibMod
const { IdentityBindingPublisher } = pubMod
const { QueryPlanner, SearchFanoutBudget } = qpMod

const hex = (b) => b4a.toString(b, 'hex')
const tmps = []
async function tmpStore () { const d = await mkdtemp(join(tmpdir(), 'lh-fed-')); tmps.push(d); return new Corestore(d) }
function wire (a, b) {
  const s1 = a.replicate(true); const s2 = b.replicate(false)
  s1.on('error', () => {}); s2.on('error', () => {})
  s1.pipe(s2).pipe(s1)
  return () => { try { s1.destroy() } catch {} try { s2.destroy() } catch {} }
}
function fakeIdentity () {
  const root = crypto.keyPair(); const appKeys = new Map()
  return {
    rootHex: hex(root.publicKey),
    getSigningKeypair: () => root,
    sign: (m) => ({ signature: hex(crypto.sign(typeof m === 'string' ? b4a.from(m, 'utf-8') : m, root.secretKey)), publicKey: hex(root.publicKey), algorithm: 'ed25519' }),
    getAppKeypair: (name) => { if (!appKeys.has(name)) appKeys.set(name, crypto.keyPair()); return appKeys.get(name) },
  }
}
function makeDHT () {
  const m = new Map()
  return {
    async mutablePut (kp, value, { seq } = {}) { const k = hex(kp.publicKey); const prev = m.get(k); if (prev && prev.seq > (seq ?? 0)) return prev; const e = { value: b4a.from(value), seq: seq ?? 0 }; m.set(k, e); return e },
    async mutableGet (pub) { const e = m.get(hex(pub)); return e ? { value: e.value, seq: e.seq } : null },
  }
}
function assert (c, m) { if (!c) throw new Error('ASSERT FAILED: ' + m) }

async function main () {
  console.log('🔦 Lighthouse federated-search smoke\n')
  const dht = makeDHT()

  // --- Node A: index docs + publish binding ------------------------------
  const idA = fakeIdentity()
  const storeA = await tmpStore()
  let pubA
  const piA = await new PersonalIndex(storeA, { sign: (cd) => pubA.signDocSync(JSON.stringify(cd)) }).ready()
  pubA = await new IdentityBindingPublisher({ ib, identity: idA, personalIndex: piA, contacts: null, dht }).ready()
  // index BEFORE publishing so the completeness anchor + digest reflect the docs
  await piA.indexDoc({ driveKey: 'd1', path: '/', title: 'Keet', body: 'encrypted peer to peer chat' })
  await piA.indexDoc({ driveKey: 'd2', path: '/', title: 'Recipes', body: 'how to bake bread at home' })
  const published = await pubA.publish()
  console.log('  · A published binding  search=' + published.searchPubkey.slice(0, 12) + '…  index=' + published.indexKey.slice(0, 12) + '…  digest-terms=' + (published.digest ? published.digest.topTerms.length : 0))

  // --- Node B: has A as a contact (with A's binding DHT key) --------------
  const idB = fakeIdentity()
  const storeB = await tmpStore()
  let pubB
  const piB = await new PersonalIndex(storeB, { sign: (cd) => pubB.signDocSync(JSON.stringify(cd)) }).ready()
  const contactA = { pubkey: idA.rootHex, bindingKey: published.dhtPubkey, verifiedAt: 1 }
  const contactsB = {
    list: async () => [contactA],
    lookup: async (pk) => (pk === idA.rootHex ? contactA : null),
  }
  pubB = await new IdentityBindingPublisher({ ib, identity: idB, personalIndex: piB, contacts: contactsB, dht }).ready()

  const unwire = wire(storeA, storeB)
  const planner = new QueryPlanner({
    personalIndex: piB, contacts: contactsB, identity: idB,
    swarm: { join () {} }, // no-op: the wire already replicates
    store: storeB, budget: new SearchFanoutBudget(), bindingPublisher: pubB,
    log: (m) => console.log('    ' + m),
  })

  // --- B runs the REAL federated query -----------------------------------
  const res = await planner.planAndSearch('chat', { now0: Date.now(), limit: 50 })
  console.log('\n  B "chat" →', res.results.map((r) => `${r.driveKey}(${r.tier}/hop${r.trustHop})`).join(', ') || '(none)')
  const hit = res.results.find((r) => r.driveKey === 'd1')
  assert(hit, "B must find A's doc d1 via federation")
  assert(hit.tier === 'followed' && hit.trustHop === 1, "A's result must be tagged followed/hop-1")
  assert(hit.signerPubkey === published.searchPubkey, "the result must be signed by A's resolved search key")

  // a non-matching query must not surface A
  const none = await planner.planAndSearch('nonexistentterm', { now0: Date.now(), limit: 50 })
  assert(none.results.length === 0, 'no false federation results')
  console.log('  B "nonexistentterm" → (none) ✓')

  unwire()
  await piA.close(); await piB.close(); await storeA.close(); await storeB.close()
  console.log('\n✅ PASS — B replicated, verified, and trust-ranked A\'s result over federated search')
}

main().then(async () => { await cleanup(); process.exit(0) })
  .catch(async (e) => { console.error('\n❌ FAIL:', e && e.message); await cleanup(); process.exit(1) })
async function cleanup () { for (const d of tmps) { try { await rm(d, { recursive: true, force: true }) } catch {} } }
