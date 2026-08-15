import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { WalletConsentBroker, DEFAULT_TIMEOUT_MS } = require('../backend/wallet/wallet-consent.cjs')

const NOW = 1_700_000_000_000
const DRIVE_A = 'aa'.repeat(32)
const MANIFEST_SHA256 = 'bb'.repeat(32)
const RECIPIENT = '0x2222222222222222222222222222222222222222'
const TX_HASH = '0x' + 'ab'.repeat(32)
const PAYLOAD_HASH = 'ef'.repeat(32)
const TUPLE = { browserSessionId: 'sess-1', tabId: 'tab-1', driveKey: DRIVE_A, walletTabOrigin: 'http://127.0.0.1:1' }
const EVT = { connect: 112, payment: 113, txUpdate: 114 }

// Minimal WalletService double: records calls and returns canned resolutions.
class FakeWalletService {
  constructor () {
    this.resolveCalls = []
    this.connectCalls = []
    this.onResolve = null // optional fn(intentId, approved) → result | throw
  }

  async resolvePrompt (intentId, approved) {
    this.resolveCalls.push({ intentId, approved })
    if (this.onResolve) return this.onResolve(intentId, approved)
    const result = { intentId, state: approved ? 'submitted' : 'rejected' }
    if (approved) result.transactionHash = TX_HASH
    return Object.freeze(result)
  }

  async connect (tuple, token, manifest) {
    this.connectCalls.push({ tuple, token, manifest })
    return Object.freeze({ connected: true, driveKey: tuple.driveKey, manifestSha256: manifest.manifestSha256 })
  }
}

function makeBroker (overrides = {}) {
  const emitted = []
  const service = new FakeWalletService()
  const broker = new WalletConsentBroker({
    walletService: service,
    emit: (evt, data) => emitted.push({ evt, data }),
    events: EVT,
    timeoutMs: overrides.timeoutMs,
    // Fixed clock by default so prompt.expiresAt (= NOW + 60s) is always in
    // the future; tests that exercise expiry inject their own mutable clock.
    now: overrides.now || (() => NOW)
  })
  return { broker, service, emitted }
}

// Prompts carry decoy secret-adjacent material (tokens, manifests,
// idempotency keys) so the tests prove none of it leaks into the EVT payload.
function paymentPrompt (overrides = {}) {
  return {
    type: 'payment',
    intentId: 'wpi_testpayment01',
    intent: {
      driveKey: DRIVE_A,
      manifestSha256: MANIFEST_SHA256,
      recipient: RECIPIENT,
      amountAtomic: '1250000',
      reference: 'order-1842',
      idempotencyKey: 'checkout:SECRET:attempt-1',
      token: 'SECRET-DOCUMENT-TOKEN'
    },
    expiresAt: NOW + 60_000,
    ...overrides
  }
}

function signAppPrompt (overrides = {}) {
  return {
    type: 'sign-app',
    intentId: 'wpi_testsignapp01',
    intent: { driveKey: DRIVE_A, manifestSha256: MANIFEST_SHA256, payloadHash: PAYLOAD_HASH, token: 'SECRET-DOCUMENT-TOKEN' },
    expiresAt: NOW + 60_000,
    ...overrides
  }
}

function connectPrompt (overrides = {}) {
  return {
    type: 'connect',
    intentId: 'wpi_testconnect01',
    intent: { driveKey: DRIVE_A, manifestSha256: MANIFEST_SHA256, chainId: 'eip155:2201', assetId: 'stable-testnet-usdt0', appName: 'Example checkout' },
    token: 'SECRET-DOCUMENT-TOKEN',
    manifest: { name: 'Example checkout', manifestSha256: MANIFEST_SHA256, secret: 'SECRET-MANIFEST' },
    expiresAt: NOW + 60_000,
    ...overrides
  }
}

test('constructor validates its dependencies', () => {
  assert.throws(() => new WalletConsentBroker(), /requires/)
  assert.throws(() => new WalletConsentBroker({ walletService: {}, emit: () => {}, events: { connect: 112 } }), /events\./)
  assert.equal(DEFAULT_TIMEOUT_MS, 120 * 1000)
})

test('park → safe EVT payload → approve settles with the service result', async () => {
  const { broker, service, emitted } = makeBroker()
  const promise = broker.request(paymentPrompt(), TUPLE)

  assert.equal(broker.pendingCount, 1)
  assert.equal(emitted.length, 1)
  assert.equal(emitted[0].evt, EVT.payment)
  const payload = emitted[0].data
  assert.deepEqual(payload, {
    intentId: 'wpi_testpayment01',
    type: 'payment',
    driveKey: DRIVE_A,
    manifestSha256: MANIFEST_SHA256,
    expiresAt: NOW + 60_000,
    recipient: RECIPIENT,
    amountAtomic: '1250000',
    reference: 'order-1842'
  })
  assert.ok(!JSON.stringify(payload).includes('SECRET'), 'EVT payload must be secret-free')

  const result = await broker.resolve('wpi_testpayment01', true, ['payment', 'sign-app'])
  assert.equal(result.state, 'submitted')
  assert.equal(result.transactionHash, TX_HASH)
  assert.deepEqual(service.resolveCalls, [{ intentId: 'wpi_testpayment01', approved: true }])
  assert.equal(await promise, result)
  assert.equal(broker.pendingCount, 0)

  // Payment settlement pushes a sanitized EVT_WALLET_TX_UPDATE.
  assert.equal(emitted.length, 2)
  assert.equal(emitted[1].evt, EVT.txUpdate)
  assert.deepEqual(emitted[1].data, { intentId: 'wpi_testpayment01', state: 'submitted', transactionHash: TX_HASH })
})

test('reject path resolves with state rejected and emits tx update', async () => {
  const { broker, service, emitted } = makeBroker()
  const promise = broker.request(paymentPrompt(), TUPLE)
  const result = await broker.resolve('wpi_testpayment01', false, ['payment', 'sign-app'])
  assert.equal(result.state, 'rejected')
  assert.deepEqual(service.resolveCalls, [{ intentId: 'wpi_testpayment01', approved: false }])
  assert.equal(await promise, result)
  assert.deepEqual(emitted[1], { evt: EVT.txUpdate, data: { intentId: 'wpi_testpayment01', state: 'rejected' } })
})

test('sign-app prompts use the payment event and emit no tx update', async () => {
  const { broker, service, emitted } = makeBroker()
  service.onResolve = (intentId, approved) => Object.freeze({ intentId, state: approved ? 'signed' : 'rejected' })
  const promise = broker.request(signAppPrompt(), TUPLE)

  assert.equal(emitted[0].evt, EVT.payment)
  assert.deepEqual(emitted[0].data, {
    intentId: 'wpi_testsignapp01',
    type: 'sign-app',
    driveKey: DRIVE_A,
    manifestSha256: MANIFEST_SHA256,
    expiresAt: NOW + 60_000,
    payloadHash: PAYLOAD_HASH
  })
  assert.ok(!JSON.stringify(emitted[0].data).includes('SECRET'))

  const result = await broker.resolve('wpi_testsignapp01', true, ['payment', 'sign-app'])
  assert.equal(result.state, 'signed')
  assert.equal(await promise, result)
  assert.equal(emitted.length, 1, 'no EVT_WALLET_TX_UPDATE for sign-app')
})

test('connect approve calls service.connect with the parked token and manifest', async () => {
  const { broker, service, emitted } = makeBroker()
  const prompt = connectPrompt()
  const promise = broker.request(prompt, TUPLE)

  assert.equal(emitted[0].evt, EVT.connect)
  const payload = emitted[0].data
  assert.deepEqual(payload, {
    intentId: 'wpi_testconnect01',
    type: 'connect',
    driveKey: DRIVE_A,
    manifestSha256: MANIFEST_SHA256,
    expiresAt: NOW + 60_000,
    appName: 'Example checkout',
    chainId: 'eip155:2201',
    assetId: 'stable-testnet-usdt0'
  })
  assert.ok(!JSON.stringify(payload).includes('SECRET'), 'token and manifest must stay server-side')

  const result = await broker.resolve('wpi_testconnect01', true, 'connect')
  assert.equal(result.connected, true)
  assert.deepEqual(service.connectCalls, [{ tuple: TUPLE, token: prompt.token, manifest: prompt.manifest }])
  assert.deepEqual(service.resolveCalls, [], 'connect prompts never touch resolvePrompt')
  assert.equal(await promise, result)
})

test('connect reject resolves with state rejected and never connects', async () => {
  const { broker, service } = makeBroker()
  const promise = broker.request(connectPrompt(), TUPLE)
  const result = await broker.resolve('wpi_testconnect01', false, 'connect')
  assert.deepEqual(result, { intentId: 'wpi_testconnect01', state: 'rejected' })
  assert.deepEqual(service.connectCalls, [])
  assert.equal(await promise, result)
})

test('timeout auto-rejects with prompt-expired and releases the service prompt', async () => {
  const { broker, service } = makeBroker({ timeoutMs: 30 })
  const promise = broker.request(paymentPrompt(), TUPLE)
  await assert.rejects(promise, (err) => err.code === 'prompt-expired')
  assert.equal(broker.pendingCount, 0)
  assert.deepEqual(service.resolveCalls, [{ intentId: 'wpi_testpayment01', approved: false }])
  await assert.rejects(broker.resolve('wpi_testpayment01', true), (err) => err.code === 'not-found')
})

test('double-resolve fails closed with not-found', async () => {
  const { broker } = makeBroker()
  const promise = broker.request(paymentPrompt(), TUPLE)
  await broker.resolve('wpi_testpayment01', true)
  await promise
  await assert.rejects(broker.resolve('wpi_testpayment01', true), (err) => err.code === 'not-found')
})

test('resolve-after-expiry is rejected server-side', async () => {
  let now = NOW
  const { broker, service } = makeBroker({ now: () => now, timeoutMs: 60_000 })
  const promise = broker.request(paymentPrompt(), TUPLE)
  now += 61_000 // past prompt.expiresAt
  await assert.rejects(broker.resolve('wpi_testpayment01', true), (err) => err.code === 'prompt-expired')
  await assert.rejects(promise, (err) => err.code === 'prompt-expired')
  assert.deepEqual(service.resolveCalls, [], 'an expired prompt never reaches the service')
  assert.equal(broker.pendingCount, 0)
})

test('resolve command type guard cannot settle the wrong prompt kind', async () => {
  const { broker } = makeBroker()
  const promise = broker.request(paymentPrompt(), TUPLE)
  await assert.rejects(broker.resolve('wpi_testpayment01', true, 'connect'), (err) => err.code === 'bad-request')
  assert.equal(broker.pendingCount, 1, 'type-mismatched resolve leaves the prompt parked')
  await broker.resolve('wpi_testpayment01', true, ['payment', 'sign-app'])
  await promise
})

test('duplicate intentId parks fail with wallet-busy', async (t) => {
  const { broker } = makeBroker()
  const promise = broker.request(paymentPrompt(), TUPLE)
  t.after(() => promise.catch(() => {}))
  assert.throws(() => broker.request(paymentPrompt(), TUPLE), (err) => err.code === 'wallet-busy')
  await broker.resolve('wpi_testpayment01', false)
  await promise
})

test('rejectAll fails every parked prompt closed (lock / tab close / shutdown)', async () => {
  const { broker } = makeBroker()
  const p1 = broker.request(paymentPrompt(), TUPLE)
  const p2 = broker.request(connectPrompt({ intentId: 'wpi_testconnect02' }), TUPLE)
  broker.rejectAll('wallet-lock')
  await assert.rejects(p1, (err) => err.code === 'wallet-lock')
  await assert.rejects(p2, (err) => err.code === 'wallet-lock')
  assert.equal(broker.pendingCount, 0)
})

test('service resolution errors reject the parked promise and propagate', async () => {
  const { broker, service } = makeBroker()
  service.onResolve = () => {
    const err = new Error('wallet is locked')
    err.code = 'wallet-locked'
    throw err
  }
  const promise = broker.request(paymentPrompt(), TUPLE)
  await assert.rejects(broker.resolve('wpi_testpayment01', true), (err) => err.code === 'wallet-locked')
  await assert.rejects(promise, (err) => err.code === 'wallet-locked')
  assert.equal(broker.pendingCount, 0)
})

test('request validates the prompt record', () => {
  const { broker } = makeBroker()
  assert.throws(() => broker.request(null, TUPLE), (err) => err.code === 'bad-request')
  assert.throws(() => broker.request(paymentPrompt({ type: 'seed-export' }), TUPLE), (err) => err.code === 'bad-request')
  assert.throws(() => broker.request(paymentPrompt({ intentId: '' }), TUPLE), (err) => err.code === 'bad-request')
  assert.throws(() => broker.request(paymentPrompt({ expiresAt: 'soon' }), TUPLE), (err) => err.code === 'bad-request')
})
