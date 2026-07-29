/**
 * Tab Runtime — the "run in a tab" path.
 *
 * Lets a Pear app render HEADLESS inside a browser tab instead of spawning its
 * own window. The app is a `pear-request` worker (htmx frontend + a route
 * handler "server"): the tab's XMLHttpRequest is hooked to a streamx, so htmx
 * thinks it's talking to an HTTP server while the bytes actually flow over a
 * pipe to a headless worker. See examples/headless-tab for the standalone proof.
 *
 * CREDIT: this run-in-a-tab pattern is from Drache93's Pear Browser
 * (https://github.com/Drache93/pear-browser) and his `pear-request` library
 * (https://github.com/Drache93/pear-request, npm: pear-request) — Pear.worker
 * + htmx-over-a-pipe. Drache93 runs the worker + XHR hook directly in the
 * renderer and renders inline; we instead bridge it over bare-ws into an
 * ISOLATED iframe tab (per-app isolation), driven by our Bare backend.
 *
 * Two transports meet here:
 *   - a bare-http1 server serves the tiny wrapper page + htmx + the injected
 *     pear-request client (everything else streams from the worker)
 *   - a bare-ws server bridges each tab's WebSocket <-> the worker's duplex pipe
 *
 * The only worker is the in-process demo router. This runtime is a local UI
 * proof surface, never an application loader: native app code must arrive in a
 * verified package outside the browser process.
 */
const http = require('bare-http1')
const ws = require('bare-ws')
const hypercoreCrypto = require('hypercore-crypto')
const b4a = require('b4a')
const { PAGE_CONTEXT_SHIM, pageContextMeta } = require('./page-context-bridge.cjs')
const router = require('./tab-assets/router.cjs')   // { PearRequestRouter, registerRoutes }
const assets = require('./tab-assets/assets.js')     // { wrapper, htmx, client } inline strings

const WS_PORT_BASE = 9886
const WS_PORT_COUNT = 12

function listenWsServer (port, onSocket) {
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

class TabRuntime {
  constructor (opts = {}) {
    this.tabs = new Map()               // tabId -> { source }
    this._seq = 0
    this.httpPort = 0
    this.wsPort = 0
  }

  async start () {
    this._wrapper = assets.wrapper
    this._assets = {
      '/htmx.min.js': { body: assets.htmx, type: 'text/javascript' },
      '/pear-request-client.bundle.js': { body: assets.client, type: 'text/javascript' }
    }

    this._http = http.createServer((req, res) => this._serve(req, res))
    this.httpPort = await new Promise((resolve, reject) => {
      this._http.on('error', reject)
      this._http.listen(0, '127.0.0.1', () => resolve(this._http.address().port))
    })

    for (let p = WS_PORT_BASE; p < WS_PORT_BASE + WS_PORT_COUNT; p++) {
      try {
        this._ws = await listenWsServer(p, (sock) => this._onSocket(sock))
        this.wsPort = p
        break
      } catch (err) {
        if (err && err.code === 'EADDRINUSE') continue
        throw err
      }
    }
    if (!this._ws) throw new Error('TabRuntime: no free WS port in range')
    // A stable demo tab so the headless run-in-tab path is reachable without UI
    // (GET /tab/demo) — the in-process router; the "Headless Demo" card opens it.
    this.tabs.set('demo', { source: 'demo' })
    console.log(`[tab-runtime] http :${this.httpPort}  ws :${this.wsPort}  (demo: /tab/demo)`)
    return { httpPort: this.httpPort, wsPort: this.wsPort }
  }

  // Register a tab and return the wrapper URL the UI should load in an iframe.
  open (source = 'demo') {
    if (source !== 'demo') throw new Error('Only the in-process demo is available in a browser tab')
    const tabId = 'tab' + (++this._seq)
    const tab = { source, contextToken: this._newContextToken() }
    this.tabs.set(tabId, tab)
    return {
      tabId,
      url: `http://127.0.0.1:${this.httpPort}/tab/${tabId}?ws=${this.wsPort}`,
      contextToken: tab.contextToken
    }
  }

  contextTokenForUrl (url) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1') return null
      if (Number(parsed.port) !== this.httpPort) return null
      const match = parsed.pathname.match(/^\/tab\/([a-zA-Z0-9_-]+)$/)
      if (!match) return null
      const tab = this.tabs.get(match[1])
      if (!tab) return null
      if (!tab.contextToken) tab.contextToken = this._newContextToken()
      return tab.contextToken
    } catch {
      return null
    }
  }

  _newContextToken () {
    return b4a.toString(hypercoreCrypto.randomBytes(32), 'hex')
  }

  _serve (req, res) {
    const u = (req.url || '/').split('?')[0]
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (u.startsWith('/tab/')) {
      const tabId = u.slice('/tab/'.length)
      const tab = this.tabs.get(tabId)
      if (!tab) { res.statusCode = 404; return res.end('unknown tab') }
      if (!tab.contextToken) tab.contextToken = this._newContextToken()
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      const contextHead = pageContextMeta(tab.contextToken) + PAGE_CONTEXT_SHIM
      return res.end(this._wrapper.replace('<head>', `<head>${contextHead}`))
    }
    const asset = this._assets[u]
    if (asset) { res.setHeader('Content-Type', asset.type); return res.end(asset.body) }
    res.statusCode = 404
    res.end('not found')
  }

  // Each tab opens one WebSocket. Its FIRST frame is the tabId (bare-ws gives no
  // request URL); every frame after that is pear-request wire bytes for the worker.
  _onSocket (sock) {
    let worker = null
    sock.on('data', (data) => {
      if (!worker) {
        const tabId = data.toString().trim()
        const tab = this.tabs.get(tabId)
        if (!tab) { try { sock.end() } catch {} ; return }
        try {
          worker = this._spawnInProc(sock)
        } catch (err) {
          console.error('[tab-runtime] spawn failed:', err && err.message)
          try { sock.end() } catch {}
        }
        return
      }
      worker.toWorker(data) // browser -> worker request bytes
    })
    sock.on('close', () => { if (worker) worker.close() })
    sock.on('error', () => { if (worker) worker.close() })
  }

  // Demo: host the pear-request router in-process. The worker pipe just writes
  // responses straight back out the same WebSocket.
  _spawnInProc (sock) {
    const workerPipe = {
      write: (buf) => { try { sock.write(buf) } catch {} ; return true },
      once: (ev, cb) => { if (ev === 'drain') queueMicrotask(cb) }
    }
    const r = new router.PearRequestRouter(workerPipe)
    router.registerRoutes(r, { label: 'in-proc worker (pearbrowser backend)' })
    return {
      toWorker: (data) => { try { r.processMessage(data) } catch (e) { console.error('[tab-runtime] router:', e && e.message) } },
      close: () => {}
    }
  }

  async stop () {
    try { this._ws && this._ws.close() } catch {}
    try { this._http && this._http.close() } catch {}
    this.tabs.clear()
  }
}

module.exports = { TabRuntime }
