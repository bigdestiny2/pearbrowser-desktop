import { useEffect, useMemo, useState } from 'react'
import { html } from 'htm/react'
import { SCOPE_LABELS } from './consent-modals.js'
import { DeviceSync } from './device-sync.js'
import { formatBytes, normalizeNameTarget, shortKey } from '../lib/keys.js'
import { normalizeLoginGrant } from '../lib/permissions.js'
import {
  bootTimelineRows,
  bootTimelineSummary,
  fetchTelemetryPercent,
  startupBudgetRows,
  startupBudgetSummary,
  startupDeferralRows,
  startupDeferralSummary,
  storageUsageDetail,
  storageUsageLabel,
  storageSampleProgressLabel
} from '../lib/performance-diagnostics.js'
import { unwrapSettings } from '../lib/settings.js'

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

  useEffect(() => {
    if (!config.relays.length) return
    let cancelled = false
    const next = {}
    for (const url of config.relays) {
      next[url] = capabilities[url] || null
    }
    setCapabilities(next)

    config.relays.forEach(async (url) => {
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 6000)
        const res = await fetch(url.replace(/\/+$/, '') + '/.well-known/hiverelay.json', { signal: ctrl.signal })
        clearTimeout(timer)
        if (cancelled) return
        if (!res.ok) {
          setCapabilities((p) => ({ ...p, [url]: { ok: false, error: 'HTTP ' + res.status } }))
          return
        }
        const doc = await res.json()
        setCapabilities((p) => ({ ...p, [url]: { ok: true, doc } }))
      } catch (e) {
        if (cancelled) return
        setCapabilities((p) => ({ ...p, [url]: { ok: false, error: e.name === 'AbortError' ? 'timeout' : (e.message || 'unreachable') } }))
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

function NostrFeedSection ({ rpc, C }) {
  const [events, setEvents] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [federated, setFederated] = useState(false)
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
    if (!t) { setErr('Enter a 64-hex drive key or pear://, hyper://, file:// link.'); return }
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
            <div className="settings-subtle">A memorable name → a drive key or app link. First claim wins; confusable look-alikes are rejected. Re-submitting a name you own updates its target.</div>
          </div>
        </div>
        <div className="tp-row">
          <input className="profile-input" placeholder="name (e.g. alice)" value=${name} onInput=${(e) => setName(e.target.value)} />
          <input className="profile-input" placeholder="64-hex key, pear://, hyper://, file://" value=${target} onInput=${(e) => setTarget(e.target.value)} />
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

function ExperimentalSection ({ rpc, C, onAutobeeChange, onDeviceSyncChange }) {
  const [naming, setNaming] = useState(false)
  const [autobee, setAutobee] = useState(false)
  const [deviceSync, setDeviceSync] = useState(false)
  const [busy, setBusy] = useState(null)
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
          <div className="settings-label">Device sync (encrypted browser state)</div>
          <div className="settings-subtle">Sync bookmarks and open-tab snapshots across your own devices, encrypted end-to-end with no server or account. Once enabled, pair devices in the <strong>Device sync</strong> section below. Experimental — your synced data is readable only on devices that hold the pairing invite.</div>
        </div>
        <label className="login-scope${deviceSync ? ' on' : ''}">
          <input type="checkbox" checked=${deviceSync} disabled=${busy === 'experimentalDeviceSync'}
                 onChange=${() => toggle('experimentalDeviceSync', !deviceSync, setDeviceSync, onDeviceSyncChange)} />
        </label>
      </div>
    </div>
  `
}

function FetchTelemetrySection ({ telemetry }) {
  if (!telemetry || !Number.isFinite(telemetry.total)) {
    return html`
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Fetch mix</div>
            <div className="settings-subtle">No proxy fetches recorded yet.</div>
          </div>
        </div>
      </div>
    `
  }
  const sources = telemetry.sources || {}
  const recent = Array.isArray(telemetry.recent) ? telemetry.recent.slice(0, 5) : []
  const cacheTotal = (telemetry.cacheHits || 0) + (telemetry.cacheMisses || 0)
  return html`
    <div className="settings-card">
      <div className="fetch-telemetry-grid">
        <div>
          <div className="settings-label">Fetches</div>
          <div className="fetch-telemetry-value">${telemetry.total || 0}</div>
          <div className="settings-subtle">${formatBytes(telemetry.bytes || 0)} served</div>
        </div>
        <div>
          <div className="settings-label">Cache hit rate</div>
          <div className="fetch-telemetry-value">${fetchTelemetryPercent(telemetry.cacheHits || 0, cacheTotal)}</div>
          <div className="settings-subtle">${telemetry.cacheHits || 0} hit · ${telemetry.cacheMisses || 0} miss</div>
        </div>
        <div>
          <div className="settings-label">P2P / relay</div>
          <div className="fetch-telemetry-value">${sources.p2p || 0} / ${sources.relay || 0}</div>
          <div className="settings-subtle">${telemetry.relayFallbacks || 0} relay fallback contact${telemetry.relayFallbacks === 1 ? '' : 's'}</div>
        </div>
        <div>
          <div className="settings-label">Latency</div>
          <div className="fetch-telemetry-value">${telemetry.avgFirstByteMs || 0} ms</div>
          <div className="settings-subtle">avg first byte · ${telemetry.avgMs || 0} ms total</div>
        </div>
      </div>
      ${recent.length > 0 && html`
        <div className="fetch-telemetry-recent">
          ${recent.map((row, i) => html`
            <div className="fetch-telemetry-row" key=${i}>
              <span className=${`src-badge ${row.source === 'relay' ? 'followed' : row.source === 'error' ? 'other' : 'self'}`}>${row.source}${row.cache === 'hit' ? ' cache' : ''}</span>
              <span>${row.path || '/'}</span>
              <span>${formatBytes(row.bytes || 0)}</span>
              <span>${row.firstByteMs || 0} ms</span>
            </div>
          `)}
        </div>
      `}
    </div>
  `
}

function BootTimelineSection ({ timeline, log }) {
  const summary = bootTimelineSummary(timeline)
  const rows = bootTimelineRows(timeline, log, { limit: 12 })
  return html`
    <div className="settings-card">
      <div className="fetch-telemetry-grid">
        <div>
          <div className="settings-label">Boot time</div>
          <div className="fetch-telemetry-value">${summary.elapsed}</div>
          <div className="settings-subtle">${summary.ready ? 'ready' : 'starting'} · ${summary.count} event${summary.count === 1 ? '' : 's'}</div>
        </div>
        <div>
          <div className="settings-label">Latest stage</div>
          <div className="fetch-telemetry-value boot-stage-value">${summary.latestStage}</div>
          <div className="settings-subtle">${summary.latestMessage || 'Waiting for boot progress'}</div>
        </div>
      </div>
      ${rows.length > 0
        ? html`
          <div className="boot-timeline">
            ${rows.map((row, i) => html`
              <div className=${`boot-timeline-row ${row.state || ''}`} key=${i}>
                <span className="boot-timeline-time">${row.elapsed}</span>
                <span className="boot-timeline-delta">${row.delta}</span>
                <span className="boot-timeline-stage">${row.stage}</span>
                <span className="boot-timeline-message" title=${row.error || row.message}>${row.error || row.message}</span>
              </div>
            `)}
          </div>
        `
        : html`<div className="settings-subtle">No boot progress captured yet.</div>`}
    </div>
  `
}

function StartupBudgetSection ({ budget, deferral }) {
  const summary = startupBudgetSummary(budget)
  const budgetRows = startupBudgetRows(budget, { limit: 8 })
  const deferralSummary = startupDeferralSummary(deferral)
  const deferralRows = startupDeferralRows(deferral, { limit: 10 })
  return html`
    <div className="settings-card">
      <div className="fetch-telemetry-grid">
        <div>
          <div className="settings-label">Startup budget</div>
          <div className="fetch-telemetry-value">${summary.elapsed}</div>
          <div className="settings-subtle">${summary.label} · target ${summary.target}</div>
        </div>
        <div>
          <div className="settings-label">Deferred surfaces</div>
          <div className="fetch-telemetry-value">${deferralSummary.deferred}</div>
          <div className="settings-subtle">${deferralSummary.label}</div>
        </div>
      </div>
      ${budgetRows.length > 0 && html`
        <div className="boot-timeline">
          ${budgetRows.map((row) => html`
            <div className=${`boot-timeline-row ${row.state || ''}`} key=${row.stage}>
              <span className="boot-timeline-time">${row.elapsed}</span>
              <span className="boot-timeline-delta">${row.budget}</span>
              <span className="boot-timeline-stage">${row.label}</span>
              <span className="boot-timeline-message">${row.delta}</span>
            </div>
          `)}
        </div>
      `}
      ${deferralRows.length > 0 && html`
        <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          ${deferralRows.map((row) => html`
            <span className=${`src-badge ${row.badge}`} key=${row.key} title=${row.label}>
              ${row.label}: ${row.state}
            </span>
          `)}
        </div>
      `}
    </div>
  `
}

export function Settings ({ rpc, C, status = {}, storagePath, log = [], currentTabs = [], activeId = null, onOpenTab }) {
  const [identity, setIdentity] = useState(null)
  const [seedPhrase, setSeedPhrase] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(null)
  const [showRestore, setShowRestore] = useState(false)
  const [restoreInput, setRestoreInput] = useState('')
  const [restoreNotice, setRestoreNotice] = useState('')
  const [deviceSync, setDeviceSync] = useState(false)
  const CMD_GET_IDENTITY = C?.CMD_GET_IDENTITY ?? 31
  const CMD_IDENTITY_EXPORT_PHRASE = C?.CMD_IDENTITY_EXPORT_PHRASE ?? 70
  const CMD_IDENTITY_IMPORT_PHRASE = C?.CMD_IDENTITY_IMPORT_PHRASE ?? 71
  const CMD_IDENTITY_VALIDATE_PHRASE = C?.CMD_IDENTITY_VALIDATE_PHRASE ?? 73
  const CMD_CLEAR_CACHE = C?.CMD_CLEAR_CACHE ?? 30
  const CMD_RESET_APP = C?.CMD_RESET_APP ?? 29

  const refreshIdentity = () =>
    rpc.request(CMD_GET_IDENTITY).then(setIdentity).catch((e) => setErr(e.message))

  useEffect(() => { refreshIdentity() }, [])

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
      <p className="subtitle">Identity, infrastructure, and diagnostics for your peer-to-peer browser.</p>
      ${err && html`<div className="apps-error">${err}</div>`}

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
      <p className="subtitle">Your identity lives on this machine. To use the same identity on another computer or after a wipe, write down your 12-word backup phrase. Anyone with the phrase can sign in as you — store it like a password.</p>
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

      <h2>Profile</h2>
      <p className="subtitle">What apps see when you grant a sign-in. Each field is opt-in — leave blank to share nothing.</p>
      <${ProfileSection} rpc=${rpc} C=${C} />

      <h2>Permission Center</h2>
      <p className="subtitle">Persistent app grants grouped by drive: sign-in, profile fields, contacts, and arbitrary swarm topics.</p>
      <${PermissionCenterSection} rpc=${rpc} C=${C} />

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

      <h2>Startup timeline</h2>
      <p className="subtitle">Backend stage timing retained from the current boot.</p>
      <${BootTimelineSection} timeline=${status.bootTimeline} log=${log} />

      <h2>Startup budget</h2>
      <${StartupBudgetSection} budget=${status.bootBudget} deferral=${status.startupDeferral} />

      <h2>Fetch telemetry</h2>
      <p className="subtitle">Recent proxy fetch timing, source, cache, and relay fallback mix.</p>
      <${FetchTelemetrySection} telemetry=${status.fetchTelemetry} />

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
            <div className="settings-subtle">${storageUsageLabel(status)}</div>
            <div className="settings-subtle">${storageUsageDetail(status)}</div>
            ${storageSampleProgressLabel(status) && html`<div className="settings-subtle">${storageSampleProgressLabel(status)}</div>`}
          </div>
          <button className="btn subtle" onClick=${clearCache} disabled=${busy === 'cache'}>Clear cache</button>
        </div>
      </div>

      <h2>Experimental</h2>
      <p className="subtitle">Early features behind a flag. They may change, break, or be removed.</p>
      <${ExperimentalSection} rpc=${rpc} C=${C} onDeviceSyncChange=${setDeviceSync} />

      ${deviceSync && html`<div className="settings-section-device-sync">
        <h2>Device sync <span className="settings-subtle">(experimental)</span></h2>
        <p className="subtitle">Your bookmarks and open tabs, encrypted and synced across your own devices — no server, no account. Set up sync here, then pair your other devices with the invite.</p>
        <${DeviceSync} rpc=${rpc} C=${C} currentTabs=${currentTabs} activeId=${activeId} onOpenTab=${onOpenTab} />
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
