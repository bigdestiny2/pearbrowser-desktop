import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../backend/index.js', import.meta.url), 'utf8')

function bootBody () {
  const start = source.indexOf('async function boot ()')
  const end = source.indexOf('// DEV catalogue seed:', start)
  assert.ok(start > 0, 'boot() should exist')
  assert.ok(end > start, 'boot() end marker should exist')
  return source.slice(start, end)
}

test('rare Nostr and app-data surfaces are lazy-started outside boot()', () => {
  const boot = bootBody()

  assert.doesNotMatch(boot, /new NostrBindingStore\b/)
  assert.doesNotMatch(boot, /new FederatedNameResolver\b/)
  assert.doesNotMatch(boot, /new FederatedNostrFeed\b/)
  assert.doesNotMatch(boot, /\.reindexKnownGroups\(/)
  assert.doesNotMatch(boot, /ensureBrowserSync\(/)
  assert.doesNotMatch(boot, /CMD_MOD_PENDING/)
  assert.match(source, /async function ensureNostrBindingStore \(/)
  assert.match(source, /function ensureFederatedNameResolver \(/)
  assert.match(source, /function ensureFederatedNostrFeed \(/)
  assert.match(source, /function ensureAppDataIndexer \(/)
  assert.match(source, /function maybeStartAppDataReindex \(/)
})

test('status exposes startup budget and deferred-surface diagnostics', () => {
  assert.match(source, /bootBudget:\s*bootBudgetAudit\(bootSnapshot\)/)
  assert.match(source, /startupDeferral:\s*startupDeferralAudit\(lazySnapshot\)/)
  assert.match(source, /browserSync:/)
  assert.match(source, /communityModeration:\s*'on-demand'/)
})

test('search warms app-data indexing without awaiting it in the hot path', () => {
  assert.match(source, /CMD_SEARCH[\s\S]*maybeStartAppDataReindex\('search'\)[\s\S]*return handleSearch\(data\)/)
  assert.match(source, /CMD_SEARCH_FEDERATED[\s\S]*maybeStartAppDataReindex\('federated-search'\)[\s\S]*return handleSearch\(\{ \.\.\.data, federated: true \}\)/)
})
