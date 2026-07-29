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

test('deriveKeyAndLink: remote executable app link is rejected', () => {
  const r = deriveKeyAndLink('pear://' + Z32, fakeNormalize)
  assert.match(r.error, /not accepted/i)
})

test('deriveKeyAndLink: rejects remote executable links with paths and queries', () => {
  const r = deriveKeyAndLink('pear://' + Z32 + '/foo?x=1', fakeNormalize)
  assert.match(r.error, /not accepted/i)
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
  assert.deepEqual(manifest.categories, ['tools', 'social'])
  assert.equal(manifest.pearLink, undefined) // hyper apps carry no pearLink
  assert.equal(manifest.iconData, 'data:image/svg+xml,<svg/>')
})

test('buildSubmissionManifest: remote executable app submission is rejected', () => {
  const { error } = buildSubmissionManifest(
    { name: 'Pear Thing', link: 'pear://' + Z32 },
    { now: 5, normalizeKey: fakeNormalize }
  )
  assert.match(error, /not accepted/i)
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
  const j = manageRequest('reject', { baseUrl: 'https://relay.example', appKey: HEX })
  assert.equal(j.url, 'https://relay.example/api/manage/catalog/reject')
})

test('manageRequest: guards missing url + bad appKey + bad action', () => {
  assert.ok(manageRequest('pending', {}).error)
  assert.ok(manageRequest('approve', { baseUrl: 'ftp://x', appKey: HEX }).error)
  assert.ok(manageRequest('approve', { baseUrl: 'http://x', appKey: 'short' }).error)
  assert.ok(manageRequest('bogus', { baseUrl: 'http://x' }).error)
})

test('communityBeeEntry: maps a manifest to the app!<id> schema', () => {
  const { manifest } = buildSubmissionManifest(
    { name: 'Entry App', link: HEX, description: 'd', author: 'a' },
    { now: 42, normalizeKey: fakeNormalize }
  )
  const { key, value } = communityBeeEntry(manifest)
  assert.equal(key, 'app!entry-app')
  assert.equal(value.id, 'entry-app')
  assert.equal(value.driveKey, HEX)
  assert.equal(value.publishedAt, 42) // carried from submittedAt
  assert.equal(value.name, 'Entry App')
})
