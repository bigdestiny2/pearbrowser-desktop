import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveAppUrl,
  scanLevelDbBuffer
} from '../scripts/recover-legacy-social-posts.mjs'

const peeritPub = 'a'.repeat(64)
const p2pbPub = 'b'.repeat(64)

function asciiEntry (key, value) {
  return Buffer.concat([
    Buffer.from('_http://127.0.0.1:60000/\x00\x01' + key),
    Buffer.from([0x81, 0x01, 0x01]),
    Buffer.from(JSON.stringify(value))
  ])
}

function utf16Entry (key, value) {
  return Buffer.concat([
    Buffer.from('_http://127.0.0.1:60833/\x00\x01' + key),
    Buffer.from([0x99, 0x02]),
    Buffer.from(JSON.stringify(value), 'utf16le')
  ])
}

test('scanLevelDbBuffer extracts ascii and utf16 localStorage outboxes', () => {
  const peeritValue = {
    'community!p2p': {
      id: 'p2p',
      slug: 'p2p',
      title: 'P2P Builders',
      creator: peeritPub,
      author: peeritPub,
      createdAt: 1
    }
  }
  const p2pbValue = {
    'post!front!abc': {
      id: 'front!abc',
      cid: 'abc',
      board: 'front',
      title: 'PearBrowser',
      author: p2pbPub,
      createdAt: 2
    }
  }

  const buffer = Buffer.concat([
    asciiEntry('peerit:outbox:' + peeritPub, peeritValue),
    Buffer.from('noise'),
    utf16Entry('p2pb:outbox:' + p2pbPub, p2pbValue)
  ])

  const peerit = scanLevelDbBuffer(buffer, 'peerit', '000003.log')
  assert.equal(peerit.errors.length, 0)
  assert.equal(peerit.outboxes.length, 1)
  assert.equal(peerit.outboxes[0].encoding, 'utf8')
  assert.equal(peerit.outboxes[0].value['community!p2p'].title, 'P2P Builders')

  const p2pb = scanLevelDbBuffer(buffer, 'p2pbuilders', '000003.log')
  assert.equal(p2pb.errors.length, 0)
  assert.equal(p2pb.outboxes.length, 1)
  assert.equal(p2pb.outboxes[0].encoding, 'utf16le')
  assert.equal(p2pb.outboxes[0].value['post!front!abc'].title, 'PearBrowser')
})

test('resolveAppUrl maps hyper URLs to the running PearBrowser proxy', () => {
  assert.equal(
    resolveAppUrl('hyper://ec6e/key?x=1', 'http://127.0.0.1:18788/'),
    'http://127.0.0.1:18788/hyper/ec6e/key?x=1'
  )
  assert.equal(
    resolveAppUrl('http://127.0.0.1:18788/hyper/ec6e/'),
    'http://127.0.0.1:18788/hyper/ec6e/'
  )
})

