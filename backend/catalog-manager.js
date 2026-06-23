/**
 * Catalog Manager
 *
 * Loads app catalogs from Hyperdrives. A catalog is a Hyperdrive
 * containing catalog.json (the app index) and app metadata/icons.
 *
 * Multiple catalogs can be added (community, private, etc.)
 */

const Hyperdrive = require('hyperdrive')
const Hyperbee = require('hyperbee')
const { getUserFriendlyError } = require('./hyper-proxy')
const {
  aggregateCatalogApps,
  normalizeCatalogApp,
  normalizeCatalogData,
  safeJSONParse,
  sanitizePersonalCatalogEntry,
  searchAppsList
} = require('./catalog-safety.cjs')

// Race a promise against a timeout. A Hypercore `.get()` (and a Hyperbee read
// stream) on a partially-replicated / unreachable core WAITS for the missing
// block forever — it never rejects — so an unbounded await can hang a catalog
// load indefinitely. withTimeout caps the wait and resolves `fallback` so the
// load always returns with whatever data is locally available.
function withTimeout (promise, ms, fallback) {
  let timer
  const guard = new Promise((resolve) => { timer = setTimeout(() => resolve(fallback), ms) })
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer))
}

class CatalogManager {
  constructor (store, swarm) {
    this.store = store
    this.swarm = swarm
    this.catalogs = new Map() // catalogKey hex → { drive, data, lastRefresh }
    this.myCatalogs = new Map() // owned (writable) catalog keyHex → Hyperdrive
  }

  /**
   * Load a catalog from a Hyperdrive key
   */
  async loadCatalog (keyHex) {
    if (this.catalogs.has(keyHex)) {
      return this.catalogs.get(keyHex).data
    }

    const drive = new Hyperdrive(this.store, Buffer.from(keyHex, 'hex'))
    try {
      await drive.ready()
    } catch (err) {
      throw new Error(`Could not load the app store: ${getUserFriendlyError(err.message)}`)
    }

    this.swarm.join(drive.discoveryKey, { server: false, client: true })

    // Wait for data
    await this._waitForData(drive)

    const catalogBuf = await drive.get('/catalog.json')
    if (!catalogBuf) throw new Error(getUserFriendlyError('No catalog.json found'))

    // SECURITY: Parse JSON with prototype pollution protection
    const data = normalizeCatalogData(this._safeJSONParse(catalogBuf.toString()), { source: 'hyperdrive' })

    // Load icons for each app
    if (data.apps) {
      for (const app of data.apps) {
        if (app.icon) {
          const iconBuf = await drive.get(app.icon).catch(() => null)
          if (iconBuf) {
            app.iconData = 'data:image/png;base64,' + iconBuf.toString('base64')
          }
        }
      }
    }

    this.catalogs.set(keyHex, { drive, data, lastRefresh: Date.now() })
    return data
  }

  /**
   * Load a catalogue published as a schema-sheets room — the 4th source,
   * coexisting with Hyperdrive / Hyperbee / Autobee (nothing removed).
   *
   * `link` is a z32 string (key32 [++ enc32]), optionally `sheets://`-prefixed.
   * Apps come from the room's validated `apps` schema rows, mapped to the same
   * in-memory DTO as the other formats, so getAggregatedApps treats them
   * identically. Read-only here — loading a catalogue never joins as a writer.
   *
   * schema-sheets gives this format what the bespoke three lack: ajv schema
   * validation, JMESPath query, multiwriter membership + signed provenance.
   * Library: ryanramage's schema-sheets; pattern: Drache93's Pear Browser.
   */
  async loadCatalogSheets (link) {
    const { decodeSheetsLink, SheetsCatalog } = require('./sheets-catalog')
    const { keyHex } = decodeSheetsLink(link)
    const cacheKey = `sheets:${keyHex}`
    if (this.catalogs.has(cacheKey)) return this.catalogs.get(cacheKey).data

    // Coalesce concurrent loads of the same room so we never open two instances
    // (the second would overwrite + leak the first's sheets handle + swarm join).
    if (!this._pendingSheets) this._pendingSheets = new Map()
    if (this._pendingSheets.has(cacheKey)) return this._pendingSheets.get(cacheKey)

    const p = (async () => {
      const sc = new SheetsCatalog(this.store, this.swarm)
      await sc.open(link)
      const apps = await sc.listApps()
      const data = normalizeCatalogData({ version: 1, name: 'Sheets Catalogue', apps, writable: false, link: sc.link() }, { source: 'sheets' })
      this.catalogs.set(cacheKey, { sheets: sc, data, lastRefresh: Date.now(), type: 'sheets' })
      return data
    })()
    this._pendingSheets.set(cacheKey, p)
    try { return await p } finally { this._pendingSheets.delete(cacheKey) }
  }

  /**
   * Register an already-open SheetsCatalog as a loaded catalogue (used by the
   * dev self-seed, where the same instance is both writer and the loaded view —
   * reopening it on the same store would conflict).
   */
  async registerSheetsCatalog (sc, name) {
    const apps = await sc.listApps()
    const cacheKey = `sheets:${sc.keyHex()}`
    const data = normalizeCatalogData({ version: 1, name: name || 'Apps', apps, writable: true, link: sc.link() }, { source: 'sheets' })
    this.catalogs.set(cacheKey, {
      sheets: sc,
      data,
      lastRefresh: Date.now(),
      type: 'sheets'
    })
    return sc.link()
  }

  /** Re-query a loaded sheets room with a JMESPath filter (validated in listApps). */
  async querySheetsCatalog (link, jmespath) {
    const { decodeSheetsLink } = require('./sheets-catalog')
    const { keyHex } = decodeSheetsLink(link)
    const entry = this.catalogs.get(`sheets:${keyHex}`)
    if (!entry || !entry.sheets) throw new Error('Sheets catalogue not loaded')
    return entry.sheets.listApps(jmespath)
  }

  async listSheetsSchemas (link) {
    const { decodeSheetsLink } = require('./sheets-catalog')
    const { keyHex } = decodeSheetsLink(link)
    const entry = this.catalogs.get(`sheets:${keyHex}`)
    if (!entry || !entry.sheets) throw new Error('Sheets catalogue not loaded')
    return entry.sheets.listSchemas()
  }

  /**
   * Load a catalogue from a relay's INDEX ROOM (Phase 5) — the 5th source. The
   * index sidecar publishes app-manifest rows in a schema-sheets room advertised
   * as `indexRoom`; this replicates that room read-only and maps its
   * app-manifest rows to the same app DTO as the other formats, so
   * getAggregatedApps treats it identically. Coexists with the other four.
   * `link` is a z32 (or `hiveindex://`) link. Read-only — never joins as writer.
   */
  async loadCatalogIndexRoom (link) {
    const { decodeIndexLink, IndexRoomClient } = require('./index-room-client')
    // re-verify each relay-directory row against its own signed capability doc
    // (the index room is an index, not an authority — Design Risk #5). The verify
    // hook only fires for listRelayDirectory(); the app path here is unaffected.
    const { verifyCapabilityDoc } = require('./capability-verify.cjs')
    const { keyHex } = decodeIndexLink(link)
    const cacheKey = `hiveindex:${keyHex}`
    if (this.catalogs.has(cacheKey)) return this.catalogs.get(cacheKey).data

    // Coalesce concurrent loads of the same room (mirror loadCatalogSheets).
    if (!this._pendingIndex) this._pendingIndex = new Map()
    if (this._pendingIndex.has(cacheKey)) return this._pendingIndex.get(cacheKey)

    const p = (async () => {
      const irc = new IndexRoomClient(this.store, this.swarm, { verify: verifyCapabilityDoc })
      await irc.open(link)
      const apps = await irc.listApps()
      const data = normalizeCatalogData({ version: 1, name: 'Relay Index', apps, writable: false, link: irc.link() }, { source: 'hiveindex' })
      this.catalogs.set(cacheKey, { index: irc, data, lastRefresh: Date.now(), type: 'hiveindex' })
      return data
    })()
    this._pendingIndex.set(cacheKey, p)
    try { return await p } finally { this._pendingIndex.delete(cacheKey) }
  }

  /** Re-query a loaded index-room catalogue with a JMESPath filter. */
  async queryIndexCatalog (link, jmespath) {
    const { decodeIndexLink } = require('./index-room-client')
    const { keyHex } = decodeIndexLink(link)
    const entry = this.catalogs.get(`hiveindex:${keyHex}`)
    if (!entry || !entry.index) throw new Error('Index-room catalogue not loaded')
    return entry.index.listApps(jmespath)
  }

  /**
   * Load a catalog that's published as a Hyperbee rather than a Hyperdrive.
   *
   * Phase 1 ticket 1 of the Holepunch alignment plan. This is the canonical
   * Pear-native catalog format: an append-only, signed key/value store
   * replicated over Hyperswarm. Anyone with the public key can subscribe.
   *
   * The relay doesn't publish one yet (see docs/RELAY_CATALOG_POPULATION.md)
   * but the browser side is ready for when it does. The returned shape
   * matches `loadCatalog` so ExploreScreen treats them identically.
   *
   * Key format inside the Hyperbee:
   *   `app!<id>` → { id, name, description, driveKey, version, author, categories, publishedAt }
   *   `meta!version` → 1
   *   `meta!name` → string
   */
  async loadCatalogBee (keyHex) {
    const cacheKey = `bee:${keyHex}`
    if (this.catalogs.has(cacheKey)) {
      return this.catalogs.get(cacheKey).data
    }

    const core = this.store.get(Buffer.from(keyHex, 'hex'))
    // A fragile / unreachable catalog core must never crash the worklet via an
    // unhandled 'error' event (an uncaught 'error' on an EventEmitter throws).
    core.on('error', (err) => console.warn(`[catalog] core ${keyHex.slice(0, 8)} error:`, err && err.message))
    await core.ready().catch((err) => {
      throw new Error(`Could not open catalog hypercore: ${getUserFriendlyError(err && err.message)}`)
    })
    // Sink discovery/replication errors so a flaky peer connection can't surface
    // as an unhandled rejection while another RPC (e.g. CMD_GET_CATALOG_APPS) is
    // mid-flight — that race was the "catalog: RPC timeout" trigger.
    const discovery = this.swarm.join(core.discoveryKey, { server: false, client: true })
    if (discovery && typeof discovery.flushed === 'function') discovery.flushed().catch(() => {})

    const bee = new Hyperbee(core, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json',
    })
    await bee.ready()

    // Wait briefly for initial replication — same pattern as _waitForData
    await this._waitForBeeData(bee, 15000).catch(() => {})

    // Drain the app! range, but BOUNDED: on an unreachable / partially-replicated
    // bee the stream blocks on a missing block forever, which would hang the
    // load (and starve later RPCs). Cap it and keep whatever streamed.
    const apps = []
    const stream = bee.createReadStream({ gte: 'app!', lt: 'app!~' })
    const drained = await withTimeout((async () => {
      for await (const entry of stream) {
        if (entry.value && typeof entry.value === 'object') apps.push(entry.value)
      }
      return true
    })().catch(() => false), 10000, false)
    if (!drained) {
      try { stream.destroy() } catch {}
      console.warn(`[catalog] hyperbee ${keyHex.slice(0, 8)} read timed out — using ${apps.length} app(s) available so far`)
    }

    // Load meta if present — also bounded (a blocking .get never rejects).
    const nameEntry = await withTimeout(bee.get('meta!name'), 3000, null).catch(() => null)
    const versionEntry = await withTimeout(bee.get('meta!version'), 3000, null).catch(() => null)

    const data = normalizeCatalogData({
      version: versionEntry ? versionEntry.value : 1,
      name: nameEntry ? nameEntry.value : 'P2P Catalog',
      source: 'hyperbee',
      sourceKey: keyHex,
      apps,
    }, { source: 'hyperbee' })
    data.count = { total: data.apps.length, apps: data.apps.length }

    this.catalogs.set(cacheKey, { bee, data, lastRefresh: Date.now(), type: 'hyperbee' })
    return data
  }

  async _waitForBeeData (bee, timeoutMs = 15000) {
    // Wait for at least one entry or timeout
    if (bee.version > 1) return
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs)
      const check = async () => {
        try {
          let found = false
          for await (const _ of bee.createReadStream({ gte: 'app!', lt: 'app!~', limit: 1 })) {
            found = true
            break
          }
          if (found) { clearTimeout(timer); resolve() }
          else setTimeout(check, 500)
        } catch {
          setTimeout(check, 500)
        }
      }
      check()
    })
  }

  // EXPERIMENTAL Autobee (collaborative) catalogs — gated by a feature flag at
  // the RPC layer (index.js), never reached unless the user opted in. The
  // autobase manager is required lazily so a disabled/absent experiment can't
  // affect boot. Read + write share ONE manager per key (kept on the
  // `autobee:<key>` aggregate entry), so a single store never opens two
  // Autobase instances on the same writer core. See docs/AUTOBEE-RESEARCH.md.

  _autobeeManagerClass () {
    try {
      return require('./autobee-catalog-manager.cjs').AutobeeCatalogManager
    } catch (err) {
      throw new Error(`Autobee catalogs unavailable: ${getUserFriendlyError(err && err.message)}`)
    }
  }

  // Open (and retain) the single manager for a catalog key, materialize it,
  // and register it in the aggregate set. Joins the swarm as both server and
  // client so an owned/writable catalog is served while a loaded one is
  // pulled. The view namespace defaults to the key, so reopening is stable.
  async _ensureAutobeeManager (keyHex) {
    if (!/^[0-9a-f]{64}$/i.test(keyHex)) throw new Error('Invalid catalog key')
    const cacheKey = `autobee:${keyHex}`
    const existing = this.catalogs.get(cacheKey)
    if (existing && existing.manager) return existing.manager

    const Manager = this._autobeeManagerClass()
    const manager = new Manager(this.store, { bootstrap: keyHex })
    try {
      await manager.ready()
    } catch (err) {
      try { await manager.close() } catch {}
      throw new Error(`Could not open collaborative catalog: ${getUserFriendlyError(err && err.message)}`)
    }
    if (manager.discoveryKey) this.swarm.join(manager.discoveryKey, { server: true, client: true })

    let data
    try { data = await manager.catalog() } catch (err) {
      try { await manager.close() } catch {}
      throw new Error(`Could not read collaborative catalog: ${getUserFriendlyError(err && err.message)}`)
    }
    this.catalogs.set(cacheKey, { manager, data, lastRefresh: Date.now(), type: 'autobee' })
    return manager
  }

  // Re-materialize an owned/loaded autobee catalog and refresh the aggregate
  // entry. Used after every write.
  async _refreshAutobee (keyHex) {
    const manager = await this._ensureAutobeeManager(keyHex)
    const data = await manager.catalog()
    const entry = this.catalogs.get(`autobee:${keyHex}`)
    if (entry) { entry.data = data; entry.lastRefresh = Date.now() }
    return { manager, data }
  }

  /**
   * Load a collaborative catalog by key (read path — Rollout Phase 2). The
   * returned `data` shape matches loadCatalog/loadCatalogBee so the aggregated
   * view treats it identically.
   */
  async loadCatalogAutobee (keyHex) {
    await this._ensureAutobeeManager(keyHex)
    return this.catalogs.get(`autobee:${keyHex}`).data
  }

  // --- Collaborative (Autobee) authoring — Rollout Phase 3 ------------------
  // Create / write / invite on a writable Autobase op-log catalog. Mirrors the
  // My Catalog authoring API but the data model is the multi-writer op log.

  async createAutobeeCatalog (name) {
    const Manager = this._autobeeManagerClass()
    // Mint the autobase key under a UNIQUE throwaway namespace so each created
    // catalog gets its own distinct writer core (and key) on the shared store,
    // then reopen by key. The manager namespaces its Autobase substore by this
    // `_ns`, so mint.close() frees only the mint substore — never the shared root
    // Corestore. Reopen-by-key recovers the minted writer core (cores are openable
    // by key across substores), so it stays writable — verified by the smoke.
    const mintNs = 'autobee-mint-' + Date.now() + '-' + Math.random().toString(36).slice(2)
    const mint = new Manager(this.store, { bootstrap: null, namespace: mintNs })
    await mint.ready()
    const keyHex = mint.key
    await mint.close()

    const manager = await this._ensureAutobeeManager(keyHex)
    await manager.rename(this._sanitizeCatalogName(name))
    const { data } = await this._refreshAutobee(keyHex)
    return this._formatAutobee(keyHex, manager, data)
  }

  async getAutobeeCatalog (keyHex) {
    const manager = await this._ensureAutobeeManager(keyHex)
    const data = this.catalogs.get(`autobee:${keyHex}`).data
    return this._formatAutobee(keyHex, manager, data)
  }

  async autobeeRename (keyHex, name) {
    const manager = await this._ensureAutobeeManager(keyHex)
    if (!manager.writable) throw new Error('You are not a writer on this catalog.')
    await manager.rename(this._sanitizeCatalogName(name))
    const { data } = await this._refreshAutobee(keyHex)
    return this._formatAutobee(keyHex, manager, data)
  }

  async autobeeAddApp (keyHex, app) {
    const manager = await this._ensureAutobeeManager(keyHex)
    if (!manager.writable) throw new Error('You are not a writer on this catalog.')
    const driveKey = app && typeof app.driveKey === 'string' ? app.driveKey.trim() : ''
    const link = app && typeof app.link === 'string' ? app.link.trim() : ''
    if (!driveKey && !link) throw new Error('App needs a driveKey or link.')
    await manager.upsertApp(app)  // ops layer whitelists/clamps + derives id
    const { data } = await this._refreshAutobee(keyHex)
    return this._formatAutobee(keyHex, manager, data)
  }

  async autobeeRemoveApp (keyHex, appId) {
    const manager = await this._ensureAutobeeManager(keyHex)
    if (!manager.writable) throw new Error('You are not a writer on this catalog.')
    if (!appId) throw new Error('App id is required.')
    await manager.removeApp(appId)
    const { data } = await this._refreshAutobee(keyHex)
    return this._formatAutobee(keyHex, manager, data)
  }

  // Invite another device/person as a writer (Autobase addWriter). They share
  // their writer key (getAutobeeCatalog().writerKey); the owner appends it.
  async autobeeAddWriter (keyHex, writerKeyHex) {
    if (!/^[0-9a-f]{64}$/i.test(writerKeyHex || '')) throw new Error('Invalid writer key (need 64-hex).')
    const manager = await this._ensureAutobeeManager(keyHex)
    if (!manager.writable) throw new Error('Only a writer can invite others.')
    await manager.addWriter(writerKeyHex)
    return { ok: true, keyHex, writerKey: writerKeyHex }
  }

  // discoveryKey of an autobee catalog (for relay re-pinning after edits).
  autobeeDiscoveryKey (keyHex) {
    const entry = this.catalogs.get(`autobee:${keyHex}`)
    return entry && entry.manager && entry.manager.discoveryKey ? entry.manager.discoveryKey : null
  }

  _formatAutobee (keyHex, manager, data) {
    return {
      keyHex,
      shareKey: `autobee://${keyHex}`,
      writerKey: manager.localKey,
      writable: manager.writable,
      name: (data && data.name) || 'Collaborative Catalog',
      apps: (data && Array.isArray(data.apps)) ? data.apps : []
    }
  }

  /**
   * Refresh a previously loaded catalog
   */
  async refreshCatalog (keyHex) {
    // Hyperdrive-backed catalog: re-read catalog.json in place.
    const driveEntry = this.catalogs.get(keyHex)
    if (driveEntry && driveEntry.drive) {
      const catalogBuf = await driveEntry.drive.get('/catalog.json')
      if (catalogBuf) {
        driveEntry.data = normalizeCatalogData(this._safeJSONParse(catalogBuf.toString()), { source: 'hyperdrive' })
        driveEntry.lastRefresh = Date.now()
      }
      return driveEntry.data
    }

    // Hyperbee-backed catalog: cached under `bee:<keyHex>`. Drop the cache
    // entry and reload so newly-replicated apps are picked up.
    if (this.catalogs.has(`bee:${keyHex}`)) {
      this.catalogs.delete(`bee:${keyHex}`)
      return this.loadCatalogBee(keyHex)
    }

    // Autobee-backed collaborative catalog: re-materialize from the op log
    // in place (Autobase.update() pulls any newly-replicated ops).
    const autobeeEntry = this.catalogs.get(`autobee:${keyHex}`)
    if (autobeeEntry && autobeeEntry.manager) {
      autobeeEntry.data = await autobeeEntry.manager.catalog()
      autobeeEntry.lastRefresh = Date.now()
      return autobeeEntry.data
    }

    // Not loaded yet.
    return this.loadCatalog(keyHex)
  }

  /**
   * Get all apps across all loaded catalogs
   */
  getAllApps () {
    const apps = []
    for (const [catalogKey, entry] of this.catalogs) {
      if (entry.data && entry.data.apps) {
        const catalogName = entry.data.name || 'Catalog'
        const source = this._catalogEntrySource(entry)
        for (const app of entry.data.apps) {
          const normalized = normalizeCatalogApp(app, { source, catalogKey, catalogName })
          if (normalized) apps.push({ ...normalized, source, catalogKey, catalogName })
        }
      }
    }
    return apps
  }

  /**
   * Aggregated, de-duplicated app list across every loaded catalog.
   *
   * This is the catalog-of-catalogs view: PearBrowser keeps several
   * catalogs open at once (the curated default + whatever the user has
   * added), and the Apps tab presents them as one searchable store. Each
   * app is tagged with the catalog it came from so the UI can show its
   * source and filter by it. When multiple rows point at the same stable app
   * target (driveKey, then normalized link, then id), the same verification
   * and version winner rules used by the UI's defensive final pass choose the
   * copy whose metadata is displayed.
   */
  getAggregatedApps () {
    return aggregateCatalogApps(this.catalogs, (entry) => this._catalogEntrySource(entry))
  }

  _catalogEntrySource (entry) {
    if (entry && entry.type) return entry.type
    return entry && entry.drive ? 'hyperdrive' : 'catalog'
  }

  /**
   * Metadata for every loaded catalog — powers the "loaded catalogs"
   * facet chips in the UI.
   */
  listCatalogs () {
    const out = []
    for (const [key, entry] of this.catalogs) {
      if (!entry.data) continue
      out.push({
        key,
        name: entry.data.name || 'Catalog',
        count: Array.isArray(entry.data.apps) ? entry.data.apps.length : 0,
        source: entry.type === 'autobee' ? 'autobee' : entry.type === 'hyperbee' ? 'hyperbee' : entry.type === 'sheets' ? 'sheets' : entry.type === 'hiveindex' ? 'hiveindex' : 'hyperdrive',
        writable: !!entry.data.writable,
      })
    }
    return out
  }

  /**
   * Drop a single catalog from the aggregated set and release its
   * resources. Accepts either the raw key or the cached map key
   * (`bee:<hex>` for Hyperbee catalogs).
   */
  async unloadCatalog (keyHex) {
    for (const cacheKey of [keyHex, `bee:${keyHex}`, `autobee:${keyHex}`, `sheets:${keyHex}`, `hiveindex:${keyHex}`]) {
      const entry = this.catalogs.get(cacheKey)
      if (!entry) continue
      try {
        if (entry.drive) await entry.drive.close()
        else if (entry.bee) await entry.bee.close()
        else if (entry.manager) await entry.manager.close()
        else if (entry.sheets) await entry.sheets.close()
        else if (entry.index) await entry.index.close()
      } catch {}
      this.catalogs.delete(cacheKey)
      return true
    }
    return false
  }

  // Compare dotted numeric versions ("1.2.0" > "1.1.9"). Missing/garbage
  // parts count as 0, so an unversioned app never displaces a versioned one.
  _versionGreater (a, b) {
    const pa = String(a == null ? '0' : a).split('.').map((n) => parseInt(n, 10) || 0)
    const pb = String(b == null ? '0' : b).split('.').map((n) => parseInt(n, 10) || 0)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const da = pa[i] || 0
      const db = pb[i] || 0
      if (da !== db) return da > db
    }
    return false
  }

  /**
   * Search apps by user-visible catalogue metadata.
   */
  searchApps (query) {
    return searchAppsList(this.getAllApps(), query)
  }

  // --- Catalog authoring (your own publishable catalog) ---------------
  //
  // A "my catalog" is a writable Hyperdrive the user owns, holding a
  // catalog.json the same shape we read from anyone else's catalog. This
  // closes the discovery loop: install/own an app, endorse it into your
  // catalog, share the key, and others load it like any other catalog.
  //
  // Writability survives restarts: Corestore persists the secret key for
  // cores it created, so reopening by public key (`_ensureMyCatalogDrive`)
  // returns the same writable drive — the pattern site-manager relies on.

  async createMyCatalog (name) {
    const safeName = this._sanitizeCatalogName(name)
    // Unique per-drive namespace, same approach as SiteManager.createSite,
    // to avoid Corestore contention while relays replicate other drives.
    const ns = this.store.namespace('catalog-' + Date.now() + '-' + Math.random().toString(36).slice(2))
    const drive = new Hyperdrive(ns)
    await drive.ready()
    const keyHex = Buffer.from(drive.key).toString('hex')
    const data = { version: 1, name: safeName, apps: [] }
    await drive.put('/catalog.json', Buffer.from(JSON.stringify(data, null, 2)))
    this.myCatalogs.set(keyHex, drive)
    // Announce as a server so peers (and relays) can pull it.
    this.swarm.join(drive.discoveryKey, { server: true, client: false })
    return { keyHex, name: safeName, apps: [], writable: true }
  }

  async _ensureMyCatalogDrive (keyHex) {
    if (!/^[0-9a-f]{64}$/i.test(keyHex)) throw new Error('Invalid catalog key')
    if (this.myCatalogs.has(keyHex)) return this.myCatalogs.get(keyHex)
    const drive = new Hyperdrive(this.store, Buffer.from(keyHex, 'hex'))
    await drive.ready()
    this.myCatalogs.set(keyHex, drive)
    this.swarm.join(drive.discoveryKey, { server: true, client: false })
    return drive
  }

  async getMyCatalog (keyHex) {
    const drive = await this._ensureMyCatalogDrive(keyHex)
    const data = await this._readMyCatalogData(drive)
    return this._formatMyCatalog(keyHex, data, drive)
  }

  async addAppToCatalog (keyHex, app) {
    const drive = await this._ensureMyCatalogDrive(keyHex)
    if (!drive.writable) throw new Error('This catalog is not editable on this device.')
    const entry = this._sanitizeCatalogEntry(app)
    if (!entry.driveKey && !entry.link) throw new Error('App is missing a valid drive key or app link.')
    entry.id = entry.id || entry.driveKey || entry.link

    const data = await this._readMyCatalogData(drive)
    const idx = data.apps.findIndex((a) => a && a.id === entry.id)
    if (idx >= 0) data.apps[idx] = entry
    else data.apps.push(entry)

    return await this._writeMyCatalogData(keyHex, drive, data)
  }

  async removeAppFromCatalog (keyHex, appId) {
    const drive = await this._ensureMyCatalogDrive(keyHex)
    if (!drive.writable) throw new Error('This catalog is not editable on this device.')
    const data = await this._readMyCatalogData(drive)
    data.apps = data.apps.filter((a) => !this._catalogAppMatches(a, appId))
    return await this._writeMyCatalogData(keyHex, drive, data)
  }

  async renameMyCatalog (keyHex, name) {
    const drive = await this._ensureMyCatalogDrive(keyHex)
    if (!drive.writable) throw new Error('This catalog is not editable on this device.')
    const data = await this._readMyCatalogData(drive)
    data.name = this._sanitizeCatalogName(name)
    return await this._writeMyCatalogData(keyHex, drive, data)
  }

  async updateAppInCatalog (keyHex, appId, patch) {
    const drive = await this._ensureMyCatalogDrive(keyHex)
    if (!drive.writable) throw new Error('This catalog is not editable on this device.')
    if (!appId) throw new Error('App id is required.')

    const data = await this._readMyCatalogData(drive)
    const idx = data.apps.findIndex((a) => this._catalogAppMatches(a, appId))
    if (idx < 0) throw new Error('App not found in catalog.')

    const existing = data.apps[idx]
    const stableId = existing.id || appId
    const entry = this._sanitizeCatalogEntry({ ...existing, ...(patch || {}), id: stableId })
    if (!entry.driveKey && !entry.link) throw new Error('App is missing a valid drive key or app link.')
    entry.id = stableId
    data.apps[idx] = entry

    return await this._writeMyCatalogData(keyHex, drive, data)
  }

  // discoveryKey of an owned catalog (for relay re-pinning after edits).
  myCatalogDiscoveryKey (keyHex) {
    const drive = this.myCatalogs.get(keyHex)
    return drive ? drive.discoveryKey : null
  }

  // Keep only the fields a catalog entry needs, length-bounded, so a
  // hostile or oversized app object can't bloat or pollute catalog.json.
  _sanitizeCatalogEntry (app) {
    return sanitizePersonalCatalogEntry(app)
  }

  _sanitizeCatalogName (name) {
    return (typeof name === 'string' && name.trim()) ? name.trim().slice(0, 80) : 'My Catalog'
  }

  _catalogAppMatches (app, appId) {
    return !!(app && appId && (app.id === appId || app.driveKey === appId || app.link === appId))
  }

  async _readMyCatalogData (drive) {
    const buf = await drive.get('/catalog.json').catch(() => null)
    const data = buf ? normalizeCatalogData(this._safeJSONParse(buf.toString())) : { version: 1, name: 'My Catalog', apps: [] }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { version: 1, name: 'My Catalog', apps: [] }
    }
    if (!Array.isArray(data.apps)) data.apps = []
    data.name = this._sanitizeCatalogName(data.name)
    if (!data.version) data.version = 1
    return data
  }

  async _writeMyCatalogData (keyHex, drive, data) {
    await drive.put('/catalog.json', Buffer.from(JSON.stringify(data, null, 2)))
    this._updateLoadedCatalogData(keyHex, data)
    return this._formatMyCatalog(keyHex, data, drive)
  }

  _formatMyCatalog (keyHex, data, drive) {
    const apps = Array.isArray(data.apps) ? data.apps : []
    return { keyHex, name: data.name || 'My Catalog', apps, writable: !!drive.writable }
  }

  _updateLoadedCatalogData (keyHex, data) {
    const entry = this.catalogs.get(keyHex)
    if (!entry) return
    const normalized = normalizeCatalogData(data)
    entry.data = {
      ...normalized,
      apps: Array.isArray(normalized.apps) ? normalized.apps.map((app) => ({ ...app })) : [],
    }
    entry.lastRefresh = Date.now()
  }

  async _waitForData (drive) {
    if (drive.version > 0) return
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, 15000)
      const check = async () => {
        const entry = await drive.entry('/catalog.json').catch(() => null)
        if (entry) { clearTimeout(timeout); resolve() }
        else setTimeout(check, 300)
      }
      check()
    })
  }

  /**
   * Parse JSON safely with prototype pollution protection
   */
  _safeJSONParse (str) {
    return safeJSONParse(str)
  }

  async close () {
    for (const [, entry] of this.catalogs) {
      // Hyperdrive catalogs hold `drive`; Hyperbee `bee`; Autobee `manager`;
      // schema-sheets `sheets`. Close whichever this entry carries.
      try {
        if (entry.drive) await entry.drive.close()
        else if (entry.bee) await entry.bee.close()
        else if (entry.manager) await entry.manager.close()
        else if (entry.sheets) await entry.sheets.close()
        else if (entry.index) await entry.index.close()
      } catch {}
    }
    this.catalogs.clear()
    for (const [, drive] of this.myCatalogs) {
      try { await drive.close() } catch {}
    }
    this.myCatalogs.clear()
  }
}

module.exports = { CatalogManager }
