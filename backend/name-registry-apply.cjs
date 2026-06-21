// N5 — the name-registry reducer. PURE, CommonJS, deterministic (NO clock —
// ordering is the Autobase linear order). Two layers:
//
//   verifyOpAuthenticity(op) — well-formed + the ed25519 signature verifies under
//     op.owner over the RE-DERIVED canonical bytes (normalized/skeleton are
//     recomputed from op.name, never trusted from the wire). Returns the
//     recomputed { normalized, skeleton } or null (drop).
//
//   decide(ctx, op) — the policy, given the current entry for this name and the
//     entry that currently owns this skeleton:
//     • CLAIM   first-claim-wins: only an unowned/released name can be claimed;
//               a different owner cannot claim a name whose CONFUSABLE skeleton is
//               already held by a non-released name (homograph-squat defense).
//     • ROTATE  owner-only, monotonic version (no downgrade/replay) — supersedes.
//     • RELEASE owner-only → name + skeleton become free again.
//     • REVOKE  owner-only → tombstone; name AND its skeleton stay blocked.
//   revoke/release/rotate all require op.owner === the CURRENT owner, and the sig
//   already proved op.owner signed it — so only the current owner can transition.
//
// applyView(ops) folds a linearized op list through decide for tests; the store
// (name-registry-store) runs the SAME decide against its Hyperbee view.

const crypto = require('hypercore-crypto')
const b4a = require('b4a')
const { normalize, skeleton } = require('./name-normalize.cjs')
const ops = require('./name-registry-ops.cjs')

function ed25519Verify (msg, sigHex, pubHex) {
  try { return crypto.verify(b4a.from(msg, 'utf-8'), b4a.from(String(sigHex), 'hex'), b4a.from(String(pubHex), 'hex')) } catch { return false }
}

function verifyOpAuthenticity (op) {
  if (!ops.isWellFormedOp(op)) return null
  const normalized = normalize(op.name)
  if (!normalized) return null
  const sk = skeleton(op.name)
  const canon = ops.canon(op.type, { normalized, target: op.target, owner: op.owner, version: op.version })
  if (!ed25519Verify(canon, op.sig, op.owner)) return null
  return { normalized, skeleton: sk }
}

const NOOP = { write: null }

// ctx: { current: entry|null, skelOwner: entry|null, normalized, skeleton }
// entry: { name, normalized, skeleton, target, owner, version, status }
function decide (ctx, op) {
  const { current, skelOwner, normalized, skeleton: sk } = ctx
  if (op.type === ops.CLAIM) {
    // first-claim-wins: an active or revoked (tombstoned) name is NOT re-claimable.
    if (current && current.status !== 'released') return NOOP
    // homograph defense: a different owner can't claim a name whose confusable
    // skeleton is already held by a non-released entry (active or tombstoned).
    if (skelOwner && skelOwner.status !== 'released' && skelOwner.owner !== op.owner) return NOOP
    return {
      write: { name: op.name, normalized, skeleton: sk, target: op.target, owner: op.owner, version: 1, status: 'active' },
      skelSet: true,
    }
  }
  if (op.type === ops.ROTATE) {
    if (!current || current.status !== 'active' || current.owner !== op.owner) return NOOP
    if (op.version <= current.version) return NOOP // monotonic — no downgrade/replay
    return { write: { ...current, target: op.target, version: op.version } }
  }
  if (op.type === ops.RELEASE) {
    if (!current || current.status !== 'active' || current.owner !== op.owner) return NOOP
    return { write: { ...current, status: 'released' }, skelDel: true }
  }
  if (op.type === ops.REVOKE) {
    if (!current || current.status !== 'active' || current.owner !== op.owner) return NOOP
    return { write: { ...current, status: 'revoked' } } // tombstone; skeleton stays blocked
  }
  return NOOP
}

// Pure reference reducer over a linearized op list → { names, skels } Maps.
function applyView (opList) {
  const names = new Map() // normalized -> entry
  const skels = new Map() // skeleton -> normalized (which name holds this skeleton)
  for (const op of opList || []) {
    const auth = verifyOpAuthenticity(op)
    if (!auth) continue
    const { normalized, skeleton: sk } = auth
    const current = names.get(normalized) || null
    const skelNorm = skels.get(sk)
    const skelOwner = (skelNorm && skelNorm !== normalized) ? (names.get(skelNorm) || null) : null
    const d = decide({ current, skelOwner, normalized, skeleton: sk }, op)
    if (!d.write) continue
    names.set(normalized, d.write)
    if (d.skelSet) skels.set(sk, normalized)
    if (d.skelDel && skels.get(sk) === normalized) skels.delete(sk)
  }
  return { names, skels }
}

// Resolve a typed name against a reduced { names } map → active entry or null.
function resolveFromNames (names, name) {
  const e = names.get(normalize(name))
  return (e && e.status === 'active') ? e : null
}

module.exports = { verifyOpAuthenticity, decide, applyView, resolveFromNames }
