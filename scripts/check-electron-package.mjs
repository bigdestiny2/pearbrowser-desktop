#!/usr/bin/env node

import { extractFile, listPackage } from '@electron/asar'
import { FuseV1Options, getCurrentFuseWire } from '@electron/fuses'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeAsarEntry } from './lib/electron-package-paths.mjs'

const sourceRoot = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(import.meta.url)
const { verifyRuntimeIntegrity } = require('../electron/runtime-integrity.cjs')
const sourcePackage = readJsonFile(join(sourceRoot, 'package.json'))
const args = parseArgs(process.argv.slice(2))
const resourcesDir = resolve(args.resourcesDir || '')
const archivePath = join(resourcesDir, 'app.asar')
const unpackedRoot = join(resourcesDir, 'app.asar.unpacked')
const expectedTag = normalizeTag(args.tag || `v${sourcePackage.version}`)
const expectedSourceRef = normalizeSourceRef(args.sourceRef || process.env.SOURCE_REF || 'local-working-tree')
const expectedMode = normalizeMode(args.releaseMode || process.env.RELEASE_MODE || 'package-proof')
const expectedPlatform = normalizePlatform(args.platform || process.platform)
const expectedArch = normalizeArch(args.arch || process.arch)
const errors = []
const verifiedSources = []
const enabledFuseState = 49
const disabledFuseState = 48

if (!args.resourcesDir) fail('--resources-dir is required')
if (!existsSync(resourcesDir)) fail(`packaged resources directory does not exist: ${resourcesDir}`)
if (!existsSync(archivePath)) fail(`integrity-protected app.asar is missing: ${archivePath}`)
if (!existsSync(unpackedRoot)) fail(`physical Pear runtime directory is missing: ${unpackedRoot}`)

const archiveEntries = new Set(listPackage(archivePath).map(normalizeAsarEntry))
const packagedPackage = readArchiveJson('package.json')

check(packagedPackage.name === sourcePackage.name, `packaged name must be ${sourcePackage.name}, got ${packagedPackage.name || '(missing)'}`)
check(packagedPackage.productName === sourcePackage.productName, `packaged productName must be ${sourcePackage.productName}, got ${packagedPackage.productName || '(missing)'}`)
check(packagedPackage.version === sourcePackage.version, `packaged version must be ${sourcePackage.version}, got ${packagedPackage.version || '(missing)'}`)
check(`v${packagedPackage.version}` === expectedTag, `packaged version ${packagedPackage.version || '(missing)'} does not match ${expectedTag}`)
check(packagedPackage.main === 'electron/main.cjs', `packaged main must be electron/main.cjs, got ${packagedPackage.main || '(missing)'}`)
check(packagedPackage.updates === false, 'packaged Pear OTA must remain disabled until the production v3 multisig channel is approved')

const provenance = packagedPackage.pearRelease || {}
check(provenance.tag === expectedTag, `packaged provenance tag must be ${expectedTag}, got ${provenance.tag || '(missing)'}`)
check(provenance.sourceRef === expectedSourceRef, `packaged provenance sourceRef must be ${expectedSourceRef}, got ${provenance.sourceRef || '(missing)'}`)
check(provenance.mode === expectedMode, `packaged provenance mode must be ${expectedMode}, got ${provenance.mode || '(missing)'}`)
check(provenance.pear === '3.3.0', `packaged provenance Pear version must be 3.3.0, got ${provenance.pear || '(missing)'}`)

let runtimeIntegrityReport = null
const runtimeIntegrity = packagedPackage.pearRuntimeIntegrity || {}
check(runtimeIntegrity.schema === 1, 'packaged Pear runtime integrity metadata must use schema 1')
check(runtimeIntegrity.algorithm === 'ed25519-sha256-tree-v1', 'packaged Pear runtime integrity algorithm must be ed25519-sha256-tree-v1')
try {
  runtimeIntegrityReport = verifyRuntimeIntegrity({
    unpackedRoot,
    publicKey: runtimeIntegrity.publicKey,
    expected: {
      tag: expectedTag,
      sourceRef: expectedSourceRef,
      releaseMode: expectedMode,
      pear: '3.3.0',
      platform: expectedPlatform,
      arch: expectedArch
    }
  })
} catch (error) {
  errors.push(`physical Pear runtime integrity verification failed: ${error.message}`)
}

const runtimeMarkerPath = join(unpackedRoot, 'package.json')
if (!existsSync(runtimeMarkerPath)) {
  errors.push('physical Pear runtime package marker is missing: package.json')
} else {
  const runtimeMarker = readJsonFile(runtimeMarkerPath)
  check(runtimeMarker.private === true, 'physical Pear runtime package marker must be private')
  check(runtimeMarker.type === 'module', 'physical Pear runtime package marker must declare type=module')
}

const sourceFiles = [
  ...walkFiles(join(sourceRoot, 'electron')),
  ...walkFiles(join(sourceRoot, 'workers')),
  ...walkFiles(join(sourceRoot, 'backend')),
  join(sourceRoot, 'ui', 'dist', 'main.bundle.js'),
  join(sourceRoot, 'index.js'),
  join(sourceRoot, 'index.html'),
  join(sourceRoot, 'styles.css')
]

for (const sourceFile of sourceFiles) {
  const path = normalizeAsarEntry(relative(sourceRoot, sourceFile))
  const packaged = readPackagedFile(path)
  if (!packaged) continue
  const sourceHash = hashBytes(readFileSync(sourceFile))
  const packagedHash = hashBytes(packaged)
  if (sourceHash !== packagedHash) {
    errors.push(`packaged source differs from checkout: ${path}`)
    continue
  }
  verifiedSources.push({ path, sha256: sourceHash })
}

for (const physicalPath of ['workers/main.js', 'index.js', 'backend/index.js']) {
  check(existsSync(join(unpackedRoot, physicalPath)), `Pear runtime entry must be physically unpacked: ${physicalPath}`)
}
for (const archiveEntry of ['electron/main.cjs', 'electron/preload.cjs', 'index.html', 'ui/dist/main.bundle.js']) {
  check(archiveEntries.has(archiveEntry), `integrity-protected ASAR entry is missing: ${archiveEntry}`)
}

const expectedDependencies = {
  'pear-install': '1.2.2',
  'pear-runtime': '1.3.1',
  'pear-runtime-updater': '3.4.0'
}
for (const [name, version] of Object.entries(expectedDependencies)) {
  const dependencyPackagePath = join(unpackedRoot, 'node_modules', ...name.split('/'), 'package.json')
  if (!existsSync(dependencyPackagePath)) {
    errors.push(`packaged runtime dependency is missing: ${name}`)
    continue
  }
  const dependencyPackage = readJsonFile(dependencyPackagePath)
  check(dependencyPackage.version === version, `packaged ${name} must be ${version}, got ${dependencyPackage.version || '(missing)'}`)
}

const sidecarName = expectedPlatform === 'win32' ? 'bare.exe' : 'bare'
const sidecarPath = join(unpackedRoot, 'node_modules', 'bare-sidecar', 'prebuilds', `${expectedPlatform}-${expectedArch}`, sidecarName)
if (!existsSync(sidecarPath)) {
  errors.push(`packaged Pear sidecar is missing for ${expectedPlatform}-${expectedArch}: ${sidecarPath}`)
} else {
  const magic = readFileSync(sidecarPath).subarray(0, 4).toString('hex')
  const validMagic = expectedPlatform === 'darwin'
    ? new Set(['cffaedfe', 'feedfacf', 'cafebabe', 'bebafeca']).has(magic)
    : expectedPlatform === 'linux'
      ? magic === '7f454c46'
      : magic.startsWith('4d5a')
  check(validMagic, `packaged Pear sidecar has the wrong executable format for ${expectedPlatform}: ${magic || '(empty)'}`)
  if (expectedPlatform !== 'win32') {
    check((lstatSync(sidecarPath).mode & 0o111) !== 0, `packaged Pear sidecar is not executable: ${sidecarPath}`)
  }
}

for (const forbidden of ['appling', 'scripts', 'test', '.git']) {
  check(!archiveEntries.has(forbidden) && ![...archiveEntries].some((path) => path.startsWith(`${forbidden}/`)), `ASAR must not contain release-only path: ${forbidden}`)
  check(!existsSync(join(unpackedRoot, forbidden)), `physical runtime must not contain release-only path: ${forbidden}`)
}
check(!existsSync(join(unpackedRoot, 'node_modules', 'electron')), 'packaged application must use the bundled Electron runtime, not a duplicate electron npm package')

let fuseReport = null
if (args.executable) {
  const executable = resolve(args.executable)
  if (!existsSync(executable)) {
    errors.push(`packaged Electron executable is missing: ${executable}`)
  } else {
    try {
      const fuses = await getCurrentFuseWire(executable)
      fuseReport = {
        version: fuses.version,
        runAsNode: fuses[FuseV1Options.RunAsNode],
        cookieEncryption: fuses[FuseV1Options.EnableCookieEncryption],
        nodeOptionsEnvironmentVariable: fuses[FuseV1Options.EnableNodeOptionsEnvironmentVariable],
        nodeCliInspectArguments: fuses[FuseV1Options.EnableNodeCliInspectArguments],
        embeddedAsarIntegrity: fuses[FuseV1Options.EnableEmbeddedAsarIntegrityValidation],
        onlyLoadAppFromAsar: fuses[FuseV1Options.OnlyLoadAppFromAsar]
      }
      check(fuseReport.version === '1', `Electron fuse wire must be version 1, got ${fuseReport.version}`)
      check(fuseReport.runAsNode === disabledFuseState, 'Electron RunAsNode fuse must be disabled')
      check(fuseReport.cookieEncryption === enabledFuseState, 'Electron cookie-encryption fuse is not enabled')
      check(fuseReport.nodeOptionsEnvironmentVariable === disabledFuseState, 'Electron NODE_OPTIONS environment-variable fuse must be disabled')
      check(fuseReport.nodeCliInspectArguments === disabledFuseState, 'Electron Node CLI inspect fuse must be disabled')
      check(fuseReport.embeddedAsarIntegrity === enabledFuseState, 'Electron embedded ASAR integrity fuse is not enabled')
      check(fuseReport.onlyLoadAppFromAsar === enabledFuseState, 'Electron only-load-app-from-ASAR fuse is not enabled')
    } catch (error) {
      errors.push(`could not inspect Electron fuses: ${error.message}`)
    }
  }
}

const report = {
  ok: errors.length === 0,
  resourcesDir,
  tag: expectedTag,
  sourceRef: expectedSourceRef,
  releaseMode: expectedMode,
  platform: expectedPlatform,
  arch: expectedArch,
  version: packagedPackage.version || null,
  main: packagedPackage.main || null,
  pear: provenance.pear || null,
  runtimeIntegrity: runtimeIntegrityReport,
  verifiedSourceFiles: verifiedSources.length,
  fuses: fuseReport,
  errors
}

if (args.json) console.log(JSON.stringify(report, null, 2))
else if (report.ok) {
  console.log(`Electron package verified: PearBrowser ${report.version} from ${report.sourceRef}`)
  console.log(`- embedded Pear: ${report.pear}`)
  if (runtimeIntegrityReport) console.log(`- signed physical runtime tree: ${runtimeIntegrityReport.files} files`)
  console.log(`- byte-identical reviewed source files: ${report.verifiedSourceFiles}`)
  if (fuseReport) console.log('- Electron production hardening and ASAR-integrity fuses: enforced')
  console.log(`- resources: ${report.resourcesDir}`)
} else {
  console.error('Electron package verification failed:')
  for (const error of errors) console.error(`- ${error}`)
}

if (!report.ok) process.exit(1)

function parseArgs (argv) {
  const parsed = { resourcesDir: '', executable: '', tag: '', sourceRef: '', releaseMode: '', platform: '', arch: '', json: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--resources-dir') parsed.resourcesDir = requireValue(argv, ++i, arg)
    else if (arg === '--executable') parsed.executable = requireValue(argv, ++i, arg)
    else if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--source-ref') parsed.sourceRef = requireValue(argv, ++i, arg)
    else if (arg === '--release-mode') parsed.releaseMode = requireValue(argv, ++i, arg)
    else if (arg === '--platform') parsed.platform = requireValue(argv, ++i, arg)
    else if (arg === '--arch') parsed.arch = requireValue(argv, ++i, arg)
    else if (arg === '--json') parsed.json = true
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

function normalizeTag (tag) {
  const normalized = String(tag || '').replace(/^refs\/tags\//, '')
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(normalized)) usage(2, `release tag must look like vX.Y.Z, got ${tag}`)
  return normalized
}

function normalizeSourceRef (value) {
  const normalized = String(value || '')
  if (normalized === 'local-working-tree') return normalized
  if (!/^[0-9a-f]{40}$/.test(normalized)) usage(2, 'source ref must be an exact lowercase 40-character commit SHA')
  return normalized
}

function normalizeMode (value) {
  const normalized = String(value || '')
  if (!['package-proof', 'public-trust'].includes(normalized)) usage(2, `release mode must be package-proof or public-trust, got ${value}`)
  return normalized
}

function normalizePlatform (value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'macos' || normalized === 'mac' || normalized === 'darwin') return 'darwin'
  if (normalized === 'windows' || normalized === 'win' || normalized === 'win32') return 'win32'
  if (normalized === 'linux') return 'linux'
  usage(2, `unsupported platform: ${value}`)
}

function normalizeArch (value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'x64' || normalized === 'x86_64' || normalized === 'amd64') return 'x64'
  if (normalized === 'arm64' || normalized === 'aarch64') return 'arm64'
  usage(2, `unsupported architecture: ${value}`)
}

function walkFiles (root) {
  const files = []
  visit(root)
  return files.sort()

  function visit (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isSymbolicLink()) {
        errors.push(`reviewed source path must not be a symbolic link: ${relative(sourceRoot, path)}`)
      } else if (entry.isDirectory()) {
        visit(path)
      } else if (entry.isFile()) {
        files.push(path)
      }
    }
  }
}

function readPackagedFile (path) {
  const physical = join(unpackedRoot, path)
  if (existsSync(physical)) {
    if (lstatSync(physical).isSymbolicLink()) {
      errors.push(`packaged source must not be a symbolic link: ${path}`)
      return null
    }
    return readFileSync(physical)
  }
  if (!archiveEntries.has(path)) {
    errors.push(`packaged source is missing: ${path}`)
    return null
  }
  try {
    return extractFile(archivePath, path)
  } catch (error) {
    errors.push(`could not extract packaged source ${path}: ${error.message}`)
    return null
  }
}

function readArchiveJson (path) {
  if (!archiveEntries.has(path)) fail(`packaged ASAR JSON is missing: ${path}`)
  try {
    return JSON.parse(extractFile(archivePath, path).toString('utf8'))
  } catch (error) {
    fail(`could not parse packaged ASAR JSON ${path}: ${error.message}`)
  }
}

function hashBytes (bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function readJsonFile (path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(`could not parse JSON ${path}: ${error.message}`)
  }
}

function check (condition, message) {
  if (!condition) errors.push(message)
}

function usage (code, message = '') {
  if (message) console.error(`error: ${message}`)
  console.error('usage: node scripts/check-electron-package.mjs --resources-dir path [--executable path] [--tag vX.Y.Z] [--source-ref 40-char-sha] [--release-mode package-proof|public-trust] [--platform darwin|win32|linux] [--arch x64|arm64] [--json]')
  process.exit(code)
}

function fail (message) {
  console.error(`error: ${message}`)
  process.exit(1)
}
