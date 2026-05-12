/**
 * Quick relay health check — boot a HiveRelayClient, see how many
 * relays we connect to via the DHT, list their pubkeys, and try a
 * tiny op against each.
 *
 * Usage:
 *   node scripts/check-relays.js [--storage <dir>]
 */

import { HiveRelayClient } from 'p2p-hiverelay/client'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const storageArgIdx = process.argv.indexOf('--storage')
const storage = storageArgIdx >= 0
  ? process.argv[storageArgIdx + 1]
  : mkdtempSync(join(tmpdir(), 'check-relays-'))

console.log('🔬 HiveRelay health check')
console.log('   storage:', storage)
console.log()

const client = new HiveRelayClient(storage)
const seen = new Map() // hex pubkey → { connectedAt, capabilities? }

client.on('relay-connected', (info) => {
  const pk = info && info.publicKey
    ? Buffer.from(info.publicKey).toString('hex')
    : 'unknown'
  if (!seen.has(pk)) {
    seen.set(pk, { connectedAt: Date.now(), info })
    console.log(`  + ${pk.slice(0, 16)}…`)
  }
})

await client.start()
console.log('  · client started, discovering relays...')
console.log()

// Wait 8s for relays to appear (some come fast, some take a moment)
await new Promise((r) => setTimeout(r, 8000))

console.log('────────────────────────────')
console.log(`  ${seen.size} unique relays reachable via DHT`)
console.log(`  ${client.relays.size} live connections in client.relays`)
console.log('────────────────────────────')
console.log()

if (seen.size === 0) {
  console.log('⚠️  No relays found in 8s. The DHT may be slow today, or')
  console.log('    your network is blocking UDP. Try again, or check your')
  console.log('    machine\'s connectivity to a known DHT bootstrap node.')
} else {
  console.log('Per-relay breakdown:')
  let i = 1
  for (const [pk, entry] of seen) {
    const ageMs = Date.now() - entry.connectedAt
    console.log(`  ${i++}. ${pk.slice(0, 16)}…  (connected ${ageMs}ms ago)`)
  }
  console.log()
  console.log('All relays accept signed seed/unseed requests — see')
  console.log('scripts/pin-self-on-hiverelay.js or scripts/publish-and-pin.js')
}

await new Promise((r) => setTimeout(r, 1000))
try { await client.destroy() } catch {}
process.exit(0)
