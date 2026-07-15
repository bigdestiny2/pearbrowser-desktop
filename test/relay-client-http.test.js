import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import Module from 'node:module'

function makeRequest () {
  const req = new EventEmitter()
  req.destroyed = false
  req.ended = false
  req.writes = []
  req.write = chunk => req.writes.push(Buffer.from(chunk))
  req.end = () => { req.ended = true }
  req.destroy = () => {
    req.destroyed = true
    req.emit('close')
  }
  return req
}

function makeResponse () {
  const res = new EventEmitter()
  res.statusCode = 200
  res.headers = { 'content-type': 'application/octet-stream' }
  return res
}

function makeTransport () {
  return {
    autoRespond: true,
    calls: [],
    reset () {
      this.autoRespond = true
      this.calls = []
      this.lastOptions = null
      this.lastRequest = null
      this.lastResponse = null
    },
    get (opts, cb) {
      const req = makeRequest()
      const res = makeResponse()
      this.lastOptions = opts
      this.lastRequest = req
      this.lastResponse = res
      this.calls.push({ method: 'GET', opts, req, res })
      if (this.autoRespond) process.nextTick(() => cb(res))
      return req
    },
    request (opts, cb) {
      const req = makeRequest()
      const res = makeResponse()
      this.lastOptions = opts
      this.lastRequest = req
      this.lastResponse = res
      this.calls.push({ method: 'POST', opts, req, res })
      if (this.autoRespond) process.nextTick(() => cb(res))
      return req
    }
  }
}

function tick () {
  return new Promise(resolve => setImmediate(resolve))
}

const httpTransport = makeTransport()
const httpsTransport = makeTransport()
const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-http1') return httpTransport
  if (request === 'bare-https') return httpsTransport
  if (request === './hyper-proxy') return { getUserFriendlyError: message => message }
  return origLoad.call(this, request, parent, isMain)
}
const { RelayClient, relayRequestOptions } = (await import('../backend/relay-client.js')).default
Module._load = origLoad

function resetTransports () {
  httpTransport.reset()
  httpsTransport.reset()
}

test('RelayClient uses scheme-aware transport for public HTTPS gateways', async () => {
  resetTransports()
  const client = new RelayClient()
  const request = client._httpGet('https://relay.example.com/catalog.json', 1000)
  await tick()

  assert.equal(httpsTransport.calls.length, 1)
  assert.equal(httpTransport.calls.length, 0)
  assert.equal(httpsTransport.lastOptions.hostname, 'relay.example.com')
  assert.equal(httpsTransport.lastOptions.port, 443)
  assert.equal(relayRequestOptions(new URL('https://relay.example.com:9443/catalog.json')).port, 9443)

  httpsTransport.lastResponse.emit('end')
  const result = await request
  assert.equal(result.status, 200)
})

test('RelayClient GET rejects oversized relay bodies and destroys the request', async () => {
  resetTransports()
  const client = new RelayClient({ maxResponseBytes: 3 })
  const request = client._httpGet('http://relay.example.com/file.txt', 1000)
  await tick()

  httpTransport.lastResponse.emit('data', Buffer.from('four'))

  await assert.rejects(request, /relay response exceeded 3 bytes/)
  assert.equal(httpTransport.lastRequest.destroyed, true)
})

test('RelayClient POST rejects oversized control responses and destroys the request', async () => {
  resetTransports()
  const client = new RelayClient({ maxControlResponseBytes: 2 })
  const request = client._httpPost('https://relay.example.com/seed', '{}', 1000)
  await tick()

  assert.equal(httpsTransport.lastOptions.method, 'POST')
  assert.equal(httpsTransport.lastOptions.port, 443)
  assert.equal(httpsTransport.lastRequest.ended, true)
  httpsTransport.lastResponse.emit('data', Buffer.from('yes'))

  await assert.rejects(request, /relay response exceeded 2 bytes/)
  assert.equal(httpsTransport.lastRequest.destroyed, true)
})

test('RelayClient timeout actively destroys hanging relay requests', async () => {
  resetTransports()
  httpTransport.autoRespond = false
  const client = new RelayClient()
  const request = client._httpGet('http://relay.example.com/hang', 5)

  await assert.rejects(request, /Timeout/)
  assert.equal(httpTransport.lastRequest.destroyed, true)
})

test('RelayClient capability check reads well-known doc via backend transport', async () => {
  resetTransports()
  const client = new RelayClient()
  const request = client.checkCapability('https://relay.example.com/', 1000)
  await tick()

  assert.equal(httpsTransport.calls.length, 1)
  assert.equal(httpsTransport.lastOptions.hostname, 'relay.example.com')
  assert.equal(httpsTransport.lastOptions.path, '/.well-known/hiverelay.json')

  httpsTransport.lastResponse.emit('data', Buffer.from(JSON.stringify({
    version: '0.20.2',
    supported_transports: ['hyperswarm', 'dht-relay-ws']
  })))
  httpsTransport.lastResponse.emit('end')

  const result = await request
  assert.equal(result.ok, true)
  assert.equal(result.status, 200)
  assert.equal(result.doc.version, '0.20.2')
  assert.deepEqual(result.doc.supported_transports, ['hyperswarm', 'dht-relay-ws'])
})

test('RelayClient capability check reports HTTP failures without throwing', async () => {
  resetTransports()
  const client = new RelayClient()
  const request = client.checkCapability('https://relay.example.com', 1000)
  await tick()

  httpsTransport.lastResponse.statusCode = 502
  httpsTransport.lastResponse.emit('end')

  const result = await request
  assert.deepEqual(result, { ok: false, status: 502, error: 'HTTP 502' })
})
