'use strict'

const b4a = require('b4a')
const { keccak_256: keccak256 } = require('@noble/hashes/sha3.js')
const { Point, Signature, recoverPublicKey } = require('@noble/secp256k1')
const STABLE_TESTNET = require('./networks/stable-testnet.cjs')
const { ENVELOPE_BYTES } = require('./wdk-secret-envelope.cjs')
const { appPayloadDigest } = require('./app-payload.cjs')
const {
  expectedTransferCalldata,
  hashBytes,
  unsignedTransactionBytes
} = require('./evm-envelope.cjs')

const REQUIRED_ENDPOINT_METHODS = Object.freeze([
  'initialize',
  'dispose',
  'getAddress',
  'getBalances',
  'prepareTransfer',
  'signPrepared',
  'broadcastSigned',
  'getTransaction',
  'terminate'
])

// Mnemonic handling runs in a dedicated one-shot ceremony worklet
// (wdk-ceremony-worker.mjs), separate from the operational wallet worker. A
// worklet may omit both methods, but may never expose only half of this
// one-shot protocol.
const CEREMONY_ENDPOINT_METHODS = Object.freeze([
  'beginMnemonicCeremony',
  'finishMnemonicCeremony'
])
// Scoped app attestation is the only signing capability beyond prepared
// transfers. A worklet may omit it, but may never expose generic signing.
const APP_PAYLOAD_ENDPOINT_METHODS = Object.freeze([
  'signAppPayload'
])
const ALLOWED_ENDPOINT_METHODS = Object.freeze([
  ...REQUIRED_ENDPOINT_METHODS,
  ...CEREMONY_ENDPOINT_METHODS,
  ...APP_PAYLOAD_ENDPOINT_METHODS
])

// These names indicate that the transport still exposes a generic WDK or raw
// account surface. A release endpoint must implement the purpose-built methods
// above directly inside its worklet dispatcher.
const FORBIDDEN_ENDPOINT_METHODS = Object.freeze([
  'callMethod',
  'callModule',
  'request',
  'invoke',
  'execute',
  'registerWallet',
  'registerProtocol',
  'sign',
  'signMessage',
  'signTransaction',
  'sendTransaction',
  'transfer',
  'approve',
  'exportMnemonic',
  'getMnemonic',
  'exportPrivateKey'
])
const SAFE_OUTCOME_CODES = new Set([
  'fee-too-high',
  'insufficient-funds',
  'operation-cancelled',
  'quote-expired',
  'rpc-unavailable',
  'transaction-uncertain'
])
const UINT64_MAX_ATOMIC = (2n ** 64n - 1n).toString()
const UINT256_MAX_ATOMIC = (2n ** 256n - 1n).toString()

function endpointMethodNames (endpoint) {
  const methods = new Set()
  let current = endpoint
  while (current && current !== Object.prototype) {
    for (const key of Reflect.ownKeys(current)) {
      if (key === 'constructor') continue
      const descriptor = Object.getOwnPropertyDescriptor(current, key)
      if (!descriptor) continue
      if (descriptor.get || descriptor.set) {
        throw new Error(`WDK worklet exposes unsupported accessor: ${String(key)}`)
      }
      if (typeof descriptor.value !== 'function') continue
      if (typeof key !== 'string') throw new Error('WDK worklet exposes an unsupported callable symbol')
      methods.add(key)
    }
    current = Object.getPrototypeOf(current)
  }
  return methods
}

function timeout (promise, ms, code) {
  let timer
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        const err = new Error(code)
        err.code = code
        reject(err)
      }, ms)
    })
  ]).finally(() => clearTimeout(timer))
}

function timeoutOrCancel (promise, ms, timeoutCode, cancellation) {
  let timer
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(operationError(timeoutCode)), ms)
    }),
    cancellation.then(() => { throw operationError('operation-cancelled') })
  ]).finally(() => clearTimeout(timer))
}

function operationError (code) {
  const err = new Error(code)
  err.code = code
  return err
}

// Production default: spawn the hardened Bare worker shipped with the
// backend. Required lazily so the engine stays loadable under Node (tests and
// non-Bare hosts must inject spawnWorklet explicitly).
function defaultSpawnWorklet () {
  let transport
  try {
    transport = require('./wdk-bare-transport.cjs')
  } catch {
    throw new Error('WDK default worklet spawner requires the Bare runtime')
  }
  return transport.spawnWdkWorklet()
}

// Production default: spawn the one-shot Bare ceremony worker shipped with
// the backend. Same lazy-require pattern as defaultSpawnWorklet so the engine
// stays loadable under Node (tests inject spawnCeremonyWorklet explicitly).
function defaultSpawnCeremonyWorklet () {
  let transport
  try {
    transport = require('./wdk-bare-transport.cjs')
  } catch {
    throw new Error('WDK default ceremony worklet spawner requires the Bare runtime')
  }
  return transport.spawnCeremonyWorklet()
}

function safeErrorCode (error) {
  try {
    return typeof error?.code === 'string' ? error.code : null
  } catch {
    return null
  }
}

function safeEndpointMethod (endpoint, name) {
  try {
    const method = endpoint?.[name]
    return typeof method === 'function' ? method.bind(endpoint) : null
  } catch {
    return null
  }
}

function assertEndpoint (endpoint) {
  if (!endpoint || typeof endpoint !== 'object') throw new Error('WDK worklet endpoint is unavailable')
  const methods = endpointMethodNames(endpoint)
  for (const name of FORBIDDEN_ENDPOINT_METHODS) {
    if (methods.has(name)) throw new Error(`WDK worklet exposes forbidden method: ${name}`)
  }
  for (const name of REQUIRED_ENDPOINT_METHODS) {
    if (!methods.has(name)) throw new Error(`WDK worklet is missing typed method: ${name}`)
  }
  const ceremonyMethodCount = CEREMONY_ENDPOINT_METHODS.filter(name => methods.has(name)).length
  if (ceremonyMethodCount !== 0 && ceremonyMethodCount !== CEREMONY_ENDPOINT_METHODS.length) {
    throw new Error('WDK worklet exposes an incomplete mnemonic ceremony interface')
  }
  for (const name of methods) {
    if (!ALLOWED_ENDPOINT_METHODS.includes(name)) {
      throw new Error(`WDK worklet exposes unexpected method: ${name}`)
    }
  }
}

function exactDataRecord (value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a record`)
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) throw new Error(`${label} must be a plain record`)
  const actualKeys = Reflect.ownKeys(value)
  if (actualKeys.some(key => typeof key !== 'string')) throw new Error(`${label} has unsupported keys`)
  if (actualKeys.length !== keys.length || keys.some(key => !actualKeys.includes(key))) {
    throw new Error(`${label} has an invalid schema`)
  }
  const result = Object.create(null)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !('value' in descriptor) || descriptor.get || descriptor.set) {
      throw new Error(`${label} has unsupported accessors`)
    }
    result[key] = descriptor.value
  }
  return result
}

function requireString (value, label, pattern, maximumLength = 256) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength || !pattern.test(value)) {
    throw new Error(`${label} is invalid`)
  }
  return value
}

function requireAtomic (value, label, { positive = false, maximum = UINT256_MAX_ATOMIC } = {}) {
  requireString(value, label, /^(0|[1-9][0-9]*)$/, 80)
  const amount = BigInt(value)
  if (positive && amount === 0n) throw new Error(`${label} must be positive`)
  if (maximum !== undefined && amount > BigInt(maximum)) throw new Error(`${label} exceeds the release limit`)
  return value
}

function requireAddress (value, label = 'address') {
  return requireString(value, label, /^0x[0-9a-fA-F]{40}$/, 42)
}

function requireHash (value, label = 'transactionHash') {
  return requireString(value, label, /^0x[0-9a-fA-F]{64}$/, 66)
}

function requireIdentifier (value, prefix, label) {
  return requireString(value, label, new RegExp(`^${prefix}[a-zA-Z0-9_-]{16,96}$`), 128)
}

function requireHexBytes (value, label, exactBytes, maximumBytes = 128 * 1024) {
  if (typeof value !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    throw new Error(`${label} must be canonical hex bytes`)
  }
  const byteLength = (value.length - 2) / 2
  if ((exactBytes !== undefined && byteLength !== exactBytes) || byteLength > maximumBytes) {
    throw new Error(`${label} has an invalid length`)
  }
  return value
}

function decodeRlpLength (bytes, offset, lengthOfLength) {
  if (lengthOfLength < 1 || lengthOfLength > 6 || offset + lengthOfLength > bytes.length) {
    throw new Error('signed transaction RLP length is invalid')
  }
  if (bytes[offset] === 0) throw new Error('signed transaction RLP length is non-canonical')
  let length = 0
  for (let index = 0; index < lengthOfLength; index++) length = length * 256 + bytes[offset + index]
  if (!Number.isSafeInteger(length)) throw new Error('signed transaction RLP length is too large')
  return length
}

function rlpDecodeAt (bytes, offset) {
  if (offset >= bytes.length) throw new Error('signed transaction RLP is truncated')
  const prefix = bytes[offset]
  if (prefix < 0x80) return { value: bytes.subarray(offset, offset + 1), next: offset + 1 }
  if (prefix <= 0xb7) {
    const length = prefix - 0x80
    const start = offset + 1
    const end = start + length
    if (end > bytes.length || (length === 1 && bytes[start] < 0x80)) {
      throw new Error('signed transaction RLP bytes are invalid')
    }
    return { value: bytes.subarray(start, end), next: end }
  }
  if (prefix <= 0xbf) {
    const lengthOfLength = prefix - 0xb7
    const start = offset + 1 + lengthOfLength
    const length = decodeRlpLength(bytes, offset + 1, lengthOfLength)
    const end = start + length
    if (length <= 55 || end > bytes.length) throw new Error('signed transaction RLP bytes are invalid')
    return { value: bytes.subarray(start, end), next: end }
  }

  let payloadStart
  let payloadLength
  if (prefix <= 0xf7) {
    payloadStart = offset + 1
    payloadLength = prefix - 0xc0
  } else {
    const lengthOfLength = prefix - 0xf7
    payloadStart = offset + 1 + lengthOfLength
    payloadLength = decodeRlpLength(bytes, offset + 1, lengthOfLength)
    if (payloadLength <= 55) throw new Error('signed transaction RLP list is non-canonical')
  }
  const payloadEnd = payloadStart + payloadLength
  if (payloadEnd > bytes.length) throw new Error('signed transaction RLP list is truncated')
  const value = []
  let cursor = payloadStart
  while (cursor < payloadEnd) {
    const decoded = rlpDecodeAt(bytes, cursor)
    if (decoded.next > payloadEnd) throw new Error('signed transaction RLP child exceeds its list')
    value.push(decoded.value)
    cursor = decoded.next
  }
  return { value, next: payloadEnd }
}

function atomicFromRlp (value, label) {
  if (Array.isArray(value) || (value.length > 0 && value[0] === 0)) {
    throw new Error(`${label} is not a canonical RLP integer`)
  }
  return value.length === 0 ? 0n : BigInt('0x' + b4a.toString(value, 'hex'))
}

function validateSignedTransactionFields (signedTransaction, intent) {
  if (signedTransaction[0] !== STABLE_TESTNET.transferPolicy.transactionTypeValue) {
    throw new Error('signed transaction type does not match the approved intent')
  }
  const decoded = rlpDecodeAt(signedTransaction, 1)
  if (decoded.next !== signedTransaction.length || !Array.isArray(decoded.value) || decoded.value.length !== 12) {
    throw new Error('signed transaction has an invalid EIP-1559 envelope')
  }
  const [
    chainId,
    nonce,
    priorityFee,
    maxFee,
    gasLimit,
    target,
    value,
    calldata,
    accessList,
    yParity,
    r,
    s
  ] = decoded.value
  if (
    atomicFromRlp(chainId, 'chainId') !== BigInt(intent.chainId) ||
    atomicFromRlp(nonce, 'nonce') !== BigInt(intent.nonce) ||
    atomicFromRlp(priorityFee, 'maxPriorityFeePerGasAtomic') !== BigInt(intent.maxPriorityFeePerGasAtomic) ||
    atomicFromRlp(maxFee, 'maxFeePerGasAtomic') !== BigInt(intent.maxFeePerGasAtomic) ||
    atomicFromRlp(gasLimit, 'gasLimit') !== BigInt(intent.gasLimit) ||
    atomicFromRlp(value, 'transactionValueAtomic') !== BigInt(intent.transactionValueAtomic) ||
    Array.isArray(target) || b4a.toString(target, 'hex') !== intent.transactionTarget.slice(2).toLowerCase() ||
    Array.isArray(calldata) || b4a.toString(calldata, 'hex') !== intent.calldata.slice(2).toLowerCase() ||
    !Array.isArray(accessList) || accessList.length !== 0
  ) {
    throw new Error('signed transaction fields do not match the approved intent')
  }
  const recovery = atomicFromRlp(yParity, 'yParity')
  atomicFromRlp(r, 'signature r')
  atomicFromRlp(s, 'signature s')
  if (recovery > 1n || r.length === 0 || r.length > 32 || s.length === 0 || s.length > 32) {
    throw new Error('signed transaction signature is invalid')
  }
  const compactSignature = b4a.concat([
    b4a.alloc(32 - r.length),
    r,
    b4a.alloc(32 - s.length),
    s
  ])
  if (Signature.fromBytes(compactSignature).hasHighS()) {
    throw new Error('signed transaction signature is not canonical low-S')
  }
  const recovered = recoverPublicKey(
    b4a.concat([b4a.from([Number(recovery)]), compactSignature]),
    b4a.from(intent.unsignedTransactionHash.slice(2), 'hex'),
    { prehash: false }
  )
  const uncompressed = Point.fromBytes(recovered).toBytes(false)
  const recoveredAddress = '0x' + b4a.toString(keccak256(uncompressed.subarray(1)).subarray(12), 'hex')
  if (recoveredAddress !== intent.from.toLowerCase()) {
    throw new Error('signed transaction sender does not match the approved intent')
  }
}

function requireMnemonicBytes (value, label = 'mnemonic') {
  requireBuffer(value, label)
  if (value.byteLength < 47 || value.byteLength > 256) throw new Error(`${label} has an invalid length`)
  let words = 1
  let previousWasSpace = true
  for (const byte of value) {
    if (byte === 0x20) {
      if (previousWasSpace) throw new Error(`${label} has invalid word boundaries`)
      words++
      previousWasSpace = true
    } else {
      if (byte < 0x61 || byte > 0x7a) throw new Error(`${label} must use lower-case ASCII words`)
      previousWasSpace = false
    }
  }
  if (previousWasSpace || words !== 24) throw new Error(`${label} must contain exactly 24 words`)
  return value
}

function validateInitializeResult (value) {
  const result = exactDataRecord(value, ['initialized'], 'initialize result')
  if (result.initialized !== true) throw new Error('initialize result is invalid')
  return true
}

function validateDisposeResult (value) {
  const result = exactDataRecord(value, ['disposed'], 'dispose result')
  if (result.disposed !== true) throw new Error('dispose result is invalid')
  return true
}

function validateAddressResult (value) {
  const result = exactDataRecord(value, ['address'], 'getAddress result')
  return Object.freeze({ address: requireAddress(result.address) })
}

function validateBalanceResult (value) {
  const result = exactDataRecord(
    value,
    ['paymentAmountAtomic', 'nativeFeeAmountAtomic'],
    'getBalances result'
  )
  return Object.freeze({
    paymentAmountAtomic: requireAtomic(result.paymentAmountAtomic, 'paymentAmountAtomic'),
    nativeFeeAmountAtomic: requireAtomic(result.nativeFeeAmountAtomic, 'nativeFeeAmountAtomic')
  })
}

function validatePreparedIntent (value, label = 'prepared intent') {
  const result = exactDataRecord(value, [
    'preparedIntentId',
    'from',
    'recipient',
    'amountAtomic',
    'assetId',
    'feeAssetId',
    'transactionType',
    'chainId',
    'transactionTarget',
    'transactionValueAtomic',
    'calldata',
    'calldataHash',
    'nonce',
    'gasLimit',
    'maxFeePerGasAtomic',
    'maxPriorityFeePerGasAtomic',
    'accessList',
    'estimatedFeeAtomic',
    'maxFeeAtomic',
    'unsignedTransactionHash',
    'expiresAt'
  ], label)
  requireIdentifier(result.preparedIntentId, 'wpi_', 'preparedIntentId')
  requireAddress(result.from, 'from')
  requireAddress(result.recipient, 'recipient')
  requireAtomic(result.amountAtomic, 'amountAtomic', {
    positive: true,
    maximum: STABLE_TESTNET.paymentAsset.maxPaymentAtomic
  })
  requireAtomic(result.estimatedFeeAtomic, 'estimatedFeeAtomic')
  if (result.assetId !== STABLE_TESTNET.paymentAsset.id) throw new Error('prepared assetId is invalid')
  if (result.feeAssetId !== STABLE_TESTNET.nativeFeeAsset.id) throw new Error('prepared feeAssetId is invalid')
  if (result.transactionType !== STABLE_TESTNET.transferPolicy.transactionType) throw new Error('prepared transaction type is invalid')
  if (result.chainId !== STABLE_TESTNET.chain.idDecimal) throw new Error('prepared chainId is invalid')
  if (result.transactionTarget !== STABLE_TESTNET.transferPolicy.transactionTarget) throw new Error('prepared target is invalid')
  requireAtomic(result.transactionValueAtomic, 'transactionValueAtomic')
  if (result.transactionValueAtomic !== STABLE_TESTNET.transferPolicy.transactionValueAtomic) {
    throw new Error('prepared transaction value is invalid')
  }
  requireHexBytes(result.calldata, 'calldata', 68)
  if (result.calldata.toLowerCase() !== expectedTransferCalldata(result.recipient, result.amountAtomic)) {
    throw new Error('prepared calldata is invalid')
  }
  requireHash(result.calldataHash, 'calldataHash')
  if (result.calldataHash.toLowerCase() !== hashBytes(b4a.from(result.calldata.slice(2), 'hex'))) {
    throw new Error('prepared calldata hash is invalid')
  }
  requireAtomic(result.nonce, 'nonce', { maximum: UINT64_MAX_ATOMIC })
  requireAtomic(result.gasLimit, 'gasLimit', { positive: true })
  requireAtomic(result.maxFeePerGasAtomic, 'maxFeePerGasAtomic', { positive: true })
  requireAtomic(result.maxPriorityFeePerGasAtomic, 'maxPriorityFeePerGasAtomic')
  if (result.maxPriorityFeePerGasAtomic !== STABLE_TESTNET.transferPolicy.maxPriorityFeePerGasAtomic) {
    throw new Error('prepared priority fee is invalid')
  }
  if (!Array.isArray(result.accessList) || result.accessList.length !== 0) {
    throw new Error('prepared access list must be empty')
  }
  requireAtomic(result.maxFeeAtomic, 'maxFeeAtomic', {
    maximum: STABLE_TESTNET.nativeFeeAsset.maxFeeAtomic
  })
  if (BigInt(result.gasLimit) * BigInt(result.maxFeePerGasAtomic) !== BigInt(result.maxFeeAtomic)) {
    throw new Error('prepared maximum fee is inconsistent')
  }
  if (BigInt(result.estimatedFeeAtomic) > BigInt(result.maxFeeAtomic)) {
    throw new Error('estimatedFeeAtomic exceeds maxFeeAtomic')
  }
  requireHash(result.unsignedTransactionHash, 'unsignedTransactionHash')
  if (result.unsignedTransactionHash.toLowerCase() !== hashBytes(unsignedTransactionBytes(result))) {
    throw new Error('prepared unsigned transaction hash is invalid')
  }
  if (!Number.isSafeInteger(result.expiresAt) || result.expiresAt <= 0) throw new Error('expiresAt is invalid')
  return Object.freeze({
    preparedIntentId: result.preparedIntentId,
    from: result.from,
    recipient: result.recipient,
    amountAtomic: result.amountAtomic,
    assetId: result.assetId,
    feeAssetId: result.feeAssetId,
    transactionType: result.transactionType,
    chainId: result.chainId,
    transactionTarget: result.transactionTarget,
    transactionValueAtomic: result.transactionValueAtomic,
    calldata: result.calldata,
    calldataHash: result.calldataHash,
    nonce: result.nonce,
    gasLimit: result.gasLimit,
    maxFeePerGasAtomic: result.maxFeePerGasAtomic,
    maxPriorityFeePerGasAtomic: result.maxPriorityFeePerGasAtomic,
    accessList: Object.freeze([]),
    estimatedFeeAtomic: result.estimatedFeeAtomic,
    maxFeeAtomic: result.maxFeeAtomic,
    unsignedTransactionHash: result.unsignedTransactionHash,
    expiresAt: result.expiresAt
  })
}

function validateSignedResult (value, preparedIntent) {
  const result = exactDataRecord(value, ['signedTransaction', 'transactionHash'], 'signPrepared result')
  requireBuffer(result.signedTransaction, 'signedTransaction')
  if (result.signedTransaction.byteLength > 128 * 1024) throw new Error('signedTransaction has an invalid length')
  const transactionHash = requireHash(result.transactionHash)
  if (hashBytes(result.signedTransaction).toLowerCase() !== transactionHash.toLowerCase()) {
    throw new Error('signed transaction hash is invalid')
  }
  if (preparedIntent) validateSignedTransactionFields(result.signedTransaction, preparedIntent)
  return Object.freeze({
    signedTransaction: result.signedTransaction,
    transactionHash
  })
}

function validateBroadcastResult (value) {
  const result = exactDataRecord(value, ['transactionHash'], 'broadcastSigned result')
  return Object.freeze({ transactionHash: requireHash(result.transactionHash) })
}

function validateTransactionResult (value) {
  const result = exactDataRecord(value, [
    'transactionHash',
    'state',
    'confirmations',
    'blockNumber'
  ], 'getTransaction result')
  requireHash(result.transactionHash)
  const states = new Set(['submitted', 'included', 'final', 'failed', 'replaced', 'reorged', 'uncertain'])
  if (!states.has(result.state)) throw new Error('transaction state is invalid')
  if (!Number.isSafeInteger(result.confirmations) || result.confirmations < 0) {
    throw new Error('transaction confirmations are invalid')
  }
  if (result.blockNumber !== null) requireAtomic(result.blockNumber, 'blockNumber')
  return Object.freeze({
    transactionHash: result.transactionHash,
    state: result.state,
    confirmations: result.confirmations,
    blockNumber: result.blockNumber
  })
}

// EIP-191 over the fixed 32-byte app-payload digest. The digest is computed
// host-side from the canonical app-payload record, so the worklet only ever
// sees exactly 32 bytes that cannot alias transaction calldata or envelopes.
function appPayloadMessageHash (digest) {
  return keccak256(b4a.concat([b4a.from('\x19Ethereum Signed Message:\n32', 'utf8'), digest]))
}

function validateAppPayloadResult (value, payloadDigest, boundAddress) {
  const result = exactDataRecord(value, ['signature', 'address', 'digest'], 'signAppPayload result')
  requireBuffer(result.signature, 'signature', 65)
  requireBuffer(result.digest, 'digest', 32)
  if (!b4a.equals(result.digest, payloadDigest)) {
    throw new Error('signAppPayload digest does not match the approved payload')
  }
  const address = requireAddress(result.address)
  if (address.toLowerCase() !== boundAddress.toLowerCase()) {
    throw new Error('signAppPayload address does not match account 0')
  }
  const compactSignature = result.signature.subarray(0, 64)
  if (Signature.fromBytes(compactSignature).hasHighS()) {
    throw new Error('signAppPayload signature is not canonical low-S')
  }
  const version = result.signature[64]
  const recovery = version >= 27 ? version - 27 : version
  if (recovery !== 0 && recovery !== 1) throw new Error('signAppPayload signature recovery is invalid')
  const recovered = recoverPublicKey(
    b4a.concat([b4a.from([recovery]), compactSignature]),
    appPayloadMessageHash(result.digest),
    { prehash: false }
  )
  const uncompressed = Point.fromBytes(recovered).toBytes(false)
  const recoveredAddress = '0x' + b4a.toString(keccak256(uncompressed.subarray(1)).subarray(12), 'hex')
  if (recoveredAddress !== boundAddress.toLowerCase()) {
    throw new Error('signAppPayload signer does not match account 0')
  }
  return Object.freeze({
    signature: result.signature,
    address,
    digest: result.digest
  })
}

function parseCeremonyInput (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('ceremony input must be a record')
  const typeDescriptor = Object.getOwnPropertyDescriptor(value, 'type')
  if (!typeDescriptor || !('value' in typeDescriptor)) throw new Error('ceremony input has an invalid schema')
  const type = typeDescriptor.value
  if (!['create', 'restore', 'backup'].includes(type)) throw new Error('ceremony type is invalid')
  const keys = type === 'restore'
    ? ['type', 'mnemonic']
    : type === 'backup'
      ? ['type', 'encryptedEntropy', 'encryptionKey']
      : ['type']
  const input = exactDataRecord(value, keys, 'ceremony input')
  if (type === 'restore') requireMnemonicBytes(input.mnemonic)
  if (type === 'backup') {
    requireBuffer(input.encryptedEntropy, 'encryptedEntropy', ENVELOPE_BYTES.entropy)
    requireBuffer(input.encryptionKey, 'encryptionKey', 32)
  }
  return input
}

function validateCeremonyBeginResult (type, value) {
  const keys = type === 'restore' ? ['ceremonyId'] : ['ceremonyId', 'mnemonic']
  const result = exactDataRecord(value, keys, 'beginMnemonicCeremony result')
  requireIdentifier(result.ceremonyId, 'wc_', 'ceremonyId')
  if (type !== 'restore') requireMnemonicBytes(result.mnemonic)
  return result
}

function validateCeremonyFinishResult (type, outcome, value) {
  const releasesVaultMaterial = outcome === 'complete' && ['create', 'restore'].includes(type)
  const keys = releasesVaultMaterial
    ? ['completed', 'encryptedSeed', 'encryptedEntropy', 'encryptionKey']
    : ['completed']
  const result = exactDataRecord(value, keys, 'finishMnemonicCeremony result')
  if (result.completed !== true) throw new Error('finishMnemonicCeremony result is invalid')
  if (!releasesVaultMaterial) return Object.freeze({ completed: true })

  // The pinned upstream convenience helpers expose these values as immutable
  // base64 strings. Production ceremony worklets must instead own mutable
  // binary values so the backend can overwrite the key after vault wrapping.
  requireBuffer(result.encryptedSeed, 'encryptedSeed', ENVELOPE_BYTES.seed)
  requireBuffer(result.encryptedEntropy, 'encryptedEntropy', ENVELOPE_BYTES.entropy)
  requireBuffer(result.encryptionKey, 'encryptionKey', 32)
  return Object.freeze({
    completed: true,
    encryptedSeed: result.encryptedSeed,
    encryptedEntropy: result.encryptedEntropy,
    encryptionKey: result.encryptionKey
  })
}

function zeroRecordBuffer (value, key) {
  try {
    const descriptor = value && Object.getOwnPropertyDescriptor(value, key)
    if (descriptor && 'value' in descriptor) safeZero(descriptor.value)
  } catch {}
}

function zeroCeremonyInput (value) {
  zeroRecordBuffer(value, 'mnemonic')
  zeroRecordBuffer(value, 'encryptedEntropy')
  zeroRecordBuffer(value, 'encryptionKey')
}

function zeroCeremonyResult (value) {
  zeroRecordBuffer(value, 'mnemonic')
  zeroRecordBuffer(value, 'encryptedSeed')
  zeroRecordBuffer(value, 'encryptedEntropy')
  zeroRecordBuffer(value, 'encryptionKey')
}

function zeroAbandonedCeremonyResult (invocation) {
  if (!invocation) return
  Promise.resolve(invocation).then(zeroCeremonyResult).catch(() => {})
}

function requireBuffer (value, label, length) {
  if (!b4a.isBuffer(value) && !(value instanceof Uint8Array)) throw new Error(`${label} must be a mutable byte buffer`)
  if (length !== undefined && value.length !== length) throw new Error(`${label} must be ${length} bytes`)
  if (value.length === 0 || value.length > 64 * 1024) throw new Error(`${label} has an invalid length`)
}

function safeZero (value) {
  try {
    if (!b4a.isBuffer(value) && !(value instanceof Uint8Array)) return false
    // A zero-length view after a structured-clone transfer means ownership was
    // relinquished to the worklet; there are no host bytes left to overwrite.
    if (value.byteLength === 0) return true
    Uint8Array.prototype.fill.call(value, 0)
    return true
  } catch {
    return false
  }
}

class WdkEngineAdapter {
  constructor (opts = {}) {
    if (opts.spawnWorklet !== undefined && typeof opts.spawnWorklet !== 'function') {
      throw new Error('spawnWorklet must be a function')
    }
    this._spawnWorklet = typeof opts.spawnWorklet === 'function' ? opts.spawnWorklet : defaultSpawnWorklet
    this._spawnCeremonyWorklet = typeof opts.spawnCeremonyWorklet === 'function'
      ? opts.spawnCeremonyWorklet
      : defaultSpawnCeremonyWorklet
    this._logger = opts.logger || null
    this._initializeTimeoutMs = opts.initializeTimeoutMs || 5000
    this._disposeTimeoutMs = opts.disposeTimeoutMs || 2000
    this._terminateTimeoutMs = opts.terminateTimeoutMs || 3000
    this._endpoint = null
    this._state = 'locked'
    this._requestCounter = 0
    this._lifecycleCounter = 0
    this._lifecycleEpoch = 0
    this._initializationSettled = null
    this._cancelInitialization = null
    this._initializingSecrets = null
    this._lockPromise = null
    this._recoveryRequired = false
    this._ceremony = null
    this._accountAddress = null
  }

  get state () { return this._state }
  get recoveryRequired () { return this._recoveryRequired }

  _audit (operation, startedAt, outcomeCode) {
    if (!this._logger) return
    try {
      const info = this._logger.info
      if (typeof info !== 'function') return
      this._requestCounter++
      const pending = info.call(this._logger, {
        operation,
        correlationId: `wdk-${this._requestCounter}`,
        durationMs: Math.max(0, Date.now() - startedAt),
        outcomeCode,
        lifecycleState: this._state
      })
      if (pending && typeof pending.catch === 'function') pending.catch(() => {})
    } catch {}
  }

  async _typed (operation, invoke) {
    if (this._state !== 'ready' || !this._endpoint) throw new Error('WDK wallet is locked')
    const startedAt = Date.now()
    const endpoint = this._endpoint
    const lifecycleEpoch = this._lifecycleEpoch
    try {
      const result = await invoke(endpoint)
      if (
        this._state !== 'ready' ||
        this._endpoint !== endpoint ||
        this._lifecycleEpoch !== lifecycleEpoch
      ) {
        throw operationError('operation-cancelled')
      }
      this._audit(operation, startedAt, 'ok')
      return result
    } catch (err) {
      const errorCode = safeErrorCode(err)
      const code = SAFE_OUTCOME_CODES.has(errorCode) ? errorCode : 'operation-failed'
      this._audit(operation, startedAt, code)
      throw operationError(code)
    }
  }

  async _verifiedAccountAddress (endpoint) {
    const result = validateAddressResult(await endpoint.getAddress({ accountIndex: 0 }))
    if (this._state !== 'ready' || this._endpoint !== endpoint) {
      throw operationError('operation-cancelled')
    }
    if (
      this._accountAddress &&
      this._accountAddress.toLowerCase() !== result.address.toLowerCase()
    ) {
      throw new Error('WDK account-0 address changed during the unlock lifecycle')
    }
    this._accountAddress = result.address
    return Object.freeze({ address: this._accountAddress })
  }

  async initialize (input = {}) {
    let encryptedSeed
    let encryptionKey
    let compiledConfig
    let endpoint = null
    let workletSpawned = false
    let startedAt
    let settleInitialization
    let cancelInitialization
    let lifecycleEpoch
    let initializationSettled
    let initializationStarted = false
    let endpointContractError = false
    let spawnOutcomeUnknown = false
    let initializingSecrets
    let terminateEndpoint = null
    try {
      const parsedInput = exactDataRecord(
        input,
        ['encryptedSeed', 'encryptionKey', 'compiledConfig'],
        'initialize input'
      )
      encryptedSeed = parsedInput.encryptedSeed
      encryptionKey = parsedInput.encryptionKey
      compiledConfig = parsedInput.compiledConfig
      requireBuffer(encryptedSeed, 'encryptedSeed', ENVELOPE_BYTES.seed)
      requireBuffer(encryptionKey, 'encryptionKey', 32)
      if (compiledConfig !== STABLE_TESTNET) throw new Error('compiledConfig must be the imported Stable Testnet release manifest')
      if (this._recoveryRequired || this._state === 'faulted') throw new Error('WDK wallet service restart required')
      if (this._state !== 'locked' || this._endpoint || this._ceremony) throw new Error('WDK wallet is already active')

      this._state = 'initializing'
      this._accountAddress = null
      initializationStarted = true
      this._lifecycleCounter++
      lifecycleEpoch = ++this._lifecycleEpoch
      initializingSecrets = { encryptedSeed, encryptionKey }
      this._initializingSecrets = initializingSecrets
      initializationSettled = new Promise(resolve => { settleInitialization = resolve })
      const initializationCancelled = new Promise(resolve => { cancelInitialization = resolve })
      this._initializationSettled = initializationSettled
      this._cancelInitialization = cancelInitialization
      startedAt = Date.now()
      const spawnPromise = Promise.resolve().then(() => this._spawnWorklet({ lifecycleNonce: this._lifecycleCounter }))
      try {
        endpoint = await timeout(spawnPromise, this._initializeTimeoutMs, 'worklet-spawn-timeout')
      } catch (err) {
        if (safeErrorCode(err) === 'worklet-spawn-timeout') {
          spawnOutcomeUnknown = true
          this._state = 'faulted'
          this._recoveryRequired = true
          spawnPromise.then(async lateEndpoint => {
            const terminate = safeEndpointMethod(lateEndpoint, 'terminate')
            if (!terminate) return
            try {
              await timeout(terminate(), this._terminateTimeoutMs, 'worklet-terminate-timeout')
            } catch {}
          }).catch(() => {})
        }
        throw err
      }
      workletSpawned = true
      if (this._lifecycleEpoch !== lifecycleEpoch || this._state !== 'initializing') {
        throw operationError('operation-cancelled')
      }
      try {
        assertEndpoint(endpoint)
      } catch (err) {
        endpointContractError = true
        throw err
      }
      terminateEndpoint = safeEndpointMethod(endpoint, 'terminate')
      if (!terminateEndpoint) {
        endpointContractError = true
        throw new Error('WDK worklet termination method is unavailable')
      }
      this._endpoint = endpoint
      const initializeResult = await timeoutOrCancel(
        endpoint.initialize({ encryptedSeed, encryptionKey, compiledConfig }),
        this._initializeTimeoutMs,
        'worklet-initialize-timeout',
        initializationCancelled
      )
      validateInitializeResult(initializeResult)
      if (this._lifecycleEpoch !== lifecycleEpoch || this._state !== 'initializing') {
        throw operationError('operation-cancelled')
      }
      const encryptedSeedCleared = safeZero(encryptedSeed)
      const encryptionKeyCleared = safeZero(encryptionKey)
      if (!encryptedSeedCleared || !encryptionKeyCleared) {
        throw operationError('secret-cleanup-failed')
      }
      this._state = 'ready'
      this._audit('initialize', startedAt, 'ok')
      return true
    } catch (err) {
      if (!initializationStarted) throw err
      this._endpoint = null
      this._accountAddress = null
      if (workletSpawned) {
        const terminate = terminateEndpoint || safeEndpointMethod(endpoint, 'terminate')
        try {
          if (!terminate) throw new Error('worklet-terminate-unavailable')
          await timeout(terminate(), this._terminateTimeoutMs, 'worklet-terminate-timeout')
          if (!this._recoveryRequired) this._state = 'locked'
        } catch {
          this._state = 'faulted'
          this._recoveryRequired = true
        }
      } else if (!this._recoveryRequired) {
        this._state = 'locked'
      }
      if (startedAt !== undefined) this._audit('initialize', startedAt, 'initialization-failed')
      if (
        (!workletSpawned && !spawnOutcomeUnknown) ||
        endpointContractError ||
        safeErrorCode(err) === 'operation-cancelled'
      ) throw err
      throw operationError('initialization-failed')
    } finally {
      if (settleInitialization) settleInitialization()
      if (this._initializationSettled === initializationSettled) this._initializationSettled = null
      if (this._cancelInitialization === cancelInitialization) this._cancelInitialization = null
      if (this._initializingSecrets === initializingSecrets) this._initializingSecrets = null
      safeZero(encryptedSeed)
      safeZero(encryptionKey)
    }
  }

  getAddress (accountIndex = 0) {
    if (accountIndex !== 0) return Promise.reject(operationError('operation-failed'))
    return this._typed('get-address', endpoint => this._verifiedAccountAddress(endpoint))
  }

  getBalances () {
    if (arguments.length !== 0) return Promise.reject(operationError('operation-failed'))
    return this._typed('get-balances', async endpoint => validateBalanceResult(
      await endpoint.getBalances()
    ))
  }

  prepareTransfer (recipient, amountAtomic) {
    try {
      requireAddress(recipient, 'recipient')
      requireAtomic(amountAtomic, 'amountAtomic', {
        positive: true,
        maximum: STABLE_TESTNET.paymentAsset.maxPaymentAtomic
      })
    } catch {
      return Promise.reject(operationError('operation-failed'))
    }
    return this._typed('prepare-transfer', async endpoint => {
      const account = await this._verifiedAccountAddress(endpoint)
      const prepared = validatePreparedIntent(await endpoint.prepareTransfer({
        recipient,
        amountAtomic
      }),
      'prepareTransfer result')
      if (
        prepared.from.toLowerCase() !== account.address.toLowerCase() ||
        prepared.recipient.toLowerCase() !== recipient.toLowerCase() ||
        prepared.amountAtomic !== amountAtomic
      ) {
        throw new Error('prepared transfer does not match the requested payment')
      }
      return prepared
    })
  }

  signPrepared (preparedIntent) {
    let validatedIntent
    try {
      validatedIntent = validatePreparedIntent(preparedIntent)
    } catch {
      return Promise.reject(operationError('operation-failed'))
    }
    return this._typed('sign-prepared', async endpoint => {
      const account = await this._verifiedAccountAddress(endpoint)
      if (validatedIntent.from.toLowerCase() !== account.address.toLowerCase()) {
        throw new Error('prepared transfer is not owned by account 0')
      }
      return validateSignedResult(
        await endpoint.signPrepared({ preparedIntent: validatedIntent }),
        validatedIntent
      )
    })
  }

  broadcastSigned (signedTransaction) {
    let validatedSigned
    try {
      validatedSigned = validateSignedResult(signedTransaction)
    } catch {
      return Promise.reject(operationError('operation-failed'))
    }
    return this._typed('broadcast-signed', async endpoint => {
      const result = validateBroadcastResult(await endpoint.broadcastSigned({
        signedTransaction: validatedSigned.signedTransaction,
        transactionHash: validatedSigned.transactionHash
      }))
      if (result.transactionHash.toLowerCase() !== validatedSigned.transactionHash.toLowerCase()) {
        throw new Error('broadcast transaction hash mismatch')
      }
      return result
    })
  }

  getTransaction (transactionHash) {
    try {
      requireHash(transactionHash)
    } catch {
      return Promise.reject(operationError('operation-failed'))
    }
    return this._typed('get-transaction', async endpoint => {
      const result = validateTransactionResult(await endpoint.getTransaction({ transactionHash }))
      if (result.transactionHash.toLowerCase() !== transactionHash.toLowerCase()) {
        throw new Error('transaction hash mismatch')
      }
      return result
    })
  }

  signAppPayload (input = {}) {
    let payloadDigest
    try {
      payloadDigest = appPayloadDigest(input)
    } catch {
      return Promise.reject(operationError('operation-failed'))
    }
    return this._typed('sign-app-payload', async endpoint => {
      const account = await this._verifiedAccountAddress(endpoint)
      const sign = safeEndpointMethod(endpoint, 'signAppPayload')
      if (!sign) throw new Error('WDK worklet does not implement signAppPayload')
      return validateAppPayloadResult(
        await sign({ payloadDigest }),
        payloadDigest,
        account.address
      )
    })
  }

  async beginMnemonicCeremony (input = {}) {
    let parsedInput
    try {
      parsedInput = parseCeremonyInput(input)
    } catch (error) {
      zeroCeremonyInput(input)
      throw error
    }

    const type = parsedInput.type
    if (this._recoveryRequired || this._state === 'faulted') {
      zeroCeremonyInput(parsedInput)
      throw new Error('WDK wallet service restart required')
    }
    if (this._ceremony) {
      zeroCeremonyInput(parsedInput)
      throw operationError('ceremony-active')
    }
    if (this._state !== 'locked' || this._endpoint || !this._spawnCeremonyWorklet) {
      zeroCeremonyInput(parsedInput)
      throw operationError('ceremony-not-available')
    }

    let settle
    let cancel
    let settleFinish
    const settled = new Promise(resolve => { settle = resolve })
    const cancelled = new Promise(resolve => { cancel = resolve })
    const finishSettled = new Promise(resolve => { settleFinish = resolve })
    const ceremony = {
      type,
      phase: 'starting',
      endpoint: null,
      ownedEndpoint: true,
      terminate: null,
      finish: null,
      mnemonic: parsedInput.mnemonic || null,
      cancel,
      settled,
      settleFinish,
      finishSettled
    }
    this._ceremony = ceremony
    let beginResult
    let beginInvocation
    let spawnPromise
    try {
      if (ceremony.ownedEndpoint) {
        const lifecycleNonce = ++this._lifecycleCounter
        spawnPromise = Promise.resolve().then(() => this._spawnCeremonyWorklet({
          lifecycleNonce,
          purpose: 'mnemonic-ceremony'
        }))
        try {
          ceremony.endpoint = await timeoutOrCancel(
            spawnPromise,
            this._initializeTimeoutMs,
            'ceremony-spawn-timeout',
            cancelled
          )
        } catch (error) {
          spawnPromise.then(async lateEndpoint => {
            const terminate = safeEndpointMethod(lateEndpoint, 'terminate')
            if (!terminate) return
            try {
              await timeout(terminate(), this._terminateTimeoutMs, 'worklet-terminate-timeout')
            } catch {}
          }).catch(() => {})
          throw error
        }
      }
      assertEndpoint(ceremony.endpoint)
      const begin = safeEndpointMethod(ceremony.endpoint, 'beginMnemonicCeremony')
      ceremony.finish = safeEndpointMethod(ceremony.endpoint, 'finishMnemonicCeremony')
      ceremony.terminate = safeEndpointMethod(ceremony.endpoint, 'terminate')
      if (!begin || !ceremony.finish || (ceremony.ownedEndpoint && !ceremony.terminate)) {
        throw new Error('WDK mnemonic ceremony capability is unavailable')
      }
      beginInvocation = Promise.resolve().then(() => begin(type === 'restore'
        ? { type, mnemonic: parsedInput.mnemonic }
        : type === 'backup'
          ? {
              type,
              encryptedEntropy: parsedInput.encryptedEntropy,
              encryptionKey: parsedInput.encryptionKey
            }
          : { type }))
      beginResult = await timeoutOrCancel(
        beginInvocation,
        this._initializeTimeoutMs,
        'ceremony-begin-timeout',
        cancelled
      )
      if (this._ceremony !== ceremony || ceremony.phase !== 'starting') {
        throw operationError('operation-cancelled')
      }
      const result = validateCeremonyBeginResult(type, beginResult)
      ceremony.phase = 'active'
      ceremony.ceremonyId = result.ceremonyId
      ceremony.mnemonic = result.mnemonic || null
      if (type === 'restore') return Object.freeze({ ceremonyId: result.ceremonyId })
      return Object.freeze({ ceremonyId: result.ceremonyId, mnemonic: result.mnemonic })
    } catch (error) {
      zeroCeremonyResult(beginResult)
      zeroAbandonedCeremonyResult(beginInvocation)
      if (this._ceremony === ceremony) this._ceremony = null
      ceremony.phase = 'done'
      ceremony.settleFinish()
      if (ceremony.ownedEndpoint) {
        const terminate = ceremony.terminate || safeEndpointMethod(ceremony.endpoint, 'terminate')
        try {
          if (!terminate) throw new Error('worklet-terminate-unavailable')
          await timeout(terminate(), this._terminateTimeoutMs, 'worklet-terminate-timeout')
        } catch {
          this._state = 'faulted'
          this._recoveryRequired = true
        }
      }
      const code = safeErrorCode(error)
      if (code === 'operation-cancelled') throw error
      throw operationError('ceremony-failed')
    } finally {
      zeroCeremonyInput(parsedInput)
      settle()
    }
  }

  async finishMnemonicCeremony (input = {}) {
    let parsedInput
    try {
      parsedInput = exactDataRecord(input, ['ceremonyId', 'outcome'], 'finish ceremony input')
      requireIdentifier(parsedInput.ceremonyId, 'wc_', 'ceremonyId')
      if (!['complete', 'cancel'].includes(parsedInput.outcome)) throw new Error('ceremony outcome is invalid')
    } catch {
      throw operationError('ceremony-failed')
    }
    const ceremony = this._ceremony
    if (!ceremony || ceremony.phase !== 'active') throw operationError('ceremony-not-active')
    if (parsedInput.ceremonyId !== ceremony.ceremonyId) throw operationError('ceremony-mismatch')

    // Consume before crossing the endpoint boundary so retries and concurrent
    // completions can never reuse the ceremony.
    ceremony.phase = 'finishing'
    safeZero(ceremony.mnemonic)
    let completionFailed = false
    let completionResult = null
    let rawCompletionResult
    let finishInvocation
    try {
      finishInvocation = Promise.resolve().then(() => ceremony.finish({
        ceremonyId: parsedInput.ceremonyId,
        outcome: parsedInput.outcome
      }))
      rawCompletionResult = await timeout(
        finishInvocation,
        this._disposeTimeoutMs,
        'ceremony-finish-timeout'
      )
      completionResult = validateCeremonyFinishResult(
        ceremony.type,
        parsedInput.outcome,
        rawCompletionResult
      )
    } catch {
      completionFailed = true
      zeroCeremonyResult(rawCompletionResult)
      zeroAbandonedCeremonyResult(finishInvocation)
    }
    safeZero(ceremony.mnemonic)
    if (ceremony.ownedEndpoint) {
      if (!ceremony.terminate) {
        this._state = 'faulted'
        this._recoveryRequired = true
      } else {
        try {
          await timeout(ceremony.terminate(), this._terminateTimeoutMs, 'worklet-terminate-timeout')
        } catch {
          this._state = 'faulted'
          this._recoveryRequired = true
        }
      }
    }
    if (this._recoveryRequired || completionFailed) {
      zeroRecordBuffer(completionResult, 'encryptedSeed')
      zeroRecordBuffer(completionResult, 'encryptedEntropy')
      zeroRecordBuffer(completionResult, 'encryptionKey')
      if (this._ceremony === ceremony) this._ceremony = null
      ceremony.phase = 'done'
      ceremony.settleFinish()
      if (this._recoveryRequired) throw new Error('WDK wallet service restart required')
      throw operationError('ceremony-failed')
    }
    if (this._ceremony === ceremony) this._ceremony = null
    ceremony.phase = 'done'
    ceremony.settleFinish()
    return completionResult
  }

  async _abortMnemonicCeremony () {
    const ceremony = this._ceremony
    if (!ceremony) return
    if (ceremony.phase === 'starting') {
      ceremony.cancel()
      safeZero(ceremony.mnemonic)
      await timeout(
        ceremony.settled,
        this._initializeTimeoutMs + this._terminateTimeoutMs,
        'ceremony-cancel-timeout'
      )
      return
    }
    if (ceremony.phase === 'active') {
      await this.finishMnemonicCeremony({ ceremonyId: ceremony.ceremonyId, outcome: 'cancel' })
      return
    }
    if (ceremony.phase === 'finishing') {
      await timeout(
        ceremony.finishSettled,
        this._disposeTimeoutMs + this._terminateTimeoutMs,
        'ceremony-finish-cancel-timeout'
      )
    }
  }

  lock () {
    if (this._lockPromise) return this._lockPromise
    const lockPromise = this._lock()
    const wrappedPromise = lockPromise.finally(() => {
      if (this._lockPromise === wrappedPromise) this._lockPromise = null
    })
    this._lockPromise = wrappedPromise
    return wrappedPromise
  }

  async _lock () {
    if (this._ceremony) await this._abortMnemonicCeremony()
    if (this._state === 'locked' && !this._endpoint) {
      this._accountAddress = null
      return { locked: true, disposeOutcome: 'not-active' }
    }
    if (this._state === 'faulted' || this._recoveryRequired) throw new Error('WDK wallet service restart required')

    if (this._state === 'initializing') {
      const initializationSettled = this._initializationSettled
      ++this._lifecycleEpoch
      this._state = 'locking'
      if (this._initializingSecrets) {
        safeZero(this._initializingSecrets.encryptedSeed)
        safeZero(this._initializingSecrets.encryptionKey)
      }
      if (this._cancelInitialization) this._cancelInitialization()
      try {
        await timeout(
          initializationSettled,
          this._disposeTimeoutMs + this._terminateTimeoutMs,
          'worklet-initialize-cancel-timeout'
        )
      } catch {
        this._state = 'faulted'
        this._recoveryRequired = true
        throw new Error('WDK worklet initialization cancellation failed; service restart required')
      }
      if (this._state === 'faulted' || this._recoveryRequired) {
        throw new Error('WDK wallet service restart required')
      }
      this._state = 'locked'
      return { locked: true, disposeOutcome: 'initialization-cancelled' }
    }

    ++this._lifecycleEpoch
    const endpoint = this._endpoint
    const dispose = safeEndpointMethod(endpoint, 'dispose')
    const terminate = safeEndpointMethod(endpoint, 'terminate')
    this._endpoint = null
    this._accountAddress = null
    this._state = 'locking'
    let disposeOutcome = 'ok'
    const disposeStartedAt = Date.now()
    try {
      if (!dispose) throw new Error('worklet-dispose-unavailable')
      const disposeResult = await timeout(dispose(), this._disposeTimeoutMs, 'worklet-dispose-timeout')
      validateDisposeResult(disposeResult)
    } catch (err) {
      disposeOutcome = safeErrorCode(err) === 'worklet-dispose-timeout' ? 'worklet-dispose-timeout' : 'dispose-failed'
    }
    this._audit('dispose', disposeStartedAt, disposeOutcome)

    const terminateStartedAt = Date.now()
    try {
      if (!terminate) throw new Error('worklet-terminate-unavailable')
      await timeout(terminate(), this._terminateTimeoutMs, 'worklet-terminate-timeout')
      this._state = 'locked'
      this._audit('terminate', terminateStartedAt, 'ok')
      return { locked: true, disposeOutcome }
    } catch (err) {
      this._state = 'faulted'
      this._recoveryRequired = true
      const outcome = safeErrorCode(err) === 'worklet-terminate-timeout'
        ? 'worklet-terminate-timeout'
        : 'terminate-failed'
      this._audit('terminate', terminateStartedAt, outcome)
      throw new Error('WDK worklet termination failed; service restart required')
    }
  }
}

module.exports = {
  ALLOWED_ENDPOINT_METHODS,
  APP_PAYLOAD_ENDPOINT_METHODS,
  CEREMONY_ENDPOINT_METHODS,
  FORBIDDEN_ENDPOINT_METHODS,
  REQUIRED_ENDPOINT_METHODS,
  WdkEngineAdapter,
  assertEndpoint
}
