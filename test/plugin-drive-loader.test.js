import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { ContentShield } = require('../backend/content-shield.cjs')
const { PearPluginRegistry } = require('../backend/pear-plugins.cjs')
const { PluginDriveLoader, PluginDriveError, MAX_ASSET_BYTES } = require('../backend/plugin-drive-loader.cjs')

const KEY = 'a1'.repeat(32)

function pluginManifest (capabilities, content, version = '1.0.0') {
  return JSON.stringify({
    name: 'Fixture Plugin',
    version,
    pear: { plugin: { capabilities, content } }
  })
}

function makeLoader (files) {
  const shield = new ContentShield({ builtinList: false })
  const registry = new PearPluginRegistry({ shield })
  const persisted = new Map()
  const store = { ...files }
  const loader = new PluginDriveLoader({
    registry,
    fetchDriveFile: async (driveKey, path) => {
      const value = store[path]
      return value == null ? null : { content: Buffer.from(value) }
    },
    persistInstall: async (id, payload) => {
      if (payload === null) persisted.delete(id)
      else persisted.set(id, structuredClone(payload))
    },
    now: () => 99
  })
  return { loader, registry, shield, persisted, store }
}

test('install from a drive fetches assets and applies the contribution', async () => {
  const { loader, registry, shield, persisted } = makeLoader({
    '/manifest.json': pluginManifest(
      ['pear.content.styles', 'pear.content.scripts', 'pear.net.filter'],
      {
        styles: { matches: ['*'], path: '/style.css' },
        scripts: { matches: ['*'], path: '/content.js' },
        filters: '/filters.txt'
      }
    ),
    '/style.css': '.fixture-hide { display: none }',
    '/content.js': 'window.__fixture = 1',
    '/filters.txt': '||fixture-ads.example.com^'
  })

  const result = await loader.installFromDrive(KEY)
  assert.equal(result.ok, true)
  assert.equal(result.version, '1.0.0')
  assert.deepEqual(result.granted, ['pear.content.styles', 'pear.content.scripts', 'pear.net.filter'])

  const listed = registry.list().find(item => item.id === KEY)
  assert.ok(listed)
  assert.equal(listed.enabled, true)

  assert.equal(shield.shouldBlockUrl('https://fixture-ads.example.com/x.js').blocked, true)
  assert.ok(shield.pluginStylesFor('anything.example').includes('.fixture-hide'))
  assert.ok(shield.pluginScriptsFor('anything.example').some(item => (item.body || '').includes('__fixture')))

  const payload = persisted.get(KEY)
  assert.equal(payload.version, '1.0.0')
  assert.deepEqual(payload.granted, result.granted)
})

test('a narrower explicit grant strips ungranted capabilities before the engine', async () => {
  const { loader, shield } = makeLoader({
    '/manifest.json': pluginManifest(
      ['pear.content.styles', 'pear.net.filter'],
      {
        styles: { matches: ['*'], path: '/style.css' },
        filters: '/filters.txt'
      }
    ),
    '/style.css': '.fixture-hide { display: none }',
    '/filters.txt': '||fixture-ads.example.com^'
  })

  const result = await loader.installFromDrive(KEY, { grantedCapabilities: ['pear.content.styles'] })
  assert.deepEqual(result.granted, ['pear.content.styles'])

  // Styles applied, network filter NOT applied (capability was not granted).
  assert.ok(shield.pluginStylesFor('x.example').includes('.fixture-hide'))
  assert.equal(shield.shouldBlockUrl('https://fixture-ads.example.com/x.js').blocked, false)
})

test('an update that escalates capabilities disables the plugin pending re-consent', async () => {
  const { loader, registry, store } = makeLoader({
    '/manifest.json': pluginManifest(['pear.content.styles'], {
      styles: { matches: ['*'], path: '/style.css' }
    }),
    '/style.css': '.fixture-hide { display: none }'
  })
  await loader.installFromDrive(KEY)

  // The drive updates itself over the swarm: same plugin, new powers.
  store['/manifest.json'] = pluginManifest(
    ['pear.content.styles', 'pear.content.scripts'],
    {
      styles: { matches: ['*'], path: '/style.css' },
      scripts: { matches: ['*'], path: '/content.js' }
    },
    '2.0.0'
  )
  store['/content.js'] = 'window.__sneaky = 1'

  const outcome = await loader.updateFromDrive(KEY)
  assert.equal(outcome.ok, false)
  assert.equal(outcome.escalated, true)
  assert.deepEqual(outcome.added, ['pear.content.scripts'])

  const listed = registry.list().find(item => item.id === KEY)
  assert.equal(listed.enabled, false)
  assert.equal(loader.installRecord(KEY).escalated.added[0], 'pear.content.scripts')

  // Explicit re-consent accepts the escalation and re-enables.
  const accepted = await loader.updateFromDrive(KEY, { acceptEscalation: true })
  assert.equal(accepted.ok, true)
  assert.equal(accepted.escalationAccepted, true)
  assert.deepEqual(accepted.granted, ['pear.content.styles', 'pear.content.scripts'])
  assert.equal(registry.list().find(item => item.id === KEY).enabled, true)
})

test('a same-capability update hot-swaps without consent friction', async () => {
  const { loader, shield, store } = makeLoader({
    '/manifest.json': pluginManifest(['pear.content.styles'], {
      styles: { matches: ['*'], path: '/style.css' }
    }),
    '/style.css': '.v1 { display: none }'
  })
  await loader.installFromDrive(KEY)

  store['/manifest.json'] = pluginManifest(['pear.content.styles'], {
    styles: { matches: ['*'], path: '/style.css' }
  }, '1.1.0')
  store['/style.css'] = '.v2 { display: none }'

  const outcome = await loader.updateFromDrive(KEY)
  assert.equal(outcome.ok, true)
  assert.equal(outcome.version, '1.1.0')
  assert.ok(shield.pluginStylesFor('x.example').includes('.v2'))
})

test('missing manifests, invalid assets, and oversized assets fail closed', async () => {
  const none = makeLoader({})
  await assert.rejects(none.loader.installFromDrive(KEY), err => err.code === 'manifest-unavailable')

  const notPlugin = makeLoader({ '/manifest.json': JSON.stringify({ name: 'app' }) })
  await assert.rejects(notPlugin.loader.installFromDrive(KEY), err => err.code === 'not-a-plugin')

  const missingAsset = makeLoader({
    '/manifest.json': pluginManifest(['pear.content.styles'], {
      styles: { matches: ['*'], path: '/style.css' }
    })
  })
  await assert.rejects(missingAsset.loader.installFromDrive(KEY), err => err.code === 'asset-unavailable')

  const traversal = makeLoader({
    '/manifest.json': pluginManifest(['pear.content.styles'], {
      styles: { matches: ['*'], path: '/../escape.css' }
    })
  })
  await assert.rejects(traversal.loader.installFromDrive(KEY), err => err.code === 'asset-path-invalid')

  const oversized = makeLoader({
    '/manifest.json': pluginManifest(['pear.content.styles'], {
      styles: { matches: ['*'], path: '/style.css' }
    }),
    '/style.css': 'x'.repeat(MAX_ASSET_BYTES + 1)
  })
  await assert.rejects(oversized.loader.installFromDrive(KEY), err => err.code === 'asset-too-large')

  assert.ok(new PluginDriveError('x', 'y') instanceof Error)
})

test('uninstall removes the registration and the durable payload', async () => {
  const { loader, registry, shield, persisted } = makeLoader({
    '/manifest.json': pluginManifest(['pear.content.styles', 'pear.net.filter'], {
      styles: { matches: ['*'], path: '/style.css' },
      filters: '/filters.txt'
    }),
    '/style.css': '.fixture-hide { display: none }',
    '/filters.txt': '||fixture-ads.example.com^'
  })
  await loader.installFromDrive(KEY)
  assert.equal(shield.shouldBlockUrl('https://fixture-ads.example.com/x.js').blocked, true)

  const removed = await loader.uninstall(KEY)
  assert.equal(removed.removed, true)
  assert.equal(registry.list().length, 0)
  assert.equal(persisted.has(KEY), false)
  assert.equal(shield.shouldBlockUrl('https://fixture-ads.example.com/x.js').blocked, false)
  assert.equal(shield.pluginStylesFor('x.example'), '')
})
