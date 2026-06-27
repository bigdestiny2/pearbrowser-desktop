import { useEffect, useMemo, useRef, useState } from 'react'
import { html } from 'htm/react'
import { AddToCatalogButton, useMyCatalogWriter } from './catalog-actions.js'
import { catalogEntryFromUrl } from '../lib/catalog-provenance.js'
import { formatBytes, hexFromZ32, looksLikeName, normalizeUrl, parsePearname, z32FromHex } from '../lib/keys.js'
import {
  MAX_CLOSED_TABS,
  clampHistoryIndex,
  makeTab,
  normalizeTabSnapshot,
  pushTabHistory,
  restoreSavedTab,
  sortTabsPinnedFirst
} from '../lib/tabs.js'

function parseDriveAddress (urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null
  let u
  try { u = new URL(urlStr) } catch { return null }
  const proto = u.protocol.replace(':', '')
  if (proto !== 'hyper' && proto !== 'pear') return null
  const raw = u.hostname || u.pathname.split('/')[0] || ''
  if (!raw) return null
  let hex = null, z32Form = null
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    hex = raw.toLowerCase()
    z32Form = z32FromHex(hex)
  } else if (/^[13-9a-km-uw-z]{52}$/i.test(raw)) {
    z32Form = raw.toLowerCase()
    hex = hexFromZ32(z32Form)
  }
  return { proto, raw, hex, z32: z32Form, path: u.pathname || '/', urlStr }
}

function aboutCount (n, singular, plural = singular + 's') {
  const value = Number.isFinite(n) ? n : 0
  return `${value} ${value === 1 ? singular : plural}`
}

function aboutPinStatus (info, err) {
  if (err) return { tone: 'warn', text: `Live metadata unavailable: ${err}` }
  if (!info) return { tone: 'pending', text: 'Checking live drive metadata…' }

  const relay = info.relay || {}
  if (!relay.available) {
    return { tone: 'warn', text: 'HiveRelay client is unavailable; using pure P2P discovery.' }
  }
  if (relay.advertisedRelays > 0) {
    return {
      tone: 'ok',
      text: `Pinned: advertised by ${aboutCount(relay.advertisedRelays, 'relay')}.`
    }
  }
  if (relay.seedAcceptances > 0 && relay.durable) {
    return {
      tone: 'ok',
      text: `Pinned by this client: ${aboutCount(relay.seedAcceptances, 'relay')} accepted and ${aboutCount(relay.activePeers, 'peer')} is replicating.`
    }
  }
  if (relay.seedAcceptances > 0) {
    return {
      tone: 'warn',
      text: `${aboutCount(relay.seedAcceptances, 'relay')} accepted the pin request; waiting for a live replication peer.`
    }
  }
  if (relay.connectedRelays > 0) {
    return {
      tone: 'neutral',
      text: `No pin signal for this drive from ${aboutCount(relay.connectedRelays, 'connected relay')}.`
    }
  }
  return { tone: 'warn', text: 'No HiveRelay connections yet; discovery is currently pure P2P.' }
}

function AboutSite ({ rpc, C, url, title, onClose, onBookmarkToggle }) {
  const drive = parseDriveAddress(url)
  const driveKey = drive?.hex || ''
  const [bookmarked, setBookmarked] = useState(null)
  const [driveInfo, setDriveInfo] = useState(null)
  const [driveInfoErr, setDriveInfoErr] = useState('')
  const [busy, setBusy] = useState(null)
  const [copyState, setCopyState] = useState({})
  const catalogActions = useMyCatalogWriter(rpc, C)

  useEffect(() => {
    if (!url) return
    rpc.request(C.CMD_USERDATA_LIST_BOOKMARKS).then((res) => {
      const list = (res?.bookmarks) || []
      setBookmarked(list.some((b) => b && b.url === url))
    }).catch(() => setBookmarked(false))
  }, [url, rpc, C])

  useEffect(() => {
    if (!driveKey) {
      setDriveInfo(null)
      setDriveInfoErr('')
      return
    }

    let cancelled = false
    setDriveInfo(null)
    setDriveInfoErr('')

    const load = async () => {
      try {
        const res = await rpc.request(C.CMD_GET_DRIVE_INFO, { keyHex: driveKey }, 10000)
        if (!cancelled) {
          setDriveInfo(res)
          setDriveInfoErr('')
        }
      } catch (err) {
        if (!cancelled) setDriveInfoErr(err.message || 'unknown error')
      }
    }

    load()
    const timer = setInterval(load, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [driveKey, rpc, C])

  const copy = (key, text) => {
    try {
      navigator.clipboard?.writeText(text)
      setCopyState({ ...copyState, [key]: true })
      setTimeout(() => setCopyState((p) => ({ ...p, [key]: false })), 1500)
    } catch {}
  }

  const toggleBookmark = async () => {
    if (busy) return
    setBusy('bookmark')
    try {
      if (bookmarked) {
        await rpc.request(C.CMD_USERDATA_REMOVE_BOOKMARK, { url })
        setBookmarked(false)
      } else {
        await rpc.request(C.CMD_USERDATA_ADD_BOOKMARK, { url, title: url })
        setBookmarked(true)
      }
      onBookmarkToggle?.()
    } catch {}
    finally { setBusy(null) }
  }

  const pin = aboutPinStatus(driveInfo, driveInfoErr)
  const updatedAt = Number(driveInfo?.updatedAt)
  const updatedText = Number.isFinite(updatedAt) && updatedAt > 0
    ? new Date(updatedAt).toLocaleTimeString()
    : ''
  const catalogApp = catalogEntryFromUrl(url, {
    driveKey,
    title: title && title !== url ? title : '',
    source: 'browser',
    catalogName: 'About this site',
    fallbackReason: 'Saved from the browser About panel.'
  })

  return html`
    <div className="modal-overlay" role="dialog" aria-modal="true"
         onClick=${(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-card about-card">
        <div className="about-head">
          <div className="about-title">About this site</div>
          <button className="about-close" onClick=${onClose} title="Close">×</button>
        </div>

        <div className="about-section-label">FULL URL</div>
        <div className="about-row">
          <code className="about-mono">${url || '(no URL loaded)'}</code>
          <button className="copy-btn-small ${copyState.url ? 'copied' : ''}"
                  onClick=${() => copy('url', url)} disabled=${!url}>
            ${copyState.url ? '✓' : 'Copy'}
          </button>
        </div>

        ${drive && drive.hex && html`
          <div className="about-section-label">DRIVE KEY (hex)</div>
          <div className="about-row">
            <code className="about-mono">${drive.hex}</code>
            <button className="copy-btn-small ${copyState.hex ? 'copied' : ''}"
                    onClick=${() => copy('hex', drive.hex)}>
              ${copyState.hex ? '✓' : 'Copy'}
            </button>
          </div>
        `}

        ${drive && drive.z32 && html`
          <div className="about-section-label">DRIVE KEY (z-base-32)</div>
          <div className="about-row">
            <code className="about-mono">${drive.z32}</code>
            <button className="copy-btn-small ${copyState.z32 ? 'copied' : ''}"
                    onClick=${() => copy('z32', drive.z32)}>
              ${copyState.z32 ? '✓' : 'Copy'}
            </button>
          </div>
        `}

        ${drive && html`
          <div className="about-meta-grid">
            <div>
              <div className="about-meta-label">Scheme</div>
              <div className="about-meta-value">${drive.proto}://</div>
            </div>
            <div>
              <div className="about-meta-label">Path</div>
              <div className="about-meta-value">${drive.path}</div>
            </div>
          </div>
        `}

        ${drive && drive.hex && html`
          <div className="about-section-label">LIVE DRIVE</div>
          <div className="about-meta-grid about-live-grid">
            <div>
              <div className="about-meta-label">Version</div>
              <div className="about-meta-value">${driveInfo ? (driveInfo.version ?? '—') : '…'}</div>
            </div>
            <div>
              <div className="about-meta-label">Peers</div>
              <div className="about-meta-value" title=${driveInfo ? `${driveInfo.metadataPeerCount || 0} metadata · ${driveInfo.blobPeerCount || 0} blob` : ''}>
                ${driveInfo ? (driveInfo.peerCount || 0) : '…'}
              </div>
            </div>
            <div>
              <div className="about-meta-label">Relays</div>
              <div className="about-meta-value">${driveInfo ? (driveInfo.relay?.connectedRelays || 0) : '…'}</div>
            </div>
            <div>
              <div className="about-meta-label">Cached</div>
              <div className="about-meta-value">${driveInfo ? formatBytes(driveInfo.byteLength) : '…'}</div>
            </div>
            <div>
              <div className="about-meta-label">Mode</div>
              <div className="about-meta-value">${driveInfo ? (driveInfo.writable ? 'writable' : 'read-only') : '…'}</div>
            </div>
            <div>
              <div className="about-meta-label">Fetch</div>
              <div className="about-meta-value">${driveInfo ? (driveInfo.relay?.hybridFetchEnabled ? 'hybrid' : 'P2P') : '…'}</div>
            </div>
          </div>
          <div className=${'about-pin-status ' + pin.tone}>${pin.text}</div>
        `}

        ${driveInfo && driveInfo.discoveryKey && html`
          <div className="about-section-label">DISCOVERY KEY</div>
          <div className="about-row">
            <code className="about-mono">${driveInfo.discoveryKey}</code>
            <button className="copy-btn-small ${copyState.discovery ? 'copied' : ''}"
                    onClick=${() => copy('discovery', driveInfo.discoveryKey)}>
              ${copyState.discovery ? '✓' : 'Copy'}
            </button>
          </div>
        `}

        <div className="about-section-label">YOUR LIBRARY</div>
        <div className="about-row about-bookmark-row">
          <div>
            ${bookmarked === null
              ? html`<span className="settings-subtle">Checking…</span>`
              : bookmarked
                ? html`<span style=${{ color: '#ff9500' }}>★ Bookmarked</span>`
                : html`<span className="settings-subtle">Not in your bookmarks</span>`}
          </div>
          <button className="btn ${bookmarked ? 'subtle' : 'primary'}"
                  onClick=${toggleBookmark}
                  disabled=${busy === 'bookmark' || bookmarked === null || !url}>
            ${busy === 'bookmark' ? '…' : (bookmarked ? 'Remove bookmark' : 'Bookmark this site')}
          </button>
        </div>

        ${catalogApp && html`
          <div className="about-row about-bookmark-row">
            <div>
              ${catalogActions.hasApp(catalogApp)
                ? html`<span style=${{ color: '#3fb950' }}>Saved in My Catalog</span>`
                : html`<span className="settings-subtle">Not in My Catalog</span>`}
            </div>
            <${AddToCatalogButton} catalogActions=${catalogActions} app=${catalogApp} className="btn subtle" label="Add to My Catalog" />
          </div>
        `}
        ${catalogActions.err && html`<div className="apps-error">${catalogActions.err}</div>`}
        ${catalogActions.notice && html`<div className="apps-ok">${catalogActions.notice}</div>`}

        ${driveInfo && html`
          <div className="about-foot">
            ${updatedText ? `Updated ${updatedText} · ` : ''}
            ${driveInfo.relay?.hybridFetchEnabled ? 'hybrid relay fetch enabled' : 'pure P2P fetch'}
          </div>
        `}
      </div>
    </div>
  `
}

export function Browse ({ rpc, C, navUrl, onNavigated, tabs, setTabs, activeId, setActiveId, closedTabs, setClosedTabs, sessionReady, defaultUrl }) {
  const inputRef = useRef(null)
  const iframeRefs = useRef({})
  const autoLoadedRef = useRef(new Set())
  const [editingUrl, setEditingUrl] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [autocompleteSource, setAutocompleteSource] = useState([])
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)
  const [autocompleteIdx, setAutocompleteIdx] = useState(-1)
  const autocompleteFetchedAt = useRef(0)

  const active = tabs.find((t) => t.id === activeId) || tabs[0]

  useEffect(() => {
    if (activeId === 'placeholder' && tabs.length > 0) setActiveId(tabs[0].id)
  }, [activeId, tabs])

  const updateTab = (id, patch) =>
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const setActive = (id) => {
    setActiveId(id)
    const t = tabs.find((x) => x.id === id)
    if (t) setEditingUrl(t.displayUrl || '')
  }

  useEffect(() => {
    if (active) setEditingUrl(active.displayUrl || '')
  }, [active?.id, active?.displayUrl])

  const go = async (url, tabIdOverride, opts = {}) => {
    const id = tabIdOverride || activeId
    const recordHistory = opts.recordHistory !== false
    const rememberVisit = opts.rememberVisit ?? recordHistory

    let target = null
    let prov = null
    const raw = String(url ?? '').trim()
    const pearname = /^pearname:\/\//i.test(raw) ? parsePearname(raw) : null
    const nameQuery = pearname || (looksLikeName(raw) ? raw : null)
    if (nameQuery) {
      try {
        const { resolved } = await rpc.request(C.CMD_NAME_RESOLVE, { name: nameQuery })
        if (resolved && (resolved.link || resolved.key)) {
          const link = resolved.link || `hyper://${resolved.key}/`
          if (/^(?:pear|file):\/\//i.test(link)) {
            updateTab(id, { status: `opening ${resolved.label || nameQuery} · ${resolved.provenance}…` })
            try {
              await rpc.request(C.CMD_LAUNCH_PEAR_LINK, { link }, 60000)
              updateTab(id, { status: '' })
            } catch (err) {
              updateTab(id, { status: `error: ${err.message}` })
            }
            return
          }
          target = link
          prov = { provenance: resolved.provenance, label: resolved.label || nameQuery, name: nameQuery, source: resolved.source || null }
        }
      } catch {}
    }
    if (!target) target = normalizeUrl(url)
    if (!target) return

    updateTab(id, { status: `resolving ${prov ? prov.label : target}…`, displayUrl: target })
    try {
      const res = await rpc.request(C.CMD_NAVIGATE, { url: target })
      setTabs((prev) => prev.map((t) => {
        if (t.id !== id) return t
        let history = Array.isArray(t.history) ? t.history : []
        let histIdx = Number.isInteger(t.histIdx) ? t.histIdx : -1
        if (recordHistory) {
          const pushed = pushTabHistory(history, histIdx, target)
          history = pushed.history
          histIdx = pushed.histIdx
        } else if (Number.isInteger(opts.historyIndex)) {
          histIdx = clampHistoryIndex(history, opts.historyIndex)
        }
        return {
          ...t,
          src: res.localUrl,
          status: '',
          history,
          histIdx,
          url: target,
          displayUrl: target,
          title: prov ? prov.label : target,
          nameProv: prov
        }
      }))
      if (rememberVisit) rpc.request(C.CMD_USERDATA_ADD_HISTORY, { url: target, title: prov ? prov.label : target }).catch(() => {})
    } catch (err) {
      updateTab(id, {
        src: null,
        status: `error: ${err.message}`,
        url: target,
        displayUrl: target,
        title: target,
        nameProv: prov
      })
    }
  }

  const indexPage = (tab, el) => {
    try {
      const u = (tab && (tab.url || tab.displayUrl)) || ''
      if (!/^hyper:\/\//i.test(u)) return
      const rest = u.replace(/^hyper:\/\//i, '')
      const slash = rest.indexOf('/')
      const driveKey = slash >= 0 ? rest.slice(0, slash) : rest
      const path = slash >= 0 ? rest.slice(slash) : '/'
      let title = ''; let text = ''
      try {
        const doc = el && el.contentDocument
        if (doc) { title = doc.title || ''; text = ((doc.body && doc.body.innerText) || '').slice(0, 200000) }
      } catch {}
      rpc.request(C.CMD_SEARCH_INDEX, { driveKey, path, title: title || u, text }).catch(() => {})
    } catch {}
  }

  const bookmark = async () => {
    const target = normalizeUrl(editingUrl)
    if (!target) return
    try {
      await rpc.request(C.CMD_USERDATA_ADD_BOOKMARK, { url: target, title: target })
      updateTab(activeId, { status: `bookmarked ${target}` })
      setTimeout(() => updateTab(activeId, { status: '' }), 1500)
    } catch (err) {
      updateTab(activeId, { status: `bookmark failed: ${err.message}` })
    }
  }

  const back = () => {
    const history = active?.history || []
    if (!active || active.histIdx <= 0) return
    const i = active.histIdx - 1
    const url = history[i]
    go(url, active.id, { recordHistory: false, rememberVisit: false, historyIndex: i })
  }
  const forward = () => {
    const history = active?.history || []
    if (!active || active.histIdx >= history.length - 1) return
    const i = active.histIdx + 1
    const url = history[i]
    go(url, active.id, { recordHistory: false, rememberVisit: false, historyIndex: i })
  }
  const reload = () => {
    const el = iframeRefs.current[activeId]
    if (el && el.src) el.src = el.src
  }

  const newTab = (url = '') => {
    const t = makeTab(url)
    setTabs((prev) => [...prev, t])
    setActiveId(t.id)
    setEditingUrl(url || '')
  }

  const closeTab = (id) => {
    const closing = tabs.find((t) => t.id === id)
    const closed = normalizeTabSnapshot(closing)
    if (closed) setClosedTabs((prev) => [closed, ...prev].slice(0, MAX_CLOSED_TABS))
    const idx = tabs.findIndex((t) => t.id === id)
    if (idx === -1) return
    const remaining = tabs.filter((t) => t.id !== id)
    delete iframeRefs.current[id]
    if (remaining.length === 0) {
      const fresh = makeTab('')
      setTabs([fresh])
      setActiveId(fresh.id)
      setEditingUrl('')
      return
    }
    setTabs(remaining)
    if (id === activeId) {
      const next = remaining[Math.min(idx, remaining.length - 1)]
      setActiveId(next.id)
      setEditingUrl(next.displayUrl || '')
    }
  }

  const reopenClosedTab = () => {
    const closed = closedTabs[0]
    if (!closed) return
    const restored = restoreSavedTab(closed)
    if (!restored) return
    setClosedTabs((prev) => prev.slice(1))
    setTabs((prev) => sortTabsPinnedFirst([...prev, restored]))
    setActiveId(restored.id)
    setEditingUrl(restored.displayUrl || '')
  }

  const togglePinned = (id) => {
    setTabs((prev) => sortTabsPinnedFirst(prev.map((tab) => (
      tab.id === id ? { ...tab, pinned: !tab.pinned } : tab
    ))))
  }

  const openDevtools = () => {
    try {
      const el = iframeRefs.current[activeId]
      const cw = el?.contentWindow
      if (!cw) return
      if (typeof Pear !== 'undefined' && Pear.Window?.openDevTools) {
        Pear.Window.openDevTools({ mode: 'detach' })
        return
      }
      console.log('[devtools] runtime does not expose openDevTools — relaunch with --devtools')
      updateTab(activeId, { status: 'devtools: relaunch with `pear run --dev --devtools .`' })
      setTimeout(() => updateTab(activeId, { status: '' }), 3000)
    } catch (err) {
      console.error('[devtools] failed:', err)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        if (e.shiftKey) reopenClosedTab()
        else newTab()
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault(); closeTab(activeId)
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        inputRef.current?.focus(); inputRef.current?.select?.()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault(); reload()
      } else if ((e.key === 'i' || e.key === 'I') && (e.shiftKey || e.altKey)) {
        e.preventDefault(); openDevtools()
      } else if (e.key >= '1' && e.key <= '9') {
        const n = parseInt(e.key, 10) - 1
        if (tabs[n]) { e.preventDefault(); setActive(tabs[n].id) }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [activeId, tabs, closedTabs])

  useEffect(() => {
    const onFrameMessage = (event) => {
      const data = event.data
      if (!data || data.type !== 'pearbrowser:navigate') return
      const url = typeof data.url === 'string' ? data.url.trim() : ''
      if (!/^hyper:\/\//i.test(url)) return

      const sourceTab = tabs.find((t) => iframeRefs.current[t.id]?.contentWindow === event.source)
      if (!sourceTab) return

      if (data.openInNewTab) {
        const t = makeTab(url)
        setTabs((prev) => [...prev, t])
        setActiveId(t.id)
        setEditingUrl(url)
        go(url, t.id)
        return
      }

      setActiveId(sourceTab.id)
      setEditingUrl(url)
      go(url, sourceTab.id)
    }
    window.addEventListener('message', onFrameMessage)
    return () => window.removeEventListener('message', onFrameMessage)
  }, [tabs])

  useEffect(() => {
    if (!sessionReady) return
    if (!active || active.src || !active.url) return
    const key = `${active.id}:${active.url}`
    if (autoLoadedRef.current.has(key)) return
    autoLoadedRef.current.add(key)
    const hasHistory = Array.isArray(active.history) && active.history.length > 0
    go(active.url, active.id, {
      recordHistory: !hasHistory,
      rememberVisit: !hasHistory,
      historyIndex: active.histIdx
    })
  }, [sessionReady, active?.id, active?.url, active?.src])

  useEffect(() => {
    if (!navUrl) return
    if (active && (active.src || active.url)) {
      const t = makeTab(navUrl)
      setTabs((prev) => [...prev, t])
      setActiveId(t.id)
      setEditingUrl(navUrl)
      go(navUrl, t.id)
    } else {
      go(navUrl, active?.id)
    }
    onNavigated?.()
  }, [navUrl])

  const suggestions = useMemo(() => {
    const q = (editingUrl || '').trim().toLowerCase()
    if (!q) return autocompleteSource.slice(0, 8)
    const seen = new Set()
    const out = []
    const score = (entry) => {
      const url = (entry.url || '').toLowerCase()
      const title = (entry.title || '').toLowerCase()
      if (url.startsWith(q)) return 0
      if (title.startsWith(q)) return 1
      if (url.includes(q)) return 2
      if (title.includes(q)) return 3
      return 99
    }
    const ranked = autocompleteSource
      .map((e) => ({ e, s: score(e) }))
      .filter(({ s }) => s < 99)
      .sort((a, b) => a.s - b.s || (a.e.kind === 'bookmark' ? -1 : 1))
    for (const { e } of ranked) {
      if (seen.has(e.url)) continue
      seen.add(e.url)
      out.push(e)
      if (out.length >= 8) break
    }
    return out
  }, [editingUrl, autocompleteSource])

  const refreshAutocompleteSource = async () => {
    if (Date.now() - autocompleteFetchedAt.current < 30_000 && autocompleteSource.length > 0) return
    try {
      const [bRes, hRes] = await Promise.all([
        rpc.request(C.CMD_USERDATA_LIST_BOOKMARKS).catch(() => ({})),
        rpc.request(C.CMD_USERDATA_LIST_HISTORY, { limit: 100 }).catch(() => ({})),
      ])
      const bookmarks = ((bRes && bRes.bookmarks) || []).map((b) => ({
        kind: 'bookmark', url: b.url, title: b.title || b.url
      }))
      const history = ((hRes && hRes.history) || []).map((h) => ({
        kind: 'history', url: h.url, title: h.title || h.url
      }))
      setAutocompleteSource([...bookmarks, ...history])
      autocompleteFetchedAt.current = Date.now()
    } catch {}
  }

  const onUrlKeyDown = (e) => {
    if (autocompleteOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setAutocompleteIdx((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setAutocompleteIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
        return
      }
      if (e.key === 'Escape') {
        setAutocompleteOpen(false)
        setAutocompleteIdx(-1)
        return
      }
      if (e.key === 'Enter') {
        if (autocompleteIdx >= 0 && suggestions[autocompleteIdx]) {
          e.preventDefault()
          const picked = suggestions[autocompleteIdx]
          setEditingUrl(picked.url)
          setAutocompleteOpen(false)
          setAutocompleteIdx(-1)
          go(picked.url)
          return
        }
      }
    }
    if (e.key === 'Enter') go(editingUrl)
  }

  return html`
    <div className="browse">
      <div className="tabstrip">
        ${tabs.map((t, i) => html`
          <button
            key=${t.id}
            className=${'tabchip' + (t.id === activeId ? ' active' : '') + (t.pinned ? ' pinned' : '')}
            onClick=${() => setActive(t.id)}
            title=${t.displayUrl || 'New tab'}
          >
            <span className="tabchip-favicon">${t.src ? '🌐' : '🆕'}</span>
            <span
              className=${'tabchip-pin' + (t.pinned ? ' on' : '')}
              title=${t.pinned ? 'Unpin tab' : 'Pin tab'}
              onClick=${(e) => { e.stopPropagation(); togglePinned(t.id) }}
            >${t.pinned ? '●' : '○'}</span>
            <span className="tabchip-title">${t.title || (t.displayUrl ? t.displayUrl.replace(/^hyper:\/\//, '').slice(0, 28) : 'New tab')}</span>
            <span className="tabchip-close" onClick=${(e) => { e.stopPropagation(); closeTab(t.id) }}>×</span>
          </button>
        `)}
        <button className="tabchip-new" onClick=${() => newTab()} title="New tab (⌘T)">+</button>
        <button className="tabchip-new tabchip-restore" onClick=${reopenClosedTab} disabled=${closedTabs.length === 0} title="Reopen closed tab (⌘⇧T)">↺</button>
      </div>
      <div className="urlbar">
        <button className="nav" onClick=${back} disabled=${!active || active.histIdx <= 0} title="Back">◀</button>
        <button className="nav" onClick=${forward} disabled=${!active || active.histIdx >= (active.history || []).length - 1} title="Forward">▶</button>
        <button className="nav" onClick=${reload} disabled=${!active?.src} title="Reload (⌘R)">⟳</button>
        <input
          ref=${inputRef}
          type="text"
          value=${editingUrl}
          onInput=${(e) => { setEditingUrl(e.target.value); setAutocompleteOpen(true); setAutocompleteIdx(-1) }}
          onFocus=${() => { refreshAutocompleteSource(); setAutocompleteOpen(true); setAutocompleteIdx(-1) }}
          onBlur=${() => { setTimeout(() => setAutocompleteOpen(false), 120) }}
          onKeyDown=${onUrlKeyDown}
          placeholder="hyper://<key>/path"
          spellCheck="false"
        />
        <button className="nav" onClick=${bookmark} disabled=${!editingUrl?.trim?.()} title="Bookmark this URL">☆</button>
        <button className="nav" onClick=${() => setAboutOpen(true)} disabled=${!active?.url} title="About this site">ⓘ</button>
        <button className="nav" onClick=${openDevtools} disabled=${!active?.src} title="Devtools (⌘⇧I)">⚙</button>
        <button className="nav go" onClick=${() => go(editingUrl)}>Go</button>
        ${autocompleteOpen && suggestions.length > 0 && html`
          <div className="urlbar-suggestions">
            ${suggestions.map((s, idx) => html`
              <div
                key=${s.url}
                className=${'urlbar-suggestion' + (idx === autocompleteIdx ? ' active' : '')}
                onMouseDown=${(e) => {
                  e.preventDefault()
                  setEditingUrl(s.url)
                  setAutocompleteOpen(false)
                  setAutocompleteIdx(-1)
                  go(s.url)
                }}
                onMouseEnter=${() => setAutocompleteIdx(idx)}
              >
                <span className="urlbar-suggestion-icon">${s.kind === 'bookmark' ? '★' : '🕘'}</span>
                <div className="urlbar-suggestion-text">
                  ${s.title && s.title !== s.url
                    ? html`<div className="urlbar-suggestion-title">${s.title}</div>`
                    : null}
                  <div className="urlbar-suggestion-url">${s.url}</div>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
      ${active?.status && html`<div className="browse-status">${active.status}</div>`}
      ${active?.nameProv && html`
        <div className=${`name-prov-chip name-prov-${active.nameProv.provenance}`}
             title=${`“${active.nameProv.name}” resolved to ${active.displayUrl}`}>
          <span className="name-prov-name">${active.nameProv.label}</span>
          <span className="name-prov-tier">${active.nameProv.provenance === 'petname' ? 'your saved name' : active.nameProv.provenance === 'registry' ? 'name registry' : active.nameProv.provenance === 'contact' ? `from ${active.nameProv.source || 'a contact'}` : 'curated'}</span>
        </div>
      `}
      <div className="browse-stage">
        ${tabs.map((t) =>
          t.src
            ? html`<iframe
                key=${t.id}
                ref=${(el) => { if (el) iframeRefs.current[t.id] = el }}
                className=${'webview' + (t.id === activeId ? '' : ' hidden')}
                src=${t.src}
                onLoad=${(e) => indexPage(t, e.target)}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
              ></iframe>`
            : t.id === activeId
              ? (t.url
                  ? html`<div key=${t.id} className="browse-welcome">
                      <div className="browse-welcome-inner">
                        <div className="browse-welcome-logo">🍐</div>
                        ${(t.status && /^error/i.test(t.status))
                          ? html`<div className="browse-welcome-copy">
                              <h2>Couldn't load this page</h2>
                              <p>${String(t.status).replace(/^error:\s*/i, '')}</p>
                            </div>`
                          : html`<div className="browse-welcome-copy">
                              <h2>Loading…</h2>
                              <p>Fetching <code>${t.url}</code> directly from its peers — first load of a cold drive can take a moment.</p>
                            </div>`}
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${() => go(t.url, t.id)}>${(t.status && /^error/i.test(t.status)) ? 'Retry' : 'Reload'}</button>
                          <button className="btn subtle" onClick=${() => { inputRef.current?.focus(); inputRef.current?.select?.() }}>Edit URL</button>
                        </div>
                      </div>
                    </div>`
                  : html`<div key=${t.id} className="browse-welcome">
                      <div className="browse-welcome-inner">
                        <div className="browse-welcome-logo">🍐</div>
                        <h2>The peer-to-peer web starts here</h2>
                        <p>Paste any <code>hyper://</code> URL above — hex or z-base-32 — and PearBrowser fetches it directly from its peers. No DNS, no servers, no CDN.</p>
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${() => go(defaultUrl)}>Open the PearBrowser site</button>
                          <button className="btn subtle" onClick=${() => { inputRef.current?.focus(); inputRef.current?.select?.() }}>Focus the URL bar</button>
                        </div>
                        <div className="browse-welcome-tip">Tip: <code>⌘T</code> opens a new tab, <code>⌘⇧T</code> reopens one, <code>⌘W</code> closes one, <code>⌘L</code> jumps to the URL bar, <code>⌘1</code>–<code>⌘9</code> switches between tabs.</div>
                      </div>
                    </div>`)
              : null
        )}
      </div>
      ${aboutOpen && html`<${AboutSite}
        rpc=${rpc}
        C=${C}
        url=${active?.url || ''}
        title=${active?.title || ''}
        onClose=${() => setAboutOpen(false)}
      />`}
    </div>
  `
}
