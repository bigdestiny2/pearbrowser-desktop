// Browser-state (multi-device sync) operation schema + validation (PURE).
//
// Rollout Phase 4 (docs/AUTOBEE-RESEARCH.md): sync the user's OWN browser
// state across their devices over an ENCRYPTED Autobee. It covers bookmarks,
// per-device browse-session snapshots, bounded browsing history, contacts,
// app grants, allowlisted settings, and profile fields. CommonJS so
// Bare can require() it and Node can default-import it for tests.
//
// Constraints honored ("Design Constraints"):
//   - schema-versioned (every op carries `v`)
//   - no wall-clock used for conflict resolution (Autobase linearization is
//     the order; `addedAt` is informational metadata only)
//   - malicious inputs rejected BEFORE append (size + prototype pollution)
//   - private data → the transport is encrypted (see browser-state-sync.cjs)

const SCHEMA_VERSION = 1
const OP_ADD = 'bookmark.add'
const OP_REMOVE = 'bookmark.remove'
const OP_SESSION_PUT = 'session.put'
const OP_HISTORY_PUT = 'history.put'
const OP_CONTACTS_PUT = 'contacts.put'
const OP_APP_GRANTS_PUT = 'appGrants.put'
const OP_SETTINGS_PUT = 'settings.put'
const OP_PROFILE_PUT = 'profile.put'
const OP_COMPACT = 'state.compact'
const OP_ADD_WRITER = 'writer.add'

const MAX_OP_BYTES = 8 * 1024
const MAX_SESSION_OP_BYTES = 64 * 1024
const MAX_HISTORY_OP_BYTES = 512 * 1024
const MAX_CONTACTS_OP_BYTES = 2 * 1024 * 1024
const MAX_APP_GRANTS_OP_BYTES = 2 * 1024 * 1024
const MAX_SETTINGS_OP_BYTES = 16 * 1024
const MAX_PROFILE_OP_BYTES = 16 * 1024
const MAX_COMPACT_OP_BYTES = 8 * 1024 * 1024
const SYNC_COMPACT_RECOMMENDED_OPS = 512
const SYNC_COMPACT_WARNING_OPS = 2048
const MAX_URL = 2048
const MAX_TITLE = 1024
const MAX_CONTACT_NAME = 128
const MAX_CONTACT_AVATAR = 1024
const MAX_CONTACT_NOTE = 512
const MAX_CONTACT_TAG = 64
const MAX_CONTACT_TAGS = 16
const MAX_CONTACT_SIGNATURE = 512
const MAX_PROFILE_FIELD = 2048
const MAX_DEVICE_LABEL = 120
const MAX_SYNC_SESSIONS = 32
const MAX_SYNC_TABS = 40
const MAX_TAB_HISTORY = 50
const MAX_SYNC_HISTORY = 200
const MAX_SYNC_CONTACTS = 1000
const MAX_SYNC_LOGIN_GRANTS = 1000
const MAX_SYNC_SWARM_GRANTS = 2000
const MAX_RECENT_CATALOGS = 12
const MAX_WARNING_KEYS = 80
const MAX_SETTING_STRING = 220

const SYNC_SETTING_KEYS = [
  'experimentalNaming',
  'experimentalAutobeeCatalogs',
  'myCatalogKey',
  'lastCatalogKey',
  'recentCatalogs',
  'defaultCatalogSeeded',
  'communityCatalogSeeded',
  'onboardingDone',
  'standaloneLaunchWarningsSeen'
]
const SYNC_SETTING_KEY_SET = new Set(SYNC_SETTING_KEYS)

const SYNC_PROFILE_FIELDS = [
  'displayName',
  'avatar',
  'bio',
  'email',
  'pronouns',
  'location',
  'website'
]
const SYNC_PROFILE_FIELD_SET = new Set(SYNC_PROFILE_FIELDS)
const SYNC_LOCAL_ONLY_SETTING_KEYS = [
  'syncKey',
  'syncEncKey',
  'syncStoreName',
  'experimentalDeviceSync',
  'relayManageKey'
]
const SYNC_SESSION_KEYS = new Set(['deviceId', 'label', 'tabs', 'activeUrl', 'updatedAt'])
const SYNC_TAB_KEYS = new Set(['url', 'displayUrl', 'title', 'history', 'histIdx', 'pinned', 'active'])
const SYNC_HISTORY_ENTRY_KEYS = new Set(['url', 'title', 'visitedAt'])
const SYNC_CONTACT_ENTRY_KEYS = new Set([
  'pubkey',
  'displayName',
  'avatar',
  'tags',
  'notes',
  'signature',
  'verifiedAt',
  'bindingKey',
  'addedAt',
  'updatedAt'
])
const SYNC_LOGIN_GRANT_KEYS = new Set(['driveKey', 'driveKeyHex', 'scopes', 'appName', 'grantedAt', 'expiresAt'])
const SYNC_SWARM_GRANT_KEYS = new Set(['driveKey', 'driveKeyHex', 'topicHex', 'protocol', 'appName', 'grantedAt', 'lastUsedAt'])
const SYNC_LOGIN_SCOPES = [
  'profile:read',
  'profile:name',
  'profile:contact',
  'profile:avatar',
  'profile:email',
  'profile:website',
  'contacts:read'
]
const SYNC_LOGIN_SCOPE_SET = new Set(SYNC_LOGIN_SCOPES)
const SYNC_COMPACT_STATE_KEYS = new Set(['bookmarks', 'sessions', 'history', 'contacts', 'appGrants', 'settings', 'profile'])

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

function clampStr (value, max) {
  if (typeof value !== 'string') return ''
  return value.length > max ? value.slice(0, max) : value
}

function hasUnsafeKey (value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 6) return false
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) return true
    if (hasUnsafeKey(value[key], depth + 1)) return true
  }
  return false
}

function opByteLength (op) {
  try { return Buffer.byteLength(JSON.stringify(op)) } catch { return Infinity }
}

function maxBytesForOp (op) {
  if (op && op.type === OP_SESSION_PUT) return MAX_SESSION_OP_BYTES
  if (op && op.type === OP_HISTORY_PUT) return MAX_HISTORY_OP_BYTES
  if (op && op.type === OP_CONTACTS_PUT) return MAX_CONTACTS_OP_BYTES
  if (op && op.type === OP_APP_GRANTS_PUT) return MAX_APP_GRANTS_OP_BYTES
  if (op && op.type === OP_SETTINGS_PUT) return MAX_SETTINGS_OP_BYTES
  if (op && op.type === OP_PROFILE_PUT) return MAX_PROFILE_OP_BYTES
  if (op && op.type === OP_COMPACT) return MAX_COMPACT_OP_BYTES
  return MAX_OP_BYTES
}

// Whitelist + clamp a bookmark record. `addedAt` is kept only if a finite
// number (informational; never used to resolve conflicts).
function sanitizeBookmark (bm) {
  const src = (bm && typeof bm === 'object') ? bm : {}
  const out = { url: clampStr(src.url, MAX_URL).trim(), title: clampStr(src.title, MAX_TITLE) }
  if (Number.isFinite(src.addedAt)) out.addedAt = src.addedAt
  return out
}

function sanitizeBookmarks (bookmarks) {
  if (!Array.isArray(bookmarks)) return []
  const map = new Map()
  for (const bookmark of bookmarks) {
    const clean = sanitizeBookmark(bookmark)
    if (!clean.url) continue
    map.set(clean.url, clean)
  }
  return [...map.values()]
}

function sanitizeTabSnapshot (tab) {
  const src = (tab && typeof tab === 'object') ? tab : {}
  const url = clampStr(src.url || src.displayUrl, MAX_URL).trim()
  const displayUrl = clampStr(src.displayUrl || url, MAX_URL).trim()
  const history = Array.isArray(src.history)
    ? src.history.map((entry) => clampStr(entry, MAX_URL).trim()).filter(Boolean).slice(-MAX_TAB_HISTORY)
    : (url ? [url] : [])
  const histIdx = Number.isInteger(src.histIdx)
    ? Math.max(0, Math.min(src.histIdx, Math.max(0, history.length - 1)))
    : (history.length ? history.length - 1 : -1)
  const activeUrl = history[histIdx] || url || displayUrl
  if (!activeUrl && !displayUrl) return null
  return {
    url: activeUrl || displayUrl,
    displayUrl: displayUrl || activeUrl,
    title: clampStr(src.title || activeUrl || 'New tab', MAX_TITLE),
    history,
    histIdx,
    pinned: !!src.pinned,
    active: !!src.active
  }
}

function sanitizeSession (session) {
  const src = (session && typeof session === 'object') ? session : {}
  const deviceId = clampStr(src.deviceId, 64).trim().toLowerCase()
  const label = clampStr(src.label || 'This device', MAX_DEVICE_LABEL).trim() || 'This device'
  const tabs = Array.isArray(src.tabs)
    ? src.tabs.map(sanitizeTabSnapshot).filter(Boolean).slice(0, MAX_SYNC_TABS)
    : []
  const updatedAt = Number.isFinite(src.updatedAt) ? src.updatedAt : undefined
  const activeUrl = clampStr(src.activeUrl || (tabs.find((tab) => tab.active)?.url) || tabs[0]?.url || '', MAX_URL).trim()
  const out = { deviceId, label, tabs, activeUrl }
  if (Number.isFinite(updatedAt)) out.updatedAt = updatedAt
  return out
}

function sanitizeSessions (sessions) {
  if (!Array.isArray(sessions)) return []
  const seen = new Set()
  const out = []
  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i]
    const clean = sanitizeSession(session)
    if (!/^[0-9a-f]{64}$/.test(clean.deviceId) || !clean.tabs.length || seen.has(clean.deviceId)) continue
    seen.add(clean.deviceId)
    out.push(clean)
    if (out.length >= MAX_SYNC_SESSIONS) break
  }
  return out.reverse()
}

function sanitizeHistoryEntry (entry) {
  const src = (entry && typeof entry === 'object') ? entry : {}
  const url = clampStr(String(src.url || ''), MAX_URL).trim()
  if (!url) return null
  const out = {
    url,
    title: clampStr(String(src.title || ''), MAX_TITLE)
  }
  if (Number.isFinite(src.visitedAt)) {
    out.visitedAt = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(src.visitedAt)))
  }
  return out
}

function sanitizeHistory (history) {
  if (!Array.isArray(history)) return []
  const out = []
  const seen = new Set()
  for (const entry of history) {
    const clean = sanitizeHistoryEntry(entry)
    if (!clean || seen.has(clean.url)) continue
    seen.add(clean.url)
    out.push(clean)
    if (out.length >= MAX_SYNC_HISTORY) break
  }
  return out
}

function sanitizeContact (contact) {
  const src = (contact && typeof contact === 'object') ? contact : {}
  const pubkey = clampStr(String(src.pubkey || ''), 64).trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(pubkey)) return null
  const out = {
    pubkey,
    displayName: clampStr(String(src.displayName || ''), MAX_CONTACT_NAME).trim()
  }
  const avatar = clampStr(String(src.avatar || ''), MAX_CONTACT_AVATAR).trim()
  if (avatar) out.avatar = avatar
  const tags = Array.isArray(src.tags)
    ? src.tags.map((tag) => clampStr(String(tag || ''), MAX_CONTACT_TAG).trim()).filter(Boolean).slice(0, MAX_CONTACT_TAGS)
    : []
  if (tags.length) out.tags = tags
  const notes = clampStr(String(src.notes || ''), MAX_CONTACT_NOTE).trim()
  if (notes) out.notes = notes
  const signature = clampStr(String(src.signature || ''), MAX_CONTACT_SIGNATURE).trim().toLowerCase()
  if (signature && /^[0-9a-f]+$/.test(signature)) out.signature = signature
  const bindingKey = clampStr(String(src.bindingKey || ''), 64).trim().toLowerCase()
  if (out.signature && /^[0-9a-f]{64}$/.test(bindingKey)) out.bindingKey = bindingKey
  if (out.signature && Number.isFinite(src.verifiedAt)) out.verifiedAt = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(src.verifiedAt)))
  if (Number.isFinite(src.addedAt)) out.addedAt = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(src.addedAt)))
  if (Number.isFinite(src.updatedAt)) out.updatedAt = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(src.updatedAt)))
  return out
}

function sanitizeContacts (contacts) {
  if (!Array.isArray(contacts)) return []
  const out = []
  const seen = new Set()
  for (const contact of contacts) {
    const clean = sanitizeContact(contact)
    if (!clean || seen.has(clean.pubkey)) continue
    seen.add(clean.pubkey)
    out.push(clean)
    if (out.length >= MAX_SYNC_CONTACTS) break
  }
  return out
}

function sanitizeTime (value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))) : undefined
}

function sanitizeLoginGrant (grant) {
  const src = (grant && typeof grant === 'object') ? grant : {}
  const driveKeyHex = clampStr(String(src.driveKeyHex || src.driveKey || ''), 64).trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(driveKeyHex)) return null
  const scopes = []
  const seen = new Set()
  for (const raw of Array.isArray(src.scopes) ? src.scopes : []) {
    const scope = String(raw || '').trim()
    if (!SYNC_LOGIN_SCOPE_SET.has(scope) || seen.has(scope)) continue
    seen.add(scope)
    scopes.push(scope)
  }
  const out = { driveKeyHex, scopes }
  const appName = clampStr(String(src.appName || ''), MAX_CONTACT_NAME).trim()
  if (appName) out.appName = appName
  const grantedAt = sanitizeTime(src.grantedAt)
  const expiresAt = sanitizeTime(src.expiresAt)
  if (grantedAt !== undefined) out.grantedAt = grantedAt
  if (expiresAt !== undefined) out.expiresAt = expiresAt
  return out
}

function sanitizeSwarmGrant (grant) {
  const src = (grant && typeof grant === 'object') ? grant : {}
  const driveKey = clampStr(String(src.driveKey || src.driveKeyHex || ''), 64).trim().toLowerCase()
  const topicHex = clampStr(String(src.topicHex || ''), 64).trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(driveKey) || !/^[0-9a-f]{64}$/.test(topicHex)) return null
  const out = { driveKey, topicHex }
  const protocol = clampStr(String(src.protocol || ''), 120).trim()
  const appName = clampStr(String(src.appName || ''), MAX_CONTACT_NAME).trim()
  const grantedAt = sanitizeTime(src.grantedAt)
  const lastUsedAt = sanitizeTime(src.lastUsedAt)
  if (protocol) out.protocol = protocol
  if (appName) out.appName = appName
  if (grantedAt !== undefined) out.grantedAt = grantedAt
  if (lastUsedAt !== undefined) out.lastUsedAt = lastUsedAt
  return out
}

function sanitizeAppGrants (grants) {
  const src = (grants && typeof grants === 'object' && !Array.isArray(grants)) ? grants : {}
  const login = []
  const loginSeen = new Set()
  for (const grant of Array.isArray(src.login) ? src.login : []) {
    const clean = sanitizeLoginGrant(grant)
    if (!clean || loginSeen.has(clean.driveKeyHex)) continue
    loginSeen.add(clean.driveKeyHex)
    login.push(clean)
    if (login.length >= MAX_SYNC_LOGIN_GRANTS) break
  }
  const swarm = []
  const swarmSeen = new Set()
  for (const grant of Array.isArray(src.swarm) ? src.swarm : []) {
    const clean = sanitizeSwarmGrant(grant)
    if (!clean) continue
    const key = clean.driveKey + '!' + clean.topicHex
    if (swarmSeen.has(key)) continue
    swarmSeen.add(key)
    swarm.push(clean)
    if (swarm.length >= MAX_SYNC_SWARM_GRANTS) break
  }
  return { login, swarm }
}

function sanitizeStringList (value, maxItems = MAX_RECENT_CATALOGS) {
  if (!Array.isArray(value)) return []
  const out = []
  const seen = new Set()
  for (const raw of value) {
    const s = clampStr(String(raw || ''), MAX_SETTING_STRING).trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
    if (out.length >= maxItems) break
  }
  return out
}

function sanitizeWarningsSeen (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out = {}
  let count = 0
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = clampStr(String(rawKey || ''), MAX_SETTING_STRING).trim()
    if (!key || rawValue !== true) continue
    out[key] = true
    if (++count >= MAX_WARNING_KEYS) break
  }
  return out
}

function sanitizeSettings (settings) {
  const src = (settings && typeof settings === 'object') ? settings : {}
  const out = {}
  for (const key of SYNC_SETTING_KEYS) {
    if (!(key in src)) continue
    const value = src[key]
    if (key === 'experimentalNaming' || key === 'experimentalAutobeeCatalogs' ||
        key === 'defaultCatalogSeeded' || key === 'communityCatalogSeeded' ||
        key === 'onboardingDone') {
      out[key] = value === true
      continue
    }
    if (key === 'recentCatalogs') {
      const list = sanitizeStringList(value)
      if (list.length) out[key] = list
      continue
    }
    if (key === 'standaloneLaunchWarningsSeen') {
      const warnings = sanitizeWarningsSeen(value)
      if (Object.keys(warnings).length) out[key] = warnings
      continue
    }
    const s = clampStr(String(value || ''), MAX_SETTING_STRING).trim()
    if (s) out[key] = s
  }
  return out
}

function sanitizeProfile (profile) {
  const src = (profile && typeof profile === 'object') ? profile : {}
  const out = {}
  for (const key of SYNC_PROFILE_FIELDS) {
    const value = clampStr(String(src[key] || ''), MAX_PROFILE_FIELD).trim()
    if (value) out[key] = value
  }
  return out
}

function sanitizeStateSnapshot (state = {}) {
  const src = (state && typeof state === 'object' && !Array.isArray(state)) ? state : {}
  return {
    bookmarks: sanitizeBookmarks(src.bookmarks),
    sessions: sanitizeSessions(src.sessions),
    history: sanitizeHistory(src.history),
    contacts: sanitizeContacts(src.contacts),
    appGrants: sanitizeAppGrants(src.appGrants),
    settings: sanitizeSettings(src.settings),
    profile: sanitizeProfile(src.profile)
  }
}

function validateCompactStateSnapshot (state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return { ok: false, reason: 'compact-needs-state' }
  for (const key of Object.keys(state)) {
    if (!SYNC_COMPACT_STATE_KEYS.has(key)) return { ok: false, reason: 'compact-unknown-field' }
  }
  if ('bookmarks' in state) {
    if (!Array.isArray(state.bookmarks)) return { ok: false, reason: 'compact-bookmarks-needs-list' }
    for (const bookmark of state.bookmarks) {
      if (!bookmark || typeof bookmark !== 'object' || Array.isArray(bookmark)) return { ok: false, reason: 'compact-bookmark-needs-data' }
      for (const key of Object.keys(bookmark)) {
        if (key !== 'url' && key !== 'title' && key !== 'addedAt') return { ok: false, reason: 'compact-bookmark-unknown-field' }
      }
      if (!String(bookmark.url || '').trim()) return { ok: false, reason: 'compact-bookmark-needs-url' }
      if ('addedAt' in bookmark && !Number.isFinite(bookmark.addedAt)) return { ok: false, reason: 'compact-bookmark-bad-added-at' }
    }
  }
  for (const session of Array.isArray(state.sessions) ? state.sessions : []) {
    const op = putSessionOp(session)
    const verdict = validateOp(op)
    if (!verdict.ok) return { ok: false, reason: verdict.reason || 'compact-bad-session' }
  }
  if ('history' in state) {
    const verdict = validateOp({ v: SCHEMA_VERSION, type: OP_HISTORY_PUT, history: state.history })
    if (!verdict.ok) return { ok: false, reason: verdict.reason || 'compact-bad-history' }
  }
  if ('contacts' in state) {
    const verdict = validateOp({ v: SCHEMA_VERSION, type: OP_CONTACTS_PUT, contacts: state.contacts })
    if (!verdict.ok) return { ok: false, reason: verdict.reason || 'compact-bad-contacts' }
  }
  if ('appGrants' in state) {
    const verdict = validateOp({ v: SCHEMA_VERSION, type: OP_APP_GRANTS_PUT, grants: state.appGrants })
    if (!verdict.ok) return { ok: false, reason: verdict.reason || 'compact-bad-app-grants' }
  }
  if ('settings' in state) {
    const verdict = validateOp({ v: SCHEMA_VERSION, type: OP_SETTINGS_PUT, settings: state.settings })
    if (!verdict.ok) return { ok: false, reason: verdict.reason || 'compact-bad-settings' }
  }
  if ('profile' in state) {
    const verdict = validateOp({ v: SCHEMA_VERSION, type: OP_PROFILE_PUT, profile: state.profile })
    if (!verdict.ok) return { ok: false, reason: verdict.reason || 'compact-bad-profile' }
  }
  return { ok: true }
}

// --- Op constructors ------------------------------------------------------

function addBookmarkOp (bm) {
  const clean = sanitizeBookmark(bm)
  return { v: SCHEMA_VERSION, type: OP_ADD, url: clean.url, bookmark: clean }
}

function removeBookmarkOp (url) {
  return { v: SCHEMA_VERSION, type: OP_REMOVE, url: clampStr(String(url || ''), MAX_URL).trim() }
}

function putSessionOp (session) {
  const clean = sanitizeSession(session)
  return { v: SCHEMA_VERSION, type: OP_SESSION_PUT, deviceId: clean.deviceId, session: clean }
}

function putHistoryOp (history) {
  return { v: SCHEMA_VERSION, type: OP_HISTORY_PUT, history: sanitizeHistory(history) }
}

function putContactsOp (contacts) {
  return { v: SCHEMA_VERSION, type: OP_CONTACTS_PUT, contacts: sanitizeContacts(contacts) }
}

function putAppGrantsOp (grants) {
  return { v: SCHEMA_VERSION, type: OP_APP_GRANTS_PUT, grants: sanitizeAppGrants(grants) }
}

function putSettingsOp (settings) {
  return { v: SCHEMA_VERSION, type: OP_SETTINGS_PUT, settings: sanitizeSettings(settings) }
}

function putProfileOp (profile) {
  return { v: SCHEMA_VERSION, type: OP_PROFILE_PUT, profile: sanitizeProfile(profile) }
}

function compactStateOp (state) {
  return { v: SCHEMA_VERSION, type: OP_COMPACT, state: sanitizeStateSnapshot(state) }
}

function addWriterOp (keyHex) {
  return { v: SCHEMA_VERSION, type: OP_ADD_WRITER, key: clampStr(String(keyHex || ''), 64) }
}

// --- Validation -----------------------------------------------------------
//
//   { ok: true }                      → apply it
//   { ok: false, retain: true, ... }  → keep in log, ignore in view (fwd-compat)
//   { ok: false, retain: false, ... } → reject before append (abuse/malformed)

function validateOp (op) {
  if (!op || typeof op !== 'object' || Array.isArray(op)) {
    return { ok: false, retain: false, reason: 'not-an-object' }
  }
  if (hasUnsafeKey(op)) return { ok: false, retain: false, reason: 'prototype-pollution' }
  if (opByteLength(op) > maxBytesForOp(op)) return { ok: false, retain: false, reason: 'oversized' }
  if (op.v !== SCHEMA_VERSION) return { ok: false, retain: true, reason: 'unknown-version' }

  switch (op.type) {
    case OP_ADD: {
      if (!op.bookmark || typeof op.bookmark !== 'object') return { ok: false, retain: false, reason: 'add-needs-bookmark' }
      const url = String(op.url || '').trim()
      if (!url) return { ok: false, retain: false, reason: 'add-needs-url' }
      if (String(op.bookmark.url || '').trim() !== url) return { ok: false, retain: false, reason: 'url-mismatch' }
      return { ok: true }
    }
    case OP_REMOVE:
      if (!String(op.url || '').trim()) return { ok: false, retain: false, reason: 'remove-needs-url' }
      return { ok: true }
    case OP_SESSION_PUT: {
      const deviceId = String(op.deviceId || '').trim()
      if (!/^[0-9a-f]{64}$/i.test(deviceId)) return { ok: false, retain: false, reason: 'bad-device-id' }
      if (!op.session || typeof op.session !== 'object') return { ok: false, retain: false, reason: 'session-needs-data' }
      for (const key of Object.keys(op.session)) {
        if (!SYNC_SESSION_KEYS.has(key)) return { ok: false, retain: false, reason: 'session-unknown-field' }
      }
      if (String(op.session.deviceId || '').trim().toLowerCase() !== deviceId.toLowerCase()) return { ok: false, retain: false, reason: 'device-id-mismatch' }
      if (!Array.isArray(op.session.tabs)) return { ok: false, retain: false, reason: 'session-needs-tabs' }
      for (const tab of op.session.tabs) {
        if (!tab || typeof tab !== 'object' || Array.isArray(tab)) return { ok: false, retain: false, reason: 'session-tab-needs-data' }
        for (const key of Object.keys(tab)) {
          if (!SYNC_TAB_KEYS.has(key)) return { ok: false, retain: false, reason: 'session-tab-unknown-field' }
        }
        if ('history' in tab && !Array.isArray(tab.history)) return { ok: false, retain: false, reason: 'session-tab-bad-history' }
        if ('histIdx' in tab && !Number.isInteger(tab.histIdx)) return { ok: false, retain: false, reason: 'session-tab-bad-history-index' }
      }
      const clean = sanitizeSession(op.session)
      if (!clean.tabs.length) return { ok: false, retain: false, reason: 'session-needs-tabs' }
      return { ok: true }
    }
    case OP_HISTORY_PUT:
      if (!Array.isArray(op.history)) return { ok: false, retain: false, reason: 'history-needs-list' }
      if (op.history.length > MAX_SYNC_HISTORY) return { ok: false, retain: false, reason: 'history-too-many-entries' }
      for (const entry of op.history) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { ok: false, retain: false, reason: 'history-entry-needs-data' }
        for (const key of Object.keys(entry)) {
          if (!SYNC_HISTORY_ENTRY_KEYS.has(key)) return { ok: false, retain: false, reason: 'history-unknown-field' }
        }
        if (!String(entry.url || '').trim()) return { ok: false, retain: false, reason: 'history-entry-needs-url' }
        if ('visitedAt' in entry && !Number.isFinite(entry.visitedAt)) return { ok: false, retain: false, reason: 'history-bad-visited-at' }
      }
      return { ok: true }
    case OP_CONTACTS_PUT:
      if (!Array.isArray(op.contacts)) return { ok: false, retain: false, reason: 'contacts-needs-list' }
      if (op.contacts.length > MAX_SYNC_CONTACTS) return { ok: false, retain: false, reason: 'contacts-too-many-entries' }
      for (const contact of op.contacts) {
        if (!contact || typeof contact !== 'object' || Array.isArray(contact)) return { ok: false, retain: false, reason: 'contact-needs-data' }
        for (const key of Object.keys(contact)) {
          if (!SYNC_CONTACT_ENTRY_KEYS.has(key)) return { ok: false, retain: false, reason: 'contact-unknown-field' }
        }
        if (!/^[0-9a-f]{64}$/i.test(String(contact.pubkey || ''))) return { ok: false, retain: false, reason: 'contact-bad-pubkey' }
        if ('tags' in contact && !Array.isArray(contact.tags)) return { ok: false, retain: false, reason: 'contact-bad-tags' }
        if ('signature' in contact && !/^[0-9a-f]+$/i.test(String(contact.signature || ''))) return { ok: false, retain: false, reason: 'contact-bad-signature' }
        if ('bindingKey' in contact && !/^[0-9a-f]{64}$/i.test(String(contact.bindingKey || ''))) return { ok: false, retain: false, reason: 'contact-bad-binding-key' }
        if ((('bindingKey' in contact) || ('verifiedAt' in contact)) && !contact.signature) return { ok: false, retain: false, reason: 'contact-trust-needs-signature' }
        for (const key of ['addedAt', 'updatedAt', 'verifiedAt']) {
          if (key in contact && !Number.isFinite(contact[key])) return { ok: false, retain: false, reason: 'contact-bad-time' }
        }
      }
      return { ok: true }
    case OP_APP_GRANTS_PUT:
      if (!op.grants || typeof op.grants !== 'object' || Array.isArray(op.grants)) return { ok: false, retain: false, reason: 'app-grants-needs-data' }
      for (const key of Object.keys(op.grants)) {
        if (key !== 'login' && key !== 'swarm') return { ok: false, retain: false, reason: 'app-grants-unknown-field' }
      }
      if (!Array.isArray(op.grants.login) || !Array.isArray(op.grants.swarm)) return { ok: false, retain: false, reason: 'app-grants-needs-lists' }
      if (op.grants.login.length > MAX_SYNC_LOGIN_GRANTS) return { ok: false, retain: false, reason: 'login-grants-too-many' }
      if (op.grants.swarm.length > MAX_SYNC_SWARM_GRANTS) return { ok: false, retain: false, reason: 'swarm-grants-too-many' }
      for (const grant of op.grants.login) {
        if (!grant || typeof grant !== 'object' || Array.isArray(grant)) return { ok: false, retain: false, reason: 'login-grant-needs-data' }
        for (const key of Object.keys(grant)) {
          if (!SYNC_LOGIN_GRANT_KEYS.has(key)) return { ok: false, retain: false, reason: 'login-grant-unknown-field' }
        }
        if (!/^[0-9a-f]{64}$/i.test(String(grant.driveKeyHex || grant.driveKey || ''))) return { ok: false, retain: false, reason: 'login-grant-bad-drive-key' }
        if (!Array.isArray(grant.scopes)) return { ok: false, retain: false, reason: 'login-grant-bad-scopes' }
        for (const scope of grant.scopes) {
          if (!SYNC_LOGIN_SCOPE_SET.has(String(scope || ''))) return { ok: false, retain: false, reason: 'login-grant-bad-scope' }
        }
        for (const key of ['grantedAt', 'expiresAt']) {
          if (key in grant && !Number.isFinite(grant[key])) return { ok: false, retain: false, reason: 'login-grant-bad-time' }
        }
      }
      for (const grant of op.grants.swarm) {
        if (!grant || typeof grant !== 'object' || Array.isArray(grant)) return { ok: false, retain: false, reason: 'swarm-grant-needs-data' }
        for (const key of Object.keys(grant)) {
          if (!SYNC_SWARM_GRANT_KEYS.has(key)) return { ok: false, retain: false, reason: 'swarm-grant-unknown-field' }
        }
        if (!/^[0-9a-f]{64}$/i.test(String(grant.driveKey || grant.driveKeyHex || ''))) return { ok: false, retain: false, reason: 'swarm-grant-bad-drive-key' }
        if (!/^[0-9a-f]{64}$/i.test(String(grant.topicHex || ''))) return { ok: false, retain: false, reason: 'swarm-grant-bad-topic' }
        for (const key of ['grantedAt', 'lastUsedAt']) {
          if (key in grant && !Number.isFinite(grant[key])) return { ok: false, retain: false, reason: 'swarm-grant-bad-time' }
        }
      }
      return { ok: true }
    case OP_SETTINGS_PUT:
      if (!op.settings || typeof op.settings !== 'object' || Array.isArray(op.settings)) return { ok: false, retain: false, reason: 'settings-needs-data' }
      for (const key of Object.keys(op.settings)) {
        if (!SYNC_SETTING_KEY_SET.has(key)) return { ok: false, retain: false, reason: 'settings-unknown-key' }
      }
      return { ok: true }
    case OP_PROFILE_PUT:
      if (!op.profile || typeof op.profile !== 'object' || Array.isArray(op.profile)) return { ok: false, retain: false, reason: 'profile-needs-data' }
      for (const key of Object.keys(op.profile)) {
        if (!SYNC_PROFILE_FIELD_SET.has(key)) return { ok: false, retain: false, reason: 'profile-unknown-field' }
      }
      return { ok: true }
    case OP_COMPACT: {
      const verdict = validateCompactStateSnapshot(op.state)
      if (!verdict.ok) return { ok: false, retain: false, reason: verdict.reason }
      return { ok: true }
    }
    case OP_ADD_WRITER:
      if (!/^[0-9a-f]{64}$/i.test(String(op.key || ''))) return { ok: false, retain: false, reason: 'bad-writer-key' }
      return { ok: true }
    default:
      return { ok: false, retain: true, reason: 'unknown-type' }
  }
}

function syncStorageAudit (state = {}) {
  const sessions = Array.isArray(state.sessions) ? state.sessions : []
  const history = Array.isArray(state.history) ? state.history : []
  const contacts = Array.isArray(state.contacts) ? state.contacts : []
  const appGrants = state.appGrants && typeof state.appGrants === 'object' && !Array.isArray(state.appGrants) ? state.appGrants : {}
  const login = Array.isArray(appGrants.login) ? appGrants.login : []
  const swarm = Array.isArray(appGrants.swarm) ? appGrants.swarm : []
  const settings = state.settings && typeof state.settings === 'object' && !Array.isArray(state.settings) ? state.settings : {}
  const profile = state.profile && typeof state.profile === 'object' && !Array.isArray(state.profile) ? state.profile : {}
  const maxTabsInSession = sessions.reduce((max, session) => Math.max(max, Array.isArray(session && session.tabs) ? session.tabs.length : 0), 0)
  const maxTabHistory = sessions.reduce((max, session) => {
    const tabs = Array.isArray(session && session.tabs) ? session.tabs : []
    return Math.max(max, tabs.reduce((inner, tab) => Math.max(inner, Array.isArray(tab && tab.history) ? tab.history.length : 0), 0))
  }, 0)
  const row = (key, label, count, max, unit = 'items') => {
    const percent = max > 0 ? Math.round((count / max) * 100) : 0
    return {
      key,
      label,
      count,
      max,
      unit,
      percent,
      ok: count <= max,
      near: count <= max && percent >= 80
    }
  }
  const rows = [
    row('sessions', 'Synced device sessions', sessions.length, MAX_SYNC_SESSIONS),
    row('tabsPerSession', 'Tabs per session', maxTabsInSession, MAX_SYNC_TABS),
    row('tabHistoryPerTab', 'History entries per synced tab', maxTabHistory, MAX_TAB_HISTORY),
    row('history', 'Browsing history snapshot', history.length, MAX_SYNC_HISTORY),
    row('contacts', 'Contacts snapshot', contacts.length, MAX_SYNC_CONTACTS),
    row('loginGrants', 'Sign-in grants snapshot', login.length, MAX_SYNC_LOGIN_GRANTS),
    row('swarmGrants', 'Swarm grants snapshot', swarm.length, MAX_SYNC_SWARM_GRANTS),
    row('settings', 'Settings keys snapshot', Object.keys(settings).length, SYNC_SETTING_KEYS.length),
    row('profile', 'Profile fields snapshot', Object.keys(profile).length, SYNC_PROFILE_FIELDS.length)
  ]
  const snapshot = {
    bookmarks: Array.isArray(state.bookmarks) ? state.bookmarks : [],
    sessions,
    history,
    contacts,
    appGrants: { login, swarm },
    settings,
    profile
  }
  return {
    ok: rows.every((r) => r.ok),
    rows,
    nearLimit: rows.filter((r) => r.near).map((r) => r.key),
    overLimit: rows.filter((r) => !r.ok).map((r) => r.key),
    snapshotBytes: opByteLength(snapshot),
    limits: {
      bookmarkOpBytes: MAX_OP_BYTES,
      sessionOpBytes: MAX_SESSION_OP_BYTES,
      historyOpBytes: MAX_HISTORY_OP_BYTES,
      contactsOpBytes: MAX_CONTACTS_OP_BYTES,
      appGrantsOpBytes: MAX_APP_GRANTS_OP_BYTES,
      settingsOpBytes: MAX_SETTINGS_OP_BYTES,
      profileOpBytes: MAX_PROFILE_OP_BYTES,
      sessions: MAX_SYNC_SESSIONS,
      tabsPerSession: MAX_SYNC_TABS,
      tabHistoryPerTab: MAX_TAB_HISTORY,
      history: MAX_SYNC_HISTORY,
      contacts: MAX_SYNC_CONTACTS,
      loginGrants: MAX_SYNC_LOGIN_GRANTS,
      swarmGrants: MAX_SYNC_SWARM_GRANTS,
      settings: SYNC_SETTING_KEYS.length,
      profile: SYNC_PROFILE_FIELDS.length
    }
  }
}

function isPlainRecord (value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isHexKey (value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value.trim())
}

function hasOwn (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function syncKeyAudit (localSettings = {}, state = {}) {
  const local = isPlainRecord(localSettings) ? localSettings : {}
  const syncedSettings = isPlainRecord(state && state.settings) ? state.settings : {}
  const syncKeyPresent = isHexKey(local.syncKey)
  const encKeyPresent = isHexKey(local.syncEncKey)
  const storageNamePresent = typeof local.syncStoreName === 'string' && local.syncStoreName.trim().length > 0
  const syncedSettingsLocalOnlyFields = SYNC_LOCAL_ONLY_SETTING_KEYS.filter((key) => hasOwn(syncedSettings, key))
  const row = (key, label, ok, detail = '') => ({ key, label, ok: !!ok, detail })
  const rows = [
    row('pairingKeys', 'Local pairing keys are present', syncKeyPresent && encKeyPresent, syncKeyPresent && encKeyPresent ? 'present' : 'missing'),
    row('secretExclusion', 'Synced settings exclude local-only sync fields', syncedSettingsLocalOnlyFields.length === 0, syncedSettingsLocalOnlyFields.length ? syncedSettingsLocalOnlyFields.join(', ') : 'clean'),
    row('storageNamespace', 'Local sync storage namespace is present', storageNamePresent, storageNamePresent ? 'present' : 'missing')
  ]
  return {
    ok: rows.every((r) => r.ok),
    paired: syncKeyPresent && encKeyPresent,
    local: {
      syncKeyPresent,
      encKeyPresent,
      storageNamePresent
    },
    syncedSettingsLocalOnlyFields,
    syncedSettingsSecretFields: syncedSettingsLocalOnlyFields,
    rows
  }
}

function syncRetentionAudit (metadata = {}) {
  const totalOps = Math.max(0, Number.isFinite(metadata.totalOps) ? Math.floor(metadata.totalOps) : 0)
  const retainedOps = Math.max(0, Number.isFinite(metadata.retainedOps) ? Math.floor(metadata.retainedOps) : totalOps)
  const compactedBefore = Math.max(0, Number.isFinite(metadata.compactedBefore) ? Math.floor(metadata.compactedBefore) : 0)
  const compactedOps = Math.min(totalOps, compactedBefore)
  const lastCompactIndex = Number.isFinite(metadata.lastCompactIndex) ? Math.floor(metadata.lastCompactIndex) : (compactedBefore > 0 ? compactedBefore : null)
  const prunedLocalOps = Math.max(0, totalOps - retainedOps)
  const shouldCompact = retainedOps >= SYNC_COMPACT_RECOMMENDED_OPS
  const warning = retainedOps >= SYNC_COMPACT_WARNING_OPS
  const row = (key, label, count, max, ok = count <= max) => ({
    key,
    label,
    count,
    max,
    ok,
    near: ok && count >= Math.floor(max * 0.8)
  })
  const rows = [
    row('retainedOps', 'Retained local sync operations', retainedOps, SYNC_COMPACT_WARNING_OPS, !warning),
    row('compactedOps', 'Operations covered by checkpoints', compactedOps, Math.max(1, totalOps), true),
    row('prunedLocalOps', 'Local view operations pruned after checkpoints', prunedLocalOps, Math.max(1, totalOps), true)
  ]
  return {
    ok: !warning,
    shouldCompact,
    warning,
    totalOps,
    retainedOps,
    compactedBefore,
    compactedOps,
    lastCompactIndex,
    prunedLocalOps,
    recommendedAt: SYNC_COMPACT_RECOMMENDED_OPS,
    warningAt: SYNC_COMPACT_WARNING_OPS,
    rows
  }
}

module.exports = {
  SCHEMA_VERSION, OP_ADD, OP_REMOVE, OP_SESSION_PUT, OP_HISTORY_PUT, OP_CONTACTS_PUT, OP_APP_GRANTS_PUT, OP_SETTINGS_PUT, OP_PROFILE_PUT, OP_COMPACT, OP_ADD_WRITER,
  MAX_OP_BYTES, MAX_SESSION_OP_BYTES, MAX_HISTORY_OP_BYTES, MAX_CONTACTS_OP_BYTES, MAX_APP_GRANTS_OP_BYTES, MAX_SETTINGS_OP_BYTES, MAX_PROFILE_OP_BYTES, MAX_COMPACT_OP_BYTES,
  MAX_SYNC_SESSIONS, MAX_SYNC_TABS, MAX_TAB_HISTORY, MAX_SYNC_HISTORY, MAX_SYNC_CONTACTS, MAX_SYNC_LOGIN_GRANTS, MAX_SYNC_SWARM_GRANTS, SYNC_COMPACT_RECOMMENDED_OPS, SYNC_COMPACT_WARNING_OPS,
  SYNC_SETTING_KEYS, SYNC_PROFILE_FIELDS, SYNC_LOCAL_ONLY_SETTING_KEYS,
  clampStr, hasUnsafeKey, opByteLength, sanitizeBookmark, sanitizeBookmarks,
  sanitizeTabSnapshot, sanitizeSession, sanitizeSessions, sanitizeHistoryEntry, sanitizeHistory, sanitizeContact, sanitizeContacts,
  sanitizeLoginGrant, sanitizeSwarmGrant, sanitizeAppGrants, sanitizeSettings, sanitizeProfile, sanitizeStateSnapshot,
  addBookmarkOp, removeBookmarkOp, putSessionOp, putHistoryOp, putContactsOp, putAppGrantsOp, putSettingsOp, putProfileOp, compactStateOp, addWriterOp, validateOp, syncStorageAudit, syncKeyAudit, syncRetentionAudit
}
