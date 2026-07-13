/**
 * Structural / wiring audit for Content Shield Phases 2–3 chrome + RPC.
 * Asserts shipped source surfaces (not a re-implementation of the engine).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shell = readFileSync(join(root, 'ui/shell.js'), 'utf8')
const boot = readFileSync(join(root, 'ui/boot.js'), 'utf8')
const index = readFileSync(join(root, 'backend/index.js'), 'utf8')
const constants = readFileSync(join(root, 'backend/constants.js'), 'utf8')
const proxy = readFileSync(join(root, 'backend/hyper-proxy.js'), 'utf8')

test('Settings card and urlbar chip wire to real shield RPC paths', () => {
  assert.match(shell, /data-testid="content-shield-card"/)
  assert.match(shell, /data-testid="content-shield-toggle"/)
  assert.match(shell, /data-testid="content-shield-allow-toggle"/)
  assert.match(shell, /data-testid="content-shield-strict-toggle"/)
  assert.match(shell, /data-testid="content-shield-plugins"/)
  assert.match(shell, /data-testid="shield-status-chip"/)
  assert.match(shell, /CMD_SHIELD_STATUS/)
  assert.match(shell, /CMD_SHIELD_SET_ALLOW/)
  assert.match(shell, /CMD_SHIELD_SET_STRICT/)
  assert.match(shell, /CMD_PLUGIN_LIST/)
  assert.match(shell, /CMD_PLUGIN_SET_ENABLED/)
  assert.match(shell, /function ShieldStatusChip/)
  assert.match(shell, /function ContentShieldSection/)
})

test('boot.js and constants.js share Phase 2–3 shield/plugin command ids', () => {
  for (const [name, id] of [
    ['CMD_SHIELD_STATUS', 230],
    ['CMD_SHIELD_LOAD_LIST', 231],
    ['CMD_SHIELD_REMOVE_LIST', 232],
    ['CMD_SHIELD_SET_ALLOW', 233],
    ['CMD_SHIELD_SET_STRICT', 234],
    ['CMD_PLUGIN_LIST', 235],
    ['CMD_PLUGIN_SET_ENABLED', 236],
    ['CMD_PLUGIN_REGISTER', 237]
  ]) {
    assert.match(constants, new RegExp(`const ${name} = ${id}`))
    assert.match(boot, new RegExp(`${name}: ${id}`))
    assert.match(index, new RegExp(`rpc\\.handle\\(C\\.${name}`))
  }
})

test('hyper-proxy ships allowlist, strict CSP, scriptlet, and plugin inject chokepoints', () => {
  assert.match(proxy, /documentKey/)
  assert.match(proxy, /isStrict/)
  assert.match(proxy, /strictCspContent/)
  assert.match(proxy, /scriptletsFor/)
  assert.match(proxy, /pluginStylesFor/)
  assert.match(proxy, /pluginScriptsFor/)
  assert.match(proxy, /data-pear-scriptlet/)
  assert.match(proxy, /data-pear-plugin/)
  assert.match(proxy, /data-pear-shield-strict/)
  assert.match(proxy, /X-Pear-Shield/)
})

test('fixture plugin manifest declares pear.plugin capabilities and loads via registry', () => {
  const fixturePath = join(root, 'test/fixtures/pear-plugin-blocker/manifest.json')
  assert.equal(existsSync(fixturePath), true)
  const manifest = JSON.parse(readFileSync(fixturePath, 'utf8'))
  assert.equal(manifest.pear.plugin, true)
  assert.ok(manifest.pear.capabilities.includes('pear.net.filter'))

  const { ContentShield } = require('../backend/content-shield.cjs')
  const { PearPluginRegistry } = require('../backend/pear-plugins.cjs')
  const shield = new ContentShield({ builtinList: false })
  const reg = new PearPluginRegistry({ shield })
  const result = reg.register({ id: 'fixture-blocker', manifest })
  assert.equal(result.ok, true)
  assert.equal(result.applied.filters, true)
  assert.equal(shield.shouldBlockUrl('https://fixture-ads.example/x').blocked, true)
  assert.match(shield.cosmeticCssFor('x'), /\.fixture-ad/)
  assert.match(shield.pluginStylesFor('x'), /\.fixture-banner/)
})
