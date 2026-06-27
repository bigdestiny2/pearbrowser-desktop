import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'

import lob from '../backend/lighthouse-outbox.cjs'

const appDriveKey = 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4'
const p2pBuildersDrive = 'ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74'
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
    rawAppId: extra.authorPubkey || extra.rawAppId || 'b'.repeat(64),
    inviteKey,
    recordTypes: ['post', 'comment', 'post'],
    head: { viewLength: 42 },
    updatedAt: 1710000000000,
    ...extra
  }
}

test('makeSignedDescriptor computes scoped app id and verifies app-scoped signature', () => {
  const s = signer()
  const descriptor = lob.makeSignedDescriptor(descriptorInput({ rawAppId: s.authorPubkey }), s)

  assert.equal(descriptor.kind, 'app-outbox')
  assert.equal(descriptor.scopedAppId, lob.scopedAppIdFor(appDriveKey, s.authorPubkey))
  assert.deepEqual(descriptor.recordTypes, ['post', 'comment'])
  assert.equal(descriptor.authorPubkey, s.authorPubkey)
  assert.equal(lob.verifyDescriptor(descriptor), true)
})

test('descriptor verification fails closed on scoped id mismatch and signature tamper', () => {
  const s = signer()
  const descriptor = lob.makeSignedDescriptor(descriptorInput({ rawAppId: s.authorPubkey }), s)

  assert.equal(lob.normalizeDescriptor({ ...descriptor, scopedAppId: 'b'.repeat(64) }, { verify: true }), null)
  assert.equal(lob.verifyDescriptor({ ...descriptor, inviteKey: 'c'.repeat(64) }), false)
})

test('Peerit and P2PBuilders descriptors bind the known app drive to the author outbox id', () => {
  const s = signer()
  assert.throws(
    () => lob.makeSignedDescriptor(descriptorInput({ rawAppId: 'peerit' }), s),
    /invalid app-outbox descriptor/
  )
  assert.equal(lob.normalizeDescriptor({
    ...descriptorInput({ rawAppId: s.authorPubkey, appSlug: 'peerit', appDriveKey: p2pBuildersDrive }),
    authorPubkey: s.authorPubkey,
    sig: '1'.repeat(128)
  }), null)
})

test('storeDescriptor replaces the same descriptor key and filters queries', async () => {
  const meta = new Map()
  const personalIndex = {
    getMeta: async (key, dflt) => meta.has(key) ? meta.get(key) : dflt,
    putMeta: async (key, value) => meta.set(key, value)
  }
  const s = signer()
  const first = lob.makeSignedDescriptor(descriptorInput({ rawAppId: s.authorPubkey, updatedAt: 1 }), s)
  const second = lob.makeSignedDescriptor(descriptorInput({ rawAppId: s.authorPubkey, updatedAt: 2, recordTypes: ['community'] }), s)
  await lob.storeDescriptor(personalIndex, first)
  const stored = await lob.storeDescriptor(personalIndex, second)

  assert.equal(stored.descriptors.length, 1)
  assert.equal(stored.descriptor.updatedAt, 2)
  assert.equal(lob.filterDescriptors(stored.descriptors, { recordType: 'community' }).length, 1)
  assert.equal(lob.filterDescriptors(stored.descriptors, { recordType: 'post' }).length, 0)
})
