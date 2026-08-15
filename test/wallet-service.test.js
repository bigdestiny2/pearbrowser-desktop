import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import Corestore from 'corestore'

const require = createRequire(import.meta.url)
const { WalletService } = require('../backend/wallet/wallet-service.cjs')
const { WalletJournal } = require('../backend/wallet/wallet-journal.cjs')
const { validateWalletManifest } = require('../backend/wallet/wallet-manifest.cjs')
const { WalletDocuments, tabKeyForDrive } = require('../backend/wallet/wallet-documents.cjs')
const { appPayloadDigest } = require('../backend/wallet/app-payload.cjs')
const { ENVELOPE_BYTES } = require('../backend/wallet/wdk-secret-envelope.cjs')
const STABLE_TESTNET = require('../backend/wallet/networks/stable-testnet.cjs')

const PASSPHRASE = 'correct horse battery staple'
const ADDRESS = '0x1111111111111111111111111111111111111111'
const RECIPIENT = '0x2222222222222222222222222222222222222222'
const TX_HASH = '0x' + 'ab'.repeat(32)
const DRIVE_A = 'aa'.repeat(32)
const DRIVE_B = 'bb'.repeat(32)
const PAYLOAD_HASH = 'ef'.repeat(32)
const MANIFEST = {
  name: 'Example test checkout',
  entry: '/index.html',
  permissions: ['pear.wallet.v1.connect', 'pear.wallet.v1.pay', 'pear.wallet.v1.sign-app']
}
const MANIFEST_SHA256 = validateWalletManifest(MANIFEST).manifestSha256

const MNEMONIC_WORDS = `${'abandon '.repeat(23)}art`

// Minimal test double replicating the WdkEngineAdapter surface and, where the
// real adapter overwrites caller-owned secret buffers, mirroring that behavior
// so the service's zeroing guarantees stay observable.
class FakeEngine {
  constructor () {
    this.state = 'locked'
    this.address = ADDRESS
    this.failNext = null
    this.lastMaterial = null
    this.lastInit = null
    this.lastCeremonyInput = null
    this.initializeCalls = 0
    this.signPreparedCalls = 0
    this.broadcasts = []
    this.feeAtomic = '60000000000000'
    this.maxFeeAtomic = null
  }

  _maybeFail (method) {
    if (this.failNext) {
      const code = this.failNext
      this.failNext = null
      const err = new Error(code)
      err.code = code
      throw err
    }
  }

  async initialize ({ encryptedSeed, encryptionKey, compiledConfig }) {
    this._maybeFail('initialize')
    assert.equal(compiledConfig, STABLE_TESTNET)
    assert.equal(encryptedSeed.length, ENVELOPE_BYTES.seed)
    assert.equal(encryptionKey.length, 32)
    this.lastInit = { encryptedSeed, encryptionKey }
    encryptedSeed.fill(0)
    encryptionKey.fill(0)
    this.state = 'ready'
    this.initializeCalls++
    return true
  }

  async getAddress (accountIndex = 0) {
    this._maybeFail('getAddress')
    return { address: this.address }
  }

  async lock () {
    this.state = 'locked'
    return { locked: true, disposeOutcome: 'ok' }
  }

  async beginMnemonicCeremony (input) {
    this._maybeFail('beginMnemonicCeremony')
    this.ceremonyType = input.type
    if (input.type === 'restore') {
      this.lastCeremonyInput = { mnemonic: input.mnemonic }
      input.mnemonic.fill(0)
      return { ceremonyId: 'wc_test000000000000' }
    }
    if (input.type === 'backup') {
      this.lastCeremonyInput = { encryptedEntropy: input.encryptedEntropy, encryptionKey: input.encryptionKey }
      input.encryptedEntropy.fill(0)
      input.encryptionKey.fill(0)
    }
    return { ceremonyId: 'wc_test000000000000', mnemonic: Buffer.from(MNEMONIC_WORDS) }
  }

  async finishMnemonicCeremony ({ ceremonyId, outcome }) {
    this._maybeFail('finishMnemonicCeremony')
    if (outcome !== 'complete' || this.ceremonyType === 'backup') return { completed: true }
    const material = {
      completed: true,
      encryptedSeed: Buffer.alloc(ENVELOPE_BYTES.seed, 0x07),
      encryptedEntropy: Buffer.alloc(ENVELOPE_BYTES.entropy, 0x09),
      encryptionKey: Buffer.alloc(32, 0x05)
    }
    this.lastMaterial = material
    return material
  }

  async prepareTransfer (recipient, amountAtomic) {
    this._maybeFail('prepareTransfer')
    const prepared = {
      preparedIntentId: 'wpi_prepared00000000',
      recipient,
      amountAtomic,
      estimatedFeeAtomic: this.feeAtomic
    }
    if (this.maxFeeAtomic !== null) prepared.maxFeeAtomic = this.maxFeeAtomic
    return prepared
  }

  async signPrepared (prepared) {
    this._maybeFail('signPrepared')
    this.signPreparedCalls++
    return { signedTransaction: Buffer.from('deadbeef', 'hex'), transactionHash: TX_HASH }
  }

  async broadcastSigned (signed) {
    this._maybeFail('broadcastSigned')
    this.broadcasts.push(signed.transactionHash)
    return { transactionHash: signed.transactionHash }
  }

  async getTransaction (transactionHash) {
    this._maybeFail('getTransaction')
    return { transactionHash, state: 'final', confirmations: 1, blockNumber: '123' }
  }

  async signAppPayload ({ driveKey, manifestSha256, payloadHash }) {
    this._maybeFail('signAppPayload')
    return {
      signature: Buffer.alloc(65, 1),
      address: this.address,
      digest: appPayloadDigest({ driveKey, manifestSha256, payloadHash })
    }
  }
}

function stubJournal () {
  return {
    entries: [],
    async append (entry) {
      this.entries.push({ ...entry, seq: this.entries.length + 1 })
      return entry
    },
    async getByIntentId (intentId) {
      return this.entries.filter(entry => entry.intentId === intentId)
    }
  }
}

function clock (start = 1_700_000_000_000) {
  const state = { now: start }
  return {
    now: () => state.now,
    advance: (ms) => { state.now += ms }
  }
}

function makeTuple (overrides = {}) {
  return {
    browserSessionId: 'session-0001',
    tabId: 'tab-1',
    driveKey: DRIVE_A,
    walletTabOrigin: 'http://127.0.0.1:9341',
    ...overrides
  }
}

function paymentInput (overrides = {}) {
  return {
    chainId: 'eip155:2201',
    assetId: 'stable-testnet-usdt0',
    recipient: RECIPIENT,
    amountAtomic: '1250000',
    reference: 'order-1842',
    idempotencyKey: 'checkout:order-1842:attempt-1',
    ...overrides
  }
}

async function makeService (t, { journal, autoLockMs, verifyDocumentToken } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'wallet-service-test-'))
  t.after(async () => { await rm(dir, { recursive: true, force: true }) })
  const t0 = clock()
  const engine = new FakeEngine()
  const service = new WalletService({
    storage: dir,
    engine,
    journal: journal === undefined ? stubJournal() : journal,
    now: t0.now,
    autoLockMs,
    verifyDocumentToken: verifyDocumentToken === undefined ? async () => true : verifyDocumentToken
  })
  return { service, engine, clock: t0, dir }
}

async function makeUnlocked (t, opts) {
  const ctx = await makeService(t, opts)
  await ctx.service.createWallet(PASSPHRASE)
  await ctx.service.unlock(PASSPHRASE)
  return ctx
}

async function codeOf (promise) {
  try {
    await promise
  } catch (err) {
    return err.code
  }
  throw new Error('expected the call to reject')
}

test('full lifecycle: create, unlock, connect, approved payment, journal, lock', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'wallet-service-test-'))
  t.after(async () => { await rm(dir, { recursive: true, force: true }) })
  const store = new Corestore(join(dir, 'corestore'))
  await store.ready()
  t.after(async () => { await store.close() })
  const journal = new WalletJournal({ store })
  await journal.ready()

  const t0 = clock()
  const engine = new FakeEngine()
  const service = new WalletService({
    storage: dir,
    engine,
    journal,
    now: t0.now,
    verifyDocumentToken: async () => true
  })

  // absent → create → locked
  assert.equal((await service.status()).state, 'absent')
  const created = await service.createWallet(PASSPHRASE)
  assert.equal(created.created, true)
  assert.equal(created.state, 'locked')
  assert.equal((await service.status()).state, 'locked')

  // The ceremony material was zeroed after the vault write; the sealed seed
  // envelope on disk retains its original bytes.
  assert.ok(engine.lastMaterial.encryptedSeed.every(byte => byte === 0))
  assert.ok(engine.lastMaterial.encryptedEntropy.every(byte => byte === 0))
  assert.ok(engine.lastMaterial.encryptionKey.every(byte => byte === 0))
  const seedOnDisk = await readFile(join(service.directory, 'seed.bin'))
  assert.ok(seedOnDisk.every(byte => byte === 0x07))
  assert.equal(seedOnDisk.length, ENVELOPE_BYTES.seed)

  // A second create fails closed.
  assert.equal(await codeOf(service.createWallet(PASSPHRASE)), 'wallet-exists')

  // Wrong passphrase fails before touching the engine.
  assert.equal(await codeOf(service.unlock('wrong passphrase here')), 'bad-passphrase')
  assert.equal(engine.initializeCalls, 0)

  // Unlock: engine consumed + zeroed the unsealed buffers; status exposes the
  // address only while unlocked.
  const unlocked = await service.unlock(PASSPHRASE)
  assert.equal(unlocked.state, 'unlocked')
  assert.equal(unlocked.address, ADDRESS)
  assert.ok(engine.lastInit.encryptedSeed.every(byte => byte === 0))
  assert.ok(engine.lastInit.encryptionKey.every(byte => byte === 0))

  // capabilities never reveal account data
  const caps = service.capabilities()
  assert.deepEqual(caps.chainIds, ['eip155:2201'])
  assert.deepEqual(caps.assetIds, ['stable-testnet-usdt0'])
  assert.equal('address' in caps, false)
  assert.equal(Object.isFrozen(caps), true)

  // connect
  const connection = await service.connect(makeTuple(), 'doc-token', MANIFEST)
  assert.equal(connection.connected, true)
  assert.equal(connection.manifestSha256, MANIFEST_SHA256)
  assert.deepEqual(connection.permissions, { connect: true, pay: true, signApp: true })

  // payment prompt
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  assert.equal(prompt.type, 'payment')
  assert.match(prompt.intentId, /^wpi_[0-9a-f]{24}$/)
  assert.equal(prompt.expiresAt, t0.now() + 120_000)
  assert.equal(Object.isFrozen(prompt), true)
  assert.equal(Object.isFrozen(prompt.intent), true)
  assert.equal(prompt.intent.driveKey, DRIVE_A)
  assert.equal(prompt.intent.manifestSha256, MANIFEST_SHA256)

  // approve → prepare/sign/broadcast → submitted
  const result = await service.resolvePrompt(prompt.intentId, true)
  assert.equal(result.state, 'submitted')
  assert.equal(result.transactionHash, TX_HASH)
  assert.equal(result.chainId, 'eip155:2201')
  assert.equal(Object.isFrozen(result), true)
  assert.deepEqual(engine.broadcasts, [TX_HASH])

  // journal captured the whole flow without secrets
  const entries = await journal.getByIntentId(prompt.intentId)
  assert.deepEqual(entries.map(e => e.type), ['intent', 'prompt', 'approval', 'broadcast', 'outcome'])
  assert.equal(entries[4].state, 'submitted')
  const raw = JSON.stringify(entries)
  for (const forbidden of ['mnemonic', 'seed', 'passphrase', 'signature', 'signedTransaction']) {
    assert.equal(raw.includes('"' + forbidden + '"'), false, forbidden)
  }

  // transaction() reports the live engine state for the owned intent
  const tx = await service.transaction(makeTuple(), 'doc-token', prompt.intentId)
  assert.equal(tx.state, 'final')
  assert.equal(tx.transactionHash, TX_HASH)
  assert.equal(tx.confirmations, 1)
  assert.equal(tx.blockNumber, '123')

  // lock revokes connections and clears the address
  await service.lock()
  assert.equal((await service.status()).state, 'locked')
  assert.equal('address' in (await service.status()), false)
  assert.equal(service.listConnections().length, 0)
  assert.equal(engine.state, 'locked')
})

test('rejection path journals the rejection and frees the prompt slot', async (t) => {
  const { service, engine } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  const rejected = await service.resolvePrompt(prompt.intentId, false)
  assert.equal(rejected.state, 'rejected')
  assert.equal(rejected.intentId, prompt.intentId)
  assert.equal(engine.broadcasts.length, 0)

  const journal = service._journal
  assert.deepEqual(journal.entries.map(e => e.type), ['connect', 'intent', 'prompt', 'rejection'])

  // The prompt slot is free for the next request.
  const next = await service.requestPayment(makeTuple(), 'doc-token', paymentInput({ idempotencyKey: 'checkout:order-1842:attempt-2' }))
  assert.equal(next.type, 'payment')
  await service.resolvePrompt(next.intentId, false)
})

test('single in-flight prompt: second request fails with wallet-busy', async (t) => {
  const { service } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  assert.equal(
    await codeOf(service.requestPayment(makeTuple(), 'doc-token', paymentInput({ idempotencyKey: 'checkout:order-1842:attempt-2' }))),
    'wallet-busy'
  )
})

test('prompt expiry is enforced at resolve time', async (t) => {
  const { service, clock: t0 } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  t0.advance(120_001)
  assert.equal(await codeOf(service.resolvePrompt(prompt.intentId, true)), 'prompt-expired')
  const journal = service._journal
  assert.equal(journal.entries.at(-1).type, 'outcome')
  assert.equal(journal.entries.at(-1).state, 'expired')
  // One-shot: a second resolve is not-found.
  assert.equal(await codeOf(service.resolvePrompt(prompt.intentId, true)), 'not-found')
})

test('auto-lock locks the wallet, revokes connections and cancels prompts', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { service, engine } = await makeUnlocked(t, { autoLockMs: 60_000 })
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  await service.requestPayment(makeTuple(), 'doc-token', paymentInput())

  t.mock.timers.tick(60_001)
  for (let i = 0; i < 200 && engine.state !== 'locked'; i++) {
    await new Promise(resolve => setImmediate(resolve))
  }
  assert.equal(engine.state, 'locked')
  assert.equal((await service.status()).state, 'locked')
  assert.equal(service.listConnections().length, 0)
  const journal = service._journal
  assert.equal(journal.entries.at(-1).state, 'cancelled')
  assert.equal(journal.entries.at(-1).reason, 'wallet-lock')
})

test('sensitive ops refresh the idle timer; page reads do not', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { service, engine } = await makeUnlocked(t, { autoLockMs: 60_000 })
  await service.connect(makeTuple(), 'doc-token', MANIFEST)

  service.capabilities() // must not re-arm the idle timer
  t.mock.timers.tick(59_000)
  service.capabilities()
  t.mock.timers.tick(1_500) // 60.5s since the last sensitive op (connect)
  for (let i = 0; i < 200 && engine.state !== 'locked'; i++) {
    await new Promise(resolve => setImmediate(resolve))
  }
  assert.equal(engine.state, 'locked', 'capabilities() must not keep the wallet alive')
})

test('restore zeroes the caller mnemonic buffer; wrong passphrase fails unlock', async (t) => {
  const { service, engine } = await makeService(t)
  const mnemonic = Buffer.from(MNEMONIC_WORDS)
  const restored = await service.restoreWallet(PASSPHRASE, mnemonic)
  assert.equal(restored.restored, true)
  assert.ok(mnemonic.every(byte => byte === 0), 'restore must overwrite the caller mnemonic buffer')
  assert.equal((await service.status()).state, 'locked')

  assert.equal(await codeOf(service.unlock('definitely the wrong passphrase')), 'bad-passphrase')
  const unlocked = await service.unlock(PASSPHRASE)
  assert.equal(unlocked.state, 'unlocked')
  assert.equal(engine.initializeCalls, 1)
})

test('backup challenge returns the ceremony mnemonic and zeroes entropy/key', async (t) => {
  const { service, engine } = await makeUnlocked(t)
  await service.lock()

  assert.equal(await codeOf(service.backupWallet('wrong passphrase here')), 'bad-passphrase')
  const backup = await service.backupWallet(PASSPHRASE)
  assert.equal(backup.ceremonyId, 'wc_test000000000000')
  assert.equal(backup.mnemonic.toString(), MNEMONIC_WORDS)
  assert.ok(engine.lastCeremonyInput.encryptedEntropy.every(byte => byte === 0))
  assert.ok(engine.lastCeremonyInput.encryptionKey.every(byte => byte === 0))
  assert.deepEqual(await service.finishBackup({ ceremonyId: backup.ceremonyId, outcome: 'complete' }), { completed: true })
})

test('sign-app flow prompts, signs and journals only the digest', async (t) => {
  const { service } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.signAppPayload(makeTuple(), 'doc-token', { payloadHash: PAYLOAD_HASH })
  assert.equal(prompt.type, 'sign-app')
  assert.equal(prompt.intent.scheme, 'pb-app-sig-v1')
  assert.equal(prompt.intent.payloadHash, PAYLOAD_HASH)

  const result = await service.resolvePrompt(prompt.intentId, true)
  assert.equal(result.state, 'signed')
  assert.equal(result.signature.length, 65)
  assert.equal(result.address, ADDRESS)
  assert.equal(result.digest.length, 32)

  const journal = service._journal
  const entry = journal.entries.find(e => e.type === 'sign-app')
  assert.equal(entry.digest, result.digest.toString('hex'))
  assert.equal(entry.address, ADDRESS)
  assert.equal('signature' in entry, false)
})

test('document-token verification defaults to deny', async (t) => {
  const { service } = await makeUnlocked(t, { verifyDocumentToken: null })
  assert.equal(await codeOf(service.connect(makeTuple(), 'doc-token', MANIFEST)), 'not-authorized')
  assert.equal(await codeOf(service.requestPayment(makeTuple(), 'doc-token', paymentInput())), 'not-authorized')
})

test('the service binds the real WalletDocuments registry to the full tuple', async (t) => {
  // Production wiring regression: the verifier must see walletTabOrigin, or
  // the registry's exact origin binding fails every page call closed.
  const docs = new WalletDocuments()
  const origin = 'http://127.0.0.1:9341'
  const tabKey = tabKeyForDrive(DRIVE_A)
  const { token } = docs.issue({ driveKeyHex: DRIVE_A, origin, tabKey })
  const { service } = await makeUnlocked(t, { verifyDocumentToken: args => docs.verify(args) })

  const tuple = makeTuple({ tabId: tabKey, walletTabOrigin: origin })
  const connection = await service.connect(tuple, token, MANIFEST)
  assert.equal(connection.connected, true)

  // Cross-origin presentation of the same token fails closed.
  assert.equal(
    await codeOf(service.requestPayment(makeTuple({ tabId: tabKey, walletTabOrigin: 'http://127.0.0.1:9999' }), token, paymentInput())),
    'not-authorized'
  )
  // An unknown token fails closed.
  assert.equal(await codeOf(service.requestPayment(tuple, 'f'.repeat(32), paymentInput())), 'not-authorized')
})

test('page ops fail closed when locked, unconnected or mismatched', async (t) => {
  const { service } = await makeService(t)
  // No wallet at all.
  assert.equal(await codeOf(service.requestPayment(makeTuple(), 'doc-token', paymentInput())), 'wallet-locked')

  const { service: unlocked } = await makeUnlocked(t)
  // Not connected.
  assert.equal(await codeOf(unlocked.requestPayment(makeTuple(), 'doc-token', paymentInput())), 'not-connected')
  await unlocked.connect(makeTuple(), 'doc-token', MANIFEST)
  // Unknown fields, unsupported chain/asset.
  assert.equal(await codeOf(unlocked.requestPayment(makeTuple(), 'doc-token', paymentInput({ chainId: 'eip155:1' }))), 'unsupported-chain')
  assert.equal(await codeOf(unlocked.requestPayment(makeTuple(), 'doc-token', paymentInput({ assetId: 'usdt' }))), 'unsupported-asset')
  assert.equal(await codeOf(unlocked.requestPayment(makeTuple(), 'doc-token', paymentInput({ memo: 'x' }))), 'bad-request')
  // Another drive cannot see this drive's intent.
  const prompt = await unlocked.requestPayment(makeTuple(), 'doc-token', paymentInput())
  await unlocked.resolvePrompt(prompt.intentId, true)
  await unlocked.connect(makeTuple({ tabId: 'tab-2', driveKey: DRIVE_B, walletTabOrigin: 'http://127.0.0.1:9342' }), 'doc-token', MANIFEST)
  assert.equal(
    await codeOf(unlocked.transaction(makeTuple({ tabId: 'tab-2', driveKey: DRIVE_B, walletTabOrigin: 'http://127.0.0.1:9342' }), 'doc-token', prompt.intentId)),
    'not-found'
  )
})

test('engine failure during settlement journals an error outcome', async (t) => {
  const { service, engine } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  engine.failNext = 'insufficient-funds'
  assert.equal(await codeOf(service.resolvePrompt(prompt.intentId, true)), 'insufficient-funds')
  const journal = service._journal
  const outcome = journal.entries.at(-1)
  assert.equal(outcome.type, 'outcome')
  assert.equal(outcome.state, 'error')
  assert.equal(outcome.code, 'insufficient-funds')
  // The failed prompt was consumed.
  assert.equal(await codeOf(service.resolvePrompt(prompt.intentId, true)), 'not-found')
})

test('disconnect cancels the tab pending prompt', async (t) => {
  const { service } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  await service.disconnect(makeTuple(), 'doc-token')
  assert.equal(await codeOf(service.resolvePrompt(prompt.intentId, true)), 'not-found')
  const journal = service._journal
  assert.equal(journal.entries.at(-2).reason, 'disconnect')
  assert.equal(journal.entries.at(-1).type, 'disconnect')
})

test('concurrent unlocks are serialized and idempotent', async (t) => {
  const { service, engine } = await makeService(t)
  await service.createWallet(PASSPHRASE)
  const [a, b] = await Promise.all([service.unlock(PASSPHRASE), service.unlock(PASSPHRASE)])
  assert.equal(a.state, 'unlocked')
  assert.equal(b.state, 'unlocked')
  assert.equal(engine.initializeCalls, 1)
})

test('lock cancels a pending prompt and later resolves fail not-found', async (t) => {
  const { service } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  await service.lock()
  assert.equal(await codeOf(service.resolvePrompt(prompt.intentId, true)), 'wallet-locked')
  const journal = service._journal
  assert.equal(journal.entries.at(-1).reason, 'wallet-lock')
})

// Idempotency (spec §8.3) is journal-backed, so these tests run against a
// real WalletJournal on a throwaway Corestore.
async function makeUnlockedWithJournal (t) {
  const dir = await mkdtemp(join(tmpdir(), 'wallet-service-test-'))
  t.after(async () => { await rm(dir, { recursive: true, force: true }) })
  const store = new Corestore(join(dir, 'corestore'))
  await store.ready()
  t.after(async () => { try { await store.close() } catch {} })
  const journal = new WalletJournal({ store })
  await journal.ready()
  const t0 = clock()
  const engine = new FakeEngine()
  const service = new WalletService({
    storage: dir,
    engine,
    journal,
    now: t0.now,
    verifyDocumentToken: async () => true
  })
  await service.createWallet(PASSPHRASE)
  await service.unlock(PASSPHRASE)
  return { service, engine, journal, store, clock: t0, dir }
}

test('idempotent retry after rejection returns the recorded outcome, no new prompt, no spend', async (t) => {
  const { service, engine, journal } = await makeUnlockedWithJournal(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  const rejected = await service.resolvePrompt(prompt.intentId, false)
  assert.equal(rejected.state, 'rejected')

  const replay = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  assert.equal(replay.intentId, prompt.intentId)
  assert.equal(replay.state, 'rejected')
  assert.equal(Object.isFrozen(replay), true)
  assert.equal(engine.broadcasts.length, 0)

  // Nothing new was journaled and no second intent exists anywhere.
  const entries = await journal.getByIntentId(prompt.intentId)
  assert.deepEqual(entries.map(e => e.type), ['intent', 'prompt', 'rejection'])
  assert.equal((await journal.listRecent(20)).filter(e => e.type === 'intent').length, 1)
})

test('the same idempotency key with a different fingerprint is rejected', async (t) => {
  const { service } = await makeUnlockedWithJournal(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  // The reservation exists from the moment the prompt opens.
  assert.equal(
    await codeOf(service.requestPayment(makeTuple(), 'doc-token', paymentInput({ amountAtomic: '1250001' }))),
    'idempotency-conflict'
  )
  await service.resolvePrompt(prompt.intentId, false)
  // Still conflicts after the original intent settled.
  assert.equal(
    await codeOf(service.requestPayment(makeTuple(), 'doc-token', paymentInput({ recipient: '0x3333333333333333333333333333333333333333' }))),
    'idempotency-conflict'
  )
})

test('a retry of a still-open prompt returns the live prompt record', async (t) => {
  const { service, journal } = await makeUnlockedWithJournal(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  const retry = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  // Same intent, same expiry — the consent broker refuses a duplicate park
  // with wallet-busy, so no second consent modal is ever raised.
  assert.equal(retry.type, 'payment')
  assert.equal(retry.intentId, prompt.intentId)
  assert.equal(retry.expiresAt, prompt.expiresAt)
  assert.equal((await journal.listRecent(20)).filter(e => e.type === 'intent').length, 1)
  // The single live prompt still settles exactly once.
  const rejected = await service.resolvePrompt(prompt.intentId, false)
  assert.equal(rejected.state, 'rejected')
  assert.equal(await codeOf(service.resolvePrompt(prompt.intentId, false)), 'not-found')
})

test('concurrent same-key requests open a single prompt', async (t) => {
  const { service, journal } = await makeUnlockedWithJournal(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const [a, b] = await Promise.allSettled([
    service.requestPayment(makeTuple(), 'doc-token', paymentInput()),
    service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  ])
  const fulfilled = [a, b].filter(r => r.status === 'fulfilled')
  assert.equal(fulfilled.length, 1)
  assert.equal(fulfilled[0].value.type, 'payment')
  const loser = [a, b].find(r => r.status === 'rejected')
  assert.equal(loser.reason.code, 'wallet-busy')
  assert.equal((await journal.listRecent(20)).filter(e => e.type === 'intent').length, 1)
  await service.resolvePrompt(fulfilled[0].value.intentId, false)
})

test('the idempotency reservation survives a service restart', async (t) => {
  const { service, store, dir, clock: t0 } = await makeUnlockedWithJournal(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  const submitted = await service.resolvePrompt(prompt.intentId, true)
  assert.equal(submitted.state, 'submitted')
  await store.close()

  // Restart: fresh Corestore, journal, engine and service over the same dirs.
  const store2 = new Corestore(join(dir, 'corestore'))
  await store2.ready()
  t.after(async () => { await store2.close() })
  const journal2 = new WalletJournal({ store: store2 })
  await journal2.ready()
  const engine2 = new FakeEngine()
  const service2 = new WalletService({
    storage: dir,
    engine: engine2,
    journal: journal2,
    now: t0.now,
    verifyDocumentToken: async () => true
  })
  await service2.unlock(PASSPHRASE)
  await service2.connect(makeTuple(), 'doc-token', MANIFEST)

  const replay = await service2.requestPayment(makeTuple(), 'doc-token', paymentInput())
  assert.equal(replay.intentId, prompt.intentId)
  assert.equal(replay.state, 'submitted')
  assert.equal(replay.transactionHash, TX_HASH)
  assert.equal(replay.chainId, 'eip155:2201')
  assert.equal(engine2.broadcasts.length, 0, 'a replay must never spend again')
})

test('a reservation left open across a restart closes out as expired', async (t) => {
  const { service, store, dir, clock: t0 } = await makeUnlockedWithJournal(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  await store.close()

  const store2 = new Corestore(join(dir, 'corestore'))
  await store2.ready()
  t.after(async () => { await store2.close() })
  const journal2 = new WalletJournal({ store: store2 })
  await journal2.ready()
  const service2 = new WalletService({
    storage: dir,
    engine: new FakeEngine(),
    journal: journal2,
    now: t0.now,
    verifyDocumentToken: async () => true
  })
  await service2.unlock(PASSPHRASE)
  await service2.connect(makeTuple(), 'doc-token', MANIFEST)

  // The in-memory prompt died with the restart, so the reservation can never
  // settle: it stays immutable under its key (spec §8.3).
  const replay = await service2.requestPayment(makeTuple(), 'doc-token', paymentInput())
  assert.equal(replay.intentId, prompt.intentId)
  assert.equal(replay.state, 'expired')
  // The close-out is durable; a later replay reads the same terminal state.
  const again = await service2.requestPayment(makeTuple(), 'doc-token', paymentInput())
  assert.equal(again.state, 'expired')
  const outcomes = (await journal2.getByIntentId(prompt.intentId)).filter(e => e.type === 'outcome')
  assert.equal(outcomes.length, 1)
  assert.equal(outcomes[0].reason, 'restart')
})

test('a lock landing during prompt open aborts the prompt', async (t) => {
  const { service, engine } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  // Gate the intent journal append so lock() lands inside the blind window
  // between acquirePrompt and this._pending being set.
  let release
  const gate = new Promise(resolve => { release = resolve })
  const inner = service._journal
  let gated = false
  service._journal = {
    entries: inner.entries,
    async append (entry, opts) {
      if (!gated && entry.type === 'intent') {
        gated = true
        await gate
      }
      return inner.append(entry, opts)
    }
  }
  const opening = service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  for (let i = 0; i < 10 && !gated; i++) await new Promise(resolve => setImmediate(resolve))
  assert.equal(gated, true, 'the prompt never reached the journal gate')
  await service.lock()
  release()
  assert.equal(await codeOf(opening), 'wallet-locked')
  assert.equal(service._pending, null)
  assert.equal(service._policy.pendingPrompt, null)
  assert.equal(engine.state, 'locked')
  const outcome = inner.entries.find(e => e.type === 'outcome')
  assert.equal(outcome.state, 'cancelled')
  assert.equal(outcome.reason, 'wallet-lock')
})

test('a journal failure after broadcast still reports the payment as submitted', async (t) => {
  const { service, engine } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  const inner = service._journal
  service._journal = {
    entries: inner.entries,
    async append (entry, opts) {
      if (entry.type === 'broadcast') {
        const err = new Error('bee is gone')
        err.code = 'journal-io'
        throw err
      }
      return inner.append(entry, opts)
    }
  }
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  const result = await service.resolvePrompt(prompt.intentId, true)
  // The payment is on chain: the caller must see the hash, not a failure.
  assert.equal(result.state, 'submitted')
  assert.equal(result.transactionHash, TX_HASH)
  assert.deepEqual(engine.broadcasts, [TX_HASH])
  assert.equal(inner.entries.some(e => e.type === 'outcome' && e.state === 'error'), false)
})

test('a structurally corrupt vault reports vault-corrupt, not bad-passphrase', async (t) => {
  const { service, engine } = await makeService(t)
  await service.createWallet(PASSPHRASE)
  await writeFile(join(service.directory, 'vault.json'), '{"header":')
  assert.equal(await codeOf(service.unlock(PASSPHRASE)), 'vault-corrupt')
  assert.equal(engine.initializeCalls, 0)
})

test('a tampered vault that still parses fails as bad-passphrase (MAC mismatch)', async (t) => {
  const { service } = await makeService(t)
  await service.createWallet(PASSPHRASE)
  const vaultText = await readFile(join(service.directory, 'vault.json'), 'utf8')
  // Flip one sealed-key character: the file stays canonical base64url JSON,
  // so parsing succeeds and only the AEAD check fails.
  const tampered = vaultText.replace(
    /"sealedKey":"([A-Za-z0-9_-])/,
    (match, ch) => '"sealedKey":"' + (ch === 'A' ? 'B' : 'A')
  )
  assert.notEqual(tampered, vaultText)
  await writeFile(join(service.directory, 'vault.json'), tampered)
  assert.equal(await codeOf(service.unlock(PASSPHRASE)), 'bad-passphrase')
})

test('backupWallet reports a corrupt vault as vault-corrupt', async (t) => {
  const { service } = await makeUnlocked(t)
  await service.lock()
  await writeFile(join(service.directory, 'vault.json'), 'not json at all')
  assert.equal(await codeOf(service.backupWallet(PASSPHRASE)), 'vault-corrupt')
})

test('a prepared fee above the ceiling is rejected before signing', async (t) => {
  const { service, engine } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  engine.feeAtomic = '100000000000000001' // ceiling is 1e17
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  assert.equal(await codeOf(service.resolvePrompt(prompt.intentId, true)), 'cap-exceeded')
  assert.equal(engine.signPreparedCalls, 0, 'the fee check must fire before signing')
  assert.equal(engine.broadcasts.length, 0)
  const outcome = service._journal.entries.at(-1)
  assert.equal(outcome.type, 'outcome')
  assert.equal(outcome.state, 'error')
  assert.equal(outcome.code, 'cap-exceeded')
})

test('the worst-case maxFeeAtomic is checked against the ceiling', async (t) => {
  const { service, engine } = await makeUnlocked(t)
  await service.connect(makeTuple(), 'doc-token', MANIFEST)
  engine.maxFeeAtomic = '100000000000000001' // estimate is under, worst case is over
  const prompt = await service.requestPayment(makeTuple(), 'doc-token', paymentInput())
  assert.equal(await codeOf(service.resolvePrompt(prompt.intentId, true)), 'cap-exceeded')
  assert.equal(engine.signPreparedCalls, 0)
})
