import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { SiteManager } = require('../backend/site-manager.js')

test('SiteManager list/export keeps relay pin evidence on site DTOs', () => {
  const manager = new SiteManager(null, null)
  const pin = { ok: true, acceptances: 2, replicatedPeers: 1, durable: true }
  manager.sites.set('site1', {
    keyHex: 'a'.repeat(64),
    name: 'Pinned Site',
    published: true,
    pin,
    createdAt: 123,
    updatedAt: 456,
    publishedAt: 234
  })

  assert.deepEqual(manager.listSites()[0].pin, pin)
  assert.equal(manager.listSites()[0].updatedAt, 456)
  assert.equal(manager.listSites()[0].publishedAt, 234)
  assert.deepEqual(manager.export().site1.pin, pin)
  assert.equal(manager.export().site1.updatedAt, 456)
  assert.equal(manager.export().site1.publishedAt, 234)
})

test('SiteManager records updated and published timestamps on site changes', async () => {
  const manager = new SiteManager(null, {
    join () {},
    flush: async () => {}
  })
  const writes = []
  manager.sites.set('site1', {
    drive: {
      discoveryKey: Buffer.alloc(32),
      put: async (path, buf) => writes.push({ path, bytes: buf.length })
    },
    keyHex: 'b'.repeat(64),
    name: 'Timestamped Site',
    published: false,
    pin: null,
    createdAt: 100,
    updatedAt: 100,
    publishedAt: null
  })

  const updated = await manager.updateSite('site1', [{ path: '/index.html', content: 'hello' }])
  assert.equal(updated.updated, 1)
  assert.ok(updated.updatedAt >= 100)
  assert.equal(writes.length, 1)

  const published = await manager.publishSite('site1')
  assert.equal(published.url, `hyper://${'b'.repeat(64)}`)
  assert.ok(published.publishedAt >= updated.updatedAt)
  assert.equal(manager.listSites()[0].publishedAt, published.publishedAt)
})
