// N5 — the name-registry reducer policy (pure, via applyView). Pins first-claim-
// wins, owner-only rotate (monotonic), release-frees, revoke-tombstones, the
// confusable/homograph-squat defense, and that NO clock/timestamp can resurrect
// or reorder a decision (ordering is purely the linearized op list).
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import ops from '../backend/name-registry-ops.cjs'
import applyMod from '../backend/name-registry-apply.cjs'
const { applyView, resolveFromNames } = applyMod

const hex = (x) => b4a.toString(x, 'hex')
const signer = (kp) => (msg) => hex(crypto.sign(b4a.from(msg, 'utf-8'), kp.secretKey))
const owner = (kp) => hex(kp.publicKey)
const TARGET_A = 'aa'.repeat(32)
const TARGET_B = 'bb'.repeat(32)
// a confusable squat of "paypal": latin p, CYRILLIC а (U+0430), y, p, cyr а, l →
// skeleton folds to "paypal" but its normalized form differs.
const PAYPAL_SQUAT = 'pаypаl'

const resolve = (view, name) => {
  const e = resolveFromNames(view.names, name)
  return e ? { target: e.target, owner: e.owner, version: e.version, status: e.status } : null
}

test('first-claim-wins: the earlier claim in linear order owns the name', () => {
  const a = crypto.keyPair(); const b = crypto.keyPair()
  const view = applyView([
    ops.claimOp({ name: 'alice', target: TARGET_A, owner: owner(a) }, signer(a)),
    ops.claimOp({ name: 'alice', target: TARGET_B, owner: owner(b) }, signer(b)),
  ])
  assert.equal(resolve(view, 'alice').owner, owner(a))
  assert.equal(resolve(view, 'alice').target, TARGET_A)
})

test('a forged claim (tampered signature) is dropped', () => {
  const a = crypto.keyPair()
  const good = ops.claimOp({ name: 'bob', target: TARGET_A, owner: owner(a) }, signer(a))
  const forged = { ...good, name: 'bob', target: TARGET_B } // body changed, sig no longer valid
  assert.equal(resolve(applyView([forged]), 'bob'), null)
  // and an owner-mismatch forgery: claim victim's name but sign with attacker key
  const victim = crypto.keyPair(); const attacker = crypto.keyPair()
  const impersonation = ops.claimOp({ name: 'carol', target: TARGET_A, owner: owner(victim) }, signer(attacker))
  assert.equal(resolve(applyView([impersonation]), 'carol'), null)
})

test('rotate is owner-only and monotonic (supersedes target; no downgrade/replay)', () => {
  const a = crypto.keyPair(); const b = crypto.keyPair()
  const claim = ops.claimOp({ name: 'dave', target: TARGET_A, owner: owner(a) }, signer(a))
  // a non-owner cannot rotate
  const foreign = ops.rotateOp({ name: 'dave', target: TARGET_B, owner: owner(b), version: 2 }, signer(b))
  let view = applyView([claim, foreign])
  assert.equal(resolve(view, 'dave').target, TARGET_A)
  // the owner rotates forward
  const rot2 = ops.rotateOp({ name: 'dave', target: TARGET_B, owner: owner(a), version: 2 }, signer(a))
  view = applyView([claim, rot2])
  assert.equal(resolve(view, 'dave').target, TARGET_B)
  assert.equal(resolve(view, 'dave').version, 2)
  // a replayed/stale rotate at version <= current is ignored (no downgrade)
  const stale = ops.rotateOp({ name: 'dave', target: TARGET_A, owner: owner(a), version: 2 }, signer(a))
  view = applyView([claim, rot2, stale])
  assert.equal(resolve(view, 'dave').target, TARGET_B)
})

test('release frees the name; a different owner can then claim it', () => {
  const a = crypto.keyPair(); const b = crypto.keyPair()
  const view = applyView([
    ops.claimOp({ name: 'eve', target: TARGET_A, owner: owner(a) }, signer(a)),
    ops.releaseOp({ name: 'eve', owner: owner(a) }, signer(a)),
    ops.claimOp({ name: 'eve', target: TARGET_B, owner: owner(b) }, signer(b)),
  ])
  assert.equal(resolve(view, 'eve').owner, owner(b))
  assert.equal(resolve(view, 'eve').target, TARGET_B)
})

test('revoke tombstones the name — not re-claimable, even by the original owner', () => {
  const a = crypto.keyPair(); const b = crypto.keyPair()
  const view = applyView([
    ops.claimOp({ name: 'frank', target: TARGET_A, owner: owner(a) }, signer(a)),
    ops.revokeOp({ name: 'frank', owner: owner(a) }, signer(a)),
    ops.claimOp({ name: 'frank', target: TARGET_A, owner: owner(a) }, signer(a)), // re-claim
    ops.claimOp({ name: 'frank', target: TARGET_B, owner: owner(b) }, signer(b)), // by another
  ])
  assert.equal(resolve(view, 'frank'), null) // stays dead
})

test('homograph squat: a different owner cannot claim a confusable of a held name', () => {
  const a = crypto.keyPair(); const b = crypto.keyPair()
  const view = applyView([
    ops.claimOp({ name: 'paypal', target: TARGET_A, owner: owner(a) }, signer(a)),
    ops.claimOp({ name: PAYPAL_SQUAT, target: TARGET_B, owner: owner(b) }, signer(b)),
  ])
  assert.equal(resolve(view, 'paypal').owner, owner(a))
  assert.equal(resolve(view, PAYPAL_SQUAT), null) // the squat is rejected
})

test('the SAME owner may hold confusable variants of their own name', () => {
  const a = crypto.keyPair()
  const view = applyView([
    ops.claimOp({ name: 'paypal', target: TARGET_A, owner: owner(a) }, signer(a)),
    ops.claimOp({ name: PAYPAL_SQUAT, target: TARGET_A, owner: owner(a) }, signer(a)),
  ])
  assert.equal(resolve(view, 'paypal').owner, owner(a))
  assert.equal(resolve(view, PAYPAL_SQUAT).owner, owner(a)) // same owner → allowed
})

test('a revoked name keeps its skeleton blocked (no confusable re-squat)', () => {
  const a = crypto.keyPair(); const b = crypto.keyPair()
  const view = applyView([
    ops.claimOp({ name: 'paypal', target: TARGET_A, owner: owner(a) }, signer(a)),
    ops.revokeOp({ name: 'paypal', owner: owner(a) }, signer(a)),
    ops.claimOp({ name: PAYPAL_SQUAT, target: TARGET_B, owner: owner(b) }, signer(b)),
  ])
  assert.equal(resolve(view, PAYPAL_SQUAT), null) // skeleton stays reserved by the tombstone
})

test('normalization: case/width variants are the same name', () => {
  const a = crypto.keyPair(); const b = crypto.keyPair()
  const view = applyView([
    ops.claimOp({ name: 'Alice', target: TARGET_A, owner: owner(a) }, signer(a)),
    ops.claimOp({ name: 'ALICE', target: TARGET_B, owner: owner(b) }, signer(b)),
  ])
  assert.equal(resolve(view, 'alice').owner, owner(a)) // second claim is the same name → loses
})

test('no clock can resurrect or reorder: an injected timestamp is ignored', () => {
  const a = crypto.keyPair(); const b = crypto.keyPair()
  const first = ops.claimOp({ name: 'grace', target: TARGET_A, owner: owner(a) }, signer(a))
  // B's later claim carries a huge fake timestamp; canon excludes it, so it neither
  // breaks the sig nor wins — linear order, not the clock, decides.
  const second = { ...ops.claimOp({ name: 'grace', target: TARGET_B, owner: owner(b) }, signer(b)), created_at: 9_999_999_999 }
  const view = applyView([first, second])
  assert.equal(resolve(view, 'grace').owner, owner(a))
})
