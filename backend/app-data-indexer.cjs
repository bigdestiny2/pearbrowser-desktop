const { appSlugForDrive } = require('./app-sync-registry.cjs')
const { docIdFor } = require('./search-core.cjs')
const { availabilityState } = require('./lighthouse-availability.cjs')

const DEFAULT_PAGE_SIZE = 250
const DEFAULT_MAX_GROUPS = 32
const DEFAULT_MAX_ROWS_PER_GROUP = 5000
const HEX64 = /^[0-9a-f]{64}$/i
const HEX128 = /^[0-9a-f]{128}$/i
const SIGNATURE_FIELDS = new Set(['_sig', '_k', '_dk', '_ns', '_alg'])
const SIGNED_APP_NAMESPACE = 'peerit'

let sodium = null
try { sodium = require('sodium-universal') } catch (_) {}

function enc (value) {
  return encodeURIComponent(String(value || ''))
}

function ts (value, fallback = 0) {
  if (Number.isFinite(value)) return value < 10000000000 ? value * 1000 : value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return Number.isFinite(fallback) ? fallback : 0
}

function text (...parts) {
  return parts
    .flat()
    .filter((part) => part != null && part !== false)
    .map((part) => Array.isArray(part) ? part.join(' ') : String(part))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stableStringify (value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value === undefined ? null : value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const keys = Object.keys(value).filter((key) => !SIGNATURE_FIELDS.has(key)).sort()
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}'
}

function signedMessage (driveKey, type, value) {
  return `pear.app.${driveKey}:${SIGNED_APP_NAMESPACE}:` + type + '|' + stableStringify(value)
}

function launchUrl (driveKey, route) {
  return `hyper://${driveKey}/#${route.startsWith('/') ? route : '/' + route}`
}

function keyFromOperation (op) {
  if (!op || typeof op !== 'object') return null
  if (typeof op.key === 'string' && op.key) return op.key
  const type = typeof op.type === 'string' ? op.type : ''
  const data = op.data && typeof op.data === 'object' ? op.data : null
  if (!type || !data || data.id == null) return null
  return `${type.replace(':', '!')}!${data.id}`
}

function deletedDoc (doc) {
  return doc ? { ...doc, deleted: true } : null
}

function recordTypeOf (key) {
  return String(key || '').split('!')[0] || ''
}

function recordAuthor (value) {
  if (!value || typeof value !== 'object') return null
  for (const key of ['author', 'authorPubkey', 'pubkey', 'pub', 'owner', 'creator', 'by']) {
    if (typeof value[key] === 'string' && value[key]) return value[key]
  }
  return null
}

function expectedKeyForRecord (appSlug, type, value) {
  if (!value || typeof value !== 'object') return null
  if (appSlug === 'peerit') {
    if (type === 'community') return value.slug != null ? `community!${value.slug}` : null
    if (type === 'post') return value.community != null && value.cid != null ? `post!${value.community}!${value.cid}` : null
    if (type === 'comment') return value.community != null && value.postCid != null && value.cid != null ? `comment!${value.community}!${value.postCid}!${value.cid}` : null
    if (type === 'vote') return value.targetCid != null && value.author != null ? `vote!${value.targetCid}!${value.author}` : null
    if (type === 'profile') return value.author != null ? `profile!${value.author}` : null
    if (type === 'modaction') return value.community != null && value.actionId != null ? `modaction!${value.community}!${value.actionId}` : null
    return null
  }
  if (appSlug === 'p2pbuilders') {
    if (type === 'board') return value.name != null ? `board!${value.name}` : null
    if (type === 'post') return value.board != null && value.cid != null ? `post!${value.board}!${value.cid}` : null
    if (type === 'comment') return value.postCid != null && value.cid != null ? `comment!${value.postCid}!${value.cid}` : null
    if (type === 'vote') return value.targetCid != null && value.author != null ? `vote!${value.targetCid}!${value.author}` : null
    if (type === 'profile') return value.author != null ? `profile!${value.author}` : null
    if (type === 'follow') return value.author != null && value.target != null ? `follow!${value.author}!${value.target}` : null
    if (type === 'block') return value.author != null && value.target != null ? `block!${value.author}!${value.target}` : null
    if (type === 'blocklist') return value.author != null ? `blocklist!${value.author}` : null
    return null
  }
  return null
}

function ownerOfRecord (appSlug, type, value) {
  if (!value || typeof value !== 'object') return null
  if (appSlug === 'peerit') {
    if (type === 'community') return value.creator
    if (type === 'modaction') return value.by
    return value.author
  }
  if (appSlug === 'p2pbuilders') return type === 'board' ? value.creator : value.author
  return null
}

function verifyAppRecord (meta, key, value) {
  if (!meta || !value || typeof value !== 'object') return { ok: false, reason: 'missing-record' }
  const appDriveKey = typeof meta.appDriveKey === 'string' ? meta.appDriveKey.toLowerCase() : ''
  const appSlug = meta.appSlug || appSlugForDrive(appDriveKey)
  if (appSlug !== 'peerit' && appSlug !== 'p2pbuilders') return { ok: false, reason: 'unsupported-app' }
  const type = recordTypeOf(key)
  if (!type) return { ok: false, reason: 'missing-type' }
  const expectedKey = expectedKeyForRecord(appSlug, type, value)
  if (!expectedKey || expectedKey !== key) return { ok: false, reason: 'key-mismatch' }
  const owner = ownerOfRecord(appSlug, type, value)
  if (!owner || !HEX64.test(owner)) return { ok: false, reason: 'missing-owner' }
  if (value._k !== owner) return { ok: false, reason: 'signer-owner-mismatch' }
  if (meta.authorPubkey && value._k !== meta.authorPubkey) return { ok: false, reason: 'outbox-author-mismatch' }
  if (value._dk !== appDriveKey) return { ok: false, reason: 'app-drive-mismatch' }
  if (value._ns !== SIGNED_APP_NAMESPACE) return { ok: false, reason: 'namespace-mismatch' }
  if (!HEX64.test(value._k || '') || !HEX128.test(value._sig || '')) return { ok: false, reason: 'signature-missing' }
  if (!sodium) return { ok: false, reason: 'crypto-unavailable' }
  try {
    const ok = sodium.crypto_sign_verify_detached(
      Buffer.from(value._sig, 'hex'),
      Buffer.from(signedMessage(appDriveKey, type, value), 'utf-8'),
      Buffer.from(value._k, 'hex')
    )
    return ok ? { ok: true, verifiedAs: 'app-signed' } : { ok: false, reason: 'signature-invalid' }
  } catch (_) {
    return { ok: false, reason: 'signature-invalid' }
  }
}

function sourceForRecord (meta, key, value, appSlug) {
  return {
    kind: 'app-data',
    appSlug,
    recordType: recordTypeOf(key),
    recordKey: key,
    author: recordAuthor(value) || '',
    outbox: meta && (meta.authorPubkey || (HEX64.test(meta.rawAppId || '') ? meta.rawAppId.toLowerCase() : '')),
    appDriveKey: meta && meta.appDriveKey,
    rawAppId: meta && meta.rawAppId,
    scopedAppId: meta && meta.scopedAppId,
    verifiedAs: value && value._sig ? 'app-signed' : 'browser-observed',
    availability: availabilityState(meta && meta.pin)
  }
}

function withSource (doc, meta, key, value, appSlug) {
  return doc ? { ...doc, source: sourceForRecord(meta, key, value, appSlug) } : null
}

function peeritDoc (meta, driveKey, key, value) {
  if (!value || typeof value !== 'object') return null
  const parts = String(key || '').split('!')
  const kind = parts[0]

  if (kind === 'community') {
    const slug = value.slug || parts[1]
    if (!slug) return null
    return withSource({
      driveKey: launchUrl(driveKey, `/r/${enc(slug)}`),
      path: '/',
      title: text(`r/${slug}`, value.title),
      body: text('peerit community', value.description, value.rules),
      publishedAt: ts(value.createdAt || value.updatedAt)
    }, meta, key, value, 'peerit')
  }

  if (kind === 'post') {
    const community = value.community || parts[1]
    const cid = value.cid || parts[2]
    if (!community || !cid) return null
    const doc = withSource({
      driveKey: launchUrl(driveKey, `/r/${enc(community)}/comments/${enc(cid)}`),
      path: '/',
      title: text(value.title, `r/${community}`) || `Post in r/${community}`,
      body: text('peerit post', value.body, value.url, value.kind),
      publishedAt: ts(value.createdAt || value.editedAt)
    }, meta, key, value, 'peerit')
    return value.deleted ? deletedDoc(doc) : doc
  }

  if (kind === 'comment') {
    const community = value.community || parts[1]
    const postCid = value.postCid || parts[2]
    if (!community || !postCid) return null
    const doc = withSource({
      driveKey: launchUrl(driveKey, `/r/${enc(community)}/comments/${enc(postCid)}`),
      path: `/${parts.slice(0, 4).join('/') || 'comment'}`,
      title: `Comment in r/${community}`,
      body: text('peerit comment', value.body),
      publishedAt: ts(value.createdAt || value.editedAt)
    }, meta, key, value, 'peerit')
    return value.deleted ? deletedDoc(doc) : doc
  }

  return null
}

function p2pBuildersDoc (meta, driveKey, key, value) {
  if (!value || typeof value !== 'object') return null
  const parts = String(key || '').split('!')
  const kind = parts[0]

  if (kind === 'board') {
    const name = value.name || parts[1]
    if (!name) return null
    return withSource({
      driveKey: launchUrl(driveKey, `/b/${enc(name)}`),
      path: '/',
      title: text(`b/${name}`, value.description),
      body: text('p2pbuilders board', value.description),
      publishedAt: ts(value.createdAt)
    }, meta, key, value, 'p2pbuilders')
  }

  if (kind === 'post') {
    const board = value.board || parts[1] || 'front'
    const cid = value.cid || parts[2]
    if (!cid) return null
    const doc = withSource({
      driveKey: launchUrl(driveKey, `/b/${enc(board)}/item/${enc(cid)}`),
      path: '/',
      title: text(value.title, `b/${board}`) || `Post in b/${board}`,
      body: text('p2pbuilders post', value.text, value.url),
      publishedAt: ts(value.createdAt || value.editedAt)
    }, meta, key, value, 'p2pbuilders')
    return value.deleted ? deletedDoc(doc) : doc
  }

  if (kind === 'comment') {
    const postCid = value.postCid || parts[1]
    const board = value.board || 'front'
    if (!postCid) return null
    const doc = withSource({
      driveKey: launchUrl(driveKey, `/b/${enc(board)}/item/${enc(postCid)}`),
      path: `/${parts.slice(0, 3).join('/') || 'comment'}`,
      title: `Comment in b/${board}`,
      body: text('p2pbuilders comment', value.body),
      publishedAt: ts(value.createdAt || value.editedAt)
    }, meta, key, value, 'p2pbuilders')
    return value.deleted ? deletedDoc(doc) : doc
  }

  return null
}

function docForRecord (meta, key, value) {
  const driveKey = meta && typeof meta.appDriveKey === 'string' ? meta.appDriveKey.toLowerCase() : ''
  const slug = (meta && meta.appSlug) || appSlugForDrive(driveKey)
  if (slug === 'peerit') return peeritDoc(meta, driveKey, key, value)
  if (slug === 'p2pbuilders') return p2pBuildersDoc(meta, driveKey, key, value)
  return null
}

class AppDataIndexer {
  constructor ({ personalIndex, registry, now } = {}) {
    this.personalIndex = personalIndex || null
    this.registry = registry || null
    this.now = typeof now === 'function' ? now : () => Date.now()
  }

  async indexAppend ({ appDriveKey, rawAppId, scopedAppId, op } = {}) {
    if (!this.personalIndex) return { indexed: false, skipped: true }
    const key = keyFromOperation(op)
    if (!key) return { indexed: false, skipped: true }
    const meta = this._meta({ appDriveKey, rawAppId, scopedAppId })
    return this.indexRow({ meta, key, value: op && op.data })
  }

  async indexRow ({ meta, key, value } = {}) {
    if (!this.personalIndex || !meta) return { indexed: false, skipped: true }
    const verified = verifyAppRecord(meta, key, value)
    if (!verified.ok) return { indexed: false, skipped: true, reason: verified.reason }
    const doc = docForRecord(meta, key, value)
    if (!doc) return { indexed: false, skipped: true }

    if (doc.deleted) {
      if (typeof this.personalIndex.removeDoc === 'function') {
        const docId = docIdFor(doc.driveKey, doc.path || '/')
        await this.personalIndex.removeDoc(docId)
        return { indexed: false, removed: true, docId }
      }
      return { indexed: false, skipped: true }
    }

    const docId = await this.personalIndex.indexDoc(doc)
    return { indexed: !!docId, docId: docId || null }
  }

  async reindexGroup (bridge, record, opts = {}) {
    const summary = { scanned: 0, indexed: 0, removed: 0, skipped: 0, errors: [] }
    if (!bridge || typeof bridge.range !== 'function' || !record || !this.personalIndex) return summary

    const pageSize = Math.max(1, Math.min(Number(opts.pageSize) || DEFAULT_PAGE_SIZE, 1000))
    const maxRows = Math.max(0, Number(opts.maxRows) || DEFAULT_MAX_ROWS_PER_GROUP)
    let gt = null

    try {
      while (summary.scanned < maxRows) {
        const rows = await bridge.range(record.scopedAppId, {
          gt: gt || undefined,
          limit: Math.min(pageSize, maxRows - summary.scanned)
        })
        if (!Array.isArray(rows) || rows.length === 0) break
        for (const row of rows) {
          summary.scanned++
          const r = await this.indexRow({ meta: record, key: row && row.key, value: row && row.value })
          if (r.indexed) summary.indexed++
          else if (r.removed) summary.removed++
          else summary.skipped++
        }
        gt = rows[rows.length - 1] && rows[rows.length - 1].key
        if (!gt || rows.length < pageSize) break
      }
    } catch (err) {
      summary.errors.push({ scopedAppId: record.scopedAppId, message: (err && err.message) || String(err) })
    }

    return summary
  }

  async reindexKnownGroups (bridge, opts = {}) {
    const summary = { groups: 0, scanned: 0, indexed: 0, removed: 0, skipped: 0, errors: [] }
    if (!bridge || typeof bridge.range !== 'function' || !this.registry || !this.personalIndex) return summary

    const pageSize = Math.max(1, Math.min(Number(opts.pageSize) || DEFAULT_PAGE_SIZE, 1000))
    const maxGroups = Math.max(0, Number(opts.maxGroups) || DEFAULT_MAX_GROUPS)
    const maxRowsPerGroup = Math.max(0, Number(opts.maxRowsPerGroup) || DEFAULT_MAX_ROWS_PER_GROUP)
    const records = this.registry.list()
      .filter((record) => record && (record.appSlug || appSlugForDrive(record.appDriveKey)))
      .slice(0, maxGroups)

    for (const record of records) {
      summary.groups++
      const r = await this.reindexGroup(bridge, record, { pageSize, maxRows: maxRowsPerGroup })
      summary.scanned += r.scanned
      summary.indexed += r.indexed
      summary.removed += r.removed
      summary.skipped += r.skipped
      summary.errors.push(...r.errors)
    }
    return summary
  }

  _meta ({ appDriveKey, rawAppId, scopedAppId } = {}) {
    const appDrive = typeof appDriveKey === 'string' ? appDriveKey.toLowerCase() : ''
    const scoped = typeof scopedAppId === 'string' ? scopedAppId.toLowerCase() : ''
    const fromRegistry = scoped && this.registry && typeof this.registry.get === 'function'
      ? this.registry.get(scoped)
      : null
    return fromRegistry || {
      scopedAppId: scoped,
      appDriveKey: appDrive,
      rawAppId,
      appSlug: appSlugForDrive(appDrive),
      authorPubkey: HEX64.test(rawAppId || '') ? rawAppId.toLowerCase() : null,
      lastSeenAt: this.now()
    }
  }
}

module.exports = {
  AppDataIndexer,
  docForRecord,
  keyFromOperation,
  launchUrl,
  sourceForRecord,
  verifyAppRecord
}
