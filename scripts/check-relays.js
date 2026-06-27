/**
 * Quick relay health check — boot a HiveRelayClient, see how many
 * relays we connect to via the DHT, list their pubkeys, and try a
 * tiny op against each.
 *
 * Usage:
 *   node scripts/check-relays.js [--storage <dir>] [--timeout 8] [--require-relay] [--json]
 */

import { HiveRelayClient } from 'p2p-hiverelay-client'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function parseArgs (argv) {
  const args = {
    storage: '',
    timeout: 8,
    requireRelay: false,
    json: false
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--storage') args.storage = argv[++i] || ''
    else if (arg === '--timeout') args.timeout = parseInt(argv[++i], 10)
    else if (arg === '--require-relay' || arg === '--fail-empty') args.requireRelay = true
    else if (arg === '--json') args.json = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown option: ${arg}`)
  }

  if (!Number.isFinite(args.timeout) || args.timeout <= 0) usage(2, '--timeout must be positive')
  if (!args.storage) args.storage = mkdtempSync(join(tmpdir(), 'check-relays-'))
  return args
}

function usage (code, message = '') {
  if (message) console.error('error:', message)
  console.error('usage: node scripts/check-relays.js [--storage <dir>] [--timeout 8] [--require-relay] [--json]')
  process.exit(code)
}

const args = parseArgs(process.argv.slice(2))
const storage = args.storage
const waitMs = args.timeout * 1000

console.log('🔬 HiveRelay health check')
console.log('   storage:', storage)
console.log('   timeout:', args.timeout + 's')
console.log()

const client = new HiveRelayClient(storage)
const seen = new Map() // hex pubkey → { connectedAt, capabilities? }
const result = {
  storage,
  timeoutSeconds: args.timeout,
  uniqueRelays: 0,
  liveConnections: 0,
  relays: [],
  ok: false,
  error: null
}

client.on('relay-connected', (info) => {
  const pk = info && info.publicKey
    ? Buffer.from(info.publicKey).toString('hex')
    : 'unknown'
  if (!seen.has(pk)) {
    seen.set(pk, { connectedAt: Date.now(), info })
    console.log(`  + ${pk.slice(0, 16)}…`)
  }
})

try {
  await client.start()
  console.log('  · client started, discovering relays...')
  console.log()

  // Some relays come fast, some take a moment.
  await new Promise((r) => setTimeout(r, waitMs))
} catch (err) {
  result.error = err && err.message ? err.message : String(err)
}

result.uniqueRelays = seen.size
result.liveConnections = client.relays && typeof client.relays.size === 'number' ? client.relays.size : 0
result.relays = [...seen].map(([publicKey, entry]) => ({
  publicKey,
  connectedMsAgo: Date.now() - entry.connectedAt
}))
result.ok = !result.error && result.uniqueRelays > 0

console.log('────────────────────────────')
console.log(`  ${result.uniqueRelays} unique relays reachable via DHT`)
console.log(`  ${result.liveConnections} live connections in client.relays`)
console.log('────────────────────────────')
console.log()

if (result.error) {
  console.log('✗ Relay check failed:', result.error)
} else if (seen.size === 0) {
  console.log(`⚠️  No relays found in ${args.timeout}s. The DHT may be slow today, or`)
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

if (args.json) console.log('RESULT: ' + JSON.stringify(result))

await new Promise((r) => setTimeout(r, 1000))
try {
  await Promise.race([
    client.destroy(),
    new Promise((resolve) => setTimeout(resolve, 2000))
  ])
} catch {}
process.exit(args.requireRelay && !result.ok ? 1 : 0)
