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
// management API. Publishing an approved entry into the shared community bee
// remains a separate, secret-holding operator release step.

const HEX64 = /^[0-9a-f]{64}$/i
const MAX_INDEX_BYTES = 2 * 1024 * 1024
const MAX_REVIEW_TEXT = 500

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

function boundedText (value, max = MAX_REVIEW_TEXT) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function reviewCheck (id, label, status, detail) {
  return { id, label, status, detail: boundedText(detail, 1000) }
}

function manifestTarget (manifest = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return ''
  return manifest.link || manifest.hyperUrl || manifest.url || manifest.driveKey || manifest.key || ''
}

function externalOriginsFromHtml (html) {
  const origins = new Set()
  const source = String(html || '').slice(0, MAX_INDEX_BYTES)
  const re = /(?:src|href|action)\s*=\s*["'](https?:\/\/[^\s"'<>]+)/ig
  let match
  while ((match = re.exec(source)) && origins.size < 12) {
    try { origins.add(new URL(match[1]).origin) } catch {}
  }
  return [...origins]
}

function duplicateSummary (duplicates) {
  if (!Array.isArray(duplicates)) return []
  return duplicates.slice(0, 12).map((entry) => ({
    id: boundedText(entry && entry.id, 80),
    name: boundedText(entry && entry.name, 160),
    catalogName: boundedText(entry && (entry.catalogName || entry.source), 160),
    driveKey: boundedText(entry && entry.driveKey, 64)
  }))
}

function reviewEvidenceMatches (input = {}, report = null) {
  if (!report || typeof report !== 'object') return false
  const evidence = report.evidence && typeof report.evidence === 'object' ? report.evidence : {}
  return Number(input.reviewedAt) === Number(report.checkedAt) &&
    Number(input.reviewedDriveVersion) === Number(evidence.driveVersion) &&
    Number.isFinite(Number(report.checkedAt)) &&
    Number.isFinite(Number(evidence.driveVersion))
}

/**
 * Turn fetched drive evidence into a deterministic moderation report.
 *
 * The I/O stays in backend/index.js. This helper deliberately distinguishes
 * automated blockers from warnings that still need a human preview. Passing
 * these checks means "eligible for an operator decision", not "safe code".
 */
function buildReviewReport (input = {}, now = Date.now()) {
  const pending = input.pending && typeof input.pending === 'object' ? input.pending : {}
  const appKey = boundedText(input.appKey || pending.appKey, 64).toLowerCase()
  const publisherPubkey = boundedText(pending.publisherPubkey, 64).toLowerCase()
  const manifest = input.manifest && typeof input.manifest === 'object' && !Array.isArray(input.manifest)
    ? input.manifest
    : null
  const indexText = String(input.indexText || '').slice(0, MAX_INDEX_BYTES)
  const indexBytes = Number.isFinite(input.indexBytes) ? input.indexBytes : Buffer.byteLength(indexText)
  const driveVersion = Number.isFinite(input.driveVersion) ? input.driveVersion : 0
  const duplicates = duplicateSummary(input.duplicates)
  const checks = []

  checks.push(HEX64.test(appKey)
    ? reviewCheck('content-key', 'Content key', 'pass', 'Canonical 64-hex Hyperdrive key.')
    : reviewCheck('content-key', 'Content key', 'block', 'The queue entry does not contain a valid 64-hex Hyperdrive key.'))

  checks.push(HEX64.test(publisherPubkey)
    ? reviewCheck('publisher', 'Publisher signature', 'pass', 'The relay queue carries a 32-byte publisher public key; the relay verifies the signed seed request.')
    : reviewCheck('publisher', 'Publisher signature', 'block', 'No canonical publisher public key is visible. Approval requires a relay-verified signed seed request.'))

  if (HEX64.test(publisherPubkey)) {
    checks.push(reviewCheck('publisher-identity', 'Publisher identity', 'warning', 'The signing key authenticates the seed request, not a real-world identity or the manifest author claim. Verify provenance through an independent channel.'))
  }

  if (input.fetchError) {
    checks.push(reviewCheck('availability', 'Content availability', 'block', 'The app drive could not be fetched: ' + boundedText(input.fetchError, 700)))
  } else if (driveVersion <= 0) {
    checks.push(reviewCheck('availability', 'Content availability', 'block', 'No replicated drive version was available for review.'))
  } else {
    checks.push(reviewCheck('availability', 'Content availability', 'pass', `Fetched Hyperdrive version ${driveVersion}.`))
    checks.push(reviewCheck('mutable-content', 'Mutable content', 'warning', `This review covers drive version ${driveVersion}. The publisher can append a later version under the same key; updates need re-review or a version-pinned release policy.`))
  }

  if (!indexBytes) {
    checks.push(reviewCheck('entrypoint', 'Browser entrypoint', 'block', 'Missing or empty /index.html. Community listings must open as browsable content.'))
  } else if (indexBytes > MAX_INDEX_BYTES) {
    checks.push(reviewCheck('entrypoint', 'Browser entrypoint', 'block', `/index.html is ${indexBytes} bytes; the review cap is ${MAX_INDEX_BYTES} bytes.`))
  } else if (!/<(?:!doctype\s+html|html|head|body)\b/i.test(indexText)) {
    checks.push(reviewCheck('entrypoint', 'Browser entrypoint', 'warning', `/index.html is ${indexBytes} bytes but does not look like an HTML document.`))
  } else {
    checks.push(reviewCheck('entrypoint', 'Browser entrypoint', 'pass', `/index.html is present (${indexBytes} bytes) and looks like HTML.`))
  }

  if (input.manifestError) {
    checks.push(reviewCheck('manifest', 'App manifest', 'block', 'Invalid /manifest.json: ' + boundedText(input.manifestError, 700)))
  } else if (!manifest) {
    checks.push(reviewCheck('manifest', 'App manifest', 'block', 'Missing /manifest.json. Reviewers need publisher-supplied identity and metadata on the content drive.'))
  } else if (!boundedText(manifest.name, 160)) {
    checks.push(reviewCheck('manifest', 'App manifest', 'block', '/manifest.json is missing a non-empty name.'))
  } else {
    checks.push(reviewCheck('manifest', 'App manifest', 'pass', `Manifest identifies “${boundedText(manifest.name, 160)}”.`))
  }

  if (manifest) {
    const rawTarget = manifestTarget(manifest)
    const type = boundedText(manifest.type || manifest.kind, 80).toLowerCase()
    const queuedType = boundedText(pending.contentType, 80).toLowerCase()
    const nativeTarget = /^(?:pear|file):\/\//i.test(String(rawTarget)) ||
      ['native', 'standalone', 'desktop', 'package', 'executable'].includes(type) ||
      ['native', 'standalone', 'desktop', 'package', 'executable'].includes(queuedType) ||
      typeof manifest.pearLink === 'string' || typeof manifest.executable === 'string'
    let targetMismatch = false
    let targetError = ''
    if (rawTarget) {
      const normalizeKey = typeof input.normalizeKey === 'function'
        ? input.normalizeKey
        : (value) => String(value || '').toLowerCase()
      const derived = deriveKeyAndLink(rawTarget, normalizeKey)
      targetError = derived.error || ''
      targetMismatch = !targetError && derived.driveKey !== appKey
    }
    if (nativeTarget) {
      checks.push(reviewCheck('delivery-boundary', 'Delivery boundary', 'block', 'Manifest requests native/executable delivery. The Community list accepts browsable hyper:// content only.'))
    } else if (targetError) {
      checks.push(reviewCheck('delivery-boundary', 'Delivery boundary', 'block', 'Manifest declares a target that is not a valid browsable Hyperdrive reference.'))
    } else if (targetMismatch) {
      checks.push(reviewCheck('delivery-boundary', 'Delivery boundary', 'block', 'Manifest target does not match the queued content key.'))
    } else {
      checks.push(reviewCheck('delivery-boundary', 'Delivery boundary', 'pass', 'No native executable target was declared and any manifest target matches the queued drive.'))
    }
  }

  if (duplicates.length) {
    const names = duplicates.map((entry) => entry.name || entry.id || entry.driveKey.slice(0, 12)).filter(Boolean)
    checks.push(reviewCheck('duplicate', 'Catalogue duplication', 'warning', `This drive is already present in ${duplicates.length} loaded catalogue entr${duplicates.length === 1 ? 'y' : 'ies'}${names.length ? ': ' + names.join(', ') : ''}. Confirm whether this is an update or a duplicate submission.`))
  } else {
    checks.push(reviewCheck('duplicate', 'Catalogue duplication', 'pass', 'No matching drive is present in the catalogues currently loaded by this browser.'))
  }

  const externalOrigins = externalOriginsFromHtml(indexText)
  const behaviorSignals = []
  if (/\beval\s*\(|\bnew\s+Function\s*\(/i.test(indexText)) behaviorSignals.push('dynamic code execution')
  if (/<iframe\b/i.test(indexText)) behaviorSignals.push('iframe embedding')
  if (/<form\b/i.test(indexText)) behaviorSignals.push('form submission')
  if (/\bserviceWorker\s*\.\s*register\s*\(/i.test(indexText)) behaviorSignals.push('service worker')
  if (externalOrigins.length || behaviorSignals.length) {
    const pieces = []
    if (externalOrigins.length) pieces.push('external origins: ' + externalOrigins.join(', '))
    if (behaviorSignals.length) pieces.push('behaviors: ' + behaviorSignals.join(', '))
    checks.push(reviewCheck('page-behavior', 'Page behavior', 'warning', pieces.join(' · ') + '. Inspect the preview before approving.'))
  } else {
    checks.push(reviewCheck('page-behavior', 'Page behavior', 'pass', 'No external HTTP origins or high-signal dynamic page behaviors were found by the bounded static /index.html scan. Linked scripts were not inspected.'))
  }

  checks.push(reviewCheck('human-preview', 'Human review', 'warning', 'Automated checks cannot establish that an app is trustworthy. Open the preview, inspect its claims and requested behavior, then acknowledge the review.'))

  const discoveredAt = typeof pending.discoveredAt === 'number'
    ? pending.discoveredAt
    : Date.parse(String(pending.discoveredAt || ''))
  if (Number.isFinite(discoveredAt) && discoveredAt > 0 && now - discoveredAt > 30 * 24 * 60 * 60 * 1000) {
    checks.push(reviewCheck('queue-age', 'Queue freshness', 'warning', 'This request has been pending for more than 30 days. Confirm the content has not gone stale.'))
  }

  const summary = checks.reduce((counts, check) => {
    counts[check.status] = (counts[check.status] || 0) + 1
    return counts
  }, { pass: 0, warning: 0, block: 0 })

  return {
    appKey,
    publisherPubkey,
    previewUrl: HEX64.test(appKey) ? `hyper://${appKey}/` : '',
    status: summary.block ? 'blocked' : 'review-needed',
    approvalAllowed: summary.block === 0,
    requiresAcknowledgement: summary.warning > 0,
    checkedAt: now,
    summary,
    checks,
    manifest: manifest
      ? {
          id: boundedText(manifest.id, 80),
          name: boundedText(manifest.name, 160),
          description: boundedText(manifest.description, 1000),
          author: boundedText(manifest.author, 160),
          version: boundedText(manifest.version, 40),
          categories: Array.isArray(manifest.categories) ? manifest.categories.map((value) => boundedText(value, 80)).filter(Boolean).slice(0, 12) : [],
          driveKey: appKey,
          link: HEX64.test(appKey) ? `hyper://${appKey}/` : '',
          type: 'hypersite'
        }
      : null,
    evidence: {
      driveVersion,
      indexBytes,
      externalOrigins,
      behaviorSignals,
      duplicates
    }
  }
}

module.exports = {
  HEX64,
  MAX_INDEX_BYTES,
  slugify,
  deriveKeyAndLink,
  buildSubmissionManifest,
  manageRequest,
  communityBeeEntry,
  buildReviewReport,
  reviewEvidenceMatches
}
