/**
 * Pin a drive (the pearbrowser-desktop bundle itself, the welcome
 * landing-page drive, or any other 64-hex Hyperdrive / Pear project
 * key) onto the HiveRelay backbone.
 *
 * Why: drives normally rely on whoever published them being online to
 * serve. Pinning on HiveRelay means a multi-region always-on backbone
 * keeps the drive reachable even when the publisher is offline.
 *
 * What this does:
 *   1. Boot a tiny HiveRelayClient (separate storage so it doesn't
 *      collide with a running PearBrowser instance)
 *   2. Wait for at least one relay connection
 *   3. Send a signed seed-request for the given project key
 *   4. Print which relays accepted
 *   5. Exit
 *
 * The relays accept the request, join the swarm topic, and start
 * replicating the drive.
 *
 * Idempotent. Re-running just refreshes the seed window.
 *
 * Usage:
 *   # Pin the pearbrowser-desktop production channel (default)
 *   node scripts/pin-self-on-hiverelay.js
 *
 *   # Pin any other drive — pass the 64-hex project/drive key:
 *   node scripts/pin-self-on-hiverelay.js <64-hex-key> [friendly-name]
 *
 *   # Or via env var (legacy):
 *   PEAR_PROJECT_KEY=<64-hex> node scripts/pin-self-on-hiverelay.js
 */

import { HiveRelayClient } from 'p2p-hiverelay/client'
import { randomBytes } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// pearbrowser-desktop production channel project key. Get this from
// `pear info production .` — first line of output.
const DEFAULT_PROJECT_KEY = '8b21b577993ce0fc45036ca9011861e25f0a49fd4d68bcc655fb2690a03cb062'
const projectKey = process.env.PEAR_PROJECT_KEY || DEFAULT_PROJECT_KEY

// Seed parameters. Generous defaults — this is critical infra, not
// throwaway content.
const SEED_OPTS = {
  replicas: 5,                       // ask 5 relays to pin
  ttlDays: 365,                      // pin for a year
  maxStorage: 256 * 1024 * 1024,     // 256 MB cap per relay (the bundle is ~9 MB today)
  region: null                       // any region
}

async function main () {
  console.log('🍐 Pinning pearbrowser-desktop on HiveRelay')
  console.log('   project key:', projectKey)
  console.log('   replicas:', SEED_OPTS.replicas, '· ttl:', SEED_OPTS.ttlDays, 'days')
  console.log()

  // Use a throwaway storage dir so we don't collide with any running
  // PearBrowser instance's corestore.
  const storage = mkdtempSync(join(tmpdir(), 'pin-self-'))

  const client = new HiveRelayClient(storage)
  client.on('relay-connected', (info) => {
    const id = (info && info.publicKey)
      ? Buffer.from(info.publicKey).toString('hex').slice(0, 12)
      : 'unknown'
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

  // Wait briefly for relay discovery before broadcasting. The first
  // wave of relays usually shows up within 2-4 seconds.
  await new Promise((resolve) => {
    let connected = 0
    const onRelay = () => {
      connected += 1
      if (connected >= 1) {
        // Once at least one connected, give a couple more seconds for
        // the swarm to find more so seed() broadcasts to a wider set.
        setTimeout(resolve, 3000)
      }
    }
    client.on('relay-connected', onRelay)
    // Hard timeout — if no relays show up at all, fail loudly.
    setTimeout(() => {
      if (connected === 0) {
        console.error('  ✗ no relays discovered within 15s — is the DHT reachable?')
        process.exit(2)
      }
      resolve()
    }, 15000)
  })

  console.log()
  console.log('Broadcasting seed request to ' + client.relays.size + ' relays...')
  console.log()

  let acceptances = []
  try {
    acceptances = await client.seed(projectKey, SEED_OPTS)
  } catch (err) {
    console.error('  ✗ seed() threw:', err.message)
    process.exit(1)
  }

  console.log()
  if (acceptances.length === 0) {
    console.log('⚠️  No relays accepted the seed request.')
    console.log('   Possible reasons: every connected relay is at capacity, in')
    console.log('   review/allowlist mode, or rejected the publisher signature.')
    console.log('   The seed request is also published to the persistent registry,')
    console.log('   so relays scanning later may still pick it up.')
  } else {
    console.log('✅ ' + acceptances.length + ' relay(s) accepted the seed request:')
    for (const a of acceptances) {
      const id = (a && a.relayPubkey) ? Buffer.from(a.relayPubkey).toString('hex').slice(0, 12) : 'unknown'
      console.log('   · ' + id + '…')
    }
    console.log()
    console.log('   PearBrowser desktop is now pinned on the HiveRelay backbone.')
    console.log('   Anyone running `pear run pear://tco5k7h38uo…` will pull bytes')
    console.log('   from these relays whenever the publisher machine is offline.')
  }

  // Linger 2s so any in-flight messages flush before exit.
  await new Promise((r) => setTimeout(r, 2000))
  try { await client.destroy() } catch {}
  process.exit(0)
}

main().catch((err) => {
  console.error('fatal:', err && err.stack || err)
  process.exit(1)
})
