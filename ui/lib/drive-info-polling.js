export const MAX_VIEWPORT_DRIVE_INFO_KEYS = 50

function normalizeDriveInfoKey (key) {
  const s = String(key || '').trim().toLowerCase()
  return /^[0-9a-f]{64}$/.test(s) ? s : ''
}

export function selectDriveInfoKeysForPolling ({
  allKeys = [],
  visibleKeys = [],
  detailKey = '',
  viewportAware = false,
  max = MAX_VIEWPORT_DRIVE_INFO_KEYS
} = {}) {
  const limit = Math.max(1, Math.min(MAX_VIEWPORT_DRIVE_INFO_KEYS, Math.floor(Number(max) || MAX_VIEWPORT_DRIVE_INFO_KEYS)))
  const all = allKeys.map(normalizeDriveInfoKey).filter(Boolean)
  const allowed = new Set(all)
  const source = viewportAware
    ? visibleKeys.filter((key) => allowed.has(normalizeDriveInfoKey(key)))
    : all
  const selected = []
  const seen = new Set()
  const add = (key) => {
    if (selected.length >= limit) return
    const normalized = normalizeDriveInfoKey(key)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    selected.push(normalized)
  }

  add(detailKey)
  for (const key of source) add(key)
  return selected
}
