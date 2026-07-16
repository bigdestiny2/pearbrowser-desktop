'use strict'

/**
 * Plugin drive loader — installs Pear Plugins from Hyperdrives (Phase 3 gate
 * of docs/BROWSER_PARITY_PLAN.md).
 *
 * A plugin drive looks like an ordinary Pear app drive:
 *
 *   /manifest.json   pear.plugin metadata + capabilities (see pear-plugins.cjs)
 *   /style.css       optional content styles (path declared in the manifest)
 *   /content.js      optional content script
 *   /filters.txt     optional network filter contribution
 *
 * The manifest declares which assets exist and where they match:
 *
 *   {
 *     "name": "Dark Reader",
 *     "version": "1.0.0",
 *     "pear": {
 *       "plugin": {
 *         "capabilities": ["pear.content.styles"],
 *         "content": {
 *           "styles":  { "matches": ["*"], "path": "/style.css" },
 *           "scripts": { "matches": ["*"], "path": "/content.js" },
 *           "filters": "/filters.txt"
 *         }
 *       }
 *     }
 *   }
 *
 * The loader fetches the declared assets, builds the inline contribution the
 * registry expects, and registers under the drive key. Grants are captured at
 * install time; an update whose manifest requests capabilities beyond the
 * recorded grant is an ESCALATION — the plugin is disabled and flagged for
 * explicit re-consent instead of silently gaining power. (A Hyperdrive
 * update arrives over the swarm with no user action, so this guard is what
 * makes P2P-distributed plugins safe.)
 */

const MAX_ASSET_BYTES = 512 * 1024
const MAX_FILTER_BYTES = 2 * 1024 * 1024
const MAX_MANIFEST_BYTES = 256 * 1024

class PluginDriveError extends Error {
  constructor (code, message) {
    super(message)
    this.name = 'PluginDriveError'
    this.code = code
  }
}

class PluginDriveLoader {
  /**
   * @param {object} opts
   * @param {object} opts.registry — PearPluginRegistry
   * @param {function} opts.fetchDriveFile — async (driveKeyHex, path) => { content: Buffer } | null
   * @param {function} [opts.persistInstall] — async (id, payload|null) => void; null clears
   * @param {function} [opts.now]
   */
  constructor (opts = {}) {
    if (!opts.registry || typeof opts.registry.register !== 'function') {
      throw new TypeError('PluginDriveLoader requires a PearPluginRegistry')
    }
    if (typeof opts.fetchDriveFile !== 'function') {
      throw new TypeError('PluginDriveLoader requires a fetchDriveFile transport')
    }
    this._registry = opts.registry
    this._fetch = opts.fetchDriveFile
    this._persistInstall = typeof opts.persistInstall === 'function' ? opts.persistInstall : async () => {}
    this._now = typeof opts.now === 'function' ? opts.now : Date.now
    this._installs = new Map() // driveKeyHex -> { granted, version, escalated: {added}|null }
  }

  /** Rehydrate install records (grants + versions) from durable settings. */
  restore (records) {
    if (!records || typeof records !== 'object') return 0
    let restored = 0
    for (const [key, record] of Object.entries(records)) {
      const driveKey = normalizeDriveKey(key)
      if (!driveKey || !record || typeof record !== 'object') continue
      this._installs.set(driveKey, {
        granted: normalizeCapabilityList(record.granted),
        version: cleanString(record.version),
        installedAt: Number.isFinite(record.installedAt) ? record.installedAt : 0,
        escalated: record.escalated && Array.isArray(record.escalated.added)
          ? { added: normalizeCapabilityList(record.escalated.added) }
          : null
      })
      restored++
    }
    return restored
  }

  installs () {
    return [...this._installs.entries()].map(([driveKey, record]) => ({ driveKey, ...record }))
  }

  installRecord (driveKey) {
    const key = normalizeDriveKey(driveKey)
    return key ? this._installs.get(key) || null : null
  }

  /**
   * Install a plugin from its drive. The user's grant is the manifest's
   * capability set at install time (the consent surface shows exactly this
   * list before calling install).
   */
  async installFromDrive (driveKey, opts = {}) {
    const key = normalizeDriveKey(driveKey)
    if (!key) throw new PluginDriveError('invalid-drive-key', 'A 64-hex plugin drive key is required')

    const loaded = await this._load(key)
    const requested = loaded.capabilities
    const granted = opts.grantedCapabilities !== undefined
      ? normalizeCapabilityList(opts.grantedCapabilities).filter(cap => requested.includes(cap))
      : requested

    const result = this._registry.register({
      id: key,
      manifest: withCapabilities(loaded.manifest, granted),
      contribution: loaded.contribution,
      enabled: opts.enabled !== false
    })
    if (!result || result.ok !== true) {
      throw new PluginDriveError('register-failed', (result && result.reason) || 'Plugin registration failed')
    }

    const record = {
      granted,
      version: loaded.version,
      installedAt: this._now(),
      escalated: null
    }
    this._installs.set(key, record)
    await this._persist(key, {
      id: key,
      manifest: withCapabilities(loaded.manifest, granted),
      contribution: loaded.contribution,
      enabled: opts.enabled !== false,
      granted,
      version: loaded.version,
      installedAt: record.installedAt
    })
    return { ok: true, driveKey: key, name: result.name, version: loaded.version, granted, applied: result.applied }
  }

  /**
   * Update an installed plugin from its drive. Fail-closed on capability
   * escalation: the plugin is disabled, the escalation is recorded, and the
   * caller gets the added capabilities to show in a re-consent prompt.
   * Passing `acceptEscalation: true` re-grants to the new capability set.
   */
  async updateFromDrive (driveKey, opts = {}) {
    const key = normalizeDriveKey(driveKey)
    const record = key ? this._installs.get(key) : null
    if (!record) throw new PluginDriveError('not-installed', 'Plugin is not installed from a drive')

    const loaded = await this._load(key)
    const added = loaded.capabilities.filter(cap => !record.granted.includes(cap))

    if (added.length > 0 && !opts.acceptEscalation) {
      this._registry.setEnabled(key, false)
      record.escalated = { added }
      await this._persistRecordOnly(key, record)
      return {
        ok: false,
        escalated: true,
        driveKey: key,
        added,
        version: loaded.version,
        message: 'Update requests new capabilities; plugin disabled pending re-consent'
      }
    }

    const granted = added.length > 0 ? loaded.capabilities : record.granted
    const result = this._registry.register({
      id: key,
      manifest: withCapabilities(loaded.manifest, granted),
      contribution: loaded.contribution,
      enabled: true
    })
    if (!result || result.ok !== true) {
      throw new PluginDriveError('register-failed', (result && result.reason) || 'Plugin registration failed')
    }

    record.granted = granted
    record.version = loaded.version
    record.escalated = null
    await this._persist(key, {
      id: key,
      manifest: withCapabilities(loaded.manifest, granted),
      contribution: loaded.contribution,
      enabled: true,
      granted,
      version: loaded.version,
      installedAt: record.installedAt || this._now()
    })
    return { ok: true, driveKey: key, version: loaded.version, granted, escalationAccepted: added.length > 0 }
  }

  async uninstall (driveKey) {
    const key = normalizeDriveKey(driveKey)
    if (!key) return { removed: false }
    const known = this._installs.delete(key)
    const removed = this._registry.unregister(key) || known
    await this._persist(key, null)
    return { removed: !!removed, driveKey: key }
  }

  async _load (key) {
    const manifestFile = await this._fetch(key, '/manifest.json')
    const manifestBytes = manifestFile && manifestFile.content ? manifestFile.content : null
    if (!manifestBytes || manifestBytes.length === 0) {
      throw new PluginDriveError('manifest-unavailable', `No /manifest.json on drive ${key.slice(0, 12)}…`)
    }
    if (manifestBytes.length > MAX_MANIFEST_BYTES) {
      throw new PluginDriveError('manifest-too-large', 'Plugin manifest exceeds the size cap')
    }

    let manifest
    try {
      manifest = JSON.parse(manifestBytes.toString('utf8'))
    } catch {
      throw new PluginDriveError('manifest-invalid', 'Plugin manifest is not valid JSON')
    }

    const pear = manifest && manifest.pear && typeof manifest.pear === 'object' ? manifest.pear : {}
    const plugin = pear.plugin && typeof pear.plugin === 'object' ? pear.plugin : null
    if (!plugin) throw new PluginDriveError('not-a-plugin', 'Manifest does not declare pear.plugin')

    const capabilities = normalizeCapabilityList(
      [].concat(plugin.capabilities || [], pear.capabilities || [], manifest.capabilities || [])
    )
    const content = plugin.content && typeof plugin.content === 'object' ? plugin.content : {}
    const contribution = {}

    if (content.styles && typeof content.styles === 'object' && typeof content.styles.path === 'string') {
      const css = await this._readAsset(key, content.styles.path, MAX_ASSET_BYTES)
      contribution.styles = { matches: normalizeMatches(content.styles.matches), css }
    }
    if (content.scripts && typeof content.scripts === 'object' && typeof content.scripts.path === 'string') {
      const js = await this._readAsset(key, content.scripts.path, MAX_ASSET_BYTES)
      contribution.scripts = { matches: normalizeMatches(content.scripts.matches), js }
    }
    if (typeof content.filters === 'string' && content.filters.startsWith('/')) {
      contribution.filters = await this._readAsset(key, content.filters, MAX_FILTER_BYTES)
    }

    return {
      manifest,
      capabilities,
      contribution,
      version: cleanString(manifest.version) || '0.0.0'
    }
  }

  async _readAsset (key, path, maxBytes) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.includes('..')) {
      throw new PluginDriveError('asset-path-invalid', `Invalid plugin asset path: ${path}`)
    }
    const fetched = await this._fetch(key, path)
    const content = fetched && fetched.content ? fetched.content : null
    if (!content || content.length === 0) {
      throw new PluginDriveError('asset-unavailable', `Declared plugin asset ${path} is missing`)
    }
    if (content.length > maxBytes) {
      throw new PluginDriveError('asset-too-large', `Plugin asset ${path} exceeds ${maxBytes} bytes`)
    }
    return content.toString('utf8')
  }

  async _persist (key, payload) {
    try {
      await this._persistInstall(key, payload)
    } catch {}
  }

  async _persistRecordOnly (key, record) {
    // Escalation state rides the same durable payload; merge via callback.
    try {
      await this._persistInstall(key, {
        __recordPatch: true,
        granted: record.granted,
        version: record.version,
        installedAt: record.installedAt,
        escalated: record.escalated
      })
    } catch {}
  }
}

function withCapabilities (manifest, capabilities) {
  // The registry derives capabilities from the manifest; scope registration
  // to the GRANTED set so an ungranted capability never reaches the engine.
  const clone = JSON.parse(JSON.stringify(manifest || {}))
  if (!clone.pear || typeof clone.pear !== 'object') clone.pear = {}
  if (!clone.pear.plugin || typeof clone.pear.plugin !== 'object') clone.pear.plugin = {}
  clone.pear.plugin.capabilities = [...capabilities]
  delete clone.pear.capabilities
  delete clone.capabilities
  return clone
}

function normalizeCapabilityList (value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean))]
}

function normalizeMatches (value) {
  if (!Array.isArray(value)) return ['*']
  const matches = value.map(item => typeof item === 'string' ? item.trim().toLowerCase() : '').filter(Boolean)
  return matches.length ? matches : ['*']
}

function normalizeDriveKey (value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return /^[0-9a-f]{64}$/.test(text) ? text : ''
}

function cleanString (value) {
  return typeof value === 'string' ? value.trim().slice(0, 256) : ''
}

module.exports = {
  PluginDriveLoader,
  PluginDriveError,
  MAX_ASSET_BYTES,
  MAX_FILTER_BYTES
}
