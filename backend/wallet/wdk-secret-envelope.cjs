'use strict'

const b4a = require('b4a')
const sodium = require('sodium-universal')
const { canonicalizeReleaseData } = require('./canonical-json.cjs')

const MAGIC = b4a.from('PBWS')
const HEADER_BYTES = 4 + 1 + 1 + sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
const PROFILE = Object.freeze({
  format: 'pb-wdk-secrets-v1',
  version: 1,
  aead: 'xchacha20poly1305-ietf',
  walletId: 'wdk-v1'
})
const KINDS = Object.freeze({
  seed: Object.freeze({ code: 1, plaintextBytes: 64 }),
  entropy: Object.freeze({ code: 2, plaintextBytes: 32 })
})
const ENVELOPE_BYTES = Object.freeze(Object.fromEntries(Object.entries(KINDS).map(([name, kind]) => [
  name,
  HEADER_BYTES + kind.plaintextBytes + sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES
])))
const WALLET_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

function requireBytes (value, length, label) {
  if ((!b4a.isBuffer(value) && !(value instanceof Uint8Array)) || value.byteLength !== length) {
    throw new Error(`${label} must be exactly ${length} bytes`)
  }
}

function kindProfile (kind) {
  const profile = KINDS[kind]
  if (!profile) throw new Error('unsupported WDK secret-envelope kind')
  return profile
}

function aadFor (kind, walletId) {
  const kindConfig = kindProfile(kind)
  if (!WALLET_ID_RE.test(walletId)) throw new Error('invalid WDK secret-envelope walletId')
  return b4a.from(canonicalizeReleaseData({
    aead: PROFILE.aead,
    domain: 'pearbrowser:wdk-secret-envelope',
    format: PROFILE.format,
    kind,
    plaintextBytes: kindConfig.plaintextBytes,
    version: PROFILE.version,
    walletId
  }), 'utf8')
}

function sealSecret (kind, plaintext, encryptionKey, walletId = PROFILE.walletId, opts = {}) {
  const kindConfig = kindProfile(kind)
  requireBytes(plaintext, kindConfig.plaintextBytes, `${kind} plaintext`)
  requireBytes(encryptionKey, sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES, 'WDK encryption key')
  let nonce
  let aad
  try {
    nonce = b4a.alloc(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
    if (opts.nonce === undefined) sodium.randombytes_buf(nonce)
    else {
      requireBytes(opts.nonce, nonce.byteLength, 'WDK secret-envelope nonce')
      nonce.set(opts.nonce)
    }
    aad = aadFor(kind, walletId)
    const envelope = b4a.alloc(ENVELOPE_BYTES[kind])
    MAGIC.copy(envelope, 0)
    envelope[4] = PROFILE.version
    envelope[5] = kindConfig.code
    nonce.copy(envelope, 6)
    sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      envelope.subarray(HEADER_BYTES),
      plaintext,
      aad,
      null,
      nonce,
      encryptionKey
    )
    return envelope
  } finally {
    if (nonce) sodium.sodium_memzero(nonce)
    if (aad) sodium.sodium_memzero(aad)
  }
}

function openSecret (kind, envelope, encryptionKey, walletId = PROFILE.walletId) {
  const kindConfig = kindProfile(kind)
  requireBytes(envelope, ENVELOPE_BYTES[kind], `${kind} envelope`)
  requireBytes(encryptionKey, sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES, 'WDK encryption key')
  if (!b4a.equals(envelope.subarray(0, MAGIC.byteLength), MAGIC)) throw new Error('unsupported WDK secret-envelope magic')
  if (envelope[4] !== PROFILE.version) throw new Error('unsupported WDK secret-envelope version')
  if (envelope[5] !== kindConfig.code) throw new Error('WDK secret-envelope kind mismatch')

  let aad
  let plaintext
  try {
    aad = aadFor(kind, walletId)
    plaintext = b4a.alloc(kindConfig.plaintextBytes)
    sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      plaintext,
      null,
      envelope.subarray(HEADER_BYTES),
      aad,
      envelope.subarray(6, HEADER_BYTES),
      encryptionKey
    )
    const opened = plaintext
    plaintext = null
    return opened
  } catch {
    throw new Error('WDK secret-envelope authentication failed')
  } finally {
    if (plaintext) sodium.sodium_memzero(plaintext)
    if (aad) sodium.sodium_memzero(aad)
  }
}

module.exports = {
  ENVELOPE_BYTES,
  HEADER_BYTES,
  KINDS,
  PROFILE,
  openSecret,
  sealSecret
}
