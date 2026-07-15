const DEFAULT_CONTEXT_LIMITS = Object.freeze({
  maxUrlBytes: 2048,
  maxTitleBytes: 512,
  maxTextBytes: 16 * 1024
})

const TERMINAL_STREAM_STATES = new Set(['done', 'cancelled', 'error'])

let fallbackIdSequence = 0

/**
 * Mint a renderer-owned id used to correlate one Ask Browser stream.
 * Browser crypto is preferred, while the monotonic fallback remains useful in
 * runtimes that do not expose Web Crypto during early boot or unit tests.
 */
export function createAskStreamId () {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `ask-${cryptoApi.randomUUID()}`
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const words = new Uint32Array(3)
    cryptoApi.getRandomValues(words)
    return `ask-${[...words].map(word => word.toString(36)).join('-')}`
  }

  fallbackIdSequence = (fallbackIdSequence + 1) >>> 0
  return `ask-${Date.now().toString(36)}-${fallbackIdSequence.toString(36)}`
}

/**
 * Normalize page text returned by an extraction boundary.
 *
 * URL, title, and tab identity always come from trusted renderer state. The
 * response may contribute page text and a source label, but can never relabel
 * that text as belonging to another page. An explicit tab-id mismatch is
 * treated as a stale async response and its text is discarded.
 */
export function normalizePageContextResponse (response, trustedTab, limits = {}) {
  const safeLimits = normalizeContextLimits(limits)
  const tab = isRecord(trustedTab) ? trustedTab : {}
  const result = isRecord(response) ? response : null

  const tabId = cleanString(tab.id)
  const trustedUrl = cleanString(tab.url) || cleanString(tab.displayUrl)
  const trustedTitle = cleanString(tab.title) || trustedUrl || 'Untitled page'
  const url = capUtf8(trustedUrl, safeLimits.maxUrlBytes)
  const title = capUtf8(trustedTitle, safeLimits.maxTitleBytes)

  const responseTabId = result ? cleanString(result.tabId) : ''
  const stale = !!(tabId && responseTabId && tabId !== responseTabId)
  const nestedContext = result && isRecord(result.context) ? result.context : null
  const nestedText = nestedContext
    ? joinContextText(nestedContext.selection, nestedContext.body)
    : ''
  const rawText = result && typeof result.text === 'string' ? result.text : nestedText
  const validText = !stale && !!result && typeof rawText === 'string' && rawText.length > 0
  const text = capUtf8(validText ? rawText : '', safeLimits.maxTextBytes)
  const source = result ? capUtf8(cleanString(result.source), 80).value : ''

  return {
    tabId,
    url: url.value,
    title: title.value,
    text: text.value,
    textBytes: text.bytes,
    available: !!validText,
    stale,
    truncated: !!(validText && (result.truncated === true || result.flags?.truncated === true || text.truncated)),
    source: source || (validText ? 'browser-page' : 'unavailable'),
    provenance: {
      tabId: 'trusted-tab',
      url: 'trusted-tab',
      title: 'trusted-tab',
      text: validText ? 'context-response' : 'none'
    }
  }
}

export function createInitialAskStreamState (streamId = '') {
  const id = cleanString(streamId)
  return {
    streamId: id,
    status: id ? 'starting' : 'idle',
    text: '',
    modelProgress: null,
    stats: null,
    finishReason: null,
    error: null
  }
}

/**
 * Reduce one correlated QVAC event into renderer state.
 *
 * Expected action shape: { streamId, event }. `requestId` is accepted as an
 * alias for streamId so backend push frames can be passed through directly.
 * Events without the active id, events for stale streams, malformed payloads,
 * and events arriving after a terminal state are ignored by identity.
 */
export function reduceAskStreamEvent (state, action) {
  if (!isRecord(state) || !isRecord(action)) return state

  const streamId = cleanString(action.streamId) || cleanString(action.requestId)
  if (!state.streamId || !streamId || streamId !== state.streamId) return state
  if (TERMINAL_STREAM_STATES.has(state.status)) return state

  const event = isRecord(action.event) ? action.event : action
  const type = cleanString(event.type)

  if (type === 'model-progress') {
    const progress = normalizeProgress(event.progress)
    if (!Number.isFinite(progress)) return state
    return {
      ...state,
      status: 'loading-model',
      modelProgress: Math.max(0, Math.min(1, progress)),
      error: null
    }
  }

  if (type === 'text') {
    if (typeof event.delta !== 'string' || event.delta.length === 0) return state
    return {
      ...state,
      status: 'streaming',
      text: state.text + event.delta,
      error: null
    }
  }

  if (type === 'stats') {
    if (!isRecord(event.stats)) return state
    return { ...state, stats: { ...event.stats } }
  }

  if (type === 'done') {
    const finishReason = cleanString(event.finishReason) || 'eos'
    return {
      ...state,
      status: finishReason === 'cancelled' ? 'cancelled' : 'done',
      finishReason,
      error: null
    }
  }

  if (type === 'error') {
    const message = cleanString(event.message) || 'Local AI request failed'
    const code = cleanString(event.code) || 'inference-failed'
    return {
      ...state,
      status: 'error',
      finishReason: 'error',
      error: { code, message }
    }
  }

  return state
}

export function formatModelLabel (alias) {
  const value = cleanString(alias)
  if (!value) return 'Local model'
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(word => {
      if (/^(qvac|qwen|gguf|cpu|gpu)$/i.test(word)) return word.toUpperCase()
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export function formatBytes (bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = -1
  do {
    value /= 1024
    unit++
  } while (value >= 1024 && unit < units.length - 1)

  const digits = value >= 100 ? 0 : (value >= 10 ? 1 : 2)
  return `${Number(value.toFixed(digits))} ${units[unit]}`
}

export function presentAskText (value) {
  let text = typeof value === 'string' ? value : ''
  const lower = text.toLowerCase()
  const open = lower.lastIndexOf('<think>')
  const close = lower.lastIndexOf('</think>')
  if (open > close) text = text.slice(0, open)
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim()
}

function normalizeContextLimits (limits) {
  const source = isRecord(limits) ? limits : {}
  return {
    maxUrlBytes: positiveInteger(source.maxUrlBytes, DEFAULT_CONTEXT_LIMITS.maxUrlBytes),
    maxTitleBytes: positiveInteger(source.maxTitleBytes, DEFAULT_CONTEXT_LIMITS.maxTitleBytes),
    maxTextBytes: positiveInteger(source.maxTextBytes, DEFAULT_CONTEXT_LIMITS.maxTextBytes)
  }
}

function positiveInteger (value, fallback) {
  if (!Number.isFinite(value) || value < 0) return fallback
  return Math.floor(value)
}

function capUtf8 (value, maxBytes) {
  const text = typeof value === 'string' ? value : ''
  let bytes = 0
  let end = 0

  for (const character of text) {
    const size = utf8CodePointBytes(character.codePointAt(0))
    if (bytes + size > maxBytes) break
    bytes += size
    end += character.length
  }

  return {
    value: text.slice(0, end),
    bytes,
    truncated: end < text.length
  }
}

function utf8CodePointBytes (codePoint) {
  if (codePoint <= 0x7f) return 1
  if (codePoint <= 0x7ff) return 2
  if (codePoint <= 0xffff) return 3
  return 4
}

function cleanString (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function joinContextText (selection, body) {
  const selected = cleanString(selection)
  const page = cleanString(body)
  if (selected && page) return `Selected text:\n${selected}\n\nPage text:\n${page}`
  if (selected) return `Selected text:\n${selected}`
  return page
}

function normalizeProgress (progress) {
  if (Number.isFinite(progress)) return progress
  if (!isRecord(progress)) return NaN
  const percentage = Number(progress.percentage)
  if (Number.isFinite(percentage)) return percentage > 1 ? percentage / 100 : percentage
  const completed = Number(progress.completed ?? progress.downloaded)
  const total = Number(progress.total)
  if (Number.isFinite(completed) && Number.isFinite(total) && total > 0) return completed / total
  return NaN
}

function isRecord (value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
