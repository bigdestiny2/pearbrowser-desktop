'use strict'

const DEFAULT_MAX_BOOT_EVENTS = 80
const DEFAULT_BOOT_BUDGET_MS = 8000
const DEFAULT_BOOT_STAGE_BUDGETS = [
  { stage: 'identity-load', label: 'Identity loaded', budgetMs: 1200 },
  { stage: 'corestore-ready', label: 'Storage ready', budgetMs: 2200 },
  { stage: 'hyperswarm-ready', label: 'P2P network ready', budgetMs: 3200 },
  { stage: 'managers-ready', label: 'Core managers ready', budgetMs: 5500 },
  { stage: 'proxy-ready', label: 'Proxy ready', budgetMs: 7000 },
  { stage: 'ready', label: 'Browser ready', budgetMs: DEFAULT_BOOT_BUDGET_MS }
]
const DEFAULT_DEFERRED_SURFACES = [
  { key: 'browserSync', label: 'Encrypted device sync', expected: ['disabled', 'unpaired', 'idle', 'ready'] },
  { key: 'nostrBindingStore', label: 'Nostr identity store', expected: ['idle', 'unavailable', 'ready'] },
  { key: 'federatedNameResolver', label: 'Federated name resolver', expected: ['idle', 'unavailable', 'ready'] },
  { key: 'federatedNostrFeed', label: 'Trusted-contact Nostr feed', expected: ['idle', 'unavailable', 'ready'] },
  { key: 'appDataIndexer', label: 'App-data indexer', expected: ['idle', 'unavailable', 'ready'] },
  { key: 'appDataReindex', label: 'App-data reindex', expected: ['idle', 'running', 'complete', 'error'] },
  { key: 'communityModeration', label: 'Community moderation queue', expected: ['on-demand'] }
]

function finiteNumber (value, fallback = null) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function boundedInt (value, fallback = 0) {
  const n = finiteNumber(value, fallback)
  return Math.max(0, Math.round(n))
}

function boundedText (value, max = 160) {
  const s = String(value || '').replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 3)) + '...'
}

class BootTimeline {
  constructor (opts = {}) {
    this.maxEvents = Math.max(1, Math.min(500, Math.floor(finiteNumber(opts.maxEvents, DEFAULT_MAX_BOOT_EVENTS))))
    this.now = typeof opts.now === 'function' ? opts.now : Date.now
    this.startedAt = null
    this.events = []
  }

  reset (startedAt = this.now()) {
    this.startedAt = boundedInt(startedAt, this.now())
    this.events = []
  }

  record (event = {}) {
    const at = boundedInt(event.at, this.now())
    if (!Number.isFinite(this.startedAt)) this.startedAt = at

    const prev = this.events[this.events.length - 1]
    const elapsedMs = Number.isFinite(Number(event.elapsedMs))
      ? boundedInt(event.elapsedMs)
      : boundedInt(at - this.startedAt)
    const deltaMs = prev ? boundedInt(at - prev.at) : 0
    const row = {
      stage: boundedText(event.stage || 'boot', 64) || 'boot',
      message: boundedText(event.message || '', 180),
      at,
      elapsedMs,
      deltaMs
    }

    if (event.error) row.error = boundedText(event.error, 240)
    if (Number.isFinite(Number(event.port))) row.port = Number(event.port)

    this.events.push(row)
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents)
    }
    return { ...row }
  }

  snapshot (opts = {}) {
    const now = boundedInt(opts.now, this.now())
    const latest = this.events[this.events.length - 1] || null
    const startedAt = Number.isFinite(this.startedAt) ? this.startedAt : null
    const elapsedMs = latest
      ? latest.elapsedMs
      : (startedAt ? boundedInt(now - startedAt) : 0)

    return {
      startedAt,
      elapsedMs,
      latestStage: latest ? latest.stage : '',
      latestMessage: latest ? latest.message : '',
      ready: opts.ready === true || !!(latest && latest.stage === 'ready'),
      eventCount: this.events.length,
      events: this.events.map((row) => ({ ...row }))
    }
  }
}

function bootBudgetAudit (timeline = {}, opts = {}) {
  const budgets = Array.isArray(opts.stageBudgets) ? opts.stageBudgets : DEFAULT_BOOT_STAGE_BUDGETS
  const events = Array.isArray(timeline && timeline.events) ? timeline.events : []
  const byStage = new Map(events.map((event) => [event.stage, event]))
  const rows = budgets.map((budget) => {
    const event = byStage.get(budget.stage) || null
    const elapsedMs = event && Number.isFinite(Number(event.elapsedMs)) ? boundedInt(event.elapsedMs) : null
    const ok = elapsedMs === null ? timeline.ready !== true : elapsedMs <= budget.budgetMs
    return {
      stage: budget.stage,
      label: boundedText(budget.label || budget.stage, 80),
      budgetMs: boundedInt(budget.budgetMs, DEFAULT_BOOT_BUDGET_MS),
      elapsedMs,
      deltaMs: event && Number.isFinite(Number(event.deltaMs)) ? boundedInt(event.deltaMs) : null,
      ok,
      missing: !event
    }
  })
  const elapsedMs = Number.isFinite(Number(timeline.elapsedMs)) ? boundedInt(timeline.elapsedMs) : null
  const budgetMs = boundedInt(opts.budgetMs, DEFAULT_BOOT_BUDGET_MS)
  const ready = timeline.ready === true
  const overBudgetMs = elapsedMs !== null ? Math.max(0, elapsedMs - budgetMs) : 0
  return {
    ok: rows.every((row) => row.ok) && overBudgetMs === 0,
    ready,
    elapsedMs,
    budgetMs,
    overBudgetMs,
    rows
  }
}

function startupDeferralAudit (lazy = {}, opts = {}) {
  const surfaces = Array.isArray(opts.surfaces) ? opts.surfaces : DEFAULT_DEFERRED_SURFACES
  const rows = surfaces.map((surface) => {
    const raw = lazy && Object.prototype.hasOwnProperty.call(lazy, surface.key) ? lazy[surface.key] : 'unknown'
    const state = boundedText(raw || 'unknown', 40)
    const expected = Array.isArray(surface.expected) ? surface.expected : []
    const ok = expected.length === 0 || expected.includes(state)
    const deferred = state === 'idle' || state === 'disabled' || state === 'unpaired' || state === 'on-demand' || state === 'unavailable'
    const active = state === 'ready' || state === 'opening' || state === 'running'
    return {
      key: surface.key,
      label: boundedText(surface.label || surface.key, 80),
      state,
      ok,
      deferred,
      active
    }
  })
  return {
    ok: rows.every((row) => row.ok),
    deferredCount: rows.filter((row) => row.deferred).length,
    activeCount: rows.filter((row) => row.active).length,
    rows,
    appDataReindexReason: lazy.appDataReindexReason || null,
    appDataReindexSummary: lazy.appDataReindexSummary || null,
    appDataReindexError: lazy.appDataReindexError || null
  }
}

module.exports = {
  DEFAULT_MAX_BOOT_EVENTS,
  DEFAULT_BOOT_BUDGET_MS,
  DEFAULT_BOOT_STAGE_BUDGETS,
  DEFAULT_DEFERRED_SURFACES,
  BootTimeline,
  bootBudgetAudit,
  startupDeferralAudit
}
