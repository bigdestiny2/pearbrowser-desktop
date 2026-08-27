// Native v3 host. Electron owns application lifecycle and Pear OTA owns only
// the embedded Bare backend/update worker; there is no shared-CLI launch path.
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const pkg = require('../package.json')
const { verifyRuntimeIntegrity } = require('./runtime-integrity.cjs')
const unpackedRoot = path.join(process.resourcesPath, 'app.asar.unpacked')

if (app.isPackaged) {
  const integrity = pkg.pearRuntimeIntegrity || {}
  if (integrity.schema !== 1 || integrity.algorithm !== 'ed25519-sha256-tree-v1') {
    throw new Error('Packaged Pear runtime integrity metadata is missing or unsupported')
  }
  verifyRuntimeIntegrity({
    unpackedRoot,
    publicKey: integrity.publicKey,
    expected: {
      tag: pkg.pearRelease?.tag,
      sourceRef: pkg.pearRelease?.sourceRef,
      releaseMode: pkg.pearRelease?.mode,
      pear: pkg.pearRelease?.pear,
      platform: process.platform,
      arch: process.arch
    }
  })
}

const runtimeRequire = app.isPackaged
  ? createRequire(path.join(unpackedRoot, 'package.json'))
  : require
const PearRuntime = runtimeRequire('pear-runtime')
const { PearAppLauncher, normalizePearInstallLink } = require('./pear-app-launcher.cjs')
const { applyPearUpdateAndRestart, pearOtaArtifactName } = require('./pear-ota-lifecycle.cjs')

const sessionToken = crypto.randomBytes(32).toString('hex')
const appName = pkg.productName || pkg.name
const otaArtifactName = pearOtaArtifactName(appName)
let workerPipe = null
let pearRuntime = null
let pearAppLauncher = null
let quitting = false
let updateRestartPending = false

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
  // eslint-disable-next-line no-control-regex
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
    // pear-runtime-updater resolves /by-arch/<host>/app/<name> exactly. The
    // extension is therefore part of the deployment contract, not display UI.
    name: otaArtifactName,
    version: pkg.version,
    upgrade: pkg.upgrade,
    app: appBundlePath(),
    // The retained upgrade key is not yet the human-approved production
    // multisig channel. package.json keeps updates false until that ceremony
    // and its independent evidence are complete.
    updates: app.isPackaged && pkg.updates === true
  })
  pearRuntime.on('error', (error) => console.error('Pear OTA runtime error:', error))
  // pear-runtime does not forward updater errors. Keep the EventEmitter error
  // channel handled so a future production OTA failure cannot crash the host.
  pearRuntime.updater.on('error', (error) => console.error('Pear OTA update error:', error))
  pearRuntime.updater.on('updating', () => console.log('PearBrowser update is downloading'))
  pearRuntime.updater.on('updated', () => {
    if (updateRestartPending) return
    updateRestartPending = true
    console.log('PearBrowser update is ready; applying it now')
    applyPearUpdateAndRestart({ updater: pearRuntime.updater, app }).catch((error) => {
      // updater.applyUpdate() marks this updater instance as applied before the
      // OS swap. A failed swap therefore cannot be retried safely in-process;
      // keep the guard latched and require a fresh app/updater instance.
      console.error('PearBrowser update could not be applied; restart before retrying:', error)
    })
  })
  // OTA readiness is deliberately non-blocking: a browser must still open
  // offline using its installed build and local data.
  pearRuntime.ready().catch((error) => console.error('Pear OTA initialization failed:', error))

  const workerEntry = app.isPackaged
    ? path.join(unpackedRoot, 'workers', 'main.js')
    : require.resolve('../workers/main.js')
  const worker = pearRuntime.run(workerEntry, [pearRuntime.storage, sessionToken])
  // bare-sidecar spawns the worker with piped stdout/stderr, and Node leaves
  // those pipes paused until something reads them. Once the backend has logged
  // ~64KiB the kernel buffer fills and its next console.log blocks forever
  // inside fflush, freezing the libuv loop while the RPC port stays bound — the
  // UI then reports every port as "probe timeout". Draining both pipes is what
  // keeps the backend from wedging on its own logging.
  worker.stdout?.on('data', (chunk) => process.stdout.write(chunk))
  worker.stderr?.on('data', (chunk) => process.stderr.write(chunk))
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
