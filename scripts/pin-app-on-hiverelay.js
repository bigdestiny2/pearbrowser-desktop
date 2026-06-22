/**
 * Durably pin an EXISTING app bundle (or any Hyperdrive) on HiveRelay,
 * WITHOUT owning its signing key.
 *
 * A pear:// app bundle is just a Hyperdrive — its z32 key is the drive key.
 * Pinning is read-only replication: HiveRelay's seed-request is signed by
 * THIS client's swarm keypair (see HiveRelayClient.seed → request.publisher*
 * is OUR keypair, not the drive author's). So any peer that can fetch the
 * content may ask the relay fleet to hold it. The author does NOT have to be
 * the one to seed it — correcting the old assumption that only `pear seed`
 * by the author makes an app durable.
 *
 * IMPORTANT sizing note: a drive's blob *core* byteLength can be far larger
 * than its CURRENT checkout when the key was re-staged many times during dev
 * (dead history accumulates in the append-only core). We therefore size
 * maxStorage from the CURRENT file set + metadata core, NOT the blob core —
 * otherwise we'd ask relays to reserve tens of GB and they reject it.
 *
 * What this does:
 *   1. Opens the drive by key (seedAsReader, so we serve onward too).
 *   2. Lists the CURRENT checkout (sum of live blob bytes) and best-effort
 *      pre-fetches it, so we are a second complete source.
 *   3. Broadcasts an archive-tier seed-request sized to current+metadata.
 *   4. Stays online (--hold), logging every relay acceptance as it lands
 *      (acceptances often arrive after the initial 15s broadcast window).
 *
 * Confirm durability afterwards (local `pear seed` for the key STOPPED):
 *   node scripts/verify-app-full.js --key <64-hex>
 *
 * Usage:
 *   node scripts/pin-app-on-hiverelay.js <pear://z32 | z32 | 64-hex> \
 *     [--name x] [--hold 300] [--replicas 5] [--ttlDays 365] \
 *     [--maxStorage <MB>] [--standard] [--dlTimeout 150]
 */

import { HiveRelayClient } from 'p2p-hiverelay-client'
import z32 from 'z32'
import b4a from 'b4a'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function parseArgs (argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const v = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true
      flags[k] = v
    } else positional.push(a)
  }
  return { positional, flags }
}

function toHexKey (raw) {
  if (!raw) return null
  let s = String(raw).trim()
  s = s.replace(/^pear:\/\//i, '').replace(/^hyper:\/\//i, '').replace(/\/.*$/, '')
  if (/^[0-9a-f]{64}$/i.test(s)) return s.toLowerCase()
  try {
    const buf = z32.decode(s)
    if (buf.length === 32) return b4a.toString(buf, 'hex')
  } catch { /* not z32 */ }
  return null
}

const { positional, flags } = parseArgs(process.argv.slice(2))
const keyHex = toHexKey(positional[0])
if (!keyHex) {
  console.error('usage: node scripts/pin-app-on-hiverelay.js <pear://z32 | z32 | 64-hex> [--name x] [--hold 300] [--maxStorage <MB>] [--replicas 5] [--ttlDays 365] [--standard]')
  process.exit(2)
}

const name = flags.name || 'app'
const holdSecs = Number(flags.hold) || 300
const replicas = Number(flags.replicas) || 5
const ttlDays = Number(flags.ttlDays) || 365
const durability = flags.standard ? 0 : 'archive'
const dlTimeoutS = Number(flags.dlTimeout) || 150
const explicitMaxMB = Number(flags.maxStorage) || 0

const MB = 1024 * 1024
const storage = mkdtempSync(join(tmpdir(), 'pin-app-'))
console.log('🍐 Pinning app bundle on HiveRelay (read-only foreign-key seed)')
console.log('   key     :', keyHex)
console.log('   name    :', name, '| hold:', holdSecs + 's | replicas:', replicas, '| ttlDays:', ttlDays, '| durability:', durability)
console.log()

const client = new HiveRelayClient(storage)
let acceptCount = 0
client.on('seed-accepted', (info) => {
  acceptCount++
  const who = info && (info.relay || info.pubkey || info.relayPubkey)
  console.log('  ✔ ACCEPTED #' + acceptCount, who ? ('by ' + String(who).slice(0, 12) + '…') : '')
})
client.on('seeded', ({ key, acceptances }) => console.log('  · seeded event —', acceptances, 'acceptances at broadcast'))
client.on('seed-error', ({ key, error }) => console.error('  ✗ seed-error', '—', error && error.message))
client.on('seed-cap-warning', (w) => console.warn('  ! cap warning:', w.hint))

await client.start()
console.log('  · client started, discovering relays…')
await new Promise((res) => {
  let n = 0
  client.on('relay-connected', () => { if (++n >= 1) setTimeout(res, 3000) })
  setTimeout(() => { if (n === 0) { console.error('  ✗ no relays within 15s — DHT issue?'); process.exit(2) } res() }, 15000)
})
console.log('  · relays connected:', client.relays?.size ?? '?')

// 1) Open the drive by key. seedAsReader:true → we serve content onward.
const drive = await client.open(keyHex, { seedAsReader: true, wait: true, timeout: 30000 })
await drive.ready()
console.log('  · drive opened — version', drive.version)
if (!drive.version || drive.version === 0) {
  console.error('  ✗ drive is empty (version 0) — no content to pin. Aborting.')
  try { await client.destroy() } catch {}
  process.exit(3)
}

// 2) Measure the CURRENT checkout (live blobs only) and pre-fetch it.
console.log('  · measuring current checkout…')
let currentBytes = 0
let fileCount = 0
try {
  await Promise.race([
    (async () => {
      for await (const e of drive.list('/', { recursive: true })) {
        fileCount++
        currentBytes += (e?.value?.blob?.byteLength || 0)
      }
    })(),
    new Promise((_, rej) => setTimeout(() => rej(new Error('list-cap')), 90_000))
  ])
} catch (e) { console.log('  · list incomplete (' + e.message + '), counted', fileCount, 'so far') }
const metaBytes = (drive.db?.core?.byteLength) || (drive.core?.byteLength) || 0
console.log('  · current checkout:', fileCount, 'files,', (currentBytes / MB).toFixed(2), 'MB live blobs · metadata core', (metaBytes / MB).toFixed(1), 'MB')

console.log('  · pre-fetching current content (best-effort, ' + dlTimeoutS + 's cap)…')
try {
  await Promise.race([
    drive.download('/'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('download-cap')), dlTimeoutS * 1000))
  ])
  console.log('  · current content fetched into our store')
} catch (e) { console.log('  · pre-fetch incomplete (' + e.message + ') — relays pull from the live seeder during hold') }

// 3) Size maxStorage from CURRENT content + metadata core (NOT the bloated
//    blob core). Explicit --maxStorage <MB> overrides.
const sized = Math.max(256 * MB, Math.ceil((currentBytes + metaBytes) * 3))
const maxStorage = explicitMaxMB > 0 ? explicitMaxMB * MB : sized
console.log('  · maxStorage:', (maxStorage / MB).toFixed(0), 'MB', explicitMaxMB > 0 ? '(explicit)' : '(sized from current+meta)')

const acceptances = await client.seed(drive.key, {
  replicas, ttlDays, durability, maxStorage, discoveryKey: drive.discoveryKey
})
const n0 = Array.isArray(acceptances) ? acceptances.length : (acceptances || 0)
console.log()
console.log('✅ seed-request broadcast — acceptances within initial window:', n0)
console.log('   hex   ' + keyHex)
console.log()

// 4) Hold so late acceptances land + relays replicate the content from us.
console.log('   holding online ' + holdSecs + 's (logging acceptances as they arrive)…')
await new Promise((r) => setTimeout(r, holdSecs * 1000))
console.log()
console.log('   TOTAL acceptances observed during run:', acceptCount)
try { await client.destroy() } catch {}
console.log('  · done. Verify (with local seed daemon STOPPED): node scripts/verify-app-full.js --key ' + keyHex)
process.exit(0)
