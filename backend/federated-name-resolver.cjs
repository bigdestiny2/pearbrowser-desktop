// N5 cross-user federation — resolve a typed name across TRUSTED contacts' name
// registries. Each verified contact advertises their registry key on their self-
// certifying binding (the same record federated search already resolves); we
// replicate that registry and trust ONLY claims signed by the contact's
// Contacts-held ROOT pubkey (the MITM defense — never a self-asserted owner).
// Deterministic conflict resolution. PURE w.r.t. its injected deps (contacts
// list, binding resolver, registry opener) → Node-testable with stubs or real
// local registries. CommonJS.

const { normalize } = require('./name-normalize.cjs')

const DEFAULT_MAX_CONTACTS = 64

class FederatedNameResolver {
  // deps:
  //   listContacts() -> [{ pubkey (root hex), displayName, verifiedAt, bindingKey }]
  //   resolveBinding({ contactPubkey, dhtPubkey }) -> { nameRegKey } | null
  //   openRegistry(nameRegKeyHex) -> { resolve(name) -> {target, owner, version}|null } | null
  constructor ({ listContacts, resolveBinding, openRegistry, maxContacts, log } = {}) {
    if (typeof listContacts !== 'function') throw new Error('FederatedNameResolver requires listContacts')
    if (typeof resolveBinding !== 'function') throw new Error('FederatedNameResolver requires resolveBinding')
    if (typeof openRegistry !== 'function') throw new Error('FederatedNameResolver requires openRegistry')
    this.listContacts = listContacts
    this.resolveBinding = resolveBinding
    this.openRegistry = openRegistry
    this.maxContacts = Number.isInteger(maxContacts) && maxContacts > 0 ? maxContacts : DEFAULT_MAX_CONTACTS
    this.log = typeof log === 'function' ? log : () => {}
  }

  // Resolve `name` across trusted contacts. Returns { name, key, owner, source,
  // contactPubkey, candidates } or null. `source` = the resolving contact's name;
  // `candidates` = how many trusted contacts claimed it (>1 ⇒ ambiguous).
  async resolve (name) {
    const norm = normalize(name)
    if (!norm) return null
    const contacts = (await this.listContacts()) || []
    const candidates = []
    let scanned = 0
    for (const c of contacts) {
      if (scanned >= this.maxContacts) break
      // fail-closed: only a SIGNATURE-VERIFIED contact (verifiedAt) with an
      // advertised, invite-bound binding pointer (bindingKey) can confer a name —
      // mirrors the federated-search trust frontier. Everyone else is skipped.
      if (!c || !c.verifiedAt || typeof c.pubkey !== 'string' || !c.bindingKey) continue
      scanned++
      let binding = null
      try { binding = await this.resolveBinding({ contactPubkey: c.pubkey, dhtPubkey: c.bindingKey }) } catch { binding = null }
      if (!binding || !binding.nameRegKey) continue
      let reg = null
      try { reg = await this.openRegistry(binding.nameRegKey) } catch { reg = null }
      if (!reg) continue
      let claim = null
      try { claim = await reg.resolve(norm) } catch { claim = null }
      if (!claim || !claim.target) continue
      // MITM defense: trust the claim ONLY if its owner is THIS contact's root
      // (held in Contacts, authenticated by the invite signature). A replicated
      // registry can carry claims by other writers/owners — we ignore those.
      if (claim.owner !== c.pubkey) continue
      candidates.push({ contact: c, claim })
    }
    if (!candidates.length) return null
    // Deterministic, replica-independent conflict resolution: lowest contact
    // pubkey wins. A name can be claimed independently inside each contact's own
    // registry (there is no global namespace), so we surface the source contact +
    // the ambiguity count rather than pretend a name is globally unique.
    candidates.sort((a, b) => (a.contact.pubkey < b.contact.pubkey ? -1 : 1))
    const best = candidates[0]
    return {
      name: norm,
      key: best.claim.target,
      owner: best.claim.owner,
      source: best.contact.displayName || best.contact.pubkey.slice(0, 8),
      contactPubkey: best.contact.pubkey,
      candidates: candidates.length,
    }
  }
}

module.exports = { FederatedNameResolver }
