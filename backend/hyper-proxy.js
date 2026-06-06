/**
 * Hyper Proxy — Local HTTP server bridging WebView to Hyperdrives
 *
 * URL mapping:
 *   localhost:PORT/hyper/KEY/path → fetches from Hyperdrive
 *   localhost:PORT/app/APP_ID/path → fetches from installed app's drive
 *
 * Injects <base> tags for relative link resolution in HTML.
 */

const http = require('bare-http1')
const crypto = require('bare-crypto')

const USER_FRIENDLY_ERRORS = {
  'Invalid drive key': 'This link appears to be broken or incomplete',
  'Invalid drive key format': 'The address you entered is not valid',
  'File not found': 'The page you\'re looking for doesn\'t exist on this site',
  'Timeout': 'Taking longer than expected. The site may be offline or unreachable.',
  'Drive not found': 'This site is currently unavailable. The owner may have taken it offline.',
  'Failed to open drive': 'Could not connect to this site. It may be offline.',
  'Failed to open app drive': 'Could not load this app. It may be corrupted or unavailable.',
  'Failed to open catalog drive': 'Could not load the app store. The catalog may be unavailable.',
  'Hybrid fetch failed': 'Unable to load content. Check your connection and try again.',
  'No catalog.json found': 'This app store is empty or not properly configured.',
  'Invalid origin': 'Security error: Access denied',
  'Buffer exceeded': 'The response was too large to process',
  'Operation too large': 'This action is too large to complete',
}

function getUserFriendlyError(technicalError) {
  for (const [key, message] of Object.entries(USER_FRIENDLY_ERRORS)) {
    if (technicalError.includes(key)) {
      return message
    }
  }
  return 'Something went wrong. Please try again.'
}

function isLoopbackOrigin (origin) {
  if (typeof origin !== 'string') return false
  try {
    const parsed = new URL(origin)
    return parsed.protocol === 'http:' &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
  } catch {
    return false
  }
}

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8'
}

function guessType (path) {
  // Extract extension safely
  const lastDot = path.lastIndexOf('.')
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (lastDot <= lastSlash) return 'application/octet-stream'
  const ext = path.slice(lastDot + 1).toLowerCase()
  return CONTENT_TYPES[ext] || 'application/octet-stream'
}

// Validate drive key format (64 hex characters)
function isValidDriveKey (keyHex) {
  return typeof keyHex === 'string' && /^[0-9a-f]{64}$/i.test(keyHex)
}

// Escape HTML entities to prevent XSS
function escapeHtml (str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
}

class HyperProxy {
  constructor (getDrive, onError, relayClient) {
    this._getDrive = getDrive // async (keyHex) => Hyperdrive
    this._onError = onError || (() => {})
    this._relay = relayClient || null // RelayClient for fast-path
    this._httpBridge = null // HttpBridge for direct WebView API
    this._server = null
    this._port = 0
    this._stats = { relayHits: 0, p2pHits: 0, total: 0 }
    this._inFlight = new Map() // key -> Promise

    // LRU content cache
    this._cache = new Map() // Simple LRU implementation
    this._cacheMaxSize = 50 * 1024 * 1024 // 50MB
    this._cacheCurrentSize = 0
    this._cacheStats = { hits: 0, misses: 0 }
    this._apiTokens = new Map() // token -> { driveKeyHex, issuedAt }
    this._apiTokenTtlMs = 10 * 60 * 1000 // 10 minutes
    /**
     * String injected into the <head> of every served text/html response,
     * exposing window.pear.swarm.v1 to pages. Set by setPearSwarmShim();
     * empty by default so older PearBrowsers gracefully omit it.
     */
    this._pearSwarmShim = ''
    /**
     * Page-side anonGPT shim, plus the gate key it's allowed to be
     * injected for. The shim is only emitted into HTML responses when
     * the loaded drive's hex key equals this._anongptDriveKey AND the
     * drive's manifest.json declares the required privacy claims.
     * See setAnongptShim() / setAnongptDriveKey() and the manifest
     * cache below. Everything else gets only the swarm.v1 shim.
     */
    this._anongptShim = ''
    this._anongptDriveKey = ''
    // Cache of validated manifest results per drive key:
    //   Map<driveKeyHex, { ok: boolean, reason?: string, checkedAt: number }>
    // TTL is small because a publisher pushing a new release should
    // see the gate re-check; we cache for 60s to avoid hammering the
    // drive on every HTML response.
    this._anongptManifestCache = new Map()
    this._anongptManifestTtlMs = 60 * 1000
  }

  setHttpBridge (bridge) {
    this._httpBridge = bridge
  }

  /**
   * Provide the page-side window.pear.swarm.v1 shim (a string of HTML/JS
   * that gets concatenated into every served HTML response's <head>).
   * Called once at boot from index.js with PEAR_SWARM_V1_SHIM. Setting
   * this to the empty string disables the surface; pages will no longer
   * see window.pear.swarm.
   */
  setPearSwarmShim (shimHtml) {
    this._pearSwarmShim = String(shimHtml || '')
  }

  /**
   * Set the page-side window.pear.anongpt shim string. Empty string
   * disables the surface entirely (any drive — including the anonGPT
   * drive — gets no anongpt API).
   */
  setAnongptShim (shimHtml) {
    this._anongptShim = String(shimHtml || '')
  }

  /**
   * Set the single Hyperdrive hex key allowed to receive the anonGPT
   * shim. See backend/constants.js ANONGPT_DRIVE_KEY. Any other drive
   * will not see window.pear.anongpt regardless of what its
   * manifest.json claims.
   */
  setAnongptDriveKey (driveKeyHex) {
    this._anongptDriveKey = typeof driveKeyHex === 'string' ? driveKeyHex.toLowerCase() : ''
  }

  /**
   * Returns true if the loaded drive is allowed to host the anongpt
   * shim AND its manifest.json declares the four required privacy
   * claims per anongpt/docs/spec/02-pearbrowser-dev-bridge.md §4. False
   * otherwise — including when the gate key isn't set, the drive
   * doesn't match, the manifest is missing, malformed, or doesn't
   * declare the claims. Cached per-drive for _anongptManifestTtlMs.
   *
   * The validation is intentionally strict: a missing field is treated
   * as a failed check, not as "default to allow". Privacy contract is
   * fail-closed by default.
   */
  async _shouldInjectAnongptShim (driveKeyHex) {
    if (!this._anongptShim) return false
    if (!this._anongptDriveKey) return false
    if (typeof driveKeyHex !== 'string') return false
    if (driveKeyHex.toLowerCase() !== this._anongptDriveKey) return false

    const cached = this._anongptManifestCache.get(driveKeyHex.toLowerCase())
    if (cached && (Date.now() - cached.checkedAt) < this._anongptManifestTtlMs) {
      return cached.ok
    }

    const result = await this._validateAnongptManifest(driveKeyHex)
    this._anongptManifestCache.set(driveKeyHex.toLowerCase(), {
      ok: result.ok,
      reason: result.ok ? null : result.reason,
      checkedAt: Date.now()
    })
    if (!result.ok) {
      console.warn('[anongpt-gate] manifest gate FAILED for', driveKeyHex.slice(0, 12) + '…', '—', result.reason)
    }
    return result.ok
  }

  /**
   * Read manifest.json from the drive and validate the four claims
   * required by the privacy contract. The "pear.anongpt.infer claim"
   * can be declared in either of two ways, both seen in practice:
   *   (a) manifest.permissions includes 'pear.anongpt.infer'  ← anonGPT
   *       publisher convention (treats the API as a permission scope)
   *   (b) manifest.pear.anongpt.infer is truthy                ← nested
   *       object form mentioned in the dev-bridge spec
   * Either form is accepted; both express the same intent. The four
   * privacy claims are checked exactly as the spec requires (no
   * heuristics — a missing field is a failed check, not a default).
   *
   *   - permission declared (one of the two forms above)
   *   - privacy.storesPrompts === false
   *   - privacy.remoteHttpInference === 'forbidden'
   *   - privacy.requiresLocalRuntime === true
   *
   * Returns { ok: true } on success, { ok: false, reason } otherwise.
   */
  async _validateAnongptManifest (driveKeyHex) {
    let manifest
    try {
      const fetched = await this._fetchP2P(driveKeyHex, '/manifest.json')
      if (!fetched || !fetched.content) {
        return { ok: false, reason: 'manifest.json not reachable' }
      }
      manifest = JSON.parse(fetched.content.toString('utf-8'))
    } catch (err) {
      return { ok: false, reason: 'manifest.json parse error: ' + (err && err.message) }
    }
    if (!manifest || typeof manifest !== 'object') {
      return { ok: false, reason: 'manifest.json not an object' }
    }
    const declaredViaPermissions = Array.isArray(manifest.permissions) &&
      manifest.permissions.includes('pear.anongpt.infer')
    const declaredViaNested = manifest.pear && manifest.pear.anongpt && manifest.pear.anongpt.infer
    if (!declaredViaPermissions && !declaredViaNested) {
      return {
        ok: false,
        reason: 'manifest.json does not declare pear.anongpt.infer (expected either ' +
          '`permissions: ["pear.anongpt.infer", ...]` or `pear.anongpt.infer: true`)'
      }
    }
    const privacy = manifest.privacy
    if (!privacy || typeof privacy !== 'object') {
      return { ok: false, reason: 'manifest.json missing `privacy` block' }
    }
    if (privacy.storesPrompts !== false) {
      return { ok: false, reason: 'privacy.storesPrompts must be false (got ' + JSON.stringify(privacy.storesPrompts) + ')' }
    }
    if (privacy.remoteHttpInference !== 'forbidden') {
      return { ok: false, reason: 'privacy.remoteHttpInference must be "forbidden" (got ' + JSON.stringify(privacy.remoteHttpInference) + ')' }
    }
    if (privacy.requiresLocalRuntime !== true) {
      return { ok: false, reason: 'privacy.requiresLocalRuntime must be true (got ' + JSON.stringify(privacy.requiresLocalRuntime) + ')' }
    }
    return { ok: true }
  }

  /**
   * Inject `<base>` + per-page `pear-api-token` meta + swarm.v1 shim
   * (always) + anongpt shim (gated) into an HTML response body. Used by
   * both the cache HIT and cache MISS paths so a reloaded page still
   * gets a fresh token. The token is per-request, never cached.
   *
   * @param {Buffer|string} content   raw upstream HTML
   * @param {string}        driveKeyHex
   * @param {string}        reqPath   request URL path (used to choose
   *                                  `/app/` vs `/hyper/` for <base>)
   * @returns {Buffer}                response body with the head block injected
   */
  async _injectHtmlHead (content, driveKeyHex, reqPath) {
    const html = (Buffer.isBuffer(content) ? content : Buffer.from(content)).toString('utf-8')
    const prefix = reqPath.startsWith('/app/') ? '/app/' : '/hyper/'
    const baseHref = `http://localhost:${this._port}${prefix}${driveKeyHex}/`
    const apiToken = this.issueApiToken(driveKeyHex)
    const includeAnongpt = await this._shouldInjectAnongptShim(driveKeyHex)
    if (includeAnongpt) {
      console.log('[anongpt-gate] injecting shim for', driveKeyHex.slice(0, 12) + '…')
    }
    const headInjection =
      `<base href="${baseHref}">` +
      `<meta name="pear-api-token" content="${apiToken}">` +
      (this._pearSwarmShim || '') +
      (includeAnongpt ? this._anongptShim : '')
    const injected = html.includes('<head>')
      ? html.replace('<head>', `<head>${headInjection}`)
      : html.replace(/<html>/i, `<html><head>${headInjection}</head>`)
    return Buffer.from(injected)
  }

  get port () { return this._port }

  async start () {
    this._server = http.createServer((req, res) => this._handle(req, res))

    return new Promise((resolve, reject) => {
      this._server.on('error', reject)
      this._server.listen(0, '127.0.0.1', () => {
        this._port = this._server.address().port
        resolve(this._port)
      })
    })
  }

  async stop () {
    if (!this._server) return
    return new Promise(resolve => this._server.close(() => resolve()))
  }

  async _handle (req, res) {
    // Validate origin - only allow strict loopback origins
    const origin = req.headers.origin
    if (origin && !isLoopbackOrigin(origin)) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'text/plain')
      return res.end('Invalid origin: only localhost is allowed')
    }

    // Set CORS headers for valid origins
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://127.0.0.1')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Pear-Token')

    // CORS preflight handler
    if (req.method === 'OPTIONS') {
      if (origin && !isLoopbackOrigin(origin)) {
        res.statusCode = 403
        return res.end('Invalid origin')
      }
      res.setHeader('Access-Control-Allow-Origin', origin || 'http://127.0.0.1')
      res.statusCode = 204
      return res.end()
    }

    const url = new URL(req.url, `http://localhost:${this._port}`)
    const path = url.pathname

    // HTTP Bridge — direct API for WebView apps (bypasses RN relay)
    if (this._httpBridge && path.startsWith('/api/')) {
      const handled = await this._httpBridge.handle(req, res, url)
      if (handled) return
    }

    // Health check
    if (path === '/health') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: true }))
    }

    try {
      let driveKeyHex, filePath

      if (path.startsWith('/hyper/')) {
        // Direct hyper:// browsing: /hyper/KEY/path
        const rest = path.slice('/hyper/'.length)
        const slash = rest.indexOf('/')
        driveKeyHex = slash === -1 ? rest : rest.slice(0, slash)
        filePath = slash === -1 ? '/' : rest.slice(slash)
      } else if (path.startsWith('/app/')) {
        // Installed app: /app/DRIVE_KEY/path
        const rest = path.slice('/app/'.length)
        const slash = rest.indexOf('/')
        driveKeyHex = slash === -1 ? rest : rest.slice(0, slash)
        filePath = slash === -1 ? '/' : rest.slice(slash)
      } else {
        res.statusCode = 404
        return res.end('Not found')
      }

      // SECURITY: Validate drive key format to prevent path traversal
      if (!isValidDriveKey(driveKeyHex)) {
        res.statusCode = 400
        return res.end('Invalid drive key format')
      }

      // SECURITY: Validate file path to prevent directory traversal
      if (filePath.includes('..') || filePath.includes('\x00')) {
        res.statusCode = 400
        return res.end('Invalid file path')
      }

      this._stats.total++

      // Check if this is a directory request
      if (filePath.endsWith('/') || filePath === '') {
        const drive = await this._getDrive(driveKeyHex)
        if (drive) {
          // Brief wait for the drive's manifest to sync from the swarm
          // before checking whether index.html exists. Without this,
          // freshly-opened drives (just joined the swarm seconds ago)
          // returned null from drive.entry() before any blocks had
          // arrived — and we fell back to the empty directory listing.
          // 8s is plenty for a hot relay; first-time peer discovery
          // sometimes needs longer, but the directory-listing fallback
          // still kicks in if it does.
          try {
            await Promise.race([
              drive.update({ wait: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('update-timeout')), 8000))
            ])
          } catch {
            // Timeout is acceptable — drive.entry will still try below.
          }
          const indexExists = await drive.entry(filePath + 'index.html').catch(() => null)
          if (!indexExists) {
            // No index, show directory listing
            return this._serveDirectoryListing(res, drive, driveKeyHex, filePath)
          }
          // Has index, serve it (filePath stays as directory path)
        }
      }

      // Check cache first
      const cacheKey = this._getCacheKey(driveKeyHex, filePath)
      const cached = this._getFromCache(cacheKey)
      if (cached) {
        res.setHeader('Content-Type', cached.contentType)
        res.setHeader('X-Cache', 'HIT')
        // HTML responses must STILL get the per-page api-token + shim
        // injection even when served from cache. The cache stores raw
        // upstream content; the token is per-request and must not be
        // cached (each page load gets a fresh token). Caching the post-
        // injection HTML would leak tokens across requests, so we
        // re-inject on every HIT instead.
        if (cached.contentType.includes('text/html')) {
          const injected = await this._injectHtmlHead(cached.content, driveKeyHex, path)
          res.statusCode = 200
          return res.end(injected)
        }
        res.statusCode = 200
        return res.end(cached.content)
      }
      this._cacheStats.misses++

      // HYBRID FETCH: race relay (fast) vs P2P (reliable)
      const result = await this._hybridFetch(driveKeyHex, filePath)

      if (!result) {
        res.statusCode = 404
        return res.end('File not found')
      }

      // Cache successful result
      this._setCache(cacheKey, result.content, result.contentType)

      const contentType = result.contentType
      const content = result.content
      res.setHeader('X-Cache', 'MISS')

      res.setHeader('Content-Type', contentType)
      res.setHeader('X-Source', result.source)

      // Inject <base> tag + per-page api-token meta + window.pear.swarm.v1
      // shim for HTML responses. Pages get the shim "for free" — no
      // <script src> required from the author. Token is also exposed in a
      // meta tag so the shim can read it without holding it in JS at
      // construction time. The anonGPT shim is conditionally added when
      // the gate passes. Logic lives in _injectHtmlHead() so cache HIT
      // and cache MISS use the identical injection path.
      if (contentType.includes('text/html')) {
        const injected = await this._injectHtmlHead(content, driveKeyHex, path)
        res.statusCode = 200
        return res.end(injected)
      }

      // Range request support for streaming (video, audio, large files)
      res.setHeader('Accept-Ranges', 'bytes')
      const rangeHeader = req.headers.range || req.headers['range']

      if (rangeHeader) {
        const total = content.length
        const match = rangeHeader.match(/bytes=(\d*)-(\d*)/)
        if (match) {
          const start = match[1] ? parseInt(match[1]) : 0
          const end = match[2] ? parseInt(match[2]) : total - 1
          const chunkSize = end - start + 1

          res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`)
          res.setHeader('Content-Length', chunkSize)
          res.statusCode = 206
          return res.end(content.slice(start, end + 1))
        }
      }

      res.setHeader('Content-Length', content.length)
      res.statusCode = 200
      res.end(content)
    } catch (err) {
      // Log detailed error internally
      this._onError(path, err.message)
      // Return user-friendly error to client
      const userMessage = getUserFriendlyError(err.message)
      res.statusCode = 502
      res.setHeader('Content-Type', 'text/html')
      res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cannot Load Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .container { text-align: center; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #ff9500; font-size: 20px; margin-bottom: 12px; }
    p { color: #999; line-height: 1.6; margin-bottom: 24px; }
    .error-code { 
      display: inline-block;
      background: #1a1a1a;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔌</div>
    <h1>Cannot Load Page</h1>
    <p>${userMessage}</p>
    <div class="error-code">${err.code || '502'}</div>
  </div>
</body>
</html>`)
    }
  }

  /**
   * Hybrid fetch — race relay HTTP (fast) vs P2P Hyperdrive (reliable).
   * Deduplicates concurrent requests for the same file.
   * Returns { content, contentType, source } or null.
   */
  async _hybridFetch (keyHex, filePath) {
    const cacheKey = `${keyHex}:${filePath}`

    // Return existing promise if already fetching
    if (this._inFlight.has(cacheKey)) {
      return this._inFlight.get(cacheKey)
    }

    // Create the fetch promise
    const promise = this._doHybridFetch(keyHex, filePath)
    this._inFlight.set(cacheKey, promise)

    // Clean up when done
    promise.finally(() => {
      this._inFlight.delete(cacheKey)
    })

    return promise
  }

  /**
   * Internal hybrid fetch implementation — race relay HTTP (fast) vs P2P Hyperdrive (reliable).
   * Returns { content, contentType, source } or null.
   */
  async _doHybridFetch (keyHex, filePath) {
    // Resolve directory paths
    let resolvedPath = filePath
    if (filePath.endsWith('/') || filePath === '') {
      resolvedPath = (filePath || '/') + 'index.html'
    }

    // Start both fetches concurrently
    const relayPromise = this._relay
      ? this._relay.fetch(keyHex, resolvedPath).catch(() => null)
      : Promise.resolve(null)

    const p2pPromise = this._fetchP2P(keyHex, resolvedPath).catch(() => null)

    // Race: first successful response wins
    const result = await Promise.any([
      relayPromise.then(r => r ? { ...r, source: 'relay' } : Promise.reject(new Error('relay: no content'))),
      p2pPromise.then(r => r ? { ...r, source: 'p2p' } : Promise.reject(new Error('p2p: no content')))
    ]).catch((err) => {
      // Both relay and P2P failed
      const reasons = err.errors ? err.errors.map(e => e.message).join(', ') : 'all sources unavailable'
      this._onError(keyHex + resolvedPath, 'Hybrid fetch failed: ' + reasons)
      return null
    })

    if (result) {
      if (result.source === 'relay') this._stats.relayHits++
      else this._stats.p2pHits++
    }

    return result
  }

  /**
   * Fetch from P2P (Hyperdrive)
   * Uses { wait: true } for non-blocking wait — Hypercore handles
   * the waiting internally instead of us polling every 300ms.
   * Inspired by Vinjari's fetch.js approach.
   */
  async _fetchP2P (keyHex, filePath) {
    const drive = await this._getDrive(keyHex)
    if (!drive) return null

    // Use Hyperdrive's built-in wait: true to wait for the specific
    // block we need, with a 15s timeout. No polling.
    const content = await Promise.race([
      drive.get(filePath, { wait: true }),
      new Promise(resolve => setTimeout(() => resolve(null), 15000))
    ])

    if (!content) return null

    return { content, contentType: guessType(filePath) }
  }

  _getCacheKey (driveKeyHex, filePath) {
    return `${driveKeyHex}:${filePath}`
  }

  _getFromCache (key) {
    const entry = this._cache.get(key)
    if (!entry) return null

    // Check TTL (5 minutes)
    if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
      this._cache.delete(key)
      this._cacheCurrentSize -= entry.size
      return null
    }

    // Update access order (LRU)
    entry.lastAccess = Date.now()
    this._cacheStats.hits++
    return entry
  }

  _setCache (key, content, contentType) {
    const size = content.length

    // Don't cache files > 5MB
    if (size > 5 * 1024 * 1024) return

    // Evict oldest entries if needed
    while (this._cacheCurrentSize + size > this._cacheMaxSize && this._cache.size > 0) {
      let oldest = null
      let oldestTime = Infinity
      for (const [k, v] of this._cache) {
        if (v.lastAccess < oldestTime) {
          oldestTime = v.lastAccess
          oldest = k
        }
      }
      if (oldest) {
        const entry = this._cache.get(oldest)
        this._cacheCurrentSize -= entry.size
        this._cache.delete(oldest)
      }
    }

    this._cache.set(key, {
      content,
      contentType,
      size,
      timestamp: Date.now(),
      lastAccess: Date.now()
    })
    this._cacheCurrentSize += size
  }

  /**
   * Invalidate cache entries for a specific drive key
   * @param {string} driveKeyHex - The drive key to invalidate
   */
  invalidateCache (driveKeyHex) {
    for (const key of this._cache.keys()) {
      if (key.startsWith(`${driveKeyHex}:`)) {
        const entry = this._cache.get(key)
        this._cacheCurrentSize -= entry.size
        this._cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats () {
    return {
      ...this._cacheStats,
      size: this._cacheCurrentSize,
      maxSize: this._cacheMaxSize,
      entries: this._cache.size
    }
  }

  /**
   * Clear the entire cache
   */
  clearCache () {
    this._cache.clear()
    this._cacheCurrentSize = 0
    this._cacheStats.hits = 0
    this._cacheStats.misses = 0
  }

  issueApiToken (driveKeyHex) {
    if (!isValidDriveKey(driveKeyHex)) {
      throw new Error('Invalid drive key format')
    }
    this._cleanupExpiredApiTokens()
    const token = crypto.randomBytes(32).toString('hex')
    this._apiTokens.set(token, { driveKeyHex, issuedAt: Date.now() })
    return token
  }

  validateApiToken (token) {
    if (typeof token !== 'string' || token.length < 32) return null
    this._cleanupExpiredApiTokens()
    const entry = this._apiTokens.get(token)
    if (!entry) return null
    return entry.driveKeyHex
  }

  _cleanupExpiredApiTokens () {
    const now = Date.now()
    for (const [token, entry] of this._apiTokens) {
      if (now - entry.issuedAt > this._apiTokenTtlMs) {
        this._apiTokens.delete(token)
      }
    }
  }

  async _serveDirectoryListing (res, drive, keyHex, dirPath) {
    const entries = []
    const MAX_ENTRIES = 1000 // Prevent memory exhaustion
    const TIMEOUT_MS = 5000
    const startTime = Date.now()

    // Normalize dirPath for listing (ensure it ends with / for prefix matching)
    const normalizedDirPath = dirPath.endsWith('/') ? dirPath : dirPath + '/'

    try {
      for await (const entry of drive.list(normalizedDirPath)) {
        // Check timeout
        if (Date.now() - startTime > TIMEOUT_MS) {
          break
        }
        entries.push(entry.key)
        if (entries.length >= MAX_ENTRIES) {
          entries.push('... (truncated)')
          break
        }
      }
    } catch (err) {
      this._onError('directory-listing', err.message)
    }

    // Escape all entries to prevent XSS
    const items = entries.map(e => {
      const name = e.startsWith(dirPath) ? e.slice(dirPath.length) : e
      const escapedName = escapeHtml(name)
      const escapedE = escapeHtml(e)
      return `<li><a href="/hyper/${escapeHtml(keyHex)}${escapedE}">${escapedName}</a></li>`
    }).join('\n')

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>hyper://${escapeHtml(keyHex.slice(0, 8))}...${escapeHtml(dirPath)}</title>
<style>body{font-family:-apple-system,sans-serif;padding:20px;background:#0a0a0a;color:#e0e0e0}
h1{color:#ff9500;font-size:1.1em;word-break:break-all}ul{list-style:none;padding:0}
li{padding:8px 0;border-bottom:1px solid #333}a{color:#4dabf7;text-decoration:none}</style>
</head><body><h1>hyper://${escapeHtml(keyHex.slice(0, 8))}...${escapeHtml(dirPath)}</h1>
<ul>${items || '<li style="color:#666">Empty directory</li>'}</ul></body></html>`)
  }
}

module.exports = { 
  HyperProxy, 
  getUserFriendlyError,
  USER_FRIENDLY_ERRORS 
}
