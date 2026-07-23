import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { SEED_APPS } = require('../backend/catalogue-seed.js')

const PEERCORD_MIGRATION_ID = 'wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy'

test('Peercord is seeded as a migration-required native app, never a remote launcher', () => {
  const app = SEED_APPS.find((row) => row.name === 'Peercord')
  assert.ok(app, 'Peercord seed row missing')
  assert.equal(app.link, undefined)
  assert.equal(app.type, 'standalone')
  assert.equal(app.legacyMigrationId, PEERCORD_MIGRATION_ID)
  assert.equal(app.nativeDeliveryStatus, 'migration-required')
  assert.equal(app.driveKey, undefined)
  assert.equal(app.author, 'Mastercodeon')
  assert.equal(app.version, '1.0.8')
  assert.equal(app.sourceUrl, 'https://git.churchofmalware.org/mastercodeon/Peercord')
  assert.equal(app.license, 'GPL-3.0')
  assert.ok(app.categories.includes('featured'))
  assert.ok(app.description.toLowerCase().includes('discord-style'))
})

test('Peercord catalogue source preserves provenance without an executable target', () => {
  const source = JSON.parse(readFileSync(new URL('../catalog-source/pearbrowser-network.catalog.json', import.meta.url), 'utf8'))
  const app = source.apps.find((row) => row.id === 'peercord')
  assert.ok(app, 'Peercord source row missing')
  assert.equal(app.type, 'standalone')
  assert.equal(app.link, undefined)
  assert.equal(app.legacyMigrationId, PEERCORD_MIGRATION_ID)
  assert.equal(app.nativeDelivery?.status, 'migration-required')
  assert.equal(app.driveKey, undefined)
  assert.equal(app.homepage, 'https://git.churchofmalware.org/mastercodeon/Peercord')
  assert.equal(app.source, 'https://git.churchofmalware.org/mastercodeon/Peercord')
  assert.equal(app.license, 'GPL-3.0')
})

test('Featured Peercord card communicates that publisher migration is required', () => {
  const shell = readFileSync(new URL('../ui/shell.js', import.meta.url), 'utf8')
  const entry = shell.match(/id: 'peercord'[\s\S]*?gradient: 'linear-gradient\([^']+\)'/)
  assert.ok(entry, 'Peercord featured entry missing')
  assert.match(entry[0], /nativeDelivery: \{ status: 'migration-required' \}/)
  assert.match(entry[0], new RegExp(`legacyMigrationId: '${PEERCORD_MIGRATION_ID}'`))
  assert.match(shell, /verified native v3 package/)
})

test('Peercord has no legacy standalone launch warning because it is not launchable', () => {
  const shell = readFileSync(new URL('../ui/shell.js', import.meta.url), 'utf8')
  assert.doesNotMatch(shell, /STANDALONE_PRELAUNCH_WARNINGS/)
  assert.doesNotMatch(shell, /pendingStandaloneLaunch/)
  assert.match(shell, /nativeDelivery.*migration-required/)
})
