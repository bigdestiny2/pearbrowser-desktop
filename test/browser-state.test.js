// Browser-state (multi-device sync) reducer tests — PURE, no autobase.
// Mirrors the autobee-catalog acceptance criteria for the bookmark dataset.
import test from 'node:test'
import assert from 'node:assert/strict'
import opsMod from '../backend/browser-state-ops.cjs'
import applyMod from '../backend/browser-state-apply.cjs'
const {
  addBookmarkOp,
  removeBookmarkOp,
  putSessionOp,
  putHistoryOp,
  putContactsOp,
  putAppGrantsOp,
  putSettingsOp,
  putProfileOp,
  compactStateOp,
  validateOp,
  sanitizeBookmark,
  sanitizeSession,
  sanitizeHistory,
  sanitizeContacts,
  sanitizeAppGrants,
  sanitizeSettings,
  sanitizeProfile,
  syncStorageAudit,
  syncKeyAudit,
  syncRetentionAudit,
  MAX_OP_BYTES,
  MAX_SYNC_SESSIONS,
  MAX_SYNC_TABS,
  MAX_SYNC_HISTORY,
  MAX_SYNC_CONTACTS,
  MAX_SYNC_LOGIN_GRANTS,
  MAX_SYNC_SWARM_GRANTS,
  SYNC_COMPACT_RECOMMENDED_OPS
} = opsMod
const { linearize, applyView, applyTagged } = applyMod

const bm = (url, title = url) => ({ url, title })
const tag = (writer, seq, op) => ({ writer, seq, op })
const A_DEV = 'a'.repeat(64)
const B_DEV = 'b'.repeat(64)
const tab = (url, title = url) => ({ url, displayUrl: url, title, history: [url], histIdx: 0 })
const contact = (pubkey, displayName = pubkey.slice(0, 8)) => ({ pubkey, displayName })
const devKey = (n) => n.toString(16).padStart(64, '0')

test('two devices converge regardless of input arrangement', () => {
  const a = [tag('A', 0, addBookmarkOp(bm('hyper://a', 'A'))), tag('A', 1, addBookmarkOp(bm('hyper://b', 'B')))]
  const d = [tag('B', 0, addBookmarkOp(bm('hyper://c', 'C'))), tag('B', 1, removeBookmarkOp('hyper://a'))]
  const v1 = applyTagged([...a, ...d])
  const v2 = applyTagged([...d, ...a])
  assert.deepEqual(v1, v2)
  // 'a' added by A then removed later by B → gone; b and c remain.
  assert.deepEqual(v1.bookmarks.map((x) => x.url).sort(), ['hyper://b', 'hyper://c'])
})

test('same ordered log rebuilds the same view after restart', () => {
  const ops = [addBookmarkOp(bm('u1')), addBookmarkOp(bm('u2')), removeBookmarkOp('u1')]
  assert.deepEqual(applyView(ops), applyView(ops))
  assert.deepEqual(applyView(ops).bookmarks.map((x) => x.url), ['u2'])
})

test('conflict: later op in order wins for add/remove', () => {
  // remove then re-add → present, with the newer title
  let v = applyView([addBookmarkOp(bm('u', 'Old')), removeBookmarkOp('u'), addBookmarkOp(bm('u', 'New'))])
  assert.equal(v.bookmarks.length, 1)
  assert.equal(v.bookmarks[0].title, 'New')
  // add then remove → absent
  v = applyView([addBookmarkOp(bm('u')), removeBookmarkOp('u')])
  assert.equal(v.bookmarks.length, 0)
})

test('add updates the whole record (re-add changes title), url is identity', () => {
  const v = applyView([addBookmarkOp(bm('u', 'First')), addBookmarkOp(bm('u', 'Second'))])
  assert.equal(v.bookmarks.length, 1)
  assert.equal(v.bookmarks[0].url, 'u')
  assert.equal(v.bookmarks[0].title, 'Second')
})

test('addedAt is stored but never affects ordering', () => {
  // Later-in-order op wins even though it carries an EARLIER addedAt.
  const v = applyView([
    addBookmarkOp({ url: 'u', title: 'A', addedAt: 2000 }),
    addBookmarkOp({ url: 'u', title: 'B', addedAt: 1000 })
  ])
  assert.equal(v.bookmarks[0].title, 'B')   // order wins, not the bigger addedAt
  assert.equal(v.bookmarks[0].addedAt, 1000)
})

test('session snapshots are keyed per device and later snapshots replace that device only', () => {
  const v = applyView([
    putSessionOp({ deviceId: A_DEV, label: 'Laptop', tabs: [tab('hyper://a', 'A')], updatedAt: 1 }),
    putSessionOp({ deviceId: B_DEV, label: 'Desktop', tabs: [tab('hyper://b', 'B')], updatedAt: 2 }),
    putSessionOp({ deviceId: A_DEV, label: 'Laptop', tabs: [tab('hyper://a2', 'A2')], updatedAt: 3 })
  ])

  assert.equal(v.sessions.length, 2)
  assert.deepEqual(v.sessions.map((s) => [s.deviceId, s.tabs[0].url]), [
    [B_DEV, 'hyper://b'],
    [A_DEV, 'hyper://a2']
  ])
})

test('session sanitization caps tab snapshots and validates device identity', () => {
  const tabs = Array.from({ length: MAX_SYNC_TABS + 5 }, (_, i) => tab(`hyper://t${i}`, `Tab ${i}`))
  const clean = sanitizeSession({ deviceId: A_DEV.toUpperCase(), label: 'x'.repeat(200), tabs })
  assert.equal(clean.deviceId, A_DEV)
  assert.equal(clean.label.length, 120)
  assert.equal(clean.tabs.length, MAX_SYNC_TABS)

  assert.equal(validateOp(putSessionOp({ deviceId: A_DEV, tabs: [] })).ok, false)
  assert.equal(validateOp({ ...putSessionOp({ deviceId: A_DEV, tabs: [tab('hyper://ok')] }), deviceId: B_DEV }).ok, false)
})

test('session snapshots are capped to the most recently updated devices', () => {
  const ops = Array.from({ length: MAX_SYNC_SESSIONS + 3 }, (_, i) => {
    const deviceId = devKey(i + 1)
    return putSessionOp({ deviceId, label: `Device ${i + 1}`, tabs: [tab(`hyper://${i + 1}`)] })
  })
  ops.push(putSessionOp({ deviceId: devKey(1), label: 'Recent device', tabs: [tab('hyper://recent')] }))

  const v = applyView(ops)
  assert.equal(v.sessions.length, MAX_SYNC_SESSIONS)
  assert.ok(v.sessions.some((s) => s.deviceId === devKey(1) && s.tabs[0].url === 'hyper://recent'))
  assert.equal(v.sessions.some((s) => s.deviceId === devKey(2)), false)
})

test('history snapshots are bounded, URL-deduped, and later snapshots replace the whole history view', () => {
  const clean = sanitizeHistory([
    { url: ' hyper://a ', title: 'A', visitedAt: 2, body: 'must-not-sync' },
    { url: 'hyper://a', title: 'Duplicate', visitedAt: 3 },
    { url: '', title: 'Empty' },
    { url: 'hyper://b', title: 'B', visitedAt: -1 }
  ])

  assert.deepEqual(clean, [
    { url: 'hyper://a', title: 'A', visitedAt: 2 },
    { url: 'hyper://b', title: 'B', visitedAt: 0 }
  ])
  assert.equal(sanitizeHistory(Array.from({ length: MAX_SYNC_HISTORY + 5 }, (_, i) => ({ url: `hyper://${i}` }))).length, MAX_SYNC_HISTORY)

  const v = applyView([
    putHistoryOp([{ url: 'hyper://old', title: 'Old', visitedAt: 1 }]),
    putHistoryOp([{ url: 'hyper://new', title: 'New', visitedAt: 4 }])
  ])
  assert.deepEqual(v.history, [{ url: 'hyper://new', title: 'New', visitedAt: 4 }])
})

test('contacts snapshots are bounded, allowlisted, URL-safe, and later snapshots replace the whole contacts view', () => {
  const clean = sanitizeContacts([
    {
      pubkey: A_DEV.toUpperCase(),
      displayName: ' Maya ',
      avatar: 'hyper://avatar',
      tags: ['friend', 'friend', '', 'builder'],
      notes: 'P2P builder',
      signature: 'A'.repeat(128),
      bindingKey: B_DEV,
      verifiedAt: 10,
      addedAt: 1,
      privateNote: 'must-not-sync'
    },
    { pubkey: A_DEV, displayName: 'Duplicate' },
    { pubkey: 'not-a-key', displayName: 'Bad' }
  ])

  assert.deepEqual(clean, [{
    pubkey: A_DEV,
    displayName: 'Maya',
    avatar: 'hyper://avatar',
    tags: ['friend', 'friend', 'builder'],
    notes: 'P2P builder',
    signature: 'a'.repeat(128),
    bindingKey: B_DEV,
    verifiedAt: 10,
    addedAt: 1
  }])
  assert.equal(sanitizeContacts(Array.from({ length: MAX_SYNC_CONTACTS + 5 }, (_, i) => contact(String(i).padStart(64, 'a').slice(0, 64)))).length, MAX_SYNC_CONTACTS)

  const v = applyView([
    putContactsOp([contact(A_DEV, 'Maya')]),
    putContactsOp([contact(B_DEV, 'Ren')])
  ])
  assert.deepEqual(v.contacts, [{ pubkey: B_DEV, displayName: 'Ren' }])
})

test('app grant snapshots sanitize login and swarm grants and later snapshots replace the whole grants view', () => {
  const clean = sanitizeAppGrants({
    login: [
      {
        driveKeyHex: A_DEV.toUpperCase(),
        scopes: ['profile:name', 'contacts:read', 'nope', 'profile:name'],
        appName: 'Peerit',
        grantedAt: 10,
        expiresAt: 20,
        attestation: 'must-not-sync'
      },
      { driveKeyHex: A_DEV, scopes: ['profile:read'] },
      { driveKeyHex: 'bad', scopes: ['profile:name'] }
    ],
    swarm: [
      {
        driveKey: A_DEV,
        topicHex: B_DEV.toUpperCase(),
        protocol: 'pear.swarm.v1',
        appName: 'Peerit',
        grantedAt: 30,
        lastUsedAt: 40,
        token: 'must-not-sync'
      },
      { driveKey: A_DEV, topicHex: B_DEV },
      { driveKey: B_DEV, topicHex: 'bad' }
    ]
  })

  assert.deepEqual(clean, {
    login: [{ driveKeyHex: A_DEV, scopes: ['profile:name', 'contacts:read'], appName: 'Peerit', grantedAt: 10, expiresAt: 20 }],
    swarm: [{ driveKey: A_DEV, topicHex: B_DEV, protocol: 'pear.swarm.v1', appName: 'Peerit', grantedAt: 30, lastUsedAt: 40 }]
  })
  assert.equal(sanitizeAppGrants({
    login: Array.from({ length: MAX_SYNC_LOGIN_GRANTS + 5 }, (_, i) => ({ driveKeyHex: String(i).padStart(64, 'a').slice(0, 64), scopes: ['profile:name'] })),
    swarm: Array.from({ length: MAX_SYNC_SWARM_GRANTS + 5 }, (_, i) => ({ driveKey: A_DEV, topicHex: String(i).padStart(64, 'b').slice(0, 64) }))
  }).login.length, MAX_SYNC_LOGIN_GRANTS)

  const v = applyView([
    putAppGrantsOp({ login: [{ driveKeyHex: A_DEV, scopes: ['profile:name'] }], swarm: [] }),
    putAppGrantsOp({ login: [], swarm: [{ driveKey: B_DEV, topicHex: A_DEV }] })
  ])
  assert.deepEqual(v.appGrants, {
    login: [],
    swarm: [{ driveKey: B_DEV, topicHex: A_DEV }]
  })
  assert.equal(sanitizeAppGrants({
    login: [],
    swarm: Array.from({ length: MAX_SYNC_SWARM_GRANTS + 5 }, (_, i) => ({ driveKey: A_DEV, topicHex: String(i).padStart(64, 'b').slice(0, 64) }))
  }).swarm.length, MAX_SYNC_SWARM_GRANTS)
})

test('settings snapshots are allowlisted and later snapshots replace the whole settings view', () => {
  const clean = sanitizeSettings({
    experimentalNaming: true,
    experimentalDeviceSync: false,
    syncKey: 'secret',
    syncEncKey: 'secret',
    relayManageKey: 'secret',
    myCatalogKey: 'a'.repeat(64),
    recentCatalogs: ['hyperbee://one', 'hyperbee://one', '', 'sheets://two'],
    standaloneLaunchWarningsSeen: { peercord: true, ignored: false }
  })

  assert.deepEqual(clean, {
    experimentalNaming: true,
    myCatalogKey: 'a'.repeat(64),
    recentCatalogs: ['hyperbee://one', 'sheets://two'],
    standaloneLaunchWarningsSeen: { peercord: true }
  })

  const v = applyView([
    putSettingsOp({ experimentalNaming: true, recentCatalogs: ['hyperbee://one'] }),
    putSettingsOp({ experimentalAutobeeCatalogs: true, myCatalogKey: 'b'.repeat(64) })
  ])
  assert.deepEqual(v.settings, {
    experimentalAutobeeCatalogs: true,
    myCatalogKey: 'b'.repeat(64)
  })
})

test('profile snapshots are allowlisted and later snapshots replace the whole profile view', () => {
  const clean = sanitizeProfile({
    displayName: 'Maya',
    bio: 'P2P builder',
    email: 'maya@example.com',
    grant: { scopes: ['profile:read'] },
    secret: 'do-not-sync',
    avatar: ' '.repeat(3000)
  })

  assert.deepEqual(clean, {
    displayName: 'Maya',
    bio: 'P2P builder',
    email: 'maya@example.com'
  })

  const v = applyView([
    putProfileOp({ displayName: 'Maya', bio: 'Old' }),
    putProfileOp({ displayName: 'Maya Updated', website: 'hyper://site' })
  ])
  assert.deepEqual(v.profile, {
    displayName: 'Maya Updated',
    website: 'hyper://site'
  })
})

test('compact state checkpoints reset earlier log history and keep later ops', () => {
  const before = applyView([
    addBookmarkOp(bm('hyper://old', 'Old')),
    addBookmarkOp(bm('hyper://keep', 'Keep')),
    removeBookmarkOp('hyper://old'),
    putSettingsOp({ experimentalNaming: true }),
    putProfileOp({ displayName: 'Maya' })
  ])
  const compact = compactStateOp(before)
  const after = applyView([
    addBookmarkOp(bm('hyper://stale', 'Stale')),
    compact,
    addBookmarkOp(bm('hyper://later', 'Later')),
    removeBookmarkOp('hyper://keep')
  ])

  assert.equal(validateOp(compact).ok, true)
  assert.deepEqual(after.bookmarks.map((bookmark) => bookmark.url).sort(), ['hyper://later'])
  assert.deepEqual(after.settings, { experimentalNaming: true })
  assert.deepEqual(after.profile, { displayName: 'Maya' })
})

test('compact checkpoints reject local-only synced settings and report retention pressure', () => {
  const compact = compactStateOp({
    bookmarks: [{ url: 'hyper://a', title: 'A', privateNote: 'dropped' }],
    settings: { experimentalNaming: true, syncEncKey: 'must-not-sync' }
  })
  assert.deepEqual(compact.state, {
    bookmarks: [{ url: 'hyper://a', title: 'A' }],
    sessions: [],
    history: [],
    contacts: [],
    appGrants: { login: [], swarm: [] },
    settings: { experimentalNaming: true },
    profile: {}
  })
  assert.equal(validateOp({ ...compact, state: { settings: { syncEncKey: 'must-not-sync' } } }).ok, false)
  assert.equal(validateOp({ ...compact, state: { contacts: [{ pubkey: A_DEV, privateNote: 'must-not-sync' }] } }).ok, false)

  const audit = syncRetentionAudit({
    totalOps: SYNC_COMPACT_RECOMMENDED_OPS + 2,
    retainedOps: SYNC_COMPACT_RECOMMENDED_OPS + 2,
    compactedBefore: 0
  })
  assert.equal(audit.shouldCompact, true)
  assert.equal(audit.warning, false)
  assert.equal(audit.rows.find((row) => row.key === 'retainedOps').count, SYNC_COMPACT_RECOMMENDED_OPS + 2)
})

test('malicious / malformed inputs are rejected or retained-but-ignored', () => {
  const rawHuge = { v: 1, type: 'bookmark.add', url: 'u', bookmark: { url: 'u', blob: 'z'.repeat(MAX_OP_BYTES) } }
  assert.equal(validateOp(rawHuge).ok, false)
  assert.equal(validateOp(rawHuge).retain, false)

  const polluted = JSON.parse('{"v":1,"type":"bookmark.add","url":"u","bookmark":{"url":"u","__proto__":{"x":1}}}')
  assert.equal(validateOp(polluted).ok, false)

  assert.equal(validateOp({ v: 1, type: 'bookmark.add', url: '', bookmark: { url: '' } }).ok, false)

  const future = validateOp({ v: 999, type: 'bookmark.add', url: 'u', bookmark: { url: 'u' } })
  assert.equal(future.ok, false)
  assert.equal(future.retain, true)

  // unknown type retained but no effect on the view
  const v = applyView([addBookmarkOp(bm('u')), { v: 1, type: 'bookmark.frobnicate', url: 'u' }])
  assert.equal(v.bookmarks.length, 1)

  assert.equal(validateOp({ v: 1, type: 'settings.put', settings: { syncEncKey: 'nope' } }).ok, false)
  assert.equal(validateOp(putSettingsOp({ experimentalNaming: true })).ok, true)
  assert.equal(validateOp({ ...putSessionOp({ deviceId: A_DEV, tabs: [tab('hyper://ok')] }), session: { deviceId: A_DEV, tabs: [tab('hyper://ok')], cookieJar: 'must-not-sync' } }).ok, false)
  assert.equal(validateOp({ ...putSessionOp({ deviceId: A_DEV, tabs: [tab('hyper://ok')] }), session: { deviceId: A_DEV, tabs: [{ ...tab('hyper://ok'), secret: 'must-not-sync' }] } }).ok, false)
  assert.equal(validateOp({ v: 1, type: 'history.put', history: [{ url: 'hyper://x', secret: 'nope' }] }).ok, false)
  assert.equal(validateOp({ v: 1, type: 'history.put', history: Array.from({ length: MAX_SYNC_HISTORY + 1 }, (_, i) => ({ url: `hyper://${i}` })) }).ok, false)
  assert.equal(validateOp(putHistoryOp([{ url: 'hyper://x', title: 'X' }])).ok, true)
  assert.equal(validateOp({ v: 1, type: 'contacts.put', contacts: [{ pubkey: A_DEV, secret: 'nope' }] }).ok, false)
  assert.equal(validateOp({ v: 1, type: 'contacts.put', contacts: [{ pubkey: 'not-a-key' }] }).ok, false)
  assert.equal(validateOp(putContactsOp([contact(A_DEV, 'Maya')])).ok, true)
  assert.equal(validateOp({ v: 1, type: 'appGrants.put', grants: { login: [{ driveKeyHex: A_DEV, scopes: ['profile:name'], token: 'nope' }], swarm: [] } }).ok, false)
  assert.equal(validateOp({ v: 1, type: 'appGrants.put', grants: { login: [{ driveKeyHex: A_DEV, scopes: ['not-a-scope'] }], swarm: [] } }).ok, false)
  assert.equal(validateOp(putAppGrantsOp({ login: [{ driveKeyHex: A_DEV, scopes: ['profile:name'] }], swarm: [{ driveKey: A_DEV, topicHex: B_DEV }] })).ok, true)
  assert.equal(validateOp({ v: 1, type: 'profile.put', profile: { grant: { app: 'nope' } } }).ok, false)
  assert.equal(validateOp(putProfileOp({ displayName: 'Maya' })).ok, true)

  // sanitizeBookmark drops unknown keys + clamps
  const clean = sanitizeBookmark({ url: 'u', title: 't', evil: 'x', addedAt: 'nope' })
  assert.equal(clean.evil, undefined)
  assert.equal(clean.addedAt, undefined)   // non-finite dropped
})

test('syncStorageAudit reports snapshot caps and over-limit state', () => {
  const audit = syncStorageAudit({
    bookmarks: [{ url: 'hyper://a', title: 'A' }],
    sessions: [{ deviceId: A_DEV, label: 'Laptop', tabs: [tab('hyper://a')] }],
    history: Array.from({ length: MAX_SYNC_HISTORY }, (_, i) => ({ url: `hyper://${i}` })),
    contacts: [contact(A_DEV, 'Maya')],
    appGrants: {
      login: [{ driveKeyHex: A_DEV, scopes: ['profile:name'] }],
      swarm: [{ driveKey: A_DEV, topicHex: B_DEV }]
    },
    settings: { experimentalNaming: true },
    profile: { displayName: 'Maya' }
  })

  assert.equal(audit.ok, true)
  assert.equal(audit.limits.sessions, MAX_SYNC_SESSIONS)
  assert.equal(audit.rows.find((row) => row.key === 'history').count, MAX_SYNC_HISTORY)
  assert.ok(audit.nearLimit.includes('history'))
  assert.ok(audit.snapshotBytes > 0)

  const over = syncStorageAudit({
    sessions: Array.from({ length: MAX_SYNC_SESSIONS + 1 }, (_, i) => ({
      deviceId: devKey(i + 1),
      tabs: [tab(`hyper://${i + 1}`)]
    }))
  })
  assert.equal(over.ok, false)
  assert.ok(over.overLimit.includes('sessions'))
})

test('syncKeyAudit reports local key handling without leaking raw keys', () => {
  const audit = syncKeyAudit(
    { syncKey: A_DEV, syncEncKey: B_DEV, syncStoreName: 'browser-state-sync-demo' },
    { settings: { experimentalNaming: true } }
  )

  assert.equal(audit.ok, true)
  assert.equal(audit.paired, true)
  assert.equal(audit.local.syncKeyPresent, true)
  assert.equal(audit.local.encKeyPresent, true)
  assert.equal(audit.local.storageNamePresent, true)
  assert.deepEqual(audit.syncedSettingsLocalOnlyFields, [])
  assert.equal(JSON.stringify(audit).includes(A_DEV), false)
  assert.equal(JSON.stringify(audit).includes(B_DEV), false)

  const leaked = syncKeyAudit(
    { syncKey: A_DEV, syncEncKey: B_DEV, syncStoreName: 'browser-state-sync-demo' },
    { settings: { syncEncKey: 'nope', syncStoreName: 'nope' } }
  )
  assert.equal(leaked.ok, false)
  assert.deepEqual(leaked.syncedSettingsSecretFields.sort(), ['syncEncKey', 'syncStoreName'])
})
