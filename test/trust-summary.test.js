import test from 'node:test'
import assert from 'node:assert/strict'
import { appTrustSummary, siteTrustSummary } from '../ui/lib/trust-summary.js'

test('appTrustSummary explains signed standalone apps with catalog and availability signals', () => {
  const summary = appTrustSummary({
    type: 'standalone',
    link: 'pear://example',
    verification: 'author-signed',
    _sources: ['Signed Catalog', 'Community Catalog']
  }, {
    driveInfo: { peerCount: 3, byteLength: 12345 }
  })

  assert.equal(summary.risk, 'review')
  assert.deepEqual(summary.badges.map((b) => b.label), [
    'author-signed',
    'window app',
    '2 catalogs',
    '3 peers',
    '12.1 KB'
  ])
  assert.match(summary.summary, /Author-signed catalog entry/)
  assert.match(summary.summary, /Opens in its own Pear window/)
  assert.match(summary.summary, /Listed by 2 catalogs/)
  assert.match(summary.summary, /3 peers serving, 12.1 KB/)
})

test('appTrustSummary keeps hypersite catalog entries normal risk', () => {
  const summary = appTrustSummary({
    type: 'hypersite',
    driveKey: 'a'.repeat(64),
    verification: 'relay-listed',
    catalogName: 'Relay Catalog'
  })

  assert.equal(summary.risk, 'normal')
  assert.deepEqual(summary.badges.map((b) => b.label), [
    'relay-listed',
    'tab app',
    'Relay Catalog'
  ])
  assert.match(summary.summary, /Runs inside a browser tab/)
})

test('appTrustSummary includes release history evidence', () => {
  const summary = appTrustSummary({
    type: 'hypersite',
    driveKey: 'b'.repeat(64),
    verification: 'author-signed',
    catalogName: 'Signed Catalog',
    version: '2.0.0',
    publishedAt: Date.UTC(2026, 5, 27),
    releaseHistory: [
      { version: '2.0.0', publishedAt: Date.UTC(2026, 5, 27), notes: 'Security update' },
      { version: '1.0.0', publishedAt: Date.UTC(2026, 0, 1), notes: 'Initial release' }
    ]
  })

  assert.equal(summary.risk, 'normal')
  assert.deepEqual(summary.badges.map((b) => b.label), [
    'author-signed',
    'tab app',
    'Signed Catalog',
    'v2.0.0',
    '2 releases'
  ])
  assert.match(summary.summary, /Current version v2.0.0/)
  assert.match(summary.summary, /latest release 2026-06-27/)
  assert.match(summary.summary, /2 cataloged releases/)
  assert.match(summary.summary, /Latest note: Security update/)
})

test('appTrustSummary surfaces signed release manifest evidence', () => {
  const summary = appTrustSummary({
    type: 'hypersite',
    driveKey: 'b'.repeat(64),
    verification: 'author-signed',
    version: '3.0.0',
    signedReleaseHistory: [
      {
        version: '3.0.0',
        releasedAt: Date.UTC(2026, 6, 1),
        notes: 'Signed release',
        manifestSignature: 'sig-' + 'a'.repeat(64),
        signerPubkey: 'c'.repeat(64)
      }
    ]
  })

  assert.deepEqual(summary.badges.map((b) => b.label), [
    'author-signed',
    'tab app',
    'v3.0.0',
    '1 signed',
    'released'
  ])
  assert.match(summary.summary, /1 signed release manifest/)
  assert.match(summary.summary, /latest release 2026-07-01/)
  assert.match(summary.summary, /Latest note: Signed release/)
})

test('appTrustSummary promotes publisher identity into the Trust Center', () => {
  const publisherKey = 'c'.repeat(64)
  const summary = appTrustSummary({
    type: 'hypersite',
    driveKey: 'b'.repeat(64),
    verification: 'author-signed',
    author: 'Demo Publisher',
    publisherKey
  })

  assert.deepEqual(summary.badges.map((b) => b.label), [
    'author-signed',
    'by Demo Publisher',
    'tab app'
  ])
  assert.match(summary.badges.find((b) => b.key === 'publisher:name').title, /Publisher key/)
  assert.match(summary.summary, /Publisher Demo Publisher/)
  assert.equal(summary.evidence.publisher.key, publisherKey)
})

test('appTrustSummary includes community moderation state as trust evidence', () => {
  const pending = appTrustSummary({
    type: 'hypersite',
    driveKey: 'e'.repeat(64),
    verification: 'relay-listed',
    catalogName: 'Community Catalog',
    moderation: {
      status: 'pending-review',
      reason: 'Needs icon',
      relayResponse: 'Relay queued the pin request'
    }
  })

  assert.equal(pending.risk, 'review')
  assert.deepEqual(pending.badges.map((b) => b.label), [
    'relay-listed',
    'tab app',
    'Community Catalog',
    'pending review'
  ])
  assert.match(pending.summary, /Waiting for community catalog review/)
  assert.match(pending.summary, /Relay response: Relay queued the pin request/)

  const rejected = appTrustSummary({
    type: 'hypersite',
    driveKey: 'f'.repeat(64),
    verification: 'relay-listed',
    moderationStatus: 'rejected',
    moderationReason: 'Malware report'
  })
  assert.equal(rejected.badges.find((b) => b.key === 'moderation:rejected').tone, 'danger')
})

test('appTrustSummary includes relay pin evidence saved on published site rows', () => {
  const summary = appTrustSummary({
    type: 'hypersite',
    driveKey: 'd'.repeat(64),
    verification: 'unverified',
    catalogName: 'Published from this browser',
    pin: { ok: true, durable: true, acceptances: 2, replicatedPeers: 1 }
  })

  assert.deepEqual(summary.badges.map((b) => b.label), [
    'unverified',
    'tab app',
    'Published from this browser',
    'relay-confirmed'
  ])
  assert.match(summary.summary, /Relay pin confirmed with 1 replicated peer/)
})

test('appTrustSummary folds stored login and swarm grants into the trust surface', () => {
  const driveKey = 'c'.repeat(64)
  const summary = appTrustSummary({
    type: 'hypersite',
    driveKey,
    verification: 'relay-listed'
  }, {
    loginGrants: [{
      driveKeyHex: driveKey,
      appName: 'Peer App',
      scopes: ['profile:name', 'profile:email', 'contacts:read'],
      grantedAt: 1000
    }],
    swarmGrants: [
      { driveKey, topicHex: 'd'.repeat(64), protocol: 'pear.test.v1', grantedAt: 2000 },
      { driveKey, topicHex: 'e'.repeat(64), protocol: 'pear.test.v1', grantedAt: 3000 }
    ]
  })

  assert.deepEqual(summary.badges.map((b) => b.label), [
    'relay-listed',
    'tab app',
    'signed in',
    '2 profile',
    'contacts',
    '2 swarm'
  ])
  assert.match(summary.summary, /Has a stored sign-in grant/)
  assert.match(summary.summary, /Shares display name and email/)
  assert.match(summary.summary, /Can read saved contacts/)
  assert.match(summary.summary, /Has 2 persistent swarm topic grants/)
})

test('appTrustSummary flags unknown unverified launch targets for review', () => {
  const summary = appTrustSummary({
    link: 'https://example.com/app',
    verification: 'unverified'
  })

  assert.equal(summary.risk, 'review')
  assert.deepEqual(summary.badges.map((b) => b.label), ['unverified', 'external link'])
})

test('siteTrustSummary distinguishes discovered published sites from local drafts', () => {
  const discovered = siteTrustSummary({ driveKey: 'b'.repeat(64), name: 'Peer Site' })
  assert.equal(discovered.risk, 'normal')
  assert.deepEqual(discovered.badges.map((b) => b.label), ['published', 'hyperdrive', 'relay-pinned'])
  assert.match(discovered.summary, /Relay-pinned discovery entry/)

  const draft = siteTrustSummary({ name: 'Draft' }, { owned: true })
  assert.equal(draft.risk, 'review')
  assert.deepEqual(draft.badges.map((b) => b.label), ['your site', 'draft'])
  assert.match(draft.summary, /Draft site/)
})

test('siteTrustSummary shows relay pin evidence for owned published sites', () => {
  const summary = siteTrustSummary({
    keyHex: 'f'.repeat(64),
    published: true,
    pin: { ok: true, acceptances: 2, replicatedPeers: 1, durable: true }
  }, { owned: true })

  assert.deepEqual(summary.badges.map((b) => b.label), ['your site', 'published', 'hyperdrive', 'relay-confirmed'])
  assert.match(summary.summary, /Relay pin confirmed with 1 replicated peer/)
})

test('siteTrustSummary includes site lifecycle release evidence', () => {
  const summary = siteTrustSummary({
    keyHex: 'a'.repeat(64),
    published: true,
    createdAt: Date.UTC(2026, 0, 1),
    publishedAt: Date.UTC(2026, 1, 1),
    updatedAt: Date.UTC(2026, 5, 27)
  }, { owned: true })

  assert.deepEqual(summary.badges.map((b) => b.label), ['your site', 'published', 'hyperdrive', 'updated'])
  assert.match(summary.summary, /Created 2026-01-01/)
  assert.match(summary.summary, /Published 2026-02-01/)
  assert.match(summary.summary, /Updated 2026-06-27/)
})

test('siteTrustSummary promotes publisher identity for discovered sites', () => {
  const publisherKey = '9'.repeat(64)
  const summary = siteTrustSummary({
    keyHex: 'a'.repeat(64),
    publisher: 'Site Publisher',
    publisherKey
  })

  assert.deepEqual(summary.badges.map((b) => b.label), ['by Site Publisher', 'published', 'hyperdrive', 'relay-pinned'])
  assert.match(summary.summary, /Publisher Site Publisher/)
  assert.equal(summary.evidence.publisher.key, publisherKey)
})

test('siteTrustSummary includes stored grants for hyperdrive sites', () => {
  const keyHex = '1'.repeat(64)
  const summary = siteTrustSummary({
    keyHex,
    published: true
  }, {
    owned: true,
    loginGrants: [{ driveKey: keyHex, scopes: ['profile:name'], grantedAt: 1 }],
    swarmGrants: [{ driveKey: keyHex, topicHex: '2'.repeat(64), grantedAt: 2 }]
  })

  assert.deepEqual(summary.badges.map((b) => b.label), ['your site', 'published', 'hyperdrive', 'signed in', '1 profile', '1 swarm'])
  assert.match(summary.summary, /Has a stored sign-in grant/)
  assert.match(summary.summary, /Has 1 persistent swarm topic grant/)
})
