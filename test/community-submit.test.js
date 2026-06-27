// Unit tests for backend/community-submit.cjs — the pure projection + relay
// management-request shaping behind the community app-submission feature.
// Run with `node --test`.
import test from 'node:test'
import assert from 'node:assert/strict'
import communitySubmit from '../backend/community-submit.cjs'

const {
  slugify,
  deriveKeyAndLink,
  buildSubmissionManifest,
  manageRequest,
  normalizePendingReview,
  communityBeeEntry
} = communitySubmit

// A real 64-hex content key + a known z-base-32 encoding of the SAME bytes, so
// deriveKeyAndLink's normalizeKey injection is exercised the way index.js wires
// its z32-decoding normalizeDriveKey.
const HEX = 'f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d'
// Minimal stand-in: hex passes straight through; a sentinel z32 maps to HEX.
const Z32 = 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
const fakeNormalize = (raw) => {
  if (/^[0-9a-f]{64}$/i.test(raw)) return raw.toLowerCase()
  if (raw === Z32) return HEX
  return raw
}

test('slugify produces stable catalogue-safe ids', () => {
  assert.equal(slugify('Cool App!!'), 'cool-app')
  assert.equal(slugify('  Spaces  & Symbols  '), 'spaces-symbols')
  assert.equal(slugify(''), 'app')
  assert.equal(slugify(null), 'app')
  assert.equal(slugify('A'.repeat(200)).length, 64)
})

test('deriveKeyAndLink: hyper:// link → hex driveKey + hyper link', () => {
  const r = deriveKeyAndLink('hyper://' + HEX + '/', fakeNormalize)
  assert.equal(r.error, undefined)
  assert.equal(r.driveKey, HEX)
  assert.equal(r.link, 'hyper://' + HEX + '/')
  assert.equal(r.kind, 'hyper')
})

test('deriveKeyAndLink: bare 64-hex key → hyper link', () => {
  const r = deriveKeyAndLink(HEX, fakeNormalize)
  assert.equal(r.driveKey, HEX)
  assert.equal(r.kind, 'hyper')
})

test('deriveKeyAndLink: pear:// link keeps the pear link + z32-decodes the key', () => {
  const r = deriveKeyAndLink('pear://' + Z32, fakeNormalize)
  assert.equal(r.error, undefined)
  assert.equal(r.driveKey, HEX)
  assert.equal(r.link, 'pear://' + Z32)
  assert.equal(r.kind, 'pear')
})

test('deriveKeyAndLink: strips path/query and trailing slashes from pear links', () => {
  const r = deriveKeyAndLink('pear://' + Z32 + '/foo?x=1', fakeNormalize)
  assert.equal(r.driveKey, HEX)
})

test('deriveKeyAndLink: rejects junk + empty', () => {
  assert.ok(deriveKeyAndLink('', fakeNormalize).error)
  assert.ok(deriveKeyAndLink('not-a-key', fakeNormalize).error)
})

test('buildSubmissionManifest: full hyper submission', () => {
  const { manifest, id, driveKey, error } = buildSubmissionManifest(
    {
      name: 'My Community App',
      link: 'hyper://' + HEX + '/',
      description: 'A neat thing',
      author: 'alice',
      categories: 'tools, social',
      iconData: 'data:image/svg+xml,<svg/>'
    },
    { submittedBy: 'pub'.repeat(21) + 'a', now: 1000, normalizeKey: fakeNormalize }
  )
  assert.equal(error, undefined)
  assert.equal(id, 'my-community-app')
  assert.equal(driveKey, HEX)
  assert.equal(manifest.type, 'hypersite')
  assert.equal(manifest.list, 'community')
  assert.equal(manifest.submittedAt, 1000)
  assert.equal(manifest.status, 'pending-review')
  assert.equal(manifest.moderationStatus, 'pending-review')
  assert.deepEqual(manifest.moderation, {
    status: 'pending-review',
    reason: 'Submitted to the community catalog review queue.',
    submittedAt: 1000
  })
  assert.deepEqual(manifest.categories, ['tools', 'social'])
  assert.equal(manifest.pearLink, undefined) // hyper apps carry no pearLink
  assert.equal(manifest.iconData, 'data:image/svg+xml,<svg/>')
})

test('buildSubmissionManifest: pear submission is type standalone + keeps pearLink', () => {
  const { manifest } = buildSubmissionManifest(
    { name: 'Pear Thing', link: 'pear://' + Z32 },
    { now: 5, normalizeKey: fakeNormalize }
  )
  assert.equal(manifest.type, 'standalone')
  assert.equal(manifest.pearLink, 'pear://' + Z32)
  assert.equal(manifest.driveKey, HEX)
})

test('buildSubmissionManifest: name required + bad key rejected', () => {
  assert.ok(buildSubmissionManifest({ link: 'hyper://' + HEX }, { normalizeKey: fakeNormalize }).error)
  assert.ok(buildSubmissionManifest({ name: 'x', link: 'garbage' }, { normalizeKey: fakeNormalize }).error)
})

test('buildSubmissionManifest: oversized iconData is dropped', () => {
  const big = 'data:' + 'a'.repeat(300000)
  const { manifest } = buildSubmissionManifest(
    { name: 'Big', link: HEX, iconData: big },
    { normalizeKey: fakeNormalize }
  )
  assert.equal(manifest.iconData, undefined)
})

test('manageRequest: pending is an authed GET', () => {
  const r = manageRequest('pending', { baseUrl: 'http://127.0.0.1:9100/', apiKey: 'secret' })
  assert.equal(r.error, undefined)
  assert.equal(r.method, 'GET')
  assert.equal(r.url, 'http://127.0.0.1:9100/api/manage/catalog/pending')
  assert.equal(r.headers.authorization, 'Bearer secret')
})

test('manageRequest: approve/reject POST a 64-hex appKey', () => {
  const a = manageRequest('approve', { baseUrl: 'https://relay.example', apiKey: 'k', appKey: HEX.toUpperCase() })
  assert.equal(a.method, 'POST')
  assert.equal(a.url, 'https://relay.example/api/manage/catalog/approve')
  assert.deepEqual(JSON.parse(a.body), { appKey: HEX }) // lowercased
  const j = manageRequest('reject', { baseUrl: 'https://relay.example', appKey: HEX, reason: 'Needs a working icon' })
  assert.equal(j.url, 'https://relay.example/api/manage/catalog/reject')
  assert.deepEqual(JSON.parse(j.body), { appKey: HEX, reason: 'Needs a working icon' })
})

test('manageRequest: guards missing url + bad appKey + bad action', () => {
  assert.ok(manageRequest('pending', {}).error)
  assert.ok(manageRequest('approve', { baseUrl: 'ftp://x', appKey: HEX }).error)
  assert.ok(manageRequest('approve', { baseUrl: 'http://x', appKey: 'short' }).error)
  assert.ok(manageRequest('bogus', { baseUrl: 'http://x' }).error)
})

test('normalizePendingReview preserves bounded manifest preview metadata', () => {
  const row = normalizePendingReview({
    appKey: HEX.toUpperCase(),
    publisherPubkey: 'a'.repeat(64),
    currentRelays: 2,
    discoveredAt: 1234,
    manifest: {
      id: 'demo',
      name: 'Demo App',
      description: 'desc '.repeat(400),
      author: 'alice',
      version: '2.0.0',
      type: 'standalone',
      link: 'pear://' + Z32,
      driveKey: HEX,
      categories: ['tools', 'social', 'x'.repeat(80)],
      manifestKey: 'b'.repeat(64)
    }
  }, { mode: 'review' })

  assert.equal(row.appKey, HEX)
  assert.equal(row.publisherPubkey, 'a'.repeat(64))
  assert.equal(row.currentRelays, 2)
  assert.equal(row.moderation.relayResponse, 'Relay review mode: review')
  assert.equal(row.manifest.name, 'Demo App')
  assert.equal(row.manifest.description.length, 1200)
  assert.deepEqual(row.manifest.categories, ['tools', 'social', 'x'.repeat(40)])
  assert.equal(row.manifest.driveKey, HEX)
  assert.equal(row.manifest.manifestKey, 'b'.repeat(64))
})

test('normalizePendingReview leaves bare pin requests without a manifest preview', () => {
  const row = normalizePendingReview({ appKey: HEX, publisherPubkey: 'a'.repeat(64) })
  assert.equal(row.appKey, HEX)
  assert.equal(row.manifest, undefined)
})

test('communityBeeEntry: maps a manifest to the app!<id> schema', () => {
  const { manifest } = buildSubmissionManifest(
    { name: 'Entry App', link: HEX, description: 'd', author: 'a' },
    { now: 42, normalizeKey: fakeNormalize }
  )
  const { key, value } = communityBeeEntry(manifest, 84, { relayResponse: 'seed accepted', reviewer: 'operator' })
  assert.equal(key, 'app!entry-app')
  assert.equal(value.id, 'entry-app')
  assert.equal(value.driveKey, HEX)
  assert.equal(value.publishedAt, 42) // carried from submittedAt
  assert.equal(value.submittedAt, 42)
  assert.equal(value.reviewedAt, 84)
  assert.equal(value.status, 'approved')
  assert.equal(value.moderationStatus, 'approved')
  assert.deepEqual(value.moderation, {
    status: 'approved',
    reason: 'Approved by the community catalog.',
    submittedAt: 42,
    decidedAt: 84,
    relayResponse: 'seed accepted',
    reviewer: 'operator'
  })
  assert.equal(value.name, 'Entry App')
})
