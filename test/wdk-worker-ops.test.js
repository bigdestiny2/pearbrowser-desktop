import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mnemonicToSeedSync } from 'bip39'
import { keccak_256 as keccak256 } from '@noble/hashes/sha3.js'
import { Point, Signature, recoverPublicKey } from '@noble/secp256k1'
import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import { createWorkerOps } from '../backend/wallet/wdk-worker-ops.mjs'

const require = createRequire(import.meta.url)
const STABLE_TESTNET = require('../backend/wallet/networks/stable-testnet.cjs')
const secretEnvelope = require('../backend/wallet/wdk-secret-envelope.cjs')
const { appPayloadDigest } = require('../backend/wallet/app-payload.cjs')

const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
const GOLDEN_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const GOLDEN_SIGNED_TRANSACTION = '02f8ad8208998080843b9aca0082fde89478cf24370174180738c5b8e352b6d14c83a6c9a980b844a9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000001312d0c080a0a5102dbe9392367560b6b873e1908cc7370615a6d035f3a82488fef4643c7106a04ccd5d7c8ded46abf7d66cce51ccb11879a6d8e9b9c10744f741981d6ef26d9a'
const GOLDEN_TRANSACTION_HASH = '0x31a5f71196b5efc0640e06375a3db03b62daa0d2b4e8a53f5e7d764d8ecb0777'

function goldenIntent () {
  return {
    preparedIntentId: 'wpi_0123456789abcdef',
    from: GOLDEN_ADDRESS,
    recipient: '0x1111111111111111111111111111111111111111',
    amountAtomic: '1250000',
    assetId: STABLE_TESTNET.paymentAsset.id,
    feeAssetId: STABLE_TESTNET.nativeFeeAsset.id,
    transactionType: STABLE_TESTNET.transferPolicy.transactionType,
    chainId: STABLE_TESTNET.chain.idDecimal,
    transactionTarget: STABLE_TESTNET.transferPolicy.transactionTarget,
    transactionValueAtomic: STABLE_TESTNET.transferPolicy.transactionValueAtomic,
    calldata: '0xa9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000001312d0',
    calldataHash: '0x3ed826c3bd3348d322fd992acd6d6d3a7adf60d17ea60d8b230921985b99ad12',
    nonce: '0',
    gasLimit: '65000',
    maxFeePerGasAtomic: '1000000000',
    maxPriorityFeePerGasAtomic: STABLE_TESTNET.transferPolicy.maxPriorityFeePerGasAtomic,
    accessList: [],
    estimatedFeeAtomic: '65000000000000',
    maxFeeAtomic: '65000000000000',
    unsignedTransactionHash: '0x2911bf94d64883881b9f12115b2302f41eda09ed91a1b8079da6d72f6f70501d',
    expiresAt: 1800000000000
  }
}

function goldenSecrets () {
  const seed = mnemonicToSeedSync(TEST_MNEMONIC)
  const encryptionKey = Buffer.alloc(32, 0x5a)
  const encryptedSeed = Buffer.from(secretEnvelope.sealSecret('seed', seed, encryptionKey))
  seed.fill(0)
  return { encryptedSeed, encryptionKey, networkId: STABLE_TESTNET.networkId }
}

async function initializedOps () {
  const ops = createWorkerOps({ WDK, WalletManagerEvm })
  const secrets = goldenSecrets()
  const result = await ops.initialize(secrets)
  assert.deepEqual(result, { initialized: true })
  assert.equal(secrets.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(secrets.encryptionKey.every(byte => byte === 0), true)
  return ops
}

function eip191MessageHash (digest) {
  return keccak256(Buffer.concat([Buffer.from('\x19Ethereum Signed Message:\n32', 'utf8'), digest]))
}

function recoverEip191Address (digest, signature) {
  const compact = signature.subarray(0, 64)
  const recovery = signature[64] >= 27 ? signature[64] - 27 : signature[64]
  const recovered = recoverPublicKey(
    Buffer.concat([Buffer.from([recovery]), compact]),
    eip191MessageHash(digest),
    { prehash: false }
  )
  const uncompressed = Point.fromBytes(recovered).toBytes(false)
  return '0x' + Buffer.from(keccak256(uncompressed.subarray(1))).subarray(12).toString('hex')
}

test('WDK worker ops derive the golden account and sign the exact approved envelope offline', async () => {
  const ops = await initializedOps()

  assert.deepEqual(await ops.getAddress({ accountIndex: 0 }), { address: GOLDEN_ADDRESS })
  await assert.rejects(ops.getAddress({ accountIndex: 1 }), err => err.code === 'bad-request')
  await assert.rejects(ops.getAddress(), err => err.code === 'bad-request')

  const signed = await ops.signPrepared({ preparedIntent: goldenIntent() })
  assert.equal(Buffer.from(signed.signedTransaction).toString('hex'), GOLDEN_SIGNED_TRANSACTION)
  assert.equal(signed.transactionHash, GOLDEN_TRANSACTION_HASH)

  const dispose = await ops.dispose()
  assert.equal(dispose.disposed, true)
  assert.equal(dispose.seedZeroed, true)
  await assert.rejects(ops.getAddress({ accountIndex: 0 }), err => err.code === 'not-initialized')
})

test('WDK worker ops refuse to sign any envelope that drifts from the approved intent', async () => {
  const ops = await initializedOps()

  const changedNonce = { ...goldenIntent(), nonce: '1' }
  await assert.rejects(ops.signPrepared({ preparedIntent: changedNonce }), err => err.code === 'bad-request')

  const changedHash = { ...goldenIntent(), unsignedTransactionHash: '0x' + '00'.repeat(32) }
  await assert.rejects(ops.signPrepared({ preparedIntent: changedHash }), err => err.code === 'bad-request')

  const changedTarget = { ...goldenIntent(), transactionTarget: GOLDEN_ADDRESS }
  await assert.rejects(ops.signPrepared({ preparedIntent: changedTarget }), err => err.code === 'bad-request')

  const changedValue = { ...goldenIntent(), transactionValueAtomic: '1' }
  await assert.rejects(ops.signPrepared({ preparedIntent: changedValue }), err => err.code === 'bad-request')

  const foreignFrom = { ...goldenIntent(), from: '0x1111111111111111111111111111111111111111' }
  await assert.rejects(ops.signPrepared({ preparedIntent: foreignFrom }), err => err.code === 'bad-request')

  await ops.dispose()
})

test('WDK worker ops sign only fixed 32-byte app payload digests with the account-0 key', async () => {
  const ops = await initializedOps()
  const digest = appPayloadDigest({
    driveKey: 'ab'.repeat(32),
    manifestSha256: 'cd'.repeat(32),
    payloadHash: 'ef'.repeat(32)
  })

  const result = await ops.signAppPayload({ payloadDigest: digest })
  assert.equal(result.signature.byteLength, 65)
  assert.equal(result.address, GOLDEN_ADDRESS)
  assert.equal(Buffer.from(result.digest).equals(Buffer.from(digest)), true)
  assert.equal(Signature.fromBytes(result.signature.subarray(0, 64)).hasHighS(), false)
  assert.equal(recoverEip191Address(result.digest, result.signature), GOLDEN_ADDRESS.toLowerCase())

  await assert.rejects(ops.signAppPayload({ payloadDigest: Buffer.alloc(31) }), err => err.code === 'bad-request')
  await assert.rejects(ops.signAppPayload({ payloadDigest: Buffer.alloc(33) }), err => err.code === 'bad-request')
  await assert.rejects(ops.signAppPayload({ payloadDigest: '0x' + 'ab'.repeat(32) }), err => err.code === 'bad-request')
  await assert.rejects(ops.signAppPayload({}), err => err.code === 'bad-request')

  await ops.dispose()
})

test('WDK worker ops fail closed on lifecycle and initialization misuse', async () => {
  const ops = createWorkerOps({ WDK, WalletManagerEvm })
  await assert.rejects(ops.getAddress({ accountIndex: 0 }), err => err.code === 'not-initialized')
  await assert.rejects(ops.getBalances(), err => err.code === 'not-initialized')
  await assert.rejects(ops.signPrepared({ preparedIntent: goldenIntent() }), err => err.code === 'not-initialized')
  await assert.rejects(ops.signAppPayload({ payloadDigest: Buffer.alloc(32) }), err => err.code === 'not-initialized')

  const badNetwork = goldenSecrets()
  await assert.rejects(
    ops.initialize({ ...badNetwork, networkId: 'stable-mainnet' }),
    err => err.code === 'bad-request'
  )

  const badEnvelope = goldenSecrets()
  badEnvelope.encryptedSeed[40] ^= 1
  await assert.rejects(ops.initialize(badEnvelope), err => err.code === 'bad-request')
  assert.equal(badEnvelope.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(badEnvelope.encryptionKey.every(byte => byte === 0), true)

  await ops.initialize(goldenSecrets())
  await assert.rejects(ops.initialize(goldenSecrets()), err => err.code === 'already-initialized')
  await ops.dispose()
  assert.deepEqual(await ops.dispose(), { disposed: true, seedZeroed: true })
})

test('WDK worker ops validate broadcast and transaction-query input shapes offline', async () => {
  const ops = await initializedOps()
  const signed = await ops.signPrepared({ preparedIntent: goldenIntent() })

  await assert.rejects(ops.broadcastSigned({}), err => err.code === 'bad-request')
  await assert.rejects(
    ops.broadcastSigned({ signedTransaction: signed.signedTransaction, transactionHash: '0x' + '00'.repeat(32) }),
    err => err.code === 'bad-request'
  )
  await assert.rejects(ops.getTransaction({ transactionHash: 'not-a-hash' }), err => err.code === 'bad-request')

  await ops.dispose()
})
