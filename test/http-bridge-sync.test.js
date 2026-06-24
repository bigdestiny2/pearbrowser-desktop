import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import hypercoreCrypto from 'hypercore-crypto'
import b4a from 'b4a'

const { HttpBridge } = (await import('../backend/http-bridge.js')).default

const driveKey = 'a'.repeat(64)
const appPubkey = 'b'.repeat(64)
// Mirror HttpBridge._scopeAppId: a per-drive 64-hex HASH, not a `driveKey:appId`
// concat (which is ≥65 chars and exceeds the Autobase bridge's 64-char appId cap —
// the bug that silently broke every sync call and forced apps into dev mode).
const scope = (appId) => b4a.toString(hypercoreCrypto.data(b4a.from(`${driveKey}:${appId}`)), 'hex')

function makeReq (method, path, { headers = {}, body } = {}) {
  const req = new EventEmitter()
  req.method = method
  req.headers = headers
  req.socket = { remoteAddress: '127.0.0.1' }
  req.destroy = () => { req.destroyed = true }
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
  return req
}

function makeRes () {
  return {
    statusCode: 200,
    headers: {},
    chunks: [],
    ended: false,
    setHeader (name, value) { this.headers[name.toLowerCase()] = value },
    write (chunk) { if (chunk) this.chunks.push(Buffer.from(chunk)) },
    end (chunk) {
      if (chunk) this.chunks.push(Buffer.from(chunk))
      this.ended = true
      this.body = Buffer.concat(this.chunks).toString('utf8')
      this.json = this.body ? JSON.parse(this.body) : null
    }
  }
}

async function request (bridge, method, path, opts) {
  const req = makeReq(method, path, opts)
  const res = makeRes()
  const url = new URL(path, 'http://127.0.0.1')
  const handled = await bridge.handle(req, res, url)
  return { handled, req, res }
}

function makeBridge () {
  const calls = []
  const registryRecords = []
  const indexedAppends = []
  const pinnedGroups = []
  const bridge = {
    async createSyncGroup (appId) {
      calls.push(['createSyncGroup', appId])
      return { inviteKey: 'c'.repeat(64), appId, writerPublicKey: 'd'.repeat(64) }
    },
    async joinSyncGroup (appId, inviteKey) {
      calls.push(['joinSyncGroup', appId, inviteKey])
      return { inviteKey, appId, writerPublicKey: 'e'.repeat(64) }
    },
    async append (appId, op) {
      calls.push(['append', appId, op])
      return { ok: true }
    },
    async get (appId, key) {
      calls.push(['get', appId, key])
      return { id: key, value: 7 }
    },
    async list (appId, prefix, opts) {
      calls.push(['list', appId, prefix, opts])
      return [{ key: `${prefix}!1`, value: { id: 1 } }]
    },
    getSyncStatus (appId) {
      calls.push(['status', appId])
      return { appId, inviteKey: 'f'.repeat(64), writerCount: 1, viewLength: 2 }
    }
  }
  const http = new HttpBridge(bridge, null, null, {
    validateToken: (token) => token === 'good' ? driveKey : null,
    appSyncRegistry: {
      remember (record) {
        registryRecords.push(record)
        return record
      }
    },
    getAppDataIndexer: () => ({
      async indexAppend (record) {
        indexedAppends.push(record)
        return { indexed: true, docId: 'doc-1' }
      }
    }),
    syncPinGroup: async (record, opts) => {
      pinnedGroups.push([record, opts])
      return { ok: true, scopedAppId: scope(record.rawAppId), availability: { available: 'seeded' } }
    },
    identity: {
      getAppKeypair (keyHex) {
        assert.equal(keyHex, driveKey)
        return { publicKey: Buffer.from(appPubkey, 'hex') }
      },
      signForApp (keyHex, payload, namespace) {
        assert.equal(keyHex, driveKey)
        return {
          signature: '1'.repeat(128),
          publicKey: appPubkey,
          driveKey,
          namespace,
          payload
        }
      }
    }
  })
  return { http, calls, registryRecords, indexedAppends, pinnedGroups }
}

test('HttpBridge sync API requires a token and scopes app IDs to the drive', async () => {
  const { http, calls, registryRecords } = makeBridge()

  const unauthorized = await request(http, 'POST', '/api/sync/create', {
    body: { appId: 'shop' }
  })
  assert.equal(unauthorized.handled, true)
  assert.equal(unauthorized.res.statusCode, 401)
  assert.equal(unauthorized.res.json.error, 'Unauthorized')

  const badApp = await request(http, 'POST', '/api/sync/create', {
    headers: { 'x-pear-token': 'good' },
    body: { appId: '../shop' }
  })
  assert.equal(badApp.res.statusCode, 400)
  assert.equal(badApp.res.json.error, 'Invalid appId format')

  const create = await request(http, 'POST', '/api/sync/create', {
    headers: { 'x-pear-token': 'good' },
    body: { appId: 'shop' }
  })
  assert.equal(create.res.statusCode, 200)
  assert.equal(create.res.json.appId, 'shop')
  assert.ok(scope('shop').length <= 64, 'scoped appId must fit the bridge 64-char limit')
  assert.deepEqual(calls, [['createSyncGroup', scope('shop')]])
  assert.deepEqual(registryRecords, [{
    scopedAppId: scope('shop'),
    appDriveKey: driveKey,
    rawAppId: 'shop',
    inviteKey: 'c'.repeat(64)
  }])
})

test('HttpBridge routes sync operations and identity through the authenticated app scope', async () => {
  const { http, calls, registryRecords, indexedAppends } = makeBridge()
  const auth = { 'x-pear-token': 'good' }

  const inviteKey = '1'.repeat(64)
  const join = await request(http, 'POST', '/api/sync/join', {
    headers: auth,
    body: { appId: 'shop', inviteKey }
  })
  assert.equal(join.res.statusCode, 200)
  assert.equal(join.res.json.appId, 'shop')

  const append = await request(http, 'POST', '/api/sync/append', {
    headers: auth,
    body: { appId: 'shop', op: { type: 'product:create', data: { id: 'p1' } } }
  })
  assert.deepEqual(append.res.json, { ok: true })

  const get = await request(http, 'GET', '/api/sync/get?appId=shop&key=products!p1', { headers: auth })
  assert.deepEqual(get.res.json, { id: 'products!p1', value: 7 })

  const list = await request(http, 'GET', '/api/sync/list?appId=shop&prefix=products&limit=5000', { headers: auth })
  assert.deepEqual(list.res.json, [{ key: 'products!1', value: { id: 1 } }])

  const status = await request(http, 'GET', '/api/sync/status?appId=shop', { headers: auth })
  assert.equal(status.res.json.appId, 'shop')
  assert.equal(status.res.json.writerCount, 1)

  const identity = await request(http, 'GET', '/api/identity', { headers: auth })
  assert.deepEqual(identity.res.json, {
    publicKey: appPubkey,
    driveKey,
    algorithm: 'ed25519'
  })

  const signed = await request(http, 'POST', '/api/identity/sign', {
    headers: auth,
    body: { payload: 'hello', namespace: 'peerit' }
  })
  assert.equal(signed.res.statusCode, 200)
  assert.equal(signed.res.json.signature, '1'.repeat(128))
  assert.equal(signed.res.json.payload, 'hello')
  assert.equal(signed.res.json.namespace, 'peerit')

  assert.deepEqual(registryRecords, [{
    scopedAppId: scope('shop'),
    appDriveKey: driveKey,
    rawAppId: 'shop',
    inviteKey
  }])
  assert.deepEqual(indexedAppends, [{
    appDriveKey: driveKey,
    rawAppId: 'shop',
    scopedAppId: scope('shop'),
    op: { type: 'product:create', data: { id: 'p1' } }
  }])

  assert.deepEqual(calls, [
    ['joinSyncGroup', scope('shop'), inviteKey],
    ['append', scope('shop'), { type: 'product:create', data: { id: 'p1' } }],
    ['get', scope('shop'), 'products!p1'],
    ['list', scope('shop'), 'products', { limit: 1000 }],
    ['status', scope('shop')]
  ])
})

test('HttpBridge exposes sync pinning through the authenticated app scope', async () => {
  const { http, pinnedGroups } = makeBridge()
  const pin = await request(http, 'POST', '/api/sync/pin', {
    headers: { 'x-pear-token': 'good' },
    body: { appId: 'shop' }
  })

  assert.equal(pin.res.statusCode, 200)
  assert.equal(pin.res.json.availability.available, 'seeded')
  assert.deepEqual(pinnedGroups, [[
    { rawAppId: 'shop', appDriveKey: driveKey },
    { appDriveKey: driveKey }
  ]])
})

test('HttpBridge login uses the already parsed POST body', async () => {
  const seen = []
  const http = new HttpBridge({}, null, null, {
    validateToken: (token) => token === 'good' ? driveKey : null,
    requestLogin: async (args) => {
      seen.push(args)
      return { attestation: 'ok' }
    },
    profile: {
      getVisibleProfile: async () => ({ name: 'builder' })
    }
  })

  const result = await Promise.race([
    request(http, 'POST', '/api/login', {
      headers: { 'x-pear-token': 'good' },
      body: { scopes: ['contacts:read', 7], appName: 'Peerit', reason: 'Restore posts', challenge: 'nonce-1' }
    }),
    new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 200))
  ])

  assert.equal(result.timeout, undefined)
  assert.equal(result.res.statusCode, 200)
  assert.deepEqual(result.res.json, { attestation: 'ok', profile: { name: 'builder' } })
  assert.deepEqual(seen, [{
    driveKeyHex: driveKey,
    scopes: ['contacts:read', '7'],
    appName: 'Peerit',
    reason: 'Restore posts',
    challenge: 'nonce-1'
  }])
})
