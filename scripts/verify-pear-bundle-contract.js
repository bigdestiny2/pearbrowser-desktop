/**
 * Verify a Pear/Hyperdrive app bundle contract without executing third-party
 * code. This is useful for launch-mode evidence: read pear.json and selected
 * source files from a fresh peer, then assert the metadata/text shape.
 *
 * Usage:
 *   node scripts/verify-pear-bundle-contract.js peercord-linux
 *   node scripts/verify-pear-bundle-contract.js peercord-windows
 *   node scripts/verify-pear-bundle-contract.js \
 *     --key <64-hex> --name peercord \
 *     --app-root by-arch/linux-x64/app/peercord/resources/app \
 *     --expect-type desktop --expect-main index.js \
 *     --contains index.js:BrowserWindow \
 *     --absent index.js:Pear.worker.pipe
 */

import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'
import { mkdtempSync, rmSync } from 'node:fs'
import { join, posix as posixPath } from 'node:path'
import { tmpdir } from 'node:os'
import { BUNDLE_CONTRACT_TARGETS, normalizeTargetName } from './lib/release-evidence-targets.mjs'

function parseArgs (argv) {
  const args = {
    key: '',
    name: 'app',
    expectType: '',
    expectMain: '',
    appRoot: '',
    contains: [],
    absent: [],
    timeout: null,
    target: '',
    listTargets: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--key') args.key = argv[++i] || ''
    else if (arg === '--name') args.name = argv[++i] || args.name
    else if (arg === '--expect-type') args.expectType = argv[++i] || ''
    else if (arg === '--expect-main') args.expectMain = argv[++i] || ''
    else if (arg === '--app-root') args.appRoot = (argv[++i] || '').replace(/^\/+|\/+$/g, '')
    else if (arg === '--contains') args.contains.push(parseNeedle(argv[++i] || ''))
    else if (arg === '--absent') args.absent.push(parseNeedle(argv[++i] || ''))
    else if (arg === '--timeout') args.timeout = parseInt(argv[++i], 10)
    else if (arg === '--target') args.target = argv[++i] || ''
    else if (arg === '--list-targets') args.listTargets = true
    else if (arg === '-h' || arg === '--help') failUsage('', 0)
    else if (!arg.startsWith('-') && !args.target) args.target = arg
    else failUsage(`unknown option: ${arg}`)
  }

  if (args.listTargets) {
    console.log(Object.keys(BUNDLE_CONTRACT_TARGETS).join('\n'))
    process.exit(0)
  }

  const targetName = normalizeTargetName(args.target)
  if (targetName) {
    const preset = BUNDLE_CONTRACT_TARGETS[targetName]
    if (!preset) failUsage(`unknown target: ${args.target}`)
    args.key = args.key || preset.key
    if (args.name === 'app') args.name = preset.name
    args.appRoot = args.appRoot || preset.appRoot
    args.expectType = args.expectType || preset.expectType
    args.expectMain = args.expectMain || preset.expectMain
    if (args.contains.length === 0) args.contains = preset.contains.map((item) => ({ ...item }))
    if (args.absent.length === 0) args.absent = preset.absent.map((item) => ({ ...item }))
    if (!Number.isFinite(args.timeout)) args.timeout = preset.timeout
    args.target = targetName
  }

  if (!Number.isFinite(args.timeout)) args.timeout = 90
  return args
}

function parseNeedle (spec) {
  const i = spec.indexOf(':')
  if (i <= 0 || i === spec.length - 1) throw new Error(`invalid file:text spec: ${spec}`)
  return { file: spec.slice(0, i), text: spec.slice(i + 1) }
}

function failUsage (msg, code = 2) {
  if (msg) console.error('error:', msg)
  console.error('usage: node scripts/verify-pear-bundle-contract.js <peercord-linux|peercord-windows>')
  console.error('   or: node scripts/verify-pear-bundle-contract.js --key <64-hex> [--app-root path] [--expect-type desktop] [--expect-main index.js] [--contains file:text] [--absent file:text]')
  process.exit(code)
}

const args = parseArgs(process.argv.slice(2))
if (!/^[0-9a-f]{64}$/i.test(args.key || '')) failUsage('--key must be 64-char hex')
if (!Number.isFinite(args.timeout) || args.timeout <= 0) failUsage('--timeout must be positive')

const result = {
  target: args.target || null,
  name: args.name,
  key: args.key,
  peers: 0,
  metaLength: 0,
  entries: 0,
  appRoot: args.appRoot,
  pearJson: null,
  filesChecked: [],
  ok: false,
  errors: []
}

const storage = mkdtempSync(join(tmpdir(), 'verify-pear-bundle-'))
const store = new Corestore(storage)
const swarm = new Hyperswarm()
const drive = new Hyperdrive(store, b4a.from(args.key, 'hex'))

swarm.on('connection', (conn) => {
  result.peers++
  store.replicate(conn)
})

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
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
  ])
}

let driveEntries = null

async function listEntries () {
  if (driveEntries) return driveEntries
  driveEntries = []
  for await (const entry of drive.list('/', { recursive: true })) {
    if (entry?.value?.blob) driveEntries.push(entry.key.replace(/^\/+/, ''))
  }
  result.entries = driveEntries.length
  return driveEntries
}

async function resolvePath (file, appRoot = '') {
  const clean = file.replace(/^\/+/, '')
  const candidates = []
  if (appRoot) candidates.push(posixPath.join(appRoot, clean))
  candidates.push(clean)
  for (const candidate of candidates) {
    const variants = candidate.startsWith('/') ? [candidate, candidate.slice(1)] : [candidate, '/' + candidate]
    for (const variant of variants) {
      const buf = await drive.get(variant).catch(() => null)
      if (buf) return { path: candidate.replace(/^\/+/, ''), text: b4a.toString(buf, 'utf8') }
    }
  }

  const entries = await listEntries()
  const matches = entries.filter((entry) => entry === clean || entry.endsWith('/' + clean))
  if (matches.length === 1) {
    const buf = await drive.get(matches[0]).catch(() => null)
    if (buf) return { path: matches[0], text: b4a.toString(buf, 'utf8') }
  }
  if (matches.length > 1) throw new Error(`ambiguous file ${file}: ${matches.slice(0, 8).join(', ')}`)
  throw new Error(`missing file: ${file}`)
}

async function getText (file, appRoot = '') {
  const resolved = await resolvePath(file, appRoot)
  return resolved
}

async function getTextAtPath (file) {
  const variants = file.startsWith('/') ? [file, file.slice(1)] : [file, '/' + file]
  for (const candidate of variants) {
    const buf = await drive.get(candidate).catch(() => null)
    if (buf) return b4a.toString(buf, 'utf8')
  }
  throw new Error(`missing file: ${file}`)
}

function checkEqual (label, actual, expected) {
  if (!expected) return
  if (actual !== expected) result.errors.push(`${label} mismatch: expected ${expected}, got ${actual || '(missing)'}`)
}

async function main () {
  await drive.ready()
  swarm.join(drive.discoveryKey, { server: false, client: true })
  await withTimeout(new Promise((resolve) => swarm.once('connection', resolve)), 30_000, 'peer discovery')
  await withTimeout(drive.core.update({ wait: true }), 20_000, 'metadata update')
  result.metaLength = drive.core.length

  let pearJsonText = ''
  try {
    const pearJsonFile = await withTimeout(getText('pear.json', result.appRoot), args.timeout * 1000, 'pear.json fetch')
    pearJsonText = pearJsonFile.text
    if (!result.appRoot) result.appRoot = posixPath.dirname(pearJsonFile.path) === '.' ? '' : posixPath.dirname(pearJsonFile.path)
    result.filesChecked.push(pearJsonFile.path)
    result.pearJson = JSON.parse(pearJsonText)
  } catch (err) {
    result.errors.push(err.message)
  }

  if (result.pearJson) {
    checkEqual('pear.json type', result.pearJson.type, args.expectType)
    checkEqual('pear.json main', result.pearJson.main, args.expectMain)
  }

  const fileCache = new Map()
  async function fileText (file) {
    const key = result.appRoot ? `${result.appRoot}/${file}` : file
    if (!fileCache.has(key)) {
      let resolved
      try {
        resolved = await withTimeout(getText(file, result.appRoot), args.timeout * 1000, `${file} fetch`)
      } catch (err) {
        if (result.pearJson?.main === file && result.appRoot) {
          const path = posixPath.join(result.appRoot, file)
          resolved = { path, text: await getTextAtPath(path) }
        } else {
          throw err
        }
      }
      fileCache.set(key, resolved.text)
      result.filesChecked.push(resolved.path)
    }
    return fileCache.get(key)
  }

  for (const item of args.contains) {
    try {
      const text = await fileText(item.file)
      if (!text.includes(item.text)) result.errors.push(`${item.file} does not contain ${JSON.stringify(item.text)}`)
    } catch (err) {
      result.errors.push(err.message)
    }
  }

  for (const item of args.absent) {
    try {
      const text = await fileText(item.file)
      if (text.includes(item.text)) result.errors.push(`${item.file} unexpectedly contains ${JSON.stringify(item.text)}`)
    } catch (err) {
      result.errors.push(err.message)
    }
  }

  result.filesChecked = [...new Set(result.filesChecked)]
  result.ok = result.peers > 0 && result.metaLength > 0 && result.errors.length === 0
  emit(result.ok ? 0 : 1)
}

main().catch((err) => {
  result.errors.push(err.message)
  emit(1)
})
