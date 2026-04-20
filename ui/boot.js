/**
 * Renderer-side backend connection.
 *
 * Wraps a browser WebSocket into a pipe-like object (on('data')
 * / write()) so the existing length-prefixed JSON framing from
 * backend/rpc.js works unchanged. The backend runs in the Bare
 * main process (where native addons load) and exposes this WS
 * on localhost:9876.
 */

import { RpcClient } from './rpc-client.js'

// Backend tries this range in index.js main. Renderer scans it in
// order until one accepts. Handles zombie pear-runtime processes
// holding 9876.
const RPC_PORT_BASE = 9876
const RPC_PORT_COUNT = 5

// Must match backend/constants.js exactly (numeric wire codes).
const C = {
  CMD_NAVIGATE: 1,
  CMD_GET_STATUS: 2,
  CMD_LOAD_CATALOG: 10,
  CMD_INSTALL_APP: 11,
  CMD_UNINSTALL_APP: 12,
  CMD_LAUNCH_APP: 13,
  CMD_LIST_INSTALLED: 14,
  CMD_CREATE_SITE: 20,
  CMD_UPDATE_SITE: 21,
  CMD_PUBLISH_SITE: 22,
  CMD_UNPUBLISH_SITE: 23,
  CMD_LIST_SITES: 24,
  CMD_DELETE_SITE: 25,
  CMD_GET_SITE_BLOCKS: 27,
  CMD_LAUNCH_PEAR_LINK: 28,
  CMD_RESET_APP: 29,
  CMD_CLEAR_CACHE: 30,
  CMD_GET_IDENTITY: 31,
  CMD_GET_RELAYS: 40,
  CMD_SET_RELAYS: 41,
  CMD_SET_RELAY_ENABLED: 42,
  CMD_USERDATA_LIST_BOOKMARKS: 50,
  CMD_USERDATA_ADD_BOOKMARK: 51,
  CMD_USERDATA_REMOVE_BOOKMARK: 52,
  CMD_USERDATA_LIST_HISTORY: 53,
  CMD_USERDATA_ADD_HISTORY: 54,
  CMD_USERDATA_CLEAR_HISTORY: 55,
  CMD_STOP: 99,
  EVT_READY: 100,
  EVT_PEER_COUNT: 101,
  EVT_ERROR: 102,
  EVT_INSTALL_PROGRESS: 103,
  EVT_SITE_PUBLISHED: 104,
  EVT_BOOT_PROGRESS: 105,
  EVT_LOGIN_REQUEST: 106
}

class WsPipe {
  constructor (url) {
    this._listeners = { data: [], close: [], error: [], open: [] }
    this._connected = false
    this._outgoing = []
    console.log('[ws] connecting to', url)
    this._ws = new WebSocket(url)
    this._ws.binaryType = 'arraybuffer'

    this._ws.addEventListener('open', () => {
      console.log('[ws] open')
      this._connected = true
      for (const fn of this._listeners.open) fn()
      for (const frame of this._outgoing) this._ws.send(frame)
      this._outgoing.length = 0
    })

    this._ws.addEventListener('message', (e) => {
      const text = typeof e.data === 'string'
        ? e.data
        : new TextDecoder().decode(e.data)
      for (const fn of this._listeners.data) fn(text)
    })

    this._ws.addEventListener('close', (e) => {
      console.log('[ws] close', e.code, e.reason)
      for (const fn of this._listeners.close) fn()
    })

    this._ws.addEventListener('error', (e) => {
      console.error('[ws] error', e)
      for (const fn of this._listeners.error) fn(e)
    })
  }

  on (event, fn) {
    if (this._listeners[event]) this._listeners[event].push(fn)
    return this
  }

  write (frame) {
    if (this._connected) this._ws.send(frame)
    else this._outgoing.push(frame)
  }
}

function tryConnect (url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const pipe = new WsPipe(url)
    let settled = false
    const t = setTimeout(() => { if (!settled) { settled = true; reject(new Error('timeout')) } }, timeoutMs)
    pipe.on('open', () => { if (!settled) { settled = true; clearTimeout(t); resolve(pipe) } })
    pipe.on('error', () => { if (!settled) { settled = true; clearTimeout(t); reject(new Error('ws error')) } })
    pipe.on('close', () => { if (!settled) { settled = true; clearTimeout(t); reject(new Error('ws closed')) } })
  })
}

export async function startBackend () {
  let pipe = null
  let connectedPort = null
  const errors = []
  for (let p = RPC_PORT_BASE; p < RPC_PORT_BASE + RPC_PORT_COUNT; p++) {
    try {
      pipe = await tryConnect(`ws://127.0.0.1:${p}/`, 1500)
      connectedPort = p
      console.log('[rpc] connected on :' + p)
      break
    } catch (err) {
      errors.push(`:${p} ${err.message}`)
    }
  }
  if (!pipe) {
    throw new Error(`Could not reach backend on any port ${RPC_PORT_BASE}-${RPC_PORT_BASE + RPC_PORT_COUNT - 1} (${errors.join('; ')})`)
  }
  const rpc = new RpcClient(pipe)
  return { rpc, C, pipe, storagePath: `(backend in main Bare process, WS :${connectedPort})` }
}
