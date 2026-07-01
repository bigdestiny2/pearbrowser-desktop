/**
 * Verify that a pinned drive is actually being served by the network.
 *
 * Different from check-relays.js (which only proves relays are
 * reachable) and pin-self-on-hiverelay.js (which only proves they
 * accept seed requests). This script does the real round-trip:
 *
 *   1. Boot a fresh Corestore + Hyperswarm with NO local cache
 *   2. Open the Hyperdrive at the production key
 *   3. Join the swarm and wait for any peer (relay or otherwise)
 *   4. Read the drive's current length and a sample blob
 *   5. Compare against an expected length, if provided
 *   6. Exit 0 on success, non-zero on failure
 *
 * If this exits 0, the drive is genuinely available from a third
 * party — meaning a fresh `pear run pear://tco5...` from anywhere
 * will find content.
 *
 * Usage:
 *   # Verify the pearbrowser-desktop production drive is reachable
 *   node scripts/verify-pin.js
 *
 *   # Verify a specific length is being served (use after release)
 *   node scripts/verify-pin.js --expect 4914
 *
 *   # Also ask upgraded HiveRelay relays for signed proveSeeded evidence
 *   node scripts/verify-pin.js --expect 4914 --hiverelay
 *
 *   # Verify any other key
 *   node scripts/verify-pin.js --key <64-hex>
 *
 * Designed to be called from CI / release-prod.sh — fails loudly if
 * the release hasn't propagated to the network within the timeout.
 */

import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'
import { HiveRelayClient } from 'p2p-hiverelay-client'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const DEFAULT_KEY = '8b21b577993ce0fc45036ca9011861e25f0a49fd4d68bcc655fb2690a03cb062'
const PEER_TIMEOUT_MS = 30_000
const LENGTH_TIMEOUT_MS = 20_000
const BLOB_SAMPLE_TIMEOUT_MS = 20_000
const BLOB_LIST_TIMEOUT_MS = 20_000
const HIVERELAY_TIMEOUT_MS = 45_000
const HIVERELAY_PROOF_TIMEOUT_MS = 30_000
const DEFAULT_SAMPLE_PATHS = ['/index.html', '/package.json', '/pear.json']

function parseArgs (argv) {
  const args = {
    key: DEFAULT_KEY,
    expect: null,
    hiverelay: false,
    requireHiverelay: false,
    verifySeededFallback: false,
    samples: 3
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--key') args.key = argv[++i]
    else if (argv[i] === '--expect') args.expect = parseInt(argv[++i], 10)
    else if (argv[i] === '--hiverelay') args.hiverelay = true
    else if (argv[i] === '--require-hiverelay') {
      args.hiverelay = true
      args.requireHiverelay = true
    } else if (argv[i] === '--verify-seeded-fallback') {
      args.verifySeededFallback = true
    } else if (argv[i] === '--samples') {
      args.samples = Math.max(1, Math.min(parseInt(argv[++i], 10) || 3, 16))
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
if (!/^[0-9a-f]{64}$/i.test(args.key)) {
  console.error('error: key must be 64-char hex')
  process.exit(2)
}

console.log('🍐 Verifying drive is reachable from the network')
console.log('   key:', args.key)
if (args.expect != null) console.log('   expect length ≥', args.expect)
console.log()

const storage = mkdtempSync(join(tmpdir(), 'verify-pin-'))
const store = new Corestore(storage)
const swarm = new Hyperswarm()
const drive = new Hyperdrive(store, b4a.from(args.key, 'hex'))

swarm.on('connection', (conn) => store.replicate(conn))

let peerCount = 0
swarm.on('connection', () => { peerCount += 1 })

const cleanup = async (code) => {
  try { await swarm.destroy() } catch {}
  try { await store.close() } catch {}
  try { rmSync(storage, { recursive: true, force: true }) } catch {}
  process.exit(code)
}

function waitForHiveRelay (client, timeoutMs) {
  if (client.relays && client.relays.size > 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanupListeners()
      reject(new Error(`no HiveRelay relays discovered within ${timeoutMs / 1000}s`))
    }, timeoutMs)
    const onRelay = () => {
      cleanupListeners()
      resolve()
    }
    const cleanupListeners = () => {
      clearTimeout(timer)
      client.off('relay-connected', onRelay)
    }
    client.on('relay-connected', onRelay)
  })
}

function summarizeProofFailures (reports) {
  return reports
    .slice(0, 5)
    .map((r) => {
      const reason = r.proofReason || r.verifyReason || r.error || 'unknown'
      return r.relay.slice(0, 12) + ':' + reason
    })
    .join(', ')
}

async function collectSampleEntries (drive) {
  const entries = []
  for await (const entry of drive.list('/', { recursive: false })) {
    entries.push(entry)
    if (entries.length >= 5) break
  }
  return entries
}

async function getWithTimeout (drive, path) {
  const buf = await Promise.race([
    drive.get(path),
    new Promise((_, reject) => setTimeout(() =>
      reject(new Error('blob fetch timed out')),
      BLOB_SAMPLE_TIMEOUT_MS))
  ])
  return { key: path, buf }
}

async function verifyHiveRelaySeed (args) {
  const proofStorage = mkdtempSync(join(tmpdir(), 'verify-pin-hiverelay-'))
  const client = new HiveRelayClient(proofStorage)
  const reports = []

  try {
    await client.start()
    await waitForHiveRelay(client, HIVERELAY_TIMEOUT_MS)

    const relays = [...client.relays.keys()]
    console.log('   → HiveRelay proof check (' + relays.length + ' relay connection' + (relays.length === 1 ? '' : 's') + ')...')

    for (const relay of relays) {
      const report = { relay }
      try {
        const proof = await client.proveSeeded(args.key, {
          relay,
          samples: args.samples,
          timeout: HIVERELAY_PROOF_TIMEOUT_MS
        })
        report.proofReason = proof.ok ? null : ((proof.samples || []).map(s => s.reason).find(Boolean) || proof.reason || 'proof-failed')
        if (proof.ok && (args.expect == null || proof.head >= args.expect)) {
          console.log('     ✓ proveSeeded', relay.slice(0, 12) + '…', proof.passed + '/' + proof.total, 'samples at head', proof.head)
          return { mode: 'proveSeeded', relay, head: proof.head, samples: proof.total }
        }
      } catch (err) {
        report.proofReason = err.message
      }

      if (args.verifySeededFallback) {
        try {
          const verdict = await client.verifySeeded(args.key, {
            relay,
            timeout: HIVERELAY_PROOF_TIMEOUT_MS
          })
          report.verifyReason = verdict.complete ? null : 'complete=' + verdict.complete + ',relayFull=' + verdict.relayHasFullLength
          if (verdict.complete && (args.expect == null || verdict.metaLength >= args.expect)) {
            console.log('     ✓ verifySeeded', relay.slice(0, 12) + '…', 'length', verdict.metaLength)
            return { mode: 'verifySeeded', relay, head: verdict.metaLength, samples: 0 }
          }
        } catch (err) {
          report.verifyReason = err.message
        }
      }

      reports.push(report)
    }

    const detail = summarizeProofFailures(reports)
    throw new Error('no connected relay produced a passing seed proof' + (detail ? ' (' + detail + ')' : ''))
  } finally {
    try { await client.destroy() } catch {}
    try { rmSync(proofStorage, { recursive: true, force: true }) } catch {}
  }
}

async function main () {
  await drive.ready()
  console.log('   discoveryKey:', b4a.toString(drive.discoveryKey, 'hex').slice(0, 12) + '…')

  const discovery = swarm.join(drive.discoveryKey, { server: false, client: true })
  process.stdout.write('   → waiting for peers...')

  await Promise.race([
    new Promise((resolve) => swarm.once('connection', () => {
      process.stdout.write(' ✓\n')
      resolve()
    })),
    new Promise((_, reject) => setTimeout(() =>
      reject(new Error(`no peers within ${PEER_TIMEOUT_MS / 1000}s — pin is not being served`)),
      PEER_TIMEOUT_MS))
  ])

  await discovery.flushed().catch(() => {})

  process.stdout.write('   → reading drive length...')
  await Promise.race([
    drive.core.update({ wait: true }),
    new Promise((_, reject) => setTimeout(() =>
      reject(new Error(`couldn't read drive length within ${LENGTH_TIMEOUT_MS / 1000}s`)),
      LENGTH_TIMEOUT_MS))
  ])
  const length = drive.core.length
  process.stdout.write(' length=' + length + '\n')

  if (args.expect != null && length < args.expect) {
    console.log()
    console.error('✗ FAIL — drive length ' + length + ' < expected ' + args.expect)
    console.error('   the release has not propagated to the swarm yet')
    await cleanup(1)
    return
  }

  // Sample one blob to confirm content (not just metadata) replicates
  process.stdout.write('   → sampling a blob...')
  try {
    let sampleResult = null
    const sampleErrors = []
    for (const path of DEFAULT_SAMPLE_PATHS) {
      try {
        sampleResult = await getWithTimeout(drive, path)
        if (sampleResult.buf?.length > 0) break
      } catch (err) {
        sampleErrors.push(path + ': ' + err.message)
      }
      sampleResult = null
    }

    let entries = []
    if (!sampleResult) {
      entries = await Promise.race([
        collectSampleEntries(drive),
        new Promise((_, reject) => setTimeout(() =>
          reject(new Error('blob listing timed out')),
          BLOB_LIST_TIMEOUT_MS))
      ])
    }
    if (!sampleResult) {
      if (entries.length === 0) {
        throw new Error('drive has no top-level entries' + (sampleErrors.length ? ' (' + sampleErrors.join('; ') + ')' : ''))
      }
      const sample = entries.find((e) => e.value?.blob?.byteLength > 0) || entries[0]
      sampleResult = await getWithTimeout(drive, sample.key)
    }
    process.stdout.write(' ✓ ' + (sampleResult.buf?.length || 0) + ' bytes from ' + sampleResult.key + '\n')
  } catch (err) {
    process.stdout.write(' ✗\n')
    console.error('   blob sample failed:', err.message)
    console.error('   metadata is reachable but content blocks are not — partial pin')
    await cleanup(1)
    return
  }

  let hiveRelayProof = null
  if (args.hiverelay) {
    try {
      hiveRelayProof = await verifyHiveRelaySeed(args)
    } catch (err) {
      if (args.requireHiverelay) {
        console.error('   HiveRelay proof failed:', err.message)
        await cleanup(1)
        return
      }
      console.warn('   HiveRelay proof unavailable:', err.message)
      console.warn('   Fresh-peer reachability passed; rerun with --require-hiverelay once storage-proof is enabled on the relay fleet.')
    }
  }

  console.log()
  console.log('✅ Drive is fully reachable')
  console.log('   length:    ' + length)
  console.log('   peers:     ' + peerCount + ' connected during check')
  if (hiveRelayProof) {
    console.log('   relay:     ' + hiveRelayProof.mode + ' via ' + hiveRelayProof.relay.slice(0, 12) + '…')
  }
  console.log()
  console.log('   `pear run pear://...` from anywhere will find this drive.')

  await cleanup(0)
}

main().catch(async (err) => {
  console.error()
  console.error('✗ FAIL —', err.message)
  await cleanup(1)
})
