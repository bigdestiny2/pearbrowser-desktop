// NOSTR2 — cross-curve identity binding (pear-nostr-bind). A MUTUAL attestation
// that links a user's Ed25519 pear root ↔ their secp256k1 Nostr key: the root
// signs "this nostr key is mine" (ed25519) AND the nostr key signs "this pear
// root is mine" (BIP-340 schnorr). Both signatures are required, so NEITHER side
// can be claimed without that side's secret — you can't bind someone else's nostr
// key to your root, and a nostr key can't claim a pear root it doesn't control.
//
// Monotonic `epoch` + root-signed revocation (you can unilaterally unlink from
// your pear side); resolve is revoke-wins by (epoch, nostrPubkey). PURE, CommonJS.

const secp = require('./secp256k1-bundle.cjs') // BIP-340 schnorr (nostr side)
const crypto = require('hypercore-crypto') // ed25519 (root side)
const b4a = require('b4a')

const BIND_TAG = 'pear.nostr-bind.v1:'
const REVOKE_TAG = 'pear.nostr-bind.revoke.v1:'
const HEX64 = /^[0-9a-f]{64}$/i
const HEX128 = /^[0-9a-f]{128}$/i // ed25519 + schnorr sigs are both 64 bytes

// canonical bytes both curves sign (sorted keys, no clock)
function canonBind (rootPubkey, nostrPubkey, epoch) {
  return BIND_TAG + JSON.stringify({ e: epoch, n: nostrPubkey, r: rootPubkey }, ['e', 'n', 'r'])
}
function canonRevoke (rootPubkey, nostrPubkey, epoch) {
  return REVOKE_TAG + JSON.stringify({ e: epoch, n: nostrPubkey, r: rootPubkey }, ['e', 'n', 'r'])
}
function ed25519Verify (msg, sigHex, pubHex) {
  try { return crypto.verify(b4a.from(msg, 'utf-8'), b4a.from(String(sigHex), 'hex'), b4a.from(String(pubHex), 'hex')) } catch { return false }
}

// rootSign(msgStr) -> ed25519 sigHex (identity.sign); nostrSign(msg32Hex) ->
// schnorr sigHex (identity.nostrSign, over sha256(message)).
function makeNostrBind ({ rootPubkey, nostrPubkey, epoch }, rootSign, nostrSign) {
  if (!Number.isInteger(epoch) || epoch < 1) throw new Error('epoch must be a positive integer')
  const canon = canonBind(rootPubkey, nostrPubkey, epoch)
  return {
    kind: 'nostr-bind', v: 1, rootPubkey, nostrPubkey, epoch,
    rootSig: rootSign(canon), // ed25519: "this nostr key is mine"
    nostrSig: nostrSign(secp.sha256Hex(canon)), // secp256k1: "this pear root is mine"
  }
}

// BOTH signatures must verify: the ed25519 root sig over the canonical bytes AND
// the secp256k1 schnorr sig over sha256(those bytes), against the keys IN the
// record (root checked against the Contacts-held expected root).
function verifyNostrBind (bind, expectedRootPubkey) {
  if (!bind || bind.kind !== 'nostr-bind') return false
  if (!Number.isInteger(bind.epoch) || bind.epoch < 1) return false
  if (typeof bind.nostrPubkey !== 'string' || !HEX64.test(bind.nostrPubkey)) return false
  if (typeof bind.rootPubkey !== 'string' || !HEX64.test(bind.rootPubkey) || bind.rootPubkey !== expectedRootPubkey) return false
  // validate sig FORMAT before verify (explicit fail-closed; don't lean on the
  // verifier's try-catch to absorb malformed hex) — NOSTR2 review hardening.
  if (typeof bind.rootSig !== 'string' || !HEX128.test(bind.rootSig)) return false
  if (typeof bind.nostrSig !== 'string' || !HEX128.test(bind.nostrSig)) return false
  const canon = canonBind(bind.rootPubkey, bind.nostrPubkey, bind.epoch)
  if (!ed25519Verify(canon, bind.rootSig, expectedRootPubkey)) return false // root attests
  return secp.schnorrVerify(bind.nostrSig, secp.sha256Hex(canon), bind.nostrPubkey) // nostr attests
}

// Root-signed revocation — the pear-identity owner unilaterally unlinks.
function makeNostrRevoke ({ rootPubkey, nostrPubkey, epoch }, rootSign) {
  if (!Number.isInteger(epoch) || epoch < 1) throw new Error('epoch must be a positive integer')
  return { kind: 'nostr-revoke', v: 1, rootPubkey, nostrPubkey, epoch, rootSig: rootSign(canonRevoke(rootPubkey, nostrPubkey, epoch)) }
}
function verifyNostrRevoke (rev, expectedRootPubkey) {
  if (!rev || rev.kind !== 'nostr-revoke') return false
  if (!Number.isInteger(rev.epoch) || rev.epoch < 1) return false
  if (typeof rev.nostrPubkey !== 'string' || !HEX64.test(rev.nostrPubkey)) return false
  if (typeof rev.rootPubkey !== 'string' || !HEX64.test(rev.rootPubkey) || rev.rootPubkey !== expectedRootPubkey) return false
  if (typeof rev.rootSig !== 'string' || !HEX128.test(rev.rootSig)) return false
  return ed25519Verify(canonRevoke(rev.rootPubkey, rev.nostrPubkey, rev.epoch), rev.rootSig, expectedRootPubkey)
}

// Current attested nostr pubkey for a root: highest-epoch valid bind not revoked.
// Equal-epoch ties broken deterministically by nostrPubkey (order-independent).
function resolveNostrBind (expectedRootPubkey, binds, revocations) {
  const revoked = new Set()
  for (const r of revocations || []) {
    if (verifyNostrRevoke(r, expectedRootPubkey)) revoked.add(r.epoch + ':' + r.nostrPubkey)
  }
  let best = null
  for (const b of binds || []) {
    if (!verifyNostrBind(b, expectedRootPubkey)) continue
    if (revoked.has(b.epoch + ':' + b.nostrPubkey)) continue
    if (!best || b.epoch > best.epoch || (b.epoch === best.epoch && b.nostrPubkey < best.nostrPubkey)) best = b
  }
  return best ? best.nostrPubkey : null
}

module.exports = { canonBind, canonRevoke, makeNostrBind, verifyNostrBind, makeNostrRevoke, verifyNostrRevoke, resolveNostrBind }
