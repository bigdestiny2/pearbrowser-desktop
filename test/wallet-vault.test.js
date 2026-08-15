import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { FILE_MAX_BYTES, PROFILE, parseVault, wrapKey, unwrapKey } = require('../backend/wallet/wallet-vault.cjs')

const PASSPHRASE = 'correct horse battery staple'

test('wallet vault round-trips only the 32-byte WDK encryption key', () => {
  const key = randomBytes(32)
  const serialized = wrapKey(key, PASSPHRASE)
  const parsed = parseVault(serialized, 'wdk-v1')
  const opened = unwrapKey(serialized, PASSPHRASE)

  assert.deepEqual(opened, key)
  assert.equal(parsed.vault.header.profileId, PROFILE.profileId)
  assert.equal(parsed.vault.header.memoryKiB, 65536)
  assert.equal(parsed.vault.header.iterations, 3)
  assert.equal(parsed.vault.header.parallelism, 1)
  assert.equal(parsed.vault.header.aead, 'xchacha20poly1305-ietf')
  assert.ok(Buffer.byteLength(serialized) < FILE_MAX_BYTES)
  assert.doesNotMatch(serialized, new RegExp(key.toString('hex'), 'i'))
  assert.doesNotMatch(serialized, new RegExp(key.toString('base64url').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  opened.fill(0)
  key.fill(0)
})

test('wallet vault normalizes passphrases to NFC', () => {
  const key = randomBytes(32)
  const composed = 'café-correct-horse'
  const decomposed = composed.normalize('NFD')
  const serialized = wrapKey(key, decomposed)
  const opened = unwrapKey(serialized, composed)
  assert.deepEqual(opened, key)
  opened.fill(0)
  key.fill(0)
})

test('wallet vault fails closed on wrong passphrases and authenticated tampering', () => {
  const key = randomBytes(32)
  const serialized = wrapKey(key, PASSPHRASE)
  assert.throws(() => unwrapKey(serialized, 'incorrect horse battery staple'), /authentication failed/)

  const sealedMatch = serialized.match(/"sealedKey":"([A-Za-z0-9_-]+)"/)
  assert.ok(sealedMatch)
  const first = sealedMatch[1][0]
  const replacement = first === 'A' ? 'B' : 'A'
  const tampered = serialized.replace(sealedMatch[1], replacement + sealedMatch[1].slice(1))
  assert.throws(() => unwrapKey(tampered, PASSPHRASE), /authentication failed/)

  const weaker = serialized.replace('"iterations":3', '"iterations":2')
  assert.throws(() => unwrapKey(weaker, PASSPHRASE), /unsupported wallet vault iterations/)
  key.fill(0)
})

test('wallet vault rejects duplicate, non-canonical, oversized, and cross-wallet files before unlock', () => {
  const key = randomBytes(32)
  const serialized = wrapKey(key, PASSPHRASE)
  const duplicate = serialized.replace('"magic":"PBWV"', '"magic":"PBWV","magic":"PBWV"')
  assert.throws(() => parseVault(duplicate), /not canonical/)
  assert.throws(() => parseVault(' ' + serialized), /not canonical/)
  assert.throws(() => parseVault('x'.repeat(FILE_MAX_BYTES + 1)), /file size/)
  assert.throws(() => parseVault(new Uint8Array(FILE_MAX_BYTES + 1)), /file size/)
  assert.throws(() => parseVault({ length: 1 }), /UTF-8 text or bytes/)
  assert.throws(() => unwrapKey(serialized, PASSPHRASE, 'another-wallet'), /different wallet/)
  assert.throws(() => wrapKey(key, 'too short'), /at least 12/)
  key.fill(0)
})
