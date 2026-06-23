// Browser-state (multi-device sync) reducer tests — PURE, no autobase.
// Mirrors the autobee-catalog acceptance criteria for the bookmark dataset.
import test from 'node:test'
import assert from 'node:assert/strict'
import opsMod from '../backend/browser-state-ops.cjs'
import applyMod from '../backend/browser-state-apply.cjs'
const { addBookmarkOp, removeBookmarkOp, validateOp, sanitizeBookmark, MAX_OP_BYTES } = opsMod
const { linearize, applyView, applyTagged } = applyMod

const bm = (url, title = url) => ({ url, title })
const tag = (writer, seq, op) => ({ writer, seq, op })

test('two devices converge regardless of input arrangement', () => {
  const a = [tag('A', 0, addBookmarkOp(bm('hyper://a', 'A'))), tag('A', 1, addBookmarkOp(bm('hyper://b', 'B')))]
  const d = [tag('B', 0, addBookmarkOp(bm('hyper://c', 'C'))), tag('B', 1, removeBookmarkOp('hyper://a'))]
  const v1 = applyTagged([...a, ...d])
  const v2 = applyTagged([...d, ...a])
  assert.deepEqual(v1, v2)
  // 'a' added by A then removed later by B → gone; b and c remain.
  assert.deepEqual(v1.bookmarks.map((x) => x.url).sort(), ['hyper://b', 'hyper://c'])
})

test('same ordered log rebuilds the same view after restart', () => {
  const ops = [addBookmarkOp(bm('u1')), addBookmarkOp(bm('u2')), removeBookmarkOp('u1')]
  assert.deepEqual(applyView(ops), applyView(ops))
  assert.deepEqual(applyView(ops).bookmarks.map((x) => x.url), ['u2'])
})

test('conflict: later op in order wins for add/remove', () => {
  // remove then re-add → present, with the newer title
  let v = applyView([addBookmarkOp(bm('u', 'Old')), removeBookmarkOp('u'), addBookmarkOp(bm('u', 'New'))])
  assert.equal(v.bookmarks.length, 1)
  assert.equal(v.bookmarks[0].title, 'New')
  // add then remove → absent
  v = applyView([addBookmarkOp(bm('u')), removeBookmarkOp('u')])
  assert.equal(v.bookmarks.length, 0)
})

test('add updates the whole record (re-add changes title), url is identity', () => {
  const v = applyView([addBookmarkOp(bm('u', 'First')), addBookmarkOp(bm('u', 'Second'))])
  assert.equal(v.bookmarks.length, 1)
  assert.equal(v.bookmarks[0].url, 'u')
  assert.equal(v.bookmarks[0].title, 'Second')
})

test('addedAt is stored but never affects ordering', () => {
  // Later-in-order op wins even though it carries an EARLIER addedAt.
  const v = applyView([
    addBookmarkOp({ url: 'u', title: 'A', addedAt: 2000 }),
    addBookmarkOp({ url: 'u', title: 'B', addedAt: 1000 })
  ])
  assert.equal(v.bookmarks[0].title, 'B')   // order wins, not the bigger addedAt
  assert.equal(v.bookmarks[0].addedAt, 1000)
})

test('malicious / malformed inputs are rejected or retained-but-ignored', () => {
  const rawHuge = { v: 1, type: 'bookmark.add', url: 'u', bookmark: { url: 'u', blob: 'z'.repeat(MAX_OP_BYTES) } }
  assert.equal(validateOp(rawHuge).ok, false)
  assert.equal(validateOp(rawHuge).retain, false)

  const polluted = JSON.parse('{"v":1,"type":"bookmark.add","url":"u","bookmark":{"url":"u","__proto__":{"x":1}}}')
  assert.equal(validateOp(polluted).ok, false)

  assert.equal(validateOp({ v: 1, type: 'bookmark.add', url: '', bookmark: { url: '' } }).ok, false)

  const future = validateOp({ v: 999, type: 'bookmark.add', url: 'u', bookmark: { url: 'u' } })
  assert.equal(future.ok, false)
  assert.equal(future.retain, true)

  // unknown type retained but no effect on the view
  const v = applyView([addBookmarkOp(bm('u')), { v: 1, type: 'bookmark.frobnicate', url: 'u' }])
  assert.equal(v.bookmarks.length, 1)

  // sanitizeBookmark drops unknown keys + clamps
  const clean = sanitizeBookmark({ url: 'u', title: 't', evil: 'x', addedAt: 'nope' })
  assert.equal(clean.evil, undefined)
  assert.equal(clean.addedAt, undefined)   // non-finite dropped
})
