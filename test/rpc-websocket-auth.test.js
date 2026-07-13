import test from 'node:test'
import assert from 'node:assert/strict'
import rpcWebSocketAuth from '../backend/rpc-websocket-auth.cjs'

const {
  authorizeRpcWebSocket,
  RpcFrameDecoder,
  DiagnosticRpcRouter,
  frameRpc
} = rpcWebSocketAuth

const OPTIONS = {
  sessionToken: 'renderer-launch-secret',
  diagnosticToken: 'operator-secret'
}

test('renderer WebSocket requires the per-launch session token', () => {
  assert.equal(authorizeRpcWebSocket({ url: '/' }, OPTIONS).allowed, false)
  assert.equal(authorizeRpcWebSocket({ url: '/?session=wrong' }, OPTIONS).allowed, false)
  assert.deepEqual(
    authorizeRpcWebSocket({ url: '/?session=renderer-launch-secret', headers: { origin: 'pear://app' } }, OPTIONS),
    { allowed: true, kind: 'renderer', full: true }
  )
})

test('browser-origin status sockets fail closed without the renderer token', () => {
  for (const origin of ['http://127.0.0.1:1234', 'https://example.test', 'null']) {
    const access = authorizeRpcWebSocket({ url: '/status-smoke', headers: { origin } }, OPTIONS)
    assert.equal(access.allowed, false, origin)
  }

  assert.deepEqual(
    authorizeRpcWebSocket({ url: '/status-smoke?session=renderer-launch-secret', headers: { origin: 'pear://app' } }, OPTIONS),
    { allowed: true, kind: 'diagnostic', full: false }
  )
})

test('originless status is read-only and full diagnostics require an operator secret', () => {
  assert.deepEqual(
    authorizeRpcWebSocket({ url: '/status-smoke' }, OPTIONS),
    { allowed: true, kind: 'diagnostic', full: false }
  )
  assert.deepEqual(
    authorizeRpcWebSocket({ url: '/status-smoke?token=operator-secret' }, OPTIONS),
    { allowed: true, kind: 'diagnostic', full: true }
  )
  assert.equal(
    authorizeRpcWebSocket({ url: '/status-smoke?token=operator-secret', headers: { origin: 'null' } }, OPTIONS).allowed,
    false
  )
})

test('read-only diagnostics cannot invoke Ask Browser or identity commands', () => {
  const forwarded = []
  const socket = fakeSocket()
  const router = new DiagnosticRpcRouter({ forward: frame => forwarded.push(frame) })
  router.add(socket)

  router.receive(socket, frameRpc({ id: 7, cmd: 221, data: { question: 'steal' } }))
  router.receive(socket, frameRpc({ id: 8, cmd: 70, data: {} }))

  assert.equal(forwarded.length, 0)
  const replies = decodeAll(socket.writes)
  assert.deepEqual(replies.map(reply => reply.id), [7, 8])
  assert.ok(replies.every(reply => /only allows CMD_GET_STATUS/.test(reply.error)))
})

test('diagnostic replies are id-remapped, isolated, and events are not broadcast', () => {
  const forwarded = []
  const first = fakeSocket()
  const second = fakeSocket()
  const router = new DiagnosticRpcRouter({ forward: frame => forwarded.push(frame) })
  router.add(first, { full: true })
  router.add(second, { full: true })

  router.receive(first, frameRpc({ id: 99, cmd: 2, data: {} }))
  const hostRequest = decodeAll(forwarded)[0]
  assert.ok(hostRequest.id < 0)
  assert.notEqual(hostRequest.id, 99)

  router.routeBackend(frameRpc({ event: 111, data: { secret: 'answer' } }))
  assert.equal(first.writes.length, 0)
  assert.equal(second.writes.length, 0)

  router.routeBackend(frameRpc({ id: hostRequest.id, result: { ok: true } }))
  assert.deepEqual(decodeAll(first.writes), [{ id: 99, result: { ok: true } }])
  assert.equal(second.writes.length, 0)
})

function fakeSocket () {
  return {
    writes: [],
    write (frame) { this.writes.push(frame) }
  }
}

function decodeAll (frames) {
  const decoder = new RpcFrameDecoder()
  return frames.flatMap(frame => decoder.push(frame))
}
