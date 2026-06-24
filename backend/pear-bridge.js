/**
 * Pear Bridge — P2P API for apps running in PearBrowser's WebView
 *
 * Provides a JavaScript API that gets injected into WebViews,
 * allowing P2P apps to access Hyperswarm, Autobase, and Hyperdrive
 * through the worklet backend.
 *
 * Apps call window.pear.* which posts messages to React Native,
 * which forwards them via RPC to the worklet, which does the P2P work.
 *
 * Architecture:
 *   WebView JS → postMessage → React Native → RPC → Worklet → Hyperswarm/Autobase
 */

const Autobase = require('autobase')
const Hyperbee = require('hyperbee')
const crypto = require('bare-crypto')
let fs = null
let path = null
try {
  fs = require('bare-fs')
  path = require('bare-path')
} catch (_) {
  try {
    fs = require('node:fs')
    path = require('node:path')
  } catch (_) {}
}

const HEX64 = /^[0-9a-f]{64}$/i

class PearBridge {
  constructor (store, swarm, opts = {}) {
    this.store = store
    this.swarm = swarm
    this._syncGroups = new Map() // groupId → { base, swarm topic }
    this._appDrives = new Map() // appId → Hyperdrive
    this._syncStateFile = opts && opts.storagePath && fs && path
      ? path.join(opts.storagePath, 'pear-bridge-sync-groups.json')
      : null
    this._rememberedSyncGroups = this._loadRememberedSyncGroups()
  }

  // Validate appId format to prevent path traversal
  _validateAppId (appId) {
    if (typeof appId !== 'string') {
      throw new Error('appId must be a string')
    }
    if (appId.length < 1 || appId.length > 64) {
      throw new Error('appId must be between 1 and 64 characters')
    }
    // Only allow alphanumeric, hyphens, and underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(appId)) {
      throw new Error('appId contains invalid characters')
    }
    // Prevent special reserved names
    const reserved = ['__proto__', 'constructor', 'prototype']
    if (reserved.includes(appId.toLowerCase())) {
      throw new Error('appId is reserved')
    }
    return appId
  }

  // ---------------------------------------------------------------------------
  // Sync Groups (Autobase)
  // ---------------------------------------------------------------------------

  _loadRememberedSyncGroups () {
    if (!this._syncStateFile || !fs) return {}
    try {
      const parsed = JSON.parse(fs.readFileSync(this._syncStateFile, 'utf-8'))
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
      const out = {}
      for (const [appId, inviteKey] of Object.entries(parsed)) {
        try {
          this._validateAppId(appId)
          if (typeof inviteKey === 'string' && HEX64.test(inviteKey)) out[appId] = inviteKey
        } catch (_) {}
      }
      return out
    } catch (_) {
      return {}
    }
  }

  _persistRememberedSyncGroups () {
    if (!this._syncStateFile || !fs || !path) return
    try {
      const dir = path.dirname(this._syncStateFile)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(this._syncStateFile, JSON.stringify(this._rememberedSyncGroups))
    } catch (err) {
      console.warn('[PearBridge] could not persist sync groups:', err && err.message)
    }
  }

  _rememberSyncGroup (appId, inviteKey) {
    if (!appId || !inviteKey || !HEX64.test(inviteKey)) return
    if (this._rememberedSyncGroups[appId] === inviteKey) return
    this._rememberedSyncGroups[appId] = inviteKey
    this._persistRememberedSyncGroups()
  }

  _forgetSyncGroup (appId, inviteKey) {
    if (!this._rememberedSyncGroups[appId]) return
    if (inviteKey && this._rememberedSyncGroups[appId] !== inviteKey) return
    delete this._rememberedSyncGroups[appId]
    this._persistRememberedSyncGroups()
  }

  async _openRememberedSyncGroup (appId) {
    if (this._syncGroups.has(appId)) return this._syncGroups.get(appId)
    const inviteKey = this._rememberedSyncGroups[appId]
    if (!inviteKey) return null
    try {
      await this.joinSyncGroup(appId, inviteKey)
      return this._syncGroups.get(appId) || null
    } catch (err) {
      console.warn('[PearBridge] remembered sync group failed to reopen:', appId, err && err.message)
      this._forgetSyncGroup(appId, inviteKey)
      return null
    }
  }

  _syncStatusForGroup (appId, group) {
    if (!group) return null
    return {
      appId,
      inviteKey: group.inviteKey,
      writerCount: group.base.inputs?.length || 1,
      viewLength: group.base.view?.version || 0
    }
  }

  /**
   * Create a new sync group — returns an invite key others can join with
   */
  async createSyncGroup (appId, applyFn) {
    // Validate appId
    this._validateAppId(appId)
    const existing = this._syncGroups.get(appId)
    if (existing) return this._syncStatusForGroup(appId, existing)

    const remembered = this._rememberedSyncGroups[appId]
    if (remembered) {
      try {
        return await this.joinSyncGroup(appId, remembered, applyFn)
      } catch (err) {
        console.warn('[PearBridge] remembered sync group failed during create:', appId, err && err.message)
        this._forgetSyncGroup(appId, remembered)
      }
    }

    const localWriter = this.store.get({ name: `pear-app-${appId}-writer` })
    await localWriter.ready()

    // CRITICAL: give each sync group its OWN namespaced substore (keyed by the
    // already-validated appId) rather than the raw store. base.close() runs
    // store.close(); on the shared ROOT Corestore that tears down Hyperdrive/
    // UserData/Names/replication for the WHOLE app. A namespace session's close()
    // frees only that group's cores. A per-appId substore also stops two sync
    // groups from colliding on the same Autobase local writer core on one store.
    const baseStore = typeof this.store.namespace === 'function'
      ? this.store.namespace(`pear-bridge-${appId}`) : this.store
    const base = new Autobase(baseStore, null, {
      apply: applyFn || this._defaultApply,
      open: (store) => new Hyperbee(store.get({ name: `pear-app-${appId}-view` }), {
        keyEncoding: 'utf-8',
        valueEncoding: 'binary',
        extension: false
      }),
      valueEncoding: 'json'
    })

    await base.ready()
    const inviteKey = (base.key || base.local.key).toString('hex')
    const writerPublicKey = base.local.key.toString('hex')

    // Derive topic and join swarm
    const topic = crypto.createHash('sha256').update(inviteKey).digest()
    this.swarm.join(topic, { server: true, client: true })

    this._syncGroups.set(appId, { base, topic, inviteKey })
    this._rememberSyncGroup(appId, inviteKey)

    return { inviteKey, appId, writerPublicKey }
  }

  /**
   * Join an existing sync group by invite key
   */
  async joinSyncGroup (appId, inviteKeyHex, applyFn) {
    // Validate appId
    this._validateAppId(appId)
    // Validate invite key format
    if (!inviteKeyHex || !HEX64.test(inviteKeyHex)) {
      throw new Error('Invalid invite key format')
    }
    const existing = this._syncGroups.get(appId)
    if (existing) return this._syncStatusForGroup(appId, existing)

    const bootstrapKey = Buffer.from(inviteKeyHex, 'hex')

    // Per-appId substore — see createSyncGroup: keeps each group's cores out of
    // the raw root store so close() can't tear the whole app's storage down.
    const baseStore = typeof this.store.namespace === 'function'
      ? this.store.namespace(`pear-bridge-${appId}`) : this.store
    const base = new Autobase(baseStore, bootstrapKey, {
      apply: applyFn || this._defaultApply,
      open: (store) => new Hyperbee(store.get({ name: `pear-app-${appId}-view` }), {
        keyEncoding: 'utf-8',
        valueEncoding: 'binary',
        extension: false
      }),
      valueEncoding: 'json'
    })

    await base.ready()
    await base.view.update()

    const topic = crypto.createHash('sha256').update(inviteKeyHex).digest()
    this.swarm.join(topic, { server: true, client: true })

    this._syncGroups.set(appId, { base, topic, inviteKey: inviteKeyHex })
    this._rememberSyncGroup(appId, inviteKeyHex)

    const writerPublicKey = base.local.key.toString('hex')
    return { inviteKey: inviteKeyHex, appId, writerPublicKey }
  }

  /**
   * Append an operation to a sync group
   */
  async append (appId, operation) {
    // Validate appId
    this._validateAppId(appId)
    const group = this._syncGroups.get(appId) || await this._openRememberedSyncGroup(appId)
    if (!group) throw new Error('Sync group not found: ' + appId)

    const entry = {
      type: operation.type,
      data: operation.data,
      timestamp: operation.timestamp || new Date().toISOString(),
      deviceId: group.base.local.key.toString('hex').slice(0, 16)
    }

    await group.base.append(JSON.stringify(entry))
    await group.base.view.update()

    return { ok: true }
  }

  /**
   * Query the sync group's view (Hyperbee)
   */
  async get (appId, key) {
    // Validate appId
    this._validateAppId(appId)
    // Validate key
    if (typeof key !== 'string' || key.length === 0 || key.length > 1024) {
      throw new Error('Invalid key')
    }
    const group = this._syncGroups.get(appId)
      || await this._openRememberedSyncGroup(appId)
    if (!group) throw new Error('Sync group not found: ' + appId)

    await group.base.view.update()
    const node = await group.base.view.get(key)
    if (!node || !node.value) return null
    return JSON.parse(node.value.toString())
  }

  /**
   * List entries from the sync group's view with a prefix
   */
  async list (appId, prefix, opts = {}) {
    // Validate appId
    this._validateAppId(appId)
    const group = this._syncGroups.get(appId) || await this._openRememberedSyncGroup(appId)
    if (!group) throw new Error('Sync group not found: ' + appId)

    // Validate limit
    let limit = opts.limit || 100
    if (typeof limit !== 'number' || limit < 1) limit = 100
    if (limit > 1000) limit = 1000 // Max 1000 items

    // Validate prefix
    if (prefix && typeof prefix !== 'string') {
      throw new Error('Invalid prefix')
    }
    if (prefix && prefix.length > 1024) {
      throw new Error('Prefix too long')
    }

    await group.base.view.update()

    const results = []
    const rangeOpts = {}
    if (prefix) {
      rangeOpts.gte = prefix
      rangeOpts.lt = prefix + '\xff'
    }

    for await (const node of group.base.view.createReadStream(rangeOpts)) {
      if (results.length >= limit) break
      try {
        results.push({
          key: node.key,
          value: JSON.parse(node.value.toString())
        })
      } catch (err) {
        console.error('Failed to parse node value:', err.message)
      }
    }

    return results
  }

  /**
   * Range query with explicit bounds (gte/lte/lt/gt), optional reverse.
   *
   * Tickets-style apps need this for sorted pagination (e.g. attendees list
   * scrolled by registration time). More flexible than list(prefix, limit).
   *
   * opts: { gte?, lte?, gt?, lt?, limit?, reverse? }
   */
  async range (appId, opts = {}) {
    this._validateAppId(appId)
    const group = this._syncGroups.get(appId) || await this._openRememberedSyncGroup(appId)
    if (!group) throw new Error('Sync group not found: ' + appId)

    // Validate + clamp limit
    let limit = opts.limit || 100
    if (typeof limit !== 'number' || limit < 1) limit = 100
    if (limit > 1000) limit = 1000

    // Validate bound strings
    const bound = (k) => {
      const v = opts[k]
      if (v === undefined || v === null) return undefined
      if (typeof v !== 'string' || v.length > 1024) throw new Error(`Invalid ${k} bound`)
      return v
    }

    const rangeOpts = {
      gte: bound('gte'),
      gt: bound('gt'),
      lte: bound('lte'),
      lt: bound('lt'),
      reverse: !!opts.reverse,
    }
    // Strip undefined so Hyperbee defaults apply cleanly
    Object.keys(rangeOpts).forEach((k) => rangeOpts[k] === undefined && delete rangeOpts[k])

    await group.base.view.update()
    const results = []
    for await (const node of group.base.view.createReadStream(rangeOpts)) {
      if (results.length >= limit) break
      try {
        results.push({ key: node.key, value: JSON.parse(node.value.toString()) })
      } catch (err) {
        console.error('range: failed to parse node:', err.message)
      }
    }
    return results
  }

  /**
   * Count entries under a prefix. O(n) scan but capped — useful for
   * dashboard tiles ("12 tickets sold") without fetching all the values.
   */
  async count (appId, prefix) {
    this._validateAppId(appId)
    const group = this._syncGroups.get(appId) || await this._openRememberedSyncGroup(appId)
    if (!group) throw new Error('Sync group not found: ' + appId)

    if (prefix !== undefined && (typeof prefix !== 'string' || prefix.length > 1024)) {
      throw new Error('Invalid prefix')
    }

    await group.base.view.update()
    const rangeOpts = {}
    if (prefix) {
      rangeOpts.gte = prefix
      rangeOpts.lt = prefix + '\xff'
    }
    let n = 0
    const MAX = 100_000 // sanity cap
    for await (const _ of group.base.view.createReadStream(rangeOpts)) {
      if (++n >= MAX) break
    }
    return n
  }

  /**
   * Get sync group status
   */
  getSyncStatus (appId) {
    // Validate appId
    this._validateAppId(appId)
    const group = this._syncGroups.get(appId)
    return this._syncStatusForGroup(appId, group)
  }

  /**
   * POS-compatible apply function — matches sync-apply.js from Pear POS.
   * Handles product:create, product:update, product:delete, transaction:create,
   * config:set, stock:adjust, and more.
   */
  async _defaultApply (batch, view) {
    const b = view.batch({ update: false })

    for (const node of batch) {
      if (!node.value) continue
      let op
      try { op = JSON.parse(node.value.toString()) } catch (err) {
        console.error('Failed to parse operation:', err.message)
        continue
      }
      // Validate operation structure
      if (!op || typeof op !== 'object' || !op.type) {
        console.error('Invalid operation structure')
        continue
      }

      try {
        const k = (...parts) => parts.join('!')
        const enc = (obj) => Buffer.from(JSON.stringify(obj))
        const dec = (n) => n && n.value ? JSON.parse(n.value.toString()) : null

        switch (op.type) {
          case 'product:create': {
            const p = op.data
            await b.put(k('products', p.id), enc(p))
            if (p.barcode) await b.put(k('products-by-barcode', p.barcode), enc(p.id))
            if (p.sku) await b.put(k('products-by-sku', p.sku), enc(p.id))
            if (p.category) await b.put(k('products-by-category', p.category.toLowerCase(), p.id), enc(p.id))
            if (p.name) await b.put(k('products-by-name', p.name.toLowerCase(), p.id), enc(p.id))
            break
          }
          case 'product:update': {
            const { id, updates } = op.data
            const existing = dec(await b.get(k('products', id)))
            if (!existing) break
            const updated = { ...existing, ...updates, id, updated_at: op.timestamp }
            await b.put(k('products', id), enc(updated))
            if (updated.barcode) await b.put(k('products-by-barcode', updated.barcode), enc(id))
            if (updated.sku) await b.put(k('products-by-sku', updated.sku), enc(id))
            break
          }
          case 'product:delete': {
            const { id } = op.data
            const existing = dec(await b.get(k('products', id)))
            if (existing) await b.put(k('products', id), enc({ ...existing, active: false, updated_at: op.timestamp }))
            break
          }
          case 'stock:adjust': {
            const { product_id, delta } = op.data
            const existing = dec(await b.get(k('products', product_id)))
            if (existing) {
              existing.stock = (existing.stock || 0) + delta
              existing.updated_at = op.timestamp
              await b.put(k('products', product_id), enc(existing))
            }
            break
          }
          case 'transaction:create': {
            const tx = op.data
            const ts = tx.created_at || op.timestamp
            await b.put(k('transactions', ts, tx.id), enc(tx))
            await b.put(k('transactions-by-id', tx.id), enc(tx))
            break
          }
          case 'config:set': case 'merchant:register': {
            const existing = dec(await b.get('config!merchant'))
            await b.put('config!merchant', enc({ ...(existing || {}), ...op.data, updated_at: op.timestamp }))
            break
          }

          // ---- Tickets ops (13 handlers) ------------------------------------
          // Generic — used by any appId. Scoping lives in the caller's appId
          // so two different events go into two different sync groups.
          case 'event:create': {
            const e = op.data
            if (!e || !e.id) break
            await b.put(k('events', e.id), enc({ ...e, status: e.status || 'draft', created_at: op.timestamp }))
            if (e.name) await b.put(k('events-by-name', e.name.toLowerCase(), e.id), enc(e.id))
            break
          }
          case 'event:update': {
            const { id, updates } = op.data
            const existing = dec(await b.get(k('events', id)))
            if (!existing) break
            const next = { ...existing, ...updates, id, updated_at: op.timestamp }
            await b.put(k('events', id), enc(next))
            break
          }
          case 'event:publish': {
            const { id } = op.data
            const existing = dec(await b.get(k('events', id)))
            if (!existing) break
            await b.put(k('events', id), enc({ ...existing, status: 'live', published_at: op.timestamp }))
            break
          }
          case 'event:cancel': {
            const { id, reason } = op.data
            const existing = dec(await b.get(k('events', id)))
            if (!existing) break
            await b.put(k('events', id), enc({ ...existing, status: 'cancelled', cancel_reason: reason, updated_at: op.timestamp }))
            break
          }
          case 'ticket-type:create': {
            const t = op.data
            if (!t || !t.id || !t.event_id) break
            await b.put(k('ticket-types', t.event_id, t.id), enc({ ...t, created_at: op.timestamp }))
            break
          }
          case 'ticket-type:update': {
            const { event_id, id, updates } = op.data
            const existing = dec(await b.get(k('ticket-types', event_id, id)))
            if (!existing) break
            await b.put(k('ticket-types', event_id, id), enc({ ...existing, ...updates, updated_at: op.timestamp }))
            break
          }
          case 'ticket:mint': {
            const t = op.data
            if (!t || !t.id || !t.event_id) break
            const full = { ...t, status: t.status || 'issued', minted_at: op.timestamp }
            await b.put(k('tickets', t.event_id, t.id), enc(full))
            if (t.holder_pubkey) await b.put(k('tickets-by-holder', t.holder_pubkey, t.id), enc(t.id))
            break
          }
          case 'ticket:transfer': {
            const { event_id, id, new_holder_pubkey } = op.data
            const existing = dec(await b.get(k('tickets', event_id, id)))
            if (!existing) break
            if (existing.holder_pubkey) {
              await b.del(k('tickets-by-holder', existing.holder_pubkey, id))
            }
            const next = { ...existing, holder_pubkey: new_holder_pubkey, updated_at: op.timestamp }
            await b.put(k('tickets', event_id, id), enc(next))
            await b.put(k('tickets-by-holder', new_holder_pubkey, id), enc(id))
            break
          }
          case 'ticket:redeem': {
            const { event_id, id, redeemed_by } = op.data
            const existing = dec(await b.get(k('tickets', event_id, id)))
            if (!existing) break
            if (existing.status === 'redeemed') break // idempotent — first redeem wins
            const next = { ...existing, status: 'redeemed', redeemed_at: op.timestamp, redeemed_by }
            await b.put(k('tickets', event_id, id), enc(next))
            break
          }
          case 'ticket:refund': {
            const { event_id, id, reason } = op.data
            const existing = dec(await b.get(k('tickets', event_id, id)))
            if (!existing) break
            await b.put(k('tickets', event_id, id), enc({ ...existing, status: 'refunded', refund_reason: reason, updated_at: op.timestamp }))
            break
          }
          case 'ticket:void': {
            const { event_id, id, reason } = op.data
            const existing = dec(await b.get(k('tickets', event_id, id)))
            if (!existing) break
            await b.put(k('tickets', event_id, id), enc({ ...existing, status: 'void', void_reason: reason, updated_at: op.timestamp }))
            break
          }
          case 'attendee:register': {
            const a = op.data
            if (!a || !a.pubkey) break
            await b.put(k('attendees', a.pubkey), enc({ ...a, registered_at: op.timestamp }))
            if (a.email) await b.put(k('attendees-by-email', a.email.toLowerCase()), enc(a.pubkey))
            break
          }
          case 'venue:set': {
            const v = op.data
            if (!v || !v.event_id) break
            await b.put(k('venues', v.event_id), enc({ ...v, updated_at: op.timestamp }))
            break
          }
          // -------------------------------------------------------------------

          default: {
            // Generic fallback for unknown op types
            if (op.data && op.data.id) {
              await b.put(k(op.type.replace(':', '!'), op.data.id), enc(op.data))
            }
            break
          }
        }
      } catch (err) {
        console.error('Apply operation failed:', err.message)
      }
    }
    await b.flush()
  }

  async close () {
    for (const [, group] of this._syncGroups) {
      try { await this.swarm.leave(group.topic) } catch (err) {
        console.error('Failed to leave topic:', err.message)
      }
      // Close each group's Autobase to free its cores. Safe now that every base
      // owns a namespaced substore: base.close() closes only that session, never
      // the shared root Corestore (Hyperdrive/UserData/Names/replication).
      try { if (group.base) await group.base.close() } catch (err) {
        console.error('Failed to close sync group base:', err.message)
      }
    }
    this._syncGroups.clear()
  }
}

/**
 * Page-side shim injected into every `text/html` response served by the
 * HyperProxy. Adds `window.pear.swarm.v1` (and reserves `window.pear`
 * for future companion APIs).
 *
 * Talks to `/api/swarm/{join,send,leave,events}` over same-origin fetch
 * + EventSource. Token is read from a `<meta name="pear-api-token">`
 * tag the proxy injects alongside this script.
 *
 * Page authors should always feature-detect:
 *
 *   if (window.pear?.swarm?.v1) {
 *     const ch = await window.pear.swarm.v1.join(null, { subtopic: 'rooms/lobby' })
 *     ch.on('peer', (p) => p.send(new TextEncoder().encode('hi')))
 *     ch.on('message', (peer, data) => { ... })
 *   }
 *
 * On the wire `data` is base64. The shim decodes to Uint8Array on the
 * way in and base64-encodes Uint8Array on the way out.
 */
const PEAR_SWARM_V1_SHIM = `<script>(function () {
  if (window.pear && window.pear.swarm && window.pear.swarm.v1) return
  function readToken () {
    var m = document.querySelector('meta[name="pear-api-token"]')
    return m ? m.content : ''
  }
  function b64encode (u8) {
    var s = ''
    for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
    return btoa(s)
  }
  function b64decode (s) {
    var bin = atob(s)
    var u8 = new Uint8Array(bin.length)
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
    return u8
  }
  async function rpc (method, path, body) {
    var headers = { 'X-Pear-Token': readToken() }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    var res = await fetch(path, {
      method: method,
      headers: headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    if (!res.ok) {
      var err = ''
      try { var j = await res.json(); err = (j && j.error) || res.statusText } catch (_) { err = res.statusText }
      throw new Error('pear.swarm: ' + err)
    }
    return res.json()
  }
  function makeChannel (info) {
    var listeners = { peer: [], message: [], 'peer-leave': [], error: [], closed: [] }
    var peers = new Map()
    var destroyed = false
    var es = null
    function emit (event) {
      var args = Array.prototype.slice.call(arguments, 1)
      var fns = listeners[event] || []
      for (var i = 0; i < fns.length; i++) {
        try { fns[i].apply(null, args) } catch (e) { console.error('[pear.swarm] listener threw:', e) }
      }
    }
    function makePeer (peerId, pubkey) {
      return {
        id: peerId,
        pubkey: pubkey || null,
        send: function (data) {
          if (destroyed) throw new Error('channel destroyed')
          var u8 = data instanceof Uint8Array ? data : new Uint8Array(data)
          rpc('POST', '/api/swarm/send', {
            channelId: info.channelId,
            peerId: peerId,
            data: b64encode(u8)
          }).catch(function (err) { emit('error', err) })
        }
      }
    }
    function attachStream () {
      var url = '/api/swarm/events?channelId=' + encodeURIComponent(info.channelId)
        + '&token=' + encodeURIComponent(readToken())
      es = new EventSource(url)
      es.onmessage = function (ev) {
        var msg
        try { msg = JSON.parse(ev.data) } catch (_) { return }
        switch (msg.type) {
          case 'peer': {
            var peer = makePeer(msg.peerId, msg.pubkey)
            peers.set(msg.peerId, peer)
            emit('peer', peer); break
          }
          case 'peer-leave': {
            var p = peers.get(msg.peerId); peers.delete(msg.peerId)
            if (p) emit('peer-leave', p); break
          }
          case 'message': {
            var peerObj = peers.get(msg.peerId)
            if (peerObj) emit('message', peerObj, b64decode(msg.data)); break
          }
          case 'error': emit('error', new Error(msg.message || 'swarm error')); break
          case 'closed': channel.destroy(); break
        }
      }
      es.onerror = function () {
        if (!destroyed) { try { es.close() } catch (_) {} channel.destroy() }
      }
    }
    var channel = {
      channelId: info.channelId,
      topic: info.topicHex,
      topicHex: info.topicHex,
      protocol: info.protocol,
      version: info.version,
      tier: info.tier,
      get peers () { return Array.from(peers.values()) },
      on: function (event, fn) {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(fn)
      },
      off: function (event, fn) {
        var arr = listeners[event] || []
        var i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1)
      },
      destroy: function () {
        if (destroyed) return
        destroyed = true
        try { if (es) es.close() } catch (_) {}
        rpc('POST', '/api/swarm/leave', { channelId: info.channelId }).catch(function () {})
        emit('closed')
      }
    }
    attachStream()
    return channel
  }
  var swarmV1 = {
    join: async function (topicHex, opts) {
      opts = opts || {}
      var info = await rpc('POST', '/api/swarm/join', {
        topicHex: topicHex || null,
        subtopic: opts.subtopic === undefined ? null : opts.subtopic,
        protocol: opts.protocol || 'pear.swarm.v1',
        version: opts.version === undefined ? 1 : opts.version,
        server: !!opts.server,
        client: opts.client !== false,
        appName: opts.appName || (document.title || null),
        reason: opts.reason || null
      })
      return makeChannel(info)
    }
  }
  if (!window.pear) window.pear = {}
  if (!window.pear.swarm) window.pear.swarm = {}
  window.pear.swarm.v1 = swarmV1
})();</script>`

/**
 * Page-side window.pear.sync + window.pear.identity shim. Thin, token-
 * authenticated fetch wrappers over the /api/sync/* and /api/identity/*
 * endpoints the HttpBridge already serves on the same loopback port.
 *
 * Without this, any page that builds on window.pear.sync (peerit,
 * p2pbuilders, pear-exchange, …) never detects a data bridge and silently
 * falls back to its localStorage "dev" mode — single-user, not actually
 * peer-to-peer. We inject only swarm.v1 before this; this completes the
 * surface so multi-writer P2P apps work in the browser.
 *
 * Security: the HttpBridge scopes EVERY appId by the page's own drive key
 * (derived from the per-page api-token via _scopeAppId), so a page can only
 * read/write its own app's data — it cannot reach another app's records even
 * though the endpoint paths are generic. The shim therefore only needs to
 * forward the token (X-Pear-Token), exactly like the swarm shim.
 */
const PEAR_SYNC_SHIM = `<script>(function () {
  if (window.pear && window.pear.sync && window.pear.identity && window.pear.lighthouse) return
  function readToken () {
    var m = document.querySelector('meta[name="pear-api-token"]')
    return m ? m.content : ''
  }
  async function apiGet (path) {
    var res = await fetch(path, { headers: { 'X-Pear-Token': readToken() } })
    if (!res.ok) {
      var err = ''
      try { var j = await res.json(); err = (j && j.error) || res.statusText } catch (_) { err = res.statusText }
      throw new Error('pear.sync: ' + err)
    }
    return res.json()
  }
  async function apiPost (path, body) {
    var res = await fetch(path, {
      method: 'POST',
      headers: { 'X-Pear-Token': readToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    })
    if (!res.ok) {
      var err = ''
      try { var j = await res.json(); err = (j && j.error) || res.statusText } catch (_) { err = res.statusText }
      throw new Error('pear.sync: ' + err)
    }
    return res.json()
  }
  var sync = {
    create: function (appId) { return apiPost('/api/sync/create', { appId: appId }) },
    join: function (appId, inviteKey) { return apiPost('/api/sync/join', { appId: appId, inviteKey: inviteKey }) },
    append: function (appId, op) { return apiPost('/api/sync/append', { appId: appId, op: op }) },
    get: function (appId, key) { return apiGet('/api/sync/get?appId=' + encodeURIComponent(appId) + '&key=' + encodeURIComponent(key)) },
    list: function (appId, prefix, opts) {
      var url = '/api/sync/list?appId=' + encodeURIComponent(appId)
      if (prefix) url += '&prefix=' + encodeURIComponent(prefix)
      if (opts && opts.limit) url += '&limit=' + opts.limit
      return apiGet(url)
    },
    range: function (appId, opts) {
      var url = '/api/sync/range?appId=' + encodeURIComponent(appId)
      if (opts && opts.gte) url += '&gte=' + encodeURIComponent(opts.gte)
      if (opts && opts.gt) url += '&gt=' + encodeURIComponent(opts.gt)
      if (opts && opts.lte) url += '&lte=' + encodeURIComponent(opts.lte)
      if (opts && opts.lt) url += '&lt=' + encodeURIComponent(opts.lt)
      if (opts && opts.reverse) url += '&reverse=1'
      if (opts && opts.limit) url += '&limit=' + opts.limit
      return apiGet(url)
    },
    count: function (appId, prefix) {
      var url = '/api/sync/count?appId=' + encodeURIComponent(appId)
      if (prefix) url += '&prefix=' + encodeURIComponent(prefix)
      return apiGet(url)
    },
    pin: function (appId) { return apiPost('/api/sync/pin', { appId: appId }) },
    status: function (appId) { return apiGet('/api/sync/status?appId=' + encodeURIComponent(appId)) }
  }
  var identity = {
    getPublicKey: function () { return apiGet('/api/identity') },
    sign: function (payload, namespace) { return apiPost('/api/identity/sign', { payload: String(payload), namespace: namespace || '' }) }
  }
  var lighthouse = {
    outboxes: {
      publish: function (descriptor) { return apiPost('/api/lighthouse/outboxes/publish', descriptor || {}) },
      find: function (opts) {
        opts = opts || {}
        var url = '/api/lighthouse/outboxes/find'
        var qs = []
        ;['appSlug', 'appDriveKey', 'rawAppId', 'authorPubkey', 'recordType'].forEach(function (k) {
          if (opts[k]) qs.push(k + '=' + encodeURIComponent(opts[k]))
        })
        if (opts.limit) qs.push('limit=' + encodeURIComponent(opts.limit))
        if (opts.includePeers === false) qs.push('includePeers=0')
        if (qs.length) url += '?' + qs.join('&')
        return apiGet(url)
      }
    }
  }
  if (!window.pear) window.pear = {}
  if (!window.pear.sync) window.pear.sync = sync
  if (!window.pear.identity) window.pear.identity = identity
  if (!window.pear.lighthouse) window.pear.lighthouse = lighthouse
})();</script>`

/**
 * Page-side shim injected into HTML responses ONLY when the loaded
 * Hyperdrive is the anonGPT drive AND its manifest.json declares the
 * required privacy claims. See:
 *   - backend/constants.js ANONGPT_DRIVE_KEY
 *   - backend/hyper-proxy.js _shouldInjectAnongptShim()
 *   - backend/anongpt-buyer.js
 *   - anongpt/docs/spec/02-pearbrowser-dev-bridge.md
 *
 * The page-side surface is exactly one method — `infer({...})` — that
 * fetches /api/anongpt/infer with the X-Pear-Token meta the proxy
 * injects alongside this script. No generic DHT, no fs, no shell, no
 * direct access to the seller transport. The privacy contract demands
 * the page never receives buyer/seller private keys, so the entire
 * crypto path lives on the worklet side.
 *
 * Page authors should always feature-detect:
 *
 *   if (window.pear?.anongpt?.infer) {
 *     const r = await window.pear.anongpt.infer({
 *       input, sellerPubkey, options: { maxTokens: 160 }, rateCard
 *     })
 *     if (!r.ok) { ... handle fail-closed ... }
 *   }
 */
const PEAR_ANONGPT_SHIM = `<script>(function () {
  if (window.pear && window.pear.anongpt && window.pear.anongpt.infer) return
  function readToken () {
    var m = document.querySelector('meta[name="pear-api-token"]')
    return m ? m.content : ''
  }
  async function infer (req) {
    var headers = {
      'Content-Type': 'application/json',
      'X-Pear-Token': readToken()
    }
    var res = await fetch('/api/anongpt/infer', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(req || {})
    })
    var json = await res.json().catch(function () { return null })
    if (!res.ok) {
      // Surface the structured error to the page exactly as the
      // worklet sent it. Do NOT throw — pages must distinguish
      // "buyer not implemented" from "network error" without a
      // try/catch around every call.
      if (json && typeof json === 'object') return json
      return {
        ok: false,
        code: 'http-error',
        message: 'anongpt.infer: HTTP ' + res.status + ' ' + res.statusText
      }
    }
    if (!json || typeof json !== 'object') {
      return {
        ok: false,
        code: 'bad-json',
        message: 'anongpt.infer: worklet returned a non-JSON response',
        verify: { ok: false, reason: 'bad-json' }
      }
    }
    if (json.ok === true) {
      // Trust must come from the worklet's local verifier. If that field is
      // missing or malformed, coerce to unverified rather than allowing a
      // successful response to become implicitly trusted.
      if (!json.verify || typeof json.verify !== 'object') {
        json.verify = { ok: false, reason: 'missing-local-verify' }
      } else if (json.verify.ok !== true) {
        json.verify.ok = false
      }
    }
    return json
  }
  if (!window.pear) window.pear = {}
  if (!window.pear.anongpt) window.pear.anongpt = {}
  window.pear.anongpt.infer = infer
})();</script>`

module.exports = { PearBridge, PEAR_SWARM_V1_SHIM, PEAR_SYNC_SHIM, PEAR_ANONGPT_SHIM }
