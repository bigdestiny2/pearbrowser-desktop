#!/usr/bin/env node

// Diagnostic rehearsal only. This launches a packaged app with a fresh profile
// and observes real P2P pages through its own Browse UI. Its output is never
// accepted by the public-trust origin-isolation release checker.
import { extractFile } from '@electron/asar'
import { spawn } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import driveOrigin from '../backend/drive-origin.cjs'

const { driveHostnameForKey } = driveOrigin
const DEFAULT_PLAN = new URL('../docs/origin-isolation-smoke-plan-peerit-pearfeed-2026-07-02.json', import.meta.url)
const PROOF_KEY = 'pear-origin-isolation-proof'
const MAX_TIMEOUT_MS = 300_000

export function normalizeApps (apps) {
  if (!Array.isArray(apps) || apps.length !== 2) throw new Error('exactly two app URLs are required')
  const normalized = apps.map((app, index) => {
    const url = String(app?.url || '').trim().toLowerCase()
    const match = /^hyper:\/\/([0-9a-f]{64})\/$/.exec(url)
    if (!match) throw new Error(`app ${index + 1} must be a root hyper://<64-hex-key>/ URL`)
    if (app?.driveKey && String(app.driveKey).toLowerCase() !== match[1]) throw new Error(`app ${index + 1} drive key does not match its URL`)
    return { label: String(app?.label || `App ${index + 1}`).slice(0, 100), url, driveKey: match[1] }
  })
  if (normalized[0].driveKey === normalized[1].driveKey) throw new Error('the apps must have distinct drive keys')
  return normalized
}

export function driveFrameUrlMatches (frameUrl, app) {
  try {
    const url = new URL(frameUrl)
    return url.protocol === 'http:' &&
      url.hostname === driveHostnameForKey(app.driveKey) &&
      /^\d+$/.test(url.port) &&
      !url.username && !url.password &&
      new RegExp(`^/(?:hyper|app)/${app.driveKey}/`, 'i').test(url.pathname)
  } catch {
    return false
  }
}

export function redactDiagnostic (value) {
  return String(value?.message || value || 'unknown error')
    .replace(/([?&](?:session|token|auth|key)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/\b[0-9a-f]{64}\b/gi, '[64-hex-redacted]')
    .slice(0, 500)
}

export function makeRehearsalArtifact ({ apps, packageInfo, profileId }) {
  return {
    schemaVersion: 1,
    kind: 'pearbrowser-origin-isolation-package-proof-rehearsal',
    capturedAt: new Date().toISOString(),
    status: 'REHEARSAL_BLOCKED',
    rehearsalPassed: false,
    releaseGate: {
      status: 'BLOCKED',
      trustedElectronCapture: false,
      independentAttestation: false,
      reason: 'Package-proof CDP observations are diagnostic only; signed public-trust package capture and independent attestation remain required.'
    },
    package: packageInfo,
    profileId,
    apps,
    cookieScope: 'SameSite=None; Secure in embedded Hyper frames; default and SameSite=Lax app cookies are outside this rehearsal.',
    observations: [],
    checks: [],
    blocker: null
  }
}

function parseArgs (argv) {
  const args = { app: '', plan: DEFAULT_PLAN, out: '', appA: '', appB: '', timeoutMs: 180_000, appTimeoutMs: 60_000 }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = () => {
      const next = argv[++i]
      if (!next || next.startsWith('--')) throw new Error(`${arg} requires a value`)
      return next
    }
    if (arg === '--app') args.app = value()
    else if (arg === '--plan') args.plan = new URL(value(), pathToFileURL(process.cwd() + '/'))
    else if (arg === '--out') args.out = resolve(value())
    else if (arg === '--app-a') args.appA = value()
    else if (arg === '--app-b') args.appB = value()
    else if (arg === '--timeout-ms') args.timeoutMs = Number(value())
    else if (arg === '--app-timeout-ms') args.appTimeoutMs = Number(value())
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/capture-origin-isolation-package-proof.mjs --app /path/to/PearBrowser.app/Contents/MacOS/PearBrowser [--plan plan.json | --app-a hyper://<key>/ --app-b hyper://<key>/] [--out result.json] [--timeout-ms 180000] [--app-timeout-ms 60000]')
      process.exit(0)
    } else throw new Error(`unknown option: ${arg}`)
  }
  if (!args.app) throw new Error('--app is required')
  if (!!args.appA !== !!args.appB) throw new Error('--app-a and --app-b must be supplied together')
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 30_000 || args.timeoutMs > MAX_TIMEOUT_MS) throw new Error('--timeout-ms must be between 30000 and 300000')
  if (!Number.isInteger(args.appTimeoutMs) || args.appTimeoutMs < 10_000 || args.appTimeoutMs > 120_000) throw new Error('--app-timeout-ms must be between 10000 and 120000')
  return args
}

function loadApps (args) {
  if (args.appA) return normalizeApps([{ url: args.appA, label: 'App A' }, { url: args.appB, label: 'App B' }])
  const plan = JSON.parse(readFileSync(args.plan, 'utf8'))
  if (plan.kind !== 'pearbrowser-origin-isolation-smoke-plan') throw new Error('plan kind is not an origin-isolation smoke plan')
  return normalizeApps(plan.apps)
}

async function sha256File (path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function inspectPackage (executable) {
  const appPath = resolve(executable)
  const macosDir = dirname(appPath)
  const contentsDir = dirname(macosDir)
  const appBundle = dirname(contentsDir)
  if (basename(macosDir) !== 'MacOS' || basename(contentsDir) !== 'Contents' || !appBundle.endsWith('.app')) {
    throw new Error('--app must point to a packaged macOS .app/Contents/MacOS executable')
  }
  const asarPath = join(contentsDir, 'Resources', 'app.asar')
  if (!existsSync(appPath) || !existsSync(asarPath)) throw new Error('packaged executable or app.asar is missing')
  const metadata = JSON.parse(extractFile(asarPath, 'package.json'))
  if (metadata.pearRelease?.mode !== 'package-proof' || !/^[0-9a-f]{40}$/.test(metadata.pearRelease?.sourceRef || '')) {
    throw new Error('the app must be an immutable-source package-proof build')
  }
  return {
    appBundle,
    executable: appPath,
    version: metadata.version,
    sourceRef: metadata.pearRelease.sourceRef,
    releaseMode: metadata.pearRelease.mode,
    pear: metadata.pearRelease.pear,
    executableSha256: await sha256File(appPath),
    asarSha256: await sha256File(asarPath),
    trust: 'untrusted-package-proof'
  }
}

async function reservePort () {
  const server = createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

function sleep (ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }

async function findWindow (port, child, deadline) {
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`packaged app exited before opening its first window (${child.exitCode})`)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { redirect: 'error', signal: AbortSignal.timeout(2000) })
      if (response.ok) {
        const targets = await response.json()
        const target = targets.find((item) => item.type === 'page' && String(item.url || '').startsWith('file://') && String(item.title || '').includes('PearBrowser'))
        if (target?.webSocketDebuggerUrl) {
          const wsUrl = new URL(target.webSocketDebuggerUrl)
          if (wsUrl.protocol !== 'ws:' || !['127.0.0.1', 'localhost'].includes(wsUrl.hostname) || Number(wsUrl.port) !== port) throw new Error('DevTools target is not loopback-bound')
          return target
        }
      }
    } catch {}
    await sleep(300)
  }
  throw new Error('packaged first window did not expose a DevTools page target before the deadline')
}

async function connectCdp (url) {
  const socket = new globalThis.WebSocket(url)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DevTools connection timed out')), 10_000)
    socket.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('DevTools connection failed')) }, { once: true })
  })
  let nextId = 0
  const pending = new Map()
  const listeners = new Map()
  socket.addEventListener('message', (event) => {
    let message
    try { message = JSON.parse(event.data) } catch { return }
    if (Number.isInteger(message.id) && pending.has(message.id)) {
      const item = pending.get(message.id)
      pending.delete(message.id)
      clearTimeout(item.timer)
      message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result || {})
    }
    if (message.method) {
      for (const handler of listeners.get(message.method) || []) handler(message.params || {}, message.sessionId || '')
    }
  })
  return {
    on (method, handler) {
      if (!listeners.has(method)) listeners.set(method, new Set())
      listeners.get(method).add(handler)
    },
    send (method, params = {}, sessionId = '') {
      return new Promise((resolve, reject) => {
        const id = ++nextId
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`DevTools ${method} timed out`))
        }, 15_000)
        pending.set(id, { resolve, reject, timer })
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
      })
    },
    close () { socket.close() }
  }
}

async function observeBrowser (cdp) {
  const contexts = new Map()
  const responses = new Map()
  const requests = new Map()
  const targetIds = new Map([['', 'root-window']])
  const childSetup = []

  cdp.on('Runtime.executionContextCreated', ({ context }, sessionId) => {
    const frameId = context?.auxData?.frameId
    if (frameId && context.auxData?.isDefault) contexts.set(frameId, { sessionId, contextId: context.id })
  })
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => {
    for (const [frameId, context] of contexts) if (context.contextId === executionContextId) contexts.delete(frameId)
  })
  cdp.on('Network.responseReceived', ({ frameId, requestId, response, type }) => {
    if (type !== 'Document' || !frameId || !response) return
    const url = safeDriveUrl(response.url)
    if (!url) return
    const item = { frameId, url, status: response.status, mimeType: String(response.mimeType || '').slice(0, 100), completed: false }
    responses.set(frameId, item)
    requests.set(requestId, item)
  })
  cdp.on('Network.loadingFinished', ({ requestId }) => {
    const item = requests.get(requestId)
    if (item) item.completed = true
  })
  cdp.on('Network.loadingFailed', ({ requestId }) => {
    const item = requests.get(requestId)
    if (item) item.failed = true
  })
  cdp.on('Target.attachedToTarget', ({ sessionId, targetInfo }) => {
    targetIds.set(sessionId, String(targetInfo?.targetId || ''))
    childSetup.push(Promise.all([
      cdp.send('Page.enable', {}, sessionId),
      cdp.send('Runtime.enable', {}, sessionId),
      cdp.send('Network.enable', {}, sessionId)
    ]).catch(() => {}))
  })

  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
  await cdp.send('DOM.enable')
  await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
  await Promise.all(childSetup)
  return { contexts, responses, targetIds }
}

function safeDriveUrl (value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' || !url.hostname.endsWith('.localhost')) return ''
    return `${url.origin}${url.pathname}`
  } catch { return '' }
}

async function evaluate (cdp, expression, { contextId, sessionId = '', awaitPromise = false } = {}) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    ...(contextId ? { contextId } : {}),
    awaitPromise,
    returnByValue: true
  }, sessionId)
  if (result.exceptionDetails) throw new Error('DevTools page evaluation failed')
  return result.result?.value
}

async function waitForShell (cdp, deadline) {
  while (Date.now() < deadline) {
    const state = await evaluate(cdp, `(() => ({
      mounted: !!document.querySelector('#app > .app .topbar .tabs') && !!document.querySelector('#app > .app .browse .tabstrip'),
      failed: !!document.querySelector('.splash-status.failed')
    }))()`)
    if (state?.failed) throw new Error('packaged first window reported a boot failure')
    if (state?.mounted) return
    await sleep(350)
  }
  throw new Error('packaged first window did not mount the browser shell')
}

async function dismissOnboarding (cdp) {
  for (const selector of ['.onboarding-overlay .onb-actions .btn.primary', '.onboarding-overlay .onb-actions .btn.primary', '.onboarding-overlay .onb-skip']) {
    const clicked = await evaluate(cdp, `(() => { const button = document.querySelector(${JSON.stringify(selector)}); if (!button) return false; button.click(); return true })()`)
    if (!clicked) return
    await sleep(200)
  }
}

async function navigateThroughUi (cdp, app) {
  const created = await evaluate(cdp, `(() => { const button = document.querySelector(${JSON.stringify('.browse .tabchip-new:not(.tabchip-restore)')}); if (!button) return false; button.click(); return true })()`)
  if (!created) throw new Error('Browse new-tab button was not available')
  await sleep(200)
  const entered = await evaluate(cdp, `(() => {
    const input = document.querySelector('.browse .urlbar input')
    if (!input) return false
    input.focus()
    input.value = ${JSON.stringify(app.url)}
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  if (!entered) throw new Error('Browse address bar was not available')
  await sleep(200)
  const submitted = await evaluate(cdp, `(() => { const button = document.querySelector(${JSON.stringify('.browse .urlbar .go')}); if (!button) return false; button.click(); return true })()`)
  if (!submitted) throw new Error('Browse Go button was not available')
}

async function activeIframe (cdp) {
  const root = await cdp.send('DOM.getDocument', { depth: 1 })
  const query = await cdp.send('DOM.querySelector', { nodeId: root.root.nodeId, selector: 'iframe[data-testid="hyper-iframe"]:not(.hidden)' })
  if (!query.nodeId) return null
  const description = await cdp.send('DOM.describeNode', { nodeId: query.nodeId })
  const attributes = description.node?.attributes || []
  const srcIndex = attributes.indexOf('src')
  return {
    frameId: String(description.node?.frameId || ''),
    frameUrl: srcIndex >= 0 ? String(attributes[srcIndex + 1] || '') : ''
  }
}

async function waitForAppFrame (cdp, browser, app, deadline) {
  while (Date.now() < deadline) {
    const active = await activeIframe(cdp)
    if (active && driveFrameUrlMatches(active.frameUrl, app) && active.frameId) {
      const context = browser.contexts.get(active.frameId)
      const response = browser.responses.get(active.frameId)
      if (context && response?.completed && !response.failed && response.status === 200 && driveFrameUrlMatches(response.url, app)) {
        return { ...active, ...context, targetId: browser.targetIds.get(context.sessionId) || 'root-window', response }
      }
      if (response?.failed || (response && response.status >= 400)) throw new Error(`real app document response failed (HTTP ${response?.status || 'network'})`)
    }
    await sleep(350)
  }
  throw new Error(`real app ${app.label} did not finish a drive-bound document response before the deadline`)
}

async function isolatedContext (cdp, frame) {
  const result = await cdp.send('Page.createIsolatedWorld', { frameId: frame.frameId, worldName: 'pearbrowser-origin-rehearsal' }, frame.sessionId)
  if (!Number.isInteger(result.executionContextId)) throw new Error('could not create an isolated frame context')
  return result.executionContextId
}

// The file:// shell embeds Hyper pages as cross-site frames. Chromium accepts
// SameSite=None; Secure on trustworthy keyed localhost, unlike default/Lax.
function storageExpression (nonce, write) {
  return `(async () => {
    const key = ${JSON.stringify(PROOF_KEY)}
    const value = ${JSON.stringify(nonce)}
    if (${write}) {
      localStorage.setItem(key, value)
      document.cookie = key + '=' + value + '; Path=/; SameSite=None; Secure'
      await new Promise((resolve, reject) => {
        const request = indexedDB.open(key, 1)
        request.onupgradeneeded = () => request.result.createObjectStore('proof')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('proof', 'readwrite')
          tx.objectStore('proof').put(value, 'value')
          tx.oncomplete = () => { db.close(); resolve() }
          tx.onerror = () => reject(tx.error)
        }
      })
    }
    const indexedDBValue = await new Promise((resolve, reject) => {
      const request = indexedDB.open(key)
      request.onerror = () => reject(request.error)
      request.onupgradeneeded = () => { request.transaction.abort(); resolve(null) }
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('proof')) { db.close(); resolve(null); return }
        const tx = db.transaction('proof', 'readonly')
        const item = tx.objectStore('proof').get('value')
        item.onsuccess = () => { db.close(); resolve(item.result ?? null) }
        item.onerror = () => reject(item.error)
      }
    })
    const cookie = document.cookie.split(/;\\s*/).find((item) => item.startsWith(key + '=')) || ''
    return {
      href: location.href,
      origin: location.origin,
      title: document.title.slice(0, 160),
      bodyTextLength: document.body?.innerText?.length || 0,
      localStorage: localStorage.getItem(key),
      indexedDB: indexedDBValue,
      cookie: cookie ? cookie.slice(key.length + 1) : null
    }
  })()`
}

async function captureStorage (cdp, frame, nonce, write) {
  const contextId = await isolatedContext(cdp, frame)
  const result = await evaluate(cdp, storageExpression(nonce, write), { contextId, sessionId: frame.sessionId, awaitPromise: true })
  if (!result || typeof result !== 'object') throw new Error('storage measurement did not return a value')
  // Compare the isolated diagnostic world with the normal app world. The
  // normal world is what a real P2P page can access; retain only our nonce.
  const mainWorldCookie = await evaluate(cdp, `(() => {
    const key = ${JSON.stringify(PROOF_KEY)}
    const value = ${JSON.stringify(nonce)}
    if (${write}) document.cookie = key + '=' + value + '; Path=/; SameSite=None; Secure'
    const match = document.cookie.split(/;\\s*/).find((item) => item.startsWith(key + '=')) || ''
    return match ? match.slice(key.length + 1) : null
  })()`, { contextId: frame.contextId, sessionId: frame.sessionId })
  // Query Chromium's cookie jar for this exact URL as a third measurement.
  // Real app cookies are filtered out before any artifact is written.
  const jar = await cdp.send('Network.getCookies', { urls: [frame.frameUrl] })
  const proofCookie = (jar.cookies || []).find((cookie) => cookie.name === PROOF_KEY)
  return {
    ...result,
    cookieIsolatedWorld: result.cookie,
    cookie: mainWorldCookie,
    cookieJar: proofCookie?.value || null,
    cookieDomainMatchesFrame: proofCookie ? proofCookie.domain === new URL(frame.frameUrl).hostname : null,
    cookieSecure: proofCookie?.secure === true,
    cookieSameSiteNone: proofCookie?.sameSite === 'None'
  }
}

function summarizeApp (app, frame, storage) {
  return {
    label: app.label,
    hyperUrl: app.url,
    driveKey: app.driveKey,
    frameId: frame.frameId,
    targetId: frame.targetId,
    frameUrl: safeDriveUrl(frame.frameUrl),
    documentResponse: { ...frame.response },
    storage
  }
}

async function runCapture (cdp, apps, deadline, appTimeoutMs) {
  const browser = await observeBrowser(cdp)
  await waitForShell(cdp, deadline)
  await dismissOnboarding(cdp)
  const nonce = randomBytes(24).toString('hex')
  const observations = []
  for (const [index, app] of apps.entries()) {
    await navigateThroughUi(cdp, app)
    const frame = await waitForAppFrame(cdp, browser, app, Math.min(deadline, Date.now() + appTimeoutMs))
    const storage = await captureStorage(cdp, frame, nonce, index === 0)
    observations.push(summarizeApp(app, frame, storage))
  }
  const [a, b] = observations
  const checks = [
    { id: 'real-document-a', ok: a.documentResponse.status === 200 && a.documentResponse.completed },
    { id: 'real-document-b', ok: b.documentResponse.status === 200 && b.documentResponse.completed },
    { id: 'distinct-frames', ok: a.frameId !== b.frameId },
    { id: 'drive-hosts', ok: driveFrameUrlMatches(a.frameUrl, apps[0]) && driveFrameUrlMatches(b.frameUrl, apps[1]) && a.storage.origin !== b.storage.origin },
    { id: 'app-a-storage', ok: a.storage.localStorage === nonce && a.storage.indexedDB === nonce && a.storage.cookie === nonce && a.storage.cookieJar === nonce && a.storage.cookieDomainMatchesFrame && a.storage.cookieSecure && a.storage.cookieSameSiteNone },
    { id: 'app-b-storage-isolated', ok: b.storage.localStorage !== nonce && b.storage.indexedDB !== nonce && b.storage.cookie !== nonce && b.storage.cookieJar !== nonce },
    { id: 'rendered-real-pages', ok: a.storage.bodyTextLength > 0 && b.storage.bodyTextLength > 0 }
  ]
  return { observations, checks, rehearsalPassed: checks.every((check) => check.ok) }
}

async function stopChild (child) {
  if (!child || child.exitCode !== null) return
  await new Promise((resolve) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve() }, 5000)
    child.once('exit', () => { clearTimeout(timer); resolve() })
    child.kill('SIGTERM')
  })
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  const apps = loadApps(args)
  const packageInfo = await inspectPackage(args.app)
  const profileId = randomUUID()
  const artifact = makeRehearsalArtifact({ apps, packageInfo, profileId })
  const out = args.out || join(tmpdir(), `pearbrowser-origin-package-proof-${Date.now()}.json`)
  let profile = ''
  let child = null
  let cdp = null
  try {
    profile = mkdtempSync(join(tmpdir(), 'pearbrowser-origin-profile-'))
    if (out.startsWith(profile + '/')) throw new Error('output artifact cannot be inside the disposable profile')
    const port = await reservePort()
    const env = { ...process.env, PEARBROWSER_PER_DRIVE_ORIGINS: '1', PEARBROWSER_QVAC_OLLAMA: '0' }
    child = spawn(packageInfo.executable, [
      `--user-data-dir=${profile}`,
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${port}`
    ], { env, stdio: 'ignore' })
    const deadline = Date.now() + args.timeoutMs
    const target = await findWindow(port, child, deadline)
    cdp = await connectCdp(target.webSocketDebuggerUrl)
    const result = await runCapture(cdp, apps, deadline, args.appTimeoutMs)
    artifact.observations = result.observations
    artifact.checks = result.checks
    artifact.rehearsalPassed = result.rehearsalPassed
    artifact.status = result.rehearsalPassed ? 'REHEARSAL_PASS' : 'REHEARSAL_BLOCKED'
    if (!result.rehearsalPassed) artifact.blocker = 'one or more real-app browser measurements failed'
  } catch (error) {
    artifact.blocker = redactDiagnostic(error)
  } finally {
    cdp?.close()
    await stopChild(child)
    if (profile) rmSync(profile, { recursive: true, force: true })
  }
  writeFileSync(out, JSON.stringify(artifact, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ status: artifact.status, rehearsalPassed: artifact.rehearsalPassed, releaseGate: 'BLOCKED', artifact: out, blocker: artifact.blocker }))
  if (!artifact.rehearsalPassed) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(JSON.stringify({ status: 'REHEARSAL_BLOCKED', releaseGate: 'BLOCKED', error: redactDiagnostic(error) }))
    process.exitCode = 1
  })
}
