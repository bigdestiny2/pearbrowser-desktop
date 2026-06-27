import test from 'node:test'
import assert from 'node:assert/strict'
import {
  searchResultBadges,
  searchResultExplanation,
  searchRunBadges,
  searchRunSummary
} from '../ui/lib/search-explain.js'

test('searchRunBadges and searchRunSummary explain digest, partial, and peer fan-out state', () => {
  const meta = {
    verifyBudgetExhausted: true,
    provenance: {
      digestHit: true,
      fallbackPull: false,
      partial: true,
      plannedPeers: 3,
      pulledPeers: 2,
      completedPeers: 1,
      digestSkipped: 1
    }
  }

  assert.deepEqual(searchRunBadges(meta).map((b) => b.label), [
    'digest hit',
    'partial',
    'verify budget',
    '3 planned',
    '2 pulled',
    '1 done',
    '1 skipped'
  ])

  const summary = searchRunSummary(meta)
  assert.match(summary, /planned 3 peers, pulled 2, completed 1/)
  assert.match(summary, /digest matched/)
  assert.match(summary, /skipped 1 peer by digest/)
  assert.match(summary, /partial results/)
  assert.match(summary, /verification capped/)
})

test('searchRunSummary falls back to local-index language when no peers were planned', () => {
  assert.equal(searchRunSummary({ provenance: { plannedPeers: 0, pulledPeers: 0 } }), 'searched local index')
  assert.deepEqual(searchRunBadges(null), [])
})

test('searchRunSummary nudges trusted-peer setup when federated search has no frontier', () => {
  const meta = {
    federated: true,
    phase: 'enriched',
    provenance: { plannedPeers: 0, pulledPeers: 0, digestSkipped: 0 }
  }

  assert.deepEqual(searchRunBadges(meta).map((b) => b.label), ['local only'])
  assert.equal(searchRunSummary(meta), 'searched local index; add a verified contact invite to search trusted peers')
})

test('searchResultBadges explains trusted app-data results', () => {
  const result = {
    tier: 'followed',
    trustHop: 2,
    matchMode: 'phrase',
    fieldHits: ['title', 'excerpt', 'source', 'link'],
    source: {
      kind: 'app-data',
      appSlug: 'peerit',
      recordType: 'post',
      verifiedAs: 'app-signed',
      availability: 'relay-confirmed'
    }
  }

  assert.deepEqual(searchResultBadges(result, { federated: true }).map((b) => b.label), [
    'peerit / post',
    'app-signed',
    'trusted hop 2',
    'phrase',
    'title',
    'excerpt',
    'source',
    'relay-confirmed'
  ])

  assert.equal(
    searchResultExplanation(result, { federated: true }),
    'from trusted peer hop 2; app-signed peerit post data; phrase match in title, excerpt, and source; relay-confirmed availability'
  )
})

test('searchResultExplanation keeps local page results concise', () => {
  const result = {
    tier: 'self',
    matchMode: 'soft-or',
    fieldHits: ['title'],
    source: { kind: 'page', verifiedAs: 'browser-indexed' }
  }

  assert.deepEqual(searchResultBadges(result, { federated: false }).map((b) => b.label), [
    'page',
    'related',
    'title'
  ])
  assert.equal(
    searchResultExplanation(result, { federated: false }),
    'from your local index; browser-indexed page; related match in title'
  )
})
