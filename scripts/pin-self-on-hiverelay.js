/**
 * Pin a non-executable Hyperdrive artifact (a site, catalogue, or release
 * evidence drive) onto the HiveRelay backbone.
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
 *   # Pin an explicit v3-compatible content or evidence drive:
 *   node scripts/pin-self-on-hiverelay.js <64-hex-key> [friendly-name]
 *
 *   # Or via env var:
 *   HYPERDRIVE_KEY=<64-hex> node scripts/pin-self-on-hiverelay.js
 */

// The client SDK lives in the dedicated `p2p-hiverelay-client` package. Keep
// this script aligned with the current browser dependency pins.
import { HiveRelayClient } from 'p2p-hiverelay-client'
import { randomBytes } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const projectKey = process.argv[2] || process.env.HYPERDRIVE_KEY
if (!/^[0-9a-f]{64}$/i.test(projectKey || '')) {
  console.error('usage: node scripts/pin-self-on-hiverelay.js <64-hex-hyperdrive-key>')
  console.error('       HYPERDRIVE_KEY=<64-hex> node scripts/pin-self-on-hiverelay.js')
  console.error('A legacy pear:// executable key is not a valid v3 release target.')
  process.exit(2)
}

// Seed parameters. Generous defaults — this is critical infra, not
// throwaway content.
//
// IMPORTANT: maxStorage must exceed the artifact's full size (metadata +
// blobs). Keep the cap at least 2x the observed size with future headroom.
// A partial seed is availability evidence failure; it is never a substitute
// for native package signature verification or a local install.
const SEED_OPTS = {
  replicas: 5,                       // ask 5 relays to pin
  ttlDays: 365,                      // pin for a year
  maxStorage: 1024 * 1024 * 1024,    // 1 GB cap per relay (drive ~365 MB today)
  region: null                       // any region
}

async function main () {
  console.log('🍐 Pinning a v3 content/evidence drive on HiveRelay')
  console.log('   drive key:', projectKey)
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

  // Current p2p-hiverelay-client emits:
  //
  // seed-cap-warning: SDK-side check, fires at seed() time if our
  //   declared maxStorage is smaller than the drive bytes the SDK can
  //   observe locally. Catches a too-small cap BEFORE it goes over
  //   the wire.
  // seed-aborted:    relay-side check, fires after the relay syncs
  //   metadata and discovers the drive is bigger than maxStorage.
  //   Relay unseeds locally and emits this so the publisher knows.
  //
  // These events are the loud version of the silent partial-pin bug
  // documented at hiverelay/docs/FEEDBACK-PEARBROWSER-PIN-CAP-FAILURE.md
  client.on('seed-cap-warning', (info) => {
    console.warn('  ⚠ seed-cap-warning (SDK):')
    console.warn('     observed drive bytes : ' + (info.observedBytes ?? '?'))
    console.warn('     declared maxStorage  : ' + (info.declaredCap ?? '?'))
    console.warn('     recommended          : ' + (info.recommendedCap ?? '?'))
    if (info.hint) console.warn('     hint: ' + info.hint)
  })
  client.on('seed-aborted', (info) => {
    console.error('  ✗ seed-aborted (relay):', info.reason || 'unknown')
    if (info.driveBytes) console.error('     drive bytes : ' + info.driveBytes)
    if (info.cap) console.error('     our cap     : ' + info.cap)
    if (info.recommendedCap) console.error('     recommended : ' + info.recommendedCap)
    if (info.hint) console.error('     hint: ' + info.hint)
    process.exitCode = 2
  })

  // `seed-cap-raised` fires when a re-pin successfully bumps an existing
  // entry's maxStorage. Confirms the new opts actually took effect and
  // eagerReplicate restarted.
  client.on('seed-cap-raised', (info) => {
    console.log('  ↑ seed-cap-raised (relay):')
    if (info.previousCap) console.log('     previous cap : ' + info.previousCap)
    if (info.newCap)      console.log('     new cap      : ' + info.newCap)
    if (info.source)      console.log('     source       : ' + info.source)
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
    console.log('   The requested drive is now pinned on the HiveRelay backbone.')
    console.log('   This proves availability only; native packages still require')
    console.log('   their signed AppRelease v2 record and local verification.')
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
