import crypto from 'bare-crypto'
import Worker from 'bare-worker'
import b4a from 'b4a'
import { fileURLToPath } from 'node:url'
import engine from '../backend/wallet/wdk-engine.cjs'
import STABLE_TESTNET from '../backend/wallet/networks/stable-testnet.cjs'
import secretEnvelope from '../backend/wallet/wdk-secret-envelope.cjs'

const { FORBIDDEN_ENDPOINT_METHODS, WdkEngineAdapter, assertEndpoint } = engine
const PROTOCOL = 'pear-browser-wdk-isolate-smoke-v1'
const WORKER_ENTRY = fileURLToPath(new URL('./wdk-isolate-worker.mjs', import.meta.url))

function invariant (condition, message) {
  if (!condition) throw new Error(message)
}

function timeout (promise, ms, label) {
  let timer
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    })
  ]).finally(() => clearTimeout(timer))
}

function makeSecrets () {
  // BIP-39 mnemonicToSeedSync produces the 64-byte seed used by the selected
  // create/restore path. The smoke intentionally exercises that exact length.
  const seed = b4a.alloc(64, 0xa5)
  const encryptionKey = crypto.randomBytes(32)
  const encryptedSeed = secretEnvelope.sealSecret('seed', seed, encryptionKey)
  seed.fill(0)
  return { encryptedSeed, encryptionKey, compiledConfig: STABLE_TESTNET }
}

function createTransport ({ disposeMode = 'normal' } = {}) {
  const worker = new Worker(WORKER_ENTRY, { workerData: { disposeMode } })
  const pending = new Map()
  let nextId = 0
  let exitEvents = 0
  let exitCode = null
  let terminationPromise = null
  let disposeResult = null
  let readyResolve
  let readyReject
  let exitResolve

  const ready = new Promise((resolve, reject) => {
    readyResolve = resolve
    readyReject = reject
  })
  const exited = new Promise(resolve => { exitResolve = resolve })

  worker.on('message', message => {
    if (message?.protocol !== PROTOCOL) return
    if (message.ready === true) {
      readyResolve()
      return
    }

    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.ok === true) {
      request.resolve(message.result)
      return
    }

    const error = new Error(`WDK isolate rejected operation: ${message.errorCode}`)
    error.code = message.errorCode
    request.reject(error)
  })
  worker.on('error', error => {
    readyReject(error)
    for (const request of pending.values()) request.reject(error)
    pending.clear()
  })
  worker.on('exit', code => {
    exitEvents++
    exitCode = code
    const error = new Error('WDK isolate terminated')
    error.code = 'isolate-terminated'
    readyReject(error)
    for (const request of pending.values()) request.reject(error)
    pending.clear()
    exitResolve(code)
  })

  async function request (operation, payload = {}) {
    // Load-tolerant: when the full test suite runs in parallel the worker
    // thread can take far longer than the interactive case to become ready.
    await timeout(ready, 30000, 'WDK isolate readiness')
    const id = ++nextId
    const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
    worker.postMessage({ protocol: PROTOCOL, id, operation, payload })
    return await response
  }

  const endpoint = Object.freeze(Object.assign(Object.create(null), {
    initialize: ({ encryptedSeed, encryptionKey, compiledConfig }) => request('initialize', {
      encryptedSeed,
      encryptionKey,
      networkId: compiledConfig.networkId
    }),
    dispose: async () => {
      const result = await request('dispose')
      disposeResult = result
      return { disposed: result.disposed }
    },
    getAddress: payload => request('getAddress', payload),
    getBalances: payload => request('getBalances', payload),
    prepareTransfer: payload => request('prepareTransfer', payload),
    signPrepared: payload => request('signPrepared', payload),
    broadcastSigned: payload => request('broadcastSigned', payload),
    getTransaction: payload => request('getTransaction', payload),
    terminate: () => {
      if (!terminationPromise) {
        terminationPromise = (async () => {
          const first = worker.terminate()
          const second = worker.terminate()
          const [firstCode, secondCode, eventCode] = await Promise.all([first, second, exited])
          invariant(firstCode === secondCode && firstCode === eventCode, 'Bare worker termination codes disagree')
          invariant(exitEvents === 1, 'Bare worker emitted an unexpected number of exit events')
          return firstCode
        })()
      }
      return terminationPromise
    }
  }))

  return {
    endpoint,
    probeForbidden: operation => request(operation, {}),
    state: () => ({ disposeResult, exitCode, exitEvents })
  }
}

async function runGracefulLifecycle () {
  const transport = createTransport()
  assertEndpoint(transport.endpoint)
  for (const name of FORBIDDEN_ENDPOINT_METHODS) {
    invariant(typeof transport.endpoint[name] !== 'function', `typed endpoint exposes forbidden method: ${name}`)
  }

  const rejectedGenericOperations = []
  for (const operation of ['callMethod', 'constructor', 'toString', '__proto__']) {
    try {
      await transport.probeForbidden(operation)
    } catch (error) {
      if (error.code === 'method-not-allowed') rejectedGenericOperations.push(operation)
    }
  }
  invariant(rejectedGenericOperations.length === 4, 'worker accepted a generic or inherited operation')

  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => transport.endpoint,
    initializeTimeoutMs: 30000,
    terminateTimeoutMs: 15000
  })
  const secrets = makeSecrets()
  await adapter.initialize(secrets)
  invariant(secrets.encryptedSeed.every(byte => byte === 0), 'adapter retained encrypted seed bytes')
  invariant(secrets.encryptionKey.every(byte => byte === 0), 'adapter retained encryption key bytes')

  let unimplementedCode = null
  try {
    await adapter.getAddress(0)
  } catch (error) {
    unimplementedCode = error.code
  }
  invariant(unimplementedCode === 'operation-failed', 'unimplemented typed method did not fail closed')

  const lockResult = await adapter.lock()
  invariant(lockResult.disposeOutcome === 'ok', 'graceful WDK disposal failed')
  const state = transport.state()
  invariant(state.disposeResult?.seedZeroed === true, 'worker root seed was not zeroed')
  invariant(state.exitCode === 0 && state.exitEvents === 1, 'graceful worker termination was not confirmed')

  return {
    rejectedGenericOperations,
    unimplementedCode,
    hostBuffersZeroed: true,
    workerSeedZeroed: true,
    disposeOutcome: lockResult.disposeOutcome,
    exitCode: state.exitCode,
    exitEvents: state.exitEvents
  }
}

async function runForcedLifecycle () {
  const transport = createTransport({ disposeMode: 'hang' })
  const adapter = new WdkEngineAdapter({
    spawnWorklet: async () => transport.endpoint,
    initializeTimeoutMs: 30000,
    disposeTimeoutMs: 50,
    terminateTimeoutMs: 15000
  })
  await adapter.initialize(makeSecrets())

  const lockResult = await adapter.lock()
  invariant(lockResult.disposeOutcome === 'worklet-dispose-timeout', 'hung dispose did not fail closed')
  invariant(adapter.state === 'locked' && adapter.recoveryRequired === false, 'confirmed termination did not relock adapter')
  const state = transport.state()
  invariant(state.exitCode === 0 && state.exitEvents === 1, 'forced worker termination was not confirmed')

  return {
    disposeOutcome: lockResult.disposeOutcome,
    exitCode: state.exitCode,
    exitEvents: state.exitEvents,
    adapterState: adapter.state
  }
}

const graceful = await runGracefulLifecycle()
const forced = await runForcedLifecycle()
console.log(JSON.stringify({ ok: true, runtime: 'Bare', graceful, forced }))
