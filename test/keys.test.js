// Unit tests for ui/lib/keys.js — run with `node --test`.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hexToBytes, bytesToHex, z32FromHex, hexFromZ32,
  formatBytes, shortKey, normalizeUrl, parseCatalogRef, looksLikeName,
  parseSyncInvite, formatSyncInvite
} from '../ui/lib/keys.js'

// Real 32-byte drive keys used in the shell (DEFAULT_CATALOG_KEY / DEFAULT_URL).
const CATALOG_HEX = '0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75'
const HOME_HEX = '2d6c2be92f07e10ed5a4b07b5c1286a56f0c1220c79ad3c3293b069f8c946763'

test('hex ⇄ bytes round-trips', () => {
  assert.equal(bytesToHex(hexToBytes(CATALOG_HEX)), CATALOG_HEX)
  assert.equal(hexToBytes('xyz'), null)        // non-hex
  assert.equal(hexToBytes('abc'), null)        // odd length
})

test('z32 ⇄ hex round-trips for 32-byte keys', () => {
  for (const hex of [CATALOG_HEX, HOME_HEX]) {
    const z = z32FromHex(hex)
    assert.equal(typeof z, 'string')
    assert.equal(z.length, 52, 'a 32-byte key encodes to 52 z-base-32 chars')
    assert.equal(hexFromZ32(z), hex)
  }
})

test('z32FromHex rejects invalid hex; hexFromZ32 rejects wrong length', () => {
  assert.equal(z32FromHex('nothex'), null)
  assert.equal(hexFromZ32('not-valid-z32!'), null)
  assert.equal(hexFromZ32('yyyy'), null)       // valid alphabet but decodes to <32 bytes
})

test('formatBytes is human-readable', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(1024), '1.00 KB')
  assert.equal(formatBytes(1024 * 1024), '1.00 MB')
  assert.equal(formatBytes(15 * 1024 * 1024), '15.0 MB')   // >=10 → 1 decimal
  assert.equal(formatBytes(undefined), '0 B')
  assert.equal(formatBytes('garbage'), '0 B')
})

test('shortKey truncates only long strings', () => {
  assert.equal(shortKey(''), '')
  assert.equal(shortKey(null), '')
  assert.equal(shortKey('short'), 'short')
  assert.equal(shortKey(CATALOG_HEX), '0c35d12f…0dcb75')   // first 8 + … + last 6
})

test('normalizeUrl canonicalizes URL-bar input', () => {
  assert.equal(normalizeUrl(''), null)
  assert.equal(normalizeUrl('   '), null)
  assert.equal(normalizeUrl('hyper://abc/'), 'hyper://abc/')
  assert.equal(normalizeUrl('pear://abc'), 'pear://abc')
  assert.equal(normalizeUrl(CATALOG_HEX), `hyper://${CATALOG_HEX}/`)
  const z = z32FromHex(CATALOG_HEX)
  assert.equal(normalizeUrl(z), `hyper://${z}/`)
  assert.equal(normalizeUrl('example/path'), 'example/path')   // has slash → left as-is
  assert.equal(normalizeUrl('plainname'), 'hyper://plainname')
})

test('parseCatalogRef routes drive/hyperbee/autobee and strips the scheme', () => {
  assert.equal(parseCatalogRef(''), null)
  assert.equal(parseCatalogRef('   '), null)
  assert.equal(parseCatalogRef('hyperbee://'), null)          // scheme with no key
  assert.equal(parseCatalogRef('autobee://'), null)

  // Bare key / hyper:// → Hyperdrive catalog.
  assert.deepEqual(parseCatalogRef(CATALOG_HEX), { key: CATALOG_HEX, bee: false, autobee: false, kind: 'drive' })
  assert.deepEqual(parseCatalogRef(`hyper://${CATALOG_HEX}/`), { key: CATALOG_HEX, bee: false, autobee: false, kind: 'drive' })

  // hyperbee:// → Hyperbee catalog, scheme + trailing slash stripped.
  assert.deepEqual(parseCatalogRef(`hyperbee://${CATALOG_HEX}`), { key: CATALOG_HEX, bee: true, autobee: false, kind: 'hyperbee' })
  assert.deepEqual(parseCatalogRef(`HYPERBEE://${CATALOG_HEX}/`), { key: CATALOG_HEX, bee: true, autobee: false, kind: 'hyperbee' })

  // autobee:// → Autobase collaborative catalog.
  assert.deepEqual(parseCatalogRef(`autobee://${CATALOG_HEX}`), { key: CATALOG_HEX, bee: false, autobee: true, kind: 'autobee' })
  assert.deepEqual(parseCatalogRef(`AUTOBEE://${CATALOG_HEX}/`), { key: CATALOG_HEX, bee: false, autobee: true, kind: 'autobee' })
})

test('looksLikeName accepts bare name tokens, rejects URLs/keys/domains', () => {
  // Bare names the resolver should try (Tier 0 petname / Tier 3 curated floor).
  assert.equal(looksLikeName('keet'), true)
  assert.equal(looksLikeName('PearPass'), true)        // case-insensitive
  assert.equal(looksLikeName('pear-pass'), true)       // hyphen allowed
  assert.equal(looksLikeName('anon_gpt'), true)        // underscore allowed
  assert.equal(looksLikeName('  keet  '), true)        // trimmed

  // NOT names — must fall straight through to URL handling.
  assert.equal(looksLikeName(''), false)
  assert.equal(looksLikeName('   '), false)
  assert.equal(looksLikeName('foo.com'), false)        // domain (has a dot)
  assert.equal(looksLikeName('foo/bar'), false)        // has a path
  assert.equal(looksLikeName('hyper://keet'), false)   // scheme
  assert.equal(looksLikeName('pear://keet'), false)
  assert.equal(looksLikeName('a b'), false)            // space
  assert.equal(looksLikeName('-leading'), false)       // must start alphanumeric
  assert.equal(looksLikeName(CATALOG_HEX), false)      // 64-hex drive key
  assert.equal(looksLikeName(z32FromHex(CATALOG_HEX)), false) // 52-char z-base-32 key
  assert.equal(looksLikeName(null), false)
})

test('parseSyncInvite accepts sync:// and bare key:encKey, rejects malformed', () => {
  const KEY = CATALOG_HEX
  const ENC = HOME_HEX

  // Canonical sync:// form, with and without trailing slash + mixed case.
  assert.deepEqual(parseSyncInvite(`sync://${KEY}:${ENC}`), { key: KEY, encKey: ENC })
  assert.deepEqual(parseSyncInvite(`SYNC://${KEY}:${ENC}/`), { key: KEY, encKey: ENC })
  assert.deepEqual(parseSyncInvite(`  sync://${KEY.toUpperCase()}:${ENC}  `), { key: KEY, encKey: ENC })

  // Bare key:encKey (no scheme) is also accepted.
  assert.deepEqual(parseSyncInvite(`${KEY}:${ENC}`), { key: KEY, encKey: ENC })

  // Malformed → null.
  assert.equal(parseSyncInvite(''), null)
  assert.equal(parseSyncInvite('   '), null)
  assert.equal(parseSyncInvite(`sync://${KEY}`), null)            // missing encKey half
  assert.equal(parseSyncInvite(`sync://${KEY}:${ENC.slice(0, 63)}`), null) // wrong length
  assert.equal(parseSyncInvite(`sync://${KEY}:${ENC}:extra`), null)
  assert.equal(parseSyncInvite(`sync://nothex0000${KEY.slice(16)}:${ENC}`), null)
})

test('formatSyncInvite builds a sync:// invite and rejects non-64-hex halves', () => {
  assert.equal(formatSyncInvite(CATALOG_HEX, HOME_HEX), `sync://${CATALOG_HEX}:${HOME_HEX}`)
  assert.equal(formatSyncInvite(CATALOG_HEX.toUpperCase(), HOME_HEX), `sync://${CATALOG_HEX}:${HOME_HEX}`)
  // Round-trips through the parser.
  assert.deepEqual(parseSyncInvite(formatSyncInvite(CATALOG_HEX, HOME_HEX)), { key: CATALOG_HEX, encKey: HOME_HEX })
  // Missing / malformed halves → '' (so a Copy button can be disabled).
  assert.equal(formatSyncInvite('', HOME_HEX), '')
  assert.equal(formatSyncInvite(CATALOG_HEX, 'short'), '')
  assert.equal(formatSyncInvite(null, null), '')
})
