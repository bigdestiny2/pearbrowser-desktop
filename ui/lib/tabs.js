// Tab model + per-tab history/session helpers for the Browse view.
//
// All functions here are pure (except makeTab/makeTabId, which mint an id
// from a counter + timestamp) and framework-free so the session-restore
// logic can be unit-tested under plain node (see test/tabs.test.js).
//
// A persisted tab snapshot looks like:
//   { url, displayUrl, title, history: [url...], histIdx, pinned, active? }
// History is de-duplicated (no consecutive repeats) and capped at
// MAX_TAB_HISTORY; the closed-tab stack is capped at MAX_CLOSED_TABS.

export const MAX_TAB_HISTORY = 50
export const MAX_CLOSED_TABS = 20

let _tabIdSeq = 0
export function makeTabId () { _tabIdSeq += 1; return 'tab-' + _tabIdSeq + '-' + Date.now().toString(36) }

export function cleanTabUrl (value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function cleanTabTitle (value, fallback = 'New tab') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export function normalizeTabHistory (history, fallbackUrl = '') {
  const out = []
  if (Array.isArray(history)) {
    for (const entry of history) {
      const url = cleanTabUrl(entry)
      if (!url) continue
      if (out[out.length - 1] !== url) out.push(url)
    }
  }
  const fallback = cleanTabUrl(fallbackUrl)
  if (out.length === 0 && fallback) out.push(fallback)
  return out.slice(-MAX_TAB_HISTORY)
}

export function clampHistoryIndex (history, histIdx) {
  if (!Array.isArray(history) || history.length === 0) return -1
  const idx = Number.isInteger(histIdx) ? histIdx : history.length - 1
  return Math.max(0, Math.min(idx, history.length - 1))
}

export function pushTabHistory (history, histIdx, targetUrl) {
  const target = cleanTabUrl(targetUrl)
  const base = normalizeTabHistory(history)
  const idx = clampHistoryIndex(base, histIdx)
  const next = idx >= 0 ? base.slice(0, idx + 1) : []
  if (target && next[next.length - 1] !== target) next.push(target)
  const offset = Math.max(0, next.length - MAX_TAB_HISTORY)
  const trimmed = next.slice(offset)
  return { history: trimmed, histIdx: trimmed.length ? trimmed.length - 1 : -1 }
}

export function normalizeTabSnapshot (source) {
  if (!source || typeof source !== 'object') return null
  const url = cleanTabUrl(source.url)
  let history = normalizeTabHistory(source.history, url)
  let histIdx = clampHistoryIndex(history, source.histIdx)
  if (url && (histIdx < 0 || history[histIdx] !== url)) {
    const pushed = pushTabHistory(history, histIdx, url)
    history = pushed.history
    histIdx = pushed.histIdx
  }
  const activeUrl = histIdx >= 0 ? history[histIdx] : url
  const displayUrl = cleanTabUrl(source.displayUrl) || activeUrl || url
  if (!activeUrl && !displayUrl && history.length === 0) return null
  return {
    url: activeUrl || url,
    displayUrl,
    title: cleanTabTitle(source.title, activeUrl || 'New tab'),
    history,
    histIdx,
    pinned: !!source.pinned
  }
}

export function serializeTab (tab, activeId) {
  const snap = normalizeTabSnapshot(tab) || {
    url: '',
    displayUrl: '',
    title: cleanTabTitle(tab?.title),
    history: [],
    histIdx: -1,
    pinned: !!tab?.pinned
  }
  return { ...snap, active: tab?.id === activeId }
}

export function restoreSavedTab (source) {
  if (!source || typeof source !== 'object') return null
  const snap = normalizeTabSnapshot(source) || {
    url: '',
    displayUrl: '',
    title: cleanTabTitle(source.title),
    history: [],
    histIdx: -1,
    pinned: !!source.pinned
  }
  return makeTab(snap.url, snap)
}

export function sortTabsPinnedFirst (list) {
  return [
    ...list.filter((tab) => tab.pinned),
    ...list.filter((tab) => !tab.pinned)
  ]
}

export function makeTab (initialUrl = '', opts = {}) {
  const history = Array.isArray(opts.history) ? normalizeTabHistory(opts.history, initialUrl) : []
  const histIdx = clampHistoryIndex(history, opts.histIdx)
  const historyUrl = histIdx >= 0 ? history[histIdx] : ''
  const url = cleanTabUrl(historyUrl || initialUrl)
  return {
    id: makeTabId(),
    url,
    displayUrl: cleanTabUrl(opts.displayUrl) || url,
    src: null,
    history,
    histIdx,
    status: '',
    title: cleanTabTitle(opts.title),
    pinned: !!opts.pinned
  }
}
