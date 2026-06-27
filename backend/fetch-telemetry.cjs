'use strict'

const DEFAULT_MAX_EVENTS = 60
const SOURCES = ['cache', 'p2p', 'relay', 'directory', 'error', 'miss', 'other']

function finiteNumber (value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function cleanSource (source) {
  const s = String(source || '').toLowerCase()
  return SOURCES.includes(s) ? s : 'other'
}

function cleanPath (value) {
  const s = String(value || '')
  return s.length > 160 ? s.slice(0, 157) + '...' : s
}

class FetchTelemetry {
  constructor (opts = {}) {
    this.maxEvents = Math.max(1, Math.min(500, Math.floor(finiteNumber(opts.maxEvents, DEFAULT_MAX_EVENTS))))
    this.now = typeof opts.now === 'function' ? opts.now : Date.now
    this.reset()
  }

  reset () {
    this.total = 0
    this.cacheHits = 0
    this.cacheMisses = 0
    this.errors = 0
    this.bytes = 0
    this.relayFallbacks = 0
    this.durationMs = 0
    this.firstByteMs = 0
    this.sourceCounts = Object.fromEntries(SOURCES.map((source) => [source, 0]))
    this.recent = []
  }

  record (event = {}) {
    const source = cleanSource(event.source)
    const cache = event.cache === 'hit' ? 'hit' : (event.cache === 'miss' ? 'miss' : null)
    const status = Number.isFinite(Number(event.status)) ? Number(event.status) : null
    const bytes = finiteNumber(event.bytes)
    const durationMs = finiteNumber(event.durationMs)
    const firstByteMs = finiteNumber(event.firstByteMs, durationMs)
    const ok = event.ok === false || source === 'error' || (status !== null && status >= 400) ? false : true

    this.total++
    this.sourceCounts[source] = (this.sourceCounts[source] || 0) + 1
    if (cache === 'hit') this.cacheHits++
    if (cache === 'miss') this.cacheMisses++
    if (!ok) this.errors++
    if (event.relayContacted) this.relayFallbacks++
    this.bytes += bytes
    this.durationMs += durationMs
    this.firstByteMs += firstByteMs

    const row = {
      at: Number.isFinite(Number(event.at)) ? Number(event.at) : this.now(),
      source,
      cache,
      ok,
      status,
      durationMs,
      firstByteMs,
      bytes,
      contentType: String(event.contentType || ''),
      path: cleanPath(event.path),
      drive: typeof event.driveKeyHex === 'string' ? event.driveKeyHex.slice(0, 12) : '',
      relayContacted: !!event.relayContacted
    }
    if (event.error) row.error = String(event.error).slice(0, 160)

    this.recent.unshift(row)
    if (this.recent.length > this.maxEvents) this.recent.length = this.maxEvents
    return row
  }

  snapshot () {
    return {
      total: this.total,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      errors: this.errors,
      bytes: this.bytes,
      relayFallbacks: this.relayFallbacks,
      sources: { ...this.sourceCounts },
      avgMs: this.total ? Math.round(this.durationMs / this.total) : 0,
      avgFirstByteMs: this.total ? Math.round(this.firstByteMs / this.total) : 0,
      recent: this.recent.map((row) => ({ ...row }))
    }
  }
}

module.exports = {
  DEFAULT_MAX_EVENTS,
  FetchTelemetry
}
