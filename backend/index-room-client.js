/**
 * Index Room Client — read-only consumer of a HiveRelay index room (Phase 5).
 *
 * The relay's index sidecar (services/index-sidecar) publishes a schema-sheets
 * room with four schemas — relay-directory, app-manifest, verification,
 * pin-registry — advertised as `indexRoom` (z32) in the relay's capability doc
 * and /catalog.json. This client blind-replicates that room read-only (no
 * encryption key — it's public by design) and queries it, mirroring
 * SheetsCatalog and reusing its Bare-bundled schema-sheets + query chokepoint.
 *
 * Trust: the room is an INDEX, not an authority. relay-directory rows carry the
 * full signed capability `doc` (+ `capabilitySig`); when a verifier is supplied
 * we re-verify each row against its own doc and drop the rest. (Design Risk #5.)
 */
const z32 = require('z32')
const b4a = require('b4a')
const { decodeSheetsLink, safeJmesPath, MAX_SHEETS_ROWS } = require('./sheets-catalog')

// Same Bare-bundled schema-sheets the catalogue uses — the index room is the
// same corestore-7/hypercore-11 generation, so replication is direct.
let _SchemaSheets = null
function loadSchemaSheets () {
  if (!_SchemaSheets) {
    const m = require('./sheets-bundle.cjs')
    _SchemaSheets = m.default || m
  }
  return _SchemaSheets
}

const INDEX_SCHEMAS = ['relay-directory', 'app-manifest', 'verification', 'pin-registry']

// A hiveindex:// link wraps the same z32 a sheets link does (key32 public —
// the index room never ships an encryption key). Strip the scheme, then reuse
// the validated sheets decoder.
function decodeIndexLink (link) {
  const s = String(link == null ? '' : link).trim().replace(/^hiveindex:\/\//i, '')
  return decodeSheetsLink(s)
}

// app-manifest row -> the in-memory app DTO CatalogManager aggregates (mirror
// of sheets-catalog rowToApp). Returns null for a corrupt row.
function manifestRowToApp (row) {
  if (!row || typeof row.json !== 'object' || row.json === null) return null
  const j = row.json
  return {
    id: j.appId || row.uuid,
    name: j.name,
    description: null,
    driveKey: j.driveKey || null,
    link: j.link || null,
    type: j.type || (j.driveKey && !j.link ? 'standalone' : 'hypersite'),
    author: j.author || null,
    categories: Array.isArray(j.categories) ? j.categories : [],
    version: j.version || null,
    icon: j.icon || null,
    verification: 'relay-listed',
    publisherKey: j.publisherPubkey || null
  }
}

class IndexRoomClient {
  constructor (store, swarm, opts = {}) {
    this.store = store
    this.swarm = swarm
    this.verify = typeof opts.verify === 'function' ? opts.verify : null
    this.sheets = null
    this._schemaIdsP = null
  }

  // Open the relay's index room read-only by z32 (or hiveindex://) link.
  async open (link) {
    const SchemaSheets = await loadSchemaSheets()
    const { key, encryptionKey } = decodeIndexLink(link)
    const opts = encryptionKey ? { encryptionkey: encryptionKey } : {}
    const sheets = new SchemaSheets(this.store, key, opts)
    await sheets.ready()
    const dk = sheets.base && sheets.base.discoveryKey
    if (this.swarm && dk) {
      try { this.swarm.join(dk, { server: false, client: true }) } catch {}
    }
    this.sheets = sheets
    return sheets
  }

  link () { return z32.encode(this.sheets.key) }
  keyHex () { return b4a.toString(this.sheets.key, 'hex') }

  // name -> schemaId, cached as a shared promise (no racing listSchemas scans).
  async _schemaIds () {
    if (this._schemaIdsP) return this._schemaIdsP
    this._schemaIdsP = (async () => {
      const schemas = await this.sheets.listSchemas()
      const map = {}
      for (const s of schemas) map[s.name] = s.schemaId
      return map
    })()
    return this._schemaIdsP
  }

  async _list (schemaName, jmespath) {
    const q = safeJmesPath(jmespath)
    const ids = await this._schemaIds()
    const sid = ids[schemaName]
    if (!sid) return []
    const opts = { limit: MAX_SHEETS_ROWS }
    if (q) opts.query = q
    let rows
    try {
      rows = await this.sheets.list(sid, opts)
    } catch (err) {
      if (q) throw new Error('Invalid search query')
      throw err
    }
    return rows.filter(Boolean).slice(0, MAX_SHEETS_ROWS)
  }

  // relay-directory rows → the discoverable relay list. Re-verifies each row
  // against its own signed doc when a verifier was supplied (rows that fail are
  // dropped); `verified` is null when no verifier is wired.
  async listRelayDirectory (jmespath) {
    const rows = await this._list('relay-directory', jmespath)
    const out = []
    for (const r of rows) {
      const j = r.json || {}
      let verified = null
      if (this.verify) {
        try { verified = !!(j.doc && this.verify(j.doc)) } catch { verified = false }
        if (!verified) continue
      }
      out.push({
        pubkey: j.pubkey || null,
        gatewayUrl: j.gatewayUrl || null,
        region: j.region || null,
        features: Array.isArray(j.features) ? j.features : [],
        health: j.health || null,
        verified,
        row: r
      })
    }
    return out
  }

  // app-manifest rows → app DTOs (the catalogue read path, hiveindex:// source).
  async listApps (jmespath) {
    const rows = await this._list('app-manifest', jmespath)
    return rows.map(manifestRowToApp).filter(Boolean).slice(0, MAX_SHEETS_ROWS)
  }

  async listVerifications (jmespath) {
    const rows = await this._list('verification', jmespath)
    return rows.map(r => r.json).filter(Boolean)
  }

  async listPins (jmespath) {
    const rows = await this._list('pin-registry', jmespath)
    return rows.map(r => r.json).filter(Boolean)
  }

  async update () { if (this.sheets && this.sheets.base) await this.sheets.base.update() }
  async close () { try { if (this.sheets) await this.sheets.close() } catch {} }
}

module.exports = { IndexRoomClient, INDEX_SCHEMAS, manifestRowToApp, decodeIndexLink }
