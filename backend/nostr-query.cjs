// NOSTR2 (Phase 2) — a NIP-01 REQ filter over a materialized event list. PURE,
// CommonJS, Node-testable. Filter semantics per NIP-01: fields are AND'd; within
// a list field (ids/authors/kinds, and #<tag> values) it's OR. created_at gates
// since/until and orders the result (newest-first) — this is DISPLAY ordering,
// never consensus (the store's reducer is wall-clock-free).

// A single-letter tag filter key like "#e" / "#p" matches an event that has a
// tag [<letter>, <value>, ...] whose value is in the filter's list.
function matchesFilter (ev, f) {
  if (!ev || typeof ev !== 'object') return false
  if (!f) return true
  if (Array.isArray(f.ids) && !f.ids.includes(ev.id)) return false
  if (Array.isArray(f.authors) && !f.authors.includes(ev.pubkey)) return false
  if (Array.isArray(f.kinds) && !f.kinds.includes(ev.kind)) return false
  if (Number.isFinite(f.since) && ev.created_at < f.since) return false
  if (Number.isFinite(f.until) && ev.created_at > f.until) return false
  for (const k of Object.keys(f)) {
    if (k.length !== 2 || k[0] !== '#') continue // #e, #p, #<single-letter> only
    const want = f[k]
    if (!Array.isArray(want)) continue
    const tagName = k[1]
    const has = (ev.tags || []).some((t) => Array.isArray(t) && t[0] === tagName && want.includes(t[1]))
    if (!has) return false
  }
  return true
}

// Filter + sort newest-first (created_at desc, id tiebreak for determinism) + cap.
function queryEvents (events, filter = {}) {
  const out = (events || []).filter((ev) => matchesFilter(ev, filter))
  out.sort((a, b) => (b.created_at - a.created_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const limit = Number.isInteger(filter.limit) && filter.limit >= 0 ? filter.limit : out.length
  return out.slice(0, limit)
}

module.exports = { matchesFilter, queryEvents }
