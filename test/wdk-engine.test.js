import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { keccak_256 as keccak256 } from '@noble/hashes/sha3.js'
import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes } from '@noble/hashes/utils.js'
import { Point, Signature, hashes, recoverPublicKey, sign } from '@noble/secp256k1'

hashes.hmacSha256 = (key, ...messages) => hmac(sha256, key, concatBytes(...messages))

const require = createRequire(import.meta.url)
const { ALLOWED_ENDPOINT_METHODS, WdkEngineAdapter, assertEndpoint } = require('../backend/wallet/wdk-engine.cjs')
const STABLE_TESTNET = require('../backend/wallet/networks/stable-testnet.cjs')
const { ENVELOPE_BYTES } = require('../backend/wallet/wdk-secret-envelope.cjs')
const { appPayloadDigest } = require('../backend/wallet/app-payload.cjs')

const config = STABLE_TESTNET
const ADDRESS = '0x1111111111111111111111111111111111111111'
const FROM_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const CALLDATA = '0xa9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000001312d0'
const CALLDATA_HASH = '0x3ed826c3bd3348d322fd992acd6d6d3a7adf60d17ea60d8b230921985b99ad12'
const UNSIGNED_HASH = '0x2911bf94d64883881b9f12115b2302f41eda09ed91a1b8079da6d72f6f70501d'
const TRANSACTION_HASH = '0x31a5f71196b5efc0640e06375a3db03b62daa0d2b4e8a53f5e7d764d8ecb0777'
const SIGNED_TRANSACTION = '02f8ad8208998080843b9aca0082fde89478cf24370174180738c5b8e352b6d14c83a6c9a980b844a9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000001312d0c080a0a5102dbe9392367560b6b873e1908cc7370615a6d035f3a82488fef4643c7106a04ccd5d7c8ded46abf7d66cce51ccb11879a6d8e9b9c10744f741981d6ef26d9a'
const DIFFERENT_SIGNER_ADDRESS = '0x2b5ad5c4795c026514f8317c7a215e218dccd6cf'
const DIFFERENT_SIGNER_TRANSACTION_HASH = '0xe4fa5dc37e17070865613b37a5415cd070f763a9ae48c3dfcd5ea7a8e3121ecc'
const DIFFERENT_SIGNER_TRANSACTION = '02f8ad8208998080843b9aca0082fde89478cf24370174180738c5b8e352b6d14c83a6c9a980b844a9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000001312d0c001a01e1b8e68fc6fd9dba31dd2659e69ce6fb8b24d0d5ecf694dfb5f406ff96ead50a048b76bc8fec7c490c07727ae1c5e0a59812ffb4d3d9678cc0a4f18dc008fac0f'
const HIGH_S_TRANSACTION_HASH = '0x534b1f6678f1a5252453b30365ddbb80af30f7c0f967b01ed1083f361a797185'
const SECP256K1_ORDER = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141')
const CEREMONY_ID = 'wc_0123456789abcdef'
const GOLDEN_PRIVATE_KEY = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const OTHER_PRIVATE_KEY = '59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const APP_PAYLOAD_INPUT = Object.freeze({
  driveKey: 'ab'.repeat(32),
  manifestSha256: 'cd'.repeat(32),
  payloadHash: 'ef'.repeat(32)
})

function appPayloadMessageHash (digest) {
  return keccak256(Buffer.concat([Buffer.from('\x19Ethereum Signed Message:\n32', 'utf8'), digest]))
}

function appPayloadSignature (digest, privateKeyHex, { highS = false } = {}) {
  const recovered = sign(appPayloadMessageHash(digest), Buffer.from(privateKeyHex, 'hex'), {
    prehash: false,
    format: 'recovered'
  })
  const compact = Buffer.from(recovered.subarray(1))
  if (highS) {
    const signature = Signature.fromBytes(compact)
    assert.equal(signature.hasHighS(), false)
    const flipped = SECP256K1_ORDER - signature.s
    Buffer.from(flipped.toString(16).padStart(64, '0'), 'hex').copy(compact, 32)
    assert.equal(Signature.fromBytes(compact).hasHighS(), true)
  }
  return Buffer.concat([compact, Buffer.from([27 + recovered[0]])])
}

function appPayloadResult (overrides = {}) {
  const digest = appPayloadDigest(APP_PAYLOAD_INPUT)
  return {
    signature: appPayloadSignature(digest, GOLDEN_PRIVATE_KEY),
    address: FROM_ADDRESS,
    digest: Buffer.from(digest),
    ...overrides
  }
}

function mnemonic () {
  return Buffer.from(`${'abandon '.repeat(23)}art`)
}

function preparedIntent () {
  return {
    preparedIntentId: 'wpi_0123456789abcdef',
    from: FROM_ADDRESS,
    recipient: ADDRESS,
    amountAtomic: '1250000',
    assetId: STABLE_TESTNET.paymentAsset.id,
    feeAssetId: STABLE_TESTNET.nativeFeeAsset.id,
    transactionType: STABLE_TESTNET.transferPolicy.transactionType,
    chainId: STABLE_TESTNET.chain.idDecimal,
    transactionTarget: STABLE_TESTNET.transferPolicy.transactionTarget,
    transactionValueAtomic: STABLE_TESTNET.transferPolicy.transactionValueAtomic,
    calldata: CALLDATA,
    calldataHash: CALLDATA_HASH,
    nonce: '0',
    gasLimit: '65000',
    maxFeePerGasAtomic: '1000000000',
    maxPriorityFeePerGasAtomic: STABLE_TESTNET.transferPolicy.maxPriorityFeePerGasAtomic,
    accessList: [],
    estimatedFeeAtomic: '60000000000000',
    maxFeeAtomic: '65000000000000',
    unsignedTransactionHash: UNSIGNED_HASH,
    expiresAt: 1800000000000
  }
}

function signedTransaction () {
  return {
    signedTransaction: Buffer.from(SIGNED_TRANSACTION, 'hex'),
    transactionHash: TRANSACTION_HASH
  }
}

function signedTransactionFixture (hex) {
  const signedTransaction = Buffer.from(hex, 'hex')
  return {
    signedTransaction,
    transactionHash: '0x' + Buffer.from(keccak256(signedTransaction)).toString('hex')
  }
}

function fixtureSignature (signedTransaction) {
  const yParityOffset = signedTransaction.length - 67
  const rPrefixOffset = signedTransaction.length - 66
  const sPrefixOffset = signedTransaction.length - 33
  assert.equal(signedTransaction[rPrefixOffset], 0xa0)
  assert.equal(signedTransaction[sPrefixOffset], 0xa0)
  const yParity = signedTransaction[yParityOffset] === 0x80
    ? 0
    : signedTransaction[yParityOffset]
  assert.ok(yParity === 0 || yParity === 1)
  const compact = Buffer.concat([
    signedTransaction.subarray(rPrefixOffset + 1, sPrefixOffset),
    signedTransaction.subarray(sPrefixOffset + 1)
  ])
  return { yParity, compact, yParityOffset, sPrefixOffset }
}

function fixtureSignerAddress (signedTransaction) {
  const { yParity, compact } = fixtureSignature(signedTransaction)
  const recovered = recoverPublicKey(
    Buffer.concat([Buffer.from([yParity]), compact]),
    Buffer.from(UNSIGNED_HASH.slice(2), 'hex'),
    { prehash: false }
  )
  const uncompressed = Point.fromBytes(recovered).toBytes(false)
  return '0x' + Buffer.from(keccak256(uncompressed.subarray(1))).subarray(12).toString('hex')
}

function highSSignedTransaction () {
  const signedTransaction = Buffer.from(SIGNED_TRANSACTION, 'hex')
  const { yParity, compact, yParityOffset, sPrefixOffset } = fixtureSignature(signedTransaction)
  const signature = Signature.fromBytes(compact)
  assert.equal(signature.hasHighS(), false)
  const highS = SECP256K1_ORDER - signature.s
  assert.ok(highS > SECP256K1_ORDER / 2n)
  signedTransaction[yParityOffset] = yParity === 0 ? 0x01 : 0x80
  Buffer.from(highS.toString(16).padStart(64, '0'), 'hex').copy(signedTransaction, sPrefixOffset + 1)
  return signedTransactionFixture(signedTransaction.toString('hex'))
}

function signedTransactionWithChangedTarget () {
  const bytes = Buffer.from(SIGNED_TRANSACTION, 'hex')
  const target = Buffer.from(STABLE_TESTNET.paymentAsset.proxyAddress.slice(2), 'hex')
  const offset = bytes.indexOf(target)
  assert.ok(offset > 0)
  bytes[offset + target.length - 1] ^= 1
  return {
    signedTransaction: bytes,
    transactionHash: '0x' + Buffer.from(keccak256(bytes)).toString('hex')
  }
}

function vaultMaterial () {
  return {
    completed: true,
    encryptedSeed: Buffer.alloc(ENVELOPE_BYTES.seed, 0xb4),
    encryptedEntropy: Buffer.alloc(ENVELOPE_BYTES.entropy, 0xb5),
    encryptionKey: Buffer.alloc(32, 0xb6)
  }
}

function typedEndpoint (overrides = {}) {
  return {
    initialize: async () => ({ initialized: true }),
    dispose: async () => ({ disposed: true }),
    getAddress: async () => ({ address: FROM_ADDRESS }),
    getBalances: async () => ({ paymentAmountAtomic: '0', nativeFeeAmountAtomic: '0' }),
    prepareTransfer: async () => preparedIntent(),
    signPrepared: async () => signedTransaction(),
    broadcastSigned: async () => ({ transactionHash: TRANSACTION_HASH }),
    getTransaction: async () => ({
      transactionHash: TRANSACTION_HASH,
      state: 'submitted',
      confirmations: 0,
      blockNumber: null
    }),
    terminate: async () => true,
    ...overrides
  }
}

function ceremonyEndpoint (overrides = {}) {
  let activeType = null
  return typedEndpoint({
    beginMnemonicCeremony: async ({ type }) => {
      activeType = type
      return type === 'restore'
        ? { ceremonyId: CEREMONY_ID }
        : { ceremonyId: CEREMONY_ID, mnemonic: mnemonic() }
    },
    finishMnemonicCeremony: async ({ outcome }) => {
      if (outcome === 'complete' && ['create', 'restore'].includes(activeType)) return vaultMaterial()
      return { completed: true }
    },
    ...overrides
  })
}

function secrets () {
  return {
    encryptedSeed: Buffer.alloc(ENVELOPE_BYTES.seed, 0xa4),
    encryptionKey: Buffer.alloc(32, 0xa5),
    compiledConfig: config
  }
}

test('WDK engine rejects a generic dispatcher and terminates the rejected worklet', async () => {
  let terminated = false
  const endpoint = typedEndpoint({
    callMethod: async () => true,
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  const input = secrets()

  await assert.rejects(adapter.initialize(input), /forbidden method: callMethod/)
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
  assert.equal(input.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(input.encryptionKey.every(byte => byte === 0), true)
})

test('WDK engine rejects every unexpected callable endpoint method', async () => {
  let terminated = false
  const endpoint = typedEndpoint({
    exportPrivateKey: async () => 'secret',
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })

  await assert.rejects(adapter.initialize(secrets()), /forbidden method: exportPrivateKey/)
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
})

test('WDK engine rejects dynamic endpoint accessors', async () => {
  let terminated = false
  const endpoint = typedEndpoint({ terminate: async () => { terminated = true } })
  Object.defineProperty(endpoint, 'callMethod', { get: () => async () => true })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })

  await assert.rejects(adapter.initialize(secrets()), /unsupported accessor: callMethod/)
  assert.equal(terminated, true)
})

test('WDK engine faults when a spawned endpoint cannot prove termination', async () => {
  const endpoint = typedEndpoint()
  delete endpoint.terminate
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  const input = secrets()

  await assert.rejects(adapter.initialize(input), /missing typed method: terminate/)
  assert.equal(adapter.state, 'faulted')
  assert.equal(adapter.recoveryRequired, true)
  assert.equal(input.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(input.encryptionKey.every(byte => byte === 0), true)
})

test('WDK engine rejects any config other than the imported Stable Testnet manifest and still wipes inputs', async () => {
  const input = secrets()
  input.compiledConfig = Object.freeze({ network: { id: 'stable-testnet' } })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => typedEndpoint() })

  await assert.rejects(adapter.initialize(input), /imported Stable Testnet release manifest/)
  assert.equal(input.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(input.encryptionKey.every(byte => byte === 0), true)
})

test('WDK engine rejects frozen chain, provider, and contract substitutions', async () => {
  const substitutions = [
    Object.freeze({ ...STABLE_TESTNET, chain: Object.freeze({ ...STABLE_TESTNET.chain, idDecimal: 1 }) }),
    Object.freeze({
      ...STABLE_TESTNET,
      providers: Object.freeze([
        Object.freeze({ ...STABLE_TESTNET.providers[0], url: 'https://attacker.invalid' }),
        STABLE_TESTNET.providers[1]
      ])
    }),
    Object.freeze({
      ...STABLE_TESTNET,
      paymentAsset: Object.freeze({
        ...STABLE_TESTNET.paymentAsset,
        proxyAddress: '0x2222222222222222222222222222222222222222'
      })
    })
  ]

  for (const compiledConfig of substitutions) {
    const input = { ...secrets(), compiledConfig }
    const adapter = new WdkEngineAdapter({ spawnWorklet: async () => typedEndpoint() })
    await assert.rejects(adapter.initialize(input), /imported Stable Testnet release manifest/)
    assert.equal(input.encryptedSeed.every(byte => byte === 0), true)
    assert.equal(input.encryptionKey.every(byte => byte === 0), true)
  }
})

test('WDK engine independently wipes remaining host secrets after a transferred buffer detaches', async () => {
  const endpoint = typedEndpoint({
    initialize: async ({ encryptedSeed }) => {
      structuredClone(encryptedSeed, { transfer: [encryptedSeed.buffer] })
      return { initialized: true }
    }
  })
  const input = {
    encryptedSeed: new Uint8Array(ENVELOPE_BYTES.seed).fill(0xa4),
    encryptionKey: new Uint8Array(32).fill(0xa5),
    compiledConfig: config
  }
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })

  await adapter.initialize(input)
  assert.equal(input.encryptedSeed.byteLength, 0)
  assert.equal(input.encryptionKey.every(byte => byte === 0), true)
  assert.equal(adapter.state, 'ready')
  await adapter.lock()
})

test('WDK engine rejects a second initialize without orphaning the active worklet', async () => {
  let terminated = false
  const endpoint = typedEndpoint({ terminate: async () => { terminated = true } })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(secrets())
  const duplicateInput = secrets()

  await assert.rejects(adapter.initialize(duplicateInput), /already active/)
  assert.equal(duplicateInput.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(duplicateInput.encryptionKey.every(byte => byte === 0), true)
  assert.equal(adapter.state, 'ready')
  assert.deepEqual(await adapter.getAddress(), { address: FROM_ADDRESS })
  assert.deepEqual(await adapter.lock(), { locked: true, disposeOutcome: 'ok' })
  assert.equal(terminated, true)
})

test('WDK engine rejects a concurrent initialize without disabling cancellation', async () => {
  let releaseSpawn
  let terminated = false
  const endpoint = typedEndpoint({ terminate: async () => { terminated = true } })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: () => new Promise(resolve => { releaseSpawn = () => resolve(endpoint) })
  })
  const firstInitialize = adapter.initialize(secrets())
  await Promise.resolve()
  const duplicateInput = secrets()

  await assert.rejects(adapter.initialize(duplicateInput), /already active/)
  assert.equal(duplicateInput.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(duplicateInput.encryptionKey.every(byte => byte === 0), true)
  const locking = adapter.lock()
  releaseSpawn()

  await assert.rejects(firstInitialize, err => err.code === 'operation-cancelled')
  assert.deepEqual(await locking, { locked: true, disposeOutcome: 'initialization-cancelled' })
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
})

test('WDK engine exposes only typed operations and logs no arguments, results, or error messages', async () => {
  const secretCanary = 'signed-transaction-secret-canary'
  const logs = []
  const endpoint = typedEndpoint({
    getTransaction: async () => ({
      transactionHash: TRANSACTION_HASH,
      state: 'submitted',
      confirmations: 0,
      blockNumber: null
    }),
    getBalances: async () => {
      const err = new Error(secretCanary)
      err.code = secretCanary
      throw err
    }
  })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => endpoint,
    logger: { info: event => logs.push(event) }
  })
  await adapter.initialize(secrets())

  assert.equal(typeof adapter.request, 'undefined')
  assert.equal(typeof adapter.signTransaction, 'undefined')
  assert.deepEqual(await adapter.getTransaction(TRANSACTION_HASH), {
    transactionHash: TRANSACTION_HASH,
    state: 'submitted',
    confirmations: 0,
    blockNumber: null
  })
  await assert.rejects(
    adapter.getBalances(),
    err => err.code === 'operation-failed' && err.message === 'operation-failed'
  )
  const serializedLogs = JSON.stringify(logs)
  assert.doesNotMatch(serializedLogs, /signed-transaction-secret-canary/)
  assert.match(serializedLogs, /operation-failed/)
  for (const entry of logs) {
    assert.deepEqual(Object.keys(entry).sort(), [
      'correlationId',
      'durationMs',
      'lifecycleState',
      'operation',
      'outcomeCode'
    ])
  }
  await adapter.lock()
})

test('WDK engine owns the fixed asset and fee policy and accepts only narrow payment inputs', async () => {
  let balanceArguments
  let preparePayload
  const endpoint = typedEndpoint({
    getBalances: async (...args) => {
      balanceArguments = args
      return { paymentAmountAtomic: '7', nativeFeeAmountAtomic: '9' }
    },
    prepareTransfer: async payload => {
      preparePayload = payload
      return preparedIntent()
    }
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(secrets())

  assert.deepEqual(await adapter.getBalances(), { paymentAmountAtomic: '7', nativeFeeAmountAtomic: '9' })
  assert.deepEqual(balanceArguments, [])
  assert.deepEqual(await adapter.prepareTransfer(ADDRESS, '1250000'), preparedIntent())
  assert.deepEqual(preparePayload, { recipient: ADDRESS, amountAtomic: '1250000' })

  await assert.rejects(adapter.getBalances(STABLE_TESTNET.paymentAsset), err => err.code === 'operation-failed')
  await assert.rejects(
    adapter.prepareTransfer(STABLE_TESTNET.paymentAsset, ADDRESS, '1250000', { maxFeeAtomic: '1' }),
    err => err.code === 'operation-failed'
  )
  await adapter.lock()
})

test('WDK engine rejects malformed initialization and typed operation results', async () => {
  let terminated = false
  const badInitialize = typedEndpoint({
    initialize: async () => ({ initialized: true, rootKey: 'must-not-cross' }),
    terminate: async () => { terminated = true }
  })
  const failedAdapter = new WdkEngineAdapter({ spawnWorklet: async () => badInitialize })
  await assert.rejects(failedAdapter.initialize(secrets()), err => err.code === 'initialization-failed')
  assert.equal(terminated, true)

  const cases = [
    {
      override: { getAddress: async () => ({ address: ADDRESS, account: {} }) },
      invoke: adapter => adapter.getAddress()
    },
    {
      override: { getBalances: async () => ({ paymentAmountAtomic: '1e3', nativeFeeAmountAtomic: '0' }) },
      invoke: adapter => adapter.getBalances()
    },
    {
      override: {
        getBalances: async () => ({
          paymentAmountAtomic: '0',
          nativeFeeAmountAtomic: '0',
          raw: 'must-not-cross'
        })
      },
      invoke: adapter => adapter.getBalances()
    },
    {
      override: { prepareTransfer: async () => ({ ...preparedIntent(), account: {} }) },
      invoke: adapter => adapter.prepareTransfer(ADDRESS, '1250000')
    },
    {
      override: { prepareTransfer: async () => ({ ...preparedIntent(), transactionTarget: ADDRESS }) },
      invoke: adapter => adapter.prepareTransfer(ADDRESS, '1250000')
    },
    {
      override: { prepareTransfer: async () => ({ ...preparedIntent(), from: ADDRESS }) },
      invoke: adapter => adapter.prepareTransfer(ADDRESS, '1250000')
    },
    {
      override: {
        prepareTransfer: async () => ({
          ...preparedIntent(),
          recipient: '0x2222222222222222222222222222222222222222',
          calldata: '0xa9059cbb000000000000000000000000222222222222222222222222222222222222222200000000000000000000000000000000000000000000000000000000001312d0',
          calldataHash: '0x78a47accea5598ea27185549be701ea3a3c6ed88152049021a9008a335f63880',
          unsignedTransactionHash: '0xaf630aab1a98d583f69dcbb3fbd30ca956cf07e8899b25aff5cf937d22116230'
        })
      },
      invoke: adapter => adapter.prepareTransfer(ADDRESS, '1250000')
    },
    {
      override: {
        prepareTransfer: async () => ({
          ...preparedIntent(),
          amountAtomic: '1',
          calldata: '0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000001',
          calldataHash: '0x6a14413571fa1a62ded28d4c2fd2490c3b31a4333f283720d2cab46f1dc6f62e',
          unsignedTransactionHash: '0xa3f15c5e449e768fa40a0f51b8ecb692da265ed9eb631f16d1e87d75425c78f2'
        })
      },
      invoke: adapter => adapter.prepareTransfer(ADDRESS, '1250000')
    },
    {
      override: {
        prepareTransfer: async () => ({
          ...preparedIntent(),
          nonce: '18446744073709551616',
          unsignedTransactionHash: '0x05ade12afea8a0b6d498b1c10f8e77565c216db94d625abe2d376862d78f5373'
        })
      },
      invoke: adapter => adapter.prepareTransfer(ADDRESS, '1250000')
    },
    {
      override: { signPrepared: async () => ({ ...signedTransaction(), key: 'must-not-cross' }) },
      invoke: adapter => adapter.signPrepared(preparedIntent())
    },
    {
      override: { signPrepared: async () => signedTransaction() },
      invoke: adapter => adapter.signPrepared({ ...preparedIntent(), from: ADDRESS })
    },
    {
      override: { signPrepared: async () => signedTransactionWithChangedTarget() },
      invoke: adapter => adapter.signPrepared(preparedIntent())
    },
    {
      override: { broadcastSigned: async () => ({ transactionHash: TRANSACTION_HASH, raw: 'must-not-cross' }) },
      invoke: adapter => adapter.broadcastSigned(signedTransaction())
    },
    {
      override: {
        getTransaction: async () => ({
          transactionHash: TRANSACTION_HASH,
          state: 'submitted',
          confirmations: 0,
          blockNumber: null,
          raw: 'must-not-cross'
        })
      },
      invoke: adapter => adapter.getTransaction(TRANSACTION_HASH)
    }
  ]

  for (const { override, invoke } of cases) {
    const adapter = new WdkEngineAdapter({ spawnWorklet: async () => typedEndpoint(override) })
    await adapter.initialize(secrets())
    await assert.rejects(invoke(adapter), err => err.code === 'operation-failed')
    await adapter.lock()
  }
})

test('WDK engine rejects a correctly hashed transaction signed by a different private key', async () => {
  const control = new WdkEngineAdapter({ spawnWorklet: async () => typedEndpoint() })
  await control.initialize(secrets())
  assert.deepEqual(await control.signPrepared(preparedIntent()), signedTransaction())
  await control.lock()

  const result = signedTransactionFixture(DIFFERENT_SIGNER_TRANSACTION)
  const canonical = Buffer.from(SIGNED_TRANSACTION, 'hex')
  const { yParityOffset } = fixtureSignature(result.signedTransaction)
  assert.deepEqual(result.signedTransaction.subarray(0, yParityOffset), canonical.subarray(0, yParityOffset))
  assert.equal(result.transactionHash, DIFFERENT_SIGNER_TRANSACTION_HASH)
  assert.equal(fixtureSignerAddress(result.signedTransaction), DIFFERENT_SIGNER_ADDRESS)
  assert.notEqual(fixtureSignerAddress(result.signedTransaction), FROM_ADDRESS.toLowerCase())

  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint({ signPrepared: async () => result })
  })
  await adapter.initialize(secrets())

  await assert.rejects(adapter.signPrepared(preparedIntent()), err => err.code === 'operation-failed')
  await adapter.lock()
})

test('WDK engine rejects a correctly hashed high-S signature for the approved signer', async () => {
  const result = highSSignedTransaction()
  const { compact } = fixtureSignature(result.signedTransaction)
  assert.equal(result.transactionHash, HIGH_S_TRANSACTION_HASH)
  assert.equal(Signature.fromBytes(compact).hasHighS(), true)
  assert.equal(fixtureSignerAddress(result.signedTransaction), FROM_ADDRESS.toLowerCase())

  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint({ signPrepared: async () => result })
  })
  await adapter.initialize(secrets())

  await assert.rejects(adapter.signPrepared(preparedIntent()), err => err.code === 'operation-failed')
  await adapter.lock()
})

test('WDK engine accepts only the complete optional mnemonic ceremony capability', async () => {
  let terminated = false
  const endpoint = typedEndpoint({
    beginMnemonicCeremony: async () => ({ ceremonyId: CEREMONY_ID, mnemonic: mnemonic() }),
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })

  await assert.rejects(adapter.initialize(secrets()), /incomplete mnemonic ceremony interface/)
  assert.equal(terminated, true)
})

test('WDK create ceremony is one-shot and zeroes exposed mnemonic bytes', async () => {
  let terminated = false
  const endpoint = ceremonyEndpoint({ terminate: async () => { terminated = true } })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint(),
    spawnCeremonyWorklet: async () => endpoint
  })

  const result = await adapter.beginMnemonicCeremony({ type: 'create' })
  assert.equal(result.ceremonyId, CEREMONY_ID)
  assert.equal(result.mnemonic.some(byte => byte !== 0), true)
  await assert.rejects(adapter.beginMnemonicCeremony({ type: 'create' }), err => err.code === 'ceremony-active')
  await assert.rejects(
    adapter.finishMnemonicCeremony({ ceremonyId: 'wc_ffffffffffffffff', outcome: 'complete' }),
    err => err.code === 'ceremony-mismatch'
  )
  const completion = await adapter.finishMnemonicCeremony({
    ceremonyId: CEREMONY_ID,
    outcome: 'complete'
  })
  assert.equal(completion.completed, true)
  assert.equal(Buffer.isBuffer(completion.encryptedSeed), true)
  assert.equal(Buffer.isBuffer(completion.encryptedEntropy), true)
  assert.equal(Buffer.isBuffer(completion.encryptionKey), true)
  assert.equal(completion.encryptionKey.byteLength, 32)
  completion.encryptedSeed.fill(0)
  completion.encryptedEntropy.fill(0)
  completion.encryptionKey.fill(0)
  assert.equal(result.mnemonic.every(byte => byte === 0), true)
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
  await assert.rejects(
    adapter.finishMnemonicCeremony({ ceremonyId: CEREMONY_ID, outcome: 'complete' }),
    err => err.code === 'ceremony-not-active'
  )
})

test('WDK restore ceremony consumes and zeroes mnemonic input without returning it', async () => {
  let capturedMnemonic
  let terminated = false
  const endpoint = ceremonyEndpoint({
    beginMnemonicCeremony: async ({ type, mnemonic }) => {
      assert.equal(type, 'restore')
      capturedMnemonic = Buffer.from(mnemonic)
      return { ceremonyId: CEREMONY_ID }
    },
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint(),
    spawnCeremonyWorklet: async () => endpoint
  })
  const inputMnemonic = mnemonic()
  const result = await adapter.beginMnemonicCeremony({ type: 'restore', mnemonic: inputMnemonic })

  assert.deepEqual(Object.keys(result), ['ceremonyId'])
  assert.equal(capturedMnemonic.equals(mnemonic()), true)
  assert.equal(inputMnemonic.every(byte => byte === 0), true)
  await adapter.finishMnemonicCeremony({ ceremonyId: CEREMONY_ID, outcome: 'cancel' })
  assert.equal(terminated, true)
})

test('WDK backup ceremony uses a locked one-shot worklet and lock cancels and zeroes it', async () => {
  const finishCalls = []
  let terminated = false
  const endpoint = ceremonyEndpoint({
    finishMnemonicCeremony: async input => {
      finishCalls.push(input)
      return { completed: true }
    },
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint(),
    spawnCeremonyWorklet: async () => endpoint
  })
  const encryptedEntropy = Buffer.alloc(ENVELOPE_BYTES.entropy, 0xb8)
  const encryptionKey = Buffer.alloc(32, 0xb7)
  const result = await adapter.beginMnemonicCeremony({
    type: 'backup',
    encryptedEntropy,
    encryptionKey
  })
  assert.equal(encryptedEntropy.every(byte => byte === 0), true)
  assert.equal(encryptionKey.every(byte => byte === 0), true)
  assert.deepEqual(await adapter.lock(), { locked: true, disposeOutcome: 'not-active' })
  assert.equal(result.mnemonic.every(byte => byte === 0), true)
  assert.deepEqual(finishCalls, [{ ceremonyId: CEREMONY_ID, outcome: 'cancel' }])
  assert.equal(terminated, true)
})

test('WDK lock waits for a finishing one-shot ceremony to terminate', async () => {
  let releaseFinish
  let terminated = false
  const endpoint = ceremonyEndpoint({
    finishMnemonicCeremony: () => new Promise(resolve => { releaseFinish = () => resolve(vaultMaterial()) }),
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint(),
    spawnCeremonyWorklet: async () => endpoint
  })
  await adapter.beginMnemonicCeremony({ type: 'create' })
  const finishing = adapter.finishMnemonicCeremony({ ceremonyId: CEREMONY_ID, outcome: 'complete' })
  await Promise.resolve()
  let lockSettled = false
  const locking = adapter.lock().finally(() => { lockSettled = true })
  await Promise.resolve()
  assert.equal(lockSettled, false)
  releaseFinish()
  const completion = await finishing
  assert.deepEqual(await locking, { locked: true, disposeOutcome: 'not-active' })
  assert.equal(terminated, true)
  completion.encryptedSeed.fill(0)
  completion.encryptedEntropy.fill(0)
  completion.encryptionKey.fill(0)
})

test('WDK ceremony rejects extra result fields and wipes rejected mnemonic bytes', async () => {
  const leakedMnemonic = mnemonic()
  let terminated = false
  const endpoint = ceremonyEndpoint({
    beginMnemonicCeremony: async () => ({
      ceremonyId: CEREMONY_ID,
      mnemonic: leakedMnemonic,
      privateKey: 'must-not-cross'
    }),
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint(),
    spawnCeremonyWorklet: async () => endpoint
  })

  await assert.rejects(adapter.beginMnemonicCeremony({ type: 'create' }), err => err.code === 'ceremony-failed')
  assert.equal(leakedMnemonic.every(byte => byte === 0), true)
  assert.equal(terminated, true)
})

test('WDK ceremony rejects upstream immutable base64 vault material', async () => {
  const rejectedEncryptedSeed = Buffer.alloc(ENVELOPE_BYTES.seed, 0xc1)
  const rejectedEncryptedEntropy = Buffer.alloc(ENVELOPE_BYTES.entropy, 0xc2)
  let terminated = false
  const endpoint = ceremonyEndpoint({
    finishMnemonicCeremony: async () => ({
      completed: true,
      encryptedSeed: rejectedEncryptedSeed,
      encryptedEntropy: rejectedEncryptedEntropy,
      encryptionKey: Buffer.alloc(32, 0xa4).toString('base64')
    }),
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint(),
    spawnCeremonyWorklet: async () => endpoint
  })
  await adapter.beginMnemonicCeremony({ type: 'create' })

  await assert.rejects(
    adapter.finishMnemonicCeremony({ ceremonyId: CEREMONY_ID, outcome: 'complete' }),
    err => err.code === 'ceremony-failed'
  )
  assert.equal(rejectedEncryptedSeed.every(byte => byte === 0), true)
  assert.equal(rejectedEncryptedEntropy.every(byte => byte === 0), true)
  assert.equal(terminated, true)
})

test('WDK ceremony zeroes a mnemonic that resolves after begin timeout', async () => {
  let resolveBegin
  let terminated = false
  const lateMnemonic = mnemonic()
  const endpoint = ceremonyEndpoint({
    beginMnemonicCeremony: () => new Promise(resolve => { resolveBegin = resolve }),
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint(),
    spawnCeremonyWorklet: async () => endpoint,
    initializeTimeoutMs: 10,
    terminateTimeoutMs: 20
  })

  const beginning = adapter.beginMnemonicCeremony({ type: 'create' })
  await assert.rejects(beginning, err => err.code === 'ceremony-failed')
  resolveBegin({ ceremonyId: CEREMONY_ID, mnemonic: lateMnemonic })
  await new Promise(resolve => setImmediate(resolve))

  assert.equal(lateMnemonic.every(byte => byte === 0), true)
  assert.equal(terminated, true)
})

test('WDK ceremony zeroes vault material that resolves after finish timeout', async () => {
  let resolveFinish
  let terminated = false
  const endpoint = ceremonyEndpoint({
    finishMnemonicCeremony: () => new Promise(resolve => { resolveFinish = resolve }),
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint(),
    spawnCeremonyWorklet: async () => endpoint,
    disposeTimeoutMs: 10,
    terminateTimeoutMs: 20
  })
  await adapter.beginMnemonicCeremony({ type: 'create' })

  const finishing = adapter.finishMnemonicCeremony({ ceremonyId: CEREMONY_ID, outcome: 'complete' })
  await assert.rejects(finishing, err => err.code === 'ceremony-failed')
  const lateMaterial = vaultMaterial()
  resolveFinish(lateMaterial)
  await new Promise(resolve => setImmediate(resolve))

  assert.equal(lateMaterial.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(lateMaterial.encryptedEntropy.every(byte => byte === 0), true)
  assert.equal(lateMaterial.encryptionKey.every(byte => byte === 0), true)
  assert.equal(terminated, true)
})

test('WDK engine cannot become ready after lock cancels a pending spawn', async () => {
  let releaseSpawn
  let terminated = false
  const endpoint = typedEndpoint({ terminate: async () => { terminated = true } })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: () => new Promise(resolve => { releaseSpawn = () => resolve(endpoint) })
  })
  const initializePromise = adapter.initialize(secrets())
  await Promise.resolve()
  const lockPromise = adapter.lock()
  releaseSpawn()

  await assert.rejects(initializePromise, err => err.code === 'operation-cancelled')
  assert.deepEqual(await lockPromise, { locked: true, disposeOutcome: 'initialization-cancelled' })
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
  assert.equal(adapter.recoveryRequired, false)
  await assert.rejects(adapter.getAddress(), /locked/)
})

test('WDK engine wipes inputs and faults when worklet spawn never settles', async () => {
  const input = secrets()
  const adapter = new WdkEngineAdapter({
    spawnWorklet: () => new Promise(() => {}),
    initializeTimeoutMs: 100,
    disposeTimeoutMs: 10,
    terminateTimeoutMs: 10
  })
  const initializePromise = adapter.initialize(input)
  await Promise.resolve()

  await assert.rejects(adapter.lock(), /service restart required/)
  assert.equal(input.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(input.encryptionKey.every(byte => byte === 0), true)
  await assert.rejects(initializePromise, err => err.code === 'initialization-failed')
  assert.equal(adapter.state, 'faulted')
  assert.equal(adapter.recoveryRequired, true)
})

test('WDK engine terminates a hung initializer and wipes inputs when lock cancels it', async () => {
  let initializationStarted
  let terminated = false
  const started = new Promise(resolve => { initializationStarted = resolve })
  const endpoint = typedEndpoint({
    initialize: () => {
      initializationStarted()
      return new Promise(() => {})
    },
    terminate: async () => { terminated = true }
  })
  const input = secrets()
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => endpoint,
    initializeTimeoutMs: 1000,
    disposeTimeoutMs: 20,
    terminateTimeoutMs: 20
  })
  const initializePromise = adapter.initialize(input)
  await started
  const lockPromise = adapter.lock()

  await assert.rejects(initializePromise, err => err.code === 'operation-cancelled')
  assert.deepEqual(await lockPromise, { locked: true, disposeOutcome: 'initialization-cancelled' })
  assert.equal(terminated, true)
  assert.equal(input.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(input.encryptionKey.every(byte => byte === 0), true)
  assert.equal(adapter.state, 'locked')
})

test('WDK engine sanitizes worklet initialization errors and still terminates', async () => {
  let terminated = false
  const endpoint = typedEndpoint({
    initialize: async () => { throw new Error('seed-derived-provider-secret-canary') },
    terminate: async () => { terminated = true }
  })
  const input = secrets()
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })

  await assert.rejects(
    adapter.initialize(input),
    err => err.code === 'initialization-failed' && err.message === 'initialization-failed'
  )
  assert.equal(terminated, true)
  assert.equal(input.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(input.encryptionKey.every(byte => byte === 0), true)
})

test('WDK engine uses its captured terminator if initialize mutates the endpoint', async () => {
  let terminated = false
  const endpoint = typedEndpoint({ terminate: async () => { terminated = true } })
  endpoint.initialize = async () => {
    Object.defineProperty(endpoint, 'terminate', {
      configurable: true,
      get: () => { throw new Error('terminate-getter-secret-canary') }
    })
    throw new Error('initialize failed')
  }
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })

  await assert.rejects(adapter.initialize(secrets()), err => err.code === 'initialization-failed')
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
  assert.equal(adapter.recoveryRequired, false)
})

test('WDK engine bounds initialization and terminates a timed-out worklet', async () => {
  let terminated = false
  const endpoint = typedEndpoint({
    initialize: () => new Promise(() => {}),
    terminate: async () => { terminated = true }
  })
  const input = secrets()
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => endpoint,
    initializeTimeoutMs: 10,
    terminateTimeoutMs: 20
  })

  await assert.rejects(adapter.initialize(input), err => err.code === 'initialization-failed')
  assert.equal(terminated, true)
  assert.equal(input.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(input.encryptionKey.every(byte => byte === 0), true)
  assert.equal(adapter.state, 'locked')
})

test('WDK engine never returns an in-flight signing result after lock', async () => {
  let releaseSign
  const endpoint = typedEndpoint({
    signPrepared: () => new Promise(resolve => { releaseSign = resolve })
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(secrets())

  const signing = adapter.signPrepared(preparedIntent())
  await Promise.resolve()
  assert.deepEqual(await adapter.lock(), { locked: true, disposeOutcome: 'ok' })
  releaseSign(signedTransaction())
  await assert.rejects(
    signing,
    err => err.code === 'operation-cancelled' && !err.message.includes('secret-canary')
  )
})

test('WDK engine audit failures cannot change wallet operation outcomes', async () => {
  let terminated = false
  const logger = {}
  Object.defineProperty(logger, 'info', { get: () => { throw new Error('logger getter unavailable') } })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint({ terminate: async () => { terminated = true } }),
    logger
  })

  await adapter.initialize(secrets())
  assert.deepEqual(await adapter.getAddress(), { address: FROM_ADDRESS })
  assert.deepEqual(await adapter.lock(), { locked: true, disposeOutcome: 'ok' })
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
})

test('WDK engine ignores asynchronously rejected audit writes', async () => {
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => typedEndpoint(),
    logger: { info: async () => { throw new Error('async logger unavailable') } }
  })

  await adapter.initialize(secrets())
  assert.deepEqual(await adapter.getAddress(), { address: FROM_ADDRESS })
  assert.deepEqual(await adapter.lock(), { locked: true, disposeOutcome: 'ok' })
})

test('WDK engine zeroes host buffers and always terminates after a dispose failure', async () => {
  let initializedSeed
  let initializedKey
  let terminated = false
  const endpoint = typedEndpoint({
    initialize: async ({ encryptedSeed, encryptionKey }) => {
      initializedSeed = Buffer.from(encryptedSeed)
      initializedKey = Buffer.from(encryptionKey)
      return { initialized: true }
    },
    dispose: async () => { throw new Error('dispose secret must not be logged') },
    terminate: async () => { terminated = true }
  })
  const input = secrets()
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(input)

  assert.equal(initializedSeed.length, ENVELOPE_BYTES.seed)
  assert.equal(initializedSeed.every(byte => byte === 0xa4), true)
  assert.equal(initializedKey.every(byte => byte === 0xa5), true)
  assert.equal(input.encryptedSeed.every(byte => byte === 0), true)
  assert.equal(input.encryptionKey.every(byte => byte === 0), true)

  const result = await adapter.lock()
  assert.deepEqual(result, { locked: true, disposeOutcome: 'dispose-failed' })
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
  await assert.rejects(adapter.getAddress(), /locked/)
})

test('WDK engine treats a malformed dispose acknowledgement as failure and still terminates', async () => {
  let terminated = false
  const endpoint = typedEndpoint({
    dispose: async () => ({ disposed: true, secret: 'must-not-cross' }),
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(secrets())

  assert.deepEqual(await adapter.lock(), { locked: true, disposeOutcome: 'dispose-failed' })
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
})

test('WDK engine terminates even when a hostile dispose error has a throwing code getter', async () => {
  let terminated = false
  const hostileError = {}
  Object.defineProperty(hostileError, 'code', { get: () => { throw new Error('code-getter-secret-canary') } })
  const endpoint = typedEndpoint({
    dispose: async () => { throw hostileError },
    terminate: async () => { terminated = true }
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(secrets())

  assert.deepEqual(await adapter.lock(), { locked: true, disposeOutcome: 'dispose-failed' })
  assert.equal(terminated, true)
  assert.equal(adapter.state, 'locked')
})

test('WDK engine fails closed and requires restart when worklet termination is not confirmed', async () => {
  const endpoint = typedEndpoint({ terminate: () => new Promise(() => {}) })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => endpoint,
    disposeTimeoutMs: 10,
    terminateTimeoutMs: 10
  })
  await adapter.initialize(secrets())
  await assert.rejects(adapter.lock(), /service restart required/)
  assert.equal(adapter.state, 'faulted')
  assert.equal(adapter.recoveryRequired, true)
  await assert.rejects(adapter.initialize(secrets()), /service restart required/)
})

test('WDK engine signs scoped app payload digests bound to account 0', async () => {
  let observedDigest
  const endpoint = typedEndpoint({
    signAppPayload: async ({ payloadDigest }) => {
      observedDigest = Buffer.from(payloadDigest)
      return appPayloadResult()
    }
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(secrets())

  const result = await adapter.signAppPayload(APP_PAYLOAD_INPUT)
  const expectedDigest = appPayloadDigest(APP_PAYLOAD_INPUT)
  assert.equal(observedDigest.equals(expectedDigest), true)
  assert.equal(observedDigest.byteLength, 32)
  assert.equal(result.address, FROM_ADDRESS)
  assert.equal(result.signature.byteLength, 65)
  assert.equal(result.digest.equals(expectedDigest), true)
  assert.equal(Signature.fromBytes(result.signature.subarray(0, 64)).hasHighS(), false)
  await adapter.lock()
})

test('WDK engine rejects an app payload signature from a different key', async () => {
  const digest = appPayloadDigest(APP_PAYLOAD_INPUT)
  const endpoint = typedEndpoint({
    signAppPayload: async () => appPayloadResult({
      signature: appPayloadSignature(digest, OTHER_PRIVATE_KEY)
    })
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(secrets())

  await assert.rejects(adapter.signAppPayload(APP_PAYLOAD_INPUT), err => err.code === 'operation-failed')
  await adapter.lock()
})

test('WDK engine rejects a high-S app payload signature', async () => {
  const digest = appPayloadDigest(APP_PAYLOAD_INPUT)
  const endpoint = typedEndpoint({
    signAppPayload: async () => appPayloadResult({
      signature: appPayloadSignature(digest, GOLDEN_PRIVATE_KEY, { highS: true })
    })
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(secrets())

  await assert.rejects(adapter.signAppPayload(APP_PAYLOAD_INPUT), err => err.code === 'operation-failed')
  await adapter.lock()
})

test('WDK engine rejects malformed app payload results and inputs', async () => {
  const digest = appPayloadDigest(APP_PAYLOAD_INPUT)
  const malformedResults = [
    { digest: Buffer.alloc(31) },
    { digest: Buffer.alloc(32) },
    { signature: Buffer.alloc(64) },
    { address: '0x2222222222222222222222222222222222222222' },
    { signature: Buffer.alloc(65), address: FROM_ADDRESS, digest: Buffer.from(digest), raw: 'must-not-cross' }
  ]
  for (const overrides of malformedResults) {
    const endpoint = typedEndpoint({ signAppPayload: async () => appPayloadResult(overrides) })
    const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
    await adapter.initialize(secrets())
    await assert.rejects(adapter.signAppPayload(APP_PAYLOAD_INPUT), err => err.code === 'operation-failed')
    await adapter.lock()
  }

  let called = false
  const endpoint = typedEndpoint({
    signAppPayload: async () => {
      called = true
      return appPayloadResult()
    }
  })
  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
  await adapter.initialize(secrets())
  const badInputs = [
    {},
    { ...APP_PAYLOAD_INPUT, driveKey: '0x' + 'ab'.repeat(32) },
    { ...APP_PAYLOAD_INPUT, payloadHash: 'zz'.repeat(32) },
    { ...APP_PAYLOAD_INPUT, extra: 'must-not-cross' },
    { driveKey: APP_PAYLOAD_INPUT.driveKey, manifestSha256: APP_PAYLOAD_INPUT.manifestSha256 }
  ]
  for (const input of badInputs) {
    await assert.rejects(adapter.signAppPayload(input), err => err.code === 'operation-failed')
  }
  assert.equal(called, false)
  await adapter.lock()
})

test('WDK engine keeps generic signing forbidden while allowing the scoped attestation op', async () => {
  assert.equal(ALLOWED_ENDPOINT_METHODS.includes('signAppPayload'), true)
  assertEndpoint(typedEndpoint({ signAppPayload: async () => appPayloadResult() }))

  for (const method of ['sign', 'signMessage']) {
    let terminated = false
    const endpoint = typedEndpoint({
      [method]: async () => 'generic-signature',
      terminate: async () => { terminated = true }
    })
    const adapter = new WdkEngineAdapter({ spawnWorklet: async () => endpoint })
    await assert.rejects(adapter.initialize(secrets()), new RegExp(`forbidden method: ${method}`))
    assert.equal(terminated, true)
  }

  const adapter = new WdkEngineAdapter({ spawnWorklet: async () => typedEndpoint() })
  await adapter.initialize(secrets())
  await assert.rejects(adapter.signAppPayload(APP_PAYLOAD_INPUT), err => err.code === 'operation-failed')
  await adapter.lock()
})
