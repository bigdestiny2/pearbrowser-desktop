/**
 * Pure relay-directory merge — node-safe (no bare-http1), so it's unit-testable
 * outside Bare. RelayClient.listRelays() does the HTTP fetch, then hands the
 * rows here to fold into its relay set.
 *
 * The current relays (incl. the seed) are always kept so a client never strands
 * itself on a bad directory. When a verifier is supplied, a discovered relay is
 * adopted only if its row's signed capability `doc` verifies — the room is an
 * index, not an authority (design Risk #5).
 */
function isHttpUrl (s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s.trim())
}
function cleanUrl (s) {
  return s.trim().replace(/\/+$/, '')
}

/**
 * @param {Array<{gatewayUrl?:string, doc?:object}>} rows  relay-directory rows
 * @param {string[]} current  the client's current relay list (kept)
 * @param {((doc:object)=>boolean)|null} verify  capability-doc verifier (optional)
 * @returns {{ relays: string[], discovered: number, verified: number }}
 */
function mergeRelayDirectory (rows, current = [], verify = null) {
  const gateways = new Set()
  for (const u of Array.isArray(current) ? current : []) {
    if (isHttpUrl(u)) gateways.add(cleanUrl(u))
  }
  const list = Array.isArray(rows) ? rows : []
  let verified = 0
  for (const row of list) {
    const gw = row && row.gatewayUrl
    if (!isHttpUrl(gw)) continue
    if (typeof verify === 'function') {
      let ok = false
      try { ok = !!(row.doc && verify(row.doc)) } catch { ok = false }
      if (!ok) continue // never trust the index writer — drop unverifiable rows
      verified++
    }
    gateways.add(cleanUrl(gw))
  }
  return { relays: [...gateways], discovered: list.length, verified }
}

module.exports = { mergeRelayDirectory, isHttpUrl, cleanUrl }
