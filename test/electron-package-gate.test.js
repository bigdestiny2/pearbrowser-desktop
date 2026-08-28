import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { generateKeyPairSync } from 'node:crypto'
import { createRequire } from 'node:module'
import { createPackage } from '@electron/asar'
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeAsarEntry } from '../scripts/lib/electron-package-paths.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(import.meta.url)
const {
  MANIFEST_NAME,
  createRuntimeIntegrityEnvelope,
  createRuntimeIntegrityPayload
} = require('../electron/runtime-integrity.cjs')
const checker = join(root, 'scripts', 'check-electron-package.mjs')
const sourcePackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const releaseTag = `v${sourcePackage.version}`
const sourceRef = '0123456789abcdef0123456789abcdef01234567'
const fuseSentinel = 'dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX'
const fuseEnabled = 49
const fuseDisabled = 48

test('Electron package gate normalizes Windows-style ASAR entry paths', () => {
  const entries = [
    '\\package.json',
    '\\electron\\main.cjs',
    'electron\\preload.cjs',
    '/ui/dist/main.bundle.js'
  ]

  assert.deepEqual(entries.map(normalizeAsarEntry), [
    'package.json',
    'electron/main.cjs',
    'electron/preload.cjs',
    'ui/dist/main.bundle.js'
  ])

  const archiveEntries = new Set(entries.map(normalizeAsarEntry))
  assert.ok(archiveEntries.has(normalizeAsarEntry('electron\\main.cjs')))
  assert.ok(archiveEntries.has(normalizeAsarEntry('ui\\dist\\main.bundle.js')))
})

test('Electron package gate verifies reviewed ASAR and physical Pear runtime bytes', async () => {
  const fixture = mkdtempSync(join(tmpdir(), 'pear-electron-package-gate-'))
  try {
    const { resourcesDir, executable } = await createPackageFixture(fixture)
    const pass = runGate(resourcesDir, sourceRef, executable)
    assert.equal(pass.status, 0, pass.stderr || pass.stdout)
    const report = JSON.parse(pass.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.pear, '3.3.0')
    assert.ok(report.runtimeIntegrity.files > 3)
    assert.ok(report.verifiedSourceFiles > 100)
    assert.equal(report.fuses.runAsNode, fuseDisabled)
    assert.equal(report.fuses.cookieEncryption, fuseEnabled)
    assert.equal(report.fuses.nodeOptionsEnvironmentVariable, fuseDisabled)
    assert.equal(report.fuses.nodeCliInspectArguments, fuseDisabled)

    const wrongSource = runGate(resourcesDir, 'fedcba9876543210fedcba9876543210fedcba98', executable)
    assert.notEqual(wrongSource.status, 0)
    assert.match(wrongSource.stdout, /packaged provenance sourceRef/)

    const weakExecutable = join(fixture, 'weak-electron')
    writeFuseFixture(weakExecutable, { runAsNode: fuseEnabled })
    const weakFuses = runGate(resourcesDir, sourceRef, weakExecutable)
    assert.notEqual(weakFuses.status, 0)
    assert.match(weakFuses.stdout, /RunAsNode fuse must be disabled/)

    writeFileSync(join(resourcesDir, 'app.asar.unpacked', 'workers', 'main.js'), 'tampered worker\n')
    const tampered = runGate(resourcesDir, sourceRef, executable)
    assert.notEqual(tampered.status, 0)
    assert.match(tampered.stdout, /packaged source differs from checkout: workers\/main\.js/)
    assert.match(tampered.stdout, /physical Pear runtime integrity verification failed/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

async function createPackageFixture (fixture) {
  const archiveInput = join(fixture, 'archive-input')
  const resourcesDir = join(fixture, 'resources')
  const unpacked = join(resourcesDir, 'app.asar.unpacked')
  mkdirSync(join(archiveInput, 'ui', 'dist'), { recursive: true })
  mkdirSync(resourcesDir, { recursive: true })
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')

  cpSync(join(root, 'electron'), join(archiveInput, 'electron'), { recursive: true })
  cpSync(join(root, 'ui', 'dist', 'main.bundle.js'), join(archiveInput, 'ui', 'dist', 'main.bundle.js'))
  for (const name of ['index.html', 'styles.css']) cpSync(join(root, name), join(archiveInput, name))
  writeFileSync(join(archiveInput, 'package.json'), JSON.stringify({
    ...sourcePackage,
    pearRelease: {
      tag: releaseTag,
      sourceRef,
      mode: 'package-proof',
      pear: '3.3.0'
    },
    pearRuntimeIntegrity: {
      schema: 1,
      algorithm: 'ed25519-sha256-tree-v1',
      publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
    }
  }))
  await createPackage(archiveInput, join(resourcesDir, 'app.asar'))

  cpSync(join(root, 'workers'), join(unpacked, 'workers'), { recursive: true })
  cpSync(join(root, 'backend'), join(unpacked, 'backend'), { recursive: true })
  cpSync(join(root, 'index.js'), join(unpacked, 'index.js'))
  cpSync(join(root, 'packaging', 'pear-runtime-package.json'), join(unpacked, 'package.json'))

  for (const name of ['pear-install', 'pear-runtime', 'pear-runtime-updater']) {
    const target = join(unpacked, 'node_modules', name)
    mkdirSync(target, { recursive: true })
    cpSync(join(root, 'node_modules', name, 'package.json'), join(target, 'package.json'))
  }

  const sidecarName = process.platform === 'win32' ? 'bare.exe' : 'bare'
  const sidecarPath = join(unpacked, 'node_modules', 'bare-sidecar', 'prebuilds', `${process.platform}-${process.arch}`, sidecarName)
  mkdirSync(join(sidecarPath, '..'), { recursive: true })
  const magic = process.platform === 'darwin'
    ? Buffer.from('cffaedfe', 'hex')
    : process.platform === 'linux'
      ? Buffer.from('7f454c46', 'hex')
      : Buffer.from('4d5a0000', 'hex')
  writeFileSync(sidecarPath, Buffer.concat([magic, Buffer.alloc(32)]))
  if (process.platform !== 'win32') chmodSync(sidecarPath, 0o755)
  const payload = createRuntimeIntegrityPayload({
    unpackedRoot: unpacked,
    provenance: {
      tag: releaseTag,
      sourceRef,
      mode: 'package-proof',
      pear: '3.3.0'
    },
    platform: process.platform,
    arch: process.arch
  })
  const envelope = createRuntimeIntegrityEnvelope({ payload, privateKey })
  writeFileSync(join(unpacked, MANIFEST_NAME), JSON.stringify(envelope))
  const executable = join(fixture, 'hardened-electron')
  writeFuseFixture(executable)
  return { resourcesDir, executable }
}

function writeFuseFixture (path, overrides = {}) {
  const wire = [
    overrides.runAsNode ?? fuseDisabled,
    overrides.cookieEncryption ?? fuseEnabled,
    overrides.nodeOptionsEnvironmentVariable ?? fuseDisabled,
    overrides.nodeCliInspectArguments ?? fuseDisabled,
    fuseEnabled,
    fuseEnabled,
    fuseDisabled,
    fuseEnabled
  ]
  writeFileSync(path, Buffer.concat([
    Buffer.from(fuseSentinel, 'ascii'),
    Buffer.from([1, wire.length, ...wire])
  ]))
}

function runGate (resourcesDir, expectedSourceRef = sourceRef, executable = '') {
  const command = [
    checker,
    '--resources-dir', resourcesDir,
    '--tag', releaseTag,
    '--source-ref', expectedSourceRef,
    '--release-mode', 'package-proof',
    '--platform', process.platform,
    '--arch', process.arch,
    '--json'
  ]
  if (executable) command.push('--executable', executable)
  return spawnSync(process.execPath, command, {
    cwd: root,
    encoding: 'utf8'
  })
}
