/**
 * Build a filter-list drive directory: (re)generate manifest.json with the
 * sha256 of filters.txt so subscribers can verify the bytes they sync.
 *
 * Usage:
 *   node scripts/build-shield-list.mjs filter-lists/pear-default [--name pear-default] [--bump]
 *
 * Then publish + pin the directory as a Hyperdrive:
 *   node scripts/publish-and-pin.js filter-lists/pear-default --name pear-default-filters
 *
 * Re-publishing an update: edit filters.txt, re-run this script with --bump
 * (increments the integer version), then publish-and-pin with the original
 * --key and --storage. Subscribed browsers hot-swap on their next refresh.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename, resolve } from 'node:path'

const args = process.argv.slice(2)
const dir = args.find(a => !a.startsWith('--'))
const bump = args.includes('--bump')
const nameFlag = args.indexOf('--name')
const name = nameFlag !== -1 ? args[nameFlag + 1] : null

if (!dir) {
  console.error('usage: node scripts/build-shield-list.mjs <list-dir> [--name <list-name>] [--bump]')
  process.exit(2)
}

const listDir = resolve(dir)
const filtersPath = join(listDir, 'filters.txt')
const manifestPath = join(listDir, 'manifest.json')

if (!existsSync(filtersPath)) {
  console.error(`no filters.txt in ${listDir}`)
  process.exit(2)
}

const filters = readFileSync(filtersPath)
const sha256 = createHash('sha256').update(filters).digest('hex')

let previous = {}
if (existsSync(manifestPath)) {
  try { previous = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch {}
}

const previousVersion = Number.parseInt(previous.version, 10)
const version = bump && Number.isFinite(previousVersion)
  ? String(previousVersion + 1)
  : (previous.version && !bump ? String(previous.version) : '1')

const manifest = {
  name: name || previous.name || basename(listDir),
  version,
  filters: '/filters.txt',
  sha256,
  rules: filters.toString('utf8').split('\n').filter(line => {
    const l = line.trim()
    return l && !l.startsWith('!') && !l.startsWith('[')
  }).length,
  builtAt: new Date().toISOString()
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`${manifest.name} v${manifest.version} — ${manifest.rules} rules, sha256 ${sha256.slice(0, 16)}…`)
console.log(`wrote ${manifestPath}`)
console.log('publish with:')
console.log(`  node scripts/publish-and-pin.js ${dir} --name ${manifest.name}-filters`)
