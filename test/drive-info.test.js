import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  MAX_DRIVE_INFO_BATCH,
  isValidDriveKey,
  normalizeDriveInfoBatch
} = require('../backend/drive-info.cjs')

const A = 'a'.repeat(64)
const B = 'b'.repeat(64)
const C = 'c'.repeat(64)

test('drive-info batch accepts keys, dedupes, and reports malformed entries', () => {
  const batch = normalizeDriveInfoBatch({
    keys: [A, A.toUpperCase(), 'not-a-key', B]
  }, {
    normalizeDriveKey: (v) => String(v || '').toLowerCase()
  })

  assert.equal(batch.requested, 4)
  assert.equal(batch.truncated, false)
  assert.deepEqual(batch.items, [
    { input: A, keyHex: A },
    { input: 'not-a-key', ok: false, error: 'Invalid drive key format' },
    { input: B, keyHex: B }
  ])
})

test('drive-info batch accepts urls through the injected driveKeyFromUrl helper', () => {
  const batch = normalizeDriveInfoBatch({
    urls: ['hyper://' + B + '/', 'hyper://bad/']
  }, {
    normalizeDriveKey: (v) => String(v || '').toLowerCase(),
    driveKeyFromUrl: (url) => String(url).replace(/^hyper:\/\//, '').split('/')[0]
  })

  assert.deepEqual(batch.items, [
    { input: 'hyper://' + B + '/', keyHex: B },
    { input: 'hyper://bad/', ok: false, error: 'Invalid drive key format' }
  ])
})

test('drive-info batch respects the hard maximum and marks truncation', () => {
  const keys = Array.from({ length: MAX_DRIVE_INFO_BATCH + 5 }, (_, i) => {
    return i === 0 ? C : String(i).padStart(64, '0').slice(0, 64)
  })
  const batch = normalizeDriveInfoBatch({ keys }, {
    normalizeDriveKey: (v) => String(v || '').toLowerCase()
  })

  assert.equal(batch.max, MAX_DRIVE_INFO_BATCH)
  assert.equal(batch.truncated, true)
  assert.equal(batch.requested, MAX_DRIVE_INFO_BATCH + 5)
  assert.equal(batch.items.length, MAX_DRIVE_INFO_BATCH)
})

test('drive-info key validator is strict 64-hex only', () => {
  assert.equal(isValidDriveKey(A), true)
  assert.equal(isValidDriveKey(A.toUpperCase()), true)
  assert.equal(isValidDriveKey('g'.repeat(64)), false)
  assert.equal(isValidDriveKey('a'.repeat(63)), false)
  assert.equal(isValidDriveKey('a'.repeat(65)), false)
})
