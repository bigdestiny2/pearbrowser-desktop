// Lighthouse Phase 2 — IdentityBinding + the missing detached-verify. PURE,
// CommonJS. Closes the v1 showstopper that signForApp does NOT bind a posting's
// signer to the user's root / Contacts identity, and that there is no
// identity.verify. See docs/P2P-SEARCH-RESEARCH.md (gap: identity-binding).
//
// Two concerns:
//  1. verifyAppSig — verify a per-app (e.g. 'search') detached ed25519 signature
//     using the SAME domain-separated tag signForApp produces
//     (`pear.app.<appId>:<namespace>:`), so a signature can't be replayed
//     across apps/namespaces.
//  2. IdentityBinding — a VERSIONED, root-signed record linking your root
//     pubkey → a (rotatable, Corestore-persisted, NOT seed-derived) search
//     pubkey, plus revocation. First-use authentication requires the binding be
//     checked against the Contacts-held ROOT pubkey, never a self-asserted one.

const crypto = require('hypercore-crypto')
const b4a = require('b4a')

// --- per-app signature domain (mirrors identity.js signForApp exactly) -------

function appTag (appId, namespace = '') {
  return `pear.app.${appId}:${namespace}:`
}

// The exact message bytes signForApp signs: tag ‖ payload.
function appMessage (appId, payload, namespace = '') {
  const tag = b4a.from(appTag(appId, namespace), 'utf-8')
  const body = typeof payload === 'string' ? b4a.from(payload, 'utf-8') : b4a.from(payload || [])
  return b4a.concat([tag, body])
}

function verifyAppSig (appId, payload, sigHex, pubkeyHex, namespace = '') {
  if (!sigHex || !pubkeyHex) return false
  try {
    return crypto.verify(appMessage(appId, payload, namespace), b4a.from(sigHex, 'hex'), b4a.from(pubkeyHex, 'hex'))
  } catch { return false }
}

// --- IdentityBinding ---------------------------------------------------------
//
// A binding is signed by the ROOT key (so only the identity owner can issue
// one), and is monotonically versioned so the search key can ROTATE (the search
// key is a random Corestore-persisted keypair, NOT getAppKeypair('search'),
// which is seed-derived and therefore unrotatable). A revocation (same version)
// invalidates a binding.

const BINDING_TAG = 'pear.lighthouse.binding.v2:'
const REVOKE_TAG = 'pear.lighthouse.revoke.v2:'

// Canonical, stable bytes a binding/revocation signs (sorted keys, no clock).
function canonBinding (rootPubkey, searchPubkey, version) {
  return BINDING_TAG + JSON.stringify({ r: rootPubkey, s: searchPubkey, v: version }, ['r', 's', 'v'])
}
function canonRevoke (rootPubkey, searchPubkey, version) {
  return REVOKE_TAG + JSON.stringify({ r: rootPubkey, s: searchPubkey, v: version }, ['r', 's', 'v'])
}

// `rootSign(msgString) -> sigHex` signs with the user's ROOT key (identity.sign
// in the app; a test stub otherwise).
function makeBinding ({ rootPubkey, searchPubkey, version }, rootSign) {
  if (!Number.isInteger(version) || version < 1) throw new Error('version must be a positive integer')
  const sig = rootSign(canonBinding(rootPubkey, searchPubkey, version))
  return { kind: 'binding', v: 2, rootPubkey, searchPubkey, version, sig }
}

function makeRevocation ({ rootPubkey, searchPubkey, version }, rootSign) {
  const sig = rootSign(canonRevoke(rootPubkey, searchPubkey, version))
  return { kind: 'revoke', v: 2, rootPubkey, searchPubkey, version, sig }
}

// Verify a binding's root signature against the EXPECTED root pubkey (the one
// held in Contacts for this peer — NOT binding.rootPubkey, which is attacker-
// controllable on first sight). This is the MITM defense.
function verifyBinding (binding, expectedRootPubkey) {
  if (!binding || binding.kind !== 'binding') return false
  if (binding.rootPubkey !== expectedRootPubkey) return false
  try {
    return crypto.verify(b4a.from(canonBinding(binding.rootPubkey, binding.searchPubkey, binding.version), 'utf-8'),
      b4a.from(binding.sig, 'hex'), b4a.from(expectedRootPubkey, 'hex'))
  } catch { return false }
}

function verifyRevocation (rev, expectedRootPubkey) {
  if (!rev || rev.kind !== 'revoke') return false
  if (rev.rootPubkey !== expectedRootPubkey) return false
  try {
    return crypto.verify(b4a.from(canonRevoke(rev.rootPubkey, rev.searchPubkey, rev.version), 'utf-8'),
      b4a.from(rev.sig, 'hex'), b4a.from(expectedRootPubkey, 'hex'))
  } catch { return false }
}

// Resolve the CURRENT valid search pubkey for a root from its bindings +
// revocations, authenticated against the Contacts-held root pubkey. Highest
// non-revoked version wins. Returns the searchPubkey hex, or null.
function resolveSearchKey (expectedRootPubkey, bindings, revocations) {
  const revoked = new Set()
  for (const r of revocations || []) {
    if (verifyRevocation(r, expectedRootPubkey)) revoked.add(r.version + ':' + r.searchPubkey)
  }
  let best = null
  for (const b of bindings || []) {
    if (!verifyBinding(b, expectedRootPubkey)) continue
    if (revoked.has(b.version + ':' + b.searchPubkey)) continue
    if (!best || b.version > best.version) best = b
  }
  return best ? best.searchPubkey : null
}

module.exports = {
  appTag, appMessage, verifyAppSig,
  canonBinding, canonRevoke,
  makeBinding, makeRevocation, verifyBinding, verifyRevocation, resolveSearchKey,
}
