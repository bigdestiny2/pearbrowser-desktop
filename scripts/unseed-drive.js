/**
 * Send a signed unseed request to HiveRelay so the relays stop pinning
 * a drive. Mirrors the Settings → "Reset data" path but for one specific
 * drive without wiping everything else.
 *
 * Usage:
 *   node scripts/unseed-drive.js <publisher-storage-dir> <64-hex-key>
 *
 * Example — kill the pearbrowser-home drive we published earlier:
 *   node scripts/unseed-drive.js ~/Desktop/pearbrowser-publishers/pearbrowser-home \
 *     fec1568a24a2713fc8bec14267bfab39577bb8458e91e91b8cd19a4f877fd0fc
 *
 * Only the original publisher (whoever has the matching signing key in
 * the storage dir) can unseed. Relays verify the Ed25519 signature
 * before dropping the pin.
 */

import { HiveRelayClient } from 'p2p-hiverelay/client'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const [, , storageArg, keyArg] = process.argv
if (!storageArg || !keyArg) {
  console.error('usage: node scripts/unseed-drive.js <publisher-storage-dir> <64-hex-key>')
  process.exit(2)
}
if (!/^[0-9a-f]{64}$/i.test(keyArg)) {
  console.error('error: key must be 64-char hex')
  process.exit(2)
}
const storage = resolve(storageArg)
if (!existsSync(storage)) {
  console.error('error: publisher storage not found:', storage)
  process.exit(2)
}

console.log('🗑  Unseeding drive')
console.log('   key:', keyArg)
console.log('   storage:', storage)
console.log()

const client = new HiveRelayClient(storage)
client.on('relay-connected', () => process.stdout.write('  + relay connected\n'))

await client.start()
console.log('  · client started, discovering relays...')

await new Promise((resolve) => {
  let connected = 0
  client.on('relay-connected', () => {
    connected += 1
    if (connected >= 1) setTimeout(resolve, 3000)
  })
  setTimeout(() => {
    if (connected === 0) {
      console.error('  ✗ no relays discovered within 15s')
      process.exit(2)
    }
    resolve()
  }, 15000)
})

console.log()
console.log('Broadcasting unseed request to ' + client.relays.size + ' relays...')

try {
  const result = await client.unseed(keyArg)
  console.log()
  console.log('✅ Unseed broadcast complete')
  if (result && Array.isArray(result.acceptances)) {
    console.log('   ' + result.acceptances.length + ' relay(s) accepted')
  }
  console.log()
  console.log('   The drive is no longer pinned. New `pear://` lookups for this')
  console.log('   key will time out unless the original publisher comes back online.')
} catch (err) {
  console.error('  ✗ unseed failed:', err && err.message)
}

await new Promise((r) => setTimeout(r, 2000))
try { await client.destroy() } catch {}
process.exit(0)
