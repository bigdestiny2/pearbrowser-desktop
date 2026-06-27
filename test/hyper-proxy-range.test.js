import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import Module from 'node:module'
import nodeCrypto from 'node:crypto'
import { Readable } from 'node:stream'

const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-crypto') return nodeCrypto
  if (request === 'bare-http1') return {}
  return origLoad.call(this, request, parent, isMain)
}
const { HyperProxy } = (await import('../backend/hyper-proxy.js')).default
Module._load = origLoad

function makeStream (chunks, error = null) {
  if (!error) return Readable.from(chunks)

  const stream = new EventEmitter()
  stream.destroy = () => { stream.destroyed = true }
  queueMicrotask(() => {
    for (const chunk of chunks) stream.emit('data', chunk)
    if (error) stream.emit('error', error)
    else stream.emit('end')
  })
  return stream
}

function makeRes () {
  return {
    statusCode: 200,
    headers: {},
    chunks: [],
    destroyed: false,
    setHeader (name, value) { this.headers[name.toLowerCase()] = value },
    write (chunk) { if (chunk) this.chunks.push(Buffer.from(chunk)) },
    end (chunk) {
      if (chunk) this.chunks.push(Buffer.from(chunk))
      this.ended = true
      this.body = Buffer.concat(this.chunks)
    },
    destroy (err) {
      this.destroyed = true
      this.destroyError = err
      this.ended = true
      this.body = Buffer.concat(this.chunks)
    }
  }
}

test('HyperProxy streams satisfiable P2P byte ranges without buffering the whole file', async () => {
  const content = Buffer.from('0123456789')
  let readStreamCall = null
  const drive = {
    version: 1,
    entry: async () => ({ value: { blob: { byteLength: content.length } } }),
    createReadStream (path, opts) {
      readStreamCall = { path, opts }
      return makeStream([content.slice(opts.start, opts.end + 1)])
    }
  }
  const proxy = new HyperProxy(async () => drive, () => {})
  const res = makeRes()

  const served = await proxy._serveP2PRange(
    { headers: { range: 'bytes=2-5' } },
    res,
    'a'.repeat(64),
    '/video.mp4',
    Date.now()
  )

  assert.equal(served, true)
  assert.equal(res.statusCode, 206)
  assert.equal(res.headers['content-range'], 'bytes 2-5/10')
  assert.equal(res.headers['content-length'], 4)
  assert.equal(res.headers['x-source'], 'p2p-stream')
  assert.equal(res.body.toString(), '2345')
  assert.equal(readStreamCall.path, '/video.mp4')
  assert.deepEqual(
    {
      wait: readStreamCall.opts.wait,
      timeout: readStreamCall.opts.timeout,
      start: readStreamCall.opts.start,
      end: readStreamCall.opts.end
    },
    { wait: true, timeout: 15000, start: 2, end: 5 }
  )

  const telemetry = proxy.getFetchTelemetry()
  assert.equal(telemetry.total, 1)
  assert.equal(telemetry.sources.p2p, 1)
  assert.equal(telemetry.recent[0].status, 206)
  assert.equal(telemetry.recent[0].bytes, 4)
})

test('HyperProxy answers unsatisfiable P2P ranges with 416 without opening a blob stream', async () => {
  let opened = false
  const drive = {
    version: 1,
    entry: async () => ({ value: { blob: { byteLength: 10 } } }),
    createReadStream () {
      opened = true
      return makeStream([])
    }
  }
  const proxy = new HyperProxy(async () => drive, () => {})
  const res = makeRes()

  const served = await proxy._serveP2PRange(
    { headers: { range: 'bytes=99-100' } },
    res,
    'b'.repeat(64),
    '/video.mp4',
    Date.now()
  )

  assert.equal(served, true)
  assert.equal(opened, false)
  assert.equal(res.statusCode, 416)
  assert.equal(res.headers['content-range'], 'bytes */10')
  assert.equal(proxy.getFetchTelemetry().errors, 1)
})

test('HyperProxy streams byte ranges from relay when P2P range streaming is unavailable', async () => {
  const relayBody = Buffer.from('relay-range')
  const relay = {
    async stream (keyHex, path, opts) {
      assert.equal(keyHex, 'e'.repeat(64))
      assert.equal(path, '/video.mp4')
      assert.deepEqual(opts, { range: 'bytes=2-11' })
      return {
        status: 206,
        contentType: 'video/mp4',
        contentLength: relayBody.length,
        contentRange: 'bytes 2-11/20',
        acceptRanges: 'bytes',
        stream: makeStream([relayBody])
      }
    }
  }
  const proxy = new HyperProxy(async () => null, () => {}, relay)
  const res = makeRes()

  const served = await proxy._serveRelayRange(
    { headers: { range: 'bytes=2-11' } },
    res,
    'e'.repeat(64),
    '/video.mp4',
    Date.now()
  )

  assert.equal(served, true)
  assert.equal(res.statusCode, 206)
  assert.equal(res.headers['x-source'], 'relay-stream')
  assert.equal(res.headers['content-range'], 'bytes 2-11/20')
  assert.equal(res.body.toString(), relayBody.toString())
  const telemetry = proxy.getFetchTelemetry()
  assert.equal(telemetry.sources.relay, 1)
  assert.equal(telemetry.recent[0].relayContacted, true)
})

test('HyperProxy does not relay-stream HTML ranges because HTML needs injection', async () => {
  let contacted = false
  const proxy = new HyperProxy(async () => null, () => {}, {
    async stream () { contacted = true }
  })
  const res = makeRes()

  const served = await proxy._serveRelayRange(
    { headers: { range: 'bytes=0-9' } },
    res,
    'f'.repeat(64),
    '/index.html',
    Date.now()
  )

  assert.equal(served, false)
  assert.equal(contacted, false)
  assert.equal(res.ended, undefined)
})

test('HyperProxy streams large non-range P2P files without buffering or caching', async () => {
  const content = Buffer.from('large-file-body')
  let readStreamCall = null
  let getCalled = false
  const drive = {
    version: 1,
    entry: async () => ({ value: { blob: { byteLength: content.length } } }),
    async get () {
      getCalled = true
      return content
    },
    createReadStream (path, opts) {
      readStreamCall = { path, opts }
      return makeStream([content.slice(0, 5), content.slice(5)])
    }
  }
  const proxy = new HyperProxy(async () => drive, () => {})
  proxy._streamLargeFileThreshold = 4
  const res = makeRes()

  const served = await proxy._serveP2PLargeFile(
    { headers: {} },
    res,
    'c'.repeat(64),
    '/bundle.js',
    Date.now()
  )

  assert.equal(served, true)
  assert.equal(getCalled, false)
  assert.equal(readStreamCall.path, '/bundle.js')
  assert.deepEqual(readStreamCall.opts, { wait: true, timeout: 15000 })
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['content-length'], content.length)
  assert.equal(res.headers['x-source'], 'p2p-stream')
  assert.equal(res.body.toString(), content.toString())
  assert.equal(proxy.getCacheStats().entries, 0)

  const telemetry = proxy.getFetchTelemetry()
  assert.equal(telemetry.total, 1)
  assert.equal(telemetry.sources.p2p, 1)
  assert.equal(telemetry.recent[0].status, 200)
  assert.equal(telemetry.recent[0].bytes, content.length)
})

test('HyperProxy leaves small non-range files on the buffered hybrid path', async () => {
  let opened = false
  const drive = {
    version: 1,
    entry: async () => ({ value: { blob: { byteLength: 3 } } }),
    createReadStream () {
      opened = true
      return makeStream([])
    }
  }
  const proxy = new HyperProxy(async () => drive, () => {})
  proxy._streamLargeFileThreshold = 4
  const res = makeRes()

  const served = await proxy._serveP2PLargeFile(
    { headers: {} },
    res,
    'd'.repeat(64),
    '/small.js',
    Date.now()
  )

  assert.equal(served, false)
  assert.equal(opened, false)
  assert.equal(res.ended, undefined)
  assert.equal(proxy.getFetchTelemetry().total, 0)
})
