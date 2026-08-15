import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import nodeCrypto from 'node:crypto'
import { createRequire } from 'node:module'

// hyper-proxy.js is Bare-targeted because it imports bare-http1 and
// bare-crypto. These tests only exercise the injection/gating helpers, so
// node:crypto and a no-op HTTP shim are enough to load the real class
// (same harness as anongpt-gate.test.js).
const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-crypto') return nodeCrypto
  if (request === 'bare-http1') return {}
  return origLoad.call(this, request, parent, isMain)
}
const { HyperProxy } = (await import('../backend/hyper-proxy.js')).default
Module._load = origLoad

const require = createRequire(import.meta.url)
const { tabKeyForDrive } = require('../backend/wallet/wallet-documents.cjs')

const walletDrive = 'a1'.repeat(32)
const otherDrive = 'f'.repeat(64)
const ORIGIN = 'http://127.0.0.1:9876'

const walletManifest = {
  name: 'Example test checkout',
  entry: '/index.html',
  permissions: ['pear.wallet.v1.connect', 'pear.wallet.v1.pay']
}
const connectOnlyManifest = {
  name: 'Connect only',
  permissions: ['pear.wallet.v1.connect']
}
const noPermissionManifest = {
  name: 'No wallet',
  permissions: ['pear.anongpt.infer']
}

const WALLET_SHIM = '<script>window.__pearWalletShim = true</script>'

function makeProxy (manifestByDrive = {}, { enabled = true } = {}) {
  const proxy = new HyperProxy(async () => null, () => {})
  proxy._port = 9876
  proxy.issueApiToken = () => 'test-api-token'
  proxy.setPearSwarmShim('<script>window.__swarmShim = true</script>')
  proxy.setPearWalletShim(WALLET_SHIM)
  proxy.setWalletEnabled(enabled)
  proxy._fetchP2P = async (driveKeyHex, path) => {
    assert.equal(path, '/manifest.json')
    const manifest = manifestByDrive[driveKeyHex]
    return manifest
      ? { content: Buffer.from(JSON.stringify(manifest)) }
      : null
  }
  return proxy
}

async function inject (proxy, driveKeyHex, injectOpts) {
  const html = await proxy._injectHtmlHead(
    "<html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'\"></head><body></body></html>",
    driveKeyHex,
    `/hyper/${driveKeyHex}/`,
    null,
    injectOpts
  )
  return html.toString('utf8')
}

test('gate matrix: flag off / manifest missing / permission missing are not injected', async () => {
  // Flag off — everything else eligible.
  const offProxy = makeProxy({ [walletDrive]: walletManifest }, { enabled: false })
  assert.equal(await offProxy._shouldInjectWalletShim(walletDrive), false)
  const offHtml = await inject(offProxy, walletDrive)
  assert.doesNotMatch(offHtml, /window\.__pearWalletShim/)
  assert.doesNotMatch(offHtml, /pear-wallet-doc/)

  // Flag on, manifest missing.
  const noManifestProxy = makeProxy({})
  assert.equal(await noManifestProxy._shouldInjectWalletShim(walletDrive), false)

  // Flag on, manifest without the connect permission.
  const noPermProxy = makeProxy({ [walletDrive]: noPermissionManifest })
  assert.equal(await noPermProxy._shouldInjectWalletShim(walletDrive), false)
  const noPermHtml = await inject(noPermProxy, walletDrive)
  assert.doesNotMatch(noPermHtml, /window\.__pearWalletShim/)

  // Malformed drive key.
  assert.equal(await noPermProxy._shouldInjectWalletShim('not-a-drive-key'), false)

  // No shim string set at all — fail closed even with flag + manifest.
  const bareProxy = makeProxy({ [walletDrive]: walletManifest })
  bareProxy.setPearWalletShim('')
  assert.equal(await bareProxy._shouldInjectWalletShim(walletDrive), false)
})

test('all gate conditions inject the shim exactly once, with meta and CSP hash', async () => {
  const proxy = makeProxy({ [walletDrive]: walletManifest })
  assert.equal(await proxy._shouldInjectWalletShim(walletDrive), true)

  const html = await inject(proxy, walletDrive)
  assert.equal(html.match(/window\.__pearWalletShim/g).length, 1)
  assert.match(html, /<meta name="pear-wallet-doc" content="[0-9a-f]{32}">/)
  assert.match(html, /<meta name="pear-api-token" content="test-api-token">/)
  // CSP stays hash-only: the wallet shim's sha256 is appended to script-src,
  // and 'unsafe-inline' is never added.
  assert.match(html, /script-src 'self'( 'sha256-[^']+')+/)
  assert.doesNotMatch(html, /unsafe-inline/)

  // The minted document token verifies against this drive/origin tuple.
  const token = html.match(/<meta name="pear-wallet-doc" content="([0-9a-f]{32})">/)[1]
  const tuple = {
    browserSessionId: 'session-test',
    tabId: tabKeyForDrive(walletDrive),
    driveKey: walletDrive,
    walletTabOrigin: ORIGIN
  }
  assert.equal(await proxy.walletDocuments.verify({ tuple, token }), true)
})

test('connect-only manifest passes the gate; pay is enforced per-operation', async () => {
  const proxy = makeProxy({ [walletDrive]: connectOnlyManifest })
  assert.equal(await proxy._shouldInjectWalletShim(walletDrive), true)
})

test('a second gated HTML response revokes the first document token', async () => {
  const proxy = makeProxy({ [walletDrive]: walletManifest })
  const first = await inject(proxy, walletDrive)
  const firstToken = first.match(/<meta name="pear-wallet-doc" content="([0-9a-f]{32})">/)[1]
  const second = await inject(proxy, walletDrive)
  const secondToken = second.match(/<meta name="pear-wallet-doc" content="([0-9a-f]{32})">/)[1]
  assert.notEqual(firstToken, secondToken)
  const tuple = {
    browserSessionId: 'session-test',
    tabId: tabKeyForDrive(walletDrive),
    driveKey: walletDrive,
    walletTabOrigin: ORIGIN
  }
  assert.equal(await proxy.walletDocuments.verify({ tuple, token: firstToken }), false)
  assert.equal(await proxy.walletDocuments.verify({ tuple, token: secondToken }), true)
})

test('nested-frame HTML (Sec-Fetch-Dest: iframe) gets no wallet shim or token', async () => {
  const proxy = makeProxy({ [walletDrive]: walletManifest })
  const frameHtml = await inject(proxy, walletDrive, { secFetchDest: 'iframe' })
  assert.doesNotMatch(frameHtml, /window\.__pearWalletShim/)
  assert.doesNotMatch(frameHtml, /pear-wallet-doc/)
  // The root document afterwards still gets its token — the frame did not
  // mint or revoke anything.
  const rootHtml = await inject(proxy, walletDrive, { secFetchDest: 'document' })
  assert.match(rootHtml, /window\.__pearWalletShim/)
  assert.equal(proxy.walletDocuments.size, 1)
})

test('other drives are unaffected by the wallet gate', async () => {
  const proxy = makeProxy({ [walletDrive]: walletManifest })
  const otherHtml = await inject(proxy, otherDrive)
  assert.match(otherHtml, /window\.__swarmShim = true/)
  assert.doesNotMatch(otherHtml, /window\.__pearWalletShim/)
  assert.doesNotMatch(otherHtml, /pear-wallet-doc/)
})
