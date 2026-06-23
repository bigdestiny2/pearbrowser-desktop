// Pure helpers for the Hyperbee catalog format — shared by
// scripts/publish-catalog-bee.js and its test. Framework-free and
// side-effect-free (no I/O), so the schema contract can be unit-tested
// against a real Hyperbee without relays or the swarm.
//
// The key schema MUST stay in lock-step with backend/catalog-manager.js
// loadCatalogBee(), which reads:
//   bee.get('meta!name'), bee.get('meta!version')
//   bee.createReadStream({ gte: 'app!', lt: 'app!~' })

import safetyMod from '../../backend/catalog-safety.cjs'

const { normalizeCatalogApp, normalizeCatalogData } = safetyMod
const APP_RANGE = { gte: 'app!', lt: 'app!~' }

/**
 * Validate + normalize a catalog manifest ({ name, version, apps[] }).
 * Throws Error on invalid input; returns a clean { name, version, apps }.
 *
 * `now` is injectable so callers (and tests) control the publishedAt
 * default deterministically.
 */
export function normalizeManifest (manifest, now = Date.now()) {
  if (!manifest || typeof manifest !== 'object') throw new Error('catalog must be a JSON object')

  const name = typeof manifest.name === 'string' && manifest.name.trim()
    ? manifest.name.trim()
    : 'P2P Catalog'
  const version = Number.isInteger(manifest.version) ? manifest.version : 1

  // An empty apps[] is allowed: a community catalogue starts empty and fills as
  // submissions are approved (the meta!name/version still publish, so the bee
  // exists + is loadable). Only a non-array apps is an error.
  if (!Array.isArray(manifest.apps)) throw new Error('catalog apps must be an array')
  const rawApps = manifest.apps

  const apps = []
  const seenIds = new Set()
  for (const [i, app] of rawApps.entries()) {
    if (!app || typeof app !== 'object') throw new Error(`apps[${i}] is not an object`)
    const clean = normalizeCatalogApp(app, { source: 'hyperbee' })
    const id = clean && clean.id ? clean.id : ''
    if (!id) throw new Error(`apps[${i}] needs an id (or driveKey/link to derive one)`)
    if (seenIds.has(id)) throw new Error(`duplicate app id: ${id}`)
    seenIds.add(id)
    const entry = {
      id,
      name: clean.name || id,
      description: clean.description || '',
      driveKey: clean.driveKey || '',
      link: clean.link || '',
      version: clean.version || '',
      author: clean.author || '',
      categories: clean.categories || [],
      verification: clean.verification || 'unverified',
      publishedAt: Number.isFinite(app.publishedAt) ? app.publishedAt : now
    }
    if (typeof clean.homepage === 'string' && clean.homepage) entry.homepage = clean.homepage
    if (typeof clean.sourceUrl === 'string' && clean.sourceUrl) entry.sourceUrl = clean.sourceUrl
    if (typeof clean.license === 'string' && clean.license) entry.license = clean.license
    if (clean.type === 'standalone' || clean.type === 'hypersite') entry.type = clean.type
    // Inline icon (data: URI) — carried so apps WITHOUT a fetchable drive icon
    // (pear://-only apps, or drives lacking /icon.*) still render a real icon.
    if (typeof clean.iconData === 'string' && clean.iconData) entry.iconData = clean.iconData
    apps.push(entry)
  }
  return { name, version, apps }
}

/**
 * The exact (key, value) pairs to write for a normalized manifest, in the
 * schema loadCatalogBee() reads back. Pure — the caller does the I/O.
 */
export function catalogEntries (normalized) {
  const entries = [
    ['meta!name', normalized.name],
    ['meta!version', normalized.version]
  ]
  for (const app of normalized.apps) entries.push([`app!${app.id}`, app])
  return entries
}

/**
 * Mirror of loadCatalogBee()'s read path, factored out so a test can prove
 * round-trip equivalence and the publisher can sanity-check its own write.
 * Reads a ready Hyperbee and returns the same `data` shape the browser
 * builds.
 */
export async function readCatalogBee (bee, keyHex = '') {
  const apps = []
  for await (const entry of bee.createReadStream(APP_RANGE)) {
    if (entry.value && typeof entry.value === 'object') apps.push(entry.value)
  }
  const nameEntry = await bee.get('meta!name').catch(() => null)
  const versionEntry = await bee.get('meta!version').catch(() => null)
  const data = normalizeCatalogData({
    version: versionEntry ? versionEntry.value : 1,
    name: nameEntry ? nameEntry.value : 'P2P Catalog',
    source: 'hyperbee',
    sourceKey: keyHex,
    apps
  }, { source: 'hyperbee' })
  data.count = { total: data.apps.length, apps: data.apps.length }
  return data
}
