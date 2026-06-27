function scrubPrototypeKeys (value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    if (Object.prototype.hasOwnProperty.call(value, key)) delete value[key]
  }
  if (Array.isArray(value)) {
    for (const item of value) scrubPrototypeKeys(item, seen)
    return value
  }
  for (const key of Object.keys(value)) scrubPrototypeKeys(value[key], seen)
  return value
}

function safeJSONParse (str) {
  return scrubPrototypeKeys(JSON.parse(str))
}

function catalogAppsFromEnvelope (catalog) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) return []
  if (Array.isArray(catalog.apps)) return catalog.apps
  if (Array.isArray(catalog.items)) return catalog.items
  if (Array.isArray(catalog.entries)) return catalog.entries
  return []
}

const HEX64_RE = /^[0-9a-f]{64}$/i
const Z32_RE = /^[13-9a-km-uw-z]{52}$/i
const APP_LINK_RE = /^(?:hyper|pear|file):\/\/.+/i
const VERIFICATION_RANK = { 'author-signed': 3, 'relay-listed': 2, unverified: 1 }

function trimString (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function hexFromZ32 (value) {
  try {
    const z32 = require('z32')
    const buf = z32.decode(String(value || '').toLowerCase())
    return buf && buf.length === 32 ? Buffer.from(buf).toString('hex') : ''
  } catch {
    return ''
  }
}

function normalizeDriveKey (raw) {
  const s = trimString(raw)
  if (!s) return ''

  const target = /^hyper:\/\//i.test(s)
    ? s.replace(/^hyper:\/\//i, '').split(/[/?#]/)[0].trim()
    : s

  if (HEX64_RE.test(target)) return target.toLowerCase()
  if (Z32_RE.test(target)) return hexFromZ32(target)
  return ''
}

function driveKeyFromHyperLink (raw) {
  const s = trimString(raw)
  if (!/^hyper:\/\//i.test(s)) return ''
  const key = s.replace(/^hyper:\/\//i, '').split(/[/?#]/)[0].trim()
  if (HEX64_RE.test(key)) return key.toLowerCase()
  if (Z32_RE.test(key)) return hexFromZ32(key)
  return ''
}

function normalizeCatalogLink (raw) {
  const s = trimString(raw)
  if (!s) return ''
  const normalized = s.replace(/^([a-z][a-z0-9+.-]*):\/\//i, (_, scheme) => scheme.toLowerCase() + '://')
  return APP_LINK_RE.test(normalized) ? normalized : ''
}

function normalizeCategories (categories) {
  if (!Array.isArray(categories)) return []
  return categories
    .map((category) => String(category || '').trim())
    .filter(Boolean)
    .slice(0, 32)
}

function normalizeVerification (value) {
  const v = trimString(value)
  return v || 'unverified'
}

function boundedText (value, max = 200) {
  if (value == null) return ''
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

function normalizeModerationStatus (value) {
  const status = boundedText(value, 60).toLowerCase()
  if (status === 'pending-review' || status === 'pending' || status === 'in-review') return 'pending-review'
  if (status === 'approved' || status === 'accepted') return 'approved'
  if (status === 'rejected' || status === 'denied') return 'rejected'
  return status
}

function moderationTimestamp (value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value)
  const text = boundedText(value, 80)
  return text || undefined
}

function releaseTimestamp (value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value)
  const text = boundedText(value, 80)
  return text || undefined
}

function sanitizeModerationEvidence (app) {
  if (!app || typeof app !== 'object' || Array.isArray(app)) return null
  const moderation = app.moderation && typeof app.moderation === 'object' && !Array.isArray(app.moderation)
    ? scrubPrototypeKeys({ ...app.moderation })
    : {}
  const out = {
    status: normalizeModerationStatus(moderation.status || app.moderationStatus || app.status),
    reason: boundedText(moderation.reason || app.moderationReason, 200),
    relayResponse: boundedText(moderation.relayResponse || moderation.relayReason || app.relayResponse || app.relayReason, 300),
    submittedAt: moderationTimestamp(moderation.submittedAt || app.submittedAt),
    decidedAt: moderationTimestamp(moderation.decidedAt || moderation.reviewedAt || app.decidedAt || app.reviewedAt),
    reviewer: boundedText(moderation.reviewer || moderation.moderator || app.reviewer || app.moderator, 128)
  }
  for (const key of Object.keys(out)) {
    if (out[key] === undefined || out[key] === '') delete out[key]
  }
  return Object.keys(out).length ? out : null
}

function finiteCount (value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

function sanitizePinEvidence (pin) {
  if (!pin || typeof pin !== 'object' || Array.isArray(pin)) return null
  const clean = scrubPrototypeKeys({ ...pin })
  const out = {
    ok: clean.ok === true,
    durable: clean.durable === true,
    replicationTimedOut: clean.replicationTimedOut === true
  }
  for (const key of ['acceptances', 'replicatedPeers', 'connectedRelays']) {
    const count = finiteCount(clean[key])
    if (count !== null) out[key] = count
  }
  return Object.keys(out).some((key) => out[key] === true || (typeof out[key] === 'number' && out[key] > 0))
    ? out
    : null
}

function sanitizeReleaseEntry (entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
  const clean = scrubPrototypeKeys({ ...entry })
  const out = {
    version: boundedText(clean.version || clean.v, 40),
    publishedAt: releaseTimestamp(clean.publishedAt || clean.releasedAt),
    updatedAt: releaseTimestamp(clean.updatedAt),
    notes: boundedText(clean.notes || clean.changelog || clean.summary, 240),
    driveKey: normalizeDriveKey(clean.driveKey || clean.key || clean.appKey),
    link: normalizeCatalogLink(clean.link),
    verification: boundedText(clean.verification, 60)
  }
  for (const key of Object.keys(out)) {
    if (out[key] === undefined || out[key] === '') delete out[key]
  }
  return Object.keys(out).length ? out : null
}

function sanitizeReleaseHistory (app) {
  if (!app || typeof app !== 'object' || Array.isArray(app)) return []
  const raw = Array.isArray(app.releaseHistory)
    ? app.releaseHistory
    : (Array.isArray(app.releases) ? app.releases : [])
  const out = []
  for (const entry of raw) {
    const clean = sanitizeReleaseEntry(entry)
    if (clean) out.push(clean)
    if (out.length >= 12) break
  }
  return out
}

function normalizeAppType (value) {
  const type = trimString(value).toLowerCase()
  return type === 'standalone' || type === 'hypersite' ? type : ''
}

function normalizeCatalogApp (app, opts = {}) {
  if (!app || typeof app !== 'object' || Array.isArray(app)) return null
  const out = { ...app }
  const upstreamSource = trimString(out.sourceUrl) || (opts.source ? trimString(out.source) : '')

  const key = trimString(out.driveKey) ||
    trimString(out.appKey) ||
    trimString(out.key) ||
    ''
  const rawLink = trimString(out.link)
  const link = normalizeCatalogLink(out.link)
  const driveKey = normalizeDriveKey(key) || driveKeyFromHyperLink(link)
  const id = trimString(out.id) || driveKey || link
  if ((key && !driveKey && !link) || (rawLink && !link && !driveKey) || (!driveKey && !link) || !id) return null

  out.id = id || undefined
  out.name = trimString(out.name) || id || undefined
  if (driveKey) out.driveKey = driveKey
  else delete out.driveKey
  if (link) out.link = link
  else delete out.link
  const type = normalizeAppType(out.type)
  if (type) out.type = type
  else delete out.type
  out.version = out.version == null ? '' : String(out.version).trim()
  const publishedAt = releaseTimestamp(out.publishedAt || out.releasedAt)
  const updatedAt = releaseTimestamp(out.updatedAt)
  if (publishedAt !== undefined) out.publishedAt = publishedAt
  else delete out.publishedAt
  if (updatedAt !== undefined) out.updatedAt = updatedAt
  else delete out.updatedAt
  delete out.releasedAt
  const releaseHistory = sanitizeReleaseHistory(out)
  if (releaseHistory.length) out.releaseHistory = releaseHistory
  else delete out.releaseHistory
  delete out.releases
  out.categories = normalizeCategories(out.categories)
  out.verification = normalizeVerification(out.verification)
  const moderation = sanitizeModerationEvidence(out)
  if (moderation) {
    out.moderation = moderation
    if (moderation.status) {
      out.status = moderation.status
      out.moderationStatus = moderation.status
    }
    if (moderation.reason) out.moderationReason = moderation.reason
    if (moderation.submittedAt !== undefined) out.submittedAt = moderation.submittedAt
    if (moderation.decidedAt !== undefined) out.reviewedAt = moderation.decidedAt
  } else {
    delete out.moderation
  }
  if (upstreamSource) out.sourceUrl = upstreamSource
  if (opts.source) out.source = opts.source
  if (opts.catalogKey && !out.catalogKey) out.catalogKey = opts.catalogKey
  if (opts.catalogName && !out.catalogName) out.catalogName = opts.catalogName
  return out
}

function normalizeCatalogData (catalog, opts = {}) {
  const data = scrubPrototypeKeys(catalog && typeof catalog === 'object' && !Array.isArray(catalog)
    ? catalog
    : {})
  const appOpts = { ...opts, catalogName: opts.catalogName || data.name }
  const apps = catalogAppsFromEnvelope(data)
    .map((app) => normalizeCatalogApp(app, appOpts))
    .filter(Boolean)
  return { ...data, apps }
}

function catalogAppStableKey (app) {
  if (!app || typeof app !== 'object' || Array.isArray(app)) return ''
  const key = trimString(app.driveKey) ||
    trimString(app.appKey) ||
    trimString(app.key) ||
    ''
  const link = normalizeCatalogLink(app.link)
  const driveKey = normalizeDriveKey(key) || driveKeyFromHyperLink(link)
  if (driveKey) return `drive:${driveKey}`
  if (link) return `link:${link}`
  const id = trimString(app.id)
  if (id) return `id:${id}`
  return ''
}

function versionGreater (a, b) {
  const pa = String(a == null ? '0' : a).split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b == null ? '0' : b).split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] || 0
    const db = pb[i] || 0
    if (da !== db) return da > db
  }
  return false
}

function betterCatalogApp (a, b) {
  const va = VERIFICATION_RANK[a && a.verification] || 1
  const vb = VERIFICATION_RANK[b && b.verification] || 1
  if (va !== vb) return va > vb ? a : b
  if (versionGreater(a && a.version, b && b.version)) return a
  if (versionGreater(b && b.version, a && a.version)) return b
  return b
}

function mergeCatalogAppEntries (incoming, existing) {
  if (!existing) return incoming
  const winner = betterCatalogApp(incoming, existing)
  const other = winner === incoming ? existing : incoming
  const merged = { ...winner }
  if (!merged.iconData && other.iconData) merged.iconData = other.iconData
  if (!merged.icon && other.icon) merged.icon = other.icon
  const sources = [
    ...(Array.isArray(existing._sources) ? existing._sources : []),
    ...(Array.isArray(incoming._sources) ? incoming._sources : []),
    existing.catalogName,
    incoming.catalogName
  ].filter(Boolean)
  if (sources.length) merged._sources = [...new Set(sources)]
  return merged
}

function defaultCatalogEntrySource (entry) {
  if (entry && entry.type) return entry.type
  return entry && entry.drive ? 'hyperdrive' : 'catalog'
}

function aggregateCatalogApps (catalogs, sourceForEntry = defaultCatalogEntrySource) {
  const byTarget = new Map()
  const anon = []
  const entries = catalogs && typeof catalogs[Symbol.iterator] === 'function' ? catalogs : []
  for (const [catalogKey, entry] of entries) {
    if (!entry || !entry.data || !Array.isArray(entry.data.apps)) continue
    const catalogName = entry.data.name || 'Catalog'
    const source = sourceForEntry(entry)
    for (const app of entry.data.apps) {
      const normalized = normalizeCatalogApp(app, { source, catalogKey, catalogName })
      if (!normalized) continue
      const tagged = { ...normalized, source, catalogKey, catalogName }
      const stableKey = catalogAppStableKey(tagged)
      if (!stableKey) { anon.push(tagged); continue }
      byTarget.set(stableKey, mergeCatalogAppEntries(tagged, byTarget.get(stableKey)))
    }
  }
  return [...byTarget.values(), ...anon]
}

function searchAppsList (apps, query) {
  const list = Array.isArray(apps) ? apps : []
  const q = String(query || '').normalize('NFKC').trim().toLowerCase()
  if (!q) return list
  return list.filter(app => catalogAppSearchText(app).includes(q))
}

function catalogAppSearchText (app) {
  if (!app || typeof app !== 'object') return ''
  const importedFrom = app.importedFrom && typeof app.importedFrom === 'object' && !Array.isArray(app.importedFrom)
    ? app.importedFrom
    : {}
  const moderation = app.moderation && typeof app.moderation === 'object' && !Array.isArray(app.moderation)
    ? app.moderation
    : {}
  const fields = [
    app.name,
    app.description,
    app.author,
    app.homepage,
    app.sourceUrl,
    app.license,
    app.id,
    app.version,
    app.source,
    app.catalogName,
    app.verification,
    app.link,
    app.driveKey,
    app.status,
    app.moderationStatus,
    app.moderationReason,
    app.relayResponse,
    app.relayReason,
    app.submittedAt,
    app.reviewedAt,
    app.decidedAt,
    app.publishedAt,
    app.updatedAt,
    moderation.status,
    moderation.reason,
    moderation.relayResponse,
    moderation.relayReason,
    moderation.submittedAt,
    moderation.reviewedAt,
    moderation.decidedAt,
    moderation.reviewer,
    app.fallbackReason,
    ...(Array.isArray(app.releaseHistory) ? app.releaseHistory.flatMap((release) => {
      const r = release && typeof release === 'object' && !Array.isArray(release) ? release : {}
      return [r.version, r.publishedAt, r.updatedAt, r.notes, r.driveKey, r.link, r.verification]
    }) : []),
    importedFrom.catalogName,
    importedFrom.catalogKey,
    importedFrom.source,
    importedFrom.verification,
    importedFrom.appId,
    ...(Array.isArray(app.categories) ? app.categories : []),
    ...(Array.isArray(app._sources) ? app._sources : []),
    ...(Array.isArray(importedFrom.sources) ? importedFrom.sources : [])
  ]
  return fields
    .filter((value) => value != null && value !== '')
    .map((value) => String(value).normalize('NFKC').toLowerCase())
    .join(' ')
}

function sanitizePersonalCatalogEntry (app) {
  if (!app || typeof app !== 'object') throw new Error('Invalid app')
  const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : undefined)
  const imported = app.importedFrom && typeof app.importedFrom === 'object' && !Array.isArray(app.importedFrom)
    ? scrubPrototypeKeys({ ...app.importedFrom })
    : null
  const importedFrom = imported
    ? {
        catalogName: str(imported.catalogName, 120),
        catalogKey: str(imported.catalogKey, 160),
        source: str(imported.source, 60),
        verification: str(imported.verification, 60),
        appId: str(imported.appId, 128),
        importedAt: str(imported.importedAt, 40),
        sources: Array.isArray(imported.sources)
          ? imported.sources.map((source) => String(source || '').trim().slice(0, 120)).filter(Boolean).slice(0, 12)
          : undefined
      }
    : null
  if (importedFrom) {
    for (const k of Object.keys(importedFrom)) {
      if (Array.isArray(importedFrom[k]) ? importedFrom[k].length === 0 : !importedFrom[k]) delete importedFrom[k]
    }
  }
  const moderation = sanitizeModerationEvidence(app)
  const pin = sanitizePinEvidence(app.pin)
  const releaseHistory = sanitizeReleaseHistory(app)
  const publishedAt = releaseTimestamp(app.publishedAt || app.releasedAt)
  const updatedAt = releaseTimestamp(app.updatedAt)
  const draft = {
    id: str(app.id, 128),
    name: str(app.name, 200),
    description: str(app.description, 1000),
    driveKey: str(app.driveKey, 128),
    link: str(app.link, 300),
    version: str(app.version, 40),
    ...(publishedAt !== undefined ? { publishedAt } : {}),
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    ...(releaseHistory.length ? { releaseHistory } : {}),
    author: str(app.author, 200),
    homepage: str(app.homepage, 300),
    sourceUrl: str(app.sourceUrl, 300),
    license: str(app.license, 80),
    publisherKey: str(app.publisherKey, 128),
    icon: str(app.icon, 300),
    fallbackReason: str(app.fallbackReason, 200),
    status: str(app.status, 60) || (moderation && moderation.status),
    moderationStatus: str(app.moderationStatus, 60) || (moderation && moderation.status),
    moderationReason: str(app.moderationReason, 200) || (moderation && moderation.reason),
    ...(moderation && moderation.submittedAt !== undefined ? { submittedAt: moderation.submittedAt } : {}),
    ...(moderation && moderation.decidedAt !== undefined ? { reviewedAt: moderation.decidedAt } : {}),
    ...(moderation ? { moderation } : {}),
    ...(pin ? { pin } : {}),
    // Launch gating (PBACS §9): explicit standalone (own window) vs hypersite
    // (inline tab). Only the two valid enum values survive; anything else drops.
    type: (['standalone', 'hypersite'].includes(String(app.type || '').trim()) ? String(app.type).trim() : undefined),
    ...(importedFrom && Object.keys(importedFrom).length ? { importedFrom } : {})
  }
  if (Array.isArray(app.categories)) {
    draft.categories = app.categories.map((c) => String(c).trim().slice(0, 60)).filter(Boolean).slice(0, 12)
  }
  for (const k of Object.keys(draft)) if (draft[k] === undefined || draft[k] === '') delete draft[k]
  const out = normalizeCatalogApp(draft)
  if (!out) throw new Error('App needs a valid 64-hex drive key, hyper:// drive link, pear:// link, or file:// link.')
  return {
    id: out.id,
    name: out.name,
    ...(draft.type ? { type: draft.type } : {}),
    description: out.description || '',
    ...(out.driveKey ? { driveKey: out.driveKey } : {}),
    ...(out.link ? { link: out.link } : {}),
    version: out.version || '',
    ...(out.publishedAt !== undefined ? { publishedAt: out.publishedAt } : {}),
    ...(out.updatedAt !== undefined ? { updatedAt: out.updatedAt } : {}),
    ...(Array.isArray(out.releaseHistory) && out.releaseHistory.length ? { releaseHistory: out.releaseHistory } : {}),
    author: out.author || '',
    categories: Array.isArray(out.categories) ? out.categories : [],
    ...(out.homepage ? { homepage: out.homepage } : {}),
    ...(out.sourceUrl ? { sourceUrl: out.sourceUrl } : {}),
    ...(out.license ? { license: out.license } : {}),
    ...(out.publisherKey ? { publisherKey: out.publisherKey } : {}),
    ...(out.icon ? { icon: out.icon } : {}),
    ...(out.fallbackReason ? { fallbackReason: out.fallbackReason } : {}),
    ...(out.status ? { status: out.status } : {}),
    ...(out.moderationStatus ? { moderationStatus: out.moderationStatus } : {}),
    ...(out.moderationReason ? { moderationReason: out.moderationReason } : {}),
    ...(out.submittedAt !== undefined ? { submittedAt: out.submittedAt } : {}),
    ...(out.reviewedAt !== undefined ? { reviewedAt: out.reviewedAt } : {}),
    ...(out.moderation ? { moderation: out.moderation } : {}),
    ...(out.pin ? { pin: out.pin } : {}),
    ...(out.importedFrom ? { importedFrom: out.importedFrom } : {})
  }
}

module.exports = {
  VERIFICATION_RANK,
  aggregateCatalogApps,
  betterCatalogApp,
  catalogAppStableKey,
  catalogAppSearchText,
  catalogAppsFromEnvelope,
  mergeCatalogAppEntries,
  normalizeCatalogApp,
  normalizeCatalogLink,
  normalizeDriveKey,
  driveKeyFromHyperLink,
  normalizeCatalogData,
  normalizeAppType,
  sanitizeModerationEvidence,
  sanitizeReleaseHistory,
  scrubPrototypeKeys,
  safeJSONParse,
  sanitizePersonalCatalogEntry,
  searchAppsList
}
