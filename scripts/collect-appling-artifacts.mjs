#!/usr/bin/env node

import { createHash } from 'node:crypto'
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const args = parseArgs(process.argv.slice(2))
const tag = normalizeTag(args.tag || `v${pkg.version}`)
const version = tag.slice(1)
const platform = normalizePlatform(args.platform || process.platform)
const releasePlatform = platform === 'darwin' ? 'macos' : platform === 'win32' ? 'windows' : 'linux'
const arch = normalizeArch(args.arch || process.env.RUNNER_ARCH || process.arch)
const sourceRef = normalizeSourceRef(args.sourceRef || process.env.SOURCE_REF || 'local-working-tree')
const releaseMode = normalizeReleaseMode(args.releaseMode || process.env.RELEASE_MODE || 'package-proof')
const buildDir = resolve(args.buildDir || 'dist/electron')
const releaseRoot = resolve('dist', 'native-release')
const outDir = resolve(args.outDir || join(releaseRoot, tag, releasePlatform, arch))
const appName = sanitizeName(args.appName || 'PearBrowser')

if (version !== pkg.version) {
  fail(`release version ${version} does not match package.json version ${pkg.version}`)
}
if (process.env.CI && sourceRef === 'local-working-tree') {
  fail('CI artifact collection requires --source-ref with an exact 40-character commit SHA')
}
if (!existsSync(buildDir)) {
  fail(`Electron build directory does not exist: ${buildDir}`)
}

assertSafeOutputDir(outDir)
const artifacts = findArtifacts(buildDir, platform)
assertExpectedArtifacts(artifacts, platform, releaseMode)

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const outputs = []
for (const artifact of artifacts) {
  const extension = artifact.kind === 'app' ? '.app.zip' : artifact.extension
  const assetName = `${appName}-${version}-${releasePlatform}-${arch}${extension}`
  const destination = join(outDir, assetName)

  if (artifact.kind === 'app') archiveAppBundle(artifact.path, destination)
  else copyFileSync(artifact.path, destination)

  const sha256 = await hashFile(destination)
  const bytes = statSync(destination).size
  if (bytes <= 0) fail(`collected artifact is empty: ${assetName}`)
  writeFileSync(`${destination}.sha256`, `${sha256}  ${assetName}\n`)
  outputs.push({
    name: assetName,
    sha256,
    source: relative(resolve('.'), artifact.path).split('\\').join('/'),
    bytes
  })
}

const checksumName = `SHA256SUMS-${releasePlatform}-${arch}.txt`
writeFileSync(
  join(outDir, checksumName),
  outputs.map((asset) => `${asset.sha256}  ${asset.name}`).join('\n') + '\n'
)
writeFileSync(
  join(outDir, `manifest-${releasePlatform}-${arch}.json`),
  JSON.stringify({
    tag,
    version,
    sourceRef,
    releaseMode,
    platform: releasePlatform,
    arch,
    artifacts: outputs
  }, null, 2) + '\n'
)

console.log(`Collected ${outputs.length} ${releasePlatform}/${arch} Electron artifact(s):`)
for (const output of outputs) console.log(`- ${output.name} (${output.bytes} bytes)`)
console.log(`Output: ${outDir}`)

function parseArgs (argv) {
  const options = new Map([
    ['--platform', 'platform'],
    ['--arch', 'arch'],
    ['--tag', 'tag'],
    ['--source-ref', 'sourceRef'],
    ['--release-mode', 'releaseMode'],
    ['--build-dir', 'buildDir'],
    ['--out-dir', 'outDir'],
    ['--app-name', 'appName']
  ])
  const parsed = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const key = options.get(arg)
    if (!key) fail(`unknown argument: ${arg}`)
    const value = argv[++i] || ''
    if (!value || value.startsWith('--')) fail(`${arg} requires a value`)
    parsed[key] = value
  }
  return parsed
}

function normalizeTag (tag) {
  const normalized = String(tag || '').replace(/^refs\/tags\//, '')
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(normalized)) {
    fail(`release tag must be a stable vX.Y.Z tag, got ${tag}`)
  }
  return normalized
}

function normalizeSourceRef (value) {
  const normalized = String(value || '')
  if (normalized === 'local-working-tree') return normalized
  if (!/^[0-9a-f]{40}$/.test(normalized)) {
    fail('source ref must be local-working-tree or an exact lowercase 40-character commit SHA')
  }
  return normalized
}

function normalizeReleaseMode (value) {
  const normalized = String(value || '')
  if (!['package-proof', 'public-trust'].includes(normalized)) {
    fail(`release mode must be package-proof or public-trust, got ${value}`)
  }
  return normalized
}

function normalizePlatform (value) {
  const platform = String(value).toLowerCase()
  if (platform === 'macos' || platform === 'mac' || platform === 'darwin') return 'darwin'
  if (platform === 'windows' || platform === 'win' || platform === 'win32') return 'win32'
  if (platform === 'linux') return 'linux'
  fail(`unsupported platform: ${value}`)
}

function normalizeArch (value) {
  const arch = String(value).toLowerCase()
  if (arch === 'x64' || arch === 'x86_64' || arch === 'amd64') return 'x64'
  if (arch === 'arm64' || arch === 'aarch64') return 'arm64'
  fail(`unsupported architecture: ${value}`)
}

function assertSafeOutputDir (dir) {
  const cwd = resolve('.')
  const forbidden = new Set([cwd, resolve('/'), releaseRoot, buildDir])
  if (process.env.HOME) forbidden.add(resolve(process.env.HOME))

  if (!isWithin(dir, releaseRoot) || forbidden.has(dir)) {
    fail(`refusing to clear unsafe output directory: ${dir} (must be below ${releaseRoot})`)
  }
  if (isSameOrWithin(dir, buildDir) || isSameOrWithin(buildDir, dir)) {
    fail(`refusing to clear unsafe output directory: ${dir} (overlaps Electron build directory ${buildDir})`)
  }
}

function isWithin (target, root) {
  const path = relative(root, target)
  return path !== '' && !path.startsWith('..') && !isAbsolute(path)
}

function isSameOrWithin (target, root) {
  const path = relative(root, target)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

function findArtifacts (root, targetPlatform) {
  const found = []
  walk(root, 0)
  return found.sort((a, b) => a.path.localeCompare(b.path))

  function walk (dir, depth) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (targetPlatform === 'darwin' && entry.name === `${appName}.app`) {
          found.push({ kind: 'app', extension: '.app.zip', path })
          continue
        }
        if (shouldSkipDir(entry.name)) continue
        walk(path, depth + 1)
        continue
      }
      if (!entry.isFile() || depth !== 0) continue
      if (targetPlatform === 'darwin' && entry.name.toLowerCase().endsWith('.dmg')) {
        found.push({ kind: 'file', extension: '.dmg', path })
      } else if (targetPlatform === 'win32' && entry.name.toLowerCase().endsWith('.exe')) {
        found.push({ kind: 'file', extension: '.exe', path })
      } else if (targetPlatform === 'linux' && entry.name.endsWith('.AppImage')) {
        found.push({ kind: 'file', extension: '.AppImage', path })
      }
    }
  }
}

function shouldSkipDir (name) {
  return name === 'node_modules' || name === 'app.asar.unpacked'
}

function assertExpectedArtifacts (artifacts, targetPlatform, mode) {
  const summary = artifacts.map((artifact) => relative(resolve('.'), artifact.path)).join(', ') || '(none)'
  const count = (extension) => artifacts.filter((artifact) => artifact.extension === extension).length

  if (targetPlatform === 'darwin') {
    if (count('.app.zip') !== 1) fail(`expected exactly one PearBrowser.app under ${buildDir}, found: ${summary}`)
    const expectedDmgCount = mode === 'public-trust' ? 1 : 0
    if (count('.dmg') !== expectedDmgCount) {
      fail(`${mode} macOS collection expected ${expectedDmgCount} DMG artifact(s), found: ${summary}`)
    }
  } else if (targetPlatform === 'win32') {
    if (artifacts.length !== 1 || count('.exe') !== 1) {
      fail(`expected exactly one top-level Electron Builder NSIS installer under ${buildDir}, found: ${summary}`)
    }
  } else if (targetPlatform === 'linux') {
    if (artifacts.length !== 1 || count('.AppImage') !== 1) {
      fail(`expected exactly one top-level Electron Builder AppImage under ${buildDir}, found: ${summary}`)
    }
  }
}

function archiveAppBundle (appPath, destination) {
  const ditto = spawnSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', appPath, destination], {
    stdio: 'inherit'
  })
  if (ditto.status === 0) return

  const zip = spawnSync('zip', ['-qry', destination, basename(appPath)], {
    cwd: dirname(appPath),
    stdio: 'inherit'
  })
  if (zip.status !== 0) throw new Error(`failed to zip app bundle ${appPath}`)
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

function sanitizeName (name) {
  return String(name)
    .replace(/\.[A-Za-z0-9.]+$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'artifact'
}

function fail (message) {
  console.error(`error: ${message}`)
  process.exit(1)
}
