#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_PROXY = 'http://127.0.0.1:18788'
const DEFAULT_PARTITIONS_ROOT = join(homedir(), 'Library/Application Support/pear-runtime/Partitions')

const APPS = {
  peerit: {
    label: 'peerit',
    outboxPrefix: 'peerit:outbox:',
    defaultUrl: 'hyper://ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4/'
  },
  p2pbuilders: {
    label: 'p2pbuilders',
    outboxPrefix: 'p2pb:outbox:',
    defaultUrl: 'hyper://ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74/'
  }
}

const CONTROL_RE = /[\u0001-\u0008\u000b\u000c\u000e-\u001f]/g
const KEY_CHAR_RE = /^[a-z0-9:]+$/i

function usage () {
  return `Usage:
  node scripts/recover-legacy-social-posts.mjs [--dry-run]
  node scripts/recover-legacy-social-posts.mjs --import [--proxy http://127.0.0.1:18788]

Options:
  --root PATH              Pear runtime Partitions root.
  --apps LIST              Comma list: peerit,p2pbuilders.
  --proxy URL              PearBrowser proxy origin for hyper:// defaults.
  --peerit-url URL         Proxied page URL or hyper:// URL to get a peerit token.
  --p2pbuilders-url URL    Proxied page URL or hyper:// URL to get a p2pbuilders token.
  --import                 Append recovered records through /api/sync/append.
  --json                   Print machine-readable JSON.

Default mode is a read-only dry run. Import mode requires PearBrowser running.`
}

export function parseArgs (argv = []) {
  const opts = {
    root: DEFAULT_PARTITIONS_ROOT,
    apps: ['peerit', 'p2pbuilders'],
    proxy: DEFAULT_PROXY,
    import: false,
    json: false,
    urls: {}
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') return { ...opts, help: true }
    if (arg === '--dry-run') { opts.import = false; continue }
    if (arg === '--import') { opts.import = true; continue }
    if (arg === '--json') { opts.json = true; continue }
    if (arg === '--root') { opts.root = argv[++i]; continue }
    if (arg === '--apps') { opts.apps = splitApps(argv[++i]); continue }
    if (arg === '--proxy') { opts.proxy = trimTrailingSlash(argv[++i]); continue }
    if (arg === '--peerit-url') { opts.urls.peerit = argv[++i]; continue }
    if (arg === '--p2pbuilders-url') { opts.urls.p2pbuilders = argv[++i]; continue }
    throw new Error('Unknown argument: ' + arg)
  }
  return opts
}

function splitApps (raw) {
  const apps = String(raw || '').split(',').map(s => s.trim()).filter(Boolean)
  for (const app of apps) {
    if (!APPS[app]) throw new Error('Unknown app: ' + app)
  }
  return apps
}

function trimTrailingSlash (value) {
  return String(value || '').replace(/\/+$/, '')
}

export async function scanLegacySocialStorage (opts = {}) {
  const root = opts.root || DEFAULT_PARTITIONS_ROOT
  const apps = opts.apps || ['peerit', 'p2pbuilders']
  const files = await findLocalStorageLevelDbFiles(root)
  const outboxes = []
  const errors = []

  for (const file of files) {
    let buffer
    try {
      buffer = await readFile(file)
    } catch (err) {
      errors.push({ file, error: err.message })
      continue
    }
    for (const app of apps) {
      const found = scanLevelDbBuffer(buffer, app, file)
      outboxes.push(...found.outboxes)
      errors.push(...found.errors)
    }
  }

  const latestOutboxes = latestValidOutboxes(outboxes)
  const records = flattenRecords(latestOutboxes)
  return { root, scannedFiles: files.length, outboxes: latestOutboxes, records, errors }
}

export async function findLocalStorageLevelDbFiles (root) {
  const files = []
  async function walk (dir) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    if (dir.endsWith(`${sep}Local Storage${sep}leveldb`)) {
      for (const entry of entries) {
        if (!entry.isFile()) continue
        if (isLevelDbDataFile(entry.name)) files.push(join(dir, entry.name))
      }
      return
    }

    for (const entry of entries) {
      if (entry.isDirectory()) await walk(join(dir, entry.name))
    }
  }
  await walk(root)
  return files.sort()
}

function isLevelDbDataFile (name) {
  if (name === 'LOCK' || name === 'CURRENT' || name === 'LOG' || name === 'LOG.old') return false
  return /\.(log|ldb|sst)$/i.test(name) || /^\d+$/.test(name)
}

export function scanLevelDbBuffer (buffer, app, sourceFile = '') {
  const cfg = APPS[app]
  if (!cfg) throw new Error('Unknown app: ' + app)

  const outboxes = []
  const errors = []
  const needle = Buffer.from(cfg.outboxPrefix)
  let offset = -1
  while ((offset = buffer.indexOf(needle, offset + 1)) !== -1) {
    const storageKey = readStorageKey(buffer, offset)
    const jsonCandidate = readJsonValue(buffer, offset + storageKey.length)
    if (!jsonCandidate) {
      errors.push({ app, sourceFile, offset, storageKey, error: 'JSON value not found' })
      continue
    }

    let value
    try {
      value = JSON.parse(jsonCandidate.json)
    } catch (err) {
      errors.push({ app, sourceFile, offset, storageKey, error: err.message })
      continue
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      errors.push({ app, sourceFile, offset, storageKey, error: 'Outbox value is not an object' })
      continue
    }

    const pubkey = storageKey.slice(cfg.outboxPrefix.length)
    outboxes.push({
      app,
      sourceFile,
      sourceFileName: sourceFile ? basename(sourceFile) : '',
      offset,
      storageKey,
      pubkey,
      encoding: jsonCandidate.encoding,
      recordCount: Object.keys(value).length,
      value
    })
  }

  return { outboxes, errors }
}

function readStorageKey (buffer, start) {
  let end = start
  while (end < buffer.length) {
    const ch = String.fromCharCode(buffer[end])
    if (!KEY_CHAR_RE.test(ch)) break
    end++
  }
  return buffer.slice(start, end).toString('utf8')
}

function readJsonValue (buffer, afterKeyOffset) {
  const scanEnd = Math.min(buffer.length, afterKeyOffset + 96)
  for (let i = afterKeyOffset; i < scanEnd; i++) {
    if (buffer[i] !== 0x7b) continue

    const utf16 = i + 1 < buffer.length && buffer[i + 1] === 0x00
    const raw = buffer
      .slice(i, Math.min(buffer.length, i + 512 * 1024))
      .toString(utf16 ? 'utf16le' : 'utf8')
      .replace(/\u0000/g, '')
      .replace(CONTROL_RE, '')

    const json = findMatchingJson(raw, 0)
    if (json) return { json, encoding: utf16 ? 'utf16le' : 'utf8' }
  }
  return null
}

function findMatchingJson (text, start) {
  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function latestValidOutboxes (outboxes) {
  const latest = new Map()
  for (const outbox of outboxes) {
    const key = `${outbox.app}:${outbox.storageKey}`
    const previous = latest.get(key)
    if (!previous || outbox.offset > previous.offset || outbox.sourceFile > previous.sourceFile) {
      latest.set(key, outbox)
    }
  }
  return [...latest.values()].sort((a, b) => {
    if (a.app !== b.app) return a.app.localeCompare(b.app)
    if (a.pubkey !== b.pubkey) return a.pubkey.localeCompare(b.pubkey)
    return a.sourceFile.localeCompare(b.sourceFile) || a.offset - b.offset
  })
}

function flattenRecords (outboxes) {
  const byRecord = new Map()
  for (const outbox of outboxes) {
    for (const [key, value] of Object.entries(outbox.value)) {
      const type = key.split('!')[0]
      const record = {
        app: outbox.app,
        type,
        key,
        value,
        title: typeof value?.title === 'string' ? value.title : '',
        createdAt: Number(value?.createdAt || value?.updatedAt || value?.ts || 0),
        sourcePubkey: outbox.pubkey,
        sourceFile: outbox.sourceFile,
        sourceOffset: outbox.offset
      }
      const dedupeKey = `${record.app}:${record.key}`
      const previous = byRecord.get(dedupeKey)
      if (!previous || compareRecords(record, previous) > 0) byRecord.set(dedupeKey, record)
    }
  }
  return [...byRecord.values()].sort((a, b) => {
    if (a.app !== b.app) return a.app.localeCompare(b.app)
    if (a.key !== b.key) return a.key.localeCompare(b.key)
    return a.sourceOffset - b.sourceOffset
  })
}

function compareRecords (a, b) {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
  return a.sourceOffset - b.sourceOffset
}

export async function importRecoveredRecords (report, opts = {}) {
  const proxy = trimTrailingSlash(opts.proxy || DEFAULT_PROXY)
  const imported = []
  const failed = []

  for (const app of opts.apps || ['peerit', 'p2pbuilders']) {
    const records = report.records.filter(r => r.app === app)
    if (!records.length) continue

    const targetUrl = resolveAppUrl(opts.urls?.[app] || APPS[app].defaultUrl, proxy)
    let tokenInfo
    try {
      tokenInfo = await fetchTokenAndIdentity(targetUrl)
      await ensureSyncGroup(tokenInfo)
    } catch (err) {
      failed.push({ app, targetUrl, error: err.message, count: records.length })
      continue
    }

    for (const record of records) {
      try {
        await appendRecord(tokenInfo, record)
        imported.push({ app, key: record.key, title: record.title })
      } catch (err) {
        failed.push({ app, key: record.key, title: record.title, error: err.message })
      }
    }
  }

  return { imported, failed }
}

export function resolveAppUrl (value, proxy = DEFAULT_PROXY) {
  const raw = String(value || '').trim()
  if (!raw) throw new Error('Missing app URL')
  if (!raw.startsWith('hyper://')) return raw
  const url = new URL(raw)
  const path = url.pathname === '/' ? '/' : url.pathname
  return `${trimTrailingSlash(proxy)}/hyper/${url.hostname}${path}${url.search || ''}`
}

async function fetchTokenAndIdentity (appUrl) {
  const page = await fetch(appUrl)
  if (!page.ok) throw new Error(`Could not fetch ${appUrl}: HTTP ${page.status}`)
  const html = await page.text()
  const token = extractToken(html)
  if (!token) throw new Error('pear-api-token meta tag not found. Is this page served through PearBrowser?')

  const origin = new URL(appUrl).origin
  const identity = await apiJson(origin, '/api/identity', token)
  if (!identity || !identity.publicKey) throw new Error('Bridge identity did not return a publicKey')
  return { origin, token, appId: identity.publicKey }
}

function extractToken (html) {
  const meta = html.match(/<meta\s+[^>]*name=["']pear-api-token["'][^>]*>/i)
  if (!meta) return ''
  const content = meta[0].match(/\scontent=["']([^"']+)["']/i)
  return content ? content[1] : ''
}

async function ensureSyncGroup (tokenInfo) {
  const status = await apiJson(tokenInfo.origin, `/api/sync/status?appId=${encodeURIComponent(tokenInfo.appId)}`, tokenInfo.token)
    .catch(() => null)
  if (status && status.inviteKey) return status
  await apiJson(tokenInfo.origin, '/api/sync/create', tokenInfo.token, { appId: tokenInfo.appId })
}

async function appendRecord (tokenInfo, record) {
  await apiJson(tokenInfo.origin, '/api/sync/append', tokenInfo.token, {
    appId: tokenInfo.appId,
    op: {
      type: record.type,
      data: record.value,
      timestamp: new Date().toISOString()
    }
  })
}

async function apiJson (origin, path, token, body) {
  const res = await fetch(origin + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-Pear-Token': token,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch {}
  if (!res.ok) {
    const message = json?.error || text || res.statusText
    throw new Error(`HTTP ${res.status}: ${message}`)
  }
  return json
}

function summarize (report, importResult = null) {
  const byApp = new Map()
  for (const record of report.records) {
    const entry = byApp.get(record.app) || { records: 0, titles: [] }
    entry.records++
    if (record.title) entry.titles.push(record.title)
    byApp.set(record.app, entry)
  }

  const lines = []
  lines.push(`Scanned ${report.scannedFiles} Local Storage LevelDB files.`)
  lines.push(`Recovered ${report.records.length} unique records from ${report.outboxes.length} old outboxes.`)
  for (const [app, entry] of byApp) {
    lines.push(`\n${APPS[app].label}: ${entry.records} records`)
    for (const title of entry.titles.slice(0, 8)) lines.push(`  - ${title}`)
  }
  if (report.errors.length) lines.push(`\nSkipped ${report.errors.length} malformed/stale LevelDB fragments.`)
  if (importResult) {
    lines.push(`\nImported ${importResult.imported.length} records.`)
    if (importResult.failed.length) lines.push(`Failed ${importResult.failed.length} imports.`)
  }
  return lines.join('\n')
}

async function main () {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    console.log(usage())
    return
  }
  const report = await scanLegacySocialStorage(opts)
  let importResult = null
  if (opts.import) importResult = await importRecoveredRecords(report, opts)

  if (opts.json) {
    console.log(JSON.stringify({ report, importResult }, null, 2))
  } else {
    console.log(summarize(report, importResult))
    if (!opts.import) {
      console.log('\nDry run only. Re-run with --import once PearBrowser is open to append these into the bridge store.')
    }
  }

  if (importResult && importResult.failed.length) process.exitCode = 1
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) main().catch((err) => {
  console.error(err.stack || err.message)
  process.exitCode = 1
})

