#!/usr/bin/env node

import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const args = parseArgs(process.argv.slice(2))
const tagVersion = args.tag ? versionFromTag(args.tag) : ''
const version = tagVersion || args.version || pkg.version
if (args.version && tagVersion && args.version !== tagVersion) {
  fail(`--version ${args.version} does not match --tag ${args.tag}`)
}
if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`release version must look like X.Y.Z, got ${version}`)
}
if (version !== pkg.version) {
  fail(`release version ${version} does not match package.json version ${pkg.version}`)
}
const tag = args.tag ? normalizeTag(args.tag) : `v${version}`
const platform = normalizePlatform(args.platform || process.platform)
const releasePlatform = platform === 'darwin' ? 'macos' : platform === 'win32' ? 'windows' : 'linux'
const arch = normalizeArch(args.arch || process.env.RUNNER_ARCH || process.arch)
const buildDir = resolve(args.buildDir || 'appling/build')
const releaseRoot = resolve('dist', 'appling-release')
const outDir = resolve(args.outDir || join(releaseRoot, tag, releasePlatform))
const appName = sanitizeName(args.appName || 'PearBrowser')

const filePatterns = {
  darwin: [/\.dmg$/i, /\.pkg$/i, /\.zip$/i],
  win32: [/\.exe$/i, /\.msi$/i, /\.msix$/i, /\.zip$/i],
  linux: [/\.AppImage$/i, /\.deb$/i, /\.rpm$/i, /\.snap$/i, /\.tar\.gz$/i, /\.tgz$/i, /\.tar\.xz$/i, /\.zip$/i]
}

if (!existsSync(buildDir)) {
  fail(`build directory does not exist: ${buildDir}`)
}

assertSafeOutputDir(outDir)
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const artifacts = findArtifacts(buildDir, platform)
if (artifacts.length === 0) {
  console.error(`error: no ${releasePlatform} appling artifacts found under ${buildDir}`)
  console.error('       run `npm run --prefix appling generate` and `npm run --prefix appling build` first')
  process.exit(1)
}

const outputs = []
const extCounts = new Map()

for (const artifact of artifacts) {
  const ext = artifact.kind === 'app' ? '.app.zip' : artifactExtension(artifact.path)
  const extCount = extCounts.get(ext) || 0
  extCounts.set(ext, extCount + 1)
  const originalName = stripKnownExtension(basename(artifact.path))
  const duplicateSuffix = extCount === 0 ? '' : `-${sanitizeName(originalName)}`
  const assetName = `${appName}-${version}-${releasePlatform}-${arch}${duplicateSuffix}${ext}`
  const destination = join(outDir, assetName)

  if (artifact.kind === 'app') archiveAppBundle(artifact.path, destination)
  else copyFileSync(artifact.path, destination)

  const sha256 = hashFile(destination)
  writeFileSync(`${destination}.sha256`, `${sha256}  ${assetName}\n`)
  outputs.push({
    name: assetName,
    sha256,
    source: relative(resolve('.'), artifact.path),
    bytes: statSync(destination).size
  })
}

const checksumName = `SHA256SUMS-${releasePlatform}-${arch}.txt`
writeFileSync(
  join(outDir, checksumName),
  outputs.map((asset) => `${asset.sha256}  ${asset.name}`).join('\n') + '\n'
)
writeFileSync(
  join(outDir, `manifest-${releasePlatform}-${arch}.json`),
  JSON.stringify({ tag, version, platform: releasePlatform, arch, artifacts: outputs }, null, 2) + '\n'
)

console.log(`Collected ${outputs.length} ${releasePlatform} appling artifact(s):`)
for (const output of outputs) {
  console.log(`- ${output.name} (${output.bytes} bytes)`)
}
console.log(`Output: ${outDir}`)

function parseArgs (argv) {
  const options = new Map([
    ['--platform', 'platform'],
    ['--arch', 'arch'],
    ['--version', 'version'],
    ['--tag', 'tag'],
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

function versionFromTag (tag) {
  return normalizeTag(tag).slice(1)
}

function normalizeTag (tag) {
  const normalized = String(tag || '').replace(/^refs\/tags\//, '')
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized)) {
    fail(`release tag must look like vX.Y.Z, got ${tag}`)
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
  return sanitizeName(arch)
}

function assertSafeOutputDir (dir) {
  const cwd = resolve('.')
  const forbidden = new Set([
    cwd,
    resolve('/'),
    releaseRoot,
    resolve('appling'),
    buildDir,
    dirname(buildDir)
  ])
  if (process.env.HOME) forbidden.add(resolve(process.env.HOME))

  if (!isWithin(dir, releaseRoot) || forbidden.has(dir)) {
    fail(`refusing to clear unsafe output directory: ${dir} (must be below ${releaseRoot})`)
  }

  for (const unsafeRoot of [resolve('appling'), dirname(buildDir), buildDir]) {
    if (isSameOrWithin(dir, unsafeRoot) || isSameOrWithin(unsafeRoot, dir)) {
      fail(`refusing to clear unsafe output directory: ${dir} (overlaps ${unsafeRoot})`)
    }
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
  walk(root)
  return found.sort((a, b) => a.path.localeCompare(b.path))

  function walk (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.endsWith('.app') && targetPlatform === 'darwin') {
          found.push({ kind: 'app', path })
          continue
        }
        if (shouldSkipDir(entry.name)) continue
        walk(path)
      } else if (entry.isFile() && isReleaseFile(entry.name, targetPlatform)) {
        const stats = statSync(path)
        if (stats.size > 0) found.push({ kind: 'file', path })
      }
    }
  }
}

function shouldSkipDir (name) {
  return name === 'CMakeFiles' || name === '_deps' || name === '.cmake' || name === 'node_modules'
}

function isReleaseFile (name, targetPlatform) {
  return filePatterns[targetPlatform].some((pattern) => pattern.test(name))
}

function artifactExtension (path) {
  const name = basename(path)
  for (const ext of ['.tar.gz', '.tar.xz', '.tar.bz2', '.AppImage']) {
    if (name.endsWith(ext)) return ext
  }
  return extname(name)
}

function stripKnownExtension (name) {
  const ext = artifactExtension(name)
  return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name
}

function sanitizeName (name) {
  return String(name)
    .replace(/\.[A-Za-z0-9.]+$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'artifact'
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
  if (zip.status !== 0) {
    throw new Error(`failed to zip app bundle ${appPath}`)
  }
}

function hashFile (path) {
  const hash = createHash('sha256')
  hash.update(readFileSync(path))
  return hash.digest('hex')
}

function fail (message) {
  console.error(`error: ${message}`)
  process.exit(1)
}
