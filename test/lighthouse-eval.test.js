import test from 'node:test'
import assert from 'node:assert/strict'

import evalMod from '../backend/lighthouse-eval.cjs'

const { scoreQuery, runEvaluation, percentile } = evalMod

test('scoreQuery computes MRR, Recall@K, and nDCG over graded relevance', () => {
  const results = [{ docId: 'a' }, { docId: 'b' }, { docId: 'c' }]
  const relevant = { b: 3, c: 1, z: 2 }
  const score = scoreQuery(results, relevant, 3)

  assert.equal(score.firstRelevantRank, 2)
  assert.equal(score.reciprocalRank, 0.5)
  assert.equal(score.recallAtK, 2 / 3)
  assert.ok(score.ndcg > 0 && score.ndcg < 1)
})

test('runEvaluation accepts object-shaped search results with diagnostics', async () => {
  const report = await runEvaluation({
    k: 2,
    queries: [
      { id: 'q1', query: 'alpha', relevant: { d1: 3 } },
      { id: 'q2', query: 'beta', relevant: { d3: 3 } }
    ],
    search: async (query) => query === 'alpha'
      ? { results: [{ docId: 'd1' }, { docId: 'd2' }], partial: false, provenance: { plannedPeers: 0 } }
      : { results: [{ docId: 'd4' }, { docId: 'd3' }], partial: true, peerFetchStats: [{ reason: 'deadline' }] }
  })

  assert.equal(report.aggregate.queries, 2)
  assert.equal(report.aggregate.partialQueries, 1)
  assert.equal(report.aggregate.mrr, 0.75)
  assert.deepEqual(report.aggregate.failedQueries, [])
  assert.equal(report.queries[1].peerFetchStats[0].reason, 'deadline')
})

test('percentile handles empty and small samples', () => {
  assert.equal(percentile([], 95), 0)
  assert.equal(percentile([7], 95), 7)
  assert.equal(percentile([3, 1, 2], 50), 2)
})
