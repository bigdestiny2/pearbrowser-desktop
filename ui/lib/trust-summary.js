import { formatBytes, shortKey } from './keys.js'

function asObject (value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function compactLabel (value, max = 36) {
  if (typeof value !== 'string') return ''
  const text = value.normalize('NFKC').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? text.slice(0, Math.max(1, max - 3)) + '...' : text
}

function badge (key, label, tone = 'self', title = '') {
  return { key, label: compactLabel(String(label), 44), tone, title }
}

function finiteCount (value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

function normalizeDriveKey (value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return /^[0-9a-f]{64}$/.test(text) ? text : ''
}

function targetDriveKey (app, explicitDriveKey) {
  return normalizeDriveKey(explicitDriveKey) || normalizeDriveKey(asObject(app).driveKey)
}

function grantDriveKey (grant) {
  const g = asObject(grant)
  return normalizeDriveKey(g.driveKey || g.driveKeyHex)
}

function catalogSources (app) {
  const a = asObject(app)
  const out = []
  for (const source of Array.isArray(a._sources) ? a._sources : []) {
    const label = compactLabel(source, 48)
    if (label && !out.includes(label)) out.push(label)
  }
  const single = compactLabel(a.catalogName, 48)
  if (single && !out.includes(single)) out.push(single)
  return out
}

function verificationBadge (verification) {
  if (verification === 'author-signed') {
    return badge('verification:author-signed', 'author-signed', 'followed', 'Catalog row is signed by the app author')
  }
  if (verification === 'relay-listed') {
    return badge('verification:relay-listed', 'relay-listed', 'followed', 'Catalog row is listed by a relay index')
  }
  return badge('verification:unverified', 'unverified', 'other', 'Catalog row has no author or relay verification claim')
}

function appLaunchBadge (app) {
  const a = asObject(app)
  const link = compactLabel(a.link, 256)
  if (a.type === 'hypersite') {
    return badge('launch:tab', 'tab app', 'self', 'Runs inside a browser tab')
  }
  if (/^pear:\/\//i.test(link)) {
    return badge('launch:window', 'window app', 'other', 'Opens in its own Pear window')
  }
  if (/^(?:hyper|file):\/\//i.test(link) || compactLabel(a.driveKey, 80)) {
    return badge('launch:site', 'hyper site', 'self', 'Opens as peer-served site content in a tab')
  }
  return badge('launch:external', 'external link', 'other', 'Launch target is not a recognized Pear or Hyperdrive target')
}

function appLaunchSummary (app) {
  const a = asObject(app)
  const link = compactLabel(a.link, 256)
  if (a.type === 'hypersite') return 'Runs inside a browser tab'
  if (/^pear:\/\//i.test(link)) return 'Opens in its own Pear window'
  if (/^(?:hyper|file):\/\//i.test(link) || compactLabel(a.driveKey, 80)) return 'Opens as peer-served site content in a tab'
  return 'Launch target is not recognized'
}

function verificationSummary (verification) {
  if (verification === 'author-signed') return 'Author-signed catalog entry'
  if (verification === 'relay-listed') return 'Relay-listed catalog entry'
  return 'Unverified catalog entry'
}

function publisherIdentity (record) {
  const r = asObject(record)
  const name = compactLabel(r.publisherName || r.publisher || r.author || r.ownerName || r.owner, 48)
  const key = normalizeDriveKey(r.publisherKey || r.publisherPubkey || r.authorKey || r.signerPubkey)
  if (!name && !key) return null
  return { name, key }
}

function publisherBadges (record) {
  const p = publisherIdentity(record)
  if (!p) return []
  const verification = asObject(record).verification
  if (p.name) {
    return [badge('publisher:name', `by ${p.name}`, verification === 'author-signed' ? 'followed' : 'self', p.key ? `Publisher key ${shortKey(p.key)}` : 'Publisher identity metadata')]
  }
  return [badge('publisher:key', `publisher ${shortKey(p.key)}`, verification === 'author-signed' ? 'followed' : 'self', 'Publisher public key')]
}

function publisherSummary (record) {
  const p = publisherIdentity(record)
  if (!p) return ''
  if (p.name && p.key) return `Publisher ${p.name} (${shortKey(p.key)})`
  if (p.name) return `Publisher ${p.name}`
  return `Publisher key ${shortKey(p.key)}`
}

function normalizedModerationStatus (value) {
  const status = compactLabel(value, 40).toLowerCase()
  if (status === 'pending-review' || status === 'pending' || status === 'in-review') return 'pending-review'
  if (status === 'approved' || status === 'accepted') return 'approved'
  if (status === 'rejected' || status === 'denied') return 'rejected'
  return status
}

function moderationEvidence (app) {
  const a = asObject(app)
  const m = asObject(a.moderation)
  const status = normalizedModerationStatus(m.status || a.moderationStatus || a.status)
  const reason = compactLabel(m.reason || a.moderationReason, 120)
  const relayResponse = compactLabel(m.relayResponse || m.relayReason || a.relayResponse || a.relayReason, 120)
  if (!status && !reason && !relayResponse) return null
  return { status, reason, relayResponse }
}

function moderationBadges (app) {
  const evidence = moderationEvidence(app)
  if (!evidence || !evidence.status) return []
  if (evidence.status === 'pending-review') return [badge('moderation:pending', 'pending review', 'self', evidence.reason || 'Waiting for community catalog review')]
  if (evidence.status === 'approved') return [badge('moderation:approved', 'approved', 'followed', evidence.reason || 'Approved by the community catalog')]
  if (evidence.status === 'rejected') return [badge('moderation:rejected', 'rejected', 'danger', evidence.reason || 'Rejected by the community catalog')]
  return [badge(`moderation:${evidence.status}`, evidence.status, 'other', evidence.reason || 'Catalog moderation state')]
}

function moderationSummary (app) {
  const evidence = moderationEvidence(app)
  if (!evidence) return ''
  const parts = []
  if (evidence.status === 'pending-review') parts.push('Waiting for community catalog review')
  else if (evidence.status === 'approved') parts.push('Approved by the community catalog')
  else if (evidence.status === 'rejected') parts.push('Rejected by the community catalog')
  else if (evidence.status) parts.push(`Moderation state: ${evidence.status}`)
  if (evidence.reason) parts.push(evidence.reason)
  if (evidence.relayResponse) parts.push(`Relay response: ${evidence.relayResponse}`)
  return parts.join('. ')
}

function dateLabel (value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    try { return new Date(value).toISOString().slice(0, 10) } catch {}
  }
  if (typeof value === 'string') {
    const text = compactLabel(value, 48)
    if (!text) return ''
    const parsed = Date.parse(text)
    if (Number.isFinite(parsed)) {
      try { return new Date(parsed).toISOString().slice(0, 10) } catch {}
    }
    return text
  }
  return ''
}

function releaseSignatureEvidence (entry) {
  const r = asObject(entry)
  const signature = compactLabel(r.signature || r.releaseSignature || r.manifestSignature || r.sig, 96)
  const signer = normalizeDriveKey(r.signerPubkey || r.publisherKey || r.publisherPubkey || r.authorKey)
  const manifestKey = normalizeDriveKey(r.manifestKey || r.releaseManifestKey || r.metadataKey)
  const signed = r.signed === true || r.verified === true || !!signature || !!signer || !!manifestKey
  return {
    signed,
    signature,
    signer,
    manifestKey
  }
}

function releaseEntries (app) {
  const a = asObject(app)
  const entries = []
  const push = (entry) => {
    const r = asObject(entry)
    const version = compactLabel(r.version || r.v, 40)
    const publishedAt = r.publishedAt || r.releasedAt
    const updatedAt = r.updatedAt
    const date = dateLabel(updatedAt || publishedAt)
    const notes = compactLabel(r.notes || r.changelog || r.summary, 96)
    const signature = releaseSignatureEvidence(r)
    if (!version && !date && !notes && !signature.signed) return
    const key = `${version}|${date}`
    const existing = entries.find((entry) => entry.key === key || (version && entry.version === version && (!entry.date || !date || entry.date === date)))
    if (existing) {
      if (!existing.date && date) existing.date = date
      if (!existing.notes && notes) existing.notes = notes
      if (!existing.signed && signature.signed) Object.assign(existing, signature)
      return
    }
    entries.push({ key, version, date, notes, ...signature })
  }

  push({ version: a.version, publishedAt: a.publishedAt || a.releasedAt, updatedAt: a.updatedAt })
  for (const release of Array.isArray(a.releaseHistory) ? a.releaseHistory : []) push(release)
  for (const release of Array.isArray(a.releases) ? a.releases : []) push(release)
  for (const release of Array.isArray(a.signedReleaseHistory) ? a.signedReleaseHistory : []) push(release)
  for (const release of Array.isArray(a.signedReleases) ? a.signedReleases : []) push(release)
  for (const release of Array.isArray(a.releaseManifests) ? a.releaseManifests : []) push(release)
  return entries.slice(0, 12)
}

function releaseBadges (app) {
  const entries = releaseEntries(app)
  if (!entries.length) return []
  const latest = entries[0]
  const out = []
  if (latest.version) out.push(badge('release:version', `v${latest.version}`, 'self', 'Current catalog release version'))
  const signedCount = entries.filter((entry) => entry.signed).length
  if (signedCount) out.push(badge('release:signed-log', `${signedCount} signed`, 'followed', 'Signed release manifest evidence is present'))
  if (entries.length > 1) out.push(badge('release:history', `${entries.length} releases`, 'self', latest.date ? `Latest cataloged release: ${latest.date}` : 'Cataloged release history'))
  else if (latest.date) out.push(badge('release:date', 'released', 'self', `Released ${latest.date}`))
  return out
}

function releaseSummary (app) {
  const entries = releaseEntries(app)
  if (!entries.length) return ''
  const latest = entries[0]
  const parts = []
  if (latest.version) parts.push(`Current version v${latest.version}`)
  if (latest.date) parts.push(`${latest.version ? 'latest release' : 'Released'} ${latest.date}`)
  if (entries.length > 1) parts.push(`${entries.length} cataloged releases`)
  const signedCount = entries.filter((entry) => entry.signed).length
  if (signedCount) parts.push(`${signedCount} signed release ${signedCount === 1 ? 'manifest' : 'manifests'}`)
  if (latest.notes) parts.push(`Latest note: ${latest.notes}`)
  return parts.join('. ')
}

function availabilityBadges (driveInfo) {
  const info = asObject(driveInfo)
  if (!Object.keys(info).length) return []
  const out = []
  const peers = finiteCount(info.peerCount)
  const bytes = finiteCount(info.byteLength)
  if (peers !== null) out.push(badge('availability:peers', `${peers} ${peers === 1 ? 'peer' : 'peers'}`, peers > 0 ? 'followed' : 'self', 'Peers currently serving this bundle'))
  if (bytes > 0) out.push(badge('availability:size', formatBytes(bytes), 'self', 'Local known bundle size'))
  return out
}

function availabilitySummary (driveInfo) {
  const info = asObject(driveInfo)
  const peers = finiteCount(info.peerCount)
  const bytes = finiteCount(info.byteLength)
  const parts = []
  if (peers !== null) parts.push(`${peers} ${peers === 1 ? 'peer' : 'peers'} serving`)
  if (bytes > 0) parts.push(formatBytes(bytes))
  return parts.join(', ')
}

const SCOPE_LABELS = {
  'profile:read': 'all profile fields',
  'profile:name': 'display name',
  'profile:avatar': 'avatar',
  'profile:email': 'email',
  'profile:website': 'website',
  'profile:contact': 'contact profile',
  'contacts:read': 'contacts'
}

function profileFieldLabels (scopes) {
  const set = new Set(Array.isArray(scopes) ? scopes : [])
  if (set.has('profile:read')) return ['display name', 'avatar', 'bio', 'email', 'website', 'pronouns', 'location']
  const fields = []
  if (set.has('profile:name')) fields.push('display name')
  if (set.has('profile:avatar')) fields.push('avatar')
  if (set.has('profile:email')) fields.push('email')
  if (set.has('profile:website')) fields.push('website')
  if (set.has('profile:contact')) {
    if (!fields.includes('email')) fields.push('email')
    if (!fields.includes('website')) fields.push('website')
  }
  return fields
}

function listWords (items, max = 4) {
  const clean = items.map((v) => compactLabel(v, 28)).filter(Boolean)
  if (!clean.length) return ''
  const visible = clean.slice(0, max)
  const extra = clean.length - visible.length
  if (extra > 0) visible.push(`${extra} more`)
  if (visible.length === 1) return visible[0]
  if (visible.length === 2) return `${visible[0]} and ${visible[1]}`
  return `${visible.slice(0, -1).join(', ')}, and ${visible[visible.length - 1]}`
}

function permissionEvidence ({ driveKey, loginGrants, swarmGrants } = {}) {
  const key = normalizeDriveKey(driveKey)
  if (!key) return { login: null, swarm: [], profileFields: [], contactAccess: false, labels: [] }
  const login = (Array.isArray(loginGrants) ? loginGrants : []).map(asObject).find((g) => grantDriveKey(g) === key) || null
  const swarm = (Array.isArray(swarmGrants) ? swarmGrants : []).map(asObject).filter((g) => grantDriveKey(g) === key)
  const scopes = Array.isArray(login && login.scopes) ? login.scopes : []
  const profileFields = profileFieldLabels(scopes)
  const contactAccess = scopes.includes('contacts:read')
  const labels = scopes.map((scope) => SCOPE_LABELS[scope] || compactLabel(scope, 32)).filter(Boolean)
  return { login, swarm, profileFields, contactAccess, labels }
}

function permissionBadges (evidence) {
  const p = evidence || {}
  const out = []
  if (p.login) out.push(badge('permission:login', 'signed in', 'followed', 'This app has a stored Pear Passport sign-in grant'))
  if (Array.isArray(p.profileFields) && p.profileFields.length) {
    out.push(badge('permission:profile', `${p.profileFields.length} profile`, 'other', `Shared profile fields: ${listWords(p.profileFields, 6)}`))
  }
  if (p.contactAccess) out.push(badge('permission:contacts', 'contacts', 'other', 'This app can read your saved contacts'))
  if (Array.isArray(p.swarm) && p.swarm.length) {
    out.push(badge('permission:swarm', `${p.swarm.length} swarm`, 'other', `${p.swarm.length} persistent arbitrary-topic swarm ${p.swarm.length === 1 ? 'grant' : 'grants'}`))
  }
  return out
}

function permissionSummary (evidence) {
  const p = evidence || {}
  const parts = []
  if (p.login) {
    const scopes = Array.isArray(p.labels) && p.labels.length ? ` for ${listWords(p.labels, 5)}` : ''
    parts.push(`Has a stored sign-in grant${scopes}`)
  }
  if (Array.isArray(p.profileFields) && p.profileFields.length) parts.push(`Shares ${listWords(p.profileFields, 6)}`)
  if (p.contactAccess) parts.push('Can read saved contacts')
  if (Array.isArray(p.swarm) && p.swarm.length) {
    parts.push(`Has ${p.swarm.length} persistent swarm topic ${p.swarm.length === 1 ? 'grant' : 'grants'}`)
  }
  return parts
}

function pinState (pin) {
  const p = asObject(pin)
  if (!Object.keys(p).length) return ''
  if (p.state) return compactLabel(p.state, 32)
  if (p.availability && typeof p.availability === 'object' && p.availability.available) return compactLabel(p.availability.available, 32)
  if (p.durable || finiteCount(p.replicatedPeers) > 0) return 'relay-confirmed'
  if (p.ok || finiteCount(p.acceptances) > 0 || finiteCount(p.seedAcceptances) > 0) return 'seeded'
  return 'local-only'
}

function pinBadges (pin) {
  const state = pinState(pin)
  if (!state) return []
  const p = asObject(pin)
  const tone = state === 'relay-confirmed' ? 'followed' : (state === 'seeded' ? 'self' : 'other')
  const accepted = finiteCount(p.acceptances) ?? finiteCount(p.seedAcceptances)
  const peers = finiteCount(p.replicatedPeers) ?? finiteCount(p.activePeers)
  const details = []
  if (accepted !== null) details.push(`${accepted} accepted`)
  if (peers !== null) details.push(`${peers} replicated`)
  return [badge(`pin:${state}`, state, tone, details.length ? details.join(', ') : 'Relay pin evidence')]
}

function pinSummary (pin) {
  const state = pinState(pin)
  if (!state) return ''
  const p = asObject(pin)
  const accepted = finiteCount(p.acceptances) ?? finiteCount(p.seedAcceptances)
  const peers = finiteCount(p.replicatedPeers) ?? finiteCount(p.activePeers)
  if (state === 'relay-confirmed') {
    return `Relay pin confirmed${peers !== null ? ` with ${peers} replicated ${peers === 1 ? 'peer' : 'peers'}` : ''}`
  }
  if (state === 'seeded') {
    return `Relay pin accepted${accepted !== null ? ` by ${accepted} ${accepted === 1 ? 'relay' : 'relays'}` : ''}`
  }
  return 'Local-only P2P availability'
}

export function appTrustSummary (app, { driveInfo, loginGrants, swarmGrants, driveKey } = {}) {
  const a = asObject(app)
  const sources = catalogSources(a)
  const targetKey = targetDriveKey(a, driveKey)
  const permissions = permissionEvidence({ driveKey: targetKey, loginGrants, swarmGrants })
  const badges = [
    verificationBadge(a.verification),
    ...publisherBadges(a),
    appLaunchBadge(a)
  ]
  if (sources.length > 1) {
    badges.push(badge('catalog:sources', `${sources.length} catalogs`, 'self', `Listed by ${sources.join(', ')}`))
  } else if (sources.length === 1) {
    badges.push(badge('catalog:source', compactLabel(sources[0], 32), 'self', `Listed by ${sources[0]}`))
  }
  badges.push(...releaseBadges(a))
  badges.push(...moderationBadges(a))
  badges.push(...pinBadges(a.pin))
  badges.push(...availabilityBadges(driveInfo))
  badges.push(...permissionBadges(permissions))

  const parts = [
    verificationSummary(a.verification),
    publisherSummary(a),
    appLaunchSummary(a)
  ].filter(Boolean)
  if (sources.length > 1) parts.push(`Listed by ${sources.length} catalogs`)
  else if (sources.length === 1) parts.push(`Listed by ${sources[0]}`)
  const releases = releaseSummary(a)
  if (releases) parts.push(releases)
  const moderation = moderationSummary(a)
  if (moderation) parts.push(moderation)
  const pin = pinSummary(a.pin)
  if (pin) parts.push(pin)
  const availability = availabilitySummary(driveInfo)
  if (availability) parts.push(availability)
  parts.push(...permissionSummary(permissions))

  return {
    kind: 'app',
    risk: badges.some((b) => b.key === 'launch:window' || b.key === 'verification:unverified' || b.key === 'moderation:pending' || b.key === 'moderation:rejected') ? 'review' : 'normal',
    badges,
    summary: parts.join('. '),
    evidence: {
      publisher: publisherIdentity(a)
    }
  }
}

export function siteTrustSummary (site, { owned = false, loginGrants, swarmGrants, driveKey } = {}) {
  const s = asObject(site)
  const published = !!(s.published || s.driveKey || s.keyHex)
  const key = compactLabel(s.driveKey || s.keyHex, 80)
  const permissions = permissionEvidence({ driveKey: driveKey || s.driveKey || s.keyHex, loginGrants, swarmGrants })
  const createdAt = dateLabel(s.createdAt)
  const updatedAt = dateLabel(s.updatedAt)
  const publishedAt = dateLabel(s.publishedAt)
  const badges = []
  if (owned) badges.push(badge('site:owner', 'your site', 'self', 'Created in this browser profile'))
  badges.push(...publisherBadges(s))
  badges.push(badge(published ? 'site:published' : 'site:draft', published ? 'published' : 'draft', published ? 'followed' : 'other', published ? 'Published to a Hyperdrive' : 'Draft only, not published yet'))
  if (key) badges.push(badge('site:hyperdrive', 'hyperdrive', 'self', 'Peer-served Hyperdrive content'))
  if (!owned && published) badges.push(badge('site:relay', 'relay-pinned', 'followed', 'Listed as a relay-pinned published site'))
  if (updatedAt && updatedAt !== createdAt && updatedAt !== publishedAt) badges.push(badge('site:updated', 'updated', 'self', `Last updated ${updatedAt}`))
  badges.push(...pinBadges(s.pin))
  badges.push(...permissionBadges(permissions))

  const parts = []
  if (owned) parts.push('Created in this browser profile')
  const publisher = publisherSummary(s)
  if (publisher) parts.push(publisher)
  parts.push(published ? 'Published Hyperdrive site' : 'Draft site')
  if (key) parts.push('Opens as peer-served site content in a tab')
  if (!owned && published) parts.push('Relay-pinned discovery entry')
  if (createdAt) parts.push(`Created ${createdAt}`)
  if (publishedAt) parts.push(`Published ${publishedAt}`)
  if (updatedAt && updatedAt !== createdAt && updatedAt !== publishedAt) parts.push(`Updated ${updatedAt}`)
  const pin = pinSummary(s.pin)
  if (pin) parts.push(pin)
  parts.push(...permissionSummary(permissions))

  return {
    kind: 'site',
    risk: published ? 'normal' : 'review',
    badges,
    summary: parts.join('. '),
    evidence: {
      publisher: publisherIdentity(s)
    }
  }
}
