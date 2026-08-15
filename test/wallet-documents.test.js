import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  DEFAULT_TTL_MS,
  WalletDocuments,
  tabKeyForDrive
} = require('../backend/wallet/wallet-documents.cjs')

const DRIVE_A = 'a'.repeat(64)
const DRIVE_B = 'b'.repeat(64)
const ORIGIN_A = 'http://127.0.0.1:9876'
const ORIGIN_B = 'http://127.0.0.1:9999'
const SESSION = 'session-test-1'

function tupleFor (driveKeyHex, origin = ORIGIN_A) {
  return {
    browserSessionId: SESSION,
    tabId: tabKeyForDrive(driveKeyHex),
    driveKey: driveKeyHex,
    walletTabOrigin: origin
  }
}

function issue (docs, driveKeyHex = DRIVE_A, origin = ORIGIN_A) {
  return docs.issue({ driveKeyHex, origin, tabKey: tabKeyForDrive(driveKeyHex) })
}

test('mint produces a 128-bit hex token that verifies against its tuple', async () => {
  const docs = new WalletDocuments()
  const { token, expiresAt } = issue(docs)
  assert.match(token, /^[0-9a-f]{32}$/)
  assert.ok(expiresAt > Date.now())
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token, method: 'connect' }), true)
})

test('unknown and malformed tokens fail closed', async () => {
  const docs = new WalletDocuments()
  const { token } = issue(docs)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token: 'f'.repeat(32) }), false)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token: token.slice(0, 16) }), false)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token: null }), false)
  assert.equal(await docs.verify({ tuple: null, token }), false)
  assert.equal(await docs.verify({}), false)
})

test('cross-drive, cross-origin and cross-tab presentations are rejected', async () => {
  const docs = new WalletDocuments()
  const { token } = issue(docs, DRIVE_A, ORIGIN_A)

  // Token of drive A presented with drive B's tuple.
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_B), token }), false)
  // Same drive, different origin.
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A, ORIGIN_B), token }), false)
  // Same drive + origin, different tab binding.
  const otherTab = { ...tupleFor(DRIVE_A), tabId: 'tab-other' }
  assert.equal(await docs.verify({ tuple: otherTab, token }), false)
  // A token minted for drive B never authorizes drive A.
  const b = issue(docs, DRIVE_B, ORIGIN_B)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_B, ORIGIN_B), token: b.token }), true)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token: b.token }), false)
})

test('re-minting for a drive revokes the predecessor (single live epoch)', async () => {
  const docs = new WalletDocuments()
  const first = issue(docs)
  const second = issue(docs)
  assert.notEqual(first.token, second.token)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token: first.token }), false)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token: second.token }), true)
  assert.equal(docs.size, 1)
  // A re-mint for one drive does not disturb another drive's live token.
  const other = issue(docs, DRIVE_B, ORIGIN_B)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token: second.token }), true)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_B, ORIGIN_B), token: other.token }), true)
})

test('tokens expire at the TTL', async () => {
  let now = 1_000_000
  const docs = new WalletDocuments({ now: () => now, ttlMs: 60_000 })
  const { token, expiresAt } = issue(docs)
  assert.equal(expiresAt, now + 60_000)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token }), true)
  now += 60_001
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token }), false)
  assert.equal(docs.size, 0)
})

test('default TTL is 30 minutes', () => {
  const docs = new WalletDocuments()
  const before = Date.now()
  const { expiresAt } = issue(docs)
  assert.ok(expiresAt - before <= DEFAULT_TTL_MS + 1000)
  assert.ok(expiresAt - before > DEFAULT_TTL_MS - 5000)
  assert.equal(DEFAULT_TTL_MS, 30 * 60 * 1000)
})

test('revoke(token) and revokeForDrive drop live tokens', async () => {
  const docs = new WalletDocuments()
  const a = issue(docs, DRIVE_A, ORIGIN_A)
  const b = issue(docs, DRIVE_B, ORIGIN_B)
  assert.equal(docs.revoke(a.token), true)
  assert.equal(docs.revoke(a.token), false)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_A), token: a.token }), false)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_B, ORIGIN_B), token: b.token }), true)
  assert.equal(docs.revokeForDrive(DRIVE_B), true)
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_B, ORIGIN_B), token: b.token }), false)
  assert.equal(docs.revokeForDrive(DRIVE_B), false)
})

test('epochs are swept alongside revoked and expired tokens', async () => {
  let now = 1_000_000
  const docs = new WalletDocuments({ now: () => now, ttlMs: 60_000 })
  const { token } = issue(docs)
  assert.equal(docs._epochs.size, 1)
  assert.equal(docs.revoke(token), true)
  assert.equal(docs._epochs.size, 0)

  issue(docs, DRIVE_A, ORIGIN_A)
  assert.equal(docs.revokeForDrive(DRIVE_A), true)
  assert.equal(docs._epochs.has(DRIVE_A), false)

  // Expiry sweeps the epoch too.
  issue(docs, DRIVE_B, ORIGIN_B)
  assert.equal(docs._epochs.has(DRIVE_B), true)
  now += 60_001
  assert.equal(await docs.verify({ tuple: tupleFor(DRIVE_B, ORIGIN_B), token: 'f'.repeat(32) }), false)
  assert.equal(docs._epochs.has(DRIVE_B), false)
})

test('issue validates its binding fields', () => {
  const docs = new WalletDocuments()
  assert.throws(() => docs.issue({ driveKeyHex: 'nope', origin: ORIGIN_A, tabKey: 'doc-x' }))
  assert.throws(() => docs.issue({ driveKeyHex: DRIVE_A, origin: '', tabKey: 'doc-x' }))
  assert.throws(() => docs.issue({ driveKeyHex: DRIVE_A, origin: ORIGIN_A, tabKey: 'has:colon' }))
})

test('tabKeyForDrive is deterministic and tuple-compatible', () => {
  assert.equal(tabKeyForDrive(DRIVE_A), 'doc-' + DRIVE_A)
  assert.equal(tabKeyForDrive(DRIVE_A.toUpperCase()), 'doc-' + DRIVE_A)
  assert.match(tabKeyForDrive(DRIVE_A), /^[A-Za-z0-9_-]{1,128}$/)
})
