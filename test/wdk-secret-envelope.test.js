import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const envelope = require('../backend/wallet/wdk-secret-envelope.cjs')

const key = Buffer.alloc(32, 0x11)
const seed = Buffer.alloc(64, 0x22)
const entropy = Buffer.alloc(32, 0x44)

test('WDK secret envelopes have fixed binary layouts and deterministic vectors', () => {
  const sealedSeed = envelope.sealSecret('seed', seed, key, 'wdk-v1', {
    nonce: Buffer.alloc(24, 0x33)
  })
  assert.equal(sealedSeed.byteLength, envelope.ENVELOPE_BYTES.seed)
  assert.equal(
    sealedSeed.toString('hex'),
    '504257530101333333333333333333333333333333333333333333333333988655ab5a492115a0b60a86eccfdcf4a9655edc6e9156aec946b458b235dd638dc4faec8beda066e361fd4f404b9c791b30ba2fd3efef3e4d80adbebd4549e30d50c2e1e874f5f484d82d88596322b8'
  )
  const openedSeed = envelope.openSecret('seed', sealedSeed, key)
  assert.deepEqual(openedSeed, seed)
  openedSeed.fill(0)

  const sealedEntropy = envelope.sealSecret('entropy', entropy, key, 'wdk-v1', {
    nonce: Buffer.alloc(24, 0x55)
  })
  assert.equal(sealedEntropy.byteLength, envelope.ENVELOPE_BYTES.entropy)
  const openedEntropy = envelope.openSecret('entropy', sealedEntropy, key)
  assert.deepEqual(openedEntropy, entropy)
  openedEntropy.fill(0)
})

test('WDK secret envelopes reject tamper, kind confusion, and wallet substitution', () => {
  const sealed = envelope.sealSecret('seed', seed, key, 'wdk-v1', {
    nonce: Buffer.alloc(24, 0x66)
  })
  const tampered = Buffer.from(sealed)
  tampered[tampered.length - 1] ^= 1
  assert.throws(() => envelope.openSecret('seed', tampered, key), /authentication failed/)
  assert.throws(() => envelope.openSecret('seed', sealed, key, 'another-wallet'), /authentication failed/)
  assert.throws(() => envelope.openSecret('entropy', sealed, key), /exactly/)
})
