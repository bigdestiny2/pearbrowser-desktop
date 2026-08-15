// Production WDK worker. Runs inside a dedicated Bare worker thread and owns
// the only copy of the wallet seed. Speaks the typed protocol implemented by
// wdk-worker-ops.mjs; generic WDK/account methods are unreachable by design.
//
// The imports attribute remaps ws's optional native peers (bufferutil,
// utf-8-validate) to throwing stubs so the eager worker bundler can link the
// EVM graph. Both are try/catch-guarded in ws, matching Node's behavior when
// the optional peers are absent. Providers are HTTPS-only, so no WebSocket
// code path is reachable at runtime.
//
// ethers' default getUrl uses Node's https module (bare-https under Bare);
// terminating a worker thread after bare-https has seen TLS traffic crashes
// the whole runtime (SIGSEGV, reproduced against bare 1.30.3). bare-fetch
// tears down cleanly, so the worker globally routes ethers' HTTP(S) through
// bare-fetch before any provider is constructed.

import Worker from 'bare-worker'
import fetch from 'bare-fetch'
import WDK from '@tetherto/wdk'
import { FetchRequest } from 'ethers' with { imports: './wdk-bare-imports.json' }
import WalletManagerEvm from '@tetherto/wdk-wallet-evm' with { imports: './wdk-bare-imports.json' }
import { createWorkerOps, WORKER_ERROR_CODES } from './wdk-worker-ops.mjs'

const PROTOCOL = 'pear-browser-wdk-worker-v1'

FetchRequest.registerGetUrl(async (request, cancelSignal) => {
  const controller = new AbortController()
  if (cancelSignal) cancelSignal.addListener(() => controller.abort())
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body || null,
    signal: controller.signal
  })
  const headers = {}
  for (const [name, value] of response.headers) headers[name] = value
  const body = await response.bytes()
  return {
    statusCode: response.status,
    statusMessage: response.statusText || '',
    headers,
    body: body.byteLength > 0 ? body : null
  }
})

const handlers = Object.freeze(Object.assign(Object.create(null), createWorkerOps({
  WDK,
  WalletManagerEvm
})))

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
    const errorCode = WORKER_ERROR_CODES.has(error?.code) ? error.code : 'operation-failed'
    Worker.parentPort.postMessage({ protocol: PROTOCOL, id, ok: false, errorCode })
  }
})

Worker.parentPort.postMessage({ protocol: PROTOCOL, ready: true })
