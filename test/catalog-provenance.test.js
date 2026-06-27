import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogEntryFromPublishedSite, catalogEntryFromSearchResult, catalogEntryFromUrl, catalogModerationSummary, catalogProvenanceSearchText, catalogSourceChips, importAttributionForCatalogSave } from '../ui/lib/catalog-provenance.js'

test('importAttributionForCatalogSave snapshots source catalog provenance', () => {
  const app = importAttributionForCatalogSave({
    id: 'peerit',
    name: 'peerit',
    link: 'pear://peerit',
    catalogName: 'PearBrowser Network',
    catalogKey: 'bee:abc',
    source: 'hyperbee',
    verification: 'author-signed',
    _sources: ['PearBrowser Network', 'Community Catalog']
  }, { now: () => '2026-06-27T12:00:00.000Z' })

  assert.deepEqual(app.importedFrom, {
    catalogName: 'PearBrowser Network',
    catalogKey: 'bee:abc',
    source: 'hyperbee',
    verification: 'author-signed',
    sources: ['PearBrowser Network', 'Community Catalog'],
    appId: 'peerit',
    importedAt: '2026-06-27T12:00:00.000Z'
  })
})

test('catalogSourceChips explains verification, source type, source count, and imported origin', () => {
  const chips = catalogSourceChips({
    catalogName: 'My Catalog',
    source: 'hyperdrive',
    verification: 'unverified',
    importedFrom: {
      catalogName: 'PearBrowser Network',
      source: 'hyperbee',
      verification: 'author-signed',
      sources: ['PearBrowser Network', 'Community Catalog']
    }
  })

  assert.deepEqual(chips.map((chip) => chip.label), [
    'Unsigned',
    'Hyperdrive',
    'My Catalog',
    'Imported: PearBrowser Network',
    'Hyperbee',
    'Original signed'
  ])
  assert.equal(chips.find((chip) => chip.label === 'Imported: PearBrowser Network').tone, 'followed')
})

test('catalogProvenanceSearchText includes imported catalog and moderation fields', () => {
  const text = catalogProvenanceSearchText({
    source: 'hiveindex',
    catalogName: 'Community Catalog',
    status: 'pending-review',
    moderationReason: 'Needs icon',
    moderation: {
      relayResponse: 'queued by relay',
      submittedAt: 42,
      reviewer: 'operator'
    },
    releaseHistory: [
      { version: '2.0.0', publishedAt: '2026-06-27', notes: 'Security update' }
    ],
    importedFrom: {
      catalogName: 'PearBrowser Network',
      source: 'hyperbee',
      verification: 'relay-listed',
      sources: ['Curated']
    }
  })

  assert.match(text, /hiveindex/)
  assert.match(text, /pending-review/)
  assert.match(text, /needs icon/)
  assert.match(text, /queued by relay/)
  assert.match(text, /operator/)
  assert.match(text, /security update/)
  assert.match(text, /2026-06-27/)
  assert.match(text, /pearbrowser network/)
  assert.match(text, /curated/)
})

test('catalog moderation chips and summary explain review state and relay response', () => {
  const app = {
    status: 'pending',
    moderation: {
      reason: 'Needs a working icon',
      relayResponse: 'Relay queued the pin request',
      submittedAt: 42
    }
  }
  const chips = catalogSourceChips(app)
  const status = chips.find((chip) => chip.key === 'status:pending')

  assert.equal(status.label, 'Pending review')
  assert.equal(status.tone, 'self')
  assert.match(status.title, /Needs a working icon/)
  assert.match(catalogModerationSummary(app), /Relay response: Relay queued the pin request/)

  const rejected = catalogSourceChips({ moderationStatus: 'rejected', moderationReason: 'Malware report' })
    .find((chip) => chip.key === 'status:rejected')
  assert.equal(rejected.tone, 'danger')
})

test('catalogEntryFromSearchResult builds saveable rows with search provenance', () => {
  const driveKey = 'a'.repeat(64)
  const app = catalogEntryFromSearchResult({
    docId: 'doc-1',
    driveKey,
    path: '/post',
    title: 'Local-first search',
    excerpt: 'Found in a signed app record',
    tier: 'followed',
    source: {
      kind: 'app-data',
      appSlug: 'peerit',
      verifiedAs: 'app-signed'
    }
  }, { federated: true })

  assert.equal(app.id, 'doc-1')
  assert.equal(app.name, 'Local-first search')
  assert.equal(app.link, `hyper://${driveKey}/post`)
  assert.equal(app.driveKey, driveKey)
  assert.equal(app.source, 'search')
  assert.equal(app.catalogName, 'peerit data search')
  assert.equal(app.verification, 'author-signed')
  assert.deepEqual(app.categories, ['search', 'app data', 'trusted peer'])
})

test('catalogEntryFromUrl builds saveable About-site rows', () => {
  const driveKey = 'b'.repeat(64)
  const app = catalogEntryFromUrl(`hyper://${driveKey}/docs`, {
    title: 'Pear docs',
    source: 'browser',
    catalogName: 'About this site',
    fallbackReason: 'Saved from the browser About panel.'
  })

  assert.equal(app.id, driveKey)
  assert.equal(app.name, 'Pear docs')
  assert.equal(app.driveKey, driveKey)
  assert.equal(app.link, `hyper://${driveKey}/docs`)
  assert.equal(app.type, 'hypersite')
  assert.equal(app.source, 'browser')
  assert.equal(app.catalogName, 'About this site')
})

test('catalogEntryFromPublishedSite keeps publish provenance and relay pin evidence', () => {
  const driveKey = 'c'.repeat(64)
  const app = catalogEntryFromPublishedSite({
    keyHex: driveKey,
    name: 'Launch Notes',
    pin: { ok: true, durable: true, acceptances: 2, replicatedPeers: 1, connectedRelays: 3, unsafe: 'drop me' }
  })

  assert.equal(app.id, driveKey)
  assert.equal(app.name, 'Launch Notes')
  assert.equal(app.link, `hyper://${driveKey}/`)
  assert.equal(app.driveKey, driveKey)
  assert.equal(app.source, 'publisher')
  assert.equal(app.catalogName, 'Published from this browser')
  assert.deepEqual(app.categories, ['published site', 'site', 'publisher'])
  assert.deepEqual(app.pin, {
    ok: true,
    durable: true,
    replicationTimedOut: false,
    acceptances: 2,
    replicatedPeers: 1,
    connectedRelays: 3
  })
  assert.match(app.fallbackReason, /Relay pin confirmed/)
})
