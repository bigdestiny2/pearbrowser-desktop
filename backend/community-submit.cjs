'use strict'

// Pure helpers for Community catalogue submission and moderation. I/O lives in
// backend/index.js; this module owns validation, receipt projection and review
// policy so every submission path is deterministic and unit-testable.

const HEX64 = /^[0-9a-f]{64}$/i
const PEAR_KEY = /^[13-9a-km-uw-z]{52}$/
const SAFE_PRODUCT_NAME = /^[a-zA-Z0-9][a-zA-Z0-9 ._()+@-]{0,119}$/
const MAX_INDEX_BYTES = 2 * 1024 * 1024
const MAX_ICON_DATA_CHARS = 20000
const MAX_REVIEW_TEXT = 500
const NATIVE_TARGETS = new Set([
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64'
])
const ICON_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])

function slugify (s) {
  const out = String(s == null ? '' : s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return out || 'app'
}

function boundedText (value, max = MAX_REVIEW_TEXT) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function normalizePearInstallLink (value) {
  const raw = String(value || '').trim()
  let parsed
  try { parsed = new URL(raw) } catch { return { error: 'Paste a valid pear:// release link.' } }
  const key = String(parsed.hostname || '').toLowerCase()
  if (parsed.protocol !== 'pear:' || !PEAR_KEY.test(key)) {
    return { error: 'Pear v3 submissions need a canonical 52-character pear:// release key.' }
  }
  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash || parsed.username || parsed.password || parsed.port) {
    return { error: 'Use the root Pear release link without a version, path, query, fragment, credentials, or port.' }
  }
  return { installLink: `pear://${key}`, key }
}

function deriveKeyAndLink (rawInput, normalizeKey = (x) => x) {
  const raw = String(rawInput == null ? '' : rawInput).trim()
  if (!raw) return { error: 'A hyper:// link or drive key is required.' }
  if (/^(?:pear|file):\/\//i.test(raw)) {
    return { error: 'Choose Pear v3 app and provide its canonical release link; executable links are not browsable Hyper content.' }
  }
  const token = raw.replace(/^hyper:\/\//i, '').split(/[/?#]/)[0]
  const driveKey = String(normalizeKey(token) || '').toLowerCase()
  if (!HEX64.test(driveKey)) {
    return { error: 'Could not derive a 64-character drive key. Paste a hyper:// link or a 64-hex / z-base-32 key.' }
  }
  return { driveKey, link: `hyper://${driveKey}/`, kind: 'hyper' }
}

function normalizeCategories (value) {
  const source = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(',') : [])
  return [...new Set(source.map((item) => boundedText(item, 60)).filter(Boolean))].slice(0, 12)
}

function normalizeNativeTargets (value) {
  const source = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(',') : [])
  const targets = [...new Set(source.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean))]
  const invalid = targets.filter((target) => !NATIVE_TARGETS.has(target))
  if (invalid.length) return { error: `Unsupported Pear v3 target: ${invalid.join(', ')}.` }
  if (!targets.length) return { error: 'Select at least one operating-system target included in the Pear release.' }
  return { targets: targets.slice(0, 12) }
}

function hasExpectedIconSignature (mime, buffer) {
  if (!buffer || buffer.length === 0) return false
  if (mime === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
  if (mime === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mime === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
  if (mime === 'image/gif') return buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString())
  if (mime === 'image/svg+xml') {
    const svg = buffer.toString('utf8').trim()
    return /^(?:<\?xml[^>]*>\s*)?<svg\b/i.test(svg) &&
      !/<(?:script|foreignObject)\b/i.test(svg) &&
      !/\son[a-z]+\s*=/i.test(svg) &&
      !/(?:href|src)\s*=\s*["']\s*(?:javascript:|data:|https?:)/i.test(svg)
  }
  return false
}

function normalizeIconData (value) {
  if (value == null || value === '') return { iconData: '' }
  if (typeof value !== 'string') return { error: 'The uploaded icon must be an image data URL.' }
  if (value.length > MAX_ICON_DATA_CHARS) {
    return { error: `The uploaded icon is too large. Keep the encoded icon under ${MAX_ICON_DATA_CHARS.toLocaleString()} characters.` }
  }
  const match = value.match(/^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,([A-Za-z0-9+/]+={0,2})$/i)
  if (!match) return { error: 'Use a PNG, JPEG, WebP, GIF, or safe SVG icon.' }
  const mime = match[1].toLowerCase()
  if (!ICON_MIMES.has(mime)) return { error: 'Unsupported icon format.' }
  let buffer
  try { buffer = Buffer.from(match[2], 'base64') } catch { return { error: 'The uploaded icon is not valid base64 image data.' } }
  if (!hasExpectedIconSignature(mime, buffer)) return { error: 'The uploaded icon bytes do not match the selected image format or contain unsafe SVG content.' }
  return { iconData: `data:${mime};base64,${match[2]}` }
}

/**
 * Project a submit payload into a bounded catalogue receipt.
 *
 * Hyper submissions reference separately seeded browsable content. Pear v3
 * submissions reference a root release identity produced by build/stage and a
 * provision or multisig production line. The receipt itself is what enters the
 * relay review queue; native release bytes are distributed by Pear, not HiveRelay.
 */
function buildSubmissionManifest (input = {}, ctx = {}) {
  const name = boundedText(input.name, 160)
  if (!name) return { error: 'App name is required.' }
  const rawTarget = input.link || input.installLink || input.driveKey || input.key
  const requestedKind = String(input.submissionKind || input.kind || '').trim().toLowerCase()
  const kind = requestedKind || (/^pear:\/\//i.test(String(rawTarget || '').trim()) ? 'pear-v3' : 'hyper')
  if (!['hyper', 'pear-v3'].includes(kind)) return { error: 'Choose either a Pear v3 app or browsable Hyper content.' }

  const id = slugify(input.id || name)
  const now = Number.isFinite(ctx.now) ? ctx.now : Date.now()
  const version = boundedText(input.version, 40)
  const categories = normalizeCategories(input.categories)
  const icon = normalizeIconData(input.iconData)
  if (icon.error) return { error: icon.error }
  const common = {
    receiptVersion: 1,
    submissionKind: kind,
    id,
    name,
    description: boundedText(input.description, 4000),
    version,
    author: boundedText(input.author, 160),
    categories,
    list: 'community',
    submittedBy: ctx.submittedBy || null,
    submittedAt: now
  }
  if (icon.iconData) common.iconData = icon.iconData

  if (kind === 'pear-v3') {
    const release = normalizePearInstallLink(rawTarget)
    if (release.error) return release
    const productName = boundedText(input.productName || name, 120)
    if (!SAFE_PRODUCT_NAME.test(productName)) return { error: 'Installed product name must match the Pear package and contain only ordinary filename-safe characters.' }
    if (!version) return { error: 'Pear v3 submissions require the released package version.' }
    const nativeTargets = normalizeNativeTargets(input.targets)
    if (nativeTargets.error) return nativeTargets
    if (input.releaseConfirmed !== true) {
      return { error: 'Confirm that this root link is the currently seeded production provision or multisig release line.' }
    }
    const manifest = {
      ...common,
      type: 'standalone',
      nativeDelivery: {
        status: 'available',
        kind: 'pear-v3',
        installLink: release.installLink,
        productName,
        targets: nativeTargets.targets
      },
      release: {
        channel: 'production',
        publisherConfirmed: true,
        workflow: 'pear-v3-build-stage-provision-multisig'
      }
    }
    return {
      manifest,
      id,
      kind,
      installLink: release.installLink,
      driveKey: null,
      receiptId: `community-native-${release.key}`
    }
  }

  const derived = deriveKeyAndLink(rawTarget, ctx.normalizeKey || ((x) => x))
  if (derived.error) return derived
  const manifest = {
    ...common,
    version: version || '1.0.0',
    driveKey: derived.driveKey,
    link: derived.link,
    type: 'hypersite'
  }
  return {
    manifest,
    id,
    kind,
    driveKey: derived.driveKey,
    installLink: null,
    receiptId: `community-hyper-${derived.driveKey}`
  }
}

function manageRequest (action, opts = {}) {
  const base = String(opts.baseUrl || '').trim().replace(/\/+$/, '')
  if (!base) return { error: 'Relay management URL is not configured. Set it in the Moderator panel.' }
  if (!/^https?:\/\//i.test(base)) return { error: 'Relay management URL must start with http:// or https://' }
  const headers = { 'content-type': 'application/json', accept: 'application/json' }
  if (opts.apiKey) headers.authorization = 'Bearer ' + String(opts.apiKey)
  if (action === 'pending') return { url: base + '/api/manage/catalog/pending', method: 'GET', headers }
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

function safeNativeDelivery (manifest) {
  const source = manifest && manifest.nativeDelivery
  if (!source || source.status !== 'available' || source.kind !== 'pear-v3') return null
  const release = normalizePearInstallLink(source.installLink)
  if (release.error) return null
  const productName = boundedText(source.productName, 120)
  if (!SAFE_PRODUCT_NAME.test(productName)) return null
  const targetResult = normalizeNativeTargets(source.targets)
  if (targetResult.error) return null
  return {
    status: 'available',
    kind: 'pear-v3',
    installLink: release.installLink,
    productName,
    targets: targetResult.targets
  }
}

function communityBeeEntry (manifest, now = Date.now()) {
  const nativeDelivery = safeNativeDelivery(manifest)
  const id = slugify(manifest.id || manifest.driveKey || nativeDelivery?.installLink || manifest.link)
  const entry = {
    id,
    name: boundedText(manifest.name, 160) || id,
    description: boundedText(manifest.description, 1000),
    version: boundedText(manifest.version, 40),
    author: boundedText(manifest.author, 160),
    categories: normalizeCategories(manifest.categories),
    type: nativeDelivery ? 'standalone' : 'hypersite',
    publishedAt: Number.isFinite(manifest.submittedAt) ? manifest.submittedAt : now
  }
  if (nativeDelivery) entry.nativeDelivery = nativeDelivery
  else {
    const driveKey = boundedText(manifest.driveKey, 64).toLowerCase()
    if (HEX64.test(driveKey)) {
      entry.driveKey = driveKey
      entry.link = `hyper://${driveKey}/`
    }
  }
  const icon = normalizeIconData(manifest.iconData)
  if (icon.iconData) entry.iconData = icon.iconData
  return { key: 'app!' + id, value: entry }
}

function reviewCheck (id, label, status, detail) {
  return { id, label, status, detail: boundedText(detail, 1000) }
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
    driveKey: boundedText(entry && entry.driveKey, 64),
    nativeInstallLink: boundedText(entry && entry.nativeDelivery && entry.nativeDelivery.installLink, 80)
  }))
}

function reviewEvidenceMatches (input = {}, report = null) {
  if (!report || typeof report !== 'object') return false
  const evidence = report.evidence && typeof report.evidence === 'object' ? report.evidence : {}
  return Number(input.reviewedAt) === Number(report.checkedAt) &&
    Number(input.reviewedReceiptDriveVersion) === Number(evidence.receiptDriveVersion) &&
    Number(input.reviewedTargetDriveVersion || 0) === Number(evidence.targetDriveVersion || 0) &&
    Number.isFinite(Number(report.checkedAt)) &&
    Number.isFinite(Number(evidence.receiptDriveVersion))
}

function buildReviewReport (input = {}, now = Date.now()) {
  const pending = input.pending && typeof input.pending === 'object' ? input.pending : {}
  const receiptKey = boundedText(input.appKey || pending.appKey, 64).toLowerCase()
  const publisherPubkey = boundedText(pending.publisherPubkey, 64).toLowerCase()
  const manifest = input.manifest && typeof input.manifest === 'object' && !Array.isArray(input.manifest)
    ? input.manifest
    : null
  const receiptDriveVersion = Number.isFinite(input.receiptDriveVersion) ? input.receiptDriveVersion : 0
  const targetDriveVersion = Number.isFinite(input.targetDriveVersion) ? input.targetDriveVersion : 0
  const indexText = String(input.indexText || '').slice(0, MAX_INDEX_BYTES)
  const indexBytes = Number.isFinite(input.indexBytes) ? input.indexBytes : Buffer.byteLength(indexText)
  const duplicates = duplicateSummary(input.duplicates)
  const checks = []

  checks.push(HEX64.test(receiptKey)
    ? reviewCheck('receipt-key', 'Submission receipt', 'pass', 'The relay queued a canonical 64-hex receipt drive key.')
    : reviewCheck('receipt-key', 'Submission receipt', 'block', 'The queue entry does not contain a valid 64-hex receipt drive key.'))
  checks.push(HEX64.test(publisherPubkey)
    ? reviewCheck('publisher', 'Publisher signature', 'pass', 'The relay queue carries a 32-byte publisher public key and verifies the signed receipt seed request.')
    : reviewCheck('publisher', 'Publisher signature', 'block', 'No canonical publisher public key is visible for the signed receipt request.'))
  if (HEX64.test(publisherPubkey)) {
    checks.push(reviewCheck('publisher-identity', 'Publisher identity', 'warning', 'The signing key authenticates this receipt request, not a real-world identity or every claim in the receipt. Verify provenance independently.'))
  }

  if (input.receiptFetchError) {
    checks.push(reviewCheck('receipt-availability', 'Receipt availability', 'block', 'The submission receipt could not be fetched: ' + boundedText(input.receiptFetchError, 700)))
  } else if (receiptDriveVersion <= 0) {
    checks.push(reviewCheck('receipt-availability', 'Receipt availability', 'block', 'No replicated receipt drive version was available for review.'))
  } else {
    checks.push(reviewCheck('receipt-availability', 'Receipt availability', 'pass', `Fetched receipt drive version ${receiptDriveVersion}.`))
  }

  if (input.manifestError) {
    checks.push(reviewCheck('manifest', 'Catalogue receipt', 'block', 'Invalid /manifest.json: ' + boundedText(input.manifestError, 700)))
  } else if (!manifest) {
    checks.push(reviewCheck('manifest', 'Catalogue receipt', 'block', 'Missing /manifest.json on the queued receipt drive.'))
  } else if (!boundedText(manifest.name, 160)) {
    checks.push(reviewCheck('manifest', 'Catalogue receipt', 'block', 'The receipt is missing a non-empty app name.'))
  } else if (manifest.receiptVersion !== 1) {
    checks.push(reviewCheck('manifest', 'Catalogue receipt', 'block', 'The receipt version is missing or unsupported.'))
  } else {
    checks.push(reviewCheck('manifest', 'Catalogue receipt', 'pass', `Receipt identifies “${boundedText(manifest.name, 160)}”.`))
  }

  const inferredKind = manifest && (manifest.submissionKind || (manifest.nativeDelivery ? 'pear-v3' : (manifest.driveKey ? 'hyper' : '')))
  const kind = inferredKind === 'pear-v3' ? 'pear-v3' : (inferredKind === 'hyper' ? 'hyper' : '')
  let previewUrl = ''
  let projectedManifest = null
  let externalOrigins = []
  let behaviorSignals = []

  if (manifest && kind === 'hyper') {
    const target = deriveKeyAndLink(manifest.link || manifest.driveKey, input.normalizeKey || ((value) => value))
    if (target.error) {
      checks.push(reviewCheck('delivery-boundary', 'Hyper target', 'block', 'The receipt does not declare a valid browsable Hyperdrive target.'))
    } else if (input.targetDriveKey && target.driveKey !== String(input.targetDriveKey).toLowerCase()) {
      checks.push(reviewCheck('delivery-boundary', 'Hyper target', 'block', 'The reviewed content drive does not match the target declared by the receipt.'))
    } else {
      previewUrl = target.link
      checks.push(reviewCheck('delivery-boundary', 'Hyper target', 'pass', 'The receipt points to browsable Hyper content and does not request native execution.'))
    }

    if (input.targetFetchError) {
      checks.push(reviewCheck('target-availability', 'Content availability', 'block', 'The target content drive could not be fetched: ' + boundedText(input.targetFetchError, 700)))
    } else if (targetDriveVersion <= 0) {
      checks.push(reviewCheck('target-availability', 'Content availability', 'block', 'No replicated target drive version was available for review.'))
    } else {
      checks.push(reviewCheck('target-availability', 'Content availability', 'pass', `Fetched target drive version ${targetDriveVersion}.`))
      checks.push(reviewCheck('mutable-content', 'Mutable content', 'warning', `This review covers target drive version ${targetDriveVersion}; later updates under the same key need re-review.`))
    }

    if (!indexBytes) checks.push(reviewCheck('entrypoint', 'Browser entrypoint', 'block', 'Missing or empty /index.html on the target content drive.'))
    else if (indexBytes > MAX_INDEX_BYTES) checks.push(reviewCheck('entrypoint', 'Browser entrypoint', 'block', `/index.html is ${indexBytes} bytes; the review cap is ${MAX_INDEX_BYTES} bytes.`))
    else if (!/<(?:!doctype\s+html|html|head|body)\b/i.test(indexText)) checks.push(reviewCheck('entrypoint', 'Browser entrypoint', 'warning', `/index.html is ${indexBytes} bytes but does not look like an HTML document.`))
    else checks.push(reviewCheck('entrypoint', 'Browser entrypoint', 'pass', `/index.html is present (${indexBytes} bytes) and looks like HTML.`))

    externalOrigins = externalOriginsFromHtml(indexText)
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
      checks.push(reviewCheck('page-behavior', 'Page behavior', 'pass', 'No external HTTP origins or high-signal dynamic behaviors were found in the bounded /index.html scan. Linked scripts were not inspected.'))
    }
    projectedManifest = communityBeeEntry(manifest, now).value
  } else if (manifest && kind === 'pear-v3') {
    const nativeDelivery = safeNativeDelivery(manifest)
    if (!nativeDelivery) {
      checks.push(reviewCheck('native-delivery', 'Pear v3 release identity', 'block', 'The receipt must declare available pear-v3 delivery, a canonical root install link, an exact product name, and supported targets.'))
    } else {
      checks.push(reviewCheck('native-delivery', 'Pear v3 release identity', 'pass', `Canonical production identity: ${nativeDelivery.installLink}`))
      checks.push(reviewCheck('native-product', 'Installed product', 'pass', `The catalogue will require the package product name “${nativeDelivery.productName}”.`))
      checks.push(reviewCheck('native-targets', 'Release targets', 'pass', `Declared native targets: ${nativeDelivery.targets.join(', ')}.`))
    }
    if (!boundedText(manifest.version, 40)) checks.push(reviewCheck('native-version', 'Released version', 'block', 'Pear v3 receipts must declare the package version being reviewed.'))
    else checks.push(reviewCheck('native-version', 'Released version', 'pass', `Publisher declares package version ${boundedText(manifest.version, 40)}.`))
    if (manifest.release?.publisherConfirmed !== true || manifest.release?.channel !== 'production') {
      checks.push(reviewCheck('release-attestation', 'Release workflow', 'block', 'The publisher did not confirm a seeded production provision or multisig release line.'))
    } else {
      checks.push(reviewCheck('release-attestation', 'Release workflow', 'warning', 'The publisher confirmed the production release line. Independently verify pear info, seeding, provenance, and platform artifacts before publication.'))
    }
    checks.push(reviewCheck('install-boundary', 'Install-time verification', 'warning', 'PearBrowser does not execute or pin native release bytes during catalogue review. pear-install later enforces the requested release identity, one GUI artifact, product name, platform target, and normal OS destination.'))
    projectedManifest = communityBeeEntry(manifest, now).value
  } else if (manifest) {
    checks.push(reviewCheck('delivery-boundary', 'Submission type', 'block', 'The receipt must declare submissionKind as hyper or pear-v3.'))
  }

  if (duplicates.length) {
    const names = duplicates.map((entry) => entry.name || entry.id || entry.driveKey || entry.nativeInstallLink).filter(Boolean)
    checks.push(reviewCheck('duplicate', 'Catalogue duplication', 'warning', `This target already appears in ${duplicates.length} loaded catalogue entr${duplicates.length === 1 ? 'y' : 'ies'}${names.length ? ': ' + names.join(', ') : ''}. Confirm whether this is an update.`))
  } else {
    checks.push(reviewCheck('duplicate', 'Catalogue duplication', 'pass', 'No matching target is present in the catalogues currently loaded by this browser.'))
  }

  checks.push(reviewCheck('human-preview', kind === 'pear-v3' ? 'Human release review' : 'Human preview', 'warning', kind === 'pear-v3'
    ? 'Automated receipt checks cannot establish that a native app is trustworthy. Verify publisher provenance and release metadata independently before approving.'
    : 'Automated checks cannot establish that a site is trustworthy. Open the target preview, inspect its behavior, and acknowledge the warnings.'))

  const discoveredAt = typeof pending.discoveredAt === 'number' ? pending.discoveredAt : Date.parse(String(pending.discoveredAt || ''))
  if (Number.isFinite(discoveredAt) && discoveredAt > 0 && now - discoveredAt > 30 * 24 * 60 * 60 * 1000) {
    checks.push(reviewCheck('queue-age', 'Queue freshness', 'warning', 'This request has been pending for more than 30 days. Confirm the release is still current.'))
  }

  const summary = checks.reduce((counts, check) => {
    counts[check.status] = (counts[check.status] || 0) + 1
    return counts
  }, { pass: 0, warning: 0, block: 0 })

  return {
    appKey: receiptKey,
    receiptKey,
    publisherPubkey,
    submissionKind: kind || 'unknown',
    previewUrl,
    status: summary.block ? 'blocked' : 'review-needed',
    approvalAllowed: summary.block === 0,
    requiresAcknowledgement: summary.warning > 0,
    checkedAt: now,
    summary,
    checks,
    manifest: projectedManifest,
    evidence: {
      driveVersion: kind === 'hyper' ? targetDriveVersion : receiptDriveVersion,
      receiptDriveVersion,
      targetDriveVersion,
      targetDriveKey: boundedText(input.targetDriveKey, 64).toLowerCase(),
      indexBytes,
      externalOrigins,
      behaviorSignals,
      duplicates
    }
  }
}

module.exports = {
  HEX64,
  PEAR_KEY,
  MAX_INDEX_BYTES,
  MAX_ICON_DATA_CHARS,
  NATIVE_TARGETS: [...NATIVE_TARGETS],
  slugify,
  normalizePearInstallLink,
  normalizeIconData,
  deriveKeyAndLink,
  buildSubmissionManifest,
  manageRequest,
  communityBeeEntry,
  buildReviewReport,
  reviewEvidenceMatches
}
