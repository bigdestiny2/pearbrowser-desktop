import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'
import ws from 'bare-ws'
import { bootBackend } from './backend/pear-adapter.cjs'

const RPC_PORT = 9876

// --- 1. Boot the backend in this Bare main process. ---
// Native P2P addons (rabin-native, sodium-native, udx-native)
// load cleanly here because Bare's ABI matches their `.bare`
// prebuilds. Electron renderer cannot host them — that's why
// the renderer talks to us over WebSocket instead of calling
// into hyperdrive directly.
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

const rpcServer = new ws.Server({ port: RPC_PORT, host: '127.0.0.1' }, (socket) => {
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
})

rpcServer.on('listening', () => console.log(`[rpc] WS listening on :${RPC_PORT}`))

// --- 3. Open the UI window via pear-electron. ---
const runtime = new Runtime()
const bridge = new Bridge()
await bridge.ready()
const pipe = runtime.start({ bridge })

Pear.teardown(() => {
  pipe.end()
  rpcServer.close()
})
