'use strict'

// Diagnostic integration smoke: one file:// shell and two production-managed
// Hyper WebContentsViews in one disposable Electron profile. Synthetic pages
// and an ad hoc run do not qualify a signed public release.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const crypto = require('node:crypto')
const http = require('node:http')
const Module = require('node:module')
const path = require('node:path')
const { app, BrowserWindow, ipcMain, session } = require('electron')
const { driveHostnameForKey } = require('../backend/drive-origin.cjs')
const { NativeTabHost } = require('../electron/native-tab-host.cjs')

// The production proxy uses Bare transports. Substitute only these two
// transports while loading it in Electron's Node main process.
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-crypto') return crypto
  if (request === 'bare-http1') return http
  return originalLoad.call(this, request, parent, isMain)
}
let HyperProxy
try { HyperProxy = require('../backend/hyper-proxy.js').HyperProxy } finally { Module._load = originalLoad }

const driveA = 'a'.repeat(64)
const driveB = 'b'.repeat(64)
// The Node runner owns this disposable directory and removes it only after
// Electron has exited, when Windows releases Chromium's profile file handles.
const profile = process.env.PEARBROWSER_NATIVE_TAB_PROFILE
if (!profile || !path.basename(profile).startsWith('pear-native-tabs-') || !fs.statSync(profile).isDirectory()) {
  throw new Error('Native tab smoke requires a runner-owned disposable profile')
}
const shellFile = path.join(profile, 'shell.html')
const hostToken = 'integration-host-token-must-stay-in-shell'
const proofName = 'pear-native-tab-proof'
const bounds = { x: 0, y: 0, width: 800, height: 600 }
const postRequests = []
let phase = 'startup'
app.setPath('userData', profile)
app.on('window-all-closed', () => {})
fs.writeFileSync(shellFile, '<!doctype html><title>PearBrowser test shell</title><body>Shell</body>')
ipcMain.on('pearbrowser:runtime-session', event => { event.returnValue = hostToken })

const server = http.createServer((req, res) => {
  const hostname = String(req.headers.host || '').split(':')[0]
  const pathname = new URL(req.url, 'http://localhost').pathname
  const match = /^\/hyper\/([0-9a-f]{64})\/(index\.html|echo|post|replace\.html)$/.exec(pathname)
  const key = match && match[1]
  if (!key || ![driveA, driveB].includes(key) || hostname !== driveHostnameForKey(key)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    res.end('Forbidden')
    return
  }
  res.setHeader('Cache-Control', 'no-store')
  if (match[2] === 'echo') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ host: req.headers.host, cookie: req.headers.cookie || '' }))
    return
  }
  if (match[2] === 'post') {
    if (req.method !== 'POST') { res.writeHead(405); res.end('POST required'); return }
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      postRequests.push({ key, body })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end('<!doctype html><title>POST preserved</title><body>Posted ' + body + '</body>')
    })
    return
  }
  if (match[2] === 'replace.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end('<!doctype html><title>Replaced</title><body>Replaced in drive</body>')
    return
  }
  const label = key === driveA ? 'A' : 'B'
  res.setHeader('Set-Cookie', [
    'tab_default_' + label + '=' + label + '; Path=/',
    'tab_js_' + label + '=' + label + '; Path=/; SameSite=Lax',
    'tab_http_' + label + '=' + label + '; Path=/; SameSite=Lax; HttpOnly'
  ])
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  const otherKey = key === driveA ? driveB : driveA
  const hyperLink = 'hyper://' + otherKey + '/index.html'
  res.end('<!doctype html><meta charset="utf-8"><title>Drive ' + label + '</title><body>Drive ' + label +
    '<a id="hyper-link" href="' + hyperLink + '">Open Hyper</a>' +
    '<a id="hyper-blank" href="' + hyperLink + '" target="_blank">Open new Hyper tab</a></body>')
})

function waitForPage (contents, expected, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    let timer
    const done = error => {
      clearTimeout(timer)
      contents.removeListener('did-finish-load', check)
      contents.removeListener('did-fail-load', failed)
      if (error) reject(error)
      else resolve()
    }
    const check = () => {
      if (contents.getURL() === expected) done()
    }
    const failed = (_event, code, description, url, isMainFrame) => {
      if (isMainFrame !== false) done(new Error('Native tab load failed (' + code + '): ' + description + '; ' + url))
    }
    contents.on('did-finish-load', check)
    contents.on('did-fail-load', failed)
    timer = setTimeout(() => done(new Error('Native tab did not load: ' + expected)), timeoutMs)
    check()
  })
}

function waitForDestroyed (contents, timeoutMs = 5000) {
  if (contents.isDestroyed()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Native tab contents were not destroyed')), timeoutMs)
    contents.once('destroyed', () => { clearTimeout(timer); resolve() })
  })
}

function waitForEvent (events, predicate, fromIndex, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const poll = () => {
      const found = events.slice(fromIndex).find(predicate)
      if (found) return resolve(found)
      if (Date.now() - started >= timeoutMs) return reject(new Error('Expected native tab event was not emitted'))
      setTimeout(poll, 20)
    }
    poll()
  })
}

function evaluate (contents, fn, ...args) {
  return contents.executeJavaScript('(' + fn.toString() + ')(' + args.map(arg => JSON.stringify(arg)).join(',') + ')')
}

async function writeProof (name, value) {
  localStorage.setItem(name, value)
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('proof')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  await new Promise((resolve, reject) => {
    const transaction = database.transaction('proof', 'readwrite')
    transaction.objectStore('proof').put(value, 'value')
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
  return true
}

async function readProof (name, echoPath) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('proof')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const indexedValue = await new Promise((resolve, reject) => {
    const transaction = database.transaction('proof', 'readonly')
    const request = transaction.objectStore('proof').get('value')
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
  database.close()
  const wire = await fetch(echoPath, { cache: 'no-store' }).then(response => response.json())
  return {
    origin: location.origin,
    cookie: document.cookie,
    localStorage: localStorage.getItem(name),
    indexedDB: indexedValue,
    wire,
    hostBridge: typeof window.pearbrowserRuntime,
    process: typeof window.process,
    require: typeof window.require,
    topIsSelf: window.top === window
  }
}

async function run () {
  let window
  let tabs
  let tabSession
  let proxy
  let checkError
  try {
    phase = 'assertions'
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const port = server.address().port
    const makeUrl = key => 'http://' + driveHostnameForKey(key) + ':' + port + '/hyper/' + key + '/index.html'
    const urlA = makeUrl(driveA)
    const urlB = makeUrl(driveB)
    tabSession = session.fromPartition('pear-native-tabs-' + process.pid + '-' + Date.now())
    window = new BrowserWindow({
      show: false,
      width: bounds.width,
      height: bounds.height,
      webPreferences: {
        preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    })
    await window.loadFile(shellFile)
    if (process.env.NATIVE_TAB_DEBUG) process.stderr.write('shell loaded\n')
    assert.equal(await window.webContents.executeJavaScript('window.pearbrowserRuntime.sessionToken'), hostToken)
    const events = []
    tabs = new NativeTabHost({ window, session: tabSession, emit: event => { events.push(event); if (process.env.NATIVE_TAB_DEBUG) process.stderr.write(JSON.stringify(event) + '\n') } })
    await tabs.load({ tabId: 'tab-drive-a', url: urlA, driveKey: driveA })
    tabs.select({ tabId: 'tab-drive-a', bounds })
    const pageA = tabs.getWebContents('tab-drive-a')
    if (process.env.NATIVE_TAB_DEBUG) process.stderr.write('A view created ' + pageA.getURL() + '\n')
    await waitForPage(pageA, urlA)
    if (process.env.NATIVE_TAB_DEBUG) process.stderr.write('A page loaded\n')
    await tabs.load({ tabId: 'tab-drive-b', url: urlB, driveKey: driveB })
    tabs.select({ tabId: 'tab-drive-b', bounds })
    const pageB = tabs.getWebContents('tab-drive-b')
    if (process.env.NATIVE_TAB_DEBUG) process.stderr.write('B view created ' + pageB.getURL() + '\n')
    await waitForPage(pageB, urlB)
    if (process.env.NATIVE_TAB_DEBUG) process.stderr.write('B page loaded\n')
    assert.notEqual(pageA.id, pageB.id)
    assert.equal(pageA.session, tabSession)
    assert.equal(pageB.session, tabSession)
    assert.equal(window.webContents.getURL().startsWith('file://'), true)

    const echoA = '/hyper/' + driveA + '/echo'
    const echoB = '/hyper/' + driveB + '/echo'
    const beforeB = await evaluate(pageB, readProof, proofName, echoB)
    assert.equal(beforeB.localStorage, null)
    assert.equal(beforeB.indexedDB, null)
    assert.doesNotMatch(beforeB.cookie, /tab_js_A=/)
    assert.doesNotMatch(beforeB.wire.cookie, /tab_http_A=/)
    await evaluate(pageA, writeProof, proofName, 'A-only')
    await evaluate(pageB, writeProof, proofName, 'B-only')
    const afterA = await evaluate(pageA, readProof, proofName, echoA)
    const afterB = await evaluate(pageB, readProof, proofName, echoB)
    for (const [proof, own, other, url] of [[afterA, 'A', 'B', urlA], [afterB, 'B', 'A', urlB]]) {
      assert.equal(proof.origin, new URL(url).origin)
      assert.equal(proof.localStorage, own + '-only')
      assert.equal(proof.indexedDB, own + '-only')
      assert.match(proof.cookie, new RegExp('tab_default_' + own + '=' + own))
      assert.match(proof.cookie, new RegExp('tab_js_' + own + '=' + own))
      assert.doesNotMatch(proof.cookie, new RegExp('tab_http_' + own + '='))
      assert.doesNotMatch(proof.cookie, new RegExp('tab_default_' + other + '='))
      assert.doesNotMatch(proof.cookie, new RegExp('tab_js_' + other + '='))
      assert.match(proof.wire.cookie, new RegExp('tab_http_' + own + '=' + own))
      assert.doesNotMatch(proof.wire.cookie, new RegExp('tab_http_' + other + '='))
      assert.equal(proof.hostBridge, 'undefined')
      assert.equal(proof.process, 'undefined')
      assert.equal(proof.require, 'undefined')
      assert.equal(proof.topIsSelf, true)
    }
    const cookiesA = await tabSession.cookies.get({ url: urlA })
    const cookiesB = await tabSession.cookies.get({ url: urlB })
    for (const [cookies, label] of [[cookiesA, 'A'], [cookiesB, 'B']]) {
      assert.deepEqual(cookies.map(cookie => cookie.name).sort(), ['tab_default_' + label, 'tab_http_' + label, 'tab_js_' + label])
      assert.ok(cookies.every(cookie => cookie.hostOnly === true))
      assert.equal(cookies.find(cookie => cookie.name === 'tab_js_' + label).sameSite, 'lax')
      assert.equal(cookies.find(cookie => cookie.name === 'tab_http_' + label).sameSite, 'lax')
      assert.deepEqual(cookies.filter(cookie => cookie.httpOnly).map(cookie => cookie.name), ['tab_http_' + label])
    }

    const safeHyper = 'hyper://' + driveB + '/index.html'
    let fromEvent = events.length
    await pageA.executeJavaScript("document.getElementById('hyper-link').click()")
    await waitForEvent(events, event => event.tabId === 'tab-drive-a' && event.type === 'open-url' && event.url === safeHyper && event.openInNewTab === false, fromEvent)
    assert.equal(pageA.getURL(), urlA)
    fromEvent = events.length
    await pageA.executeJavaScript("document.getElementById('hyper-blank').click()")
    await waitForEvent(events, event => event.tabId === 'tab-drive-a' && event.type === 'open-url' && event.url === safeHyper && event.openInNewTab === true, fromEvent)
    assert.equal(pageA.getURL(), urlA)

    // Exercise the actual HyperProxy HTML injection in a top-level native
    // view. The shim must route a clicked hyper:// link through the host.
    const proxyPage = '<!doctype html><html><head><title>Proxy drive</title></head><body><a id="proxy-hyper-link" href="' + safeHyper + '">Open peer</a></body></html>'
    const proxyDrive = { version: 1, async get (filePath) { return filePath === '/index.html' ? Buffer.from(proxyPage) : null } }
    proxy = new HyperProxy(async key => key === driveA ? proxyDrive : null, (_route, error) => { throw new Error(String(error)) }, null, { perDriveOrigins: true })
    await proxy.start()
    const proxyUrl = await proxy.localUrlForDrive(driveA, 'hyper', '/index.html')
    await tabs.load({ tabId: 'tab-proxy-a', url: proxyUrl, driveKey: driveA })
    tabs.select({ tabId: 'tab-proxy-a', bounds })
    const proxyContents = tabs.getWebContents('tab-proxy-a')
    await waitForPage(proxyContents, proxyUrl)
    const shimState = await proxyContents.executeJavaScript("({ injected: window.__pearBrowserHyperLinkBridge === true, topLevel: window.parent === window, bypass: Array.from(document.scripts).some(script => script.textContent.includes('window.parent === window')) })")
    assert.deepEqual(shimState, { injected: true, topLevel: true, bypass: true })
    fromEvent = events.length
    await proxyContents.executeJavaScript("document.getElementById('proxy-hyper-link').click()")
    await waitForEvent(events, event => event.tabId === 'tab-proxy-a' && event.type === 'open-url' && event.url === safeHyper && event.openInNewTab === false, fromEvent)
    assert.equal(proxyContents.getURL(), proxyUrl)

    // Publisher code must not create a privileged window or move a tab onto
    // another drive or the file:// shell.
    assert.equal(await pageA.executeJavaScript("window.open('about:blank') === null"), true)
    for (const target of [urlB, window.webContents.getURL()]) {
      try { await pageA.executeJavaScript('location.assign(' + JSON.stringify(target) + ')') } catch {}
      await new Promise(resolve => setTimeout(resolve, 300))
      assert.equal(pageA.getURL(), urlA)
    }

    // Same-origin page navigation stays in Chromium. Sending a POST through
    // shell go() would silently turn it into a GET and break real apps.
    const postUrl = new URL('/hyper/' + driveA + '/post', urlA).href
    fromEvent = events.length
    await pageA.executeJavaScript(`(() => {
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = ${JSON.stringify(postUrl)}
      const input = document.createElement('input')
      input.name = 'proof'
      input.value = 'same-drive'
      form.append(input)
      document.body.append(form)
      form.requestSubmit()
    })()`)
    await waitForPage(pageA, postUrl)
    assert.deepEqual(postRequests, [{ key: driveA, body: 'proof=same-drive' }])
    assert.equal(events.slice(fromEvent).some(event => event.tabId === 'tab-drive-a' && event.type === 'open-url'), false)
    assert.ok(events.slice(fromEvent).some(event => event.tabId === 'tab-drive-a' && event.type === 'navigation' && event.url === 'hyper://' + driveA + '/post'))

    await pageA.loadURL(urlA)
    await waitForPage(pageA, urlA)
    const replaceUrl = new URL('/hyper/' + driveA + '/replace.html', urlA).href
    fromEvent = events.length
    await pageA.executeJavaScript('location.replace(' + JSON.stringify(replaceUrl) + ')')
    await waitForPage(pageA, replaceUrl)
    assert.equal(await pageA.executeJavaScript('document.title'), 'Replaced')
    assert.equal(events.slice(fromEvent).some(event => event.tabId === 'tab-drive-a' && event.type === 'open-url'), false)
    assert.ok(events.slice(fromEvent).some(event => event.tabId === 'tab-drive-a' && event.type === 'navigation' && event.url === 'hyper://' + driveA + '/replace.html'))

    const destroyedA = waitForDestroyed(pageA)
    const destroyedB = waitForDestroyed(pageB)
    const destroyedProxy = waitForDestroyed(proxyContents)
    tabs.close({ tabId: 'tab-drive-a' })
    tabs.close({ tabId: 'tab-drive-b' })
    tabs.close({ tabId: 'tab-proxy-a' })
    await Promise.all([destroyedA, destroyedB, destroyedProxy])
    assert.equal(pageA.isDestroyed(), true)
    assert.equal(pageB.isDestroyed(), true)
    assert.equal(proxyContents.isDestroyed(), true)
  } catch (error) {
    checkError = error
  } finally {
    const cleanupErrors = []
    const cleanup = async (step, action) => {
      phase = step
      try { await action() } catch (error) { cleanupErrors.push(new Error(step + ': ' + String(error?.message || error))) }
    }
    await cleanup('close native views', () => tabs?.closeAll())
    await cleanup('destroy shell window', () => { if (window && !window.isDestroyed()) window.destroy() })
    await cleanup('stop HyperProxy', () => proxy?.stop())
    await cleanup('clear tab session', () => tabSession?.clearStorageData())
    await cleanup('close fixture server', async () => {
      if (!server.listening) return
      const closed = new Promise(resolve => server.close(resolve))
      server.closeAllConnections?.()
      await closed
    })
    if (cleanupErrors.length) {
      const failures = checkError ? [checkError, ...cleanupErrors] : cleanupErrors
      throw new AggregateError(failures, 'Native tab smoke cleanup failed: ' + cleanupErrors.map(error => error.message).join('; '))
    }
  }
  if (checkError) throw checkError
  phase = 'complete'
  process.stdout.write(JSON.stringify({
    status: 'passed', kind: 'pearbrowser-electron-native-hyper-tab-integration',
    platform: process.platform, electron: process.versions.electron,
    shell: 'file', tabViews: 3, oneProfile: true,
    defaultLaxAndHttpOnlyCookies: 'isolated', localStorage: 'isolated',
    indexedDB: 'isolated', hostToken: 'unavailable-to-pages',
    crossOriginNavigation: 'denied', popups: 'denied',
    hyperProxyLinkShim: 'routed', sameDrivePostAndReplace: 'preserved'
  }) + '\n')
}

const watchdog = setTimeout(() => { process.stderr.write('Electron native Hyper tab smoke timed out during ' + phase + '\n'); app.exit(1) }, 45000)
app.whenReady().then(run).then(() => {
  clearTimeout(watchdog)
  app.quit()
}).catch(error => {
  clearTimeout(watchdog)
  process.stderr.write(String(error.stack || error) + '\n')
  app.exit(1)
})
