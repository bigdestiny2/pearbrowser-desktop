import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import profileMod from '../backend/profile.js'
import swarmGrantsMod from '../backend/swarm-grants.js'

const { Profile } = profileMod
const { SwarmGrants } = swarmGrantsMod

test('replaceGrants and swarm replace apply synced app grants and remove stale local rows', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'app-grants-sync-'))
  const store = new Corestore(dir)
  const profile = new Profile(store)
  const swarm = new SwarmGrants(store, null)
  const oldDrive = '0'.repeat(64)
  const loginDrive = 'a'.repeat(64)
  const swarmDrive = 'b'.repeat(64)
  const topic = 'c'.repeat(64)
  const expiresAt = Date.now() + 60_000

  try {
    await profile.ready()
    await swarm.ready()
    await profile.setGrant(oldDrive, { scopes: ['profile:read'], appName: 'Old', expiresAt })
    await swarm.add(oldDrive, '1'.repeat(64), { protocol: 'old', appName: 'Old' })

    const loginApplied = await profile.replaceGrants([
      {
        driveKeyHex: loginDrive,
        scopes: ['profile:name', 'contacts:read', 'bad-scope'],
        appName: 'Peerit',
        grantedAt: 123,
        expiresAt
      },
      { driveKeyHex: loginDrive, scopes: ['profile:read'] },
      { driveKeyHex: 'bad', scopes: ['profile:name'] }
    ])
    const swarmApplied = await swarm.replace([
      {
        driveKey: swarmDrive,
        topicHex: topic,
        protocol: 'pear.swarm.v1',
        appName: 'Builder',
        grantedAt: 456,
        lastUsedAt: 789
      },
      { driveKey: swarmDrive, topicHex: topic, protocol: 'duplicate' },
      { driveKey: 'bad', topicHex: topic }
    ])

    const loginRows = await profile.listGrants()
    const swarmRows = await swarm.list()

    assert.equal(loginApplied, 1)
    assert.equal(swarmApplied, 1)
    assert.equal(await profile.getGrant(oldDrive), null)
    assert.equal(await swarm.has(oldDrive, '1'.repeat(64)), false)
    assert.deepEqual(loginRows, [{
      driveKeyHex: loginDrive,
      scopes: ['profile:name', 'contacts:read'],
      appName: 'Peerit',
      grantedAt: 123,
      expiresAt
    }])
    assert.deepEqual(swarmRows, [{
      driveKey: swarmDrive,
      topicHex: topic,
      protocol: 'pear.swarm.v1',
      appName: 'Builder',
      grantedAt: 456,
      lastUsedAt: 789
    }])
  } finally {
    await profile.close().catch(() => {})
    if (swarm._bee) await swarm._bee.close().catch(() => {})
    await store.close().catch(() => {})
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
})
