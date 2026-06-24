const { appSlugForDrive } = require('./app-sync-registry.cjs')
const { docIdFor } = require('./search-core.cjs')

const DEFAULT_PAGE_SIZE = 250
const DEFAULT_MAX_GROUPS = 32
const DEFAULT_MAX_ROWS_PER_GROUP = 5000

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

function peeritDoc (driveKey, key, value) {
  if (!value || typeof value !== 'object') return null
  const parts = String(key || '').split('!')
  const kind = parts[0]

  if (kind === 'community') {
    const slug = value.slug || parts[1]
    if (!slug) return null
    return {
      driveKey: launchUrl(driveKey, `/r/${enc(slug)}`),
      path: '/',
      title: text(`r/${slug}`, value.title),
      body: text('peerit community', value.description, value.rules),
      publishedAt: ts(value.createdAt || value.updatedAt)
    }
  }

  if (kind === 'post') {
    const community = value.community || parts[1]
    const cid = value.cid || parts[2]
    if (!community || !cid) return null
    const doc = {
      driveKey: launchUrl(driveKey, `/r/${enc(community)}/comments/${enc(cid)}`),
      path: '/',
      title: text(value.title, `r/${community}`) || `Post in r/${community}`,
      body: text('peerit post', value.body, value.url, value.kind),
      publishedAt: ts(value.createdAt || value.editedAt)
    }
    return value.deleted ? deletedDoc(doc) : doc
  }

  if (kind === 'comment') {
    const community = value.community || parts[1]
    const postCid = value.postCid || parts[2]
    if (!community || !postCid) return null
    const doc = {
      driveKey: launchUrl(driveKey, `/r/${enc(community)}/comments/${enc(postCid)}`),
      path: `/${parts.slice(0, 4).join('/') || 'comment'}`,
      title: `Comment in r/${community}`,
      body: text('peerit comment', value.body),
      publishedAt: ts(value.createdAt || value.editedAt)
    }
    return value.deleted ? deletedDoc(doc) : doc
  }

  return null
}

function p2pBuildersDoc (driveKey, key, value) {
  if (!value || typeof value !== 'object') return null
  const parts = String(key || '').split('!')
  const kind = parts[0]

  if (kind === 'board') {
    const name = value.name || parts[1]
    if (!name) return null
    return {
      driveKey: launchUrl(driveKey, `/b/${enc(name)}`),
      path: '/',
      title: text(`b/${name}`, value.description),
      body: text('p2pbuilders board', value.description),
      publishedAt: ts(value.createdAt)
    }
  }

  if (kind === 'post') {
    const board = value.board || parts[1] || 'front'
    const cid = value.cid || parts[2]
    if (!cid) return null
    const doc = {
      driveKey: launchUrl(driveKey, `/b/${enc(board)}/item/${enc(cid)}`),
      path: '/',
      title: text(value.title, `b/${board}`) || `Post in b/${board}`,
      body: text('p2pbuilders post', value.text, value.url),
      publishedAt: ts(value.createdAt || value.editedAt)
    }
    return value.deleted ? deletedDoc(doc) : doc
  }

  if (kind === 'comment') {
    const postCid = value.postCid || parts[1]
    const board = value.board || 'front'
    if (!postCid) return null
    const doc = {
      driveKey: launchUrl(driveKey, `/b/${enc(board)}/item/${enc(postCid)}`),
      path: `/${parts.slice(0, 3).join('/') || 'comment'}`,
      title: `Comment in b/${board}`,
      body: text('p2pbuilders comment', value.body),
      publishedAt: ts(value.createdAt || value.editedAt)
    }
    return value.deleted ? deletedDoc(doc) : doc
  }

  return null
}

function docForRecord (meta, key, value) {
  const driveKey = meta && typeof meta.appDriveKey === 'string' ? meta.appDriveKey.toLowerCase() : ''
  const slug = (meta && meta.appSlug) || appSlugForDrive(driveKey)
  if (slug === 'peerit') return peeritDoc(driveKey, key, value)
  if (slug === 'p2pbuilders') return p2pBuildersDoc(driveKey, key, value)
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
      let gt = null
      let scannedForGroup = 0
      try {
        while (scannedForGroup < maxRowsPerGroup) {
          const rows = await bridge.range(record.scopedAppId, {
            gt: gt || undefined,
            limit: Math.min(pageSize, maxRowsPerGroup - scannedForGroup)
          })
          if (!Array.isArray(rows) || rows.length === 0) break
          for (const row of rows) {
            scannedForGroup++
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
      lastSeenAt: this.now()
    }
  }
}

module.exports = {
  AppDataIndexer,
  docForRecord,
  keyFromOperation,
  launchUrl
}
