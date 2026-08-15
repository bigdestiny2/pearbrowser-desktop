'use strict'

// Bare transport for the production WDK workers. Required lazily by
// wdk-engine.cjs so the engine itself stays runtime-agnostic; Node hosts and
// tests keep injecting their own spawners.

const WORKER_PROTOCOL = 'pear-browser-wdk-worker-v1'
const CEREMONY_PROTOCOL = 'pear-browser-wdk-ceremony-v1'
const WORKER_ENTRY = __dirname + '/wdk-worker.mjs'
const CEREMONY_ENTRY = __dirname + '/wdk-ceremony-worker.mjs'

// Shared spawn machinery: resolves the typed channel once the worker signals
// readiness and rejects every in-flight request on error or exit.
function spawnWorker (entry, protocol, label) {
  const Worker = require('bare-worker')
  const worker = new Worker(entry)
  const pending = new Map()
  let nextId = 0
  let terminationPromise = null
  let readyResolve
  let readyReject
  let exitResolve

  const ready = new Promise((resolve, reject) => {
    readyResolve = resolve
    readyReject = reject
  })
  const exited = new Promise(resolve => { exitResolve = resolve })

  worker.on('message', message => {
    if (message?.protocol !== protocol) return
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

    const error = new Error(`${label} rejected operation: ${message.errorCode}`)
    error.code = message.errorCode
    request.reject(error)
  })
  worker.on('error', error => {
    readyReject(error)
    for (const request of pending.values()) request.reject(error)
    pending.clear()
  })
  worker.on('exit', code => {
    const error = new Error(`${label} terminated`)
    error.code = 'worklet-terminated'
    readyReject(error)
    for (const request of pending.values()) request.reject(error)
    pending.clear()
    exitResolve(code)
  })

  async function request (operation, payload = {}) {
    await ready
    const id = ++nextId
    const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
    worker.postMessage({ protocol, id, operation, payload })
    return await response
  }

  function terminate () {
    if (!terminationPromise) {
      terminationPromise = (async () => {
        const code = await worker.terminate()
        const eventCode = await exited
        if (code !== eventCode) throw new Error(`${label} termination codes disagree`)
        return code
      })()
    }
    return terminationPromise
  }

  return { ready, request, terminate }
}

// Resolves the typed endpoint once the worker signals readiness. The endpoint
// surface intentionally matches the engine's endpoint contract: typed methods
// only, no generic dispatcher.
function spawnWdkWorklet () {
  const worker = spawnWorker(WORKER_ENTRY, WORKER_PROTOCOL, 'WDK worker')

  const endpoint = Object.freeze(Object.assign(Object.create(null), {
    initialize: ({ encryptedSeed, encryptionKey, compiledConfig }) => worker.request('initialize', {
      encryptedSeed,
      encryptionKey,
      networkId: compiledConfig.networkId
    }),
    dispose: async () => {
      const result = await worker.request('dispose')
      return { disposed: result?.disposed === true }
    },
    getAddress: payload => worker.request('getAddress', payload),
    getBalances: payload => worker.request('getBalances', payload),
    prepareTransfer: payload => worker.request('prepareTransfer', payload),
    signPrepared: payload => worker.request('signPrepared', payload),
    broadcastSigned: payload => worker.request('broadcastSigned', payload),
    getTransaction: payload => worker.request('getTransaction', payload),
    signAppPayload: payload => worker.request('signAppPayload', payload),
    terminate: worker.terminate
  }))

  return worker.ready.then(() => endpoint)
}

function unavailable (name) {
  return async () => {
    const error = new Error(`WDK ceremony worklet does not implement ${name}`)
    error.code = 'method-not-allowed'
    throw error
  }
}

// One-shot ceremony endpoint: only the two ceremony methods and terminate are
// real. The remaining contract-required methods exist so the engine's
// endpoint assertion passes, but fail closed — a ceremony worklet never
// touches the operational wallet.
function spawnCeremonyWorklet () {
  const worker = spawnWorker(CEREMONY_ENTRY, CEREMONY_PROTOCOL, 'WDK ceremony worker')

  const endpoint = Object.freeze(Object.assign(Object.create(null), {
    initialize: unavailable('initialize'),
    dispose: unavailable('dispose'),
    getAddress: unavailable('getAddress'),
    getBalances: unavailable('getBalances'),
    prepareTransfer: unavailable('prepareTransfer'),
    signPrepared: unavailable('signPrepared'),
    broadcastSigned: unavailable('broadcastSigned'),
    getTransaction: unavailable('getTransaction'),
    beginMnemonicCeremony: payload => worker.request('beginMnemonicCeremony', payload),
    finishMnemonicCeremony: payload => worker.request('finishMnemonicCeremony', payload),
    terminate: worker.terminate
  }))

  return worker.ready.then(() => endpoint)
}

module.exports = {
  CEREMONY_PROTOCOL,
  WORKER_PROTOCOL,
  spawnCeremonyWorklet,
  spawnWdkWorklet
}
