// Autobee collaborative-catalog reducer tests (PURE — no autobase).
// Maps to docs/AUTOBEE-RESEARCH.md "Acceptance Criteria".
import test from 'node:test'
import assert from 'node:assert/strict'
// The autobee logic lives in backend/ as CommonJS (.cjs) so Bare can require
// it; Node imports it here via default-import + destructure.
import opsMod from '../backend/autobee-catalog-ops.cjs'
import applyMod from '../backend/autobee-catalog-apply.cjs'
const { upsertOp, removeOp, renameOp, validateOp, sanitizeApp, MAX_OP_BYTES } = opsMod
const { linearize, applyView, applyTagged, toCatalogData } = applyMod

const keyFor = (id) => Buffer.from(String(id)).toString('hex').padEnd(64, '0').slice(0, 64)
const app = (id, extra = {}) => ({ id, name: id.toUpperCase(), driveKey: keyFor(id), ...extra })

// Tag ops as Autobase would: a writer key + a per-writer sequence number.
const tag = (writer, seq, op) => ({ writer, seq, op })

test('two independent op logs converge regardless of input arrangement', () => {
  // Writer A and writer B make concurrent edits.
  const a = [tag('A', 0, renameOp('Shared')), tag('A', 1, upsertOp(app('keet')))]
  const b = [tag('B', 0, upsertOp(app('pear'))), tag('B', 1, removeOp('keet'))]

  // Device 1 received A-then-B; device 2 received B-then-A. Same tag set →
  // linearize must yield the same order → same view.
  const v1 = applyTagged([...a, ...b])
  const v2 = applyTagged([...b, ...a])
  assert.deepEqual(v1, v2)
  // 'keet' was added by A then removed later by B → gone; 'pear' remains.
  assert.deepEqual(linearize([...a, ...b]).map((t) => t.op.type),
    linearize([...b, ...a]).map((t) => t.op.type))
  assert.deepEqual(v1.apps.map((x) => x.id), ['pear'])
  assert.equal(v1.name, 'Shared')
})

test('same ordered log rebuilds the same view after restart', () => {
  const ops = [renameOp('Cat'), upsertOp(app('a')), upsertOp(app('b')), removeOp('a')]
  assert.deepEqual(applyView(ops), applyView(ops))   // deterministic, no clock
  assert.deepEqual(applyView(ops).apps.map((x) => x.id), ['b'])
})

test('conflict rules: later op in order wins for upsert/remove and rename', () => {
  // remove then re-upsert → present
  let v = applyView([upsertOp(app('x')), removeOp('x'), upsertOp(app('x', { name: 'New' }))])
  assert.equal(v.apps.length, 1)
  assert.equal(v.apps[0].name, 'New')
  // upsert then remove → absent
  v = applyView([upsertOp(app('x')), removeOp('x')])
  assert.equal(v.apps.length, 0)
  // rename last-wins
  v = applyView([renameOp('First'), renameOp('Second')])
  assert.equal(v.name, 'Second')
})

test('app id and driveKey are stable identity, not editable by metadata', () => {
  const original = '11'.repeat(32)
  const hijacked = '22'.repeat(32)
  const v = applyView([
    upsertOp(app('x', { driveKey: original })),
    // attempt to change driveKey via a later metadata edit
    upsertOp({ id: 'x', name: 'Renamed', driveKey: hijacked })
  ])
  assert.equal(v.apps.length, 1)
  assert.equal(v.apps[0].name, 'Renamed')       // metadata updates
  assert.equal(v.apps[0].driveKey, original)    // identity is pinned
})

test('read-only vs writable is explicit in the DTO; shape matches loader', () => {
  const v = applyView([renameOp('Picks'), upsertOp(app('a'))])
  const ro = toCatalogData(v, 'deadbeef', false)
  assert.equal(ro.source, 'autobee')
  assert.equal(ro.writable, false)
  assert.equal(ro.sourceKey, 'deadbeef')
  assert.equal(ro.count.total, 1)
  assert.equal(toCatalogData(v, 'x', true).writable, true)
})

test('malicious / malformed inputs are rejected or retained-but-ignored', () => {
  // giant record → rejected before append
  const huge = upsertOp(app('big', { description: 'z'.repeat(MAX_OP_BYTES + 10) }))
  // sanitize clamps strings, so build an explicitly oversized raw op instead:
  const rawHuge = { v: 1, type: 'app.upsert', id: 'big', app: { id: 'big', driveKey: keyFor('big'), blob: 'z'.repeat(MAX_OP_BYTES) } }
  assert.equal(validateOp(rawHuge).ok, false)
  assert.equal(validateOp(rawHuge).retain, false)

  // prototype pollution → rejected
  const polluted = JSON.parse(`{"v":1,"type":"app.upsert","id":"x","app":{"id":"x","driveKey":"${keyFor('x')}","__proto__":{"bad":1}}}`)
  assert.equal(validateOp(polluted).ok, false)

  // missing drive key/link → rejected
  assert.equal(validateOp({ v: 1, type: 'app.upsert', id: 'x', app: { id: 'x' } }).ok, false)
  assert.equal(validateOp({ v: 1, type: 'app.upsert', id: 'x', app: { id: 'x', driveKey: 'not-a-key' } }).reason, 'bad-drivekey')
  assert.equal(validateOp({ v: 1, type: 'app.upsert', id: 'x', app: { id: 'x', link: 'javascript:alert(1)' } }).reason, 'bad-link')
  assert.equal(validateOp({ v: 1, type: 'app.upsert', id: 'x', app: { id: 'x', link: 'pear://app' } }).ok, true)

  // unknown op version → retained but ignored (forward-compat)
  const future = validateOp({ v: 999, type: 'app.upsert', id: 'x', app: { id: 'x', driveKey: keyFor('x') } })
  assert.equal(future.ok, false)
  assert.equal(future.retain, true)

  // unknown op type → retained but ignored, and has no effect on the view
  const v = applyView([upsertOp(app('a')), { v: 1, type: 'app.frobnicate', id: 'a' }])
  assert.equal(v.apps.length, 1)

  // sanitizeApp drops unknown + pollution keys
  const clean = sanitizeApp({ id: 'a', driveKey: keyFor('a'), evil: 'x', categories: ['ok', 42] })
  assert.equal(clean.evil, undefined)
  assert.equal(clean.driveKey, keyFor('a'))
  assert.deepEqual(clean.categories, ['ok'])

  // huge op constructed via upsertOp is clamped (not oversized) — sanity
  assert.equal(validateOp(huge).ok, true)
})
