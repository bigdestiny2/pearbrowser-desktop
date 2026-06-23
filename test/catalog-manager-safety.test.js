import test from 'node:test'
import assert from 'node:assert/strict'
import safetyMod from '../backend/catalog-safety.cjs'

const { aggregateCatalogApps, catalogAppSearchText, catalogAppStableKey, normalizeAppType, normalizeCatalogApp, normalizeCatalogData, safeJSONParse, sanitizePersonalCatalogEntry, searchAppsList } = safetyMod
const key = (ch) => ch.repeat(64)

test('safe catalog JSON parse strips prototype-pollution keys recursively', () => {
  const parsed = safeJSONParse(`{
    "name": "Bad Catalog",
    "__proto__": { "polluted": true },
    "constructor": { "prototype": { "polluted": true } },
    "apps": [
      {
        "name": "App",
        "__proto__": { "polluted": true },
        "nested": {
          "constructor": { "prototype": { "polluted": true } },
          "rows": [{ "prototype": { "polluted": true }, "ok": true }]
        }
      }
    ]
  }`)

  assert.equal(Object.prototype.hasOwnProperty.call(parsed, '__proto__'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'constructor'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.apps[0], '__proto__'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.apps[0].nested, 'constructor'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.apps[0].nested.rows[0], 'prototype'), false)
  assert.equal(parsed.apps[0].nested.rows[0].ok, true)
  assert.equal({}.polluted, undefined)
})

test('catalog app search tolerates empty and non-string queries', () => {
  const apps = [
    { id: 'one', name: 'PearBrowser', description: 'P2P browser', categories: ['Tools'], catalogName: 'Pear Apps', source: 'sheets', author: 'Holepunch' },
    { id: 'two', name: 'HiveRelay', description: 'Relay infrastructure', version: '2.1.0', verification: 'relay-listed' }
  ]

  assert.equal(searchAppsList(apps, '').length, 2)
  assert.equal(searchAppsList(apps, null).length, 2)
  assert.deepEqual(searchAppsList(apps, 'relay').map((a) => a.id), ['two'])
  assert.deepEqual(searchAppsList(apps, 'tools').map((a) => a.id), ['one'])
  assert.deepEqual(searchAppsList(apps, 'pear apps').map((a) => a.id), ['one'])
  assert.deepEqual(searchAppsList(apps, '2.1').map((a) => a.id), ['two'])
  assert.ok(catalogAppSearchText(apps[0]).includes('holepunch'))
})

test('catalog JSON normalizer accepts relay items and entries envelopes', () => {
  const itemKey = 'a'.repeat(64)
  const entryKey = 'b'.repeat(64)

  const gatewayCatalog = normalizeCatalogData(safeJSONParse(`{
    "version": 2,
    "name": "HiveRelay Content Catalog",
    "items": [
      {
        "appKey": "${itemKey}",
        "type": "drive",
        "name": "Relay Site",
        "description": "Pinned public drive",
        "__proto__": { "polluted": true }
      }
    ]
  }`))

  assert.equal(gatewayCatalog.apps.length, 1)
  assert.equal(gatewayCatalog.apps[0].driveKey, itemKey)
  assert.equal(gatewayCatalog.apps[0].id, itemKey)
  assert.equal(Object.prototype.hasOwnProperty.call(gatewayCatalog.apps[0], '__proto__'), false)
  assert.equal({}.polluted, undefined)

  const legacyCatalog = normalizeCatalogData({
    name: 'Legacy Relay',
    entries: [
      { key: entryKey, name: 'Legacy Entry' }
    ]
  })

  assert.equal(legacyCatalog.apps.length, 1)
  assert.equal(legacyCatalog.apps[0].driveKey, entryKey)
  assert.equal(legacyCatalog.apps[0].id, entryKey)
})

test('catalog app normalizer drops unsafe targets and keeps allowed app links', () => {
  const driveKey = 'c'.repeat(64)

  assert.equal(normalizeCatalogApp({ id: 'bad-key', driveKey: 'not-a-key', name: 'Bad key' }), null)
  assert.equal(normalizeCatalogApp({ id: 'bad-link', link: 'javascript:alert(1)', name: 'Bad link' }), null)
  assert.equal(normalizeCatalogApp({ id: 'targetless', name: 'No target' }), null)

  assert.deepEqual(normalizeCatalogApp({ id: 'linked', driveKey: 'not-a-key', link: 'pear://keet', name: 'Keet' }), {
    id: 'linked',
    link: 'pear://keet',
    name: 'Keet',
    version: '',
    categories: [],
    verification: 'unverified'
  })

  const hyper = normalizeCatalogApp({ link: `hyper://${driveKey}/app`, name: 'Site' })
  assert.equal(hyper.driveKey, driveKey)
  assert.equal(hyper.link, `hyper://${driveKey}/app`)
})

test('shared catalog app normalizer builds stable target keys', () => {
  const driveKey = key('d')
  const app = normalizeCatalogApp({
    id: 'custom-id',
    name: '  Demo  ',
    appKey: driveKey.toUpperCase(),
    link: ' PEAR://Demo ',
    version: 2,
    categories: [' tools ', '', 'p2p']
  }, { source: 'hiveindex', catalogKey: 'hiveindex:cat', catalogName: 'Relay Index' })

  assert.equal(app.id, 'custom-id')
  assert.equal(app.name, 'Demo')
  assert.equal(app.driveKey, driveKey)
  assert.equal(app.link, 'pear://Demo')
  assert.equal(app.version, '2')
  assert.deepEqual(app.categories, ['tools', 'p2p'])
  assert.equal(app.verification, 'unverified')
  assert.equal(app.source, 'hiveindex')
  assert.equal(catalogAppStableKey(app), `drive:${driveKey}`)

  assert.equal(catalogAppStableKey({ link: ' PEAR://Demo ' }), 'link:pear://Demo')
  assert.equal(catalogAppStableKey({ id: 'only-id' }), 'id:only-id')
  assert.equal(catalogAppStableKey({ id: 'site', link: `hyper://${driveKey}/app` }), `drive:${driveKey}`)
})

test('catalog app normalizer keeps only supported launch types', () => {
  assert.equal(normalizeAppType(' standalone '), 'standalone')
  assert.equal(normalizeAppType('HYPERSITE'), 'hypersite')
  assert.equal(normalizeAppType('desktop'), '')

  const standalone = normalizeCatalogApp({ name: 'Window App', type: 'standalone', link: 'pear://app' })
  assert.equal(standalone.type, 'standalone')

  const invalid = normalizeCatalogApp({ name: 'Bad Type App', type: 'desktop', link: 'pear://app' })
  assert.equal(invalid.type, undefined)
})

test('personal catalog entry sanitizer accepts link-only apps and rejects targetless rows', () => {
  assert.deepEqual(sanitizePersonalCatalogEntry({
    id: 'keet',
    name: ' Keet ',
    link: ' PEAR://keet ',
    categories: [' chat ', '']
  }), {
    id: 'keet',
    name: 'Keet',
    description: '',
    link: 'pear://keet',
    version: '',
    author: '',
    categories: ['chat']
  })

  assert.equal(sanitizePersonalCatalogEntry({ id: 'site', link: `hyper://${key('a')}/app` }).driveKey, key('a'))
  assert.throws(() => sanitizePersonalCatalogEntry({ id: 'empty', name: 'No target' }), /valid 64-hex drive key/)
})

test('backend aggregation dedupes by stable target across all catalog sources', () => {
  const driveKey = key('b')
  const otherDriveKey = key('e')
  const sameIdFirstDriveKey = key('f')
  const catalogs = new Map()

  catalogs.set('drive-cat', {
    drive: {},
    data: {
      name: 'Hyperdrive Cat',
      apps: [
        { id: 'drive-old', name: 'Drive Old', driveKey: driveKey.toUpperCase(), version: '9.0.0', verification: 'unverified', icon: '/old.png' },
        { id: 'same-id', name: 'First Same Id', driveKey: sameIdFirstDriveKey, version: '1.0.0' }
      ]
    }
  })
  catalogs.set('bee:cat', {
    type: 'hyperbee',
    data: {
      name: 'Hyperbee Cat',
      apps: [
        { id: 'drive-newer', name: 'Drive Newer', driveKey, version: '10.0.0', verification: 'unverified', iconData: 'data:image/png;base64,aaa' }
      ]
    }
  })
  catalogs.set('autobee:cat', {
    type: 'autobee',
    data: {
      name: 'Autobee Cat',
      apps: [
        { id: 'drive-signed', name: 'Drive Signed', driveKey, version: '1.0.0', verification: 'author-signed' }
      ]
    }
  })
  catalogs.set('sheets:cat', {
    type: 'sheets',
    data: {
      name: 'Sheets Cat',
      apps: [
        { id: 'link-low', name: 'Link Low', link: 'PEAR://Same', version: '1.0.0', verification: 'relay-listed' }
      ]
    }
  })
  catalogs.set('hiveindex:cat', {
    type: 'hiveindex',
    data: {
      name: 'Hiveindex Cat',
      apps: [
        { id: 'link-high', name: 'Link High', link: 'pear://Same', version: '2.0.0', verification: 'relay-listed' },
        { id: 'same-id', name: 'Second Same Id Different Drive', driveKey: otherDriveKey, version: '1.0.0' }
      ]
    }
  })

  const apps = aggregateCatalogApps(catalogs)
  assert.equal(apps.length, 4)

  const byName = Object.fromEntries(apps.map((app) => [app.name, app]))
  assert.equal(byName['Drive Signed'].driveKey, driveKey)
  assert.equal(byName['Drive Signed'].verification, 'author-signed')
  assert.equal(byName['Drive Signed'].icon, '/old.png')
  assert.equal(byName['Drive Signed'].iconData, 'data:image/png;base64,aaa')
  assert.deepEqual(byName['Drive Signed']._sources.sort(), ['Autobee Cat', 'Hyperbee Cat', 'Hyperdrive Cat'])

  assert.equal(byName['Link High'].link, 'pear://Same')
  assert.equal(byName['Link High'].catalogKey, 'hiveindex:cat')
  assert.deepEqual(byName['Link High']._sources.sort(), ['Hiveindex Cat', 'Sheets Cat'])

  assert.equal(byName['First Same Id'].driveKey, sameIdFirstDriveKey)
  assert.equal(byName['Second Same Id Different Drive'].driveKey, otherDriveKey)
})

test('backend aggregation collapses link-only duplicates with different catalog ids', () => {
  const catalogs = new Map()

  catalogs.set('bee:signed', {
    type: 'hyperbee',
    data: {
      name: 'Signed Catalog',
      apps: [
        { id: 'signed-row', name: 'Signed Link App', link: 'PEAR://shared-app', type: 'standalone', version: '1.0.0', verification: 'author-signed' }
      ]
    }
  })
  catalogs.set('sheets:community', {
    type: 'sheets',
    data: {
      name: 'Community Catalog',
      apps: [
        { id: 'sheet-row-uuid', name: 'Community Link App', link: 'pear://shared-app', type: 'standalone', version: '9.0.0', verification: 'unverified' }
      ]
    }
  })

  const apps = aggregateCatalogApps(catalogs)
  assert.equal(apps.length, 1)
  assert.equal(apps[0].id, 'signed-row')
  assert.equal(apps[0].name, 'Signed Link App')
  assert.equal(apps[0].link, 'pear://shared-app')
  assert.equal(apps[0].type, 'standalone')
  assert.equal(apps[0].verification, 'author-signed')
  assert.deepEqual(apps[0]._sources.sort(), ['Community Catalog', 'Signed Catalog'])
})
