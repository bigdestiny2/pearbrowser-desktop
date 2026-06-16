// Phase-4 tests: the term→shard router + cross-shard AND plan.
import test from 'node:test'
import assert from 'node:assert/strict'
import sh from '../backend/search-shard.cjs'

test('shardOf is deterministic, in range, and roughly uniform', () => {
  assert.equal(sh.shardOf('chat', 256), sh.shardOf('chat', 256))
  const buckets = new Array(16).fill(0)
  for (let i = 0; i < 8000; i++) buckets[sh.shardOf('term' + i, 16)]++
  for (const b of buckets) {
    assert.ok(b > 8000 / 16 * 0.6 && b < 8000 / 16 * 1.4, 'each shard within ±40% of even (got ' + b + ')')
  }
})

test('planCrossShardAnd groups terms by shard and flags single vs cross', () => {
  // numShards=1 → every term in one shard → single-shard (cheap) intersection
  const one = sh.planCrossShardAnd(['peer', 'chat', 'video'], 1)
  assert.equal(one.single, true)
  assert.equal(one.shards.length, 1)

  // with many shards, byShard must match shardOf exactly
  const plan = sh.planCrossShardAnd(['peer', 'chat'], 256)
  for (const [shard, terms] of plan.byShard) {
    for (const t of terms) assert.equal(sh.shardOf(t, 256), shard)
  }
  assert.equal(plan.single, plan.shards.length <= 1)
})

test('planCrossShardAnd offers a co-located bigram shard for the term pair', () => {
  const plan = sh.planCrossShardAnd(['peer', 'chat'], 256)
  assert.ok(plan.bigram, 'a 2+ term query gets a bigram hint')
  assert.equal(plan.bigram.shard, sh.bigramShardOf('peer', 'chat', 256))
  // bigram key is order-independent (sorted pair)
  assert.equal(plan.bigram.keyPrefix, 'tt!chat_peer!')
  assert.equal(sh.bigramShardOf('peer', 'chat'), sh.bigramShardOf('chat', 'peer'))
})

test('single-term query has no bigram and is single-shard', () => {
  const plan = sh.planCrossShardAnd(['solo'], 256)
  assert.equal(plan.single, true)
  assert.equal(plan.bigram, null)
})
