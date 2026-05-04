import { useEffect, useMemo, useRef, useState } from 'react'
import { html } from 'htm/react'
import { Logo, Wordmark } from './logo.js'

function copyText (text) {
  try {
    navigator.clipboard?.writeText(text)
  } catch {}
}

// Vetted against https://github.com/holepunchto/pear-aliases — these
// are the canonical pear:// keys for Holepunch-ecosystem apps.
const FEATURED_APPS = [
  {
    id: 'keet',
    name: 'Keet',
    tagline: 'End-to-end encrypted P2P chat, voice, and video calls by Holepunch.',
    link: 'pear://oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo',
    initial: 'K',
    gradient: 'linear-gradient(135deg, #fbbf24, #f97316)'
  },
  {
    id: 'pearpass',
    name: 'PearPass',
    tagline: 'Peer-to-peer password manager from Tether — synced across devices without a cloud.',
    link: 'pear://tywsat7gz8m65ejx4zjn3773pbdc4j8m66tukis8dgzekraymtzo',
    initial: 'P',
    gradient: 'linear-gradient(135deg, #3fb950, #58a6ff)'
  },
  {
    id: 'hiveworm',
    name: 'HiveWorm',
    tagline: 'Perpetual P2P life-sim — runs as a Pear app via swarm.v1.',
    link: 'pear://d1xbkcpcbi1xa8dexp49rsendra5r67w3qh5a9k8t44oemm4k16y',
    initial: 'W',
    gradient: 'linear-gradient(135deg, #a371f7, #d946ef)'
  }
]

const TAB_META = {
  browse: { label: 'Browse', icon: '🌐' },
  apps: { label: 'Apps', icon: '📦' },
  sites: { label: 'P2P Sites', icon: '✒️' },
  library: { label: 'Library', icon: '🔖' },
  settings: { label: 'Settings', icon: '⚙' }
}

// Homepage drive — published from PearBrowser's own block editor
// (Sites tab), 2026-04-28. Pinned on HiveRelay. Earlier `fec1568a…`
// and `efd7b0c6c38d…` keys have been unseeded; this is the live one.
// To update: open the same site in the desktop's Sites editor and
// republish — block-source lives at /.blocks.json inside the drive.
const DEFAULT_URL = 'hyper://2d6c2be92f07e10ed5a4b07b5c1286a56f0c1220c79ad3c3293b069f8c946763/'

// Default catalog drive — auto-loads on first Apps-tab visit when the
// user has not yet pinned a catalog of their own. Curated entry point
// for the Pear ecosystem; lists pearbrowser-desktop, hiverelay,
// p2pbuilders. Source under
// ~/Desktop/pearbrowser-publishers/catalog-source/, signing key under
// ~/Desktop/pearbrowser-publishers/catalog/. Pinned on 5 HiveRelays.
const DEFAULT_CATALOG_KEY = '0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75'

function normalizeUrl (raw) {
  const s = raw.trim()
  if (!s) return null
  if (s.startsWith('hyper://')) return s
  if (/^[0-9a-f]{64}$/i.test(s)) return `hyper://${s}/`
  if (/^[13-9a-km-uw-z]{52}$/i.test(s)) return `hyper://${s}/`
  if (s.includes('/') || s.startsWith('pear://')) return s
  return `hyper://${s}`
}

// --- Multi-tab Browse ---------------------------------------------------
//
// Each tab keeps its own iframe (hidden via display:none when inactive
// so state persists across switches), its own back/forward history, its
// own URL input value, and its own status string. A keyboard listener
// on document handles Cmd-T / Cmd-W / Cmd-L / Cmd-1..9 globally while
// the Browse component is mounted.
//
// Devtools:
//   Cmd-Shift-I or Cmd-Alt-I opens the per-iframe devtools via Pear's
//   Window.openDevTools API when available. Falls back gracefully if
//   the runtime doesn't expose it.

let _tabIdSeq = 0
function makeTabId () { _tabIdSeq += 1; return 'tab-' + _tabIdSeq + '-' + Date.now().toString(36) }

function makeTab (initialUrl = '') {
  return {
    id: makeTabId(),
    url: initialUrl,
    displayUrl: initialUrl,
    src: null,
    history: [],
    histIdx: -1,
    status: '',
    title: 'New tab'
  }
}

// --- About-this-site panel -----------------------------------------------
//
// Modal showing technical details about whatever drive is loaded in the
// active tab — drive key (hex + z-base-32), bookmark state, scheme, path.
// Live metadata (length, peer count, replicas) lands in a follow-up
// commit once we wire CMD_DRIVE_INFO; for now we surface what's
// derivable locally without a new RPC call.
//
// Triggered from the (i) button in the URL bar.

function parseDriveAddress (urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null
  let u
  try { u = new URL(urlStr) } catch { return null }
  const proto = u.protocol.replace(':', '')
  if (proto !== 'hyper' && proto !== 'pear') return null
  // Drive key is the host (or first segment for hyper://<key>/path)
  const raw = u.hostname || u.pathname.split('/')[0] || ''
  if (!raw) return null
  // Hex (64 chars) or z-base-32 (52 chars)
  let hex = null, z32Form = null
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    hex = raw.toLowerCase()
    try { z32Form = require('z32').encode(Buffer.from(hex, 'hex')) } catch {}
  } else if (/^[13-9a-km-uw-z]{52}$/i.test(raw)) {
    z32Form = raw.toLowerCase()
    try { hex = Buffer.from(require('z32').decode(z32Form)).toString('hex') } catch {}
  }
  return { proto, raw, hex, z32: z32Form, path: u.pathname || '/', urlStr }
}

function AboutSite ({ rpc, C, url, onClose, onBookmarkToggle }) {
  const drive = parseDriveAddress(url)
  const [bookmarked, setBookmarked] = useState(null)
  const [busy, setBusy] = useState(null)
  const [copyState, setCopyState] = useState({})

  // Check whether this URL is in the local bookmarks Hyperbee.
  useEffect(() => {
    if (!url) return
    rpc.request(C.CMD_USERDATA_LIST_BOOKMARKS).then((res) => {
      const list = (res?.bookmarks) || []
      setBookmarked(list.some((b) => b && b.url === url))
    }).catch(() => setBookmarked(false))
  }, [url, rpc, C])

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

  return html`
    <div class="modal-overlay" role="dialog" aria-modal="true"
         onClick=${(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div class="modal-card about-card">
        <div class="about-head">
          <div class="about-title">About this site</div>
          <button class="about-close" onClick=${onClose} title="Close">×</button>
        </div>

        <div class="about-section-label">FULL URL</div>
        <div class="about-row">
          <code class="about-mono">${url || '(no URL loaded)'}</code>
          <button class="copy-btn-small ${copyState.url ? 'copied' : ''}"
                  onClick=${() => copy('url', url)} disabled=${!url}>
            ${copyState.url ? '✓' : 'Copy'}
          </button>
        </div>

        ${drive && drive.hex && html`
          <div class="about-section-label">DRIVE KEY (hex)</div>
          <div class="about-row">
            <code class="about-mono">${drive.hex}</code>
            <button class="copy-btn-small ${copyState.hex ? 'copied' : ''}"
                    onClick=${() => copy('hex', drive.hex)}>
              ${copyState.hex ? '✓' : 'Copy'}
            </button>
          </div>
        `}

        ${drive && drive.z32 && html`
          <div class="about-section-label">DRIVE KEY (z-base-32)</div>
          <div class="about-row">
            <code class="about-mono">${drive.z32}</code>
            <button class="copy-btn-small ${copyState.z32 ? 'copied' : ''}"
                    onClick=${() => copy('z32', drive.z32)}>
              ${copyState.z32 ? '✓' : 'Copy'}
            </button>
          </div>
        `}

        ${drive && html`
          <div class="about-meta-grid">
            <div>
              <div class="about-meta-label">Scheme</div>
              <div class="about-meta-value">${drive.proto}://</div>
            </div>
            <div>
              <div class="about-meta-label">Path</div>
              <div class="about-meta-value">${drive.path}</div>
            </div>
          </div>
        `}

        <div class="about-section-label">YOUR LIBRARY</div>
        <div class="about-row about-bookmark-row">
          <div>
            ${bookmarked === null
              ? html`<span class="settings-subtle">Checking…</span>`
              : bookmarked
                ? html`<span style="color:#ff9500">★ Bookmarked</span>`
                : html`<span class="settings-subtle">Not in your bookmarks</span>`}
          </div>
          <button class="btn ${bookmarked ? 'subtle' : 'primary'}"
                  onClick=${toggleBookmark}
                  disabled=${busy === 'bookmark' || bookmarked === null || !url}>
            ${busy === 'bookmark' ? '…' : (bookmarked ? 'Remove bookmark' : 'Bookmark this site')}
          </button>
        </div>

        <div class="about-foot">
          Live metadata (drive version, peer count, pinning relays)
          coming in a near-future update.
        </div>
      </div>
    </div>
  `
}

function Browse ({ rpc, C, navUrl, onNavigated, tabs, setTabs, activeId, setActiveId }) {
  // tabs[] + activeId are now lifted to App-level state and passed in
  // as props. This survives main-tab switches (Browse→Apps→Browse no
  // longer destroys your open tabs) and lets App persist them to
  // user-data settings for cross-launch session restore.
  const inputRef = useRef(null)
  const iframeRefs = useRef({})
  const [editingUrl, setEditingUrl] = useState('')
  // About-this-site modal — true when user clicked the (i) button.
  const [aboutOpen, setAboutOpen] = useState(false)
  // URL bar autocomplete state (suggestions, dropdown visibility,
  // keyboard-selection index). Suggestions come from a single fetch
  // of bookmarks + history at focus time, then filtered locally as
  // the user types — fast and avoids hammering the user-data Hyperbee.
  const [autocompleteSource, setAutocompleteSource] = useState([])
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)
  const [autocompleteIdx, setAutocompleteIdx] = useState(-1)
  const autocompleteFetchedAt = useRef(0)

  const active = tabs.find((t) => t.id === activeId) || tabs[0]

  // Sync active id once tabs are stable.
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

  // When the active tab changes, sync the URL input.
  useEffect(() => {
    if (active) setEditingUrl(active.displayUrl || '')
  }, [active?.id, active?.displayUrl])

  const go = async (url, tabIdOverride) => {
    const target = normalizeUrl(url)
    if (!target) return
    const id = tabIdOverride || activeId
    updateTab(id, { status: `resolving ${target}…`, displayUrl: target })
    try {
      const res = await rpc.request(C.CMD_NAVIGATE, { url: target })
      setTabs((prev) => prev.map((t) => {
        if (t.id !== id) return t
        const trimmed = t.history.slice(0, t.histIdx + 1)
        const newHistory = [...trimmed, target]
        return {
          ...t,
          src: res.localUrl,
          status: '',
          history: newHistory,
          histIdx: newHistory.length - 1,
          url: target,
          displayUrl: target,
          title: target
        }
      }))
      rpc.request(C.CMD_USERDATA_ADD_HISTORY, { url: target, title: target }).catch(() => {})
    } catch (err) {
      updateTab(id, { status: `error: ${err.message}` })
    }
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
    if (!active || active.histIdx <= 0) return
    const i = active.histIdx - 1
    const url = active.history[i]
    updateTab(active.id, { histIdx: i, displayUrl: url })
    go(url, active.id)
  }
  const forward = () => {
    if (!active || active.histIdx >= active.history.length - 1) return
    const i = active.histIdx + 1
    const url = active.history[i]
    updateTab(active.id, { histIdx: i, displayUrl: url })
    go(url, active.id)
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
    if (url) {
      // Defer go() until next tick so setActiveId has applied.
      setTimeout(() => go(url, t.id), 0)
    }
  }

  const closeTab = (id) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      const remaining = prev.filter((t) => t.id !== id)
      if (remaining.length === 0) {
        const fresh = makeTab('')
        setActiveId(fresh.id)
        setEditingUrl('')
        return [fresh]
      }
      if (id === activeId) {
        const next = remaining[Math.min(idx, remaining.length - 1)]
        setActiveId(next.id)
        setEditingUrl(next.displayUrl || '')
      }
      // Drop the iframe ref so it can GC.
      delete iframeRefs.current[id]
      return remaining
    })
  }

  // Try to open devtools for the active tab's iframe. pear-electron
  // exposes Pear.Window.devtools(...) on some channels; fall back to
  // a console log if unavailable.
  const openDevtools = () => {
    try {
      const el = iframeRefs.current[activeId]
      const cw = el?.contentWindow
      if (!cw) return
      // Path 1: pear-electron exposes Pear.Window.openDevTools()
      if (typeof Pear !== 'undefined' && Pear.Window?.openDevTools) {
        Pear.Window.openDevTools({ mode: 'detach' })
        return
      }
      // Path 2: chrome devtools protocol via remote debugging is not
      // exposed by default; surface a hint instead.
      console.log('[devtools] runtime does not expose openDevTools — relaunch with --devtools')
      updateTab(activeId, { status: 'devtools: relaunch with `pear run --dev --devtools .`' })
      setTimeout(() => updateTab(activeId, { status: '' }), 3000)
    } catch (err) {
      console.error('[devtools] failed:', err)
    }
  }

  // Keyboard shortcuts. Active only while Browse is mounted.
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key === 't' || e.key === 'T') {
        if (e.shiftKey) return // Cmd-Shift-T (reopen) — not implemented
        e.preventDefault(); newTab()
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
  }, [activeId, tabs])

  // Auto-navigate to the landing page once on mount.
  useEffect(() => {
    if (active && !active.src && active.url) go(active.url, active.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // External navUrl prop (Apps tab → "open in Browse"). Open in a new
  // tab if the active tab already has content; otherwise navigate the
  // current empty tab.
  useEffect(() => {
    if (!navUrl) return
    if (active && active.src) newTab(navUrl)
    else go(navUrl, active?.id)
    onNavigated?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navUrl])

  // Compute filtered suggestions from the autocompleteSource for the
  // current editingUrl. Bookmarks rank above history, exact-prefix
  // above substring; cap at 8 to keep the dropdown digestible.
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

  // Refresh the suggestion source from user-data Hyperbee, debounced
  // by 30s — bookmarks/history rarely change in mid-typing.
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
      // Bookmarks first so they out-rank history with the same URL.
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
    <div class="browse">
      <div class="tabstrip">
        ${tabs.map((t, i) => html`
          <button
            key=${t.id}
            class=${'tabchip' + (t.id === activeId ? ' active' : '')}
            onClick=${() => setActive(t.id)}
            title=${t.displayUrl || 'New tab'}
          >
            <span class="tabchip-favicon">${t.src ? '🌐' : '🆕'}</span>
            <span class="tabchip-title">${t.title || (t.displayUrl ? t.displayUrl.replace(/^hyper:\/\//, '').slice(0, 28) : 'New tab')}</span>
            <span class="tabchip-close" onClick=${(e) => { e.stopPropagation(); closeTab(t.id) }}>×</span>
          </button>
        `)}
        <button class="tabchip-new" onClick=${() => newTab()} title="New tab (⌘T)">+</button>
      </div>
      <div class="urlbar">
        <button class="nav" onClick=${back} disabled=${!active || active.histIdx <= 0} title="Back">◀</button>
        <button class="nav" onClick=${forward} disabled=${!active || active.histIdx >= active.history.length - 1} title="Forward">▶</button>
        <button class="nav" onClick=${reload} disabled=${!active?.src} title="Reload (⌘R)">⟳</button>
        <input
          ref=${inputRef}
          type="text"
          value=${editingUrl}
          onInput=${(e) => { setEditingUrl(e.target.value); setAutocompleteOpen(true); setAutocompleteIdx(-1) }}
          onFocus=${() => { refreshAutocompleteSource(); setAutocompleteOpen(true); setAutocompleteIdx(-1) }}
          onBlur=${() => { setTimeout(() => setAutocompleteOpen(false), 120) }}
          onKeyDown=${onUrlKeyDown}
          placeholder="hyper://<key>/path"
          spellcheck="false"
        />
        <button class="nav" onClick=${bookmark} disabled=${!editingUrl?.trim?.()} title="Bookmark this URL">☆</button>
        <button class="nav" onClick=${() => setAboutOpen(true)} disabled=${!active?.url} title="About this site">ⓘ</button>
        <button class="nav" onClick=${openDevtools} disabled=${!active?.src} title="Devtools (⌘⇧I)">⚙</button>
        <button class="nav go" onClick=${() => go(editingUrl)}>Go</button>
        ${autocompleteOpen && suggestions.length > 0 && html`
          <div class="urlbar-suggestions">
            ${suggestions.map((s, idx) => html`
              <div
                key=${s.url}
                class=${'urlbar-suggestion' + (idx === autocompleteIdx ? ' active' : '')}
                onMouseDown=${(e) => {
                  // mousedown fires before blur (which closes the dropdown)
                  e.preventDefault()
                  setEditingUrl(s.url)
                  setAutocompleteOpen(false)
                  setAutocompleteIdx(-1)
                  go(s.url)
                }}
                onMouseEnter=${() => setAutocompleteIdx(idx)}
              >
                <span class="urlbar-suggestion-icon">${s.kind === 'bookmark' ? '★' : '🕘'}</span>
                <div class="urlbar-suggestion-text">
                  ${s.title && s.title !== s.url
                    ? html`<div class="urlbar-suggestion-title">${s.title}</div>`
                    : null}
                  <div class="urlbar-suggestion-url">${s.url}</div>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
      ${active?.status && html`<div class="browse-status">${active.status}</div>`}
      <div class="browse-stage">
        ${tabs.map((t) => t.src
          ? html`<iframe
              key=${t.id}
              ref=${(el) => { if (el) iframeRefs.current[t.id] = el }}
              class=${'webview' + (t.id === activeId ? '' : ' hidden')}
              src=${t.src}
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
            ></iframe>`
          : t.id === activeId
            ? html`<div class="browse-welcome" key=${t.id}>
                <div class="browse-welcome-inner">
                  <div class="browse-welcome-logo">🍐</div>
                  <h2>The peer-to-peer web starts here</h2>
                  <p>Paste any <code>hyper://</code> URL above — hex or z-base-32 — and PearBrowser fetches it directly from its peers. No DNS, no servers, no CDN.</p>
                  <div class="browse-welcome-actions">
                    <button class="btn primary" onClick=${() => go(DEFAULT_URL)}>Try the PearBrowser site</button>
                    <button class="btn subtle" onClick=${() => { inputRef.current?.focus(); inputRef.current?.select?.() }}>Focus the URL bar</button>
                  </div>
                  <div class="browse-welcome-tip">Tip: <code>⌘T</code> opens a new tab, <code>⌘W</code> closes one, <code>⌘L</code> jumps to the URL bar, <code>⌘1</code>–<code>⌘9</code> switches between tabs.</div>
                </div>
              </div>`
            : null
        )}
      </div>
      ${aboutOpen && html`<${AboutSite}
        rpc=${rpc}
        C=${C}
        url=${active?.url || ''}
        onClose=${() => setAboutOpen(false)}
      />`}
    </div>
  `
}

// --- Login consent dialog ---------------------------------------------------
//
// When a hyper:// page calls window.pear.login(), the worklet fires
// EVT_LOGIN_REQUEST with { requestId, driveKey, scopes, appName, reason,
// currentGrant }. This component renders a modal sheet, lets the user
// narrow the granted scopes, and resolves the pending promise via
// CMD_LOGIN_RESOLVE.
//
// Scope catalogue is intentionally short — keep it human-readable.
const SCOPE_LABELS = {
  'profile:name': { label: 'Display name', detail: 'Your chosen public name' },
  'profile:avatar': { label: 'Avatar', detail: 'Your profile picture URL' },
  'profile:email': { label: 'Email', detail: 'Email you put in your profile' },
  'profile:website': { label: 'Website', detail: 'Personal site URL on your profile' }
}

function shortKey (k) {
  if (!k || typeof k !== 'string') return ''
  if (k.length <= 16) return k
  return k.slice(0, 8) + '…' + k.slice(-6)
}

function LoginConsent ({ rpc, C, request, identity, onClose }) {
  const initial = new Set(request.scopes || [])
  const [granted, setGranted] = useState(initial)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')

  const toggle = (s) => {
    setGranted((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const decide = async (approved) => {
    setErr(''); setBusy(approved ? 'approve' : 'deny')
    try {
      const scopes = approved ? Array.from(granted) : []
      await rpc.request(C.CMD_LOGIN_RESOLVE, {
        requestId: request.requestId,
        approved,
        scopes
      })
      onClose()
    } catch (e) {
      setErr(`could not resolve: ${e.message}`)
      setBusy(null)
    }
  }

  const appLabel = request.appName || 'A Pear app'
  const driveLabel = shortKey(request.driveKey)

  return html`
    <div class="modal-overlay" role="dialog" aria-modal="true" onClick=${(e) => e.target.classList.contains('modal-overlay') && decide(false)}>
      <div class="modal-card login-consent">
        <div class="login-header">
          <div class="login-app-icon">🍐</div>
          <div class="login-header-text">
            <div class="login-app-name">${appLabel}</div>
            <div class="login-app-sub">wants to sign you in</div>
            <div class="login-app-key" title=${request.driveKey}>${driveLabel}</div>
          </div>
        </div>

        ${request.reason && html`<div class="login-reason">"${request.reason}"</div>`}

        <div class="login-section-label">SIGNING IN AS</div>
        <div class="login-identity">
          <div class="login-identity-avatar">🍐</div>
          <div class="login-identity-meta">
            <div class="login-identity-label">You</div>
            <code class="login-identity-key">${shortKey(identity?.publicKey || '')}</code>
          </div>
        </div>

        <div class="login-section-label">${appLabel} WILL SEE</div>
        <div class="login-scopes">
          ${(request.scopes || []).length === 0
            ? html`<div class="login-scope-empty">Nothing — sign-in only confirms it's you.</div>`
            : (request.scopes || []).map((s) => {
                const meta = SCOPE_LABELS[s] || { label: s, detail: '' }
                const on = granted.has(s)
                return html`
                  <label class=${'login-scope' + (on ? ' on' : '')} key=${s}>
                    <input type="checkbox" checked=${on} onChange=${() => toggle(s)} />
                    <div class="login-scope-meta">
                      <div class="login-scope-label">${meta.label}</div>
                      <div class="login-scope-detail">${meta.detail || s}</div>
                    </div>
                  </label>
                `
              })}
        </div>

        ${request.currentGrant && html`
          <div class="login-existing">
            You previously granted this app on
            ${' ' + new Date(request.currentGrant.grantedAt).toLocaleDateString()}.
          </div>
        `}

        ${err && html`<div class="apps-error">${err}</div>`}

        <div class="login-actions">
          <button class="btn subtle" onClick=${() => decide(false)} disabled=${busy !== null}>
            ${busy === 'deny' ? 'Cancelling…' : 'Cancel'}
          </button>
          <button class="btn primary" onClick=${() => decide(true)} disabled=${busy !== null}>
            ${busy === 'approve' ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  `
}

// --- Swarm consent dialog (window.pear.swarm.v1.join — Tier C) ----------
//
// When a hyper:// page calls window.pear.swarm.v1.join(arbitraryTopicHex),
// the worklet checks if the (driveKey, topic) pair has a stored grant.
// If not, it parks the join() promise and fires EVT_SWARM_REQUEST. The UI
// shows this modal; user approves or cancels; we POST CMD_SWARM_RESOLVE
// back. On approve the worklet persists a grant in swarm-grants.bee so
// future joins of the same topic skip the prompt.
//
// Tier A (drive-derived subtopic) and Tier B (already-granted) joins
// never trigger this — they resolve in the worklet without UI involvement.

function SwarmConsent ({ rpc, C, request, identity, onClose }) {
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')

  const decide = async (approved) => {
    setErr(''); setBusy(approved ? 'approve' : 'deny')
    try {
      await rpc.request(C.CMD_SWARM_RESOLVE, {
        requestId: request.requestId,
        approved
      })
      onClose()
    } catch (e) {
      setErr(`could not resolve: ${e.message}`)
      setBusy(null)
    }
  }

  const appLabel = request.appName || 'A Pear app'
  const driveLabel = shortKey(request.driveKey)
  const topicLabel = shortKey(request.topicHex)

  return html`
    <div class="modal-overlay" role="dialog" aria-modal="true" onClick=${(e) => e.target.classList.contains('modal-overlay') && decide(false)}>
      <div class="modal-card login-consent">
        <div class="login-header">
          <div class="login-app-icon" style=${{ background: 'linear-gradient(135deg, #58a6ff, #a371f7)' }}>📡</div>
          <div class="login-header-text">
            <div class="login-app-name">${appLabel}</div>
            <div class="login-app-sub">wants to connect to peers on a swarm topic</div>
            <div class="login-app-key" title=${request.driveKey}>${driveLabel}</div>
          </div>
        </div>

        ${request.reason && html`<div class="login-reason">"${request.reason}"</div>`}

        <div class="login-section-label">SWARM TOPIC</div>
        <div class="login-identity">
          <div class="login-identity-avatar">🔑</div>
          <div class="login-identity-meta">
            <div class="login-identity-label">${request.protocol || 'pear.swarm.v1'}</div>
            <code class="login-identity-key">${topicLabel}</code>
          </div>
        </div>

        <div class="login-section-label">WHAT THIS MEANS</div>
        <div class="login-scopes">
          <div class="login-scope on">
            <div class="login-scope-meta">
              <div class="login-scope-label">Discover peers via DHT</div>
              <div class="login-scope-detail">Other devices on this topic will see your IP address.</div>
            </div>
          </div>
          <div class="login-scope on">
            <div class="login-scope-meta">
              <div class="login-scope-label">Send and receive messages directly</div>
              <div class="login-scope-detail">No relay between your peers and you. Messages aren't logged by PearBrowser.</div>
            </div>
          </div>
        </div>

        <div class="login-existing">
          Approving stores a grant for this app + this topic. You can revoke it any time in <strong>Settings → Connected Apps</strong>.
        </div>

        ${err && html`<div class="apps-error">${err}</div>`}

        <div class="login-actions">
          <button class="btn subtle" onClick=${() => decide(false)} disabled=${busy !== null}>
            ${busy === 'deny' ? 'Cancelling…' : 'Cancel'}
          </button>
          <button class="btn primary" onClick=${() => decide(true)} disabled=${busy !== null}>
            ${busy === 'approve' ? 'Connecting…' : 'Approve & Connect'}
          </button>
        </div>
      </div>
    </div>
  `
}

// --- First-launch onboarding ----------------------------------------------
//
// Three slides, no friction:
//   1. Welcome   — what PearBrowser is in one sentence
//   2. The pitch — three-thing summary of what you can do
//   3. Pick a site — 4 cards, click one to land in Browse + close onboarding
//
// We deliberately do NOT force a backup-phrase reveal here. Backup is
// surfaced contextually in Settings → Identity ("Moving to a new device?")
// and on natural moments later (first publish, first subscribe). See
// the v0.4 design conversation: forcing a 12-word seed in step 2
// scares non-technical users without actually improving security
// (most just tick "I saved it" without saving anything).

const ONBOARDING_FIRST_SITES = [
  {
    id: 'home',
    title: 'PearBrowser homepage',
    subtitle: 'The landing page — what this app is, who built it',
    url: 'hyper://2d6c2be92f07e10ed5a4b07b5c1286a56f0c1220c79ad3c3293b069f8c946763/',
    initial: '🍐',
    gradient: 'linear-gradient(135deg, #7ee787, #58a6ff)'
  },
  {
    id: 'hiveworm',
    title: 'HiveWorm',
    subtitle: 'Multiplayer worm life-sim, fully P2P',
    url: 'pear://d1xbkcpcbi1xa8dexp49rsendra5r67w3qh5a9k8t44oemm4k16y',
    initial: '🐛',
    gradient: 'linear-gradient(135deg, #a371f7, #d946ef)'
  },
  {
    id: 'hiverelay',
    title: 'HiveRelay',
    subtitle: 'The relay backbone keeping it all online',
    url: 'hyper://ea607230f7b9a5f854c664901b2c34faf1c6f5b7cee6fc3bca02ac682fd02754/',
    initial: '🟢',
    gradient: 'linear-gradient(135deg, #00ff41, #3eaf55)'
  },
  {
    id: 'p2pbuilders',
    title: 'P2P Builders',
    subtitle: 'Permissionless P2P hacker news',
    url: 'hyper://f0cd01e3565a9eb5d811f3f46f0595ad6b2e87652304789bef3fe4501b3db42a/',
    initial: '🔧',
    gradient: 'linear-gradient(135deg, #ff6600, #fbbf24)'
  }
]

function Onboarding ({ rpc, C, onPickSite, onClose }) {
  const [slide, setSlide] = useState(0)

  const finish = async (pickedUrl) => {
    // Persist the flag so we never ask again — fire-and-forget so we
    // don't block the close on a slow user-data write.
    rpc.request(C.CMD_USERDATA_SET_SETTINGS, {
      updates: { onboardingDone: true, onboardingDoneAt: Date.now() }
    }).catch(() => {})
    if (pickedUrl) onPickSite(pickedUrl)
    onClose()
  }

  return html`
    <div class="modal-overlay onboarding-overlay" role="dialog" aria-modal="true">
      <div class="modal-card onboarding-card">
        ${slide === 0 && html`
          <div class="onb-slide onb-slide-welcome">
            <div class="onb-hero">
              <${Logo} size=${72} />
            </div>
            <h1 class="onb-title">Welcome to <strong>PearBrowser</strong></h1>
            <p class="onb-subtitle">The web that doesn't go down.</p>
            <p class="onb-blurb">
              A peer-to-peer browser, app store, and site publisher. Pages
              live as Hyperdrives, identified by 32-byte keys, replicated
              by their readers. No DNS. No servers. No accounts.
            </p>
            <div class="onb-actions">
              <button class="btn primary" onClick=${() => setSlide(1)}>Get started →</button>
            </div>
          </div>
        `}
        ${slide === 1 && html`
          <div class="onb-slide">
            <h2 class="onb-stepname">Three things at once</h2>
            <div class="onb-pitch-grid">
              <div class="onb-pitch">
                <div class="onb-pitch-icon">🌐</div>
                <div class="onb-pitch-title">Browse hyper://</div>
                <div class="onb-pitch-body">Paste a drive key, fetch from peers, render in-app.</div>
              </div>
              <div class="onb-pitch">
                <div class="onb-pitch-icon">📦</div>
                <div class="onb-pitch-title">Run Pear apps</div>
                <div class="onb-pitch-body">Click a pear:// link, the app opens in its own window.</div>
              </div>
              <div class="onb-pitch">
                <div class="onb-pitch-icon">✒️</div>
                <div class="onb-pitch-title">Publish your own</div>
                <div class="onb-pitch-body">Block editor → publish → pinned 24/7 on HiveRelay.</div>
              </div>
            </div>
            <p class="onb-blurb onb-foot">
              Your identity is generated automatically and stored on this
              machine. You can back it up later in <em>Settings → Identity</em>
              if you want to use it on another device.
            </p>
            <div class="onb-actions">
              <button class="btn subtle" onClick=${() => setSlide(0)}>← Back</button>
              <button class="btn primary" onClick=${() => setSlide(2)}>Continue →</button>
            </div>
          </div>
        `}
        ${slide === 2 && html`
          <div class="onb-slide">
            <h2 class="onb-stepname">Try a site</h2>
            <p class="onb-blurb">Pick one to start with — you can always come back here.</p>
            <div class="onb-sites">
              ${ONBOARDING_FIRST_SITES.map((s) => html`
                <button
                  class="onb-site-card"
                  key=${s.id}
                  onClick=${() => finish(s.url)}
                  title=${s.url}
                >
                  <div class="onb-site-icon" style=${{ background: s.gradient }}>${s.initial}</div>
                  <div class="onb-site-text">
                    <div class="onb-site-title">${s.title}</div>
                    <div class="onb-site-subtitle">${s.subtitle}</div>
                  </div>
                </button>
              `)}
            </div>
            <div class="onb-actions">
              <button class="btn subtle" onClick=${() => setSlide(1)}>← Back</button>
              <button class="onb-skip" onClick=${() => finish(null)}>Skip — I'll explore</button>
            </div>
          </div>
        `}
        <div class="onb-dots">
          ${[0, 1, 2].map((i) => html`
            <span class=${'onb-dot' + (i === slide ? ' on' : '')} key=${i}></span>
          `)}
        </div>
      </div>
    </div>
  `
}

function Apps ({ rpc, C, onLaunch }) {
  const [catalogKey, setCatalogKey] = useState('')
  const [catalog, setCatalog] = useState(null)
  // Recent catalog keys (loaded successfully at least once) — persisted
  // via user-data settings so they survive across launches.
  const [recentCatalogs, setRecentCatalogs] = useState([])
  const [installed, setInstalled] = useState([])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false)
  const [pearLink, setPearLink] = useState('')
  const [launched, setLaunched] = useState('')

  const launchPearLink = async (overrideLink) => {
    const link = (typeof overrideLink === 'string' ? overrideLink : pearLink).trim()
    if (!link) return
    setErr(''); setBusy('pear-link'); setLaunched('')
    try {
      await rpc.request(C.CMD_LAUNCH_PEAR_LINK, { link }, 60000)
      setLaunched(`Launched ${link.slice(0, 60)}${link.length > 60 ? '…' : ''} in a new window.`)
      setPearLink('')
      setTimeout(() => setLaunched(''), 4000)
    } catch (e) {
      setErr(`launch: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const refreshInstalled = async () => {
    try {
      const list = await rpc.request(C.CMD_LIST_INSTALLED)
      setInstalled(Array.isArray(list) ? list : (list?.apps ?? []))
    } catch (e) {
      setErr(`list failed: ${e.message}`)
    }
  }

  const loadCatalog = async (overrideKey) => {
    const key = (typeof overrideKey === 'string' ? overrideKey : catalogKey).trim()
    if (!key) return
    setErr(''); setBusy('catalog'); setCatalog(null)
    try {
      const data = await rpc.request(C.CMD_LOAD_CATALOG, { keyHex: key }, 60000)
      setCatalog(data)
      setCatalogKey(key)
      // Pin as recent + persist for next launch.
      setRecentCatalogs((prev) => {
        const next = [key, ...prev.filter((k) => k !== key)].slice(0, 5)
        rpc.request(C.CMD_USERDATA_SET_SETTINGS, {
          updates: { lastCatalogKey: key, recentCatalogs: next }
        }).catch(() => {})
        return next
      })
    } catch (e) {
      setErr(`catalog: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  // First mount: fetch installed list + recent catalogs, then auto-load
  // the most recent catalog so the Apps tab isn't empty on every launch.
  useEffect(() => {
    refreshInstalled()
    ;(async () => {
      try {
        const settings = await rpc.request(C.CMD_USERDATA_GET_SETTINGS)
        const recent = Array.isArray(settings?.recentCatalogs) ? settings.recentCatalogs : []
        const last = settings?.lastCatalogKey
        if (recent.length) setRecentCatalogs(recent)
        if (last) await loadCatalog(last)
      } catch {
        // user-data not ready yet — first-launch / boot races. The user
        // can still paste a key by hand below.
      } finally {
        setAutoLoadAttempted(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const installApp = async (app) => {
    setErr(''); setBusy(`install:${app.id}`)
    try {
      await rpc.request(C.CMD_INSTALL_APP, app, 120000)
      await refreshInstalled()
    } catch (e) {
      setErr(`install ${app.name}: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const uninstallApp = async (app) => {
    setErr(''); setBusy(`uninstall:${app.id}`)
    try {
      await rpc.request(C.CMD_UNINSTALL_APP, { id: app.id })
      await refreshInstalled()
    } catch (e) {
      setErr(`uninstall ${app.name}: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const launchApp = async (app) => {
    setErr(''); setBusy(`launch:${app.id}`)
    try {
      const res = await rpc.request(C.CMD_LAUNCH_APP, { id: app.id })
      onLaunch(res.localUrl)
    } catch (e) {
      setErr(`launch ${app.name}: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const isInstalled = (id) => installed.some((a) => a.id === id)

  return html`
    <div class="apps">
      <h1>Apps</h1>
      <p class="subtitle">Launch any Pear app by link, or browse a HiveRelay catalog.</p>

      <h2>Featured</h2>
      <div class="app-grid">
        ${FEATURED_APPS.map((app) => html`
          <div class="app-card" key=${app.id}>
            <div class="app-icon app-icon-fallback" style=${{ background: app.gradient, color: '#0b0e14' }}>${app.initial}</div>
            <div class="app-info">
              <div class="app-name">${app.name}</div>
              <div class="app-desc">${app.tagline}</div>
              <div class="app-meta" title=${app.link}>${app.link.slice(0, 20)}…${app.link.slice(-6)}</div>
            </div>
            <div class="app-actions">
              <button class="btn primary" onClick=${() => launchPearLink(app.link)} disabled=${busy === 'pear-link'}>Launch</button>
            </div>
          </div>
        `)}
      </div>

      <h2>Launch a Pear app</h2>
      <div class="catalog-loader">
        <input
          type="text"
          placeholder=${'pear://<key> — opens in a new window'}
          value=${pearLink}
          onInput=${(e) => setPearLink(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && launchPearLink()}
          spellcheck="false"
        />
        <button class="btn primary" onClick=${launchPearLink} disabled=${!pearLink || busy === 'pear-link'}>
          ${busy === 'pear-link' ? 'Launching…' : 'Launch'}
        </button>
      </div>
      ${launched && html`<div class="apps-ok">${launched}</div>`}

      <h2>App Catalog</h2>
      <div class="catalog-loader">
        <input
          type="text"
          placeholder="Catalog drive key (hex or z32)"
          value=${catalogKey}
          onInput=${(e) => setCatalogKey(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && loadCatalog()}
          spellcheck="false"
        />
        <button class="btn primary" onClick=${() => loadCatalog()} disabled=${!catalogKey || busy === 'catalog'}>
          ${busy === 'catalog' ? 'Loading…' : 'Load catalog'}
        </button>
      </div>

      ${recentCatalogs.length > 0 && html`
        <div class="catalog-recent">
          ${recentCatalogs.map((k) => html`
            <button
              class=${'catalog-chip' + (k === catalogKey ? ' active' : '')}
              key=${k}
              title=${k}
              onClick=${() => loadCatalog(k)}
              disabled=${busy === 'catalog'}
            >${k.slice(0, 8)}…${k.slice(-4)}</button>
          `)}
        </div>
      `}

      ${err && html`<div class="apps-error">${err}</div>`}

      ${busy === 'catalog' && !catalog && html`
        <div class="catalog-loading">
          <span class="spinner"></span>
          <span>Loading catalog from peers…</span>
        </div>
      `}

      ${autoLoadAttempted && !catalog && !busy && !err && html`
        <div class="catalog-empty">
          <strong>No catalog loaded.</strong>
          Paste a catalog drive key above, or use one of the featured Pear apps to launch directly.
          The browser also remembers catalogs you've loaded before — they'll appear here next time.
        </div>
      `}

      ${catalog && html`
        <h2>${catalog.name || 'Catalog'} · ${catalog.apps?.length ?? 0} apps</h2>
        <div class="app-grid">
          ${(catalog.apps ?? []).map((app) => html`
            <div class="app-card" key=${app.id}>
              ${app.iconData
                ? html`<img src=${app.iconData} alt="" class="app-icon" />`
                : html`<div class="app-icon app-icon-fallback">${(app.name || '?').charAt(0)}</div>`}
              <div class="app-info">
                <div class="app-name">${app.name}</div>
                <div class="app-desc">${app.description || ''}</div>
                <div class="app-meta">${app.version ? 'v' + app.version : ''} ${app.author ? '· ' + app.author : ''}</div>
              </div>
              <div class="app-actions">
                ${isInstalled(app.id)
                  ? html`
                    <button class="btn" onClick=${() => launchApp(app)} disabled=${busy === `launch:${app.id}`}>Launch</button>
                    <button class="btn subtle" onClick=${() => uninstallApp(app)} disabled=${busy === `uninstall:${app.id}`}>Uninstall</button>
                  `
                  : html`
                    <button class="btn primary" onClick=${() => installApp(app)} disabled=${busy === `install:${app.id}`}>
                      ${busy === `install:${app.id}` ? 'Installing…' : 'Install'}
                    </button>
                  `}
              </div>
            </div>
          `)}
        </div>
      `}

      <h2>Installed</h2>
      ${installed.length === 0
        ? html`<p class="placeholder">No apps installed yet.</p>`
        : html`<div class="app-grid">
            ${installed.map((app) => html`
              <div class="app-card" key=${app.id}>
                <div class="app-icon app-icon-fallback">${(app.name || '?').charAt(0)}</div>
                <div class="app-info">
                  <div class="app-name">${app.name}</div>
                  <div class="app-meta">v${app.version || '?'}</div>
                </div>
                <div class="app-actions">
                  <button class="btn" onClick=${() => launchApp(app)} disabled=${busy === `launch:${app.id}`}>Launch</button>
                  <button class="btn subtle" onClick=${() => uninstallApp(app)} disabled=${busy === `uninstall:${app.id}`}>Uninstall</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `
}

function Library ({ rpc, C, onBrowse }) {
  const [bookmarks, setBookmarks] = useState([])
  const [history, setHistory] = useState([])
  const [err, setErr] = useState('')

  const refresh = async () => {
    try {
      const b = await rpc.request(C.CMD_USERDATA_LIST_BOOKMARKS)
      setBookmarks(Array.isArray(b) ? b : (b?.bookmarks ?? []))
      const h = await rpc.request(C.CMD_USERDATA_LIST_HISTORY, { limit: 200 })
      setHistory(Array.isArray(h) ? h : (h?.history ?? []))
    } catch (e) {
      setErr(e.message)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  const removeBookmark = async (url) => {
    try {
      await rpc.request(C.CMD_USERDATA_REMOVE_BOOKMARK, { url })
      refresh()
    } catch (e) { setErr(e.message) }
  }

  const clearHistory = async () => {
    if (!confirm('Clear all browsing history?')) return
    try {
      await rpc.request(C.CMD_USERDATA_CLEAR_HISTORY)
      refresh()
    } catch (e) { setErr(e.message) }
  }

  return html`
    <div class="library">
      <h1>Library</h1>
      <p class="subtitle">Your saved bookmarks and recent browsing history, stored locally in your Hyperbee.</p>
      ${err && html`<div class="apps-error">${err}</div>`}

      <h2>Bookmarks (${bookmarks.length})</h2>
      ${bookmarks.length === 0
        ? html`<p class="placeholder">No bookmarks yet. In the Browse tab, right-click the URL bar to bookmark the current page (coming soon) — or use the button on a hyperdrive page.</p>`
        : html`<div class="library-list">
            ${bookmarks.map((b) => html`
              <div class="library-row" key=${b.url}>
                <div class="library-row-main">
                  <div class="library-title">${b.title || b.url}</div>
                  <div class="library-url">${b.url}</div>
                </div>
                <button class="btn small" onClick=${() => onBrowse(b.url)}>Open</button>
                <button class="btn small subtle" onClick=${() => removeBookmark(b.url)}>Remove</button>
              </div>
            `)}
          </div>`}

      <div class="library-history-head">
        <h2>History (${history.length})</h2>
        ${history.length > 0 && html`<button class="btn small subtle" onClick=${clearHistory}>Clear history</button>`}
      </div>
      ${history.length === 0
        ? html`<p class="placeholder">No browsing history yet.</p>`
        : html`<div class="library-list">
            ${history.slice(0, 100).map((h, i) => html`
              <div class="library-row" key=${(h.url || '') + ':' + i}>
                <div class="library-row-main">
                  <div class="library-title">${h.title || h.url}</div>
                  <div class="library-url">${h.url} ${h.visitedAt ? '· ' + new Date(h.visitedAt).toLocaleString() : ''}</div>
                </div>
                <button class="btn small" onClick=${() => onBrowse(h.url)}>Open</button>
              </div>
            `)}
          </div>`}
    </div>
  `
}

// --- Settings sub-sections -----------------------------------------------
//
// Three additions that surface backend power that's been there for a while:
//
//   - ProfileSection      Edit display name / bio / avatar URL / website /
//                         email — what apps see when you grant a login.
//   - ConnectedAppsSection View per-app login grants and revoke them
//                         individually or all at once.
//   - RelaysSection       Add/remove/reorder relay URLs, toggle hybrid fetch.
//
// All three call CMD_* handlers that already live in backend/index.js.

const PROFILE_FIELDS = [
  { key: 'name', label: 'Display name', placeholder: 'How apps will refer to you' },
  { key: 'bio', label: 'Bio', placeholder: 'A short bio (optional)', textarea: true },
  { key: 'avatar', label: 'Avatar URL', placeholder: 'https://… or hyper://… (optional)' },
  { key: 'website', label: 'Website', placeholder: 'https://your.site (optional)' },
  { key: 'email', label: 'Email', placeholder: 'name@example.com (optional)' }
]

function ProfileSection ({ rpc, C }) {
  const [profile, setProfile] = useState({})
  const [draft, setDraft] = useState({})
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setErr('')
    try {
      const res = await rpc.request(C.CMD_PROFILE_GET)
      const p = res?.profile || {}
      setProfile(p); setDraft(p)
    } catch (e) { setErr(`profile: ${e.message}`) }
  }
  useEffect(() => { load() }, [])

  const dirty = PROFILE_FIELDS.some(({ key }) => (draft[key] || '') !== (profile[key] || ''))

  const save = async () => {
    setErr(''); setNotice(''); setBusy('save')
    try {
      const updates = {}
      for (const { key } of PROFILE_FIELDS) {
        const v = (draft[key] || '').trim()
        if (v !== (profile[key] || '')) updates[key] = v
      }
      const res = await rpc.request(C.CMD_PROFILE_UPDATE, { updates })
      const p = res?.profile || updates
      setProfile(p); setDraft(p)
      setNotice('Saved.')
      setTimeout(() => setNotice(''), 1500)
    } catch (e) { setErr(`save: ${e.message}`) }
    finally { setBusy(null) }
  }

  const clearAll = async () => {
    if (!confirm('Clear ALL profile fields? Apps that already have grants will see empty values from now on.')) return
    setErr(''); setBusy('clear')
    try {
      await rpc.request(C.CMD_PROFILE_CLEAR)
      setProfile({}); setDraft({})
      setNotice('Profile cleared.')
      setTimeout(() => setNotice(''), 1500)
    } catch (e) { setErr(`clear: ${e.message}`) }
    finally { setBusy(null) }
  }

  return html`
    <div class="settings-card">
      ${err && html`<div class="apps-error">${err}</div>`}
      ${notice && html`<div class="apps-ok">${notice}</div>`}
      ${PROFILE_FIELDS.map(({ key, label, placeholder, textarea }) => html`
        <div class="settings-row" key=${key}>
          <div class="profile-field">
            <div class="settings-label">${label}</div>
            ${textarea
              ? html`<textarea
                  class="profile-input"
                  rows="2"
                  placeholder=${placeholder}
                  value=${draft[key] || ''}
                  onInput=${(e) => setDraft({ ...draft, [key]: e.target.value })}
                ></textarea>`
              : html`<input
                  type="text"
                  class="profile-input"
                  placeholder=${placeholder}
                  value=${draft[key] || ''}
                  onInput=${(e) => setDraft({ ...draft, [key]: e.target.value })}
                />`}
          </div>
        </div>
      `)}
      <div class="settings-row settings-row-actions">
        <button class="btn subtle" onClick=${clearAll} disabled=${busy !== null}>
          ${busy === 'clear' ? 'Clearing…' : 'Clear all'}
        </button>
        <button class="btn primary" onClick=${save} disabled=${!dirty || busy !== null}>
          ${busy === 'save' ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  `
}

function ConnectedAppsSection ({ rpc, C }) {
  // Login grants — apps the user has signed into.
  const [grants, setGrants] = useState([])
  // Swarm grants — apps that hold persisted Tier C topic-join consents.
  const [swarmGrants, setSwarmGrants] = useState([])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    setErr('')
    try {
      const [loginRes, swarmRes] = await Promise.all([
        rpc.request(C.CMD_LOGIN_LIST_GRANTS),
        rpc.request(C.CMD_SWARM_LIST_GRANTS).catch(() => ({ grants: [] }))
      ])
      setGrants(Array.isArray(loginRes?.grants) ? loginRes.grants : [])
      setSwarmGrants(Array.isArray(swarmRes?.grants) ? swarmRes.grants : [])
    } catch (e) { setErr(`grants: ${e.message}`) }
    finally { setLoaded(true) }
  }
  useEffect(() => { load() }, [])

  const revoke = async (grant) => {
    const label = grant.appName || shortKey(grant.driveKey)
    if (!confirm(`Revoke ${label}? Next time it tries to sign in you'll be asked again.`)) return
    setErr(''); setBusy(`revoke:${grant.driveKey}`)
    try {
      await rpc.request(C.CMD_LOGIN_REVOKE_GRANT, { driveKeyHex: grant.driveKey })
      await load()
    } catch (e) { setErr(`revoke: ${e.message}`) }
    finally { setBusy(null) }
  }

  const revokeAll = async () => {
    if (grants.length === 0) return
    if (!confirm(`Revoke ALL ${grants.length} grant(s)? Every connected app will need to ask for sign-in again.`)) return
    setErr(''); setBusy('revoke-all')
    try {
      await rpc.request(C.CMD_LOGIN_REVOKE_ALL)
      await load()
    } catch (e) { setErr(`revoke-all: ${e.message}`) }
    finally { setBusy(null) }
  }

  const revokeSwarmGrant = async (g) => {
    const label = g.appName || shortKey(g.driveKey)
    if (!confirm(`Revoke ${label}'s access to topic ${shortKey(g.topicHex)}? It will need to ask again on next join.`)) return
    setErr(''); setBusy(`swarm-revoke:${g.driveKey}:${g.topicHex}`)
    try {
      await rpc.request(C.CMD_SWARM_REVOKE_GRANT, { driveKey: g.driveKey, topicHex: g.topicHex })
      await load()
    } catch (e) { setErr(`swarm-revoke: ${e.message}`) }
    finally { setBusy(null) }
  }

  // Group swarm grants by app for a tighter visual.
  const swarmByApp = new Map()
  for (const g of swarmGrants) {
    const key = g.driveKey
    if (!swarmByApp.has(key)) swarmByApp.set(key, [])
    swarmByApp.get(key).push(g)
  }

  return html`
    <div class="settings-card">
      ${err && html`<div class="apps-error">${err}</div>`}

      <div class="settings-subsection-label">Sign-in grants</div>
      ${!loaded
        ? html`<div class="settings-subtle">Loading…</div>`
        : grants.length === 0
          ? html`<div class="settings-subtle">No apps have asked you to sign in yet.</div>`
          : html`
            ${grants.map((g) => html`
              <div class="settings-row" key=${g.driveKey}>
                <div>
                  <div class="settings-label">${g.appName || shortKey(g.driveKey)}</div>
                  <div class="settings-subtle">
                    <code class="settings-code">${shortKey(g.driveKey)}</code>
                    · ${(g.scopes || []).join(', ') || 'sign-in only'}
                    ${g.expiresAt ? html` · expires ${new Date(g.expiresAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <button class="btn subtle danger" onClick=${() => revoke(g)}
                        disabled=${busy === `revoke:${g.driveKey}`}>
                  ${busy === `revoke:${g.driveKey}` ? 'Revoking…' : 'Revoke'}
                </button>
              </div>
            `)}
            <div class="settings-row settings-row-actions">
              <button class="btn subtle danger" onClick=${revokeAll} disabled=${busy === 'revoke-all'}>
                ${busy === 'revoke-all' ? 'Revoking all…' : 'Revoke all'}
              </button>
            </div>
          `}

      <div class="settings-subsection-label">Swarm topic grants</div>
      ${!loaded
        ? html`<div class="settings-subtle">Loading…</div>`
        : swarmGrants.length === 0
          ? html`<div class="settings-subtle">No swarm topic grants. Apps using only drive-derived (Tier A) topics never appear here.</div>`
          : html`
            ${[...swarmByApp.entries()].map(([driveKey, list]) => html`
              <div class="swarm-grant-app" key=${driveKey}>
                <div class="settings-label">${list[0].appName || shortKey(driveKey)}</div>
                <div class="settings-subtle"><code class="settings-code">${shortKey(driveKey)}</code> — ${list.length} topic${list.length === 1 ? '' : 's'}</div>
                ${list.map((g) => html`
                  <div class="settings-row swarm-grant-row" key=${g.topicHex}>
                    <div>
                      <code class="settings-code">${g.protocol || 'pear.swarm.v1'} · ${shortKey(g.topicHex)}</code>
                      <div class="settings-subtle">
                        Granted ${new Date(g.grantedAt).toLocaleDateString()}
                        ${g.lastUsedAt && g.lastUsedAt !== g.grantedAt ? html` · last used ${new Date(g.lastUsedAt).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    <button class="btn subtle danger" onClick=${() => revokeSwarmGrant(g)}
                            disabled=${busy === `swarm-revoke:${g.driveKey}:${g.topicHex}`}>
                      ${busy === `swarm-revoke:${g.driveKey}:${g.topicHex}` ? 'Revoking…' : 'Revoke'}
                    </button>
                  </div>
                `)}
              </div>
            `)}
          `}
    </div>
  `
}

function RelaysSection ({ rpc, C }) {
  const [config, setConfig] = useState({ relays: [], enabled: true })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    setErr('')
    try {
      const res = await rpc.request(C.CMD_GET_RELAYS)
      setConfig({
        relays: Array.isArray(res?.relays) ? res.relays : [],
        enabled: res?.enabled !== false
      })
    } catch (e) { setErr(`relays: ${e.message}`) }
    finally { setLoaded(true) }
  }
  useEffect(() => { load() }, [])

  const setRelays = async (next) => {
    setErr(''); setBusy('save')
    try {
      const res = await rpc.request(C.CMD_SET_RELAYS, { relays: next })
      setConfig({
        relays: Array.isArray(res?.relays) ? res.relays : next,
        enabled: res?.enabled !== false
      })
    } catch (e) { setErr(`set: ${e.message}`) }
    finally { setBusy(null) }
  }

  const toggleEnabled = async (enabled) => {
    setErr(''); setBusy('toggle')
    try {
      await rpc.request(C.CMD_SET_RELAY_ENABLED, { enabled })
      setConfig((c) => ({ ...c, enabled }))
    } catch (e) { setErr(`toggle: ${e.message}`) }
    finally { setBusy(null) }
  }

  const addRelay = async () => {
    const url = input.trim().replace(/\/$/, '')
    if (!url) return
    if (!/^https?:\/\//.test(url)) { setErr('Relay URLs must start with http:// or https://'); return }
    if (config.relays.includes(url)) { setErr('Already in the list.'); return }
    setInput('')
    await setRelays([...config.relays, url])
  }

  const removeRelay = async (url) => {
    if (config.relays.length <= 1) {
      if (!confirm('Removing your last relay will switch to pure-P2P mode (slower first paint). Continue?')) return
    }
    await setRelays(config.relays.filter((r) => r !== url))
  }

  return html`
    <div class="settings-card">
      ${err && html`<div class="apps-error">${err}</div>`}
      <div class="settings-row">
        <div>
          <div class="settings-label">${config.enabled ? 'Hybrid fetch' : 'Pure P2P mode'}</div>
          <div class="settings-subtle">${config.enabled
            ? 'Try a relay first (1-2s first paint), fall back to P2P. Recommended for most users.'
            : 'P2P only — slower first paint, no relay dependency. Toggle this on to use relays.'
          }</div>
        </div>
        <button class="btn subtle" onClick=${() => toggleEnabled(!config.enabled)} disabled=${busy === 'toggle'}>
          ${config.enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      ${loaded && config.relays.length === 0 && html`
        <div class="settings-subtle">No relays configured.</div>
      `}
      ${config.relays.map((url, idx) => html`
        <div class="settings-row" key=${url}>
          <div>
            <code class="settings-code">${url}</code>
            ${idx === 0 ? html`<span class="settings-pill">primary</span>` : ''}
          </div>
          ${config.relays.length > 1 ? html`
            <button class="btn subtle" onClick=${() => removeRelay(url)} disabled=${busy === 'save'}>
              Remove
            </button>
          ` : ''}
        </div>
      `)}
      <div class="settings-row">
        <input
          type="text"
          class="profile-input"
          placeholder="https://relay.example.com"
          value=${input}
          onInput=${(e) => setInput(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && addRelay()}
          spellcheck="false"
        />
        <button class="btn primary" onClick=${addRelay} disabled=${!input.trim() || busy === 'save'}>
          Add
        </button>
      </div>
    </div>
  `
}

function Settings ({ rpc, C, status, storagePath, log }) {
  const [identity, setIdentity] = useState(null)
  const [seedPhrase, setSeedPhrase] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(null)
  // Restore-from-phrase UX state.
  const [showRestore, setShowRestore] = useState(false)
  const [restoreInput, setRestoreInput] = useState('')
  const [restoreNotice, setRestoreNotice] = useState('')

  const refreshIdentity = () =>
    rpc.request(C.CMD_GET_IDENTITY).then(setIdentity).catch((e) => setErr(e.message))

  useEffect(() => { refreshIdentity() }, [])

  const revealPhrase = async () => {
    if (seedPhrase) { setSeedPhrase(null); return }
    setErr(''); setBusy('reveal')
    try {
      const res = await rpc.request(C.CMD_IDENTITY_EXPORT_PHRASE)
      setSeedPhrase(res.mnemonic)
    } catch (e) { setErr(e.message) }
    finally { setBusy(null) }
  }

  const validateAndRestore = async () => {
    const phrase = restoreInput.trim().split(/\s+/).join(' ')
    if (!phrase) return
    setErr(''); setRestoreNotice('')
    // Validate first so the user gets a clean error before we destroy anything.
    setBusy('restore-validate')
    try {
      const v = await rpc.request(C.CMD_IDENTITY_VALIDATE_PHRASE, { mnemonic: phrase })
      if (!v?.valid) {
        setErr('That phrase is not a valid 12 or 24-word BIP-39 mnemonic.')
        setBusy(null)
        return
      }
    } catch (e) {
      setErr(`validate: ${e.message}`); setBusy(null); return
    }
    if (!confirm('Restoring will REPLACE this device\'s identity.\n\nAll Hyperbees (bookmarks, history, profile, contacts) on this device stay in place but get re-keyed under the restored identity. This cannot be undone unless you also kept the previous backup phrase.\n\nProceed?')) {
      setBusy(null); return
    }
    setBusy('restore-apply')
    try {
      await rpc.request(C.CMD_IDENTITY_IMPORT_PHRASE, { mnemonic: phrase }, 30000)
      setRestoreInput('')
      setShowRestore(false)
      setSeedPhrase(null)
      setRestoreNotice('Identity restored. Your peer key has rotated — running apps may need to re-pair.')
      await refreshIdentity()
    } catch (e) {
      setErr(`restore: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const clearCache = async () => {
    if (!confirm('Clear all cached drives + proxy cache? Installed apps and your sites are NOT affected.')) return
    setErr(''); setBusy('cache')
    try {
      const res = await rpc.request(C.CMD_CLEAR_CACHE)
      alert(`Cleared: ${res.message || res.cleared + ' items'}`)
    } catch (e) { setErr(e.message) }
    finally { setBusy(null) }
  }

  const resetApp = async () => {
    if (!confirm('Reset app data?\n\nThis will:\n  1. Unseed every pinned site from HiveRelay\n  2. Wipe all local state (sites, apps, bookmarks, identity)\n  3. Quit the app\n\nCopy any drive keys you want to keep first!')) return
    if (!confirm('Are you ABSOLUTELY sure? This cannot be undone.')) return
    setErr(''); setBusy('reset')
    try {
      const res = await rpc.request(C.CMD_RESET_APP, {}, 60000)
      alert(`Unseeded ${res.unseeded?.length ?? 0} site(s). App will now quit. Relaunch to start fresh.`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(null)
    }
  }

  return html`
    <div class="settings">
      <h1>Settings</h1>
      <p class="subtitle">Identity, infrastructure, and diagnostics for your peer-to-peer browser.</p>
      ${err && html`<div class="apps-error">${err}</div>`}

      <h2>Identity</h2>
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="settings-label">Your peer public key</div>
            <code class="settings-code">${identity?.publicKey || '(loading…)'}</code>
          </div>
        </div>
      </div>

      <h2>Moving to a new device?</h2>
      <p class="subtitle">Your identity lives on this machine. To use the same identity on another computer or after a wipe, write down your 12-word backup phrase. Anyone with the phrase can sign in as you — store it like a password.</p>
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="settings-label">Backup phrase</div>
            <div class="settings-subtle">${identity?.hasBackupPhrase ? `${identity.mnemonicWordCount}-word BIP-39 mnemonic. Reveal once to write down — never display on a shared screen.` : 'not available'}</div>
          </div>
          <button class="btn" onClick=${revealPhrase} disabled=${busy === 'reveal' || !identity?.hasBackupPhrase}>
            ${seedPhrase ? 'Hide' : 'Reveal phrase'}
          </button>
        </div>
        ${seedPhrase && html`
          <pre class="seed-phrase">${seedPhrase}</pre>
          <div class="settings-warning">Write this down somewhere offline. Anyone with these words controls your identity — and we can't reset it for you.</div>
        `}
        <div class="settings-row">
          <div>
            <div class="settings-label">Restore from phrase</div>
            <div class="settings-subtle">Replace this device's identity with one recovered from a saved 12 or 24-word phrase. Use this on a fresh PearBrowser install to bring your existing identity over.</div>
          </div>
          <button class="btn subtle" onClick=${() => { setShowRestore((v) => !v); setRestoreNotice(''); setErr('') }}
                  disabled=${busy?.startsWith?.('restore')}>
            ${showRestore ? 'Cancel' : 'Restore…'}
          </button>
        </div>
        ${showRestore && html`
          <div class="restore-form">
            <textarea
              class="restore-textarea"
              placeholder="Paste your 12 or 24-word backup phrase here, separated by spaces"
              value=${restoreInput}
              rows="3"
              spellcheck="false"
              autocapitalize="none"
              onInput=${(e) => setRestoreInput(e.target.value)}
            ></textarea>
            <div class="restore-actions">
              <button class="btn primary" onClick=${validateAndRestore}
                      disabled=${!restoreInput.trim() || busy?.startsWith?.('restore')}>
                ${busy === 'restore-validate' ? 'Checking…' : busy === 'restore-apply' ? 'Restoring…' : 'Restore identity'}
              </button>
            </div>
            <div class="settings-warning">This destroys the current identity on disk. Make sure you've saved its phrase first.</div>
          </div>
        `}
        ${restoreNotice && html`<div class="apps-ok">${restoreNotice}</div>`}
      </div>

      <h2>Profile</h2>
      <p class="subtitle">What apps see when you grant a sign-in. Each field is opt-in — leave blank to share nothing.</p>
      <${ProfileSection} rpc=${rpc} C=${C} />

      <h2>Connected Apps</h2>
      <p class="subtitle">Pear apps that have been granted access to your identity. Revoke any time.</p>
      <${ConnectedAppsSection} rpc=${rpc} C=${C} />

      <h2>Relays</h2>
      <p class="subtitle">HiveRelay endpoints used for fast first-paint and persistence. Hybrid mode falls back to pure P2P if a relay is down.</p>
      <${RelaysSection} rpc=${rpc} C=${C} />

      <h2>HiveRelay Network</h2>
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="settings-label">Connected relays</div>
            <div class="settings-subtle">${status.hiveRelays || 0} HiveRelay(s) reachable via the DHT right now</div>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Default replication factor</div>
            <div class="settings-subtle">3 relays per published site (configurable per-publish in a future release)</div>
          </div>
        </div>
      </div>

      <h2>Live status</h2>
      <pre class="boot-log">${JSON.stringify(status, null, 2)}</pre>

      <h2>Storage</h2>
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="settings-label">Path</div>
            <code class="settings-code">${storagePath}</code>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Usage</div>
            <div class="settings-subtle">${status.storageUsed ? (status.storageUsed / 1048576).toFixed(1) + ' MB' : '—'} / ${status.storageLimit ? (status.storageLimit / 1048576).toFixed(0) + ' MB' : '—'}</div>
          </div>
          <button class="btn subtle" onClick=${clearCache} disabled=${busy === 'cache'}>Clear cache</button>
        </div>
      </div>

      <h2>Danger zone</h2>
      <div class="settings-card danger">
        <div class="settings-row">
          <div>
            <div class="settings-label">Reset app data</div>
            <div class="settings-subtle">Unseeds every published site from HiveRelay first (only possible while your publisher keypair is intact), then wipes local storage and quits. You'll start fresh on next launch. <strong>Copy your drive keys before doing this.</strong></div>
          </div>
          <button class="btn subtle danger" onClick=${resetApp} disabled=${busy === 'reset'}>${busy === 'reset' ? 'Resetting…' : 'Reset data'}</button>
        </div>
      </div>

      <h2>Boot log</h2>
      <pre class="boot-log">${log.join('\n') || '(events arrived pre-mount — check status above)'}</pre>
    </div>
  `
}

const BLOCK_TEMPLATES = {
  heading: () => ({ type: 'heading', level: 1, text: 'New heading' }),
  text: () => ({ type: 'text', text: 'Write something.' }),
  image: () => ({ type: 'image', src: 'https://', alt: '' }),
  link: () => ({ type: 'link', href: 'https://', text: 'Link text' }),
  html: () => ({ type: 'html', text: '<div>\n  <!-- Raw HTML / CSS / JS — rendered as-is -->\n</div>' }),
  code: () => ({ type: 'code', text: '// code sample — shown as text' }),
  quote: () => ({ type: 'quote', text: 'A quote.' }),
  list: () => ({ type: 'list', items: ['Item 1', 'Item 2'] }),
  divider: () => ({ type: 'divider' })
}

function BlockEditor ({ block, onChange }) {
  const update = (patch) => onChange({ ...block, ...patch })
  switch (block.type) {
    case 'heading':
      return html`
        <div class="block-fields">
          <select value=${block.level} onChange=${(e) => update({ level: +e.target.value })}>
            ${[1, 2, 3].map((n) => html`<option value=${n}>H${n}</option>`)}
          </select>
          <input type="text" value=${block.text} onInput=${(e) => update({ text: e.target.value })} />
        </div>
      `
    case 'text':
    case 'quote':
    case 'code':
    case 'html':
      return html`<textarea rows=${block.type === 'html' ? 8 : (block.type === 'code' ? 4 : 2)} value=${block.text} placeholder=${block.type === 'html' ? 'Paste raw HTML, CSS, or <script> — rendered as part of the page' : ''} onInput=${(e) => update({ text: e.target.value })}></textarea>`
    case 'image':
      return html`
        <div class="block-fields">
          <input type="text" placeholder="src (https://…)" value=${block.src} onInput=${(e) => update({ src: e.target.value })} />
          <input type="text" placeholder="alt text" value=${block.alt} onInput=${(e) => update({ alt: e.target.value })} />
        </div>
      `
    case 'link':
      return html`
        <div class="block-fields">
          <input type="text" placeholder="href" value=${block.href} onInput=${(e) => update({ href: e.target.value })} />
          <input type="text" placeholder="text" value=${block.text} onInput=${(e) => update({ text: e.target.value })} />
        </div>
      `
    case 'list':
      return html`<textarea rows=${Math.max(2, block.items.length)} placeholder="One item per line" value=${block.items.join('\n')} onInput=${(e) => update({ items: e.target.value.split('\n') })}></textarea>`
    case 'divider':
      return html`<div class="placeholder">— divider —</div>`
    default:
      return html`<div class="placeholder">unknown block: ${block.type}</div>`
  }
}

function SiteEditor ({ site, rpc, C, onBack, onBrowse }) {
  const [name, setName] = useState(site.name || '')
  const [blocks, setBlocks] = useState(site.blocks || [])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [meta, setMeta] = useState({ keyHex: site.keyHex, published: site.published })
  const [loaded, setLoaded] = useState(!site.published)

  useEffect(() => {
    if (loaded || !site.siteId) return
    ;(async () => {
      try {
        const res = await rpc.request(C.CMD_GET_SITE_BLOCKS, { siteId: site.siteId })
        if (Array.isArray(res?.blocks) && res.blocks.length > 0) setBlocks(res.blocks)
      } catch {}
      setLoaded(true)
    })()
  }, [site.siteId])

  const addBlock = (type) => setBlocks((b) => [...b, BLOCK_TEMPLATES[type]()])
  const updateBlock = (i, next) => setBlocks((b) => b.map((x, j) => j === i ? next : x))
  const removeBlock = (i) => setBlocks((b) => b.filter((_, j) => j !== i))
  const moveBlock = (i, dir) => setBlocks((b) => {
    const j = i + dir
    if (j < 0 || j >= b.length) return b
    const next = [...b]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const save = async () => {
    setErr(''); setBusy('save')
    try {
      await rpc.request(C.CMD_UPDATE_SITE, { siteId: site.siteId, blocks, name })
    } catch (e) {
      setErr(`save: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const publish = async () => {
    setErr(''); setBusy('publish')
    try {
      await rpc.request(C.CMD_UPDATE_SITE, { siteId: site.siteId, blocks, name })
      const res = await rpc.request(C.CMD_PUBLISH_SITE, { siteId: site.siteId }, 120000)
      setMeta({ keyHex: res.keyHex, published: true, pin: res.pin })
    } catch (e) {
      setErr(`publish: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const unpublish = async () => {
    setErr(''); setBusy('unpublish')
    try {
      await rpc.request(C.CMD_UNPUBLISH_SITE, { siteId: site.siteId })
      setMeta((m) => ({ ...m, published: false }))
    } catch (e) {
      setErr(`unpublish: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  return html`
    <div class="site-editor">
      <div class="site-editor-bar">
        <button class="btn subtle" onClick=${onBack}>← Sites</button>
        <input class="site-name-input" type="text" placeholder="Site name" value=${name} onInput=${(e) => setName(e.target.value)} />
        <div class="spacer"></div>
        <button class="btn" onClick=${save} disabled=${busy === 'save'} title="Write block changes to the drive — peers see updates live">${busy === 'save' ? 'Saving…' : 'Save'}</button>
        ${meta.published
          ? html`<button class="btn subtle" onClick=${unpublish} disabled=${busy === 'unpublish'}>${busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}</button>`
          : html`<button class="btn primary" onClick=${publish} disabled=${busy === 'publish'} title="Seeds via Hyperswarm and pins to HiveRelay for 24/7 availability">${busy === 'publish' ? 'Publishing…' : 'Publish & Pin'}</button>`}
      </div>

      ${err && html`<div class="apps-error">${err}</div>`}

      ${meta.published && meta.keyHex && html`
        <div class="site-published">
          <div class="site-published-row">
            <span>Published at</span>
            <code>hyper://${meta.keyHex}/</code>
            <button class="btn small" onClick=${() => copyText(`hyper://${meta.keyHex}/`)} title="Copy hyper:// URL">📋 Copy</button>
            <button class="btn" onClick=${() => onBrowse(`hyper://${meta.keyHex}/`)}>Open in Browse</button>
          </div>
          <div class="site-published-row subtle">
            <span>Drive key</span>
            <code class="key-mono">${meta.keyHex}</code>
            <button class="btn small subtle" onClick=${() => copyText(meta.keyHex)} title="Copy raw key">📋 Key</button>
          </div>
          <div class="site-pin-row ${meta.pin?.replicatedPeers > 0 ? 'ok' : 'warn'}">
            ${meta.pin?.replicatedPeers > 0
              ? html`<span>📌 Replicated to ${meta.pin.replicatedPeers} HiveRelay peer${meta.pin.replicatedPeers === 1 ? '' : 's'} (of ${meta.pin.acceptances} accepted). Safe to close the app — stays online 24/7.</span>`
              : meta.pin?.ok
                ? html`<span>📡 <strong>${meta.pin.acceptances} relay${meta.pin.acceptances === 1 ? '' : 's'} accepted</strong> your pin request, but none have pulled the content yet. The public HiveRelay network may take minutes or may not replicate at all. Your site is reachable via Hyperswarm as long as this app is running. Share your drive key now; keep the app open until you're sure someone's replicated it.</span>`
                : html`<span>⚠️ Seeded P2P locally only. ${meta.pin?.connectedRelays > 0 ? `Connected to ${meta.pin.connectedRelays} relay(s) but none accepted the seed request.` : 'No HiveRelays connected yet; retry in a moment.'} Site is reachable while this app is running.</span>`}
          </div>
          <div class="site-save-warning">
            💾 <strong>Save this key now.</strong> It's the only way to recover this site if you reset app data. Anyone with the key can reach your site; only this machine's publisher keypair can unseed it.
          </div>
        </div>
      `}

      <div class="blocks">
        ${blocks.length === 0 && html`<p class="placeholder">No blocks yet. Add one below.</p>`}
        ${blocks.map((block, i) => html`
          <div class="block" key=${i}>
            <div class="block-header">
              <span class="block-type">${block.type}</span>
              <div class="spacer"></div>
              <button class="btn subtle small" onClick=${() => moveBlock(i, -1)} disabled=${i === 0}>↑</button>
              <button class="btn subtle small" onClick=${() => moveBlock(i, 1)} disabled=${i === blocks.length - 1}>↓</button>
              <button class="btn subtle small" onClick=${() => removeBlock(i)}>✕</button>
            </div>
            <${BlockEditor} block=${block} onChange=${(next) => updateBlock(i, next)} />
          </div>
        `)}
      </div>

      <div class="add-block-row">
        <span class="placeholder">Add:</span>
        ${Object.keys(BLOCK_TEMPLATES).map((t) => html`
          <button class="btn subtle small" onClick=${() => addBlock(t)}>${t}</button>
        `)}
      </div>
    </div>
  `
}

function Sites ({ rpc, C, onBrowse }) {
  const [sites, setSites] = useState([])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [newName, setNewName] = useState('')
  // Callback ref stored in a ref-box so htm definitely wires it.
  const inputBox = useRef({ el: null })
  const setInputRef = (el) => { inputBox.current.el = el }

  const refresh = async () => {
    try {
      const list = await rpc.request(C.CMD_LIST_SITES)
      setSites(Array.isArray(list) ? list : (list?.sites ?? []))
    } catch (e) {
      setErr(`list: ${e.message}`)
    }
  }

  useEffect(() => { refresh() }, [])

  const createSite = async () => {
    if (busy === 'create') return
    const el = document.querySelector('.site-name-field')
    const raw = el?.value ?? ''
    const n = raw.trim() || 'Untitled'
    setErr(''); setBusy('create')
    try {
      const res = await rpc.request(C.CMD_CREATE_SITE, { name: n }, 120000)
      if (el) el.value = ''
      await refresh()
      setEditing({ siteId: res.siteId ?? res.id, name: n, blocks: [] })
    } catch (e) {
      setErr(`create: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const deleteSite = async (site) => {
    if (!confirm(`Delete "${site.name}"?`)) return
    setErr(''); setBusy(`del:${site.siteId}`)
    try {
      await rpc.request(C.CMD_DELETE_SITE, { siteId: site.siteId })
      await refresh()
    } catch (e) {
      setErr(`delete: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  if (editing) {
    return html`<${SiteEditor} site=${editing} rpc=${rpc} C=${C} onBack=${() => { setEditing(null); refresh() }} onBrowse=${onBrowse} />`
  }

  return html`
    <div class="sites">
      <h1>Sites</h1>
      <p class="subtitle">Browse P2P sites or create your own — published to the HiveRelay network for 24/7 availability.</p>
      <div class="catalog-loader">
        <input
          class="site-name-field"
          type="text"
          placeholder="New site name…"
          onKeyDown=${(e) => e.key === 'Enter' && createSite()}
        />
        <button class="btn primary" onClick=${createSite} disabled=${busy === 'create'}>
          ${busy === 'create' ? 'Creating…' : 'Create site'}
        </button>
      </div>
      ${err && html`<div class="apps-error">${err}</div>`}

      ${sites.length === 0
        ? html`<p class="placeholder">No sites yet. Create one above.</p>`
        : html`<div class="app-grid">
            ${sites.map((site) => html`
              <div class="app-card" key=${site.siteId}>
                <div class="app-icon app-icon-fallback">${(site.name || '?').charAt(0)}</div>
                <div class="app-info">
                  <div class="app-name">${site.name}</div>
                  <div class="app-meta">${site.published ? 'published · ' + (site.keyHex?.slice(0, 8) ?? '') + '…' : 'draft'}</div>
                </div>
                <div class="app-actions">
                  <button class="btn" onClick=${() => setEditing(site)}>Edit</button>
                  ${site.published && site.keyHex && html`<button class="btn subtle" onClick=${() => onBrowse(`hyper://${site.keyHex}/`)}>Open</button>`}
                  ${site.published && site.keyHex && html`<button class="btn subtle" onClick=${() => copyText(`hyper://${site.keyHex}/`)}>📋 Copy</button>`}
                  <button class="btn subtle" onClick=${() => deleteSite(site)} disabled=${busy === `del:${site.siteId}`}>Delete</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `
}

export function App ({ rpc, C, storagePath }) {
  const [tab, setTab] = useState('browse')
  const [navUrl, setNavUrl] = useState(null)
  const [status, setStatus] = useState({ stage: 'booting', peerCount: 0, dhtConnected: false, ready: false, proxyPort: null })
  const [log, setLog] = useState([])
  // Login consent ceremony — populated when EVT_LOGIN_REQUEST fires.
  const [pendingLogin, setPendingLogin] = useState(null)
  // Swarm consent ceremony — populated when EVT_SWARM_REQUEST fires
  // (Tier C topic-join, see docs/SWARM-V1.md §4.3).
  const [pendingSwarm, setPendingSwarm] = useState(null)
  // Light-weight identity blob for showing "you" in the consent sheet.
  const [identity, setIdentity] = useState(null)
  // First-launch onboarding gate. Default 'pending' until we read the
  // user-data setting; only show the modal once we know definitively
  // it hasn't been completed (avoids a flash of onboarding after
  // user-data settings replicate).
  const [onboardingState, setOnboardingState] = useState('pending')

  // Browse tabs lifted to App level so:
  //   1. Switching to Apps/Settings/etc and back doesn't destroy them
  //      (Browse used to remount with a fresh tabs[] every time)
  //   2. We can persist them to user-data and restore across launches
  // Default initial state is one welcome tab; the restore-from-settings
  // step below replaces it once user-data is ready.
  const [tabs, setTabs] = useState(() => [makeTab(DEFAULT_URL)])
  const [browseActiveId, setBrowseActiveId] = useState(() => 'placeholder')
  // Tracks whether we've completed the one-time tabs-restore from
  // user-data so the persistence effect doesn't overwrite saved state
  // with the placeholder during boot.
  const [tabsRestored, setTabsRestored] = useState(false)

  useEffect(() => {
    const appendLog = (line) => setLog((l) => [...l.slice(-200), line])

    const onBoot = (e) => { appendLog(`[${e.detail.stage}] ${e.detail.message || ''}`); setStatus((s) => ({ ...s, stage: e.detail.stage })) }
    const onReady = (e) => {
      appendLog(`[ready] HTTP proxy on port ${e.detail.port}`)
      setStatus((s) => ({ ...s, ready: true, proxyPort: e.detail.port, stage: 'ready' }))
      // Identity is ready by the time READY fires — fetch it once for
      // the login-consent sheet to show "Signing in as <pubkey>".
      rpc.request(C.CMD_GET_IDENTITY).then(setIdentity).catch(() => {})
      // Decide whether to show the first-launch onboarding overlay.
      // Settings live in the user-data Hyperbee — once it's ready we
      // either show the onboarding (first launch) or skip it.
      rpc.request(C.CMD_USERDATA_GET_SETTINGS).then((s) => {
        setOnboardingState(s?.onboardingDone ? 'done' : 'show')
        // Session restore: rehydrate browse tabs from previous session.
        // We only restore the URL list — history/scroll/iframe-src are
        // recreated on first navigation. Skip if no saved tabs (first
        // run) or if the saved list is empty.
        const savedTabs = Array.isArray(s?.browseTabs) ? s.browseTabs : null
        if (savedTabs && savedTabs.length > 0) {
          const restored = savedTabs
            .filter((t) => t && typeof t.url === 'string')
            .map((t) => {
              const fresh = makeTab(t.url || '')
              fresh.displayUrl = t.displayUrl || t.url || ''
              fresh.title = t.title || fresh.title
              return fresh
            })
          if (restored.length > 0) {
            setTabs(restored)
            // Resume on whichever tab was active last time, fall back to first.
            const targetIdx = Math.max(0, Math.min(
              savedTabs.findIndex((t) => t && t.active === true),
              restored.length - 1
            ))
            setBrowseActiveId(restored[targetIdx].id)
          }
        }
      }).catch(() => {
        // Couldn't read settings — be conservative and skip onboarding
        // rather than show it on every launch when the bee is broken.
        setOnboardingState('done')
      }).finally(() => {
        setTabsRestored(true)
      })
    }
    const onPeer = (e) => setStatus((s) => ({ ...s, peerCount: e.detail.peerCount }))
    const onErr = (e) => appendLog(`[error] ${e.detail?.message || JSON.stringify(e.detail)}`)
    const onLogin = (e) => {
      // Backend buffers events that arrive before the renderer connects,
      // so it's possible to see EVT_LOGIN_REQUEST during boot. Stash the
      // newest one — multiple concurrent consents are rare and we want
      // a single modal at a time.
      appendLog(`[login] ${e.detail?.appName || shortKey(e.detail?.driveKey)} requested ${(e.detail?.scopes || []).join(',') || 'sign-in'}`)
      setPendingLogin(e.detail)
    }
    const onSwarm = (e) => {
      // Tier C swarm-join consent (docs/SWARM-V1.md §4.3).
      appendLog(`[swarm] ${e.detail?.appName || shortKey(e.detail?.driveKey)} wants topic ${shortKey(e.detail?.topicHex || '')}`)
      setPendingSwarm(e.detail)
    }

    rpc.addEventListener(`event:${C.EVT_BOOT_PROGRESS}`, onBoot)
    rpc.addEventListener(`event:${C.EVT_READY}`, onReady)
    rpc.addEventListener(`event:${C.EVT_PEER_COUNT}`, onPeer)
    rpc.addEventListener(`event:${C.EVT_ERROR}`, onErr)
    rpc.addEventListener(`event:${C.EVT_LOGIN_REQUEST}`, onLogin)
    rpc.addEventListener(`event:${C.EVT_SWARM_REQUEST}`, onSwarm)

    const poll = setInterval(async () => {
      try {
        const s = await rpc.request(C.CMD_GET_STATUS)
        setStatus((prev) => ({ ...prev, ...s }))
      } catch {}
    }, 3000)

    return () => {
      clearInterval(poll)
      rpc.removeEventListener(`event:${C.EVT_BOOT_PROGRESS}`, onBoot)
      rpc.removeEventListener(`event:${C.EVT_READY}`, onReady)
      rpc.removeEventListener(`event:${C.EVT_PEER_COUNT}`, onPeer)
      rpc.removeEventListener(`event:${C.EVT_ERROR}`, onErr)
      rpc.removeEventListener(`event:${C.EVT_LOGIN_REQUEST}`, onLogin)
      rpc.removeEventListener(`event:${C.EVT_SWARM_REQUEST}`, onSwarm)
    }
  }, [rpc, C])

  // Persist tabs to user-data settings on change — debounced, only after
  // the initial restore has completed so we don't overwrite saved state
  // with the placeholder during boot.
  useEffect(() => {
    if (!tabsRestored) return
    const t = setTimeout(() => {
      const serialized = tabs.map((tab) => ({
        url: tab.url || '',
        displayUrl: tab.displayUrl || '',
        title: tab.title || 'New tab',
        active: tab.id === browseActiveId
      }))
      rpc.request(C.CMD_USERDATA_SET_SETTINGS, {
        updates: { browseTabs: serialized }
      }).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [tabs, browseActiveId, tabsRestored, rpc, C])

  const launchInBrowse = (url) => {
    setNavUrl(url)
    setTab('browse')
  }

  const isReady = status.ready || !!status.proxyPort
  const statusClass = !isReady ? 'booting' : (status.dhtConnected ? 'ok' : 'err')
  const statusText = !isReady
    ? `Booting: ${status.stage}`
    : `DHT · ${status.peerCount} peer${status.peerCount === 1 ? '' : 's'} · ${status.hiveRelays || 0} relay${status.hiveRelays === 1 ? '' : 's'} · proxy :${status.proxyPort}`

  return html`
    <div class="app">
      <div class="topbar">
        <div class="brand">
          <${Logo} size=${22} />
          <${Wordmark} />
        </div>
        <div class="tabs">
          ${Object.entries(TAB_META).map(([id, m]) => html`
            <button class=${'tab' + (tab === id ? ' active' : '')} onClick=${() => setTab(id)} key=${id}>
              <span class="tab-icon">${m.icon}</span>
              <span class="tab-label">${m.label}</span>
            </button>
          `)}
        </div>
        <div class="topbar-spacer"></div>
      </div>

      <div class=${'panel' + (tab === 'browse' ? ' panel-browse' : '')}>
        ${tab === 'browse' && html`<${Browse} rpc=${rpc} C=${C} navUrl=${navUrl} onNavigated=${() => setNavUrl(null)} tabs=${tabs} setTabs=${setTabs} activeId=${browseActiveId} setActiveId=${setBrowseActiveId} />`}
        ${tab === 'apps' && html`<${Apps} rpc=${rpc} C=${C} onLaunch=${launchInBrowse} />`}
        ${tab === 'sites' && html`<${Sites} rpc=${rpc} C=${C} onBrowse=${launchInBrowse} />`}
        ${tab === 'library' && html`<${Library} rpc=${rpc} C=${C} onBrowse=${launchInBrowse} />`}
        ${tab === 'settings' && html`<${Settings} rpc=${rpc} C=${C} status=${status} storagePath=${storagePath} log=${log} />`}
      </div>

      <div class=${'status ' + statusClass}>
        <span class="dot"></span>${statusText}
      </div>

      ${pendingLogin && html`<${LoginConsent}
        rpc=${rpc}
        C=${C}
        request=${pendingLogin}
        identity=${identity}
        onClose=${() => setPendingLogin(null)}
      />`}

      ${pendingSwarm && html`<${SwarmConsent}
        rpc=${rpc}
        C=${C}
        request=${pendingSwarm}
        identity=${identity}
        onClose=${() => setPendingSwarm(null)}
      />`}

      ${onboardingState === 'show' && html`<${Onboarding}
        rpc=${rpc}
        C=${C}
        onPickSite=${(url) => launchInBrowse(url)}
        onClose=${() => setOnboardingState('done')}
      />`}
    </div>
  `
}
