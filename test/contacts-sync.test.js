import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import contactsMod from '../backend/contacts.js'

const { Contacts } = contactsMod

test('replaceContacts applies a synced snapshot and preserves trusted bindings only after signature verification', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'contacts-sync-'))
  const store = new Corestore(dir)
  const root = 'a'.repeat(64)
  const bindingKey = 'b'.repeat(64)
  const goodSig = 'cd'.repeat(64)
  const verify = (payload, signature, pubkey) =>
    pubkey === root &&
    signature === goodSig &&
    payload === `pear.contact:${root}:Maya:${bindingKey}`
  const contacts = new Contacts(store, { verify, now: () => 999 })

  try {
    await contacts.ready()
    await contacts.add({ pubkey: 'f'.repeat(64), displayName: 'Old local contact' })

    const applied = await contacts.replaceContacts([
      {
        pubkey: root,
        displayName: 'Maya',
        avatar: 'hyper://avatar',
        tags: ['friend'],
        notes: 'P2P builder',
        signature: goodSig,
        verifiedAt: 123,
        bindingKey,
        addedAt: 1,
        updatedAt: 2
      },
      {
        pubkey: 'e'.repeat(64),
        displayName: 'Unsigned',
        signature: '00',
        bindingKey: 'd'.repeat(64),
        verifiedAt: 777
      },
      { pubkey: root, displayName: 'Duplicate' },
      { pubkey: 'not-a-key', displayName: 'Bad' }
    ])

    const rows = await contacts.list({ limit: 10 })
    const maya = await contacts.lookup(root)
    const unsigned = await contacts.lookup('e'.repeat(64))

    assert.equal(applied, 2)
    assert.equal(rows.some((row) => row.displayName === 'Old local contact'), false)
    assert.equal(maya.bindingKey, bindingKey)
    assert.equal(maya.signature, goodSig)
    assert.equal(maya.verifiedAt, 123)
    assert.equal(maya.addedAt, 1)
    assert.equal(maya.updatedAt, 2)
    assert.equal(unsigned.displayName, 'Unsigned')
    assert.equal(unsigned.bindingKey, null)
    assert.equal(unsigned.signature, null)
    assert.equal(unsigned.verifiedAt, null)
  } finally {
    await contacts.close().catch(() => {})
    await store.close().catch(() => {})
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
})
