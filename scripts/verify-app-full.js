/**
 * Thorough reachability check for a drive — stronger than verify-pin.js.
 *
 * verify-pin.js samples ONE top-level blob; this one fetches a SPREAD of
 * blobs across the whole file tree (first, last, deepest, and evenly-spaced
 * picks) from a brand-new peer with no local cache. Run this with every
 * local `pear seed` daemon for the key STOPPED — then a success proves the
 * HiveRelay fleet (not your laptop) is serving the full content.
 *
 * Emits a single JSON result line prefixed with RESULT: for easy parsing.
 *
 * Usage:
 *   node scripts/verify-app-full.js homepage
 *   node scripts/verify-app-full.js peercord
 *   node scripts/verify-app-full.js keet
 *   node scripts/verify-app-full.js --key <64-hex> [--name x] [--samples 12] [--timeout 90]
 */

import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { APP_FULL_TARGETS, normalizeTargetName } from './lib/release-evidence-targets.mjs'

function parseArgs (argv) {
  const a = { key: null, name: 'app', samples: null, timeout: null, target: '', listTargets: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--key') a.key = argv[++i]
    else if (arg === '--name') a.name = argv[++i]
    else if (arg === '--samples') a.samples = parseInt(argv[++i], 10)
    else if (arg === '--timeout') a.timeout = parseInt(argv[++i], 10)
    else if (arg === '--target') a.target = argv[++i] || ''
    else if (arg === '--list-targets') a.listTargets = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else if (!arg.startsWith('-') && !a.target) a.target = arg
    else usage(2, `unknown option: ${arg}`)
  }

  if (a.listTargets) {
    console.log(Object.keys(APP_FULL_TARGETS).join('\n'))
    process.exit(0)
  }

  const targetName = normalizeTargetName(a.target)
  if (targetName) {
    const preset = APP_FULL_TARGETS[targetName]
    if (!preset) usage(2, `unknown target: ${a.target}`)
    a.key = a.key || preset.key
    if (a.name === 'app') a.name = preset.name
    if (!Number.isFinite(a.samples)) a.samples = preset.samples
    if (!Number.isFinite(a.timeout)) a.timeout = preset.timeout
    a.target = targetName
  }

  if (!Number.isFinite(a.samples)) a.samples = 12
  if (!Number.isFinite(a.timeout)) a.timeout = 90
  return a
}

function usage (code, message = '') {
  if (message) console.error('error:', message)
  console.error('usage: node scripts/verify-app-full.js <homepage|peercord|keet>')
  console.error('   or: node scripts/verify-app-full.js --key <64-hex> [--name x] [--samples 12] [--timeout 90]')
  process.exit(code)
}

const args = parseArgs(process.argv.slice(2))
if (!/^[0-9a-f]{64}$/i.test(args.key || '')) {
  console.error('error: --key must be 64-char hex')
  process.exit(2)
}

const PEER_TIMEOUT_MS = 30_000
const result = {
  target: args.target || null,
  name: args.name,
  key: args.key,
  peers: 0,
  metaLength: 0,
  entries: 0,
  sampled: 0,
  blobsPresent: 0,
  blobsMissing: 0,
  bytes: 0,
  ok: false,
  error: null
}

const storage = mkdtempSync(join(tmpdir(), 'verify-full-'))
const store = new Corestore(storage)
const swarm = new Hyperswarm()
const drive = new Hyperdrive(store, b4a.from(args.key, 'hex'))
swarm.on('connection', (conn) => { result.peers++; store.replicate(conn) })

function emit (code) {
  console.log('RESULT: ' + JSON.stringify(result))
  swarm.destroy().catch(() => {})
  store.close().catch(() => {})
  try { rmSync(storage, { recursive: true, force: true }) } catch {}
  process.exit(code)
}

async function withTimeout (p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timed out')), ms))
  ])
}

async function main () {
  await drive.ready()
  swarm.join(drive.discoveryKey, { server: false, client: true })

  await withTimeout(
    new Promise((res) => swarm.once('connection', res)),
    PEER_TIMEOUT_MS, 'peer discovery'
  )
  await withTimeout(drive.core.update({ wait: true }), 20_000, 'metadata update')
  result.metaLength = drive.core.length

  // Collect all current entries (recursive).
  const entries = []
  for await (const e of drive.list('/', { recursive: true })) {
    if (e?.value?.blob?.byteLength > 0) entries.push(e)
  }
  result.entries = entries.length
  if (entries.length === 0) throw new Error('drive has no file entries')

  // Spread sample: first, last, and evenly-spaced picks across the listing,
  // so we exercise blobs from all over the tree — not just the top.
  const n = Math.min(args.samples, entries.length)
  const picks = new Set()
  for (let i = 0; i < n; i++) picks.add(Math.floor((i * (entries.length - 1)) / Math.max(1, n - 1)))
  const sample = [...picks].map((i) => entries[i])
  result.sampled = sample.length

  for (const e of sample) {
    try {
      const buf = await withTimeout(drive.get(e.key), 20_000, 'blob ' + e.key)
      if (buf && buf.length > 0) { result.blobsPresent++; result.bytes += buf.length }
      else result.blobsMissing++
    } catch (_) {
      result.blobsMissing++
    }
  }

  result.ok = result.peers > 0 && result.entries > 0 && result.blobsMissing === 0 && result.blobsPresent > 0
  emit(result.ok ? 0 : 1)
}

main().catch((err) => { result.error = err.message; emit(1) })
