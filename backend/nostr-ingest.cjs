// NOSTR3 — Pear-native distribution: the ingest gate. Events arrive from the P2P
// backbone (index rooms / replicated stores; NO wss:// dependency) authored by
// secp256k1 Nostr keys. Two seams, both fail-closed:
//
//   1. verify-and-drop — every event is re-verified (well-formed + id commits to
//      content + BIP-340 schnorr) exactly like index-room-client.js drops bad
//      rows; a relay/peer can only serve, never forge.
//   2. trust-frontier gate — an event is reduced into the VISIBLE feed only if
//      its author key is *attested* (NOSTR2 cross-curve binding) by a VERIFIED
//      contact. Everyone else is QUARANTINED (held, not dropped) — the Sybil/spam
//      defense. Quarantine is recoverable: a later follow/binding re-partitions.
//
// The trust set is built by resolving each contact's binding via resolveNostrBind,
// which itself requires BOTH the contact's ed25519 root sig AND the nostr key's
// schnorr sig — so an attacker-forged binding never enters the set. PURE, CommonJS.

const { verifyEvent } = require('./nostr-events-apply.cjs')
const { resolveNostrBindState } = require('./nostr-bind.cjs')

const HEX64 = /^[0-9a-f]{64}$/i

// contacts: [{ pubkey (ed25519 root hex), verifiedAt, ... }] from Contacts.list().
// getBindings(rootPubkey) -> { binds:[...], revocations:[...] } known for that root
//   (distributed bind/revoke records; resolveNostrBind re-verifies each, so raw,
//   untrusted input is safe — only the contact's genuinely dual-signed bind wins).
// opts.self?: { rootPubkey, binds, revocations } — include the user's OWN attested
//   nostr key so their own posts surface in their feed.
// Returns Map<nostrPubkey, rootPubkey>: the attested authors whose events are trusted.
function stateEntry (status, rootPubkey = null) {
  return { status, rootPubkey: rootPubkey ? rootPubkey.toLowerCase() : null }
}

function rememberAuthorState (states, entry) {
  if (!entry || typeof entry.nostrPubkey !== 'string') return
  const key = entry.nostrPubkey.toLowerCase()
  const prev = states.get(key)
  // linked is strongest for acceptance, then revoked, then stale, then unverified.
  const weight = { linked: 4, revoked: 3, stale: 2, unverified: 1 }
  if (!prev || (weight[entry.status] || 0) >= (weight[prev.status] || 0)) {
    states.set(key, stateEntry(entry.status, entry.rootPubkey))
  }
}

function buildNostrTrustSet (contacts, getBindings, opts = {}) {
  const trust = new Map()
  const authorStates = new Map()
  const rootStates = new Map()
  const addFor = (rootPubkey, binds, revocations) => {
    if (typeof rootPubkey !== 'string' || !HEX64.test(rootPubkey)) return
    const state = resolveNostrBindState(rootPubkey, binds || [], revocations || [])
    rootStates.set(rootPubkey.toLowerCase(), {
      status: state.status,
      rootPubkey: state.rootPubkey,
      nostrPubkey: state.nostrPubkey,
      epoch: state.epoch,
    })
    for (const entry of state.bindings || []) rememberAuthorState(authorStates, entry)
    if (state.status === 'linked' && state.nostrPubkey) {
      trust.set(state.nostrPubkey.toLowerCase(), rootPubkey.toLowerCase())
      rememberAuthorState(authorStates, { status: 'linked', rootPubkey, nostrPubkey: state.nostrPubkey })
    }
  }
  for (const c of contacts || []) {
    // fail-closed: only a SIGNATURE-VERIFIED contact (verifiedAt set) confers trust,
    // mirroring the bindingKey discipline in contacts.js. An un-verified contact's
    // attested nostr key is treated as untrusted → its events quarantine.
    if (!c || !c.verifiedAt || typeof c.pubkey !== 'string') continue
    const { binds, revocations } = getBindings ? (getBindings(c.pubkey) || {}) : {}
    addFor(c.pubkey, binds, revocations)
  }
  if (opts.self && opts.self.rootPubkey) {
    addFor(opts.self.rootPubkey, opts.self.binds, opts.self.revocations)
  }
  trust.authorStates = authorStates
  trust.rootStates = rootStates
  return trust
}

function isAttested (nostrPubkey, trustSet) {
  return typeof nostrPubkey === 'string' && trustSet instanceof Map && trustSet.has(nostrPubkey.toLowerCase())
}

function getNostrAuthorState (nostrPubkey, trustSet) {
  if (typeof nostrPubkey !== 'string' || !(trustSet instanceof Map)) return stateEntry('unverified')
  const key = nostrPubkey.toLowerCase()
  if (trustSet.has(key)) return stateEntry('linked', trustSet.get(key))
  if (trustSet.authorStates instanceof Map && trustSet.authorStates.has(key)) return trustSet.authorStates.get(key)
  return stateEntry('unverified')
}

function stripTrustState (ev) {
  if (!ev || typeof ev !== 'object') return ev
  const { _trustState, _trustRoot, ...clean } = ev
  return clean
}

// Partition a batch of incoming events:
//   dropped     — failed verify-and-drop (forged/tampered/malformed); { id?, reason }
//   accepted    — verified AND author attested by a verified contact → into the feed
//   quarantined — verified but author NOT attested → held, surfaced separately
// Dedup by id (content-addressed) within accepted/quarantined and against
// opts.knownIds (a Set of ids already reduced, so re-ingest is idempotent).
function partitionByTrust (events, trustSet, opts = {}) {
  const known = opts.knownIds instanceof Set ? opts.knownIds : new Set()
  const seen = new Set()
  const accepted = []
  const quarantined = []
  const dropped = []
  for (const ev of events || []) {
    const v = verifyEvent(ev)
    if (!v.ok) { dropped.push({ id: ev && ev.id, reason: v.reason }); continue }
    if (known.has(ev.id) || seen.has(ev.id)) continue // dedup: id commits to content
    seen.add(ev.id)
    const state = getNostrAuthorState(ev.pubkey, trustSet)
    const clean = stripTrustState(ev)
    if (state.status === 'linked') accepted.push(clean)
    else quarantined.push({ ...clean, _trustState: state.status, _trustRoot: state.rootPubkey })
  }
  return { accepted, quarantined, dropped }
}

// When trust changes (a new binding arrives, the user follows someone), re-run the
// held quarantine through the updated trust set. Already-verified, so this only
// re-partitions; returns the same shape.
function repartitionQuarantine (quarantined, trustSet, opts = {}) {
  return partitionByTrust(quarantined, trustSet, opts)
}

module.exports = { buildNostrTrustSet, getNostrAuthorState, isAttested, partitionByTrust, repartitionQuarantine }
