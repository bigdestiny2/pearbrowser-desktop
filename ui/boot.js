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
  CMD_LAUNCH_PEAR_LINK: 28,
  CMD_RUN_APP_IN_TAB: 201,
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
  CMD_IDENTITY_BINDING_PUBLISH: 260,
  CMD_IDENTITY_BINDING_RESOLVE: 261,
  CMD_SEARCH_FEDERATED: 262,
  CMD_NOSTR_GET_IDENTITY: 188,
  CMD_NOSTR_BIND: 189,
  CMD_NOSTR_REVOKE: 190,
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
  EVT_IDENTITY_BINDING_PUBLISHED: 109
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
    // None of the ports accepted. The Bare main process is either not
    // running or crashed before binding the WS server. Since v0.4.4
    // the main process catches synchronous boot failures and still
    // binds the WS — emitting a `backend-boot-failed` event — so a
    // pure port-scan failure means the main process itself didn't
    // start (pear-electron handoff issue, NOT a backend crash).
    //
    // Most common cause: stale partial download from a prior release.
    // Pear's cache may have a half-written app bundle. Clear and retry:
    //   rm -rf "$HOME/Library/Application Support/pear/by-dkey/00f61fc1473b9d01a199833fc96e76d5e99000c603ec697bc842f8d978538f4d"
    //   pear run pear://tco5...
    throw new Error(
      `Could not reach backend on any port ${RPC_PORT_BASE}-${RPC_PORT_BASE + RPC_PORT_COUNT - 1} ` +
      `(${errors.join('; ')}). The Bare main process appears not to be running. ` +
      `Most likely cause: stale partial download. Clear the cache at ` +
      `~/Library/Application Support/pear/by-dkey/00f61fc1473b… and relaunch ` +
      `pear run pear://tco5...`
    )
  }
  const rpc = new RpcClient(pipe)
  return { rpc, C, pipe, storagePath: `(backend in main Bare process, WS :${connectedPort})` }
}
