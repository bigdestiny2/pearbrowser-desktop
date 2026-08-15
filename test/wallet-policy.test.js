import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { WalletPolicy } = require('../backend/wallet/wallet-policy.cjs')

const DRIVE_A = 'aa'.repeat(32)
const DRIVE_B = 'bb'.repeat(32)

function clock (start = 1_000_000) {
  const state = { now: start }
  return {
    now: () => state.now,
    advance: (ms) => { state.now += ms }
  }
}

function codeOf (fn) {
  try {
    fn()
  } catch (err) {
    return err.code
  }
  throw new Error('expected the call to throw')
}

test('prepare limit: 5 per minute per drive, sliding window', () => {
  const t = clock()
  const policy = new WalletPolicy({ now: t.now })
  for (let i = 0; i < 5; i++) {
    assert.equal(policy.checkPrepare(DRIVE_A), true)
    policy.recordPrepare(DRIVE_A)
  }
  assert.equal(codeOf(() => policy.checkPrepare(DRIVE_A)), 'rate-limited')
  // A different drive has its own window.
  assert.equal(policy.checkPrepare(DRIVE_B), true)
  // Half a window later the oldest stamp is still inside.
  t.advance(30_000)
  assert.equal(codeOf(() => policy.checkPrepare(DRIVE_A)), 'rate-limited')
  // After the full window slides past, the drive can prepare again.
  t.advance(31_000)
  assert.equal(policy.checkPrepare(DRIVE_A), true)
})

test('payment limit: 20 per hour per drive plus amount ceiling', () => {
  const t = clock()
  const policy = new WalletPolicy({ now: t.now })
  for (let i = 0; i < 20; i++) {
    assert.equal(policy.checkPayment(DRIVE_A, '1000000'), true)
    policy.recordPayment(DRIVE_A)
  }
  assert.equal(codeOf(() => policy.checkPayment(DRIVE_A, '1000000')), 'rate-limited')
  assert.equal(policy.checkPayment(DRIVE_B, '1000000'), true)
  t.advance(3_600_001)
  assert.equal(policy.checkPayment(DRIVE_A, '1000000'), true)
})

test('pruned stamp buckets are deleted instead of lingering empty', () => {
  const t = clock()
  const policy = new WalletPolicy({ now: t.now })
  policy.recordPrepare(DRIVE_A)
  policy.recordPayment(DRIVE_A)
  assert.equal(policy._prepares.size, 1)
  assert.equal(policy._payments.size, 1)
  t.advance(3_600_001)
  assert.equal(policy.checkPrepare(DRIVE_A), true)
  assert.equal(policy.checkPayment(DRIVE_A, '1000000'), true)
  assert.equal(policy._prepares.size, 0)
  assert.equal(policy._payments.size, 0)
  // Recording after the prune re-creates the bucket fresh.
  assert.equal(policy.recordPrepare(DRIVE_A), 1)
  assert.equal(policy._prepares.get(DRIVE_A).length, 1)
})

test('checkAmount enforces the manifest payment ceiling', () => {
  const policy = new WalletPolicy({ now: clock().now })
  assert.equal(policy.checkAmount('10000000'), '10000000')
  assert.equal(codeOf(() => policy.checkAmount('10000001')), 'cap-exceeded')
  assert.equal(codeOf(() => policy.checkAmount('0')), 'bad-request')
  assert.equal(codeOf(() => policy.checkAmount('1.5')), 'bad-request')
})

test('checkFee enforces the manifest fee ceiling', () => {
  const policy = new WalletPolicy({ now: clock().now })
  assert.equal(policy.checkFee('100000000000000000'), '100000000000000000')
  assert.equal(codeOf(() => policy.checkFee('100000000000000001')), 'cap-exceeded')
})

test('single in-flight prompt: second acquire fails with wallet-busy', () => {
  const t = clock()
  const policy = new WalletPolicy({ now: t.now })
  const acquired = policy.acquirePrompt('wpi_0123456789abcdef')
  assert.equal(acquired.expiresAt, 1_000_000 + 120_000)
  assert.equal(codeOf(() => policy.acquirePrompt('wpi_fedcba9876543210')), 'wallet-busy')
  assert.equal(policy.releasePrompt('wpi_fedcba9876543210'), false)
  assert.equal(policy.releasePrompt('wpi_0123456789abcdef'), true)
  assert.equal(policy.acquirePrompt('wpi_fedcba9876543210').id, 'wpi_fedcba9876543210')
})

test('prompt expiry is enforced against the injected clock', () => {
  const t = clock()
  const policy = new WalletPolicy({ now: t.now })
  policy.acquirePrompt('wpi_0123456789abcdef')
  assert.equal(policy.assertPrompt('wpi_0123456789abcdef'), true)
  assert.equal(codeOf(() => policy.assertPrompt('wpi_fedcba9876543210')), 'not-found')
  t.advance(120_001)
  assert.equal(codeOf(() => policy.assertPrompt('wpi_0123456789abcdef')), 'prompt-expired')
})

test('custom prompt TTL and validation of identifiers', () => {
  const t = clock()
  const policy = new WalletPolicy({ now: t.now, promptTtlMs: 1000 })
  assert.equal(codeOf(() => policy.acquirePrompt('no')), 'bad-request')
  policy.acquirePrompt('wpi_0123456789abcdef')
  t.advance(1001)
  assert.equal(codeOf(() => policy.assertPrompt('wpi_0123456789abcdef')), 'prompt-expired')
  assert.equal(codeOf(() => policy.checkPrepare('zz')), 'bad-request')
})

test('pendingPrompt is a frozen summary', () => {
  const policy = new WalletPolicy({ now: clock().now })
  assert.equal(policy.pendingPrompt, null)
  policy.acquirePrompt('wpi_0123456789abcdef')
  const pending = policy.pendingPrompt
  assert.equal(Object.isFrozen(pending), true)
  assert.equal(pending.id, 'wpi_0123456789abcdef')
})
