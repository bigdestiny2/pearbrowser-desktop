import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const releaseScript = readFileSync(new URL('../scripts/release-prod.sh', import.meta.url), 'utf8')

test('Pear stage ignore excludes local release/operator scratch files', () => {
  const ignored = pkg.pear?.stage?.ignore || []
  assert.ok(ignored.includes('/.landing-seed.mjs'))
  assert.ok(ignored.includes('/pearbrowser-storage'))
  assert.ok(ignored.includes('/docs'))
  assert.ok(ignored.includes('/scripts'))
})

test('release script purges ignored files from previous Pear stages', () => {
  assert.match(releaseScript, /pear stage --purge/)
})
