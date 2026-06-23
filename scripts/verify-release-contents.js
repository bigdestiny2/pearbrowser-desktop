/**
 * Verify release metadata from a fresh peer, including paths that must be absent.
 *
 * Usage:
 *   node scripts/verify-release-contents.js --expect 18552 \
 *     --missing /.landing-seed.mjs --missing /docs --missing /scripts
 */

import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const DEFAULT_KEY = '8b21b577993ce0fc45036ca9011861e25f0a49fd4d68bcc655fb2690a03cb062'
const PEER_TIMEOUT_MS = 30_000
const LENGTH_TIMEOUT_MS = 20_000
const SCAN_TIMEOUT_MS = 90_000

function normalizePath (path) {
  if (!path) return null
  const prefixed = path.startsWith('/') ? path : '/' + path
  return prefixed.length > 1 ? prefixed.replace(/\/+$/, '') : prefixed
}

function parseArgs (argv) {
  const args = { key: DEFAULT_KEY, expect: null, missing: [] }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--key') args.key = argv[++i]
    else if (argv[i] === '--expect') args.expect = parseInt(argv[++i], 10)
    else if (argv[i] === '--missing') args.missing.push(normalizePath(argv[++i]))
  }
  args.missing = args.missing.filter(Boolean)
  return args
}

function isUnderPath (entryKey, path) {
  return entryKey === path || entryKey.startsWith(path + '/')
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  if (!/^[0-9a-f]{64}$/i.test(args.key)) {
    console.error('error: key must be 64-char hex')
    process.exit(2)
  }

  const storage = mkdtempSync(join(tmpdir(), 'verify-release-contents-'))
  const store = new Corestore(storage)
  const swarm = new Hyperswarm()
  const drive = new Hyperdrive(store, b4a.from(args.key, 'hex'))

  const cleanup = async (code) => {
    try { await swarm.destroy() } catch {}
    try { await store.close() } catch {}
    try { rmSync(storage, { recursive: true, force: true }) } catch {}
    process.exit(code)
  }

  swarm.on('connection', (conn) => store.replicate(conn))

  try {
    await drive.ready()
    console.log('🍐 Verifying release contents from the network')
    console.log('   key:', args.key)
    if (args.expect != null) console.log('   expect length ≥', args.expect)
    if (args.missing.length) console.log('   missing:', args.missing.join(', '))
    console.log()

    const discovery = swarm.join(drive.discoveryKey, { server: false, client: true })
    process.stdout.write('   → waiting for peers...')
    await Promise.race([
      new Promise((resolve) => swarm.once('connection', () => {
        process.stdout.write(' ✓\n')
        resolve()
      })),
      new Promise((_, reject) => setTimeout(() =>
        reject(new Error(`no peers within ${PEER_TIMEOUT_MS / 1000}s`)),
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
      throw new Error(`drive length ${length} < expected ${args.expect}`)
    }

    const foundMissing = new Set()
    let count = 0
    process.stdout.write('   → scanning metadata...')
    await Promise.race([
      (async () => {
        for await (const entry of drive.list('/', { recursive: true })) {
          count += 1
          for (const path of args.missing) {
            if (isUnderPath(entry.key, path)) foundMissing.add(path)
          }
        }
      })(),
      new Promise((_, reject) => setTimeout(() =>
        reject(new Error(`metadata scan timed out after ${SCAN_TIMEOUT_MS / 1000}s`)),
      SCAN_TIMEOUT_MS))
    ])
    process.stdout.write(' ' + count + ' entries\n')

    if (foundMissing.size) {
      throw new Error('release still contains forbidden path(s): ' + Array.from(foundMissing).join(', '))
    }

    console.log()
    console.log('✅ Release contents verified')
    console.log('   length:  ' + length)
    console.log('   entries: ' + count)
    await cleanup(0)
  } catch (err) {
    console.error()
    console.error('✗ FAIL —', err.message)
    await cleanup(1)
  }
}

main()
