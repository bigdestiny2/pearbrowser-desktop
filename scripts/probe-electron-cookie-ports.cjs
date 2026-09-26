// Diagnostic only: verify that two drive-style 127.0.0.1 ports share cookies
// in the same Electron session. This does not certify production isolation.
const http = require('node:http')
const { app, BrowserWindow, session } = require('electron')

async function listener () {
  const server = http.createServer((_request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end('<!doctype html><title>PearBrowser cookie port probe</title>')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return server
}

async function close (server) {
  if (server) await new Promise(resolve => server.close(resolve))
}

async function run () {
  const first = await listener()
  const second = await listener()
  const partition = `pear-cookie-probe-${Date.now()}`
  const probeSession = session.fromPartition(partition)
  const window = new BrowserWindow({ show: false, webPreferences: { session: probeSession, contextIsolation: true, sandbox: true } })
  const key = 'pear_origin_port_probe'
  const value = String(Date.now())
  try {
    await window.loadURL(`http://127.0.0.1:${first.address().port}/`)
    await window.webContents.executeJavaScript(`document.cookie = '${key}=${value}; Path=/'; localStorage.setItem('${key}', '${value}')`)
    const firstState = await window.webContents.executeJavaScript(`({ cookie: document.cookie, localStorage: localStorage.getItem('${key}') })`)
    await window.loadURL(`http://127.0.0.1:${second.address().port}/`)
    const secondState = await window.webContents.executeJavaScript(`({ cookie: document.cookie, localStorage: localStorage.getItem('${key}') })`)
    const result = {
      kind: 'pearbrowser-electron-cookie-port-probe',
      electron: process.versions.electron,
      firstOrigin: `http://127.0.0.1:${first.address().port}`,
      secondOrigin: `http://127.0.0.1:${second.address().port}`,
      cookieSharedAcrossPorts: secondState.cookie.includes(`${key}=${value}`),
      localStorageSharedAcrossPorts: secondState.localStorage === value,
      firstState,
      secondState
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    if (!result.cookieSharedAcrossPorts || result.localStorageSharedAcrossPorts) process.exitCode = 1
  } finally {
    window.destroy()
    await close(first)
    await close(second)
    app.quit()
  }
}

app.whenReady().then(run).catch(error => {
  process.stderr.write(String(error.stack || error) + '\n')
  process.exitCode = 1
  app.quit()
})
