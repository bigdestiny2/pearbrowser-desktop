// Ceremony smoke for the production one-shot mnemonic ceremony worker: runs
// the real WdkEngineAdapter default ceremony spawner (wdk-bare-transport +
// wdk-ceremony-worker.mjs) through create/restore/backup, tamper rejection,
// one-shot semantics and the golden 12-word vector, plus a full WalletService
// create → unlock → backup → restore loop. Fully offline (no RPC calls).

import fs from 'bare-fs'
import os from 'bare-os'
import path from 'bare-path'
import process from 'bare-process'
import b4a from 'b4a'
import bip39 from 'bip39-mnemonic'
import engine from '../backend/wallet/wdk-engine.cjs'
import transport from '../backend/wallet/wdk-bare-transport.cjs'
import STABLE_TESTNET from '../backend/wallet/networks/stable-testnet.cjs'
import secretEnvelope from '../backend/wallet/wdk-secret-envelope.cjs'
import { WalletService } from '../backend/wallet/wallet-service.cjs'

// wallet-service.cjs references the process global (tmp-file naming); plain
// Bare does not provide one (same shim as backend/ai/qvac-runtime.mjs).
if (!globalThis.process) globalThis.process = process

const { WdkEngineAdapter } = engine

// 32 zero bytes of entropy encode this classic 24-word vector; its account-0
// address is pinned below (derived with @tetherto/wdk offline).
const FIXED_MNEMONIC = 'abandon '.repeat(23) + 'art'
const EXPECTED_FIXED_ADDRESS = '0xf278cf59f82edcf871d630f28ecc8056f25c1cdb'
// The 12-word golden vector from scripts/wdk-bare-smoke.mjs. Production
// restores are 24-word only (the pb-wdk-secrets-v1 entropy envelope holds
// exactly 32 bytes), so the ceremony worker rejects it with a coded error;
// the golden seed/address below is pinned through the same envelope +
// initialize path the ceremony material takes.
const GOLDEN_MNEMONIC = 'test test test test test test test test test test test junk'
const GOLDEN_SEED = '9dfc3c64c2f8bede1533b6a79f8570e5943e0b8fd1cf77107adf7b72cef42185d564a3aee24cab43f80e3c4538087d70fc824eabbad596a23c97b6ee8322ccc0'
const GOLDEN_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

function invariant (condition, message) {
  if (!condition) throw new Error(message)
}

function zero (value) {
  try {
    if (b4a.isBuffer(value) || value instanceof Uint8Array) value.fill(0)
  } catch {}
}

function allZero (value) {
  return value.every(byte => byte === 0)
}

async function assertCode (invoke, code) {
  try {
    await invoke()
  } catch (error) {
    invariant(error?.code === code, `expected ${code}, got ${error?.code || error}`)
    return
  }
  throw new Error(`expected ${code}, but the call succeeded`)
}

const report = { ok: false, runtime: 'Bare', legs: {} }

try {
  await main()
  report.ok = true
} catch (error) {
  report.error = { code: error?.code || null, message: String(error?.message || error) }
  process.exitCode = 1
}
console.log(JSON.stringify(report))

async function main () {
  const adapter = new WdkEngineAdapter({ initializeTimeoutMs: 30000, terminateTimeoutMs: 15000 })

  // ------------------------------------------------------- leg 1: create
  const begun = await adapter.beginMnemonicCeremony({ type: 'create' })
  const createdText = b4a.toString(begun.mnemonic, 'utf8') // copy before finish zeroes it
  invariant(createdText.split(' ').length === 24, 'create did not return 24 words')
  invariant(bip39.validateMnemonic(createdText), 'create returned an invalid mnemonic')
  await assertCode(() => adapter.beginMnemonicCeremony({ type: 'create' }), 'ceremony-active')
  const completion = await adapter.finishMnemonicCeremony({ ceremonyId: begun.ceremonyId, outcome: 'complete' })
  invariant(completion.completed === true, 'create finish did not complete')
  invariant(allZero(begun.mnemonic), 'engine did not zero the begin mnemonic after finish')

  const createdEntropy = secretEnvelope.openSecret('entropy', completion.encryptedEntropy, completion.encryptionKey)
  const createdSeed = secretEnvelope.openSecret('seed', completion.encryptedSeed, completion.encryptionKey)
  const rederivedSeed = await bip39.mnemonicToSeed(createdText)
  invariant(bip39.entropyToMnemonic(createdEntropy) === createdText, 'sealed entropy does not match the mnemonic')
  invariant(b4a.equals(createdSeed, rederivedSeed), 'sealed seed does not match the mnemonic')
  zero(createdEntropy)
  zero(createdSeed)
  zero(rederivedSeed)

  await adapter.initialize({
    encryptedSeed: completion.encryptedSeed,
    encryptionKey: completion.encryptionKey,
    compiledConfig: STABLE_TESTNET
  })
  invariant(allZero(completion.encryptedSeed) && allZero(completion.encryptionKey), 'initialize did not consume the material')
  const createdAccount = await adapter.getAddress()
  invariant(/^0x[0-9a-fA-F]{40}$/.test(createdAccount.address), 'create-derived address is malformed')
  await adapter.lock()
  report.legs.create = { words: 24, address: createdAccount.address, selfConsistent: true, hostZeroed: true }
  console.error('[ceremony-smoke] create ok', createdAccount.address)

  // ------------------------------------------------------ leg 2: restore
  const restoreInput = b4a.from(FIXED_MNEMONIC, 'utf8')
  const restoredBegin = await adapter.beginMnemonicCeremony({ type: 'restore', mnemonic: restoreInput })
  invariant(allZero(restoreInput), 'engine did not zero the restore input')
  invariant(!('mnemonic' in restoredBegin), 'restore begin echoed the mnemonic')
  const restoredCompletion = await adapter.finishMnemonicCeremony({
    ceremonyId: restoredBegin.ceremonyId,
    outcome: 'complete'
  })
  // Keep copies of the entropy envelope + key for the backup leg; initialize
  // consumes the originals below.
  const backupEntropy = b4a.from(restoredCompletion.encryptedEntropy)
  const backupKey = b4a.from(restoredCompletion.encryptionKey)
  await adapter.initialize({
    encryptedSeed: restoredCompletion.encryptedSeed,
    encryptionKey: restoredCompletion.encryptionKey,
    compiledConfig: STABLE_TESTNET
  })
  const restoredAccount = await adapter.getAddress()
  invariant(restoredAccount.address.toLowerCase() === EXPECTED_FIXED_ADDRESS,
    `restore-derived address ${restoredAccount.address} != ${EXPECTED_FIXED_ADDRESS}`)
  await adapter.lock()
  report.legs.restore = { address: restoredAccount.address, deterministic: true }
  console.error('[ceremony-smoke] restore ok', restoredAccount.address)

  // ------------------------------------------------------- leg 3: backup
  const backupBegin = await adapter.beginMnemonicCeremony({
    type: 'backup',
    encryptedEntropy: backupEntropy,
    encryptionKey: backupKey
  })
  invariant(allZero(backupEntropy) && allZero(backupKey), 'engine did not zero the backup handoff')
  const backupText = b4a.toString(backupBegin.mnemonic, 'utf8')
  const backupCompletion = await adapter.finishMnemonicCeremony({
    ceremonyId: backupBegin.ceremonyId,
    outcome: 'complete'
  })
  invariant(backupCompletion.completed === true && !('encryptedSeed' in backupCompletion),
    'backup finish released vault material')
  invariant(allZero(backupBegin.mnemonic), 'engine did not zero the backup mnemonic')
  invariant(backupText === FIXED_MNEMONIC, 'backup mnemonic does not match the restored mnemonic')
  report.legs.backup = { words: backupText.split(' ').length, roundTrip: true }
  console.error('[ceremony-smoke] backup round-trip ok')

  // ------------------------------------------- leg 4: tampered envelope
  const fixedEntropy = bip39.mnemonicToEntropy(FIXED_MNEMONIC)
  const tamperKey = b4a.alloc(32)
  const tamperedEnvelope = secretEnvelope.sealSecret('entropy', fixedEntropy, tamperKey)
  zero(fixedEntropy)
  tamperedEnvelope[tamperedEnvelope.byteLength - 1] ^= 1
  await assertCode(() => adapter.beginMnemonicCeremony({
    type: 'backup',
    encryptedEntropy: tamperedEnvelope,
    encryptionKey: tamperKey
  }), 'ceremony-failed')
  invariant(adapter.state === 'locked', 'tampered backup left the engine in a bad state')
  report.legs.tampered = { rejected: 'ceremony-failed' }
  console.error('[ceremony-smoke] tampered envelope rejected')

  // ------------------------------------------------ leg 5: cancel outcome
  const cancelBegin = await adapter.beginMnemonicCeremony({ type: 'create' })
  const cancelCompletion = await adapter.finishMnemonicCeremony({
    ceremonyId: cancelBegin.ceremonyId,
    outcome: 'cancel'
  })
  invariant(cancelCompletion.completed === true && !('encryptedSeed' in cancelCompletion),
    'cancel finish released vault material')
  invariant(allZero(cancelBegin.mnemonic), 'engine did not zero the cancelled mnemonic')
  report.legs.cancel = { completed: true, releasedNothing: true }
  console.error('[ceremony-smoke] cancel outcome ok')

  // --------------------------- leg 6: golden vector on the raw endpoint
  const endpoint = await transport.spawnCeremonyWorklet()
  // Even below the engine, a 12-word mnemonic cannot become a wallet: the
  // 32-byte entropy envelope makes restores 24-word-only by construction.
  await assertCode(
    () => endpoint.beginMnemonicCeremony({ type: 'restore', mnemonic: b4a.from(GOLDEN_MNEMONIC, 'utf8') }),
    'bad-request'
  )
  const endpointInput = b4a.from(FIXED_MNEMONIC, 'utf8')
  const endpointBegin = await endpoint.beginMnemonicCeremony({ type: 'restore', mnemonic: endpointInput })
  invariant(!('mnemonic' in endpointBegin), 'restore begin echoed the mnemonic')
  await assertCode(() => endpoint.beginMnemonicCeremony({ type: 'create' }), 'ceremony-active')
  await assertCode(() => endpoint.finishMnemonicCeremony({
    ceremonyId: 'wc_ffffffffffffffff',
    outcome: 'complete'
  }), 'ceremony-mismatch')
  await assertCode(() => endpoint.finishMnemonicCeremony({
    ceremonyId: endpointBegin.ceremonyId,
    outcome: 'bogus'
  }), 'bad-request')
  const endpointCompletion = await endpoint.finishMnemonicCeremony({
    ceremonyId: endpointBegin.ceremonyId,
    outcome: 'complete'
  })
  await assertCode(() => endpoint.beginMnemonicCeremony({ type: 'create' }), 'ceremony-concluded')
  await endpoint.terminate()
  invariant(endpointCompletion.completed === true, 'endpoint finish did not complete')
  invariant(endpointCompletion.encryptedSeed.byteLength === secretEnvelope.ENVELOPE_BYTES.seed,
    'endpoint seed envelope has an invalid length')
  invariant(endpointCompletion.encryptedEntropy.byteLength === secretEnvelope.ENVELOPE_BYTES.entropy,
    'endpoint entropy envelope has an invalid length')
  invariant(endpointCompletion.encryptionKey.byteLength === 32, 'endpoint key has an invalid length')
  const endpointSeed = secretEnvelope.openSecret('seed', endpointCompletion.encryptedSeed, endpointCompletion.encryptionKey)
  const expectedEndpointSeed = await bip39.mnemonicToSeed(FIXED_MNEMONIC)
  invariant(b4a.equals(endpointSeed, expectedEndpointSeed), 'endpoint seed mismatch')
  zero(endpointSeed)
  zero(expectedEndpointSeed)
  zero(endpointCompletion.encryptedSeed)
  zero(endpointCompletion.encryptedEntropy)
  zero(endpointCompletion.encryptionKey)

  // Golden derivation pinning: the ceremony worker's BIP-39 layer
  // (bip39-mnemonic) reproduces the exact golden seed, and the same envelope
  // + initialize path the ceremony material takes derives the golden address.
  const goldenSeed = await bip39.mnemonicToSeed(GOLDEN_MNEMONIC)
  invariant(b4a.toString(goldenSeed, 'hex') === GOLDEN_SEED, 'golden seed mismatch')
  const goldenKey = bip39.generateEntropy(32)
  const goldenEncryptedSeed = secretEnvelope.sealSecret('seed', goldenSeed, goldenKey)
  zero(goldenSeed)
  await adapter.initialize({
    encryptedSeed: goldenEncryptedSeed,
    encryptionKey: goldenKey,
    compiledConfig: STABLE_TESTNET
  })
  const goldenAccount = await adapter.getAddress()
  invariant(goldenAccount.address === GOLDEN_ADDRESS, `golden address ${goldenAccount.address} != ${GOLDEN_ADDRESS}`)
  await adapter.lock()
  report.legs.golden = { seedMatches: true, address: goldenAccount.address }
  report.legs.endpoint = {
    twelveWordRejected: 'bad-request',
    oneShotEnforced: true,
    seedMatchesFixedVector: true
  }
  console.error('[ceremony-smoke] golden vector ok', goldenAccount.address)

  // -------------------- leg 7: WalletService create→unlock→backup→restore
  const storageA = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pearbrowser-ceremony-a-'))
  const storageB = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pearbrowser-ceremony-b-'))
  try {
    const passphrase = 'ceremony-smoke-passphrase'
    const serviceA = new WalletService({ storage: storageA, engine: adapter })
    const created = await serviceA.createWallet(passphrase)
    invariant(created.created === true && created.state === 'locked', 'service create failed')
    const statusA = await serviceA.unlock(passphrase)
    invariant(statusA.state === 'unlocked' && typeof statusA.address === 'string', 'service unlock failed')
    await serviceA.lock()

    const serviceBackup = await serviceA.backupWallet(passphrase)
    const serviceMnemonic = b4a.toString(serviceBackup.mnemonic, 'utf8')
    invariant(serviceMnemonic.split(' ').length === 24, 'service backup did not return 24 words')
    await serviceA.finishBackup({ ceremonyId: serviceBackup.ceremonyId, outcome: 'complete' })
    invariant(allZero(serviceBackup.mnemonic), 'service backup mnemonic was not zeroed')

    const serviceB = new WalletService({ storage: storageB, engine: adapter })
    const serviceRestoreInput = b4a.from(serviceMnemonic, 'utf8')
    const restored = await serviceB.restoreWallet(passphrase, serviceRestoreInput)
    invariant(restored.restored === true, 'service restore failed')
    invariant(allZero(serviceRestoreInput), 'service restore input was not zeroed')
    const statusB = await serviceB.unlock(passphrase)
    invariant(statusB.address === statusA.address,
      `service restore address ${statusB.address} != created address ${statusA.address}`)
    await serviceB.lock()
    report.legs.service = { address: statusA.address, createUnlockBackupRestore: true }
    console.error('[ceremony-smoke] service loop ok', statusA.address)
  } finally {
    await fs.promises.rm(storageA, { recursive: true, force: true }).catch(() => {})
    await fs.promises.rm(storageB, { recursive: true, force: true }).catch(() => {})
  }
}
