import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import Module, { createRequire } from 'node:module'
import nodeCrypto from 'node:crypto'

const require = createRequire(import.meta.url)
const {
  encodeClearnetTarget,
  decodeClearnetTarget,
  localClearnetUrl,
  parseClearnetPath,
  resolveClearnetFallback,
  rewriteHtmlForProxy,
  buildClearnetInjections,
  handleClearnetRequest
} = require('../backend/clearnet-proxy.cjs')
const { ContentShield } = require('../backend/content-shield.cjs')
const { SessionBridge } = require('../backend/session-bridge.cjs')

// hyper-proxy shim for chokepoint test
const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-crypto') return nodeCrypto
  if (request === 'bare-http1') return {}
  return origLoad.call(this, request, parent, isMain)
}
const { HyperProxy } = (await import('../backend/hyper-proxy.js')).default
Module._load = origLoad

test('encode/decode clearnet target is stable', () => {
  const url = 'https://example.com/path?q=1'
  const enc = encodeClearnetTarget(url)
  assert.equal(decodeClearnetTarget(enc), url)
  assert.equal(parseClearnetPath(`/clearnet/${enc}`).target, url)
  assert.match(localClearnetUrl(9876, url), /^http:\/\/127\.0\.0\.1:9876\/clearnet\//)
})

test('rewriteHtmlForProxy rewrites href/src to proxy paths', () => {
  const html = `<html><head></head><body>
    <a href="/next">n</a>
    <img src="https://cdn.example/a.png">
    <link rel="stylesheet" href="style.css">
  </body></html>`
  const out = rewriteHtmlForProxy(html, 'https://example.com/page', 'http://127.0.0.1:9')
  assert.match(out, /\/clearnet\//)
  assert.match(out, /<meta name="pear-clearnet-origin" content="https:\/\/example\.com">/)
  assert.doesNotMatch(out, /href="\/next"/)
  // Absolute CDN URL is base64url-encoded into the proxy path
  assert.match(out, /clearnet\/[A-Za-z0-9_-]+/)
  assert.ok(out.includes(encodeClearnetTarget('https://cdn.example/a.png')))
})

test('rewriteHtmlForProxy leaves JavaScript text intact while rewriting markup and styles', () => {
  const script = 'const preload = url(\'/media/app.js\'); const html = \'<img src="/do-not-touch.png">\''
  const html = `<html><head><style>.hero{background:url('/hero.png')}</style></head><body>
    <script>${script}</script>
    <div style="background:url('/tile.png')"></div>
  </body></html>`
  const out = rewriteHtmlForProxy(html, 'https://news.example/story', 'http://127.0.0.1:9')

  assert.ok(out.includes(`<script>${script}</script>`))
  assert.ok(out.includes(encodeClearnetTarget('https://news.example/hero.png')))
  assert.ok(out.includes(encodeClearnetTarget('https://news.example/tile.png')))
  assert.equal(out.includes(encodeClearnetTarget('https://news.example/do-not-touch.png')), false)
})

test('rewriteHtmlForProxy decodes HTML character references before encoding targets', () => {
  const target = 'https://media.example/video.mp4?c=original&width=1280'
  const html = '<video src="https://media.example/video.mp4?c&#x3D;original&amp;width&#61;1280"></video>'
  const out = rewriteHtmlForProxy(html, 'https://news.example/story', 'http://127.0.0.1:9')

  assert.ok(out.includes(encodeClearnetTarget(target)))
  assert.equal(out.includes(encodeClearnetTarget('https://media.example/video.mp4?c&#x3D;original&amp;width&#61;1280')), false)
})

test('resolveClearnetFallback maps dynamic root paths through the referring upstream page', () => {
  const documentUrl = 'https://www.cnn.com/world/story'
  const proxyOrigin = 'http://127.0.0.1:51177'
  const referer = `${proxyOrigin}/clearnet/${encodeClearnetTarget(documentUrl)}`
  const resolved = resolveClearnetFallback(referer, '/media/sites/app.js?v=1', proxyOrigin)

  assert.ok(resolved)
  assert.equal(parseClearnetPath(resolved.pathname).target, 'https://www.cnn.com/media/sites/app.js?v=1')
  assert.equal(resolveClearnetFallback('https://attacker.example/', '/media/app.js', proxyOrigin), null)
})

test('buildClearnetInjections adds shield CSS, scriptlets, farbling', () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('t', '||ads.example^\n##.ad-banner\n##+js(set-constant, ads.on, false)')
  const { htmlFragment, scriptBodies } = buildClearnetInjections({
    contentShield: shield,
    documentUrl: 'https://news.example/',
    privacy: { fingerprintFarbling: true },
    farblingSalt: 'unit'
  })
  assert.match(htmlFragment, /data-pear-shield/)
  assert.match(htmlFragment, /\.ad-banner/)
  assert.match(htmlFragment, /data-pear-scriptlet/)
  assert.match(htmlFragment, /data-pear-farbling/)
  assert.ok(scriptBodies.length >= 2)
})

test('clearnet injection contains style-only plugin CSS inside its style element', () => {
  const payload = '</style><script>window.__clearnetBreakout=1</script><style>'
  const shield = new ContentShield({ builtinList: false })
  shield.applyPluginContribution('style-only', {
    styles: { matches: ['*'], css: payload }
  }, ['pear.content.styles'])

  const { htmlFragment } = buildClearnetInjections({
    contentShield: shield,
    documentUrl: 'https://news.example/',
    privacy: {}
  })
  const style = htmlFragment.match(/<style data-pear-plugin-style>([\s\S]*?)<\/style>/)
  assert.ok(style)
  assert.equal(style[1].includes('</style>'), false)
  assert.equal(htmlFragment.includes('<script>window.__clearnetBreakout=1</script>'), false)
  assert.match(style[1], /\\3c \/style>/)
})

test('handleClearnetRequest blocks before fetch when shield matches', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('t', '||evil-ads.example^')
  let fetched = 0
  const req = new EventEmitter()
  req.method = 'GET'
  req.headers = {}
  const res = {
    statusCode: 200,
    headers: {},
    setHeader (k, v) { this.headers[k.toLowerCase()] = v },
    end (body) { this.body = String(body || ''); this.ended = true }
  }
  const target = 'https://evil-ads.example/pixel.gif'
  const path = `/clearnet/${encodeClearnetTarget(target)}`
  await handleClearnetRequest(req, res, new URL(path, 'http://127.0.0.1:9'), {
    contentShield: shield,
    privacy: {},
    proxyOrigin: 'http://127.0.0.1:9',
    fetchClearnet: async () => { fetched++; return { statusCode: 200, headers: {}, body: Buffer.from('x') } }
  })
  assert.equal(res.statusCode, 403)
  assert.equal(res.headers['x-pear-shield'], 'blocked')
  assert.equal(fetched, 0)
})

test('handleClearnetRequest rewrites HTML and injects shield on pass-through', async () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('t', '##.ad')
  const req = new EventEmitter()
  req.method = 'GET'
  req.headers = { accept: 'text/html' }
  const res = {
    statusCode: 200,
    headers: {},
    _headers: {},
    setHeader (k, v) { this.headers[k.toLowerCase()] = v; this._headers[k.toLowerCase()] = v },
    getHeader (k) { return this._headers[k.toLowerCase()] },
    end (body) { this.body = Buffer.isBuffer(body) ? body.toString('utf8') : String(body || ''); this.ended = true }
  }
  const target = 'https://example.com/'
  await handleClearnetRequest(req, res, new URL(`/clearnet/${encodeClearnetTarget(target)}`, 'http://127.0.0.1:9'), {
    contentShield: shield,
    privacy: { fingerprintFarbling: true, blockThirdPartyCookies: true },
    proxyOrigin: 'http://127.0.0.1:9',
    fetchClearnet: async () => ({
      statusCode: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'set-cookie': 'track=1' },
      body: Buffer.from('<html><head></head><body><a href="/x">x</a></body></html>')
    })
  })
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['x-pear-clearnet'], '1')
  assert.match(res.body, /data-pear-shield/)
  assert.match(res.body, /data-pear-farbling/)
  assert.match(res.body, /\/clearnet\//)
  assert.equal(res.headers['set-cookie'], undefined)
})

test('handleClearnetRequest strips framing/report headers and forwards browser request headers', async () => {
  const req = new EventEmitter()
  req.method = 'GET'
  req.headers = {
    accept: 'text/html',
    'accept-language': 'en-AU,en;q=0.9',
    'user-agent': 'Mozilla/5.0 Test Chromium',
    range: 'bytes=0-1023'
  }
  const res = {
    statusCode: 200,
    headers: {},
    setHeader (k, v) { this.headers[k.toLowerCase()] = v },
    getHeader (k) { return this.headers[k.toLowerCase()] },
    end (body) { this.body = Buffer.isBuffer(body) ? body.toString('utf8') : String(body || '') }
  }
  let seenOptions
  await handleClearnetRequest(
    req,
    res,
    new URL(`/clearnet/${encodeClearnetTarget('https://www.news.com.au/')}`, 'http://127.0.0.1:9'),
    {
      proxyOrigin: 'http://127.0.0.1:9',
      fetchClearnet: async (target, options) => {
        seenOptions = options
        return {
          statusCode: 200,
          headers: {
            'content-type': 'text/html',
            'content-security-policy': "default-src 'self'",
            'content-security-policy-report-only': "frame-ancestors 'self'; report-uri /csp-reports",
            'x-frame-options': 'SAMEORIGIN',
            'report-to': '{"group":"csp"}',
            nel: '{"report_to":"csp"}'
          },
          body: Buffer.from('<html><head></head><body>ok</body></html>')
        }
      }
    }
  )

  assert.equal(seenOptions.headers['User-Agent'], 'Mozilla/5.0 Test Chromium')
  assert.equal(seenOptions.headers['Accept-Language'], 'en-AU,en;q=0.9')
  assert.equal(seenOptions.headers.Range, 'bytes=0-1023')
  assert.equal(res.headers['content-security-policy'], undefined)
  assert.equal(res.headers['content-security-policy-report-only'], undefined)
  assert.equal(res.headers['x-frame-options'], undefined)
  assert.equal(res.headers['report-to'], undefined)
  assert.equal(res.headers.nel, undefined)
})

test('handleClearnetRequest offers direct mode only for a publisher-blocked navigation', async () => {
  const req = new EventEmitter()
  req.method = 'GET'
  req.headers = {
    accept: 'text/html',
    'sec-fetch-dest': 'iframe',
    'sec-fetch-mode': 'navigate'
  }
  const res = {
    statusCode: 200,
    headers: {},
    setHeader (k, v) { this.headers[k.toLowerCase()] = v },
    getHeader (k) { return this.headers[k.toLowerCase()] },
    end (body) { this.body = Buffer.isBuffer(body) ? body.toString('utf8') : String(body || '') }
  }
  const target = 'https://www.cnn.com/'
  await handleClearnetRequest(
    req,
    res,
    new URL(`/clearnet/${encodeClearnetTarget(target)}`, 'http://127.0.0.1:9'),
    {
      proxyOrigin: 'http://127.0.0.1:9',
      fetchClearnet: async () => ({ statusCode: 403, headers: {}, body: Buffer.alloc(0) })
    }
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['x-pear-clearnet-fallback'], 'direct')
  assert.match(res.body, /pearbrowser:clearnet-direct-fallback/)
  assert.match(res.body, /https:\/\/www\.cnn\.com\//)
  assert.match(res.body, /Content Shield is unavailable/)
})

test('SessionBridge resolves clearnet to proxy localUrl by default', () => {
  const bridge = new SessionBridge({
    getShield: () => new ContentShield({ builtinList: false }),
    getPrivacy: () => ({ clearnetMode: 'proxy', httpsOnly: true, stripTrackingParams: true }),
    getProxyPort: () => 9876
  })
  const r = bridge.resolveNavigation('http://example.com/?utm_source=x')
  assert.equal(r.kind, 'clearnet')
  assert.equal(r.mode, 'proxy')
  assert.equal(r.upgraded, true)
  assert.ok(r.stripped.includes('utm_source'))
  assert.match(r.localUrl, /^http:\/\/127\.0\.0\.1:9876\/clearnet\//)
  assert.equal(r.shieldActive, true)
  assert.equal(r.url.startsWith('https://'), true)
})

test('SessionBridge direct mode returns real https URL', () => {
  const bridge = new SessionBridge({
    getPrivacy: () => ({ clearnetMode: 'direct' }),
    getProxyPort: () => 9876
  })
  const r = bridge.resolveNavigation('https://example.com/')
  assert.equal(r.mode, 'direct')
  assert.equal(r.localUrl, 'https://example.com/')
  assert.equal(r.shieldActive, false)
})

test('SessionBridge.shouldBlockRequest uses ContentShield', () => {
  const shield = new ContentShield({ builtinList: false })
  shield.addList('t', '||tracker.example^')
  const bridge = new SessionBridge({ getShield: () => shield })
  assert.equal(bridge.shouldBlockRequest({ url: 'https://tracker.example/x' }).cancel, true)
  assert.equal(bridge.shouldBlockRequest({ url: 'https://ok.example/' }).cancel, false)
})

test('HyperProxy routes /clearnet/* to clearnet handler', async () => {
  const proxy = new HyperProxy(async () => null, () => {})
  proxy._port = 9876
  let seen = null
  proxy.setClearnetHandler(async (req, res, urlObj, deps) => {
    seen = { path: urlObj.pathname, hasShield: !!deps.contentShield }
    res.statusCode = 204
    res.end()
    return true
  })
  proxy.setContentShield(new ContentShield({ builtinList: false }))
  const req = new EventEmitter()
  req.method = 'GET'
  req.url = `/clearnet/${encodeClearnetTarget('https://example.com/')}`
  req.headers = {}
  req.socket = { remoteAddress: '127.0.0.1' }
  const res = {
    statusCode: 200,
    headers: {},
    setHeader (k, v) { this.headers[k.toLowerCase()] = v },
    end () { this.ended = true }
  }
  await proxy._handle(req, res)
  assert.ok(seen)
  assert.match(seen.path, /^\/clearnet\//)
  assert.equal(seen.hasShield, true)
  assert.equal(res.statusCode, 204)
})

test('HyperProxy routes dynamic root paths using a clearnet referer', async () => {
  const proxy = new HyperProxy(async () => null, () => {})
  proxy._port = 51177
  let seen = null
  proxy.setClearnetHandler(async (req, res, urlObj) => {
    seen = parseClearnetPath(urlObj.pathname).target
    res.statusCode = 204
    res.end()
    return true
  })
  const req = new EventEmitter()
  req.method = 'GET'
  req.url = '/media/sites/js/app.js'
  req.headers = {
    referer: `http://127.0.0.1:51177/clearnet/${encodeClearnetTarget('https://www.cnn.com/story')}`
  }
  req.socket = { remoteAddress: '127.0.0.1' }
  const res = {
    statusCode: 200,
    headers: {},
    setHeader (k, v) { this.headers[k.toLowerCase()] = v },
    end () { this.ended = true }
  }

  await proxy._handle(req, res)

  assert.equal(seen, 'https://www.cnn.com/media/sites/js/app.js')
  assert.equal(res.statusCode, 204)
})
