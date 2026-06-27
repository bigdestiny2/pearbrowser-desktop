import test from 'node:test'
import assert from 'node:assert/strict'
import telemetryMod from '../backend/fetch-telemetry.cjs'

const { FetchTelemetry } = telemetryMod

test('fetch telemetry records cache, P2P, relay, and latency totals', () => {
  const telemetry = new FetchTelemetry({ now: () => 1700000000000 })

  telemetry.record({
    source: 'cache',
    cache: 'hit',
    status: 200,
    durationMs: 4,
    bytes: 10,
    contentType: 'text/html',
    path: '/index.html',
    driveKeyHex: 'a'.repeat(64)
  })
  telemetry.record({
    source: 'p2p',
    cache: 'miss',
    status: 200,
    durationMs: 14,
    firstByteMs: 8,
    bytes: 20,
    contentType: 'text/css',
    path: '/style.css'
  })
  telemetry.record({
    source: 'relay',
    cache: 'miss',
    status: 200,
    durationMs: 20,
    bytes: 30,
    relayContacted: true,
    path: '/app.js'
  })

  const snap = telemetry.snapshot()
  assert.equal(snap.total, 3)
  assert.equal(snap.cacheHits, 1)
  assert.equal(snap.cacheMisses, 2)
  assert.equal(snap.errors, 0)
  assert.equal(snap.bytes, 60)
  assert.equal(snap.relayFallbacks, 1)
  assert.equal(snap.sources.cache, 1)
  assert.equal(snap.sources.p2p, 1)
  assert.equal(snap.sources.relay, 1)
  assert.equal(snap.avgMs, 13)
  assert.equal(snap.avgFirstByteMs, 11)
  assert.deepEqual(snap.recent.map((row) => row.path), ['/app.js', '/style.css', '/index.html'])
  assert.equal(snap.recent[2].drive, 'a'.repeat(12))
})

test('fetch telemetry keeps a bounded recent event ring', () => {
  let now = 100
  const telemetry = new FetchTelemetry({ maxEvents: 2, now: () => ++now })

  telemetry.record({ source: 'p2p', path: '/one' })
  telemetry.record({ source: 'p2p', path: '/two' })
  telemetry.record({ source: 'p2p', path: '/three' })

  const snap = telemetry.snapshot()
  assert.equal(snap.total, 3)
  assert.deepEqual(snap.recent.map((row) => row.path), ['/three', '/two'])
  assert.deepEqual(snap.recent.map((row) => row.at), [103, 102])
})

test('fetch telemetry sanitizes bad fields and counts failures', () => {
  const longPath = '/' + 'x'.repeat(220)
  const telemetry = new FetchTelemetry()

  const row = telemetry.record({
    source: 'upstream',
    cache: 'maybe',
    status: 503,
    bytes: -10,
    durationMs: -5,
    path: longPath,
    error: 'boom'.repeat(80)
  })

  const snap = telemetry.snapshot()
  assert.equal(snap.total, 1)
  assert.equal(snap.errors, 1)
  assert.equal(snap.bytes, 0)
  assert.equal(snap.sources.other, 1)
  assert.equal(row.source, 'other')
  assert.equal(row.cache, null)
  assert.equal(row.ok, false)
  assert.equal(row.status, 503)
  assert.equal(row.path.length, 160)
  assert.ok(row.path.endsWith('...'))
  assert.equal(row.error.length, 160)
})
