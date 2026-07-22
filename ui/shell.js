import { useEffect, useMemo, useRef, useState } from 'react'
import { html } from 'htm/react'
import { Logo, Wordmark } from './logo.js'
import { z32FromHex, hexFromZ32, formatBytes, shortKey, normalizeUrl, isClearnetUrl, driveKeyFromHyperRef, normalizeNameTarget, parseCatalogRef, catalogCacheKeyForRef, looksLikeName, parseSyncInvite, formatSyncInvite, parsePearname } from './lib/keys.js'
import {
  MAX_TAB_HISTORY, MAX_CLOSED_TABS,
  makeTab, cleanTabUrl, cleanTabTitle,
  normalizeTabHistory, clampHistoryIndex, pushTabHistory,
  normalizeTabSnapshot, serializeTab, restoreSavedTab, restoreStartupTabs, sortTabsPinnedFirst,
  tabDriveKey, tabListUsesDriveKey
} from './lib/tabs.js'
import {
  createAskStreamId,
  normalizePageContextResponse,
  createInitialAskStreamState,
  reduceAskStreamEvent,
  formatModelLabel,
  formatBytes as formatAskBytes,
  presentAskText
} from './lib/ask-browser.js'
import {
  summarizeAiCapabilities,
  pickQuickAskModel,
  describeAiStatus,
  buildQuickAskRequest
} from './lib/qvac-widget.js'
import { PRIVATE_SEARCH_PROVIDER, buildPrivateSearchUrl } from './lib/private-search.js'

function copyText (text) {
  try {
    navigator.clipboard?.writeText(text)
  } catch {}
}

const APPEARANCE_THEME_SETTING = 'appearanceTheme'
const APPEARANCE_THEME_STORAGE = 'pearbrowser.appearanceTheme'
const APPEARANCE_THEMES = new Set(['light', 'dark'])

function normalizeAppearanceTheme (theme) {
  return APPEARANCE_THEMES.has(theme) ? theme : 'light'
}

function readCachedAppearanceTheme () {
  try {
    return normalizeAppearanceTheme(localStorage.getItem(APPEARANCE_THEME_STORAGE))
  } catch {
    return 'light'
  }
}

function applyAppearanceTheme (theme) {
  const normalized = normalizeAppearanceTheme(theme)
  try {
    document.documentElement.dataset.theme = normalized
    document.documentElement.style.colorScheme = normalized
    localStorage.setItem(APPEARANCE_THEME_STORAGE, normalized)
  } catch {}
  return normalized
}

applyAppearanceTheme(readCachedAppearanceTheme())

// Legacy native apps remain discoverable, but their former remote application
// references are opaque migration identifiers. PearBrowser can never fetch or
// execute them; the publisher must provide a verified native v3 package.

const FEATURED_APPS = [
  {
    id: 'keet',
    name: 'Keet',
    nativeDelivery: { status: 'migration-required' },
    tagline: 'End-to-end encrypted P2P chat, voice, and video calls by Holepunch.',
    legacyMigrationId: 'oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo',
    initial: 'K',
    gradient: 'linear-gradient(135deg, #fbbf24, #f97316)'
  },
  {
    id: 'pearpass',
    name: 'PearPass',
    nativeDelivery: { status: 'migration-required' },
    tagline: 'Peer-to-peer password manager from Tether — synced across devices without a cloud.',
    legacyMigrationId: 'tywsat7gz8m65ejx4zjn3773pbdc4j8m66tukis8dgzekraymtzo',
    initial: 'P',
    gradient: 'linear-gradient(135deg, #3fb950, #58a6ff)'
  },
  // anonGPT — private P2P AI chat. Its legacy native release needs migration.
  // (The in-browser window.pear.anongpt buyer shim in backend/anongpt-buyer.js
  // is a separate hyper:// hosting path, not an executable delivery path.)
  {
    id: 'anongpt',
    name: 'anonGPT',
    nativeDelivery: { status: 'migration-required' },
    tagline: 'Private P2P AI chat — pay-per-inference from a HiveMind seller, with signed receipts.',
    legacyMigrationId: 'rpzh3fsgg38kfir9nmae7x3o8ubofddzzixr5js4mxd6a6drb6wo',
    initial: 'A',
    gradient: 'linear-gradient(135deg, #22d3ee, #6366f1)'
  },
  // Paste — local-first, E2E-encrypted notes & clipboard sync. Landing page
  // (hyper://25a06bb3…) is in the
  // default catalog as its homepage. Link MUST match the catalogue entry
  // (catalog-source/catalog.json id:pearpaste). Its legacy native release
  // awaits a publisher-provided verified v3 package.
  {
    id: 'pearpaste',
    name: 'Paste',
    nativeDelivery: { status: 'migration-required' },
    tagline: 'Local-first, end-to-end encrypted notes & clipboard sync for your own devices — no account, no cloud.',
    legacyMigrationId: 'qnax5k8ojtod51ci9qwkrawdof1hx5w3a7gqbueoqnzzq9dw5hfo',
    initial: '📋',
    gradient: 'linear-gradient(135deg, #4ade80, #22d3ee)'
  },
  // Peercord — Discord-style P2P chat. Its former desktop release is retained
  // only as a migration record, not as a launchable browser app.
  {
    id: 'peercord',
    name: 'Peercord',
    nativeDelivery: { status: 'migration-required' },
    tagline: 'Decentralized Discord-style chat with text, voice, video, screen sharing, and P2P file transfer.',
    legacyMigrationId: 'wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy',
    initial: 'P',
    gradient: 'linear-gradient(135deg, #5865f2, #22d3ee)'
  }
]

const TAB_META = {
  browse: { label: 'Browse' },
  apps: { label: 'Apps' },
  sites: { label: 'P2P Sites' },
  library: { label: 'Library' },
  settings: { label: 'Settings' }
}

// Homepage drive — published from PearBrowser's own block editor
// (Sites tab), 2026-04-28. Pinned on HiveRelay. Earlier `fec1568a…`
// and `efd7b0c6c38d…` keys have been unseeded; this is the live one.
// To update: open the same site in the desktop's Sites editor and
// republish — block-source lives at /.blocks.json inside the drive.
const DEFAULT_URL = 'hyper://03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f/'

// peerit — "the front page of the P2P internet" (a peer-to-peer Reddit). Opens
// beside the PearBrowser landing page on launch and is pinned to the top of
// the Sites discovery grid. Published 2026-06-23,
// seeded 24/7 on HiveRelay. Source: 02-apps/peerit.
const PEERIT_DRIVE_KEY = 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4'
const PEERIT_URL = 'hyper://' + PEERIT_DRIVE_KEY + '/'

// p2pbuilders — "permissionless P2P Hacker News" (the same Hyperdrive-webapp
// pattern as peerit: signed records + PoW + reputation, runs in the browser via
// the window.pear bridge). Opens beside the landing page + peerit on launch.
// Published 2026-06-23, seeded on HiveRelay. Source: 02-apps/p2pbuilders.
const P2PBUILDERS_DRIVE_KEY = 'ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74'
const P2PBUILDERS_URL = 'hyper://' + P2PBUILDERS_DRIVE_KEY + '/'
const STARTUP_TABS = [
  { url: '', title: 'PearBrowser Home' },
  { url: DEFAULT_URL, title: 'PearBrowser' },
  { url: P2PBUILDERS_URL, title: 'P2P Builders' },
  { url: PEERIT_URL, title: 'peerit' }
]
const KNOWN_TAB_TITLES = new Map(STARTUP_TABS.map((tab) => [tab.url, tab.title]))

function knownTabTitleForUrl (url) {
  const clean = cleanTabUrl(url).replace(/#.*$/, '')
  if (!clean) return ''
  if (KNOWN_TAB_TITLES.has(clean)) return KNOWN_TAB_TITLES.get(clean)
  try {
    const parsed = new URL(clean)
    if (parsed.protocol !== 'hyper:' || !parsed.hostname) return ''
    return KNOWN_TAB_TITLES.get(`hyper://${parsed.hostname}/`) || ''
  } catch {
    return ''
  }
}

function readablePathLabel (pathname) {
  const segment = String(pathname || '').replace(/^\/+/, '').split('/').filter(Boolean).pop()
  if (!segment) return ''
  try { return decodeURIComponent(segment) } catch { return segment }
}

function tabTitleForUrl (url) {
  const clean = cleanTabUrl(url)
  if (!clean) return 'New tab'
  const known = knownTabTitleForUrl(clean)
  if (known) return known
  try {
    const parsed = new URL(clean)
    if (parsed.protocol === 'hyper:' && parsed.hostname) {
      const driveLabel = shortKey(parsed.hostname)
      const pathLabel = readablePathLabel(parsed.pathname)
      return pathLabel ? `${driveLabel} / ${pathLabel}` : driveLabel
    }
    if (parsed.hostname) return parsed.hostname
  } catch {}
  const fallback = clean.replace(/^hyper:\/\//i, '')
  return fallback.length > 40 ? fallback.slice(0, 37) + '...' : fallback
}

function tabTitleFromPage (pageTitle, url) {
  const known = knownTabTitleForUrl(url)
  if (known) return known
  const title = cleanTabTitle(pageTitle, '').trim()
  if (title && title !== url && !/^hyper:\/\//i.test(title)) return title
  return tabTitleForUrl(url)
}

function makeBrowserTab (url = '', opts = {}) {
  const clean = cleanTabUrl(url)
  return makeTab(clean, {
    ...opts,
    title: cleanTabTitle(opts.title, clean ? tabTitleForUrl(clean) : 'New tab')
  })
}

function visibleTabTitle (tab) {
  return cleanTabTitle(tab?.title, tabTitleForUrl(tab?.displayUrl || tab?.url || ''))
}

function tabTooltip (tab) {
  const title = visibleTabTitle(tab)
  const url = tab?.displayUrl || tab?.url || ''
  return url && url !== title ? `${title}\n${url}` : title
}

// Default catalog — auto-loads on first Apps-tab visit when the user has not yet
// pinned a catalog of their own. The "PearBrowser Network" curated entry point,
// published as a Hyperbee (the Pear-native, updatable catalog format) from the
// single source of truth: 03-sites/pearbrowser-publishers/catalog-source/catalog.json
// (same source backend/catalogue-seed.js is generated from, so the offline seed and
// this live catalog agree — dedupeApps collapses the overlap by driveKey/link).
// Signing key under 03-sites/pearbrowser-publishers/catalog/; re-publish with
// scripts/publish-catalog-bee.js. Supersedes the dead 0c35d12f hyperdrive whose
// writable secret was unrecoverable (see OLD_DEAD_CATALOG_KEY migration below).
const DEFAULT_CATALOG_KEY = 'hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d'
// The community catalogue — apps submitted by anyone (Apps tab → "Submit your
// app") and approved by a moderator land here. Auto-loaded alongside the curated
// default so the store shows both a Curated list and a Community list. Storage +
// publisher: 03-sites/pearbrowser-publishers/community-catalog(-source).
const DEFAULT_COMMUNITY_CATALOG = 'hyperbee://5d961fdc2f56215463e5d4656dd4a3f22bb5e15b93f9bfc8439a63a18f974d75'
// The previous default: a Hyperdrive that can no longer be updated (lost secret).
// Existing installs persisted it in recentCatalogs; migrate them to the new key.
const OLD_DEAD_CATALOG_KEY = '0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75'

// Map a parsed catalog ref (parseCatalogRef) to the RPC command that loads
// it and the scheme-qualified string to persist, so a relaunch routes to the
// same loader. Drive keys stay bare (unchanged behavior); hyperbee:// and
// autobee:// keep their scheme.
function catalogLoadPlan (parsed, C) {
  if (parsed.kind === 'sheets') return { cmd: C.CMD_SHEETS_LOAD, payload: { link: parsed.key }, persistRef: `sheets://${parsed.key}` }
  if (parsed.kind === 'hiveindex') return { cmd: C.CMD_LOAD_CATALOG_INDEX, payload: { link: parsed.key }, persistRef: `hiveindex://${parsed.key}` }
  if (parsed.autobee) return { cmd: C.CMD_LOAD_CATALOG_AUTOBEE, persistRef: `autobee://${parsed.key}` }
  if (parsed.bee) return { cmd: C.CMD_LOAD_CATALOG_BEE, persistRef: `hyperbee://${parsed.key}` }
  return { cmd: C.CMD_LOAD_CATALOG, persistRef: parsed.key }
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

// --- About-this-site panel -----------------------------------------------
//
// Modal showing technical details about whatever drive is loaded in the
// active tab — drive key (hex + z-base-32), bookmark state, scheme,
// path, and live drive/relay metadata from the backend.
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

function AboutSite ({ rpc, C, url, onClose, onBookmarkToggle }) {
  const drive = parseDriveAddress(url)
  const driveKey = drive?.hex || ''
  const [bookmarked, setBookmarked] = useState(null)
  const [driveInfo, setDriveInfo] = useState(null)
  const [driveInfoErr, setDriveInfoErr] = useState('')
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

  // Live drive/relay metadata while the modal is open. The backend uses
  // the same open Hyperdrive, Hyperswarm join, and HiveRelay client that
  // page loading/publishing already use.
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

const ASK_BROWSER_QUICK_PROMPTS = [
  'Summarize this page',
  'What are the key claims?',
  'Explain this simply',
  'What should I verify?'
]

export function AskBrowserPanel ({ rpc, C, activeTab, captureContext, onClose }) {
  const [capabilities, setCapabilities] = useState(null)
  const [capabilityError, setCapabilityError] = useState('')
  const [model, setModel] = useState('')
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState([])
  const [stream, setStream] = useState(() => createInitialAskStreamState())
  const [activeQuestion, setActiveQuestion] = useState('')
  const [activeSource, setActiveSource] = useState(null)
  const [stopping, setStopping] = useState(false)
  const activeStreamRef = useRef('')
  const activeQuestionRef = useRef('')
  const activeSourceRef = useRef(null)
  const committedStreamRef = useRef('')
  const transcriptRef = useRef(null)
  const runGenerationRef = useRef(0)
  const conversationPageRef = useRef(`${activeTab?.id || ''}\n${activeTab?.url || ''}`)

  const busy = ['starting', 'loading-model', 'streaming'].includes(stream.status)
  const models = Array.isArray(capabilities?.models) ? capabilities.models : []
  const selectedModel = models.find(item => item.alias === model) || null

  useEffect(() => {
    let disposed = false
    setCapabilityError('')
    rpc.request(C.CMD_ASK_BROWSER_CAPABILITIES).then((result) => {
      if (disposed) return
      setCapabilities(result)
      const availableModels = Array.isArray(result?.models) ? result.models : []
      const preferred = availableModels.find(item => item.recommended) ||
        availableModels.find(item => item.provider === 'ollama') ||
        availableModels[0]
      setModel(current => availableModels.some(item => item.alias === current)
        ? current
        : (preferred?.alias || ''))
    }).catch((err) => {
      if (!disposed) setCapabilityError(err.message || 'Local AI runtime is unavailable')
    })
    return () => { disposed = true }
  }, [rpc, C])

  useEffect(() => {
    const onStream = (event) => {
      const payload = event.detail
      if (!payload || payload.streamId !== activeStreamRef.current) return
      setStream(previous => reduceAskStreamEvent(previous, payload))
    }
    rpc.addEventListener(`event:${C.EVT_ASK_BROWSER_STREAM}`, onStream)
    return () => rpc.removeEventListener(`event:${C.EVT_ASK_BROWSER_STREAM}`, onStream)
  }, [rpc, C])

  useEffect(() => {
    const terminal = ['done', 'cancelled', 'error'].includes(stream.status)
    if (!terminal || !stream.streamId || committedStreamRef.current === stream.streamId) return
    committedStreamRef.current = stream.streamId
    const question = activeQuestionRef.current
    if (question) {
      setTurns(previous => [...previous, {
        id: stream.streamId,
        question,
        answer: presentAskText(stream.text),
        error: stream.error,
        finishReason: stream.finishReason,
        stats: stream.stats,
        source: activeSourceRef.current
      }].slice(-20))
    }
    if (stream.status === 'done') {
      setCapabilities(previous => previous && {
        ...previous,
        models: (previous.models || []).map(item => item.alias === model ? { ...item, installed: true } : item)
      })
    }
    activeStreamRef.current = ''
    activeQuestionRef.current = ''
    setActiveQuestion('')
    setStopping(false)
  }, [stream])

  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, stream.text, stream.status])

  useEffect(() => {
    const pageKey = `${activeTab?.id || ''}\n${activeTab?.url || ''}`
    if (conversationPageRef.current === pageKey) return
    conversationPageRef.current = pageKey
    runGenerationRef.current++
    const streamId = activeStreamRef.current
    if (streamId) rpc.request(C.CMD_ASK_BROWSER_CANCEL, { streamId }).catch(() => {})
    activeStreamRef.current = ''
    activeQuestionRef.current = ''
    activeSourceRef.current = null
    committedStreamRef.current = ''
    setTurns([])
    setStream(createInitialAskStreamState())
    setActiveQuestion('')
    setActiveSource(null)
    setStopping(false)
  }, [activeTab?.id, activeTab?.url, rpc, C])

  useEffect(() => () => {
    runGenerationRef.current++
    const streamId = activeStreamRef.current
    activeStreamRef.current = ''
    if (streamId) rpc.request(C.CMD_ASK_BROWSER_CANCEL, { streamId }).catch(() => {})
  }, [rpc, C])

  const submit = async (event) => {
    event?.preventDefault?.()
    const question = draft.trim()
    if (!question || busy || !model) return

    const streamId = createAskStreamId()
    const runGeneration = ++runGenerationRef.current
    committedStreamRef.current = ''
    activeStreamRef.current = streamId
    activeQuestionRef.current = question
    activeSourceRef.current = null
    setActiveQuestion(question)
    setActiveSource(null)
    setStopping(false)
    setDraft('')
    setStream(createInitialAskStreamState(streamId))

    try {
      const page = await captureContext()
      if (runGenerationRef.current !== runGeneration || activeStreamRef.current !== streamId) return
      const pageSource = {
        tabId: page.tabId,
        url: page.url,
        title: page.title,
        textBytes: page.textBytes,
        available: page.available,
        truncated: page.truncated,
        source: page.source
      }
      activeSourceRef.current = pageSource
      setActiveSource(pageSource)
      const history = turns
        .filter(turn => turn.source?.tabId === page.tabId && turn.source?.url === page.url)
        .slice(-3)
        .flatMap(turn => {
          const messages = [{ role: 'user', content: turn.question }]
          if (turn.answer) messages.push({ role: 'assistant', content: turn.answer })
          return messages
        })
      const started = await rpc.request(C.CMD_ASK_BROWSER_START, {
        streamId,
        model,
        question,
        history,
        page,
        maxTokens: 256,
        temperature: 0.2
      }, 30000)
      if (runGenerationRef.current !== runGeneration || activeStreamRef.current !== streamId) {
        rpc.request(C.CMD_ASK_BROWSER_CANCEL, { streamId }).catch(() => {})
        return
      }
      const source = { ...pageSource, ...(started?.source || {}) }
      activeSourceRef.current = source
      setActiveSource(source)
    } catch (err) {
      if (runGenerationRef.current !== runGeneration || activeStreamRef.current !== streamId) return
      setStream(previous => reduceAskStreamEvent(previous, {
        streamId,
        event: {
          type: 'error',
          code: err?.code || 'ask-browser-failed',
          message: err?.message || 'Ask Browser failed'
        }
      }))
    }
  }

  const stop = async () => {
    const streamId = activeStreamRef.current
    if (!streamId || stopping) return
    runGenerationRef.current++
    setStopping(true)
    setStream(previous => reduceAskStreamEvent(previous, {
      streamId,
      event: { type: 'done', finishReason: 'cancelled' }
    }))
    try { await rpc.request(C.CMD_ASK_BROWSER_CANCEL, { streamId }) } catch {}
  }

  const clear = () => {
    if (activeStreamRef.current) {
      runGenerationRef.current++
      const streamId = activeStreamRef.current
      activeStreamRef.current = ''
      activeQuestionRef.current = ''
      setActiveQuestion('')
      setStream(createInitialAskStreamState())
      setStopping(false)
      rpc.request(C.CMD_ASK_BROWSER_CANCEL, { streamId }).catch(() => {})
    }
    activeSourceRef.current = null
    setActiveSource(null)
    setTurns([])
  }

  const close = () => {
    runGenerationRef.current++
    const streamId = activeStreamRef.current
    activeStreamRef.current = ''
    if (streamId) rpc.request(C.CMD_ASK_BROWSER_CANCEL, { streamId }).catch(() => {})
    onClose()
  }

  const visibleActiveAnswer = presentAskText(stream.text)
  const sourceForCard = activeSource || turns[turns.length - 1]?.source || {
    tabId: activeTab?.id || '',
    url: activeTab?.url || '',
    title: activeTab?.title || activeTab?.url || 'No active page'
  }
  const statusLabel = stopping
    ? 'Stopping…'
    : stream.status === 'starting'
    ? 'Reading current page…'
    : stream.status === 'loading-model'
      ? `Loading model${Number.isFinite(stream.modelProgress) ? ` · ${Math.round(stream.modelProgress * 100)}%` : '…'}`
      : stream.status === 'streaming'
        ? 'Generating locally…'
        : ''

  return html`
    <aside id="ask-browser-panel" className="ask-browser-panel" aria-label="Ask Browser" data-testid="ask-browser-panel">
      <div className="ask-browser-header">
        <div>
          <div className="ask-browser-title">Ask Browser</div>
          <div className="ask-browser-local"><span></span>Local only</div>
        </div>
        <div className="ask-browser-header-actions">
          <button type="button" className="ask-browser-text-button" onClick=${clear} disabled=${turns.length === 0 && !busy}>Clear</button>
          <button type="button" className="ask-browser-close" aria-label="Close Ask Browser" onClick=${close}>×</button>
        </div>
      </div>

      <div className="ask-browser-model-row">
        <label htmlFor="ask-browser-model">Model</label>
        <select id="ask-browser-model" data-testid="ask-browser-model" value=${model} disabled=${busy || models.length === 0}
          onChange=${event => setModel(event.target.value)}>
          ${models.map(item => html`<option key=${item.alias} value=${item.alias}>${item.label || formatModelLabel(item.alias)}${item.expectedSize ? ` · ${formatAskBytes(item.expectedSize)}` : ''}</option>`)}
        </select>
        ${selectedModel && html`<div className="ask-browser-model-meta">${selectedModel.provider || 'local'}${selectedModel.quantization ? ` · ${selectedModel.quantization}` : ''}${selectedModel.installed ? ' · loaded' : ' · loads on first use'}</div>`}
      </div>

      <div className="ask-browser-source" title=${sourceForCard.url || ''}>
        <div className="ask-browser-source-kicker">Source [1] · current tab</div>
        <div className="ask-browser-source-title">${sourceForCard.title || sourceForCard.url || 'No active page'}</div>
        <div className="ask-browser-source-url">${sourceForCard.url || 'Open a page to add context'}</div>
        ${activeSource && html`<div className="ask-browser-source-meta">${activeSource.available || activeSource.hasText ? `${formatAskBytes(activeSource.textBytes || 0)} captured` : 'Metadata only'}${activeSource.truncated ? ' · truncated' : ''}</div>`}
      </div>

      <div className="ask-browser-transcript" ref=${transcriptRef}>
        ${turns.length === 0 && !activeQuestion && html`
          <div className="ask-browser-empty">
            <div className="ask-browser-spark">✦</div>
            <div className="ask-browser-empty-title">Ask about what you’re viewing</div>
            <div className="ask-browser-empty-copy">Page context stays on this device and is sent only to the selected local model.</div>
            <div className="ask-browser-quick-grid">
              ${ASK_BROWSER_QUICK_PROMPTS.map(prompt => html`<button type="button" key=${prompt} onClick=${() => setDraft(prompt)}>${prompt}</button>`)}
            </div>
          </div>
        `}
        ${turns.map(turn => html`
          <div className="ask-browser-turn" key=${turn.id}>
            <div className="ask-browser-message ask-browser-user">${turn.question}</div>
            <div className=${`ask-browser-message ask-browser-assistant${turn.error ? ' error' : ''}`}>
              ${turn.error ? turn.error.message : (turn.answer || (turn.finishReason === 'cancelled' ? 'Stopped.' : 'No answer returned.'))}
              ${turn.finishReason === 'cancelled' && turn.answer ? html`<span className="ask-browser-interrupted"> Response stopped.</span>` : null}
            </div>
            ${turn.source && html`<div className="ask-browser-turn-source">[1] ${turn.source.title || turn.source.url || 'Captured page'}</div>`}
            ${turn.stats && html`<div className="ask-browser-stats">${Number.isFinite(turn.stats.tokensPerSecond) ? `${turn.stats.tokensPerSecond.toFixed(1)} tok/s` : ''}${turn.stats.backendDevice ? ` · ${turn.stats.backendDevice}` : ''}</div>`}
          </div>
        `)}
        ${activeQuestion && html`
          <div className="ask-browser-turn active">
            <div className="ask-browser-message ask-browser-user">${activeQuestion}</div>
            <div className="ask-browser-message ask-browser-assistant">
              ${visibleActiveAnswer || html`<span className="ask-browser-thinking">${statusLabel || 'Thinking locally…'}</span>`}
            </div>
          </div>
        `}
      </div>

      <form className="ask-browser-composer" onSubmit=${submit}>
        <div className="ask-browser-live-status" role="status" aria-live="polite">${statusLabel}</div>
        ${capabilityError && html`<div className="ask-browser-error">${capabilityError}</div>`}
        ${capabilities && capabilities.available === false && html`<div className="ask-browser-error">${capabilities.reason || 'Local AI runtime is unavailable'}</div>`}
        <textarea data-testid="ask-browser-input" value=${draft}
          aria-label="Question about the current page"
          onInput=${event => setDraft(event.target.value)}
          onKeyDown=${event => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit(event)
          }}
          placeholder="Ask about this page…" rows="3" disabled=${busy || !capabilities?.available}></textarea>
        <div className="ask-browser-compose-row">
          <span>⌘↵ to send</span>
          ${busy
            ? html`<button type="button" className="ask-browser-stop" data-testid="ask-browser-stop" onClick=${stop} disabled=${stopping}>${stopping ? 'Stopping…' : 'Stop'}</button>`
            : html`<button type="submit" className="ask-browser-send" data-testid="ask-browser-send" disabled=${!draft.trim() || !model || !capabilities?.available}>Ask</button>`}
        </div>
      </form>
    </aside>
  `
}

// --- QVAC Local AI widget ----------------------------------------------------
//
// The chrome-owned "Local AI" widget for the blank new-tab surface. It shares
// the Ask Browser RPC contract (capabilities/start/cancel + stream events)
// but sends no page context — a quick ask is a plain question to a
// browser-approved local model, streamed and generated entirely on-device.
// The Ask Browser side panel stays the page-context surface; this widget is
// the zero-context one, so the two never compete over provenance.

const QVAC_WIDGET_QUICK_PROMPTS = [
  'What is the peer-to-peer web?',
  'Summarize what a Hyperdrive is',
  'Draft a short intro post for peerit'
]

export function QvacWidget ({ rpc, C }) {
  const [capabilities, setCapabilities] = useState(null)
  const [capabilityError, setCapabilityError] = useState('')
  const [model, setModel] = useState('')
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState([])
  const [stream, setStream] = useState(() => createInitialAskStreamState())
  const [activeQuestion, setActiveQuestion] = useState('')
  const [stopping, setStopping] = useState(false)
  const activeStreamRef = useRef('')
  const activeQuestionRef = useRef('')
  const committedStreamRef = useRef('')
  const transcriptRef = useRef(null)

  const summary = useMemo(() => summarizeAiCapabilities(capabilities), [capabilities])
  const busy = ['starting', 'loading-model', 'streaming'].includes(stream.status)
  const models = summary.models
  const selectedModel = models.find(item => item.alias === model) || null

  useEffect(() => {
    let disposed = false
    setCapabilityError('')
    rpc.request(C.CMD_ASK_BROWSER_CAPABILITIES).then((result) => {
      if (disposed) return
      setCapabilities(result)
      const available = Array.isArray(result?.models) ? result.models : []
      setModel(current => pickQuickAskModel(available, current))
    }).catch((err) => {
      if (!disposed) setCapabilityError(err.message || 'Local AI runtime is unavailable')
    })
    return () => { disposed = true }
  }, [rpc, C])

  useEffect(() => {
    const onStream = (event) => {
      const payload = event.detail
      if (!payload || payload.streamId !== activeStreamRef.current) return
      setStream(previous => reduceAskStreamEvent(previous, payload))
    }
    rpc.addEventListener(`event:${C.EVT_ASK_BROWSER_STREAM}`, onStream)
    return () => rpc.removeEventListener(`event:${C.EVT_ASK_BROWSER_STREAM}`, onStream)
  }, [rpc, C])

  useEffect(() => {
    const terminal = ['done', 'cancelled', 'error'].includes(stream.status)
    if (!terminal || !stream.streamId || committedStreamRef.current === stream.streamId) return
    committedStreamRef.current = stream.streamId
    const question = activeQuestionRef.current
    if (question) {
      setTurns(previous => [...previous, {
        id: stream.streamId,
        question,
        answer: presentAskText(stream.text),
        error: stream.error,
        finishReason: stream.finishReason,
        stats: stream.stats
      }].slice(-8))
    }
    if (stream.status === 'done') {
      setCapabilities(previous => previous && {
        ...previous,
        models: (previous.models || []).map(item => item.alias === model ? { ...item, installed: true } : item)
      })
    }
    activeStreamRef.current = ''
    activeQuestionRef.current = ''
    setActiveQuestion('')
    setStopping(false)
  }, [stream])

  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, stream.text, stream.status])

  useEffect(() => () => {
    const streamId = activeStreamRef.current
    activeStreamRef.current = ''
    if (streamId) rpc.request(C.CMD_ASK_BROWSER_CANCEL, { streamId }).catch(() => {})
  }, [rpc, C])

  const submit = async (event) => {
    event?.preventDefault?.()
    const question = draft.trim()
    if (!question || busy || !model) return

    const streamId = createAskStreamId()
    committedStreamRef.current = ''
    activeStreamRef.current = streamId
    activeQuestionRef.current = question
    setActiveQuestion(question)
    setStopping(false)
    setDraft('')
    setStream(createInitialAskStreamState(streamId))

    try {
      const history = turns.slice(-3).flatMap(turn => {
        const messages = [{ role: 'user', content: turn.question }]
        if (turn.answer) messages.push({ role: 'assistant', content: turn.answer })
        return messages
      })
      await rpc.request(C.CMD_ASK_BROWSER_START, buildQuickAskRequest({
        streamId,
        model,
        question,
        history
      }), 30000)
    } catch (err) {
      if (activeStreamRef.current !== streamId) return
      setStream(previous => reduceAskStreamEvent(previous, {
        streamId,
        event: {
          type: 'error',
          code: err?.code || 'quick-ask-failed',
          message: err?.message || 'Local AI request failed'
        }
      }))
    }
  }

  const stop = async () => {
    const streamId = activeStreamRef.current
    if (!streamId || stopping) return
    setStopping(true)
    setStream(previous => reduceAskStreamEvent(previous, {
      streamId,
      event: { type: 'done', finishReason: 'cancelled' }
    }))
    try { await rpc.request(C.CMD_ASK_BROWSER_CANCEL, { streamId }) } catch {}
  }

  const clear = () => {
    const streamId = activeStreamRef.current
    activeStreamRef.current = ''
    activeQuestionRef.current = ''
    if (streamId) rpc.request(C.CMD_ASK_BROWSER_CANCEL, { streamId }).catch(() => {})
    setTurns([])
    setStream(createInitialAskStreamState())
    setActiveQuestion('')
    setStopping(false)
  }

  const visibleActiveAnswer = presentAskText(stream.text)
  const statusLabel = stopping
    ? 'Stopping…'
    : stream.status === 'starting'
    ? 'Starting locally…'
    : stream.status === 'loading-model'
      ? `Loading model${Number.isFinite(stream.modelProgress) ? ` · ${Math.round(stream.modelProgress * 100)}%` : '…'}`
      : stream.status === 'streaming'
        ? 'Generating locally…'
        : ''

  if (capabilityError || (capabilities && !summary.available)) {
    return html`
      <section className="qvac-widget unavailable" data-testid="qvac-widget" aria-label="Local AI">
        <div className="qvac-widget-header">
          <span className="qvac-widget-spark">✦</span>
          <span className="qvac-widget-title">Local AI</span>
          <span className="qvac-widget-badge">QVAC · on-device</span>
        </div>
        <div className="qvac-widget-status" data-testid="qvac-widget-status">
          ${capabilityError || describeAiStatus(summary)}
        </div>
      </section>
    `
  }
  if (!capabilities) return null

  return html`
    <section className="qvac-widget" data-testid="qvac-widget" aria-label="Local AI">
      <div className="qvac-widget-header">
        <span className="qvac-widget-spark">✦</span>
        <span className="qvac-widget-title">Local AI</span>
        <span className="qvac-widget-badge">QVAC · on-device</span>
        <span className="qvac-widget-header-space"></span>
        ${(turns.length > 0 || busy) && html`<button type="button" className="qvac-widget-text-button" onClick=${clear}>Clear</button>`}
      </div>
      <div className="qvac-widget-status" data-testid="qvac-widget-status">${describeAiStatus(summary)}</div>

      ${(turns.length > 0 || activeQuestion) && html`
        <div className="qvac-widget-transcript" ref=${transcriptRef} data-testid="qvac-widget-transcript">
          ${turns.map(turn => html`
            <div className="qvac-widget-turn" key=${turn.id}>
              <div className="qvac-widget-question">${turn.question}</div>
              <div className=${`qvac-widget-answer${turn.error ? ' error' : ''}`}>
                ${turn.error ? turn.error.message : (turn.answer || (turn.finishReason === 'cancelled' ? 'Stopped.' : 'No answer returned.'))}
              </div>
              ${turn.stats && html`<div className="qvac-widget-stats">${Number.isFinite(turn.stats.tokensPerSecond) ? `${turn.stats.tokensPerSecond.toFixed(1)} tok/s` : ''}${turn.stats.backendDevice ? ` · ${turn.stats.backendDevice}` : ''}</div>`}
            </div>
          `)}
          ${activeQuestion && html`
            <div className="qvac-widget-turn active">
              <div className="qvac-widget-question">${activeQuestion}</div>
              <div className="qvac-widget-answer">
                ${visibleActiveAnswer || html`<span className="qvac-widget-thinking">${statusLabel || 'Thinking locally…'}</span>`}
              </div>
            </div>
          `}
        </div>
      `}

      ${turns.length === 0 && !activeQuestion && html`
        <div className="qvac-widget-quick-grid">
          ${QVAC_WIDGET_QUICK_PROMPTS.map(prompt => html`<button type="button" key=${prompt} onClick=${() => setDraft(prompt)}>${prompt}</button>`)}
        </div>
      `}

      <form className="qvac-widget-composer" onSubmit=${submit}>
        <input
          type="text"
          data-testid="qvac-widget-input"
          value=${draft}
          aria-label="Ask the local model"
          onInput=${event => setDraft(event.target.value)}
          placeholder="Ask anything — answered on this device…"
          disabled=${busy}
        />
        ${busy
          ? html`<button type="button" className="qvac-widget-stop" data-testid="qvac-widget-stop" onClick=${stop} disabled=${stopping}>${stopping ? '…' : 'Stop'}</button>`
          : html`<button type="submit" className="qvac-widget-send" data-testid="qvac-widget-send" disabled=${!draft.trim() || !model}>Ask</button>`}
      </form>

      <div className="qvac-widget-footer">
        <select
          className="qvac-widget-model"
          data-testid="qvac-widget-model"
          value=${model}
          disabled=${busy || models.length === 0}
          aria-label="Local model"
          onChange=${event => setModel(event.target.value)}>
          ${models.map(item => html`<option key=${item.alias} value=${item.alias}>${item.label || formatModelLabel(item.alias)}</option>`)}
        </select>
        ${selectedModel && html`<span className="qvac-widget-model-meta">${selectedModel.installed ? 'ready' : (selectedModel.expectedSize ? `${formatAskBytes(selectedModel.expectedSize)} · loads on first use` : 'loads on first use')}</span>`}
        <span className="qvac-widget-live" role="status" aria-live="polite">${statusLabel}</span>
      </div>
    </section>
  `
}

function Browse ({ rpc, C, navUrl, onNavigated, tabs, setTabs, activeId, setActiveId, closedTabs, setClosedTabs, sessionReady, onOpenSettings }) {
  // tabs[] + activeId are now lifted to App-level state and passed in
  // as props. This survives main-tab switches (Browse→Apps→Browse no
  // longer destroys your open tabs) and lets App persist them to
  // user-data settings for cross-launch session restore.
  const inputRef = useRef(null)
  const iframeRefs = useRef({})
  const frameEpochRef = useRef({})
  const activeIdRef = useRef(activeId)
  const autoLoadedRef = useRef(new Set())
  const [editingUrl, setEditingUrl] = useState('')
  const [privateSearchQuery, setPrivateSearchQuery] = useState('')
  // About-this-site modal — true when user clicked the (i) button.
  const [aboutOpen, setAboutOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  // URL bar autocomplete state (suggestions, dropdown visibility,
  // keyboard-selection index). Suggestions come from a single fetch
  // of bookmarks + history at focus time, then filtered locally as
  // the user types — fast and avoids hammering the user-data Hyperbee.
  const [autocompleteSource, setAutocompleteSource] = useState([])
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)
  const [autocompleteIdx, setAutocompleteIdx] = useState(-1)
  const autocompleteFetchedAt = useRef(0)

  const active = tabs.find((t) => t.id === activeId) || tabs[0]
  activeIdRef.current = activeId

  const captureActivePageContext = async () => {
    const tab = tabs.find(item => item.id === activeIdRef.current) || active
    if (!tab) return normalizePageContextResponse(null, {})
    const frame = iframeRefs.current[tab.id]
    const frameWindow = frame?.contentWindow
    const epoch = frameEpochRef.current[tab.id] || 0

    const domFallback = () => {
      let text = ''
      try { text = frame?.contentDocument?.body?.innerText || '' } catch {}
      return normalizePageContextResponse({
        tabId: tab.id,
        text,
        source: text ? 'renderer-dom' : 'metadata'
      }, tab, { maxTextBytes: 5 * 1024 })
    }

    if (!frameWindow || !tab.contextToken || typeof MessageChannel === 'undefined') return domFallback()

    let targetOrigin
    try { targetOrigin = new URL(tab.src).origin } catch { return domFallback() }
    const requestId = createAskStreamId()
    const channel = new MessageChannel()

    return await new Promise((resolve, reject) => {
      let settled = false
      const frameIsCurrent = () => activeIdRef.current === tab.id &&
        iframeRefs.current[tab.id]?.contentWindow === frameWindow &&
        (frameEpochRef.current[tab.id] || 0) === epoch
      const finish = (err, response) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        try { channel.port1.close() } catch {}
        if (err) reject(err)
        else resolve(response)
      }
      const finishWithFallback = () => {
        if (!frameIsCurrent()) {
          finish(new Error('The active tab changed while Ask Browser was reading it'))
          return
        }
        finish(null, domFallback())
      }
      const timer = setTimeout(finishWithFallback, 1500)
      channel.port1.onmessage = (event) => {
        const data = event.data
        if (!data || data.type !== 'pearbrowser:context-response' || data.v !== 1 || data.requestId !== requestId) return
        if (!frameIsCurrent()) {
          finish(new Error('The active tab changed while Ask Browser was reading it'))
          return
        }
        finish(null, normalizePageContextResponse({
          ...data,
          tabId: tab.id,
          source: 'authenticated-page-context'
        }, tab, { maxTextBytes: 5 * 1024 }))
      }
      channel.port1.start?.()
      try {
        frameWindow.postMessage({
          type: 'pearbrowser:context-request',
          v: 1,
          requestId,
          contextToken: tab.contextToken
        }, targetOrigin, [channel.port2])
      } catch {
        finishWithFallback()
      }
    })
  }

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

  const releaseOriginIfUnused = (driveKeyHex, remainingTabs) => {
    if (!C.CMD_RELEASE_ORIGIN) return
    if (!driveKeyHex || tabListUsesDriveKey(remainingTabs, driveKeyHex)) return
    rpc.request(C.CMD_RELEASE_ORIGIN, { keyHex: driveKeyHex }).catch(() => {})
  }

  // Privacy-first: visit history and search indexing are opt-in (default OFF).
  const [historyEnabled, setHistoryEnabled] = useState(false)
  const [searchIndexEnabled, setSearchIndexEnabled] = useState(false)
  useEffect(() => {
    let disposed = false
    rpc.request(C.CMD_USERDATA_GET_SETTINGS)
      .then((res) => {
        if (disposed) return
        const s = unwrapSettings(res) || {}
        setHistoryEnabled(s.historyEnabled === true)
        setSearchIndexEnabled(s.searchIndexEnabled === true)
      })
      .catch(() => {})
    return () => { disposed = true }
  }, [rpc, C])

  // When the active tab changes, sync the URL input.
  useEffect(() => {
    if (active) setEditingUrl(active.displayUrl || '')
  }, [active?.id, active?.displayUrl])

  const go = async (url, tabIdOverride, opts = {}) => {
    const id = tabIdOverride || activeId
    const recordHistory = opts.recordHistory !== false
    // Persistent visit log is opt-in; session back/forward still uses in-memory tab.history.
    const rememberVisit = historyEnabled && (opts.rememberVisit ?? recordHistory)

    // Naming Phase N1 — if the input is a bare name (e.g. "keet"), resolve it
    // against the local petname store (Tier 0) + curated floor (Tier 3) BEFORE
    // treating it as a URL. With the experimentalNaming flag off the backend
    // answers null and we fall straight through to normalizeUrl, so navigation
    // is byte-for-byte unchanged unless naming is enabled. `prov` (provenance)
    // drives the honest URL-bar chip; we still navigate the REAL resolved
    // target, so bookmark/copy/history all carry the actual destination.
    let target = null
    let prov = null
    const raw = String(url ?? '').trim()
    // A pearname://<name> URL resolves through the registry exactly like a typed
    // bare word — strip the scheme so both share the CMD_NAME_RESOLVE branch.
    const pearname = /^pearname:\/\//i.test(raw) ? parsePearname(raw) : null
    const nameQuery = pearname || (looksLikeName(raw) ? raw : null)
    if (nameQuery) {
      try {
        const { resolved } = await rpc.request(C.CMD_NAME_RESOLVE, { name: nameQuery })
        if (resolved?.legacyMigrationId) {
          updateTab(id, { status: `migration required for ${resolved.label || nameQuery} · ${resolved.provenance}…` })
          try {
            const result = await rpc.request(C.CMD_LEGACY_APP_MIGRATION, { legacyMigrationId: resolved.legacyMigrationId }, 10000)
            updateTab(id, { status: result?.message || 'A verified native v3 package is required.' })
          } catch (err) {
            updateTab(id, { status: `error: ${err.message}` })
          }
          return
        }
        if (resolved && (resolved.link || resolved.key)) {
          const link = resolved.link || `hyper://${resolved.key}/`
          // A browsable Hyper target navigates in-tab with an honest provenance chip.
          target = link
          prov = { provenance: resolved.provenance, label: resolved.label || nameQuery, name: nameQuery, source: resolved.source || null }
        }
      } catch { /* resolver unavailable / disabled — fall through to URL handling */ }
    }
    if (!target) target = normalizeUrl(url)
    if (!target) return

    const nextTitle = prov ? prov.label : tabTitleForUrl(target)
    updateTab(id, { status: `resolving ${nextTitle}…`, displayUrl: target, title: nextTitle })
    try {
      const previousTab = tabs.find((t) => t.id === id)
      const previousDriveKey = tabDriveKey(previousTab)
      const nextDriveKey = driveKeyFromHyperRef(target)
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
        const kind = res.kind || (isClearnetUrl(res.url || target) ? 'clearnet' : 'hyper')
        const display = res.url || target
        return {
          ...t,
          src: res.localUrl,
          status: '',
          history,
          histIdx,
          url: display,
          displayUrl: display,
          title: nextTitle,
          nameProv: prov, // { provenance, label, name } or null — drives the URL-bar provenance chip
          contextToken: res.contextToken || null,
          kind,
          clearnetMode: res.mode || null,
          shieldActive: res.shieldActive !== false && kind !== 'clearnet' ? true : !!res.shieldActive
        }
      }))
      if (previousDriveKey && previousDriveKey !== nextDriveKey) {
        releaseOriginIfUnused(previousDriveKey, tabs.filter((t) => t.id !== id))
      }
      if (rememberVisit) rpc.request(C.CMD_USERDATA_ADD_HISTORY, { url: target, title: nextTitle }).catch(() => {})
    } catch (err) {
      updateTab(id, { status: `error: ${err.message}` })
    }
  }

  // Lighthouse Phase 0 — optional local self-search index. Privacy-first:
  // only runs when searchIndexEnabled is explicitly true (default OFF).
  // Best-effort — never throws into the render path.
  const indexPage = (tab, el) => {
    try {
      if (!searchIndexEnabled) return
      const u = (tab && (tab.url || tab.displayUrl)) || ''
      if (!/^hyper:\/\//i.test(u)) return // only index P2P content
      const rest = u.replace(/^hyper:\/\//i, '')
      const slash = rest.indexOf('/')
      const driveKey = slash >= 0 ? rest.slice(0, slash) : rest
      const path = slash >= 0 ? rest.slice(slash) : '/'
      let title = ''; let text = ''
      try {
        const doc = el && el.contentDocument
        if (doc) { title = doc.title || ''; text = ((doc.body && doc.body.innerText) || '').slice(0, 200000) }
      } catch { /* cross-origin / not ready — index by url + title only */ }
      const nextTitle = tabTitleFromPage(title, u)
      if (nextTitle && nextTitle !== tab.title) updateTab(tab.id, { title: nextTitle })
      rpc.request(C.CMD_SEARCH_INDEX, { driveKey, path, title: title || u, text }).catch(() => {})
    } catch { /* never break browsing */ }
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
    const t = makeBrowserTab(url)
    setTabs((prev) => [...prev, t])
    setActiveId(t.id)
    setEditingUrl(url || '')
  }

  const submitPrivateSearch = (event) => {
    event?.preventDefault?.()
    const target = buildPrivateSearchUrl(privateSearchQuery)
    if (!target) return
    setPrivateSearchQuery('')
    // Search queries are never written to the optional persistent visit log.
    // The active tab still shows its current results URL, like every browser.
    go(target, activeId, { rememberVisit: false })
  }

  const closeTab = (id) => {
    const closing = tabs.find((t) => t.id === id)
    const closed = normalizeTabSnapshot(closing)
    if (closed) setClosedTabs((prev) => [closed, ...prev].slice(0, MAX_CLOSED_TABS))
    const idx = tabs.findIndex((t) => t.id === id)
    if (idx === -1) return
    const remaining = tabs.filter((t) => t.id !== id)
    releaseOriginIfUnused(tabDriveKey(closing), remaining)
    // Drop the iframe ref so it can GC.
    delete iframeRefs.current[id]
    delete frameEpochRef.current[id]
    if (remaining.length === 0) {
      const fresh = makeBrowserTab('')
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

  // Hyperdrive pages run in a sandboxed iframe. Literal hyper:// anchors inside
  // those pages must come back through Browse navigation; otherwise Chromium
  // asks the host OS to open an external protocol handler.
  useEffect(() => {
    const onFrameMessage = (event) => {
      const data = event.data
      if (!data || data.type !== 'pearbrowser:navigate') return
      const url = typeof data.url === 'string' ? data.url.trim() : ''
      if (!/^hyper:\/\//i.test(url)) return

      const sourceTab = tabs.find((t) => iframeRefs.current[t.id]?.contentWindow === event.source)
      if (!sourceTab) return

      if (data.openInNewTab) {
        const t = makeBrowserTab(url)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs])

  // Preload every restored tab once the backend session is ready, without
  // adding duplicate entries to the per-tab back/forward list. That makes
  // PearBrowser reopen onto live pages instead of URL-only placeholders.
  useEffect(() => {
    if (!sessionReady) return
    for (const tab of tabs) {
      if (!tab || tab.src || !tab.url) continue
      const key = `${tab.id}:${tab.url}`
      if (autoLoadedRef.current.has(key)) continue
      autoLoadedRef.current.add(key)
      const hasHistory = Array.isArray(tab.history) && tab.history.length > 0
      go(tab.url, tab.id, {
        recordHistory: !hasHistory,
        rememberVisit: !hasHistory,
        historyIndex: tab.histIdx
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, active?.id, tabs])

  // External navUrl prop (Apps tab → "open in Browse"). Open in a new
  // tab if the active tab already has an address; otherwise navigate the
  // current empty tab.
  useEffect(() => {
    if (!navUrl) return
    // Spawn a new tab whenever the active tab already has an address — loaded
    // (active.src) OR mid-load (active.url set, src still null). The latter is
    // the first-launch case: the default landing tab (active.url === DEFAULT_URL)
    // is auto-loading behind the onboarding modal when the user picks a site.
    // Without the `active.url` guard the navUrl effect would take the else branch
    // and navigate that single landing tab away to the picked site, so the
    // landing never finishes loading anywhere. Treating "has an address" as the
    // new-tab trigger leaves the landing to finish in tab 0.
    if (active && (active.src || active.url)) {
      // Open a fresh tab AND navigate it. newTab() alone only sets .url, not
      // .src, so a second run-in-tab rendered the empty-state until a manual
      // reload — create the tab here and drive go() so it's one click every time.
      const t = makeBrowserTab(navUrl)
      setTabs((prev) => [...prev, t])
      setActiveId(t.id)
      setEditingUrl(navUrl)
      go(navUrl, t.id)
    } else {
      go(navUrl, active?.id)
    }
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
  // by 30s — bookmarks/history rarely change mid-typing. History suggestions
  // stay empty when historyEnabled is off (backend returns []).
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
    <div className="browse">
      <div className="tabstrip">
        ${tabs.map((t, i) => html`
          <button
            key=${t.id}
            className=${'tabchip' + (t.id === activeId ? ' active' : '') + (t.pinned ? ' pinned' : '')}
            onClick=${() => setActive(t.id)}
            title=${tabTooltip(t)}
          >
            <span
              className=${'tabchip-pin' + (t.pinned ? ' on' : '')}
              title=${t.pinned ? 'Unpin tab' : 'Pin tab'}
              onClick=${(e) => { e.stopPropagation(); togglePinned(t.id) }}
            >${t.pinned ? '●' : '○'}</span>
            <span className="tabchip-title">${visibleTabTitle(t)}</span>
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
          placeholder="hyper://… or https://… or example.com"
          spellCheck="false"
        />
        <button className="nav" onClick=${bookmark} disabled=${!editingUrl?.trim?.()} title="Bookmark this URL">☆</button>
        <button className="nav" onClick=${() => setAboutOpen(true)} disabled=${!active?.url} title="About this site">ⓘ</button>
        <${ShieldStatusChip} rpc=${rpc} C=${C} activeUrl=${active?.url || editingUrl || ''} onOpenSettings=${onOpenSettings} />
        <button className=${`nav ask-browser-toggle${askOpen ? ' active' : ''}`} data-testid="ask-browser-toggle"
          aria-expanded=${askOpen} aria-controls="ask-browser-panel"
          onClick=${() => setAskOpen(value => !value)} disabled=${!active?.url} title="Ask Browser about this page">✦ Ask</button>
        <button className="nav" onClick=${openDevtools} disabled=${!active?.src} title="Devtools (⌘⇧I)">⚙</button>
        <button className="nav go" onClick=${() => go(editingUrl)}>Go</button>
        ${autocompleteOpen && suggestions.length > 0 && html`
          <div className="urlbar-suggestions">
            ${suggestions.map((s, idx) => html`
              <div
                key=${s.url}
                className=${'urlbar-suggestion' + (idx === autocompleteIdx ? ' active' : '')}
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
      <div className="browse-workspace">
        <div className="browse-stage">
          ${tabs.map((t) =>
            t.src
              ? (t.kind === 'clearnet' && t.clearnetMode === 'direct'
                // Direct clearnet: prefer <webview> when Electron exposes it
                // (partition isolates cookie jar); fall back to sandboxed iframe.
                ? (typeof window !== 'undefined' && window.customElements?.get?.('webview')
                  ? html`<webview
                      key=${t.id}
                      ref=${(el) => { if (el) iframeRefs.current[t.id] = el }}
                      className=${'webview' + (t.id === activeId ? '' : ' hidden')}
                      src=${t.src}
                      partition=${'persist:clearnet-' + (() => { try { return new URL(t.url || t.src).hostname } catch { return 'site' } })()}
                      allowpopups=${true}
                      data-testid="clearnet-webview"
                    ></webview>`
                  : html`<iframe
                      key=${t.id}
                      ref=${(el) => { if (el) iframeRefs.current[t.id] = el }}
                      className=${'webview' + (t.id === activeId ? '' : ' hidden')}
                      src=${t.src}
                      data-testid="clearnet-iframe-direct"
                      onLoad=${(e) => {
                        frameEpochRef.current[t.id] = (frameEpochRef.current[t.id] || 0) + 1
                      }}
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
                    ></iframe>`)
                : html`<iframe
                  key=${t.id}
                  ref=${(el) => { if (el) iframeRefs.current[t.id] = el }}
                  className=${'webview' + (t.id === activeId ? '' : ' hidden')}
                  src=${t.src}
                  data-testid=${t.kind === 'clearnet' ? 'clearnet-iframe-proxy' : 'hyper-iframe'}
                  onLoad=${(e) => {
                    frameEpochRef.current[t.id] = (frameEpochRef.current[t.id] || 0) + 1
                    indexPage(t, e.target)
                  }}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
                ></iframe>`)
              : t.id === activeId
                ? (t.url
                  // A tab with an address but no loaded content yet is mid-fetch —
                  // show a loading state, NOT the welcome/clickthrough (the default
                  // landing tab opens straight into the PearBrowser site).
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
                              <p>Fetching <code>${t.url}</code> ${t.kind === 'clearnet'
                                ? 'over the clearnet proxy — shields and the privacy ladder apply.'
                                : 'directly from its peers — first load of a cold drive can take a moment.'}</p>
                            </div>`}
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${() => go(t.url, t.id)}>${(t.status && /^error/i.test(t.status)) ? 'Retry' : 'Reload'}</button>
                          <button className="btn subtle" onClick=${() => { inputRef.current?.focus(); inputRef.current?.select?.() }}>Edit URL</button>
                        </div>
                      </div>
                    </div>`
                  // A truly blank tab (including the first startup tab) is the
                  // browser-owned home surface: private search + local tools.
                    : html`<div key=${t.id} className="browse-welcome">
                      <div className="browse-welcome-inner start-page">
                        <div className="browse-welcome-logo">🍐</div>
                        <h2>Search without a profile</h2>
                        <p className="start-page-lede">PearBrowser sends no search analytics and never adds a query to its optional persistent visit history.</p>
                        <section className="private-search-card" aria-labelledby="private-search-title">
                          <div className="private-search-heading">
                            <span id="private-search-title">Private web search</span>
                            <span className="private-search-provider">${PRIVATE_SEARCH_PROVIDER.name}</span>
                          </div>
                          <form className="private-search-form" data-testid="private-search-form" onSubmit=${submitPrivateSearch}>
                            <input
                              type="search"
                              value=${privateSearchQuery}
                              data-testid="private-search-input"
                              aria-label="Search the web privately"
                              placeholder="Search the web"
                              autoComplete="off"
                              autoFocus
                              spellCheck="false"
                              onInput=${event => setPrivateSearchQuery(event.target.value)}
                            />
                            <button type="submit" className="private-search-submit" data-testid="private-search-submit" disabled=${!privateSearchQuery.trim()}>Search</button>
                          </form>
                          <div className="private-search-disclosure">
                            Content Shield stays on. ${PRIVATE_SEARCH_PROVIDER.name} receives your query and network address to return results; its published policy says it does not save or share search history. Private search is not anonymity.
                          </div>
                        </section>
                        <div className="start-page-p2p">Or paste a <code>hyper://</code> address above to fetch a site directly from its peers — no DNS, server, or CDN.</div>
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${() => go(DEFAULT_URL)}>Open the PearBrowser site</button>
                          <button className="btn subtle" onClick=${() => { inputRef.current?.focus(); inputRef.current?.select?.() }}>Focus the URL bar</button>
                        </div>
                        <div className="browse-welcome-tip">Tip: <code>⌘T</code> opens a new tab, <code>⌘⇧T</code> reopens one, <code>⌘W</code> closes one, <code>⌘L</code> jumps to the URL bar, <code>⌘1</code>–<code>⌘9</code> switches between tabs.</div>
                        <${QvacWidget} rpc=${rpc} C=${C} />
                      </div>
                      </div>`)
                : null
          )}
        </div>
        ${askOpen && html`<${AskBrowserPanel}
          rpc=${rpc}
          C=${C}
          activeTab=${active}
          captureContext=${captureActivePageContext}
          onClose=${() => setAskOpen(false)}
        />`}
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
  'profile:website': { label: 'Website', detail: 'Personal site URL on your profile' },
  'profile:read': { label: 'Full profile', detail: 'All filled profile fields' },
  'profile:contact': { label: 'Contact profile', detail: 'Email and website fields' },
  'contacts:read': { label: 'Contacts', detail: 'Your saved contacts list' }
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
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick=${(e) => e.target.classList.contains('modal-overlay') && decide(false)}>
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon">🍐</div>
          <div className="login-header-text">
            <div className="login-app-name">${appLabel}</div>
            <div className="login-app-sub">wants to sign you in</div>
            <div className="login-app-key" title=${request.driveKey}>${driveLabel}</div>
          </div>
        </div>

        ${request.reason && html`<div className="login-reason">"${request.reason}"</div>`}

        <div className="login-section-label">SIGNING IN AS</div>
        <div className="login-identity">
          <div className="login-identity-avatar">🍐</div>
          <div className="login-identity-meta">
            <div className="login-identity-label">You</div>
            <code className="login-identity-key">${shortKey(identity?.publicKey || '')}</code>
          </div>
        </div>

        <div className="login-section-label">${appLabel} WILL SEE</div>
        <div className="login-scopes">
          ${(request.scopes || []).length === 0
            ? html`<div className="login-scope-empty">Nothing — sign-in only confirms it's you.</div>`
            : (request.scopes || []).map((s) => {
                const meta = SCOPE_LABELS[s] || { label: s, detail: '' }
                const on = granted.has(s)
                return html`
                  <label className=${'login-scope' + (on ? ' on' : '')} key=${s}>
                    <input type="checkbox" checked=${on} onChange=${() => toggle(s)} />
                    <div className="login-scope-meta">
                      <div className="login-scope-label">${meta.label}</div>
                      <div className="login-scope-detail">${meta.detail || s}</div>
                    </div>
                  </label>
                `
              })}
        </div>

        ${request.currentGrant && html`
          <div className="login-existing">
            You previously granted this app on
            ${' ' + new Date(request.currentGrant.grantedAt).toLocaleDateString()}.
          </div>
        `}

        ${err && html`<div className="apps-error">${err}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${() => decide(false)} disabled=${busy !== null}>
            ${busy === 'deny' ? 'Cancelling…' : 'Cancel'}
          </button>
          <button className="btn primary" onClick=${() => decide(true)} disabled=${busy !== null}>
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
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick=${(e) => e.target.classList.contains('modal-overlay') && decide(false)}>
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon" style=${{ background: 'linear-gradient(135deg, #58a6ff, #a371f7)' }}>📡</div>
          <div className="login-header-text">
            <div className="login-app-name">${appLabel}</div>
            <div className="login-app-sub">wants to connect to peers on a swarm topic</div>
            <div className="login-app-key" title=${request.driveKey}>${driveLabel}</div>
          </div>
        </div>

        ${request.reason && html`<div className="login-reason">"${request.reason}"</div>`}

        <div className="login-section-label">SWARM TOPIC</div>
        <div className="login-identity">
          <div className="login-identity-avatar">🔑</div>
          <div className="login-identity-meta">
            <div className="login-identity-label">${request.protocol || 'pear.swarm.v1'}</div>
            <code className="login-identity-key">${topicLabel}</code>
          </div>
        </div>

        <div className="login-section-label">WHAT THIS MEANS</div>
        <div className="login-scopes">
          <div className="login-scope on">
            <div className="login-scope-meta">
              <div className="login-scope-label">Discover peers via DHT</div>
              <div className="login-scope-detail">Other devices on this topic will see your IP address.</div>
            </div>
          </div>
          <div className="login-scope on">
            <div className="login-scope-meta">
              <div className="login-scope-label">Send and receive messages directly</div>
              <div className="login-scope-detail">No relay between your peers and you. Messages aren't logged by PearBrowser.</div>
            </div>
          </div>
        </div>

        <div className="login-existing">
          Approving stores a grant for this app + this topic. You can revoke it any time in <strong>Settings → Connected Apps</strong>.
        </div>

        ${err && html`<div className="apps-error">${err}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${() => decide(false)} disabled=${busy !== null}>
            ${busy === 'deny' ? 'Cancelling…' : 'Cancel'}
          </button>
          <button className="btn primary" onClick=${() => decide(true)} disabled=${busy !== null}>
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
    subtitle: 'Legacy native app — a verified v3 package is required',
    legacyMigrationId: 'd1xbkcpcbi1xa8dexp49rsendra5r67w3qh5a9k8t44oemm4k16y',
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
    url: P2PBUILDERS_URL,
    initial: '🔧',
    gradient: 'linear-gradient(135deg, #ff6600, #fbbf24)'
  }
]

function Onboarding ({ rpc, C, onPickSite, onClose }) {
  const [slide, setSlide] = useState(0)

  const finish = async (pickedSite) => {
    // Persist the flag so we never ask again — fire-and-forget so we
    // don't block the close on a slow user-data write.
    rpc.request(C.CMD_USERDATA_SET_SETTINGS, {
      updates: { onboardingDone: true, onboardingDoneAt: Date.now() }
    }).catch(() => {})
    if (pickedSite?.legacyMigrationId) {
      try {
        await rpc.request(C.CMD_LEGACY_APP_MIGRATION, { legacyMigrationId: pickedSite.legacyMigrationId }, 10000)
      } catch {}
    } else if (pickedSite?.url) {
      onPickSite(pickedSite.url)
    }
    onClose()
  }

  return html`
    <div className="modal-overlay onboarding-overlay" role="dialog" aria-modal="true">
      <div className="modal-card onboarding-card">
        ${slide === 0 && html`
          <div className="onb-slide onb-slide-welcome">
            <div className="onb-hero">
              <${Logo} size=${72} />
            </div>
            <h1 className="onb-title">Welcome to <strong>PearBrowser</strong></h1>
            <p className="onb-subtitle">The web that doesn't go down.</p>
            <p className="onb-blurb">
              A peer-to-peer browser, app store, and site publisher. Pages
              live as Hyperdrives, identified by 32-byte keys, replicated
              by their readers. No DNS. No servers. No accounts.
            </p>
            <div className="onb-actions">
              <button className="btn primary" onClick=${() => setSlide(1)}>Get started →</button>
            </div>
          </div>
        `}
        ${slide === 1 && html`
          <div className="onb-slide">
            <h2 className="onb-stepname">Three things at once</h2>
            <div className="onb-pitch-grid">
              <div className="onb-pitch">
                <div className="onb-pitch-icon">🌐</div>
                <div className="onb-pitch-title">Browse hyper://</div>
                <div className="onb-pitch-body">Paste a drive key, fetch from peers, render in-app.</div>
              </div>
              <div className="onb-pitch">
                <div className="onb-pitch-icon">📦</div>
                <div className="onb-pitch-title">Use verified native apps</div>
                <div className="onb-pitch-body">Legacy entries explain the migration path; native code comes from a verified local package.</div>
              </div>
              <div className="onb-pitch">
                <div className="onb-pitch-icon">✒️</div>
                <div className="onb-pitch-title">Publish your own</div>
                <div className="onb-pitch-body">Block editor → publish → pinned 24/7 on HiveRelay.</div>
              </div>
            </div>
            <p className="onb-blurb onb-foot">
              Your identity is generated automatically and stored on this
              machine. You can back it up later in <em>Settings → Identity</em>
              if you want to use it on another device.
            </p>
            <div className="onb-actions">
              <button className="btn subtle" onClick=${() => setSlide(0)}>← Back</button>
              <button className="btn primary" onClick=${() => setSlide(2)}>Continue →</button>
            </div>
          </div>
        `}
        ${slide === 2 && html`
          <div className="onb-slide">
            <h2 className="onb-stepname">Try a site</h2>
            <p className="onb-blurb">Pick one to start with — you can always come back here.</p>
            <div className="onb-sites">
              ${ONBOARDING_FIRST_SITES.map((s) => html`
                <button
                  className="onb-site-card"
                  key=${s.id}
                  onClick=${() => finish(s)}
                  title=${s.url || 'Legacy native app'}
                >
                  <div className="onb-site-icon" style=${{ background: s.gradient }}>${s.initial}</div>
                  <div className="onb-site-text">
                    <div className="onb-site-title">${s.title}</div>
                    <div className="onb-site-subtitle">${s.subtitle}</div>
                  </div>
                </button>
              `)}
            </div>
            <div className="onb-actions">
              <button className="btn subtle" onClick=${() => setSlide(1)}>← Back</button>
              <button className="onb-skip" onClick=${() => finish(null)}>Skip — I'll explore</button>
            </div>
          </div>
        `}
        <div className="onb-dots">
          ${[0, 1, 2].map((i) => html`
            <span className=${'onb-dot' + (i === slide ? ' on' : '')} key=${i}></span>
          `)}
        </div>
      </div>
    </div>
  `
}

// Catalog icons arrive as base64 data URIs from an untrusted Hyperdrive.
// Only allow image data URIs (or http/https) into an <img src> so a hostile
// catalog can't smuggle a javascript:/other scheme into the renderer.
function safeIconSrc (src) {
  if (typeof src !== 'string') return null
  if (/^data:image\//i.test(src)) return src
  if (/^https?:\/\//i.test(src)) return src
  return null
}

// Render an app/site icon: use any catalogue-inlined iconData, else lazily fetch
// it from the drive (CMD_GET_APP_ICON tries the declared iconRef + well-known
// paths like /icon.svg, /icon.png, /favicon.*). Falls back to a letter glyph.
function AppIcon ({ rpc, C, driveKey, iconRef, iconData, name }) {
  const [src, setSrc] = useState(safeIconSrc(iconData))
  useEffect(() => {
    if (src || !driveKey || !/^[0-9a-f]{64}$/i.test(driveKey) || !(C && C.CMD_GET_APP_ICON)) return
    let alive = true
    rpc.request(C.CMD_GET_APP_ICON, { driveKey, iconRef })
      .then((res) => { const s = safeIconSrc(res && res.iconData); if (alive && s) setSrc(s) })
      .catch(() => {})
    return () => { alive = false }
  }, [driveKey, iconRef])
  return src
    ? html`<img src=${src} alt="" className="app-icon" />`
    : html`<div className="app-icon app-icon-fallback">${(name || '?').charAt(0)}</div>`
}

// Normalize an app's category metadata to a string array. Catalogs in the
// wild use either `categories: [...]` or a single `category: "..."`.
function appCategories (app) {
  if (Array.isArray(app.categories)) return app.categories.map((c) => String(c)).filter(Boolean)
  if (app.category) return [String(app.category)]
  return []
}

function catalogAppSearchText (app) {
  if (!app || typeof app !== 'object') return ''
  return [
    app.name,
    app.description,
    app.author,
    app.id,
    app.version,
    app.source,
    app.catalogName,
    app.verification,
    app.link,
    app.driveKey,
    ...appCategories(app),
    ...(Array.isArray(app._sources) ? app._sources : [])
  ]
    .filter((value) => value != null && value !== '')
    .map((value) => String(value).normalize('NFKC').toLowerCase())
    .join(' ')
}

function unwrapSettings (res) {
  return (res && typeof res.settings === 'object' && res.settings !== null) ? res.settings : (res || {})
}

// Experimental collaborative-catalog (Autobee) panel for the Apps tab. Renders
// nothing unless the experimentalAutobeeCatalogs flag is on (toggled in
// Settings). Tabs are conditionally mounted, so flipping the flag and
// reopening the Apps tab reveals it. Lets you create a co-editable catalog,
// share its autobee:// key, exchange writer keys to invite collaborators, and
// add/remove apps. The backend enforces the flag and writability.
function CollaborativeCatalog ({ rpc, C }) {
  const [enabled, setEnabled] = useState(null) // null = still loading
  const [cat, setCat] = useState(null)          // { keyHex, shareKey, writerKey, writable, name, apps }
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [newName, setNewName] = useState('')
  const [joinKey, setJoinKey] = useState('')
  const [inviteKey, setInviteKey] = useState('')
  const [appKey, setAppKey] = useState('')
  const [appName, setAppName] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    rpc.request(C.CMD_USERDATA_GET_SETTINGS).then((res) => {
      const s = unwrapSettings(res)
      setEnabled(!!s?.experimentalAutobeeCatalogs)
      const owned = typeof s?.autobeeOwnedKey === 'string' ? s.autobeeOwnedKey : null
      if (s?.experimentalAutobeeCatalogs && owned) {
        rpc.request(C.CMD_AUTOBEE_GET, { keyHex: owned }).then(setCat).catch(() => {})
      }
    }).catch(() => setEnabled(false))
  }, [])

  const persistOwned = (keyHex) =>
    rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates: { autobeeOwnedKey: keyHex } }).catch(() => {})
  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 1800) }
  const copy = (text, what) => { try { navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500) } catch {} }

  const create = async () => {
    setErr(''); setBusy('create')
    try {
      const res = await rpc.request(C.CMD_AUTOBEE_CREATE, { name: newName || 'Collaborative Catalog' }, 60000)
      setCat(res); setNewName(''); persistOwned(res.keyHex); flash('Catalog created.')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const open = async () => {
    const parsed = parseCatalogRef(joinKey)
    if (!parsed) return
    setErr(''); setBusy('open')
    try {
      const res = await rpc.request(C.CMD_AUTOBEE_GET, { keyHex: parsed.key }, 60000)
      setCat(res); setJoinKey(''); persistOwned(res.keyHex)
      flash(res.writable ? 'Opened — you are a writer.' : 'Opened read-only — share your writer key to be invited.')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const invite = async () => {
    const writerKey = (parseCatalogRef(inviteKey)?.key || inviteKey).trim()
    setErr(''); setBusy('invite')
    try {
      await rpc.request(C.CMD_AUTOBEE_ADD_WRITER, { keyHex: cat.keyHex, writerKey }, 60000)
      setInviteKey(''); flash('Writer added — they can edit once they sync.')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const addApp = async () => {
    const val = appKey.trim()
    if (!val) return
    if (/^(?:pear|file):\/\//i.test(val)) {
      setErr('Remote executable app links are not accepted. Add browsable hyper:// content only.')
      return
    }
    const app = { driveKey: driveKeyFromHyperRef(val), name: appName || val }
    if (!app.driveKey) { setErr('Enter a valid hyper:// drive key.'); return }
    setErr(''); setBusy('addapp')
    try {
      const res = await rpc.request(C.CMD_AUTOBEE_ADD_APP, { keyHex: cat.keyHex, app }, 60000)
      setCat(res); setAppKey(''); setAppName(''); flash('App added.')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const removeApp = async (id) => {
    setErr(''); setBusy('rm:' + id)
    try {
      const res = await rpc.request(C.CMD_AUTOBEE_REMOVE_APP, { keyHex: cat.keyHex, id }, 60000)
      setCat(res)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  if (!enabled) return null // hidden while loading and when the flag is off

  return html`
    <div className="collab-catalog">
      <h2>Collaborative catalog <span className="settings-subtle">(experimental)</span></h2>
      <p className="subtitle">An app catalog several people can co-edit, synced peer-to-peer. Not pinned on relays yet — reachable only while a writer is online.</p>
      <div className="settings-card">
        ${err && html`<div className="apps-error">${err}</div>`}
        ${notice && html`<div className="apps-ok">${notice}</div>`}

        ${!cat && html`
          <div className="collab-empty">
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Create a new collaborative catalog</div>
                <input className="profile-input" placeholder="Catalog name" value=${newName} onInput=${(e) => setNewName(e.target.value)} />
              </div>
              <button className="btn primary" onClick=${create} disabled=${busy === 'create'}>${busy === 'create' ? 'Creating…' : 'Create'}</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">…or open one by key</div>
                <input className="profile-input" placeholder="autobee://… or 64-hex key" value=${joinKey} onInput=${(e) => setJoinKey(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && open()} />
              </div>
              <button className="btn" onClick=${open} disabled=${busy === 'open' || !joinKey.trim()}>${busy === 'open' ? 'Opening…' : 'Open'}</button>
            </div>
          </div>
        `}

        ${cat && html`
          <div className="collab-open">
            <div className="settings-row">
              <div>
                <div className="settings-label">${cat.name} ${cat.writable ? '' : html`<span className="settings-subtle">· read-only</span>`}</div>
                <div className="settings-subtle">${cat.apps.length} app(s)</div>
              </div>
              <button className="btn subtle" onClick=${() => { setCat(null); persistOwned('') }}>Close</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Share key — anyone can load this in the Apps tab</div>
                <code className="settings-code">${cat.shareKey}</code>
              </div>
              <button className="btn small" onClick=${() => copy(cat.shareKey, 'share')}>${copied === 'share' ? 'Copied' : 'Copy'}</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Your writer key — give this to the owner to be invited</div>
                <code className="settings-code">${cat.writerKey}</code>
              </div>
              <button className="btn small" onClick=${() => copy(cat.writerKey, 'writer')}>${copied === 'writer' ? 'Copied' : 'Copy'}</button>
            </div>

            ${cat.writable && html`
              <div className="collab-writable">
                <div className="settings-row">
                  <div className="profile-field">
                    <div className="settings-label">Invite a writer (paste their writer key)</div>
                    <input className="profile-input" placeholder="64-hex writer key" value=${inviteKey} onInput=${(e) => setInviteKey(e.target.value)} />
                  </div>
                  <button className="btn" onClick=${invite} disabled=${busy === 'invite' || !inviteKey.trim()}>${busy === 'invite' ? 'Adding…' : 'Invite'}</button>
                </div>
                <div className="settings-row">
                  <div className="profile-field">
                    <div className="settings-label">Add an app</div>
                    <input className="profile-input" placeholder="App name (optional)" value=${appName} onInput=${(e) => setAppName(e.target.value)} />
                    <input className="profile-input" placeholder="hyper:// drive key" value=${appKey} onInput=${(e) => setAppKey(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && addApp()} />
                  </div>
                  <button className="btn primary" onClick=${addApp} disabled=${busy === 'addapp' || !appKey.trim()}>${busy === 'addapp' ? 'Adding…' : 'Add app'}</button>
                </div>
              </div>
            `}

            ${cat.apps.length > 0 && html`
              <div className="collab-apps">
                <div className="settings-row"><div className="settings-label">Apps</div></div>
                ${cat.apps.map((a) => html`
                  <div className="settings-row" key=${a.id || a.driveKey || a.link || a.name}>
                    <div>
                      <div className="settings-label">${a.name || a.id}</div>
                      <div className="settings-subtle">${a.driveKey || a.link || ''}</div>
                    </div>
                    ${cat.writable && html`<button className="btn small subtle" onClick=${() => removeApp(a.id)} disabled=${busy === 'rm:' + a.id}>Remove</button>`}
                  </div>
                `)}
              </div>
            `}
          </div>
        `}
      </div>
    </div>
  `
}

// "Submit your app" — anyone can propose an app for the COMMUNITY catalogue.
// CMD_SUBMIT_APP publishes a manifest drive + seeds the app drive via HiveRelay;
// the relay queues a pin request in `review` mode. The app appears in everyone's
// Community list once a moderator approves it (ModeratorPanel below).
function CommunitySubmit ({ rpc, C }) {
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [categories, setCategories] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const submit = async () => {
    setErr(''); setOk('')
    if (!name.trim()) { setErr('App name is required.'); return }
    if (!link.trim()) { setErr('Paste a hyper:// link or a drive key.'); return }
    if (/^(?:pear|file):\/\//i.test(link.trim())) { setErr('Remote executable app links are not accepted. Submit browsable hyper:// content only.'); return }
    setBusy(true)
    try {
      const res = await rpc.request(C.CMD_SUBMIT_APP, {
        name: name.trim(), link: link.trim(), description: description.trim(),
        author: author.trim(), categories
      }, 90000)
      setOk(`Submitted "${(res && res.manifest && res.manifest.name) || name.trim()}" for review — it joins the Community list once a moderator approves it.`)
      setName(''); setLink(''); setDescription(''); setAuthor(''); setCategories('')
    } catch (e) { setErr((e && e.message) || String(e)) } finally { setBusy(false) }
  }

  return html`
    <div className="community-submit">
      <h2>Submit your app <span className="settings-subtle">→ Community list</span></h2>
      <p className="subtitle">Add browsable Hyperdrive content to the community catalogue. HiveRelay replicates content; it never attests or delivers native executable code.</p>
      <div className="settings-card">
        ${err && html`<div className="apps-error">${err}</div>`}
        ${ok && html`<div className="apps-ok">${ok}</div>`}
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">App name *</div>
            <input className="profile-input" placeholder="My Cool App" value=${name} onInput=${(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Link *</div>
            <input className="profile-input" placeholder="hyper://… (or a 64-hex / z-base-32 key)" value=${link} onInput=${(e) => setLink(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && submit()} />
          </div>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Description</div>
            <input className="profile-input" placeholder="What does it do?" value=${description} onInput=${(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Author</div>
            <input className="profile-input" placeholder="Your name or handle" value=${author} onInput=${(e) => setAuthor(e.target.value)} />
          </div>
          <div className="profile-field">
            <div className="settings-label">Categories</div>
            <input className="profile-input" placeholder="tools, social" value=${categories} onInput=${(e) => setCategories(e.target.value)} />
          </div>
        </div>
        <div className="settings-row">
          <button className="btn primary" onClick=${submit} disabled=${busy || !name.trim() || !link.trim()}>${busy ? 'Submitting…' : 'Submit for review'}</button>
        </div>
      </div>
    </div>
  `
}

// In-app moderator panel — operator-gated (needs the relay management URL + API
// key, saved to userdata settings). Lists the relay's pending pin-requests
// (CMD_MOD_PENDING) and approves/rejects them (CMD_MOD_APPROVE / CMD_MOD_REJECT).
// Collapsed by default since only the operator needs it. The relay must run in
// `review` accept mode for submissions to queue here.
function ModeratorPanel ({ rpc, C }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(null) // null = not loaded yet
  const [mode, setMode] = useState(null)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    rpc.request(C.CMD_USERDATA_GET_SETTINGS).then((res) => {
      const s = unwrapSettings(res) || {}
      if (typeof s.relayManageUrl === 'string') setUrl(s.relayManageUrl)
      if (typeof s.relayManageKey === 'string') setApiKey(s.relayManageKey)
    }).catch(() => {})
  }, [])

  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(''), 1800) }

  const saveConfig = async () => {
    setErr('')
    try {
      await rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates: { relayManageUrl: url.trim(), relayManageKey: apiKey.trim() } })
      setSaved(true); setTimeout(() => setSaved(false), 1500); flash('Saved.')
    } catch (e) { setErr(e.message) }
  }

  const loadPending = async () => {
    setErr(''); setBusy('load')
    try {
      const res = await rpc.request(C.CMD_MOD_PENDING, {}, 30000)
      setPending(res.pending || []); setMode(res.mode || null)
    } catch (e) { setErr(e.message); setPending([]) } finally { setBusy(null) }
  }

  const decide = async (appKey, approve) => {
    setErr(''); setBusy((approve ? 'a:' : 'r:') + appKey)
    try {
      await rpc.request(approve ? C.CMD_MOD_APPROVE : C.CMD_MOD_REJECT, { appKey }, 60000)
      setPending((list) => (list || []).filter((p) => p.appKey !== appKey))
      flash(approve ? 'Approved + pinned.' : 'Rejected.')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  return html`
    <div className="moderator-panel">
      <h2>
        <button className="btn subtle small" onClick=${() => setOpen((v) => !v)} style=${{ marginRight: '8px' }}>${open ? '▾' : '▸'}</button>
        Moderator tools <span className="settings-subtle">(operator)</span>
      </h2>
      ${open && html`
        <div className="settings-card">
          ${err && html`<div className="apps-error">${err}</div>`}
          ${notice && html`<div className="apps-ok">${notice}</div>`}
          <p className="subtitle">Review apps submitted to the Community list. Needs your relay's management URL + operator API key. The relay must run in <code>review</code> accept mode.</p>
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Relay management URL</div>
              <input className="profile-input" placeholder="https://relay-eu.p2phiverelay.xyz or http://127.0.0.1:9100" value=${url} onInput=${(e) => setUrl(e.target.value)} />
            </div>
          </div>
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Operator API key</div>
              <input className="profile-input" type="password" placeholder="Bearer token" value=${apiKey} onInput=${(e) => setApiKey(e.target.value)} />
            </div>
            <button className="btn" onClick=${saveConfig}>${saved ? 'Saved' : 'Save'}</button>
          </div>
          <div className="settings-row">
            <button className="btn primary" onClick=${loadPending} disabled=${busy === 'load' || !url.trim()}>${busy === 'load' ? 'Loading…' : 'Load pending'}</button>
            ${mode && html`<span className="settings-subtle">relay mode: ${mode}</span>`}
          </div>
          ${pending && pending.length === 0 && html`<div className="settings-subtle" style=${{ padding: '6px 0' }}>No pending submissions.</div>`}
          ${pending && pending.length > 0 && html`
            <div className="mod-pending">
              ${pending.map((p) => html`
                <div className="settings-row" key=${p.appKey}>
                  <div style=${{ minWidth: 0 }}>
                    <div className="settings-label" style=${{ fontFamily: 'monospace' }}>${(p.appKey || '').slice(0, 16)}…</div>
                    <div className="settings-subtle">by ${(p.publisherPubkey || 'unknown').slice(0, 12)}…${p.currentRelays ? ` · ${p.currentRelays} relay(s)` : ''}</div>
                  </div>
                  <div style=${{ display: 'flex', gap: '6px' }}>
                    <button className="btn small primary" onClick=${() => decide(p.appKey, true)} disabled=${!!busy}>${busy === 'a:' + p.appKey ? '…' : 'Approve'}</button>
                    <button className="btn small subtle" onClick=${() => decide(p.appKey, false)} disabled=${!!busy}>${busy === 'r:' + p.appKey ? '…' : 'Reject'}</button>
                  </div>
                </div>
              `)}
            </div>
          `}
        </div>
      `}
    </div>
  `
}

// Browser-side defensive dedup. The backend aggregate now collapses by stable
// identity (driveKey, else link, else id), but keep this final pass for stale
// backends and local state restored from older versions. It mirrors the backend
// winner rule: verification first, then version, while recording source names.
const VERIFICATION_RANK = { 'author-signed': 3, 'relay-listed': 2, unverified: 1 }
function appVersionGreater (a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0; const y = pb[i] || 0
    if (x !== y) return x > y
  }
  return false
}
function betterApp (a, b) {
  const va = VERIFICATION_RANK[a.verification] || 1
  const vb = VERIFICATION_RANK[b.verification] || 1
  if (va !== vb) return va > vb ? a : b
  if (appVersionGreater(a.version, b.version)) return a
  if (appVersionGreater(b.version, a.version)) return b
  return b
}
function normalizeAppLinkForKey (raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.replace(/^([a-z][a-z0-9+.-]*):\/\//i, (_, scheme) => scheme.toLowerCase() + '://')
}
function appStableDedupeKey (app) {
  if (!app || typeof app !== 'object') return ''
  const driveKey = /^[0-9a-f]{64}$/i.test(String(app.driveKey || '').trim())
    ? String(app.driveKey).trim().toLowerCase()
    : ''
  const link = normalizeAppLinkForKey(app.link)
  const hyperKey = /^hyper:\/\//i.test(link) ? driveKeyFromHyperRef(link) : ''
  if (driveKey || hyperKey) return 'drive:' + (driveKey || hyperKey)
  if (/^hyper:\/\/.+/i.test(link)) return 'link:' + link
  const legacyMigrationId = String(app.legacyMigrationId || '').trim().toLowerCase()
  if (/^[13-9a-km-uw-z]{52}$/.test(legacyMigrationId)) return 'legacy:' + legacyMigrationId
  const id = String(app.id || '').trim()
  return id ? 'id:' + id : ''
}
function dedupeApps (list) {
  const byKey = new Map()
  const anon = []
  for (const app of list) {
    const key = appStableDedupeKey(app)
    if (!key) {
      anon.push(app)
      continue
    }
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { ...app, _sources: app.catalogName ? [app.catalogName] : [] })
      continue
    }
    const sources = [...new Set([...(existing._sources || []), app.catalogName].filter(Boolean))]
    // Keep the most-trustworthy copy's metadata, but backfill presentation-only
    // fields (icon) from the other copy — so an app whose winning entry lacks an
    // icon still shows one if ANY catalogue carries it (e.g. the offline seed
    // wins on verification but only the published bee carries the inline icon).
    const winner = betterApp(app, existing)
    const other = winner === app ? existing : app
    const merged = { ...winner }
    if (!merged.iconData && other.iconData) merged.iconData = other.iconData
    if (!merged.icon && other.icon) merged.icon = other.icon
    byKey.set(key, { ...merged, _sources: sources })
  }
  return [...byKey.values(), ...anon]
}

// Drive metadata belongs to browsable Hyper content only. A legacy native-app
// migration identifier is intentionally not a drive key and has no fetch path.
function appBundleKey (app) {
  if (app && /^[0-9a-f]{64}$/i.test(app.driveKey || '')) return app.driveKey.toLowerCase()
  return null
}

// A card footer for a browsable Hyper address, its size, and live peer count.
function AppMeta ({ rpc, C, app }) {
  const bundleKey = appBundleKey(app)
  const addr = (app && app.link) ? app.link : (app && /^[0-9a-f]{64}$/i.test(app.driveKey || '') ? ('hyper://' + app.driveKey + '/') : null)
  const [info, setInfo] = useState(null)
  useEffect(() => {
    if (!bundleKey || !(C && C.CMD_GET_DRIVE_INFO)) { setInfo(null); return }
    let cancelled = false
    const load = async () => {
      try { const r = await rpc.request(C.CMD_GET_DRIVE_INFO, { keyHex: bundleKey }, 12000); if (!cancelled) setInfo(r) } catch { /* best-effort */ }
    }
    load()
    const t = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [bundleKey, rpc, C])
  if (!addr) return null
  const shortAddr = addr.length > 30 ? (addr.slice(0, 20) + '…' + addr.slice(-6)) : addr
  const peers = info ? (info.peerCount || 0) : null
  const size = info && info.byteLength ? formatBytes(info.byteLength) : null
  return html`
    <div className="app-p2p-meta" style=${{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '5px', fontSize: '11px' }}>
      <button title=${'Copy ' + addr} onClick=${(e) => { e.stopPropagation(); copyText(addr) }} style=${{ background: 'none', border: 'none', padding: 0, color: '#6e7681', cursor: 'pointer', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}>${shortAddr} ⧉</button>
      ${size ? html`<span style=${{ color: '#8b949e' }}>${size}</span>` : ''}
      <span title="Peers currently serving this app" style=${{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: peers > 0 ? '#3fb950' : '#6e7681' }}>
        <span style=${{ width: '6px', height: '6px', borderRadius: '50%', background: peers > 0 ? '#3fb950' : '#484f58', display: 'inline-block' }}></span>
        ${peers == null ? '…' : (peers + ' ' + (peers === 1 ? 'peer' : 'peers'))}
      </span>
    </div>
  `
}

// Inline download-progress bar shown in place of a card's Run-app button while
// the bundle is being pulled (driven by EVT_LAUNCH_PROGRESS).

function Apps ({ rpc, C, onLaunch }) {
  const [catalogKey, setCatalogKey] = useState('')
  // Cross-catalog store: PearBrowser keeps every catalog the user has
  // added loaded at once and merges them into one searchable list. `apps`
  // is the de-duplicated aggregate (each tagged with its source catalog);
  // `loadedCatalogs` is the metadata behind the source-facet chips.
  const [apps, setApps] = useState([])
  const [loadedCatalogs, setLoadedCatalogs] = useState([])
  // The app whose detail "product page" is open (null = closed).
  const [detailApp, setDetailApp] = useState(null)
  // Discovery facets: free-text search, category, and source catalog;
  // plus a map of appId → available newer version (from CMD_CHECK_UPDATES).
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [source, setSource] = useState('all')
  const [updates, setUpdates] = useState({})
  // Catalog authoring: the user's own publishable catalog (or null).
  const [myCatalog, setMyCatalog] = useState(null)
  const [newCatalogName, setNewCatalogName] = useState('')
  const [editingCatalogName, setEditingCatalogName] = useState(false)
  const [catalogNameDraft, setCatalogNameDraft] = useState('')
  const [editingAppId, setEditingAppId] = useState(null)
  const [appDraft, setAppDraft] = useState(null)
  const [copied, setCopied] = useState(false)
  // Recent catalog keys (loaded successfully at least once) — persisted
  // via user-data settings so they survive across launches.
  const [recentCatalogs, setRecentCatalogs] = useState([])
  const [installed, setInstalled] = useState([])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false)
  const [launched, setLaunched] = useState('')
  const showLegacyMigration = async (app) => {
    const legacyMigrationId = String(app?.legacyMigrationId || '').trim().toLowerCase()
    if (!legacyMigrationId) {
      setErr(`${app?.name || 'This app'} has no verified native v3 package yet.`)
      return
    }
    setErr(''); setBusy('legacy-migration'); setLaunched('')
    try {
      const result = await rpc.request(C.CMD_LEGACY_APP_MIGRATION, { legacyMigrationId }, 10000)
      setErr(result?.message || 'A verified native v3 package is required.')
    } catch (e) {
      setErr(`migration: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  // A featured item either opens browsable content or explains that its former
  // native release needs a verified package. It never treats a catalog value as
  // executable code.
  const launchFeaturedApp = (app) => {
    if (app?.nativeDelivery?.status === 'migration-required') {
      showLegacyMigration(app)
      return
    }
    const link = (app.link || '').trim()
    if (!link) return
    if (link.startsWith('hyper://') || link.startsWith('http://') || link.startsWith('https://')) {
      // onLaunch is the App-level helper that does setNavUrl(url) +
      // setTab('browse'). Browse opens this in a new browser-tab if
      // the active tab already has content, otherwise navigates the
      // current empty tab — either way it feels like launching an
      // app rather than redirecting the user's current page.
      setErr('')
      onLaunch?.(link)
      setLaunched(`Launched ${app.name} in Browse — window.pear.${app.id}.* shim will inject if the manifest gate passes.`)
      setTimeout(() => setLaunched(''), 4000)
      return
    }
    setErr(`launch: unsupported scheme for featured app "${app.name}" — ${link.slice(0, 32)}`)
  }

  // Run in tab: spawn the app as a HEADLESS pear-request worker and stream its
  // htmx UI into a Browse tab (no separate window). The backend returns a local
  // wrapper URL; onLaunch opens it in Browse just like any other page.
  const runInTab = async (app) => {
    if (app && app.type !== 'hypersite') {
      setErr(`${app.name || 'This app'} is window-only: its catalogue type is "${app.type || 'standalone'}", not "hypersite".`)
      return
    }
    setErr(''); setBusy('run-in-tab'); setLaunched('')
    try {
      const res = await rpc.request(C.CMD_RUN_APP_IN_TAB, { link: app.link }, 30000)
      if (res?.action === 'legacy-migration-required') {
        setErr(res.message || 'A verified native v3 package is required.')
        return
      }
      onLaunch?.(res.url)
      setLaunched(`Running ${app.name} headless in a tab.`)
      setTimeout(() => setLaunched(''), 4000)
    } catch (e) {
      setErr(`run in tab: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  // A static hyperdrive site (driveKey, no pear-request link) "runs" by opening
  // in a Browse tab — its HTML renders directly. (pear-request hypersites use
  // runInTab; standalone apps open in their own window via launchFeaturedApp.)
  const openSite = (app) => {
    if (!app || !app.driveKey) return
    setErr(''); setLaunched('')
    onLaunch?.('hyper://' + app.driveKey + '/')
    setLaunched(`Opened ${app.name}.`)
    setTimeout(() => setLaunched(''), 3500)
  }

  const refreshInstalled = async () => {
    try {
      const list = await rpc.request(C.CMD_LIST_INSTALLED)
      setInstalled(Array.isArray(list) ? list : (list?.apps ?? []))
    } catch (e) {
      setErr(`list failed: ${e.message}`)
    }
  }

  // Ask the backend which installed apps are behind the loaded catalog's
  // version. Non-critical — a failure just means no update badges.
  const refreshUpdates = async () => {
    try {
      const list = await rpc.request(C.CMD_CHECK_UPDATES)
      const map = {}
      for (const u of (Array.isArray(list) ? list : [])) {
        if (u && u.id) map[u.id] = u.newVersion
      }
      setUpdates(map)
    } catch {
      // ignore — update detection is best-effort
    }
  }

  // Re-install an installed app at its catalog's newer version. Re-running
  // install re-syncs the drive and bumps the stored version, so the same
  // path that installs an app also updates it.
  const updateApp = async (id) => {
    const catalogApp = apps.find((a) => a.id === id)
    if (!catalogApp) { setErr(`update ${id}: not in any loaded catalog`); return }
    await installApp(catalogApp)
    await refreshUpdates()
  }

  const inMyCatalog = (target) => {
    const targets = Array.isArray(target) ? target.filter(Boolean) : [target].filter(Boolean)
    if (!myCatalog || !targets.length || !Array.isArray(myCatalog.apps)) return false
    return myCatalog.apps.some((a) => targets.some((id) => a.id === id || a.driveKey === id || a.link === id))
  }
  const canEditMyCatalog = !!(myCatalog && myCatalog.writable)

  const copyKey = (k) => {
    try {
      navigator.clipboard.writeText(k)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }

  // Create the user's own catalog, persist its key, and load it into the
  // aggregated store so their picks show up alongside everyone else's.
  const createMyCatalog = async () => {
    setErr(''); setBusy('mycatalog')
    try {
      const res = await rpc.request(C.CMD_MYCATALOG_CREATE, { name: newCatalogName }, 60000)
      setMyCatalog(res)
      setNewCatalogName('')
      rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates: { myCatalogKey: res.keyHex } }).catch(() => {})
      await loadCatalog(res.keyHex)
    } catch (e) {
      setErr(`catalog create: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const addToMyCatalog = async (app) => {
    if (!myCatalog) return
    if (!myCatalog.writable) {
      setErr('This catalog is not editable on this device.')
      return
    }
    const id = app.id || app.driveKey || app.link
    setErr(''); setBusy(`addcat:${id}`)
    try {
      const res = await rpc.request(C.CMD_MYCATALOG_ADD_APP, { keyHex: myCatalog.keyHex, app }, 60000)
      setMyCatalog(res)
      await refreshAggregate()
      refreshUpdates()
    } catch (e) {
      setErr(`add to catalog: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const removeFromMyCatalog = async (id) => {
    if (!myCatalog) return
    if (!myCatalog.writable) {
      setErr('This catalog is not editable on this device.')
      return
    }
    setErr(''); setBusy(`rmcat:${id}`)
    try {
      const res = await rpc.request(C.CMD_MYCATALOG_REMOVE_APP, { keyHex: myCatalog.keyHex, id }, 60000)
      setMyCatalog(res)
      if (editingAppId === id) {
        setEditingAppId(null)
        setAppDraft(null)
      }
      await refreshAggregate()
      refreshUpdates()
    } catch (e) {
      setErr(`remove from catalog: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const startRenameMyCatalog = () => {
    if (!myCatalog) return
    setCatalogNameDraft(myCatalog.name || 'My Catalog')
    setEditingCatalogName(true)
  }

  const saveMyCatalogName = async () => {
    if (!myCatalog) return
    if (!myCatalog.writable) {
      setErr('This catalog is not editable on this device.')
      return
    }
    setErr(''); setBusy('renamecat')
    try {
      const res = await rpc.request(C.CMD_MYCATALOG_RENAME, {
        keyHex: myCatalog.keyHex,
        name: catalogNameDraft
      }, 60000)
      setMyCatalog(res)
      setEditingCatalogName(false)
      await refreshAggregate()
      refreshUpdates()
    } catch (e) {
      setErr(`rename catalog: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const startEditMyCatalogApp = (app) => {
    const id = app.id || app.driveKey || app.link
    if (!id) return
    setEditingAppId(id)
    setAppDraft({
      name: app.name || '',
      type: app.type || 'standalone',
      description: app.description || '',
      version: app.version || '',
      author: app.author || '',
      categories: appCategories(app).join(', '),
      icon: app.icon || app.iconRef || ''
    })
  }

  const updateAppDraft = (field, value) => {
    setAppDraft((prev) => ({ ...(prev || {}), [field]: value }))
  }

  const cancelEditMyCatalogApp = () => {
    setEditingAppId(null)
    setAppDraft(null)
  }

  const saveMyCatalogApp = async (id) => {
    if (!myCatalog || !appDraft) return
    if (!myCatalog.writable) {
      setErr('This catalog is not editable on this device.')
      return
    }
    const categories = String(appDraft.categories || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
    setErr(''); setBusy(`editcat:${id}`)
    try {
      const res = await rpc.request(C.CMD_MYCATALOG_UPDATE_APP, {
        keyHex: myCatalog.keyHex,
        id,
        app: {
          name: appDraft.name,
          type: appDraft.type,
          description: appDraft.description,
          version: appDraft.version,
          author: appDraft.author,
          categories,
          icon: appDraft.icon
        }
      }, 60000)
      setMyCatalog(res)
      setEditingAppId(null)
      setAppDraft(null)
      await refreshAggregate()
      refreshUpdates()
    } catch (e) {
      setErr(`edit app: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  // Pull the aggregated app list + loaded-catalog metadata from the
  // backend. The backend keeps every catalog open, so this is the single
  // source of truth for the cross-catalog view.
  const refreshAggregate = async () => {
    try {
      const res = await rpc.request(C.CMD_GET_CATALOG_APPS)
      setApps(Array.isArray(res?.apps) ? res.apps : [])
      setLoadedCatalogs(Array.isArray(res?.catalogs) ? res.catalogs : [])
    } catch (e) {
      setErr(`catalog: ${e.message}`)
    }
  }

  // Add a catalog to the set (does not replace existing ones), persist it
  // as recent, then re-aggregate.
  const loadCatalog = async (overrideKey) => {
    const raw = (typeof overrideKey === 'string' ? overrideKey : catalogKey).trim()
    const parsed = parseCatalogRef(raw)
    if (!parsed) return
    setErr(''); setBusy('catalog')
    try {
      // Route by scheme: hyper(drive) / hyperbee:// / autobee:// / sheets:// / hiveindex://.
      const { cmd, payload, persistRef } = catalogLoadPlan(parsed, C)
      await rpc.request(cmd, payload || { keyHex: parsed.key }, 60000)
      setCatalogKey('')
      await refreshAggregate()
      refreshUpdates()
      // Pin as recent + persist the scheme-qualified ref so the next launch
      // routes to the same loader.
      setRecentCatalogs((prev) => {
        const next = [persistRef, ...prev.filter((k) => k !== persistRef)].slice(0, 8)
        rpc.request(C.CMD_USERDATA_SET_SETTINGS, {
          updates: { lastCatalogKey: persistRef, recentCatalogs: next }
        }).catch(() => {})
        return next
      })
    } catch (e) {
      setErr(`catalog: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  // Drop a catalog from the aggregated set. Also clears the source facet
  // if it was pointing at the removed catalog, and forgets it as recent.
  const unloadCatalog = async (key) => {
    setErr('')
    try {
      await rpc.request(C.CMD_UNLOAD_CATALOG, { keyHex: key })
      if (source === key) setSource('all')
      await refreshAggregate()
      const removed = catalogCacheKeyForRef(key)
      setRecentCatalogs((prev) => {
        const next = prev.filter((k) => catalogCacheKeyForRef(k) !== removed)
        rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates: { recentCatalogs: next } }).catch(() => {})
        return next
      })
    } catch (e) {
      setErr(`unload: ${e.message}`)
    }
  }

  // First mount: fetch installed list, then load every known catalog so
  // the aggregated store is populated, not just the most recent one.
  useEffect(() => {
    refreshInstalled()
    // Pull the aggregated store immediately so backend-registered catalogues
    // (e.g. the default schema-sheets catalogue, seeded on boot) show up without
    // waiting on a recent/relay catalog load to resolve.
    refreshAggregate()
    ;(async () => {
      try {
        const settings = unwrapSettings(await rpc.request(C.CMD_USERDATA_GET_SETTINGS))
        const recentRaw = Array.isArray(settings?.recentCatalogs) ? settings.recentCatalogs : []
        // Back-compat: older builds persisted only a single lastCatalogKey.
        const last = settings?.lastCatalogKey
        const myKey = typeof settings?.myCatalogKey === 'string' ? settings.myCatalogKey : null
        // Migrate installs stuck on the dead 0c35 hyperdrive (its writable secret was
        // unrecoverable) → the live PearBrowser Network bee. Handles bare + hyper:// forms.
        const migrateKey = (k) => (parseCatalogRef(k)?.key === OLD_DEAD_CATALOG_KEY ? DEFAULT_CATALOG_KEY : k)
        const recent = recentRaw.map(migrateKey)
        if (recent.some((k, i) => k !== recentRaw[i])) {
          rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates: { recentCatalogs: recent } }).catch(() => {})
        }
        const keys = [...new Set([...recent, ...(last ? [migrateKey(last)] : []), ...(myKey ? [myKey] : [])])]
        if (recent.length) setRecentCatalogs(recent)
        if (myKey) {
          rpc.request(C.CMD_MYCATALOG_GET, { keyHex: myKey }).then(setMyCatalog).catch(() => {})
        }
        // Fresh install: nothing saved yet. Seed the curated default catalog
        // once so the Apps tab shows apps on first visit instead of an empty
        // store. We only seed a single time (defaultCatalogSeeded) so that if
        // the user later unloads everything we respect that rather than
        // re-adding the default on every launch.
        const seeded = settings?.defaultCatalogSeeded === true
        const communitySeeded = settings?.communityCatalogSeeded === true
        const comKey = parseCatalogRef(DEFAULT_COMMUNITY_CATALOG)?.key
        const hasCommunity = keys.some((k) => parseCatalogRef(k)?.key === comKey)
        // Fresh install → load BOTH defaults (curated + community). An install that
        // predates the community list → add it once (communityCatalogSeeded), so a
        // later manual unload is still respected rather than re-added every launch.
        let toLoad = keys.length ? [...keys] : (seeded ? [] : [DEFAULT_CATALOG_KEY, DEFAULT_COMMUNITY_CATALOG])
        const addCommunity = !hasCommunity && !communitySeeded
        if (addCommunity) toLoad = [...new Set([...toLoad, DEFAULT_COMMUNITY_CATALOG])]
        if (toLoad.length) {
          setBusy('catalog')
          await Promise.allSettled(
            toLoad.map((k) => {
              const parsed = parseCatalogRef(k)
              if (!parsed) return Promise.resolve()
              const { cmd, payload } = catalogLoadPlan(parsed, C)
              // The community bee's durability is best-effort; cap its load so an
              // unreachable community catalog can't delay the curated list or the
              // aggregate refresh. The backend now also bounds the read itself.
              const isCommunity = parseCatalogRef(DEFAULT_COMMUNITY_CATALOG)?.key === parsed.key
              return rpc.request(cmd, payload || { keyHex: parsed.key }, isCommunity ? 25000 : 60000)
            })
          )
          const updates = {}
          if (!keys.length && !seeded) {
            const fresh = [DEFAULT_CATALOG_KEY, DEFAULT_COMMUNITY_CATALOG]
            setRecentCatalogs(fresh)
            updates.recentCatalogs = fresh
            updates.defaultCatalogSeeded = true
            updates.communityCatalogSeeded = true
          } else if (addCommunity) {
            const next = [...new Set([...recent, DEFAULT_COMMUNITY_CATALOG])]
            setRecentCatalogs(next)
            updates.recentCatalogs = next
            updates.communityCatalogSeeded = true
          }
          if (Object.keys(updates).length) {
            rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates }).catch(() => {})
          }
          await refreshAggregate()
          refreshUpdates()
          setBusy(null)
        }
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

  // Category facets across all loaded catalogs, plus the filtered view.
  // Recomputed only when the aggregate or filters change.
  const categories = useMemo(() => {
    const set = new Set()
    for (const a of apps) appCategories(a).forEach((c) => set.add(c))
    return ['all', ...[...set].sort()]
  }, [apps])

  const filteredApps = useMemo(() => {
    const q = query.normalize('NFKC').trim().toLowerCase()
    const matched = apps.filter((a) => {
      // Apps page presents browsable content and legacy migration records.
      if (!a || (!a.link && !a.legacyMigrationId)) return false
      if (source !== 'all' && a.catalogKey !== source) return false
      if (category !== 'all' && !appCategories(a).includes(category)) return false
      if (!q) return true
      return catalogAppSearchText(a).includes(q)
    })
    // Collapse the same app across catalogues / duplicate rows.
    return dedupeApps(matched)
  }, [apps, query, category, source])

  // Total unique-app count (deduped, ignoring search/category) for the headers.
  const uniqueAppCount = useMemo(() => dedupeApps(apps.filter((a) => a && (a.link || a.legacyMigrationId))).length, [apps])

  const renderMyCatalogApp = (app) => {
    const savedId = app.id || app.driveKey || app.name || 'untitled'
    const editableId = app.id || app.driveKey
    const editing = editingAppId === editableId && appDraft
    const canSave = !!(appDraft && String(appDraft.name || '').trim())
    return html`
      <div className=${'app-card' + (editing ? ' editing' : '')} key=${savedId}>
        <${AppIcon} rpc=${rpc} C=${C} driveKey=${app.driveKey} iconRef=${app.icon} iconData=${app.iconData} name=${app.name} />
        <div className="app-info">
          ${editing
            ? html`
              <div className="catalog-edit-wrap">
                <div className="catalog-edit-form">
                  <label>
                    Name
                    <input type="text" value=${appDraft.name} onInput=${(e) => updateAppDraft('name', e.target.value)} />
                  </label>
                  <label>
                    Type <span style=${{ opacity: 0.6, fontWeight: 'normal' }}>(how it launches — required)</span>
                    <select value=${appDraft.type || 'standalone'} onChange=${(e) => updateAppDraft('type', e.target.value)} style=${{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d' }}>
                      <option value="hypersite">hypersite — browsable P2P content</option>
                    </select>
                  </label>
                  <label>
                    Description
                    <textarea rows="3" value=${appDraft.description} onInput=${(e) => updateAppDraft('description', e.target.value)}></textarea>
                  </label>
                  <div className="catalog-form-grid">
                    <label>
                      Version
                      <input type="text" value=${appDraft.version} onInput=${(e) => updateAppDraft('version', e.target.value)} />
                    </label>
                    <label>
                      Author
                      <input type="text" value=${appDraft.author} onInput=${(e) => updateAppDraft('author', e.target.value)} />
                    </label>
                  </div>
                  <label>
                    Categories
                    <input type="text" value=${appDraft.categories} onInput=${(e) => updateAppDraft('categories', e.target.value)} />
                  </label>
                  <label>
                    Icon <span style=${{ opacity: 0.6, fontWeight: 'normal' }}>(path inside your drive, e.g. /icon.svg)</span>
                    <input type="text" placeholder="/icon.svg" value=${appDraft.icon || ''} onInput=${(e) => updateAppDraft('icon', e.target.value)} />
                  </label>
                  ${(app.link || app.driveKey) && html`<div className="app-meta" style=${{ marginTop: '2px', fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#6e7681', wordBreak: 'break-all' }}>launch: ${app.link || ('hyper://' + app.driveKey + '/')}</div>`}
                </div>
              </div>
            `
            : html`
              <div className="app-info-copy">
                <div className="app-name">${app.name || app.id}</div>
                <div className="app-desc">${app.description || ''}</div>
                <div className="app-meta">${app.version ? 'v' + app.version : ''} ${app.author ? '· ' + app.author : ''}</div>
              </div>
            `}
        </div>
        <div className="app-actions">
          ${editing
            ? html`
              <div className="app-actions-group">
                <button key="save" className="btn primary" onClick=${() => saveMyCatalogApp(editableId)} disabled=${busy === `editcat:${editableId}` || !canSave}>
                  ${busy === `editcat:${editableId}` ? 'Saving…' : 'Save'}
                </button>
                <button key="cancel" className="btn subtle" onClick=${cancelEditMyCatalogApp} disabled=${busy === `editcat:${editableId}`}>Cancel</button>
              </div>
            `
            : html`
              <div className="app-actions-group">
                ${canEditMyCatalog && editableId && html`
                  <button key="edit" className="btn subtle" onClick=${() => startEditMyCatalogApp(app)} disabled=${busy === `rmcat:${editableId}`}>Edit</button>
                  <button key="remove" className="btn subtle" onClick=${() => removeFromMyCatalog(editableId)} disabled=${busy === `rmcat:${editableId}`}>Remove</button>
                `}
              </div>
            `}
        </div>
      </div>
    `
  }

  return html`
    <div className="apps">
      <h1>Apps</h1>
      <p className="subtitle">Browse P2P content or find verified native v3 package guidance in a HiveRelay catalog.</p>

      <h2>Featured</h2>
      <div className="app-grid">
        ${FEATURED_APPS.map((app) => html`
          <div className="app-card" key=${app.id}>
            <div className="app-icon app-icon-fallback" style=${{ background: app.gradient, color: '#0b0e14' }}>${app.initial}</div>
            <div className="app-info">
              <div className="app-name">${app.name}</div>
              <div className="app-desc">${app.tagline}</div>
              <div className="app-meta" title=${app.legacyMigrationId}>Legacy native release · migration required</div>
            </div>
            <div className="app-actions">
              ${app.type === 'hypersite'
                ? html`<button key="run-featured" className="btn primary" onClick=${() => runInTab(app)} disabled=${busy === 'run-in-tab'} title="Run headless — the app's UI streams into a tab over a pipe">Run in tab</button>`
                : html`<button key="open-featured" className="btn primary" onClick=${() => launchFeaturedApp(app)} disabled=${busy === 'legacy-migration'} title="Requires a verified native v3 package">Migration status</button>`}
            </div>
          </div>
        `)}
      </div>

      <h2>Legacy native apps</h2>
      <div className="catalog-loader">
        <p className="placeholder">Older remote app links cannot run in PearBrowser. Install only a publisher-provided, verified native v3 package.</p>
      </div>
      ${launched && html`<div className="apps-ok">${launched}</div>`}

      <h2>App Catalog</h2>
      <div className="catalog-loader">
        <input
          type="text"
          placeholder="Catalog key: hex, z32, hyperbee://…, autobee://…, sheets://… or hiveindex://…"
          value=${catalogKey}
          onInput=${(e) => setCatalogKey(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && loadCatalog()}
          spellCheck="false"
        />
        <button className="btn primary" onClick=${() => loadCatalog()} disabled=${!catalogKey || busy === 'catalog'}>
          ${busy === 'catalog' ? 'Loading…' : 'Add catalog'}
        </button>
      </div>

      ${loadedCatalogs.length > 0 && html`
        <div className="catalog-sources">
          <button
            className=${'catalog-chip' + (source === 'all' ? ' active' : '')}
            onClick=${() => setSource('all')}
          >All · ${uniqueAppCount}</button>
          ${loadedCatalogs.map((cat) => html`
            <span className="catalog-source" key=${cat.key}>
              <button
                className=${'catalog-chip' + (source === cat.key ? ' active' : '')}
                title=${cat.key}
                onClick=${() => setSource(cat.key)}
              >${cat.name} · ${cat.count}</button>
              <button className="catalog-source-x" title="Remove this catalog" onClick=${() => unloadCatalog(cat.key)}>×</button>
            </span>
          `)}
        </div>
      `}

      ${err && html`<div className="apps-error">${err}</div>`}

      ${busy === 'catalog' && apps.length === 0 && html`
        <div className="catalog-loading">
          <span className="spinner"></span>
          <span>Loading catalogs from peers…</span>
        </div>
      `}

      ${autoLoadAttempted && apps.length === 0 && !busy && !err && html`
        <div className="catalog-empty">
          <strong>No catalogs loaded.</strong>
          Paste a catalog drive key above, or use one of the featured Pear apps to launch directly.
          The browser remembers catalogs you've loaded before — they'll reload here next time.
        </div>
      `}

      ${apps.length > 0 && html`
        <div className="catalog-results">
          <h2>All apps · ${uniqueAppCount}${loadedCatalogs.length ? ` across ${loadedCatalogs.length} ${loadedCatalogs.length === 1 ? 'catalog' : 'catalogs'}` : ''}</h2>

          <div className="catalog-filter">
            <input
              type="text"
              className="catalog-search"
              placeholder="Search apps by name, category, catalogue, or author…"
              value=${query}
              onInput=${(e) => setQuery(e.target.value)}
              spellCheck="false"
            />
            ${categories.length > 1 && html`
              <div className="catalog-categories">
                ${categories.map((c) => html`
                  <button
                    className=${'catalog-chip' + (c === category ? ' active' : '')}
                    key=${c}
                    onClick=${() => setCategory(c)}
                  >${c === 'all' ? 'All' : c}</button>
                `)}
              </div>
            `}
          </div>

          ${filteredApps.length === 0
            ? html`<p className="placeholder">No apps match ${query ? `"${query}"` : 'this filter'}.</p>`
            : html`<div className="app-grid">
              ${filteredApps.map((app) => html`
              <div className="app-card" key=${app.id}>
                <${AppIcon} rpc=${rpc} C=${C} driveKey=${app.driveKey} iconRef=${app.icon} iconData=${app.iconData} name=${app.name} />
                <div className="app-info" onClick=${() => setDetailApp(app)} style=${{ cursor: 'pointer' }} title="View details">
                  <div className="app-name">
                    ${app.name || app.id || 'Untitled app'}
                    ${app.verification === 'relay-listed' ? html`<span title="Relay-listed" style=${{ marginLeft: '5px', color: '#58a6ff', fontSize: '12px' }}>✓</span>` : ''}
                    ${app.verification === 'author-signed' ? html`<span title="Author-signed" style=${{ marginLeft: '5px', color: '#3fb950', fontSize: '12px' }}>✦</span>` : ''}
                  </div>
                  <div className="app-desc">${app.description || ''}</div>
                  <div className="app-meta">
                    ${app.version ? 'v' + app.version : ''} ${app.author ? '· ' + app.author : ''}
                    ${app.nativeDelivery?.status === 'migration-required'
                      ? html`<span style=${{ marginLeft: '6px', opacity: 0.75 }}>· verified native package required</span>`
                      : (app.type === 'hypersite' ? html`<span style=${{ marginLeft: '6px', opacity: 0.75 }}>· opens in a tab</span>` : '')}
                  </div>
                  ${app.catalogName && html`<div className="app-source-tag">${app.catalogName}</div>`}
                  <${AppMeta} rpc=${rpc} C=${C} app=${app} />
                </div>
                <div className="app-actions">
                  ${(() => {
                    return html`
                      ${app.driveKey && /^[0-9a-f]{64}$/i.test(app.driveKey)
                        ? html`<button key="open-page" className="btn subtle" onClick=${() => openSite(app)} title="Open this app's P2P page in a tab">Open page</button>`
                        : ''}
                      ${app.nativeDelivery?.status === 'migration-required'
                        ? html`<button key="migration" className="btn primary" onClick=${() => showLegacyMigration(app)} disabled=${busy === 'legacy-migration'} title="Requires a verified native v3 package">Migration status</button>`
                        : html`<button key="open-content" className="btn primary" onClick=${() => openSite(app)} title="Open browsable P2P content">Open</button>`}
                      ${canEditMyCatalog && app.catalogKey !== myCatalog.keyHex && !inMyCatalog([app.id, app.driveKey, app.link]) && html`
                        <button key="add-catalog" className="btn subtle" title="Add to my catalog" onClick=${() => addToMyCatalog(app)} disabled=${busy === `addcat:${app.id || app.driveKey || app.link}`}>+ Catalog</button>
                      `}
                    `
                  })()}
                </div>
              </div>
            `)}
            </div>
          `}
        </div>
      `}

      <h2>My Catalog</h2>
      ${!myCatalog
        ? html`
          <div className="catalog-empty">
            <strong>Publish your own catalog.</strong>
            Create a catalog, add apps you want to share, then hand out its key — anyone can load it above to discover your picks. It's pinned to the relays, so it stays reachable even when you're offline.
            <div className="catalog-loader" style=${{ marginTop: '10px' }}>
              <input
                type="text"
                placeholder="Catalog name (e.g. My Picks)"
                value=${newCatalogName}
                onInput=${(e) => setNewCatalogName(e.target.value)}
                onKeyDown=${(e) => e.key === 'Enter' && createMyCatalog()}
                spellCheck="false"
              />
              <button className="btn primary" onClick=${createMyCatalog} disabled=${busy === 'mycatalog'}>
                ${busy === 'mycatalog' ? 'Creating…' : 'Create catalog'}
              </button>
            </div>
          </div>
        `
        : html`
          <div className="mycatalog">
            <div className="mycatalog-head">
              <div className="mycatalog-title">
                ${editingCatalogName
                  ? html`
                    <div className="mycatalog-title-edit">
                      <input
                        className="mycatalog-title-input"
                        type="text"
                        value=${catalogNameDraft}
                        onInput=${(e) => setCatalogNameDraft(e.target.value)}
                        onKeyDown=${(e) => {
                          if (e.key === 'Enter') saveMyCatalogName()
                          if (e.key === 'Escape') setEditingCatalogName(false)
                        }}
                        spellCheck="false"
                        autoFocus
                      />
                    <button key="save-name" className="btn primary small" onClick=${saveMyCatalogName} disabled=${busy === 'renamecat' || !catalogNameDraft.trim()}>
                      ${busy === 'renamecat' ? 'Saving…' : 'Save'}
                    </button>
                    <button key="cancel-name" className="btn subtle small" onClick=${() => setEditingCatalogName(false)} disabled=${busy === 'renamecat'}>Cancel</button>
                    </div>
                  `
                  : html`
                    <div className="mycatalog-title-row">
                      <div className="app-name">${myCatalog.name}</div>
                      ${canEditMyCatalog && html`<button key="rename" className="btn subtle small" onClick=${startRenameMyCatalog}>Rename</button>`}
                    </div>
                  `}
                <div className="app-meta">${myCatalog.apps.length} app${myCatalog.apps.length === 1 ? '' : 's'}${myCatalog.writable ? '' : ' · read-only on this device'}</div>
              </div>
              <button className="btn subtle" onClick=${() => copyKey(myCatalog.keyHex)}>${copied ? 'Copied!' : 'Copy share key'}</button>
            </div>
            <div className="mycatalog-key" title=${myCatalog.keyHex}>${myCatalog.keyHex}</div>
            ${myCatalog.apps.length === 0
              ? html`<p className="placeholder">${myCatalog.writable ? 'No apps yet. Use + Catalog on any app above to add it.' : 'This catalog has no saved apps.'}</p>`
              : html`<div className="app-grid">
                  ${myCatalog.apps.map(renderMyCatalogApp)}
                </div>`}
          </div>
        `}

      <h2>Installed</h2>
      ${installed.length === 0
        ? html`<p className="placeholder">No apps installed yet.</p>`
        : html`<div className="app-grid">
            ${installed.map((app) => html`
              <div className="app-card" key=${app.id}>
                <${AppIcon} rpc=${rpc} C=${C} driveKey=${app.driveKey} iconRef=${app.icon} iconData=${app.iconData} name=${app.name} />
                <div className="app-info">
                  <div className="app-name">${app.name}</div>
                  <div className="app-meta">v${app.version || '?'}${updates[app.id] ? ` · update available → v${updates[app.id]}` : ''}</div>
                </div>
                <div className="app-actions">
                  ${updates[app.id] && html`
                    <button key="update" className="btn primary" onClick=${() => updateApp(app.id)} disabled=${busy === `install:${app.id}`}>
                      ${busy === `install:${app.id}` ? 'Updating…' : 'Update'}
                    </button>
                  `}
                  <button key="launch" className="btn" onClick=${() => launchApp(app)} disabled=${busy === `launch:${app.id}`}>Launch</button>
                  <button key="uninstall" className="btn subtle" onClick=${() => uninstallApp(app)} disabled=${busy === `uninstall:${app.id}`}>Uninstall</button>
                  ${canEditMyCatalog && !inMyCatalog([app.id, app.driveKey, app.link]) && html`
                    <button key="add-installed" className="btn subtle" title="Add to my catalog" onClick=${() => addToMyCatalog(app)} disabled=${busy === `addcat:${app.id || app.driveKey || app.link}`}>+ Catalog</button>
                  `}
                </div>
              </div>
            `)}
          </div>`}

      <${CommunitySubmit} rpc=${rpc} C=${C} />

      <${CollaborativeCatalog} rpc=${rpc} C=${C} />

      <${ModeratorPanel} rpc=${rpc} C=${C} />

      ${detailApp && html`
        <div onClick=${() => setDetailApp(null)} style=${{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div onClick=${(e) => e.stopPropagation()} style=${{ background: '#11161f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '20px 24px 24px', maxWidth: '480px', width: '100%', maxHeight: '82vh', overflowY: 'auto' }}>
            <div style=${{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn subtle" title="Close" onClick=${() => setDetailApp(null)} style=${{ padding: '2px 9px' }}>✕</button>
            </div>
            <div style=${{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
              ${safeIconSrc(detailApp.iconData)
                ? html`<img src=${safeIconSrc(detailApp.iconData)} alt="" style=${{ width: '56px', height: '56px', borderRadius: '12px' }} />`
                : html`<div style=${{ width: '56px', height: '56px', borderRadius: '12px', background: '#1f2733', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600 }}>${(detailApp.name || '?').charAt(0)}</div>`}
              <div style=${{ minWidth: 0 }}>
                <div style=${{ fontSize: '18px', fontWeight: 600 }}>
                  ${detailApp.name || 'Untitled app'}
                  ${detailApp.verification === 'relay-listed' ? html`<span title="Relay-listed" style=${{ marginLeft: '6px', color: '#58a6ff', fontSize: '14px' }}>✓</span>` : ''}
                  ${detailApp.verification === 'author-signed' ? html`<span title="Author-signed" style=${{ marginLeft: '6px', color: '#3fb950', fontSize: '14px' }}>✦</span>` : ''}
                </div>
                <div style=${{ color: '#8b949e', fontSize: '13px' }}>${detailApp.author || ''}</div>
              </div>
            </div>
            <p style=${{ color: '#c9d1d9', lineHeight: 1.6, margin: '0 0 14px' }}>${detailApp.description || 'No description.'}</p>
            ${(detailApp.categories && detailApp.categories.length) ? html`
              <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                ${detailApp.categories.map((c) => html`<span key=${c} style=${{ fontSize: '12px', padding: '2px 9px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: '#8b949e' }}>${c}</span>`)}
              </div>` : ''}
            <div style=${{ fontSize: '13px', color: '#8b949e', display: 'grid', gap: '6px', marginBottom: '18px' }}>
              <div><strong style=${{ color: '#c9d1d9' }}>Runs:</strong> ${detailApp.type === 'hypersite' ? 'headless in a tab' : 'in its own window'}</div>
              ${detailApp.version ? html`<div><strong style=${{ color: '#c9d1d9' }}>Version:</strong> v${detailApp.version}</div>` : ''}
              <div><strong style=${{ color: '#c9d1d9' }}>Verification:</strong> ${detailApp.verification || 'unverified'}</div>
              ${detailApp.homepage ? html`<div style=${{ wordBreak: 'break-all' }}><strong style=${{ color: '#c9d1d9' }}>Homepage:</strong> ${detailApp.homepage}</div>` : ''}
              ${detailApp.sourceUrl ? html`<div style=${{ wordBreak: 'break-all' }}><strong style=${{ color: '#c9d1d9' }}>Source:</strong> ${detailApp.sourceUrl}</div>` : ''}
              ${detailApp.license ? html`<div><strong style=${{ color: '#c9d1d9' }}>License:</strong> ${detailApp.license}</div>` : ''}
              ${detailApp.link ? html`<div style=${{ wordBreak: 'break-all' }}><strong style=${{ color: '#c9d1d9' }}>Link:</strong> ${detailApp.link}</div>` : ''}
              ${detailApp.driveKey ? html`<div style=${{ wordBreak: 'break-all' }}><strong style=${{ color: '#c9d1d9' }}>Drive:</strong> ${detailApp.driveKey}</div>` : ''}
              ${(detailApp._sources && detailApp._sources.length)
                ? html`<div><strong style=${{ color: '#c9d1d9' }}>Catalogue${detailApp._sources.length > 1 ? 's' : ''}:</strong> ${detailApp._sources.join(', ')}</div>`
                : (detailApp.catalogName ? html`<div><strong style=${{ color: '#c9d1d9' }}>Catalogue:</strong> ${detailApp.catalogName}</div>` : '')}
              ${detailApp.publisherKey ? html`<div style=${{ wordBreak: 'break-all' }}><strong style=${{ color: '#c9d1d9' }}>Publisher:</strong> ${shortKey(detailApp.publisherKey)}</div>` : ''}
            </div>
            <div style=${{ display: 'flex', gap: '8px' }}>
              ${detailApp.type === 'hypersite'
                ? (detailApp.driveKey && !detailApp.link
                    ? html`<button key="detail-open-site" className="btn primary" onClick=${() => { openSite(detailApp); setDetailApp(null) }}>Open</button>`
                    : html`<button key="detail-run-tab" className="btn primary" onClick=${() => { runInTab(detailApp); setDetailApp(null) }}>Run in tab</button>`)
                : (detailApp.link && !detailApp.driveKey)
                  ? html`<button key="detail-open-window" className="btn primary" onClick=${() => { launchFeaturedApp(detailApp); setDetailApp(null) }}>Open</button>`
                  : (isInstalled(detailApp.id)
                    ? html`<button key="detail-launch" className="btn primary" onClick=${() => { launchApp(detailApp); setDetailApp(null) }}>Launch</button>`
                    : html`<button key="detail-install" className="btn primary" onClick=${() => { installApp(detailApp); setDetailApp(null) }}>Install</button>`)}
              <button key="detail-close" className="btn" onClick=${() => setDetailApp(null)}>Close</button>
            </div>
          </div>
        </div>
      `}
    </div>
  `
}

// Lighthouse Phase 2 — exchange contact invites (carrying each peer's binding
// DHT key) so federated search can resolve + verify a peer's index. Share your
// invite; paste a peer's. Their results are signature-verified before display.
function TrustedPeers ({ rpc, C }) {
  const [invite, setInvite] = useState(null)
  const [peers, setPeers] = useState([])
  const [addUrl, setAddUrl] = useState('')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const load = async () => {
    try {
      setInvite(await rpc.request(C.CMD_CONTACTS_MY_INVITE))
      const res = await rpc.request(C.CMD_CONTACTS_LIST, { limit: 200 })
      setPeers(Array.isArray(res?.contacts) ? res.contacts : [])
    } catch (e) { setMsg(e.message) }
  }
  useEffect(() => { load() }, [])

  const copy = async () => {
    try { await navigator.clipboard.writeText(invite.url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  const add = async () => {
    const url = addUrl.trim()
    if (!url) return
    setMsg('')
    try {
      const res = await rpc.request(C.CMD_CONTACTS_ADD_INVITE, { url })
      const c = res?.contact || {}
      setAddUrl('')
      setMsg(`Added ${c.displayName || (c.pubkey ? c.pubkey.slice(0, 12) + '…' : 'contact')}${c.bindingKey ? ' — searchable' : ''}`)
      load()
    } catch (e) { setMsg(`Couldn't add: ${e.message}`) }
  }

  return html`
    <details className="trusted-peers">
      <summary>Trusted peers for federated search (${peers.length})</summary>
      <div className="tp-body">
        <p className="subtitle">Share your invite so a peer can add you; paste theirs to search their content. Peer results are cryptographically verified before they're shown.</p>
        ${invite && html`
          <div className="tp-field">
            <label>Your invite</label>
            <div className="tp-row">
              <input className="profile-input" readOnly value=${invite.url} onClick=${(e) => e.target.select()} />
              <button className="btn small" onClick=${copy}>${copied ? 'Copied' : 'Copy'}</button>
            </div>
          </div>`}
        <div className="tp-field">
          <label>Add a peer</label>
          <div className="tp-row">
            <input className="profile-input" placeholder="Paste a p2p-contact://invite…" value=${addUrl}
                   onInput=${(e) => setAddUrl(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && add()} />
            <button className="btn small primary" onClick=${add} disabled=${!addUrl.trim()}>Add</button>
          </div>
        </div>
        ${msg && html`<div className="tp-msg">${msg}</div>`}
        ${peers.length > 0 && html`
          <ul className="tp-list">
            ${peers.map((p) => html`
              <li key=${p.pubkey}>
                <span className="tp-name">${p.displayName || (p.pubkey.slice(0, 16) + '…')}</span>
                ${p.verifiedAt ? html`<span className="src-badge followed">verified</span>` : html`<span className="src-badge other">unverified</span>`}
                ${p.bindingKey ? html`<span className="src-badge self">searchable</span>` : ''}
              </li>`)}
          </ul>`}
      </div>
    </details>`
}

function SearchProvenanceBadges ({ meta }) {
  const p = meta && (meta.provenance || meta)
  if (!p) return null
  return html`<span className="search-provenance">
    ${p.digestHit ? html`<span className="src-badge self">digest hit</span>` : ''}
    ${p.fallbackPull ? html`<span className="src-badge other">fallback pull</span>` : ''}
    ${p.partial ? html`<span className="src-badge other">partial</span>` : ''}
    ${meta.verifyBudgetExhausted ? html`<span className="src-badge other">verify budget</span>` : ''}
  </span>`
}

function Library ({ rpc, C, onBrowse }) {
  const [bookmarks, setBookmarks] = useState([])
  const [history, setHistory] = useState([])
  const [historyEnabled, setHistoryEnabled] = useState(false)
  const [searchIndexEnabled, setSearchIndexEnabled] = useState(false)
  const [err, setErr] = useState('')
  // Lighthouse Phase 0 — local self-search (opt-in; default OFF).
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = not searched yet
  const [indexed, setIndexed] = useState(0)
  const [searching, setSearching] = useState(false)
  // Lighthouse Phase 2 — opt-in federated search across trusted peers. Local
  // results paint immediately; the enriched peer set arrives via
  // EVT_SEARCH_FEDERATED, correlated by queryId so a stale reply can't clobber a
  // newer search.
  const [federated, setFederated] = useState(false)
  const [federating, setFederating] = useState(false)
  const [searchMeta, setSearchMeta] = useState(null)
  const searchIdRef = useRef(0)

  const runSearch = async () => {
    const q = query.trim()
    if (!q) { setResults(null); setFederating(false); setSearchMeta(null); return }
    setSearching(true)
    setFederating(false)
    setSearchMeta(null)
    try {
      const res = await rpc.request(C.CMD_SEARCH, { query: q, limit: 50, federated })
      searchIdRef.current = res?.queryId || 0
      setResults(Array.isArray(res?.results) ? res.results : [])
      setIndexed(res?.stats?.docs || 0)
      if (res?.federating) setFederating(true) // peer results arrive asynchronously
    } catch (e) { setErr(`search: ${e.message}`) }
    finally { setSearching(false) }
  }
  const resultUrl = (r) => {
    if (r && r.link) return r.link
    if (r && /^(?:pear|file|hyper):\/\//i.test(r.driveKey || '')) return r.driveKey
    return `hyper://${r.driveKey}${r.path && r.path !== '/' ? r.path : '/'}`
  }
  const srcBadge = (r) => {
    if (!r.tier || r.tier === 'self') return html`<span className="src-badge self">you</span>`
    if (r.tier === 'followed') return html`<span className="src-badge followed">trusted · hop ${r.trustHop ?? 1}</span>`
    return html`<span className="src-badge other">${r.tier}</span>`
  }

  // Enriched federated results push (Lighthouse Phase 2).
  useEffect(() => {
    const onFederated = (e) => {
      const d = (e && e.detail) || {}
      if (d.queryId !== searchIdRef.current) return // superseded by a newer query
      if (Array.isArray(d.results)) setResults(d.results)
      setSearchMeta(d)
      setFederating(false)
    }
    rpc.addEventListener(`event:${C.EVT_SEARCH_FEDERATED}`, onFederated)
    return () => rpc.removeEventListener(`event:${C.EVT_SEARCH_FEDERATED}`, onFederated)
  }, [])

  const refresh = async () => {
    try {
      const b = await rpc.request(C.CMD_USERDATA_LIST_BOOKMARKS)
      setBookmarks(Array.isArray(b) ? b : (b?.bookmarks ?? []))
      const h = await rpc.request(C.CMD_USERDATA_LIST_HISTORY, { limit: 200 })
      setHistory(Array.isArray(h) ? h : (h?.history ?? []))
      if (typeof h?.historyEnabled === 'boolean') setHistoryEnabled(h.historyEnabled)
      const s = unwrapSettings(await rpc.request(C.CMD_USERDATA_GET_SETTINGS).catch(() => null))
      if (s) {
        setHistoryEnabled(s.historyEnabled === true)
        setSearchIndexEnabled(s.searchIndexEnabled === true)
      }
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
    <div className="library">
      <h1>Library</h1>
      <p className="subtitle">Bookmarks you choose to save, and optional history — all local on this device. No browse data is uploaded.</p>
      ${err && html`<div className="apps-error">${err}</div>`}

      <h2>Search your P2P content</h2>
      <p className="subtitle">${searchIndexEnabled
        ? html`Full-text search over pages you've opened, fully local — no query ever leaves your device.${indexed ? ` ${indexed} page(s) indexed.` : ''}`
        : html`Local page indexing is OFF (privacy default). Enable it in Settings → Clearnet & privacy if you want Library search to learn from pages you open.`}</p>
      <div className="urlbar" style=${{ marginBottom: '12px' }}>
        <input
          type="text"
          className="url-input"
          placeholder="Search pages you've visited…"
          value=${query}
          onInput=${(e) => setQuery(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && runSearch()}
        />
        <button className="btn primary" onClick=${runSearch} disabled=${searching || !query.trim()}>${searching ? 'Searching…' : 'Search'}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${federated} onChange=${(e) => setFederated(e.target.checked)} />
        Include trusted peers${federating ? html` <span className="fed-status">· searching peers…</span>` : ''}
        <${SearchProvenanceBadges} meta=${searchMeta} />
      </label>
      <${TrustedPeers} rpc=${rpc} C=${C} />
      ${results !== null && (results.length === 0
        ? html`<p className="placeholder">No matches${indexed === 0 ? ' yet — browse some hyper:// pages first to build your index.' : '.'}</p>`
        : html`<div className="library-list">
            ${results.map((r) => html`
              <div className="library-row" key=${r.docId || (r.driveKey + r.path)}>
                <div className="library-row-main">
                  <div className="library-title">${r.title || resultUrl(r)}${federated ? srcBadge(r) : ''}</div>
                  <div className="library-url">${resultUrl(r)}</div>
                </div>
                <button className="btn small" onClick=${() => onBrowse(resultUrl(r))}>Open</button>
              </div>
            `)}
          </div>`)}

      <h2>Bookmarks (${bookmarks.length})</h2>
      ${bookmarks.length === 0
        ? html`<p className="placeholder">No bookmarks yet. Use the star button in Browse, or open About this site and choose Bookmark this site.</p>`
        : html`<div className="library-list">
            ${bookmarks.map((b) => html`
              <div className="library-row" key=${b.url}>
                <div className="library-row-main">
                  <div className="library-title">${b.title || b.url}</div>
                  <div className="library-url">${b.url}</div>
                </div>
                <button className="btn small" onClick=${() => onBrowse(b.url)}>Open</button>
                <button className="btn small subtle" onClick=${() => removeBookmark(b.url)}>Remove</button>
              </div>
            `)}
          </div>`}

      <div className="library-history-head">
        <h2>History ${historyEnabled ? `(${history.length})` : '(off)'}</h2>
        ${historyEnabled && history.length > 0 && html`<button className="btn small subtle" onClick=${clearHistory}>Clear history</button>`}
      </div>
      ${!historyEnabled
        ? html`<p className="placeholder" data-testid="history-disabled-note">Browsing history is OFF by default. Nothing is recorded. Turn it on in Settings → Clearnet &amp; privacy if you want a local visit log on this device only.</p>`
        : history.length === 0
          ? html`<p className="placeholder">No browsing history yet.</p>`
          : html`<div className="library-list">
              ${history.slice(0, 100).map((h, i) => html`
                <div className="library-row" key=${(h.url || '') + ':' + i}>
                  <div className="library-row-main">
                    <div className="library-title">${h.title || h.url}</div>
                    <div className="library-url">${h.url} ${h.visitedAt ? '· ' + new Date(h.visitedAt).toLocaleString() : ''}</div>
                  </div>
                  <button className="btn small" onClick=${() => onBrowse(h.url)}>Open</button>
                </div>
              `)}
            </div>`}
    </div>
  `
}

// --- Settings sub-sections -----------------------------------------------
//
// Settings additions that surface backend power that's been there for a while:
//
//   - ProfileSection      Edit display name / bio / avatar URL / website /
//                         email — what apps see when you grant a login.
//   - PermissionCenter    View per-app login/profile/contact/swarm grants
//                         and revoke them individually or per app.
//   - RelaysSection       Add/remove/reorder relay URLs, toggle hybrid fetch.
//
// These call CMD_* handlers that already live in backend/index.js.

const PROFILE_FIELDS = [
  { key: 'displayName', label: 'Display name', placeholder: 'How apps will refer to you' },
  { key: 'bio', label: 'Bio', placeholder: 'A short bio (optional)', textarea: true },
  { key: 'avatar', label: 'Avatar URL', placeholder: 'https://… or hyper://… (optional)' },
  { key: 'website', label: 'Website', placeholder: 'https://your.site (optional)' },
  { key: 'email', label: 'Email', placeholder: 'name@example.com (optional)' }
]

function normalizeProfile (profile) {
  const p = { ...(profile || {}) }
  if (!p.displayName && p.name) p.displayName = p.name
  return p
}

function normalizeLoginGrant (grant) {
  const driveKey = grant?.driveKey || grant?.driveKeyHex || ''
  return { ...(grant || {}), driveKey, driveKeyHex: driveKey }
}

function scopeMeta (scope) {
  return SCOPE_LABELS[scope] || { label: scope, detail: scope }
}

function scopeLabels (scopes) {
  return (Array.isArray(scopes) ? scopes : []).map((scope) => scopeMeta(scope).label)
}

function profileFieldsForScopes (scopes) {
  const set = new Set(Array.isArray(scopes) ? scopes : [])
  if (set.has('profile:read')) return ['Display name', 'Avatar', 'Bio', 'Email', 'Website', 'Pronouns', 'Location']
  const fields = []
  if (set.has('profile:name')) fields.push('Display name')
  if (set.has('profile:avatar')) fields.push('Avatar')
  if (set.has('profile:email')) fields.push('Email')
  if (set.has('profile:website')) fields.push('Website')
  if (set.has('profile:contact')) {
    if (!fields.includes('Email')) fields.push('Email')
    if (!fields.includes('Website')) fields.push('Website')
  }
  return fields
}

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
      const p = normalizeProfile(res?.profile || {})
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
    <div className="settings-card">
      ${err && html`<div className="apps-error">${err}</div>`}
      ${notice && html`<div className="apps-ok">${notice}</div>`}
      ${PROFILE_FIELDS.map(({ key, label, placeholder, textarea }) => html`
        <div className="settings-row" key=${key}>
          <div className="profile-field">
            <div className="settings-label">${label}</div>
            ${textarea
              ? html`<textarea
                  className="profile-input"
                  rows="2"
                  placeholder=${placeholder}
                  value=${draft[key] || ''}
                  onInput=${(e) => setDraft({ ...draft, [key]: e.target.value })}
                ></textarea>`
              : html`<input
                  type="text"
                  className="profile-input"
                  placeholder=${placeholder}
                  value=${draft[key] || ''}
                  onInput=${(e) => setDraft({ ...draft, [key]: e.target.value })}
                />`}
          </div>
        </div>
      `)}
      <div className="settings-row settings-row-actions">
        <button className="btn subtle" onClick=${clearAll} disabled=${busy !== null}>
          ${busy === 'clear' ? 'Clearing…' : 'Clear all'}
        </button>
        <button className="btn primary" onClick=${save} disabled=${!dirty || busy !== null}>
          ${busy === 'save' ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  `
}

function PermissionCenterSection ({ rpc, C }) {
  const [loginGrants, setLoginGrants] = useState([])
  const [swarmGrants, setSwarmGrants] = useState([])
  const [contacts, setContacts] = useState([])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    setErr('')
    try {
      const [loginRes, swarmRes, contactsRes] = await Promise.all([
        rpc.request(C.CMD_LOGIN_LIST_GRANTS).catch((e) => ({ error: e })),
        rpc.request(C.CMD_SWARM_LIST_GRANTS).catch(() => ({ grants: [] })),
        rpc.request(C.CMD_CONTACTS_LIST, { limit: 1000 }).catch(() => ({ contacts: [] }))
      ])
      if (loginRes?.error) throw loginRes.error
      setLoginGrants((Array.isArray(loginRes?.grants) ? loginRes.grants : []).map(normalizeLoginGrant).filter((g) => g.driveKey))
      setSwarmGrants(Array.isArray(swarmRes?.grants) ? swarmRes.grants.filter((g) => g?.driveKey) : [])
      setContacts(Array.isArray(contactsRes?.contacts) ? contactsRes.contacts : [])
    } catch (e) { setErr(`permissions: ${e.message}`) }
    finally { setLoaded(true) }
  }
  useEffect(() => { load() }, [])

  const apps = useMemo(() => {
    const map = new Map()
    const ensure = (driveKey) => {
      if (!map.has(driveKey)) map.set(driveKey, { driveKey, appName: null, login: null, swarm: [] })
      return map.get(driveKey)
    }
    for (const grant of loginGrants) {
      const app = ensure(grant.driveKey)
      app.login = grant
      app.appName = grant.appName || app.appName
    }
    for (const grant of swarmGrants) {
      const app = ensure(grant.driveKey)
      app.swarm.push(grant)
      app.appName = app.appName || grant.appName
    }
    return [...map.values()].sort((a, b) => {
      const at = Math.max(a.login?.grantedAt || 0, ...a.swarm.map((g) => g.grantedAt || 0))
      const bt = Math.max(b.login?.grantedAt || 0, ...b.swarm.map((g) => g.grantedAt || 0))
      return bt - at
    })
  }, [loginGrants, swarmGrants])

  const contactReaders = loginGrants.filter((g) => (g.scopes || []).includes('contacts:read'))
  const profileReaders = loginGrants.filter((g) => profileFieldsForScopes(g.scopes).length > 0)

  const revokeLogin = async (grant) => {
    const label = grant.appName || shortKey(grant.driveKey)
    if (!confirm(`Revoke sign-in for ${label}? It will need to ask again next time.`)) return
    setErr(''); setBusy(`login:${grant.driveKey}`)
    try {
      await rpc.request(C.CMD_LOGIN_REVOKE_GRANT, { driveKeyHex: grant.driveKey })
      await load()
    } catch (e) { setErr(`revoke sign-in: ${e.message}`) }
    finally { setBusy(null) }
  }

  const revokeSwarmGrant = async (grant) => {
    const label = grant.appName || shortKey(grant.driveKey)
    if (!confirm(`Revoke ${label}'s access to topic ${shortKey(grant.topicHex)}?`)) return
    setErr(''); setBusy(`swarm:${grant.driveKey}:${grant.topicHex}`)
    try {
      await rpc.request(C.CMD_SWARM_REVOKE_GRANT, { driveKey: grant.driveKey, topicHex: grant.topicHex })
      await load()
    } catch (e) { setErr(`revoke topic: ${e.message}`) }
    finally { setBusy(null) }
  }

  const revokeAppSwarm = async (app) => {
    if (!app.swarm.length) return
    const label = app.appName || shortKey(app.driveKey)
    if (!confirm(`Revoke all ${app.swarm.length} swarm topic grant(s) for ${label}?`)) return
    setErr(''); setBusy(`swarm-all:${app.driveKey}`)
    try {
      await rpc.request(C.CMD_SWARM_REVOKE_ALL_FOR_APP, { driveKey: app.driveKey })
      await load()
    } catch (e) { setErr(`revoke topics: ${e.message}`) }
    finally { setBusy(null) }
  }

  const revokeEverythingForApp = async (app) => {
    const label = app.appName || shortKey(app.driveKey)
    if (!confirm(`Revoke every stored permission for ${label}?`)) return
    setErr(''); setBusy(`app:${app.driveKey}`)
    try {
      if (app.login) await rpc.request(C.CMD_LOGIN_REVOKE_GRANT, { driveKeyHex: app.driveKey })
      if (app.swarm.length) await rpc.request(C.CMD_SWARM_REVOKE_ALL_FOR_APP, { driveKey: app.driveKey })
      await load()
    } catch (e) { setErr(`revoke app: ${e.message}`) }
    finally { setBusy(null) }
  }

  const revokeAllLogin = async () => {
    if (!loginGrants.length) return
    if (!confirm(`Revoke all ${loginGrants.length} sign-in grant(s)?`)) return
    setErr(''); setBusy('login-all')
    try {
      await rpc.request(C.CMD_LOGIN_REVOKE_ALL)
      await load()
    } catch (e) { setErr(`revoke all sign-ins: ${e.message}`) }
    finally { setBusy(null) }
  }

  return html`
    <div className="settings-card permission-center">
      ${err && html`<div className="apps-error">${err}</div>`}

      <div className="permission-summary">
        <div className="permission-stat">
          <div className="permission-stat-value">${loginGrants.length}</div>
          <div className="permission-stat-label">sign-in grants</div>
        </div>
        <div className="permission-stat">
          <div className="permission-stat-value">${profileReaders.length}</div>
          <div className="permission-stat-label">profile readers</div>
        </div>
        <div className="permission-stat">
          <div className="permission-stat-value">${contactReaders.length}</div>
          <div className="permission-stat-label">contact readers</div>
        </div>
        <div className="permission-stat">
          <div className="permission-stat-value">${swarmGrants.length}</div>
          <div className="permission-stat-label">swarm topics</div>
        </div>
      </div>

      <div className="settings-subsection-label">Apps and sites</div>
      ${!loaded
        ? html`<div className="settings-subtle">Loading…</div>`
        : apps.length === 0
          ? html`<div className="settings-subtle">No stored app permissions yet.</div>`
          : apps.map((app) => {
              const profileFields = profileFieldsForScopes(app.login?.scopes || [])
              const contactAccess = (app.login?.scopes || []).includes('contacts:read')
              return html`
                <div className="permission-app" key=${app.driveKey}>
                  <div className="permission-app-head">
                    <div>
                      <div className="settings-label">${app.appName || shortKey(app.driveKey)}</div>
                      <code className="settings-code">${shortKey(app.driveKey)}</code>
                    </div>
                    <button className="btn subtle danger" onClick=${() => revokeEverythingForApp(app)}
                            disabled=${busy === `app:${app.driveKey}`}>
                      ${busy === `app:${app.driveKey}` ? 'Revoking…' : 'Revoke app'}
                    </button>
                  </div>

                  <div className="permission-cap-grid">
                    <div className="permission-cap">
                      <div className="permission-cap-label">Sign-in</div>
	                      ${app.login
	                        ? html`<div className="permission-cap-body">
	                          <div className="permission-chip-row">
	                            ${(scopeLabels(app.login.scopes).length ? scopeLabels(app.login.scopes) : ['sign-in only']).map((label) => html`
	                              <span className="permission-chip" key=${label}>${label}</span>
	                            `)}
	                          </div>
                          <div className="settings-subtle">
                            Granted ${new Date(app.login.grantedAt).toLocaleDateString()}
                            ${app.login.expiresAt ? html` · expires ${new Date(app.login.expiresAt).toLocaleDateString()}` : ''}
	                          </div>
	                          <button className="btn subtle danger small" onClick=${() => revokeLogin(app.login)}
	                                  disabled=${busy === `login:${app.driveKey}`}>Revoke sign-in</button>
	                        </div>`
	                        : html`<div className="settings-subtle">No sign-in grant.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Profile fields</div>
                      ${profileFields.length
                        ? html`<div className="permission-chip-row">
                            ${profileFields.map((label) => html`<span className="permission-chip" key=${label}>${label}</span>`)}
                          </div>`
                        : html`<div className="settings-subtle">No profile fields shared.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Contacts</div>
	                      ${contactAccess
	                        ? html`<div className="permission-cap-body">
	                          <div className="permission-chip-row"><span className="permission-chip warn">contacts:read</span></div>
	                          <div className="settings-subtle">${contacts.length} saved contact${contacts.length === 1 ? '' : 's'} visible through this scope.</div>
	                        </div>`
	                        : html`<div className="settings-subtle">No contact access.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Swarm topics</div>
	                      ${app.swarm.length
	                        ? html`<div className="permission-cap-body">
	                          <div className="settings-subtle">${app.swarm.length} persisted topic${app.swarm.length === 1 ? '' : 's'}.</div>
	                          ${app.swarm.map((grant) => html`
	                            <div className="permission-topic" key=${grant.topicHex}>
	                              <div>
	                                <code className="settings-code">${grant.protocol || 'pear.swarm.v1'} · ${shortKey(grant.topicHex)}</code>
                                <div className="settings-subtle">
                                  Granted ${new Date(grant.grantedAt).toLocaleDateString()}
                                  ${grant.lastUsedAt && grant.lastUsedAt !== grant.grantedAt ? html` · last used ${new Date(grant.lastUsedAt).toLocaleDateString()}` : ''}
                                </div>
                              </div>
                              <button className="btn subtle danger small" onClick=${() => revokeSwarmGrant(grant)}
                                      disabled=${busy === `swarm:${grant.driveKey}:${grant.topicHex}`}>Revoke</button>
                            </div>
	                          `)}
	                          <button className="btn subtle danger small" onClick=${() => revokeAppSwarm(app)}
	                                  disabled=${busy === `swarm-all:${app.driveKey}`}>Revoke all topics</button>
	                        </div>`
	                        : html`<div className="settings-subtle">No arbitrary topic grants.</div>`}
                    </div>
                  </div>
                </div>
              `
            })}

      ${loginGrants.length > 0 && html`
        <div className="settings-row settings-row-actions">
          <button className="btn subtle danger" onClick=${revokeAllLogin} disabled=${busy === 'login-all'}>
            ${busy === 'login-all' ? 'Revoking…' : 'Revoke all sign-ins'}
          </button>
        </div>
      `}
    </div>
  `
}

function relaySupportedTransports (doc) {
  if (Array.isArray(doc?.supported_transports)) return doc.supported_transports
  if (Array.isArray(doc?.transports)) return doc.transports
  return []
}

function RelaysSection ({ rpc, C }) {
  const [config, setConfig] = useState({ relays: [], enabled: true })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [loaded, setLoaded] = useState(false)
  // Capability advertisement per-relay — populated lazily once we
  // know the relay list. Keyed by relay URL. Each value is either
  // null (still fetching), { ok: true, doc } on success, or
  // { ok: false, error } on failure. This is a renderer-side fetch
  // (no new RPC) so it works on any HTTPS-reachable relay.
  const [capabilities, setCapabilities] = useState({})

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

  // Probe each configured relay's /.well-known/hiverelay.json via the
  // backend relay client. Browser fetch would turn missing CORS headers
  // into a generic "Failed to fetch" even when the relay is healthy.
  useEffect(() => {
    if (!config.relays.length) return
    let cancelled = false
    const next = {}
    for (const url of config.relays) {
      next[url] = capabilities[url] || null   // preserve while refreshing
    }
    setCapabilities(next)

    config.relays.forEach(async (url) => {
      try {
        if (cancelled) return
        const cap = await rpc.request(C.CMD_CHECK_RELAY_CAPABILITY, { url }, 10000)
        if (cancelled) return
        setCapabilities((p) => ({ ...p, [url]: cap }))
      } catch (e) {
        if (cancelled) return
        setCapabilities((p) => ({ ...p, [url]: { ok: false, error: e.message || 'unreachable' } }))
      }
    })
    return () => { cancelled = true }
  }, [config.relays.join('|')])

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
    <div className="settings-card">
      ${err && html`<div className="apps-error">${err}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">${config.enabled ? 'Hybrid fetch' : 'Pure P2P mode'}</div>
          <div className="settings-subtle">${config.enabled
            ? 'Try a relay first (1-2s first paint), fall back to P2P. Recommended for most users.'
            : 'P2P only — slower first paint, no relay dependency. Toggle this on to use relays.'
          }</div>
        </div>
        <button className="btn subtle" onClick=${() => toggleEnabled(!config.enabled)} disabled=${busy === 'toggle'}>
          ${config.enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      ${loaded && config.relays.length === 0 && html`
        <div className="settings-subtle">No relays configured.</div>
      `}
      ${config.relays.map((url, idx) => {
        const cap = capabilities[url]
        return html`
        <div className="settings-row relay-row" key=${url}>
          <div className="relay-info">
            <div className="relay-url-line">
              <code className="settings-code">${url}</code>
              ${idx === 0 ? html`<span className="settings-pill">primary</span>` : ''}
            </div>
            ${cap === undefined || cap === null
              ? html`<div className="relay-caps relay-caps-loading">probing capability advertisement…</div>`
              : !cap.ok
                ? html`<div className="relay-caps relay-caps-err">capability check failed: ${cap.error}</div>`
                : html`<div className="relay-caps">
                    <span className="relay-cap-label">v${cap.doc?.version || '?'}</span>
                    ${cap.doc?.region ? html`<span className="relay-cap-label">${cap.doc.region}</span>` : ''}
                    ${relaySupportedTransports(cap.doc).map((t) => html`
                      <span className=${'relay-cap-pill' + (t === 'dht-relay-ws' ? ' relay-cap-pill-new' : '')} key=${t}>${t}</span>
                    `)}
                  </div>`}
          </div>
          ${config.relays.length > 1 ? html`
            <button className="btn subtle" onClick=${() => removeRelay(url)} disabled=${busy === 'save'}>
              Remove
            </button>
          ` : ''}
        </div>
      `})}
      <div className="settings-row">
        <input
          type="text"
          className="profile-input"
          placeholder="https://relay.example.com"
          value=${input}
          onInput=${(e) => setInput(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && addRelay()}
          spellCheck="false"
        />
        <button className="btn primary" onClick=${addRelay} disabled=${!input.trim() || busy === 'save'}>
          Add
        </button>
      </div>
    </div>
  `
}

// --- Nostr identity (Phase 1) — npub + cross-curve binding (NOSTR0-2) -------
// Mirrors the ProfileSection/TrustedPeers load-copy-mutate idiom. All three
// CMD_NOSTR_* are request/response (no page payload reaches a signer). The
// wording is "linked (attested)", never "verified" — it's a trust assertion.
function NostrIdentitySection ({ rpc, C }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  const load = async () => {
    try { setState(await rpc.request(C.CMD_NOSTR_GET_IDENTITY)); setErr('') }
    catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const copy = async () => {
    if (!state?.npub) return
    try { await navigator.clipboard.writeText(state.npub); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  const run = async (cmd, flag) => {
    setBusy(flag); setErr('')
    try { setState(await rpc.request(cmd)) }
    catch (e) { setErr(e.message) }
    finally { setBusy(null) }
  }

  const npub = state?.npub || ''
  const short = npub ? npub.slice(0, 14) + '…' + npub.slice(-6) : '—'
  const status = state?.status || (state?.linked ? 'linked' : 'unverified')
  const linked = status === 'linked'
  const epoch = state?.epoch || 0
  const statusBadge = status === 'linked' ? 'self' : status === 'revoked' ? 'other danger' : 'other'
  const statusText = status === 'linked'
    ? `linked (attested) · epoch ${epoch}`
    : status === 'revoked'
      ? `revoked · epoch ${epoch}`
      : status === 'stale'
        ? `stale · epoch ${epoch}`
        : 'not linked'
  const statusHelp = status === 'linked'
    ? 'Your pear root and this Nostr key are mutually signed.'
    : status === 'revoked'
      ? 'The last attestation was revoked and is no longer trusted.'
      : status === 'stale'
        ? 'The stored attestation points at an older Nostr key.'
        : 'Mint a mutual attestation binding your pear root ↔ Nostr key.'

  return html`
    <div className="settings-card">
      <div className="settings-row">
        <div>
          <div className="settings-label">Your Nostr key</div>
          <div className="settings-subtle">${state ? short : 'Loading…'}</div>
        </div>
        <button className="btn small" onClick=${copy} disabled=${!npub}>${copied ? 'Copied' : 'Copy npub'}</button>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Link status</div>
          <div className="settings-subtle">
            <span className=${`src-badge ${statusBadge}`}>${statusText}</span> ${statusHelp}
          </div>
        </div>
        ${linked
          ? html`<button className="btn subtle danger" onClick=${() => run(C.CMD_NOSTR_REVOKE, 'revoke')} disabled=${busy != null}>${busy === 'revoke' ? 'Revoking…' : 'Revoke'}</button>`
          : html`<button className="btn primary" onClick=${() => run(C.CMD_NOSTR_BIND, 'bind')} disabled=${busy != null}>${busy === 'bind' ? 'Linking…' : 'Link (attest)'}</button>`}
      </div>
      ${err && html`<div className="tp-msg">${err}</div>`}
    </div>
  `
}

// --- Nostr feed (Phase 2) — author + read your own NIP-01 notes -------------
// Compose kind:1 notes signed with your Nostr key and stored in your local event
// log (CMD_NOSTR_PUBLISH); the list is your own store queried via CMD_NOSTR_QUERY.
function NostrFeedSection ({ rpc, C }) {
  const [events, setEvents] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [federated, setFederated] = useState(false) // include trusted contacts' notes
  const [hidden, setHidden] = useState(null)
  const maxContent = 64 * 1024

  const load = async () => {
    try {
      const res = await rpc.request(C.CMD_NOSTR_QUERY, { filter: { kinds: [1], limit: 50 }, federated })
      setEvents(Array.isArray(res?.events) ? res.events : [])
      setHidden(res?.hidden || null)
      setErr('')
    } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [federated])

  const post = async () => {
    const content = draft.trim()
    if (!content) return
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_NOSTR_PUBLISH, { kind: 1, content })
      setDraft(''); await load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const when = (ts) => {
    const d = Date.now() / 1000 - ts
    if (d < 60) return 'just now'
    if (d < 3600) return Math.floor(d / 60) + 'm'
    if (d < 86400) return Math.floor(d / 3600) + 'h'
    return Math.floor(d / 86400) + 'd'
  }
  const hiddenTotal = hidden
    ? (hidden.quarantined || 0) + (hidden.dropped || 0) + (hidden.futureDated || 0) + (hidden.bindingMissing || 0) + (hidden.bindingUntrusted || 0) + (hidden.contactFailures || 0)
    : 0
  const hiddenReasons = hidden?.byReason
    ? Object.entries(hidden.byReason).filter(([, count]) => count > 0).map(([reason, count]) => `${reason}: ${count}`).join(' · ')
    : ''

  return html`
    <div className="settings-card">
      <div className="tp-field">
        <label>Post a note</label>
        <textarea className="profile-input" rows="2" maxLength=${maxContent} placeholder="What's happening?" value=${draft}
                  onInput=${(e) => setDraft(e.target.value)}></textarea>
        <button className="btn small primary" onClick=${post} disabled=${busy || !draft.trim()}>${busy ? 'Posting…' : 'Post'}</button>
      </div>
      ${err && html`<div className="tp-msg">${err}</div>`}
      <div className="settings-row">
        <label className="login-scope${federated ? ' on' : ''}">
          <input type="checkbox" checked=${federated} onChange=${() => setFederated((v) => !v)} />
          Include trusted contacts' notes
        </label>
      </div>
      ${federated && hiddenTotal > 0 && html`
        <div className="settings-subtle">
          Hidden contact activity: ${hiddenTotal}${hiddenReasons ? ` · ${hiddenReasons}` : ''}
        </div>
      `}
      <div className="nostr-feed">
        ${events.length === 0
          ? html`<div className="settings-subtle">No notes yet — post one above. Each is signed with your Nostr key and stored in your local event log.</div>`
          : events.map((ev) => html`
            <div className="nostr-note" key=${ev.id}>
              <div className="nostr-note-content">${ev.content}</div>
              <div className="settings-subtle">
                ${ev._via
                  ? html`<span className="src-badge followed">from ${ev._via}</span>`
                  : html`<span className="src-badge self">you</span>`}
                kind ${ev.kind} · ${when(ev.created_at)}
              </div>
            </div>`)}
      </div>
    </div>
  `
}

// --- Name registry (Phase N5) — claim memorable names → browsable content ---
// Owner-signed, multi-writer, first-claim-wins with a confusable/homograph guard.
// One form claims a new name or updates (rotates) one you already own; each name
// is shareable as pearname://<name> and resolves in the URL bar.
function NameRegistrySection ({ rpc, C }) {
  const [list, setList] = useState([])
  const [status, setStatus] = useState(null)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')

  const load = async () => {
    try {
      const st = await rpc.request(C.CMD_NAMEREG_STATUS)
      setStatus(st)
      if (st.created) { const r = await rpc.request(C.CMD_NAMEREG_LIST); setList(Array.isArray(r?.names) ? r.names : []) }
      else setList([])
    } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    const n = name.trim()
    const t = normalizeNameTarget(target)
    if (!t) { setErr('Enter a 64-hex drive key or hyper:// link.'); return }
    const owned = list.find((e) => e.normalized === n.toLowerCase() || (e.name || '').toLowerCase() === n.toLowerCase())
    setBusy('submit'); setErr('')
    try {
      await rpc.request(owned ? C.CMD_NAMEREG_ROTATE : C.CMD_NAMEREG_CLAIM, { name: n, target: t })
      setName(''); setTarget(''); await load()
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }
  const act = async (cmd, n) => {
    setBusy(n + cmd); setErr('')
    try { await rpc.request(cmd, { name: n }); await load() }
    catch (e) { setErr(e.message) } finally { setBusy(null) }
  }
  const copyPearname = async (n) => {
    try { await navigator.clipboard.writeText('pearname://' + n); setCopied(n); setTimeout(() => setCopied(''), 1500) } catch {}
  }

  const targetValid = normalizeNameTarget(target) != null
  return html`
    <div className="settings-card">
	      ${status && !status.enabled
	        ? html`<div className="settings-subtle">Turn on “Names” in Experimental (below) to claim registry names.</div>`
	        : html`<div className="namereg-body">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Claim or update a name</div>
            <div className="settings-subtle">A memorable name → browsable P2P content. First claim wins; confusable look-alikes are rejected. Re-submitting a name you own updates its target.</div>
          </div>
        </div>
        <div className="tp-row">
          <input className="profile-input" placeholder="name (e.g. alice)" value=${name} onInput=${(e) => setName(e.target.value)} />
          <input className="profile-input" placeholder="64-hex key or hyper:// link" value=${target} onInput=${(e) => setTarget(e.target.value)} />
          <button className="btn small primary" onClick=${submit} disabled=${busy != null || !name.trim() || !targetValid}>${busy === 'submit' ? 'Saving…' : 'Save'}</button>
        </div>
        ${list.length > 0 && html`<div className="namereg-list">
          ${list.map((e) => html`
            <div className="settings-row" key=${e.normalized}>
              <div>
                <div className="settings-label">${e.name} <span className="src-badge self">pearname://${e.normalized}</span></div>
                <div className="settings-subtle" title=${e.link || e.key || e.target}>→ ${shortKey(e.link || e.key || e.target)} · v${e.version}</div>
              </div>
              <div>
                <button className="btn small" onClick=${() => copyPearname(e.normalized)}>${copied === e.normalized ? 'Copied' : 'Copy'}</button>
                <button className="btn small" onClick=${() => act(C.CMD_NAMEREG_RELEASE, e.normalized)} disabled=${busy != null}>Release</button>
                <button className="btn subtle danger" onClick=${() => act(C.CMD_NAMEREG_REVOKE, e.normalized)} disabled=${busy != null}>Revoke</button>
              </div>
            </div>`)}
	        </div>`}
	        ${status && status.created && list.length === 0 && html`<div className="settings-subtle">No names yet — claim one above.</div>`}
	      </div>`}
      ${err && html`<div className="tp-msg">${err}</div>`}
    </div>
  `
}

// --- Multi-device bookmark sync (encrypted) — Settings panel ---------------
//
// Surfaces the CMD_SYNC_* backend (Rollout Phase 4). Rendered only when the
// experimentalDeviceSync flag is on. Mirrors the collaborative-catalog pairing
// flow, but the base is ENCRYPTED and private to the user's own devices: the
// invite `sync://<key>:<encKey>` carries the encryption key, so only paired
// devices can read the bookmarks.
//
// Pairing (two of your own devices):
//   Device A — "Set up sync" (becomes the first writer) → copy the invite.
//   Device B — paste the invite → "Pair" (read-only) → copy B's writer key.
//   Device A — paste B's writer key → "Add device". B becomes a writer on sync.
function DeviceSync ({ rpc, C }) {
  const [status, setStatus] = useState(null) // null = still loading
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [joinInput, setJoinInput] = useState('')
  const [writerInput, setWriterInput] = useState('')
  const [copied, setCopied] = useState('')

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 2200) }
  const copy = (text, what) => { if (!text) return; try { navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500) } catch {} }

  const loadStatus = async () => {
    setErr('')
    try { setStatus(await rpc.request(C.CMD_SYNC_STATUS)) }
    catch (e) { setErr(e.message); setStatus({ enabled: true, paired: false }) }
  }
  useEffect(() => { loadStatus() }, [])

  // Manual re-check — there is no push event when another device promotes this
  // one from read-only to writer, so the user refreshes to pick it up.
  const refresh = async () => { setBusy('refresh'); try { await loadStatus() } finally { setBusy(null) } }

  const create = async () => {
    setErr(''); setBusy('create')
    try { await rpc.request(C.CMD_SYNC_CREATE, {}, 60000); await loadStatus(); flash('Sync is on — this device is the first writer.') }
    catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const join = async () => {
    const parsed = parseSyncInvite(joinInput)
    if (!parsed) { setErr('That is not a valid sync invite — expected sync://<64-hex>:<64-hex>.'); return }
    setErr(''); setBusy('join')
    try {
      await rpc.request(C.CMD_SYNC_JOIN, parsed, 60000)
      setJoinInput(''); await loadStatus()
      flash('Paired. Copy this device’s writer key below, then add it from a writer device.')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const addWriter = async () => {
    // Accept a bare writer key or a paste that happens to be a sync invite.
    const writerKey = (parseSyncInvite(writerInput)?.key || writerInput).trim().toLowerCase()
    setErr(''); setBusy('writer')
    try {
      await rpc.request(C.CMD_SYNC_ADD_WRITER, { writerKey }, 60000)
      setWriterInput(''); flash('Device added — it becomes a writer once it syncs.')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const pushLocal = async () => {
    setErr(''); setBusy('push')
    try {
      const res = await rpc.request(C.CMD_SYNC_PUSH_LOCAL, {}, 60000)
      await loadStatus(); flash(`Imported ${res?.pushed ?? 0} local bookmark(s) into the synced set.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const removeBookmark = async (url) => {
    setErr(''); setBusy('rm:' + url)
    try { await rpc.request(C.CMD_SYNC_REMOVE_BOOKMARK, { url }, 60000); await loadStatus() }
    catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  if (status === null) return html`<div className="settings-card"><div className="settings-subtle">Loading…</div></div>`

  const paired = !!status.paired
  const writable = !!status.writable
  const invite = formatSyncInvite(status.key, status.encKey)
  const bookmarks = Array.isArray(status.bookmarks) ? status.bookmarks : []
  const count = (status.count && Number.isFinite(status.count.bookmarks)) ? status.count.bookmarks : bookmarks.length

  return html`
    <div className="settings-card">
      ${err && html`<div className="apps-error">${err}</div>`}
      ${notice && html`<div className="apps-ok">${notice}</div>`}

	      ${!paired && html`<div className="sync-setup">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Set up sync on this device</div>
	            <div className="settings-subtle">Creates a private, encrypted bookmark store. This device becomes the first writer; pair your other devices to it.</div>
          </div>
          <button className="btn primary" onClick=${create} disabled=${busy === 'create'}>${busy === 'create' ? 'Setting up…' : 'Set up sync'}</button>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">…or pair this device with another</div>
            <input className="profile-input" placeholder="sync://<key>:<encryption-key>" value=${joinInput}
                   onInput=${(e) => setJoinInput(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && join()} />
	          </div>
	          <button className="btn" onClick=${join} disabled=${busy === 'join' || !joinInput.trim()}>${busy === 'join' ? 'Pairing…' : 'Pair'}</button>
	        </div>
	      </div>`}

	      ${paired && html`<div className="sync-paired">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Syncing ${writable ? '' : html`<span className="settings-subtle">· read-only on this device</span>`}</div>
	            <div className="settings-subtle">${count} bookmark(s) in the synced set</div>
          </div>
          <div className="settings-row-actions">
            <button className="btn subtle small" onClick=${refresh} disabled=${busy === 'refresh'} title="Re-check sync status (e.g. after another device added this one as a writer)">${busy === 'refresh' ? 'Refreshing…' : 'Refresh'}</button>
            ${writable && html`<button className="btn subtle" onClick=${pushLocal} disabled=${busy === 'push'}>${busy === 'push' ? 'Importing…' : 'Import local bookmarks'}</button>`}
          </div>
        </div>

        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Pairing invite — open this on another device to sync it</div>
            <code className="settings-code">${invite || '(unavailable)'}</code>
            <div className="settings-subtle">Carries your encryption key. Anyone with it can read your synced bookmarks — treat it like a password.</div>
          </div>
          <button className="btn small" onClick=${() => copy(invite, 'invite')} disabled=${!invite}>${copied === 'invite' ? 'Copied' : 'Copy'}</button>
        </div>

        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">This device’s writer key${writable ? '' : ' — give it to a writer device to be added'}</div>
            <code className="settings-code">${status.writerKey || '(unavailable)'}</code>
          </div>
          <button className="btn small" onClick=${() => copy(status.writerKey, 'writer')} disabled=${!status.writerKey}>${copied === 'writer' ? 'Copied' : 'Copy'}</button>
        </div>

        ${writable && html`
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Add another device (paste its writer key)</div>
              <input className="profile-input" placeholder="64-hex writer key" value=${writerInput}
                     onInput=${(e) => setWriterInput(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && addWriter()} />
            </div>
            <button className="btn" onClick=${addWriter} disabled=${busy === 'writer' || !writerInput.trim()}>${busy === 'writer' ? 'Adding…' : 'Add device'}</button>
          </div>
        `}

        ${!writable && html`<div className="settings-subtle">This device is read-only until a writer device adds the key above. Synced bookmarks still replicate here in the meantime.</div>`}

	        ${bookmarks.length > 0 && html`<div className="sync-bookmarks">
	          <div className="settings-row"><div className="settings-label">Synced bookmarks</div></div>
	          ${bookmarks.map((b) => html`
	            <div className="settings-row" key=${b.url}>
	              <div>
                <div className="settings-label">${b.title || b.url}</div>
                <div className="settings-subtle">${b.url}</div>
              </div>
	              ${writable && html`<button className="btn small subtle" onClick=${() => removeBookmark(b.url)} disabled=${busy === 'rm:' + b.url}>Remove</button>`}
	            </div>
	          `)}
	        </div>`}
	      </div>`}
    </div>
  `
}

// Content Shield — browser-owned request filter + cosmetic hider
// (docs/BROWSER_PARITY_PLAN.md Phases 1–3). Toggle, per-drive allowlist/
// strict, named lists, and plugin kill-switches persist in user-data;
// CMD_SHIELD_* / CMD_PLUGIN_* feed this panel and the urlbar chip.
function ContentShieldSection ({ rpc, C, activeDriveKey = '', onBrowse }) {
  const [enabled, setEnabled] = useState(true)
  const [status, setStatus] = useState(null)
  const [plugins, setPlugins] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [subscribeKey, setSubscribeKey] = useState('')
  const [installKey, setInstallKey] = useState('')
  const [pendingInstall, setPendingInstall] = useState(null)
  const [escalation, setEscalation] = useState(null)
  const [catalog, setCatalog] = useState({ entries: [], sources: [] })
  const [catalogSourceKey, setCatalogSourceKey] = useState('')
  const driveKey = typeof activeDriveKey === 'string' && /^[0-9a-f]{64}$/i.test(activeDriveKey)
    ? activeDriveKey.toLowerCase()
    : ''

  useEffect(() => {
    let disposed = false
    rpc.request(C.CMD_USERDATA_GET_SETTINGS)
      .then((res) => {
        if (disposed) return
        const s = unwrapSettings(res)
        setEnabled(s?.contentShield !== false)
      })
      .catch(() => {})
    const refresh = () => {
      const statusPayload = driveKey ? { driveKey } : {}
      rpc.request(C.CMD_SHIELD_STATUS, statusPayload)
        .then((result) => { if (!disposed) setStatus(result) })
        .catch(() => {})
      if (C.CMD_PLUGIN_LIST != null) {
        rpc.request(C.CMD_PLUGIN_LIST)
          .then((result) => { if (!disposed) setPlugins(result?.plugins || []) })
          .catch(() => {})
      }
      if (C.CMD_PLUGIN_CATALOG != null) {
        rpc.request(C.CMD_PLUGIN_CATALOG)
          .then((result) => { if (!disposed && result) setCatalog({ entries: result.entries || [], sources: result.sources || [] }) })
          .catch(() => {})
      }
    }
    refresh()
    const timer = setInterval(refresh, 5000)
    return () => { disposed = true; clearInterval(timer) }
  }, [rpc, C, driveKey])

  const toggle = async () => {
    const next = !enabled
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates: { contentShield: next } })
      setEnabled(next)
      const result = await rpc.request(C.CMD_SHIELD_STATUS, driveKey ? { driveKey } : {}).catch(() => null)
      if (result) setStatus(result)
    } catch (e) { setErr(`save: ${e.message}`) }
    finally { setBusy(false) }
  }

  const toggleAllow = async () => {
    if (!driveKey || C.CMD_SHIELD_SET_ALLOW == null) return
    setBusy(true); setErr('')
    try {
      const next = !(status && status.driveAllowlisted)
      await rpc.request(C.CMD_SHIELD_SET_ALLOW, { driveKey, allow: next })
      const result = await rpc.request(C.CMD_SHIELD_STATUS, { driveKey }).catch(() => null)
      if (result) setStatus(result)
    } catch (e) { setErr(`allowlist: ${e.message}`) }
    finally { setBusy(false) }
  }

  const toggleStrict = async () => {
    if (!driveKey || C.CMD_SHIELD_SET_STRICT == null) return
    setBusy(true); setErr('')
    try {
      const next = !(status && status.driveStrict)
      await rpc.request(C.CMD_SHIELD_SET_STRICT, { driveKey, strict: next })
      const result = await rpc.request(C.CMD_SHIELD_STATUS, { driveKey }).catch(() => null)
      if (result) setStatus(result)
    } catch (e) { setErr(`strict: ${e.message}`) }
    finally { setBusy(false) }
  }

  const togglePlugin = async (id, currentlyEnabled) => {
    if (C.CMD_PLUGIN_SET_ENABLED == null) return
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_PLUGIN_SET_ENABLED, { id, enabled: !currentlyEnabled })
      const result = await rpc.request(C.CMD_PLUGIN_LIST).catch(() => null)
      if (result) setPlugins(result.plugins || [])
    } catch (e) { setErr(`plugin: ${e.message}`) }
    finally { setBusy(false) }
  }

  const refreshStatusAndPlugins = async () => {
    const result = await rpc.request(C.CMD_SHIELD_STATUS, driveKey ? { driveKey } : {}).catch(() => null)
    if (result) setStatus(result)
    const listed = await rpc.request(C.CMD_PLUGIN_LIST).catch(() => null)
    if (listed) setPlugins(listed.plugins || [])
    if (C.CMD_PLUGIN_CATALOG != null) {
      const listing = await rpc.request(C.CMD_PLUGIN_CATALOG).catch(() => null)
      if (listing) setCatalog({ entries: listing.entries || [], sources: listing.sources || [] })
    }
  }

  const subscribeList = async () => {
    const key = subscribeKey.trim().toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(key) || C.CMD_SHIELD_SUBSCRIBE_LIST == null) return
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_SHIELD_SUBSCRIBE_LIST, { driveKey: key }, 30000)
      setSubscribeKey('')
      await refreshStatusAndPlugins()
    } catch (e) { setErr(`subscribe: ${e.message}`) }
    finally { setBusy(false) }
  }

  const unsubscribeList = async (key) => {
    if (C.CMD_SHIELD_UNSUBSCRIBE_LIST == null) return
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_SHIELD_UNSUBSCRIBE_LIST, { driveKey: key })
      await refreshStatusAndPlugins()
    } catch (e) { setErr(`unsubscribe: ${e.message}`) }
    finally { setBusy(false) }
  }

  const refreshLists = async (key) => {
    if (C.CMD_SHIELD_REFRESH_LISTS == null) return
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_SHIELD_REFRESH_LISTS, key ? { driveKey: key, force: true } : {}, 30000)
      await refreshStatusAndPlugins()
    } catch (e) { setErr(`refresh: ${e.message}`) }
    finally { setBusy(false) }
  }

  const installPluginByKey = async (key, review = null) => {
    const normalized = String(key || '').trim().toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(normalized) || C.CMD_PLUGIN_INSTALL_DRIVE == null) return
    setBusy(true); setErr('')
    try {
      const payload = { driveKey: normalized }
      if (review) {
        payload.granted = review.requested || []
        payload.reviewedFingerprint = review.fingerprint
      }
      const outcome = await rpc.request(C.CMD_PLUGIN_INSTALL_DRIVE, payload, 30000)
      setPendingInstall(outcome && outcome.consentRequired ? outcome : null)
      await refreshStatusAndPlugins()
    } catch (e) { setErr(`install: ${e.message}`) }
    finally { setBusy(false) }
  }

  const installPlugin = async () => {
    await installPluginByKey(installKey)
    setInstallKey('')
  }

  const loadCatalogSource = async () => {
    const key = catalogSourceKey.trim().toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(key) || C.CMD_PLUGIN_CATALOG_LOAD_DRIVE == null) return
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_PLUGIN_CATALOG_LOAD_DRIVE, { driveKey: key }, 30000)
      setCatalogSourceKey('')
      await refreshStatusAndPlugins()
    } catch (e) { setErr(`catalog: ${e.message}`) }
    finally { setBusy(false) }
  }

  const removeCatalogSource = async (key) => {
    if (C.CMD_PLUGIN_CATALOG_REMOVE_SOURCE == null) return
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_PLUGIN_CATALOG_REMOVE_SOURCE, { driveKey: key })
      await refreshStatusAndPlugins()
    } catch (e) { setErr(`catalog: ${e.message}`) }
    finally { setBusy(false) }
  }

  const updatePlugin = async (id, review = null) => {
    if (C.CMD_PLUGIN_UPDATE_DRIVE == null) return
    setBusy(true); setErr('')
    try {
      const payload = { driveKey: id }
      if (review) {
        payload.granted = review.capabilities || []
        payload.reviewedFingerprint = review.fingerprint
      }
      const outcome = await rpc.request(C.CMD_PLUGIN_UPDATE_DRIVE, payload, 30000)
      setEscalation(outcome && outcome.escalated ? { driveKey: id, ...outcome } : null)
      await refreshStatusAndPlugins()
    } catch (e) { setErr(`update: ${e.message}`) }
    finally { setBusy(false) }
  }

  const uninstallPlugin = async (id) => {
    if (C.CMD_PLUGIN_UNINSTALL == null) return
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_PLUGIN_UNINSTALL, { driveKey: id })
      if (escalation?.driveKey === id) setEscalation(null)
      await refreshStatusAndPlugins()
    } catch (e) { setErr(`uninstall: ${e.message}`) }
    finally { setBusy(false) }
  }

  const listNames = (status && (status.listDetails || status.lists)) || []
  const listLabel = Array.isArray(listNames)
    ? listNames.map((l) => (typeof l === 'string' ? l : l.name)).join(', ')
    : ''

  return html`
    <div className="settings-card" data-testid="content-shield-card">
      ${err && html`<div className="apps-error">${err}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">Block ads and trackers</div>
          <div className="settings-subtle">Requests matching the shield's filter rules are refused inside the browser before any peer or relay is contacted, and matching page elements are hidden. Counters only — the shield never keeps a log of what you visit. Named lists hot-swap and reload offline after first acquisition.</div>
        </div>
        <label className="login-scope${enabled ? ' on' : ''}">
          <input type="checkbox" checked=${enabled} disabled=${busy}
                 onChange=${toggle} data-testid="content-shield-toggle" />
        </label>
      </div>
      ${status && html`
        <div className="settings-row">
          <div>
            <div className="settings-label" data-testid="content-shield-counters">${status.blocked} blocked · ${status.allowed} allowed this session</div>
            <div className="settings-subtle" data-testid="content-shield-lists">${status.blockRules} block · ${status.cosmeticRules} cosmetic · ${status.scriptletRules || 0} scriptlet · lists: ${listLabel || 'none'}</div>
          </div>
        </div>
      `}
      ${driveKey && html`
        <div className="settings-row" data-testid="content-shield-drive-controls">
          <div>
            <div className="settings-label">This drive (${driveKey.slice(0, 12)}…)</div>
            <div className="settings-subtle">Allowlist exempts only this drive from blocking. Strict mode injects a CSP that confines third-party subresources to the page origin.</div>
          </div>
          <div className="settings-inline-actions">
            <label className="login-scope${status?.driveAllowlisted ? ' on' : ''}" title="Allowlist this drive">
              <span className="settings-subtle">Allow</span>
              <input type="checkbox" checked=${!!status?.driveAllowlisted} disabled=${busy}
                     onChange=${toggleAllow} data-testid="content-shield-allow-toggle" />
            </label>
            <label className="login-scope${status?.driveStrict ? ' on' : ''}" title="Strict third-party mode">
              <span className="settings-subtle">Strict</span>
              <input type="checkbox" checked=${!!status?.driveStrict} disabled=${busy}
                     onChange=${toggleStrict} data-testid="content-shield-strict-toggle" />
            </label>
          </div>
        </div>
      `}
      ${status && Array.isArray(status.topRules) && status.topRules.length > 0 && html`
        <div className="settings-subtle">Top rules: ${status.topRules.slice(0, 3).map(item => `${item.rule} (${item.hits})`).join(' · ')}</div>
      `}

      <div className="settings-row" data-testid="content-shield-list-sync">
        <div style=${{ width: '100%' }}>
          <div className="settings-label">Filter lists from the swarm</div>
          <div className="settings-subtle">Subscribe to a filter-list Hyperdrive by key. Rules sync peer-to-peer, hot-swap when the publisher updates, and keep working offline — no CDN, no list-fetch fingerprint.</div>
          <div className="settings-row">
            <div className="profile-field" style=${{ flex: 1 }}>
              <input className="profile-input" placeholder="64-hex filter-list drive key" value=${subscribeKey}
                     data-testid="content-shield-subscribe-input"
                     onInput=${(e) => setSubscribeKey(e.target.value)}
                     onKeyDown=${(e) => e.key === 'Enter' && subscribeList()} />
            </div>
            <button className="btn" data-testid="content-shield-subscribe" onClick=${subscribeList}
                    disabled=${busy || !/^[0-9a-f]{64}$/i.test(subscribeKey.trim())}>Subscribe</button>
            <button className="btn subtle" onClick=${() => refreshLists()} disabled=${busy || !(status?.subscriptions?.length)}>Refresh all</button>
          </div>
          ${(status?.subscriptions || []).map((sub) => html`
            <div className="settings-row" key=${sub.driveKey} data-testid=${'shield-list-row-' + sub.driveKey}>
              <div>
                <div className="settings-label">${sub.name || sub.driveKey.slice(0, 12) + '…'}${sub.version ? ` · v${sub.version}` : ''}</div>
                <div className="settings-subtle">${sub.rules || 0} rules · ${sub.driveKey.slice(0, 16)}…</div>
              </div>
              <div className="settings-inline-actions">
                <button className="btn small subtle" onClick=${() => refreshLists(sub.driveKey)} disabled=${busy}>Refresh</button>
                <button className="btn small subtle danger" onClick=${() => unsubscribeList(sub.driveKey)} disabled=${busy}>Remove</button>
              </div>
            </div>
          `)}
        </div>
      </div>

      <div className="settings-row" data-testid="plugin-catalog">
        <div style=${{ width: '100%' }}>
          <div className="settings-label">Plugin catalog</div>
          <div className="settings-subtle">Curated plugins and AI add-ons you can add yourself. Installing a plugin shows its declared capabilities and records your grant; app entries open as ordinary P2P apps gated by their own manifests. Load more catalogues from a drive key below.</div>
          ${catalog.entries.map((entry) => html`
            <div className="settings-row" key=${entry.id} data-testid=${'catalog-entry-' + entry.id}>
              <div>
                <div className="settings-label">${entry.name}${entry.source === 'builtin' && entry.verified ? html`<span title="Curated entry" style=${{ marginLeft: '5px', color: '#3fb950', fontSize: '12px' }}>✦</span>` : ''}</div>
                <div className="settings-subtle">${entry.description}</div>
                <div className="settings-subtle">${entry.kind === 'app' ? 'P2P app' : 'plugin'}${entry.capabilities?.length ? ` · ${entry.capabilities.join(', ')}` : ''}${entry.source !== 'builtin' ? ` · from ${String(entry.source).slice(0, 8)}…` : ''}</div>
              </div>
              <div className="settings-inline-actions">
                ${entry.kind === 'app' && entry.driveKey && html`
                  <button className="btn small" data-testid=${'catalog-open-' + entry.id}
                          onClick=${() => onBrowse && onBrowse(`hyper://${entry.driveKey}/`)}
                          disabled=${busy || !onBrowse}>Open</button>
                `}
                ${entry.kind === 'plugin' && entry.driveKey && !entry.installed && html`
                  <button className="btn small" data-testid=${'catalog-install-' + entry.id}
                          onClick=${() => installPluginByKey(entry.driveKey)} disabled=${busy}>Install</button>
                `}
                ${entry.kind === 'plugin' && entry.installed && html`<span className="settings-subtle">Installed</span>`}
                ${entry.kind === 'plugin' && !entry.driveKey && html`<span className="settings-subtle" title=${entry.unpublished ? `Publish ${entry.unpublished} to enable` : ''}>Publish pending</span>`}
              </div>
            </div>
          `)}
          <div className="settings-row">
            <div className="profile-field" style=${{ flex: 1 }}>
              <input className="profile-input" placeholder="64-hex catalogue drive key" value=${catalogSourceKey}
                     data-testid="plugin-catalog-source-input"
                     onInput=${(e) => setCatalogSourceKey(e.target.value)}
                     onKeyDown=${(e) => e.key === 'Enter' && loadCatalogSource()} />
            </div>
            <button className="btn subtle" data-testid="plugin-catalog-load" onClick=${loadCatalogSource}
                    disabled=${busy || !/^[0-9a-f]{64}$/i.test(catalogSourceKey.trim())}>Load catalogue</button>
          </div>
          ${catalog.sources.map((source) => html`
            <div className="settings-row" key=${source.driveKey}>
              <div className="settings-subtle">${source.name} · ${source.entryCount} entries · ${source.driveKey.slice(0, 16)}…</div>
              <button className="btn small subtle danger" onClick=${() => removeCatalogSource(source.driveKey)} disabled=${busy}>Remove</button>
            </div>
          `)}
        </div>
      </div>

      <div className="settings-row" data-testid="content-shield-plugins">
        <div style=${{ width: '100%' }}>
          <div className="settings-label">Pear Plugins</div>
          <div className="settings-subtle">Plugins are Hyperdrives with declared capabilities. An update that requests new capabilities is disabled automatically until you re-approve it. Kill-switch disables a plugin's filter/style/script contributions without uninstalling it.</div>
          <div className="settings-row">
            <div className="profile-field" style=${{ flex: 1 }}>
              <input className="profile-input" placeholder="64-hex plugin drive key" value=${installKey}
                     data-testid="plugin-install-input"
                     onInput=${(e) => setInstallKey(e.target.value)}
                     onKeyDown=${(e) => e.key === 'Enter' && installPlugin()} />
            </div>
            <button className="btn" data-testid="plugin-install" onClick=${installPlugin}
                    disabled=${busy || !/^[0-9a-f]{64}$/i.test(installKey.trim())}>Install</button>
          </div>
          ${pendingInstall && html`
            <div className="apps-error" data-testid="plugin-install-consent">
              ${pendingInstall.name} ${pendingInstall.version ? `v${pendingInstall.version}` : ''} requests:
              ${(pendingInstall.requested || []).join(', ') || 'no capabilities'}.
              Review this grant before installing; catalogue labels are not trusted permissions.
              <button className="btn small" onClick=${() => installPluginByKey(pendingInstall.driveKey, pendingInstall)} disabled=${busy}>Grant and install</button>
              <button className="btn small subtle" onClick=${() => setPendingInstall(null)} disabled=${busy}>Cancel</button>
            </div>
          `}
          ${escalation && html`
            <div className="apps-error" data-testid="plugin-escalation">
              Update for ${escalation.driveKey.slice(0, 12)}… requests new capabilities: ${escalation.added.join(', ')}.
              ${escalation.changedSinceReview ? ' The plugin changed after the previous review; inspect this new request.' : ''}
              <button className="btn small" onClick=${() => updatePlugin(escalation.driveKey, escalation)} disabled=${busy}>Accept and re-enable</button>
            </div>
          `}
          ${plugins.map((p) => html`
            <div className="settings-row" key=${p.id} data-testid=${'plugin-row-' + p.id}>
              <div>
                <div className="settings-label">${p.name || p.id}</div>
                <div className="settings-subtle">${(p.capabilities || []).join(', ') || 'no capabilities'}${p.version ? ` · v${p.version}` : ''}</div>
              </div>
              <div className="settings-inline-actions">
                ${/^[0-9a-f]{64}$/.test(p.id) && html`
                  <button className="btn small subtle" data-testid=${'plugin-update-' + p.id} onClick=${() => updatePlugin(p.id)} disabled=${busy}>Update</button>
                  <button className="btn small subtle danger" data-testid=${'plugin-uninstall-' + p.id} onClick=${() => uninstallPlugin(p.id)} disabled=${busy}>Uninstall</button>
                `}
                <label className="login-scope${p.enabled ? ' on' : ''}">
                  <input type="checkbox" checked=${!!p.enabled} disabled=${busy}
                         onChange=${() => togglePlugin(p.id, p.enabled)} data-testid=${'plugin-enabled-' + p.id} />
                </label>
              </div>
            </div>
          `)}
        </div>
      </div>
    </div>
  `
}

// Clearnet mode + privacy ladder (Phases 4–5). Settings persist under
// user-data keys (httpsOnly, stripTrackingParams, …, clearnetMode) and are
// applied live by the backend session bridge / clearnet proxy.
function PrivacyClearnetSection ({ rpc, C }) {
  const [privacy, setPrivacy] = useState({
    httpsOnly: true,
    stripTrackingParams: true,
    blockThirdPartyCookies: true,
    fingerprintFarbling: true,
    clearnetMode: 'proxy',
    historyEnabled: false,
    searchIndexEnabled: false,
    telemetryEnabled: false,
    contentShield: true
  })
  const [session, setSession] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let disposed = false
    rpc.request(C.CMD_USERDATA_GET_SETTINGS)
      .then((res) => {
        if (disposed) return
        const s = unwrapSettings(res) || {}
        setPrivacy((prev) => ({
          ...prev,
          httpsOnly: s.httpsOnly !== false,
          stripTrackingParams: s.stripTrackingParams !== false,
          blockThirdPartyCookies: s.blockThirdPartyCookies !== false,
          fingerprintFarbling: s.fingerprintFarbling !== false,
          clearnetMode: s.clearnetMode === 'direct' ? 'direct' : 'proxy',
          historyEnabled: s.historyEnabled === true,
          searchIndexEnabled: s.searchIndexEnabled === true,
          telemetryEnabled: false,
          contentShield: s.contentShield !== false
        }))
      })
      .catch(() => {})
    if (C.CMD_PRIVACY_STATUS != null) {
      rpc.request(C.CMD_PRIVACY_STATUS)
        .then((result) => { if (!disposed) setSession(result) })
        .catch(() => {})
    }
    return () => { disposed = true }
  }, [rpc, C])

  const save = async (patch) => {
    const next = { ...privacy, ...patch, telemetryEnabled: false }
    setBusy(true); setErr('')
    try {
      await rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates: next })
      setPrivacy(next)
      if (C.CMD_PRIVACY_STATUS != null) {
        const result = await rpc.request(C.CMD_PRIVACY_STATUS).catch(() => null)
        if (result) setSession(result)
      }
    } catch (e) { setErr(`save: ${e.message}`) }
    finally { setBusy(false) }
  }

  const toggle = (key) => {
    if (key === 'telemetryEnabled') return // never on
    save({ [key]: !privacy[key] })
  }

  return html`
    <div className="settings-card" data-testid="privacy-clearnet-card">
      ${err && html`<div className="apps-error">${err}</div>`}
      <div className="settings-row" data-testid="privacy-zero-collection">
        <div>
          <div className="settings-label">Zero remote data collection</div>
          <div className="settings-subtle">PearBrowser does not ship telemetry, crash beacons, usage analytics, or third-party trackers in the browser chrome. Nothing you browse is sent to a PearBrowser server — there is no PearBrowser server for that.</div>
        </div>
        <span className="settings-subtle" data-testid="privacy-telemetry-status">Telemetry: never</span>
      </div>
      ${[
        ['historyEnabled', 'Save browsing history (opt-in)', 'OFF by default. When enabled, visited URLs are stored only on this device in your local Hyperbee. Disabling clears stored history.'],
        ['searchIndexEnabled', 'Index pages for local search (opt-in)', 'OFF by default. When enabled, text from hyper:// pages you open is indexed on-device for Library search. No query ever leaves the device.'],
        ['contentShield', 'Block ads and trackers', 'ON by default. Refuses known ad/tracker requests inside the browser before peers or the network are contacted.'],
        ['httpsOnly', 'HTTPS-only mode', 'Upgrade http:// navigations to https:// before loading.'],
        ['stripTrackingParams', 'Strip tracking parameters', 'Remove utm_*, fbclid, gclid and similar click-ids from URLs.'],
        ['blockThirdPartyCookies', 'Block third-party cookies (proxy)', 'Drop Set-Cookie from proxied clearnet responses so sites cannot share a jar with hyper tabs.'],
        ['fingerprintFarbling', 'Fingerprint farbling', 'Noise canvas/audio fingerprints on proxied pages (per-origin seed).']
      ].map(([key, label, hint]) => html`
        <div className="settings-row" key=${key}>
          <div>
            <div className="settings-label">${label}</div>
            <div className="settings-subtle">${hint}</div>
          </div>
          <label className=${'login-scope' + (privacy[key] ? ' on' : '')}>
            <input type="checkbox" checked=${!!privacy[key]} disabled=${busy}
                   onChange=${() => toggle(key)} data-testid=${'privacy-' + key} />
          </label>
        </div>
      `)}
      <div className="settings-row">
        <div>
          <div className="settings-label">Clearnet mode</div>
          <div className="settings-subtle">Proxy (default): https pages load through the browser proxy so Content Shield blocks ads/trackers. Direct: load the real https URL (shields need a future session bridge).</div>
        </div>
        <div className="theme-segmented" role="group" aria-label="Clearnet mode">
          ${['proxy', 'direct'].map((mode) => html`
            <button key=${mode} type="button"
              className=${'theme-segment' + (privacy.clearnetMode === mode ? ' active' : '')}
              data-testid=${'clearnet-mode-' + mode}
              disabled=${busy}
              onClick=${() => save({ clearnetMode: mode })}>
              ${mode === 'proxy' ? 'Proxy + shield' : 'Direct'}
            </button>
          `)}
        </div>
      </div>
      ${session && html`
        <div className="settings-subtle" data-testid="privacy-session-status">
          Data collection: telemetry=${String(session.dataCollection?.telemetry ?? false)}
          · history=${String(session.dataCollection?.history ?? false)}
          · searchIndex=${String(session.dataCollection?.searchIndex ?? false)}
          · shield=${session.privacy?.contentShield !== false ? 'on' : 'off'}
          ${session.session?.proxyPort ? ` · proxy :${session.session.proxyPort}` : ''}
        </div>
      `}
    </div>
  `
}

/** Urlbar chip: live blocked count + open shield details in Settings path. */
function ShieldStatusChip ({ rpc, C, activeUrl, onOpenSettings }) {
  const [status, setStatus] = useState(null)
  const driveKey = useMemo(() => {
    const m = String(activeUrl || '').match(/(?:hyper:\/\/|\/(?:hyper|app)\/)([0-9a-fA-F]{64})/)
    return m ? m[1].toLowerCase() : ''
  }, [activeUrl])

  useEffect(() => {
    if (!rpc || !C?.CMD_SHIELD_STATUS) return
    let disposed = false
    const refresh = () => {
      rpc.request(C.CMD_SHIELD_STATUS, driveKey ? { driveKey } : {})
        .then((result) => { if (!disposed) setStatus(result) })
        .catch(() => {})
    }
    refresh()
    const timer = setInterval(refresh, 4000)
    return () => { disposed = true; clearInterval(timer) }
  }, [rpc, C, driveKey])

  if (!status) return null
  const blocked = status.blocked || 0
  const on = status.enabled !== false
  const allowlisted = !!(driveKey && status.driveAllowlisted)
  const label = !on ? 'Shield off' : allowlisted ? 'Allowlisted' : `${blocked}`
  const title = !on
    ? 'Content Shield is off'
    : allowlisted
      ? 'This drive is allowlisted — click for shield settings'
      : `${blocked} blocked this session — click for shield settings`

  return html`
    <button
      type="button"
      className=${`nav shield-chip${on ? ' on' : ''}${allowlisted ? ' allowlisted' : ''}`}
      data-testid="shield-status-chip"
      title=${title}
      onClick=${() => onOpenSettings && onOpenSettings()}
    >🛡 ${label}</button>
  `
}

// Experimental-features toggles. The backend enforces each flag server-side;
// these are the user-facing switches (persisted in user-data settings):
//   - experimentalAutobeeCatalogs  unlocks the create/load `autobee://` paths
//                                  in the Apps tab.
//   - experimentalDeviceSync       unlocks the Device sync panel below (and the
//                                  CMD_SYNC_* handlers, gated by requireSync).
function ExperimentalSection ({ rpc, C, onAutobeeChange, onDeviceSyncChange }) {
  const [naming, setNaming] = useState(false)
  const [autobee, setAutobee] = useState(false)
  const [deviceSync, setDeviceSync] = useState(false)
  const [busy, setBusy] = useState(null) // the flag currently being written, or null
  const [err, setErr] = useState('')

  useEffect(() => {
    rpc.request(C.CMD_USERDATA_GET_SETTINGS)
      .then((res) => {
        const s = unwrapSettings(res)
        setNaming(!!s?.experimentalNaming)
        setAutobee(!!s?.experimentalAutobeeCatalogs)
        setDeviceSync(!!s?.experimentalDeviceSync)
      })
      .catch(() => {})
  }, [])

  const toggle = async (flag, next, setLocal, onChange) => {
    setBusy(flag); setErr('')
    try {
      await rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates: { [flag]: next } })
      setLocal(next)
      onChange?.(next)
    } catch (e) { setErr(`save: ${e.message}`) }
    finally { setBusy(null) }
  }

  return html`
    <div className="settings-card">
      ${err && html`<div className="apps-error">${err}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">Names (petnames)</div>
          <div className="settings-subtle">Type friendly names like <code>keet</code> in the address bar instead of 52-character keys. Resolves your own saved petnames plus a curated set of well-known names, fully local — a provenance chip shows how each name resolved. Experimental.</div>
        </div>
        <label className="login-scope${naming ? ' on' : ''}">
          <input type="checkbox" checked=${naming} disabled=${busy === 'experimentalNaming'}
                 onChange=${() => toggle('experimentalNaming', !naming, setNaming)} />
        </label>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Collaborative catalogs (Autobee)</div>
          <div className="settings-subtle">Create app catalogs several people can co-edit, synced peer-to-peer with no server. Experimental — load or create them with <code>autobee://</code> keys in the Apps tab. Not yet pinned on relays, so a catalog is reachable only while a writer is online.</div>
        </div>
        <label className="login-scope${autobee ? ' on' : ''}">
          <input type="checkbox" checked=${autobee} disabled=${busy === 'experimentalAutobeeCatalogs'}
                 onChange=${() => toggle('experimentalAutobeeCatalogs', !autobee, setAutobee, onAutobeeChange)} />
        </label>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Device sync (encrypted bookmarks)</div>
          <div className="settings-subtle">Sync your bookmarks across your own devices, encrypted end-to-end with no server or account. Once enabled, pair devices in the <strong>Device sync</strong> section below. Experimental — your synced data is readable only on devices that hold the pairing invite.</div>
        </div>
        <label className="login-scope${deviceSync ? ' on' : ''}">
          <input type="checkbox" checked=${deviceSync} disabled=${busy === 'experimentalDeviceSync'}
                 onChange=${() => toggle('experimentalDeviceSync', !deviceSync, setDeviceSync, onDeviceSyncChange)} />
        </label>
      </div>
    </div>
  `
}

function Settings ({ rpc, C, status, storagePath, log, appearanceTheme, onAppearanceThemeChange, activeDriveKey = '', onBrowse }) {
  const [identity, setIdentity] = useState(null)
  const [seedPhrase, setSeedPhrase] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(null)
  // Restore-from-phrase UX state.
  const [showRestore, setShowRestore] = useState(false)
  const [restoreInput, setRestoreInput] = useState('')
  const [restoreNotice, setRestoreNotice] = useState('')
  // Whether the Device-sync section is shown — driven by the experimental flag,
  // toggled live from the Experimental card below.
  const [deviceSync, setDeviceSync] = useState(false)
  // Device linking (blind-pairing): transfer THIS identity to a new device, or
  // adopt an identity from another device — no 24-word typing.
  const [linkInvite, setLinkInvite] = useState('')
  const [showLinkJoin, setShowLinkJoin] = useState(false)
  const [linkJoinInput, setLinkJoinInput] = useState('')
  const [linkNotice, setLinkNotice] = useState('')
  const CMD_GET_IDENTITY = C?.CMD_GET_IDENTITY ?? 31
  const CMD_IDENTITY_EXPORT_PHRASE = C?.CMD_IDENTITY_EXPORT_PHRASE ?? 70
  const CMD_IDENTITY_IMPORT_PHRASE = C?.CMD_IDENTITY_IMPORT_PHRASE ?? 71
  const CMD_IDENTITY_VALIDATE_PHRASE = C?.CMD_IDENTITY_VALIDATE_PHRASE ?? 73
  const CMD_DEVICE_LINK_CREATE_INVITE = C?.CMD_DEVICE_LINK_CREATE_INVITE ?? 76
  const CMD_DEVICE_LINK_JOIN = C?.CMD_DEVICE_LINK_JOIN ?? 77
  const CMD_CLEAR_CACHE = C?.CMD_CLEAR_CACHE ?? 30
  const CMD_RESET_APP = C?.CMD_RESET_APP ?? 29

  const refreshIdentity = () =>
    rpc.request(CMD_GET_IDENTITY).then(setIdentity).catch((e) => setErr(e.message))

  useEffect(() => { refreshIdentity() }, [])

  // Load the device-sync flag once so the section renders on first paint if the
  // user already enabled it; the Experimental toggle keeps it in sync after.
  useEffect(() => {
    rpc.request(C.CMD_USERDATA_GET_SETTINGS)
      .then((res) => setDeviceSync(!!unwrapSettings(res)?.experimentalDeviceSync))
      .catch(() => {})
  }, [])

  const revealPhrase = async () => {
    if (seedPhrase) { setSeedPhrase(null); return }
    setErr(''); setBusy('reveal')
    try {
      const res = await rpc.request(CMD_IDENTITY_EXPORT_PHRASE)
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
      const v = await rpc.request(CMD_IDENTITY_VALIDATE_PHRASE, { mnemonic: phrase })
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
      await rpc.request(CMD_IDENTITY_IMPORT_PHRASE, { mnemonic: phrase }, 30000)
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

  // SOURCE device — mint a single-use invite. Share it (copy/QR) with your OWN
  // new device; it's a bearer secret that hands over your identity, so treat it
  // like the backup phrase and don't paste it anywhere public.
  const createLinkInvite = async () => {
    setErr(''); setLinkNotice(''); setBusy('link-invite')
    try {
      const res = await rpc.request(CMD_DEVICE_LINK_CREATE_INVITE, {}, 30000)
      setLinkInvite(res.invite)
    } catch (e) { setErr(`link: ${e.message}`) }
    finally { setBusy(null) }
  }

  // TARGET device — adopt the identity advertised by an invite from your other
  // device. Rewrites this device's identity, so warn like Restore does.
  const joinLinkInvite = async () => {
    const invite = linkJoinInput.trim()
    if (!invite) return
    if (!confirm('Linking will REPLACE this device\'s identity with the one from your other device.\n\nThis device\'s current identity is discarded (make sure its phrase is saved if you need it). Proceed?')) return
    setErr(''); setLinkNotice(''); setBusy('link-join')
    try {
      await rpc.request(CMD_DEVICE_LINK_JOIN, { invite, device: 'this device' }, 120000)
      setLinkJoinInput('')
      setShowLinkJoin(false)
      setLinkNotice('Device linked — your peer key has rotated. Restart PearBrowser for the linked identity to take effect.')
      await refreshIdentity()
    } catch (e) { setErr(`link: ${e.message}`) }
    finally { setBusy(null) }
  }

  const clearCache = async () => {
    if (!confirm('Clear all cached drives + proxy cache? Installed apps and your sites are NOT affected.')) return
    setErr(''); setBusy('cache')
    try {
      const res = await rpc.request(CMD_CLEAR_CACHE)
      alert(`Cleared: ${res.message || res.cleared + ' items'}`)
    } catch (e) { setErr(e.message) }
    finally { setBusy(null) }
  }

  const resetApp = async () => {
    if (!confirm('Reset app data?\n\nThis will:\n  1. Unseed every pinned site from HiveRelay\n  2. Wipe all local state (sites, apps, bookmarks, identity)\n  3. Quit the app\n\nCopy any drive keys you want to keep first!')) return
    if (!confirm('Are you ABSOLUTELY sure? This cannot be undone.')) return
    setErr(''); setBusy('reset')
    try {
      const res = await rpc.request(CMD_RESET_APP, {}, 60000)
      alert(`Unseeded ${res.unseeded?.length ?? 0} site(s). App will now quit. Relaunch to start fresh.`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(null)
    }
  }

  return html`
    <div className="settings">
      <h1>Settings</h1>
      <p className="subtitle">Identity, appearance, infrastructure, and diagnostics for your peer-to-peer browser.</p>
      ${err && html`<div className="apps-error">${err}</div>`}

      <h2>Appearance</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Browser theme</div>
            <div className="settings-subtle">Choose the chrome appearance for tabs, toolbars, settings, and dialogs.</div>
          </div>
          <div className="theme-segmented" role="group" aria-label="Browser theme">
            ${['light', 'dark'].map((mode) => html`
              <button
                key=${mode}
                type="button"
                className=${'theme-segment' + (appearanceTheme === mode ? ' active' : '')}
                aria-pressed=${appearanceTheme === mode}
                onClick=${() => onAppearanceThemeChange?.(mode)}
              >
                ${mode === 'light' ? 'Light' : 'Dark'}
              </button>
            `)}
          </div>
        </div>
      </div>

      <h2>Identity</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Your peer public key</div>
            <code className="settings-code">${identity?.publicKey || '(loading…)'}</code>
          </div>
        </div>
      </div>

      <h2>Moving to a new device?</h2>
      <p className="subtitle">Your identity lives on this machine. To use the same identity on another computer or after a wipe, write down your backup phrase (or use <em>Link a device</em> below). Anyone with the phrase can sign in as you — store it like a password.</p>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Backup phrase</div>
            <div className="settings-subtle">${identity?.hasBackupPhrase ? `${identity.mnemonicWordCount}-word BIP-39 mnemonic. Reveal once to write down — never display on a shared screen.` : 'not available'}</div>
          </div>
          <button className="btn" onClick=${revealPhrase} disabled=${busy === 'reveal' || !identity?.hasBackupPhrase}>
            ${seedPhrase ? 'Hide' : 'Reveal phrase'}
          </button>
        </div>
        ${seedPhrase && html`
          <pre className="seed-phrase">${seedPhrase}</pre>
          <div className="settings-warning">Write this down somewhere offline. Anyone with these words controls your identity — and we can't reset it for you.</div>
        `}
        <div className="settings-row">
          <div>
            <div className="settings-label">Restore from phrase</div>
            <div className="settings-subtle">Replace this device's identity with one recovered from a saved 12 or 24-word phrase. Use this on a fresh PearBrowser install to bring your existing identity over.</div>
          </div>
          <button className="btn subtle" onClick=${() => { setShowRestore((v) => !v); setRestoreNotice(''); setErr('') }}
                  disabled=${busy?.startsWith?.('restore')}>
            ${showRestore ? 'Cancel' : 'Restore…'}
          </button>
        </div>
        ${showRestore && html`
          <div className="restore-form">
            <textarea
              className="restore-textarea"
              placeholder="Paste your 12 or 24-word backup phrase here, separated by spaces"
              value=${restoreInput}
              rows="3"
              spellCheck="false"
              autoCapitalize="none"
              onInput=${(e) => setRestoreInput(e.target.value)}
            ></textarea>
            <div className="restore-actions">
              <button className="btn primary" onClick=${validateAndRestore}
                      disabled=${!restoreInput.trim() || busy?.startsWith?.('restore')}>
                ${busy === 'restore-validate' ? 'Checking…' : busy === 'restore-apply' ? 'Restoring…' : 'Restore identity'}
              </button>
            </div>
            <div className="settings-warning">This destroys the current identity on disk. Make sure you've saved its phrase first.</div>
          </div>
        `}
        ${restoreNotice && html`<div className="apps-ok">${restoreNotice}</div>`}
      </div>

      <h2>Link a device</h2>
      <p className="subtitle">Move this identity to another device without typing your phrase. Devices pair directly over the P2P network (blind-pairing) — no server, no account. The invite is a one-time secret that hands over your identity, so only share it with your own device.</p>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Link a new device</div>
            <div className="settings-subtle">Generate an invite here, then paste it into <em>Link this device</em> on your other device to copy this identity across.</div>
          </div>
          <button className="btn" onClick=${createLinkInvite} disabled=${busy === 'link-invite' || !identity?.hasBackupPhrase}>
            ${busy === 'link-invite' ? 'Creating…' : 'Create invite'}
          </button>
        </div>
        ${linkInvite && html`
          <pre className="seed-phrase">${linkInvite}</pre>
          <div className="settings-warning">One-time invite — anyone who receives it can adopt your identity. Paste it into your other device now; it expires when you close this screen.</div>
        `}
        <div className="settings-row">
          <div>
            <div className="settings-label">Link this device</div>
            <div className="settings-subtle">Paste an invite from your other device to adopt its identity here. Replaces this device's current identity.</div>
          </div>
          <button className="btn subtle" onClick=${() => { setShowLinkJoin((v) => !v); setLinkNotice(''); setErr('') }}
                  disabled=${busy?.startsWith?.('link')}>
            ${showLinkJoin ? 'Cancel' : 'Paste invite…'}
          </button>
        </div>
        ${showLinkJoin && html`
          <div className="restore-form">
            <textarea
              className="restore-textarea"
              placeholder="Paste the invite from your other device"
              value=${linkJoinInput}
              rows="2"
              spellCheck="false"
              autoCapitalize="none"
              onInput=${(e) => setLinkJoinInput(e.target.value)}
            ></textarea>
            <div className="restore-actions">
              <button className="btn primary" onClick=${joinLinkInvite}
                      disabled=${!linkJoinInput.trim() || busy === 'link-join'}>
                ${busy === 'link-join' ? 'Linking…' : 'Link this device'}
              </button>
            </div>
            <div className="settings-warning">This destroys the current identity on disk. Make sure you've saved its phrase first.</div>
          </div>
        `}
        ${linkNotice && html`<div className="apps-ok">${linkNotice}</div>`}
      </div>

      <h2>Profile</h2>
      <p className="subtitle">What apps see when you grant a sign-in. Each field is opt-in — leave blank to share nothing.</p>
      <${ProfileSection} rpc=${rpc} C=${C} />

      <h2>Permission Center</h2>
      <p className="subtitle">Persistent app grants grouped by drive: sign-in, profile fields, contacts, and arbitrary swarm topics.</p>
      <${PermissionCenterSection} rpc=${rpc} C=${C} />

      <h2>Content Shield</h2>
      <p className="subtitle">Brave-style ad and tracker blocking, enforced inside the browser's own proxy — blocked requests never reach a peer, a relay, or the network. Named filter lists hot-swap offline; per-drive allowlist and strict mode live here; Pear Plugins feed the same engine with a kill switch.</p>
      <${ContentShieldSection} rpc=${rpc} C=${C} activeDriveKey=${activeDriveKey} onBrowse=${onBrowse} />

      <h2>Clearnet &amp; privacy</h2>
      <p className="subtitle">Browse https:// sites through the browser-owned clearnet proxy (shields on) or direct load. Privacy ladder: HTTPS-only upgrades, tracking-parameter stripping, referrer policy, fingerprint farbling, third-party cookie isolation in proxy mode.</p>
      <${PrivacyClearnetSection} rpc=${rpc} C=${C} />

      <h2>Relays</h2>
      <p className="subtitle">HiveRelay endpoints used for fast first-paint and persistence. Hybrid mode falls back to pure P2P if a relay is down.</p>
      <${RelaysSection} rpc=${rpc} C=${C} />

      <h2>Nostr identity</h2>
      <p className="subtitle">A portable Nostr key (npub), linked to your pear identity by a mutual, revocable attestation. "Linked (attested)" is a trust assertion the two keys mutually signed — never proof of the same person.</p>
      <${NostrIdentitySection} rpc=${rpc} C=${C} />

      <h2>Nostr feed</h2>
      <p className="subtitle">Post NIP-01 notes signed with your Nostr key. Toggle "Include trusted contacts" to also see notes a verified contact authored with their attested Nostr key, replicated peer-to-peer.</p>
      <${NostrFeedSection} rpc=${rpc} C=${C} />

      <h2>Name registry</h2>
      <p className="subtitle">Claim memorable names that resolve to your drives or app links — type the name (or pearname://name) in the URL bar. Owner-signed, durable across devices, first-claim-wins with a homograph guard.</p>
      <${NameRegistrySection} rpc=${rpc} C=${C} />

      <h2>HiveRelay Network</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Connected relays</div>
            <div className="settings-subtle">${status.hiveRelays || 0} HiveRelay(s) reachable via the DHT right now</div>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Default replication factor</div>
            <div className="settings-subtle">3 relays per published site (configurable per-publish in a future release)</div>
          </div>
        </div>
      </div>

      <h2>Live status</h2>
      <pre className="boot-log">${JSON.stringify(status, null, 2)}</pre>

      <h2>Storage</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Path</div>
            <code className="settings-code">${storagePath}</code>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Usage</div>
            <div className="settings-subtle">${status.storageUsed ? (status.storageUsed / 1048576).toFixed(1) + ' MB' : '—'} / ${status.storageLimit ? (status.storageLimit / 1048576).toFixed(0) + ' MB' : '—'}</div>
          </div>
          <button className="btn subtle" onClick=${clearCache} disabled=${busy === 'cache'}>Clear cache</button>
        </div>
      </div>

      <h2>Experimental</h2>
      <p className="subtitle">Early features behind a flag. They may change, break, or be removed.</p>
      <${ExperimentalSection} rpc=${rpc} C=${C} onDeviceSyncChange=${setDeviceSync} />

	      ${deviceSync && html`<div className="settings-section-device-sync">
	        <h2>Device sync <span className="settings-subtle">(experimental)</span></h2>
	        <p className="subtitle">Your bookmarks, encrypted and synced across your own devices — no server, no account. Set up sync here, then pair your other devices with the invite.</p>
	        <${DeviceSync} rpc=${rpc} C=${C} />
	      </div>`}

      <h2>Danger zone</h2>
      <div className="settings-card danger">
        <div className="settings-row">
          <div>
            <div className="settings-label">Reset app data</div>
            <div className="settings-subtle">Unseeds every published site from HiveRelay first (only possible while your publisher keypair is intact), then wipes local storage and quits. You'll start fresh on next launch. <strong>Copy your drive keys before doing this.</strong></div>
          </div>
          <button className="btn subtle danger" onClick=${resetApp} disabled=${busy === 'reset'}>${busy === 'reset' ? 'Resetting…' : 'Reset data'}</button>
        </div>
      </div>

      <h2>Boot log</h2>
      <pre className="boot-log">${log.join('\n') || '(events arrived pre-mount — check status above)'}</pre>
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
        <div className="block-fields">
          <select value=${block.level} onChange=${(e) => update({ level: +e.target.value })}>
            ${[1, 2, 3].map((n) => html`<option key=${n} value=${n}>H${n}</option>`)}
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
        <div className="block-fields">
          <input type="text" placeholder="src (https://…)" value=${block.src} onInput=${(e) => update({ src: e.target.value })} />
          <input type="text" placeholder="alt text" value=${block.alt} onInput=${(e) => update({ alt: e.target.value })} />
        </div>
      `
    case 'link':
      return html`
        <div className="block-fields">
          <input type="text" placeholder="href" value=${block.href} onInput=${(e) => update({ href: e.target.value })} />
          <input type="text" placeholder="text" value=${block.text} onInput=${(e) => update({ text: e.target.value })} />
        </div>
      `
    case 'list':
      return html`<textarea rows=${Math.max(2, block.items.length)} placeholder="One item per line" value=${block.items.join('\n')} onInput=${(e) => update({ items: e.target.value.split('\n') })}></textarea>`
    case 'divider':
      return html`<div className="placeholder">— divider —</div>`
    default:
      return html`<div className="placeholder">unknown block: ${block.type}</div>`
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

  // Upload a site icon — read as a data URL and write /icon.<ext> into the drive
  // (peers replicate it; already-published sites need no re-publish). Shows in
  // the browser's app/site listings via CMD_GET_APP_ICON.
  const [iconOk, setIconOk] = useState(false)
  const uploadIcon = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (file.size > 512 * 1024) { setErr('icon: too large (max 512KB)'); e.target.value = ''; return }
    const reader = new FileReader()
    reader.onload = async () => {
      setErr(''); setIconOk(false); setBusy('icon')
      try {
        await rpc.request(C.CMD_SET_SITE_ICON, { siteId: site.siteId, dataUrl: reader.result })
        setIconOk(true); setTimeout(() => setIconOk(false), 2500)
      } catch (err) { setErr(`icon: ${err.message}`) }
      finally { setBusy(null); if (e.target) e.target.value = '' }
    }
    reader.readAsDataURL(file)
  }

  return html`
    <div className="site-editor">
      <div className="site-editor-bar">
        <button className="btn subtle" onClick=${onBack}>← Sites</button>
        <input className="site-name-input" type="text" placeholder="Site name" value=${name} onInput=${(e) => setName(e.target.value)} />
        <div className="spacer"></div>
        <label className="btn subtle" title="Upload a site icon (SVG/PNG/JPEG/WebP, ≤512KB) — shows in the browser's site list">
          ${busy === 'icon' ? 'Uploading…' : (iconOk ? '✓ Icon set' : '🖼 Icon')}
          <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" style=${{ display: 'none' }} onChange=${uploadIcon} />
        </label>
        <button className="btn" onClick=${save} disabled=${busy === 'save'} title="Write block changes to the drive — peers see updates live">${busy === 'save' ? 'Saving…' : 'Save'}</button>
        ${meta.published
          ? html`<button key="unpublish" className="btn subtle" onClick=${unpublish} disabled=${busy === 'unpublish'}>${busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}</button>`
          : html`<button key="publish" className="btn primary" onClick=${publish} disabled=${busy === 'publish'} title="Seeds via Hyperswarm and pins to HiveRelay for 24/7 availability">${busy === 'publish' ? 'Publishing…' : 'Publish & Pin'}</button>`}
      </div>

      ${err && html`<div className="apps-error">${err}</div>`}

      ${meta.published && meta.keyHex && html`
        <div className="site-published">
          <div className="site-published-row">
            <span>Published at</span>
            <code>hyper://${meta.keyHex}/</code>
            <button className="btn small" onClick=${() => copyText(`hyper://${meta.keyHex}/`)} title="Copy hyper:// URL">📋 Copy</button>
            <button className="btn" onClick=${() => onBrowse(`hyper://${meta.keyHex}/`)}>Open in Browse</button>
          </div>
          <div className="site-published-row subtle">
            <span>Drive key</span>
            <code className="key-mono">${meta.keyHex}</code>
            <button className="btn small subtle" onClick=${() => copyText(meta.keyHex)} title="Copy raw key">📋 Key</button>
          </div>
          <div className="site-pin-row ${meta.pin?.replicatedPeers > 0 ? 'ok' : 'warn'}">
            ${meta.pin?.replicatedPeers > 0
              ? html`<span>📌 Replicated to ${meta.pin.replicatedPeers} HiveRelay peer${meta.pin.replicatedPeers === 1 ? '' : 's'} (of ${meta.pin.acceptances} accepted). Safe to close the app — stays online 24/7.</span>`
              : meta.pin?.ok
                ? html`<span>📡 <strong>${meta.pin.acceptances} relay${meta.pin.acceptances === 1 ? '' : 's'} accepted</strong> your pin request, but none have pulled the content yet. The public HiveRelay network may take minutes or may not replicate at all. Your site is reachable via Hyperswarm as long as this app is running. Share your drive key now; keep the app open until you're sure someone's replicated it.</span>`
                : html`<span>⚠️ Seeded P2P locally only. ${meta.pin?.connectedRelays > 0 ? `Connected to ${meta.pin.connectedRelays} relay(s) but none accepted the seed request.` : 'No HiveRelays connected yet; retry in a moment.'} Site is reachable while this app is running.</span>`}
          </div>
          <div className="site-save-warning">
            💾 <strong>Save this key now.</strong> It's the only way to recover this site if you reset app data. Anyone with the key can reach your site; only this machine's publisher keypair can unseed it.
          </div>
        </div>
      `}

      <div className="blocks">
        ${blocks.length === 0 && html`<p className="placeholder">No blocks yet. Add one below.</p>`}
        ${blocks.map((block, i) => html`
          <div className="block" key=${i}>
            <div className="block-header">
              <span className="block-type">${block.type}</span>
              <div className="spacer"></div>
              <button className="btn subtle small" onClick=${() => moveBlock(i, -1)} disabled=${i === 0}>↑</button>
              <button className="btn subtle small" onClick=${() => moveBlock(i, 1)} disabled=${i === blocks.length - 1}>↓</button>
              <button className="btn subtle small" onClick=${() => removeBlock(i)}>✕</button>
            </div>
            <${BlockEditor} block=${block} onChange=${(next) => updateBlock(i, next)} />
          </div>
        `)}
      </div>

      <div className="add-block-row">
        <span className="placeholder">Add:</span>
        ${Object.keys(BLOCK_TEMPLATES).map((t) => html`
          <button key=${t} className="btn subtle small" onClick=${() => addBlock(t)}>${t}</button>
        `)}
      </div>
    </div>
  `
}

// Lighthouse federated search, as a reusable widget (Library + P2P Sites tabs).
// Local results paint instantly via CMD_SEARCH; the opt-in trusted-peer set
// arrives over EVT_SEARCH_FEDERATED, correlated by queryId so a stale reply
// can't clobber a newer search.
function FederatedSearch ({ rpc, C, onBrowse, placeholder }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = not searched yet
  const [indexed, setIndexed] = useState(0)
  const [searching, setSearching] = useState(false)
  const [federated, setFederated] = useState(false)
  const [federating, setFederating] = useState(false)
  const [searchMeta, setSearchMeta] = useState(null)
  const [err, setErr] = useState('')
  const searchIdRef = useRef(0)

  const runSearch = async () => {
    const q = query.trim()
    if (!q) { setResults(null); setFederating(false); setSearchMeta(null); return }
    setSearching(true); setFederating(false); setSearchMeta(null)
    try {
      const res = await rpc.request(C.CMD_SEARCH, { query: q, limit: 50, federated })
      searchIdRef.current = res?.queryId || 0
      setResults(Array.isArray(res?.results) ? res.results : [])
      setIndexed(res?.stats?.docs || 0)
      if (res?.federating) setFederating(true)
    } catch (e) { setErr(`search: ${e.message}`) }
    finally { setSearching(false) }
  }
  const resultUrl = (r) => {
    if (r && r.link) return r.link
    if (r && /^(?:pear|file|hyper):\/\//i.test(r.driveKey || '')) return r.driveKey
    return `hyper://${r.driveKey}${r.path && r.path !== '/' ? r.path : '/'}`
  }
  const srcBadge = (r) => {
    if (!r.tier || r.tier === 'self') return html`<span className="src-badge self">you</span>`
    if (r.tier === 'followed') return html`<span className="src-badge followed">trusted · hop ${r.trustHop ?? 1}</span>`
    return html`<span className="src-badge other">${r.tier}</span>`
  }
  useEffect(() => {
    const onFederated = (e) => {
      const d = (e && e.detail) || {}
      if (d.queryId !== searchIdRef.current) return
      if (Array.isArray(d.results)) setResults(d.results)
      setSearchMeta(d)
      setFederating(false)
    }
    rpc.addEventListener(`event:${C.EVT_SEARCH_FEDERATED}`, onFederated)
    return () => rpc.removeEventListener(`event:${C.EVT_SEARCH_FEDERATED}`, onFederated)
  }, [])

  return html`
    <div className="fed-search">
      ${err && html`<div className="apps-error">${err}</div>`}
      <div className="urlbar" style=${{ marginBottom: '10px' }}>
        <input type="text" className="url-input"
          placeholder=${placeholder || "Search the peer-to-peer web…"}
          value=${query}
          onInput=${(e) => setQuery(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && runSearch()} />
        <button className="btn primary" onClick=${runSearch} disabled=${searching || !query.trim()}>${searching ? 'Searching…' : 'Search'}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${federated} onChange=${(e) => setFederated(e.target.checked)} />
        Include trusted peers${federating ? html` <span className="fed-status">· searching peers…</span>` : ''}
        <${SearchProvenanceBadges} meta=${searchMeta} />
      </label>
      ${indexed ? html`<span className="search-indexed" style=${{ marginLeft: '10px', opacity: 0.6, fontSize: '12px' }}>${indexed} page(s) indexed</span>` : ''}
      ${results !== null && (results.length === 0
        ? html`<p className="placeholder">No matches${indexed === 0 ? ' yet — browse some hyper:// pages first to build your index.' : '.'}</p>`
        : html`<div className="library-list">
            ${results.map((r) => html`
              <div className="library-row" key=${r.docId || (r.driveKey + r.path)}>
                <div className="library-row-main">
                  <div className="library-title">${r.title || resultUrl(r)}${federated ? srcBadge(r) : ''}</div>
                  <div className="library-url">${resultUrl(r)}</div>
                </div>
                <button className="btn small" onClick=${() => onBrowse(resultUrl(r))}>Open</button>
              </div>
            `)}
          </div>`)}
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

  // Published P2P sites from the catalogue (hyperdrive sites pinned on the
  // relay network) — anything with a real 64-hex driveKey is a browsable site.
  const [discovered, setDiscovered] = useState([])
  const loadDiscovered = async () => {
    try {
      const res = await rpc.request(C.CMD_GET_CATALOG_APPS)
      const apps = Array.isArray(res) ? res : (res?.apps ?? [])
      // Dedupe by driveKey — the aggregated list carries the same site once per
      // loaded catalogue (dev seed + live bee), and the backend only collapses
      // entries that share a stable `id` (the dev seed has none), so without this
      // every published site renders twice on the Sites page.
      const sites = apps.filter((a) => a && typeof a.driveKey === 'string' && /^[0-9a-f]{64}$/i.test(a.driveKey))
      // Order: peerit (the front page of the P2P internet) is pinned first,
      // then any 'featured' sites, then the rest — stable within each band.
      const rank = (a) => (a.driveKey === PEERIT_DRIVE_KEY ? 0
        : (Array.isArray(a.categories) && a.categories.includes('featured') ? 1 : 2))
      const ordered = dedupeApps(sites)
        .map((a, i) => ({ a, i }))
        .sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i)
        .map((e) => e.a)
      setDiscovered(ordered)
    } catch (e) { /* discovery is best-effort */ }
  }

  useEffect(() => { refresh(); loadDiscovered() }, [])

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
    <div className="sites">
      <h1>P2P Sites</h1>
      <p className="subtitle">Search the peer-to-peer web, browse published sites, or create your own — all served 24/7 on the HiveRelay network.</p>

      <h2>Search the P2P web</h2>
      <${FederatedSearch} rpc=${rpc} C=${C} onBrowse=${onBrowse} placeholder="Search the peer-to-peer web…" />

      <h2>Published sites${discovered.length ? ` (${discovered.length})` : ''}</h2>
      <p className="subtitle">Live hyper:// sites pinned on the relay network — open any one in a tab.</p>
      ${discovered.length === 0
        ? html`<p className="placeholder">Loading published sites…</p>`
        : html`<div className="app-grid">
            ${discovered.map((s) => html`
              <div className="app-card" key=${s.driveKey}>
                <${AppIcon} rpc=${rpc} C=${C} driveKey=${s.driveKey} iconRef=${s.icon} iconData=${s.iconData} name=${s.name} />
                <div className="app-info">
                  <div className="app-name">${s.name}</div>
                  <div className="app-meta">${s.description || ('hyper://' + s.driveKey.slice(0, 10) + '…')}</div>
                </div>
                <div className="app-actions">
                  <button className="btn primary" onClick=${() => onBrowse('hyper://' + s.driveKey + '/')}>Open</button>
                  <button className="btn subtle" onClick=${() => copyText('hyper://' + s.driveKey + '/')}>📋 Copy</button>
                </div>
              </div>
            `)}
          </div>`}

      <h2>Your sites</h2>
      <p className="subtitle">Create and publish your own P2P site — auto-pinned to HiveRelay for 24/7 availability.</p>
      <div className="catalog-loader">
        <input
          className="site-name-field"
          type="text"
          placeholder="New site name…"
          onKeyDown=${(e) => e.key === 'Enter' && createSite()}
        />
        <button className="btn primary" onClick=${createSite} disabled=${busy === 'create'}>
          ${busy === 'create' ? 'Creating…' : 'Create site'}
        </button>
      </div>
      ${err && html`<div className="apps-error">${err}</div>`}

      ${sites.length === 0
        ? html`<p className="placeholder">No sites yet. Create one above.</p>`
        : html`<div className="app-grid">
            ${sites.map((site) => html`
              <div className="app-card" key=${site.siteId}>
                <${AppIcon} rpc=${rpc} C=${C} driveKey=${site.keyHex} name=${site.name} />
                <div className="app-info">
                  <div className="app-name">${site.name}</div>
                  <div className="app-meta">${site.published ? 'published · ' + (site.keyHex?.slice(0, 8) ?? '') + '…' : 'draft'}</div>
                </div>
                <div className="app-actions">
                  <button className="btn" onClick=${() => setEditing(site)}>Edit</button>
                  ${site.published && site.keyHex && html`<button className="btn subtle" onClick=${() => onBrowse(`hyper://${site.keyHex}/`)}>Open</button>`}
                  ${site.published && site.keyHex && html`<button className="btn subtle" onClick=${() => copyText(`hyper://${site.keyHex}/`)}>📋 Copy</button>`}
                  <button className="btn subtle" onClick=${() => deleteSite(site)} disabled=${busy === `del:${site.siteId}`}>Delete</button>
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
  const [appearanceTheme, setAppearanceTheme] = useState(() => applyAppearanceTheme(readCachedAppearanceTheme()))
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
  // Default initial state on launch is the browser-owned private-search home
  // first, then the PearBrowser landing, p2pbuilders, and peerit. Restored
  // session tabs stay behind those defaults so an app homepage cannot hijack
  // the home slot.
  const [tabs, setTabs] = useState(() => STARTUP_TABS.map((tab) => makeBrowserTab(tab.url, { title: tab.title })))
  const [browseActiveId, setBrowseActiveId] = useState(() => 'placeholder')
  const [closedTabs, setClosedTabs] = useState(() => [])
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
      rpc.request(C.CMD_USERDATA_GET_SETTINGS).then((res) => {
        const s = unwrapSettings(res)
        setAppearanceTheme(applyAppearanceTheme(s?.[APPEARANCE_THEME_SETTING] || readCachedAppearanceTheme()))
        // Show the first-launch onboarding modal. The landing-page hyperdrive
        // (DEFAULT_URL) auto-loads in the default browse tab BEHIND the modal —
        // the auto-load effect runs once settings are ready, independent of
        // onboarding — so skipping or clicking through reveals the already-loaded
        // landing, and reopening later (onboardingDone) lands straight on it.
        setOnboardingState(s?.onboardingDone ? 'done' : 'show')
        // Session restore: rehydrate browse tabs from previous session.
        // Iframes are recreated on first activation, but tab order,
        // active tab, pinned state, and per-tab back/forward history
        // are preserved.
        const savedTabs = Array.isArray(s?.browseTabs) ? s.browseTabs : null
        if (savedTabs && savedTabs.length > 0) {
          const restored = restoreStartupTabs(savedTabs, STARTUP_TABS)
          if (restored.tabs.length > 0) {
            setTabs(restored.tabs)
            setBrowseActiveId(restored.activeId)
          }
        }
        const savedClosedTabs = Array.isArray(s?.browseClosedTabs) ? s.browseClosedTabs : []
        const restoredClosed = savedClosedTabs
          .map((tab) => normalizeTabSnapshot(tab))
          .filter(Boolean)
          .slice(0, MAX_CLOSED_TABS)
        setClosedTabs(restoredClosed)
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
      const serialized = tabs.map((tab) => serializeTab(tab, browseActiveId))
      const serializedClosed = closedTabs
        .map((tab) => normalizeTabSnapshot(tab))
        .filter(Boolean)
        .slice(0, MAX_CLOSED_TABS)
      rpc.request(C.CMD_USERDATA_SET_SETTINGS, {
        updates: { browseTabs: serialized, browseClosedTabs: serializedClosed }
      }).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [tabs, closedTabs, browseActiveId, tabsRestored, rpc, C])

  const launchInBrowse = (url) => {
    setNavUrl(url)
    setTab('browse')
  }

  const setAndPersistAppearanceTheme = (theme) => {
    const next = applyAppearanceTheme(theme)
    setAppearanceTheme(next)
    rpc.request(C.CMD_USERDATA_SET_SETTINGS, {
      updates: { [APPEARANCE_THEME_SETTING]: next }
    }).catch((err) => {
      setLog((l) => [...l.slice(-200), `[settings] theme save failed: ${err.message}`])
    })
  }

  const toggleAppearanceTheme = () => {
    setAndPersistAppearanceTheme(appearanceTheme === 'dark' ? 'light' : 'dark')
  }

  const isReady = status.ready || !!status.proxyPort
  const statusClass = !isReady ? 'booting' : (status.dhtConnected ? 'ok' : 'err')
  const statusText = !isReady
    ? `Booting: ${status.stage}`
    : `DHT · ${status.peerCount} peer${status.peerCount === 1 ? '' : 's'} · ${status.hiveRelays || 0} relay${status.hiveRelays === 1 ? '' : 's'} · proxy :${status.proxyPort}`

  return html`
    <div className=${`app theme-${appearanceTheme}`} data-theme=${appearanceTheme}>
      <div className="topbar">
        <div className="brand">
          <${Logo} size=${22} />
          <${Wordmark} />
        </div>
        <div className="tabs">
          ${Object.entries(TAB_META).map(([id, m]) => html`
            <button className=${'tab' + (tab === id ? ' active' : '')} onClick=${() => setTab(id)} key=${id}>
              <span className="tab-label">${m.label}</span>
            </button>
          `)}
        </div>
        <div className="topbar-spacer"></div>
        <div className="topbar-tools">
          <button
            type="button"
            className="theme-toggle"
            aria-label=${appearanceTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed=${appearanceTheme === 'dark'}
            title=${appearanceTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick=${toggleAppearanceTheme}
          >
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb">${appearanceTheme === 'dark' ? '☾' : '☀'}</span>
            </span>
          </button>
        </div>
      </div>

      <div className=${'panel' + (tab === 'browse' ? ' panel-browse' : '')}>
        ${tab === 'browse' && html`<${Browse} rpc=${rpc} C=${C} navUrl=${navUrl} onNavigated=${() => setNavUrl(null)} tabs=${tabs} setTabs=${setTabs} activeId=${browseActiveId} setActiveId=${setBrowseActiveId} closedTabs=${closedTabs} setClosedTabs=${setClosedTabs} sessionReady=${tabsRestored} onOpenSettings=${() => setTab('settings')} />`}
        ${tab === 'apps' && html`<${Apps} rpc=${rpc} C=${C} onLaunch=${launchInBrowse} />`}
        ${tab === 'sites' && html`<${Sites} rpc=${rpc} C=${C} onBrowse=${launchInBrowse} />`}
        ${tab === 'library' && html`<${Library} rpc=${rpc} C=${C} onBrowse=${launchInBrowse} />`}
        ${tab === 'settings' && html`<${Settings} rpc=${rpc} C=${C} status=${status} storagePath=${storagePath} log=${log} appearanceTheme=${appearanceTheme} onAppearanceThemeChange=${setAndPersistAppearanceTheme} activeDriveKey=${(tabs.find((t) => t.id === browseActiveId) && tabDriveKey(tabs.find((t) => t.id === browseActiveId))) || ''} onBrowse=${launchInBrowse} />`}
      </div>

      <div className=${'status ' + statusClass}>
        <span className="dot"></span>${statusText}
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
