// Tests for backend/p2p-first-fetch.js — the P2P-first hybrid fetch (privacy):
// the relay must not be contacted when P2P can serve the content.
import test from 'node:test'
import assert from 'node:assert/strict'
import mod from '../backend/p2p-first-fetch.js'
const { p2pFirstFetch } = mod

const delay = (ms, val) => () => new Promise((r) => setTimeout(() => r(val), ms))
const immediate = (val) => () => Promise.resolve(val)

test('a P2P hit within the grace window never contacts the relay (privacy)', async () => {
  let relayCalls = 0
  const out = await p2pFirstFetch({
    fetchP2P: delay(5, { body: 'p2p' }),
    fetchRelay: () => { relayCalls++; return Promise.resolve({ body: 'relay' }) },
    graceMs: 50,
  })
  assert.equal(out.source, 'p2p')
  assert.equal(out.result.body, 'p2p')
  assert.equal(out.relayContacted, false)
  assert.equal(relayCalls, 0) // the relay was never even invoked
})

test('a P2P miss falls back to the relay', async () => {
  const out = await p2pFirstFetch({
    fetchP2P: immediate(null),
    fetchRelay: immediate({ body: 'relay' }),
    graceMs: 50,
  })
  assert.equal(out.source, 'relay')
  assert.equal(out.result.body, 'relay')
  assert.equal(out.relayContacted, true)
})

test('a slow P2P still wins the fallback race against a relay miss', async () => {
  let relayCalls = 0
  const out = await p2pFirstFetch({
    fetchP2P: delay(80, { body: 'p2p-late' }), // arrives after the grace window
    fetchRelay: () => { relayCalls++; return Promise.resolve(null) }, // relay miss
    graceMs: 20,
  })
  assert.equal(relayCalls, 1) // relay WAS contacted (P2P was slow)
  assert.equal(out.relayContacted, true)
  assert.equal(out.source, 'p2p') // ...but the late P2P result still won
  assert.equal(out.result.body, 'p2p-late')
})

test('relayFirst kill-switch restores the parallel race (relay can win)', async () => {
  const out = await p2pFirstFetch({
    fetchP2P: delay(40, { body: 'p2p' }),
    fetchRelay: delay(5, { body: 'relay' }),
    relayFirst: true,
  })
  assert.equal(out.source, 'relay') // the faster relay wins
  assert.equal(out.relayContacted, true)
})

test('both sources missing yields a null result', async () => {
  const out = await p2pFirstFetch({
    fetchP2P: immediate(null),
    fetchRelay: immediate(null),
    graceMs: 20,
  })
  assert.equal(out.result, null)
  assert.equal(out.source, null)
})

test('no relay configured → P2P-only, relay never contacted', async () => {
  const out = await p2pFirstFetch({
    fetchP2P: immediate({ body: 'p2p' }),
    fetchRelay: null,
  })
  assert.equal(out.source, 'p2p')
  assert.equal(out.relayContacted, false)
})

test('a fetchP2P that throws is treated as a miss (relay fallback)', async () => {
  const out = await p2pFirstFetch({
    fetchP2P: () => { throw new Error('p2p boom') },
    fetchRelay: immediate({ body: 'relay' }),
    graceMs: 20,
  })
  assert.equal(out.source, 'relay')
})
