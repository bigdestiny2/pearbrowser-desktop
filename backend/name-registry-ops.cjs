// N5 — scoped multi-writer name registry: the op schema (NIP-01-style envelope,
// but for human-name claims). An op is an owner-signed assertion appended to a
// multi-writer Autobase; STRUCTURAL validity is checked here, the SIGNATURE +
// the reducer policy (first-claim-wins / revoke-wins / rotate-supersedes /
// owner-only / homograph-collision) in name-registry-apply. PURE, CommonJS.
//
// Op types: name.claim / name.rotate / name.release / name.revoke. Writer
// admission (writer.add) is the encrypted-autobase-helper's reserved ADD_WRITER
// op — not redefined here.

const { normalize, skeleton } = require('./name-normalize.cjs')

const CLAIM = 'name.claim'
const ROTATE = 'name.rotate'
const RELEASE = 'name.release'
const REVOKE = 'name.revoke'
const OP_TYPES = [CLAIM, ROTATE, RELEASE, REVOKE]

const TAG = {
  [CLAIM]: 'pear.namereg.claim.v1:',
  [ROTATE]: 'pear.namereg.rotate.v1:',
  [RELEASE]: 'pear.namereg.release.v1:',
  [REVOKE]: 'pear.namereg.revoke.v1:',
}
const HEX64 = /^[0-9a-f]{64}$/i
const HEX128 = /^[0-9a-f]{128}$/i
const MAX_NAME = 253

// Canonical signed bytes (sorted keys, NO clock — ordering is the Autobase's
// linear order, never a forgeable timestamp). The RAW display name `d` is signed
// too (not just the normalized form), so a writer can't tamper the presentation
// label while keeping a valid signature. target/version are '' / 0 for the ops
// that don't carry them, so sign and verify build identical bytes.
function canon (type, { name, normalized, target, owner, version }) {
  const body = { d: name, n: normalized, o: owner, t: target || '', v: version || 0 }
  return TAG[type] + JSON.stringify(body, ['d', 'n', 'o', 't', 'v'])
}

function isWellFormedOp (op) {
  if (!op || !OP_TYPES.includes(op.type)) return false
  if (typeof op.name !== 'string' || op.name.length === 0 || op.name.length > MAX_NAME) return false
  if (typeof op.owner !== 'string' || !HEX64.test(op.owner)) return false
  if (typeof op.sig !== 'string' || !HEX128.test(op.sig)) return false
  if (op.type === CLAIM || op.type === ROTATE) {
    if (typeof op.target !== 'string' || !HEX64.test(op.target)) return false
    if (!Number.isInteger(op.version) || op.version < 1) return false
  }
  return true
}

// ownerSign(msgStr) -> ed25519 sigHex (identity.sign(...).signature in the app).
// owner is the controlling ed25519 pubkey; target is what the name resolves to.
function claimOp ({ name, target, owner }, ownerSign) {
  const normalized = normalize(name)
  return { type: CLAIM, name, normalized, skeleton: skeleton(name), target, owner, version: 1, sig: ownerSign(canon(CLAIM, { name, normalized, target, owner, version: 1 })) }
}
function rotateOp ({ name, target, owner, version }, ownerSign) {
  const normalized = normalize(name)
  return { type: ROTATE, name, normalized, skeleton: skeleton(name), target, owner, version, sig: ownerSign(canon(ROTATE, { name, normalized, target, owner, version })) }
}
function releaseOp ({ name, owner }, ownerSign) {
  const normalized = normalize(name)
  return { type: RELEASE, name, normalized, skeleton: skeleton(name), owner, sig: ownerSign(canon(RELEASE, { name, normalized, owner })) }
}
function revokeOp ({ name, owner }, ownerSign) {
  const normalized = normalize(name)
  return { type: REVOKE, name, normalized, skeleton: skeleton(name), owner, sig: ownerSign(canon(REVOKE, { name, normalized, owner })) }
}

module.exports = {
  CLAIM, ROTATE, RELEASE, REVOKE, OP_TYPES, MAX_NAME,
  canon, isWellFormedOp, claimOp, rotateOp, releaseOp, revokeOp,
}
