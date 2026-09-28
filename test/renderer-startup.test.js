import test from 'node:test'
import assert from 'node:assert/strict'

const sessionToken = 'a'.repeat(64)
const priorRuntime = globalThis.pearbrowserRuntime
globalThis.pearbrowserRuntime = { sessionToken }
const { startBackend } = await import('../ui/boot.js?renderer-startup-test')
globalThis.pearbrowserRuntime = priorRuntime

test('renderer startup tolerates a 3.25-second first WebSocket handshake without exposing its session token', { timeout: 15_000 }, async (t) => {
  const previousWebSocket = globalThis.WebSocket
  const previousLog = console.log
  const logs = []
  DelayedWebSocket.instances.length = 0
  globalThis.WebSocket = DelayedWebSocket
  console.log = (...parts) => logs.push(parts.join(' '))
  t.after(() => {
    globalThis.WebSocket = previousWebSocket
    console.log = previousLog
  })

  const started = performance.now()
  const { pipe, storagePath } = await startBackend({ startupTimeoutMs: 10_000, portTimeoutMs: 7_000, retryDelayMs: 10 })
  t.after(() => pipe.destroy())
  const elapsedMs = performance.now() - started

  assert.ok(elapsedMs >= 3_000, `expected delayed handshake, got ${elapsedMs} ms`)
  assert.ok(elapsedMs < 10_000, `startup exceeded its bounded budget: ${elapsedMs} ms`)
  assert.equal(pipe.connected, true)
  assert.match(storagePath, /WS :9876/)

  const [probe, renderer] = DelayedWebSocket.instances
  assert.ok(probe)
  assert.ok(renderer)
  assert.equal(new URL(probe.url).pathname, '/status-smoke')
  assert.equal(new URL(renderer.url).pathname, '/')
  for (const socket of [probe, renderer]) {
    const url = new URL(socket.url)
    assert.equal(url.host, '127.0.0.1:9876')
    assert.deepEqual([...url.searchParams], [['session', sessionToken]])
  }
  assert.equal(logs.some((line) => line.includes(sessionToken)), false)
})

test('renderer startup stops at its overall deadline when WebSockets never open', { timeout: 5_000 }, async (t) => {
  const previousWebSocket = globalThis.WebSocket
  globalThis.WebSocket = NeverOpenWebSocket
  t.after(() => { globalThis.WebSocket = previousWebSocket })

  const started = performance.now()
  await assert.rejects(
    startBackend({ startupTimeoutMs: 130, portTimeoutMs: 80, retryDelayMs: 5 }),
    /within 130 ms .*last scan: :987[67] probe timeout/
  )
  const elapsedMs = performance.now() - started
  assert.ok(elapsedMs >= 110, `startup stopped prematurely: ${elapsedMs} ms`)
  assert.ok(elapsedMs < 500, `startup exceeded its bounded budget: ${elapsedMs} ms`)
})

function frame (message) {
  const json = JSON.stringify(message)
  return json.length.toString(16).padStart(8, '0') + json
}

class DelayedWebSocket extends EventTarget {
  static instances = []

  constructor (url) {
    super()
    this.url = url
    this.closed = false
    DelayedWebSocket.instances.push(this)
    const delayMs = new URL(url).pathname === '/status-smoke' ? 3250 : 1
    this.timer = setTimeout(() => {
      if (!this.closed) this.dispatchEvent(new Event('open'))
    }, delayMs)
  }

  send (data) {
    const request = JSON.parse(data.slice(8))
    this.timer = setTimeout(() => {
      if (!this.closed) this.dispatchEvent(new MessageEvent('message', { data: frame({ id: request.id, result: { ready: true } }) }))
    }, 1)
  }

  close () {
    this.closed = true
    clearTimeout(this.timer)
  }
}

class NeverOpenWebSocket extends EventTarget {
  close () {}
}
