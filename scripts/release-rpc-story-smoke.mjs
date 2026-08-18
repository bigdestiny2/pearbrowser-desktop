#!/usr/bin/env node
/**
 * Nonvisual release story smoke for a launched PearBrowser process.
 *
 * This complements, but does not replace, the manual GUI checklist. It proves
 * the production runtime can browse the release homepage through its local
 * proxy and can load the live release catalogues with the expected featured
 * rows. It never launches third-party apps or approves Pear trust prompts.
 *
 * With --local-stories it also performs local-only search, naming, bookmark,
 * and session round-trips, cleaning up the temporary bookmark/petname and
 * restoring the previous naming flag/session where possible. It still does not
 * launch third-party apps, approve trust, or publish a test site.
 *
 * With --site-story it creates, publishes, verifies, and deletes a temporary
 * PearBrowser site. That path intentionally exercises publishing and HiveRelay
 * pin/unseed cleanup, so it is opt-in and separate from --local-stories.
 *
 * With --desktop-gui-stories it expands the same evidence path across the
 * automatable blank desktop GUI rows from the release evidence log. It implies
 * --local-stories, adds browse reload/site-info proof, catalogue search/action
 * proof, safe catalogue-row app opening through Browse, startup source-contract
 * checks, Nostr trusted-contact reducer proof, and release-evidence row
 * suggestions in the JSON output.
 */

import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import { randomBytes } from 'node:crypto'

const require = createRequire(import.meta.url)
const C = require('../backend/constants.js')
const { catalogAppSearchText } = require('../backend/catalog-safety.cjs')

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT_BASE = 9876
const DEFAULT_PORT_COUNT = 5
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_CONNECT_MS = 1_500
const DEFAULT_REQUEST_MS = 20_000
const DEFAULT_FETCH_MS = 20_000
const DEFAULT_HOMEPAGE_URL = 'hyper://03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f/'
const PEERIT_URL = 'hyper://ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4/'
const P2PBUILDERS_URL = 'hyper://ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74/'
const DEFAULT_CATALOGS = [
  'f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d',
  '5d961fdc2f56215463e5d4656dd4a3f22bb5e15b93f9bfc8439a63a18f974d75'
]
const REQUIRED_FEATURED = ['Keet', 'PearPass', 'anonGPT', 'Paste', 'Peercord']
const CATALOG_SEARCH_TERMS = ['peercord', 'peerit', 'keet', 'paste']
const PEERCORD_MIGRATION_ID = 'wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy'
const RELEASE_EVIDENCE_SECTION = 'Desktop GUI And User Stories'

function parseArgs (argv) {
  const args = {
    host: DEFAULT_HOST,
    portBase: DEFAULT_PORT_BASE,
    portCount: DEFAULT_PORT_COUNT,
    timeout: DEFAULT_TIMEOUT_MS,
    connectTimeout: DEFAULT_CONNECT_MS,
    requestTimeout: DEFAULT_REQUEST_MS,
    fetchTimeout: DEFAULT_FETCH_MS,
    diagnosticToken: process.env.PEARBROWSER_RPC_DIAGNOSTIC_TOKEN || '',
    homepageUrl: DEFAULT_HOMEPAGE_URL,
    catalogs: [...DEFAULT_CATALOGS],
    localStories: false,
    siteStory: false,
    desktopGuiStories: false,
    json: false
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--host') args.host = argv[++i] || args.host
    else if (arg === '--port-base') args.portBase = parsePositiveInt(argv[++i], '--port-base')
    else if (arg === '--port-count') args.portCount = parsePositiveInt(argv[++i], '--port-count')
    else if (arg === '--timeout') args.timeout = parseDuration(argv[++i], '--timeout')
    else if (arg === '--connect-timeout') args.connectTimeout = parseDuration(argv[++i], '--connect-timeout')
    else if (arg === '--request-timeout') args.requestTimeout = parseDuration(argv[++i], '--request-timeout')
    else if (arg === '--fetch-timeout') args.fetchTimeout = parseDuration(argv[++i], '--fetch-timeout')
    else if (arg === '--diagnostic-token') args.diagnosticToken = String(argv[++i] || '').trim()
    else if (arg === '--homepage-url') args.homepageUrl = parseHyperUrl(argv[++i], '--homepage-url')
    else if (arg === '--catalog') args.catalogs.push(parseHexKey(argv[++i], '--catalog'))
    else if (arg === '--only-catalog') args.catalogs = [parseHexKey(argv[++i], '--only-catalog')]
    else if (arg === '--local-stories') args.localStories = true
    else if (arg === '--site-story') args.siteStory = true
    else if (arg === '--desktop-gui-stories') {
      args.desktopGuiStories = true
      args.localStories = true
    }
    else if (arg === '--json') args.json = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown option: ${arg}`)
  }

  return args
}

function usage (code, msg = '') {
  if (msg) console.error('error:', msg)
  console.error('usage: node scripts/release-rpc-story-smoke.mjs [--timeout 30000] [--port-base 9876] [--diagnostic-token <token>] [--catalog <64-hex>] [--homepage-url hyper://...] [--local-stories] [--site-story] [--desktop-gui-stories] [--json]')
  process.exit(code)
}

function parseDuration (value, label) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) usage(2, `${label} must be a positive number of milliseconds`)
  return Math.floor(n)
}

function parsePositiveInt (value, label) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) usage(2, `${label} must be a positive integer`)
  return n
}

function parseHexKey (value, label) {
  const key = String(value || '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(key)) usage(2, `${label} must be a 64-hex key`)
  return key
}

function parseHyperUrl (value, label) {
  const url = String(value || '').trim()
  if (!/^hyper:\/\/[0-9a-f]{64}(?:\/|$)/i.test(url)) usage(2, `${label} must be a hyper:// URL with a 64-hex drive key`)
  return url
}

function frame (msg) {
  const json = JSON.stringify(msg)
  return json.length.toString(16).padStart(8, '0') + json
}

function parseFrames (state, data) {
  state.buffer += Buffer.isBuffer(data) ? data.toString('utf8') : String(data)
  const out = []
  while (state.buffer.length >= 8) {
    const len = parseInt(state.buffer.slice(0, 8), 16)
    if (!Number.isFinite(len) || len <= 0 || len > 10_000_000) {
      throw new Error(`invalid RPC frame length: ${state.buffer.slice(0, 8)}`)
    }
    if (state.buffer.length < 8 + len) break
    const json = state.buffer.slice(8, 8 + len)
    state.buffer = state.buffer.slice(8 + len)
    out.push(JSON.parse(json))
  }
  return out
}

class RawWebSocket extends EventEmitter {
  constructor (socket, initial = Buffer.alloc(0)) {
    super()
    this.socket = socket
    this.buffer = initial
    this.closed = false

    socket.on('data', (chunk) => this._onData(chunk))
    socket.on('close', () => {
      if (this.closed) return
      this.closed = true
      this.emit('close')
    })
    socket.on('error', (err) => this.emit('error', err))
    if (initial.length) queueMicrotask(() => this._drain())
  }

  send (text) {
    if (this.closed) return
    const payload = Buffer.from(String(text))
    const mask = randomBytes(4)
    let header
    if (payload.length < 126) {
      header = Buffer.alloc(2)
      header[0] = 0x81
      header[1] = 0x80 | payload.length
    } else if (payload.length <= 0xffff) {
      header = Buffer.alloc(4)
      header[0] = 0x81
      header[1] = 0x80 | 126
      header.writeUInt16BE(payload.length, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x81
      header[1] = 0x80 | 127
      header.writeBigUInt64BE(BigInt(payload.length), 2)
    }

    const masked = Buffer.alloc(payload.length)
    for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4]
    this.socket.write(Buffer.concat([header, mask, masked]))
  }

  close () {
    this.closed = true
    try { this.socket.end() } catch {}
  }

  _onData (chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    this._drain()
  }

  _drain () {
    while (this.buffer.length >= 2) {
      const b0 = this.buffer[0]
      const b1 = this.buffer[1]
      const opcode = b0 & 0x0f
      const masked = (b1 & 0x80) !== 0
      let len = b1 & 0x7f
      let offset = 2

      if (len === 126) {
        if (this.buffer.length < offset + 2) return
        len = this.buffer.readUInt16BE(offset)
        offset += 2
      } else if (len === 127) {
        if (this.buffer.length < offset + 8) return
        len = Number(this.buffer.readBigUInt64BE(offset))
        offset += 8
      }

      const maskOffset = offset
      if (masked) offset += 4
      if (this.buffer.length < offset + len) return

      let payload = this.buffer.subarray(offset, offset + len)
      if (masked) {
        const mask = this.buffer.subarray(maskOffset, maskOffset + 4)
        const unmasked = Buffer.alloc(payload.length)
        for (let i = 0; i < payload.length; i++) unmasked[i] = payload[i] ^ mask[i % 4]
        payload = unmasked
      }
      this.buffer = this.buffer.subarray(offset + len)

      if (opcode === 0x8) {
        this.close()
        this.emit('close')
        return
      }
      if (opcode === 0x1 || opcode === 0x2) this.emit('message', payload)
    }
  }
}

async function connect (url, timeout) {
  return await new Promise((resolve, reject) => {
    const u = new URL(url)
    const socket = net.createConnection({ host: u.hostname, port: Number(u.port) })
    const key = randomBytes(16).toString('base64')
    let settled = false
    let buffer = Buffer.alloc(0)
    const timer = setTimeout(() => done(new Error(`connect timeout: ${url}`)), timeout)

    function done (err, ws = null) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.removeListener('connect', onConnect)
      socket.removeListener('data', onData)
      socket.removeListener('error', onError)
      socket.removeListener('close', onClose)
      if (err) {
        try { socket.destroy() } catch {}
        reject(err)
      } else {
        resolve(ws)
      }
    }

    function onConnect () {
      const path = (u.pathname || '/') + (u.search || '')
      socket.write([
        `GET ${path} HTTP/1.1`,
        `Host: ${u.hostname}:${u.port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '',
        ''
      ].join('\r\n'))
    }

    function onData (chunk) {
      buffer = Buffer.concat([buffer, chunk])
      const end = buffer.indexOf('\r\n\r\n')
      if (end === -1) return

      const head = buffer.subarray(0, end).toString('latin1')
      const rest = buffer.subarray(end + 4)
      if (!/^HTTP\/1\.1 101\b/i.test(head)) {
        done(new Error(`websocket handshake rejected: ${head.split('\r\n')[0] || 'no status'}`))
        return
      }
      done(null, new RawWebSocket(socket, rest))
    }

    function onError () { done(new Error(`connect failed: ${url}`)) }
    function onClose () { done(new Error(`socket closed before handshake: ${url}`)) }

    socket.once('connect', onConnect)
    socket.on('data', onData)
    socket.once('error', onError)
    socket.once('close', onClose)
  })
}

function requestRpc (ws, cmd, data, timeout) {
  const id = 910_000_000 + Math.floor(Math.random() * 10_000_000)
  const state = { buffer: '' }

  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => done(new Error(`RPC timeout: cmd ${cmd}`)), timeout)

    function done (err, value) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      ws.off('message', onMessage)
      ws.off('close', onClose)
      ws.off('error', onError)
      err ? reject(err) : resolve(value)
    }

    function onClose () { done(new Error(`diagnostic socket closed before cmd ${cmd} reply`)) }
    function onError () { done(new Error(`diagnostic socket error before cmd ${cmd} reply`)) }

    function onMessage (chunk) {
      let messages
      try {
        messages = parseFrames(state, chunk)
      } catch (err) {
        done(err)
        return
      }

      for (const msg of messages) {
        if (msg?.event === 'backend-boot-failed') {
          done(new Error(`backend boot failed: ${msg.data?.message || 'unknown error'}`))
          return
        }
        if (msg?.id !== id) continue
        if (msg.error) done(new Error(msg.error))
        else done(null, msg.result)
        return
      }
    }

    ws.on('message', onMessage)
    ws.on('close', onClose)
    ws.on('error', onError)
    ws.send(frame({ id, cmd, data: data || {} }))
  })
}

function validateStatus (status) {
  const errors = []
  if (!status || typeof status !== 'object') return ['status reply is not an object']
  if (status.dhtConnected !== true) errors.push('DHT is not connected')
  if (!Number.isInteger(status.proxyPort) || status.proxyPort <= 0) errors.push('HTTP proxy is not ready')
  if (!Number.isInteger(status.hiveRelays) || status.hiveRelays < 1) errors.push('no HiveRelay connections reported')
  if (!Number.isFinite(status.storageUsed) || status.storageUsed < 0) errors.push('storageUsed is invalid')
  if (!Number.isFinite(status.storageLimit) || status.storageLimit <= 0) errors.push('storageLimit is invalid')
  return errors
}

async function connectReady (args) {
  const deadline = Date.now() + args.timeout
  let last = null

  while (Date.now() < deadline) {
    for (let i = 0; i < args.portCount; i++) {
      const port = args.portBase + i
      const remain = Math.max(1, deadline - Date.now())
      const publicUrl = `ws://${args.host}:${port}/status-smoke`
      const url = `${publicUrl}${args.diagnosticToken ? `?token=${encodeURIComponent(args.diagnosticToken)}` : ''}`
      let ws = null
      try {
        ws = await connect(url, Math.min(args.connectTimeout, remain))
        const status = await requestRpc(ws, C.CMD_GET_STATUS, {}, Math.min(args.requestTimeout, remain))
        const errors = validateStatus(status)
        if (errors.length === 0) return { ws, port, url, status }
        last = { port, url: publicUrl, status, errors }
        ws.close()
      } catch (err) {
        last = { port, url: publicUrl, error: err.message }
        try { ws?.close() } catch {}
      }
    }
    await sleep(500)
  }

  const error = new Error('no ready diagnostic RPC socket answered')
  error.last = last
  throw error
}

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchLocalUrl (localUrl, timeout) {
  const u = new URL(localUrl)
  if (!['127.0.0.1', 'localhost'].includes(u.hostname)) {
    throw new Error(`refusing to fetch non-local proxy URL: ${localUrl}`)
  }

  return await new Promise((resolve, reject) => {
    let settled = false
    const req = http.get({
      hostname: u.hostname,
      port: u.port,
      path: `${u.pathname}${u.search || ''}`,
      timeout
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        done(null, {
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8')
        })
      })
    })

    req.on('timeout', () => done(new Error(`HTTP fetch timeout: ${localUrl}`)))
    req.on('error', done)

    function done (err, value) {
      if (settled) return
      settled = true
      try { req.destroy() } catch {}
      err ? reject(err) : resolve(value)
    }
  })
}

function titleOf (html) {
  const match = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? match[1].replace(/\s+/g, ' ').trim() : ''
}

function assertHomepage (nav, fetched, expectedUrl) {
  if (!nav || typeof nav.localUrl !== 'string') throw new Error('CMD_NAVIGATE did not return a localUrl')
  const expectedKey = new URL(expectedUrl).hostname.toLowerCase()
  if (nav.key !== expectedKey) throw new Error(`homepage key mismatch: expected ${expectedKey}, got ${nav.key || '(none)'}`)
  if (!Number.isInteger(fetched.statusCode) || fetched.statusCode < 200 || fetched.statusCode >= 300) {
    throw new Error(`homepage proxy fetch returned HTTP ${fetched.statusCode}`)
  }
  if (fetched.body.length < 1000) throw new Error(`homepage proxy fetch is unexpectedly small (${fetched.body.length} bytes)`)
  if (!/PearBrowser|Pear Browser/i.test(fetched.body)) throw new Error('homepage fetch did not contain PearBrowser text')
}

function assertCatalogues (catalogResult) {
  const apps = Array.isArray(catalogResult?.apps) ? catalogResult.apps : []
  const catalogs = Array.isArray(catalogResult?.catalogs) ? catalogResult.catalogs : []
  if (catalogs.length < 1) throw new Error('no loaded catalogues reported')
  if (apps.length < REQUIRED_FEATURED.length) throw new Error(`catalogue returned too few apps: ${apps.length}`)

  const byName = new Map(apps.map((app) => [String(app?.name || '').toLowerCase(), app]))
  const featured = []
  for (const name of REQUIRED_FEATURED) {
    const app = byName.get(name.toLowerCase())
    if (!app) throw new Error(`featured app missing from catalogue: ${name}`)
    featured.push({ name: app.name, type: app.type || 'standalone', link: app.link || null, driveKey: app.driveKey || null })
  }

  const peercord = byName.get('peercord')
  if (!peercord) throw new Error('Peercord missing from catalogue')
  if (peercord.legacyMigrationId !== PEERCORD_MIGRATION_ID) throw new Error(`Peercord migration id mismatch: ${peercord.legacyMigrationId || '(missing)'}`)
  if (peercord.nativeDelivery?.status !== 'migration-required') throw new Error('Peercord must require a verified native v3 package')
  if (peercord.link || peercord.driveKey) throw new Error('Peercord must not expose a remote executable or browsable content target')

  return {
    catalogs: catalogs.length,
    apps: apps.length,
    featured,
    peercord: {
      nativeDelivery: peercord.nativeDelivery,
      legacyMigrationId: peercord.legacyMigrationId,
      sourceUrl: peercord.sourceUrl || null,
      license: peercord.license || null,
      runMode: 'migration-required'
    }
  }
}

function makeToken () {
  return `releaseprobe${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
}

async function runSearchStory (ws, args, token) {
  const path = `/release-smoke/${token}.html`
  const title = `Release Smoke Search ${token}`
  const body = `PearBrowser release smoke local search probe ${token}`
  const driveKey = new URL(args.homepageUrl).hostname.toLowerCase()
  const before = await requestRpc(ws, C.CMD_USERDATA_GET_SETTINGS, {}, args.requestTimeout)
  const previousSettings = before?.settings && typeof before.settings === 'object' ? before.settings : {}
  const previousSearchIndex = previousSettings.searchIndexEnabled === true

  try {
    // Search indexing is privacy-first and defaults OFF. The release probe opts
    // in only for this local round-trip, then restores the user's prior choice.
    if (!previousSearchIndex) {
      await requestRpc(ws, C.CMD_USERDATA_SET_SETTINGS, { updates: { searchIndexEnabled: true } }, args.requestTimeout)
    }

    const indexed = await requestRpc(ws, C.CMD_SEARCH_INDEX, {
      driveKey,
      path,
      title,
      body,
      publishedAt: Date.now()
    }, args.requestTimeout)

    if (!indexed?.ok || typeof indexed.docId !== 'string') {
      throw new Error('search story failed to index a local document')
    }

    const found = await requestRpc(ws, C.CMD_SEARCH, { query: token, limit: 5 }, args.requestTimeout)
    const results = Array.isArray(found?.results) ? found.results : []
    const hit = results.find((row) => row?.docId === indexed.docId || row?.path === path)
    if (found?.phase !== 'first-paint') throw new Error(`search story phase mismatch: ${found?.phase || '(missing)'}`)
    if (found?.federating !== false) throw new Error('search story unexpectedly entered federated mode')
    if (!hit) throw new Error('search story did not return the indexed local document')

    return {
      token,
      docId: indexed.docId,
      phase: found.phase,
      federating: found.federating,
      results: results.length,
      hitTitle: hit.title || null,
      restoredSearchIndexSetting: !previousSearchIndex
    }
  } finally {
    if (!previousSearchIndex) {
      try { await requestRpc(ws, C.CMD_USERDATA_SET_SETTINGS, { updates: { searchIndexEnabled: false } }, args.requestTimeout) } catch {}
    }
  }
}

async function runNamingStory (ws, args, token) {
  const before = await requestRpc(ws, C.CMD_USERDATA_GET_SETTINGS, {}, args.requestTimeout)
  const previousSettings = before?.settings && typeof before.settings === 'object' ? before.settings : {}
  const previousNaming = previousSettings.experimentalNaming === true
  const petname = `smoke${token.slice(-10)}`
  let petnameCreated = false

  try {
    if (!previousNaming) {
      await requestRpc(ws, C.CMD_USERDATA_SET_SETTINGS, { updates: { experimentalNaming: true } }, args.requestTimeout)
    }

    const curated = await requestRpc(ws, C.CMD_NAME_RESOLVE, { name: 'peerit' }, args.requestTimeout)
    if (curated?.enabled === false) throw new Error('naming story did not enable naming')
    if (curated?.resolved?.provenance !== 'curated') {
      throw new Error(`naming story expected curated peerit alias, got ${curated?.resolved?.provenance || '(missing)'}`)
    }
    if (!String(curated.resolved.link || '').startsWith('hyper://')) throw new Error('naming story peerit alias did not resolve to a hyper:// link')

    await requestRpc(ws, C.CMD_NAME_PETNAME_SET, {
      name: petname,
      link: args.homepageUrl,
      label: 'Release Smoke Home'
    }, args.requestTimeout)
    petnameCreated = true

    const pet = await requestRpc(ws, C.CMD_NAME_RESOLVE, { name: petname }, args.requestTimeout)
    if (pet?.resolved?.provenance !== 'petname') throw new Error('naming story petname did not resolve as petname provenance')
    if (pet.resolved.link !== args.homepageUrl) throw new Error('naming story petname link mismatch')

    return {
      curated: { name: curated.resolved.name, provenance: curated.resolved.provenance, link: curated.resolved.link },
      petname: { name: petname, provenance: pet.resolved.provenance, link: pet.resolved.link },
      restoredExperimentalNaming: !previousNaming
    }
  } finally {
    if (petnameCreated) {
      try { await requestRpc(ws, C.CMD_NAME_PETNAME_REMOVE, { name: petname }, args.requestTimeout) } catch {}
    }
    if (!previousNaming) {
      try { await requestRpc(ws, C.CMD_USERDATA_SET_SETTINGS, { updates: { experimentalNaming: false } }, args.requestTimeout) } catch {}
    }
  }
}

async function runLibraryStory (ws, args, token, options = {}) {
  const bookmarkUrl = `${args.homepageUrl}?release-smoke=${token}`
  const bookmarkTitle = `Release Smoke Bookmark ${token}`
  const beforeSession = await requestRpc(ws, C.CMD_USERDATA_GET_SESSION, {}, args.requestTimeout)
  const previousSession = beforeSession?.session ?? null
  let bookmarkCreated = false
  let sessionTouched = false
  let diagnosticReconnectRoundTrip = false

  try {
    const add = await requestRpc(ws, C.CMD_USERDATA_ADD_BOOKMARK, { url: bookmarkUrl, title: bookmarkTitle }, args.requestTimeout)
    if (add?.bookmark?.url !== bookmarkUrl) throw new Error('library story bookmark add failed')
    bookmarkCreated = true

    const listed = await requestRpc(ws, C.CMD_USERDATA_LIST_BOOKMARKS, {}, args.requestTimeout)
    const bookmarks = Array.isArray(listed?.bookmarks) ? listed.bookmarks : []
    if (!bookmarks.some((b) => b?.url === bookmarkUrl && b?.title === bookmarkTitle)) {
      throw new Error('library story bookmark was not listed after add')
    }

    const smokeSession = {
      releaseSmoke: token,
      activeTabId: 'release-smoke',
      tabs: [{ id: 'release-smoke', url: args.homepageUrl, title: 'Release Smoke Home' }]
    }
    await requestRpc(ws, C.CMD_USERDATA_SAVE_SESSION, { state: smokeSession }, args.requestTimeout)
    sessionTouched = true
    const afterSession = await requestRpc(ws, C.CMD_USERDATA_GET_SESSION, {}, args.requestTimeout)
    if (afterSession?.session?.releaseSmoke !== token) throw new Error('library story session round-trip failed')

    if (options.reconnectUrl) {
      const second = await connect(options.reconnectUrl, args.connectTimeout)
      try {
        const listedAgain = await requestRpc(second, C.CMD_USERDATA_LIST_BOOKMARKS, {}, args.requestTimeout)
        const bookmarksAgain = Array.isArray(listedAgain?.bookmarks) ? listedAgain.bookmarks : []
        if (!bookmarksAgain.some((b) => b?.url === bookmarkUrl && b?.title === bookmarkTitle)) {
          throw new Error('library story bookmark was not persisted across diagnostic reconnect')
        }
        const sessionAgain = await requestRpc(second, C.CMD_USERDATA_GET_SESSION, {}, args.requestTimeout)
        if (sessionAgain?.session?.releaseSmoke !== token) {
          throw new Error('library story session was not persisted across diagnostic reconnect')
        }
        diagnosticReconnectRoundTrip = true
      } finally {
        try { second.close() } catch {}
      }
    }

    await requestRpc(ws, C.CMD_USERDATA_REMOVE_BOOKMARK, { url: bookmarkUrl }, args.requestTimeout)
    bookmarkCreated = false
    const afterRemove = await requestRpc(ws, C.CMD_USERDATA_LIST_BOOKMARKS, {}, args.requestTimeout)
    const remaining = Array.isArray(afterRemove?.bookmarks) ? afterRemove.bookmarks : []
    if (remaining.some((b) => b?.url === bookmarkUrl)) throw new Error('library story bookmark cleanup failed')

    return {
      bookmarkRoundTrip: true,
      sessionRoundTrip: true,
      diagnosticReconnectRoundTrip,
      restoredPreviousSession: previousSession !== null
    }
  } finally {
    if (bookmarkCreated) {
      try { await requestRpc(ws, C.CMD_USERDATA_REMOVE_BOOKMARK, { url: bookmarkUrl }, args.requestTimeout) } catch {}
    }
    if (sessionTouched) {
      try { await requestRpc(ws, C.CMD_USERDATA_SAVE_SESSION, { state: previousSession || {} }, args.requestTimeout) } catch {}
    }
  }
}

async function runLocalStories (ws, args, options = {}) {
  const token = makeToken()
  const search = await runSearchStory(ws, args, token)
  const naming = await runNamingStory(ws, args, token)
  const library = await runLibraryStory(ws, args, token, options)
  return { token, search, naming, library }
}

async function runSiteStory (ws, args) {
  const token = makeToken()
  const siteName = `Release Smoke ${token.slice(-8)}`
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${siteName}</title>
</head>
<body>
  <main>
    <h1>${siteName}</h1>
    <p id="release-smoke-token">${token}</p>
  </main>
</body>
</html>`
  let siteId = null
  let publish = null

  try {
    const created = await requestRpc(ws, C.CMD_CREATE_SITE, { name: siteName }, args.requestTimeout)
    siteId = created?.siteId
    if (!siteId || !/^[0-9a-f]{16}$/i.test(siteId)) throw new Error('site story did not create a valid site id')
    if (!/^[0-9a-f]{64}$/i.test(created?.keyHex || '')) throw new Error('site story did not create a valid site key')

    const updated = await requestRpc(ws, C.CMD_UPDATE_SITE, {
      siteId,
      files: [
        { path: '/index.html', content: html },
        { path: '/style.css', content: 'body { font-family: sans-serif; }' }
      ]
    }, args.requestTimeout)
    if (!updated || (updated.updated !== 2 && updated.siteId !== siteId)) throw new Error('site story update failed')

    publish = await requestRpc(ws, C.CMD_PUBLISH_SITE, { siteId }, Math.max(args.requestTimeout, 70_000))
    if (publish?.siteId !== siteId) throw new Error('site story publish returned the wrong site id')
    if (!/^hyper:\/\/[0-9a-f]{64}$/i.test(publish?.url || '')) throw new Error(`site story publish returned invalid URL: ${publish?.url || '(missing)'}`)

    const sites = await requestRpc(ws, C.CMD_LIST_SITES, {}, args.requestTimeout)
    const listed = Array.isArray(sites) ? sites : []
    const row = listed.find((site) => site?.siteId === siteId)
    if (!row || row.published !== true) throw new Error('site story published site was not listed as published')

    const nav = await requestRpc(ws, C.CMD_NAVIGATE, { url: publish.url + '/' }, args.requestTimeout)
    const fetched = await fetchLocalUrl(nav.localUrl, args.fetchTimeout)
    if (!Number.isInteger(fetched.statusCode) || fetched.statusCode < 200 || fetched.statusCode >= 300) {
      throw new Error(`site story fetch returned HTTP ${fetched.statusCode}`)
    }
    if (!fetched.body.includes(token)) throw new Error('site story fetched page did not contain the release token')

    const deleted = await requestRpc(ws, C.CMD_DELETE_SITE, { siteId }, Math.max(args.requestTimeout, 30_000))
    siteId = null
    if (deleted?.ok !== true) throw new Error('site story cleanup did not delete the site')

    return {
      token,
      siteId: publish.siteId,
      keyHex: publish.keyHex || null,
      url: publish.url,
      localUrl: nav.localUrl,
      statusCode: fetched.statusCode,
      bytes: Buffer.byteLength(fetched.body),
      pin: publish.pin || null,
      cleanup: {
        deleted: true,
        unseed: deleted.unseed || null
      }
    }
  } finally {
    if (siteId) {
      try { await requestRpc(ws, C.CMD_DELETE_SITE, { siteId }, Math.max(args.requestTimeout, 30_000)) } catch {}
    }
  }
}

async function runDesktopGuiStories (ws, args, context) {
  const browse = await runBrowseStory(ws, args, context.homepage)
  const catalogue = runCatalogueStory(context.catalogResult)
  const latestAppWithoutDownload = await runSafeCatalogueAppOpenStory(ws, args, context.catalogResult)
  const featuredAppRegression = runFeaturedAppRegressionStory(context.catalogResult, latestAppWithoutDownload)
  const freshLaunch = await runFreshLaunchSourceContract()
  const nostrTrustedContact = await runNostrTrustedContactStory()
  const librarySession = context.localStories?.library
    ? {
        bookmarkRoundTrip: context.localStories.library.bookmarkRoundTrip === true,
        sessionRoundTrip: context.localStories.library.sessionRoundTrip === true,
        diagnosticReconnectRoundTrip: context.localStories.library.diagnosticReconnectRoundTrip === true,
        restoredPreviousSession: context.localStories.library.restoredPreviousSession === true
      }
    : null

  if (!librarySession?.bookmarkRoundTrip || !librarySession?.sessionRoundTrip || !librarySession?.diagnosticReconnectRoundTrip) {
    throw new Error('desktop GUI story mode requires library bookmark/session round-trip with diagnostic reconnect proof')
  }

  return {
    browse,
    freshLaunch,
    catalogue,
    latestAppWithoutDownload,
    featuredAppRegression,
    nostrTrustedContact,
    librarySession
  }
}

async function runBrowseStory (ws, args, homepage) {
  const nav = homepage?.nav
  const fetched = homepage?.fetched
  assertHomepage(nav, fetched, args.homepageUrl)
  const reloaded = await fetchLocalUrl(nav.localUrl, args.fetchTimeout)
  assertHomepage(nav, reloaded, args.homepageUrl)

  const info = await requestRpc(ws, C.CMD_GET_DRIVE_INFO, { url: args.homepageUrl }, args.requestTimeout)
  const keyHex = new URL(args.homepageUrl).hostname.toLowerCase()
  if (info?.keyHex !== keyHex) throw new Error(`browse story drive-info key mismatch: ${info?.keyHex || '(missing)'}`)
  if (typeof info.discoveryKey !== 'string' || !/^[0-9a-f]{64}$/i.test(info.discoveryKey)) {
    throw new Error('browse story drive-info missing discovery key')
  }

  return {
    url: args.homepageUrl,
    localUrl: nav.localUrl,
    statusCode: fetched.statusCode,
    reloadStatusCode: reloaded.statusCode,
    bytes: Buffer.byteLength(fetched.body),
    reloadBytes: Buffer.byteLength(reloaded.body),
    title: titleOf(fetched.body),
    driveInfo: {
      keyHex: info.keyHex,
      version: Number.isFinite(info.version) ? info.version : null,
      discoveryKey: info.discoveryKey,
      peerCount: Number.isFinite(info.peerCount) ? info.peerCount : 0,
      byteLength: Number.isFinite(info.byteLength) ? info.byteLength : 0,
      relay: info.relay || null
    }
  }
}

function runCatalogueStory (catalogResult) {
  const apps = Array.isArray(catalogResult?.apps) ? catalogResult.apps : []
  const catalogs = Array.isArray(catalogResult?.catalogs) ? catalogResult.catalogs : []
  const searches = {}

  for (const term of CATALOG_SEARCH_TERMS) {
    // Searchable = anything the catalogue UI can present an action for:
    // browsable link/drive OR a native-delivery row (including
    // migration-required apps like Peercord, which must NOT carry a link).
    const hits = apps.filter((app) => (app?.link || app?.driveKey || app?.nativeDelivery) && catalogAppSearchText(app).includes(term))
    if (hits.length === 0) throw new Error(`catalogue story search returned no results for ${term}`)
    const exact = hits.find((app) => sameNameOrId(app, term)) || hits[0]
    searches[term] = {
      results: hits.length,
      top: exact.name || exact.id || null,
      action: launchActionForApp(exact)
    }
  }

  return {
    catalogs: catalogs.map((catalog) => ({
      key: catalog.key || null,
      name: catalog.name || null,
      count: Number.isFinite(catalog.count) ? catalog.count : 0,
      source: catalog.source || null
    })),
    totalCatalogs: catalogs.length,
    totalApps: apps.length,
    runnableApps: apps.filter((app) => app?.link).length,
    featured: REQUIRED_FEATURED.map((name) => {
      const app = findAppByName(apps, name)
      if (!app) throw new Error(`catalogue story featured row missing: ${name}`)
      return {
        name: app.name,
        type: app.type || 'standalone',
        link: app.link || null,
        driveKey: app.driveKey || null,
        action: launchActionForApp(app),
        catalogName: app.catalogName || null
      }
    }),
    searches
  }
}

async function runSafeCatalogueAppOpenStory (ws, args, catalogResult) {
  const apps = Array.isArray(catalogResult?.apps) ? catalogResult.apps : []
  const candidates = apps
    .filter((app) => app && app.driveKey && isHyperDriveKey(app.driveKey))
    .filter((app) => {
      const categories = Array.isArray(app.categories) ? app.categories.map((c) => String(c).toLowerCase()) : []
      return categories.includes('featured') || sameNameOrId(app, 'peerit') || sameNameOrId(app, 'p2pbuilders')
    })
    .sort((a, b) => publishedTime(b) - publishedTime(a))

  const app = candidates.find((candidate) => sameNameOrId(candidate, 'peerit')) || candidates[0]
  if (!app) throw new Error('latest app story could not find a safe catalogue row with a Hyperdrive target')

  const url = hyperUrlForApp(app)
  const nav = await requestRpc(ws, C.CMD_NAVIGATE, { url }, args.requestTimeout)
  const fetched = await fetchLocalUrl(nav.localUrl, args.fetchTimeout)
  assertFetchedPage(`${app.name || app.id} catalogue row`, fetched)
  const info = await requestRpc(ws, C.CMD_GET_DRIVE_INFO, { url }, args.requestTimeout)
  if (info?.keyHex !== app.driveKey.toLowerCase()) throw new Error('latest app story drive-info key mismatch')

  return {
    name: app.name || app.id || app.driveKey,
    id: app.id || null,
    url,
    localUrl: nav.localUrl,
    statusCode: fetched.statusCode,
    bytes: Buffer.byteLength(fetched.body),
    title: titleOf(fetched.body),
    driveKey: app.driveKey.toLowerCase(),
    type: app.type || null,
    catalogName: app.catalogName || null,
    publishedAt: app.publishedAt || null,
    action: 'open-in-browse',
    driveInfo: {
      version: Number.isFinite(info.version) ? info.version : null,
      peerCount: Number.isFinite(info.peerCount) ? info.peerCount : 0,
      byteLength: Number.isFinite(info.byteLength) ? info.byteLength : 0
    }
  }
}

function runFeaturedAppRegressionStory (catalogResult, safeOpen) {
  const apps = Array.isArray(catalogResult?.apps) ? catalogResult.apps : []
  const migrationRequired = REQUIRED_FEATURED
    .map((name) => findAppByName(apps, name))
    .filter(Boolean)
    .filter((app) => app.nativeDelivery?.status === 'migration-required')
    .map((app) => ({
      name: app.name || app.id,
      legacyMigrationId: app.legacyMigrationId || null,
      nativeDelivery: app.nativeDelivery,
      action: launchActionForApp(app)
    }))

  if (!migrationRequired.some((app) => sameNameOrId(app, 'keet'))) {
    throw new Error('featured app regression story could not verify Keet migration state')
  }
  for (const app of migrationRequired) {
    if (app.action.primary !== 'migration-required' || !app.legacyMigrationId) {
      throw new Error(`featured app regression migration state mismatch for ${app.name}`)
    }
  }

  return {
    safeOpenedFeaturedApp: {
      name: safeOpen.name,
      url: safeOpen.url,
      statusCode: safeOpen.statusCode,
      bytes: safeOpen.bytes,
      action: safeOpen.action
    },
    migrationRequired,
    automationScope: 'safe featured Hyperdrive open plus non-executable native migration-state validation; no third-party code execution'
  }
}

async function runFreshLaunchSourceContract () {
  const shell = await readFile(new URL('../ui/shell.js', import.meta.url), 'utf8')
  const startupBlock = shell.match(/const STARTUP_TABS = \[([\s\S]*?)\]/)?.[1] || ''
  if (!startupBlock) throw new Error('fresh-launch story could not find STARTUP_TABS')
  const defaultIdx = startupBlock.indexOf('DEFAULT_URL')
  const buildersIdx = startupBlock.indexOf('P2PBUILDERS_URL')
  const peeritIdx = startupBlock.indexOf('PEERIT_URL')
  if (defaultIdx === -1 || buildersIdx === -1 || peeritIdx === -1) {
    throw new Error('fresh-launch story startup tabs are missing the landing, P2P Builders, or peerit tab')
  }
  if (!(defaultIdx < buildersIdx && buildersIdx < peeritIdx)) {
    throw new Error('fresh-launch story startup tabs are not in the expected order')
  }
  if (!/restoreStartupTabs\(savedTabs, STARTUP_TABS\)/.test(shell)) {
    throw new Error('fresh-launch story session restore does not preserve startup defaults')
  }
  if (!/a\.driveKey === PEERIT_DRIVE_KEY \? 0/.test(shell)) {
    throw new Error('fresh-launch story Sites discovery does not pin peerit first')
  }

  return {
    frontTab: DEFAULT_HOMEPAGE_URL,
    startupTabs: [DEFAULT_HOMEPAGE_URL, P2PBUILDERS_URL, PEERIT_URL],
    peeritUrl: PEERIT_URL,
    restoreKeepsStartupDefaults: true,
    sitesDiscoveryPinsPeeritFirst: true,
    proof: 'ui/shell.js STARTUP_TABS, restoreStartupTabs, and Sites rank contract'
  }
}

async function runNostrTrustedContactStory () {
  const crypto = require('hypercore-crypto')
  const b4a = require('b4a')
  const secp = require('../backend/secp256k1-bundle.cjs')
  const nb = require('../backend/nostr-bind.cjs')
  const { FederatedNostrFeed } = require('../backend/federated-nostr-feed.cjs')

  const token = makeToken()
  const hex = (buf) => b4a.toString(buf, 'hex')
  const rootSigner = (keyPair) => (msg) => hex(crypto.sign(b4a.from(msg, 'utf-8'), keyPair.secretKey))
  const nostrSigner = (skHex) => (msg32Hex) => secp.schnorrSign(msg32Hex, skHex)
  const nostrPubkey = (skHex) => secp.schnorrGetPublicKey(skHex)
  const makeEvent = (skHex, content) => secp.nip01Sign({
    pubkey: nostrPubkey(skHex),
    created_at: 1700000000,
    kind: 1,
    tags: [],
    content
  }, skHex)

  const trustedRoot = crypto.keyPair()
  const revokedRoot = crypto.keyPair()
  const trustedRootHex = hex(trustedRoot.publicKey)
  const revokedRootHex = hex(revokedRoot.publicKey)
  const trustedSk = '11'.repeat(32)
  const revokedSk = '22'.repeat(32)
  const forgedSk = '33'.repeat(32)
  const trustedBind = nb.makeNostrBind({
    rootPubkey: trustedRootHex,
    nostrPubkey: nostrPubkey(trustedSk),
    epoch: 1
  }, rootSigner(trustedRoot), nostrSigner(trustedSk))
  const revokedBind = nb.makeNostrBind({
    rootPubkey: revokedRootHex,
    nostrPubkey: nostrPubkey(revokedSk),
    epoch: 1
  }, rootSigner(revokedRoot), nostrSigner(revokedSk))
  const revokedRecord = nb.makeNostrRevoke({
    rootPubkey: revokedRootHex,
    nostrPubkey: nostrPubkey(revokedSk),
    epoch: 1
  }, rootSigner(revokedRoot))

  const trustedEventKey = 'aa'.repeat(32)
  const revokedEventKey = 'bb'.repeat(32)
  const bindings = new Map([
    [trustedRootHex.toLowerCase(), { nostrEventKey: trustedEventKey, nostrBind: trustedBind, nostrRevocations: [] }],
    [revokedRootHex.toLowerCase(), { nostrEventKey: revokedEventKey, nostrBind: revokedBind, nostrRevocations: [revokedRecord] }]
  ])
  const trustedContent = `trusted contact ${token}`
  const revokedContent = `revoked contact ${token}`
  const forgedContent = `forged contact ${token}`
  const eventStores = new Map([
    [trustedEventKey, [makeEvent(trustedSk, trustedContent), makeEvent(forgedSk, forgedContent)]],
    [revokedEventKey, [makeEvent(revokedSk, revokedContent)]]
  ])

  const feed = new FederatedNostrFeed({
    listContacts: async () => [
      { pubkey: trustedRootHex, displayName: 'Trusted Alice', verifiedAt: 1, bindingKey: '01'.repeat(32) },
      { pubkey: revokedRootHex, displayName: 'Revoked Bob', verifiedAt: 1, bindingKey: '02'.repeat(32) }
    ],
    resolveBinding: async ({ contactPubkey }) => bindings.get(String(contactPubkey || '').toLowerCase()) || null,
    openEventStore: async (eventKey) => ({ listEvents: async () => eventStores.get(eventKey) || [] }),
    now: () => 1700000000,
    stepTimeoutMs: 100
  })

  const result = await feed.eventsWithDiagnostics()
  const visible = Array.isArray(result.events) ? result.events : []
  if (visible.length !== 1 || visible[0].content !== trustedContent || visible[0]._via !== 'Trusted Alice') {
    throw new Error('Nostr trusted-contact story did not expose only the attested contact event')
  }
  const hidden = result.hidden || {}
  if (!Number.isFinite(hidden.quarantined) || hidden.quarantined < 2) {
    throw new Error('Nostr trusted-contact story did not quarantine revoked/forged events')
  }

  return {
    token,
    visibleEvents: visible.length,
    trustedVia: visible[0]._via,
    hidden: {
      contactsEligible: hidden.contactsEligible || 0,
      bindingUntrusted: hidden.bindingUntrusted || 0,
      quarantined: hidden.quarantined || 0,
      dropped: hidden.dropped || 0,
      byReason: hidden.byReason || {}
    }
  }
}

function findAppByName (apps, name) {
  return apps.find((app) => sameNameOrId(app, name))
}

function sameNameOrId (app, value) {
  const target = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const names = [app?.name, app?.id].map((item) => String(item || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
  return names.includes(target)
}

function launchActionForApp (app) {
  const link = String(app?.link || '').trim()
  const driveKey = String(app?.driveKey || '').trim().toLowerCase()
  const hasDrive = isHyperDriveKey(driveKey)
  if (app?.nativeDelivery?.status === 'migration-required') {
    return {
      primary: 'migration-required',
      openPage: false,
      runInTab: false,
      reason: 'verified native v3 package required'
    }
  }
  if (/^hyper:\/\//i.test(link) || hasDrive) {
    return {
      primary: 'open-in-browse',
      openPage: true,
      runInTab: false,
      reason: 'Hyperdrive page opens through Browse'
    }
  }
  return {
    primary: 'unsupported',
    openPage: false,
    runInTab: false,
    reason: 'no launchable link or drive key'
  }
}

function hyperUrlForApp (app) {
  const link = String(app?.link || '').trim()
  if (/^hyper:\/\/[0-9a-f]{64}(?:\/|$)/i.test(link)) return link.endsWith('/') ? link : `${link}/`
  const key = String(app?.driveKey || '').trim().toLowerCase()
  if (!isHyperDriveKey(key)) throw new Error(`app ${app?.name || app?.id || '(unknown)'} has no Hyperdrive URL`)
  return `hyper://${key}/`
}

function isHyperDriveKey (value) {
  return /^[0-9a-f]{64}$/i.test(String(value || ''))
}

function publishedTime (app) {
  const value = app?.publishedAt
  if (Number.isFinite(value)) return value
  const t = Date.parse(String(value || ''))
  return Number.isFinite(t) ? t : 0
}

function assertFetchedPage (label, fetched) {
  if (!Number.isInteger(fetched?.statusCode) || fetched.statusCode < 200 || fetched.statusCode >= 300) {
    throw new Error(`${label} fetch returned HTTP ${fetched?.statusCode}`)
  }
  if (Buffer.byteLength(String(fetched.body || '')) < 100) {
    throw new Error(`${label} fetch returned an unexpectedly small body`)
  }
}

function buildReleaseEvidence (result) {
  const rows = []
  const desktop = result.desktopGuiStories || null
  const add = (gate, evidence) => {
    if (!evidence) return
    rows.push({
      section: RELEASE_EVIDENCE_SECTION,
      gate,
      result: 'PASS',
      evidence: evidenceCell(evidence)
    })
  }

  if (desktop?.browse) {
    add('Browse story', `release RPC desktop-gui smoke: ${shortHyper(desktop.browse.url)} fetched HTTP ${desktop.browse.statusCode} ${desktop.browse.bytes} bytes, reload HTTP ${desktop.browse.reloadStatusCode}, site info key ${shortKey(desktop.browse.driveInfo.keyHex)} version ${desktop.browse.driveInfo.version}`)
  }
  if (desktop?.freshLaunch) {
    add('Fresh-launch landing story', `release RPC desktop-gui smoke source contract: front tab ${shortHyper(desktop.freshLaunch.frontTab)}, startup tabs include P2P Builders and peerit, restoreStartupTabs keeps defaults, Sites discovery pins peerit first`)
  }
  if (desktop?.catalogue) {
    add('Catalogue story', `release RPC desktop-gui smoke: ${desktop.catalogue.totalCatalogs} catalogues, ${desktop.catalogue.totalApps} apps, featured ${desktop.catalogue.featured.map((app) => app.name).join(', ')}, searches ${CATALOG_SEARCH_TERMS.join(', ')} all returned launchable rows`)
  }
  if (desktop?.latestAppWithoutDownload) {
    add('Latest-app-without-download story', `release RPC desktop-gui smoke: opened ${desktop.latestAppWithoutDownload.name} from catalogue row via Browse at ${shortHyper(desktop.latestAppWithoutDownload.url)}, HTTP ${desktop.latestAppWithoutDownload.statusCode} ${desktop.latestAppWithoutDownload.bytes} bytes, no project page download or manual update`)
  }
  if (desktop?.featuredAppRegression) {
    add('Existing featured app regression', `release RPC desktop-gui smoke: safe featured app ${desktop.featuredAppRegression.safeOpenedFeaturedApp.name} opened via Browse HTTP ${desktop.featuredAppRegression.safeOpenedFeaturedApp.statusCode}; legacy native records ${desktop.featuredAppRegression.migrationRequired.map((app) => app.name).join(', ')} require verified packages and no code execution was automated`)
  }
  if (desktop?.nostrTrustedContact) {
    add('Nostr trusted-contact story', `release RPC desktop-gui smoke: Nostr trust proof exposed ${desktop.nostrTrustedContact.visibleEvents} attested contact event via ${desktop.nostrTrustedContact.trustedVia} and quarantined ${desktop.nostrTrustedContact.hidden.quarantined} revoked or forged event(s)`)
  }
  if (desktop?.librarySession) {
    add('Library/session story', `release RPC desktop-gui smoke: bookmark and session round-tripped through user-data Hyperbee and persisted across diagnostic reconnect before cleanup; previous session restored=${desktop.librarySession.restoredPreviousSession}`)
  }

  if (result.localStories?.search) {
    add('Search story', `release RPC local-story smoke: indexed token ${result.localStories.token}, returned doc ${result.localStories.search.docId} as ${result.localStories.search.phase} with federating=${result.localStories.search.federating}`)
  }
  if (result.localStories?.naming) {
    add('Naming story', `release RPC local-story smoke: curated ${result.localStories.naming.curated.name} provenance ${result.localStories.naming.curated.provenance}, temporary petname ${result.localStories.naming.petname.name} provenance ${result.localStories.naming.petname.provenance}, naming flag restored=${result.localStories.naming.restoredExperimentalNaming}`)
  }
  if (result.siteStory) {
    add('Site publishing story', `release RPC site-story smoke: published ${shortHyper(result.siteStory.url)}, fetched HTTP ${result.siteStory.statusCode} ${result.siteStory.bytes} bytes, deleted site and requested unseed cleanup`)
  }

  return {
    kind: 'pearbrowser-release-rpc-story-smoke-evidence',
    generatedAt: new Date().toISOString(),
    rows
  }
}

function evidenceCell (value) {
  return String(value || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim()
}

function shortKey (key) {
  const s = String(key || '')
  return s.length > 16 ? `${s.slice(0, 8)}...${s.slice(-6)}` : s
}

function shortHyper (url) {
  try {
    const parsed = new URL(String(url || ''))
    if (parsed.protocol === 'hyper:') return `hyper://${shortKey(parsed.hostname)}/`
  } catch {}
  return String(url || '')
}

async function run (args) {
  const conn = await connectReady(args)
  const ws = conn.ws
  try {
    const nav = await requestRpc(ws, C.CMD_NAVIGATE, { url: args.homepageUrl }, args.requestTimeout)
    const fetched = await fetchLocalUrl(nav.localUrl, args.fetchTimeout)
    assertHomepage(nav, fetched, args.homepageUrl)

    const loaded = []
    for (const keyHex of args.catalogs) {
      const data = await requestRpc(ws, C.CMD_LOAD_CATALOG_BEE, { keyHex }, args.requestTimeout)
      loaded.push({ keyHex, name: data?.name || null, apps: Array.isArray(data?.apps) ? data.apps.length : 0 })
    }

    const catalogResult = await requestRpc(ws, C.CMD_GET_CATALOG_APPS, {}, args.requestTimeout)
    const catalog = assertCatalogues(catalogResult)
    const localStories = args.localStories
      ? await runLocalStories(ws, args, { reconnectUrl: args.desktopGuiStories ? conn.url : null })
      : null
    const siteStory = args.siteStory ? await runSiteStory(ws, args) : null
    const result = {
      ok: true,
      port: conn.port,
      status: conn.status,
      homepage: {
        url: args.homepageUrl,
        localUrl: nav.localUrl,
        statusCode: fetched.statusCode,
        bytes: Buffer.byteLength(fetched.body),
        title: titleOf(fetched.body)
      },
      loadedCatalogues: loaded,
      catalog,
      localStories,
      siteStory,
      desktopGuiStories: null,
      releaseEvidence: null
    }

    if (args.desktopGuiStories) {
      result.desktopGuiStories = await runDesktopGuiStories(ws, args, {
        homepage: { nav, fetched },
        catalogResult,
        localStories
      })
    }
    result.releaseEvidence = buildReleaseEvidence(result)
    return result
  } finally {
    try { ws.close() } catch {}
  }
}

function printHuman (result) {
  console.log('Release RPC story smoke passed')
  console.log(`  rpcPort: ${result.port}`)
  console.log(`  proxyPort: ${result.status.proxyPort}`)
  console.log(`  homepage: HTTP ${result.homepage.statusCode}, ${result.homepage.bytes} bytes${result.homepage.title ? `, "${result.homepage.title}"` : ''}`)
  console.log(`  catalogues: ${result.catalog.catalogs} loaded, ${result.catalog.apps} aggregated apps`)
  console.log(`  featured: ${result.catalog.featured.map((app) => app.name).join(', ')}`)
  console.log(`  Peercord: ${result.catalog.peercord.runMode}, ${result.catalog.peercord.legacyMigrationId}`)
  if (result.localStories) {
    console.log(`  local search: ${result.localStories.search.results} result(s), doc ${result.localStories.search.docId}`)
    console.log(`  naming: ${result.localStories.naming.curated.name} curated + ${result.localStories.naming.petname.name} petname`)
    console.log(`  library: bookmark/session round-trip passed`)
  }
  if (result.siteStory) {
    console.log(`  site publish: ${result.siteStory.url}, HTTP ${result.siteStory.statusCode}, cleanup deleted`)
  }
  if (result.desktopGuiStories) {
    console.log(`  desktop GUI stories: browse reload, fresh-launch contract, catalogue search, safe app open, Nostr trust, library reconnect passed`)
    console.log(`  release evidence rows: ${result.releaseEvidence?.rows?.length || 0}`)
  }
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  try {
    const result = await run(args)
    if (args.json) console.log(JSON.stringify(result))
    else printHuman(result)
  } catch (err) {
    const output = { ok: false, error: err.message, last: err.last || null }
    if (args.json) console.log(JSON.stringify(output))
    else {
      console.error('Release RPC story smoke failed')
      console.error(`  ${err.message}`)
      if (err.last) console.error(`  last: ${JSON.stringify(err.last)}`)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err.stack || err.message)
  process.exit(1)
})
