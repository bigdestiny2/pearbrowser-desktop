import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { SEED_APPS } = require('../backend/catalogue-seed.js')

const PEERCORD_LINK = 'pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy'

test('Peercord is seeded as a launchable standalone Pear app', () => {
  const app = SEED_APPS.find((row) => row.name === 'Peercord')
  assert.ok(app, 'Peercord seed row missing')
  assert.equal(app.link, PEERCORD_LINK)
  assert.equal(app.type, 'standalone')
  assert.equal(app.driveKey, undefined)
  assert.equal(app.author, 'Mastercodeon')
  assert.equal(app.version, '1.0.8')
  assert.equal(app.sourceUrl, 'https://git.churchofmalware.org/mastercodeon/Peercord')
  assert.equal(app.license, 'GPL-3.0')
  assert.ok(app.categories.includes('featured'))
  assert.ok(app.description.toLowerCase().includes('discord-style'))
})

test('Peercord catalogue source declares window launch mode explicitly', () => {
  const source = JSON.parse(readFileSync(new URL('../catalog-source/pearbrowser-network.catalog.json', import.meta.url), 'utf8'))
  const app = source.apps.find((row) => row.id === 'peercord')
  assert.ok(app, 'Peercord source row missing')
  assert.equal(app.type, 'standalone')
  assert.equal(app.link, PEERCORD_LINK)
  assert.equal(app.driveKey, undefined)
  assert.equal(app.homepage, 'https://git.churchofmalware.org/mastercodeon/Peercord')
  assert.equal(app.source, 'https://git.churchofmalware.org/mastercodeon/Peercord')
  assert.equal(app.license, 'GPL-3.0')
})

test('Featured Peercord card uses the window launch path until a headless worker exists', () => {
  const shell = readFileSync(new URL('../ui/shell.js', import.meta.url), 'utf8')
  const entry = shell.match(/id: 'peercord'[\s\S]*?gradient: 'linear-gradient\([^']+\)'/)
  assert.ok(entry, 'Peercord featured entry missing')
  assert.match(entry[0], /type: 'standalone'/)
  assert.match(entry[0], new RegExp(PEERCORD_LINK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(shell, /catalogue type is/)
})
