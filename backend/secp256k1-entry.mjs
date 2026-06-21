// ESM entry bundled (esbuild → CJS) into backend/secp256k1-bundle.cjs so the
// Bare/Pear CJS backend can require() BIP-340 Schnorr (the Bare runtime can't
// dynamic-import() the ESM @noble packages — same constraint as sheets-bundle).
// SPIKE-SCHNORR-BARE deliverable. Gates the whole Nostr track + anonGPT receipts.
//
// @noble/secp256k1 v3 requires the hash fns to be INJECTED before schnorr works,
// so we wire sha256 + hmacSha256 from @noble/hashes once, here.
import * as secp from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha2.js'
import { hmac } from '@noble/hashes/hmac.js'

secp.hashes.sha256 = sha256
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg)

const ENC = new TextEncoder()
// Strict hex → bytes. Reject odd-length or non-hex input by THROWING rather than
// silently coercing invalid nibbles to 0 via parseInt(NaN) (which would truncate
// a bad signature to zero/short bytes instead of failing). Callers that verify
// (schnorrVerify) try-catch this into a clean fail-closed `false`; signing paths
// rightly throw on a malformed key. Defense-in-depth from the NOSTR2 review.
function h2b (hex) {
  const s = String(hex)
  if (s.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(s)) throw new Error('invalid hex input')
  const out = new Uint8Array(s.length >> 1)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16)
  return out
}
function b2h (bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0')
  return s
}

// --- BIP-340 schnorr (hex in / hex out) ---
export function schnorrGetPublicKey (skHex) { return b2h(secp.schnorr.getPublicKey(h2b(skHex))) }
export function schnorrSign (msg32Hex, skHex, auxRandHex) {
  return b2h(secp.schnorr.sign(h2b(msg32Hex), h2b(skHex), auxRandHex ? h2b(auxRandHex) : undefined))
}
export function schnorrVerify (sigHex, msg32Hex, pkHex) {
  try { return secp.schnorr.verify(h2b(sigHex), h2b(msg32Hex), h2b(pkHex)) } catch { return false }
}
export function sha256Hex (bytesOrUtf8) {
  return b2h(sha256(typeof bytesOrUtf8 === 'string' ? ENC.encode(bytesOrUtf8) : bytesOrUtf8))
}

// --- NIP-01 event id + sign/verify ---
export function nip01Serialize (ev) {
  return JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags || [], ev.content])
}
export function nip01EventId (ev) { return sha256Hex(nip01Serialize(ev)) }
export function nip01Sign (ev, skHex, auxRandHex) {
  const id = nip01EventId(ev)
  return { ...ev, id, sig: schnorrSign(id, skHex, auxRandHex) }
}
export function nip01Verify (ev) {
  if (!ev || typeof ev.id !== 'string' || typeof ev.sig !== 'string' || typeof ev.pubkey !== 'string') return false
  if (ev.id !== nip01EventId(ev)) return false // the id must commit to the content
  return schnorrVerify(ev.sig, ev.id, ev.pubkey)
}
