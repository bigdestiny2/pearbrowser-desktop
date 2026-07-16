/**
 * Structural / wiring audit for P2P shield distribution (Phase 2/3 gates):
 * filter-list drives and plugin drives. Asserts shipped source surfaces.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shell = readFileSync(join(root, 'ui/shell.js'), 'utf8')
const boot = readFileSync(join(root, 'ui/boot.js'), 'utf8')
const index = readFileSync(join(root, 'backend/index.js'), 'utf8')
const constants = readFileSync(join(root, 'backend/constants.js'), 'utf8')

test('boot.js and constants.js share the distribution command ids; index handles them', () => {
  for (const [name, id] of [
    ['CMD_SHIELD_SUBSCRIBE_LIST', 239],
    ['CMD_SHIELD_UNSUBSCRIBE_LIST', 240],
    ['CMD_SHIELD_REFRESH_LISTS', 241],
    ['CMD_PLUGIN_INSTALL_DRIVE', 242],
    ['CMD_PLUGIN_UPDATE_DRIVE', 243],
    ['CMD_PLUGIN_UNINSTALL', 244]
  ]) {
    assert.match(constants, new RegExp(`const ${name} = ${id}`))
    assert.match(constants, new RegExp(`${name},`))
    assert.match(boot, new RegExp(`${name}: ${id}`))
    assert.match(index, new RegExp(`rpc\\.handle\\(C\\.${name}`))
  }
})

test('backend boots the sync + loader against the hybrid drive fetch path', () => {
  assert.match(index, /require\('\.\/shield-list-sync\.cjs'\)/)
  assert.match(index, /require\('\.\/plugin-drive-loader\.cjs'\)/)
  assert.match(index, /new ShieldListSync\(/)
  assert.match(index, /new PluginDriveLoader\(/)
  assert.match(index, /proxy\._hybridFetch\(keyHex, path\)/)
  assert.match(index, /contentShieldListSync/)
  assert.match(index, /contentShieldPluginInstalls/)
  assert.match(index, /startAutoRefresh\(/)
  assert.match(index, /shieldListSync\?\.stop\(\)/)
})

test('settings UI exposes subscribe/install/update/uninstall controls', () => {
  assert.match(shell, /data-testid="content-shield-list-sync"/)
  assert.match(shell, /data-testid="content-shield-subscribe-input"/)
  assert.match(shell, /data-testid="content-shield-subscribe"/)
  assert.match(shell, /data-testid="plugin-install-input"/)
  assert.match(shell, /data-testid="plugin-install"/)
  assert.match(shell, /data-testid="plugin-escalation"/)
  assert.match(shell, /CMD_SHIELD_SUBSCRIBE_LIST/)
  assert.match(shell, /CMD_SHIELD_REFRESH_LISTS/)
  assert.match(shell, /CMD_PLUGIN_INSTALL_DRIVE/)
  assert.match(shell, /CMD_PLUGIN_UPDATE_DRIVE/)
  assert.match(shell, /CMD_PLUGIN_UNINSTALL/)
})

test('plugin catalogue command ids are mirrored and handled', () => {
  for (const [name, id] of [
    ['CMD_PLUGIN_CATALOG', 245],
    ['CMD_PLUGIN_CATALOG_LOAD_DRIVE', 246],
    ['CMD_PLUGIN_CATALOG_REMOVE_SOURCE', 247]
  ]) {
    assert.match(constants, new RegExp(`const ${name} = ${id}`))
    assert.match(constants, new RegExp(`${name},`))
    assert.match(boot, new RegExp(`${name}: ${id}`))
    assert.match(index, new RegExp(`rpc\\.handle\\(C\\.${name}`))
  }
  assert.match(index, /require\('\.\/plugin-catalog\.cjs'\)/)
  assert.match(index, /new PluginCatalog\(/)
  assert.match(index, /contentShieldPluginCatalog/)
})

test('catalogue UI lists entries with install/open actions and a source loader', () => {
  assert.match(shell, /data-testid="plugin-catalog"/)
  assert.match(shell, /data-testid=\$\{'catalog-install-' \+ entry\.id\}/)
  assert.match(shell, /data-testid=\$\{'catalog-open-' \+ entry\.id\}/)
  assert.match(shell, /data-testid="plugin-catalog-source-input"/)
  assert.match(shell, /data-testid="plugin-catalog-load"/)
  assert.match(shell, /CMD_PLUGIN_CATALOG/)
  assert.match(shell, /CMD_PLUGIN_CATALOG_LOAD_DRIVE/)
  assert.match(shell, /CMD_PLUGIN_CATALOG_REMOVE_SOURCE/)
  // The anonGPT app entry opens through the App-level browse navigation.
  assert.match(shell, /onBrowse\(`hyper:\/\/\$\{entry\.driveKey\}\/`\)/)
  assert.match(shell, /onBrowse=\$\{launchInBrowse\}/)
})

test('escalation guard is fail-closed in the loader source', () => {
  const loader = readFileSync(join(root, 'backend/plugin-drive-loader.cjs'), 'utf8')
  assert.match(loader, /setEnabled\(key, false\)/)
  assert.match(loader, /reviewedFingerprint/)
  assert.match(loader, /acceptedSnapshot/)
  assert.match(loader, /escalated: true/)
})
