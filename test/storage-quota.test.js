import test from 'node:test'
import assert from 'node:assert/strict'
import quota from '../backend/storage-quota.cjs'

const {
  DEFAULT_STORAGE_LIMIT,
  DEFAULT_EVICT_THRESHOLD,
  browseDriveEvictionKeys,
  cleanupBrowseStorage,
  shouldCleanupStorage
} = quota

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
