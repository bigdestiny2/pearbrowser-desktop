const DEFAULT_QUICK_ASK_MAX_TOKENS = 192
const DEFAULT_QUICK_ASK_TEMPERATURE = 0.3
const MAX_QUICK_ASK_QUESTION_CHARS = 2000

/**
 * Pure state/presentation helpers for the chrome-owned QVAC widget.
 *
 * The widget is the blank-tab "Local AI" surface. It talks to the same
 * browser-internal Ask Browser RPC contract as the side panel (capabilities,
 * start, cancel, stream events) but carries no page context: a quick ask is a
 * plain question to a browser-approved local model. Everything here is
 * renderer logic with no I/O so it stays unit-testable like ask-browser.js.
 */

/**
 * Normalize a CMD_ASK_BROWSER_CAPABILITIES response into what the widget
 * renders. Malformed or unavailable responses collapse into a stable
 * `{ available: false, reason }` shape instead of leaking undefined reads.
 */
export function summarizeAiCapabilities (capabilities) {
  const record = isRecord(capabilities) ? capabilities : null
  const models = record && Array.isArray(record.models)
    ? record.models.filter(isRecord).map(normalizeModel).filter(model => model.alias)
    : []
  const loaded = models.filter(model => model.installed)

  if (!record || record.available !== true || models.length === 0) {
    return {
      available: false,
      reason: cleanString(record?.reason) ||
        (record && models.length === 0 && record.available === true ? 'no-models' : '') ||
        (record ? 'runtime-unavailable' : 'no-capabilities'),
      busy: false,
      queueDepth: 0,
      modelCount: models.length,
      loadedCount: 0,
      models
    }
  }

  return {
    available: true,
    reason: '',
    busy: record.busy === true,
    queueDepth: Number.isFinite(record.queueDepth) ? Math.max(0, record.queueDepth) : 0,
    modelCount: models.length,
    loadedCount: loaded.length,
    models
  }
}

/**
 * Choose the widget's default model with the same preference order as the
 * Ask Browser panel: an explicit still-valid choice wins, then a recommended
 * model, then any Ollama-discovered model, then the first approved alias.
 */
export function pickQuickAskModel (models, preferredAlias = '') {
  const list = Array.isArray(models) ? models.filter(isRecord) : []
  const preferred = cleanString(preferredAlias)
  if (preferred && list.some(model => model.alias === preferred)) return preferred
  const chosen = list.find(model => model.recommended === true) ||
    list.find(model => model.provider === 'ollama') ||
    list[0]
  return cleanString(chosen?.alias)
}

/**
 * One-line widget status. Deterministic strings so UI tests can assert on
 * them and the widget never renders raw error objects.
 */
export function describeAiStatus (summary) {
  const state = isRecord(summary) ? summary : summarizeAiCapabilities(null)
  if (!state.available) {
    const reason = cleanString(state.reason)
    return reason ? `Local AI unavailable · ${reason}` : 'Local AI unavailable'
  }

  const count = state.modelCount === 1 ? '1 local model' : `${state.modelCount} local models`
  if (state.busy || state.queueDepth > 0) return `${count} · generating`
  if (state.loadedCount > 0) return `${count} · ready in memory`
  return `${count} · loads on first use`
}

/**
 * Build the CMD_ASK_BROWSER_START payload for a widget quick ask. The widget
 * never captures page context — `page` is empty metadata by contract — and
 * history stays short single-surface turns.
 */
export function buildQuickAskRequest ({ streamId, model, question, history } = {}) {
  const id = cleanString(streamId)
  const alias = cleanString(model)
  const text = cleanString(question).slice(0, MAX_QUICK_ASK_QUESTION_CHARS)
  if (!id) throw new Error('A quick ask requires a stream id')
  if (!alias) throw new Error('A quick ask requires a browser-approved model alias')
  if (!text) throw new Error('A quick ask requires a non-empty question')

  return {
    streamId: id,
    model: alias,
    question: text,
    history: normalizeQuickAskHistory(history),
    page: {},
    maxTokens: DEFAULT_QUICK_ASK_MAX_TOKENS,
    temperature: DEFAULT_QUICK_ASK_TEMPERATURE
  }
}

function normalizeQuickAskHistory (history) {
  if (!Array.isArray(history)) return []
  return history
    .filter(turn => isRecord(turn) && (turn.role === 'user' || turn.role === 'assistant'))
    .map(turn => ({ role: turn.role, content: cleanString(turn.content) }))
    .filter(turn => turn.content)
    .slice(-6)
}

function normalizeModel (model) {
  return {
    alias: cleanString(model.alias),
    label: cleanString(model.label),
    provider: cleanString(model.provider),
    installed: model.installed === true,
    recommended: model.recommended === true,
    expectedSize: Number.isFinite(model.expectedSize) ? model.expectedSize : undefined,
    quantization: cleanString(model.quantization)
  }
}

function cleanString (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord (value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
