// Unit tests for backend/wallet/wallet-chrome-reads.cjs — run with `node --test`.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  normalizeListLimit,
  projectJournalEntry,
  projectJournalEntries,
  balancesUnavailable
} from '../backend/wallet/wallet-chrome-reads.cjs'

test('normalizeListLimit defaults, clamps and rejects', () => {
  assert.equal(normalizeListLimit(undefined), DEFAULT_LIST_LIMIT)
  assert.equal(normalizeListLimit(null), DEFAULT_LIST_LIMIT)
  assert.equal(normalizeListLimit(1), 1)
  assert.equal(normalizeListLimit(MAX_LIST_LIMIT), MAX_LIST_LIMIT)
  assert.equal(normalizeListLimit(MAX_LIST_LIMIT + 1), null) // over the cap
  assert.equal(normalizeListLimit(0), null)
  assert.equal(normalizeListLimit(-3), null)
  assert.equal(normalizeListLimit(1.5), null)
  assert.equal(normalizeListLimit('20'), null) // no string coercion
  assert.equal(normalizeListLimit(NaN), null)
})

test('projectJournalEntry keeps only the safe display fields', () => {
  const entry = {
    seq: 7,
    ts: 1720000000000,
    type: 'intent',
    intentType: 'payment',
    intentId: 'wpi_abc123',
    driveKey: 'a'.repeat(64),
    manifestSha256: 'b'.repeat(64),
    intent: {
      scheme: 'pear.wallet.pay.v1',
      chainId: 'eip155:1',
      assetId: 'usdt0',
      recipient: '0x000000000000000000000000000000000000dEaD',
      amountAtomic: '1234567',
      reference: 'secret note from the app',
      idempotencyKey: 'idem-1'
    }
  }
  const out = projectJournalEntry(entry)
  assert.deepEqual(out, {
    type: 'intent',
    ts: 1720000000000,
    intentId: 'wpi_abc123',
    driveKey: 'a'.repeat(64),
    intentType: 'payment',
    amountAtomic: '1234567',
    recipient: '0x000000000000000000000000000000000000dEaD'
  })
  // Nothing else survives the projection.
  const json = JSON.stringify(out)
  assert.ok(!json.includes('manifestSha256'))
  assert.ok(!json.includes('secret note'))
  assert.ok(!json.includes('idempotencyKey'))
  assert.ok(!json.includes('chainId'))
})

test('projectJournalEntry projects outcomes and ignores junk', () => {
  assert.deepEqual(
    projectJournalEntry({ type: 'outcome', ts: 1, intentId: 'wpi_x', state: 'submitted', transactionHash: '0xabc', code: 'fee-too-high' }),
    { type: 'outcome', ts: 1, intentId: 'wpi_x', transactionHash: '0xabc', state: 'submitted' }
  )
  assert.equal(projectJournalEntry(null), null)
  assert.equal(projectJournalEntry([]), null)
  assert.equal(projectJournalEntry({ ts: 1 }), null) // no type
  assert.deepEqual(projectJournalEntry({ type: 'connect' }), { type: 'connect', ts: null })
})

test('projectJournalEntry never lifts intent fields for non-payment intents', () => {
  const out = projectJournalEntry({
    type: 'intent',
    ts: 5,
    intentType: 'sign-app',
    intent: { payloadHash: 'c'.repeat(64), amountAtomic: '1', recipient: '0xabc' }
  })
  assert.equal(out.amountAtomic, undefined)
  assert.equal(out.recipient, undefined)
  assert.equal(out.intentType, 'sign-app')
})

test('projectJournalEntries drops unprojectable entries', () => {
  const out = projectJournalEntries([
    { type: 'connect', ts: 1, driveKey: 'd'.repeat(64) },
    null,
    { nope: true },
    { type: 'disconnect', ts: 2 }
  ])
  assert.equal(out.length, 2)
  assert.equal(out[0].type, 'connect')
  assert.equal(out[1].type, 'disconnect')
  assert.deepEqual(projectJournalEntries('nope'), [])
  assert.deepEqual(projectJournalEntries(undefined), [])
})

test('balancesUnavailable keeps coded engine errors, falls back otherwise', () => {
  const coded = new Error('endpoint down')
  coded.code = 'rpc-unavailable'
  assert.deepEqual(balancesUnavailable(coded), { unavailable: true, code: 'rpc-unavailable' })
  assert.deepEqual(balancesUnavailable(new Error('boom')), { unavailable: true, code: 'operation-failed' })
  assert.deepEqual(balancesUnavailable(undefined), { unavailable: true, code: 'operation-failed' })
})
