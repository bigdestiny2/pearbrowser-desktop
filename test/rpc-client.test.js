import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { RpcClient } from '../ui/rpc-client.js'
import { WsPipe } from '../ui/boot.js'

class MockPipe extends EventEmitter {
  constructor ({ connected = true, writable = true } = {}) {
    super()
    this.connected = connected
    this.writable = writable
    this.frames = []
  }

  write (frame) {
    if (!this.writable) return false
    this.frames.push(frame)
    return true
  }
}

test('renderer RPC rejects pending requests immediately when the pipe closes', async () => {
  const pipe = new MockPipe()
  const rpc = new RpcClient(pipe)
  const pending = rpc.request(31, {}, 10_000)

  pipe.emit('close')

  await assert.rejects(pending, /RPC connection closed/)
  assert.equal(rpc._pending.size, 0)
})

test('renderer RPC rejects new requests while the backend is disconnected', async () => {
  const pipe = new MockPipe({ connected: false })
  const rpc = new RpcClient(pipe)

  await assert.rejects(rpc.request(80), /RPC unavailable: 80 .*reconnecting/)
  assert.equal(pipe.frames.length, 0)
})

test('renderer RPC resumes requests after the pipe reconnects', async () => {
  const pipe = new MockPipe({ connected: false })
  const rpc = new RpcClient(pipe)

  pipe.connected = true
  pipe.emit('open')
  const pending = rpc.request(40, {}, 1_000)
  assert.equal(pipe.frames.length, 1)

  const request = JSON.parse(pipe.frames[0].slice(8))
  pipe.emit('data', frame({ id: request.id, result: { configured: true } }))

  assert.deepEqual(await pending, { configured: true })
})

test('renderer RPC rejects a request when the pipe is not writable', async () => {
  const pipe = new MockPipe({ writable: false })
  const rpc = new RpcClient(pipe)

  await assert.rejects(rpc.request(83), /RPC connection is not writable/)
  assert.equal(rpc._pending.size, 0)
})

test('renderer WebSocket reconnects and becomes writable again', async (t) => {
  const previousWebSocket = globalThis.WebSocket
  globalThis.WebSocket = FakeWebSocket
  FakeWebSocket.instances.length = 0
  t.after(() => { globalThis.WebSocket = previousWebSocket })

  const pipe = new WsPipe('ws://127.0.0.1:9876/?session=test', {
    reconnectBaseMs: 1,
    reconnectMaxMs: 1,
    maxReconnectAttempts: 2
  })
  t.after(() => pipe.destroy())

  const first = FakeWebSocket.instances[0]
  first.open()
  pipe.enableReconnect()
  assert.equal(pipe.connected, true)

  first.disconnect()
  assert.equal(pipe.connected, false)
  await new Promise(resolve => setTimeout(resolve, 5))

  const second = FakeWebSocket.instances[1]
  assert.ok(second, 'a replacement WebSocket should be created')
  second.open()
  assert.equal(pipe.connected, true)
  assert.equal(pipe.write('frame'), true)
  assert.deepEqual(second.sent, ['frame'])
})

function frame (message) {
  const json = JSON.stringify(message)
  return json.length.toString(16).padStart(8, '0') + json
}

class FakeWebSocket extends EventTarget {
  static instances = []

  constructor (url) {
    super()
    this.url = url
    this.binaryType = ''
    this.sent = []
    this.closed = false
    FakeWebSocket.instances.push(this)
  }

  open () {
    this.dispatchEvent(new Event('open'))
  }

  disconnect () {
    this.dispatchEvent(new Event('close'))
  }

  send (frame) {
    if (this.closed) throw new Error('socket closed')
    this.sent.push(frame)
  }

  close () {
    this.closed = true
  }
}
