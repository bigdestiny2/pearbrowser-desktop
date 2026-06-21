// NOSTR1 — Nostr event op schema (NIP-01). An op wraps a signed event to append
// to the event log; STRUCTURAL validity is checked here, the SIGNATURE in
// nostr-events-apply (the three-way verdict). PURE, CommonJS — Bare requires it,
// Node tests it. Same op-log shape as browser-state / autobee-catalog.

const MAX_CONTENT = 64 * 1024 // 64 KB content cap
const MAX_TAGS = 2000

const OP_ADD_EVENT = 'nostr.event.add'
const HEX64 = /^[0-9a-f]{64}$/
const HEX128 = /^[0-9a-f]{128}$/

// NIP-01 shape check only (id/pubkey 32-byte hex, sig 64-byte hex, integer
// created_at/kind, string tag arrays, bounded content). Authenticity is verified
// in apply via the recomputed id + schnorr signature.
function isWellFormedEvent (ev) {
  if (!ev || typeof ev !== 'object') return false
  if (typeof ev.id !== 'string' || !HEX64.test(ev.id)) return false
  if (typeof ev.pubkey !== 'string' || !HEX64.test(ev.pubkey)) return false
  if (typeof ev.sig !== 'string' || !HEX128.test(ev.sig)) return false
  if (!Number.isInteger(ev.created_at) || ev.created_at < 0) return false
  if (!Number.isInteger(ev.kind) || ev.kind < 0) return false
  if (!Array.isArray(ev.tags) || ev.tags.length > MAX_TAGS) return false
  for (const t of ev.tags) {
    if (!Array.isArray(t)) return false
    for (const x of t) if (typeof x !== 'string') return false
  }
  if (typeof ev.content !== 'string' || ev.content.length > MAX_CONTENT) return false
  return true
}

function addEventOp (event) { return { type: OP_ADD_EVENT, event } }

// { ok, retain } like the other op schemas: a malformed op is neither applied nor
// retained (dropped); a well-formed one is applied (apply still re-verifies the sig).
function validateOp (op) {
  if (!op || op.type !== OP_ADD_EVENT) return { ok: false, retain: false }
  if (!isWellFormedEvent(op.event)) return { ok: false, retain: false }
  return { ok: true, retain: true }
}

module.exports = { OP_ADD_EVENT, MAX_CONTENT, MAX_TAGS, addEventOp, isWellFormedEvent, validateOp }
