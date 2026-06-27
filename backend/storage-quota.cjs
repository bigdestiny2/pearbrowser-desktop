'use strict'

const DEFAULT_STORAGE_LIMIT = 1024 * 1024 * 1024
const DEFAULT_EVICT_THRESHOLD = 0.8
const DEFAULT_EVICT_FRACTION = 0.2
const DEFAULT_STORAGE_SAMPLE_MAX_AGE_MS = 5 * 60 * 1000
const DEFAULT_STORAGE_WALK_YIELD_EVERY = 128
const DEFAULT_STORAGE_WALK_YIELD_MS = 5

function wait (ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms || 0)))
}

function joinPath (base, name) {
  const root = String(base || '')
  const entry = String(name || '')
  if (!root) return entry
  return root.replace(/[\\/]+$/, '') + '/' + entry
}

function normalizeSampleProgress (progress = {}) {
  const files = Number(progress.files)
  const dirs = Number(progress.dirs)
  const entries = Number(progress.entries)
  const bytes = Number(progress.bytes)
  const pendingDirs = Number(progress.pendingDirs)
  const yielded = Number(progress.yielded)
  return {
    mode: String(progress.mode || 'incremental-walk'),
    state: String(progress.state || 'running'),
    files: Number.isFinite(files) && files >= 0 ? files : 0,
    dirs: Number.isFinite(dirs) && dirs >= 0 ? dirs : 0,
    entries: Number.isFinite(entries) && entries >= 0 ? entries : 0,
    bytes: Number.isFinite(bytes) && bytes >= 0 ? bytes : 0,
    pendingDirs: Number.isFinite(pendingDirs) && pendingDirs >= 0 ? pendingDirs : 0,
    yielded: Number.isFinite(yielded) && yielded >= 0 ? yielded : 0,
    lowPriority: progress.lowPriority !== false
  }
}

function normalizeScanResult (result) {
  if (result && typeof result === 'object') {
    const bytes = Number(result.bytes)
    return {
      bytes,
      progress: result.progress && typeof result.progress === 'object'
        ? normalizeSampleProgress({ ...result.progress, bytes })
        : null
    }
  }
  return { bytes: Number(result), progress: null }
}

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

async function walkStorageUsage (dir, opts = {}) {
  const fsLike = opts.fs?.promises || opts.fs || null
  let readdir = opts.readdir || fsLike?.readdir
  let stat = opts.stat || fsLike?.stat
  if (!readdir || !stat) {
    const fs = require('node:fs')
    readdir = fs.promises.readdir
    stat = fs.promises.stat
  }

  const join = typeof opts.join === 'function' ? opts.join : joinPath
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null
  const delay = typeof opts.wait === 'function' ? opts.wait : wait
  const yieldEvery = Number.isFinite(opts.yieldEvery) && opts.yieldEvery > 0
    ? Math.floor(opts.yieldEvery)
    : DEFAULT_STORAGE_WALK_YIELD_EVERY
  const yieldDelayMs = Number.isFinite(opts.yieldDelayMs) && opts.yieldDelayMs >= 0
    ? opts.yieldDelayMs
    : DEFAULT_STORAGE_WALK_YIELD_MS

  const stack = [String(dir || '.')]
  let bytes = 0
  let files = 0
  let dirs = 0
  let entries = 0
  let yielded = 0
  let sinceYield = 0

  const progress = (state = 'running') => normalizeSampleProgress({
    mode: 'incremental-walk',
    state,
    files,
    dirs,
    entries,
    bytes,
    pendingDirs: stack.length,
    yielded,
    lowPriority: true
  })

  const emitProgress = (state) => {
    if (onProgress) onProgress(progress(state))
  }

  emitProgress('running')
  while (stack.length > 0) {
    const current = stack.pop()
    dirs++
    const children = await readdir(current)
    for (const entry of children) {
      const fullPath = join(current, entry)
      const info = await stat(fullPath)
      entries++
      if (info && typeof info.isDirectory === 'function' && info.isDirectory()) {
        stack.push(fullPath)
      } else {
        const size = Number(info && info.size)
        if (Number.isFinite(size) && size > 0) bytes += size
        files++
      }

      sinceYield++
      if (sinceYield >= yieldEvery) {
        yielded++
        sinceYield = 0
        emitProgress('running')
        await delay(yieldDelayMs)
      }
    }
  }
  emitProgress('complete')
  return { bytes, progress: progress('complete') }
}

class StorageUsageSampler {
  constructor (opts = {}) {
    if (typeof opts.scan !== 'function') throw new Error('StorageUsageSampler needs a scan function')
    this.scan = opts.scan
    this.now = typeof opts.now === 'function' ? opts.now : Date.now
    this.maxAgeMs = Number.isFinite(opts.maxAgeMs) && opts.maxAgeMs >= 0
      ? opts.maxAgeMs
      : DEFAULT_STORAGE_SAMPLE_MAX_AGE_MS
    this.bytes = null
    this.sampledAt = null
    this.startedAt = null
    this.error = null
    this.pending = null
    this.sampleProgress = null
  }

  isFresh () {
    if (!Number.isFinite(this.sampledAt)) return false
    return this.now() - this.sampledAt <= this.maxAgeMs
  }

  refresh (opts = {}) {
    if (this.pending) return this.pending
    if (!opts.force && this.isFresh()) return null

    this.startedAt = this.now()
    this.error = null
    this.sampleProgress = normalizeSampleProgress({ state: 'running' })
    this.pending = Promise.resolve()
      .then(() => this.scan({
        onProgress: (progress) => {
          this.sampleProgress = normalizeSampleProgress(progress)
        }
      }))
      .then((result) => {
        const scan = normalizeScanResult(result)
        const n = scan.bytes
        if (!Number.isFinite(n) || n < 0) throw new Error('storage scan returned invalid byte count')
        this.bytes = n
        this.sampledAt = this.now()
        this.error = null
        this.sampleProgress = normalizeSampleProgress({
          ...(scan.progress || this.sampleProgress || {}),
          state: 'complete',
          bytes: n
        })
        return this.bytes
      })
      .catch((err) => {
        this.error = (err && err.message) || String(err)
        this.sampleProgress = normalizeSampleProgress({
          ...(this.sampleProgress || {}),
          state: 'error'
        })
        return null
      })
      .finally(() => {
        this.pending = null
        this.startedAt = null
      })
    return this.pending
  }

  snapshot (opts = {}) {
    if (opts.refresh) this.refresh({ force: !!opts.force })
    const now = this.now()
    return {
      bytes: this.bytes,
      sampledAt: this.sampledAt,
      sampling: !!this.pending,
      sampleStartedAt: this.startedAt,
      sampleAgeMs: Number.isFinite(this.sampledAt) ? Math.max(0, now - this.sampledAt) : null,
      maxAgeMs: this.maxAgeMs,
      fresh: this.isFresh(),
      error: this.error,
      sampleProgress: this.sampleProgress
    }
  }

  async sample (opts = {}) {
    const pending = this.refresh({ force: !!opts.force })
    if (pending) await pending
    return this.snapshot()
  }
}

function createStorageUsageSampler (opts = {}) {
  return new StorageUsageSampler(opts)
}

module.exports = {
  DEFAULT_STORAGE_LIMIT,
  DEFAULT_EVICT_THRESHOLD,
  DEFAULT_EVICT_FRACTION,
  DEFAULT_STORAGE_SAMPLE_MAX_AGE_MS,
  DEFAULT_STORAGE_WALK_YIELD_EVERY,
  DEFAULT_STORAGE_WALK_YIELD_MS,
  shouldCleanupStorage,
  browseDriveEvictionKeys,
  cleanupBrowseStorage,
  walkStorageUsage,
  StorageUsageSampler,
  createStorageUsageSampler
}
