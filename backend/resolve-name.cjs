// Pure tiered name resolver (naming Phase N1 — Tiers 0 + 3).
//
// Given a typed name and the local trust context, resolve to a target + an
// HONEST provenance label saying which tier answered. Higher tiers WIN: a
// user's own petname beats a curated alias (the user's intent is authoritative).
// No network, no Bare → Node-testable. Tiers 1 (contacts-bound bindings) and 2
// (followed name rooms, verify-then-drop) land in N3/N4 behind this same shape.
const { normalize } = require('./name-normalize.cjs')
const { lookupAlias } = require('./name-aliases.cjs')

/**
 * @param {string} rawName  the word typed in the URL bar
 * @param {object} ctx
 *   @param {object} ctx.petnames  { [normalizedName]: { key?, link?, label? } }
 *                                 the user's own saved aliases (Tier 0)
 *   @param {boolean} ctx.aliases  include the curated bootstrap floor (default true)
 * @returns {null | { name, key, link, label, provenance }}  provenance ∈
 *   'petname' | 'curated' (later: 'contact' | 'room').
 */
function resolveName (rawName, { petnames = {}, aliases = true } = {}) {
  const n = normalize(rawName)
  if (!n) return null

  // Tier 0 — local petname. Highest authority: the user explicitly saved it.
  const pet = petnames[n]
  if (pet && (pet.key || pet.link)) {
    return { name: n, key: pet.key || null, link: pet.link || null, label: pet.label || rawName, provenance: 'petname' }
  }

  // Tier 3 — curated bootstrap floor. Lowest authority; overridden by anything above.
  if (aliases) {
    const a = lookupAlias(n)
    if (a) return { name: n, key: a.key || null, link: a.link || null, label: a.label, provenance: 'curated' }
  }

  return null
}

module.exports = { resolveName }
