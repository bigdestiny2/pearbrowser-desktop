const MATCH_BADGES = {
  phrase: {
    label: 'phrase',
    tone: 'followed',
    title: 'Exact quoted phrase match'
  },
  'soft-or': {
    label: 'related',
    tone: 'other',
    title: 'Matched some query terms after the strict match had no results'
  },
  fuzzy: {
    label: 'typo match',
    tone: 'other',
    title: 'Matched a nearby indexed term'
  },
  'fuzzy-or': {
    label: 'typo related',
    tone: 'other',
    title: 'Matched nearby terms after the strict match had no results'
  }
}

const FIELD_LABELS = {
  title: 'title',
  excerpt: 'excerpt',
  path: 'path',
  link: 'link',
  source: 'source'
}

function asObject (value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function finiteCount (value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
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

function sourceOf (result) {
  return asObject(asObject(result).source)
}

function provenanceOf (meta) {
  const m = asObject(meta)
  return asObject(m.provenance || m)
}

function plural (n, singular, many = singular + 's') {
  return n === 1 ? singular : many
}

function needsTrustedPeerSetup (meta, planned, pulled) {
  return asObject(meta).federated === true && planned === 0 && (pulled === null || pulled === 0)
}

function listWords (items, max = 3) {
  const clean = items.map((v) => compactLabel(v, 28)).filter(Boolean)
  if (!clean.length) return ''
  const visible = clean.slice(0, max)
  const extra = clean.length - visible.length
  if (extra > 0) visible.push(`${extra} more`)
  if (visible.length === 1) return visible[0]
  if (visible.length === 2) return `${visible[0]} and ${visible[1]}`
  return `${visible.slice(0, -1).join(', ')}, and ${visible[visible.length - 1]}`
}

function sourceLabel (source) {
  const kind = compactLabel(source.kind || 'page')
  if (kind === 'app-data') {
    return [source.appSlug, source.recordType].map((v) => compactLabel(v, 24)).filter(Boolean).join(' / ') || 'app data'
  }
  return kind || 'page'
}

function verifiedTone (verifiedAs) {
  if (verifiedAs === 'app-signed') return 'followed'
  if (verifiedAs === 'browser-observed' || verifiedAs === 'browser-indexed') return 'self'
  return 'other'
}

function trustBadge (result, federated) {
  if (!federated) return null
  const r = asObject(result)
  if (!r.tier || r.tier === 'self') {
    return badge('trust:self', 'you', 'self', 'From your local search index')
  }
  if (r.tier === 'followed') {
    const hop = finiteCount(r.trustHop) ?? 1
    return badge('trust:followed', `trusted hop ${hop}`, 'followed', `From a trusted peer at hop ${hop}`)
  }
  const tier = compactLabel(String(r.tier), 28)
  return badge(`trust:${tier}`, tier, 'other', 'From a peer outside your direct trusted set')
}

function matchModeDescription (mode) {
  if (mode === 'phrase') return 'phrase match'
  if (mode === 'soft-or') return 'related match'
  if (mode === 'fuzzy') return 'typo-tolerant match'
  if (mode === 'fuzzy-or') return 'typo-tolerant related match'
  if (mode === 'and') return 'strict match'
  return ''
}

function trustDescription (result, federated) {
  const r = asObject(result)
  if (!federated && (!r.tier || r.tier === 'self')) return 'from your local index'
  if (!federated) return ''
  if (!r.tier || r.tier === 'self') return 'from your local index'
  if (r.tier === 'followed') {
    const hop = finiteCount(r.trustHop) ?? 1
    return `from trusted peer hop ${hop}`
  }
  return `from ${compactLabel(String(r.tier), 28)} peer`
}

function sourceDescription (source) {
  const kind = source.kind || 'page'
  if (kind === 'app-data') {
    const app = compactLabel(source.appSlug, 32) || 'app'
    const type = compactLabel(source.recordType, 32)
    const verified = source.verifiedAs === 'app-signed' ? 'app-signed ' : ''
    return `${verified}${app}${type ? ' ' + type : ''} data`
  }
  if (kind === 'page') return source.verifiedAs === 'browser-indexed' ? 'browser-indexed page' : 'page result'
  return `${compactLabel(kind, 32)} result`
}

function availabilityDescription (state) {
  if (!state) return ''
  if (state === 'relay-confirmed') return 'relay-confirmed availability'
  if (state === 'seeded') return 'seeded availability'
  if (state === 'local-only') return 'local-only availability'
  return `${compactLabel(state, 32)} availability`
}

export function searchRunBadges (meta) {
  const m = asObject(meta)
  const p = provenanceOf(m)
  if (!Object.keys(p).length && !Object.keys(m).length) return []

  const badges = []
  if (p.digestHit) badges.push(badge('run:digest-hit', 'digest hit', 'self', 'A peer digest matched before pulling peer index data'))
  if (p.fallbackPull) badges.push(badge('run:fallback-pull', 'fallback pull', 'other', 'Pulled peers without a positive digest hint'))
  if (p.partial || m.partial) badges.push(badge('run:partial', 'partial', 'other', 'Some planned peers were skipped, slow, or capped'))
  if (m.verifyBudgetExhausted) badges.push(badge('run:verify-budget', 'verify budget', 'other', 'Per-query signature verification budget was reached'))

  const planned = finiteCount(p.plannedPeers)
  const pulled = finiteCount(p.pulledPeers)
  const completed = finiteCount(p.completedPeers) ?? (Array.isArray(m.peerFetchStats) && m.peerFetchStats.length ? m.peerFetchStats.length : null)
  const skipped = finiteCount(p.digestSkipped)
  if (needsTrustedPeerSetup(m, planned, pulled)) {
    badges.push(badge('run:no-trusted-peers', 'local only', 'other', 'No searchable trusted peers are configured; add a verified contact invite to search beyond your local index'))
  }
  if (planned > 0) badges.push(badge('run:planned', `${planned} planned`, 'self', `${planned} ${plural(planned, 'peer')} in the trusted search frontier`))
  if (pulled > 0) badges.push(badge('run:pulled', `${pulled} pulled`, 'followed', `${pulled} peer ${plural(pulled, 'index', 'indexes')} selected for fetch`))
  if (completed > 0) badges.push(badge('run:completed', `${completed} done`, 'followed', `${completed} peer ${plural(completed, 'fetch', 'fetches')} completed so far`))
  if (skipped > 0) badges.push(badge('run:digest-skipped', `${skipped} skipped`, 'self', `${skipped} ${plural(skipped, 'peer')} skipped by digest`))
  return badges
}

export function searchRunSummary (meta) {
  const m = asObject(meta)
  const p = provenanceOf(m)
  if (!Object.keys(p).length && !Object.keys(m).length) return ''

  const parts = []
  const planned = finiteCount(p.plannedPeers)
  const pulled = finiteCount(p.pulledPeers)
  const completed = finiteCount(p.completedPeers) ?? (Array.isArray(m.peerFetchStats) && m.peerFetchStats.length ? m.peerFetchStats.length : null)
  const skipped = finiteCount(p.digestSkipped)
  if (planned > 0) {
    let text = `planned ${planned} ${plural(planned, 'peer')}`
    if (pulled !== null) text += `, pulled ${pulled}`
    if (completed !== null) text += `, completed ${completed}`
    parts.push(text)
  } else {
    parts.push('searched local index')
    if (needsTrustedPeerSetup(m, planned, pulled)) parts.push('add a verified contact invite to search trusted peers')
  }
  if (p.digestHit) parts.push('digest matched')
  else if (p.fallbackPull) parts.push('fallback peer pull')
  if (skipped > 0) parts.push(`skipped ${skipped} ${plural(skipped, 'peer')} by digest`)
  if (p.partial || m.partial) parts.push('partial results')
  if (m.verifyBudgetExhausted) parts.push('verification capped')
  return parts.join('; ')
}

export function searchResultBadges (result, { federated = false } = {}) {
  const r = asObject(result)
  const source = sourceOf(r)
  const kind = source.kind || 'page'
  const badges = [
    badge(`source:${kind}:${source.appSlug || ''}:${source.recordType || ''}`, sourceLabel(source), kind === 'app-data' ? 'followed' : 'self', sourceDescription(source))
  ]

  if (kind === 'app-data' && source.verifiedAs) {
    const verified = compactLabel(source.verifiedAs, 28)
    badges.push(badge(`verified:${verified}`, verified, verifiedTone(source.verifiedAs), `${verified} source metadata`))
  }

  const trust = trustBadge(r, federated)
  if (trust) badges.push(trust)

  const match = MATCH_BADGES[r.matchMode]
  if (match) badges.push(badge(`match:${r.matchMode}`, match.label, match.tone, match.title))

  const hits = Array.isArray(r.fieldHits) ? r.fieldHits.slice(0, 3) : []
  for (const field of hits) {
    const label = FIELD_LABELS[field] || compactLabel(String(field), 24)
    badges.push(badge(`field:${label}`, label, 'self', `Matched ${label}`))
  }

  if (source.availability) {
    const state = compactLabel(source.availability, 32)
    const tone = source.availability === 'relay-confirmed' ? 'followed' : (source.availability === 'seeded' ? 'self' : 'other')
    badges.push(badge(`availability:${state}`, state, tone, availabilityDescription(source.availability)))
  }

  return badges
}

export function searchResultExplanation (result, { federated = false } = {}) {
  const r = asObject(result)
  if (!Object.keys(r).length) return ''
  const source = sourceOf(r)
  const parts = []
  const trust = trustDescription(r, federated)
  if (trust) parts.push(trust)
  const sourceText = sourceDescription(source)
  if (sourceText) parts.push(sourceText)
  const fields = Array.isArray(r.fieldHits) ? r.fieldHits.slice(0, 3).map((f) => FIELD_LABELS[f] || String(f)) : []
  const match = matchModeDescription(r.matchMode)
  const fieldText = listWords(fields)
  if (match && fieldText) parts.push(`${match} in ${fieldText}`)
  else if (match) parts.push(match)
  else if (fieldText) parts.push(`matched ${fieldText}`)
  const availability = availabilityDescription(source.availability)
  if (availability) parts.push(availability)
  return parts.join('; ')
}
