// Backend and worker sources run under Bare, where Node's builtin module ids
// ('crypto', 'fs', 'node:crypto', …) do not resolve. A stray
// `require('crypto')` passes every node-run unit test and then throws
// MODULE_NOT_FOUND at runtime — one in the boot path shipped in the WDK
// wallet wiring and silently killed boot before the HTTP proxy started.
// This guard scans the Bare-run sources statically so the mistake fails CI
// instead of the app.
import test from 'node:test'
import assert from 'node:assert'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCAN_DIRS = ['backend', 'workers']

// Node builtin ids that do NOT resolve under this install's Bare (probed with
// `bare -e "require(id)"`; fs/path/url/http/etc. do resolve via compat shims).
// Bare equivalents (bare-crypto, bare-https, …) are the correct alternative.
const NODE_ONLY = [
  'crypto', 'os', 'https', 'stream', 'util', 'zlib', 'buffer'
]

// Deliberate node fallbacks: the file requires the bare-* module first and
// only reaches the node id inside a catch, so node-test runs keep working.
const ALLOWED = new Set([
  "backend/clearnet-proxy.cjs require('https')"
])

const requirePattern = new RegExp(
  `require\\((['"])(?:node:)?(${NODE_ONLY.join('|')})\\1\\)`, 'g'
)

function collectSources (dir) {
  const out = []
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      out.push(...collectSources(rel))
    } else if (/\.(js|cjs|mjs)$/.test(entry.name)) {
      out.push(rel)
    }
  }
  return out
}

test('Bare-run sources never require node-only builtin modules', () => {
  const offenders = []
  for (const rel of SCAN_DIRS.flatMap(collectSources)) {
    const source = readFileSync(join(ROOT, rel), 'utf8')
    const lines = source.split('\n')
    for (let i = 0; i < lines.length; i++) {
      requirePattern.lastIndex = 0
      const match = requirePattern.exec(lines[i])
      if (match && !ALLOWED.has(`${rel} require('${match[2]}')`)) {
        offenders.push(`${rel}:${i + 1} require('${match[2]}')`)
      }
    }
  }
  assert.deepStrictEqual(
    offenders, [],
    'node-only builtin require() in Bare-run sources — use the bare-* equivalent:\n' +
    offenders.join('\n')
  )
})
