/**
 * Fresh-peer verification for a live Hyperbee app catalogue.
 *
 * This complements `npm run validate` in the publisher directory: validation
 * proves the source JSON is good; this proves the published Hyperbee key is
 * reachable and contains the expected rows.
 *
 * Usage:
 *   node scripts/verify-live-catalog.js \
 *     --key f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d \
 *     --expect-app peercord --expect-app peerit --expect-app hiveworm
 */

import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import Hyperbee from 'hyperbee'
import b4a from 'b4a'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readCatalogBee } from './lib/catalog-bee.js'

const DEFAULT_KEY = 'f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d'
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const pearConfig = JSON.parse(readFileSync(new URL('../pear.json', import.meta.url), 'utf8'))
const catalogSource = JSON.parse(readFileSync(new URL('../catalog-source/pearbrowser-network.catalog.json', import.meta.url), 'utf8'))
const browserSource = catalogSource.apps.find((app) => app.id === 'pearbrowser-desktop')
if (!browserSource) throw new Error('catalogue source is missing pearbrowser-desktop')
const PEER_TIMEOUT_MS = 30_000
const UPDATE_TIMEOUT_MS = 20_000
const READ_TIMEOUT_MS = 20_000

function parseArgs (argv) {
  const args = {
    key: DEFAULT_KEY,
    expectApps: [],
    expectCount: 14,
    expectName: 'PearBrowser Network',
    expectBrowserVersion: pkg.version,
    expectBrowserLink: pearConfig.links.production,
    expectBrowserHomepage: browserSource.homepage
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--key') args.key = argv[++i]
    else if (arg === '--expect-app') args.expectApps.push(argv[++i])
    else if (arg === '--expect-count') args.expectCount = Number(argv[++i])
    else if (arg === '--expect-name') args.expectName = argv[++i]
    else if (arg === '--expect-browser-version') args.expectBrowserVersion = argv[++i]
    else if (arg === '--expect-browser-link') args.expectBrowserLink = argv[++i]
    else if (arg === '--expect-browser-homepage') args.expectBrowserHomepage = argv[++i]
  }
  return args
}

function withTimeout (promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error(label + ' timed out')), ms))
  ])
}

function fail (message) {
  throw new Error(message)
}

const args = parseArgs(process.argv.slice(2))
if (!/^[0-9a-f]{64}$/i.test(args.key || '')) fail('--key must be a 64-char hex key')
if (!Number.isInteger(args.expectCount) || args.expectCount < 0) fail('--expect-count must be a non-negative integer')

const storage = mkdtempSync(join(tmpdir(), 'verify-live-catalog-'))
const store = new Corestore(storage)
const swarm = new Hyperswarm()
let peerCount = 0

async function cleanup (code) {
  try { await swarm.destroy() } catch {}
  try { await store.close() } catch {}
  try { rmSync(storage, { recursive: true, force: true }) } catch {}
  process.exit(code)
}

async function main () {
  console.log('🍐 Verifying live Hyperbee catalogue')
  console.log('   key:', args.key)
  console.log()

  await store.ready()
  const core = store.get({ key: b4a.from(args.key, 'hex') })
  core.on('error', (err) => console.warn('[catalog-verify] core error:', err && err.message))
  await core.ready()

  const discovery = swarm.join(core.discoveryKey, { server: false, client: true })
  swarm.on('connection', (conn) => {
    peerCount += 1
    store.replicate(conn)
  })

  process.stdout.write('   → waiting for peers...')
  await withTimeout(new Promise((resolve) => swarm.once('connection', resolve)), PEER_TIMEOUT_MS, 'peer discovery')
  process.stdout.write(' ✓\n')
  await discovery.flushed().catch(() => {})

  process.stdout.write('   → updating catalogue core...')
  await withTimeout(core.update({ wait: true }), UPDATE_TIMEOUT_MS, 'catalogue update')
  process.stdout.write(' length=' + core.length + '\n')

  const bee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  await bee.ready()

  const signedMeta = await withTimeout(bee.get('\x00meta'), READ_TIMEOUT_MS, 'signed meta read')
  if (!signedMeta || !signedMeta.value || typeof signedMeta.value.signature !== 'string') {
    fail('missing signed \\x00meta signature')
  }

  const data = await withTimeout(readCatalogBee(bee, args.key), READ_TIMEOUT_MS, 'catalogue app scan')
  if (args.expectName && data.name !== args.expectName) fail(`expected name "${args.expectName}", got "${data.name}"`)
  if (data.apps.length !== args.expectCount) fail(`expected ${args.expectCount} apps, got ${data.apps.length}`)

  const byId = new Map(data.apps.map((app) => [app.id, app]))
  for (const id of args.expectApps) {
    if (!byId.has(id)) fail(`missing expected app: ${id}`)
  }

  const pearbrowser = byId.get('pearbrowser-desktop')
  if (!pearbrowser) fail('missing expected app: pearbrowser-desktop')
  if (pearbrowser.version !== args.expectBrowserVersion) {
    fail(`PearBrowser version mismatch: expected ${args.expectBrowserVersion}, got ${pearbrowser.version || '(missing)'}`)
  }
  if (pearbrowser.link !== args.expectBrowserLink) {
    fail(`PearBrowser link mismatch: expected ${args.expectBrowserLink}, got ${pearbrowser.link || '(missing)'}`)
  }
  if (pearbrowser.homepage !== args.expectBrowserHomepage) {
    fail(`PearBrowser homepage mismatch: expected ${args.expectBrowserHomepage}, got ${pearbrowser.homepage || '(missing)'}`)
  }

  const peercord = byId.get('peercord')
  if (peercord) {
    if (peercord.link !== 'pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy') fail('Peercord link mismatch')
    if (peercord.driveKey) fail('Peercord should be pear:// standalone without a Hyperdrive driveKey')
    if (peercord.type !== 'standalone') fail(`Peercord type mismatch: expected standalone, got ${peercord.type || '(missing)'}`)
    if (peercord.sourceUrl !== 'https://git.churchofmalware.org/mastercodeon/Peercord') fail('Peercord sourceUrl mismatch')
    if (peercord.license !== 'GPL-3.0') fail('Peercord license mismatch')
  }

  const hiveworm = byId.get('hiveworm')
  if (hiveworm) {
    if (hiveworm.driveKey !== 'e3f910d11e70044afe361b1cecfb5cfb3c4f61f600cc81c2365ba0e6f58c8d4d') fail('HiveWorm driveKey mismatch')
    if (hiveworm.link !== 'hyper://e3f910d11e70044afe361b1cecfb5cfb3c4f61f600cc81c2365ba0e6f58c8d4d/') fail('HiveWorm link mismatch')
  }

  const peerit = byId.get('peerit')
  if (peerit) {
    if (peerit.driveKey !== 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4') fail('peerit driveKey mismatch')
    if (peerit.link !== 'hyper://ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4/') fail('peerit link mismatch')
    if (peerit.type !== 'hypersite') fail(`peerit type mismatch: expected hypersite, got ${peerit.type || '(missing)'}`)
  }

  console.log('   → signed meta signature:', signedMeta.value.signature.slice(0, 16) + '…')
  console.log('   → catalogue:', data.name, '· apps:', data.apps.length)
  console.log('   → PearBrowser:', pearbrowser.version, '·', pearbrowser.link, '·', pearbrowser.homepage)
  if (peercord) console.log('   → Peercord:', peercord.type, '·', peercord.sourceUrl, '·', peercord.license)
  console.log('   → expected apps:', args.expectApps.length ? args.expectApps.join(', ') : '(none)')
  console.log()
  console.log('✅ Live catalogue is reachable and matches expected release rows')
  console.log('   peers:', peerCount)
  await cleanup(0)
}

main().catch(async (err) => {
  console.error()
  console.error('✗ FAIL —', err.message)
  await cleanup(1)
})
