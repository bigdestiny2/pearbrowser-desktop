import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'
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
const rpcSessionToken = String(Pear.config?.startId || '')
const diagnosticToken = String(env.PEARBROWSER_RPC_DIAGNOSTIC_TOKEN || '')
if (!rpcSessionToken) throw new Error('Pear runtime did not provide a per-launch RPC session token')

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
// loud banner that makes the cause obvious in `pear run --dev` output.
const storagePath = (Pear.config?.storage || '.') + '/pearbrowser-storage'
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
  console.error('  • Staged drive is incomplete on disk (relay partial pin)')
  console.error('     Try:  rm -rf "$HOME/Library/Application Support/pear/by-dkey/00f61fc1473b9d01a199833fc96e76d5e99000c603ec697bc842f8d978538f4d"')
  console.error('           then re-run `pear run pear://tco5...`')
  console.error('  • Pear runtime too old — update with: pear run pear://runtime')
  console.error('  • Missing native addon for this OS/arch')
  console.error('========================================================')
  console.error('')
}

// --- 2. Start the renderer RPC bridge (WebSocket). ---
// Single-client for M1.5: the React renderer is the only caller.
// Events emitted by the backend before the renderer connects are
// buffered here so nothing boot-time is missed.
let client = null
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
    if (client === socket) client = null
    // The WS socket closing is the most reliable signal that the
    // user closed the window. Pipe events from runtime.start and
    // Pear.teardown proved unreliable in practice. Tear down the
    // main process here so the next launch doesn't see a zombie.
    teardown('renderer-ws-close')
  })
  socket.on('error', (err) => {
    console.error('[rpc] socket error:', err.message)
    if (client === socket) client = null
  })
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

// --- 3. Open the UI window via pear-electron. ---
const runtime = new Runtime()
const bridge = new Bridge()
await bridge.ready()
const pipe = runtime.start({ bridge })

// Real shutdown: when the renderer pipe ends, close + force-exit.
// Pear.teardown alone didn't fire consistently; hooking every
// exit signal so lingering processes stop blocking subsequent
// launches with EADDRINUSE / rocksdb LOCK conflicts.
let tornDown = false
function teardown (reason) {
  if (tornDown) return
  tornDown = true
  console.log('[teardown] triggered by', reason)
  try { rpcServer?.close() } catch {}
  try { client?.end?.() } catch {}
  try { backendPipe.end?.() } catch {}
  try { pipe?.end?.() } catch {}
  // Hard-exit fast: hypercore/corestore can hold the event loop
  // open for tens of seconds on graceful close, and that's what
  // was letting zombies survive. 300ms is plenty for our WS
  // client to flush.
  setTimeout(() => {
    console.log('[teardown] hard-exit')
    try { Pear.exit?.(0) } catch {}
    try { Bare.exit?.(0) } catch {}
    try { process?.exit?.(0) } catch {}
  }, 300)
}
// pear-electron's runtime.start() return shape varies across versions:
// older builds returned a duplex pipe (.on/.end), newer ones return a
// plain object. Detect what we got and only attach listeners that exist.
// The WS-renderer-close path is our reliable shutdown trigger; these
// pipe listeners are belt-and-braces so any other exit signal still
// teardowns. Wrap each in try/catch so an unsupported runtime never
// throws an [uncaughtException] at boot.
if (pipe && typeof pipe.on === 'function') {
  try { pipe.on('close', () => teardown('pipe close')) } catch {}
  try { pipe.on('end', () => teardown('pipe end')) } catch {}
  try { pipe.on('error', (err) => teardown('pipe error: ' + (err && err.message))) } catch {}
} else {
  console.log('[boot] runtime.start() returned non-emitter pipe; using WS-close + Pear.teardown only')
}
try { Pear.teardown(() => teardown('Pear.teardown')) } catch {}
try { Bare.on?.('beforeExit', () => teardown('beforeExit')) } catch {}
try { Bare.on?.('exit', () => teardown('exit')) } catch {}
try { process?.on?.('SIGTERM', () => teardown('SIGTERM')) } catch {}
try { process?.on?.('SIGINT', () => teardown('SIGINT')) } catch {}
