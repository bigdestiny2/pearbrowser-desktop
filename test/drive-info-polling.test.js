import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_VIEWPORT_DRIVE_INFO_KEYS,
  selectDriveInfoKeysForPolling
} from '../ui/lib/drive-info-polling.js'

const key = (ch) => ch.repeat(64)
const A = key('a')
const B = key('b')
const C = key('c')
const D = key('d')

test('drive-info polling uses visible keys when viewport-aware', () => {
  assert.deepEqual(selectDriveInfoKeysForPolling({
    allKeys: [A, B, C],
    visibleKeys: [C],
    viewportAware: true
  }), [C])
})

test('drive-info polling includes the detail key even when it is offscreen', () => {
  assert.deepEqual(selectDriveInfoKeysForPolling({
    allKeys: [A, B, C],
    visibleKeys: [A],
    detailKey: D,
    viewportAware: true
  }), [D, A])
})

test('drive-info polling ignores stale visible keys after filters change', () => {
  assert.deepEqual(selectDriveInfoKeysForPolling({
    allKeys: [A],
    visibleKeys: [A, C],
    detailKey: D,
    viewportAware: true
  }), [D, A])
})

test('drive-info polling falls back to all keys without viewport support', () => {
  assert.deepEqual(selectDriveInfoKeysForPolling({
    allKeys: [A, B],
    visibleKeys: [C],
    viewportAware: false
  }), [A, B])
})

test('drive-info polling dedupes, lowercases, filters malformed keys, and caps batches', () => {
  const keys = Array.from({ length: MAX_VIEWPORT_DRIVE_INFO_KEYS + 5 }, (_, i) => {
    return String(i).padStart(64, '0').slice(0, 64)
  })
  const selected = selectDriveInfoKeysForPolling({
    allKeys: ['not-a-key', A.toUpperCase(), A, ...keys],
    detailKey: B.toUpperCase(),
    viewportAware: false
  })

  assert.equal(selected.length, MAX_VIEWPORT_DRIVE_INFO_KEYS)
  assert.deepEqual(selected.slice(0, 3), [B, A, keys[0]])
  assert.equal(selected.includes('not-a-key'), false)
})
