import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizeUrl, isClearnetUrl } from '../ui/lib/keys.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shell = readFileSync(join(root, 'ui/shell.js'), 'utf8')
const boot = readFileSync(join(root, 'ui/boot.js'), 'utf8')
const index = readFileSync(join(root, 'backend/index.js'), 'utf8')
const constants = readFileSync(join(root, 'backend/constants.js'), 'utf8')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

test('normalizeUrl accepts clearnet hosts and https URLs', () => {
  assert.equal(normalizeUrl('example.com'), 'https://example.com')
  assert.equal(normalizeUrl('https://example.com/x'), 'https://example.com/x')
  assert.equal(isClearnetUrl('https://example.com'), true)
  assert.equal(isClearnetUrl('http://127.0.0.1:9/x'), false)
  assert.equal(isClearnetUrl('hyper://' + 'a'.repeat(64)), false)
})

test('pear.links allowlists clearnet schemes', () => {
  assert.ok(pkg.pear.links.includes('https://'))
  assert.ok(pkg.pear.links.includes('http://'))
})

test('shell ships clearnet chrome, privacy card, and navigate kind handling', () => {
  assert.match(shell, /privacy-clearnet-card/)
  assert.match(shell, /clearnet-mode-/)
  assert.match(shell, /PrivacyClearnetSection/)
  assert.match(shell, /privacy-\$\{key\}|privacy-' \+ key|'privacy-' \+ key/)
  assert.match(shell, /httpsOnly/)
  assert.match(shell, /stripTrackingParams/)
  assert.match(shell, /fingerprintFarbling/)
  assert.match(shell, /clearnet-iframe-proxy/)
  assert.match(shell, /kind === 'clearnet'/)
  assert.match(shell, /<p>Fetching <code>\$\{t\.url\}<\/code> \$\{t\.kind/)
  assert.doesNotMatch(shell, /\? html`Fetching <code>/)
  assert.match(shell, /CMD_PRIVACY_STATUS/)
  assert.match(shell, /example\.com/)
})

test('backend exposes CMD_PRIVACY_STATUS and SessionBridge wiring', () => {
  assert.match(constants, /const CMD_PRIVACY_STATUS = 238/)
  assert.match(boot, /CMD_PRIVACY_STATUS: 238/)
  assert.match(index, /rpc\.handle\(C\.CMD_PRIVACY_STATUS/)
  assert.match(index, /SessionBridge/)
  assert.match(index, /kind: 'clearnet'/)
  assert.match(index, /sessionBridge\.resolveNavigation/)
})
