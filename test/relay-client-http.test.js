import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

function loadRelayClient (transport) {
  const source = readFileSync(new URL('../backend/relay-client.js', import.meta.url), 'utf8')
  const module = { exports: {} }
  const sandbox = {
    Buffer,
    URL,
    console,
    setTimeout,
    clearTimeout,
    require: (name) => {
      if (name === 'bare-http1') return transport
      if (name === 'bare-https') return transport
      if (name === 'b4a') {
        return {
          from: (...args) => Buffer.from(...args),
          toString: (buf, enc) => Buffer.from(buf).toString(enc)
        }
      }
      if (name === './hyper-proxy') return { getUserFriendlyError: (msg) => msg }
      if (name === './relay-directory') return { mergeRelayDirectory: () => ({ relays: [], discovered: 0, verified: 0 }) }
      if (name === './relay-record') return { resolveBootstrapRelays: async () => ({ relays: [], indexRooms: [] }) }
      throw new Error('unexpected require: ' + name)
    },
    module,
    exports: module.exports
  }
  vm.runInNewContext(`(function () {\n${source}\n})()`, sandbox, {
    filename: 'backend/relay-client.js'
  })
  return module.exports
}

function makeRequest () {
  const req = new EventEmitter()
  req.destroyed = false
  req.body = ''
  req.write = (chunk) => { req.body += String(chunk) }
  req.end = () => { req.ended = true }
  req.destroy = () => { req.destroyed = true }
  return req
}

test('RelayClient GET rejects oversized relay bodies and destroys the request', async () => {
  let request = null
  const transport = {
    get (_opts, cb) {
      request = makeRequest()
      queueMicrotask(() => {
        const res = new EventEmitter()
        res.statusCode = 200
        res.headers = {}
        cb(res)
        res.emit('data', Buffer.alloc(6))
        res.emit('data', Buffer.alloc(6))
        res.emit('end')
      })
      return request
    }
  }
  const { RelayClient } = loadRelayClient(transport)
  const client = new RelayClient({ maxResponseBytes: 10 })

  await assert.rejects(
    () => client._httpGet('http://relay.example/v1/hyper/key/index.html', 1000, client.maxResponseBytes),
    /relay response exceeded 10 bytes/
  )
  assert.equal(request.destroyed, true)
})

test('RelayClient POST rejects oversized control responses and destroys the request', async () => {
  let request = null
  const transport = {
    request (_opts, cb) {
      request = makeRequest()
      queueMicrotask(() => {
        const res = new EventEmitter()
        res.statusCode = 200
        res.headers = {}
        cb(res)
        res.emit('data', Buffer.alloc(8))
        res.emit('data', Buffer.alloc(8))
        res.emit('end')
      })
      return request
    }
  }
  const { RelayClient } = loadRelayClient(transport)
  const client = new RelayClient({ maxControlResponseBytes: 12 })

  await assert.rejects(
    () => client._httpPost('http://relay.example/seed', '{}', 1000),
    /relay response exceeded 12 bytes/
  )
  assert.equal(request.body, '{}')
  assert.equal(request.ended, true)
  assert.equal(request.destroyed, true)
})

test('RelayClient timeout actively destroys hanging relay requests', async () => {
  let request = null
  const transport = {
    get () {
      request = makeRequest()
      return request
    }
  }
  const { RelayClient } = loadRelayClient(transport)
  const client = new RelayClient({ timeout: 5 })

  await assert.rejects(
    () => client._httpGet('http://relay.example/health', 5),
    /Timeout/
  )
  assert.equal(request.destroyed, true)
})

test('RelayClient streams relay ranges without buffering response bodies', async () => {
  let requestOptions = null
  const relayStream = new EventEmitter()
  const transport = {
    get (opts, cb) {
      requestOptions = opts
      const request = makeRequest()
      queueMicrotask(() => {
        relayStream.statusCode = 206
        relayStream.headers = {
          'content-type': 'video/mp4',
          'content-range': 'bytes 2-5/10',
          'content-length': '4',
          'accept-ranges': 'bytes'
        }
        cb(relayStream)
      })
      return request
    }
  }
  const { RelayClient } = loadRelayClient(transport)
  const client = new RelayClient({ relays: ['http://relay.example'], timeout: 1000 })

  const result = await client.stream('a'.repeat(64), '/video.mp4', { range: 'bytes=2-5' })

  assert.equal(requestOptions.headers.Range, 'bytes=2-5')
  assert.equal(result.status, 206)
  assert.equal(result.contentType, 'video/mp4')
  assert.equal(result.contentRange, 'bytes 2-5/10')
  assert.equal(result.contentLength, 4)
  assert.equal(result.stream, relayStream)
})
