import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'
import ws from 'bare-ws'
import { bootBackend } from './backend/pear-adapter.cjs'

// Renderer scans 9876-9880 in order. Backend binds the first one
// that's free. Handles the common case where a zombie pear-runtime
// from a crashed earlier session still holds 9876 — new launch
// grabs the next port instead of failing with EADDRINUSE.
const RPC_PORT_BASE = 9876
const RPC_PORT_COUNT = 5

// --- 1. Boot the backend in this Bare main process. ---
const storagePath = (Pear.config?.storage || '.') + '/pearbrowser-storage'
const backendPipe = bootBackend({ storagePath })

// --- 2. Start the renderer RPC bridge (WebSocket). ---
// Single-client for M1.5: the React renderer is the only caller.
// Events emitted by the backend before the renderer connects are
// buffered here so nothing boot-time is missed.
let client = null
const eventBuffer = []

backendPipe.on('data', (chunk) => {
  if (client) client.write(chunk)
  else eventBuffer.push(chunk)
})

const onSocket = (socket) => {
  if (client) {
    console.log('[rpc] rejecting extra WS connection')
    return socket.end()
  }
  console.log('[rpc] renderer connected')
  client = socket
  for (const chunk of eventBuffer) socket.write(chunk)
  eventBuffer.length = 0

  socket.on('data', (data) => backendPipe.write(data))
  socket.on('close', () => {
    console.log('[rpc] renderer disconnected')
    if (client === socket) client = null
  })
  socket.on('error', (err) => {
    console.error('[rpc] socket error:', err.message)
    if (client === socket) client = null
  })
}

let rpcServer = null
let rpcPort = null
for (let p = RPC_PORT_BASE; p < RPC_PORT_BASE + RPC_PORT_COUNT; p++) {
  try {
    rpcServer = await new Promise((resolve, reject) => {
      const s = new ws.Server({ port: p, host: '127.0.0.1' }, onSocket)
      s.once('listening', () => resolve(s))
      s.once('error', (err) => reject(err))
    })
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
  try { pipe.end() } catch {}
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
pipe.on('close', () => teardown('pipe close'))
pipe.on('end', () => teardown('pipe end'))
pipe.on('error', (err) => teardown('pipe error: ' + (err && err.message)))
Pear.teardown(() => teardown('Pear.teardown'))
try { Bare.on?.('beforeExit', () => teardown('beforeExit')) } catch {}
try { Bare.on?.('exit', () => teardown('exit')) } catch {}
try { process?.on?.('SIGTERM', () => teardown('SIGTERM')) } catch {}
try { process?.on?.('SIGINT', () => teardown('SIGINT')) } catch {}
