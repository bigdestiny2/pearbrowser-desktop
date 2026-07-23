// Native v3 host. Electron owns application lifecycle and Pear OTA owns only
// the embedded Bare backend/update worker; there is no `pear run` launch path.
const { app, BrowserWindow, ipcMain } = require('electron')
const crypto = require('node:crypto')
const os = require('node:os')
const path = require('node:path')
const PearRuntime = require('pear-runtime')
const pkg = require('../package.json')

const sessionToken = crypto.randomBytes(32).toString('hex')
const appName = pkg.productName || pkg.name
let workerPipe = null
let pearRuntime = null
let quitting = false

ipcMain.on('pearbrowser:runtime-session', (event) => {
  event.returnValue = sessionToken
})

ipcMain.handle('pearbrowser:open-devtools', (event) => {
  event.sender.openDevTools({ mode: 'detach' })
})

function storagePath () {
  if (!app.isPackaged) return path.join(os.tmpdir(), 'pearbrowser-desktop')
  return app.getPath('userData')
}

function appBundlePath () {
  if (!app.isPackaged) return null
  if (process.platform === 'linux' && process.env.APPIMAGE) return process.env.APPIMAGE
  if (process.platform === 'win32') return process.execPath
  return path.join(process.resourcesPath, '..', '..')
}

async function startBackendWorker () {
  if (workerPipe) return workerPipe
  pearRuntime = new PearRuntime({
    dir: storagePath(),
    name: appName,
    version: pkg.version,
    upgrade: pkg.upgrade,
    app: appBundlePath(),
    updates: app.isPackaged
  })
  pearRuntime.on('error', (error) => console.error('Pear OTA runtime error:', error))
  pearRuntime.updater.on('updating', () => console.log('PearBrowser update is downloading'))
  pearRuntime.updater.on('updated', () => console.log('PearBrowser update is ready; restart to apply it'))
  // OTA readiness is deliberately non-blocking: a browser must still open
  // offline using its installed build and local data.
  pearRuntime.ready().catch((error) => console.error('Pear OTA initialization failed:', error))

  const worker = pearRuntime.run(require.resolve('../workers/main.js'), [pearRuntime.storage, sessionToken])
  workerPipe = worker
  worker.once('exit', (code) => {
    workerPipe = null
    if (!quitting) console.error(`PearBrowser backend worker exited unexpectedly (${code})`)
  })
  return workerPipe
}

async function createWindow () {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 920,
    minHeight: 600,
    backgroundColor: '#f6f8f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  await window.loadFile(path.join(__dirname, '..', 'index.html'))
}

const singleInstance = app.requestSingleInstanceLock()
if (!singleInstance) {
  app.quit()
} else {
  app.whenReady().then(async () => {
    await startBackendWorker()
    await createWindow()
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow()
    })
  }).catch((error) => {
    console.error('Failed to start PearBrowser:', error)
    app.quit()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('before-quit', () => {
    quitting = true
    try { workerPipe?.destroy() } catch {}
    pearRuntime?.close().catch((error) => console.error('Pear OTA runtime shutdown failed:', error))
  })
}
