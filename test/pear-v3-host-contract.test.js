import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const worker = readFileSync(new URL('../workers/main.js', import.meta.url), 'utf8')
const host = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8')
const preload = readFileSync(new URL('../electron/preload.cjs', import.meta.url), 'utf8')
const backendEntry = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
const boot = readFileSync(new URL('../ui/boot.js', import.meta.url), 'utf8')

test('PearBrowser v3 uses an embedded Pear OTA worker behind a native Electron host', () => {
  assert.equal(pkg.main, 'electron/main.cjs')
  assert.equal(pkg.scripts.start, 'electron electron/main.cjs')
  assert.equal(pkg.dependencies?.['pear-runtime'], '1.3.1')
  assert.equal(pkg.dependencies?.electron, '43.2.0')
  assert.match(pkg.upgrade, /^pear:\/\/[13-9a-km-uw-z]{52}$/)

  assert.match(host, /new PearRuntime\(/)
  assert.match(host, /pearRuntime\.run/)
  assert.match(host, /pearRuntime\.updater\.on\('updated'/)
  assert.match(host, /pearRuntime\?\.close/)
  assert.match(host, /crypto\.randomBytes\(32\)/)
  assert.match(host, /contextIsolation: true/)
  assert.match(host, /nodeIntegration: false/)
  assert.match(preload, /contextBridge\.exposeInMainWorld\('pearbrowserRuntime'/)
  assert.match(worker, /Bare\.argv\[2\]/)
  assert.match(worker, /PearBrowserRuntime = \{ storagePath, sessionToken \}/)
  assert.match(backendEntry, /globalThis\.PearBrowserRuntime/)
  assert.doesNotMatch(backendEntry, /from 'pear-electron'/)
  assert.doesNotMatch(backendEntry, /Pear\.config/)
  assert.match(boot, /globalThis\.pearbrowserRuntime\?\.sessionToken/)
})
