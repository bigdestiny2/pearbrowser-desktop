// NOSTR Phase 3 — the federated feed. Replicate each TRUSTED contact's event
// store and surface only events authored by THAT contact's ATTESTED nostr key
// (verified via their published nostr-bind against the Contacts-held root — the
// cross-curve MITM defense). Per-contact trust set, so contact A can't serve an
// event you'd trust as authored by someone else. Parallel + per-step timeout;
// future-dated events dropped (display anti-spam — a peer can't pin a note to the
// top of your feed; the consensus reducer stays clock-free). PURE w.r.t. injected
// deps (contacts, binding resolver, store opener, clock) → Node-testable.

const { buildNostrTrustSet, partitionByTrust } = require('./nostr-ingest.cjs')

const DEFAULT_MAX_CONTACTS = 64
const DEFAULT_STEP_TIMEOUT_MS = 3000
const FUTURE_SKEW_SEC = 900 // events dated > now + 15min are dropped from the feed

function withTimeout (p, ms) {
  let t = null
  return Promise.race([
    Promise.resolve(p).finally(() => { if (t) clearTimeout(t) }),
    new Promise((_, reject) => { t = setTimeout(() => reject(new Error('timeout')), ms) }),
  ])
}

function makeHiddenDiagnostics (contactsEligible = 0) {
  return {
    contactsEligible,
    contactsResolved: 0,
    bindingMissing: 0,
    bindingUntrusted: 0,
    quarantined: 0,
    dropped: 0,
    futureDated: 0,
    contactFailures: 0,
    byReason: {}
  }
}

function addHiddenReason (hidden, reason, count = 1) {
  const key = reason || 'unverified'
  hidden.byReason[key] = (hidden.byReason[key] || 0) + count
}

function mergeHiddenDiagnostics (into, from) {
  for (const key of ['contactsResolved', 'bindingMissing', 'bindingUntrusted', 'quarantined', 'dropped', 'futureDated', 'contactFailures']) {
    into[key] += from[key] || 0
  }
  for (const [reason, count] of Object.entries(from.byReason || {})) {
    addHiddenReason(into, reason, count)
  }
}

class FederatedNostrFeed {
  // deps:
  //   listContacts() -> [{ pubkey (root hex), displayName, verifiedAt, bindingKey }]
  //   resolveBinding({ contactPubkey, dhtPubkey }) -> { nostrEventKey, nostrBind, nostrRevocations } | null
  //   openEventStore(nostrEventKeyHex, contactPubkey) -> { listEvents() -> [event] } | null
  //   now() -> unix seconds (injectable for tests)
  constructor ({ listContacts, resolveBinding, openEventStore, now, maxContacts, stepTimeoutMs } = {}) {
    if (typeof listContacts !== 'function') throw new Error('FederatedNostrFeed requires listContacts')
    if (typeof resolveBinding !== 'function') throw new Error('FederatedNostrFeed requires resolveBinding')
    if (typeof openEventStore !== 'function') throw new Error('FederatedNostrFeed requires openEventStore')
    this.listContacts = listContacts
    this.resolveBinding = resolveBinding
    this.openEventStore = openEventStore
    this.now = typeof now === 'function' ? now : () => Math.floor(Date.now() / 1000)
    this.maxContacts = Number.isInteger(maxContacts) && maxContacts > 0 ? maxContacts : DEFAULT_MAX_CONTACTS
    this.stepTimeoutMs = Number.isInteger(stepTimeoutMs) && stepTimeoutMs > 0 ? stepTimeoutMs : DEFAULT_STEP_TIMEOUT_MS
  }

  async _collect () {
    const contacts = ((await this.listContacts()) || [])
      .filter((c) => c && c.verifiedAt && typeof c.pubkey === 'string' && c.bindingKey)
      .slice(0, this.maxContacts)
    const nowSec = this.now()
    const ceiling = nowSec + FUTURE_SKEW_SEC
    const hidden = makeHiddenDiagnostics(contacts.length)
    const settled = await Promise.allSettled(contacts.map(async (c) => {
      const contactHidden = makeHiddenDiagnostics()
      const binding = await withTimeout(this.resolveBinding({ contactPubkey: c.pubkey, dhtPubkey: c.bindingKey }), this.stepTimeoutMs)
      contactHidden.contactsResolved = 1
      if (!binding || !binding.nostrEventKey || !binding.nostrBind) {
        contactHidden.bindingMissing = 1
        addHiddenReason(contactHidden, 'missing-binding')
        return { events: [], hidden: contactHidden }
      }
      // PER-CONTACT trust set: only THIS contact's attested nostr key is trusted in
      // THEIR store. buildNostrTrustSet re-verifies the nostr-bind (dual-sig) against
      // the contact's root and applies remote revocations, so a forged, revoked,
      // or stale bind yields an empty/non-linked set.
      const trust = buildNostrTrustSet([c], () => ({
        binds: [binding.nostrBind],
        revocations: Array.isArray(binding.nostrRevocations) ? binding.nostrRevocations : [],
      }))
      if (trust.size === 0) {
        contactHidden.bindingUntrusted = 1
        const state = trust.rootStates instanceof Map ? trust.rootStates.get(c.pubkey.toLowerCase()) : null
        addHiddenReason(contactHidden, state?.status || 'untrusted-binding')
      }
      const store = await withTimeout(this.openEventStore(binding.nostrEventKey, c.pubkey), this.stepTimeoutMs)
      if (!store) return { events: [], hidden: contactHidden }
      const evs = await withTimeout(store.listEvents(), this.stepTimeoutMs)
      const { accepted, quarantined, dropped } = partitionByTrust(evs, trust)
      const via = c.displayName || c.pubkey.slice(0, 8)
      contactHidden.quarantined += quarantined.length
      for (const ev of quarantined) addHiddenReason(contactHidden, ev._trustState || 'unverified')
      contactHidden.dropped += dropped.length
      for (const d of dropped) addHiddenReason(contactHidden, d.reason ? `invalid:${d.reason}` : 'invalid-event')
      const visible = accepted.filter((ev) => ev.created_at <= ceiling)
      const futureDated = accepted.length - visible.length
      if (futureDated > 0) {
        contactHidden.futureDated += futureDated
        addHiddenReason(contactHidden, 'future-dated', futureDated)
      }
      return {
        events: visible.map((ev) => ({ ...ev, _via: via })),
        hidden: contactHidden
      }
    }))
    const byId = new Map()
    for (const r of settled) {
      if (r.status !== 'fulfilled' || !r.value) {
        hidden.contactFailures += 1
        addHiddenReason(hidden, 'contact-failed')
        continue
      }
      mergeHiddenDiagnostics(hidden, r.value.hidden || makeHiddenDiagnostics())
      for (const ev of r.value.events || []) if (!byId.has(ev.id)) byId.set(ev.id, ev)
    }
    return { events: [...byId.values()], hidden }
  }

  // Returns accepted contact events, each tagged with `_via` (the source contact's
  // display name) for attribution. Deduped by id; NOT sorted/capped (the caller
  // merges with the user's own events and applies the final NIP-01 query).
  async events () {
    return (await this._collect()).events
  }

  async eventsWithDiagnostics () {
    return this._collect()
  }
}

module.exports = { FederatedNostrFeed, FUTURE_SKEW_SEC }
