import { formatBytes } from './keys.js'

function finiteNumber (value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function diagnosticDuration (ms) {
  const n = finiteNumber(ms)
  if (n === null || n < 0) return '0 ms'
  if (n < 1000) return `${Math.round(n)} ms`
  if (n < 60_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)} s`
  return `${Math.round(n / 60_000)} min`
}

export function storageUsageLabel (status = {}) {
  const used = Number.isFinite(status.storageUsed) ? formatBytes(status.storageUsed) : 'sampling...'
  const limit = Number.isFinite(status.storageLimit) ? formatBytes(status.storageLimit) : '-'
  return `${used} / ${limit}`
}

export function storageUsageDetail (status = {}) {
  if (status.storageSampleError) return `Last storage sample failed: ${status.storageSampleError}`
  if (status.storageSampling && !Number.isFinite(status.storageUsed)) return 'Measuring storage in the background.'
  const age = Number(status.storageSampleAgeMs)
  const sampled = Number.isFinite(age)
    ? (age < 1000 ? 'just now' : age < 60000 ? `${Math.round(age / 1000)}s ago` : `${Math.round(age / 60000)}m ago`)
    : 'not sampled yet'
  return status.storageSampling
    ? `Refreshing in the background; last sampled ${sampled}.`
    : `Last sampled ${sampled}.`
}

export function storageSampleProgressLabel (status = {}) {
  const progress = status && typeof status.storageSampleProgress === 'object'
    ? status.storageSampleProgress
    : null
  if (!progress) return ''

  const files = Number(progress.files)
  const dirs = Number(progress.dirs)
  const entries = Number(progress.entries)
  const bytes = Number(progress.bytes)
  if (![files, dirs, entries, bytes].some(Number.isFinite)) return ''

  const yielded = Number(progress.yielded)
  const state = String(progress.state || 'running')
  const prefix = state === 'complete' ? 'Last low-priority scan' : 'Low-priority scan'
  const pause = Number.isFinite(yielded) && yielded > 0 ? `, ${yielded} pause${yielded === 1 ? '' : 's'}` : ''
  return `${prefix}: ${Number.isFinite(files) ? files : 0} files, ${Number.isFinite(dirs) ? dirs : 0} folders, ${formatBytes(Number.isFinite(bytes) ? bytes : 0)} seen${pause}.`
}

export function fetchTelemetryPercent (part, total) {
  const p = Number(part)
  const t = Number(total)
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return '0%'
  return Math.round((p / t) * 100) + '%'
}

export function bootTimelineRows (timeline = {}, fallbackLog = [], opts = {}) {
  const limit = Math.max(1, Math.min(50, Math.floor(Number(opts.limit) || 10)))
  const events = Array.isArray(timeline?.events) ? timeline.events : []
  if (events.length > 0) {
    return events.slice(-limit).map((event) => ({
      stage: String(event.stage || 'boot'),
      message: String(event.message || ''),
      elapsed: diagnosticDuration(event.elapsedMs),
      delta: event.deltaMs ? `+${diagnosticDuration(event.deltaMs)}` : '',
      state: event.error || /error|unavailable|failed/i.test(event.stage || '') ? 'error' : (event.stage === 'ready' ? 'ready' : ''),
      error: event.error ? String(event.error) : ''
    }))
  }

  return (Array.isArray(fallbackLog) ? fallbackLog : [])
    .slice(-limit)
    .map((line) => ({
      stage: 'event',
      message: String(line || ''),
      elapsed: '',
      delta: '',
      state: '',
      error: ''
    }))
}

export function bootTimelineSummary (timeline = {}) {
  const count = Array.isArray(timeline?.events) ? timeline.events.length : 0
  const latestStage = String(timeline?.latestStage || '')
  return {
    ready: timeline?.ready === true,
    count,
    latestStage: latestStage || 'booting',
    elapsed: diagnosticDuration(timeline?.elapsedMs),
    latestMessage: String(timeline?.latestMessage || '')
  }
}

export function startupBudgetSummary (budget = {}) {
  const elapsed = Number.isFinite(budget?.elapsedMs) ? diagnosticDuration(budget.elapsedMs) : '0 ms'
  const target = Number.isFinite(budget?.budgetMs) ? diagnosticDuration(budget.budgetMs) : '0 ms'
  const over = Number.isFinite(budget?.overBudgetMs) ? budget.overBudgetMs : 0
  return {
    ok: budget?.ok !== false,
    ready: budget?.ready === true,
    elapsed,
    target,
    over: diagnosticDuration(over),
    label: over > 0 ? `${diagnosticDuration(over)} over target` : 'within target'
  }
}

export function startupBudgetRows (budget = {}, opts = {}) {
  const limit = Math.max(1, Math.min(20, Math.floor(Number(opts.limit) || 8)))
  return (Array.isArray(budget?.rows) ? budget.rows : [])
    .slice(0, limit)
    .map((row) => ({
      stage: String(row.stage || ''),
      label: String(row.label || row.stage || ''),
      elapsed: Number.isFinite(row.elapsedMs) ? diagnosticDuration(row.elapsedMs) : 'pending',
      budget: Number.isFinite(row.budgetMs) ? diagnosticDuration(row.budgetMs) : '',
      delta: Number.isFinite(row.deltaMs) ? `+${diagnosticDuration(row.deltaMs)}` : '',
      state: row.ok === false ? 'error' : (row.missing ? '' : 'ready')
    }))
}

export function startupDeferralSummary (audit = {}) {
  const deferred = Number.isFinite(audit?.deferredCount) ? audit.deferredCount : 0
  const active = Number.isFinite(audit?.activeCount) ? audit.activeCount : 0
  return {
    ok: audit?.ok !== false,
    deferred,
    active,
    label: `${deferred} deferred · ${active} active`
  }
}

export function startupDeferralRows (audit = {}, opts = {}) {
  const limit = Math.max(1, Math.min(20, Math.floor(Number(opts.limit) || 10)))
  return (Array.isArray(audit?.rows) ? audit.rows : [])
    .slice(0, limit)
    .map((row) => ({
      key: String(row.key || ''),
      label: String(row.label || row.key || ''),
      state: String(row.state || 'unknown'),
      badge: row.ok === false ? 'danger' : (row.active ? 'self' : 'other'),
      detail: row.deferred ? 'deferred' : (row.active ? 'active' : 'status')
    }))
}
