// Phase 5 — IndexRoomClient: read-only consumer of a relay index room. Uses a
// stubbed `sheets` handle (no swarm/Corestore), like sheets-catalog-query.test.
import test from 'node:test'
import assert from 'node:assert/strict'
import z32 from 'z32'
import b4a from 'b4a'
import mod from '../backend/index-room-client.js'

const { IndexRoomClient, manifestRowToApp, decodeIndexLink } = mod

const KEY = 'a'.repeat(64)
const PUB = 'b'.repeat(64)

// stub: listSchemas() + list(sid, opts) over canned rows keyed by schema name.
function withSheets (client, schemaRows) {
  const names = Object.keys(schemaRows)
  client.sheets = {
    async listSchemas () { return names.map((name) => ({ name, schemaId: 'sid:' + name })) },
    async list (sid, opts) {
      const name = sid.slice('sid:'.length)
      return schemaRows[name] || []
    }
  }
  return client
}

test('manifestRowToApp maps app-manifest fields; null on corrupt', () => {
  const app = manifestRowToApp({ uuid: 'u1', json: { appId: 'cool', name: 'Cool', driveKey: KEY, type: 'standalone', version: '1.0.0', publisherPubkey: PUB } })
  assert.equal(app.id, 'cool')
  assert.equal(app.name, 'Cool')
  assert.equal(app.driveKey, KEY)
  assert.equal(app.type, 'standalone')
  assert.equal(app.verification, 'relay-listed')
  assert.equal(app.publisherKey, PUB)
  assert.equal(manifestRowToApp({ uuid: 'x', json: null }), null)
  assert.equal(manifestRowToApp(null), null)
})

test('manifestRowToApp infers type from driveKey vs link', () => {
  assert.equal(manifestRowToApp({ uuid: 'u', json: { name: 'X', driveKey: KEY } }).type, 'standalone')
  assert.equal(manifestRowToApp({ uuid: 'u', json: { name: 'Y', link: 'hyper://z' } }).type, 'hypersite')
})

test('decodeIndexLink accepts bare z32 + strips hiveindex://', () => {
  const link = z32.encode(b4a.alloc(32, 7))
  const a = decodeIndexLink(link)
  const b = decodeIndexLink('hiveindex://' + link)
  assert.equal(a.keyHex, b.keyHex)
  assert.equal(a.keyHex.length, 64)
  assert.throws(() => decodeIndexLink('not-a-link'))
})

test('listApps maps app-manifest rows to DTOs', async () => {
  const c = withSheets(new IndexRoomClient(null, null), {
    'app-manifest': [
      { uuid: 'u1', json: { appId: 'one', name: 'One', driveKey: KEY, type: 'standalone' } },
      { uuid: 'u2', json: { appId: 'two', name: 'Two', link: 'hyper://x', type: 'hypersite' } },
      null // corrupt → dropped
    ]
  })
  const apps = await c.listApps()
  assert.equal(apps.length, 2)
  assert.deepEqual(apps.map(a => a.id).sort(), ['one', 'two'])
})

test('listRelayDirectory without a verifier returns rows marked verified:null', async () => {
  const c = withSheets(new IndexRoomClient(null, null), {
    'relay-directory': [{ uuid: 'r1', json: { pubkey: PUB, gatewayUrl: 'https://a.relay', doc: { x: 1 } } }]
  })
  const rows = await c.listRelayDirectory()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].gatewayUrl, 'https://a.relay')
  assert.equal(rows[0].verified, null)
})

test('listRelayDirectory with a verifier drops rows whose doc fails', async () => {
  const verify = (doc) => doc && doc.good === true
  const c = withSheets(new IndexRoomClient(null, null, { verify }), {
    'relay-directory': [
      { uuid: 'r1', json: { pubkey: PUB, gatewayUrl: 'https://good.relay', doc: { good: true } } },
      { uuid: 'r2', json: { pubkey: 'c'.repeat(64), gatewayUrl: 'https://bad.relay', doc: { good: false } } },
      { uuid: 'r3', json: { pubkey: 'd'.repeat(64), gatewayUrl: 'https://nodoc.relay' } } // no doc → dropped
    ]
  })
  const rows = await c.listRelayDirectory()
  assert.deepEqual(rows.map(r => r.gatewayUrl), ['https://good.relay'])
  assert.equal(rows[0].verified, true)
})

test('missing schema → empty list (relay without that schema)', async () => {
  const c = withSheets(new IndexRoomClient(null, null), {}) // no schemas
  assert.deepEqual(await c.listApps(), [])
  assert.deepEqual(await c.listRelayDirectory(), [])
  assert.deepEqual(await c.listVerifications(), [])
})
