#!/usr/bin/env node

// Inspect the first packaged Electron window through a loopback-only DevTools
// endpoint. A healthy backend RPC is insufficient if the renderer cannot boot.
const port = parseNumber('--port', 19222)
const timeout = parseNumber('--timeout', 90000)
const deadline = Date.now() + timeout

try {
  const target = await findWindow()
  const socket = await openSocket(target.webSocketDebuggerUrl)
  try {
    const cdp = createCdp(socket)
    await cdp.send('Page.enable')
    const initial = await waitForShellOrDiagnose(cdp, 'first window')
    const loaded = cdp.waitFor('Page.loadEventFired', 15000)
    await cdp.send('Page.reload', { ignoreCache: true })
    await loaded
    const reloaded = await waitForShellOrDiagnose(cdp, 'reloaded window')
    console.log(JSON.stringify({ ok: true, port, initial, reloaded }))
  } finally {
    socket.close()
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, port, error: error.message }))
  process.exitCode = 1
}

function parseNumber (flag, fallback) {
  const index = process.argv.indexOf(flag)
  const raw = index < 0 ? fallback : process.argv[index + 1]
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) throw new Error(`${flag} must be a positive integer`)
  return value
}

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function findWindow () {
  let last = 'DevTools endpoint not ready'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
        redirect: 'error',
        signal: AbortSignal.timeout(2000)
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const targets = await response.json()
      const target = targets.find((row) => row.type === 'page' && String(row.url || '').startsWith('file://'))
      if (target?.webSocketDebuggerUrl) {
        const wsUrl = new URL(target.webSocketDebuggerUrl)
        if (wsUrl.protocol !== 'ws:' || !['127.0.0.1', 'localhost'].includes(wsUrl.hostname) || Number(wsUrl.port) !== port) {
          throw new Error('DevTools page target was not bound to the expected loopback port')
        }
        return target
      }
      last = 'packaged file window not listed'
    } catch (error) {
      last = error.message
    }
    await sleep(500)
  }
  throw new Error(`first packaged window did not open: ${last}`)
}

async function openSocket (url) {
  const socket = new globalThis.WebSocket(url)
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('DevTools socket open timed out')), 10000)
      socket.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('DevTools socket failed to open')) }, { once: true })
    })
    return socket
  } catch (error) {
    socket.close()
    throw error
  }
}

function createCdp (socket) {
  let nextId = 0
  const pending = new Map()
  const listeners = new Map()
  socket.addEventListener('message', (event) => {
    let message
    try { message = JSON.parse(event.data) } catch { return }
    if (Number.isInteger(message.id) && pending.has(message.id)) {
      const handler = pending.get(message.id)
      pending.delete(message.id)
      clearTimeout(handler.timer)
      message.error ? handler.reject(new Error(message.error.message)) : handler.resolve(message.result || {})
    }
    if (message.method && listeners.has(message.method)) {
      for (const handler of listeners.get(message.method)) handler(message.params || {})
    }
  })
  return {
    send (method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++nextId
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`DevTools ${method} timed out`))
        }, 10000)
        pending.set(id, { resolve, reject, timer })
        socket.send(JSON.stringify({ id, method, params }))
      })
    },
    waitFor (method, timeoutMs) {
      return new Promise((resolve, reject) => {
        const handlers = listeners.get(method) || new Set()
        listeners.set(method, handlers)
        const timer = setTimeout(() => {
          handlers.delete(onEvent)
          reject(new Error(`DevTools ${method} event timed out`))
        }, timeoutMs)
        function onEvent (params) {
          clearTimeout(timer)
          handlers.delete(onEvent)
          resolve(params)
        }
        handlers.add(onEvent)
      })
    }
  }
}

async function waitForShell (cdp, label) {
  let last = null
  while (Date.now() < deadline) {
    try {
      const result = await cdp.send('Runtime.evaluate', {
        expression: `(() => ({
          mounted: !!document.querySelector('#app > .app .topbar .tabs') && !!document.querySelector('#app > .app .browse .tabstrip'),
          splash: document.querySelector('.splash-status')?.textContent?.trim() || '',
          failed: !!document.querySelector('.splash-status.failed')
        }))()`,
        returnByValue: true
      })
      if (result.exceptionDetails) throw new Error('renderer evaluation failed')
      last = result.result?.value || null
      if (last?.failed) throw new Error(`${label} failed: ${last.splash || 'boot failed'}`)
      if (last?.mounted) return { mounted: true, splash: '' }
    } catch (error) {
      if (/failed:/.test(error.message)) throw error
      last = { error: error.message }
    }
    await sleep(500)
  }
  throw new Error(`${label} did not mount the browser shell: ${JSON.stringify(last)}`)
}

// Do not print the raw splash detail or WebSocket URL. The renderer session
// token appears in RPC query strings, and CI logs must never contain it.
async function waitForShellOrDiagnose (cdp, label) {
  try {
    return await waitForShell(cdp, label)
  } catch (error) {
    if (!error.message.startsWith(`${label} failed:`)) throw error
    const diagnostics = await diagnoseFailedWindow(cdp)
    throw new Error(`${error.message}; diagnostics=${JSON.stringify(diagnostics)}`)
  }
}

async function diagnoseFailedWindow (cdp) {
  let splash = { kind: 'unavailable' }
  try {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const detail = document.querySelector('.splash-detail')?.textContent || ''
        const failures = [...detail.matchAll(/:(9876|9877|9878|9879|9880) (probe timeout|probe error|probe closed|renderer handshake timeout|renderer ws error|renderer ws closed|timeout|ws error|ws closed)/g)]
          .map((match) => ({ port: Number(match[1]), reason: match[2] }))
        return {
          kind: detail.includes('Could not reach backend on any port') || detail.includes('Could not establish the local backend connection')
            ? 'backend-unreachable'
            : 'other',
          failures,
          sessionTokenPresent: /^[0-9a-f]{64}$/i.test(String(globalThis.pearbrowserRuntime?.sessionToken || ''))
        }
      })()`,
      returnByValue: true
    })
    if (!result.exceptionDetails) splash = result.result?.value || splash
  } catch {}

  // Repeat only a loopback diagnostic handshake after the failed boot. This
  // distinguishes a cold Chromium network-context delay from a persistent
  // renderer-to-backend failure without exposing the token to the Node side.
  let rendererProbe = { status: 'unavailable' }
  try {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `new Promise((resolve) => {
        const token = globalThis.pearbrowserRuntime?.sessionToken
        if (typeof token !== 'string' || !/^[0-9a-f]{64}$/i.test(token)) {
          resolve({ status: 'missing-session-token' })
          return
        }
        const started = performance.now()
        let socket
        let settled = false
        const timer = setTimeout(() => finish('timeout'), 7000)
        function finish (status) {
          if (settled) return
          settled = true
          clearTimeout(timer)
          try { socket?.close() } catch {}
          resolve({ status, elapsedMs: Math.round(performance.now() - started) })
        }
        try {
          socket = new WebSocket('ws://127.0.0.1:9876/status-smoke?session=' + encodeURIComponent(token))
          socket.addEventListener('open', () => finish('open'), { once: true })
          socket.addEventListener('error', () => finish('error'), { once: true })
          socket.addEventListener('close', () => finish('closed'), { once: true })
        } catch {
          finish('constructor-error')
        }
      })`,
      awaitPromise: true,
      returnByValue: true
    })
    if (!result.exceptionDetails) rendererProbe = result.result?.value || rendererProbe
  } catch {}
  return { splash, rendererProbe }
}
