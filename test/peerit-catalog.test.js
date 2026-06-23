import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { SEED_APPS } = require('../backend/catalogue-seed.js')

const PEERIT_KEY = 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4'
const PEERIT_URL = 'hyper://' + PEERIT_KEY + '/'

test('peerit is seeded as a browsable hypersite, not a standalone app', () => {
  const app = SEED_APPS.find((row) => row.name === 'peerit')
  assert.ok(app, 'peerit seed row missing')
  assert.equal(app.type, 'hypersite')
  assert.equal(app.driveKey, PEERIT_KEY)
  assert.equal(app.link, undefined, 'a site is opened by driveKey, not a pear:// link')
  assert.equal(app.author, 'defidon')
  assert.equal(app.version, '1.0.0')
  assert.ok(app.categories.includes('featured'), 'peerit must be featured')
  assert.ok(app.categories.includes('site'))
  assert.ok(app.iconData && app.iconData.startsWith('data:image/svg+xml'))
  assert.match(app.description.toLowerCase(), /front page of the p2p internet/)
})

test('peerit catalogue source declares the site + drive key', () => {
  const source = JSON.parse(readFileSync(new URL('../catalog-source/pearbrowser-network.catalog.json', import.meta.url), 'utf8'))
  const app = source.apps.find((row) => row.id === 'peerit')
  assert.ok(app, 'peerit source row missing')
  assert.equal(app.type, 'hypersite')
  assert.equal(app.driveKey, PEERIT_KEY)
  assert.equal(app.url, PEERIT_URL)
})

test('shell.js opens peerit as the active front tab alongside the landing page', () => {
  const shell = readFileSync(new URL('../ui/shell.js', import.meta.url), 'utf8')
  // The drive key constant exists and is used to build the front-tab URL.
  assert.match(shell, new RegExp(`PEERIT_DRIVE_KEY = '${PEERIT_KEY}'`))
  assert.match(shell, /const PEERIT_URL = 'hyper:\/\/' \+ PEERIT_DRIVE_KEY \+ '\/'/)
  // Fresh launch opens two tabs, with peerit FIRST (tabs[0] == the active tab).
  assert.match(shell, /\[makeTab\(PEERIT_URL\), makeTab\(DEFAULT_URL\)\]/)
})

test('shell.js pins peerit to the top of the Sites discovery grid', () => {
  const shell = readFileSync(new URL('../ui/shell.js', import.meta.url), 'utf8')
  // The Sites ranker special-cases the peerit drive key as rank 0 (top).
  assert.match(shell, /a\.driveKey === PEERIT_DRIVE_KEY \? 0/)
  // Featured sites rank above the rest.
  assert.match(shell, /categories\.includes\('featured'\) \? 1 : 2/)
})
