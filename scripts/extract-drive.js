/**
 * Extract every file from a published Hyperdrive to a local directory.
 *
 * Useful when you've lost the local source for a site that's still
 * being seeded somewhere on the swarm (or pinned on HiveRelay).
 *
 * Usage:
 *   node scripts/extract-drive.js <64-hex-drive-key> <out-dir>
 *
 * Example — pull the PearBrowser homepage drive's contents:
 *   node scripts/extract-drive.js \
 *     f1e72b4bec5abd134aa3fde1ed58aa4a9ab97ff1a90ca29a258de0dacdce65fb \
 *     ./recovered-homepage
 *
 * Mechanics:
 *   1. Boot a tiny Corestore + Hyperswarm in /tmp
 *   2. Open the Hyperdrive at the given key
 *   3. Join the discovery topic and wait for at least one peer
 *   4. Walk drive.list('/') and write each file to <out-dir>
 */

import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const [, , keyArg, outArg] = process.argv
if (!keyArg || !outArg) {
  console.error('usage: node scripts/extract-drive.js <64-hex-key> <out-dir>')
  process.exit(2)
}
if (!/^[0-9a-f]{64}$/i.test(keyArg)) {
  console.error('error: key must be 64-char hex')
  process.exit(2)
}

const key = b4a.from(keyArg.toLowerCase(), 'hex')
const outDir = resolve(outArg)

console.log('🍐 Extracting drive')
console.log('   key:', keyArg)
console.log('   out:', outDir)
console.log()

// Throwaway storage so we don't pollute anything
const storage = mkdtempSync(join(tmpdir(), 'extract-drive-'))
const store = new Corestore(storage)
const swarm = new Hyperswarm()
const drive = new Hyperdrive(store, key)

swarm.on('connection', (conn) => store.replicate(conn))

await drive.ready()
console.log('   discoveryKey:', b4a.toString(drive.discoveryKey, 'hex').slice(0, 12) + '…')
console.log()

const discovery = swarm.join(drive.discoveryKey, { server: false, client: true })
process.stdout.write('   Looking for peers...')

await new Promise((resolve, reject) => {
  let connected = false
  const onConn = () => {
    if (connected) return
    connected = true
    process.stdout.write(' ✓ found peer\n')
    // Give a moment to start receiving blocks
    setTimeout(resolve, 1500)
  }
  swarm.on('connection', onConn)
  setTimeout(() => {
    if (!connected) {
      process.stdout.write(' ✗\n')
      reject(new Error('no peers within 30s — drive may be unreachable'))
    }
  }, 30000)
})
await discovery.flushed().catch(() => {})

// Walk the drive
console.log()
console.log('   Walking drive contents...')
mkdirSync(outDir, { recursive: true })

let count = 0
let bytes = 0
const errors = []

for await (const entry of drive.list('/', { recursive: true })) {
  if (!entry.value || !entry.value.blob) continue
  try {
    const buf = await drive.get(entry.key)
    if (!buf) continue
    const filePath = join(outDir, entry.key)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, buf)
    count += 1
    bytes += buf.length
    console.log(`     + ${entry.key} (${buf.length} bytes)`)
  } catch (err) {
    errors.push({ key: entry.key, error: err.message })
    console.error(`     ✗ ${entry.key}: ${err.message}`)
  }
}

console.log()
console.log(`✅ Extracted ${count} file(s), ${(bytes / 1024).toFixed(1)} KB total`)
if (errors.length) console.log(`   ${errors.length} error(s) — see above`)
console.log()
console.log(`   Output: ${outDir}`)

await swarm.destroy()
await store.close()
process.exit(0)
