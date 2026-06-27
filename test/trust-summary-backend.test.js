import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildTrustSummary } = require('../backend/trust-summary.cjs')

const key = (ch) => ch.repeat(64)

test('backend trust summary DTO explains app catalog, release, pin, availability, and grants', () => {
  const driveKey = key('a')
  const publisherKey = key('d')
  const summary = buildTrustSummary({
    kind: 'app',
    driveKey,
    app: {
      type: 'hypersite',
      driveKey,
      verification: 'author-signed',
      author: 'Demo Publisher',
      publisherKey,
      catalogName: 'Signed Catalog',
      version: '2.0.0',
      publishedAt: Date.UTC(2026, 5, 27),
      releaseHistory: [
        { version: '2.0.0', publishedAt: Date.UTC(2026, 5, 27), notes: 'Security update' },
        { version: '1.0.0', publishedAt: Date.UTC(2026, 0, 1), notes: 'Initial release' }
      ],
      pin: { ok: true, durable: true, acceptances: 2, replicatedPeers: 1 }
    },
    driveInfo: { peerCount: 3, byteLength: 12345 },
    loginGrants: [{ driveKeyHex: driveKey, scopes: ['profile:name', 'contacts:read'] }],
    swarmGrants: [{ driveKey, topicHex: key('b'), protocol: 'test.v1' }]
  })

  assert.equal(summary.kind, 'app')
  assert.equal(summary.risk, 'normal')
  assert.deepEqual(summary.badges.map((b) => b.label), [
    'author-signed',
    'by Demo Publisher',
    'tab app',
    'Signed Catalog',
    'v2.0.0',
    '2 releases',
    'relay-confirmed',
    '3 peers',
    '12.1 KB',
    'signed in',
    '1 profile',
    'contacts',
    '1 swarm'
  ])
  assert.match(summary.summary, /Current version v2.0.0/)
  assert.match(summary.summary, /Publisher Demo Publisher/)
  assert.match(summary.summary, /Relay pin confirmed with 1 replicated peer/)
  assert.match(summary.summary, /Has a stored sign-in grant/)
  assert.equal(summary.evidence.driveKey, driveKey)
  assert.equal(summary.evidence.publisher.key, publisherKey)
  assert.equal(summary.evidence.releaseCount, 2)
  assert.equal(summary.evidence.permissionCount, 2)
})

test('backend trust summary DTO explains site lifecycle and falls back safely', () => {
  const driveKey = key('c')
  const publisherKey = key('e')
  const summary = buildTrustSummary({
    kind: 'site',
    driveKey,
    owned: true,
    site: {
      keyHex: driveKey,
      published: true,
      publisher: 'Site Publisher',
      publisherKey,
      createdAt: Date.UTC(2026, 0, 1),
      publishedAt: Date.UTC(2026, 1, 1),
      updatedAt: Date.UTC(2026, 5, 27)
    }
  })

  assert.equal(summary.kind, 'site')
  assert.equal(summary.risk, 'normal')
  assert.deepEqual(summary.badges.map((b) => b.label), ['your site', 'by Site Publisher', 'published', 'hyperdrive', 'updated'])
  assert.match(summary.summary, /Publisher Site Publisher/)
  assert.match(summary.summary, /Created 2026-01-01/)
  assert.match(summary.summary, /Published 2026-02-01/)
  assert.match(summary.summary, /Updated 2026-06-27/)
  assert.equal(summary.evidence.driveKey, driveKey)
  assert.equal(summary.evidence.publisher.key, publisherKey)
  assert.equal(summary.evidence.owned, true)
})

test('backend trust summary DTO flags unsigned window apps and rejected community rows for review', () => {
  const summary = buildTrustSummary({
    kind: 'app',
    app: {
      link: 'pear://example',
      verification: 'unverified',
      moderationStatus: 'rejected',
      moderationReason: 'Malware report'
    }
  })

  assert.equal(summary.risk, 'review')
  assert.deepEqual(summary.badges.map((b) => b.key), [
    'verification:unverified',
    'launch:window',
    'moderation:rejected'
  ])
  assert.equal(summary.badges.find((b) => b.key === 'moderation:rejected').tone, 'danger')
  assert.match(summary.summary, /Rejected by the community catalog/)
})

test('backend trust summary DTO counts signed release manifest evidence', () => {
  const summary = buildTrustSummary({
    kind: 'app',
    app: {
      type: 'hypersite',
      driveKey: key('f'),
      verification: 'author-signed',
      signedReleaseHistory: [
        {
          version: '3.0.0',
          releasedAt: Date.UTC(2026, 6, 1),
          manifestSignature: 'sig-' + 'a'.repeat(64),
          signerPubkey: key('d')
        }
      ]
    }
  })

  assert.ok(summary.badges.some((badge) => badge.key === 'release:signed-log'))
  assert.match(summary.summary, /1 signed release manifest/)
  assert.equal(summary.evidence.signedReleaseCount, 1)
})
