import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import Module from 'node:module'
import nodeCrypto from 'node:crypto'
import { createRequire } from 'node:module'

// hyper-proxy.js is Bare-targeted (bare-http1/bare-crypto); these tests only
// exercise the shield chokepoints, so the anongpt-gate shim approach applies.
const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-crypto') return nodeCrypto
  if (request === 'bare-http1') return {}
  return origLoad.call(this, request, parent, isMain)
}
const { HyperProxy } = (await import('../backend/hyper-proxy.js')).default
Module._load = origLoad

const require = createRequire(import.meta.url)
const { ContentShield } = require('../backend/content-shield.cjs')

const DRIVE = 'a'.repeat(64)

function makeProxy (shield) {
  const fetches = []
  const proxy = new HyperProxy(async () => null, () => {})
  proxy._port = 9876
  proxy.issueApiToken = () => 'test-token'
  proxy._hybridFetch = async (driveKeyHex, filePath) => {
    fetches.push(`${driveKeyHex}:${filePath}`)
    return { content: Buffer.from('served-bytes'), contentType: 'text/plain', source: 'test' }
  }
  if (shield) proxy.setContentShield(shield)
  return { proxy, fetches }
}

function makeReq (method, path) {
  const req = new EventEmitter()
  req.method = method
  req.url = path
  req.headers = {}
  req.socket = { remoteAddress: '127.0.0.1' }
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
      this.ended = true
    }
  }
}

test('a blocked subresource is refused before any P2P/relay fetch', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('test', '||doubleclick.net^')
  const { proxy, fetches } = makeProxy(shield)

  const res = makeRes()
  await proxy._handle(makeReq('GET', `/hyper/${DRIVE}/vendor/doubleclick.net/ad.js`), res)

  assert.equal(res.statusCode, 403)
  assert.equal(res.headers['x-pear-shield'], 'blocked')
  assert.match(res.body, /Blocked by PearBrowser Shield/)
  assert.deepEqual(fetches, [])
  assert.equal(shield.stats().blocked, 1)
})

test('an ordinary request passes the shield and reaches the fetch path', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('test', '||doubleclick.net^')
  const { proxy, fetches } = makeProxy(shield)

  const res = makeRes()
  await proxy._handle(makeReq('GET', `/hyper/${DRIVE}/app.js`), res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body, 'served-bytes')
  assert.deepEqual(fetches, [`${DRIVE}:/app.js`])
})

test('a disabled shield restores pass-through behavior', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('test', '||doubleclick.net^')
  shield.setEnabled(false)
  const { proxy, fetches } = makeProxy(shield)

  const res = makeRes()
  await proxy._handle(makeReq('GET', `/hyper/${DRIVE}/vendor/doubleclick.net/ad.js`), res)

  assert.equal(res.statusCode, 200)
  assert.equal(fetches.length, 1)
})

test('HTML injection carries the cosmetic style block only when enabled', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('test', '##.ad-banner')
  const { proxy } = makeProxy(shield)

  const html = '<html><head></head><body>hi</body></html>'
  const injected = (await proxy._injectHtmlHead(Buffer.from(html), DRIVE, `/hyper/${DRIVE}/index.html`)).toString('utf8')
  assert.match(injected, /<style data-pear-shield>/)
  assert.match(injected, /\.ad-banner \{ display: none !important; \}/)

  shield.setEnabled(false)
  const clean = (await proxy._injectHtmlHead(Buffer.from(html), DRIVE, `/hyper/${DRIVE}/index.html`)).toString('utf8')
  assert.doesNotMatch(clean, /data-pear-shield/)
})

test('a proxy without a shield behaves exactly as before', async () => {
  const { proxy, fetches } = makeProxy(null)

  const res = makeRes()
  await proxy._handle(makeReq('GET', `/hyper/${DRIVE}/vendor/doubleclick.net/ad.js`), res)
  assert.equal(res.statusCode, 200)
  assert.equal(fetches.length, 1)

  const html = '<html><head></head><body>hi</body></html>'
  const injected = (await proxy._injectHtmlHead(Buffer.from(html), DRIVE, `/hyper/${DRIVE}/index.html`)).toString('utf8')
  assert.doesNotMatch(injected, /data-pear-shield/)
})

const DRIVE_B = 'b'.repeat(64)

test('allowlisted drive restores pass-through; other drives still block', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('test', '||doubleclick.net^')
  shield.allowlistDrive(DRIVE)
  const { proxy, fetches } = makeProxy(shield)

  const allowRes = makeRes()
  await proxy._handle(makeReq('GET', `/hyper/${DRIVE}/vendor/doubleclick.net/ad.js`), allowRes)
  assert.equal(allowRes.statusCode, 200)
  assert.equal(allowRes.headers['x-pear-shield'], 'allowlisted')
  assert.equal(fetches.length, 1)

  // Same rule on a non-allowlisted drive still 403s before fetch
  const blockRes = makeRes()
  const before = fetches.length
  await proxy._handle(makeReq('GET', `/hyper/${DRIVE_B}/vendor/doubleclick.net/ad.js`), blockRes)
  assert.equal(blockRes.statusCode, 403)
  assert.equal(blockRes.headers['x-pear-shield'], 'blocked')
  assert.equal(fetches.length, before)
})

test('strict mode injects confining CSP meta; non-strict drives omit it', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.setStrictDrive(DRIVE, true)
  const { proxy } = makeProxy(shield)

  const html = '<html><head></head><body>hi</body></html>'
  const strictHtml = (await proxy._injectHtmlHead(Buffer.from(html), DRIVE, `/hyper/${DRIVE}/index.html`)).toString('utf8')
  assert.match(strictHtml, /data-pear-shield-strict="1"/)
  assert.match(strictHtml, /Content-Security-Policy/)
  assert.match(strictHtml, /default-src 'self'/)
  assert.match(strictHtml, /connect-src 'self'/)

  const openHtml = (await proxy._injectHtmlHead(Buffer.from(html), DRIVE_B, `/hyper/${DRIVE_B}/index.html`)).toString('utf8')
  assert.doesNotMatch(openHtml, /data-pear-shield-strict/)
})

test('scriptlets ride the hash-authorized inject path', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('s', '##+js(set-constant, ads.enabled, false)')
  const { proxy } = makeProxy(shield)

  const html = '<html><head></head><body>hi</body></html>'
  const injected = (await proxy._injectHtmlHead(Buffer.from(html), DRIVE, `/hyper/${DRIVE}/index.html`)).toString('utf8')
  assert.match(injected, /data-pear-scriptlet="set-constant"/)
  assert.match(injected, /ads\.enabled/)
  // Body is pure JS inside a script tag (sha256ScriptBody path)
  assert.match(injected, /<script data-pear-scriptlet="set-constant">[\s\S]*?<\/script>/)

  shield.setEnabled(false)
  const clean = (await proxy._injectHtmlHead(Buffer.from(html), DRIVE, `/hyper/${DRIVE}/index.html`)).toString('utf8')
  assert.doesNotMatch(clean, /data-pear-scriptlet/)
})

test('plugin styles and scripts inject only when enabled', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.applyPluginContribution('plug', {
    styles: { matches: ['*'], css: '.plug-hide { display:none }' },
    scripts: { matches: ['*'], js: 'window.__plug=1' }
  }, ['pear.content.styles', 'pear.content.scripts'])
  const { proxy } = makeProxy(shield)

  const html = '<html><head></head><body>hi</body></html>'
  const on = (await proxy._injectHtmlHead(Buffer.from(html), DRIVE, `/hyper/${DRIVE}/index.html`)).toString('utf8')
  assert.match(on, /data-pear-plugin-style/)
  assert.match(on, /\.plug-hide/)
  assert.match(on, /data-pear-plugin="plug"/)
  assert.match(on, /window\.__plug=1/)

  shield.setPluginEnabled('plug', false)
  const off = (await proxy._injectHtmlHead(Buffer.from(html), DRIVE, `/hyper/${DRIVE}/index.html`)).toString('utf8')
  assert.doesNotMatch(off, /data-pear-plugin-style/)
  assert.doesNotMatch(off, /data-pear-plugin="plug"/)
})
