'use strict'

const DEFAULT_STORAGE_LIMIT = 1024 * 1024 * 1024
const DEFAULT_EVICT_THRESHOLD = 0.8
const DEFAULT_EVICT_FRACTION = 0.2

function shouldCleanupStorage (bytes, opts = {}) {
  const limit = Number.isFinite(opts.limit) ? opts.limit : DEFAULT_STORAGE_LIMIT
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : DEFAULT_EVICT_THRESHOLD
  if (!Number.isFinite(bytes) || bytes < 0) return false
  if (!Number.isFinite(limit) || limit <= 0) return false
  return bytes > limit * threshold
}

function browseDriveEvictionKeys (entries, opts = {}) {
  const fraction = Number.isFinite(opts.fraction) ? opts.fraction : DEFAULT_EVICT_FRACTION
  const rows = Array.from(entries || [])
  if (rows.length === 0 || fraction <= 0) return []

  const toRemove = Math.ceil(rows.length * Math.min(fraction, 1))
  return rows
    .sort((a, b) => ((a[1] && a[1].lastAccess) || 0) - ((b[1] && b[1].lastAccess) || 0))
    .slice(0, toRemove)
    .map(([key]) => key)
}

async function cleanupBrowseStorage (opts = {}) {
  const browseDrives = opts.browseDrives instanceof Map ? opts.browseDrives : new Map()
  const evicted = []
  for (const key of browseDriveEvictionKeys(browseDrives, { fraction: opts.fraction })) {
    const entry = browseDrives.get(key)
    if (!entry) continue
    if (typeof opts.onEvict === 'function') opts.onEvict(key, entry)
    browseDrives.delete(key)
    evicted.push(key)
    try {
      if (typeof opts.unregisterDrive === 'function') opts.unregisterDrive(key, entry.drive)
    } catch {}
    try {
      if (typeof opts.leaveDiscovery === 'function') await opts.leaveDiscovery(entry.drive && entry.drive.discoveryKey, entry.drive, entry)
    } catch {}
    try {
      if (entry.drive && typeof entry.drive.close === 'function') await entry.drive.close()
    } catch {}
  }

  let proxyCacheCleared = false
  if (opts.proxy && typeof opts.proxy.clearCache === 'function') {
    opts.proxy.clearCache()
    proxyCacheCleared = true
  }
  return { evicted, proxyCacheCleared }
}

module.exports = {
  DEFAULT_STORAGE_LIMIT,
  DEFAULT_EVICT_THRESHOLD,
  DEFAULT_EVICT_FRACTION,
  shouldCleanupStorage,
  browseDriveEvictionKeys,
  cleanupBrowseStorage
}
