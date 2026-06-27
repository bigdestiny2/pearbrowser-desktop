import { driveKeyFromHyperRef } from './keys.js'

function asObject (value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function cleanText (value, max = 80) {
  if (typeof value !== 'string') return ''
  const text = value.normalize('NFKC').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, Math.max(1, max - 3)) + '...' : text
}

function fieldText (value, max = 200) {
  if (value == null) return ''
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

function normalizedLaunchLink (value) {
  const link = fieldText(value, 512)
  if (!link) return ''
  const normalized = link.replace(/^([a-z][a-z0-9+.-]*):\/\//i, (_, scheme) => scheme.toLowerCase() + '://')
  return /^(?:hyper|pear|file):\/\/.+/i.test(normalized) ? normalized : ''
}

function validDriveKey (value) {
  const key = fieldText(value, 128).toLowerCase()
  return /^[0-9a-f]{64}$/.test(key) ? key : ''
}

function finiteCount (value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

function cleanPinEvidence (pin) {
  const p = asObject(pin)
  if (!Object.keys(p).length) return null
  const out = {
    ok: p.ok === true,
    durable: p.durable === true,
    replicationTimedOut: p.replicationTimedOut === true
  }
  for (const key of ['acceptances', 'replicatedPeers', 'connectedRelays']) {
    const count = finiteCount(p[key])
    if (count !== null) out[key] = count
  }
  return Object.keys(out).some((key) => out[key] === true || (typeof out[key] === 'number' && out[key] > 0))
    ? out
    : null
}

function searchResultUrl (result) {
  const r = asObject(result)
  const link = normalizedLaunchLink(r.link)
  if (link) return link
  const driveKey = fieldText(r.driveKey, 512)
  if (/^(?:pear|file|hyper):\/\//i.test(driveKey)) return normalizedLaunchLink(driveKey)
  return driveKey ? `hyper://${driveKey}${r.path && r.path !== '/' ? r.path : '/'}` : ''
}

function uniqueTexts (values, max = 80) {
  const out = []
  for (const value of Array.isArray(values) ? values : []) {
    const text = cleanText(value, max)
    if (text && !out.includes(text)) out.push(text)
  }
  return out
}

function sourceKindLabel (source) {
  const s = cleanText(source, 40).toLowerCase()
  if (s === 'hyperbee') return 'Hyperbee'
  if (s === 'hyperdrive') return 'Hyperdrive'
  if (s === 'autobee') return 'Collaborative'
  if (s === 'sheets') return 'Sheets'
  if (s === 'hiveindex') return 'Relay index'
  if (s === 'personal') return 'Personal'
  if (s === 'browser') return 'Browser'
  if (s === 'search') return 'Search'
  if (s === 'publisher') return 'Publisher'
  if (s === 'catalog') return 'Catalog'
  return s ? cleanText(source, 40) : ''
}

function verificationChip (verification) {
  const v = cleanText(verification, 40).toLowerCase()
  if (v === 'author-signed') return { key: 'verify:author-signed', label: 'Signed', tone: 'followed', title: 'Author-signed catalog row' }
  if (v === 'relay-listed') return { key: 'verify:relay-listed', label: 'Relay-listed', tone: 'followed', title: 'Listed by a relay index' }
  if (v && v !== 'unverified') return { key: `verify:${v}`, label: cleanText(verification, 30), tone: 'self', title: 'Catalog verification claim' }
  return { key: 'verify:unsigned', label: 'Unsigned', tone: 'other', title: 'No author or relay signature on this catalog row' }
}

function normalizedModerationStatus (value) {
  const status = cleanText(value, 40).toLowerCase()
  if (status === 'pending-review' || status === 'pending' || status === 'in-review') return 'pending-review'
  if (status === 'approved' || status === 'accepted') return 'approved'
  if (status === 'rejected' || status === 'denied') return 'rejected'
  return status
}

function moderationEvidence (app) {
  const a = asObject(app)
  const m = asObject(a.moderation)
  const status = normalizedModerationStatus(m.status || a.moderationStatus || a.status)
  const reason = cleanText(m.reason || a.moderationReason, 200)
  const relayResponse = cleanText(m.relayResponse || m.relayReason || a.relayResponse || a.relayReason, 200)
  const submittedAt = fieldText(m.submittedAt || a.submittedAt, 80)
  const decidedAt = fieldText(m.decidedAt || m.reviewedAt || a.decidedAt || a.reviewedAt, 80)
  const reviewer = cleanText(m.reviewer || m.moderator || a.reviewer || a.moderator, 80)
  if (!status && !reason && !relayResponse && !submittedAt && !decidedAt && !reviewer) return null
  return { status, reason, relayResponse, submittedAt, decidedAt, reviewer }
}

export function catalogModerationSummary (app) {
  const evidence = moderationEvidence(app)
  if (!evidence) return ''
  const parts = []
  if (evidence.status === 'pending-review') parts.push('Waiting for community catalog review')
  else if (evidence.status === 'approved') parts.push('Approved by the community catalog')
  else if (evidence.status === 'rejected') parts.push('Rejected by the community catalog')
  else if (evidence.status) parts.push(`Moderation state: ${evidence.status}`)
  if (evidence.reason) parts.push(evidence.reason)
  if (evidence.relayResponse) parts.push(`Relay response: ${evidence.relayResponse}`)
  if (evidence.submittedAt) parts.push(`Submitted ${evidence.submittedAt}`)
  if (evidence.decidedAt) parts.push(`Reviewed ${evidence.decidedAt}`)
  if (evidence.reviewer) parts.push(`Reviewer ${evidence.reviewer}`)
  return parts.join('. ')
}

function statusChip (app) {
  const evidence = moderationEvidence(app)
  const status = evidence && evidence.status
  const title = catalogModerationSummary(app)
  if (status === 'pending-review') return { key: 'status:pending', label: 'Pending review', tone: 'self', title: title || 'Waiting for community catalog review' }
  if (status === 'approved') return { key: 'status:approved', label: 'Approved', tone: 'followed', title: title || 'Approved by the community catalog' }
  if (status === 'rejected') return { key: 'status:rejected', label: 'Rejected', tone: 'danger', title: title || 'Rejected by the community catalog' }
  if (status) return { key: `status:${status}`, label: cleanText(status, 32), tone: 'other', title: title || 'Catalog moderation state' }
  return null
}

export function importAttributionForCatalogSave (app, { now = () => new Date().toISOString() } = {}) {
  const a = asObject(app)
  const sources = uniqueTexts(a._sources, 80)
  const importedFrom = {
    catalogName: cleanText(a.catalogName, 120),
    catalogKey: cleanText(a.catalogKey, 160),
    source: cleanText(a.source, 60),
    verification: cleanText(a.verification, 60),
    sources,
    appId: cleanText(a.id, 128),
    importedAt: typeof now === 'function' ? cleanText(now(), 40) : cleanText(now, 40)
  }
  for (const key of Object.keys(importedFrom)) {
    if (Array.isArray(importedFrom[key]) ? importedFrom[key].length === 0 : !importedFrom[key]) delete importedFrom[key]
  }
  if (!Object.keys(importedFrom).length) return { ...a }
  return { ...a, importedFrom }
}

export function catalogEntryFromUrl (url, opts = {}) {
  const link = normalizedLaunchLink(url)
  if (!link) return null
  const driveKey = validDriveKey(opts.driveKey) || (/^hyper:\/\//i.test(link) ? validDriveKey(driveKeyFromHyperRef(link)) : '')
  const source = fieldText(opts.source, 60) || 'browser'
  const catalogName = fieldText(opts.catalogName, 120) || 'About this site'
  const fallbackReason = fieldText(opts.fallbackReason, 200)
  const description = fieldText(opts.description, 1000) || fallbackReason || `Saved from ${catalogName}.`
  const name = fieldText(opts.title || opts.name, 200) ||
    (driveKey ? `hyper://${driveKey.slice(0, 12)}...` : link)
  const id = fieldText(opts.id, 128) || driveKey || link
  return {
    id,
    name,
    description,
    ...(driveKey ? { driveKey } : {}),
    link,
    type: fieldText(opts.type, 32) || (/^pear:\/\//i.test(link) ? 'standalone' : 'hypersite'),
    version: fieldText(opts.version, 40),
    author: fieldText(opts.author, 200),
    categories: Array.isArray(opts.categories) ? opts.categories.map((c) => fieldText(c, 60)).filter(Boolean).slice(0, 12) : [],
    source,
    catalogName,
    verification: fieldText(opts.verification, 60) || 'unverified',
    ...(cleanPinEvidence(opts.pin) ? { pin: cleanPinEvidence(opts.pin) } : {}),
    ...(fallbackReason ? { fallbackReason } : {})
  }
}

export function catalogEntryFromPublishedSite ({ keyHex, name, pin } = {}) {
  const driveKey = validDriveKey(keyHex)
  if (!driveKey) return null
  const cleanPin = cleanPinEvidence(pin)
  const pinSummary = cleanPin?.durable && cleanPin.replicatedPeers > 0
    ? `Relay pin confirmed with ${cleanPin.replicatedPeers} replicated ${cleanPin.replicatedPeers === 1 ? 'peer' : 'peers'}.`
    : cleanPin?.ok
      ? `Relay pin accepted by ${cleanPin.acceptances || 0} ${cleanPin.acceptances === 1 ? 'relay' : 'relays'}.`
      : 'Saved from a local publish result; relay durability is not confirmed yet.'
  return catalogEntryFromUrl(`hyper://${driveKey}/`, {
    id: driveKey,
    title: fieldText(name, 200) || 'Published site',
    description: pinSummary,
    source: 'publisher',
    catalogName: 'Published from this browser',
    verification: 'unverified',
    fallbackReason: pinSummary,
    categories: ['published site', 'site', 'publisher'],
    type: 'hypersite',
    pin: cleanPin
  })
}

export function catalogEntryFromSearchResult (result, { federated = false } = {}) {
  const r = asObject(result)
  const source = asObject(r.source)
  const url = searchResultUrl(r)
  if (!url) return null
  const isTrustedPeer = federated && r.tier && r.tier !== 'self'
  const catalogName = source.kind === 'app-data'
    ? `${fieldText(source.appSlug, 40) || 'App'} data search`
    : (isTrustedPeer ? 'Trusted peer search' : 'Local search')
  const verified = source.verifiedAs === 'app-signed' ? 'author-signed' : 'unverified'
  return catalogEntryFromUrl(url, {
    id: fieldText(r.docId, 128),
    title: fieldText(r.title, 200) || url,
    description: fieldText(r.excerpt, 1000) || fieldText(r.path, 200),
    source: 'search',
    catalogName,
    verification: verified,
    fallbackReason: isTrustedPeer ? 'Saved from trusted-peer search result.' : 'Saved from local search result.',
    categories: [
      'search',
      source.kind === 'app-data' ? 'app data' : 'page',
      isTrustedPeer ? 'trusted peer' : 'local'
    ],
    type: /^pear:\/\//i.test(url) ? 'standalone' : 'hypersite'
  })
}

export function catalogSourceChips (app) {
  const a = asObject(app)
  const imported = asObject(a.importedFrom)
  const chips = []
  const seen = new Set()
  const add = (chip) => {
    if (!chip || !chip.label) return
    const key = chip.key || chip.label
    if (seen.has(key)) return
    seen.add(key)
    chips.push(chip)
  }

  add(verificationChip(a.verification))

  const kind = sourceKindLabel(a.source)
  if (kind) add({ key: `source:${kind.toLowerCase()}`, label: kind, tone: 'self', title: `Loaded from ${kind}` })

  const sources = uniqueTexts(a._sources, 48)
  const catalogName = cleanText(a.catalogName, 48)
  if (sources.length > 1) add({ key: 'catalog:sources', label: `${sources.length} catalogs`, tone: 'self', title: sources.join(', ') })
  else if (sources.length === 1) add({ key: `catalog:${sources[0]}`, label: sources[0], tone: 'self', title: `Listed by ${sources[0]}` })
  else if (catalogName) add({ key: `catalog:${catalogName}`, label: catalogName, tone: 'self', title: `Listed by ${catalogName}` })

  const importedSources = uniqueTexts(imported.sources, 48)
  const importedName = cleanText(imported.catalogName, 48) || importedSources[0]
  if (importedName) add({ key: `imported:${importedName}`, label: `Imported: ${importedName}`, tone: 'followed', title: importedSources.length > 1 ? `Originally listed by ${importedSources.join(', ')}` : `Originally listed by ${importedName}` })

  const importedKind = sourceKindLabel(imported.source)
  if (importedKind) add({ key: `imported-source:${importedKind.toLowerCase()}`, label: importedKind, tone: 'self', title: 'Original catalog source type' })

  if (imported.verification) {
    const chip = verificationChip(imported.verification)
    const originalLabel = chip.label === 'Unsigned' ? 'Original unsigned' : `Original ${chip.label.toLowerCase()}`
    add({ ...chip, key: `imported-${chip.key}`, label: originalLabel, title: `Original row: ${chip.title}` })
  }

  add(statusChip(a))

  if (a.fallbackReason) add({ key: 'fallback', label: 'Fallback', tone: 'other', title: cleanText(a.fallbackReason, 160) })
  return chips
}

export function catalogProvenanceSearchText (app) {
  const a = asObject(app)
  const imported = asObject(a.importedFrom)
  const moderation = asObject(a.moderation)
  return [
    a.source,
    a.catalogName,
    a.verification,
    a.status,
    a.moderationStatus,
    a.moderationReason,
    a.relayResponse,
    a.relayReason,
    a.submittedAt,
    a.reviewedAt,
    a.decidedAt,
    a.publishedAt,
    a.updatedAt,
    moderation.status,
    moderation.reason,
    moderation.relayResponse,
    moderation.relayReason,
    moderation.submittedAt,
    moderation.reviewedAt,
    moderation.decidedAt,
    moderation.reviewer,
    a.fallbackReason,
    ...(Array.isArray(a.releaseHistory) ? a.releaseHistory.flatMap((release) => {
      const r = asObject(release)
      return [r.version, r.publishedAt, r.updatedAt, r.notes, r.driveKey, r.link, r.verification]
    }) : []),
    imported.catalogName,
    imported.catalogKey,
    imported.source,
    imported.verification,
    imported.appId,
    ...(Array.isArray(a._sources) ? a._sources : []),
    ...(Array.isArray(imported.sources) ? imported.sources : [])
  ]
    .filter((value) => value != null && value !== '')
    .map((value) => String(value).normalize('NFKC').toLowerCase())
    .join(' ')
}
