import { useEffect, useState } from 'react'
import { html } from 'htm/react'
import { Logo, Wordmark } from './logo.js'
import { Apps } from './components/apps.js'
import { Browse } from './components/browse.js'
import { LoginConsent, Onboarding, SwarmConsent } from './components/consent-modals.js'
import { Library } from './components/library.js'
import { Settings } from './components/settings.js'
import { Sites } from './components/sites.js'
import { shortKey } from './lib/keys.js'
import { unwrapSettings } from './lib/settings.js'
import {
  MAX_CLOSED_TABS,
  makeTab,
  normalizeTabSnapshot, serializeTab, restoreStartupTabs
} from './lib/tabs.js'

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
const DEFAULT_URL = 'hyper://1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d/'

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
  // Default initial state on launch is the PearBrowser landing page first,
  // then p2pbuilders, then peerit. Restored session tabs stay behind those
  // defaults so an app homepage such as Dealroom cannot hijack the release
  // landing slot.
  const [tabs, setTabs] = useState(() => [makeTab(DEFAULT_URL), makeTab(P2PBUILDERS_URL), makeTab(PEERIT_URL)])
  const [browseActiveId, setBrowseActiveId] = useState(() => 'placeholder')
  const [closedTabs, setClosedTabs] = useState(() => [])
  // Tracks whether we've completed the one-time tabs-restore from
  // user-data so the persistence effect doesn't overwrite saved state
  // with the placeholder during boot.
  const [tabsRestored, setTabsRestored] = useState(false)

  useEffect(() => {
    const appendLog = (line) => setLog((l) => [...l.slice(-200), line])

    const onBoot = (e) => {
      const d = e.detail || {}
      const elapsed = Number.isFinite(d.elapsedMs) ? ` +${Math.round(d.elapsedMs)}ms` : ''
      appendLog(`[${d.stage || 'boot'}${elapsed}] ${d.message || ''}`)
      setStatus((s) => ({ ...s, stage: d.stage, bootElapsedMs: d.elapsedMs, bootEventAt: d.at }))
    }
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
          const restored = restoreStartupTabs(savedTabs, [DEFAULT_URL, P2PBUILDERS_URL, PEERIT_URL])
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

  const isReady = status.ready || !!status.proxyPort
  const statusClass = !isReady ? 'booting' : (status.dhtConnected ? 'ok' : 'err')
  const statusText = !isReady
    ? `Booting: ${status.stage}`
    : `DHT · ${status.peerCount} peer${status.peerCount === 1 ? '' : 's'} · ${status.hiveRelays || 0} relay${status.hiveRelays === 1 ? '' : 's'} · proxy :${status.proxyPort}`

  return html`
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <${Logo} size=${22} />
          <${Wordmark} />
        </div>
        <div className="tabs">
          ${Object.entries(TAB_META).map(([id, m]) => html`
            <button className=${'tab' + (tab === id ? ' active' : '')} onClick=${() => setTab(id)} key=${id}>
              <span className="tab-icon">${m.icon}</span>
              <span className="tab-label">${m.label}</span>
            </button>
          `)}
        </div>
        <div className="topbar-spacer"></div>
      </div>

      <div className=${'panel' + (tab === 'browse' ? ' panel-browse' : '')}>
        ${tab === 'browse' && html`<${Browse} rpc=${rpc} C=${C} navUrl=${navUrl} onNavigated=${() => setNavUrl(null)} tabs=${tabs} setTabs=${setTabs} activeId=${browseActiveId} setActiveId=${setBrowseActiveId} closedTabs=${closedTabs} setClosedTabs=${setClosedTabs} sessionReady=${tabsRestored} defaultUrl=${DEFAULT_URL} />`}
        ${tab === 'apps' && html`<${Apps} rpc=${rpc} C=${C} onLaunch=${launchInBrowse} />`}
        ${tab === 'sites' && html`<${Sites} rpc=${rpc} C=${C} onBrowse=${launchInBrowse} peeritDriveKey=${PEERIT_DRIVE_KEY} />`}
        ${tab === 'library' && html`<${Library} rpc=${rpc} C=${C} onBrowse=${launchInBrowse} />`}
        ${tab === 'settings' && html`<${Settings} rpc=${rpc} C=${C} status=${status} storagePath=${storagePath} log=${log} currentTabs=${tabs} activeId=${browseActiveId} onOpenTab=${launchInBrowse} />`}
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
        p2pBuildersUrl=${P2PBUILDERS_URL}
        onPickSite=${(url) => launchInBrowse(url)}
        onClose=${() => setOnboardingState('done')}
      />`}
    </div>
  `
}
