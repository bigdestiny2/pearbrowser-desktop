const HEX64 = /^[0-9a-f]{64}$/i

function num (value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function normalizePinEvidence (input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const keyHex = typeof input.keyHex === 'string' && HEX64.test(input.keyHex)
    ? input.keyHex.toLowerCase()
    : null
  const discoveryKey = typeof input.discoveryKey === 'string' && HEX64.test(input.discoveryKey)
    ? input.discoveryKey.toLowerCase()
    : null
  const kind = typeof input.kind === 'string' && input.kind.trim()
    ? input.kind.trim().slice(0, 80)
    : 'unknown'
  const seedRelays = Array.isArray(input.seedRelays)
    ? input.seedRelays.slice(0, 32).map((relay) => ({
      pubkey: typeof relay?.pubkey === 'string' ? relay.pubkey.slice(0, 128) : null,
      accepted: relay?.accepted !== false
    }))
    : []
  const evidence = {
    kind,
    keyHex,
    discoveryKey,
    state: normalizeAvailabilityState(input.state),
    requestedAt: num(input.requestedAt),
    checkedAt: num(input.checkedAt),
    connectedRelays: Math.max(0, num(input.connectedRelays)),
    seedAcceptances: Math.max(0, num(input.seedAcceptances)),
    seedRelays,
    durable: !!input.durable,
    activePeers: Math.max(0, num(input.activePeers)),
    byteLengthLocal: Math.max(0, num(input.byteLengthLocal)),
    byteLengthRemoteMax: Math.max(0, num(input.byteLengthRemoteMax))
  }
  if (typeof input.error === 'string' && input.error) evidence.error = input.error.slice(0, 240)
  if (!evidence.state) evidence.state = availabilityState(evidence)
  return evidence
}

function normalizeAvailabilityState (state) {
  return state === 'relay-confirmed' || state === 'seeded' || state === 'local-only'
    ? state
    : null
}

function availabilityState (evidence) {
  if (!evidence || typeof evidence !== 'object') return 'local-only'
  if (evidence.durable) return 'relay-confirmed'
  const local = Math.max(0, Number(evidence.byteLengthLocal) || 0)
  const remote = Math.max(0, Number(evidence.byteLengthRemoteMax) || 0)
  if (local > 0 && remote >= local) return 'relay-confirmed'
  if ((Number(evidence.seedAcceptances) || 0) > 0) return 'seeded'
  return 'local-only'
}

function availabilitySummary (evidence) {
  const normalized = normalizePinEvidence(evidence)
  return {
    searchable: true,
    discoverable: !!normalized,
    available: normalized ? normalized.state : 'local-only',
    evidence: normalized
  }
}

module.exports = {
  normalizePinEvidence,
  normalizeAvailabilityState,
  availabilityState,
  availabilitySummary
}
