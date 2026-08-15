// Production one-shot mnemonic ceremony worker. Runs inside a dedicated Bare
// worker thread, separate from the operational wallet worker: it exists for
// exactly one create/restore/backup ceremony and the engine terminates it as
// soon as the ceremony settles. Speaks the same typed request/response
// discipline as wdk-worker.mjs with its own protocol string; there is no
// generic dispatcher and no WDK/EVM import surface at all.

import Worker from 'bare-worker'
import { createCeremonyOps, CEREMONY_WORKER_ERROR_CODES } from './wdk-ceremony-ops.mjs'

const PROTOCOL = 'pear-browser-wdk-ceremony-v1'

const handlers = Object.freeze(Object.assign(Object.create(null), createCeremonyOps()))

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
    const errorCode = CEREMONY_WORKER_ERROR_CODES.has(error?.code) ? error.code : 'operation-failed'
    Worker.parentPort.postMessage({ protocol: PROTOCOL, id, ok: false, errorCode })
  }
})

Worker.parentPort.postMessage({ protocol: PROTOCOL, ready: true })
