import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import registryMod from '../backend/app-sync-registry.cjs'

const { AppSyncRegistry, appSlugForDrive } = registryMod

const peeritDrive = 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4'
const p2pBuildersDrive = 'ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74'

function tmp () {
  return mkdtempSync(join(tmpdir(), 'pear-app-sync-registry-'))
}

test('AppSyncRegistry persists scoped app sync metadata with derived app slugs', () => {
  const dir = tmp()
  try {
    const registry = new AppSyncRegistry({ storagePath: dir })
    const record = registry.remember({
      scopedAppId: 'a'.repeat(64),
      appDriveKey: peeritDrive.toUpperCase(),
      rawAppId: 'peerit',
      inviteKey: 'b'.repeat(64),
      lastSeenAt: 1234
    })

    assert.equal(record.appDriveKey, peeritDrive)
    assert.equal(record.appSlug, 'peerit')
    assert.equal(record.createdAt, 1234)
    assert.equal(record.updatedAt, 1234)

    const reloaded = new AppSyncRegistry({ storagePath: dir })
    assert.deepEqual(reloaded.get('a'.repeat(64)), record)
    assert.deepEqual(reloaded.list({ appSlug: 'peerit' }), [record])
    assert.deepEqual(reloaded.list({ appDriveKey: p2pBuildersDrive }), [])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('AppSyncRegistry ignores corrupt or unsafe records on load', () => {
  const dir = tmp()
  try {
    writeFileSync(join(dir, 'pear-app-sync-registry.json'), JSON.stringify({
      version: 1,
      groups: {
        bad: { scopedAppId: '../bad', appDriveKey: peeritDrive, rawAppId: 'peerit', inviteKey: 'b'.repeat(64) },
        good: {
          scopedAppId: 'c'.repeat(64),
          appDriveKey: p2pBuildersDrive,
          rawAppId: 'p2pbuilders',
          inviteKey: 'd'.repeat(64),
          appSlug: 'P2PBuilders'
        }
      }
    }))

    const registry = new AppSyncRegistry({ storagePath: dir })
    assert.equal(registry.list().length, 1)
    assert.equal(registry.get('c'.repeat(64)).appSlug, 'p2pbuilders')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('AppSyncRegistry records relay pin evidence for a sync group', () => {
  const dir = tmp()
  try {
    const registry = new AppSyncRegistry({ storagePath: dir })
    registry.remember({
      scopedAppId: 'e'.repeat(64),
      appDriveKey: peeritDrive,
      rawAppId: 'peerit',
      inviteKey: 'f'.repeat(64),
      lastSeenAt: 1000
    })
    const record = registry.recordPinEvidence('e'.repeat(64), {
      kind: 'app-outbox',
      keyHex: 'f'.repeat(64),
      state: 'relay-confirmed',
      seedAcceptances: 2,
      durable: true,
      checkedAt: 2000
    })

    assert.equal(record.pin.state, 'relay-confirmed')
    assert.equal(record.updatedAt, 2000)
    assert.equal(new AppSyncRegistry({ storagePath: dir }).get('e'.repeat(64)).pin.durable, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('appSlugForDrive recognizes live featured app drives', () => {
  assert.equal(appSlugForDrive(peeritDrive), 'peerit')
  assert.equal(appSlugForDrive(p2pBuildersDrive), 'p2pbuilders')
  assert.equal(appSlugForDrive('f'.repeat(64)), null)
})
