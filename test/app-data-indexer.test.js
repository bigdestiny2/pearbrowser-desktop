import test from 'node:test'
import assert from 'node:assert/strict'

import indexerMod from '../backend/app-data-indexer.cjs'

const { AppDataIndexer, docForRecord, keyFromOperation, launchUrl } = indexerMod

const peeritDrive = 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4'
const p2pBuildersDrive = 'ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74'

function fakePersonalIndex () {
  const docs = []
  const removed = []
  return {
    docs,
    removed,
    async indexDoc (doc) {
      docs.push(doc)
      return 'doc-' + docs.length
    },
    async removeDoc (docId) {
      removed.push(docId)
      return true
    }
  }
}

test('keyFromOperation mirrors the Pear sync generic reducer key shape', () => {
  assert.equal(
    keyFromOperation({ type: 'post', data: { id: 'p2p!abc' } }),
    'post!p2p!abc'
  )
  assert.equal(
    keyFromOperation({ type: 'product:create', data: { id: 'sku-1' } }),
    'product!create!sku-1'
  )
  assert.equal(keyFromOperation({ type: 'post', data: {} }), null)
})

test('AppDataIndexer maps Peerit posts to launchable Lighthouse documents', async () => {
  const personalIndex = fakePersonalIndex()
  const indexer = new AppDataIndexer({ personalIndex })

  const result = await indexer.indexAppend({
    appDriveKey: peeritDrive,
    rawAppId: 'peerit',
    scopedAppId: 'a'.repeat(64),
    op: {
      type: 'post',
      data: {
        id: 'p2p!abc',
        cid: 'abc',
        community: 'p2p',
        title: 'Lighthouse persistence',
        body: 'Make app data searchable after relaunch.',
        createdAt: 1710000000000
      }
    }
  })

  assert.deepEqual(result, { indexed: true, docId: 'doc-1' })
  assert.equal(personalIndex.docs.length, 1)
  assert.equal(personalIndex.docs[0].driveKey, launchUrl(peeritDrive, '/r/p2p/comments/abc'))
  assert.equal(personalIndex.docs[0].path, '/')
  assert.match(personalIndex.docs[0].title, /Lighthouse persistence/)
  assert.match(personalIndex.docs[0].body, /peerit post/)
  assert.deepEqual(personalIndex.docs[0].source, {
    kind: 'app-data',
    appSlug: 'peerit',
    recordType: 'post',
    recordKey: 'post!p2p!abc',
    author: '',
    appDriveKey: peeritDrive,
    rawAppId: 'peerit',
    scopedAppId: 'a'.repeat(64),
    verifiedAs: 'browser-observed',
    availability: 'local-only'
  })
})

test('AppDataIndexer removes tombstoned Peerit rows from Lighthouse', async () => {
  const personalIndex = fakePersonalIndex()
  const indexer = new AppDataIndexer({ personalIndex })

  const result = await indexer.indexAppend({
    appDriveKey: peeritDrive,
    rawAppId: 'peerit',
    scopedAppId: 'a'.repeat(64),
    op: {
      type: 'post',
      data: {
        id: 'p2p!dead',
        cid: 'dead',
        community: 'p2p',
        title: 'Deleted post',
        deleted: true,
        createdAt: 1710000000000
      }
    }
  })

  assert.equal(result.removed, true)
  assert.equal(personalIndex.docs.length, 0)
  assert.equal(personalIndex.removed.length, 1)
})

test('docForRecord maps P2PBuilders boards, posts, and comments to app routes', () => {
  const meta = { appDriveKey: p2pBuildersDrive, appSlug: 'p2pbuilders' }

  assert.equal(
    docForRecord(meta, 'board!front', { name: 'front', description: 'The front page' }).driveKey,
    launchUrl(p2pBuildersDrive, '/b/front')
  )
  assert.equal(
    docForRecord(meta, 'post!front!p1', { board: 'front', cid: 'p1', title: 'A clean bridge', text: 'Indexed data' }).driveKey,
    launchUrl(p2pBuildersDrive, '/b/front/item/p1')
  )
  assert.equal(
    docForRecord(meta, 'comment!p1!c1', { postCid: 'p1', cid: 'c1', board: 'front', body: 'threaded reply' }).driveKey,
    launchUrl(p2pBuildersDrive, '/b/front/item/p1')
  )
})

test('AppDataIndexer reindexes known app sync groups on startup', async () => {
  const personalIndex = fakePersonalIndex()
  const scopedAppId = 'c'.repeat(64)
  const registry = {
    list: () => [{
      scopedAppId,
      appDriveKey: p2pBuildersDrive,
      rawAppId: 'p2pbuilders',
      appSlug: 'p2pbuilders'
    }],
    get: () => null
  }
  const pages = [
    [
      { key: 'board!front', value: { name: 'front', description: 'The front page', createdAt: 1710000000000 } },
      { key: 'post!front!p1', value: { board: 'front', cid: 'p1', title: 'Startup discovery', text: 'Recovered from sync view', createdAt: 1710000001000 } }
    ],
    []
  ]
  const bridge = {
    calls: [],
    async range (appId, opts) {
      this.calls.push([appId, opts])
      return pages.shift()
    }
  }
  const indexer = new AppDataIndexer({ personalIndex, registry })
  const summary = await indexer.reindexKnownGroups(bridge, { pageSize: 2 })

  assert.equal(summary.groups, 1)
  assert.equal(summary.scanned, 2)
  assert.equal(summary.indexed, 2)
  assert.equal(personalIndex.docs.length, 2)
  assert.deepEqual(bridge.calls[0], [scopedAppId, { gt: undefined, limit: 2 }])
})
