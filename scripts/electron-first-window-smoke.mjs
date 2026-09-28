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
    const initial = await waitForShell(cdp, 'first window')
    const loaded = cdp.waitFor('Page.loadEventFired', 15000)
    await cdp.send('Page.reload', { ignoreCache: true })
    await loaded
    const reloaded = await waitForShell(cdp, 'reloaded window')
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
