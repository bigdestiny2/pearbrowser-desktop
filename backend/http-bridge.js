/**
 * HTTP Bridge — Direct localhost API for WebView apps
 *
 * Provides REST endpoints on the worklet's HTTP server so WebView
 * apps can call P2P APIs directly via fetch() instead of going
 * through the React Native postMessage relay.
 *
 * This eliminates the three-hop latency:
 *   Before: WebView → postMessage → RN → RPC → Worklet
 *   After:  WebView → fetch(localhost:PORT) → Worklet
 *
 * All endpoints are under /api/* on the same port as the hyper proxy.
 */

// hypercore-crypto + b4a work under BOTH Node (tests) and Bare (the app);
// bare-crypto would throw `require.addon is not a function` under Node.
const hypercoreCrypto = require('hypercore-crypto')
const b4a = require('b4a')
const { tabKeyForDrive } = require('./wallet/wallet-documents.cjs')
const { validateWalletManifest } = require('./wallet/wallet-manifest.cjs')

// Transport cap for wallet request bodies (spec §4.2 — the wallet request
// body is capped at 16 KiB).
const WALLET_BODY_MAX_BYTES = 16 * 1024

// service err.code → HTTP status for /api/wallet/v1/* routes.
const WALLET_ERROR_STATUS = {
  'not-connected': 403,
  'not-authorized': 403,
  'bad-request': 400,
  'unsupported-chain': 400,
  'unsupported-asset': 400,
  'not-found': 404,
  'rate-limited': 429,
  'wallet-busy': 429,
  'cap-exceeded': 429,
  'wallet-locked': 423,
  'prompt-expired': 410,
  'idempotency-conflict': 409,
  'wallet-unavailable': 503
}

// Conservative transport-level rate limits per drive (the wallet service
// enforces its own stricter policy limits on top — spec §4.2).
const WALLET_RATE_BUCKETS = {
  connect: { max: 5, windowMs: 60000 },
  payment: { max: 10, windowMs: 60000 },
  'sign-app': { max: 10, windowMs: 60000 },
  transaction: { max: 60, windowMs: 60000 },
  default: { max: 30, windowMs: 60000 }
}

function walletFail (code, message) {
  const err = new Error(message || code)
  err.code = code
  return err
}

function newWalletIntentId () {
  return 'wpi_' + b4a.toString(hypercoreCrypto.randomBytes(12), 'hex')
}

function hexOrString (value) {
  if (typeof value === 'string') return value
  if (b4a.isBuffer(value) || value instanceof Uint8Array) return b4a.toString(value, 'hex')
  return value
}

class HttpBridge {
  constructor (pearBridge, swarm, getDriveFn, opts = {}) {
    this._bridge = pearBridge
    this._swarm = swarm
    this._getDrive = getDriveFn || null // async (keyHex) => Hyperdrive
    this._allowedOrigins = opts.allowedOrigins || ['http://localhost', 'http://127.0.0.1']
    this._validateToken = opts.validateToken || (() => null)
    this._identity = opts.identity || null
    this._profile = opts.profile || null
    this._contacts = opts.contacts || null
    this._requestLogin = opts.requestLogin || null  // async (args) => attestation
    this._swarmBridge = opts.swarmBridge || null   // SwarmBridge instance — see backend/swarm-bridge.js
    this._anongptBuyer = opts.anongptBuyer || null // AnongptBuyer — see backend/anongpt-buyer.js
    this._anongptDriveKey = (opts.anongptDriveKey || '').toLowerCase()
    this._aiService = opts.aiService || null
    this._aiManifestCache = new Map()
    this._aiManifestTtlMs = opts.aiManifestTtlMs || 30000
    this._aiRequestOwners = new Map()
    // WDK wallet preview (docs/WDK_WALLET_V0.9_SPEC.md §4.4). All optional —
    // without them /api/wallet/v1/* fails closed with wallet-unavailable.
    this._walletService = opts.walletService || null
    this._walletDocuments = opts.walletDocuments || null
    this._requestWalletConsent = typeof opts.requestWalletConsent === 'function'
      ? opts.requestWalletConsent
      : null
    this._walletSessionId = typeof opts.browserSessionId === 'string' && opts.browserSessionId.length > 0
      ? opts.browserSessionId
      : 'http-bridge'
    this._walletRateLimiter = new Map()
    this._rateLimiter = new Map() // Simple rate limiting per IP
    this._sseTickets = new Map()
    this._sseTicketTtlMs = opts.sseTicketTtlMs || 30000
    this._maxSseTickets = opts.maxSseTickets || 4096
    this._maxSseQueue = opts.maxSseQueue || 1024
    this._maxSseQueueBytes = opts.maxSseQueueBytes || (4 * 1024 * 1024)
  }

  // Simple rate limit check
  _checkRateLimit (ip) {
    const now = Date.now()
    const windowMs = 60000 // 1 minute
    const maxRequests = 100 // 100 requests per minute

    let entry = this._rateLimiter.get(ip)
    if (!entry || now - entry.resetAt > windowMs) {
      entry = { count: 0, resetAt: now + windowMs }
      this._rateLimiter.set(ip, entry)
    }
    entry.count++
    return entry.count <= maxRequests
  }

  // Validate appId format (alphanumeric, hyphen, underscore only)
  _isValidAppId (appId) {
    return typeof appId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(appId)
  }

  // Get client IP from request
  _getClientIp (req) {
    return req.socket?.remoteAddress || '127.0.0.1'
  }

  _isLoopbackOrigin (origin) {
    if (typeof origin !== 'string') return false
    try {
      const parsed = new URL(origin)
      return parsed.protocol === 'http:' &&
        (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
    } catch {
      return false
    }
  }

  _requestOrigins (req) {
    const origins = []
    const rawOrigin = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin
    if (typeof rawOrigin === 'string' && rawOrigin.length > 0) origins.push(rawOrigin)

    const rawHost = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host
    if (typeof rawHost === 'string' && rawHost.length > 0) origins.push(`http://${rawHost}`)

    return [...new Set(origins)]
  }

  _sameOrigin (a, b) {
    try {
      const left = new URL(a)
      const right = new URL(b)
      // Bare's URL implementation does not expose `.origin`.
      return left.protocol === right.protocol && left.host === right.host
    } catch {
      return false
    }
  }

  _checkTokenOrigin (req, res, expectedOrigin) {
    if (!expectedOrigin) return true
    const origins = this._requestOrigins(req)
    if (origins.length === 0) return true
    for (const origin of origins) {
      if (!this._sameOrigin(origin, expectedOrigin)) {
        this._jsonError(res, 'Token origin mismatch', 403)
        return false
      }
    }
    return true
  }

  // Namespace a page's appId by the drive it was served from, so two apps can't
  // touch each other's sync data. We HASH `driveKey:appId` to a fixed 64 hex
  // chars: a plain `driveKey:appId` concat is ≥65 chars and the Autobase bridge
  // caps appId at 64 (pear-bridge.js _validateAppId), so the un-hashed form made
  // EVERY sync call fail — which is why pages could only ever run in dev mode.
  // The hash is deterministic and per-drive, so all users of the same app (same
  // drive) share a namespace and can discover each other's outboxes, while
  // different apps stay isolated.
  _scopeAppId (driveKeyHex, appId) {
    return b4a.toString(hypercoreCrypto.data(b4a.from(`${driveKeyHex}:${appId}`)), 'hex')
  }

  async _hasAiPermission (driveKeyHex) {
    const keyHex = String(driveKeyHex || '').toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(keyHex) || !this._getDrive) return false
    const cached = this._aiManifestCache.get(keyHex)
    if (cached && Date.now() - cached.checkedAt < this._aiManifestTtlMs) return cached.allowed

    let allowed = false
    try {
      const drive = await this._getDrive(keyHex)
      let timer = null
      const raw = drive && await Promise.race([
        drive.get('/manifest.json', { wait: true }),
        new Promise(resolve => { timer = setTimeout(() => resolve(null), 10000) })
      ]).finally(() => { if (timer) clearTimeout(timer) })
      const manifest = raw ? JSON.parse(raw.toString('utf8')) : null
      allowed = !!(manifest && (
        (Array.isArray(manifest.permissions) && manifest.permissions.includes('pear.ai.infer')) ||
        manifest.pear?.ai?.infer === true
      ))
    } catch {}

    this._aiManifestCache.set(keyHex, { allowed, checkedAt: Date.now() })
    return allowed
  }

  _requireToken (req, res) {
    const rawToken = req.headers['x-pear-token']
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken
    const entry = this._validateToken(token)
    if (!entry) {
      this._jsonError(res, 'Unauthorized', 401)
      return null
    }
    if (typeof entry === 'string') return { driveKeyHex: entry, token }
    if (entry && typeof entry.driveKeyHex === 'string') {
      const auth = {
        driveKeyHex: entry.driveKeyHex,
        token,
        origin: entry.origin || null,
        kind: entry.kind || 'drive'
      }
      if (!this._checkTokenOrigin(req, res, auth.origin)) return null
      return auth
    }
    this._jsonError(res, 'Unauthorized', 401)
    return null
  }

  // --- WDK wallet helpers (spec §4.4) ---

  /** Override the chrome-consent entry point (tests; boot wires the broker). */
  setWalletConsentHandler (fn) {
    this._requestWalletConsent = typeof fn === 'function' ? fn : null
  }

  _walletOk (res, result) {
    res.statusCode = 200
    res.end(JSON.stringify({ ok: true, ...result }))
    return true
  }

  // Wallet routes answer with the { ok: false, error: { code, message } }
  // shape the page shim rejects on. Mapped codes carry the service's
  // sanitized message; unmapped codes are internal failures and get a
  // generic message so internals never leak to the page.
  _walletError (res, err) {
    const code = err && typeof err.code === 'string' ? err.code : 'internal-error'
    const known = Object.prototype.hasOwnProperty.call(WALLET_ERROR_STATUS, code)
    const status = known ? WALLET_ERROR_STATUS[code] : 500
    const message = known ? (err.message || code) : 'wallet operation failed'
    res.statusCode = status
    res.end(JSON.stringify({ ok: false, error: { code, message } }))
    return true
  }

  // The wallet connection tuple for this page. browserSessionId identifies
  // this browser run; tabId is the per-drive document slot (see
  // wallet-documents.cjs — the architecture has no per-tab listeners, so
  // one live wallet document per drive is the binding); driveKey and
  // walletTabOrigin come from the validated api token.
  _walletTuple (auth) {
    return {
      browserSessionId: this._walletSessionId,
      tabId: tabKeyForDrive(auth.driveKeyHex),
      driveKey: auth.driveKeyHex,
      walletTabOrigin: auth.origin || null
    }
  }

  /**
   * Token gate for wallet routes. Always requires the general page token
   * (origin-checked). When docToken is required (connect / payment /
   * sign-app / transaction / disconnect) the per-document wallet token must
   * also verify against the tuple. State-changing requests additionally
   * require an exact Origin header — no originless POST fallback (spec §4.4).
   */
  async _requireWalletAuth (req, res, { method, docToken = true }) {
    const auth = this._requireToken(req, res)
    if (!auth) return null
    if (req.method === 'POST') {
      const origin = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin
      if (typeof origin !== 'string' || origin.length === 0) {
        this._walletError(res, walletFail('not-authorized', 'Origin header is required'))
        return null
      }
    }
    const tuple = this._walletTuple(auth)
    if (!docToken) return { auth, tuple, docToken: null }
    if (!this._walletDocuments) {
      this._walletError(res, walletFail('not-authorized', 'wallet document registry is not available'))
      return null
    }
    const rawDoc = req.headers['x-pear-wallet-doc']
    const presented = Array.isArray(rawDoc) ? rawDoc[0] : rawDoc
    const verified = await this._walletDocuments.verify({ tuple, token: presented, method })
    if (verified !== true) {
      this._walletError(res, walletFail('not-authorized', 'document token is not authorized'))
      return null
    }
    return { auth, tuple, docToken: presented }
  }

  _checkWalletRateLimit (driveKeyHex, bucket) {
    const { max, windowMs } = WALLET_RATE_BUCKETS[bucket] || WALLET_RATE_BUCKETS.default
    const now = Date.now()
    const key = driveKeyHex + ':' + bucket
    let entry = this._walletRateLimiter.get(key)
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      this._walletRateLimiter.set(key, entry)
    }
    entry.count++
    return entry.count <= max
  }

  // Server-side manifest fetch for the connect route (spec §3.2 — the
  // manifest is re-fetched and re-validated; a cached connection record is
  // never proof of current eligibility).
  async _fetchWalletManifest (driveKeyHex) {
    const keyHex = String(driveKeyHex || '').toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(keyHex) || !this._getDrive) return null
    try {
      const drive = await this._getDrive(keyHex)
      let timer = null
      const raw = drive && await Promise.race([
        drive.get('/manifest.json', { wait: true }),
        new Promise(resolve => { timer = setTimeout(() => resolve(null), 10000) })
      ]).finally(() => { if (timer) clearTimeout(timer) })
      return raw ? JSON.parse(raw.toString('utf8')) : null
    } catch {
      return null
    }
  }


  _pruneSseTickets (now = Date.now()) {
    for (const [ticket, entry] of this._sseTickets) {
      if (entry.expiresAt <= now) this._sseTickets.delete(ticket)
    }
    while (this._sseTickets.size > this._maxSseTickets) {
      const oldest = this._sseTickets.keys().next().value
      if (!oldest) break
      this._sseTickets.delete(oldest)
    }
  }

  _mintSseTicket (auth, channelId) {
    const now = Date.now()
    this._pruneSseTickets(now)
    let ticket
    do {
      ticket = b4a.toString(hypercoreCrypto.randomBytes(32), 'hex')
    } while (this._sseTickets.has(ticket))
    this._sseTickets.set(ticket, {
      driveKeyHex: auth.driveKeyHex,
      origin: auth.origin || null,
      kind: auth.kind || 'drive',
      channelId,
      expiresAt: now + this._sseTicketTtlMs
    })
    return { ticket, expiresInMs: this._sseTicketTtlMs }
  }

  _consumeSseTicket (req, res, urlObj, channelId) {
    const ticket = urlObj.searchParams.get('ticket')
    if (!ticket) {
      this._jsonError(res, 'SSE ticket required', 401)
      return null
    }
    const entry = this._sseTickets.get(ticket)
    if (!entry) {
      this._jsonError(res, 'Invalid SSE ticket', 401)
      return null
    }
    this._sseTickets.delete(ticket)
    if (entry.expiresAt <= Date.now()) {
      this._jsonError(res, 'Expired SSE ticket', 401)
      return null
    }
    if (entry.channelId !== channelId) {
      this._jsonError(res, 'SSE ticket channel mismatch', 403)
      return null
    }
    if (!this._checkTokenOrigin(req, res, entry.origin || null)) return null
    return {
      driveKeyHex: entry.driveKeyHex,
      token: ticket,
      origin: entry.origin || null,
      kind: entry.kind || 'drive'
    }
  }

  /**
   * Handle an incoming HTTP request.
   * Returns true if handled, false if not an API route.
   */
  async handle (req, res, url) {
    const path = url.pathname

    if (!path.startsWith('/api/')) return false

    // Rate limiting
    const clientIp = this._getClientIp(req)
    if (!this._checkRateLimit(clientIp)) {
      res.statusCode = 429
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Rate limit exceeded' }))
      return true
    }

    // Origin validation
    const origin = req.headers.origin
    if (origin) {
      const isAllowed = this._isLoopbackOrigin(origin) &&
        this._allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed + ':'))
      if (!isAllowed) {
        res.statusCode = 403
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Invalid origin' }))
        return true
      }
    }

    res.setHeader('Content-Type', 'application/json')

    try {
      // Parse JSON body for POST requests
      let body = null
      if (req.method === 'POST') {
        body = await this._readBody(req)
      }

      // --- Sync API ---

      if (req.method === 'POST' && path === '/api/sync/create') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._isValidAppId(body.appId)) {
          return this._jsonError(res, 'Invalid appId format', 400)
        }
        const scopedAppId = this._scopeAppId(auth.driveKeyHex, body.appId)
        const result = await this._bridge.createSyncGroup(scopedAppId)
        return this._json(res, { ...result, appId: body.appId })
      }

      if (req.method === 'POST' && path === '/api/sync/join') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._isValidAppId(body.appId)) {
          return this._jsonError(res, 'Invalid appId format', 400)
        }
        // Validate invite key format (64 hex chars)
        if (!body.inviteKey || !/^[0-9a-f]{64}$/i.test(body.inviteKey)) {
          return this._jsonError(res, 'Invalid invite key format', 400)
        }
        const scopedAppId = this._scopeAppId(auth.driveKeyHex, body.appId)
        const result = await this._bridge.joinSyncGroup(scopedAppId, body.inviteKey)
        return this._json(res, { ...result, appId: body.appId })
      }

      if (req.method === 'POST' && path === '/api/sync/append') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        // Validate appId
        if (!this._isValidAppId(body.appId)) {
          return this._jsonError(res, 'Invalid appId format', 400)
        }
        // Limit operation size
        const opSize = JSON.stringify(body.op || body).length
        if (opSize > 100000) { // 100KB max operation
          return this._jsonError(res, 'Operation too large', 413)
        }
        const scopedAppId = this._scopeAppId(auth.driveKeyHex, body.appId)
        const result = await this._bridge.append(scopedAppId, body.op || body)
        return this._json(res, result)
      }

      if (req.method === 'GET' && path === '/api/sync/get') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        const appId = url.searchParams.get('appId')
        const key = url.searchParams.get('key')
        if (!this._isValidAppId(appId)) {
          return this._jsonError(res, 'Invalid appId format', 400)
        }
        // Validate key format
        if (!key || typeof key !== 'string' || key.length > 1024) {
          return this._jsonError(res, 'Invalid key', 400)
        }
        const scopedAppId = this._scopeAppId(auth.driveKeyHex, appId)
        const result = await this._bridge.get(scopedAppId, key)
        return this._json(res, result)
      }

      if (req.method === 'GET' && path === '/api/sync/list') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        const appId = url.searchParams.get('appId')
        const prefix = url.searchParams.get('prefix') || ''
        let limit = parseInt(url.searchParams.get('limit') || '100')
        if (!this._isValidAppId(appId)) {
          return this._jsonError(res, 'Invalid appId format', 400)
        }
        // Enforce max limit
        if (isNaN(limit) || limit < 1) limit = 100
        if (limit > 1000) limit = 1000
        const scopedAppId = this._scopeAppId(auth.driveKeyHex, appId)
        const result = await this._bridge.list(scopedAppId, prefix, { limit })
        return this._json(res, result)
      }

      // Phase 4 addition — range queries with explicit bounds + reverse
      if (req.method === 'GET' && path === '/api/sync/range') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        const appId = url.searchParams.get('appId')
        if (!this._isValidAppId(appId)) {
          return this._jsonError(res, 'Invalid appId format', 400)
        }
        const opts = {
          gte: url.searchParams.get('gte') || undefined,
          gt: url.searchParams.get('gt') || undefined,
          lte: url.searchParams.get('lte') || undefined,
          lt: url.searchParams.get('lt') || undefined,
          reverse: url.searchParams.get('reverse') === '1' || url.searchParams.get('reverse') === 'true',
          limit: parseInt(url.searchParams.get('limit') || '100') || 100,
        }
        const scopedAppId = this._scopeAppId(auth.driveKeyHex, appId)
        const result = await this._bridge.range(scopedAppId, opts)
        return this._json(res, result)
      }

      // Phase 4 addition — count under a prefix (for UI counters)
      if (req.method === 'GET' && path === '/api/sync/count') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        const appId = url.searchParams.get('appId')
        const prefix = url.searchParams.get('prefix') || ''
        if (!this._isValidAppId(appId)) {
          return this._jsonError(res, 'Invalid appId format', 400)
        }
        const scopedAppId = this._scopeAppId(auth.driveKeyHex, appId)
        const count = await this._bridge.count(scopedAppId, prefix)
        return this._json(res, { count })
      }

      if (req.method === 'GET' && path === '/api/sync/status') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        const appId = url.searchParams.get('appId')
        if (!this._isValidAppId(appId)) {
          return this._jsonError(res, 'Invalid appId format', 400)
        }
        const scopedAppId = this._scopeAppId(auth.driveKeyHex, appId)
        const result = this._bridge.getSyncStatus(scopedAppId)
        return this._json(res, result ? { ...result, appId } : null)
      }

      // --- Identity ---

      if (req.method === 'GET' && path === '/api/identity') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        // PHASE A: return the per-app sub-key (stable per user+app), NOT
        // the raw swarm or root keypair. Two different apps see two
        // different pubkeys for the same user — privacy by default.
        let appPubkey = null
        if (this._identity) {
          try { appPubkey = this._identity.getAppKeypair(auth.driveKeyHex).publicKey.toString('hex') }
          catch { /* demo mode */ }
        }
        return this._json(res, {
          publicKey: appPubkey,           // per-app sub-key
          driveKey: auth.driveKeyHex,
          algorithm: 'ed25519',
        })
      }

      // Sign a payload with the per-app sub-key (ed25519). Safe to expose —
      // the root keypair stays sealed inside the worklet.
      if (req.method === 'POST' && path === '/api/identity/sign') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._identity) return this._jsonError(res, 'identity not available', 503)
        // NOTE: the POST body was already read once at the top of _handle (for
        // every POST). Reading it again here hangs forever — the request stream
        // is already consumed, so 'data'/'end' never fire. Use the parsed body.
        if (!body || typeof body.payload !== 'string') {
          return this._jsonError(res, '`payload` (string) required', 400)
        }
        try {
          const result = this._identity.signForApp(
            auth.driveKeyHex,
            body.payload,
            body.namespace || ''
          )
          return this._json(res, result)
        } catch (err) {
          return this._jsonError(res, err.message || 'sign failed', 500)
        }
      }

      // --- Login ceremony (Identity Plan Phase C) ---
      //
      // POST /api/login      { scopes, appName, reason } → attestation
      // GET  /api/login/status                           → current grant
      // POST /api/login/logout                           → revoke grant for this app

      if (req.method === 'POST' && path === '/api/login') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._requestLogin) return this._jsonError(res, 'login not available', 503)
        let body
        try { body = await this._readBody(req) } catch { return this._jsonError(res, 'Invalid JSON body', 400) }
        const scopes = Array.isArray(body.scopes) ? body.scopes.map(String) : []
        const appName = typeof body.appName === 'string' ? body.appName.slice(0, 128) : null
        const reason = typeof body.reason === 'string' ? body.reason.slice(0, 512) : null
        try {
          const attestation = await this._requestLogin({
            driveKeyHex: auth.driveKeyHex, scopes, appName, reason,
          })
          // Attach the visible profile fields the app is allowed to see.
          let profileFields = null
          if (this._profile) {
            try { profileFields = await this._profile.getVisibleProfile(auth.driveKeyHex) } catch {}
          }
          return this._json(res, { ...attestation, profile: profileFields })
        } catch (err) {
          return this._jsonError(res, err.message || 'Login failed', 403)
        }
      }

      if (req.method === 'GET' && path === '/api/login/status') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._profile || !this._identity) {
          return this._json(res, { loggedIn: false })
        }
        const grant = await this._profile.getGrant(auth.driveKeyHex)
        if (!grant) return this._json(res, { loggedIn: false })
        let appPubkey = null
        try { appPubkey = this._identity.getAppKeypair(auth.driveKeyHex).publicKey.toString('hex') } catch {}
        let profileFields = null
        try { profileFields = await this._profile.getVisibleProfile(auth.driveKeyHex) } catch {}
        return this._json(res, {
          loggedIn: true,
          appPubkey,
          scopes: grant.scopes,
          expiresAt: grant.expiresAt,
          profile: profileFields,
        })
      }

      if (req.method === 'POST' && path === '/api/login/logout') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (this._profile) {
          try { await this._profile.revokeGrant(auth.driveKeyHex) } catch {}
        }
        return this._json(res, { ok: true })
      }

      // --- Contacts (Identity Plan Phase D) ---
      //
      // All endpoints require a valid token AND an active grant with
      // the `contacts:read` scope.

      if (path.startsWith('/api/contacts')) {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._contacts) return this._jsonError(res, 'Contacts not available', 503)

        // Gate on grant+scope
        const grant = this._profile ? await this._profile.getGrant(auth.driveKeyHex) : null
        if (!grant || !grant.scopes.includes('contacts:read')) {
          return this._jsonError(res, 'contacts:read scope required — call pear.login first', 403)
        }

        if (req.method === 'GET' && path === '/api/contacts/list') {
          const limit = parseInt(url.searchParams.get('limit') || '1000')
          return this._json(res, await this._contacts.list({ limit }))
        }
        if (req.method === 'GET' && path === '/api/contacts/lookup') {
          const pk = url.searchParams.get('pubkey')
          if (!pk) return this._jsonError(res, 'pubkey required', 400)
          return this._json(res, await this._contacts.lookup(pk))
        }
        return this._jsonError(res, 'Not found', 404)
      }

      // --- Drive Operations (Vinjari-inspired) ---

      if (req.method === 'GET' && path === '/api/drive/info') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        const key = url.searchParams.get('key') || auth.driveKeyHex
        if (key !== auth.driveKeyHex) {
          return this._jsonError(res, 'Forbidden for this drive', 403)
        }
        const drive = await this._getDrive(key)
        if (!drive) return this._jsonError(res, 'Drive not found', 404)
        return this._json(res, {
          key,
          version: drive.version,
          writable: drive.writable,
          peers: this._swarm ? this._swarm.connections.size : 0,
          discoveryKey: drive.discoveryKey ? drive.discoveryKey.toString('hex') : null
        })
      }

      if (req.method === 'GET' && path === '/api/drive/readdir') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        const key = url.searchParams.get('key') || auth.driveKeyHex
        const dirPath = url.searchParams.get('path') || '/'
        if (key !== auth.driveKeyHex) {
          return this._jsonError(res, 'Forbidden for this drive', 403)
        }
        if (dirPath.includes('..') || dirPath.includes('\x00')) {
          return this._jsonError(res, 'Invalid path', 400)
        }
        const drive = await this._getDrive(key)
        if (!drive) return this._jsonError(res, 'Drive not found', 404)
        const entries = []
        try {
          for await (const entry of drive.list(dirPath)) {
            entries.push({ key: entry.key, size: entry.value?.blob?.byteLength || 0 })
          }
        } catch {}
        return this._json(res, { key, path: dirPath, entries })
      }

      // --- swarm.v1 (direct Hyperswarm access for hyper:// pages — see docs/SWARM-V1.md) ---
      //
      //   POST /api/swarm/join       — open a channel; returns channelId
      //   POST /api/swarm/ticket     — mint a one-time credential for EventSource
      //   GET  /api/swarm/events     — SSE stream of peer/message events
      //   POST /api/swarm/send       — send to a peer
      //   POST /api/swarm/leave      — close the channel
      //
      // All five are gated by the per-app token or its origin-bound SSE ticket.
      // Tier C topic joins additionally fire EVT_SWARM_REQUEST and wait
      // on the user's consent reply before resolving.

      if (path.startsWith('/api/swarm/')) {
        if (!this._swarmBridge) {
          return this._jsonError(res, 'swarm bridge not available', 503)
        }
        if (req.method === 'GET' && path === '/api/swarm/events') {
          const channelId = url.searchParams.get('channelId')
          if (!channelId) return this._jsonError(res, 'channelId required', 400)
          const auth = this._consumeSseTicket(req, res, url, channelId)
          if (!auth) return true
          // SSE response — long-lived, no JSON Content-Type.
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache, no-transform')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('X-Accel-Buffering', 'no')
          const closeHandlers = []
          const queue = []
          const maxSseQueue = this._maxSseQueue
          const maxSseQueueBytes = this._maxSseQueueBytes
          let queuedBytes = 0
          let ended = false
          let cleaned = false
          let draining = false
          let drainBound = false

          // EventSource has no application-level flow-control signal. Honour
          // Node/Bare's writable backpressure and keep only a bounded number
          // of frames while the page socket is stalled. A client that falls
          // further behind gets a closed stream and must rejoin with a fresh
          // channel and one-time ticket instead of growing host memory.
          const cleanup = () => {
            if (cleaned) return
            cleaned = true
            ended = true
            queue.length = 0
            queuedBytes = 0
            closeHandlers.forEach((fn) => { try { fn() } catch {} })
          }
          const closeStalledStream = () => {
            ended = true
            queue.length = 0
            queuedBytes = 0
            try {
              if (typeof res.destroy === 'function') res.destroy()
              else res.end()
            } catch {}
            cleanup()
          }
          const bindDrain = () => {
            if (drainBound || ended) return
            drainBound = true
            res.once('drain', () => {
              drainBound = false
              flushQueue()
            })
          }
          const flushQueue = () => {
            draining = false
            while (queue.length > 0) {
              if (ended || res.writableEnded || res.destroyed) {
                queue.length = 0
                queuedBytes = 0
                return
              }
              const queued = queue.shift()
              queuedBytes -= queued.bytes
              let writable
              try { writable = res.write(queued.frame) } catch {
                closeStalledStream()
                return
              }
              if (writable === false) {
                draining = true
                bindDrain()
                return
              }
            }
          }

          // Initial comment flushes headers immediately and participates in
          // the same backpressure state as subsequent event frames.
          try {
            if (res.write(': pear.swarm.v1 stream\n\n') === false) {
              draining = true
              bindDrain()
            }
          } catch {
            closeStalledStream()
          }
          if (ended) return true
          const stream = {
            send (eventObj) {
              if (ended || res.writableEnded || res.destroyed) return
              let frame
              try { frame = 'data: ' + JSON.stringify(eventObj) + '\n\n' } catch { return }
              if (draining) {
                const bytes = b4a.byteLength(frame)
                if (queue.length >= maxSseQueue || queuedBytes + bytes > maxSseQueueBytes) {
                  closeStalledStream()
                  return
                }
                queue.push({ frame, bytes })
                queuedBytes += bytes
                bindDrain()
                return
              }
              let writable
              try { writable = res.write(frame) } catch {
                closeStalledStream()
                return
              }
              if (writable === false) {
                draining = true
                bindDrain()
              }
            },
            close () {
              if (ended) return
              ended = true
              queue.length = 0
              queuedBytes = 0
              try { res.end() } catch {}
            },
            onClose (fn) {
              closeHandlers.push(fn)
            }
          }
          req.on('close', cleanup)
          req.on('error', cleanup)
          res.on('close', cleanup)
          res.on('error', cleanup)

          this._swarmBridge.attachStream(channelId, stream)
          // attachStream sends the 'unknown channelId' error + closes itself
          // when the channel doesn't exist, so we don't need to do anything
          // else here. If it succeeded, the response stays open until the
          // page closes the EventSource (or the channel is leave()'d).
          return true
        }

        const auth = this._requireToken(req, res)
        if (!auth) return true

        if (req.method === 'POST' && path === '/api/swarm/ticket') {
          const channelId = body?.channelId
          if (typeof channelId !== 'string' || channelId.length === 0) {
            return this._jsonError(res, 'channelId required', 400)
          }
          if (channelId.length > 256) {
            return this._jsonError(res, 'channelId too long', 400)
          }
          return this._json(res, this._mintSseTicket(auth, channelId))
        }

        if (req.method === 'POST' && path === '/api/swarm/join') {
          try {
            const result = await this._swarmBridge.join({
              driveKeyHex: auth.driveKeyHex,
              appName: body?.appName || null,
              reason: body?.reason || null,
              topicHex: body?.topicHex || null,
              subtopic: body?.subtopic === undefined ? null : body.subtopic,
              protocol: body?.protocol || 'pear.swarm.v1',
              version: body?.version || 1,
              server: !!body?.server,
              client: body?.client !== false
            })
            return this._json(res, result)
          } catch (err) {
            return this._jsonError(res, err.message, 400)
          }
        }

        if (req.method === 'POST' && path === '/api/swarm/send') {
          try {
            this._swarmBridge.send(body?.channelId, body?.peerId, body?.data)
            return this._json(res, { ok: true })
          } catch (err) {
            return this._jsonError(res, err.message, 400)
          }
        }

        if (req.method === 'POST' && path === '/api/swarm/leave') {
          try {
            await this._swarmBridge.leave(body?.channelId)
            return this._json(res, { ok: true })
          } catch (err) {
            return this._jsonError(res, err.message, 400)
          }
        }

        return this._jsonError(res, 'Unknown swarm endpoint', 404)
      }

      // --- anonGPT private buyer (Phase 0 plumbing) ---
      //
      // window.pear.anongpt.infer() in the page → POST here. The route
      // gate is doubled: (1) the X-Pear-Token only validates for the
      // drive that was issued the token (so a non-anonGPT page can't
      // call this even by reading the token off the wire), and (2) we
      // re-verify driveKeyHex matches the configured anonGPT key
      // before invoking the buyer. Either gate failing yields 403 so
      // the page can't tell whether the API exists for other drives.
      // See backend/anongpt-buyer.js for the buyer side.

      if (req.method === 'POST' && path === '/api/anongpt/infer') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._anongptDriveKey || auth.driveKeyHex.toLowerCase() !== this._anongptDriveKey) {
          return this._jsonError(res, 'anonGPT API is restricted to the anonGPT drive', 403)
        }
        if (!this._anongptBuyer) {
          // No buyer wired at all (Phase 0 not initialized). Honest
          // fail-closed — the page's existing UI already handles this.
          return this._json(res, {
            ok: false,
            code: 'buyer-not-configured',
            message: 'PearBrowser was started without an anonGPT buyer module.'
          })
        }
        const result = await this._anongptBuyer.infer(body || {})
        return this._json(res, result)
      }

      // --- Browser-owned native AI (QVAC) ---

      if (req.method === 'GET' && path === '/api/ai/capabilities') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        const allowed = await this._hasAiPermission(auth.driveKeyHex)
        const capabilities = this._aiService
          ? this._aiService.capabilities()
          : { available: false, local: true, streaming: true, models: [], reason: 'runtime-not-configured' }
        return this._json(res, { ...capabilities, allowed })
      }

      if (req.method === 'POST' && path === '/api/ai/completions') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._aiService) return this._jsonError(res, 'Local AI runtime is unavailable', 503)
        if (!await this._hasAiPermission(auth.driveKeyHex)) {
          return this._jsonError(res, 'App manifest does not declare pear.ai.infer', 403)
        }

        let run
        try {
          run = this._aiService.complete({
            origin: `hyper://${auth.driveKeyHex}`,
            model: body?.model,
            messages: body?.messages,
            maxTokens: body?.maxTokens,
            temperature: body?.temperature,
            reasoningBudget: body?.reasoningBudget
          })
        } catch (err) {
          return this._jsonError(res, err.message || 'Invalid AI request', err.code === 'queue-full' ? 429 : 400)
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('X-Pear-AI-Request-Id', run.requestId)
        this._aiRequestOwners.set(run.requestId, auth.driveKeyHex.toLowerCase())
        let streamDone = false
        const cancelOnDisconnect = () => {
          if (!streamDone) this._aiService.cancel(run.requestId).catch(() => {})
        }
        if (typeof res.on === 'function') res.on('close', cancelOnDisconnect)

        try {
          for await (const event of run.events) {
            res.write(JSON.stringify(event) + '\n')
          }
          await run.final.catch(() => {})
        } finally {
          streamDone = true
          this._aiRequestOwners.delete(run.requestId)
          res.end()
        }
        return true
      }

      if (req.method === 'POST' && path === '/api/ai/cancel') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._aiService) return this._jsonError(res, 'Local AI runtime is unavailable', 503)
        if (!await this._hasAiPermission(auth.driveKeyHex)) {
          return this._jsonError(res, 'App manifest does not declare pear.ai.infer', 403)
        }
        const requestId = typeof body?.requestId === 'string' ? body.requestId : ''
        if (!requestId) return this._jsonError(res, 'requestId required', 400)
        if (this._aiRequestOwners.get(requestId) !== auth.driveKeyHex.toLowerCase()) {
          return this._json(res, { ok: false })
        }
        return this._json(res, { ok: await this._aiService.cancel(requestId) })
      }

      // --- WDK wallet preview (docs/WDK_WALLET_V0.9_SPEC.md §4.4) ---

      if (path.startsWith('/api/wallet/v1/')) {
        return this._handleWallet(req, res, url, body)
      }

      // --- Status ---

      if (req.method === 'GET' && path === '/api/bridge/status') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        return this._json(res, {
          type: 'http-bridge',
          syncGroups: this._bridge._syncGroups ? this._bridge._syncGroups.size : 0,
          swarmConnected: !!this._swarm,
          peerCount: this._swarm ? this._swarm.connections.size : 0,
          driveKey: auth.driveKeyHex
        })
      }

      // Not found
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Unknown API endpoint: ' + path }))
      return true

    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
      return true
    }
  }

  /**
   * /api/wallet/v1/* — token-authenticated same-origin wallet routes
   * (spec §4.4). capabilities/status need only the general page token
   * (spec §4.1); every other route additionally requires the per-document
   * wallet token (spec §4.5), verified against the connection tuple. The
   * consent-bound routes (connect / payment / sign-app) open a pending
   * prompt in the wallet service, then park it with the chrome consent
   * broker and answer with the resolution — the request can take up to the
   * prompt TTL (~120s); the page shim deliberately sets no shorter timeout.
   */
  async _handleWallet (req, res, url, body) {
    const route = url.pathname.slice('/api/wallet/v1/'.length)
    try {
      if (!this._walletService) {
        return this._walletError(res, walletFail('wallet-unavailable', 'wallet is not available'))
      }
      // Transport-level body cap (spec §4.2): 16 KiB per wallet request.
      if (req.method === 'POST' && body && b4a.byteLength(JSON.stringify(body), 'utf8') > WALLET_BODY_MAX_BYTES) {
        res.statusCode = 413
        res.end(JSON.stringify({ ok: false, error: { code: 'bad-request', message: 'wallet request body exceeds 16 KiB' } }))
        return true
      }

      if (req.method === 'GET' && route === 'capabilities') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._checkWalletRateLimit(auth.driveKeyHex, 'default')) {
          return this._walletError(res, walletFail('rate-limited', 'rate limit exceeded'))
        }
        return this._walletOk(res, this._walletService.capabilities())
      }

      if (req.method === 'POST' && route === 'connect') {
        const ctx = await this._requireWalletAuth(req, res, { method: 'connect' })
        if (!ctx) return true
        if (!this._checkWalletRateLimit(ctx.auth.driveKeyHex, 'connect')) {
          return this._walletError(res, walletFail('rate-limited', 'too many connect attempts'))
        }
        // Re-fetch + re-validate the manifest server-side at connect time
        // (spec §3.2): a declaration establishes eligibility only.
        const manifest = await this._fetchWalletManifest(ctx.auth.driveKeyHex)
        if (!manifest) {
          return this._walletError(res, walletFail('bad-request', 'manifest.json is not reachable'))
        }
        let grants
        try {
          grants = validateWalletManifest(manifest)
        } catch (err) {
          return this._walletError(res, err)
        }
        if (!grants.connect) {
          return this._walletError(res, walletFail('bad-request', 'manifest does not declare pear.wallet.v1.connect'))
        }
        const caps = this._walletService.capabilities()
        // A connect request may narrow to a subset of the compiled-in
        // chains/assets; anything else is rejected before prompting.
        if (body && body.chainIds !== undefined &&
          (!Array.isArray(body.chainIds) || body.chainIds.some((c) => !caps.chainIds.includes(c)))) {
          return this._walletError(res, walletFail('unsupported-chain', 'chainIds must be a subset of the supported chains'))
        }
        if (body && body.assetIds !== undefined &&
          (!Array.isArray(body.assetIds) || body.assetIds.some((a) => !caps.assetIds.includes(a)))) {
          return this._walletError(res, walletFail('unsupported-asset', 'assetIds must be a subset of the supported assets'))
        }
        // Fail fast on a locked/absent wallet instead of parking a prompt
        // the user cannot meaningfully approve. service.connect re-checks.
        const walletState = await this._walletService.status()
        if (walletState.state !== 'unlocked') {
          return this._walletError(res, walletFail('wallet-locked', 'wallet is locked'))
        }
        if (typeof this._requestWalletConsent !== 'function') {
          return this._walletError(res, walletFail('wallet-unavailable', 'wallet consent is not available'))
        }
        const intent = {
          driveKey: ctx.auth.driveKeyHex,
          manifestSha256: grants.manifestSha256,
          chainId: caps.chainIds[0],
          assetId: caps.assetIds[0]
        }
        if (typeof manifest.name === 'string' && manifest.name.length > 0) {
          intent.appName = manifest.name.slice(0, 128)
        }
        // The connect prompt carries { token, manifest } parked server-side;
        // on approval the broker calls walletService.connect with them. The
        // permissions projection is display-only, for the consent modal.
        const prompt = {
          type: 'connect',
          intentId: newWalletIntentId(),
          intent,
          expiresAt: Date.now() + (this._walletService.promptTtlMs || 120000),
          token: ctx.docToken,
          manifest,
          permissions: { pay: grants.pay === true, signApp: grants.signApp === true }
        }
        const result = await this._requestWalletConsent(prompt, ctx.tuple)
        return this._walletOk(res, result)
      }

      if (req.method === 'GET' && route === 'status') {
        const auth = this._requireToken(req, res)
        if (!auth) return true
        if (!this._checkWalletRateLimit(auth.driveKeyHex, 'default')) {
          return this._walletError(res, walletFail('rate-limited', 'rate limit exceeded'))
        }
        const tuple = this._walletTuple(auth)
        const connection = this._walletService.listConnections().find((c) =>
          c.browserSessionId === tuple.browserSessionId &&
          c.tabId === tuple.tabId &&
          c.driveKey === tuple.driveKey &&
          c.walletTabOrigin === tuple.walletTabOrigin
        ) || null
        const walletState = await this._walletService.status()
        // Spec §4.1: report whether the app is connected and whether the
        // wallet can accept a request — without distinguishing absent vs
        // locked (fingerprinting) and never revealing the address.
        const walletReady = walletState.state === 'unlocked'
        const result = {
          connected: connection !== null,
          canAcceptRequests: connection !== null && walletReady,
          walletReady
        }
        if (connection) {
          result.chainId = connection.chainId
          result.assetId = connection.assetId
          result.permissions = connection.permissions
          result.manifestSha256 = connection.manifestSha256
        }
        return this._walletOk(res, result)
      }

      if (req.method === 'POST' && route === 'payment') {
        const ctx = await this._requireWalletAuth(req, res, { method: 'requestPayment' })
        if (!ctx) return true
        if (!this._checkWalletRateLimit(ctx.auth.driveKeyHex, 'payment')) {
          return this._walletError(res, walletFail('rate-limited', 'too many payment attempts'))
        }
        if (typeof this._requestWalletConsent !== 'function') {
          return this._walletError(res, walletFail('wallet-unavailable', 'wallet consent is not available'))
        }
        // Open the pending prompt (validates the connection, manifest grant,
        // chain, asset and input), then park it for chrome consent. The
        // promise settles with the service's resolvePrompt() outcome —
        // { intentId, state: 'submitted', transactionHash, … } or rejected.
        const prompt = await this._walletService.requestPayment(ctx.tuple, ctx.docToken, body || {})
        // Idempotent replay (spec §8.3): an already-settled reservation
        // returns its recorded outcome instead of a prompt — nothing to
        // park. A replay of a still-open prompt returns the live prompt
        // record and the broker fails the duplicate park with wallet-busy,
        // so the retry never raises a second consent modal.
        if (prompt && typeof prompt.state === 'string') {
          return this._walletOk(res, prompt)
        }
        const result = await this._requestWalletConsent(prompt, ctx.tuple)
        return this._walletOk(res, result)
      }

      if (req.method === 'POST' && route === 'sign-app') {
        const ctx = await this._requireWalletAuth(req, res, { method: 'signAppPayload' })
        if (!ctx) return true
        if (!this._checkWalletRateLimit(ctx.auth.driveKeyHex, 'sign-app')) {
          return this._walletError(res, walletFail('rate-limited', 'too many sign attempts'))
        }
        if (typeof this._requestWalletConsent !== 'function') {
          return this._walletError(res, walletFail('wallet-unavailable', 'wallet consent is not available'))
        }
        const prompt = await this._walletService.signAppPayload(ctx.tuple, ctx.docToken, body || {})
        const result = await this._requestWalletConsent(prompt, ctx.tuple)
        // The service returns raw engine values (frozen); the wire format
        // is hex strings — copy before normalizing.
        const out = result && typeof result === 'object' ? { ...result } : result
        if (out && typeof out === 'object') {
          if (out.signature !== undefined) out.signature = hexOrString(out.signature)
          if (out.digest !== undefined) out.digest = hexOrString(out.digest)
        }
        return this._walletOk(res, out)
      }

      if (req.method === 'GET' && route === 'transaction') {
        const ctx = await this._requireWalletAuth(req, res, { method: 'transaction' })
        if (!ctx) return true
        if (!this._checkWalletRateLimit(ctx.auth.driveKeyHex, 'transaction')) {
          return this._walletError(res, walletFail('rate-limited', 'rate limit exceeded'))
        }
        const intentId = url.searchParams.get('intentId') || url.searchParams.get('id')
        const result = await this._walletService.transaction(ctx.tuple, ctx.docToken, intentId)
        return this._walletOk(res, result)
      }

      if (req.method === 'POST' && route === 'disconnect') {
        const ctx = await this._requireWalletAuth(req, res, { method: 'disconnect' })
        if (!ctx) return true
        if (!this._checkWalletRateLimit(ctx.auth.driveKeyHex, 'default')) {
          return this._walletError(res, walletFail('rate-limited', 'rate limit exceeded'))
        }
        const result = await this._walletService.disconnect(ctx.tuple, ctx.docToken)
        return this._walletOk(res, result)
      }

      return this._walletError(res, walletFail('not-found', 'unknown wallet endpoint'))
    } catch (err) {
      return this._walletError(res, err)
    }
  }

  _json (res, data) {
    res.statusCode = 200
    res.end(JSON.stringify(data))
    return true
  }

  _jsonError (res, message, status = 400) {
    res.statusCode = status
    res.end(JSON.stringify({ error: message }))
    return true
  }

  _readBody (req) {
    return new Promise((resolve, reject) => {
      let data = ''
      let size = 0
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > 1024 * 1024) { // 1MB max
          req.destroy()
          reject(new Error('Body too large'))
          return
        }
        data += chunk
      })
      req.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {}
          // SECURITY: Prevent prototype pollution
          if (parsed && typeof parsed === 'object') {
            delete parsed.__proto__
            delete parsed.constructor
          }
          resolve(parsed)
        } catch (err) {
          reject(new Error('Invalid JSON: ' + err.message))
        }
      })
      req.on('error', reject)
    })
  }
}

module.exports = { HttpBridge }
