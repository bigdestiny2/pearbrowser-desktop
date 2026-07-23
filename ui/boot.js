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
const RPC_PROBE_ID = 900000001
const RPC_SESSION_TOKEN = String(globalThis.pearbrowserRuntime?.sessionToken || '')

// Must match backend/constants.js exactly (numeric wire codes). This is a
// COMPLETE mirror — every command/event the renderer can send or receive.
// A missing entry resolves to `undefined` at the call site, which the
// backend silently never matches, so partial mirrors break whole features
// (Settings, Profile, Identity, Login, Swarm) without an obvious error.
// Keep this in lockstep with backend/constants.js.
const C = {
  CMD_NAVIGATE: 1,
  CMD_GET_STATUS: 2,
  CMD_GET_DRIVE_INFO: 3,
  CMD_RELEASE_ORIGIN: 4,
  CMD_LOAD_CATALOG: 10,
  CMD_INSTALL_APP: 11,
  CMD_UNINSTALL_APP: 12,
  CMD_LAUNCH_APP: 13,
  CMD_LIST_INSTALLED: 14,
  CMD_CHECK_UPDATES: 15,
  CMD_LOAD_CATALOG_BEE: 16,
  CMD_GET_CATALOG_APPS: 17,
  CMD_UNLOAD_CATALOG: 18,
  CMD_LOAD_CATALOG_AUTOBEE: 19,
  CMD_SHEETS_LOAD: 170,
  CMD_SHEETS_LIST: 171,
  CMD_SHEETS_LIST_SCHEMAS: 175,
  CMD_LOAD_CATALOG_INDEX: 176,
  CMD_SEARCH: 177,
  CMD_SEARCH_INDEX: 178,
  CMD_CREATE_SITE: 20,
  CMD_UPDATE_SITE: 21,
  CMD_PUBLISH_SITE: 22,
  CMD_UNPUBLISH_SITE: 23,
  CMD_LIST_SITES: 24,
  CMD_DELETE_SITE: 25,
  CMD_LOAD_TEMPLATE: 26,
  CMD_GET_SITE_BLOCKS: 27,
  CMD_LEGACY_APP_MIGRATION: 28,
  CMD_RUN_APP_IN_TAB: 201,
  CMD_RESET_APP: 29,
  CMD_CLEAR_CACHE: 30,
  CMD_GET_IDENTITY: 31,
  CMD_GET_APP_ICON: 32,
  CMD_SET_SITE_ICON: 33,
  CMD_GET_RELAYS: 40,
  CMD_SET_RELAYS: 41,
  CMD_SET_RELAY_ENABLED: 42,
  CMD_CHECK_RELAY_CAPABILITY: 43,
  CMD_USERDATA_LIST_BOOKMARKS: 50,
  CMD_USERDATA_ADD_BOOKMARK: 51,
  CMD_USERDATA_REMOVE_BOOKMARK: 52,
  CMD_USERDATA_LIST_HISTORY: 53,
  CMD_USERDATA_ADD_HISTORY: 54,
  CMD_USERDATA_CLEAR_HISTORY: 55,
  CMD_USERDATA_GET_SETTINGS: 56,
  CMD_USERDATA_SET_SETTINGS: 57,
  CMD_USERDATA_GET_SESSION: 58,
  CMD_USERDATA_SAVE_SESSION: 59,
  CMD_USERDATA_IMPORT: 60,
  CMD_IDENTITY_EXPORT_PHRASE: 70,
  CMD_IDENTITY_IMPORT_PHRASE: 71,
  CMD_IDENTITY_ROTATE: 72,
  CMD_IDENTITY_VALIDATE_PHRASE: 73,
  CMD_IDENTITY_SIGN: 74,
  CMD_IDENTITY_VERIFY: 75,
  CMD_PROFILE_GET: 80,
  CMD_PROFILE_UPDATE: 81,
  CMD_PROFILE_CLEAR: 82,
  CMD_LOGIN_LIST_GRANTS: 83,
  CMD_LOGIN_REVOKE_GRANT: 84,
  CMD_LOGIN_REVOKE_ALL: 85,
  CMD_LOGIN_RESOLVE: 86,
  CMD_CONTACTS_LIST: 90,
  CMD_CONTACTS_LOOKUP: 91,
  CMD_CONTACTS_ADD: 92,
  CMD_CONTACTS_UPDATE: 93,
  CMD_CONTACTS_REMOVE: 94,
  CMD_CONTACTS_MY_INVITE: 95,
  CMD_CONTACTS_ADD_INVITE: 96,
  CMD_STOP: 99,
  CMD_SWARM_RESOLVE: 120,
  CMD_SWARM_LIST_GRANTS: 121,
  CMD_SWARM_REVOKE_GRANT: 122,
  CMD_SWARM_REVOKE_ALL_FOR_APP: 123,
  CMD_MYCATALOG_GET: 150,
  CMD_MYCATALOG_CREATE: 151,
  CMD_MYCATALOG_ADD_APP: 152,
  CMD_MYCATALOG_REMOVE_APP: 153,
  CMD_MYCATALOG_RENAME: 154,
  CMD_MYCATALOG_UPDATE_APP: 155,
  CMD_AUTOBEE_CREATE: 160,
  CMD_AUTOBEE_GET: 161,
  CMD_AUTOBEE_ADD_APP: 162,
  CMD_AUTOBEE_REMOVE_APP: 163,
  CMD_AUTOBEE_RENAME: 164,
  CMD_AUTOBEE_ADD_WRITER: 165,
  CMD_SYNC_STATUS: 180,
  CMD_SYNC_CREATE: 181,
  CMD_SYNC_JOIN: 182,
  CMD_SYNC_ADD_WRITER: 183,
  CMD_SYNC_GET_BOOKMARKS: 184,
  CMD_SYNC_ADD_BOOKMARK: 185,
  CMD_SYNC_REMOVE_BOOKMARK: 186,
  CMD_SYNC_PUSH_LOCAL: 187,
  CMD_NAME_RESOLVE: 250,
  CMD_NAME_PETNAME_LIST: 251,
  CMD_NAME_PETNAME_SET: 252,
  CMD_NAME_PETNAME_REMOVE: 253,
  CMD_NAMEREG_CLAIM: 264,
  CMD_NAMEREG_ROTATE: 265,
  CMD_NAMEREG_RELEASE: 266,
  CMD_NAMEREG_REVOKE: 267,
  CMD_NAMEREG_LIST: 268,
  CMD_NAMEREG_RESOLVE: 269,
  CMD_NAMEREG_STATUS: 270,
  CMD_IDENTITY_BINDING_PUBLISH: 260,
  CMD_IDENTITY_BINDING_RESOLVE: 261,
  CMD_SEARCH_FEDERATED: 262,
  CMD_NOSTR_GET_IDENTITY: 188,
  CMD_NOSTR_BIND: 189,
  CMD_NOSTR_REVOKE: 190,
  CMD_NOSTR_PUBLISH: 191,
  CMD_NOSTR_QUERY: 192,
  CMD_SUBMIT_APP: 210,
  CMD_MOD_PENDING: 211,
  CMD_MOD_APPROVE: 212,
  CMD_MOD_REJECT: 213,
  CMD_ASK_BROWSER_CAPABILITIES: 220,
  CMD_ASK_BROWSER_START: 221,
  CMD_ASK_BROWSER_CANCEL: 222,
  CMD_SHIELD_STATUS: 230,
  CMD_SHIELD_LOAD_LIST: 231,
  CMD_SHIELD_REMOVE_LIST: 232,
  CMD_SHIELD_SET_ALLOW: 233,
  CMD_SHIELD_SET_STRICT: 234,
  CMD_PLUGIN_LIST: 235,
  CMD_PLUGIN_SET_ENABLED: 236,
  CMD_PLUGIN_REGISTER: 237,
  CMD_SHIELD_SUBSCRIBE_LIST: 239,
  CMD_SHIELD_UNSUBSCRIBE_LIST: 240,
  CMD_SHIELD_REFRESH_LISTS: 241,
  CMD_PLUGIN_INSTALL_DRIVE: 242,
  CMD_PLUGIN_UPDATE_DRIVE: 243,
  CMD_PLUGIN_UNINSTALL: 244,
  CMD_PLUGIN_CATALOG: 245,
  CMD_PLUGIN_CATALOG_LOAD_DRIVE: 246,
  CMD_PLUGIN_CATALOG_REMOVE_SOURCE: 247,
  CMD_PRIVACY_STATUS: 238,
  CMD_BRIDGE: 200,
  EVT_READY: 100,
  EVT_PEER_COUNT: 101,
  EVT_ERROR: 102,
  EVT_INSTALL_PROGRESS: 103,
  EVT_SITE_PUBLISHED: 104,
  EVT_BOOT_PROGRESS: 105,
  EVT_LOGIN_REQUEST: 106,
  EVT_SWARM_REQUEST: 107,
  EVT_SEARCH_FEDERATED: 108,
  EVT_IDENTITY_BINDING_PUBLISHED: 109,
  EVT_LAUNCH_PROGRESS: 110,
  EVT_ASK_BROWSER_STREAM: 111
}

export class WsPipe {
  constructor (url, opts = {}) {
    this._listeners = { data: [], close: [], error: [], open: [], reconnecting: [], 'reconnect-failed': [] }
    this._url = url
    this._connected = false
    this._connecting = false
    this._destroyed = false
    this._reconnectEnabled = false
    this._reconnectTimer = null
    this._reconnectAttempt = 0
    this._maxReconnectAttempts = Number.isInteger(opts.maxReconnectAttempts) ? opts.maxReconnectAttempts : 8
    this._reconnectBaseMs = Number.isFinite(opts.reconnectBaseMs) ? opts.reconnectBaseMs : 100
    this._reconnectMaxMs = Number.isFinite(opts.reconnectMaxMs) ? opts.reconnectMaxMs : 1000
    this._failedSocket = null
    this._ws = null
    this._connect()
  }

  get connected () {
    return this._connected
  }

  enableReconnect () {
    if (this._destroyed) return
    this._reconnectEnabled = true
    if (!this._connected && !this._connecting) this._scheduleReconnect()
  }

  destroy () {
    this._destroyed = true
    this._reconnectEnabled = false
    this._connected = false
    this._connecting = false
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer)
    this._reconnectTimer = null
    const socket = this._ws
    this._ws = null
    try { socket?.close() } catch {}
  }

  _emit (event, detail) {
    for (const fn of this._listeners[event] || []) fn(detail)
  }

  _connect () {
    if (this._destroyed || this._connecting || this._connected) return
    this._connecting = true
    console.log('[ws] connecting to', this._url)
    const socket = new WebSocket(this._url)
    this._ws = socket
    this._failedSocket = null
    socket.binaryType = 'arraybuffer'

    socket.addEventListener('open', () => {
      if (this._destroyed || socket !== this._ws) {
        try { socket.close() } catch {}
        return
      }
      console.log('[ws] open')
      this._connecting = false
      this._connected = true
      this._reconnectAttempt = 0
      this._emit('open')
    })

    socket.addEventListener('message', (e) => {
      if (socket !== this._ws || !this._connected) return
      const text = typeof e.data === 'string'
        ? e.data
        : new TextDecoder().decode(e.data)
      this._emit('data', text)
    })

    socket.addEventListener('close', (e) => {
      console.log('[ws] close', e.code, e.reason)
      this._handleDisconnect(socket)
    })

    socket.addEventListener('error', (e) => {
      console.error('[ws] error', e)
      this._handleDisconnect(socket, e)
      try { socket.close() } catch {}
    })
  }

  _handleDisconnect (socket, error = null) {
    if (this._destroyed || socket !== this._ws || this._failedSocket === socket) return
    this._failedSocket = socket
    this._connected = false
    this._connecting = false
    if (error) this._emit('error', error)
    this._emit('close')
    this._scheduleReconnect()
  }

  _scheduleReconnect () {
    if (!this._reconnectEnabled || this._destroyed || this._connected || this._connecting || this._reconnectTimer) return
    if (this._reconnectAttempt >= this._maxReconnectAttempts) {
      this._emit('reconnect-failed', { attempts: this._reconnectAttempt })
      return
    }
    const attempt = ++this._reconnectAttempt
    const delay = Math.min(this._reconnectBaseMs * (2 ** (attempt - 1)), this._reconnectMaxMs)
    this._emit('reconnecting', { attempt, delay })
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null
      this._connect()
    }, delay)
  }

  on (event, fn) {
    if (this._listeners[event]) this._listeners[event].push(fn)
    return this
  }

  write (frame) {
    if (!this._connected || !this._ws) throw new Error('WebSocket RPC connection is not open')
    this._ws.send(frame)
    return true
  }
}

function frameRpc (msg) {
  const json = JSON.stringify(msg)
  return json.length.toString(16).padStart(8, '0') + json
}

function diagnosticUrlFor (url) {
  const u = new URL(url)
  u.pathname = '/status-smoke'
  u.search = `?session=${encodeURIComponent(RPC_SESSION_TOKEN)}`
  u.hash = ''
  return u.toString()
}

function rendererUrlFor (port) {
  if (!RPC_SESSION_TOKEN) throw new Error('PearBrowser v3 runtime session token is unavailable')
  return `ws://127.0.0.1:${port}/?session=${encodeURIComponent(RPC_SESSION_TOKEN)}`
}

function parseRpcFrames (state, data) {
  state.buffer += typeof data === 'string'
    ? data
    : new TextDecoder().decode(data)
  const out = []
  while (state.buffer.length >= 8) {
    const len = parseInt(state.buffer.slice(0, 8), 16)
    if (isNaN(len) || len <= 0 || len > 10_000_000) {
      throw new Error('invalid rpc frame')
    }
    if (state.buffer.length < 8 + len) break
    const json = state.buffer.slice(8, 8 + len)
    state.buffer = state.buffer.slice(8 + len)
    out.push(JSON.parse(json))
  }
  return out
}

function probeBackend (url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const probeUrl = diagnosticUrlFor(url)
    const ws = new WebSocket(probeUrl)
    ws.binaryType = 'arraybuffer'
    const state = { buffer: '' }
    let settled = false
    const t = setTimeout(() => finish(new Error('probe timeout')), timeoutMs)

    function finish (err) {
      if (settled) return
      settled = true
      clearTimeout(t)
      try { ws.close() } catch {}
      err ? reject(err) : resolve()
    }

    ws.addEventListener('open', () => {
      ws.send(frameRpc({ id: RPC_PROBE_ID, cmd: C.CMD_GET_STATUS, data: {} }))
    })
    ws.addEventListener('message', (e) => {
      let messages
      try { messages = parseRpcFrames(state, e.data) } catch (err) {
        finish(err)
        return
      }
      for (const msg of messages) {
        if (msg?.event === 'backend-boot-failed') return finish(null)
        if (msg?.id === RPC_PROBE_ID) return msg.error ? finish(new Error(msg.error)) : finish(null)
      }
    })
    ws.addEventListener('error', () => finish(new Error('probe error')))
    ws.addEventListener('close', () => finish(new Error('probe closed')))
  })
}

function tryConnect (url, timeoutMs) {
  return probeBackend(url, timeoutMs).then(() => new Promise((resolve, reject) => {
    const pipe = new WsPipe(url)
    let settled = false
    const finish = (err = null) => {
      if (settled) return
      settled = true
      clearTimeout(t)
      if (err) {
        pipe.destroy()
        reject(err)
      } else {
        pipe.enableReconnect()
        resolve(pipe)
      }
    }
    const t = setTimeout(() => finish(new Error('timeout')), timeoutMs)
    pipe.on('open', () => finish())
    pipe.on('error', () => finish(new Error('ws error')))
    pipe.on('close', () => finish(new Error('ws closed')))
  }))
}

export async function startBackend () {
  let pipe = null
  let connectedPort = null
  const errors = []
  for (let p = RPC_PORT_BASE; p < RPC_PORT_BASE + RPC_PORT_COUNT; p++) {
    try {
      pipe = await tryConnect(rendererUrlFor(p), 1500)
      connectedPort = p
      console.log('[rpc] connected on :' + p)
      break
    } catch (err) {
      errors.push(`:${p} ${err.message}`)
    }
  }
  if (!pipe) {
    // None of the ports accepted. The Bare main process is either not
    // running or crashed before binding the WS server. Since v0.4.4
    // the main process catches synchronous boot failures and still
    // binds the WS — emitting a `backend-boot-failed` event — so a
    // pure port-scan failure means the native host itself did not start, not
    // that the backend reported a structured boot failure.
    //
    // Most common cause: an interrupted local installation. Do not revive a
    // remote app reference; reinstall the verified signed native package.
    throw new Error(
      `Could not reach backend on any port ${RPC_PORT_BASE}-${RPC_PORT_BASE + RPC_PORT_COUNT - 1} ` +
      `(${errors.join('; ')}). The Bare main process appears not to be running. ` +
      `Most likely cause: an interrupted installation. Reinstall the verified ` +
      `signed native package and relaunch it.`
    )
  }
  const rpc = new RpcClient(pipe)
  return { rpc, C, pipe, storagePath: `(backend in main Bare process, WS :${connectedPort})` }
}
