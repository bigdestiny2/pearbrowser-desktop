// Deterministic reducer for synced browser state — PURE.
//
// Folds an ORDERED op log into the materialized bookmark set. No wall-clock:
// order comes from Autobase linearization, modeled in tests by a node tag
// (writer + seq). Conflict rules:
//   · add vs remove → later op in order wins (keyed by url)
//   · bookmark record → whole-record replacement (no field merge)
//   · url is stable identity
//   · unknown op types/versions → retained in the log, ignored in the view

const {
  OP_ADD,
  OP_REMOVE,
  OP_SESSION_PUT,
  OP_HISTORY_PUT,
  OP_CONTACTS_PUT,
  OP_APP_GRANTS_PUT,
  OP_SETTINGS_PUT,
  OP_PROFILE_PUT,
  OP_COMPACT,
  validateOp,
  sanitizeBookmark,
  sanitizeSession,
  sanitizeSessions,
  sanitizeHistory,
  sanitizeContacts,
  sanitizeAppGrants,
  sanitizeSettings,
  sanitizeProfile,
  sanitizeStateSnapshot
} = require('./browser-state-ops.cjs')

function cmp (a, b) { return a < b ? -1 : a > b ? 1 : 0 }
function stableStringify (op) {
  try { return JSON.stringify(op, Object.keys(op).sort()) } catch { return String(op) }
}

// Total order over Autobase-style tagged nodes — { writer, seq, op } — with
// NO wall-clock input. Both replicas see the same tags, so both agree.
function linearize (tagged) {
  return [...tagged].sort((a, b) =>
    (a.seq - b.seq) ||
    cmp(String(a.writer), String(b.writer)) ||
    cmp(stableStringify(a.op), stableStringify(b.op))
  )
}

function applyView (orderedOps) {
  const bookmarks = new Map() // url → record (insertion-ordered)
  const sessions = new Map() // deviceId → latest session snapshot
  const sessionOrder = []
  let history = []
  let contacts = []
  let appGrants = { login: [], swarm: [] }
  let settings = {}
  let profile = {}
  for (const op of orderedOps || []) {
    const verdict = validateOp(op)
    if (!verdict.ok) continue
    if (op.type === OP_COMPACT) {
      const snapshot = sanitizeStateSnapshot(op.state)
      bookmarks.clear()
      for (const bookmark of snapshot.bookmarks) bookmarks.set(bookmark.url, bookmark)
      sessions.clear()
      sessionOrder.length = 0
      for (const session of snapshot.sessions) {
        sessions.set(session.deviceId, session)
        sessionOrder.push(session.deviceId)
      }
      history = snapshot.history
      contacts = snapshot.contacts
      appGrants = snapshot.appGrants
      settings = snapshot.settings
      profile = snapshot.profile
    } else if (op.type === OP_ADD) {
      bookmarks.set(op.url, { ...sanitizeBookmark(op.bookmark), url: op.url })
    } else if (op.type === OP_REMOVE) {
      bookmarks.delete(op.url)
    } else if (op.type === OP_SESSION_PUT) {
      const clean = sanitizeSession(op.session)
      sessions.set(clean.deviceId, clean)
      sessionOrder.push(clean.deviceId)
    } else if (op.type === OP_HISTORY_PUT) {
      history = sanitizeHistory(op.history)
    } else if (op.type === OP_CONTACTS_PUT) {
      contacts = sanitizeContacts(op.contacts)
    } else if (op.type === OP_APP_GRANTS_PUT) {
      appGrants = sanitizeAppGrants(op.grants)
    } else if (op.type === OP_SETTINGS_PUT) {
      settings = sanitizeSettings(op.settings)
    } else if (op.type === OP_PROFILE_PUT) {
      profile = sanitizeProfile(op.profile)
    }
  }
  const latestSessions = []
  const seenSessions = new Set()
  for (let i = sessionOrder.length - 1; i >= 0; i--) {
    const id = sessionOrder[i]
    if (seenSessions.has(id)) continue
    const session = sessions.get(id)
    if (session) latestSessions.push(session)
    seenSessions.add(id)
  }
  latestSessions.reverse()
  return { bookmarks: [...bookmarks.values()], sessions: sanitizeSessions(latestSessions), history, contacts, appGrants, settings, profile }
}

function applyTagged (tagged) {
  return applyView(linearize(tagged).map((t) => t.op))
}

function toStateData (view) {
  const bookmarks = Array.isArray(view && view.bookmarks) ? view.bookmarks : []
  const sessions = sanitizeSessions(view && view.sessions)
  const history = sanitizeHistory(view && view.history)
  const contacts = sanitizeContacts(view && view.contacts)
  const appGrants = sanitizeAppGrants(view && view.appGrants)
  const settings = sanitizeSettings(view && view.settings)
  const profile = sanitizeProfile(view && view.profile)
  return {
    bookmarks,
    sessions,
    history,
    contacts,
    appGrants,
    settings,
    profile,
    count: {
      bookmarks: bookmarks.length,
      sessions: sessions.length,
      history: history.length,
      contacts: contacts.length,
      loginGrants: appGrants.login.length,
      swarmGrants: appGrants.swarm.length,
      settings: Object.keys(settings).length,
      profile: Object.keys(profile).length
    }
  }
}

module.exports = { linearize, applyView, applyTagged, toStateData }
