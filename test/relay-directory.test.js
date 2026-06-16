// Phase 5 — relay-directory bootstrap merge (RelayClient.listRelays). Pure +
// node-safe (relay-client.js itself needs bare-http1, so the mergeable logic
// lives here and is unit-tested outside Bare).
import test from 'node:test'
import assert from 'node:assert/strict'
import mod from '../backend/relay-directory.js'

const { mergeRelayDirectory } = mod

test('keeps current relays + adds discovered gateways (deduped, slash-normalized)', () => {
  const r = mergeRelayDirectory(
    [{ gatewayUrl: 'https://a.relay/' }, { gatewayUrl: 'https://b.relay' }],
    ['http://127.0.0.1:9100'])
  assert.deepEqual(r.relays.slice().sort(), ['http://127.0.0.1:9100', 'https://a.relay', 'https://b.relay'].sort())
  assert.equal(r.discovered, 2)
  assert.equal(r.verified, 0)
})

test('skips non-http gateways + null/empty rows; current set kept', () => {
  const r = mergeRelayDirectory(
    [{ gatewayUrl: 'ftp://x' }, { gatewayUrl: 'https://a.relay///' }, { gatewayUrl: null }, {}],
    ['https://a.relay'])
  assert.deepEqual(r.relays, ['https://a.relay'], 'only the valid https gateway, deduped against current')
  assert.equal(r.discovered, 4)
})

test('verifier: only rows whose signed doc verifies are adopted', () => {
  const verify = (doc) => !!(doc && doc.good === true)
  const r = mergeRelayDirectory([
    { gatewayUrl: 'https://good.relay', doc: { good: true } },
    { gatewayUrl: 'https://bad.relay', doc: { good: false } },
    { gatewayUrl: 'https://nodoc.relay' } // no doc → dropped under a verifier
  ], [], verify)
  assert.deepEqual(r.relays, ['https://good.relay'])
  assert.equal(r.verified, 1)
})

test('a verifier that throws drops the row (never trusts the index writer)', () => {
  const verify = () => { throw new Error('boom') }
  const r = mergeRelayDirectory([{ gatewayUrl: 'https://x.relay', doc: {} }], [], verify)
  assert.deepEqual(r.relays, [])
  assert.equal(r.verified, 0)
})

test('garbage/empty input → just the current set', () => {
  assert.deepEqual(mergeRelayDirectory(null, ['https://a']).relays, ['https://a'])
  assert.deepEqual(mergeRelayDirectory([], ['https://a']).relays, ['https://a'])
  assert.deepEqual(mergeRelayDirectory([{ gatewayUrl: 'https://b' }], []).relays, ['https://b'])
})
