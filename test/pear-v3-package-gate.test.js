import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkPearV3Contract } from '../scripts/check-pear-v3-contract.mjs'

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const integrity = `sha512-${Buffer.alloc(64, 7).toString('base64')}`

function writeJson (path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function fixture (t) {
  const root = mkdtempSync(join(tmpdir(), 'pearbrowser-v3-gate-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'electron'), { recursive: true })
  mkdirSync(join(root, 'workers'), { recursive: true })

  const pkg = {
    name: 'pearbrowser-desktop',
    main: 'electron/main.cjs',
    upgrade: `pear://${'a'.repeat(52)}`,
    scripts: { start: 'electron electron/main.cjs' },
    pear: { type: 'desktop' },
    dependencies: {
      'pear-install': '1.2.2',
      'pear-runtime': '1.3.1'
    }
  }
  const lock = {
    lockfileVersion: 3,
    packages: {
      '': { dependencies: { ...pkg.dependencies } },
      'node_modules/pear-install': {
        version: '1.2.2',
        resolved: 'https://registry.npmjs.org/pear-install/-/pear-install-1.2.2.tgz',
        integrity
      },
      'node_modules/pear-runtime': {
        version: '1.3.1',
        resolved: 'https://registry.npmjs.org/pear-runtime/-/pear-runtime-1.3.1.tgz',
        integrity,
        dependencies: { 'pear-runtime-updater': '^3.0.0' }
      },
      'node_modules/pear-runtime-updater': {
        version: '3.4.0',
        resolved: 'https://registry.npmjs.org/pear-runtime-updater/-/pear-runtime-updater-3.4.0.tgz',
        integrity
      }
    }
  }
  const host = [
    "const PearRuntime = require('pear-runtime')",
    'const pearRuntime = new PearRuntime({})',
    "pearRuntime.run(require.resolve('../workers/main.js'), [pearRuntime.storage, sessionToken])"
  ].join('\n')

  writeJson(join(root, 'package.json'), pkg)
  writeJson(join(root, 'package-lock.json'), lock)
  writeFileSync(join(root, 'electron', 'main.cjs'), `${host}\n`)
  writeFileSync(join(root, 'workers', 'main.js'), "await import('../index.js')\n")
  writeFileSync(join(root, 'index.js'), 'export const ready = true\n')
  return { root, pkg, lock, host }
}

test('Pear v3 package/source gate accepts the repository contract', () => {
  const report = checkPearV3Contract({ root: repositoryRoot })
  assert.equal(report.ok, true)
  assert.deepEqual(report.direct, { 'pear-install': '1.2.2', 'pear-runtime': '1.3.1' })
  assert.equal(report.updater, '3.4.0')
  assert.equal(report.worker, 'workers/main.js')
})

test('Pear v3 package/source gate rejects legacy packages in manifests and locks', (t) => {
  const direct = fixture(t)
  direct.pkg.dependencies['pear-run'] = '1.0.8'
  writeJson(join(direct.root, 'package.json'), direct.pkg)
  assert.throws(() => checkPearV3Contract({ root: direct.root }), /forbidden legacy package pear-run/)

  const locked = fixture(t)
  locked.lock.packages['node_modules/pear-electron'] = { version: '1.7.28' }
  writeJson(join(locked.root, 'package-lock.json'), locked.lock)
  assert.throws(() => checkPearV3Contract({ root: locked.root }), /forbidden legacy package pear-electron/)
})

test('Pear v3 package/source gate rejects retired package scripts', (t) => {
  const item = fixture(t)
  item.pkg.scripts.start = `pear run pear://${'b'.repeat(52)}`
  writeJson(join(item.root, 'package.json'), item.pkg)
  assert.throws(() => checkPearV3Contract({ root: item.root }), /script start contains shared CLI launcher/)
})

test('Pear v3 package/source gate rejects stale updater locks', (t) => {
  const item = fixture(t)
  item.lock.packages['node_modules/pear-runtime-updater'].version = '3.2.0'
  writeJson(join(item.root, 'package-lock.json'), item.lock)
  assert.throws(() => checkPearV3Contract({ root: item.root }), /pear-runtime-updater must resolve exactly to 3\.4\.0/)
})

test('Pear v3 package/source gate rejects remote or variable worker entrypoints', (t) => {
  const item = fixture(t)
  const remoteHost = item.host.replace(
    "require.resolve('../workers/main.js')",
    'request.catalogueLink'
  )
  writeFileSync(join(item.root, 'electron', 'main.cjs'), `${remoteHost}\n`)
  assert.throws(
    () => checkPearV3Contract({ root: item.root }),
    /must start only the bundled workers\/main\.js entrypoint/
  )

  const secondCall = fixture(t)
  writeFileSync(
    join(secondCall.root, 'electron', 'main.cjs'),
    `${secondCall.host}\npearRuntime.run(request.catalogueLink, [])\n`
  )
  assert.throws(
    () => checkPearV3Contract({ root: secondCall.root }),
    /must have exactly one local host call/
  )
})

test('Pear v3 package/source gate scans active source but preserves historical evidence', (t) => {
  const active = fixture(t)
  mkdirSync(join(active.root, 'backend'), { recursive: true })
  writeFileSync(join(active.root, 'backend', 'legacy.js'), 'export const command = \'pear release production .\'\n')
  assert.throws(() => checkPearV3Contract({ root: active.root }), /backend\/legacy\.js contains v2 release mutation wording/)

  const historical = fixture(t)
  writeFileSync(join(historical.root, 'CHANGELOG.md'), 'Historical: pear release production .\n')
  assert.doesNotThrow(() => checkPearV3Contract({ root: historical.root }))
})
