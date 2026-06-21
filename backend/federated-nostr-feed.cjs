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

class FederatedNostrFeed {
  // deps:
  //   listContacts() -> [{ pubkey (root hex), displayName, verifiedAt, bindingKey }]
  //   resolveBinding({ contactPubkey, dhtPubkey }) -> { nostrEventKey, nostrBind } | null
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

  // Returns accepted contact events, each tagged with `_via` (the source contact's
  // display name) for attribution. Deduped by id; NOT sorted/capped (the caller
  // merges with the user's own events and applies the final NIP-01 query).
  async events () {
    const contacts = ((await this.listContacts()) || [])
      .filter((c) => c && c.verifiedAt && typeof c.pubkey === 'string' && c.bindingKey)
      .slice(0, this.maxContacts)
    const nowSec = this.now()
    const ceiling = nowSec + FUTURE_SKEW_SEC
    const settled = await Promise.allSettled(contacts.map(async (c) => {
      const binding = await withTimeout(this.resolveBinding({ contactPubkey: c.pubkey, dhtPubkey: c.bindingKey }), this.stepTimeoutMs)
      if (!binding || !binding.nostrEventKey || !binding.nostrBind) return []
      // PER-CONTACT trust set: only THIS contact's attested nostr key is trusted in
      // THEIR store. buildNostrTrustSet re-verifies the nostr-bind (dual-sig) against
      // the contact's root, so a forged/unverifiable bind yields an empty set.
      const trust = buildNostrTrustSet([c], () => ({ binds: [binding.nostrBind], revocations: [] }))
      if (trust.size === 0) return []
      const store = await withTimeout(this.openEventStore(binding.nostrEventKey, c.pubkey), this.stepTimeoutMs)
      if (!store) return []
      const evs = await withTimeout(store.listEvents(), this.stepTimeoutMs)
      const { accepted } = partitionByTrust(evs, trust)
      const via = c.displayName || c.pubkey.slice(0, 8)
      return accepted
        .filter((ev) => ev.created_at <= ceiling) // drop future-dated spam from the feed
        .map((ev) => ({ ...ev, _via: via }))
    }))
    const byId = new Map()
    for (const r of settled) {
      if (r.status !== 'fulfilled' || !Array.isArray(r.value)) continue
      for (const ev of r.value) if (!byId.has(ev.id)) byId.set(ev.id, ev)
    }
    return [...byId.values()]
  }
}

module.exports = { FederatedNostrFeed, FUTURE_SKEW_SEC }
