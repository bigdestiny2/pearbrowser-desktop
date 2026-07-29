/**
 * Sheets Catalog — load a schema-sheets room as a PearBrowser app catalogue.
 *
 * A schema-sheets room's `apps` rows map to the SAME in-memory app DTO the
 * Hyperdrive / Hyperbee / Autobee catalogs produce, so CatalogManager's generic
 * getAggregatedApps() treats a sheets room identically (it just iterates
 * entry.data.apps). This is the 4th catalogue source — it coexists with the
 * legacy three; nothing is removed.
 *
 * One validated, JMESPath-queryable, multiwriter room replaces the bespoke
 * trio. The `type` field (standalone|hypersite) the run-in-tab UI gates on is a
 * validated column on every row.
 *
 * schema-sheets is ESM; this CJS module loads it via dynamic import().
 *
 * Pattern: Drache93's Pear Browser (https://github.com/Drache93/pear-browser).
 * Library: ryanramage's schema-sheets (npm: schema-sheets, MIT).
 */
const z32 = require('z32')
const b4a = require('b4a')
const { normalizeCatalogApp } = require('./catalog-safety.cjs')

// The canonical `apps` schema (design §4.1). Created on a fresh room; carries
// browser-drive metadata and native migration state, plus the run-in-tab type.
const APPS_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', maxLength: 200 },
    iconRef: { type: 'string', maxLength: 300 },
    description: { type: 'string', maxLength: 1000 },
    driveKey: { type: 'string', pattern: '^[0-9a-f]{64}$' },
    link: { type: 'string', maxLength: 300 },
    legacyMigrationId: { type: 'string', pattern: '^[13-9a-km-uw-z]{52}$' },
    nativeDeliveryStatus: { enum: ['migration-required', 'available'] },
    nativeDeliveryKind: { enum: ['pear-v3'] },
    nativeInstallLink: { type: 'string', pattern: '^pear://[13-9a-km-uw-z]{52}/?$' },
    nativeProductName: { type: 'string', maxLength: 120 },
    nativeTargets: { type: 'array', items: { type: 'string', maxLength: 40 }, maxItems: 12 },
    iconData: { type: 'string', maxLength: 20000 },
    type: { enum: ['standalone', 'hypersite'] },
    author: { type: 'string', maxLength: 200 },
    homepage: { type: 'string', maxLength: 300 },
    sourceUrl: { type: 'string', maxLength: 300 },
    license: { type: 'string', maxLength: 80 },
    categories: { type: 'array', items: { type: 'string', maxLength: 60 }, maxItems: 12 },
    version: { type: 'string', maxLength: 40 },
    publishedAt: { type: 'integer' },
    manifestHash: { type: 'string', pattern: '^[0-9a-f]{64}$' },
    verification: { enum: ['unverified', 'relay-listed', 'author-signed'] }
  },
  required: ['name', 'type'],
  anyOf: [
    { required: ['driveKey'] },
    { required: ['link'] },
    { required: ['legacyMigrationId'] },
    {
      properties: { nativeDeliveryStatus: { const: 'available' } },
      required: ['nativeDeliveryStatus', 'nativeDeliveryKind', 'nativeInstallLink']
    }
  ],
  additionalProperties: false
}

// --- link parsing (single source of truth) --------------------------------
// A z32 room link encodes key32, or key32++encryptionKey32 for a private room
// (52 or 104 z32 chars). Validate + decode in one place so a malformed link
// throws a clean error instead of leaking a z32 stack trace from the RPC layer.
function decodeSheetsLink (link) {
  const s = String(link == null ? '' : link).trim().replace(/^sheets:\/\//i, '').replace(/\/+$/, '')
  if (!s) throw new Error('Invalid sheets catalogue link')
  let raw
  try { raw = z32.decode(s) } catch { throw new Error('Invalid sheets catalogue link') }
  if (raw.length !== 32 && raw.length !== 64) throw new Error('Invalid sheets catalogue link')
  return {
    key: raw.subarray(0, 32),
    encryptionKey: raw.length > 32 ? raw.subarray(32) : null,
    keyHex: b4a.toString(raw.subarray(0, 32), 'hex')
  }
}

// --- query safety ----------------------------------------------------------
// The catalogue room is PUBLIC read-only (every row is replicable, so there is
// no data-exfiltration threat) — but a raw JMESPath is still a ReDoS / CPU
// surface, and we only ever need a handful of filter shapes. Allow a single
// `[?…]` filter over field comparisons + contains/starts_with/ends_with; reject
// backticks (raw literals), expression-refs and anything else. The Phase-2
// search UI builds queries from structured input through this chokepoint.
const SAFE_JMESPATH = /^\[\?[\w\s.,'"=!<>|&()-]+\]$/
const MAX_QUERY_LEN = 512
// Bound on rows scanned/returned from a sheets/index room. schema-sheets
// list() materializes the whole result in memory and JMESPath-scans it in JS
// (O(rows)); the benchmark (docs/research/bench-results-personal-index.md) puts
// ~10k rows at ~22ms and 50k at ~99ms main-thread block, so cap well under the
// cliff. Also consumed by index-room-client.js.
const MAX_SHEETS_ROWS = 5000
function safeJmesPath (query) {
  if (query == null || query === '') return undefined
  if (typeof query !== 'string') throw new Error('Search query must be a string')
  if (query.length > MAX_QUERY_LEN) throw new Error('Search query too long')
  if (query.includes('`')) throw new Error('Unsupported search query')
  if (!SAFE_JMESPATH.test(query)) throw new Error('Unsupported search query')
  return query
}

let _SchemaSheets = null
function loadSchemaSheets () {
  // schema-sheets is ESM-only and dynamic import() from CJS is broken under
  // Bare/Pear ("Cannot find referrer"), so we require a prebuilt CJS bundle
  // (esbuild, via backend/sheets-import.mjs). Rebuild: see scripts/build-sheets-bundle.
  if (!_SchemaSheets) {
    const m = require('./sheets-bundle.cjs')
    _SchemaSheets = m.default || m
  }
  return _SchemaSheets
}

// Map a schema-sheets row -> the in-memory app DTO CatalogManager aggregates.
// The row UUID is the stable, globally-unique app id (kills "higher version
// shadows real app"); memberkey is built-in publisher provenance. Returns null
// for a row whose json isn't a plain object (corrupt row -> dropped, not coerced).
function rowToApp (row) {
  if (!row || typeof row.json !== 'object' || row.json === null) return null
  const j = row.json
  const mk = row.memberkey
  return normalizeCatalogApp({
    id: row.uuid,
    name: j.name,
    description: j.description,
    driveKey: j.driveKey || null,
    link: j.link || null,
    legacyMigrationId: j.legacyMigrationId || null,
    nativeDelivery: j.nativeDeliveryStatus
      ? {
          status: j.nativeDeliveryStatus,
          kind: j.nativeDeliveryKind,
          installLink: j.nativeInstallLink,
          productName: j.nativeProductName,
          targets: j.nativeTargets
        }
      : null,
    type: j.type || (j.link && !j.driveKey ? 'standalone' : undefined),
    author: j.author || null,
    homepage: j.homepage || null,
    sourceUrl: j.sourceUrl || null,
    license: j.license || null,
    categories: Array.isArray(j.categories) ? j.categories : [],
    version: j.version || null,
    icon: j.iconRef || null,
    iconData: j.iconData || null,
    verification: j.verification || 'unverified',
    publisherKey: mk ? (b4a.isBuffer(mk) ? b4a.toString(mk, 'hex') : String(mk)) : null
  }, { source: 'sheets' })
}

class SheetsCatalog {
  constructor (store, swarm) {
    this.store = store
    this.swarm = swarm
    this.sheets = null
    this._appsSchemaIdP = null
  }

  // Open an existing room by z32 link (key32 [++ enc32]), or create a new one
  // when link is falsy (Autobase generates the key; the creator is the indexer).
  async open (link) {
    const SchemaSheets = await loadSchemaSheets()
    let key = null
    let opts = {}
    if (link) {
      const { key: k, encryptionKey } = decodeSheetsLink(link)
      key = k
      if (encryptionKey) opts = { encryptionkey: encryptionKey }
    }
    const sheets = new SchemaSheets(this.store, key, opts)
    await sheets.ready()
    // replicate over the swarm (read-only client for a loaded catalogue)
    const dk = sheets.base && sheets.base.discoveryKey
    if (this.swarm && dk) {
      try { this.swarm.join(dk, { server: false, client: true }) } catch {}
    }
    this.sheets = sheets
    return sheets
  }

  // z32 room link. NOTE: returns the PUBLIC key-only link, suitable for
  // read-only sharing of a public catalogue room. An encrypted (private) room
  // intentionally cannot be shared from here — that would leak its encryption
  // key. (Catalogue rooms are public-by-design; see the design doc.)
  link () {
    return z32.encode(this.sheets.key)
  }

  keyHex () {
    return b4a.toString(this.sheets.key, 'hex')
  }

  discoveryKey () {
    return this.sheets && this.sheets.base && this.sheets.base.discoveryKey
  }

  // Cache the appsSchemaId lookup as a PROMISE so concurrent callers share one
  // fetch instead of racing two listSchemas() scans.
  async appsSchemaId () {
    if (this._appsSchemaIdP) return this._appsSchemaIdP
    this._appsSchemaIdP = (async () => {
      const schemas = await this.sheets.listSchemas()
      const apps = schemas.find((s) => s.name === 'apps')
      return apps ? apps.schemaId : null
    })()
    return this._appsSchemaIdP
  }

  async listSchemas () {
    if (!this.sheets || typeof this.sheets.listSchemas !== 'function') return []
    const schemas = await this.sheets.listSchemas()
    return (Array.isArray(schemas) ? schemas : [])
      .map((s) => ({
        name: typeof s?.name === 'string' ? s.name : '',
        schemaId: b4a.isBuffer(s?.schemaId) ? b4a.toString(s.schemaId, 'hex') : String(s?.schemaId || '')
      }))
      .filter((s) => s.name && s.schemaId)
  }

  // List the room's apps as DTOs. Optional JMESPath query (validated).
  async listApps (jmespath) {
    const q = safeJmesPath(jmespath)
    const sid = await this.appsSchemaId()
    if (!sid) return []
    let rows
    try {
      rows = await this.sheets.list(sid, { limit: MAX_SHEETS_ROWS, ...(q ? { query: q } : {}) })
    } catch (e) {
      // A query that passed the whitelist can still fail to compile in the
      // engine (e.g. unbalanced parens) — wrap it cleanly so the raw library
      // stack never escapes. A failure with NO query is a genuine backend
      // error and must propagate unmasked.
      if (q) throw new Error(`Invalid search query: ${e && e.message}`)
      throw e
    }
    return rows.filter(Boolean).map(rowToApp).filter(Boolean).slice(0, MAX_SHEETS_ROWS)
  }

  // --- writer side (operator/seed use; a loaded read-only catalogue skips these) ---

  // Become a writer (the room creator is auto-indexer). Required before addApp.
  async join (username) {
    await this.sheets.join(username || 'pearbrowser')
    await this.sheets.base.update()
  }

  // Create the canonical `apps` schema on a fresh room.
  async ensureAppsSchema () {
    let sid = await this.appsSchemaId()
    if (sid) return sid
    sid = await this.sheets.addNewSchema('apps', APPS_SCHEMA)
    this._appsSchemaIdP = Promise.resolve(sid)
    return sid
  }

  // Add one app row (validated at apply time against APPS_SCHEMA).
  async addApp (appJson, publishedAt) {
    const sid = await this.ensureAppsSchema()
    return this.sheets.addRow(sid, appJson, publishedAt)
  }

  // Delete one app row by uuid.
  async deleteApp (uuid) {
    return this.sheets.deleteRow(uuid)
  }

  async update () {
    if (this.sheets && this.sheets.base) await this.sheets.base.update()
  }

  async close () {
    try { if (this.sheets) await this.sheets.close() } catch {}
  }
}

module.exports = { SheetsCatalog, APPS_SCHEMA, rowToApp, decodeSheetsLink, safeJmesPath, MAX_QUERY_LEN, MAX_SHEETS_ROWS }
