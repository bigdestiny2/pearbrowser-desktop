// Unit tests for ui/lib/keys.js — run with `node --test`.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hexToBytes, bytesToHex, z32FromHex, hexFromZ32,
  formatBytes, shortKey, normalizeUrl
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
