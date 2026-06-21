// Tests for backend/resolve-name.cjs (naming Phase N1 — pure tiered resolver).
import test from 'node:test'
import assert from 'node:assert/strict'
import resolveMod from '../backend/resolve-name.cjs'
import aliasMod from '../backend/name-aliases.cjs'
const { resolveName } = resolveMod
const { lookupAlias } = aliasMod

const KEY = '0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75'

test('bootstrap floor: a bare word resolves on day one (curated)', () => {
  const r = resolveName('keet', { petnames: {} })
  assert.equal(r.provenance, 'curated')
  assert.match(r.link, /^pear:\/\//)
  assert.equal(r.label, 'Keet')
})

test('curated lookup is normalized + supports alias names', () => {
  assert.equal(resolveName('KEET', { petnames: {} }).provenance, 'curated')  // case-folded
  assert.equal(lookupAlias('pass').label, 'PearPass')                        // alias → PearPass
})

test('petname HIT works offline and beats the curated floor', () => {
  // user saved their own 'keet' → a key; it overrides the bootstrap alias
  const petnames = { keet: { key: KEY, label: 'My Keet' } }
  const r = resolveName('keet', { petnames })
  assert.equal(r.provenance, 'petname')
  assert.equal(r.key, KEY)
  assert.equal(r.link, null)
  assert.equal(r.label, 'My Keet')
})

test('petname with only a link resolves', () => {
  const r = resolveName('home', { petnames: { home: { link: 'hyper://abc/' } } })
  assert.equal(r.provenance, 'petname')
  assert.equal(r.link, 'hyper://abc/')
})

test('miss → null; aliases:false disables the floor', () => {
  assert.equal(resolveName('nonexistent-xyz', { petnames: {} }), null)
  assert.equal(resolveName('keet', { petnames: {}, aliases: false }), null)   // no curated floor
  assert.equal(resolveName('', { petnames: {} }), null)
})

// --- Tier 2: the N5 name registry --------------------------------------------

const TKEY = 'aa'.repeat(32)

test('registry tier resolves a claimed name (target → key, provenance registry)', () => {
  const registry = { alice: { target: TKEY, owner: 'bb'.repeat(32), version: 1, label: 'alice' } }
  const r = resolveName('alice', { petnames: {}, registry })
  assert.equal(r.provenance, 'registry')
  assert.equal(r.key, TKEY)
  assert.equal(r.link, null)
  assert.equal(r.label, 'alice')
})

test('a user petname OUTRANKS the registry; the registry OUTRANKS the curated floor', () => {
  const registry = { keet: { target: TKEY } }
  // registry beats curated for 'keet' (curated alias exists for keet)
  assert.equal(resolveName('keet', { petnames: {}, registry }).provenance, 'registry')
  // a petname beats the registry
  const petnames = { keet: { key: KEY, label: 'My Keet' } }
  assert.equal(resolveName('keet', { petnames, registry }).provenance, 'petname')
})

test('registry entry without a target is ignored (falls through)', () => {
  assert.equal(resolveName('ghost', { petnames: {}, registry: { ghost: { owner: 'cc'.repeat(32) } } }), null)
})
