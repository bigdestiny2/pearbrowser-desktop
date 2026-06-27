import { driveKeyFromHyperRef } from './keys.js'
import { catalogProvenanceSearchText } from './catalog-provenance.js'

// Normalize an app's category metadata to a string array. Catalogs in the
// wild use either `categories: [...]` or a single `category: "..."`.
export function appCategories (app) {
  if (Array.isArray(app.categories)) return app.categories.map((c) => String(c)).filter(Boolean)
  if (app.category) return [String(app.category)]
  return []
}

export function catalogAppSearchText (app) {
  if (!app || typeof app !== 'object') return ''
  return [
    app.name,
    app.description,
    app.author,
    app.id,
    app.version,
    app.source,
    app.catalogName,
    app.verification,
    app.link,
    app.driveKey,
    catalogProvenanceSearchText(app),
    ...appCategories(app),
    ...(Array.isArray(app._sources) ? app._sources : [])
  ]
    .filter((value) => value != null && value !== '')
    .map((value) => String(value).normalize('NFKC').toLowerCase())
    .join(' ')
}

// Browser-side defensive dedup. The backend aggregate now collapses by stable
// identity (driveKey, else link, else id), but keep this final pass for stale
// backends and local state restored from older versions. It mirrors the backend
// winner rule: verification first, then version, while recording source names.
const VERIFICATION_RANK = { 'author-signed': 3, 'relay-listed': 2, unverified: 1 }

function appVersionGreater (a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0; const y = pb[i] || 0
    if (x !== y) return x > y
  }
  return false
}

function betterApp (a, b) {
  const va = VERIFICATION_RANK[a.verification] || 1
  const vb = VERIFICATION_RANK[b.verification] || 1
  if (va !== vb) return va > vb ? a : b
  if (appVersionGreater(a.version, b.version)) return a
  if (appVersionGreater(b.version, a.version)) return b
  return b
}

export function normalizeAppLinkForKey (raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.replace(/^([a-z][a-z0-9+.-]*):\/\//i, (_, scheme) => scheme.toLowerCase() + '://')
}

function appStableDedupeKey (app) {
  if (!app || typeof app !== 'object') return ''
  const driveKey = /^[0-9a-f]{64}$/i.test(String(app.driveKey || '').trim())
    ? String(app.driveKey).trim().toLowerCase()
    : ''
  const link = normalizeAppLinkForKey(app.link)
  const hyperKey = /^hyper:\/\//i.test(link) ? driveKeyFromHyperRef(link) : ''
  if (driveKey || hyperKey) return 'drive:' + (driveKey || hyperKey)
  if (/^(?:hyper|pear|file):\/\/.+/i.test(link)) return 'link:' + link
  const id = String(app.id || '').trim()
  return id ? 'id:' + id : ''
}

export function dedupeApps (list) {
  const byKey = new Map()
  const anon = []
  for (const app of list) {
    const key = appStableDedupeKey(app)
    if (!key) {
      anon.push(app)
      continue
    }
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { ...app, _sources: app.catalogName ? [app.catalogName] : [] })
      continue
    }
    const sources = [...new Set([...(existing._sources || []), app.catalogName].filter(Boolean))]
    // Keep the most-trustworthy copy's metadata, but backfill presentation-only
    // fields (icon) from the other copy — so an app whose winning entry lacks an
    // icon still shows one if ANY catalogue carries it (e.g. the offline seed
    // wins on verification but only the published bee carries the inline icon).
    const winner = betterApp(app, existing)
    const other = winner === app ? existing : app
    const merged = { ...winner }
    if (!merged.iconData && other.iconData) merged.iconData = other.iconData
    if (!merged.icon && other.icon) merged.icon = other.icon
    byKey.set(key, { ...merged, _sources: sources })
  }
  return [...byKey.values(), ...anon]
}
