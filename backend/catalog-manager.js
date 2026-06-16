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
    const data = this._safeJSONParse(catalogBuf.toString())

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
      const data = { version: 1, name: 'Sheets Catalogue', apps, writable: false, link: sc.link() }
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
    this.catalogs.set(cacheKey, {
      sheets: sc,
      data: { version: 1, name: name || 'Apps', apps, writable: true, link: sc.link() },
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
    await core.ready().catch((err) => {
      throw new Error(`Could not open catalog hypercore: ${getUserFriendlyError(err && err.message)}`)
    })
    this.swarm.join(core.discoveryKey, { server: false, client: true })

    const bee = new Hyperbee(core, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json',
    })
    await bee.ready()

    // Wait briefly for initial replication — same pattern as _waitForData
    await this._waitForBeeData(bee, 15000).catch(() => {})

    const apps = []
    try {
      for await (const entry of bee.createReadStream({ gte: 'app!', lt: 'app!~' })) {
        if (entry.value && typeof entry.value === 'object') {
          apps.push(entry.value)
        }
      }
    } catch (err) {
      throw new Error(`Could not read catalog Hyperbee: ${getUserFriendlyError(err && err.message)}`)
    }

    // Load meta if present
    const nameEntry = await bee.get('meta!name').catch(() => null)
    const versionEntry = await bee.get('meta!version').catch(() => null)

    const data = {
      version: versionEntry ? versionEntry.value : 1,
      name: nameEntry ? nameEntry.value : 'P2P Catalog',
      source: 'hyperbee',
      sourceKey: keyHex,
      apps,
      count: { total: apps.length, apps: apps.length },
    }

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
    // Mint the autobase key under a throwaway namespace, then reopen by key so
    // create / load / join all share the deterministic key-derived view
    // namespace. Reopen-by-key stays writable (verified by the smoke).
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
        driveEntry.data = this._safeJSONParse(catalogBuf.toString())
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
        for (const app of entry.data.apps) {
          apps.push({ ...app, catalogKey })
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
   * source and filter by it. When the same app id appears in more than one
   * catalog, the highest-versioned copy wins.
   */
  getAggregatedApps () {
    const byId = new Map()
    const anon = [] // apps with no stable id — never de-duplicated
    for (const [catalogKey, entry] of this.catalogs) {
      if (!entry.data || !Array.isArray(entry.data.apps)) continue
      const catalogName = entry.data.name || 'Catalog'
      for (const app of entry.data.apps) {
        const tagged = { ...app, catalogKey, catalogName }
        if (app.id == null) { anon.push(tagged); continue }
        const existing = byId.get(app.id)
        if (!existing || this._versionGreater(app.version, existing.version)) {
          byId.set(app.id, tagged)
        }
      }
    }
    return [...byId.values(), ...anon]
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
        source: entry.type === 'autobee' ? 'autobee' : entry.type === 'hyperbee' ? 'hyperbee' : entry.type === 'sheets' ? 'sheets' : 'hyperdrive',
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
    for (const cacheKey of [keyHex, `bee:${keyHex}`, `autobee:${keyHex}`, `sheets:${keyHex}`]) {
      const entry = this.catalogs.get(cacheKey)
      if (!entry) continue
      try {
        if (entry.drive) await entry.drive.close()
        else if (entry.bee) await entry.bee.close()
        else if (entry.manager) await entry.manager.close()
        else if (entry.sheets) await entry.sheets.close()
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
   * Search apps by name or description
   */
  searchApps (query) {
    const q = query.toLowerCase()
    return this.getAllApps().filter(app =>
      (app.name && app.name.toLowerCase().includes(q)) ||
      (app.description && app.description.toLowerCase().includes(q))
    )
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
    if (!entry.driveKey) throw new Error('App is missing a drive key.')
    entry.id = entry.id || entry.driveKey

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
    if (!entry.driveKey) throw new Error('App is missing a drive key.')
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
    if (!app || typeof app !== 'object') throw new Error('Invalid app')
    const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined)
    const out = {
      id: str(app.id, 128),
      name: str(app.name, 200),
      description: str(app.description, 1000),
      driveKey: str(app.driveKey, 128),
      version: str(app.version, 40),
      author: str(app.author, 200),
    }
    if (Array.isArray(app.categories)) {
      out.categories = app.categories.map((c) => String(c).slice(0, 60)).slice(0, 12)
    }
    if (typeof app.icon === 'string') out.icon = app.icon.slice(0, 300)
    for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k]
    return out
  }

  _sanitizeCatalogName (name) {
    return (typeof name === 'string' && name.trim()) ? name.trim().slice(0, 80) : 'My Catalog'
  }

  _catalogAppMatches (app, appId) {
    return !!(app && appId && (app.id === appId || app.driveKey === appId))
  }

  async _readMyCatalogData (drive) {
    const buf = await drive.get('/catalog.json').catch(() => null)
    const data = buf ? this._safeJSONParse(buf.toString()) : { version: 1, name: 'My Catalog', apps: [] }
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
    entry.data = {
      ...data,
      apps: Array.isArray(data.apps) ? data.apps.map((app) => ({ ...app })) : [],
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
    const obj = JSON.parse(str)
    if (obj && typeof obj === 'object') {
      // Remove dangerous prototype properties
      delete obj.__proto__
      delete obj.constructor
      // Also check nested objects
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          delete obj[key].__proto__
          delete obj[key].constructor
        }
      }
    }
    return obj
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
