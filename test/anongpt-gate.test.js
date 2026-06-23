import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import Module from 'node:module'
import nodeCrypto from 'node:crypto'

// hyper-proxy.js is Bare-targeted because it imports bare-http1 and
// bare-crypto. These tests only exercise pure injection/gating helpers,
// so node:crypto and a no-op HTTP shim are enough to load the real class.
const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-crypto') return nodeCrypto
  if (request === 'bare-http1') return {}
  return origLoad.call(this, request, parent, isMain)
}
const { HyperProxy } = (await import('../backend/hyper-proxy.js')).default
Module._load = origLoad

const { HttpBridge } = (await import('../backend/http-bridge.js')).default

const anonDrive = 'e3cf8b6fae6260608cbfcdf6b82d985c65f5ad1b9c85e777e296e7c521213abc'
const otherDrive = 'f'.repeat(64)

const validManifest = {
  name: 'anonGPT',
  permissions: ['pear.anongpt.infer'],
  privacy: {
    storesPrompts: false,
    remoteHttpInference: 'forbidden',
    requiresLocalRuntime: true
  }
}

function makeProxy (manifestByDrive = {}) {
  const proxy = new HyperProxy(async () => null, () => {})
  proxy._port = 9876
  proxy.issueApiToken = () => 'test-token'
  proxy.setPearSwarmShim('<script>window.__swarmShim = true</script>')
  proxy.setAnongptShim('<script>window.__anongptShim = true</script>')
  proxy.setAnongptDriveKey(anonDrive)
  proxy._fetchP2P = async (driveKeyHex, path) => {
    assert.equal(path, '/manifest.json')
    const manifest = manifestByDrive[driveKeyHex]
    return manifest
      ? { content: Buffer.from(JSON.stringify(manifest)) }
      : null
  }
  return proxy
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
  const url = new URL(path, 'http://127.0.0.1')
  const handled = await bridge.handle(req, res, url)
  return { handled, res }
}

test('anonGPT shim is injected only for the configured drive with manifest privacy claims', async () => {
  const proxy = makeProxy({ [anonDrive]: validManifest })

  assert.equal(await proxy._shouldInjectAnongptShim(otherDrive), false)
  assert.equal(await proxy._shouldInjectAnongptShim(anonDrive), true)

  const anonHtml = (await proxy._injectHtmlHead(
    "<html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'\"></head><body></body></html>",
    anonDrive,
    `/hyper/${anonDrive}/`
  )).toString('utf8')

  assert.match(anonHtml, /<meta name="pear-api-token" content="test-token">/)
  assert.match(anonHtml, /window\.__swarmShim = true/)
  assert.match(anonHtml, /window\.__anongptShim = true/)
  assert.match(anonHtml, /script-src 'self' 'sha256-[^']+' 'sha256-[^']+'/)

  const otherHtml = (await proxy._injectHtmlHead(
    '<html><head></head><body></body></html>',
    otherDrive,
    `/hyper/${otherDrive}/`
  )).toString('utf8')

  assert.match(otherHtml, /window\.__swarmShim = true/)
  assert.doesNotMatch(otherHtml, /window\.__anongptShim = true/)
})

test('hyper:// page links are intercepted before the OS protocol handler sees them', async () => {
  const proxy = makeProxy()

  const html = (await proxy._injectHtmlHead(
    '<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"></head><body><a href="hyper://f0cd01e3565a9e/bundle">P2P Builder</a></body></html>',
    otherDrive,
    `/hyper/${otherDrive}/`
  )).toString('utf8')

  assert.match(html, /window\.__pearBrowserHyperLinkBridge = true/)
  assert.match(html, /type: 'pearbrowser:navigate'/)
  assert.match(html, /document\.addEventListener\('click', handleHyperLink, true\)/)
  assert.match(html, /document\.addEventListener\('auxclick', handleHyperLink, true\)/)

  const policy = html.match(/script-src[^"]+/)?.[0] || ''
  const hashes = policy.match(/'sha256-[^']+'/g) || []
  assert.ok(hashes.length >= 2, 'CSP authorizes both the link bridge and runtime shim')
})

test('anonGPT shim gate fails closed for missing or unsafe manifest declarations', async () => {
  const warn = console.warn
  console.warn = () => {}
  try {
    const missingPermission = makeProxy({
      [anonDrive]: {
        name: 'anonGPT',
        privacy: validManifest.privacy
      }
    })
    assert.equal(await missingPermission._shouldInjectAnongptShim(anonDrive), false)

    const remoteHttpAllowed = makeProxy({
      [anonDrive]: {
        ...validManifest,
        privacy: { ...validManifest.privacy, remoteHttpInference: 'allowed' }
      }
    })
    assert.equal(await remoteHttpAllowed._shouldInjectAnongptShim(anonDrive), false)

    const nestedPermission = makeProxy({
      [anonDrive]: {
        name: 'anonGPT',
        pear: { anongpt: { infer: true } },
        privacy: validManifest.privacy
      }
    })
    assert.equal(await nestedPermission._shouldInjectAnongptShim(anonDrive), true)
  } finally {
    console.warn = warn
  }
})

test('anonGPT HTTP bridge route requires an anonGPT-scoped token and fails closed without a buyer', async () => {
  const calls = []
  const http = new HttpBridge({}, null, null, {
    validateToken: token => token === 'anon-token' ? anonDrive : token === 'other-token' ? otherDrive : null,
    anongptDriveKey: anonDrive,
    anongptBuyer: {
      async infer (payload) {
        calls.push(payload)
        return { ok: true, text: 'local answer', verify: { ok: true } }
      }
    }
  })

  const unauthorized = await request(http, 'POST', '/api/anongpt/infer', { body: { prompt: 'hi' } })
  assert.equal(unauthorized.handled, true)
  assert.equal(unauthorized.res.statusCode, 401)

  const forbidden = await request(http, 'POST', '/api/anongpt/infer', {
    headers: { 'x-pear-token': 'other-token' },
    body: { prompt: 'hi' }
  })
  assert.equal(forbidden.res.statusCode, 403)
  assert.equal(calls.length, 0)

  const allowed = await request(http, 'POST', '/api/anongpt/infer', {
    headers: { 'x-pear-token': 'anon-token' },
    body: { prompt: 'hi' }
  })
  assert.equal(allowed.res.statusCode, 200)
  assert.deepEqual(allowed.res.json, { ok: true, text: 'local answer', verify: { ok: true } })
  assert.deepEqual(calls, [{ prompt: 'hi' }])

  const noBuyer = new HttpBridge({}, null, null, {
    validateToken: token => token === 'anon-token' ? anonDrive : null,
    anongptDriveKey: anonDrive
  })
  const failClosed = await request(noBuyer, 'POST', '/api/anongpt/infer', {
    headers: { 'x-pear-token': 'anon-token' },
    body: { prompt: 'hi' }
  })
  assert.equal(failClosed.res.statusCode, 200)
  assert.equal(failClosed.res.json.ok, false)
  assert.equal(failClosed.res.json.code, 'buyer-not-configured')
})
