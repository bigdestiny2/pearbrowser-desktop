// Tests for backend/seed-vault.cjs — SEC0 seed-at-rest encryption (argon2id +
// secretbox via sodium-universal). Pure, Node-testable.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import b4a from 'b4a'
import vaultMod from '../backend/seed-vault.cjs'
const { encryptEntropy, decryptEntropy, isEncryptedVault, VAULT_VERSION } = vaultMod

const hex = (b) => b4a.toString(b, 'hex')

test('encrypt → decrypt round-trips with the right passphrase (16- and 32-byte entropy)', () => {
  for (const len of [16, 32]) {
    const entropy = randomBytes(len)
    const vault = encryptEntropy(entropy, 'correct horse battery staple')
    assert.equal(vault.v, VAULT_VERSION)
    assert.equal(isEncryptedVault(vault), true)
    const out = decryptEntropy(vault, 'correct horse battery staple')
    assert.equal(hex(out), hex(entropy))
  }
})

test('the wrong passphrase fails CLOSED (throws, never returns garbage)', () => {
  const vault = encryptEntropy(randomBytes(16), 'right-pass')
  assert.throws(() => decryptEntropy(vault, 'wrong-pass'), /wrong passphrase or corrupt vault/)
})

test('a tampered ciphertext fails authentication', () => {
  const vault = encryptEntropy(randomBytes(16), 'pw')
  const bytes = b4a.from(vault.cipher, 'hex'); bytes[0] ^= 0xff
  const tampered = { ...vault, cipher: b4a.toString(bytes, 'hex') }
  assert.throws(() => decryptEntropy(tampered, 'pw'), /wrong passphrase or corrupt vault/)
})

test('a tampered salt (wrong derived key) fails', () => {
  const vault = encryptEntropy(randomBytes(16), 'pw')
  const salt = b4a.from(vault.kdf.salt, 'hex'); salt[0] ^= 0xff
  const tampered = { ...vault, kdf: { ...vault.kdf, salt: b4a.toString(salt, 'hex') } }
  assert.throws(() => decryptEntropy(tampered, 'pw'))
})

test('isEncryptedVault distinguishes a vault from the legacy plaintext record', () => {
  assert.equal(isEncryptedVault(encryptEntropy(randomBytes(16), 'pw')), true)
  assert.equal(isEncryptedVault({ entropy: 'deadbeef'.repeat(4) }), false) // legacy v1 plaintext
  assert.equal(isEncryptedVault(null), false)
  assert.equal(isEncryptedVault({ v: 2, enc: 'argon2id-secretbox' }), false) // incomplete
})

test('each encryption uses a fresh salt + nonce (no reuse for the same entropy)', () => {
  const entropy = randomBytes(16)
  const a = encryptEntropy(entropy, 'pw')
  const b = encryptEntropy(entropy, 'pw')
  assert.notEqual(a.kdf.salt, b.kdf.salt)
  assert.notEqual(a.nonce, b.nonce)
  assert.notEqual(a.cipher, b.cipher) // same plaintext, different ciphertext
})

test('input validation: bad entropy length or empty passphrase throws', () => {
  assert.throws(() => encryptEntropy(randomBytes(15), 'pw'), /16 or 32 bytes/)
  assert.throws(() => encryptEntropy(randomBytes(16), ''), /non-empty/)
  assert.throws(() => decryptEntropy({ entropy: 'x' }, 'pw'), /not an encrypted seed vault/)
})
