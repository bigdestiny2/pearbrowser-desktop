import test from 'node:test'
import assert from 'node:assert/strict'
import quota from '../backend/storage-quota.cjs'

const {
  DEFAULT_STORAGE_LIMIT,
  DEFAULT_EVICT_THRESHOLD,
  StorageUsageSampler,
  browseDriveEvictionKeys,
  cleanupBrowseStorage,
  shouldCleanupStorage,
  walkStorageUsage
} = quota

function deferred () {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

test('storage cleanup starts only above the configured threshold', () => {
  const thresholdBytes = DEFAULT_STORAGE_LIMIT * DEFAULT_EVICT_THRESHOLD

  assert.equal(shouldCleanupStorage(thresholdBytes - 1), false)
  assert.equal(shouldCleanupStorage(thresholdBytes), false)
  assert.equal(shouldCleanupStorage(thresholdBytes + 1), true)

  assert.equal(shouldCleanupStorage(81, { limit: 100, threshold: 0.8 }), true)
  assert.equal(shouldCleanupStorage(80, { limit: 100, threshold: 0.8 }), false)
  assert.equal(shouldCleanupStorage(-1, { limit: 100, threshold: 0.8 }), false)
})

test('browse drive eviction chooses the least-recent oldest 20 percent', () => {
  const drives = new Map([
    ['newest', { lastAccess: 500 }],
    ['oldest', { lastAccess: 100 }],
    ['middle', { lastAccess: 300 }],
    ['missing-last-access', {}],
    ['second-oldest', { lastAccess: 200 }]
  ])

  assert.deepEqual(browseDriveEvictionKeys(drives), ['missing-last-access'])
  assert.deepEqual(browseDriveEvictionKeys(drives, { fraction: 0.4 }), ['missing-last-access', 'oldest'])
  assert.deepEqual(browseDriveEvictionKeys(drives, { fraction: 0 }), [])
})

test('browse drive eviction handles empty and single-drive caches', () => {
  assert.deepEqual(browseDriveEvictionKeys(new Map()), [])
  assert.deepEqual(browseDriveEvictionKeys(new Map([['only', { lastAccess: 10 }]])), ['only'])
})

test('cleanupBrowseStorage evicts least-recent drives and clears proxy cache', async () => {
  const events = []
  const drive = (name) => ({
    discoveryKey: `${name}-discovery`,
    async close () { events.push(['close', name]) }
  })
  const browseDrives = new Map([
    ['hot', { lastAccess: 500, drive: drive('hot') }],
    ['cold', { lastAccess: 100, drive: drive('cold') }],
    ['warm', { lastAccess: 300, drive: drive('warm') }],
    ['stale', { lastAccess: 50, drive: drive('stale') }],
    ['fresh', { lastAccess: 700, drive: drive('fresh') }]
  ])

  const result = await cleanupBrowseStorage({
    browseDrives,
    fraction: 0.4,
    proxy: { clearCache: () => events.push(['proxy-clear']) },
    unregisterDrive: (key, drive) => events.push(['unregister', key, drive.discoveryKey]),
    leaveDiscovery: async (discoveryKey) => events.push(['leave', discoveryKey])
  })

  assert.deepEqual(result, { evicted: ['stale', 'cold'], proxyCacheCleared: true })
  assert.deepEqual([...browseDrives.keys()].sort(), ['fresh', 'hot', 'warm'])
  assert.deepEqual(events, [
    ['unregister', 'stale', 'stale-discovery'],
    ['leave', 'stale-discovery'],
    ['close', 'stale'],
    ['unregister', 'cold', 'cold-discovery'],
    ['leave', 'cold-discovery'],
    ['close', 'cold'],
    ['proxy-clear']
  ])
})

test('StorageUsageSampler refreshes in the background and snapshots immediately', async () => {
  let now = 1000
  const scan = deferred()
  const sampler = new StorageUsageSampler({
    scan: () => scan.promise,
    now: () => now,
    maxAgeMs: 5000
  })

  const first = sampler.snapshot({ refresh: true })
  assert.equal(first.bytes, null)
  assert.equal(first.sampling, true)
  assert.equal(first.sampleStartedAt, 1000)

  now = 1250
  scan.resolve(1234)
  await sampler.pending

  const done = sampler.snapshot()
  assert.equal(done.bytes, 1234)
  assert.equal(done.sampledAt, 1250)
  assert.equal(done.sampling, false)
  assert.equal(done.fresh, true)
})

test('walkStorageUsage scans incrementally and yields between chunks', async () => {
  const dirs = new Set(['/root', '/root/a', '/root/b'])
  const children = new Map([
    ['/root', ['one.bin', 'a', 'b']],
    ['/root/a', ['two.bin']],
    ['/root/b', ['three.bin']]
  ])
  const sizes = new Map([
    ['/root/one.bin', 10],
    ['/root/a/two.bin', 20],
    ['/root/b/three.bin', 30]
  ])
  const waits = []
  const progress = []

  const result = await walkStorageUsage('/root', {
    readdir: async (dir) => children.get(dir) || [],
    stat: async (path) => ({
      size: sizes.get(path) || 0,
      isDirectory: () => dirs.has(path)
    }),
    join: (base, name) => `${base}/${name}`,
    yieldEvery: 2,
    yieldDelayMs: 7,
    wait: async (ms) => waits.push(ms),
    onProgress: (row) => progress.push(row)
  })

  assert.equal(result.bytes, 60)
  assert.equal(result.progress.files, 3)
  assert.equal(result.progress.dirs, 3)
  assert.ok(waits.length >= 2)
  assert.ok(waits.every((ms) => ms === 7))
  assert.equal(progress.at(-1).state, 'complete')
  assert.ok(progress.some((row) => row.yielded > 0))
})

test('StorageUsageSampler exposes low-priority sample progress', async () => {
  const sampler = new StorageUsageSampler({
    scan: async ({ onProgress }) => {
      onProgress({ state: 'running', files: 2, dirs: 1, entries: 3, bytes: 64, yielded: 1 })
      return { bytes: 96, progress: { state: 'complete', files: 3, dirs: 1, entries: 4, bytes: 96, yielded: 2 } }
    },
    now: () => 50,
    maxAgeMs: 1000
  })

  await sampler.sample({ force: true })
  const snapshot = sampler.snapshot()
  assert.equal(snapshot.bytes, 96)
  assert.equal(snapshot.sampleProgress.state, 'complete')
  assert.equal(snapshot.sampleProgress.files, 3)
  assert.equal(snapshot.sampleProgress.yielded, 2)
  assert.equal(snapshot.sampleProgress.lowPriority, true)
})

test('StorageUsageSampler reuses fresh samples and refreshes stale ones once', async () => {
  let now = 0
  let scans = 0
  const sampler = new StorageUsageSampler({
    scan: async () => ++scans * 100,
    now: () => now,
    maxAgeMs: 1000
  })

  await sampler.sample({ force: true })
  assert.equal(sampler.snapshot().bytes, 100)

  sampler.snapshot({ refresh: true })
  assert.equal(scans, 1, 'fresh sample should not trigger another scan')

  now = 1001
  const stale = sampler.snapshot({ refresh: true })
  assert.equal(stale.bytes, 100)
  assert.equal(stale.sampling, true)
  const pending = sampler.pending
  sampler.snapshot({ refresh: true })
  assert.equal(sampler.pending, pending, 'pending stale refresh should be shared')
  await sampler.pending
  assert.equal(scans, 2)
  assert.equal(sampler.snapshot().bytes, 200)
})

test('StorageUsageSampler records scan errors without dropping last good sample', async () => {
  let fail = false
  const sampler = new StorageUsageSampler({
    scan: async () => {
      if (fail) throw new Error('walk failed')
      return 42
    },
    now: () => 10,
    maxAgeMs: 0
  })

  await sampler.sample({ force: true })
  assert.equal(sampler.snapshot().bytes, 42)

  fail = true
  await sampler.sample({ force: true })
  const after = sampler.snapshot()
  assert.equal(after.bytes, 42)
  assert.equal(after.error, 'walk failed')
})
