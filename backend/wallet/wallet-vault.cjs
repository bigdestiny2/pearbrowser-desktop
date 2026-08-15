'use strict'

const sodium = require('sodium-universal')
const b4a = require('b4a')

const FILE_MAX_BYTES = 64 * 1024
const PROFILE = Object.freeze({
  magic: 'PBWV',
  schemaVersion: 1,
  profileId: 'pb-wdk-vault-v1',
  kdf: 'argon2id',
  kdfVersion: 0x13,
  memoryKiB: 65536,
  iterations: 3,
  parallelism: 1,
  aead: 'xchacha20poly1305-ietf',
  minReaderVersion: 1
})
const RESOURCE_CEILINGS = Object.freeze({
  memoryKiB: 262144,
  iterations: 6,
  parallelism: 4,
  saltBytes: 32,
  nonceBytes: 24,
  sealedKeyBytes: 48
})
const HEADER_KEYS = Object.freeze([
  'aead',
  'iterations',
  'kdf',
  'kdfVersion',
  'magic',
  'memoryKiB',
  'minReaderVersion',
  'nonce',
  'parallelism',
  'profileId',
  'salt',
  'schemaVersion',
  'walletId'
])
const ROOT_KEYS = Object.freeze(['header', 'sealedKey'])
const WALLET_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

let pwhashActive = false

function isPlainRecord (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

// RFC 8785 canonicalization for the deliberately restricted vault value set:
// plain objects, arrays, strings, booleans, null, and safe integers. The vault
// profile contains no floating-point values, so ECMAScript number edge cases
// outside this subset are rejected rather than reinterpreted.
function canonicalize (value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('vault contains a non-integer number')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']'
  if (!isPlainRecord(value)) throw new Error('vault contains an unsupported value')
  const keys = Object.keys(value).sort()
  return '{' + keys.map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}'
}

function requireExactKeys (value, expected, label) {
  if (!isPlainRecord(value)) throw new Error(`${label} must be an object`)
  const actual = Object.keys(value).sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} fields do not match the supported profile`)
  }
}

function normalizePassphrase (passphrase) {
  if (typeof passphrase !== 'string') throw new Error('wallet passphrase must be a string')
  const normalized = passphrase.normalize('NFC')
  let scalars = 0
  for (const character of normalized) {
    const codePoint = character.codePointAt(0)
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) throw new Error('wallet passphrase contains invalid Unicode')
    scalars++
  }
  const encoded = b4a.from(normalized, 'utf8')
  if (scalars < 12) {
    sodium.sodium_memzero(encoded)
    throw new Error('wallet passphrase must contain at least 12 Unicode scalar values')
  }
  if (encoded.length > 256) {
    sodium.sodium_memzero(encoded)
    throw new Error('wallet passphrase must be at most 256 UTF-8 bytes')
  }
  return encoded
}

function encodeBase64Url (value) {
  return b4a.toString(value, 'base64url')
}

function decodeBase64Url (value, maxBytes, label) {
  if (typeof value !== 'string' || value.length === 0 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${label} is not canonical base64url`)
  }
  // Reject oversized values before allocating their decoded representation.
  if (value.length > Math.ceil(maxBytes * 4 / 3)) throw new Error(`${label} exceeds its size limit`)
  const decoded = b4a.from(value, 'base64url')
  if (decoded.length > maxBytes || encodeBase64Url(decoded) !== value) {
    sodium.sodium_memzero(decoded)
    throw new Error(`${label} is not canonical base64url`)
  }
  return decoded
}

function validateProfileHeader (header, expectedWalletId) {
  requireExactKeys(header, HEADER_KEYS, 'vault header')
  if (!Number.isSafeInteger(header.memoryKiB) || header.memoryKiB > RESOURCE_CEILINGS.memoryKiB) {
    throw new Error('vault memory cost exceeds the reader ceiling')
  }
  if (!Number.isSafeInteger(header.iterations) || header.iterations > RESOURCE_CEILINGS.iterations) {
    throw new Error('vault iteration cost exceeds the reader ceiling')
  }
  if (!Number.isSafeInteger(header.parallelism) || header.parallelism > RESOURCE_CEILINGS.parallelism) {
    throw new Error('vault parallelism exceeds the reader ceiling')
  }
  for (const [key, value] of Object.entries(PROFILE)) {
    if (header[key] !== value) throw new Error(`unsupported wallet vault ${key}`)
  }
  if (!WALLET_ID_RE.test(header.walletId)) throw new Error('invalid wallet vault walletId')
  if (expectedWalletId && header.walletId !== expectedWalletId) throw new Error('wallet vault belongs to a different wallet')
}

function parseVault (raw, expectedWalletId) {
  let byteLength
  if (typeof raw === 'string') byteLength = b4a.byteLength(raw, 'utf8')
  else if (b4a.isBuffer(raw) || raw instanceof Uint8Array) byteLength = raw.byteLength
  else throw new Error('wallet vault must be UTF-8 text or bytes')
  if (byteLength === 0 || byteLength > FILE_MAX_BYTES) throw new Error('wallet vault file size is invalid')
  const bytes = typeof raw === 'string' ? b4a.from(raw, 'utf8') : b4a.from(raw)
  const text = b4a.toString(bytes, 'utf8')
  if (!b4a.equals(b4a.from(text, 'utf8'), bytes)) throw new Error('wallet vault is not valid UTF-8')

  let vault
  try { vault = JSON.parse(text) } catch { throw new Error('wallet vault is not valid JSON') }
  requireExactKeys(vault, ROOT_KEYS, 'wallet vault')
  if (canonicalize(vault) !== text) throw new Error('wallet vault JSON is not canonical')
  validateProfileHeader(vault.header, expectedWalletId)

  const salt = decodeBase64Url(vault.header.salt, RESOURCE_CEILINGS.saltBytes, 'vault salt')
  const nonce = decodeBase64Url(vault.header.nonce, RESOURCE_CEILINGS.nonceBytes, 'vault nonce')
  const sealedKey = decodeBase64Url(vault.sealedKey, RESOURCE_CEILINGS.sealedKeyBytes, 'sealed wallet key')
  if (salt.length !== sodium.crypto_pwhash_SALTBYTES) throw new Error('vault salt length does not match v1')
  if (nonce.length !== sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES) throw new Error('vault nonce length does not match v1')
  if (sealedKey.length !== 32 + sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES) {
    throw new Error('sealed wallet key length does not match v1')
  }
  return { vault, salt, nonce, sealedKey }
}

function deriveKey (passphraseBytes, salt, header) {
  if (pwhashActive) throw new Error('another wallet unlock is already deriving a key')
  pwhashActive = true
  const key = b4a.alloc(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES)
  try {
    // libsodium's crypto_pwhash Argon2id implementation is single-lane for this
    // API; the authenticated profile still records and requires p=1.
    sodium.crypto_pwhash(
      key,
      passphraseBytes,
      salt,
      header.iterations,
      header.memoryKiB * 1024,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    )
    return key
  } catch (err) {
    sodium.sodium_memzero(key)
    throw err
  } finally {
    pwhashActive = false
  }
}

function wrapKey (encryptionKey, passphrase, walletId = 'wdk-v1') {
  if ((!b4a.isBuffer(encryptionKey) && !(encryptionKey instanceof Uint8Array)) || encryptionKey.length !== 32) {
    throw new Error('WDK encryption key must be exactly 32 bytes')
  }
  if (!WALLET_ID_RE.test(walletId)) throw new Error('invalid walletId')

  let passphraseBytes
  let salt
  let nonce
  let aad
  let derivedKey
  let sealedKey
  try {
    passphraseBytes = normalizePassphrase(passphrase)
    salt = b4a.alloc(sodium.crypto_pwhash_SALTBYTES)
    nonce = b4a.alloc(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
    sodium.randombytes_buf(salt)
    sodium.randombytes_buf(nonce)
    const header = {
      ...PROFILE,
      walletId,
      salt: encodeBase64Url(salt),
      nonce: encodeBase64Url(nonce)
    }
    aad = b4a.from(canonicalize(header), 'utf8')
    derivedKey = deriveKey(passphraseBytes, salt, header)
    sealedKey = b4a.alloc(32 + sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES)
    sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      sealedKey,
      encryptionKey,
      aad,
      null,
      nonce,
      derivedKey
    )
    return canonicalize({ header, sealedKey: encodeBase64Url(sealedKey) })
  } finally {
    for (const owned of [passphraseBytes, derivedKey, aad, salt, nonce, sealedKey]) {
      if (owned) sodium.sodium_memzero(owned)
    }
  }
}

function unwrapKey (raw, passphrase, expectedWalletId = 'wdk-v1') {
  let parsed
  let passphraseBytes
  let aad
  let derivedKey
  let plaintext
  try {
    parsed = parseVault(raw, expectedWalletId)
    passphraseBytes = normalizePassphrase(passphrase)
    aad = b4a.from(canonicalize(parsed.vault.header), 'utf8')
    derivedKey = deriveKey(passphraseBytes, parsed.salt, parsed.vault.header)
    plaintext = b4a.alloc(32)
    try {
      sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        plaintext,
        null,
        parsed.sealedKey,
        aad,
        parsed.nonce,
        derivedKey
      )
    } catch {
      throw new Error('wallet vault authentication failed')
    }
    const openedKey = plaintext
    plaintext = null
    return openedKey
  } finally {
    for (const owned of [
      plaintext,
      passphraseBytes,
      derivedKey,
      aad,
      parsed?.salt,
      parsed?.nonce,
      parsed?.sealedKey
    ]) {
      if (owned) sodium.sodium_memzero(owned)
    }
  }
}

module.exports = {
  FILE_MAX_BYTES,
  PROFILE,
  RESOURCE_CEILINGS,
  parseVault,
  wrapKey,
  unwrapKey
}
