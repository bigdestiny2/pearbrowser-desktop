'use strict'

const { deriveKeyAndLink, HEX64 } = require('./community-submit.cjs')

const MAX_ICON_DATA_URI_BYTES = 200 * 1024
const DEFAULT_BUNDLE_WARN_BYTES = 50 * 1024 * 1024
const ICON_MIMES = new Set([
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon'
])

function asString (value) {
  return String(value == null ? '' : value)
}

function clean (value, max = 4000) {
  return asString(value).trim().slice(0, max)
}

function finiteNumber (value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function positiveCount (value) {
  const n = finiteNumber(value)
  return n !== null && n > 0 ? Math.floor(n) : 0
}

function formatBytes (bytes) {
  const n = finiteNumber(bytes)
  if (n === null || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = n
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

function check (id, label, status, message, evidence) {
  const out = { id, label, status, message }
  if (evidence && typeof evidence === 'object') out.evidence = evidence
  return out
}

function finishReport (kind, target, checks) {
  const counts = { pass: 0, warn: 0, fail: 0, info: 0 }
  for (const item of checks) {
    if (counts[item.status] !== undefined) counts[item.status]++
  }
  const status = counts.fail > 0 ? 'blocked' : (counts.warn > 0 ? 'review' : 'ready')
  const summary = status === 'blocked'
    ? `${counts.fail} failing check${counts.fail === 1 ? '' : 's'} must be fixed before shipping.`
    : status === 'review'
      ? `${counts.warn} warning${counts.warn === 1 ? '' : 's'} to review before shipping.`
      : 'Ready to ship based on local diagnostics.'

  return {
    kind,
    status,
    summary,
    counts,
    target,
    checks
  }
}

function iconCheck (input = {}) {
  const iconData = asString(input.iconData || '')
  const iconRef = clean(input.icon || input.iconRef || input.iconPath, 512)

  if (iconData) {
    if (iconData.length > MAX_ICON_DATA_URI_BYTES) {
      return check('icon:data-size', 'Icon', 'warn', `Inline icon is ${formatBytes(iconData.length)}; catalogue submissions keep icons under ${formatBytes(MAX_ICON_DATA_URI_BYTES)}.`, {
        bytes: iconData.length,
        maxBytes: MAX_ICON_DATA_URI_BYTES
      })
    }
    const match = /^data:([^;,]+);base64,/i.exec(iconData)
    if (!match) return check('icon:data-uri', 'Icon', 'warn', 'Inline icon is not a base64 data URI.')
    const mime = match[1].toLowerCase()
    if (!ICON_MIMES.has(mime)) return check('icon:mime', 'Icon', 'warn', `Inline icon type ${mime} may not render everywhere.`, { mime })
    return check('icon:data-uri', 'Icon', 'pass', `Inline ${mime.replace(/^image\//, '')} icon is present.`, { mime, bytes: iconData.length })
  }

  if (iconRef) {
    const okPath = /^\/?[\w./-]+\.(svg|png|jpe?g|webp|ico)$/i.test(iconRef)
    return check('icon:path', 'Icon', okPath ? 'pass' : 'warn', okPath
      ? `Declared icon path: ${iconRef}.`
      : `Declared icon path "${iconRef}" is unusual; use SVG, PNG, JPEG, WebP, or ICO.`, { path: iconRef })
  }

  return check('icon:missing', 'Icon', 'warn', 'No icon was provided; discovery surfaces will fall back to a letter tile.')
}

function relayAvailabilityCheck (relayStatus = {}) {
  const connected = positiveCount(relayStatus.connectedRelays)
  const gateways = Array.isArray(relayStatus.gatewayRelays) ? relayStatus.gatewayRelays.length : 0
  if (connected > 0) {
    return check('relay:connected', 'Relay availability', 'pass', `${connected} HiveRelay ${connected === 1 ? 'peer is' : 'peers are'} connected for pinning.`, {
      connectedRelays: connected,
      gatewayRelays: gateways
    })
  }
  if (gateways > 0 || relayStatus.hybridFetchEnabled) {
    return check('relay:configured', 'Relay availability', 'warn', 'Relay gateways are configured, but no HiveRelay peers are connected right now.', {
      connectedRelays: connected,
      gatewayRelays: gateways
    })
  }
  return check('relay:offline', 'Relay availability', 'warn', 'No relay availability is visible; shipped content will rely on local peers until a relay connects.')
}

function pinCheck (pin = {}, driveInfo = null) {
  const relay = driveInfo && typeof driveInfo.relay === 'object' ? driveInfo.relay : {}
  const evidence = pin && typeof pin === 'object' ? { ...relay, ...pin } : relay
  const replicated = positiveCount(evidence.replicatedPeers || evidence.activePeers)
  const acceptances = positiveCount(evidence.acceptances || evidence.seedAcceptances)
  const advertised = positiveCount(evidence.advertisedRelays)
  const localBytes = finiteNumber(evidence.byteLengthLocal || evidence.blobLocalLen)
  const remoteBytes = finiteNumber(evidence.byteLengthRemoteMax || evidence.blobRemoteMax)
  const remoteComplete = localBytes !== null && localBytes > 0 && remoteBytes !== null && remoteBytes >= localBytes

  if (evidence.durable || remoteComplete) {
    return check('pin:durable', 'Relay pin', 'pass', `Relay durability is confirmed${replicated ? ` with ${replicated} active peer${replicated === 1 ? '' : 's'}` : ''}.`, {
      durable: !!evidence.durable,
      replicatedPeers: replicated,
      byteLengthLocal: localBytes,
      byteLengthRemoteMax: remoteBytes
    })
  }
  if (acceptances > 0 || advertised > 0 || replicated > 0) {
    return check('pin:accepted', 'Relay pin', 'warn', `Relay pin has relay evidence${acceptances ? ` from ${acceptances} acceptance${acceptances === 1 ? '' : 's'}` : ''}, but full durability is not confirmed yet.`, {
      acceptances,
      advertisedRelays: advertised,
      replicatedPeers: replicated,
      byteLengthLocal: localBytes,
      byteLengthRemoteMax: remoteBytes
    })
  }
  if (evidence.available || positiveCount(evidence.connectedRelays) > 0) {
    return check('pin:missing', 'Relay pin', 'warn', 'Relays are reachable, but this drive has no confirmed pin evidence yet.', {
      connectedRelays: positiveCount(evidence.connectedRelays)
    })
  }
  return check('pin:unknown', 'Relay pin', 'info', 'No relay pin evidence is available yet.')
}

function bundleSizeCheck (driveInfo = null, opts = {}) {
  const warnBytes = finiteNumber(opts.bundleWarnBytes) || DEFAULT_BUNDLE_WARN_BYTES
  const bytes = finiteNumber(driveInfo && driveInfo.byteLength)
  if (bytes === null) return check('bundle:size-unknown', 'Bundle size', 'info', 'Bundle size is not known yet; open or sync the drive to measure it.')
  if (bytes <= 0) return check('bundle:size-empty', 'Bundle size', 'warn', 'No local bundle bytes are visible yet; the drive may not be synced.')
  if (bytes > warnBytes) {
    return check('bundle:size-large', 'Bundle size', 'warn', `Bundle is ${formatBytes(bytes)}; large drives need streaming/ranged reads to stay responsive.`, {
      byteLength: bytes,
      warnBytes
    })
  }
  return check('bundle:size', 'Bundle size', 'pass', `Known bundle size is ${formatBytes(bytes)}.`, { byteLength: bytes })
}

function compatibilityEvidence (input = {}, ctx = {}) {
  const raw = (ctx && typeof ctx.compatibility === 'object' && ctx.compatibility) ||
    (input && typeof input.compatibility === 'object' && input.compatibility) ||
    {}
  const pearJson = (raw.pearJson && typeof raw.pearJson === 'object') ? raw.pearJson
    : ((input.pearJson && typeof input.pearJson === 'object') ? input.pearJson : null)
  const mainText = asString(raw.mainText || input.mainText || '').slice(0, 200000)
  const pearType = clean(raw.pearType || raw.type || pearJson?.type, 80).toLowerCase()
  const main = clean(raw.main || pearJson?.main || input.main, 512)
  const worker = raw.pearRequestWorker === true ||
    raw.hasPearRequestWorker === true ||
    /\bPear\.worker\.pipe\b/.test(mainText) ||
    /\bpear-request\b/i.test(mainText)
  const windowApp = raw.windowApp === true ||
    raw.browserWindow === true ||
    /\bBrowserWindow\b/.test(mainText) ||
    /\bPear\.Window\b/.test(mainText)

  return {
    available: !!(pearJson || mainText || pearType || main || raw.probed),
    pearJson,
    pearType,
    main,
    mainPath: clean(raw.mainPath || '', 512),
    pearJsonPath: clean(raw.pearJsonPath || '', 512),
    worker,
    windowApp
  }
}

function appLaunchMode (input, derived, ctx = {}) {
  const declared = clean(input.type || input.launchMode, 80).toLowerCase()
  const compat = compatibilityEvidence(input, ctx)
  const expected = derived && derived.kind === 'pear' && !(declared === 'hypersite' && compat.worker)
    ? 'standalone'
    : 'hypersite'
  if (declared && declared !== expected) {
    return check('launch-mode:mismatch', 'Launch mode', 'warn', `Manifest says ${declared}, but the link looks like ${expected}.`, {
      declared,
      expected
    })
  }
  if (expected === 'standalone') {
    return check('launch-mode:standalone', 'Launch mode', 'pass', 'Standalone Pear app opens in its own window; users will see a launch trust prompt when needed.', {
      mode: expected
    })
  }
  return check('launch-mode:hypersite', 'Launch mode', 'pass', 'Hyperdrive site/app runs inside the browser tab.', { mode: expected })
}

function appCompatibilityChecks (input = {}, ctx = {}, derived = null) {
  const checks = []
  const declared = clean(input.type || input.launchMode, 80).toLowerCase()
  const compat = compatibilityEvidence(input, ctx)
  const isPear = derived && derived.kind === 'pear'

  if (isPear && declared === 'hypersite') {
    if (compat.worker) {
      checks.push(check('compat:pear-request-worker', 'Pear app compatibility', 'pass', 'pear-request worker evidence is present for in-tab launch.', {
        main: compat.main || null,
        mainPath: compat.mainPath || null
      }))
    } else if (compat.available) {
      checks.push(check('compat:pear-request-missing', 'Pear app compatibility', 'warn', 'This pear:// app is marked hypersite, but Ship Check could not find Pear.worker.pipe or pear-request worker evidence.', {
        pearType: compat.pearType || null,
        main: compat.main || null,
        mainPath: compat.mainPath || null
      }))
    } else {
      checks.push(check('compat:pear-request-unknown', 'Pear app compatibility', 'info', 'pear-request worker evidence was not available; run the fresh-peer bundle verifier before publishing this as an in-tab Pear app.'))
    }
    return checks
  }

  if (isPear) {
    if (compat.windowApp || compat.pearType === 'desktop') {
      checks.push(check('compat:window-app', 'Pear app compatibility', 'pass', 'Bundle evidence matches a standalone window app.', {
        pearType: compat.pearType || null,
        main: compat.main || null,
        mainPath: compat.mainPath || null
      }))
    } else if (compat.worker) {
      checks.push(check('compat:worker-standalone-mismatch', 'Pear app compatibility', 'warn', 'pear-request worker evidence is present, but the app is marked standalone. Consider publishing it as hypersite if it should run in a tab.', {
        main: compat.main || null,
        mainPath: compat.mainPath || null
      }))
    } else {
      checks.push(check('compat:pear-unknown', 'Pear app compatibility', 'info', 'No local pear.json/main-file compatibility evidence is available yet.'))
    }
    return checks
  }

  checks.push(check('compat:static-hyperdrive', 'App compatibility', 'pass', 'hyper:// apps render directly in the browser tab; pear-request worker evidence is not required.', {
    mode: 'hypersite'
  }))
  return checks
}

function freshPeerEvidence (input = {}, ctx = {}) {
  const raw = (ctx && typeof ctx.freshPeer === 'object' && ctx.freshPeer) ||
    (input && typeof input.freshPeer === 'object' && input.freshPeer) ||
    (input && typeof input.freshPeerVerification === 'object' && input.freshPeerVerification) ||
    (input && typeof input.verifierResult === 'object' && input.verifierResult) ||
    null
  if (!raw) return null
  return {
    ok: raw.ok === true,
    peers: positiveCount(raw.peers),
    entries: positiveCount(raw.entries),
    sampled: positiveCount(raw.sampled),
    blobsPresent: positiveCount(raw.blobsPresent),
    blobsMissing: positiveCount(raw.blobsMissing),
    bytes: positiveCount(raw.bytes),
    target: clean(raw.target || '', 120),
    name: clean(raw.name || '', 160),
    error: clean(raw.error || '', 400)
  }
}

function freshPeerCommand (target = {}) {
  const key = clean(target.driveKey || target.keyHex || target.key, 80).toLowerCase()
  if (!HEX64.test(key)) return null
  const name = clean(target.name || 'app', 80).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '')
  return `node scripts/verify-app-full.js --key ${key} --name ${name || 'app'}`
}

function freshPeerCheck (input = {}, ctx = {}, target = {}) {
  const evidence = freshPeerEvidence(input, ctx)
  if (evidence) {
    const proof = {
      peers: evidence.peers,
      entries: evidence.entries,
      sampled: evidence.sampled,
      blobsPresent: evidence.blobsPresent,
      blobsMissing: evidence.blobsMissing,
      bytes: evidence.bytes,
      target: evidence.target || null
    }
    if (evidence.ok && evidence.peers > 0 && evidence.blobsPresent > 0 && evidence.blobsMissing === 0) {
      return check('fresh-peer:verified', 'Fresh-peer fetch', 'pass', `Fresh peer fetched ${evidence.blobsPresent}/${evidence.sampled || evidence.blobsPresent} sampled blob${evidence.blobsPresent === 1 ? '' : 's'} from ${evidence.peers} peer${evidence.peers === 1 ? '' : 's'}.`, proof)
    }
    return check('fresh-peer:failed', 'Fresh-peer fetch', 'warn', evidence.error
      ? `Fresh-peer verifier failed: ${evidence.error}.`
      : `Fresh-peer verifier did not prove full availability (${evidence.blobsPresent}/${evidence.sampled || 0} sampled blobs fetched, ${evidence.blobsMissing} missing).`, proof)
  }

  const command = freshPeerCommand(target)
  return check('fresh-peer:missing', 'Fresh-peer fetch', 'info', command
    ? `No fresh-peer verifier result attached yet. Before release, run: ${command}`
    : 'No fresh-peer verifier result attached yet; run scripts/verify-app-full.js against the published drive before release.',
  command ? { command, driveKey: target.driveKey || null } : null)
}

function buildAppShipCheck (input = {}, ctx = {}) {
  const checks = []
  const name = clean(input.name, 160)
  const description = clean(input.description, 4000)
  const version = clean(input.version || '1.0.0', 80)
  const normalizeKey = typeof ctx.normalizeKey === 'function' ? ctx.normalizeKey : (value) => value

  if (!name) checks.push(check('manifest:name', 'Manifest name', 'fail', 'App name is required.'))
  else checks.push(check('manifest:name', 'Manifest name', 'pass', `Name is "${name}".`))

  if (!description) checks.push(check('manifest:description', 'Description', 'warn', 'No description provided; users will not know what the app does.'))
  else checks.push(check('manifest:description', 'Description', 'pass', 'Description is present.'))

  if (!version) checks.push(check('manifest:version', 'Version', 'warn', 'No version was provided.'))
  else checks.push(check('manifest:version', 'Version', 'pass', `Version ${version} is set.`))

  const derived = deriveKeyAndLink(input.link || input.driveKey || input.keyHex || input.key, normalizeKey)
  let target = {
    name,
    type: clean(input.type || input.launchMode, 80) || null,
    driveKey: null,
    link: clean(input.link || '', 512) || null,
    launchMode: null
  }

  if (derived.error) {
    checks.push(check('manifest:link', 'Drive/link', 'fail', derived.error))
  } else {
    target = {
      ...target,
      driveKey: derived.driveKey,
      link: derived.link,
      launchMode: derived.kind === 'pear' ? 'standalone' : 'hypersite'
    }
    checks.push(check('manifest:link', 'Drive/link', 'pass', `Resolved ${derived.kind === 'pear' ? 'pear://' : 'hyper://'} link to drive ${derived.driveKey.slice(0, 12)}...`, {
      driveKey: derived.driveKey,
      link: derived.link
    }))
    checks.push(appLaunchMode(input, derived, ctx))
    checks.push(...appCompatibilityChecks(input, ctx, derived))
  }

  checks.push(iconCheck(input))
  checks.push(bundleSizeCheck(ctx.driveInfo, ctx))
  checks.push(relayAvailabilityCheck(ctx.relayStatus))
  checks.push(pinCheck(input.pin, ctx.driveInfo))
  checks.push(freshPeerCheck(input, ctx, target))

  const author = clean(input.author || input.publisher || input.publisherKey, 256)
  if (author) checks.push(check('publisher:identity', 'Publisher identity', 'pass', 'Publisher identity metadata is present.', { publisher: author }))
  else checks.push(check('publisher:identity', 'Publisher identity', 'warn', 'No publisher or author identity is present in the manifest.'))

  return finishReport('app', target, checks)
}

function estimatedBlocksBytes (blocks) {
  if (!Array.isArray(blocks)) return 0
  let total = 0
  for (const block of blocks) {
    try { total += Buffer.byteLength(JSON.stringify(block)) } catch {}
  }
  return total
}

function siteContentChecks (input = {}) {
  const checks = []
  const blocks = Array.isArray(input.blocks) ? input.blocks : []
  const hasIndex = input.hasIndexHtml !== false

  checks.push(check('site:index', 'Required files', hasIndex ? 'pass' : 'fail', hasIndex
    ? 'index.html is present or will be generated by the block editor.'
    : 'index.html is missing.'))

  if (blocks.length > 0) {
    checks.push(check('site:blocks', 'Content', 'pass', `${blocks.length} content block${blocks.length === 1 ? '' : 's'} ready.`, {
      blocks: blocks.length,
      estimatedBytes: estimatedBlocksBytes(blocks)
    }))
  } else {
    checks.push(check('site:blocks', 'Content', 'warn', 'Site has no editor blocks; it will publish as an empty/default page unless raw files exist.'))
  }

  const rawHtmlBlocks = blocks.filter((block) => block && block.type === 'html' && /<script\b/i.test(asString(block.text)))
  if (rawHtmlBlocks.length > 0) {
    checks.push(check('site:raw-script', 'Raw HTML', 'warn', `${rawHtmlBlocks.length} raw HTML block${rawHtmlBlocks.length === 1 ? '' : 's'} include script tags; visitors will execute this code.`, {
      rawHtmlBlocks: rawHtmlBlocks.length
    }))
  }

  return checks
}

function buildSiteShipCheck (input = {}, ctx = {}) {
  const checks = []
  const name = clean(input.name, 160)
  const keyHex = clean(input.keyHex || input.driveKey || input.key, 80).toLowerCase()
  const published = !!input.published

  if (!name) checks.push(check('site:name', 'Site name', 'fail', 'Site name is required.'))
  else checks.push(check('site:name', 'Site name', 'pass', `Site name is "${name}".`))

  if (keyHex && HEX64.test(keyHex)) {
    checks.push(check('site:drive', 'Drive key', 'pass', `Writable Hyperdrive key ${keyHex.slice(0, 12)}... is available.`, { driveKey: keyHex }))
  } else {
    checks.push(check('site:drive', 'Drive key', 'fail', 'No valid Hyperdrive key is available for this site.'))
  }

  checks.push(...siteContentChecks(input))
  checks.push(iconCheck(input))
  checks.push(check('site:launch-mode', 'Launch mode', 'pass', 'Static Hyperdrive site opens directly inside the browser tab.', { mode: 'hypersite' }))
  checks.push(bundleSizeCheck(ctx.driveInfo, ctx))
  checks.push(relayAvailabilityCheck(ctx.relayStatus))
  checks.push(published ? pinCheck(input.pin, ctx.driveInfo) : check('pin:draft', 'Relay pin', 'info', 'Draft site is not pinned until you publish.'))

  const target = {
    name,
    siteId: clean(input.siteId, 80) || null,
    driveKey: keyHex && HEX64.test(keyHex) ? keyHex : null,
    link: keyHex && HEX64.test(keyHex) ? `hyper://${keyHex}/` : null,
    launchMode: 'hypersite',
    published
  }
  checks.push(freshPeerCheck(input, ctx, target))
  return finishReport('site', target, checks)
}

function buildShipCheck (input = {}, ctx = {}) {
  const kind = clean(input.kind || ctx.kind, 20).toLowerCase()
  if (kind === 'site' || input.siteId) return buildSiteShipCheck(input, ctx)
  return buildAppShipCheck(input, ctx)
}

module.exports = {
  DEFAULT_BUNDLE_WARN_BYTES,
  MAX_ICON_DATA_URI_BYTES,
  buildShipCheck,
  buildAppShipCheck,
  buildSiteShipCheck,
  formatBytes
}
