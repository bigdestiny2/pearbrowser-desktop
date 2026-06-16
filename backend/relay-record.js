/**
 * Relay record resolver (iroh adoption, desktop side).
 *
 * Mirrors the relay's signed self-description codec
 * (p2p-hiverelay: packages/core/core/relay-node/relay-record.js). A relay
 * publishes `pubkey → { gatewayUrl, indexRoom }` as a hyperdht MUTABLE record
 * keyed by its identity key; `dht.mutableGet(pubkey)` VERIFIES the Ed25519
 * signature against that key, so a resolved record is self-certifying — a
 * malicious DHT node can only serve stale data, never forge. This closes the
 * Phase-5 bootstrap loop: a client that knows only a relay's pubkey resolves
 * its current gateway + index room with no hardcoded address and no running
 * index sidecar.
 *
 * Node-safe (b4a only, no bare-http1) so it's unit-testable outside Bare.
 */
const b4a = require('b4a')

const RELAY_RECORD_VERSION = 1
const Z32_KEY_RE = /^[ybndrfg8ejkmcpqxot1uwisza345h769]{52}$/
const HTTP_RE = /^https?:\/\//i

function decodeRelayRecord (buf) {
  if (buf == null) return null
  let rec
  try { rec = JSON.parse(b4a.isBuffer(buf) ? b4a.toString(buf, 'utf8') : String(buf)) } catch { return null }
  if (!rec || typeof rec !== 'object' || rec.v !== RELAY_RECORD_VERSION) return null
  return {
    gatewayUrl: (typeof rec.g === 'string' && HTTP_RE.test(rec.g)) ? rec.g : null,
    indexRoom: (typeof rec.i === 'string' && Z32_KEY_RE.test(rec.i)) ? rec.i : null
  }
}

/**
 * Resolve a relay's record by pubkey over a hyperdht instance. mutableGet
 * verifies the signature, so the result is trustworthy without a directory.
 * @param {object} dht  hyperdht instance (swarm.dht)
 * @param {Buffer|string} publicKey  32-byte Buffer or 64-hex
 */
async function resolveRelayRecord (dht, publicKey) {
  if (!dht || typeof dht.mutableGet !== 'function') return null
  let key
  try { key = typeof publicKey === 'string' ? b4a.from(publicKey, 'hex') : publicKey } catch { return null }
  if (!key || key.length !== 32) return null
  let res
  try { res = await dht.mutableGet(key) } catch { return null }
  if (!res || res.value == null) return null
  return decodeRelayRecord(res.value)
}

/**
 * Resolve a set of bootstrap seeds to a relay list + their index rooms. Each
 * seed is `{ gatewayUrl?, indexRoom?, pubkey? }`: when a pubkey is present it's
 * resolved over the DHT (current + signature-verified) and PREFERRED; the
 * static fields are the fallback when resolution fails or no pubkey is given.
 * So a production seed can be as little as `{ pubkey }` and the gateway + index
 * room resolve themselves.
 *
 * @returns {{ relays: string[], indexRooms: Array<{pubkey, gatewayUrl, indexRoom}> }}
 */
async function resolveBootstrapRelays (dht, seeds = []) {
  const gateways = new Set()
  const indexRooms = []
  for (const seed of Array.isArray(seeds) ? seeds : []) {
    if (!seed || typeof seed !== 'object') continue
    let gatewayUrl = (typeof seed.gatewayUrl === 'string' && HTTP_RE.test(seed.gatewayUrl)) ? seed.gatewayUrl.trim().replace(/\/+$/, '') : null
    let indexRoom = (typeof seed.indexRoom === 'string' && Z32_KEY_RE.test(seed.indexRoom)) ? seed.indexRoom : null
    if (seed.pubkey) {
      const resolved = await resolveRelayRecord(dht, seed.pubkey)
      if (resolved) {
        if (resolved.gatewayUrl) gatewayUrl = resolved.gatewayUrl
        if (resolved.indexRoom) indexRoom = resolved.indexRoom
      }
    }
    if (gatewayUrl) gateways.add(gatewayUrl)
    if (indexRoom) indexRooms.push({ pubkey: seed.pubkey || null, gatewayUrl, indexRoom })
  }
  return { relays: [...gateways], indexRooms }
}

module.exports = { decodeRelayRecord, resolveRelayRecord, resolveBootstrapRelays, RELAY_RECORD_VERSION }
