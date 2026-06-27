'use strict'

const MAX_DRIVE_INFO_BATCH = 50

function isValidDriveKey (keyHex) {
  return typeof keyHex === 'string' && /^[0-9a-f]{64}$/i.test(keyHex)
}

function positiveLimit (value, fallback = MAX_DRIVE_INFO_BATCH) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.max(1, Math.min(MAX_DRIVE_INFO_BATCH, Math.floor(n)))
}

function inputLabel (raw) {
  if (raw && typeof raw === 'object') {
    return String(raw.keyHex || raw.key || raw.url || '').trim()
  }
  return String(raw || '').trim()
}

function keyCandidate (raw, driveKeyFromUrl) {
  if (raw && typeof raw === 'object') {
    if (raw.keyHex || raw.key) return raw.keyHex || raw.key
    if (raw.url && typeof driveKeyFromUrl === 'function') return driveKeyFromUrl(raw.url)
    return ''
  }
  return raw
}

function requestInputs (data) {
  if (Array.isArray(data?.keys)) return data.keys
  if (Array.isArray(data?.keyHexes)) return data.keyHexes
  if (Array.isArray(data?.urls)) return data.urls.map((url) => ({ url }))
  if (data && (data.keyHex || data.key || data.url)) return [data]
  return []
}

function normalizeDriveInfoBatch (data = {}, opts = {}) {
  const normalizeDriveKey = typeof opts.normalizeDriveKey === 'function'
    ? opts.normalizeDriveKey
    : (value) => value
  const driveKeyFromUrl = typeof opts.driveKeyFromUrl === 'function'
    ? opts.driveKeyFromUrl
    : null
  const max = positiveLimit(opts.max || data.max)
  const rawInputs = requestInputs(data)
  const items = []
  const seen = new Set()

  for (const raw of rawInputs.slice(0, max)) {
    const input = inputLabel(raw)
    const candidate = keyCandidate(raw, driveKeyFromUrl)
    const keyHex = normalizeDriveKey(String(candidate || '').trim())
    if (!isValidDriveKey(keyHex)) {
      items.push({ input, ok: false, error: 'Invalid drive key format' })
      continue
    }
    const lower = keyHex.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    items.push({ input: input || lower, keyHex: lower })
  }

  return {
    items,
    max,
    requested: rawInputs.length,
    truncated: rawInputs.length > max
  }
}

module.exports = {
  MAX_DRIVE_INFO_BATCH,
  isValidDriveKey,
  normalizeDriveInfoBatch
}
