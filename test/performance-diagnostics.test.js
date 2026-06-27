import test from 'node:test'
import assert from 'node:assert/strict'

import perf from '../backend/performance-diagnostics.cjs'
import {
  bootTimelineRows,
  bootTimelineSummary,
  diagnosticDuration,
  fetchTelemetryPercent,
  startupBudgetRows,
  startupBudgetSummary,
  startupDeferralRows,
  startupDeferralSummary,
  storageSampleProgressLabel,
  storageUsageDetail,
  storageUsageLabel
} from '../ui/lib/performance-diagnostics.js'

const { BootTimeline, bootBudgetAudit, startupDeferralAudit } = perf

test('BootTimeline retains bounded timestamped boot progress', () => {
  let now = 1000
  const timeline = new BootTimeline({ maxEvents: 3, now: () => now })
  timeline.reset(1000)

  timeline.record({ stage: 'identity-load', message: 'Loading identity...', at: 1050 })
  timeline.record({ stage: 'corestore-ready', message: 'Storage ready', at: 1250 })
  timeline.record({ stage: 'proxy-ready', message: 'HTTP proxy ready', at: 2200, port: 11337 })
  timeline.record({ stage: 'ready', message: 'Browser ready', at: 2300, port: 11337 })

  const snap = timeline.snapshot({ ready: true, now: 2400 })
  assert.equal(snap.ready, true)
  assert.equal(snap.startedAt, 1000)
  assert.equal(snap.eventCount, 3)
  assert.equal(snap.latestStage, 'ready')
  assert.equal(snap.elapsedMs, 1300)
  assert.deepEqual(snap.events.map((e) => e.stage), ['corestore-ready', 'proxy-ready', 'ready'])
  assert.equal(snap.events[1].deltaMs, 950)
  assert.equal(snap.events[1].port, 11337)
})

test('BootTimeline sanitizes long fields and errors for status snapshots', () => {
  const timeline = new BootTimeline({ now: () => 5000 })
  timeline.record({
    stage: 'x'.repeat(100),
    message: 'message '.repeat(80),
    error: 'stack '.repeat(100)
  })

  const [row] = timeline.snapshot().events
  assert.ok(row.stage.length <= 64)
  assert.ok(row.message.length <= 180)
  assert.ok(row.error.length <= 240)
})

test('performance UI helpers summarize storage, fetch mix, and boot rows', () => {
  assert.equal(diagnosticDuration(1500), '1.5 s')
  assert.equal(fetchTelemetryPercent(2, 4), '50%')
  assert.equal(storageUsageLabel({ storageUsed: 1024, storageLimit: 2048 }), '1.00 KB / 2.00 KB')
  assert.equal(storageUsageDetail({ storageSampling: true }), 'Measuring storage in the background.')
  assert.equal(storageSampleProgressLabel({
    storageSampleProgress: { state: 'running', files: 3, dirs: 2, entries: 5, bytes: 4096, yielded: 1 }
  }), 'Low-priority scan: 3 files, 2 folders, 4.00 KB seen, 1 pause.')

  const timeline = {
    ready: true,
    elapsedMs: 4200,
    latestStage: 'ready',
    latestMessage: 'Browser ready',
    events: [
      { stage: 'identity-load', message: 'Loading identity', elapsedMs: 20, deltaMs: 0 },
      { stage: 'ready', message: 'Browser ready', elapsedMs: 4200, deltaMs: 300 }
    ]
  }
  assert.deepEqual(bootTimelineSummary(timeline), {
    ready: true,
    count: 2,
    latestStage: 'ready',
    elapsed: '4.2 s',
    latestMessage: 'Browser ready'
  })

  const rows = bootTimelineRows(timeline, [], { limit: 1 })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].stage, 'ready')
  assert.equal(rows[0].state, 'ready')
  assert.equal(rows[0].delta, '+300 ms')
})

test('startup budget audit reports manager timing against boot targets', () => {
  const timeline = {
    ready: true,
    elapsedMs: 6500,
    events: [
      { stage: 'identity-load', elapsedMs: 100, deltaMs: 0 },
      { stage: 'corestore-ready', elapsedMs: 900, deltaMs: 800 },
      { stage: 'hyperswarm-ready', elapsedMs: 1400, deltaMs: 500 },
      { stage: 'managers-ready', elapsedMs: 4100, deltaMs: 2700 },
      { stage: 'proxy-ready', elapsedMs: 5600, deltaMs: 1500 },
      { stage: 'ready', elapsedMs: 6500, deltaMs: 900 }
    ]
  }
  const audit = bootBudgetAudit(timeline, { budgetMs: 7000 })
  assert.equal(audit.ok, true)
  assert.equal(audit.overBudgetMs, 0)
  assert.equal(audit.rows.find((row) => row.stage === 'ready').ok, true)

  const over = bootBudgetAudit({ ...timeline, elapsedMs: 9000 }, { budgetMs: 7000 })
  assert.equal(over.ok, false)
  assert.equal(over.overBudgetMs, 2000)

  assert.deepEqual(startupBudgetSummary(audit), {
    ok: true,
    ready: true,
    elapsed: '6.5 s',
    target: '7.0 s',
    over: '0 ms',
    label: 'within target'
  })
  assert.equal(startupBudgetRows(audit).find((row) => row.stage === 'ready').budget, '8.0 s')
})

test('startup deferral audit summarizes rare surfaces without starting them', () => {
  const audit = startupDeferralAudit({
    browserSync: 'idle',
    nostrBindingStore: 'idle',
    federatedNameResolver: 'idle',
    federatedNostrFeed: 'idle',
    appDataIndexer: 'idle',
    appDataReindex: 'idle',
    communityModeration: 'on-demand'
  })
  assert.equal(audit.ok, true)
  assert.equal(audit.deferredCount, 7)
  assert.equal(audit.activeCount, 0)
  assert.deepEqual(startupDeferralSummary(audit), {
    ok: true,
    deferred: 7,
    active: 0,
    label: '7 deferred · 0 active'
  })
  assert.equal(startupDeferralRows(audit).find((row) => row.key === 'communityModeration').state, 'on-demand')

  const bad = startupDeferralAudit({ browserSync: 'booting-hard' })
  assert.equal(bad.ok, false)
  assert.equal(bad.rows.find((row) => row.key === 'browserSync').ok, false)
})

test('bootTimelineRows falls back to transient renderer boot log lines', () => {
  const rows = bootTimelineRows({}, ['[boot] old', '[ready] now'], { limit: 1 })
  assert.deepEqual(rows, [{
    stage: 'event',
    message: '[ready] now',
    elapsed: '',
    delta: '',
    state: '',
    error: ''
  }])
})
