import WDK from '@tetherto/wdk'
import Worker from 'bare-worker'
import b4a from 'b4a'
import secretEnvelope from '../backend/wallet/wdk-secret-envelope.cjs'

const PROTOCOL = 'pear-browser-wdk-isolate-smoke-v1'
const NETWORK_ID = 'stable-testnet'
const ERROR_CODES = new Set([
  'already-initialized',
  'bad-request',
  'method-not-allowed',
  'not-initialized',
  'operation-not-implemented'
])

let wdk = null
let rootSeed = null

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

async function initialize ({ encryptedSeed, encryptionKey, networkId } = {}) {
  try {
    if (wdk || rootSeed) fail('already-initialized')
    if (networkId !== NETWORK_ID) fail('bad-request')

    const seed = decryptSeed(encryptedSeed, encryptionKey)
    try {
      // EVM derivation is covered by wdk-bare-smoke.mjs. This isolate smoke keeps
      // the worker graph deliberately offline and exercises the WDK root-secret
      // lifecycle without pulling an RPC/WebSocket client into Thread.prepare().
      wdk = new WDK(seed)
      rootSeed = seed
      return { initialized: true }
    } catch (error) {
      zero(seed)
      wdk = null
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
    if (Worker.workerData?.disposeMode === 'hang') await new Promise(() => {})
    wdk.dispose()
  } finally {
    zero(seed)
    wdk = null
    rootSeed = null
  }

  return { disposed: true, seedZeroed: seed.every(byte => byte === 0) }
}

async function notImplemented () {
  if (!wdk) fail('not-initialized')
  fail('operation-not-implemented')
}

const handlers = Object.freeze(Object.assign(Object.create(null), {
  initialize,
  dispose,
  getAddress: notImplemented,
  getBalances: notImplemented,
  prepareTransfer: notImplemented,
  signPrepared: notImplemented,
  broadcastSigned: notImplemented,
  getTransaction: notImplemented
}))

Worker.parentPort.on('message', async message => {
  const id = Number.isSafeInteger(message?.id) ? message.id : null
  if (message?.protocol !== PROTOCOL || id === null || typeof message.operation !== 'string') {
    if (id !== null) Worker.parentPort.postMessage({ protocol: PROTOCOL, id, ok: false, errorCode: 'bad-request' })
    return
  }

  const handler = Object.hasOwn(handlers, message.operation) ? handlers[message.operation] : null
  if (typeof handler !== 'function') {
    Worker.parentPort.postMessage({ protocol: PROTOCOL, id, ok: false, errorCode: 'method-not-allowed' })
    return
  }

  try {
    const result = await handler(message.payload)
    Worker.parentPort.postMessage({ protocol: PROTOCOL, id, ok: true, result })
  } catch (error) {
    const errorCode = ERROR_CODES.has(error?.code) ? error.code : 'operation-failed'
    Worker.parentPort.postMessage({ protocol: PROTOCOL, id, ok: false, errorCode })
  }
})

Worker.parentPort.postMessage({ protocol: PROTOCOL, ready: true })
