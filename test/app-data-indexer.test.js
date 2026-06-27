import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'

import indexerMod from '../backend/app-data-indexer.cjs'

const { AppDataIndexer, docForRecord, keyFromOperation, launchUrl, verifyAppRecord } = indexerMod

const peeritDrive = 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4'
const p2pBuildersDrive = 'ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74'
const hex = (buf) => b4a.toString(buf, 'hex')
const sigFields = new Set(['_sig', '_k', '_dk', '_ns', '_alg'])

function stableStringify (value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value === undefined ? null : value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const keys = Object.keys(value).filter((key) => !sigFields.has(key)).sort()
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}'
}

function signedRecord (appDriveKey, type, data, kp = crypto.keyPair()) {
  const message = `pear.app.${appDriveKey}:peerit:${type}|${stableStringify(data)}`
  return {
    ...data,
    _sig: hex(crypto.sign(Buffer.from(message, 'utf-8'), kp.secretKey)),
    _k: hex(kp.publicKey),
    _dk: appDriveKey,
    _ns: 'peerit',
    _alg: 'ed25519'
  }
}

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
  const author = crypto.keyPair()
  const authorPubkey = hex(author.publicKey)

  const result = await indexer.indexAppend({
    appDriveKey: peeritDrive,
    rawAppId: authorPubkey,
    scopedAppId: 'a'.repeat(64),
    op: {
      type: 'post',
      data: signedRecord(peeritDrive, 'post', {
        id: 'p2p!abc',
        cid: 'abc',
        community: 'p2p',
        author: authorPubkey,
        title: 'Lighthouse persistence',
        body: 'Make app data searchable after relaunch.',
        createdAt: 1710000000000
      }, author)
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
    author: authorPubkey,
    outbox: authorPubkey,
    appDriveKey: peeritDrive,
    rawAppId: authorPubkey,
    scopedAppId: 'a'.repeat(64),
    verifiedAs: 'app-signed',
    availability: 'local-only'
  })
})

test('AppDataIndexer removes tombstoned Peerit rows from Lighthouse', async () => {
  const personalIndex = fakePersonalIndex()
  const indexer = new AppDataIndexer({ personalIndex })
  const author = crypto.keyPair()
  const authorPubkey = hex(author.publicKey)

  const result = await indexer.indexAppend({
    appDriveKey: peeritDrive,
    rawAppId: authorPubkey,
    scopedAppId: 'a'.repeat(64),
    op: {
      type: 'post',
      data: signedRecord(peeritDrive, 'post', {
        id: 'p2p!dead',
        cid: 'dead',
        community: 'p2p',
        author: authorPubkey,
        title: 'Deleted post',
        deleted: true,
        createdAt: 1710000000000
      }, author)
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
  const author = crypto.keyPair()
  const authorPubkey = hex(author.publicKey)
  const registry = {
    list: () => [{
      scopedAppId,
      appDriveKey: p2pBuildersDrive,
      rawAppId: authorPubkey,
      appSlug: 'p2pbuilders',
      authorPubkey
    }],
    get: () => null
  }
  const pages = [
    [
      { key: 'board!front', value: signedRecord(p2pBuildersDrive, 'board', { name: 'front', creator: authorPubkey, description: 'The front page', createdAt: 1710000000000 }, author) },
      { key: 'post!front!p1', value: signedRecord(p2pBuildersDrive, 'post', { board: 'front', cid: 'p1', author: authorPubkey, title: 'Startup discovery', text: 'Recovered from sync view', createdAt: 1710000001000 }, author) }
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

test('AppDataIndexer drops forged or wrong-outbox signed records before indexing', async () => {
  const personalIndex = fakePersonalIndex()
  const author = crypto.keyPair()
  const attacker = crypto.keyPair()
  const authorPubkey = hex(author.publicKey)
  const attackerPubkey = hex(attacker.publicKey)
  const meta = {
    scopedAppId: 'd'.repeat(64),
    appDriveKey: peeritDrive,
    rawAppId: authorPubkey,
    appSlug: 'peerit',
    authorPubkey
  }
  const good = signedRecord(peeritDrive, 'post', {
    id: 'p2p!ok',
    cid: 'ok',
    community: 'p2p',
    author: authorPubkey,
    title: 'Good',
    body: 'signed by the outbox author'
  }, author)
  const forged = { ...good, title: 'tampered after signing' }
  const wrongOutbox = signedRecord(peeritDrive, 'post', {
    id: 'p2p!evil',
    cid: 'evil',
    community: 'p2p',
    author: attackerPubkey,
    title: 'Wrong outbox'
  }, attacker)

  assert.equal(verifyAppRecord(meta, 'post!p2p!ok', good).ok, true)
  assert.equal(verifyAppRecord(meta, 'post!p2p!ok', forged).reason, 'signature-invalid')
  assert.equal(verifyAppRecord(meta, 'post!p2p!evil', wrongOutbox).reason, 'outbox-author-mismatch')

  const indexer = new AppDataIndexer({ personalIndex })
  assert.equal((await indexer.indexRow({ meta, key: 'post!p2p!ok', value: forged })).skipped, true)
  assert.equal((await indexer.indexRow({ meta, key: 'post!p2p!evil', value: wrongOutbox })).skipped, true)
  assert.equal(personalIndex.docs.length, 0)
})
