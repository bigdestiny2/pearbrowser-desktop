// Unit tests for ui/lib/tabs.js — run with `node --test`.
// These cover the session-restore logic added in the P0 trust track:
// history de-duplication, forward-history truncation on navigation, and
// snapshot normalization/round-tripping.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_TAB_HISTORY,
  normalizeTabHistory, clampHistoryIndex, pushTabHistory,
  normalizeTabSnapshot, serializeTab, restoreSavedTab, sortTabsPinnedFirst,
  normalizeDefaultTab, restoreStartupTabs, makeTab,
  driveKeyFromTabAddress, tabDriveKey, tabListUsesDriveKey
} from '../ui/lib/tabs.js'

const A = 'hyper://aaa/'
const B = 'hyper://bbb/'
const C = 'hyper://ccc/'
const DEALROOM = 'hyper://0724aabf2ad6394983f91c6b24ebd417cb3d25addcf29c98eb246c512dc77f90/'
const DRIVE_A = 'a'.repeat(64)
const DRIVE_B = 'b'.repeat(64)

test('normalizeTabHistory drops empties and collapses consecutive repeats', () => {
  assert.deepEqual(normalizeTabHistory([A, A, B, B, B, C]), [A, B, C])
  assert.deepEqual(normalizeTabHistory(['', '  ', A, '']), [A])
  assert.deepEqual(normalizeTabHistory(null), [])
})

test('normalizeTabHistory uses fallback only when empty, and caps length', () => {
  assert.deepEqual(normalizeTabHistory([], A), [A])
  assert.deepEqual(normalizeTabHistory([B], A), [B]) // non-empty → fallback ignored
  const long = Array.from({ length: MAX_TAB_HISTORY + 25 }, (_, i) => `hyper://k${i}/`)
  assert.equal(normalizeTabHistory(long).length, MAX_TAB_HISTORY)
})

test('clampHistoryIndex clamps into range and handles empties', () => {
  assert.equal(clampHistoryIndex([A, B, C], 1), 1)
  assert.equal(clampHistoryIndex([A, B, C], 99), 2)
  assert.equal(clampHistoryIndex([A, B, C], -5), 0)
  assert.equal(clampHistoryIndex([A, B, C], undefined), 2) // default → last
  assert.equal(clampHistoryIndex([], 0), -1)
})

test('pushTabHistory truncates forward history when navigating from the middle', () => {
  // At index 0 of [A,B,C], navigating to a new URL drops B and C.
  const r = pushTabHistory([A, B, C], 0, B)
  assert.deepEqual(r.history, [A, B])
  assert.equal(r.histIdx, 1)
})

test('pushTabHistory does not duplicate when re-navigating to the current url', () => {
  const r = pushTabHistory([A, B], 1, B)
  assert.deepEqual(r.history, [A, B])
  assert.equal(r.histIdx, 1)
})

test('normalizeTabSnapshot rebuilds a coherent snapshot from a bare url', () => {
  const snap = normalizeTabSnapshot({ url: A })
  assert.equal(snap.url, A)
  assert.deepEqual(snap.history, [A])
  assert.equal(snap.histIdx, 0)
  assert.equal(snap.pinned, false)
})

test('normalizeTabSnapshot returns null for junk', () => {
  assert.equal(normalizeTabSnapshot(null), null)
  assert.equal(normalizeTabSnapshot({}), null)
  assert.equal(normalizeTabSnapshot('nope'), null)
})

test('serializeTab marks the active tab and round-trips through restoreSavedTab', () => {
  const tab = makeTab(A, { pinned: true })
  const ser = serializeTab(tab, tab.id)
  assert.equal(ser.active, true)
  assert.equal(ser.pinned, true)
  assert.equal(serializeTab(tab, 'other-id').active, false)

  const restored = restoreSavedTab(ser)
  assert.equal(restored.url, A)
  assert.equal(restored.pinned, true)
  assert.equal(typeof restored.id, 'string')
  assert.ok(restored.history.includes(A))
})

test('sortTabsPinnedFirst keeps pinned tabs first, preserving relative order', () => {
  const t1 = { id: '1', pinned: false }
  const t2 = { id: '2', pinned: true }
  const t3 = { id: '3', pinned: false }
  const t4 = { id: '4', pinned: true }
  assert.deepEqual(sortTabsPinnedFirst([t1, t2, t3, t4]).map((t) => t.id), ['2', '4', '1', '3'])
})

test('restoreStartupTabs keeps PearBrowser landing first even when Dealroom was active', () => {
  const restored = restoreStartupTabs([
    { url: DEALROOM, title: 'Pear Dealroom', active: true }
  ], [A, B])
  assert.equal(restored.tabs.length, 3)
  assert.equal(restored.tabs[0].url, A)
  assert.equal(restored.tabs[1].url, B)
  assert.equal(restored.tabs[2].url, DEALROOM)
  assert.equal(restored.activeId, restored.tabs[0].id)
})

test('restoreStartupTabs keeps a named blank browser home at the front', () => {
  const restored = restoreStartupTabs([
    { url: DEALROOM, title: 'Pear Dealroom', active: true }
  ], [
    { url: '', title: 'PearBrowser Home' },
    { url: A, title: 'PearBrowser' }
  ])
  assert.equal(restored.tabs[0].url, '')
  assert.equal(restored.tabs[0].title, 'PearBrowser Home')
  assert.equal(restored.tabs[1].url, A)
  assert.equal(restored.tabs[2].url, DEALROOM)
  assert.equal(restored.activeId, restored.tabs[0].id)
})

test('normalizeDefaultTab accepts named startup entries', () => {
  assert.deepEqual(normalizeDefaultTab({ url: A, title: 'PearBrowser' }), { url: A, title: 'PearBrowser' })
  assert.deepEqual(normalizeDefaultTab(B), { url: B, title: '' })
  assert.deepEqual(normalizeDefaultTab(null), { url: '', title: '' })
})

test('restoreStartupTabs dedupes default tabs from saved sessions', () => {
  const restored = restoreStartupTabs([
    { url: B, title: 'peerit', active: true },
    { url: C, title: 'other' }
  ], [
    { url: A, title: 'PearBrowser' },
    { url: B, title: 'peerit' }
  ])
  assert.deepEqual(restored.tabs.map((tab) => tab.url), [A, B, C])
  assert.deepEqual(restored.tabs.map((tab) => tab.title), ['PearBrowser', 'peerit', 'other'])
  assert.equal(restored.activeId, restored.tabs[0].id)
})

test('tab origin helpers extract drive keys from hyper and local proxy addresses', () => {
  assert.equal(driveKeyFromTabAddress(`hyper://${DRIVE_A}/posts/1`), DRIVE_A)
  assert.equal(driveKeyFromTabAddress(`http://127.0.0.1:12345/hyper/${DRIVE_A}/index.html`), DRIVE_A)
  assert.equal(driveKeyFromTabAddress(`http://localhost:12345/app/${DRIVE_B}/index.html`), DRIVE_B)
  assert.equal(driveKeyFromTabAddress(`http://example.com/hyper/${DRIVE_A}/`), '')

  assert.equal(tabDriveKey({ url: '', displayUrl: '', src: `http://127.0.0.1:1/app/${DRIVE_A}/index.html` }), DRIVE_A)
  assert.equal(tabListUsesDriveKey([{ url: `hyper://${DRIVE_A}/` }], DRIVE_A), true)
  assert.equal(tabListUsesDriveKey([{ url: `hyper://${DRIVE_A}/` }], DRIVE_B), false)
})
