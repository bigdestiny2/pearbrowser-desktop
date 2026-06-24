const HEX64 = /^[0-9a-f]{64}$/i
const APP_ID = /^[a-zA-Z0-9_-]{1,64}$/

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

const KNOWN_APP_DRIVES = Object.freeze({
  ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4: 'peerit',
  ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74: 'p2pbuilders'
})

function normalizeHex64 (value, name) {
  if (typeof value !== 'string' || !HEX64.test(value)) throw new Error(`${name} must be 64 hex chars`)
  return value.toLowerCase()
}

function normalizeAppSlug (value) {
  if (typeof value !== 'string') return null
  const slug = value.trim().toLowerCase()
  return /^[a-z0-9_-]{1,64}$/.test(slug) ? slug : null
}

function appSlugForDrive (driveKey) {
  if (typeof driveKey !== 'string') return null
  return KNOWN_APP_DRIVES[driveKey.toLowerCase()] || null
}

function validRawAppId (appId) {
  return typeof appId === 'string' && APP_ID.test(appId)
}

function normalizeRecord (record) {
  if (!record || typeof record !== 'object') return null
  try {
    const scopedAppId = normalizeHex64(record.scopedAppId, 'scopedAppId')
    const appDriveKey = normalizeHex64(record.appDriveKey, 'appDriveKey')
    const inviteKey = normalizeHex64(record.inviteKey, 'inviteKey')
    if (!validRawAppId(record.rawAppId)) return null
    const appSlug = normalizeAppSlug(record.appSlug) || appSlugForDrive(appDriveKey)
    const createdAt = Number.isFinite(record.createdAt) ? record.createdAt : Date.now()
    const updatedAt = Number.isFinite(record.updatedAt) ? record.updatedAt : createdAt
    const lastSeenAt = Number.isFinite(record.lastSeenAt) ? record.lastSeenAt : updatedAt
    return {
      scopedAppId,
      appDriveKey,
      rawAppId: record.rawAppId,
      inviteKey,
      appSlug,
      createdAt,
      updatedAt,
      lastSeenAt
    }
  } catch (_) {
    return null
  }
}

class AppSyncRegistry {
  constructor (opts = {}) {
    this.stateFile = opts.stateFile || (opts.storagePath && fs && path
      ? path.join(opts.storagePath, 'pear-app-sync-registry.json')
      : null)
    this.state = { version: 1, groups: {} }
    this._load()
  }

  _load () {
    if (!this.stateFile || !fs) return
    try {
      const parsed = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'))
      const groups = parsed && parsed.groups && typeof parsed.groups === 'object' && !Array.isArray(parsed.groups)
        ? parsed.groups
        : parsed
      const next = { version: 1, groups: {} }
      if (groups && typeof groups === 'object' && !Array.isArray(groups)) {
        for (const value of Object.values(groups)) {
          const record = normalizeRecord(value)
          if (record) next.groups[record.scopedAppId] = record
        }
      }
      this.state = next
    } catch (_) {
      this.state = { version: 1, groups: {} }
    }
  }

  _persist () {
    if (!this.stateFile || !fs || !path) return
    try {
      const dir = path.dirname(this.stateFile)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state))
    } catch (err) {
      console.warn('[AppSyncRegistry] could not persist registry:', err && err.message)
    }
  }

  remember ({ scopedAppId, appDriveKey, rawAppId, inviteKey, appSlug, lastSeenAt } = {}) {
    const scoped = normalizeHex64(scopedAppId, 'scopedAppId')
    const drive = normalizeHex64(appDriveKey, 'appDriveKey')
    const invite = normalizeHex64(inviteKey, 'inviteKey')
    if (!validRawAppId(rawAppId)) throw new Error('rawAppId must be 1-64 URL-safe chars')

    const now = Number.isFinite(lastSeenAt) ? lastSeenAt : Date.now()
    const prev = this.state.groups[scoped] || {}
    const record = {
      scopedAppId: scoped,
      appDriveKey: drive,
      rawAppId,
      inviteKey: invite,
      appSlug: normalizeAppSlug(appSlug) || appSlugForDrive(drive),
      createdAt: Number.isFinite(prev.createdAt) ? prev.createdAt : now,
      updatedAt: now,
      lastSeenAt: now
    }
    this.state.groups[scoped] = record
    this._persist()
    return { ...record }
  }

  get (scopedAppId) {
    const scoped = typeof scopedAppId === 'string' && HEX64.test(scopedAppId) ? scopedAppId.toLowerCase() : ''
    const record = scoped && this.state.groups[scoped]
    return record ? { ...record } : null
  }

  list (opts = {}) {
    const appSlug = normalizeAppSlug(opts.appSlug)
    const appDriveKey = opts.appDriveKey && HEX64.test(opts.appDriveKey) ? opts.appDriveKey.toLowerCase() : null
    return Object.values(this.state.groups)
      .filter((record) => !appSlug || record.appSlug === appSlug)
      .filter((record) => !appDriveKey || record.appDriveKey === appDriveKey)
      .map((record) => ({ ...record }))
      .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
  }
}

module.exports = {
  AppSyncRegistry,
  KNOWN_APP_DRIVES,
  appSlugForDrive,
  normalizeRecord
}
