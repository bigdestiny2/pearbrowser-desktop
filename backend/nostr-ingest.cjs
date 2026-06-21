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
const { resolveNostrBind } = require('./nostr-bind.cjs')

const HEX64 = /^[0-9a-f]{64}$/i

// contacts: [{ pubkey (ed25519 root hex), verifiedAt, ... }] from Contacts.list().
// getBindings(rootPubkey) -> { binds:[...], revocations:[...] } known for that root
//   (distributed bind/revoke records; resolveNostrBind re-verifies each, so raw,
//   untrusted input is safe — only the contact's genuinely dual-signed bind wins).
// opts.self?: { rootPubkey, binds, revocations } — include the user's OWN attested
//   nostr key so their own posts surface in their feed.
// Returns Map<nostrPubkey, rootPubkey>: the attested authors whose events are trusted.
function buildNostrTrustSet (contacts, getBindings, opts = {}) {
  const trust = new Map()
  const addFor = (rootPubkey, binds, revocations) => {
    if (typeof rootPubkey !== 'string' || !HEX64.test(rootPubkey)) return
    const nostrPubkey = resolveNostrBind(rootPubkey, binds || [], revocations || [])
    if (nostrPubkey) trust.set(nostrPubkey.toLowerCase(), rootPubkey.toLowerCase())
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
  return trust
}

function isAttested (nostrPubkey, trustSet) {
  return typeof nostrPubkey === 'string' && trustSet instanceof Map && trustSet.has(nostrPubkey.toLowerCase())
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
    if (isAttested(ev.pubkey, trustSet)) accepted.push(ev)
    else quarantined.push(ev)
  }
  return { accepted, quarantined, dropped }
}

// When trust changes (a new binding arrives, the user follows someone), re-run the
// held quarantine through the updated trust set. Already-verified, so this only
// re-partitions; returns the same shape.
function repartitionQuarantine (quarantined, trustSet, opts = {}) {
  return partitionByTrust(quarantined, trustSet, opts)
}

module.exports = { buildNostrTrustSet, isAttested, partitionByTrust, repartitionQuarantine }
