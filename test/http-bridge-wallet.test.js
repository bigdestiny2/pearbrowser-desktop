import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { HttpBridge } = require('../backend/http-bridge.js')
const { WalletDocuments, tabKeyForDrive } = require('../backend/wallet/wallet-documents.cjs')

const DRIVE_A = 'a'.repeat(64)
const DRIVE_B = 'b'.repeat(64)
const ORIGIN = 'http://127.0.0.1:9876'
const API_TOKEN = 'test-api-token'
const SESSION = 'test-session-1'

const walletManifest = {
  name: 'Example test checkout',
  entry: '/index.html',
  permissions: ['pear.wallet.v1.connect', 'pear.wallet.v1.pay', 'pear.wallet.v1.sign-app']
}
const connectOnlyManifest = {
  name: 'Connect only',
  permissions: ['pear.wallet.v1.connect']
}

function makeReq (method, path, { headers = {}, body } = {}) {
  const req = new EventEmitter()
  req.method = method
  req.headers = headers
  req.socket = { remoteAddress: '127.0.0.1' }
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
    setHeader (name, value) { this.headers[name.toLowerCase()] = value },
    write (chunk) { if (chunk) this.chunks.push(Buffer.from(chunk)) },
    end (chunk) {
      if (chunk) this.chunks.push(Buffer.from(chunk))
      this.body = Buffer.concat(this.chunks).toString('utf8')
      this.json = this.body ? JSON.parse(this.body) : null
    }
  }
}

async function request (bridge, method, path, opts) {
  const req = makeReq(method, path, opts)
  const res = makeRes()
  const url = new URL(path, ORIGIN)
  const handled = await bridge.handle(req, res, url)
  return { handled, res }
}

function headers (docToken, { origin = true } = {}) {
  const h = { 'x-pear-token': API_TOKEN, host: '127.0.0.1:9876' }
  if (docToken) h['x-pear-wallet-doc'] = docToken
  if (origin) h.origin = ORIGIN
  return h
}

function makeWalletService (overrides = {}) {
  return {
    promptTtlMs: 120000,
    capabilities: () => ({
      protocol: 'pear.wallet.v1',
      v: 1,
      chainIds: ['eip155:2201'],
      assetIds: ['stable-testnet-usdt0']
    }),
    status: async () => ({ state: 'unlocked', walletId: 'wdk-v1' }),
    listConnections: () => [],
    requestPayment: async () => ({
      type: 'payment',
      intentId: 'wpi_pay0000000000000000',
      intent: { driveKey: DRIVE_A, amountAtomic: '1000' },
      expiresAt: Date.now() + 60000
    }),
    signAppPayload: async () => ({
      type: 'sign-app',
      intentId: 'wpi_sign000000000000000',
      intent: { driveKey: DRIVE_A },
      expiresAt: Date.now() + 60000
    }),
    transaction: async (tuple, token, intentId) => ({ intentId, state: 'submitted' }),
    disconnect: async () => ({ disconnected: true }),
    ...overrides
  }
}

function setup ({
  manifest = walletManifest,
  service = {},
  consent,
  driveKey = DRIVE_A,
  mintDocFor = driveKey
} = {}) {
  const docs = new WalletDocuments()
  const docToken = mintDocFor
    ? docs.issue({ driveKeyHex: mintDocFor, origin: ORIGIN, tabKey: tabKeyForDrive(mintDocFor) }).token
    : null
  const consentCalls = []
  const bridge = new HttpBridge(null, null, async () => ({
    get: async (path) => {
      assert.equal(path, '/manifest.json')
      return manifest ? Buffer.from(JSON.stringify(manifest)) : null
    }
  }), {
    validateToken: (token) => token === API_TOKEN
      ? { driveKeyHex: driveKey, origin: ORIGIN, kind: 'drive' }
      : null,
    walletService: makeWalletService(service),
    walletDocuments: docs,
    requestWalletConsent: async (prompt, tuple) => {
      consentCalls.push({ prompt, tuple })
      return consent ? consent(prompt, tuple) : { intentId: prompt.intentId, state: 'submitted' }
    },
    browserSessionId: SESSION
  })
  return { docs, docToken, bridge, consentCalls }
}

// ---------------------------------------------------------------- auth ---

test('capabilities requires only the api token', async () => {
  const { bridge } = setup()

  const bad = await request(bridge, 'GET', '/api/wallet/v1/capabilities', { headers: {} })
  assert.equal(bad.res.statusCode, 401)

  const good = await request(bridge, 'GET', '/api/wallet/v1/capabilities', { headers: headers() })
  assert.equal(good.res.statusCode, 200)
  assert.equal(good.res.json.ok, true)
  assert.equal(good.res.json.protocol, 'pear.wallet.v1')
})

test('status works without a document token and never leaks the address', async () => {
  const { bridge } = setup()
  const res = (await request(bridge, 'GET', '/api/wallet/v1/status', { headers: headers() })).res
  assert.equal(res.statusCode, 200)
  assert.equal(res.json.ok, true)
  assert.equal(res.json.connected, false)
  assert.equal(res.json.walletReady, true)
  assert.equal(res.json.canAcceptRequests, false)
  assert.equal('address' in res.json, false)
})

test('document-token routes reject missing, unknown and cross-drive tokens', async () => {
  // Missing document token.
  const s1 = setup()
  const missing = await request(s1.bridge, 'POST', '/api/wallet/v1/payment', {
    headers: headers(null), body: {}
  })
  assert.equal(missing.res.statusCode, 403)
  assert.equal(missing.res.json.error.code, 'not-authorized')

  // Unknown document token.
  const s2 = setup()
  const unknown = await request(s2.bridge, 'POST', '/api/wallet/v1/payment', {
    headers: headers('f'.repeat(32)), body: {}
  })
  assert.equal(unknown.res.statusCode, 403)
  assert.equal(unknown.res.json.error.code, 'not-authorized')

  // Cross-drive: api token for drive B, document token minted for drive A.
  const s3 = setup({ driveKey: DRIVE_B, mintDocFor: DRIVE_A })
  const cross = await request(s3.bridge, 'POST', '/api/wallet/v1/payment', {
    headers: headers(s3.docToken), body: {}
  })
  assert.equal(cross.res.statusCode, 403)
  assert.equal(cross.res.json.error.code, 'not-authorized')
})

test('state-changing requests require an exact Origin header', async () => {
  const { bridge, docToken } = setup()
  const res = (await request(bridge, 'POST', '/api/wallet/v1/payment', {
    headers: headers(docToken, { origin: false }), body: {}
  })).res
  assert.equal(res.statusCode, 403)
  assert.equal(res.json.error.code, 'not-authorized')
})

test('wallet routes fail closed when the service is not wired', async () => {
  const docs = new WalletDocuments()
  const bridge = new HttpBridge(null, null, null, {
    validateToken: () => ({ driveKeyHex: DRIVE_A, origin: ORIGIN }),
    walletDocuments: docs
  })
  const res = (await request(bridge, 'GET', '/api/wallet/v1/capabilities', { headers: headers() })).res
  assert.equal(res.statusCode, 503)
  assert.equal(res.json.error.code, 'wallet-unavailable')
})

// --------------------------------------------------------------- connect ---

test('connect parks a chrome prompt and returns the broker result', async () => {
  const { bridge, docToken, consentCalls } = setup({
    consent: () => ({ connected: true, driveKey: DRIVE_A, chainId: 'eip155:2201', assetId: 'stable-testnet-usdt0' })
  })
  const res = (await request(bridge, 'POST', '/api/wallet/v1/connect', {
    headers: headers(docToken),
    body: { chainIds: ['eip155:2201'], assetIds: ['stable-testnet-usdt0'] }
  })).res
  assert.equal(res.statusCode, 200)
  assert.equal(res.json.ok, true)
  assert.equal(res.json.connected, true)

  assert.equal(consentCalls.length, 1)
  const { prompt, tuple } = consentCalls[0]
  assert.equal(prompt.type, 'connect')
  assert.match(prompt.intentId, /^wpi_[0-9a-f]{24}$/)
  assert.equal(prompt.token, docToken) // parked server-side for the broker
  assert.equal(prompt.manifest.name, 'Example test checkout')
  assert.equal(prompt.intent.appName, 'Example test checkout')
  assert.equal(prompt.intent.chainId, 'eip155:2201')
  assert.deepEqual(tuple, {
    browserSessionId: SESSION,
    tabId: tabKeyForDrive(DRIVE_A),
    driveKey: DRIVE_A,
    walletTabOrigin: ORIGIN
  })
})

test('connect rejects unsupported chain/asset subsets before prompting', async () => {
  const { bridge, docToken, consentCalls } = setup()
  const res = (await request(bridge, 'POST', '/api/wallet/v1/connect', {
    headers: headers(docToken),
    body: { chainIds: ['eip155:1'] }
  })).res
  assert.equal(res.statusCode, 400)
  assert.equal(res.json.error.code, 'unsupported-chain')
  assert.equal(consentCalls.length, 0)
})

test('connect without the manifest permission or with a locked wallet fails before prompting', async () => {
  const noPerm = setup({ manifest: connectOnlyManifest })
  // connectOnlyManifest DOES declare connect — use a manifest without it.
  noPerm.bridge._getDrive = async () => ({
    get: async () => Buffer.from(JSON.stringify({ name: 'x', permissions: ['pear.ai.infer'] }))
  })
  const res1 = (await request(noPerm.bridge, 'POST', '/api/wallet/v1/connect', {
    headers: headers(noPerm.docToken), body: {}
  })).res
  assert.equal(res1.statusCode, 400)
  assert.equal(res1.json.error.code, 'bad-request')
  assert.equal(noPerm.consentCalls.length, 0)

  const locked = setup({ service: { status: async () => ({ state: 'locked', walletId: 'wdk-v1' }) } })
  const res2 = (await request(locked.bridge, 'POST', '/api/wallet/v1/connect', {
    headers: headers(locked.docToken), body: {}
  })).res
  assert.equal(res2.statusCode, 423)
  assert.equal(res2.json.error.code, 'wallet-locked')
  assert.equal(locked.consentCalls.length, 0)
})

// --------------------------------------------------------------- payment ---

test('payment opens a service prompt, awaits consent and returns the outcome', async () => {
  let serviceCall = null
  const { bridge, docToken, consentCalls } = setup({
    service: {
      requestPayment: async (tuple, token, input) => {
        serviceCall = { tuple, token, input }
        return { type: 'payment', intentId: 'wpi_pay0000000000000000', intent: {}, expiresAt: Date.now() + 60000 }
      }
    },
    consent: () => ({ intentId: 'wpi_pay0000000000000000', state: 'submitted', transactionHash: '0xabc' })
  })
  const payment = {
    chainId: 'eip155:2201',
    assetId: 'stable-testnet-usdt0',
    recipient: '0x0123456789abcdef0123456789abcdef01234567',
    amountAtomic: '1250000',
    reference: 'order-1842',
    idempotencyKey: 'checkout:order-1842:attempt-1'
  }
  const res = (await request(bridge, 'POST', '/api/wallet/v1/payment', {
    headers: headers(docToken), body: payment
  })).res
  assert.equal(res.statusCode, 200)
  assert.equal(res.json.ok, true)
  assert.equal(res.json.state, 'submitted')
  assert.equal(res.json.transactionHash, '0xabc')

  // The service saw the doc token and the page's input; the tuple is
  // derived from the api token (the page cannot pick another drive).
  assert.equal(serviceCall.token, docToken)
  assert.equal(serviceCall.tuple.driveKey, DRIVE_A)
  assert.equal(serviceCall.input.amountAtomic, '1250000')
  assert.equal(consentCalls[0].prompt.type, 'payment')
})

test('payment idempotent replay returns the recorded outcome without parking consent', async () => {
  const { bridge, docToken, consentCalls } = setup({
    service: {
      requestPayment: async () => Object.freeze({
        intentId: 'wpi_pay0000000000000000',
        state: 'rejected',
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:01.000Z'
      })
    }
  })
  const res = (await request(bridge, 'POST', '/api/wallet/v1/payment', {
    headers: headers(docToken),
    body: {
      chainId: 'eip155:2201',
      assetId: 'stable-testnet-usdt0',
      recipient: '0x0123456789abcdef0123456789abcdef01234567',
      amountAtomic: '1250000',
      idempotencyKey: 'checkout:order-1842:attempt-1'
    }
  })).res
  assert.equal(res.statusCode, 200)
  assert.equal(res.json.ok, true)
  assert.equal(res.json.state, 'rejected')
  assert.equal(res.json.intentId, 'wpi_pay0000000000000000')
  // A settled reservation is never parked for consent again.
  assert.equal(consentCalls.length, 0)
})

test('service error codes map to HTTP statuses', async () => {
  const cases = [
    ['not-connected', 403],
    ['not-authorized', 403],
    ['bad-request', 400],
    ['unsupported-chain', 400],
    ['not-found', 404],
    ['rate-limited', 429],
    ['wallet-busy', 429],
    ['cap-exceeded', 429],
    ['wallet-locked', 423],
    ['prompt-expired', 410]
  ]
  for (const [code, status] of cases) {
    const { bridge, docToken } = setup({
      service: {
        requestPayment: async () => {
          const err = new Error('service says: ' + code)
          err.code = code
          throw err
        }
      }
    })
    const res = (await request(bridge, 'POST', '/api/wallet/v1/payment', {
      headers: headers(docToken), body: {}
    })).res
    assert.equal(res.statusCode, status, code)
    assert.equal(res.json.ok, false)
    assert.equal(res.json.error.code, code)
    assert.equal(res.json.error.message, 'service says: ' + code)
  }
})

test('unmapped errors are 500 with a sanitized message', async () => {
  const { bridge, docToken } = setup({
    service: {
      requestPayment: async () => { throw new Error('seed material: abandon abandon') }
    }
  })
  const res = (await request(bridge, 'POST', '/api/wallet/v1/payment', {
    headers: headers(docToken), body: {}
  })).res
  assert.equal(res.statusCode, 500)
  assert.equal(res.json.error.code, 'internal-error')
  assert.equal(res.json.error.message, 'wallet operation failed')
})

test('wallet request bodies are capped at 16 KiB', async () => {
  const { bridge, docToken } = setup()
  const res = (await request(bridge, 'POST', '/api/wallet/v1/payment', {
    headers: headers(docToken),
    body: { reference: 'x'.repeat(20 * 1024) }
  })).res
  assert.equal(res.statusCode, 413)
  assert.equal(res.json.error.code, 'bad-request')
})

test('per-route rate limits trip with 429 rate-limited', async () => {
  const { bridge, docToken } = setup()
  for (let i = 0; i < 10; i++) {
    const res = (await request(bridge, 'POST', '/api/wallet/v1/payment', {
      headers: headers(docToken), body: {}
    })).res
    assert.equal(res.statusCode, 200, 'payment ' + i)
  }
  const eleventh = (await request(bridge, 'POST', '/api/wallet/v1/payment', {
    headers: headers(docToken), body: {}
  })).res
  assert.equal(eleventh.statusCode, 429)
  assert.equal(eleventh.json.error.code, 'rate-limited')
})

// --------------------------------------------------------------- sign-app ---

test('sign-app returns hex-encoded signature and digest', async () => {
  const { bridge, docToken } = setup({
    consent: () => ({
      intentId: 'wpi_sign000000000000000',
      state: 'signed',
      signature: Buffer.from([1, 2, 255]),
      address: '0x0123456789abcdef0123456789abcdef01234567',
      digest: Buffer.from([9, 10])
    })
  })
  const res = (await request(bridge, 'POST', '/api/wallet/v1/sign-app', {
    headers: headers(docToken),
    body: { payloadHash: 'a'.repeat(64) }
  })).res
  assert.equal(res.statusCode, 200)
  assert.equal(res.json.state, 'signed')
  assert.equal(res.json.signature, '0102ff')
  assert.equal(res.json.digest, '090a')
})

// ------------------------------------------------------- transaction etc ---

test('transaction queries the service with the tuple and doc token', async () => {
  let call = null
  const { bridge, docToken } = setup({
    service: {
      transaction: async (tuple, token, intentId) => {
        call = { tuple, token, intentId }
        return { intentId, state: 'final', confirmations: 3 }
      }
    }
  })
  const res = (await request(bridge, 'GET', '/api/wallet/v1/transaction?intentId=wpi_pay0000000000000000', {
    headers: headers(docToken)
  })).res
  assert.equal(res.statusCode, 200)
  assert.equal(res.json.state, 'final')
  assert.equal(call.token, docToken)
  assert.equal(call.intentId, 'wpi_pay0000000000000000')
  assert.equal(call.tuple.driveKey, DRIVE_A)
})

test('transaction requires the document token', async () => {
  const { bridge } = setup()
  const res = (await request(bridge, 'GET', '/api/wallet/v1/transaction?intentId=wpi_pay0000000000000000', {
    headers: headers(null)
  })).res
  assert.equal(res.statusCode, 403)
  assert.equal(res.json.error.code, 'not-authorized')
})

test('disconnect revokes the connection', async () => {
  let call = null
  const { bridge, docToken } = setup({
    service: {
      disconnect: async (tuple, token) => {
        call = { tuple, token }
        return { disconnected: true, driveKey: DRIVE_A }
      }
    }
  })
  const res = (await request(bridge, 'POST', '/api/wallet/v1/disconnect', {
    headers: headers(docToken), body: {}
  })).res
  assert.equal(res.statusCode, 200)
  assert.equal(res.json.disconnected, true)
  assert.equal(call.token, docToken)
})

test('unknown wallet endpoints are a wallet-shaped 404', async () => {
  const { bridge, docToken } = setup()
  const res = (await request(bridge, 'GET', '/api/wallet/v1/nope', { headers: headers(docToken) })).res
  assert.equal(res.statusCode, 404)
  assert.equal(res.json.ok, false)
  assert.equal(res.json.error.code, 'not-found')
})
