import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'

import lob from '../backend/lighthouse-outbox.cjs'

const appDriveKey = 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4'
const inviteKey = 'a'.repeat(64)
const hex = (buf) => b4a.toString(buf, 'hex')

function signer () {
  const kp = crypto.keyPair()
  return {
    authorPubkey: hex(kp.publicKey),
    signForApp (driveKey, payload, namespace = '') {
      const msg = b4a.concat([
        b4a.from(`pear.app.${driveKey}:${namespace}:`, 'utf-8'),
        b4a.from(payload, 'utf-8')
      ])
      return {
        signature: hex(crypto.sign(msg, kp.secretKey)),
        publicKey: hex(kp.publicKey),
        algorithm: 'ed25519'
      }
    }
  }
}

function descriptorInput (extra = {}) {
  return {
    appSlug: 'peerit',
    appDriveKey,
    rawAppId: 'peerit',
    inviteKey,
    recordTypes: ['post', 'comment', 'post'],
    head: { viewLength: 42 },
    updatedAt: 1710000000000,
    ...extra
  }
}

test('makeSignedDescriptor computes scoped app id and verifies app-scoped signature', () => {
  const s = signer()
  const descriptor = lob.makeSignedDescriptor(descriptorInput(), s)

  assert.equal(descriptor.kind, 'app-outbox')
  assert.equal(descriptor.scopedAppId, lob.scopedAppIdFor(appDriveKey, 'peerit'))
  assert.deepEqual(descriptor.recordTypes, ['post', 'comment'])
  assert.equal(descriptor.authorPubkey, s.authorPubkey)
  assert.equal(lob.verifyDescriptor(descriptor), true)
})

test('descriptor verification fails closed on scoped id mismatch and signature tamper', () => {
  const s = signer()
  const descriptor = lob.makeSignedDescriptor(descriptorInput(), s)

  assert.equal(lob.normalizeDescriptor({ ...descriptor, scopedAppId: 'b'.repeat(64) }, { verify: true }), null)
  assert.equal(lob.verifyDescriptor({ ...descriptor, inviteKey: 'c'.repeat(64) }), false)
})

test('storeDescriptor replaces the same descriptor key and filters queries', async () => {
  const meta = new Map()
  const personalIndex = {
    getMeta: async (key, dflt) => meta.has(key) ? meta.get(key) : dflt,
    putMeta: async (key, value) => meta.set(key, value)
  }
  const s = signer()
  const first = lob.makeSignedDescriptor(descriptorInput({ updatedAt: 1 }), s)
  const second = lob.makeSignedDescriptor(descriptorInput({ updatedAt: 2, recordTypes: ['community'] }), s)
  await lob.storeDescriptor(personalIndex, first)
  const stored = await lob.storeDescriptor(personalIndex, second)

  assert.equal(stored.descriptors.length, 1)
  assert.equal(stored.descriptor.updatedAt, 2)
  assert.equal(lob.filterDescriptors(stored.descriptors, { recordType: 'community' }).length, 1)
  assert.equal(lob.filterDescriptors(stored.descriptors, { recordType: 'post' }).length, 0)
})
