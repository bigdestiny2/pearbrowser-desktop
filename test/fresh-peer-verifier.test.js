import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { normalizeFreshPeerInput, spreadSample, verifyFreshPeer } = require('../backend/fresh-peer-verifier.cjs')

test('fresh-peer verifier normalizes links and spread-samples entries', () => {
  const key = 'a'.repeat(64)
  assert.deepEqual(normalizeFreshPeerInput({
    link: 'hyper://' + key + '/index.html',
    name: 'Demo',
    samples: 500,
    timeout: 0
  }), {
    key,
    name: 'Demo',
    samples: 100,
    timeout: 90
  })

  assert.deepEqual(spreadSample(['a', 'b', 'c', 'd', 'e'], 3), ['a', 'c', 'e'])
})

test('verifyFreshPeer uses isolated storage and returns verifier evidence', async () => {
  const key = 'b'.repeat(64)
  const calls = []

  class FakeSwarm extends EventEmitter {
    join () {
      queueMicrotask(() => this.emit('connection', { id: 'peer' }))
    }
    async destroy () { calls.push('swarm.destroy') }
  }

  class FakeStore {
    constructor (storage) { this.storage = storage }
    replicate () { calls.push('replicate') }
    async close () { calls.push('store.close') }
  }

  class FakeDrive {
    constructor () {
      this.discoveryKey = Buffer.from('discovery')
      this.core = {
        length: 9,
        update: async () => {}
      }
    }
    async ready () {}
    async * list () {
      yield { key: '/a.txt', value: { blob: { byteLength: 2 } } }
      yield { key: '/b.txt', value: { blob: { byteLength: 3 } } }
    }
    async get (path) {
      return Buffer.from(path === '/a.txt' ? 'aa' : 'bbb')
    }
  }

  const result = await verifyFreshPeer({ key, name: 'Verifier Demo', samples: 2 }, {
    Hyperswarm: FakeSwarm,
    Corestore: FakeStore,
    Hyperdrive: FakeDrive,
    b4a: { from: (...args) => Buffer.from(...args) },
    fs: {
      mkdirSync: (path) => calls.push(['mkdir', path]),
      rmSync: (path) => calls.push(['rm', path])
    },
    storagePath: '/tmp/fresh-peer-test'
  })

  assert.equal(result.ok, true)
  assert.equal(result.source, 'in-app-fresh-peer')
  assert.equal(result.isolated, true)
  assert.equal(result.peers, 1)
  assert.equal(result.entries, 2)
  assert.equal(result.sampled, 2)
  assert.equal(result.blobsPresent, 2)
  assert.equal(result.bytes, 5)
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'mkdir'))
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'rm'))
  assert.ok(calls.includes('swarm.destroy'))
  assert.ok(calls.includes('store.close'))
})
