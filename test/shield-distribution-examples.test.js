/**
 * The shipped example artifacts must actually work end-to-end through the
 * real loader/sync classes: both example plugins install from their
 * directories as if they were drives, and the built pear-default list
 * passes checksum verification.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { ContentShield } = require('../backend/content-shield.cjs')
const { PearPluginRegistry } = require('../backend/pear-plugins.cjs')
const { PluginDriveLoader } = require('../backend/plugin-drive-loader.cjs')
const { ShieldListSync } = require('../backend/shield-list-sync.cjs')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PEERIT_KEY = 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4'

function driveFromDirectory (dir) {
  return async (driveKey, path) => {
    const file = join(root, dir, path.slice(1))
    if (!existsSync(file)) return null
    return { content: readFileSync(file) }
  }
}

function makeHarness (dir) {
  const shield = new ContentShield({ builtinList: false })
  const registry = new PearPluginRegistry({ shield })
  const loader = new PluginDriveLoader({
    registry,
    fetchDriveFile: driveFromDirectory(dir),
    persistInstall: async () => {}
  })
  return { shield, registry, loader }
}

test('dark-reader example installs and styles every host', async () => {
  const key = 'a'.repeat(64)
  const { shield, loader } = makeHarness('examples/plugins/dark-reader')

  const result = await loader.installFromDrive(key)
  assert.equal(result.ok, true)
  assert.deepEqual(result.granted, ['pear.content.styles'])

  const css = shield.pluginStylesFor('anything.example')
  assert.ok(css.includes('color-scheme: dark'))
  // Styles only: no scripts, no filter contributions.
  assert.deepEqual(shield.pluginScriptsFor('anything.example'), [])
})

test('peerit-enhancer example installs scoped to the peerit drive', async () => {
  const key = 'b'.repeat(64)
  const { shield, loader } = makeHarness('examples/plugins/peerit-enhancer')

  const result = await loader.installFromDrive(key)
  assert.equal(result.ok, true)
  assert.deepEqual(result.granted, ['pear.content.styles', 'pear.content.scripts', 'pear.net.filter'])

  // Scoped: applies on the peerit drive host, not elsewhere.
  assert.ok(shield.pluginStylesFor(PEERIT_KEY).includes('reading-width') || shield.pluginStylesFor(PEERIT_KEY).includes('max-width'))
  assert.equal(shield.pluginStylesFor('c'.repeat(64)), '')
  assert.ok(shield.pluginScriptsFor(PEERIT_KEY).some(item => item.body.includes('__peeritEnhancer')))
  assert.deepEqual(shield.pluginScriptsFor('c'.repeat(64)), [])

  // Filter contribution parsed into the plugin's namespaced list.
  assert.ok(shield.cosmeticCssFor(PEERIT_KEY).includes('.promoted-post'))
})

test('pear-default list builds, verifies, and subscribes through the real sync', async () => {
  const manifest = JSON.parse(readFileSync(join(root, 'filter-lists/pear-default/manifest.json'), 'utf8'))
  const filters = readFileSync(join(root, 'filter-lists/pear-default/filters.txt'))
  assert.equal(createHash('sha256').update(filters).digest('hex'), manifest.sha256)

  const key = 'd'.repeat(64)
  const shield = new ContentShield({ builtinList: false })
  const sync = new ShieldListSync({
    shield,
    fetchDriveFile: driveFromDirectory('filter-lists/pear-default'),
    sha256Hex: (buf) => createHash('sha256').update(buf).digest('hex'),
    persistMeta: async () => {}
  })

  const result = await sync.subscribe(key)
  assert.equal(result.changed, true)
  assert.equal(result.name, 'pear-default')
  assert.ok(result.rules >= 60)
  assert.equal(shield.shouldBlockUrl('https://stats.doubleclick.net/pixel').blocked, true)
  assert.equal(shield.shouldBlockUrl('https://maps.googleapis.com/maps/api/js').blocked, false)
  assert.ok(shield.cosmeticCssFor('any.example').includes('.sponsored-content'))
})
