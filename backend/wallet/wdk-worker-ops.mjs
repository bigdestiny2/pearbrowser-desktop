// Typed WDK worker operations. This module is runtime-agnostic: the Bare
// worker shell (wdk-worker.mjs) and the Node unit tests both inject the WDK
// and EVM wallet classes, so the protocol/zeroing discipline lives in exactly
// one place. Network access is limited to the manifest's HTTPS providers and
// only inside getBalances, prepareTransfer, broadcastSigned and getTransaction.

import b4a from 'b4a'
import sodium from 'sodium-universal'
import secretEnvelope from './wdk-secret-envelope.cjs'
import STABLE_TESTNET from './networks/stable-testnet.cjs'
import evmEnvelope from './evm-envelope.cjs'

const { expectedTransferCalldata, hashBytes, unsignedTransactionHash } = evmEnvelope

const WORKER_ERROR_CODES = new Set([
  'already-initialized',
  'bad-request',
  'fee-too-high',
  'insufficient-funds',
  'method-not-allowed',
  'not-initialized',
  'rpc-unavailable'
])

const PREPARED_INTENT_TTL_MS = 120000
const ATOMIC_PATTERN = /^(0|[1-9][0-9]*)$/
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/

function fail (code) {
  const error = new Error(code)
  error.code = code
  throw error
}

function isBytes (value) {
  return b4a.isBuffer(value) || value instanceof Uint8Array
}

function copyBytes (value) {
  const copy = b4a.alloc(value.byteLength)
  copy.set(value)
  return copy
}

function zero (value) {
  if (isBytes(value)) value.fill(0)
}

function requireAtomic (value, label, { positive = false, maximum = null } = {}) {
  if (typeof value !== 'string' || value.length > 80 || !ATOMIC_PATTERN.test(value)) fail('bad-request')
  const amount = BigInt(value)
  if (positive && amount === 0n) fail('bad-request')
  if (maximum !== null && amount > BigInt(maximum)) fail('bad-request')
  return amount
}

function decryptSeed (encryptedSeedInput, encryptionKeyInput) {
  let encryptedSeed
  let encryptionKey

  try {
    if (!isBytes(encryptedSeedInput) || encryptedSeedInput.byteLength !== secretEnvelope.ENVELOPE_BYTES.seed) fail('bad-request')
    if (!isBytes(encryptionKeyInput) || encryptionKeyInput.byteLength !== 32) fail('bad-request')
    encryptedSeed = copyBytes(encryptedSeedInput)
    encryptionKey = copyBytes(encryptionKeyInput)
    const seed = secretEnvelope.openSecret('seed', encryptedSeed, encryptionKey)
    if (seed.byteLength !== 64) {
      zero(seed)
      fail('bad-request')
    }
    return seed
  } catch (error) {
    if (error?.code === 'bad-request') throw error
    fail('bad-request')
  } finally {
    zero(encryptedSeed)
    zero(encryptionKey)
    zero(encryptedSeedInput)
    zero(encryptionKeyInput)
  }
}

function createWorkerOps ({ WDK, WalletManagerEvm }) {
  let wdk = null
  let account = null
  let rootSeed = null

  function requireAccount () {
    if (!wdk || !account) fail('not-initialized')
    return account
  }

  function provider () {
    const provider = requireAccount()._provider
    if (!provider) fail('operation-failed')
    return provider
  }

  async function rpc (invoke) {
    try {
      return await invoke(provider())
    } catch (error) {
      if (error?.code === 'INSUFFICIENT_FUNDS') fail('insufficient-funds')
      fail('rpc-unavailable')
    }
  }

  async function initialize ({ encryptedSeed, encryptionKey, networkId } = {}) {
    try {
      if (wdk || rootSeed) fail('already-initialized')
      if (networkId !== STABLE_TESTNET.networkId) fail('bad-request')

      const seed = decryptSeed(encryptedSeed, encryptionKey)
      try {
        const instance = new WDK(seed)
        instance.registerWallet(STABLE_TESTNET.networkId, WalletManagerEvm, {
          provider: STABLE_TESTNET.providers.map(entry => entry.url),
          chainId: STABLE_TESTNET.chain.idDecimal
        })
        const evmAccount = await instance.getAccount(
          STABLE_TESTNET.networkId,
          STABLE_TESTNET.transferPolicy.accountIndex
        )
        wdk = instance
        account = evmAccount
        rootSeed = seed
        return { initialized: true }
      } catch (error) {
        zero(seed)
        wdk = null
        account = null
        rootSeed = null
        throw error
      }
    } finally {
      zero(encryptedSeed)
      zero(encryptionKey)
    }
  }

  async function dispose () {
    if (!wdk || !rootSeed) return { disposed: true, seedZeroed: true }

    const seed = rootSeed
    try {
      // Shut the provider down before disposal so no ethers polling or
      // network state outlives the account. The failover proxy forwards
      // destroy() to the active underlying provider.
      try {
        const activeProvider = account && account._provider
        if (activeProvider && typeof activeProvider.destroy === 'function') activeProvider.destroy()
      } catch {}
      wdk.dispose()
    } finally {
      zero(seed)
      wdk = null
      account = null
      rootSeed = null
    }

    return { disposed: true, seedZeroed: seed.every(byte => byte === 0) }
  }

  async function getAddress ({ accountIndex } = {}) {
    const current = requireAccount()
    if (accountIndex !== 0) fail('bad-request')
    return { address: current.address }
  }

  async function getBalances () {
    const current = requireAccount()
    const payment = await rpc(() => current.getTokenBalance(STABLE_TESTNET.paymentAsset.proxyAddress))
    const nativeFee = await rpc(() => current.getBalance())
    return {
      paymentAmountAtomic: payment.toString(),
      nativeFeeAmountAtomic: nativeFee.toString()
    }
  }

  async function prepareTransfer ({ recipient, amountAtomic } = {}) {
    const current = requireAccount()
    if (typeof recipient !== 'string' || !ADDRESS_PATTERN.test(recipient)) fail('bad-request')
    const amount = requireAtomic(amountAtomic, 'amountAtomic', {
      positive: true,
      maximum: STABLE_TESTNET.paymentAsset.maxPaymentAtomic
    })

    const policy = STABLE_TESTNET.transferPolicy
    const from = current.address
    const calldata = expectedTransferCalldata(recipient, amountAtomic)
    const nonce = await rpc(rpcProvider => rpcProvider.getTransactionCount(from, 'pending'))
    if (!Number.isSafeInteger(nonce) || nonce < 0) fail('rpc-unavailable')
    const gasLimit = await rpc(rpcProvider => rpcProvider.estimateGas({
      from,
      to: policy.transactionTarget,
      value: 0n,
      data: calldata
    }))
    const feeData = await rpc(rpcProvider => rpcProvider.getFeeData())
    const maxFeePerGas = feeData?.maxFeePerGas ?? feeData?.gasPrice ?? null
    if (typeof gasLimit !== 'bigint' || gasLimit <= 0n || typeof maxFeePerGas !== 'bigint' || maxFeePerGas <= 0n) {
      fail('rpc-unavailable')
    }

    const maxFee = gasLimit * maxFeePerGas
    if (maxFee > BigInt(STABLE_TESTNET.nativeFeeAsset.maxFeeAtomic)) fail('fee-too-high')

    const intent = {
      preparedIntentId: 'wpi_' + b4a.toString(randomBytes(16), 'hex'),
      from,
      recipient,
      amountAtomic: amount.toString(),
      assetId: STABLE_TESTNET.paymentAsset.id,
      feeAssetId: STABLE_TESTNET.nativeFeeAsset.id,
      transactionType: policy.transactionType,
      chainId: STABLE_TESTNET.chain.idDecimal,
      transactionTarget: policy.transactionTarget,
      transactionValueAtomic: policy.transactionValueAtomic,
      calldata,
      calldataHash: hashBytes(b4a.from(calldata.slice(2), 'hex')),
      nonce: String(nonce),
      gasLimit: gasLimit.toString(),
      maxFeePerGasAtomic: maxFeePerGas.toString(),
      maxPriorityFeePerGasAtomic: policy.maxPriorityFeePerGasAtomic,
      accessList: [],
      estimatedFeeAtomic: maxFee.toString(),
      maxFeeAtomic: maxFee.toString(),
      unsignedTransactionHash: null,
      expiresAt: Date.now() + PREPARED_INTENT_TTL_MS
    }
    intent.unsignedTransactionHash = unsignedTransactionHash(intent)
    return intent
  }

  function parseIntent (preparedIntent) {
    if (!preparedIntent || typeof preparedIntent !== 'object' || Array.isArray(preparedIntent)) fail('bad-request')
    const policy = STABLE_TESTNET.transferPolicy
    const intent = preparedIntent
    if (intent.transactionType !== policy.transactionType) fail('bad-request')
    if (intent.chainId !== STABLE_TESTNET.chain.idDecimal) fail('bad-request')
    if (intent.transactionTarget !== policy.transactionTarget) fail('bad-request')
    if (intent.transactionValueAtomic !== policy.transactionValueAtomic) fail('bad-request')
    if (intent.maxPriorityFeePerGasAtomic !== policy.maxPriorityFeePerGasAtomic) fail('bad-request')
    if (intent.assetId !== STABLE_TESTNET.paymentAsset.id) fail('bad-request')
    if (intent.feeAssetId !== STABLE_TESTNET.nativeFeeAsset.id) fail('bad-request')
    if (typeof intent.from !== 'string' || !ADDRESS_PATTERN.test(intent.from)) fail('bad-request')
    if (intent.from.toLowerCase() !== requireAccount().address.toLowerCase()) fail('bad-request')
    if (typeof intent.recipient !== 'string' || !ADDRESS_PATTERN.test(intent.recipient)) fail('bad-request')
    const amount = requireAtomic(intent.amountAtomic, 'amountAtomic', {
      positive: true,
      maximum: STABLE_TESTNET.paymentAsset.maxPaymentAtomic
    })
    if (intent.calldata !== expectedTransferCalldata(intent.recipient, amount.toString())) fail('bad-request')
    if (intent.calldataHash !== hashBytes(b4a.from(intent.calldata.slice(2), 'hex'))) fail('bad-request')
    requireAtomic(intent.nonce, 'nonce')
    const gasLimit = requireAtomic(intent.gasLimit, 'gasLimit', { positive: true })
    const maxFeePerGas = requireAtomic(intent.maxFeePerGasAtomic, 'maxFeePerGasAtomic', { positive: true })
    const maxFee = requireAtomic(intent.maxFeeAtomic, 'maxFeeAtomic', {
      maximum: STABLE_TESTNET.nativeFeeAsset.maxFeeAtomic
    })
    if (gasLimit * maxFeePerGas !== maxFee) fail('bad-request')
    requireAtomic(intent.estimatedFeeAtomic, 'estimatedFeeAtomic')
    if (BigInt(intent.estimatedFeeAtomic) > maxFee) fail('bad-request')
    if (!Array.isArray(intent.accessList) || intent.accessList.length !== 0) fail('bad-request')
    if (typeof intent.unsignedTransactionHash !== 'string' || !HASH_PATTERN.test(intent.unsignedTransactionHash)) {
      fail('bad-request')
    }
    return intent
  }

  async function signPrepared ({ preparedIntent } = {}) {
    const current = requireAccount()
    const intent = parseIntent(preparedIntent)

    // Sign the exact pre-approved envelope. Every consensus-relevant field is
    // taken from the intent and the recomputed unsigned hash must match the
    // approved one; nothing is re-fetched or substituted here.
    if (unsignedTransactionHash(intent) !== intent.unsignedTransactionHash.toLowerCase()) fail('bad-request')
    const signed = await current.signTransaction({
      type: STABLE_TESTNET.transferPolicy.transactionTypeValue,
      chainId: STABLE_TESTNET.chain.idDecimal,
      nonce: Number(intent.nonce),
      to: intent.transactionTarget,
      value: BigInt(intent.transactionValueAtomic),
      data: intent.calldata,
      gasLimit: BigInt(intent.gasLimit),
      maxFeePerGas: BigInt(intent.maxFeePerGasAtomic),
      maxPriorityFeePerGas: BigInt(intent.maxPriorityFeePerGasAtomic),
      accessList: []
    })
    const signedTransaction = b4a.from(signed.slice(2), 'hex')
    const transactionHash = hashBytes(signedTransaction)
    return { signedTransaction, transactionHash }
  }

  async function broadcastSigned ({ signedTransaction, transactionHash } = {}) {
    requireAccount()
    if (!isBytes(signedTransaction) || signedTransaction.byteLength === 0 || signedTransaction.byteLength > 128 * 1024) {
      fail('bad-request')
    }
    if (typeof transactionHash !== 'string' || !HASH_PATTERN.test(transactionHash)) fail('bad-request')
    if (hashBytes(signedTransaction).toLowerCase() !== transactionHash.toLowerCase()) fail('bad-request')
    const accepted = await rpc(rpcProvider => rpcProvider.send('eth_sendRawTransaction', [
      '0x' + b4a.toString(signedTransaction, 'hex')
    ]))
    if (typeof accepted !== 'string' || accepted.toLowerCase() !== transactionHash.toLowerCase()) {
      fail('operation-failed')
    }
    return { transactionHash }
  }

  async function getTransaction ({ transactionHash } = {}) {
    requireAccount()
    if (typeof transactionHash !== 'string' || !HASH_PATTERN.test(transactionHash)) fail('bad-request')
    const [receipt, transaction, head] = await rpc(async rpcProvider => Promise.all([
      rpcProvider.getTransactionReceipt(transactionHash),
      rpcProvider.getTransaction(transactionHash),
      rpcProvider.getBlockNumber()
    ]))

    const inclusion = receipt || (transaction && transaction.blockNumber ? transaction : null)
    if (!inclusion) {
      return {
        transactionHash,
        state: transaction ? 'submitted' : 'uncertain',
        confirmations: 0,
        blockNumber: null
      }
    }
    const confirmations = Math.max(0, head - inclusion.blockNumber + 1)
    let state = confirmations >= STABLE_TESTNET.finality.minimumConfirmations ? 'final' : 'included'
    if (receipt && receipt.status === 0) state = 'failed'
    return {
      transactionHash,
      state,
      confirmations,
      blockNumber: String(inclusion.blockNumber)
    }
  }

  async function signAppPayload ({ payloadDigest } = {}) {
    const current = requireAccount()
    // Only the fixed 32-byte canonical digest may be signed. Raw payload bytes
    // and transaction-shaped data never reach the signer.
    if (!isBytes(payloadDigest) || payloadDigest.byteLength !== 32) fail('bad-request')
    const digest = copyBytes(payloadDigest)
    const signature = await current.sign(digest)
    const signatureBytes = b4a.from(signature.slice(2), 'hex')
    if (signatureBytes.byteLength !== 65) fail('operation-failed')
    return { signature: signatureBytes, address: current.address, digest }
  }

  function randomBytes (length) {
    const bytes = b4a.alloc(length)
    sodium.randombytes_buf(bytes)
    return bytes
  }

  return {
    initialize,
    dispose,
    getAddress,
    getBalances,
    prepareTransfer,
    signPrepared,
    broadcastSigned,
    getTransaction,
    signAppPayload
  }
}

export { WORKER_ERROR_CODES, createWorkerOps }
