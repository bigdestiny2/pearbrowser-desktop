// Native v3 host. Electron owns application lifecycle and Pear OTA owns only
// the embedded Bare backend/update worker; there is no `pear run` launch path.
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const crypto = require('node:crypto')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const PearRuntime = require('pear-runtime')
const pkg = require('../package.json')
const { PearAppLauncher, normalizePearInstallLink } = require('./pear-app-launcher.cjs')

const sessionToken = crypto.randomBytes(32).toString('hex')
const appName = pkg.productName || pkg.name
let workerPipe = null
let pearRuntime = null
let pearAppLauncher = null
let quitting = false

function requireTrustedRenderer (event) {
  const senderUrl = String(event?.senderFrame?.url || event?.sender?.getURL?.() || '')
  const shellUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href
  if (senderUrl !== shellUrl) {
    throw new Error('Pear app operation rejected from an untrusted renderer')
  }
}

function requirePearAppLauncher () {
  if (!pearAppLauncher) throw new Error('Pear v3 app launcher is not ready')
  return pearAppLauncher
}

ipcMain.on('pearbrowser:runtime-session', (event) => {
  event.returnValue = sessionToken
})

ipcMain.handle('pearbrowser:open-devtools', (event) => {
  event.sender.openDevTools({ mode: 'detach' })
})

ipcMain.handle('pearbrowser:pear-apps:list', (event) => {
  requireTrustedRenderer(event)
  return requirePearAppLauncher().list()
})

ipcMain.handle('pearbrowser:pear-apps:install', async (event, request = {}) => {
  requireTrustedRenderer(event)
  const nativeDelivery = request && typeof request.nativeDelivery === 'object' ? request.nativeDelivery : {}
  if (nativeDelivery.status !== 'available' || nativeDelivery.kind !== 'pear-v3') {
    throw new Error('Catalogue entry is not configured as an available Pear v3 native app')
  }
  const link = normalizePearInstallLink(nativeDelivery.installLink)
  const hostTarget = `${process.platform}-${process.arch}`
  const targets = Array.isArray(nativeDelivery.targets)
    ? nativeDelivery.targets.map((target) => String(target || '').trim().toLowerCase())
    : []
  if (targets.some((target) => !/^[a-z0-9_-]{3,40}$/.test(target))) {
    throw new Error('Catalogue entry contains an invalid Pear v3 platform target')
  }
  if (targets.length && !targets.includes(hostTarget)) {
    throw new Error(`This Pear v3 app is not published for ${hostTarget}`)
  }
  const name = String(request.name || request.id || 'Pear app').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || 'Pear app'
  const claimedVerification = String(request.verification || '').trim()
  const verification = ['author-signed', 'relay-listed'].includes(claimedVerification) ? claimedVerification : 'unverified'
  const parent = BrowserWindow.fromWebContents(event.sender)
  const choice = await dialog.showMessageBox(parent || undefined, {
    type: 'warning',
    title: `Install ${name}`,
    message: `Install ${name} as a native application?`,
    detail: `${link}\n\nCatalogue claim: ${verification}. PearBrowser validates the v3 bundle shape and OS target, but does not independently verify catalogue authorship during installation. The application will run outside the tab sandbox and will manage its own Pear v3 runtime, storage, and updates.`,
    buttons: ['Cancel', 'Install native app'],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  })
  if (choice.response !== 1) return { cancelled: true }

  return await requirePearAppLauncher().install({
    id: request.id,
    name,
    link,
    productName: nativeDelivery.productName,
    verification
  }, (progress) => {
    if (!event.sender.isDestroyed()) event.sender.send('pearbrowser:pear-apps:progress', { link, ...progress })
  })
})

ipcMain.handle('pearbrowser:pear-apps:launch', async (event, request = {}) => {
  requireTrustedRenderer(event)
  const target = request.link || request.id
  return await requirePearAppLauncher().launch(target)
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
    pearAppLauncher = new PearAppLauncher({
      dataFile: path.join(app.getPath('userData'), 'pear-v3-apps.json'),
      shell
    })
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
