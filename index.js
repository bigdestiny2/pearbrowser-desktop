import ws from 'bare-ws'
import http from 'bare-http1'
import fs from 'bare-fs'
import path from 'bare-path'
import env from 'bare-env'
// ESM-only modules the backend needs but can't dynamic-import from CJS:
// Bare/Pear's import() resolver has no referrer URL when called from a
// CommonJS file, so all forms of import() from backend/*.js fail with
// "Cannot find referrer". The fix: load them statically here in the
// ESM entry point and hand them to the backend through bootBackend().
import { ServiceRegistry, ServiceProtocol } from 'p2p-hiverelay/core/services/index.js'
import { bootBackend } from './backend/pear-adapter.cjs'
import { createLazyQvacService } from './backend/ai/qvac-host.mjs'
import { QVAC_MODEL_CATALOG } from './backend/ai/qvac-model-catalog.mjs'
import { discoverOllamaQwenModels } from './backend/ai/qvac-ollama-catalog.mjs'
import rpcWebSocketAuth from './backend/rpc-websocket-auth.cjs'

const { authorizeRpcWebSocket, DiagnosticRpcRouter } = rpcWebSocketAuth

// Renderer scans 9876-9880 in order. Backend binds the first one
// that's free. Handles the common case where a zombie pear-runtime
// from a crashed earlier session still holds 9876 — new launch
// grabs the next port instead of failing with EADDRINUSE.
const RPC_PORT_BASE = 9876
const RPC_PORT_COUNT = 5
const RENDERER_RECONNECT_GRACE_MS = 8000
// Pear v3 executes this file as a worker owned by `pear-runtime`. The Electron
// host supplies the two values below before loading us; unlike the retired
// shared-CLI host, no ambient global `Pear` API is involved.
const runtimeContext = globalThis.PearBrowserRuntime || {}
const rpcSessionToken = String(runtimeContext.sessionToken || '')
const diagnosticToken = String(env.PEARBROWSER_RPC_DIAGNOSTIC_TOKEN || '')
if (!rpcSessionToken) throw new Error('PearBrowser v3 host did not provide a per-launch RPC session token')

// --- 1. Boot the backend in this Bare main process. ---
//
// If require('./backend/index.js') throws synchronously — typically
// because a transitive dep is missing from the staged drive, or the
// staged drive itself is incomplete — we DO NOT want to crash the main
// process silently. The renderer would then see "ws error" on every
// port (no listener) and the user has no idea what's wrong.
//
// Instead: catch the boot failure, still bind the WS server, and when
// the renderer connects send it a structured `backend-boot-failed`
// event so the UI can render a clear error. The dev logs also get a
// loud banner that makes the cause obvious in the native host logs.
const storagePath = String(runtimeContext.storagePath || '.') + '/pearbrowser-storage'
const ollamaModels = env.PEARBROWSER_QVAC_OLLAMA === '0'
  ? {}
  : discoverOllamaQwenModels({
      fs,
      path,
      homeDir: env.HOME,
      modelsRoot: env.OLLAMA_MODELS,
      device: env.PEARBROWSER_QVAC_DEVICE
    })
const qvacModels = Object.freeze({ ...QVAC_MODEL_CATALOG, ...ollamaModels })
if (Object.keys(ollamaModels).length) {
  console.log('[qvac] approved local models:', Object.keys(ollamaModels).join(', '))
}
// Release native model RAM after a quiet period; the next request reloads
// through the normal ensureModel path with progress events. 0 disables.
const idleUnloadRaw = Number(env.PEARBROWSER_QVAC_IDLE_UNLOAD_MS)
const qvacIdleUnloadMs = Number.isFinite(idleUnloadRaw) && idleUnloadRaw >= 0
  ? idleUnloadRaw
  : 15 * 60 * 1000
const aiService = createLazyQvacService({
  homeDir: storagePath,
  models: qvacModels,
  idleUnloadMs: qvacIdleUnloadMs
})
let backendPipe = null
let bootError = null
try {
  backendPipe = bootBackend({
    storagePath,
    // Hand statically-imported ESM modules down to the CJS backend so
    // it can build a ServiceProtocol stack for anonGPT's seller dial
    // without paying Bare's CJS-→-ESM dynamic-import penalty.
    esmModules: { ServiceRegistry, ServiceProtocol, aiService }
  })
} catch (err) {
  bootError = err
  console.error('')
  console.error('========================================================')
  console.error('  BACKEND FAILED TO BOOT — main process is in error mode')
  console.error('========================================================')
  console.error('  reason : ' + (err?.message || String(err)))
  if (err?.code) console.error('  code   : ' + err.code)
  console.error('')
  console.error(err?.stack || '(no stack)')
  console.error('')
  console.error('The WS server will still bind so the renderer can')
  console.error('display this error instead of "could not reach backend".')
  console.error('')
  console.error('Common causes:')
  console.error('  • The local PearBrowser installation is incomplete')
  console.error('     Reinstall the verified native package, then relaunch it.')
  console.error('  • The embedded Pear OTA runtime is incompatible with this OS/arch')
  console.error('  • Missing native addon for this OS/arch')
  console.error('========================================================')
  console.error('')
}

// --- 2. Start the renderer RPC bridge (WebSocket). ---
// Single-client for M1.5: the React renderer is the only caller.
// Events emitted by the backend before the renderer connects are
// buffered here so nothing boot-time is missed.
let client = null
let rendererDisconnectTimer = null
const diagnostics = new Set()
const eventBuffer = []
const diagnosticRouter = new DiagnosticRpcRouter({
  forward: (frame) => backendPipe?.write(frame)
})

if (backendPipe) {
  backendPipe.on('data', (chunk) => {
    if (client) client.write(chunk)
    else eventBuffer.push(chunk)
    try { diagnosticRouter.routeBackend(chunk) } catch (err) {
      console.error('[rpc] diagnostic response routing failed:', err.message)
    }
  })
}

// Build a single length-prefixed JSON frame matching the wire format
// backend/rpc.js emits (8-hex-char ASCII length prefix + JSON body) so
// the renderer's RpcClient parses it the same way regardless of
// whether the backend or this error-mode synthesizer wrote it.
function frameEvent (event, data) {
  const json = JSON.stringify({ event, data })
  return json.length.toString(16).padStart(8, '0') + json
}

const onDiagnosticSocket = (socket, access) => {
  console.log(`[rpc] ${access.full ? 'operator' : 'read-only'} diagnostic connected`)
  diagnostics.add(socket)
  diagnosticRouter.add(socket, { full: access.full })
  socket.on('close', () => {
    console.log('[rpc] diagnostic disconnected')
    diagnostics.delete(socket)
    diagnosticRouter.remove(socket)
  })
  socket.on('error', (err) => {
    console.error('[rpc] diagnostic error:', err.message)
    diagnostics.delete(socket)
    diagnosticRouter.remove(socket)
  })

  if (bootError) {
    console.log('[rpc] sending backend-boot-failed event to diagnostic')
    socket.write(frameEvent('backend-boot-failed', {
      message: bootError.message || String(bootError),
      code: bootError.code || null,
      stack: bootError.stack || null
    }))
    setTimeout(() => { try { socket.end() } catch {} }, 200)
    return
  }

  socket.on('data', (data) => {
    try {
      diagnosticRouter.receive(socket, data)
    } catch (err) {
      console.error('[rpc] rejecting malformed diagnostic frame:', err.message)
      try { socket.end() } catch {}
    }
  })
}

const onSocket = (socket, req) => {
  const access = authorizeRpcWebSocket({ url: req?.url, headers: req?.headers }, {
    sessionToken: rpcSessionToken,
    diagnosticToken
  })
  if (!access.allowed) {
    console.error('[rpc] rejected unauthenticated socket:', access.reason)
    return socket.end()
  }
  if (access.kind === 'diagnostic') {
    return onDiagnosticSocket(socket, access)
  }

  if (client) {
    console.log('[rpc] rejecting extra WS connection')
    return socket.end()
  }
  if (rendererDisconnectTimer) {
    clearTimeout(rendererDisconnectTimer)
    rendererDisconnectTimer = null
    console.log('[rpc] renderer reconnected within grace period')
  }
  console.log('[rpc] renderer connected')
  client = socket

  // Backend-boot-failed path: send the structured error and close.
  // The renderer sees `event: 'backend-boot-failed'` and renders a
  // splash with the real message instead of a port-scan failure.
  if (bootError) {
    console.log('[rpc] sending backend-boot-failed event to renderer')
    socket.write(frameEvent('backend-boot-failed', {
      message: bootError.message || String(bootError),
      code: bootError.code || null,
      stack: bootError.stack || null
    }))
    // Brief grace period for the frame to flush, then close the socket
    // (renderer won't reconnect in error mode).
    setTimeout(() => { try { socket.end() } catch {} }, 200)
    return
  }

  for (const chunk of eventBuffer) socket.write(chunk)
  eventBuffer.length = 0

  socket.on('data', (data) => backendPipe.write(data))
  socket.on('close', () => {
    console.log('[rpc] renderer disconnected')
    detachRenderer(socket)
  })
  socket.on('error', (err) => {
    console.error('[rpc] socket error:', err.message)
    detachRenderer(socket)
  })
}

function detachRenderer (socket) {
  if (client !== socket) return
  client = null
  if (rendererDisconnectTimer) clearTimeout(rendererDisconnectTimer)
  // A renderer reload or brief localhost socket interruption can reconnect
  // with the same per-launch token. Preserve the backend and buffered events
  // briefly; a genuine window close still tears down before it can become a
  // zombie that holds the Corestore lock or RPC port.
  rendererDisconnectTimer = setTimeout(() => {
    rendererDisconnectTimer = null
    if (!client) teardown('renderer-ws-close')
  }, RENDERER_RECONNECT_GRACE_MS)
}

let rpcServer = null
let rpcPort = null
function listenRpcServer (port) {
  return new Promise((resolve, reject) => {
    const httpServer = http.createServer((req, res) => {
      const body = 'WebSocket required'
      res.writeHead(426, {
        'Content-Type': 'text/plain',
        'Content-Length': body.length
      })
      res.end(body)
    })
    const server = new ws.Server({ server: httpServer }, onSocket)
    let settled = false

    const cleanup = () => {
      httpServer.removeListener('error', onError)
      httpServer.removeListener('listening', onListening)
    }
    const onError = (err) => {
      if (settled) return
      settled = true
      cleanup()
      try { server.close() } catch {}
      reject(err)
    }
    const onListening = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(server)
    }

    httpServer.once('error', onError)
    httpServer.once('listening', onListening)
    httpServer.listen(port, '127.0.0.1')
  })
}

for (let p = RPC_PORT_BASE; p < RPC_PORT_BASE + RPC_PORT_COUNT; p++) {
  try {
    rpcServer = await listenRpcServer(p)
    rpcPort = p
    console.log(`[rpc] WS listening on :${rpcPort}`)
    break
  } catch (err) {
    if (err?.code === 'EADDRINUSE') {
      console.log(`[rpc] :${p} in use, trying next`)
      continue
    }
    throw err
  }
}
if (!rpcServer) {
  throw new Error(`No free WS RPC port in ${RPC_PORT_BASE}-${RPC_PORT_BASE + RPC_PORT_COUNT - 1}`)
}

// --- 3. Worker lifecycle. ---
// The Electron host owns windows and terminates this Pear OTA worker when the
// last window exits. Keep the backend cleanup local to the worker rather than
// relying on Pear v2's renderer pipe or global teardown hooks.
let tornDown = false
function teardown (reason) {
  if (tornDown) return
  tornDown = true
  console.log('[teardown] triggered by', reason)
  if (rendererDisconnectTimer) clearTimeout(rendererDisconnectTimer)
  rendererDisconnectTimer = null
  try { rpcServer?.close() } catch {}
  try { client?.end?.() } catch {}
  try { backendPipe.end?.() } catch {}
  // Hard-exit fast: hypercore/corestore can hold the event loop
  // open for tens of seconds on graceful close, and that's what
  // was letting zombies survive. 300ms is plenty for our WS
  // client to flush.
  setTimeout(() => {
    console.log('[teardown] hard-exit')
    try { Bare.exit?.(0) } catch {}
    try { process?.exit?.(0) } catch {}
  }, 300)
}
try { Bare.on?.('beforeExit', () => teardown('beforeExit')) } catch {}
try { Bare.on?.('exit', () => teardown('exit')) } catch {}
try { process?.on?.('SIGTERM', () => teardown('SIGTERM')) } catch {}
try { process?.on?.('SIGINT', () => teardown('SIGINT')) } catch {}
