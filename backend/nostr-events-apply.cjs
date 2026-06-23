// NOSTR1 — the verifying reducer. PURE, CommonJS, deterministic (no clock). The
// THREE-WAY verdict for a NIP-01 event: (1) well-formed shape, (2) id == the
// recomputed sha256 of the canonical serialization (so it commits to the
// content), (3) the BIP-340 schnorr signature verifies under the author pubkey.
// All three or the event is rejected. Materializes the valid set, deduped by id
// (Nostr events are immutable + content-addressed).

const secp = require('./secp256k1-bundle.cjs')
const { isWellFormedEvent, OP_ADD_EVENT } = require('./nostr-events-ops.cjs')

function verifyEvent (ev) {
  if (!isWellFormedEvent(ev)) return { ok: false, reason: 'malformed' }
  if (secp.nip01EventId(ev) !== ev.id) return { ok: false, reason: 'id mismatch' } // id must commit to content
  if (!secp.schnorrVerify(ev.sig, ev.id, ev.pubkey)) return { ok: false, reason: 'bad signature' }
  return { ok: true }
}

// Linearized op log → { events }. Invalid events are dropped; duplicates (same
// id) collapse to one. Order-independent for a given set (content-addressed).
function applyView (ops) {
  const byId = new Map()
  for (const op of ops || []) {
    if (!op || op.type !== OP_ADD_EVENT) continue
    const ev = op.event
    if (!ev || byId.has(ev.id)) continue
    if (verifyEvent(ev).ok) byId.set(ev.id, ev)
  }
  return { events: [...byId.values()] }
}

module.exports = { verifyEvent, applyView }
