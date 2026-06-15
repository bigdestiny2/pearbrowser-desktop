// Pure helpers for the Hyperbee catalog format — shared by
// scripts/publish-catalog-bee.js and its test. Framework-free and
// side-effect-free (no I/O), so the schema contract can be unit-tested
// against a real Hyperbee without relays or the swarm.
//
// The key schema MUST stay in lock-step with backend/catalog-manager.js
// loadCatalogBee(), which reads:
//   bee.get('meta!name'), bee.get('meta!version')
//   bee.createReadStream({ gte: 'app!', lt: 'app!~' })

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

  const rawApps = Array.isArray(manifest.apps) ? manifest.apps : []
  if (rawApps.length === 0) throw new Error('catalog has no apps[] — nothing to publish')

  const apps = []
  const seenIds = new Set()
  for (const [i, app] of rawApps.entries()) {
    if (!app || typeof app !== 'object') throw new Error(`apps[${i}] is not an object`)
    const id = (app.id || app.driveKey || app.link || '').toString().trim()
    if (!id) throw new Error(`apps[${i}] needs an id (or driveKey/link to derive one)`)
    if (seenIds.has(id)) throw new Error(`duplicate app id: ${id}`)
    seenIds.add(id)
    apps.push({
      id,
      name: app.name || id,
      description: app.description || '',
      driveKey: app.driveKey || '',
      link: app.link || '',
      version: app.version || '',
      author: app.author || '',
      categories: Array.isArray(app.categories) ? app.categories : [],
      publishedAt: Number.isFinite(app.publishedAt) ? app.publishedAt : now
    })
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
  return {
    version: versionEntry ? versionEntry.value : 1,
    name: nameEntry ? nameEntry.value : 'P2P Catalog',
    source: 'hyperbee',
    sourceKey: keyHex,
    apps,
    count: { total: apps.length, apps: apps.length }
  }
}
