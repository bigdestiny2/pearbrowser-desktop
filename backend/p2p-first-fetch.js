// P2P-first hybrid fetch (privacy hardening — Privacy-routing PRIV0). The old
// path raced relay HTTP and P2P in parallel, so the relay saw EVERY fetch even
// when P2P could serve it. This tries P2P first and only contacts the relay if
// P2P misses or is slower than a short grace window — so the relay stops seeing
// fetches it never needed to serve, at near-zero latency cost (a fast P2P hit
// returns immediately; a slow/missing one still falls back to the relay).
//
// Pure + injectable so it's Node-testable: the caller passes fetchP2P/fetchRelay
// thunks that resolve to a content object (or null on miss). `relayFirst`
// restores the old parallel race (kill-switch). Returns
// { result, source, relayContacted } — relayContacted lets the caller verify the
// privacy property in tests/telemetry.

async function p2pFirstFetch ({ fetchP2P, fetchRelay, graceMs = 500, relayFirst = false } = {}) {
  // start P2P once; both the grace race and any fallback reuse this one promise
  const p2p = Promise.resolve().then(() => fetchP2P()).catch(() => null)

  // no relay available, or a P2P-only deployment
  if (typeof fetchRelay !== 'function') {
    const r = await p2p
    return { result: r ? { ...r, source: 'p2p' } : null, source: r ? 'p2p' : null, relayContacted: false }
  }

  // kill-switch: old behavior (race both from the start)
  if (relayFirst) return raceBoth(p2p, fetchRelay)

  // P2P-FIRST: race P2P against a short grace timer. If P2P answers first, the
  // relay is never contacted.
  const GRACE = Symbol('grace')
  const winner = await Promise.race([
    p2p.then((r) => (r ? { ...r, source: 'p2p' } : GRACE)),
    new Promise((res) => setTimeout(() => res(GRACE), Math.max(0, graceMs))),
  ])
  if (winner && winner !== GRACE) {
    return { result: winner, source: 'p2p', relayContacted: false }
  }

  // P2P missed or was too slow → contact the relay now, still letting a late P2P
  // result win the fallback race (reliability preserved).
  return raceBoth(p2p, fetchRelay)
}

// Fire both and take the first success; relay IS contacted here.
async function raceBoth (p2p, fetchRelay) {
  const relay = Promise.resolve().then(() => fetchRelay()).catch(() => null)
  const result = await Promise.any([
    p2p.then((r) => (r ? { ...r, source: 'p2p' } : Promise.reject(new Error('p2p miss')))),
    relay.then((r) => (r ? { ...r, source: 'relay' } : Promise.reject(new Error('relay miss')))),
  ]).catch(() => null)
  return { result, source: result ? result.source : null, relayContacted: true }
}

module.exports = { p2pFirstFetch }
