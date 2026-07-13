import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const {
  DEFAULT_PRIVACY,
  mergeSettingsWithPrivacyDefaults,
  isHistoryEnabled,
  isSearchIndexEnabled,
  normalizePrivacySettings
} = require('../backend/privacy-policy.cjs')
const { ContentShield } = require('../backend/content-shield.cjs')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('privacy defaults: history off, search index off, telemetry never, shield on', () => {
  assert.equal(DEFAULT_PRIVACY.historyEnabled, false)
  assert.equal(DEFAULT_PRIVACY.searchIndexEnabled, false)
  assert.equal(DEFAULT_PRIVACY.telemetryEnabled, false)
  assert.equal(DEFAULT_PRIVACY.contentShield, true)

  const merged = mergeSettingsWithPrivacyDefaults({})
  assert.equal(merged.historyEnabled, false)
  assert.equal(merged.searchIndexEnabled, false)
  assert.equal(merged.telemetryEnabled, false)
  assert.equal(merged.contentShield, true)

  assert.equal(isHistoryEnabled({}), false)
  assert.equal(isHistoryEnabled({ historyEnabled: true }), true)
  assert.equal(isSearchIndexEnabled({}), false)
  assert.equal(isSearchIndexEnabled({ searchIndexEnabled: true }), true)

  // Telemetry can never be forced on via normalize
  assert.equal(normalizePrivacySettings({ telemetryEnabled: true }).telemetryEnabled, false)
})

test('unset contentShield stays on; explicit false disables', () => {
  assert.equal(mergeSettingsWithPrivacyDefaults({}).contentShield, true)
  assert.equal(mergeSettingsWithPrivacyDefaults({ contentShield: false }).contentShield, false)
})

test('builtin shield blocks expanded ad/tracker set and ships cosmetics', () => {
  const shield = new ContentShield()
  const cases = [
    'https://stats.doubleclick.net/pixel',
    'https://www.googletagmanager.com/gtm.js',
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    'https://connect.facebook.net/en_US/fbevents.js',
    'https://cdn.segment.com/analytics.js',
    'https://static.hotjar.com/c/hotjar.js',
    'https://bat.bing.com/bat.js',
    'https://ads.linkedin.com/li.lms',
    'https://trc.taboola.com/x',
    'https://cdn.taboola.com/libtrc.js',
    'https://sb.scorecardresearch.com/beacon.js',
    'https://cdn.mxpnl.com/libs/mixpanel.js',
    'https://bam.nr-data.net/1',
    'https://app.appsflyer.com/x',
    'https://aax.amazon-adsystem.com/e/dtb'
  ]
  for (const url of cases) {
    assert.equal(shield.shouldBlockUrl(url).blocked, true, `expected block: ${url}`)
  }
  assert.equal(shield.shouldBlockUrl('https://example.com/blog/post').blocked, false)
  assert.equal(shield.shouldBlockUrl('https://news.example/article').blocked, false)
  const css = shield.cosmeticCssFor('example.com')
  assert.match(css, /\.adsbygoogle/)
  assert.match(css, /\.OUTBRAIN|\.taboola-container|\.ad-banner/)
  const stats = shield.stats()
  assert.ok(stats.blockRules > 40, `expected broad seed list, got ${stats.blockRules}`)
})

test('shield stats never retain URLs (counters only)', () => {
  const shield = new ContentShield()
  shield.shouldBlockUrl('https://doubleclick.net/ad?secret=token')
  const stats = shield.stats()
  assert.ok(stats.blocked >= 1)
  const blob = JSON.stringify(stats)
  assert.doesNotMatch(blob, /secret=token/)
  assert.doesNotMatch(blob, /https:\/\/doubleclick/)
})

test('UI and backend wire history/search opt-in and zero-collection copy', () => {
  const shell = readFileSync(join(root, 'ui/shell.js'), 'utf8')
  const index = readFileSync(join(root, 'backend/index.js'), 'utf8')
  assert.match(shell, /historyEnabled/)
  assert.match(shell, /searchIndexEnabled/)
  assert.match(shell, /privacy-zero-collection/)
  assert.match(shell, /history-disabled-note/)
  assert.match(shell, /Telemetry: never/)
  assert.match(index, /isHistoryEnabled/)
  assert.match(index, /isSearchIndexEnabled/)
  assert.match(index, /history-disabled/)
  assert.match(index, /search-index-disabled/)
  assert.match(index, /telemetryEnabled: false/)
  assert.match(index, /dataCollection/)
})
