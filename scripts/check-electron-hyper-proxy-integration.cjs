'use strict'

// Diagnostic integration smoke: real HyperProxy routing in Electron against
// two in-memory drive fixtures. This is not packaged real-app release evidence.
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const http = require('node:http')
const Module = require('node:module')
const os = require('node:os')
const path = require('node:path')
const { app, BrowserWindow, session } = require('electron')
const { driveHostnameForKey } = require('../backend/drive-origin.cjs')

// The production proxy uses Bare transports. Electron's main process uses
// Node, so substitute only those two transport modules, as the Node tests do.
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'bare-crypto') return crypto
  if (request === 'bare-http1') return http
  return originalLoad.call(this, request, parent, isMain)
}
let HyperProxy
try {
  HyperProxy = require('../backend/hyper-proxy.js').HyperProxy
} finally {
  Module._load = originalLoad
}
const { HttpBridge } = require('../backend/http-bridge.js')

const driveA = 'a'.repeat(64)
const driveB = 'b'.repeat(64)
const proofKey = 'pear-proxy-integration-proof'
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pear-proxy-electron-'))
app.setPath('userData', userData)
app.on('quit', () => { try { fs.rmSync(userData, { recursive: true, force: true }) } catch {} })

function makeDrive (key) {
  const files = new Map([['/index.html', Buffer.from(`<!doctype html><html><head><title>${key.slice(0, 8)}</title></head><body>synthetic drive ${key}</body></html>`)]])
  return {
    version: 1,
    async get (filePath) { return files.get(filePath) || null }
  }
}

function request (url, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = http.request({
      hostname: '127.0.0.1',
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: { host: parsed.host, ...headers }
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => req.destroy(new Error('HTTP request timed out')))
    req.end()
  })
}

async function writeProof (value) {
  const key = 'pear-proxy-integration-proof'
  localStorage.setItem(key, value)
  document.cookie = `${key}=${value}; Path=/; SameSite=Lax`
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open(key, 1)
    open.onupgradeneeded = () => open.result.createObjectStore('proof')
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  await new Promise((resolve, reject) => {
    const tx = db.transaction('proof', 'readwrite')
    tx.objectStore('proof').put(value, 'value')
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return { origin: location.origin, localStorage: localStorage.getItem(key), cookie: document.cookie, indexedDB: value }
}

async function readProof () {
  const key = 'pear-proxy-integration-proof'
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open(key, 1)
    open.onupgradeneeded = () => open.result.createObjectStore('proof')
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  const indexedValue = await new Promise((resolve, reject) => {
    const tx = db.transaction('proof', 'readonly')
    const get = tx.objectStore('proof').get('value')
    get.onsuccess = () => resolve(get.result ?? null)
    get.onerror = () => reject(get.error)
  })
  db.close()
  return { origin: location.origin, localStorage: localStorage.getItem(key), cookie: document.cookie, indexedDB: indexedValue }
}

async function identityWithToken (token) {
  const response = await fetch('/api/identity', { headers: { 'x-pear-token': token } })
  return { status: response.status, body: await response.json() }
}

async function run () {
  const drives = new Map([[driveA, makeDrive(driveA)], [driveB, makeDrive(driveB)]])
  const getDrive = async key => drives.get(key) || null
  const proxy = new HyperProxy(getDrive, (route, error) => { throw new Error(`${route}: ${error}`) }, null, { perDriveOrigins: true })
  const windows = []
  let clearnetCalls = 0
  const partition = `pear-proxy-integration-${process.pid}-${Date.now()}`
  const browserSession = session.fromPartition(partition)
  try {
    proxy.setHttpBridge(new HttpBridge({}, null, getDrive, {
      validateToken: token => proxy.validateApiToken(token),
      identity: { getAppKeypair: key => ({ publicKey: Buffer.alloc(32, key === driveA ? 1 : 2) }) }
    }))
    proxy.setClearnetHandler(async (_req, res) => {
      clearnetCalls++
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end('<!doctype html><script>window.publisherCodeRan = true</script>')
      return true
    })
    await proxy.start()
    const urlA = await proxy.localUrlForDrive(driveA, 'hyper', '/index.html')
    const urlB = await proxy.localUrlForDrive(driveB, 'hyper', '/index.html')
    const originA = new URL(urlA).origin
    const originB = new URL(urlB).origin
    const mainOrigin = `http://127.0.0.1:${proxy.port}`
    assert.equal(new URL(urlA).hostname, driveHostnameForKey(driveA))
    assert.equal(new URL(urlB).hostname, driveHostnameForKey(driveB))
    assert.notEqual(originA, originB)

    // Fail the smoke if a page attempts to leave these disposable local origins.
    const allowed = new Set([originA, originB, mainOrigin])
    browserSession.webRequest.onBeforeRequest((details, callback) => {
      try { callback({ cancel: !allowed.has(new URL(details.url).origin) }) } catch { callback({ cancel: true }) }
    })
    const makeWindow = () => {
      const win = new BrowserWindow({ show: false, webPreferences: { session: browserSession, sandbox: true, contextIsolation: true, nodeIntegration: false } })
      windows.push(win)
      return win
    }
    const winA = makeWindow()
    const winB = makeWindow()
    await Promise.all([winA.loadURL(urlA), winB.loadURL(urlB)])
    assert.equal(winA.webContents.getURL(), urlA)
    assert.equal(winB.webContents.getURL(), urlB)
    const execute = (win, fn, ...args) => win.webContents.executeJavaScript(`(${fn.toString()})(${args.map(JSON.stringify).join(',')})`)
    const tokenA = await winA.webContents.executeJavaScript('document.querySelector(\'meta[name="pear-api-token"]\')?.content')
    const tokenB = await winB.webContents.executeJavaScript('document.querySelector(\'meta[name="pear-api-token"]\')?.content')
    assert.match(tokenA, /^[0-9a-f]{64}$/)
    assert.match(tokenB, /^[0-9a-f]{64}$/)
    assert.notEqual(tokenA, tokenB)

    const writtenA = await execute(winA, writeProof, 'A-only')
    assert.equal(writtenA.origin, originA)
    const beforeB = await execute(winB, readProof)
    assert.equal(beforeB.origin, originB)
    assert.equal(beforeB.localStorage, null)
    assert.equal(beforeB.indexedDB, null)
    assert.doesNotMatch(beforeB.cookie, new RegExp(`${proofKey}=A-only`))
    const writtenB = await execute(winB, writeProof, 'B-only')
    assert.equal(writtenB.origin, originB)
    const afterA = await execute(winA, readProof)
    const afterB = await execute(winB, readProof)
    assert.equal(afterA.localStorage, 'A-only')
    assert.equal(afterA.indexedDB, 'A-only')
    assert.match(afterA.cookie, new RegExp(`${proofKey}=A-only`))
    assert.doesNotMatch(afterA.cookie, /B-only/)
    assert.equal(afterB.localStorage, 'B-only')
    assert.equal(afterB.indexedDB, 'B-only')
    assert.match(afterB.cookie, new RegExp(`${proofKey}=B-only`))
    assert.doesNotMatch(afterB.cookie, /A-only/)
    const cookiesA = await browserSession.cookies.get({ url: originA })
    const cookiesB = await browserSession.cookies.get({ url: originB })
    assert.deepEqual(cookiesA.filter(c => c.name === proofKey).map(c => c.value), ['A-only'])
    assert.deepEqual(cookiesB.filter(c => c.name === proofKey).map(c => c.value), ['B-only'])
    assert.ok(cookiesA.concat(cookiesB).filter(c => c.name === proofKey).every(c => c.hostOnly))

    const ownA = await execute(winA, identityWithToken, tokenA)
    const ownB = await execute(winB, identityWithToken, tokenB)
    const crossToken = await execute(winB, identityWithToken, tokenA)
    assert.equal(ownA.status, 200)
    assert.equal(ownA.body.driveKey, driveA)
    assert.equal(ownB.status, 200)
    assert.equal(ownB.body.driveKey, driveB)
    assert.equal(crossToken.status, 403)
    assert.equal(crossToken.body.error, 'Token origin mismatch')
    assert.equal((await request(originB + '/api/identity', { headers: { 'x-pear-token': tokenA } })).status, 403)
    assert.equal((await request(originA + '/api/identity', { headers: { origin: originB, 'x-pear-token': tokenA } })).status, 403)

    const shared = await request(mainOrigin + `/hyper/${driveA}/index.html`)
    assert.equal(shared.status, 403)
    assert.equal(shared.body, 'Drive origin required')
    const wrongHost = await request(urlA, { headers: { host: new URL(urlB).host } })
    assert.equal(wrongHost.status, 403)
    assert.equal(wrongHost.body, 'Invalid drive host')
    const wrongDrive = await request(originA + `/hyper/${driveB}/index.html`)
    assert.equal(wrongDrive.status, 403)
    assert.equal(wrongDrive.body, 'Forbidden for this origin')
    const encoded = Buffer.from('https://attacker.example/').toString('base64url')
    const clearnetPath = `/clearnet/${encoded}`
    assert.equal((await request(originA + clearnetPath)).status, 403)
    assert.equal((await request(originA + clearnetPath, { method: 'OPTIONS', headers: { origin: originA } })).status, 403)
    assert.equal((await request(originA + '/publisher.js', { headers: { referer: originA + clearnetPath } })).status, 404)
    const spoofedMainHost = await request(mainOrigin + clearnetPath, {
      headers: { host: `${new URL(urlA).hostname}:${proxy.port}` }
    })
    assert.equal(spoofedMainHost.status, 403)
    assert.equal(spoofedMainHost.body, 'Invalid proxy host')
    assert.equal(clearnetCalls, 0)
    assert.equal((await request(mainOrigin + clearnetPath)).status, 200)
    assert.equal(clearnetCalls, 1)

    process.stdout.write(JSON.stringify({ status: 'passed', kind: 'pearbrowser-electron-hyper-proxy-integration-smoke', platform: process.platform, electron: process.versions.electron, syntheticDrives: 2, browserWindows: 2, oneSession: true, storage: 'isolated', tokenOrigin: 'bound', sharedAndClearnetBypasses: 'denied' }) + '\n')
  } finally {
    for (const win of windows) if (!win.isDestroyed()) win.destroy()
    await proxy.stop()
    await browserSession.clearStorageData()
  }
}

const watchdog = setTimeout(() => { process.stderr.write('Electron HyperProxy integration smoke timed out\n'); app.exit(1) }, 45000)
app.whenReady().then(run).then(() => {
  clearTimeout(watchdog)
  app.quit()
}).catch(error => {
  clearTimeout(watchdog)
  process.stderr.write(String(error.stack || error) + '\n')
  process.exitCode = 1
  app.quit()
})
