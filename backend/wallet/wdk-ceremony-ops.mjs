// One-shot mnemonic ceremony operations. Runtime-agnostic like
// wdk-worker-ops.mjs: the Bare worker shell (wdk-ceremony-worker.mjs) and the
// Node tests both drive this module, so the ceremony protocol and zeroing
// discipline live in exactly one place.
//
// A ceremony worklet is single-purpose and one-shot: it runs exactly one
// create/restore/backup ceremony and is terminated by the host right after
// finishMnemonicCeremony settles. It never touches the network, WDK accounts
// or the operational wallet seed.
//
// Handed-off buffers (the begin mnemonic, the finish vault material) are
// deliberately NOT zeroed by the worker: bare-channel serializes results
// asynchronously, so zeroing a returned buffer could race the structured
// clone and destroy the bytes in flight. The host owns and overwrites its
// copies; the worker-side copies are reclaimed when the engine terminates
// this one-shot thread immediately after the ceremony. Everything retained
// past its need — entropy, seeds, input copies, cancelled material — is
// zeroed here on every path.

import b4a from 'b4a'
import sodium from 'sodium-universal'
import bip39 from 'bip39-mnemonic'
import secretEnvelope from './wdk-secret-envelope.cjs'

const CEREMONY_WORKER_ERROR_CODES = new Set([
  'bad-request',
  'ceremony-active',
  'ceremony-concluded',
  'ceremony-mismatch',
  'ceremony-not-active',
  'method-not-allowed'
])

function fail (code) {
  const error = new Error(code)
  error.code = code
  throw error
}

function isBytes (value) {
  return b4a.isBuffer(value) || value instanceof Uint8Array
}

function zero (value) {
  if (isBytes(value)) value.fill(0)
}

function randomBytes (length) {
  const bytes = b4a.alloc(length)
  sodium.randombytes_buf(bytes)
  return bytes
}

function newCeremonyId () {
  return 'wc_' + b4a.toString(randomBytes(16), 'hex')
}

// Derives and seals the vault material for a validated mnemonic string.
// Returns mutable binary envelopes + a fresh random 32-byte key; the pinned
// upstream base64-string helpers are never involved. All plaintext
// intermediates (entropy, seed) are zeroed before returning, on every path.
async function vaultMaterialFromMnemonic (mnemonic) {
  const entropy = bip39.mnemonicToEntropy(mnemonic) // throws on bad checksum
  let seed = null
  let encryptionKey = null
  let handedOff = false
  try {
    // pb-wdk-secrets-v1 entropy envelopes hold exactly 32 bytes, so only
    // 24-word wallets can be persisted and backed up — same constraint the
    // engine enforces on the UI restore path.
    if (entropy.byteLength !== secretEnvelope.KINDS.entropy.plaintextBytes) fail('bad-request')
    seed = await bip39.mnemonicToSeed(mnemonic)
    encryptionKey = randomBytes(32)
    const material = {
      encryptedSeed: secretEnvelope.sealSecret('seed', seed, encryptionKey),
      encryptedEntropy: secretEnvelope.sealSecret('entropy', entropy, encryptionKey),
      encryptionKey
    }
    handedOff = true
    return material
  } finally {
    zero(entropy)
    if (seed) zero(seed)
    if (encryptionKey && !handedOff) zero(encryptionKey)
  }
}

function zeroMaterial (material) {
  if (!material) return
  zero(material.encryptedSeed)
  zero(material.encryptedEntropy)
  zero(material.encryptionKey)
}

function createCeremonyOps () {
  let ceremony = null
  let concluded = false

  function destroy (active) {
    zero(active.mnemonic)
    zeroMaterial(active.material)
  }

  async function beginGenesis (type, mnemonic) {
    ceremony = { type, id: newCeremonyId(), mnemonic, material: null }
    try {
      ceremony.material = await vaultMaterialFromMnemonic(b4a.toString(mnemonic, 'utf8'))
    } catch (error) {
      destroy(ceremony)
      ceremony = null
      throw error
    }
    return ceremony
  }

  async function beginMnemonicCeremony ({ type, mnemonic, encryptedEntropy, encryptionKey } = {}) {
    if (concluded) fail('ceremony-concluded')
    if (ceremony) fail('ceremony-active')

    if (type === 'create') {
      // 24 words from 32 bytes of CSPRNG entropy (bip39-mnemonic default).
      const generated = bip39.generateMnemonic()
      const active = await beginGenesis(type, b4a.from(generated, 'utf8'))
      return { ceremonyId: active.id, mnemonic: active.mnemonic }
    }

    if (type === 'restore') {
      if (!isBytes(mnemonic) || mnemonic.byteLength === 0) fail('bad-request')
      const restored = bip39.normalizeMnemonic(b4a.toString(mnemonic, 'utf8'))
      zero(mnemonic) // consume the worker-side copy immediately
      if (!bip39.validateMnemonic(restored)) fail('bad-request')
      const active = await beginGenesis(type, b4a.from(restored, 'utf8'))
      // Restore never echoes the mnemonic back across the boundary.
      return { ceremonyId: active.id }
    }

    if (type === 'backup') {
      if (!isBytes(encryptedEntropy) || encryptedEntropy.byteLength !== secretEnvelope.ENVELOPE_BYTES.entropy) {
        fail('bad-request')
      }
      if (!isBytes(encryptionKey) || encryptionKey.byteLength !== 32) fail('bad-request')
      let entropy = null
      try {
        try {
          entropy = secretEnvelope.openSecret('entropy', encryptedEntropy, encryptionKey)
        } catch {
          fail('bad-request')
        }
        const recovered = bip39.entropyToMnemonic(entropy)
        ceremony = { type, id: newCeremonyId(), mnemonic: b4a.from(recovered, 'utf8'), material: null }
        return { ceremonyId: ceremony.id, mnemonic: ceremony.mnemonic }
      } finally {
        zero(entropy)
        zero(encryptedEntropy)
        zero(encryptionKey)
      }
    }

    fail('bad-request')
  }

  async function finishMnemonicCeremony ({ ceremonyId, outcome } = {}) {
    if (!ceremony) fail('ceremony-not-active')
    if (typeof ceremonyId !== 'string' || ceremonyId !== ceremony.id) fail('ceremony-mismatch')
    if (outcome !== 'complete' && outcome !== 'cancel') fail('bad-request')

    const active = ceremony
    ceremony = null
    concluded = true

    if (outcome === 'complete' && (active.type === 'create' || active.type === 'restore')) {
      const { encryptedSeed, encryptedEntropy, encryptionKey } = active.material
      zero(active.mnemonic)
      // Ownership of the three mutable vault-material buffers passes to the
      // host (see the module header for why they are not zeroed here).
      return { completed: true, encryptedSeed, encryptedEntropy, encryptionKey }
    }

    // Cancel, and every backup finish, release nothing: overwrite all of it.
    destroy(active)
    return { completed: true }
  }

  return {
    beginMnemonicCeremony,
    finishMnemonicCeremony
  }
}

export { CEREMONY_WORKER_ERROR_CODES, createCeremonyOps }
