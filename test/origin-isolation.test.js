import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import Module from 'node:module'
import nodeCrypto from 'node:crypto'
import nodeHttp from 'node:http'

const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-crypto') return nodeCrypto
  if (request === 'bare-http1') return nodeHttp
  return origLoad.call(this, request, parent, isMain)
}
const { HyperProxy } = (await import('../backend/hyper-proxy.js')).default
Module._load = origLoad

const { HttpBridge } = (await import('../backend/http-bridge.js')).default

const driveA = 'a'.repeat(64)
const driveB = 'b'.repeat(64)
const expectedOrigin = 'http://127.0.0.1:1111'
const appPubkey = 'c'.repeat(64)

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
  const res = new EventEmitter()
  res.statusCode = 200
  res.headers = {}
  res.chunks = []
  res.ended = false
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value }
  res.write = (chunk) => {
    if (chunk) res.chunks.push(Buffer.from(chunk))
    return true
  }
  res.end = (chunk) => {
    if (chunk) res.chunks.push(Buffer.from(chunk))
    res.ended = true
    res.body = Buffer.concat(res.chunks).toString('utf8')
    try {
      res.json = res.body ? JSON.parse(res.body) : null
    } catch {
      res.json = null
    }
  }
  return res
}

async function request (bridge, method, path, opts = {}) {
  const req = makeReq(method, path, opts)
  const res = makeRes()
  const url = new URL(path, 'http://127.0.0.1')
  const handled = await bridge.handle(req, res, url)
  return { handled, req, res }
}

function httpGet (url) {
  return new Promise((resolve, reject) => {
    const req = nodeHttp.get(url, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body
      }))
    })
    req.on('error', reject)
    req.setTimeout(3000, () => req.destroy(new Error('httpGet timeout')))
  })
}

function makeOriginBoundBridge () {
  const attached = []
  const swarmBridge = {
    attachStream (id, stream) {
      attached.push({ channelId: id, stream })
      return true
    },
    join () { throw new Error('not used') },
    send () { throw new Error('not used') },
    leave () { throw new Error('not used') }
  }
  const bridge = new HttpBridge({}, null, null, {
    validateToken: (token) => token === 'good'
      ? { driveKeyHex: driveA, origin: expectedOrigin, kind: 'drive' }
      : null,
    identity: {
      getAppKeypair (keyHex) {
        assert.equal(keyHex, driveA)
        return { publicKey: Buffer.from(appPubkey, 'hex') }
      }
    },
    swarmBridge
  })
  return { bridge, attached }
}

test('HyperProxy assigns distinct feature-flagged loopback origins per drive', async (t) => {
  const proxy = new HyperProxy(async () => null, () => {}, null, {
    perDriveOrigins: true
  })
  await proxy.start()
  t.after(() => proxy.stop())

  const urlA = await proxy.localUrlForDrive(driveA, 'hyper', '/index.html?mode=test')
  const urlB = await proxy.localUrlForDrive(driveB, 'app', '/index.html')
  const originA = new URL(urlA).origin
  const originB = new URL(urlB).origin

  assert.notEqual(originA, originB)
  assert.match(urlA, new RegExp(`/hyper/${driveA}/index\\.html\\?mode=test$`))
  assert.match(urlB, new RegExp(`/app/${driveB}/index\\.html$`))

  const html = (await proxy._injectHtmlHead(
    '<html><head></head><body></body></html>',
    driveA,
    `/hyper/${driveA}/index.html`,
    originA
  )).toString('utf8')
  assert.ok(html.includes(`<base href="${originA}/hyper/${driveA}/">`))

  const token = html.match(/<meta name="pear-api-token" content="([0-9a-f]+)">/)?.[1]
  assert.ok(token)
  const contextToken = html.match(/<meta name="pear-page-context-token" content="([0-9a-f]+)">/)?.[1]
  assert.match(contextToken, /^[0-9a-f]{64}$/)
  assert.equal(contextToken, proxy.pageContextToken(driveA))
  assert.notEqual(contextToken, proxy.pageContextToken(driveB))
  assert.match(html, /pearbrowser:context-request/)
  assert.deepEqual(proxy.validateApiToken(token), {
    driveKeyHex: driveA,
    origin: originA,
    kind: 'drive',
    issuedAt: proxy.validateApiToken(token).issuedAt
  })
})

test('HyperProxy per-drive listeners serve only their bound drive key', async (t) => {
  const proxy = new HyperProxy(async () => null, () => {}, null, {
    perDriveOrigins: true
  })
  await proxy.start()
  t.after(() => proxy.stop())

  const urlA = await proxy.localUrlForDrive(driveA, 'hyper', '/index.html')
  const originA = new URL(urlA).origin

  const wrongDrive = await httpGet(`${originA}/hyper/${driveB}/index.html`)
  assert.equal(wrongDrive.statusCode, 403)
  assert.equal(wrongDrive.body, 'Forbidden for this origin')

  await proxy.stop()
  assert.equal(proxy._driveOrigins.size, 0)
})

test('HyperProxy falls back to the main loopback origin when drive listener allocation fails', async (t) => {
  const proxy = new HyperProxy(async () => null, () => {}, null, {
    perDriveOrigins: true
  })
  await proxy.start()
  t.after(() => proxy.stop())

  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => { warnings.push(args.map(String).join(' ')) }
  t.after(() => { console.warn = originalWarn })

  proxy._ensureDriveOrigin = async () => {
    throw new Error('bind refused')
  }

  const localUrl = await proxy.localUrlForDrive(driveA, 'hyper', '/index.html')
  assert.equal(new URL(localUrl).origin, `http://127.0.0.1:${proxy.port}`)
  assert.match(localUrl, new RegExp(`/hyper/${driveA}/index\\.html$`))
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /per-drive origin failed/)
  assert.match(warnings[0], /bind refused/)
})

test('HyperProxy releaseDriveOrigin closes an idle per-drive listener', async (t) => {
  const proxy = new HyperProxy(async () => null, () => {}, null, {
    perDriveOrigins: true
  })
  await proxy.start()
  t.after(() => proxy.stop())

  const urlA = await proxy.localUrlForDrive(driveA, 'hyper', '/index.html')
  const originA = new URL(urlA).origin
  const contextToken = proxy.pageContextToken(driveA)
  assert.equal(proxy._driveOrigins.size, 1)

  assert.equal(await proxy.releaseDriveOrigin(driveA), true)
  assert.equal(proxy._driveOrigins.size, 0)
  assert.notEqual(proxy.pageContextToken(driveA), contextToken)

  await assert.rejects(
    httpGet(`${originA}/health`),
    /ECONNREFUSED|socket hang up|timeout/
  )

  assert.equal(await proxy.releaseDriveOrigin(driveA), false)
})

test('HttpBridge origin-bound tokens reject a different loopback origin', async () => {
  const { bridge } = makeOriginBoundBridge()
  const auth = { 'x-pear-token': 'good', host: '127.0.0.1:1111' }

  const ok = await request(bridge, 'GET', '/api/identity', { headers: auth })
  assert.equal(ok.handled, true)
  assert.equal(ok.res.statusCode, 200)
  assert.equal(ok.res.json.driveKey, driveA)

  const wrongHost = await request(bridge, 'GET', '/api/identity', {
    headers: { 'x-pear-token': 'good', host: '127.0.0.1:2222' }
  })
  assert.equal(wrongHost.res.statusCode, 403)
  assert.equal(wrongHost.res.json.error, 'Token origin mismatch')

  const wrongOriginHeader = await request(bridge, 'GET', '/api/identity', {
    headers: {
      'x-pear-token': 'good',
      host: '127.0.0.1:1111',
      origin: 'http://127.0.0.1:2222'
    }
  })
  assert.equal(wrongOriginHeader.res.statusCode, 403)
  assert.equal(wrongOriginHeader.res.json.error, 'Token origin mismatch')
})

test('HttpBridge SSE tickets inherit origin binding from the minting token', async () => {
  const { bridge, attached } = makeOriginBoundBridge()
  const channelId = 'origin-bound-channel'
  const headers = { 'x-pear-token': 'good', host: '127.0.0.1:1111' }

  const minted = await request(bridge, 'POST', '/api/swarm/ticket', {
    headers,
    body: { channelId }
  })
  assert.equal(minted.res.statusCode, 200)
  assert.match(minted.res.json.ticket, /^[0-9a-f]{64}$/)

  const wrongHost = await request(bridge, 'GET', `/api/swarm/events?channelId=${channelId}&ticket=${minted.res.json.ticket}`, {
    headers: { host: '127.0.0.1:2222' }
  })
  assert.equal(wrongHost.res.statusCode, 403)
  assert.equal(wrongHost.res.json.error, 'Token origin mismatch')
  assert.equal(attached.length, 0)

  const mintedAgain = await request(bridge, 'POST', '/api/swarm/ticket', {
    headers,
    body: { channelId }
  })
  const ok = await request(bridge, 'GET', `/api/swarm/events?channelId=${channelId}&ticket=${mintedAgain.res.json.ticket}`, {
    headers: { host: '127.0.0.1:1111' }
  })
  assert.equal(ok.res.statusCode, 200)
  assert.match(ok.res.headers['content-type'], /^text\/event-stream\b/)
  assert.deepEqual(attached.map(entry => entry.channelId), [channelId])
})
