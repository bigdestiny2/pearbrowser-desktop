/**
 * Re-seed an EXISTING Hyperdrive on HiveRelay — no source dir, no re-import.
 *
 * Opens the drive straight from its original publisher corestore, so the
 * 64-hex key (and every hyper:// link to it) is preserved and the drive
 * version is untouched. Then serves it on the swarm and broadcasts a fresh
 * signed seed-request to all connected relays so the fleet replicates +
 * serves it 24/7 again.
 *
 * Why this exists alongside publish-and-pin.js:
 *   - publish-and-pin needs a <source-dir> and re-imports content. When the
 *     only surviving copy of a site is the drive itself, you don't have the
 *     source — this re-seeds from the corestore as-is.
 *   - publish() only forwards {replicas, timeout} to seed(), so its
 *     `ttlDays` is silently dropped and the pin defaults to a 30-DAY TTL.
 *     This passes ttlDays straight to seed() so a 365-day pin actually
 *     sticks. (A 30-day default is the likeliest cause of "my pinned site
 *     vanished after a month".)
 *
 * Usage:
 *   node scripts/reseed-drive.js <publisher-storage-dir> <64-hex-key> \
 *     [--name <app>] [--replicas 5] [--ttlDays 365] [--archive] [--hold 60]
 */
import { HiveRelayClient } from 'p2p-hiverelay-client'
import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

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

const { positional, flags } = parseArgs(process.argv.slice(2))
const storage = positional[0]
const keyHex = positional[1]
if (!storage || !keyHex || !/^[0-9a-f]{64}$/i.test(keyHex)) {
  console.error('usage: node scripts/reseed-drive.js <publisher-storage-dir> <64-hex-key> [--name x] [--replicas 5] [--ttlDays 365] [--archive] [--hold 60]')
  process.exit(2)
}
const storageAbs = resolve(storage)
if (!existsSync(storageAbs)) { console.error('storage not found:', storageAbs); process.exit(2) }

const name = flags.name || 'reseed'
const replicas = Number(flags.replicas) || 5
const ttlDays = Number(flags.ttlDays) || 365
const durability = flags.archive ? 'archive' : 0
const holdSecs = Number(flags.hold) || 60

console.log('🍐 Re-seeding existing drive on HiveRelay')
console.log('   storage :', storageAbs)
console.log('   key     :', keyHex)
console.log('   name    :', name, '| replicas:', replicas, '| ttlDays:', ttlDays, '| durability:', durability || 'standard')
console.log()

const client = new HiveRelayClient(storageAbs)
client.on('seeded', ({ key, acceptances }) => console.log('  ✔ seeded', String(key).slice(0, 12) + '…', '—', acceptances, 'acceptances'))
client.on('seed-error', ({ key, error }) => console.error('  ✗ seed-error', String(key).slice(0, 12) + '…', '—', error && error.message))
client.on('seed-cap-warning', (w) => console.warn('  ! cap warning:', w.hint))

await client.start()
console.log('  · client started, discovering relays…')
await new Promise((res) => {
  let n = 0
  client.on('relay-connected', () => { if (++n >= 1) setTimeout(res, 3000) })
  setTimeout(() => { if (n === 0) { console.error('  ✗ no relays within 15s — DHT issue?'); process.exit(2) } res() }, 15000)
})
console.log('  · relays connected:', client.relays?.size ?? '?')

// Open the EXISTING drive from the publisher corestore — no put(), so the
// content and version are preserved exactly. Readying it registers its
// cores with the corestore so swarm replication serves them to relays.
const drive = new Hyperdrive(client.store, b4a.from(keyHex, 'hex'))
await drive.ready()
console.log('  · drive opened — version', drive.version, '· byteLength', drive.byteLength)
client.drives.set(keyHex, drive)
client.swarm.join(drive.discoveryKey, { server: true, client: true })
client.swarm.flush().catch(() => {})

const acceptances = await client.seed(drive.key, { replicas, ttlDays, durability, discoveryKey: drive.discoveryKey })
const n = Array.isArray(acceptances) ? acceptances.length : (acceptances || 0)
console.log()
console.log('✅ seed-request broadcast — relay acceptances:', n)
console.log('   hyper://' + keyHex + '/')
console.log()
console.log('   holding online ' + holdSecs + 's so relays pull the content from us…')
await new Promise((r) => setTimeout(r, holdSecs * 1000))
try { await client.destroy() } catch {}
console.log('  · done.')
process.exit(0)
