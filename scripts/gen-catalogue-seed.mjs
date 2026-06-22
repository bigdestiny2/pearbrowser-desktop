// Generate backend/catalogue-seed.js (the desktop offline seed) FROM the single
// source of truth: the curated network manifest at
//   03-sites/pearbrowser-publishers/catalog-source/catalog.json
//
// This is the unification primitive: the SAME source feeds (1) this offline seed
// (ensureDevCatalogue), (2) the published Hyperbee catalog (publish-catalog-bee.js),
// and (3) the relay firehose manifests — so the three can never drift again. The
// browser's dedupeApps() collapses the offline seed against the live bee by
// driveKey/link, so an app present in both shows once.
//
//   node scripts/gen-catalogue-seed.mjs
//
// The manifest is rich (id, pearLink, homepage, license, platforms, …); the seed
// rows are validated against the strict APPS_SCHEMA (additionalProperties:false),
// so we project onto exactly its allowed fields and infer `type` from `link`.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = join(here, '..', '..', '..', '03-sites', 'pearbrowser-publishers', 'catalog-source', 'catalog.json')
const OUT = join(here, '..', 'backend', 'catalogue-seed.js')

const cat = JSON.parse(readFileSync(SRC, 'utf8'))
if (!Array.isArray(cat.apps) || cat.apps.length === 0) throw new Error('source manifest has no apps[]')

// Project a rich manifest entry onto the strict APPS_SCHEMA fields only.
// type: a launchable Pear app (pear:// link) is 'standalone' (own window); a
// browsable hyperdrive site is 'hypersite' (run-in-tab). publishedAt is stamped
// at seed time by ensureDevCatalogue, so it is intentionally omitted here.
function toSeedRow (a) {
  const row = { name: a.name, type: a.link ? 'standalone' : 'hypersite' }
  if (a.driveKey && /^[0-9a-f]{64}$/i.test(a.driveKey)) row.driveKey = a.driveKey
  if (a.link) row.link = a.link
  // Inline icon (data: URI) for apps without a fetchable drive icon — rendered
  // directly by AppIcon, so every catalogue app shows a real icon, not a glyph.
  if (a.iconData) row.iconData = a.iconData
  if (a.author) row.author = a.author
  if (Array.isArray(a.categories) && a.categories.length) row.categories = a.categories
  if (a.description) row.description = a.description
  if (a.version) row.version = String(a.version)
  row.verification = a.verification || 'relay-listed'
  return row
}

const rows = cat.apps.map(toSeedRow)
for (const [i, r] of rows.entries()) {
  if (!r.name || !r.type) throw new Error(`row ${i} missing name/type`)
  if (!r.driveKey && !r.link) throw new Error(`row ${i} (${r.name}) has neither driveKey nor link`)
}

const header = `/**
 * Dev catalogue seed data — GENERATED FILE, do not edit by hand.
 *
 * Source of truth: 03-sites/pearbrowser-publishers/catalog-source/catalog.json
 * Regenerate:      node scripts/gen-catalogue-seed.mjs
 *
 * Until the HiveRelay publishes a canonical schema-sheets catalogue room, the
 * backend seeds one locally on boot (ensureDevCatalogue in index.js) so the Apps
 * store is populated end-to-end offline. The desktop ALSO loads the live Hyperbee
 * catalog (DEFAULT_CATALOG_KEY in ui/shell.js, same source); dedupeApps() collapses
 * the two by driveKey/link, so each app appears once.
 *
 * Each entry is one \`apps\` row (validated against APPS_SCHEMA): name + type
 * required, driveKey OR link, type ∈ {standalone (window), hypersite (run-in-tab)}.
 */
`

const body = 'module.exports = {\n  SEED_APPS: ' +
  JSON.stringify(rows, null, 2).replace(/\n/g, '\n  ') + '\n}\n'

writeFileSync(OUT, header + body)
console.log(`wrote ${OUT}`)
console.log(`${rows.length} apps:`, rows.map((r) => `${r.name} (${r.type})`).join(', '))
