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

import { driveKeyFromHyperRef } from './keys.js'

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

export function normalizeDefaultTab (entry) {
  if (typeof entry === 'string') return { url: cleanTabUrl(entry), title: '' }
  if (!entry || typeof entry !== 'object') return { url: '', title: '' }
  return {
    url: cleanTabUrl(entry.url),
    title: cleanTabTitle(entry.title, '')
  }
}

export function restoreStartupTabs (savedTabs, defaultUrls = []) {
  const tabs = []
  const seenUrls = new Set()
  const add = (tab) => {
    if (!tab) return
    const key = cleanTabUrl(tab.url || tab.displayUrl)
    if (key && seenUrls.has(key)) return
    if (key) seenUrls.add(key)
    tabs.push(tab)
  }

  for (const entry of defaultUrls) {
    const { url, title } = normalizeDefaultTab(entry)
    if (url) add(makeTab(url, title ? { title } : {}))
  }

  const restoredPairs = Array.isArray(savedTabs)
    ? savedTabs
      .map((saved) => ({ saved, tab: restoreSavedTab(saved) }))
      .filter((entry) => entry.tab && (entry.tab.url || entry.tab.displayUrl))
    : []
  for (const entry of restoredPairs) add(entry.tab)

  if (tabs.length === 0 && restoredPairs.length > 0) {
    for (const entry of restoredPairs) add(entry.tab)
  }

  return {
    tabs,
    activeId: tabs[0]?.id || ''
  }
}

export function sortTabsPinnedFirst (list) {
  return [
    ...list.filter((tab) => tab.pinned),
    ...list.filter((tab) => !tab.pinned)
  ]
}

export function driveKeyFromTabAddress (value) {
  const clean = cleanTabUrl(value)
  if (!clean) return ''
  const hyperDrive = driveKeyFromHyperRef(clean)
  if (hyperDrive) return hyperDrive
  try {
    const parsed = new URL(clean)
    if (parsed.protocol !== 'http:' || (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost')) return ''
    const match = parsed.pathname.match(/^\/(?:hyper|app)\/([0-9a-f]{64})(?:\/|$)/i)
    return match ? match[1].toLowerCase() : ''
  } catch {
    return ''
  }
}

export function tabDriveKey (tab) {
  if (!tab || typeof tab !== 'object') return ''
  return driveKeyFromTabAddress(tab.url) ||
    driveKeyFromTabAddress(tab.displayUrl) ||
    driveKeyFromTabAddress(tab.src)
}

export function tabListUsesDriveKey (tabs, driveKeyHex) {
  const key = typeof driveKeyHex === 'string' ? driveKeyHex.toLowerCase() : ''
  if (!/^[0-9a-f]{64}$/.test(key) || !Array.isArray(tabs)) return false
  return tabs.some((tab) => tabDriveKey(tab) === key)
}

export function makeTab (initialUrl = '', opts = {}) {
  const history = Array.isArray(opts.history) ? normalizeTabHistory(opts.history, initialUrl) : []
  const histIdx = clampHistoryIndex(history, opts.histIdx)
  const historyUrl = histIdx >= 0 ? history[histIdx] : ''
  const url = cleanTabUrl(historyUrl || initialUrl)
  const kind = opts.kind === 'clearnet' || opts.kind === 'hyper' || opts.kind === 'loopback'
    ? opts.kind
    : (url && /^https?:\/\//i.test(url) && !/^https?:\/\/(?:127\.0\.0\.1|localhost)\b/i.test(url)
      ? 'clearnet'
      : 'hyper')
  return {
    id: makeTabId(),
    url,
    displayUrl: cleanTabUrl(opts.displayUrl) || url,
    src: null,
    history,
    histIdx,
    status: '',
    title: cleanTabTitle(opts.title),
    pinned: !!opts.pinned,
    kind,
    clearnetMode: opts.clearnetMode || null
  }
}
