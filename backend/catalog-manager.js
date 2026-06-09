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
        source: entry.type === 'hyperbee' ? 'hyperbee' : 'hyperdrive',
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
    for (const cacheKey of [keyHex, `bee:${keyHex}`]) {
      const entry = this.catalogs.get(cacheKey)
      if (!entry) continue
      try {
        if (entry.drive) await entry.drive.close()
        else if (entry.bee) await entry.bee.close()
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
      // Hyperdrive catalogs hold `drive`; Hyperbee catalogs hold `bee`.
      try {
        if (entry.drive) await entry.drive.close()
        else if (entry.bee) await entry.bee.close()
      } catch {}
    }
    this.catalogs.clear()
  }
}

module.exports = { CatalogManager }
