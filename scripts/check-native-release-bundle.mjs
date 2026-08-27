#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const args = parseArgs(process.argv.slice(2))
const directory = resolve(args.dir || '')
const tag = normalizeTag(args.tag)
const version = tag.slice(1)
const sourceRef = normalizeSourceRef(args.sourceRef)
const releaseMode = normalizeReleaseMode(args.releaseMode)

if (!args.dir) fail('--dir is required')
if (!existsSync(directory)) fail(`release bundle directory does not exist: ${directory}`)

const combinations = [
  { platform: 'macos', arch: 'arm64' },
  { platform: 'macos', arch: 'x64' },
  { platform: 'windows', arch: 'x64' },
  { platform: 'linux', arch: 'x64' }
]
const expectedFiles = new Set()
const manifests = []

for (const combination of combinations) {
  const { platform, arch } = combination
  const artifactNames = expectedArtifactNames(platform, arch)
  const manifestName = `manifest-${platform}-${arch}.json`
  const sumsName = `SHA256SUMS-${platform}-${arch}.txt`
  expectedFiles.add(manifestName)
  expectedFiles.add(sumsName)
  for (const name of artifactNames) {
    expectedFiles.add(name)
    expectedFiles.add(`${name}.sha256`)
  }
  manifests.push({ platform, arch, artifactNames, manifestName, sumsName })
}

const entries = readdirSync(directory, { withFileTypes: true })
const actualFiles = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name))
const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
if (directories.length) fail(`release bundle must be flat; found directories: ${directories.join(', ')}`)

const missing = [...expectedFiles].filter((name) => !actualFiles.has(name)).sort()
const unexpected = [...actualFiles].filter((name) => !expectedFiles.has(name)).sort()
if (missing.length) fail(`release bundle is missing expected file(s): ${missing.join(', ')}`)
if (unexpected.length) fail(`release bundle has unexpected file(s): ${unexpected.join(', ')}`)

for (const expected of manifests) {
  const manifest = readJson(join(directory, expected.manifestName))
  checkEqual(manifest.tag, tag, `${expected.manifestName}: tag`)
  checkEqual(manifest.version, version, `${expected.manifestName}: version`)
  checkEqual(manifest.sourceRef, sourceRef, `${expected.manifestName}: sourceRef`)
  checkEqual(manifest.releaseMode, releaseMode, `${expected.manifestName}: releaseMode`)
  checkEqual(manifest.platform, expected.platform, `${expected.manifestName}: platform`)
  checkEqual(manifest.arch, expected.arch, `${expected.manifestName}: arch`)
  if (!Array.isArray(manifest.artifacts)) fail(`${expected.manifestName}: artifacts must be an array`)

  const items = new Map(manifest.artifacts.map((item) => [String(item?.name || ''), item]))
  const manifestNames = [...items.keys()].sort()
  if (items.size !== manifest.artifacts.length) fail(`${expected.manifestName}: duplicate artifact name`)
  checkArray(manifestNames, [...expected.artifactNames].sort(), `${expected.manifestName}: artifact names`)

  const checksumLines = []
  for (const artifactName of expected.artifactNames) {
    const artifactPath = join(directory, artifactName)
    const item = items.get(artifactName)
    const bytes = statSync(artifactPath).size
    if (bytes <= 0) fail(`${artifactName}: artifact is empty`)
    const sha256 = await hashFile(artifactPath)
    checkEqual(item?.bytes, bytes, `${expected.manifestName}: byte count for ${artifactName}`)
    checkEqual(item?.sha256, sha256, `${expected.manifestName}: SHA-256 for ${artifactName}`)
    if (typeof item?.source !== 'string' || !item.source.startsWith('dist/electron/')) {
      fail(`${expected.manifestName}: source for ${artifactName} must be under dist/electron`)
    }

    const expectedLine = `${sha256}  ${artifactName}`
    const sidecar = readFileSync(join(directory, `${artifactName}.sha256`), 'utf8').trim()
    checkEqual(sidecar, expectedLine, `${artifactName}.sha256`)
    checksumLines.push(expectedLine)
  }

  const sums = readFileSync(join(directory, expected.sumsName), 'utf8').trim().split(/\r?\n/).sort()
  checkArray(sums, checksumLines.sort(), expected.sumsName)
}

console.log(`Native release bundle verified: ${tag} ${releaseMode} from ${sourceRef}`)
for (const { platform, arch, artifactNames } of manifests) {
  console.log(`- ${platform}/${arch}: ${artifactNames.join(', ')}`)
}

function expectedArtifactNames (platform, arch) {
  const prefix = `PearBrowser-${version}-${platform}-${arch}`
  if (platform === 'macos') {
    const names = [`${prefix}.app.zip`]
    if (releaseMode === 'public-trust') names.push(`${prefix}.dmg`)
    return names
  }
  if (platform === 'windows') return [`${prefix}.exe`]
  if (platform === 'linux') return [`${prefix}.AppImage`]
  fail(`unsupported release platform: ${platform}`)
}

function parseArgs (argv) {
  const parsed = { dir: '', tag: '', sourceRef: '', releaseMode: '' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dir') parsed.dir = requireValue(argv, ++i, arg)
    else if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--source-ref') parsed.sourceRef = requireValue(argv, ++i, arg)
    else if (arg === '--release-mode') parsed.releaseMode = requireValue(argv, ++i, arg)
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown argument: ${arg}`)
  }
  return parsed
}

function requireValue (argv, index, flag) {
  const value = argv[index] || ''
  if (!value || value.startsWith('--')) usage(2, `${flag} requires a value`)
  return value
}

function normalizeTag (value) {
  const normalized = String(value || '').replace(/^refs\/tags\//, '')
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(normalized)) usage(2, `--tag must be a stable vX.Y.Z tag, got ${value || '(missing)'}`)
  return normalized
}

function normalizeSourceRef (value) {
  const normalized = String(value || '')
  if (!/^[0-9a-f]{40}$/.test(normalized)) usage(2, '--source-ref must be an exact lowercase 40-character commit SHA')
  return normalized
}

function normalizeReleaseMode (value) {
  const normalized = String(value || '')
  if (!['package-proof', 'public-trust'].includes(normalized)) usage(2, '--release-mode must be package-proof or public-trust')
  return normalized
}

function readJson (path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(`could not parse ${basename(path)}: ${error.message}`)
  }
}

function hashFile (path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

function checkEqual (actual, expected, label) {
  if (actual !== expected) fail(`${label} must be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

function checkArray (actual, expected, label) {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    fail(`${label} must contain ${expected.join(', ')}, got ${actual.join(', ')}`)
  }
}

function usage (code, message = '') {
  if (message) console.error(`error: ${message}`)
  console.error('usage: node scripts/check-native-release-bundle.mjs --dir path --tag vX.Y.Z --source-ref 40-char-sha --release-mode package-proof|public-trust')
  process.exit(code)
}

function fail (message) {
  console.error(`error: ${message}`)
  process.exit(1)
}
