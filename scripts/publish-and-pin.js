/**
 * Publish a directory as a Hyperdrive AND pin it on HiveRelay in one
 * step. Works for both new drives and re-publishing to an existing key
 * (when you bring the original publisher storage along).
 *
 * Usage:
 *
 *   # New drive — fresh key generated, pinned on relays
 *   node scripts/publish-and-pin.js <source-dir> [--name <app-name>]
 *
 *   # Update existing drive (must have the original publisher storage):
 *   node scripts/publish-and-pin.js <source-dir> \
 *     --key <64-hex-existing-key> \
 *     --storage <path-to-original-publisher-storage>
 *
 *   # Examples:
 *   node scripts/publish-and-pin.js ./recovered-homepage --name pearbrowser-home
 *   node scripts/publish-and-pin.js ./p2p-builders --name p2p-builders
 *   node scripts/publish-and-pin.js ./hiverelay-site --name hiverelay
 *
 * Output: prints the drive key + how many relays accepted the seed,
 * so you can paste the `hyper://<key>/` URL anywhere it's needed.
 *
 * Same engine as scripts/pin-self-on-hiverelay.js — uses
 * HiveRelayClient.publish() with autoSeed: true so the publish call
 * itself broadcasts the signed seed-request to all connected relays.
 */

import { HiveRelayClient } from 'p2p-hiverelay-client'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { existsSync, statSync } from 'node:fs'

// Tiny CLI parser — keeps the script standalone (no minimist dep).
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
const sourceDir = argv._[0]
const explicitKey = argv.flags.key || null
const explicitStorage = argv.flags.storage || null
const appName = argv.flags.name || (sourceDir && sourceDir.split(/[\\/]/).pop()) || 'unnamed'

if (!sourceDir) {
  console.error('usage: node scripts/publish-and-pin.js <source-dir> [--name <app-name>] [--key <64-hex>] [--storage <publisher-storage-dir>]')
  process.exit(2)
}
const dirAbs = resolve(sourceDir)
if (!existsSync(dirAbs) || !statSync(dirAbs).isDirectory()) {
  console.error('error: source directory not found:', dirAbs)
  process.exit(2)
}
if (explicitKey && !/^[0-9a-f]{64}$/i.test(explicitKey)) {
  console.error('error: --key must be 64-char hex')
  process.exit(2)
}
if (explicitKey && !explicitStorage) {
  console.error('error: --key requires --storage (the corestore that originally signed the drive)')
  process.exit(2)
}
if (explicitStorage && !existsSync(explicitStorage)) {
  console.error('error: --storage path does not exist:', explicitStorage)
  process.exit(2)
}

// Pick storage: the original publisher's if we're updating an existing
// drive (to preserve the signing key), otherwise a throwaway temp dir
// so each new publish gets a brand-new identity.
const storage = explicitStorage
  ? resolve(explicitStorage)
  : mkdtempSync(join(tmpdir(), 'publish-pin-'))

console.log('🍐 Publishing + pinning on HiveRelay')
console.log('   source:', dirAbs)
console.log('   name:', appName)
console.log('   storage:', storage, explicitStorage ? '(existing publisher)' : '(throwaway)')
if (explicitKey) console.log('   updating existing key:', explicitKey)
console.log()

async function main () {
  const client = new HiveRelayClient(storage)

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
  console.log('  · client started, discovering relays...')

  // Wait briefly for relay discovery — same pattern as pin-self.
  await new Promise((resolve) => {
    let connected = 0
    const onRelay = () => {
      connected += 1
      if (connected >= 1) setTimeout(resolve, 3000)
    }
    client.on('relay-connected', onRelay)
    setTimeout(() => {
      if (connected === 0) {
        console.error('  ✗ no relays discovered within 15s — DHT issue?')
        process.exit(2)
      }
      resolve()
    }, 15000)
  })

  console.log()
  console.log('Publishing to ' + client.relays.size + ' connected relays...')
  console.log()

  const opts = {
    appId: appName,
    seed: true,
    replicas: 5,
    ttlDays: 365,
    maxStorage: 256 * 1024 * 1024
  }
  if (explicitKey) opts.key = explicitKey

  const drive = await client.publish(dirAbs, opts)
  const driveKey = Buffer.from(drive.key).toString('hex')
  // The 'seeded' event has already printed acceptances by this point
  // (it fires from inside publish() when seed completes).

  console.log()
  console.log('✅ Published — copy the URL below:')
  console.log()
  console.log('     hyper://' + driveKey + '/')
  console.log()
  console.log('   Pin status: see "seeded" line above for relay acceptances.')
  console.log('   To update this drive later, re-run with:')
  console.log(`     --key ${driveKey} --storage ${storage}`)
  console.log()

  await new Promise((r) => setTimeout(r, 2000))
  try { await client.destroy() } catch {}
  process.exit(0)
}

main().catch((err) => {
  console.error('fatal:', err && err.stack || err)
  process.exit(1)
})
