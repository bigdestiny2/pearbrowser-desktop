'use strict'
const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')
const { app, BrowserWindow, session } = require('electron')
const { driveHostnameForKey } = require('../backend/drive-origin.cjs')

// Exercise normal macOS/Electron resolution for d-<z32>.localhost.
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pearbrowser-host-cookie-'))
app.on('quit', () => { try { fs.rmSync(userData, { recursive: true, force: true }) } catch {} })
app.setPath('userData', userData)

const hosts = [driveHostnameForKey('a'.repeat(64)), driveHostnameForKey('b'.repeat(64))]
const observations = []
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const wire = { host: req.headers.host, path: url.pathname, cookie: req.headers.cookie || '' }
  observations.push(wire)
  const name = url.searchParams.get('name')
  const value = url.searchParams.get('value')
  if (url.pathname.startsWith('/set-') && name && value) {
    const attrs = ['Path=/', 'SameSite=Lax']
    if (url.pathname === '/set-domain') attrs.push(`Domain=${url.searchParams.get('domain')}`)
    if (url.pathname === '/set-http') attrs.push('HttpOnly')
    wire.attemptedSetCookie = `${name}=${value}; ${attrs.join('; ')}`
    res.setHeader('Set-Cookie', wire.attemptedSetCookie)
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(wire))
})

async function run () {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = server.address().port
  const origins = hosts.map(h => `http://${h}:${port}`)
  const partition = `pear-host-cookie-probe-${process.pid}-${Date.now()}`
  const ses = session.fromPartition(partition)
  const win = new BrowserWindow({ show: false, webPreferences: { session: ses, contextIsolation: true, sandbox: true } })
  const js = code => win.webContents.executeJavaScript(code)
  const nav = async origin => {
    await win.loadURL(`${origin}/`)
    return js('({origin: location.origin, hostname: location.hostname, cookie: document.cookie})')
  }
  const putJs = async (name, value, domain) => {
    const declaration = `${name}=${value}; Path=/; SameSite=Lax${domain ? '; Domain=' + domain : ''}`
    return js(`document.cookie = ${JSON.stringify(declaration)}; document.cookie`)
  }
  const setHeader = async (kind, name, value, domain) => js(`fetch(${JSON.stringify(`/set-${kind}?name=${name}&value=${value}${domain ? `&domain=${encodeURIComponent(domain)}` : ''}`)}, {cache:'no-store'}).then(r => r.json())`)
  const readWire = () => js("fetch('/echo', {cache:'no-store'}).then(r => r.json())")
  const snapshot = async () => ({
    location: await js('({origin: location.origin, hostname: location.hostname})'),
    documentCookie: await js('document.cookie'),
    wire: await readWire(),
    storageA: await js("localStorage.getItem('host_probe_A')")
  })
  const result = { kind: 'pearbrowser-host-cookie-probe', electron: process.versions.electron, platform: process.platform, partition, origins, tempUserData: userData }
  try {
    result.aInitial = await nav(origins[0])
    await js("localStorage.setItem('host_probe_A', 'a-only')")
    result.aJsHostAssignment = await putJs('a_js_host', 'a-js', false)
    result.aSetHostRequest = await setHeader('host', 'a_server_host', 'a-server')
    result.aSetHttpRequest = await setHeader('http', 'a_http', 'a-http')
    result.aDomainAttempts = []
    for (const [tag, domain] of [['local', 'localhost'], ['dot_local', '.localhost'], ['other_drive', hosts[1]]]) {
      const jsName = `a_js_${tag}`
      const serverName = `a_server_${tag}`
      result.aDomainAttempts.push({
        tag, domain,
        jsAssignmentReadback: await putJs(jsName, `a-js-${tag}`, domain),
        setCookieRequest: await setHeader('domain', serverName, `a-server-${tag}`, domain),
        afterDocumentCookie: await js('document.cookie'),
        afterWire: await readWire(),
        afterStore: await ses.cookies.get({ url: origins[0] })
      })
    }
    result.aAfterSet = await snapshot()
    result.aCookieStore = await ses.cookies.get({ url: origins[0] })

    result.bInitial = await nav(origins[1])
    result.bBeforeSet = await snapshot()
    result.bCookieStoreBeforeSet = await ses.cookies.get({ url: origins[1] })
    result.bJsHostAssignment = await putJs('b_js_host', 'b-js', false)
    result.bSetHostRequest = await setHeader('host', 'b_server_host', 'b-server')
    result.bSetHttpRequest = await setHeader('http', 'b_http', 'b-http')
    result.bDomainAttempts = []
    for (const [tag, domain] of [['local', 'localhost'], ['dot_local', '.localhost'], ['other_drive', hosts[0]]]) {
      const jsName = `b_js_${tag}`
      const serverName = `b_server_${tag}`
      result.bDomainAttempts.push({
        tag, domain,
        jsAssignmentReadback: await putJs(jsName, `b-js-${tag}`, domain),
        setCookieRequest: await setHeader('domain', serverName, `b-server-${tag}`, domain),
        afterDocumentCookie: await js('document.cookie'),
        afterWire: await readWire(),
        afterStore: await ses.cookies.get({ url: origins[1] })
      })
    }
    result.bAfterSet = await snapshot()
    result.bCookieStoreAfterSet = await ses.cookies.get({ url: origins[1] })

    result.aReturn = await nav(origins[0])
    result.aAfterB = await snapshot()
    result.aCookieStoreAfterB = await ses.cookies.get({ url: origins[0] })
    result.allCookieStore = await ses.cookies.get({})
    result.observationCount = observations.length
    assert.equal(result.aAfterSet.location.hostname, hosts[0])
    assert.equal(result.bAfterSet.location.hostname, hosts[1])
    assert.equal(result.bBeforeSet.documentCookie, '')
    assert.equal(result.bBeforeSet.wire.cookie, '')
    assert.equal(result.bCookieStoreBeforeSet.length, 0)
    assert.equal(result.bBeforeSet.storageA, null)
    for (const [snapshot, own, other] of [
      [result.aAfterSet, 'a', 'b'],
      [result.bAfterSet, 'b', 'a'],
      [result.aAfterB, 'a', 'b']
    ]) {
      assert.match(snapshot.documentCookie, new RegExp(own + '_js_host='))
      assert.match(snapshot.documentCookie, new RegExp(own + '_server_host='))
      assert.doesNotMatch(snapshot.documentCookie, new RegExp(own + '_http='))
      assert.doesNotMatch(snapshot.documentCookie, new RegExp(other + '_'))
      assert.match(snapshot.wire.cookie, new RegExp(own + '_http='))
      assert.doesNotMatch(snapshot.wire.cookie, new RegExp(other + '_'))
      assert.equal(snapshot.wire.host, own === 'a' ? new URL(origins[0]).host : new URL(origins[1]).host)
    }
    assert.equal(result.aAfterB.storageA, 'a-only')
    for (const [attempts, prefix, expectedHost] of [
      [result.aDomainAttempts, 'a', new URL(origins[0]).host],
      [result.bDomainAttempts, 'b', new URL(origins[1]).host]
    ]) {
      assert.equal(attempts.length, 3)
      for (const attempt of attempts) {
        const badJs = prefix + '_js_' + attempt.tag
        const badServer = prefix + '_server_' + attempt.tag
        assert.equal(attempt.afterWire.host, expectedHost)
        for (const name of [badJs, badServer]) {
          assert.equal(attempt.afterDocumentCookie.includes(name + '='), false)
          assert.equal(attempt.afterWire.cookie.includes(name + '='), false)
          assert.equal(attempt.afterStore.some(cookie => cookie.name === name), false)
        }
      }
    }
    const expectedNames = ['a_js_host', 'a_server_host', 'a_http', 'b_js_host', 'b_server_host', 'b_http']
    assert.deepEqual(result.allCookieStore.map(cookie => cookie.name).sort(), expectedNames.sort())
    assert.ok(result.allCookieStore.every(cookie => cookie.hostOnly === true))
    assert.deepEqual(result.allCookieStore.filter(cookie => cookie.httpOnly).map(cookie => cookie.name).sort(), ['a_http', 'b_http'])
    assert.ok(observations.every(entry => origins.some(origin => entry.host === new URL(origin).host)))
    process.stdout.write(JSON.stringify({
      status: 'passed', platform: process.platform, electron: process.versions.electron,
      hosts, samePort: port, rejectedDomainAttempts: 12, hostOnlyCookies: result.allCookieStore.length
    }) + '\n')
  } finally {
    win.destroy()
    await new Promise(resolve => server.close(resolve))
    app.quit()
  }
}
app.whenReady().then(run).catch(error => {
  process.stderr.write(String(error.stack || error) + '\n')
  server.close()
  app.quit()
  process.exitCode = 1
})
