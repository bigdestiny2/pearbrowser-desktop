import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import Module from 'node:module'
import nodeCrypto from 'node:crypto'
import nodeHttp from 'node:http'
import driveOrigin from '../backend/drive-origin.cjs'

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
const { driveHostnameForKey, driveKeyFromHostname } = driveOrigin

function makeReq (method, path, { headers = {}, body } = {}) {
  const req = new EventEmitter()
  req.method = method
  req.url = path
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

function httpGet (url, { method = 'GET', headers = {}, requestTarget } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    // Connect to the actual bound socket while preserving the browser Host.
    // DNS resolution of *.localhost is tested separately in real Electron.
    const req = nodeHttp.request({
      hostname: '127.0.0.1',
      port: target.port,
      path: requestTarget || target.pathname + target.search,
      method,
      headers: { host: target.host, ...headers }
    }, (res) => {
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
    req.end()
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
  assert.equal(proxy.driveKeyForLocalUrl(urlA), driveA)
  assert.equal(proxy.driveKeyForLocalUrl(urlB), driveB)
  assert.equal(proxy.driveKeyForLocalUrl(`http://127.0.0.1:${proxy.port}/hyper/${driveA}/`), '')
  assert.equal(proxy.driveKeyForLocalUrl(`http://${driveHostnameForKey(driveA)}:1/hyper/${driveA}/`), '')
  assert.equal(proxy.driveKeyForLocalUrl(`${originA}/hyper/${driveB}/`), '')
  assert.equal(new URL(urlA).hostname, driveHostnameForKey(driveA))
  assert.equal(new URL(urlB).hostname, driveHostnameForKey(driveB))
  assert.equal(driveKeyFromHostname(new URL(urlA).hostname), driveA)
  assert.equal(new URL(urlA).hostname.split('.')[0].length, 54)
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

test('HyperProxy injects origin-bound shims into valid HTML with implicit or attributed head tags', async () => {
  const proxy = new HyperProxy(async () => null, () => {})
  proxy._port = 43210
  for (const source of [
    '<!doctype html><HTML lang="en"><HEAD data-app="1"></HEAD><body>page</body></HTML>',
    '<!doctype html><HTML lang="en"><body>page</body></HTML>',
    '<!doctype html><body>page</body>'
  ]) {
    const html = (await proxy._injectHtmlHead(
      source,
      driveA,
      `/hyper/${driveA}/index.html`
    )).toString('utf8')
    assert.match(html, /<base href="http:\/\/127\.0\.0\.1:43210\/hyper\//)
    assert.match(html, /pear-api-token/)
    assert.match(html, /__pearBrowserHyperLinkBridge/)
    assert.match(html, /<body>page<\/body>/)
  }
})

test('HyperProxy injects a valid base URL when URL.origin is unavailable in Bare', async () => {
  const NativeURL = globalThis.URL
  class BareLikeURL extends NativeURL {
    get origin () { return undefined }
  }

  globalThis.URL = BareLikeURL
  try {
    const proxy = new HyperProxy(async () => null, () => {})
    proxy._port = 43210
    const html = (await proxy._injectHtmlHead(
      '<html><head></head><body></body></html>',
      driveA,
      `/hyper/${driveA}/index.html`
    )).toString('utf8')

    assert.ok(html.includes(`<base href="http://127.0.0.1:43210/hyper/${driveA}/">`))
    assert.doesNotMatch(html, /<base href="undefined\//)
  } finally {
    globalThis.URL = NativeURL
  }
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

  const sharedOrigin = `http://127.0.0.1:${proxy.port}`
  for (const route of [`/hyper/${driveA}/index.html`, `/app/${driveA}/index.html`]) {
    const response = await httpGet(sharedOrigin + route)
    assert.equal(response.statusCode, 403)
    assert.equal(response.body, 'Drive origin required')
  }

  await proxy.stop()
  assert.equal(proxy._driveOrigins.size, 0)
})

test('per-drive listeners reject hostile hosts, cross-drive CORS and token reuse', async (t) => {
  const proxy = new HyperProxy(async () => null, () => {}, null, {
    perDriveOrigins: true
  })
  proxy._hybridFetch = async (keyHex) => ({
    content: Buffer.from('<html><head></head><body>' + keyHex + '</body></html>'),
    contentType: 'text/html; charset=utf-8',
    source: 'test'
  })
  await proxy.start()
  t.after(() => proxy.stop())

  const urlA = await proxy.localUrlForDrive(driveA, 'hyper', '/index.html')
  const urlB = await proxy.localUrlForDrive(driveB, 'hyper', '/index.html')
  const originA = new URL(urlA).origin
  const originB = new URL(urlB).origin
  const bodyA = await httpGet(urlA, { headers: { origin: originA } })
  assert.equal(bodyA.statusCode, 200)
  assert.equal(bodyA.headers['access-control-allow-origin'], originA)
  assert.match(bodyA.body, new RegExp('<body>' + driveA + '</body>'))
  const tokenA = bodyA.body.match(/<meta name="pear-api-token" content="([0-9a-f]+)">/)?.[1]
  assert.ok(tokenA)

  for (const badHost of [new URL(urlB).host, '127.0.0.1:' + new URL(urlA).port, 'evil.localhost:' + new URL(urlA).port]) {
    const denied = await httpGet(urlA, { headers: { host: badHost } })
    assert.equal(denied.statusCode, 403)
    assert.equal(denied.body, 'Invalid drive host')
    assert.doesNotMatch(denied.body, /pear-api-token/)
  }
  const upperCaseHeader = makeRes()
  await proxy._handle(makeReq('GET', '/health', {
    headers: { Host: new URL(urlA).host.toUpperCase() }
  }), upperCaseHeader, { boundDriveKeyHex: driveA, port: Number(new URL(urlA).port) })
  assert.equal(upperCaseHeader.statusCode, 200)
  for (const badHeaders of [
    { host: [new URL(urlA).host] },
    { host: new URL(urlA).host, Host: new URL(urlA).host },
    { host: new URL(urlA).host, Origin: [originA] }
  ]) {
    const denied = makeRes()
    await proxy._handle(makeReq('GET', '/health', { headers: badHeaders }), denied, {
      boundDriveKeyHex: driveA, port: Number(new URL(urlA).port)
    })
    assert.equal(denied.statusCode, 403)
  }
  for (const method of ['GET', 'OPTIONS']) {
    const denied = await httpGet(urlA, { method, headers: { origin: originB } })
    assert.equal(denied.statusCode, 403)
    assert.equal(denied.body, 'Invalid origin')
    assert.equal(denied.headers['access-control-allow-origin'], undefined)
  }

  const bridge = new HttpBridge({}, null, null, {
    validateToken: (token) => proxy.validateApiToken(token),
    identity: {
      getAppKeypair (keyHex) {
        assert.equal(keyHex, driveA)
        return { publicKey: Buffer.from(appPubkey, 'hex') }
      }
    }
  })
  proxy.setHttpBridge(bridge)
  const ownApi = await httpGet(originA + '/api/identity', {
    headers: { 'x-pear-token': tokenA, origin: originA }
  })
  assert.equal(ownApi.statusCode, 200)
  assert.equal(JSON.parse(ownApi.body).driveKey, driveA)
  const originlessOwnApi = await httpGet(originA + '/api/identity', {
    headers: { 'x-pear-token': tokenA }
  })
  assert.equal(originlessOwnApi.statusCode, 200)

  const siblingApi = await httpGet(originB + '/api/identity', {
    headers: { 'x-pear-token': tokenA }
  })
  assert.equal(siblingApi.statusCode, 403)
  assert.equal(JSON.parse(siblingApi.body).error, 'Token origin mismatch')

  const mainApi = await httpGet('http://127.0.0.1:' + proxy.port + '/api/identity', {
    headers: { origin: originA, 'x-pear-token': tokenA }
  })
  assert.equal(mainApi.statusCode, 403)
  assert.equal(mainApi.body, 'Invalid origin')
  const mainOrigin = 'http://127.0.0.1:' + proxy.port
  const crossPortMain = await httpGet(mainOrigin + '/health', {
    headers: { origin: 'http://127.0.0.1:1' }
  })
  assert.equal(crossPortMain.statusCode, 403)
  assert.equal(crossPortMain.headers['access-control-allow-origin'], undefined)
  const sharedPreflight = await httpGet(mainOrigin + '/hyper/' + driveA + '/index.html', {
    method: 'OPTIONS', headers: { origin: mainOrigin }
  })
  assert.equal(sharedPreflight.statusCode, 403)
  assert.equal(sharedPreflight.body, 'Drive origin required')
  assert.equal(sharedPreflight.headers['access-control-allow-origin'], undefined)

  assert.throws(
    () => proxy.issueApiToken(driveA, { origin: originB }),
    /Invalid token origin/
  )
  assert.throws(
    () => proxy.issueApiToken(driveA, { origin: 'http://' + driveHostnameForKey(driveA) + ':1' }),
    /Invalid token origin/
  )
})

test('bound drive listeners never serve clearnet publisher content', async (t) => {
  const proxy = new HyperProxy(async () => null, () => {}, null, { perDriveOrigins: true })
  let clearnetCalls = 0
  proxy.setClearnetHandler(async (_req, res) => {
    clearnetCalls++
    res.statusCode = 200
    res.end('<script>window.publisherCodeRan = true</script>')
    return true
  })
  await proxy.start()
  t.after(() => proxy.stop())

  const driveUrl = await proxy.localUrlForDrive(driveA, 'hyper', '/index.html')
  const driveOrigin = new URL(driveUrl).origin
  const mainOrigin = `http://127.0.0.1:${proxy.port}`
  const encoded = Buffer.from('https://attacker.example/').toString('base64url')
  const clearnetPath = `/clearnet/${encoded}`

  const originlessNavigation = await httpGet(driveOrigin + clearnetPath)
  assert.equal(originlessNavigation.statusCode, 403)
  assert.equal(originlessNavigation.body, 'Clearnet proxy unavailable on drive origin')
  assert.equal(originlessNavigation.headers['access-control-allow-origin'], undefined)

  const preflight = await httpGet(driveOrigin + clearnetPath, {
    method: 'OPTIONS', headers: { origin: driveOrigin }
  })
  assert.equal(preflight.statusCode, 403)
  assert.equal(preflight.headers['access-control-allow-origin'], undefined)

  const fallback = await httpGet(driveOrigin + '/publisher-script.js', {
    headers: { referer: driveOrigin + clearnetPath }
  })
  assert.equal(fallback.statusCode, 404)
  assert.equal(clearnetCalls, 0)

  // A drive-shaped Host on the main port would inherit that drive's cookies:
  // browser cookies follow the hostname, even when the listener port changes.
  for (const hostileHost of [
    `${new URL(driveUrl).hostname}:${proxy.port}`,
    `localhost:${proxy.port}`,
    `evil.localhost:${proxy.port}`
  ]) {
    const denied = await httpGet(mainOrigin + clearnetPath, {
      headers: { host: hostileHost }
    })
    assert.equal(denied.statusCode, 403)
    assert.equal(denied.body, 'Invalid proxy host')
    assert.equal(denied.headers['access-control-allow-origin'], undefined)
  }
  const absoluteTarget = makeRes()
  await proxy._handle(makeReq('GET', driveOrigin + clearnetPath, {
    headers: { host: new URL(mainOrigin).host }
  }), absoluteTarget)
  assert.equal(absoluteTarget.statusCode, 403)
  assert.equal(absoluteTarget.body, 'Invalid request target')
  const absoluteWireTarget = await httpGet(mainOrigin + clearnetPath, {
    requestTarget: driveOrigin + clearnetPath
  })
  assert.equal(absoluteWireTarget.statusCode, 403)
  assert.equal(absoluteWireTarget.body, 'Invalid request target')
  const malformedTarget = makeRes()
  await proxy._handle(makeReq('GET', 'http://[invalid', {
    headers: { host: new URL(mainOrigin).host }
  }), malformedTarget)
  assert.equal(malformedTarget.statusCode, 400)
  assert.equal(malformedTarget.body, 'Invalid request target')
  assert.equal(clearnetCalls, 0)

  const mainClearnet = await httpGet(mainOrigin + clearnetPath)
  assert.equal(mainClearnet.statusCode, 200)
  assert.equal(clearnetCalls, 1)
})

test('HyperProxy refuses navigation when drive listener allocation fails', async (t) => {
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

  await assert.rejects(proxy.localUrlForDrive(driveA, 'hyper', '/index.html'), /bind refused/)
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
  assert.equal(proxy.driveKeyForLocalUrl(urlA), '')
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
  const noHost = await request(bridge, 'GET', '/api/identity', {
    headers: { 'x-pear-token': 'good' }
  })
  assert.equal(noHost.res.statusCode, 403)
  assert.equal(noHost.res.json.error, 'Token origin mismatch')

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
