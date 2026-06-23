// Vendored CJS mirror of p2p-hiverelay/core/capability-doc.js `verifyCapabilityDoc`
// (the relay package is ESM and can't be required under Bare). The index room is
// an INDEX, not an authority — a relay-directory row carries the relay's full
// signed capability `doc`, and the client RE-VERIFIES it (Design Risk #5). This
// verifies the doc's ed25519 signature against the pubkey IN the doc (TOFU),
// over the SAME canonical signable payload the relay signs (all fields, sorted
// keys deeply, `signature` excluded) — kept byte-identical to the relay so a doc
// the relay signed verifies here even after JSON re-encoding in transit.

const sodium = require('sodium-universal')
const b4a = require('b4a')

const SIGNATURE_VERSION = 1

function sortKeysDeep (val) {
  if (Array.isArray(val)) return val.map(sortKeysDeep)
  if (val && typeof val === 'object') {
    const out = {}
    for (const k of Object.keys(val).sort()) out[k] = sortKeysDeep(val[k])
    return out
  }
  return val
}

function canonicalSignablePayload (doc) {
  const clone = {}
  for (const k of Object.keys(doc).sort()) {
    if (k === 'signature') continue
    clone[k] = sortKeysDeep(doc[k])
  }
  return b4a.from(JSON.stringify(clone), 'utf8')
}

function verifyCapabilityDocDetailed (doc) {
  if (!doc || typeof doc !== 'object') return { valid: false, reason: 'not an object' }
  if (!doc.signature) return { valid: false, reason: 'no signature on doc' }
  if (doc.signature.v !== SIGNATURE_VERSION) return { valid: false, reason: 'unsupported signature version' }
  if (typeof doc.pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(doc.pubkey)) return { valid: false, reason: 'no valid pubkey on doc' }
  if (typeof doc.signature.sig !== 'string' || !/^[0-9a-f]{128}$/i.test(doc.signature.sig)) return { valid: false, reason: 'malformed signature' }
  try {
    const payload = canonicalSignablePayload(doc)
    const sig = b4a.from(doc.signature.sig, 'hex')
    const pub = b4a.from(doc.pubkey, 'hex')
    return sodium.crypto_sign_verify_detached(sig, payload, pub)
      ? { valid: true }
      : { valid: false, reason: 'signature verification failed' }
  } catch (err) {
    return { valid: false, reason: 'verify error: ' + (err && err.message) }
  }
}

// Boolean form for the IndexRoomClient verify hook — which truthy-checks the
// result, so a `{ valid: false }` object would wrongly pass. Always return a bool.
function verifyCapabilityDoc (doc) { return verifyCapabilityDocDetailed(doc).valid === true }

module.exports = { verifyCapabilityDoc, verifyCapabilityDocDetailed, canonicalSignablePayload, SIGNATURE_VERSION }
