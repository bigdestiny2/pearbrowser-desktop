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
 */

import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import http from 'node:http'
import net from 'node:net'
import { randomBytes } from 'node:crypto'

const require = createRequire(import.meta.url)
const C = require('../backend/constants.js')

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT_BASE = 9876
const DEFAULT_PORT_COUNT = 5
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_CONNECT_MS = 1_500
const DEFAULT_REQUEST_MS = 20_000
const DEFAULT_FETCH_MS = 20_000
const DEFAULT_HOMEPAGE_URL = 'hyper://03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f/'
const DEFAULT_CATALOGS = [
  'f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d',
  '5d961fdc2f56215463e5d4656dd4a3f22bb5e15b93f9bfc8439a63a18f974d75'
]
const REQUIRED_FEATURED = ['Keet', 'PearPass', 'anonGPT', 'Paste', 'Peercord']
const PEERCORD_LINK = 'pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy'

function parseArgs (argv) {
  const args = {
    host: DEFAULT_HOST,
    portBase: DEFAULT_PORT_BASE,
    portCount: DEFAULT_PORT_COUNT,
    timeout: DEFAULT_TIMEOUT_MS,
    connectTimeout: DEFAULT_CONNECT_MS,
    requestTimeout: DEFAULT_REQUEST_MS,
    fetchTimeout: DEFAULT_FETCH_MS,
    homepageUrl: DEFAULT_HOMEPAGE_URL,
    catalogs: [...DEFAULT_CATALOGS],
    localStories: false,
    siteStory: false,
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
    else if (arg === '--homepage-url') args.homepageUrl = parseHyperUrl(argv[++i], '--homepage-url')
    else if (arg === '--catalog') args.catalogs.push(parseHexKey(argv[++i], '--catalog'))
    else if (arg === '--only-catalog') args.catalogs = [parseHexKey(argv[++i], '--only-catalog')]
    else if (arg === '--local-stories') args.localStories = true
    else if (arg === '--site-story') args.siteStory = true
    else if (arg === '--json') args.json = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown option: ${arg}`)
  }

  return args
}

function usage (code, msg = '') {
  if (msg) console.error('error:', msg)
  console.error('usage: node scripts/release-rpc-story-smoke.mjs [--timeout 30000] [--port-base 9876] [--catalog <64-hex>] [--homepage-url hyper://...] [--local-stories] [--site-story] [--json]')
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
      const url = `ws://${args.host}:${port}/status-smoke`
      let ws = null
      try {
        ws = await connect(url, Math.min(args.connectTimeout, remain))
        const status = await requestRpc(ws, C.CMD_GET_STATUS, {}, Math.min(args.requestTimeout, remain))
        const errors = validateStatus(status)
        if (errors.length === 0) return { ws, port, url, status }
        last = { port, url, status, errors }
        ws.close()
      } catch (err) {
        last = { port, url, error: err.message }
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
  if (peercord.type !== 'standalone') throw new Error(`Peercord type mismatch: expected standalone, got ${peercord.type || '(missing)'}`)
  if (peercord.link !== PEERCORD_LINK) throw new Error(`Peercord link mismatch: ${peercord.link || '(missing)'}`)
  if (peercord.driveKey) throw new Error('Peercord unexpectedly has a driveKey; standalone pear:// apps should launch in a window')

  return {
    catalogs: catalogs.length,
    apps: apps.length,
    featured,
    peercord: {
      type: peercord.type,
      link: peercord.link,
      sourceUrl: peercord.sourceUrl || null,
      license: peercord.license || null,
      runMode: 'window'
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
    hitTitle: hit.title || null
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

async function runLibraryStory (ws, args, token) {
  const bookmarkUrl = `${args.homepageUrl}?release-smoke=${token}`
  const bookmarkTitle = `Release Smoke Bookmark ${token}`
  const beforeSession = await requestRpc(ws, C.CMD_USERDATA_GET_SESSION, {}, args.requestTimeout)
  const previousSession = beforeSession?.session ?? null
  let bookmarkCreated = false
  let sessionTouched = false

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

    await requestRpc(ws, C.CMD_USERDATA_REMOVE_BOOKMARK, { url: bookmarkUrl }, args.requestTimeout)
    bookmarkCreated = false
    const afterRemove = await requestRpc(ws, C.CMD_USERDATA_LIST_BOOKMARKS, {}, args.requestTimeout)
    const remaining = Array.isArray(afterRemove?.bookmarks) ? afterRemove.bookmarks : []
    if (remaining.some((b) => b?.url === bookmarkUrl)) throw new Error('library story bookmark cleanup failed')

    return {
      bookmarkRoundTrip: true,
      sessionRoundTrip: true,
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

async function runLocalStories (ws, args) {
  const token = makeToken()
  const search = await runSearchStory(ws, args, token)
  const naming = await runNamingStory(ws, args, token)
  const library = await runLibraryStory(ws, args, token)
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
    const localStories = args.localStories ? await runLocalStories(ws, args) : null
    const siteStory = args.siteStory ? await runSiteStory(ws, args) : null

    return {
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
      siteStory
    }
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
  console.log(`  Peercord: ${result.catalog.peercord.type}, ${result.catalog.peercord.runMode}, ${result.catalog.peercord.link}`)
  if (result.localStories) {
    console.log(`  local search: ${result.localStories.search.results} result(s), doc ${result.localStories.search.docId}`)
    console.log(`  naming: ${result.localStories.naming.curated.name} curated + ${result.localStories.naming.petname.name} petname`)
    console.log(`  library: bookmark/session round-trip passed`)
  }
  if (result.siteStory) {
    console.log(`  site publish: ${result.siteStory.url}, HTTP ${result.siteStory.statusCode}, cleanup deleted`)
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
