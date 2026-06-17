// Tests for backend/name-record.cjs (naming Phase N0).
import test from 'node:test'
import assert from 'node:assert/strict'
import mod from '../backend/name-record.cjs'
const { NAME_RECORD_VERSION, decodeNameRecord, encodeNameRecord, NAME_BINDING_SCHEMA } = mod

const KEY = '0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75'

test('encode → decode round-trips', () => {
  const buf = encodeNameRecord({ name: 'keet', driveKey: KEY, seq: 3 })
  assert.deepEqual(decodeNameRecord(buf), { name: 'keet', driveKey: KEY, seq: 3, link: null })
})

test('decode: optional launch link is kept when valid, dropped when not', () => {
  const withLink = encodeNameRecord({ name: 'keet', driveKey: KEY, seq: 1, link: 'pear://abc' })
  assert.equal(decodeNameRecord(withLink).link, 'pear://abc')
  // a non-pear/hyper link is ignored (→ null), not trusted
  const bad = Buffer.from(JSON.stringify({ v: 1, n: 'keet', k: KEY, s: 1, l: 'https://evil.example' }))
  assert.equal(decodeNameRecord(bad).link, null)
})

test('decode: rejects wrong version', () => {
  const buf = Buffer.from(JSON.stringify({ v: 2, n: 'keet', k: KEY, s: 1 }))
  assert.equal(decodeNameRecord(buf), null)
})

test('decode: rejects bad / missing fields', () => {
  assert.equal(decodeNameRecord(null), null)
  assert.equal(decodeNameRecord(Buffer.from('not json')), null)
  assert.equal(decodeNameRecord(Buffer.from(JSON.stringify({ v: 1, n: 'keet', s: 1 }))), null)              // no key
  assert.equal(decodeNameRecord(Buffer.from(JSON.stringify({ v: 1, n: 'keet', k: 'xyz', s: 1 }))), null)     // bad key
  assert.equal(decodeNameRecord(Buffer.from(JSON.stringify({ v: 1, n: 'keet', k: KEY, s: -1 }))), null)      // negative seq
  assert.equal(decodeNameRecord(Buffer.from(JSON.stringify({ v: 1, n: '', k: KEY, s: 1 }))), null)           // empty name
})

test('encodeNameRecord validates inputs', () => {
  assert.throws(() => encodeNameRecord({ name: '', driveKey: KEY, seq: 1 }), /name required/)
  assert.throws(() => encodeNameRecord({ name: 'x', driveKey: 'nope', seq: 1 }), /64-hex/)
  assert.throws(() => encodeNameRecord({ name: 'x', driveKey: KEY, seq: -1 }), /non-negative/)
  assert.equal(NAME_RECORD_VERSION, 1)
})

test('NAME_BINDING_SCHEMA mirrors the catalogue schema contract', () => {
  assert.deepEqual(NAME_BINDING_SCHEMA.properties.verification.enum, ['unverified', 'relay-listed', 'author-signed'])
  assert.deepEqual(NAME_BINDING_SCHEMA.anyOf, [{ required: ['driveKey'] }, { required: ['link'] }])
  assert.ok(NAME_BINDING_SCHEMA.required.includes('binderPubkey'))
  assert.ok(NAME_BINDING_SCHEMA.required.includes('bindingSig'))
  assert.equal(NAME_BINDING_SCHEMA.additionalProperties, false)
})
