import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shell = readFileSync(new URL('../ui/shell.js', import.meta.url), 'utf8')
const compatibility = readFileSync(new URL('../docs/PEARBROWSER-APP-COMPAT-STANDARD.md', import.meta.url), 'utf8')
const sheetsDesign = readFileSync(new URL('../docs/HIVERELAY-SCHEMA-SHEETS-DESIGN.md', import.meta.url), 'utf8')

test('static Hyperdrive content uses open and offline-copy semantics', () => {
  for (const wording of [
    'Saved for offline use',
    'Save offline',
    'Refresh saved copy',
    'Remove saved copy',
    'browsable Hyperdrive content opened in a browser tab'
  ]) {
    assert.match(shell, new RegExp(wording))
  }

  assert.doesNotMatch(shell, /<h2>Installed sites<\/h2>/)
  assert.doesNotMatch(shell, /No Hyperdrive sites installed/)
  assert.doesNotMatch(shell, /key="detail-(?:install|launch)"/)
  assert.match(shell, /detailApp\.driveKey\s*\n\s*\? html`/)
})

test('signed Pear v3 native install and open actions remain separate', () => {
  assert.match(shell, /const installNativeApp = async/)
  assert.match(shell, /const launchNativeApp = async/)
  assert.match(shell, /nativeDelivery\?\.status === 'available'/)
  assert.match(shell, />Install app<\/button>/)
  assert.match(shell, />Open app<\/button>/)
})

test('current browser docs reject executable semantics for content drives', () => {
  for (const source of [compatibility, sheetsDesign]) {
    assert.match(source, /Save offline/)
    assert.match(source, /Remove saved copy/)
    assert.match(source, /nativeDelivery/)
    assert.doesNotMatch(source, /Install → Launch/)
    assert.doesNotMatch(source, /installable static site/i)
    assert.doesNotMatch(source, /driveKey:\{[^\n]+\/\/ installable apps/)
    assert.doesNotMatch(source, /app-card render, Install\/Launch\/Update buttons/)
    assert.doesNotMatch(source, /manifest is \*\*both installable and launchable\*\*/i)
  }
})
