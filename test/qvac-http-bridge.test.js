import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

const { HttpBridge } = await import('../backend/http-bridge.js')
const driveKey = 'a'.repeat(64)

function request (method, path, body) {
  const req = new EventEmitter()
  req.method = method
  req.headers = { 'x-pear-token': 'valid-token' }
  req.socket = { remoteAddress: '127.0.0.1' }
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
  return { req, url: new URL(path, 'http://127.0.0.1') }
}

function response () {
  const res = new EventEmitter()
  res.statusCode = 200
  res.headers = {}
  res.chunks = []
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value }
  res.write = chunk => { res.chunks.push(Buffer.from(chunk)); return true }
  res.end = chunk => {
    if (chunk) res.chunks.push(Buffer.from(chunk))
    res.body = Buffer.concat(res.chunks).toString('utf8')
  }
  return res
}

function makeBridge ({ permission = true, aiService } = {}) {
  const manifest = permission
    ? { permissions: ['pear.ai.infer'] }
    : { permissions: [] }
  const drive = { async get () { return Buffer.from(JSON.stringify(manifest)) } }
  return new HttpBridge({}, null, async () => drive, {
    validateToken: token => token === 'valid-token' ? driveKey : null,
    aiService
  })
}

test('AI capabilities are authenticated and report manifest permission', async () => {
  const aiService = {
    capabilities: () => ({ available: true, local: true, streaming: true, models: [] })
  }
  const bridge = makeBridge({ aiService })
  const { req, url } = request('GET', '/api/ai/capabilities')
  const res = response()

  assert.equal(await bridge.handle(req, res, url), true)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(JSON.parse(res.body), {
    available: true,
    local: true,
    streaming: true,
    models: [],
    allowed: true
  })
})

test('AI completion fails closed when manifest permission is absent', async () => {
  let called = false
  const bridge = makeBridge({
    permission: false,
    aiService: {
      capabilities: () => ({}),
      complete: () => { called = true }
    }
  })
  const { req, url } = request('POST', '/api/ai/completions', {
    model: 'pear-small-chat',
    messages: [{ role: 'user', content: 'hi' }]
  })
  const res = response()

  await bridge.handle(req, res, url)
  assert.equal(res.statusCode, 403)
  assert.equal(called, false)
})

test('AI completion streams normalized NDJSON and binds origin to drive identity', async () => {
  const calls = []
  const aiService = {
    capabilities: () => ({}),
    complete (input) {
      calls.push(input)
      return {
        requestId: 'browser-request-1',
        events: (async function * () {
          yield { type: 'text', delta: 'hello' }
          yield { type: 'done', finishReason: 'eos' }
        })(),
        final: Promise.resolve({ text: 'hello' })
      }
    },
    async cancel () { return true }
  }
  const bridge = makeBridge({ aiService })
  const body = {
    model: 'pear-small-chat',
    messages: [{ role: 'user', content: 'hi' }],
    maxTokens: 20,
    temperature: 0,
    reasoningBudget: 0
  }
  const { req, url } = request('POST', '/api/ai/completions', body)
  const res = response()

  await bridge.handle(req, res, url)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['content-type'], 'application/x-ndjson; charset=utf-8')
  assert.equal(res.headers['x-pear-ai-request-id'], 'browser-request-1')
  assert.deepEqual(res.body.trim().split('\n').map(JSON.parse), [
    { type: 'text', delta: 'hello' },
    { type: 'done', finishReason: 'eos' }
  ])
  assert.deepEqual(calls, [{ origin: `hyper://${driveKey}`, ...body }])
})

test('AI cancel requires permission and forwards only the opaque request id', async () => {
  const cancelled = []
  const bridge = makeBridge({
    aiService: {
      capabilities: () => ({}),
      async cancel (requestId) { cancelled.push(requestId); return true }
    }
  })
  bridge._aiRequestOwners.set('ai-opaque', driveKey)
  const { req, url } = request('POST', '/api/ai/cancel', { requestId: 'ai-opaque' })
  const res = response()

  await bridge.handle(req, res, url)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(cancelled, ['ai-opaque'])
  assert.deepEqual(JSON.parse(res.body), { ok: true })
})

test('AI cancel cannot target a request owned by another drive', async () => {
  let called = false
  const bridge = makeBridge({
    aiService: {
      capabilities: () => ({}),
      async cancel () { called = true; return true }
    }
  })
  bridge._aiRequestOwners.set('other-request', 'b'.repeat(64))
  const { req, url } = request('POST', '/api/ai/cancel', { requestId: 'other-request' })
  const res = response()

  await bridge.handle(req, res, url)
  assert.equal(called, false)
  assert.deepEqual(JSON.parse(res.body), { ok: false })
})
