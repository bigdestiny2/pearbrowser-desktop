import test from 'node:test'
import assert from 'node:assert/strict'

import availabilityMod from '../backend/lighthouse-availability.cjs'

const { normalizePinEvidence, availabilityState, availabilitySummary } = availabilityMod

test('availabilityState separates local-only, seeded, and relay-confirmed evidence', () => {
  assert.equal(availabilityState(null), 'local-only')
  assert.equal(availabilityState({ seedAcceptances: 1 }), 'seeded')
  assert.equal(availabilityState({ durable: true, seedAcceptances: 1 }), 'relay-confirmed')
  assert.equal(availabilityState({ byteLengthLocal: 10, byteLengthRemoteMax: 10 }), 'relay-confirmed')
})

test('normalizePinEvidence clamps relay evidence to a compact safe shape', () => {
  const evidence = normalizePinEvidence({
    kind: 'app-outbox',
    keyHex: 'A'.repeat(64),
    discoveryKey: 'B'.repeat(64),
    state: 'bad-state',
    seedAcceptances: 1,
    seedRelays: [{ pubkey: 'relay-1', accepted: true }],
    error: 'x'.repeat(500)
  })

  assert.equal(evidence.keyHex, 'a'.repeat(64))
  assert.equal(evidence.discoveryKey, 'b'.repeat(64))
  assert.equal(evidence.state, 'seeded')
  assert.equal(evidence.seedRelays.length, 1)
  assert.equal(evidence.error.length, 240)
})

test('availabilitySummary reports searchable/discoverable/available states', () => {
  const summary = availabilitySummary({
    kind: 'personal-index',
    keyHex: 'c'.repeat(64),
    durable: true
  })
  assert.equal(summary.searchable, true)
  assert.equal(summary.discoverable, true)
  assert.equal(summary.available, 'relay-confirmed')
})
