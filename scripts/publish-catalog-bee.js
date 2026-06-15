/**
 * Publish an app catalog as a **Hyperbee** (the Pear-native, queryable
 * catalog format) and pin it on the HiveRelay backbone.
 *
 * This is the publisher counterpart to backend/catalog-manager.js
 * `loadCatalogBee()`. The browser already knows how to load Hyperbee
 * catalogs; until now there was no way to *create* one, so the whole
 * bee-catalog path was untestable end-to-end. This closes that gap.
 *
 * The Hyperbee uses the exact key schema loadCatalogBee() reads:
 *   meta!name      → string         (catalog display name)
 *   meta!version   → number         (schema version, currently 1)
 *   app!<id>       → { id, name, description, driveKey|link, version,
 *                      author, categories, publishedAt }
 *
 * Usage:
 *   # New catalog — fresh key, served on the swarm, pinned on relays.
 *   # Storage is a throwaway temp dir unless --storage is given, so to
 *   # be able to UPDATE the catalog later you must pass --storage.
 *   node scripts/publish-catalog-bee.js <catalog.json> [--storage <dir>]
 *
 *   # Update an existing catalog (same key) — reuse its storage dir:
 *   node scripts/publish-catalog-bee.js <catalog.json> --storage <dir>
 *
 *   # Keep serving after pinning (until Ctrl-C) so browsers can pull even
 *   # before relays have fully cached it:
 *   node scripts/publish-catalog-bee.js <catalog.json> --storage <dir> --serve
 *
 *   # Build + serve locally without touching relays (offline testing):
 *   node scripts/publish-catalog-bee.js <catalog.json> --no-pin --serve
 *
 * Output: prints `hyperbee://<key>` — paste it into the Apps-tab catalog
 * field to load it. (The `hyperbee://` scheme tells the browser to use the
 * Hyperbee loader; a bare key / `hyper://` would be read as a Hyperdrive.)
 */

import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import Hyperbee from 'hyperbee'
import { HiveRelayClient } from 'p2p-hiverelay-client'
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { normalizeManifest, catalogEntries } from './lib/catalog-bee.js'

// Tiny CLI parser — same shape as scripts/publish-and-pin.js (no deps).
function parseArgs (argv) {
  const args = { _: [], flags: {} }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const [k, eqv] = a.slice(2).split('=', 2)
      const v = eqv !== undefined ? eqv : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true)
      args.flags[k] = v
    } else {
      args._.push(a)
    }
  }
  return args
}

const argv = parseArgs(process.argv.slice(2))
const sourceFile = argv._[0]
const explicitStorage = argv.flags.storage || null
const noPin = argv.flags['no-pin'] === true || argv.flags.pin === false
const serve = argv.flags.serve === true

function usage (msg) {
  if (msg) console.error('error:', msg)
  console.error('usage: node scripts/publish-catalog-bee.js <catalog.json> [--storage <dir>] [--serve] [--no-pin]')
  process.exit(2)
}

if (!sourceFile) usage('missing <catalog.json>')
const srcAbs = resolve(sourceFile)
if (!existsSync(srcAbs)) usage(`catalog file not found: ${srcAbs}`)

// --- Parse + validate the catalog manifest --------------------------------
let normalized
try {
  const manifest = JSON.parse(readFileSync(srcAbs, 'utf-8'))
  normalized = normalizeManifest(manifest)
} catch (err) {
  usage(`could not load ${srcAbs}: ${err.message}`)
}
const { name: catalogName, version: catalogVersion, apps } = normalized

// Persistent storage keeps the catalog key stable across updates; a temp
// dir gives a brand-new key each run (and can't be updated later).
const storage = explicitStorage
  ? resolve(explicitStorage)
  : mkdtempSync(join(tmpdir(), 'catalog-bee-'))

console.log('🍐 Publishing Hyperbee catalog')
console.log('   source:', srcAbs)
console.log('   name:', catalogName, '· version:', catalogVersion, '· apps:', apps.length)
console.log('   storage:', storage, explicitStorage ? '(persistent — updatable)' : '(throwaway — keep --storage to update later)')
console.log()

const SEED_OPTS = {
  replicas: 5,                    // ask 5 relays to pin
  ttlDays: 365,                   // pin for a year
  maxStorage: 64 * 1024 * 1024,   // 64 MB cap (a catalog bee is tiny)
  region: null
}

async function buildBee () {
  const store = new Corestore(storage)
  await store.ready()
  // A named core is deterministic from the store's primaryKey, so the same
  // --storage dir always yields the same catalog key (enables updates).
  const core = store.get({ name: 'catalog' })
  await core.ready()
  const bee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  await bee.ready()

  // Sync entries: write meta + apps, and prune app! entries no longer
  // present so updates can remove apps, not just add them.
  const existing = []
  for await (const entry of bee.createReadStream({ gte: 'app!', lt: 'app!~' })) {
    existing.push(entry.key)
  }
  const wanted = new Set(apps.map((a) => `app!${a.id}`))

  const batch = bee.batch()
  for (const key of existing) {
    if (!wanted.has(key)) await batch.del(key)
  }
  for (const [key, value] of catalogEntries(normalized)) {
    await batch.put(key, value)
  }
  await batch.flush()

  return { store, core, bee }
}

async function pinOnRelays (keyHex) {
  // Separate storage so the relay client doesn't collide with the catalog
  // corestore above. Mirrors scripts/pin-self-on-hiverelay.js.
  const relayStorage = mkdtempSync(join(tmpdir(), 'catalog-bee-pin-'))
  const client = new HiveRelayClient(relayStorage)
  client.on('relay-connected', (info) => {
    const id = (info && info.publicKey) ? Buffer.from(info.publicKey).toString('hex').slice(0, 12) : 'unknown'
    console.log('  + relay connected:', id + '…')
  })
  client.on('seeded', ({ key, acceptances }) => {
    console.log('  ✔ seeded', key.slice(0, 12) + '…', '— ' + acceptances + ' acceptances')
  })
  client.on('seed-error', ({ key, error }) => {
    console.error('  ✗ seed error for', key.slice(0, 12) + '…', '—', error && error.message)
  })

  await client.start()
  console.log('  · relay client started, discovering relays...')

  await new Promise((res) => {
    let connected = 0
    client.on('relay-connected', () => {
      connected += 1
      if (connected >= 1) setTimeout(res, 3000)
    })
    setTimeout(() => {
      if (connected === 0) {
        console.error('  ✗ no relays discovered within 15s — is the DHT reachable?')
        res()
      } else res()
    }, 15000)
  })

  console.log()
  console.log('Broadcasting seed request to ' + client.relays.size + ' relay(s)...')
  let acceptances = []
  try {
    acceptances = await client.seed(keyHex, SEED_OPTS)
  } catch (err) {
    console.error('  ✗ seed() threw:', err.message)
  }
  if (acceptances.length === 0) {
    console.log('⚠️  No relays accepted the seed request (capacity / allowlist / DHT).')
  } else {
    console.log('✅ ' + acceptances.length + ' relay(s) accepted the seed request.')
  }
  return client
}

async function main () {
  const { store, core } = await buildBee()
  const keyHex = Buffer.from(core.key).toString('hex')
  console.log('  · catalog hypercore key:', keyHex)
  console.log('  · bee length (blocks):', core.length)
  console.log()

  // Serve the catalog on Hyperswarm so relays — and browsers — can pull
  // its bytes. Same replication wiring as backend/index.js.
  const swarm = new Hyperswarm()
  swarm.on('connection', (conn) => {
    try { store.replicate(conn) } catch (err) { console.error('  [swarm] replicate failed:', err && err.message) }
  })
  swarm.join(core.discoveryKey, { server: true, client: true })
  await swarm.flush()
  console.log('  · announced on swarm (serving the catalog)')
  console.log()

  let relayClient = null
  if (!noPin) {
    relayClient = await pinOnRelays(keyHex)
    // Linger so relays (and any browser already loading) can pull the few
    // KB of catalog data from us before we tear down.
    console.log()
    console.log('  · lingering 15s so relays can replicate...')
    await new Promise((r) => setTimeout(r, 15000))
  }

  console.log()
  console.log('✅ Catalog published — load it in the Apps tab with:')
  console.log()
  console.log('     hyperbee://' + keyHex)
  console.log()
  if (explicitStorage) {
    console.log('   To update later, edit the JSON and re-run with the same --storage:')
    console.log(`     node scripts/publish-catalog-bee.js ${sourceFile} --storage ${storage}`)
  } else {
    console.log('   ⚠ Throwaway storage — this key cannot be updated. Re-run with')
    console.log('     --storage <dir> if you want a stable, updatable catalog key.')
  }
  console.log()

  if (serve) {
    console.log('  · --serve: staying online to serve the catalog. Ctrl-C to stop.')
    // Keep the process alive indefinitely.
    await new Promise(() => {})
  }

  if (relayClient) { try { await relayClient.destroy() } catch {} }
  try { await swarm.destroy() } catch {}
  try { await store.close() } catch {}
  process.exit(0)
}

main().catch((err) => {
  console.error('fatal:', err && err.stack || err)
  process.exit(1)
})
