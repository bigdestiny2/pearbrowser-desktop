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
 * From a single user-supplied Hyperdrive input (a hyper:// link or a bare key)
 * derive the 64-hex content drive key (what gets seeded/pinned) and a
 * browsable link. `normalizeKey` is injected (index.js passes its
 * normalizeDriveKey, which z32-decodes 52-char keys) so this stays pure.
 *
 * Returns { driveKey, link, kind } or { error }.
 */
function deriveKeyAndLink (rawInput, normalizeKey = (x) => x) {
  const raw = String(rawInput == null ? '' : rawInput).trim()
  if (!raw) return { error: 'A hyper:// link or drive key is required.' }

  let driveKey = ''
  let link = ''
  let kind = ''
  if (/^pear:\/\//i.test(raw) || /^file:\/\//i.test(raw)) {
    return { error: 'Remote executable app links are not accepted. Submit browsable hyper:// content; native apps use verified package delivery.' }
  } else {
    const token = raw.replace(/^hyper:\/\//i, '').split(/[/?#]/)[0]
    driveKey = String(normalizeKey(token) || '').toLowerCase()
    link = 'hyper://' + driveKey + '/'
    kind = 'hyper'
  }

  if (!HEX64.test(driveKey)) {
    return { error: 'Could not derive a 64-character drive key from "' + raw + '". Paste a hyper:// link or a 64-hex / z-base-32 key.' }
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
    type: 'hypersite',
    list: 'community',
    submittedBy: ctx.submittedBy || null,
    submittedAt: now
  }
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
    return {
      url: base + '/api/manage/catalog/' + action,
      method: 'POST',
      headers,
      body: JSON.stringify({ appKey })
    }
  }
  return { error: 'Unknown moderation action: ' + action }
}

/**
 * The (key, value) pair to write into the community Hyperbee for an approved
 * app, matching scripts/lib/catalog-bee.js's `app!<id>` schema that
 * backend/catalog-manager.js loadCatalogBee() reads back.
 */
function communityBeeEntry (manifest, now = Date.now()) {
  const id = slugify(manifest.id || manifest.driveKey || manifest.link)
  const entry = {
    id,
    name: manifest.name || id,
    description: manifest.description || '',
    driveKey: manifest.driveKey || '',
    link: manifest.link || '',
    version: manifest.version || '',
    author: manifest.author || '',
    categories: Array.isArray(manifest.categories) ? manifest.categories : [],
    publishedAt: Number.isFinite(manifest.submittedAt) ? manifest.submittedAt : now
  }
  if (typeof manifest.iconData === 'string' && manifest.iconData) entry.iconData = manifest.iconData
  return { key: 'app!' + id, value: entry }
}

module.exports = {
  HEX64,
  slugify,
  deriveKeyAndLink,
  buildSubmissionManifest,
  manageRequest,
  communityBeeEntry
}
