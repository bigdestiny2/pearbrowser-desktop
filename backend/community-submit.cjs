'use strict'

// Pure helpers for the community app-submission + moderation feature (2026-06-22).
//
// No I/O lives here — backend/index.js wires these to the HiveRelay client
// (publish/seed), bare-http1/bare-https (relay management API) and the community
// Hyperbee writer. Keeping the manifest projection + management-request shaping
// pure means they're unit-tested without relays, a swarm or the network.
//
// Two lists exist in the store (see ui/shell.js): a CURATED bee (operator picks)
// and this COMMUNITY bee (user-submitted, moderated). A submission publishes a
// manifest drive + seeds the app drive; the relay queues a pin request in
// `review` mode; the in-app moderator panel approves/rejects via the relay
// management API and, on approve, the app entry is written into the community
// bee so desktop readers see it.

const HEX64 = /^[0-9a-f]{64}$/i

function str (value, max = 200) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function num (value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toHex (value) {
  if (typeof value === 'string') return value.toLowerCase()
  if (!value) return ''
  try {
    const source = value.data || value
    return Buffer.from(source).toString('hex').toLowerCase()
  } catch {
    return ''
  }
}

function firstObject (...values) {
  for (const value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value
  }
  return null
}

function normalizeCategories (value) {
  if (Array.isArray(value)) return value.map((c) => str(c, 40)).filter(Boolean).slice(0, 12)
  if (typeof value === 'string') return value.split(',').map((c) => str(c, 40)).filter(Boolean).slice(0, 12)
  return []
}

/** Slug an arbitrary string into a stable, catalogue-safe app id. */
function slugify (s) {
  const out = String(s == null ? '' : s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return out || 'app'
}

/**
 * From a single user-supplied input (a pear:// link, a hyper:// link, or a bare
 * key) derive both the 64-hex content drive key (what gets seeded/pinned) and a
 * launchable link. `normalizeKey` is injected (index.js passes its
 * normalizeDriveKey, which z32-decodes 52-char keys) so this stays pure.
 *
 * Returns { driveKey, link, kind } or { error }.
 */
function deriveKeyAndLink (rawInput, normalizeKey = (x) => x) {
  const raw = String(rawInput == null ? '' : rawInput).trim()
  if (!raw) return { error: 'A pear:// link or hyper:// / drive key is required.' }

  let driveKey = ''
  let link = ''
  let kind = ''
  if (/^pear:\/\//i.test(raw)) {
    link = raw.replace(/\/+$/, '')
    const token = link.replace(/^pear:\/\//i, '').split(/[/?#]/)[0]
    driveKey = String(normalizeKey(token) || '').toLowerCase()
    kind = 'pear'
  } else {
    const token = raw.replace(/^hyper:\/\//i, '').split(/[/?#]/)[0]
    driveKey = String(normalizeKey(token) || '').toLowerCase()
    link = 'hyper://' + driveKey + '/'
    kind = 'hyper'
  }

  if (!HEX64.test(driveKey)) {
    return { error: 'Could not derive a 64-character drive key from "' + raw + '". Paste a pear:// link, a hyper:// link, or a 64-hex / z-base-32 key.' }
  }
  return { driveKey, link, kind }
}

/**
 * Project a raw submit payload into the catalogue manifest the relay + bee use.
 *
 * input: { name, link|driveKey|key, description?, author?, categories?, version?, iconData?, id? }
 * ctx:   { submittedBy?, now?, normalizeKey? }
 *
 * Returns { manifest, id, driveKey } or { error }.
 */
function buildSubmissionManifest (input = {}, ctx = {}) {
  const name = String(input.name == null ? '' : input.name).trim()
  if (!name) return { error: 'App name is required.' }

  const derived = deriveKeyAndLink(
    input.link || input.driveKey || input.key,
    ctx.normalizeKey || ((x) => x)
  )
  if (derived.error) return { error: derived.error }

  let categories = []
  if (Array.isArray(input.categories)) {
    categories = input.categories.map((c) => String(c).trim()).filter(Boolean).slice(0, 12)
  } else if (typeof input.categories === 'string') {
    categories = input.categories.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 12)
  }

  const id = slugify(input.id || name)
  const now = Number.isFinite(ctx.now) ? ctx.now : Date.now()

  const manifest = {
    id,
    name: name.slice(0, 160),
    description: String(input.description || '').slice(0, 4000),
    driveKey: derived.driveKey,
    link: derived.link,
    version: String(input.version || '1.0.0').slice(0, 40),
    author: String(input.author || '').slice(0, 160),
    categories,
    type: derived.kind === 'pear' ? 'standalone' : 'hypersite',
    list: 'community',
    submittedBy: ctx.submittedBy || null,
    submittedAt: now,
    status: 'pending-review',
    moderationStatus: 'pending-review',
    moderationReason: 'Submitted to the community catalog review queue.',
    moderation: {
      status: 'pending-review',
      reason: 'Submitted to the community catalog review queue.',
      submittedAt: now
    }
  }
  // A pear:// app keeps its launchable pearLink alongside the generic link so
  // the browser's launcher can route it without re-deriving.
  if (derived.kind === 'pear') manifest.pearLink = derived.link
  // Inline icon (data: URI) is optional; cap it so a submission can't bloat the
  // manifest drive. ~200KB is generous for a 64x64 SVG/PNG data URI.
  if (typeof input.iconData === 'string' && input.iconData && input.iconData.length <= 200000) {
    manifest.iconData = input.iconData
  }
  return { manifest, id, driveKey: derived.driveKey }
}

/**
 * Shape a relay management API request for the moderator panel. Pure: returns a
 * { url, method, headers, body? } spec (or { error }) that index.js feeds to
 * its bare-http(s) helper. Auth is operator API key via Bearer.
 *
 * action: 'pending' | 'approve' | 'reject'
 * opts:   { baseUrl, apiKey?, appKey? }
 */
function manageRequest (action, opts = {}) {
  const base = String(opts.baseUrl || '').trim().replace(/\/+$/, '')
  if (!base) return { error: 'Relay management URL is not configured. Set it in the Moderator panel.' }
  if (!/^https?:\/\//i.test(base)) return { error: 'Relay management URL must start with http:// or https://' }

  const headers = { 'content-type': 'application/json', accept: 'application/json' }
  if (opts.apiKey) headers.authorization = 'Bearer ' + String(opts.apiKey)

  if (action === 'pending') {
    return { url: base + '/api/manage/catalog/pending', method: 'GET', headers }
  }
  if (action === 'approve' || action === 'reject') {
    const appKey = String(opts.appKey || '').toLowerCase()
    if (!HEX64.test(appKey)) return { error: action + ' needs a 64-hex appKey.' }
    const body = { appKey }
    if (action === 'reject' && opts.reason) body.reason = String(opts.reason).slice(0, 300)
    return {
      url: base + '/api/manage/catalog/' + action,
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }
  }
  return { error: 'Unknown moderation action: ' + action }
}

function sanitizePendingManifest (raw, opts = {}) {
  const input = firstObject(raw)
  if (!input) return null
  const hasPreviewField = [
    'id', 'appId', 'slug', 'name', 'title', 'appName', 'description', 'summary',
    'about', 'author', 'publisher', 'publisherName', 'owner', 'version',
    'release', 'tag', 'type', 'launchMode', 'kind', 'link', 'url', 'pearLink',
    'categories', 'tags', 'manifestKey', 'manifestDriveKey', 'metadataKey'
  ].some((key) => input[key] != null && input[key] !== '')
  if (!hasPreviewField) return null

  const driveKey = toHex(input.driveKey || input.keyHex || input.key || input.appKey || opts.appKey)
  const link = str(input.link || input.url || input.pearLink || (HEX64.test(driveKey) ? 'hyper://' + driveKey + '/' : ''), 512)
  const categories = normalizeCategories(input.categories || input.tags)
  const manifest = {
    id: str(input.id || input.appId || input.slug || input.name, 80),
    name: str(input.name || input.title || input.appName, 160),
    description: str(input.description || input.summary || input.about, 1200),
    author: str(input.author || input.publisher || input.publisherName || input.owner, 160),
    version: str(input.version || input.release || input.tag, 80),
    type: str(input.type || input.launchMode || input.kind, 40),
    link,
    driveKey: HEX64.test(driveKey) ? driveKey : '',
    pearLink: str(input.pearLink || (/^pear:\/\//i.test(link) ? link : ''), 512),
    categories,
    submittedAt: num(input.submittedAt || input.createdAt || input.discoveredAt),
    manifestKey: str(input.manifestKey || input.manifestDriveKey || input.metadataKey, 128),
    publisherKey: str(input.publisherKey || input.publisherPubkey || input.authorKey || input.signerPubkey, 128)
  }

  for (const key of Object.keys(manifest)) {
    if (manifest[key] === '' || manifest[key] === null || (Array.isArray(manifest[key]) && manifest[key].length === 0)) {
      delete manifest[key]
    }
  }
  return Object.keys(manifest).length ? manifest : null
}

function normalizePendingReview (raw = {}, opts = {}) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const appKey = toHex(r.appKey || r.driveKey || r.key || r.keyHex)
  const publisherPubkey = toHex(r.publisherPubkey || r.publisherKey || r.authorKey || r.signerPubkey)
  const manifestSource = firstObject(
    r.manifest,
    r.submission,
    r.metadata,
    r.catalogEntry,
    r.app,
    r.value,
    r
  )
  const manifest = sanitizePendingManifest(manifestSource, { appKey })
  const discoveredAt = num(r.discoveredAt || r.submittedAt || manifest?.submittedAt)
  const relayMode = str(opts.mode, 80)

  const out = {
    appKey: HEX64.test(appKey) ? appKey : '',
    publisherPubkey: HEX64.test(publisherPubkey) ? publisherPubkey : '',
    discoveredAt,
    ttlSeconds: num(r.ttlSeconds || r.ttl || r.expiresIn),
    currentRelays: num(r.currentRelays || r.relays || r.relayCount) || 0,
    status: 'pending-review',
    moderationStatus: 'pending-review',
    moderationReason: 'Waiting for community catalog review.',
    moderation: {
      status: 'pending-review',
      reason: 'Waiting for community catalog review.',
      submittedAt: discoveredAt,
      relayResponse: relayMode ? `Relay review mode: ${relayMode}` : undefined
    }
  }
  if (manifest) out.manifest = manifest
  for (const key of Object.keys(out.moderation)) if (out.moderation[key] === undefined || out.moderation[key] === null || out.moderation[key] === '') delete out.moderation[key]
  return out
}

/**
 * The (key, value) pair to write into the community Hyperbee for an approved
 * app, matching scripts/lib/catalog-bee.js's `app!<id>` schema that
 * backend/catalog-manager.js loadCatalogBee() reads back.
 */
function communityBeeEntry (manifest, now = Date.now(), opts = {}) {
  const id = slugify(manifest.id || manifest.driveKey || manifest.link)
  const approvedAt = Number.isFinite(opts.approvedAt) ? opts.approvedAt : now
  const reason = String(opts.reason || 'Approved by the community catalog.').slice(0, 200)
  const relayResponse = String(opts.relayResponse || '').slice(0, 300)
  const entry = {
    id,
    name: manifest.name || id,
    description: manifest.description || '',
    driveKey: manifest.driveKey || '',
    link: manifest.link || '',
    version: manifest.version || '',
    author: manifest.author || '',
    categories: Array.isArray(manifest.categories) ? manifest.categories : [],
    publishedAt: Number.isFinite(manifest.submittedAt) ? manifest.submittedAt : now,
    submittedAt: Number.isFinite(manifest.submittedAt) ? manifest.submittedAt : undefined,
    reviewedAt: approvedAt,
    status: 'approved',
    moderationStatus: 'approved',
    moderationReason: reason,
    moderation: {
      status: 'approved',
      reason,
      submittedAt: Number.isFinite(manifest.submittedAt) ? manifest.submittedAt : undefined,
      decidedAt: approvedAt,
      relayResponse: relayResponse || undefined,
      reviewer: opts.reviewer ? String(opts.reviewer).slice(0, 128) : undefined
    }
  }
  for (const key of Object.keys(entry.moderation)) if (entry.moderation[key] === undefined || entry.moderation[key] === '') delete entry.moderation[key]
  if (entry.submittedAt === undefined) delete entry.submittedAt
  if (typeof manifest.iconData === 'string' && manifest.iconData) entry.iconData = manifest.iconData
  return { key: 'app!' + id, value: entry }
}

module.exports = {
  HEX64,
  slugify,
  deriveKeyAndLink,
  buildSubmissionManifest,
  manageRequest,
  sanitizePendingManifest,
  normalizePendingReview,
  communityBeeEntry
}
