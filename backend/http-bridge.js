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
    this._appSyncRegistry = opts.appSyncRegistry || null
    this._getAppDataIndexer = typeof opts.getAppDataIndexer === 'function'
      ? opts.getAppDataIndexer
      : () => opts.appDataIndexer || null
    this._rateLimiter = new Map() // Simple rate limiting per IP
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

  _rememberAppSyncGroup ({ auth, rawAppId, scopedAppId, inviteKey }) {
    if (!this._appSyncRegistry || !inviteKey) return null
    try {
      return this._appSyncRegistry.remember({
        scopedAppId,
        appDriveKey: auth.driveKeyHex,
        rawAppId,
        inviteKey
      })
    } catch (err) {
      console.warn('[HttpBridge] sync registry remember failed:', err && err.message)
      return null
    }
  }

  async _indexAppSyncAppend ({ auth, rawAppId, scopedAppId, op }) {
    let indexer = null
    try { indexer = this._getAppDataIndexer && this._getAppDataIndexer() } catch (_) {}
    if (!indexer || typeof indexer.indexAppend !== 'function') return
    try {
      await indexer.indexAppend({
        appDriveKey: auth.driveKeyHex,
        rawAppId,
        scopedAppId,
        op
      })
    } catch (err) {
      console.warn('[HttpBridge] app data index failed:', err && err.message)
    }
  }

  _requireToken (req, res, urlObj) {
    // Token is normally in the X-Pear-Token header. EventSource cannot
    // set custom headers, so the SSE endpoint also accepts the token on
    // the URL as ?token=…. Same security boundary either way — the
    // worklet validates against its in-memory issuance map.
    const rawToken = req.headers['x-pear-token']
    let token = Array.isArray(rawToken) ? rawToken[0] : rawToken
    if (!token && urlObj && urlObj.searchParams) {
      token = urlObj.searchParams.get('token') || null
    }
    const driveKeyHex = this._validateToken(token)
    if (!driveKeyHex) {
      this._jsonError(res, 'Unauthorized', 401)
      return null
    }
    return { driveKeyHex, token }
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
        this._rememberAppSyncGroup({ auth, rawAppId: body.appId, scopedAppId, inviteKey: result && result.inviteKey })
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
        this._rememberAppSyncGroup({ auth, rawAppId: body.appId, scopedAppId, inviteKey: (result && result.inviteKey) || body.inviteKey })
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
        const op = body.op || body
        const result = await this._bridge.append(scopedAppId, op)
        await this._indexAppSyncAppend({ auth, rawAppId: body.appId, scopedAppId, op })
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
        const loginBody = body || {}
        const scopes = Array.isArray(loginBody.scopes) ? loginBody.scopes.map(String) : []
        const appName = typeof loginBody.appName === 'string' ? loginBody.appName.slice(0, 128) : null
        const reason = typeof loginBody.reason === 'string' ? loginBody.reason.slice(0, 512) : null
        const challenge = typeof loginBody.challenge === 'string' ? loginBody.challenge : null
        try {
          const attestation = await this._requestLogin({
            driveKeyHex: auth.driveKeyHex, scopes, appName, reason, challenge,
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
      //   GET  /api/swarm/events     — SSE stream of peer/message events
      //   POST /api/swarm/send       — send to a peer
      //   POST /api/swarm/leave      — close the channel
      //
      // All four are gated by the per-app token + Origin check above.
      // Tier C topic joins additionally fire EVT_SWARM_REQUEST and wait
      // on the user's consent reply before resolving.

      if (path.startsWith('/api/swarm/')) {
        if (!this._swarmBridge) {
          return this._jsonError(res, 'swarm bridge not available', 503)
        }
        // Pass `url` so /api/swarm/events (SSE) can fall back to ?token=…
        // when EventSource can't set the X-Pear-Token header.
        const auth = this._requireToken(req, res, url)
        if (!auth) return true

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

        if (req.method === 'GET' && path === '/api/swarm/events') {
          const channelId = url.searchParams.get('channelId')
          if (!channelId) return this._jsonError(res, 'channelId required', 400)
          // SSE response — long-lived, no JSON Content-Type.
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache, no-transform')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('X-Accel-Buffering', 'no')
          // Initial comment to flush headers immediately.
          res.write(': pear.swarm.v1 stream\n\n')

          const closeHandlers = []
          const stream = {
            send (eventObj) {
              try {
                res.write('data: ' + JSON.stringify(eventObj) + '\n\n')
              } catch {}
            },
            close () {
              try { res.end() } catch {}
            },
            onClose (fn) {
              closeHandlers.push(fn)
            }
          }
          const cleanup = () => closeHandlers.forEach((fn) => { try { fn() } catch {} })
          req.on('close', cleanup)
          req.on('error', cleanup)
          res.on('close', cleanup)

          const ok = this._swarmBridge.attachStream(channelId, stream)
          // attachStream sends the 'unknown channelId' error + closes itself
          // when the channel doesn't exist, so we don't need to do anything
          // else here. If it succeeded, the response stays open until the
          // page closes the EventSource (or the channel is leave()'d).
          return true
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
