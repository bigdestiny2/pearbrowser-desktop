import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import nodeCrypto from 'node:crypto'

const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-http1') return {}
  if (request === 'bare-ws') return {}
  if (request === 'hypercore-crypto') return { randomBytes: nodeCrypto.randomBytes }
  return originalLoad.call(this, request, parent, isMain)
}
const { TabRuntime } = (await import('../backend/tab-runtime.js')).default
Module._load = originalLoad

test('TabRuntime binds an authenticated context bridge to its own wrapper URLs', () => {
  const runtime = new TabRuntime()
  runtime.httpPort = 7411
  runtime.wsPort = 7412
  runtime._wrapper = '<!doctype html><html><head></head><body>worker</body></html>'
  runtime._assets = {}

  const opened = runtime.open('demo')
  assert.match(opened.contextToken, /^[0-9a-f]{64}$/)
  assert.equal(runtime.contextTokenForUrl(opened.url), opened.contextToken)
  assert.equal(runtime.contextTokenForUrl('http://127.0.0.1:9999/tab/tab1'), null)
  assert.equal(runtime.contextTokenForUrl('https://example.com/tab/tab1'), null)

  const res = {
    headers: {},
    setHeader (name, value) { this.headers[name.toLowerCase()] = value },
    end (body) { this.body = String(body || '') }
  }
  runtime._serve({ url: new URL(opened.url).pathname }, res)
  assert.equal(res.headers['content-type'], 'text/html; charset=utf-8')
  assert.match(res.body, new RegExp(`<meta name="pear-page-context-token" content="${opened.contextToken}">`))
  assert.match(res.body, /pearbrowser:context-request/)
})

