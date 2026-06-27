import { useEffect, useMemo, useRef, useState } from 'react'
import { html } from 'htm/react'
import { AppIcon, safeIconSrc } from './app-icon.js'
import { usePermissionEvidence } from './permission-evidence.js'
import { ShipCheckReport } from './ship-check-report.js'
import { AppTrustBadges, AppTrustDetail, CatalogSourceChips } from './trust-widgets.js'
import { hexFromZ32, formatBytes, shortKey, driveKeyFromHyperRef, parseCatalogRef, catalogCacheKeyForRef } from '../lib/keys.js'
import { appCategories, catalogAppSearchText, dedupeApps, normalizeAppLinkForKey } from '../lib/catalog-apps.js'
import { importAttributionForCatalogSave } from '../lib/catalog-provenance.js'
import { selectDriveInfoKeysForPolling } from '../lib/drive-info-polling.js'
import { unwrapSettings } from '../lib/settings.js'

function copyText (text) {
  try {
    navigator.clipboard?.writeText(text)
  } catch {}
}

// Vetted against https://github.com/holepunchto/pear-aliases — these
// are the canonical pear:// keys for Holepunch-ecosystem apps.
//
// The `type` field + the window-vs-tab distinction is adopted from
// Drache93's Pear Browser (https://github.com/Drache93/pear-browser), which
// pioneered running P2P apps in a tab via pear-request (htmx hooked to a
// worker pipe). Two kinds of apps, exactly as Drache93 models them:
//   - 'standalone' : a full Bare app with its own UI (Keet, PearPass …). It
//                    can only open in its OWN WINDOW — there is no htmx/pipe
//                    UI to stream into a tab. (Drache93: "Standalone site
//                    opened in new window".)
//   - 'hypersite'  : a pear-request/htmx app whose UI IS served over a pipe,
//                    so it renders HEADLESS in a tab.
// The UI gates the action on this: standalone → "Open" (window); hypersite →
// "Run in tab". This removes the confusing "Run in tab" on apps that can't.
const PEERCORD_LINK = 'pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy'

// First rollout: Peercord. Add other standalone pear:// apps here only when
// they need the same first-run window/trust warning.
const STANDALONE_PRELAUNCH_WARNINGS = {
  peercord: {
    key: 'peercord',
    link: PEERCORD_LINK,
    appName: 'Peercord',
    title: 'Before opening Peercord',
    body: 'Peercord opens in its own Pear window. On first launch, Pear may ask you to review and approve a persistent third-party trust prompt.',
    trust: 'Approving it executes third-party code and creates a persistent trust decision.'
  }
}

const FEATURED_APPS = [
  {
    id: 'keet',
    name: 'Keet',
    type: 'standalone',
    tagline: 'End-to-end encrypted P2P chat, voice, and video calls by Holepunch.',
    link: 'pear://oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo',
    initial: 'K',
    gradient: 'linear-gradient(135deg, #fbbf24, #f97316)'
  },
  {
    id: 'pearpass',
    name: 'PearPass',
    type: 'standalone',
    tagline: 'Peer-to-peer password manager from Tether — synced across devices without a cloud.',
    link: 'pear://tywsat7gz8m65ejx4zjn3773pbdc4j8m66tukis8dgzekraymtzo',
    initial: 'P',
    gradient: 'linear-gradient(135deg, #3fb950, #58a6ff)'
  },
  // anonGPT — private P2P AI chat. A full Pear app: opens in its own window.
  // (The in-browser window.pear.anongpt buyer shim in backend/anongpt-buyer.js
  // is a separate hyper:// hosting path, not exercised by this pear:// launch.)
  {
    id: 'anongpt',
    name: 'anonGPT',
    type: 'standalone',
    tagline: 'Private P2P AI chat — pay-per-inference from a HiveMind seller, with signed receipts.',
    link: 'pear://rpzh3fsgg38kfir9nmae7x3o8ubofddzzixr5js4mxd6a6drb6wo',
    initial: 'A',
    gradient: 'linear-gradient(135deg, #22d3ee, #6366f1)'
  },
  // Paste — local-first, E2E-encrypted notes & clipboard sync. A full Pear
  // app: opens in its own window. Landing page (hyper://25a06bb3…) is in the
  // default catalog as its homepage. Link MUST match the catalogue entry
  // (catalog-source/catalog.json id:pearpaste) — the LEAN, compacted key
  // qnax5k8o (≈432MB). The old u6oyh38 key carried ~35GB of dev-history blob
  // bloat (see app-pinning notes) and forced a huge first-load download.
  {
    id: 'pearpaste',
    name: 'Paste',
    type: 'standalone',
    tagline: 'Local-first, end-to-end encrypted notes & clipboard sync for your own devices — no account, no cloud.',
    link: 'pear://qnax5k8ojtod51ci9qwkrawdof1hx5w3a7gqbueoqnzzq9dw5hfo',
    initial: '📋',
    gradient: 'linear-gradient(135deg, #4ade80, #22d3ee)'
  },
  // Peercord — Discord-style P2P chat. Its current Pear release is
  // pear.json type:"desktop" (Electron/Pear window class), not a pear-request
  // terminal worker, so route it through the standalone launch path. Marking it
  // hypersite would surface "Run in tab" but hang on the headless wrapper.
  {
    id: 'peercord',
    name: 'Peercord',
    type: 'standalone',
    tagline: 'Decentralized Discord-style chat with text, voice, video, screen sharing, and P2P file transfer.',
    link: PEERCORD_LINK,
    initial: 'P',
    gradient: 'linear-gradient(135deg, #5865f2, #22d3ee)'
  }
]

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
    const app = /^(?:pear|file):\/\//i.test(val)
      ? { link: val, name: appName || val }
      : { driveKey: driveKeyFromHyperRef(val), name: appName || val }
    if (!app.link && !app.driveKey) { setErr('Enter a pear:// link, file:// link, or a valid hyper:// drive key.'); return }
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
                    <input className="profile-input" placeholder="hyper:// drive key or pear:// link" value=${appKey} onInput=${(e) => setAppKey(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && addApp()} />
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
  const [checking, setChecking] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [shipCheck, setShipCheck] = useState(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const shipCheckPayload = (extra = {}) => ({
    kind: 'app',
    name: name.trim(),
    link: link.trim(),
    description: description.trim(),
    author: author.trim(),
    categories,
    type: /^pear:\/\//i.test(link.trim()) ? 'standalone' : 'hypersite',
    ...extra
  })

  const runShipCheck = async (extra = {}) => {
    setErr(''); setOk('')
    if (!link.trim() && !name.trim()) { setErr('Add an app name and link before running ship check.'); return }
    setChecking(true)
    try {
      const res = await rpc.request(C.CMD_SHIP_CHECK, shipCheckPayload(extra), 30000)
      setShipCheck(res)
    } catch (e) { setErr(`ship check: ${(e && e.message) || String(e)}`) } finally { setChecking(false) }
  }

  const runFreshPeerVerifier = async () => {
    setErr(''); setOk('')
    if (!link.trim()) { setErr('Add a pear:// or hyper:// link before running the verifier.'); return }
    setVerifying(true)
    try {
      const proof = await rpc.request(C.CMD_RUN_FRESH_PEER_VERIFY, shipCheckPayload(), 130000)
      await runShipCheck({ verifierResult: proof })
      setOk(proof.ok ? 'Fresh-peer verifier passed.' : 'Fresh-peer verifier finished with warnings.')
    } catch (e) { setErr(`fresh-peer verifier: ${(e && e.message) || String(e)}`) } finally { setVerifying(false) }
  }

  const submit = async () => {
    setErr(''); setOk('')
    if (!name.trim()) { setErr('App name is required.'); return }
    if (!link.trim()) { setErr('Paste a pear:// link, a hyper:// link, or a drive key.'); return }
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
      <p className="subtitle">Add any Pear app or hyperdrive site to the community catalogue. Submissions are pinned on relays and reviewed by a moderator before appearing in everyone's Community list.</p>
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
            <input className="profile-input" placeholder="pear://… or hyper://… (or a 64-hex / z-base-32 key)" value=${link} onInput=${(e) => setLink(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && submit()} />
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
          <button className="btn" onClick=${() => runShipCheck()} disabled=${checking || busy || (!name.trim() && !link.trim())}>${checking ? 'Checking...' : 'Ship check'}</button>
          <button className="btn primary" onClick=${submit} disabled=${busy || !name.trim() || !link.trim()}>${busy ? 'Submitting…' : 'Submit for review'}</button>
        </div>
        <${ShipCheckReport} report=${shipCheck} onRunVerifier=${runFreshPeerVerifier} verifying=${verifying} />
      </div>
    </div>
  `
}

// In-app moderator panel — operator-gated (needs the relay management URL + API
// key, saved to userdata settings). Lists the relay's pending pin-requests
// (CMD_MOD_PENDING) and approves/rejects them (CMD_MOD_APPROVE / CMD_MOD_REJECT).
// Collapsed by default since only the operator needs it. The relay must run in
// `review` accept mode for submissions to queue here.
function PendingManifestPreview ({ manifest }) {
  const m = manifest && typeof manifest === 'object' ? manifest : null
  if (!m) return html`<div className="settings-subtle">No manifest preview supplied by relay yet.</div>`
  const title = m.name || m.id || 'Manifest preview'
  const subtitle = [
    m.type,
    m.version ? `v${m.version}` : '',
    m.author ? `by ${m.author}` : ''
  ].filter(Boolean).join(' · ')
  const link = m.pearLink || m.link || ''
  return html`
    <div className="mod-manifest-preview">
      <div className="settings-label">${title}</div>
      ${subtitle && html`<div className="settings-subtle">${subtitle}</div>`}
      ${m.description && html`<div className="settings-subtle">${m.description}</div>`}
      ${link && html`<code className="settings-code">${link}</code>`}
      ${Array.isArray(m.categories) && m.categories.length > 0 && html`
        <div className="settings-subtle">${m.categories.join(', ')}</div>
      `}
      ${m.manifestKey && html`<div className="settings-subtle">manifest ${(m.manifestKey || '').slice(0, 16)}…</div>`}
    </div>
  `
}

function ModeratorPanel ({ rpc, C }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(null) // null = not loaded yet
  const [rejectReasons, setRejectReasons] = useState({})
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

  const decide = async (row, approve) => {
    const appKey = row?.appKey || row
    setErr(''); setBusy((approve ? 'a:' : 'r:') + appKey)
    try {
      const payload = { appKey }
      if (approve && row?.manifest) payload.manifest = row.manifest
      if (!approve && rejectReasons[appKey]) payload.reason = rejectReasons[appKey]
      await rpc.request(approve ? C.CMD_MOD_APPROVE : C.CMD_MOD_REJECT, payload, 60000)
      setPending((list) => (list || []).filter((p) => p.appKey !== appKey))
      setRejectReasons((all) => {
        const next = { ...all }
        delete next[appKey]
        return next
      })
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
              ${pending.map((p) => {
                const reason = rejectReasons[p.appKey] || ''
                return html`
                <div className="settings-row" key=${p.appKey} style=${{ alignItems: 'flex-start' }}>
                  <div style=${{ minWidth: 0, flex: 1 }}>
                    <div className="settings-label" style=${{ fontFamily: 'monospace' }}>${(p.appKey || '').slice(0, 16)}…</div>
                    <div className="settings-subtle">by ${(p.publisherPubkey || 'unknown').slice(0, 12)}…${p.currentRelays ? ` · ${p.currentRelays} relay(s)` : ''}</div>
                    <${PendingManifestPreview} manifest=${p.manifest} />
                    <textarea
                      className="profile-input"
                      rows="2"
                      placeholder="Reject reason"
                      value=${reason}
                      onInput=${(e) => setRejectReasons((all) => ({ ...all, [p.appKey]: e.target.value.slice(0, 300) }))}
                      style=${{ marginTop: '8px', minHeight: '54px' }}
                    />
                  </div>
                  <div style=${{ display: 'flex', gap: '6px' }}>
                    <button className="btn small primary" onClick=${() => decide(p, true)} disabled=${!!busy}>${busy === 'a:' + p.appKey ? '…' : 'Approve'}</button>
                    <button className="btn small subtle" onClick=${() => decide(p, false)} disabled=${!!busy}>${busy === 'r:' + p.appKey ? '…' : 'Reject'}</button>
                  </div>
                </div>
              `})}
            </div>
          `}
        </div>
      `}
    </div>
  `
}

// Decode an app's bundle drive key from its pear:// link (z-base-32 host,
// tolerating a versioned `N.M.<z32>` form), falling back to its driveKey.
// Used for live size/peers and to correlate launch-progress events.
function appBundleKey (app) {
  if (app && typeof app.link === 'string' && /^pear:\/\//.test(app.link)) {
    const host = app.link.replace(/^pear:\/\//, '').split('/')[0].split('.').pop()
    try { const k = hexFromZ32(host); if (/^[0-9a-f]{64}$/i.test(k)) return k.toLowerCase() } catch {}
  }
  if (app && /^[0-9a-f]{64}$/i.test(app.driveKey || '')) return app.driveKey.toLowerCase()
  return null
}

// A card footer: the app's pear:// (or hyper://) address (click to copy), its
// size, and a live peer count. The Apps grid passes batched metadata via
// driveInfo; the fallback keeps this component usable in older/non-batched
// call sites.
function AppMeta ({ rpc, C, app, driveInfo }) {
  const bundleKey = appBundleKey(app)
  const addr = (app && app.link) ? app.link : (app && /^[0-9a-f]{64}$/i.test(app.driveKey || '') ? ('hyper://' + app.driveKey + '/') : null)
  const [localInfo, setLocalInfo] = useState(null)
  useEffect(() => {
    if (driveInfo !== undefined) return
    if (!bundleKey || !(C && C.CMD_GET_DRIVE_INFO)) { setLocalInfo(null); return }
    let cancelled = false
    const load = async () => {
      try { const r = await rpc.request(C.CMD_GET_DRIVE_INFO, { keyHex: bundleKey }, 12000); if (!cancelled) setLocalInfo(r) } catch { /* best-effort */ }
    }
    load()
    const t = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [bundleKey, rpc, C, driveInfo])
  if (!addr) return null
  const info = driveInfo !== undefined ? driveInfo : localInfo
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
function LaunchBar ({ prog, onRetry }) {
  if (!prog) return null
  if (prog.phase === 'error') {
    return html`<div style=${{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#f85149', width: '100%' }}>
      <span>Launch failed${prog.error ? ': ' + prog.error : ''}</span>
      <button className="btn subtle" onClick=${onRetry}>Retry</button>
    </div>`
  }
  const pct = Math.max(0, Math.min(100, prog.phase === 'launching' ? 100 : (prog.percent || 0)))
  const label = prog.phase === 'connecting' ? ('Finding peers… ' + (prog.peers || 0))
    : prog.phase === 'launching' ? 'Launching…'
    : (formatBytes(prog.downloaded || 0) + ' / ' + formatBytes(prog.total || 0) + ' · ' + (prog.peers || 0) + ' peers · ' + pct + '%')
  return html`
    <div style=${{ width: '100%' }}>
      <div style=${{ height: '6px', borderRadius: '3px', background: '#21262d', overflow: 'hidden' }}>
        <div style=${{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#58a6ff,#3fb950)', transition: 'width .25s ease' }}></div>
      </div>
      <div style=${{ marginTop: '4px', fontSize: '11px', color: '#8b949e' }}>${label}</div>
    </div>
  `
}

function standalonePrelaunchWarningFor (app) {
  if (!app || app.type === 'hypersite') return null
  const link = normalizeAppLinkForKey(app.link)
  if (!/^pear:\/\//i.test(link)) return null
  const id = String(app.id || '').trim().toLowerCase()
  const warning = STANDALONE_PRELAUNCH_WARNINGS.peercord
  if (id === warning.key || link === warning.link) return warning
  return null
}

function normalizeStandaloneWarningsSeen (value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function StandalonePrelaunchWarning ({ pending, onCancel, onConfirm, busy }) {
  const warning = pending?.warning
  const appName = warning?.appName || pending?.app?.name || 'This app'
  if (!warning) return null
  return html`
    <div className="modal-overlay standalone-prelaunch-overlay" role="dialog" aria-modal="true"
         onClick=${(e) => e.target.classList.contains('modal-overlay') && onCancel()}>
      <div className="modal-card standalone-prelaunch-card">
        <div className="standalone-prelaunch-kicker">Standalone Pear app</div>
        <h2>${warning.title || `Before opening ${appName}`}</h2>
        <p>${warning.body}</p>
        <p className="standalone-prelaunch-trust">${warning.trust}</p>
        ${pending.link && html`<code className="standalone-prelaunch-link">${pending.link}</code>`}
        <div className="standalone-prelaunch-actions">
          <button className="btn subtle" onClick=${onCancel} disabled=${busy === 'pear-link'}>Cancel</button>
          <button className="btn primary" onClick=${onConfirm} disabled=${busy === 'pear-link'}>
            ${busy === 'pear-link' ? 'Opening...' : `Open ${appName}`}
          </button>
        </div>
      </div>
    </div>
  `
}

export function Apps ({ rpc, C, onLaunch }) {
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
  const [pearLink, setPearLink] = useState('')
  const [launched, setLaunched] = useState('')
  // Live download/launch progress per bundle key, fed by EVT_LAUNCH_PROGRESS.
  const [launchProg, setLaunchProg] = useState({})
  const [driveInfos, setDriveInfos] = useState({})
  const [metadataViewportAware, setMetadataViewportAware] = useState(() => {
    return typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function'
  })
  const [visibleMetadataKeys, setVisibleMetadataKeys] = useState([])
  const metadataCardsRef = useRef(new Map())
  const metadataObserverRef = useRef(null)
  const metadataRefCallbacksRef = useRef(new Map())
  const visibleMetadataKeysRef = useRef(new Set())
  const [standaloneWarningsSeen, setStandaloneWarningsSeen] = useState(null)
  const [pendingStandaloneLaunch, setPendingStandaloneLaunch] = useState(null)
  const permissions = usePermissionEvidence(rpc, C)
  useEffect(() => {
    if (!(rpc && C && C.EVT_LAUNCH_PROGRESS)) return
    const onProg = (e) => {
      const d = (e && e.detail) || {}
      const k = d.key || d.link
      if (!k) return
      setLaunchProg((prev) => {
        const next = { ...prev, [k]: d }
        if (d.phase === 'done') setTimeout(() => setLaunchProg((p) => { const n = { ...p }; delete n[k]; return n }), 1200)
        return next
      })
    }
    rpc.addEventListener(`event:${C.EVT_LAUNCH_PROGRESS}`, onProg)
    return () => rpc.removeEventListener(`event:${C.EVT_LAUNCH_PROGRESS}`, onProg)
  }, [rpc, C])

  useEffect(() => {
    const Observer = typeof window !== 'undefined' ? window.IntersectionObserver : null
    if (typeof Observer !== 'function') {
      setMetadataViewportAware(false)
      return
    }
    setMetadataViewportAware(true)
    const observer = new Observer((entries) => {
      let changed = false
      const next = new Set(visibleMetadataKeysRef.current)
      for (const entry of entries) {
        const key = entry?.target?.dataset?.driveInfoKey
        if (!key) continue
        if (entry.isIntersecting) {
          if (!next.has(key)) { next.add(key); changed = true }
        } else if (next.delete(key)) {
          changed = true
        }
      }
      if (!changed) return
      visibleMetadataKeysRef.current = next
      setVisibleMetadataKeys([...next].sort())
    }, { root: null, rootMargin: '420px 0px', threshold: 0 })
    metadataObserverRef.current = observer
    for (const el of metadataCardsRef.current.values()) observer.observe(el)
    return () => {
      observer.disconnect()
      if (metadataObserverRef.current === observer) metadataObserverRef.current = null
      visibleMetadataKeysRef.current = new Set()
    }
  }, [])

  const setMetadataCardRef = (key, el) => {
    const normalized = String(key || '').trim().toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(normalized)) return
    const existing = metadataCardsRef.current.get(normalized)
    if (existing && existing !== el && metadataObserverRef.current) {
      metadataObserverRef.current.unobserve(existing)
    }
    if (!el) {
      if (existing && metadataObserverRef.current) metadataObserverRef.current.unobserve(existing)
      metadataCardsRef.current.delete(normalized)
      const next = new Set(visibleMetadataKeysRef.current)
      if (next.delete(normalized)) {
        visibleMetadataKeysRef.current = next
        setVisibleMetadataKeys([...next].sort())
      }
      return
    }
    el.dataset.driveInfoKey = normalized
    metadataCardsRef.current.set(normalized, el)
    if (metadataObserverRef.current) metadataObserverRef.current.observe(el)
  }

  const metadataCardRef = (key) => {
    const normalized = String(key || '').trim().toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(normalized)) return undefined
    if (!metadataRefCallbacksRef.current.has(normalized)) {
      metadataRefCallbacksRef.current.set(normalized, (el) => setMetadataCardRef(normalized, el))
    }
    return metadataRefCallbacksRef.current.get(normalized)
  }

  const launchPearLink = async (overrideLink) => {
    const link = (typeof overrideLink === 'string' ? overrideLink : pearLink).trim()
    if (!link) return
    const keyHex = appBundleKey({ link })
    setErr(''); setBusy('pear-link'); setLaunched('')
    if (keyHex) setLaunchProg((p) => ({ ...p, [keyHex]: { phase: 'connecting', percent: 0, peers: 0, downloaded: 0, total: 0 } }))
    try {
      await rpc.request(C.CMD_LAUNCH_PEAR_LINK, { link, keyHex }, 60000)
      setPearLink('')
      // pear:// launches show progress inline via EVT_LAUNCH_PROGRESS; file://
      // and others have no bundle to track, so keep the toast for them.
      if (!keyHex) { setLaunched(`Launched ${link.slice(0, 60)}${link.length > 60 ? '…' : ''} in a new window.`); setTimeout(() => setLaunched(''), 4000) }
    } catch (e) {
      setErr(`launch: ${e.message}`)
      if (keyHex) setLaunchProg((p) => ({ ...p, [keyHex]: { phase: 'error', error: e.message } }))
    } finally {
      setBusy(null)
    }
  }

  const readStandaloneWarningsSeen = async () => {
    if (standaloneWarningsSeen !== null) return standaloneWarningsSeen
    try {
      const settings = unwrapSettings(await rpc.request(C.CMD_USERDATA_GET_SETTINGS))
      const seen = normalizeStandaloneWarningsSeen(settings?.standaloneLaunchWarningsSeen)
      setStandaloneWarningsSeen(seen)
      return seen
    } catch {
      setStandaloneWarningsSeen({})
      return {}
    }
  }

  const requestPearLinkLaunch = async (overrideLink, app = null) => {
    const link = (typeof overrideLink === 'string' ? overrideLink : pearLink).trim()
    if (!link) return
    const launchApp = { ...(app || {}), link, name: app?.name || '' }
    const warning = standalonePrelaunchWarningFor(launchApp)
    if (warning) {
      const seen = await readStandaloneWarningsSeen()
      if (!seen[warning.key]) {
        setErr('')
        setLaunched('')
        setPendingStandaloneLaunch({
          app: { ...launchApp, id: launchApp.id || warning.key, name: launchApp.name || warning.appName },
          link,
          warning
        })
        return
      }
    }
    await launchPearLink(link)
  }

  const confirmStandaloneLaunch = async () => {
    const pending = pendingStandaloneLaunch
    if (!pending) return
    const warningKey = pending.warning?.key
    if (warningKey) {
      const next = { ...normalizeStandaloneWarningsSeen(standaloneWarningsSeen), [warningKey]: true }
      setStandaloneWarningsSeen(next)
      rpc.request(C.CMD_USERDATA_SET_SETTINGS, {
        updates: { standaloneLaunchWarningsSeen: next }
      }).catch(() => {})
    }
    setPendingStandaloneLaunch(null)
    await launchPearLink(pending.link)
  }

  // Featured apps in this list are a mix of `pear://` apps (spawn
  // their own runtime via CMD_LAUNCH_PEAR_LINK — Keet, PearPass,
  // HiveWorm) and `hyper://` sites that are hosted INSIDE PearBrowser
  // with a gated runtime API injection (anonGPT today; the spec calls
  // this an "injected version" — the app's bytes come from its own
  // Hyperdrive, and PearBrowser injects window.pear.<app>.* into the
  // page when a manifest gate passes. The app is NOT bundled into the
  // PearBrowser runtime; it's still its own Hyperdrive — we just host
  // it).
  //
  // Either way the user pressed "Launch" expecting a new app to open,
  // so the action is symmetric:
  //   pear:// / file://  →  CMD_LAUNCH_PEAR_LINK spawns a new window
  //   hyper:// / http:// →  open in a Browse tab, with the proxy's
  //                          per-drive shim injection applied
  // Both surface a "Launched <name>" toast so the user sees the same
  // feedback regardless of which underlying mechanism ran.
  const launchFeaturedApp = (app) => {
    const link = (app.link || '').trim()
    if (!link) return
    if (link.startsWith('pear://') || link.startsWith('file://')) {
      requestPearLinkLaunch(link, app)
      return
    }
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
      const res = await rpc.request(C.CMD_MYCATALOG_ADD_APP, { keyHex: myCatalog.keyHex, app: importAttributionForCatalogSave(app) }, 60000)
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
        setStandaloneWarningsSeen(normalizeStandaloneWarningsSeen(settings?.standaloneLaunchWarningsSeen))
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
        setStandaloneWarningsSeen({})
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
      // Apps page = runnable apps only. A `link` (launchable pear://|file:// app,
      // or a pear-request hypersite) means runnable; pure static sites (driveKey,
      // no link) live on the P2P Sites tab, not here.
      if (!a || !a.link) return false
      if (source !== 'all' && a.catalogKey !== source) return false
      if (category !== 'all' && !appCategories(a).includes(category)) return false
      if (!q) return true
      return catalogAppSearchText(a).includes(q)
    })
    // Collapse the same app across catalogues / duplicate rows.
    return dedupeApps(matched)
  }, [apps, query, category, source])

  // Total unique-app count (deduped, ignoring search/category) for the headers.
  const uniqueAppCount = useMemo(() => dedupeApps(apps.filter((a) => a && a.link)).length, [apps])

  const allMetadataKeys = useMemo(() => {
    const keys = []
    const seen = new Set()
    for (const app of filteredApps) {
      const key = appBundleKey(app)
      if (!key || seen.has(key)) continue
      seen.add(key)
      keys.push(key)
    }
    return keys
  }, [filteredApps])
  const allMetadataKeySig = allMetadataKeys.join('|')
  const visibleMetadataKeySig = visibleMetadataKeys.join('|')
  const detailMetadataKey = appBundleKey(detailApp)
  const metadataKeys = useMemo(() => {
    return selectDriveInfoKeysForPolling({
      allKeys: allMetadataKeys,
      visibleKeys: visibleMetadataKeys,
      detailKey: detailMetadataKey,
      viewportAware: metadataViewportAware
    })
  }, [allMetadataKeySig, visibleMetadataKeySig, detailMetadataKey, metadataViewportAware])
  const metadataKeySig = metadataKeys.join('|')

  useEffect(() => {
    if (!metadataKeys.length) { setDriveInfos({}); return }
    if (!(C && C.CMD_GET_DRIVE_INFOS)) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await rpc.request(C.CMD_GET_DRIVE_INFOS, { keys: metadataKeys }, 20000)
        if (cancelled) return
        const next = {}
        for (const row of (Array.isArray(res?.results) ? res.results : [])) {
          if (row && row.ok && row.keyHex) next[row.keyHex] = row
        }
        setDriveInfos(next)
      } catch {
        // Best-effort diagnostics: stale values are less jarring than clearing.
      }
    }
    load()
    const t = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [metadataKeySig, rpc, C])

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
                      <option value="standalone">standalone — opens in its own window (pear:// app)</option>
                      <option value="hypersite">hypersite — runs inline in a tab (pear-request / static)</option>
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
                <${CatalogSourceChips} app=${app} />
                <${AppTrustBadges} app=${app} driveKey=${appBundleKey(app)} permissions=${permissions} />
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
      <p className="subtitle">Launch any Pear app by link, or browse a HiveRelay catalog.</p>

      <h2>Featured</h2>
      <div className="app-grid">
        ${FEATURED_APPS.map((app) => html`
          <div className="app-card" key=${app.id}>
            <div className="app-icon app-icon-fallback" style=${{ background: app.gradient, color: '#0b0e14' }}>${app.initial}</div>
            <div className="app-info">
              <div className="app-name">${app.name}</div>
              <div className="app-desc">${app.tagline}</div>
              <div className="app-meta" title=${app.link}>${app.link.slice(0, 20)}…${app.link.slice(-6)}</div>
              <${AppTrustBadges} app=${app} driveKey=${appBundleKey(app)} permissions=${permissions} />
            </div>
            <div className="app-actions">
              ${(() => {
                const bk = appBundleKey(app)
                const prog = bk && launchProg[bk]
                if (prog && prog.phase !== 'done') {
                  return html`<${LaunchBar} prog=${prog} onRetry=${() => (app.type === 'hypersite' ? runInTab(app) : launchFeaturedApp(app))} />`
                }
                return app.type === 'hypersite'
                  ? html`<button key="run-featured" className="btn primary" onClick=${() => runInTab(app)} disabled=${busy === 'run-in-tab'} title="Run headless — the app's UI streams into a tab over a pipe">Run in tab</button>`
                  : html`<button key="open-featured" className="btn primary" onClick=${() => launchFeaturedApp(app)} disabled=${busy === 'pear-link'} title="Full Pear app — opens in its own window">Open</button>`
              })()}
            </div>
          </div>
        `)}
      </div>

      <h2>Launch a Pear app</h2>
      <div className="catalog-loader">
        <input
          type="text"
          placeholder=${'pear://<key> — opens in a new window'}
          value=${pearLink}
          onInput=${(e) => setPearLink(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && requestPearLinkLaunch()}
          spellCheck="false"
        />
        <button className="btn primary" onClick=${() => requestPearLinkLaunch()} disabled=${!pearLink || busy === 'pear-link'}>
          ${busy === 'pear-link' ? 'Launching…' : 'Launch'}
        </button>
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
              ${filteredApps.map((app) => {
                const metadataKey = appBundleKey(app)
                return html`
              <div className="app-card" key=${app.id} ref=${metadataCardRef(metadataKey)}>
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
                    ${app.type === 'hypersite' ? html`<span style=${{ marginLeft: '6px', opacity: 0.75 }}>· ${app.driveKey && !app.link ? 'opens in a tab' : 'runs in a tab'}</span>` : (app.link && !app.driveKey ? html`<span style=${{ marginLeft: '6px', opacity: 0.75 }}>· opens in a window</span>` : '')}
                  </div>
                  <${CatalogSourceChips} app=${app} />
                  <${AppMeta} rpc=${rpc} C=${C} app=${app} driveInfo=${C.CMD_GET_DRIVE_INFOS ? (driveInfos[appBundleKey(app)] || null) : undefined} />
                  <${AppTrustBadges} app=${app} driveInfo=${C.CMD_GET_DRIVE_INFOS ? (driveInfos[appBundleKey(app)] || null) : undefined} driveKey=${appBundleKey(app)} permissions=${permissions} />
                </div>
                <div className="app-actions">
                  ${(() => {
                    const bk = appBundleKey(app)
                    const prog = bk && launchProg[bk]
                    if (prog && prog.phase !== 'done') {
                      return html`<${LaunchBar} prog=${prog} onRetry=${() => (app.type === 'hypersite' ? runInTab(app) : launchFeaturedApp(app))} />`
                    }
                    return html`
                      ${app.driveKey && /^[0-9a-f]{64}$/i.test(app.driveKey)
                        ? html`<button key="open-page" className="btn subtle" onClick=${() => openSite(app)} title="Open this app's P2P page in a tab">Open page</button>`
                        : ''}
                      ${app.type === 'hypersite'
                        ? html`<button key="run-in-tab" className="btn primary" onClick=${() => runInTab(app)} disabled=${busy === 'run-in-tab'} title="Run headless — the app's UI streams into a tab">Run app</button>`
                        : html`<button key="run-window" className="btn primary" onClick=${() => launchFeaturedApp(app)} disabled=${busy === 'pear-link'} title="Open the app in its own window">Run app</button>`}
                      ${canEditMyCatalog && app.catalogKey !== myCatalog.keyHex && !inMyCatalog([app.id, app.driveKey, app.link]) && html`
                        <button key="add-catalog" className="btn subtle" title="Add to my catalog" onClick=${() => addToMyCatalog(app)} disabled=${busy === `addcat:${app.id || app.driveKey || app.link}`}>+ Catalog</button>
                      `}
                    `
                  })()}
                </div>
              </div>
            `})}
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
                  <${CatalogSourceChips} app=${app} />
                  <${AppTrustBadges} app=${app} driveKey=${appBundleKey(app)} permissions=${permissions} />
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

      ${pendingStandaloneLaunch && html`<${StandalonePrelaunchWarning}
        pending=${pendingStandaloneLaunch}
        onCancel=${() => setPendingStandaloneLaunch(null)}
        onConfirm=${confirmStandaloneLaunch}
        busy=${busy}
      />`}

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
                <${CatalogSourceChips} app=${detailApp} />
              </div>
            </div>
            <p style=${{ color: '#c9d1d9', lineHeight: 1.6, margin: '0 0 14px' }}>${detailApp.description || 'No description.'}</p>
            <${AppTrustDetail}
              app=${detailApp}
              driveInfo=${C.CMD_GET_DRIVE_INFOS ? (driveInfos[appBundleKey(detailApp)] || null) : undefined}
              driveKey=${appBundleKey(detailApp)}
              permissions=${permissions}
            />
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
              ${detailApp.importedFrom && detailApp.importedFrom.catalogName ? html`<div><strong style=${{ color: '#c9d1d9' }}>Imported from:</strong> ${detailApp.importedFrom.catalogName}${detailApp.importedFrom.verification ? ` · ${detailApp.importedFrom.verification}` : ''}</div>` : ''}
              ${detailApp.importedFrom && detailApp.importedFrom.catalogKey ? html`<div style=${{ wordBreak: 'break-all' }}><strong style=${{ color: '#c9d1d9' }}>Original catalog key:</strong> ${detailApp.importedFrom.catalogKey}</div>` : ''}
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
              ${canEditMyCatalog && detailApp.catalogKey !== myCatalog.keyHex && !inMyCatalog([detailApp.id, detailApp.driveKey, detailApp.link]) && html`
                <button key="detail-add-catalog" className="btn subtle" onClick=${() => { addToMyCatalog(detailApp); setDetailApp(null) }} disabled=${busy === `addcat:${detailApp.id || detailApp.driveKey || detailApp.link}`}>+ Catalog</button>
              `}
              <button key="detail-close" className="btn" onClick=${() => setDetailApp(null)}>Close</button>
            </div>
          </div>
        </div>
      `}
    </div>
  `
}
