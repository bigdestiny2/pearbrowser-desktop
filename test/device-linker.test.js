// End-to-end + unit test for backend/device-linker.js (blind-pairing device
// linking, adopted from hyper-identity and hardened with an approval gate).
//
// device-linker.js is CommonJS and depends only on blind-pairing + b4a +
// bip39-mnemonic (all Node-loadable), so unlike identity.js it CAN be imported
// under Node and exercised over a real hyperdht testnet with two Hyperswarms.
import test from 'node:test'
import assert from 'node:assert/strict'
import createTestnet from 'hyperdht/testnet.js'
import Hyperswarm from 'hyperswarm'
import bip39 from 'bip39-mnemonic'
import b4a from 'b4a'
import linkerMod from '../backend/device-linker.js'

const { DeviceLinker } = linkerMod

// a stub Identity: exposes the 32-byte entropy and records what gets restored
function stubIdentity (entropy) {
  return {
    _restored: null,
    getEntropy () { return b4a.from(entropy) },
    async restoreFromMnemonic (m) { this._restored = m }
  }
}

test('approval gate fails closed (no autoAccept, no onRequest => deny)', async () => {
  const l = new DeviceLinker({}, { identity: stubIdentity(b4a.alloc(32)) })
  assert.equal(await l._shouldApprove({ device: 'x' }), false)

  const l2 = new DeviceLinker({}, { identity: stubIdentity(b4a.alloc(32)), autoAccept: true })
  assert.equal(await l2._shouldApprove({ device: 'x' }), true)

  let sawInfo = null
  const l3 = new DeviceLinker({}, {
    identity: stubIdentity(b4a.alloc(32)),
    onRequest: async (info) => { sawInfo = info; return info.device === 'trusted' }
  })
  assert.equal(await l3._shouldApprove({ device: 'trusted' }), true)
  assert.equal(await l3._shouldApprove({ device: 'stranger' }), false)
  assert.deepEqual(sawInfo, { device: 'stranger' })
})

test('createInvite rejects a non-32-byte (pre-v2) identity', async () => {
  const l = new DeviceLinker({}, { identity: stubIdentity(b4a.alloc(16)) })
  await assert.rejects(() => l.createInvite(), /32-byte/)
})

test('end-to-end: root seed transfers source -> target over a testnet', async () => {
  const testnet = await createTestnet(3)
  const bootstrap = testnet.bootstrap

  // real 24-word identity on the source device
  const entropy = b4a.from(bip39.mnemonicToEntropy(bip39.generateMnemonic()))
  const expectedMnemonic = bip39.entropyToMnemonic(entropy)

  const srcSwarm = new Hyperswarm({ bootstrap })
  const tgtSwarm = new Hyperswarm({ bootstrap })

  const srcId = stubIdentity(entropy)
  const tgtId = stubIdentity(b4a.alloc(32)) // target starts with a throwaway identity

  const source = new DeviceLinker(srcSwarm, { identity: srcId, autoAccept: true, poll: 1000 })
  const target = new DeviceLinker(tgtSwarm, { identity: tgtId, poll: 1000 })

  try {
    const { invite, done } = await source.createInvite()
    const joined = await target.joinWithInvite(invite, { device: 'laptop' })

    await done // source confirms the transfer completed

    assert.equal(joined.mnemonic, expectedMnemonic, 'target reconstructed the source phrase')
    assert.equal(joined.restartRequired, true)
    assert.equal(tgtId._restored, expectedMnemonic, 'target adopted the linked identity')
  } finally {
    await source.close().catch(() => {})
    await target.close().catch(() => {})
    await srcSwarm.destroy().catch(() => {})
    await tgtSwarm.destroy().catch(() => {})
    await testnet.destroy().catch(() => {})
  }
})
