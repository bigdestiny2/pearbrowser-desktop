import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Script } from 'node:vm'

const root = new URL('..', import.meta.url).pathname
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))

test('QVAC native runtime dependencies are exact and lockfile-aligned', () => {
  assert.equal(pkg.dependencies['@qvac/bare-sdk'], '0.14.1')
  assert.equal(pkg.dependencies['@qvac/llm-llamacpp'], '0.36.3')
  assert.equal(pkg.dependencies['bare-env'], '3.0.0')
  assert.equal(pkg.dependencies['bare-process'], '4.5.0')
  assert.equal(pkg.devDependencies.bare, '1.30.3')
  assert.equal(lock.packages['node_modules/@qvac/bare-sdk'].version, '0.14.1')
  assert.equal(lock.packages['node_modules/@qvac/llm-llamacpp'].version, '0.36.3')
  assert.equal(lock.packages['node_modules/bare-env'].version, '3.0.0')
})

test('QVAC llama.cpp addon includes every desktop release target prebuild', () => {
  const prebuilds = join(root, 'node_modules', '@qvac', 'llm-llamacpp', 'prebuilds')
  for (const host of ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']) {
    assert.equal(
      existsSync(join(prebuilds, host, 'qvac__llm-llamacpp.bare')),
      true,
      `missing QVAC native prebuild for ${host}`
    )
  }
})

test('QVAC native smoke package is excluded from production Pear staging', () => {
  assert.ok(pkg.pear.stage.ignore.includes('/qvac-smoke'))
  assert.ok(pkg.pear.stage.entrypoints.includes('/backend/ai/qvac-runtime.mjs'))
})

test('QVAC host statically links the runtime to avoid Pear dynamic-import crashes', () => {
  const source = readFileSync(join(root, 'backend', 'ai', 'qvac-host.mjs'), 'utf8')
  assert.match(source, /import \{ createQvacAdapter \} from '\.\/qvac-runtime\.mjs'/)
  assert.doesNotMatch(source, /\bimport\s*\(/)
})

test('injected page AI shim is valid browser JavaScript', () => {
  const source = readFileSync(join(root, 'backend', 'pear-bridge.js'), 'utf8')
  const template = source.match(/const PEAR_SYNC_SHIM = `<script>([\s\S]*?)<\/script>`/)
  assert.ok(template, 'PEAR_SYNC_SHIM template not found')
  assert.doesNotThrow(() => new Script(template[1]))
})
