import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const configSource = readFileSync(new URL('../electron-builder.config.cjs', import.meta.url), 'utf8')
const immutableSourceRef = '0123456789abcdef0123456789abcdef01234567'

// GitHub Actions sets CI for the test job as well as packaging jobs. The
// builder config intentionally requires an immutable source in either case.
if (process.env.CI && !process.env.SOURCE_REF) process.env.SOURCE_REF = immutableSourceRef

test('Electron builder uses the pinned runtime, hybrid ASAR, fuses, and current native formats', () => {
  const config = require('../electron-builder.config.cjs')
  assert.equal(pkg.devDependencies?.electron, '43.2.0')
  assert.equal(pkg.devDependencies?.['electron-builder'], '26.15.3')
  assert.equal(pkg.dependencies?.electron, undefined)
  assert.equal(pkg.scripts?.['install:electron-runtime'], 'node node_modules/electron/install.js')
  for (const platform of ['macos', 'windows', 'linux']) {
    assert.match(pkg.scripts?.[`package:electron:${platform}`] || '', /^npm run -s install:electron-runtime && electron-builder /)
  }
  assert.equal(config.electronVersion, '43.2.0')
  assert.equal(config.electronDist, 'node_modules/electron/dist')
  assert.equal(config.asar, true)
  assert.equal(typeof config.beforePack, 'function')
  assert.equal(typeof config.afterPack, 'function')
  assert.equal(typeof config.afterSign, 'function')
  assert.ok(config.asarUnpack.includes('node_modules/**/*'))
  assert.equal(config.electronFuses.runAsNode, false)
  assert.equal(config.electronFuses.enableCookieEncryption, true)
  assert.equal(config.electronFuses.enableNodeOptionsEnvironmentVariable, false)
  assert.equal(config.electronFuses.enableNodeCliInspectArguments, false)
  assert.equal(config.electronFuses.enableEmbeddedAsarIntegrityValidation, true)
  assert.equal(config.electronFuses.onlyLoadAppFromAsar, true)
  assert.deepEqual(config.mac.target, ['dir'])
  assert.deepEqual(config.win.target, ['nsis'])
  assert.deepEqual(config.linux.target, ['AppImage'])
  assert.equal(config.mac.identity, '-')
  assert.equal(config.forceCodeSigning, false)
  assert.match(config.extraResources[0].to, /app\.asar\.unpacked\/package\.json/)
  assert.doesNotMatch(configSource, /azureSignOptions|Install-Module|MakeAppx|CMake/)
})

test('Electron builder rejects prerelease tags and mutable CI source refs', () => {
  const run = (env) => spawnSync(process.execPath, ['-e', "require('./electron-builder.config.cjs')"], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8'
  })

  const prerelease = run({ RELEASE_TAG: `v${pkg.version}-rc.1` })
  assert.notEqual(prerelease.status, 0)
  assert.match(prerelease.stderr, /stable package tag/)

  const mutableCiSource = run({ CI: 'true', SOURCE_REF: 'local-working-tree' })
  assert.notEqual(mutableCiSource.status, 0)
  assert.match(mutableCiSource.stderr, /exact commit SHA/)
})

test('Electron builder config loads before build-only dependencies are installed', () => {
  const cleanLoad = spawnSync(process.execPath, ['-e', `
    const Module = require('node:module')
    const load = Module._load
    Module._load = function (request, ...args) {
      if (request === 'builder-util') throw new Error('builder-util must be lazy-loaded')
      return load.call(this, request, ...args)
    }
    require('./electron-builder.config.cjs')
  `], {
    cwd: root,
    encoding: 'utf8'
  })
  assert.equal(cleanLoad.status, 0, cleanLoad.stderr)
})
