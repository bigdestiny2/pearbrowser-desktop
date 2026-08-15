import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import rpcModule from '../backend/rpc.js'

const { WorkletRPC } = rpcModule

class MockIPC extends EventEmitter {
  constructor () {
    super()
    this.frames = []
  }

  write (frame) {
    this.frames.push(Buffer.from(frame))
    return true
  }
}

function decodeFrame (frame) {
  const length = Number.parseInt(frame.subarray(0, 8).toString(), 16)
  return JSON.parse(frame.subarray(8, 8 + length).toString())
}

test('WorkletRPC preserves unique handler registration and dispatch', async () => {
  const ipc = new MockIPC()
  const rpc = new WorkletRPC(ipc)

  rpc.handle(40, async ({ value }) => ({ value: value + 1 }))
  rpc.handle(41, async () => 'second-command')

  await rpc._processMessage({ id: 1, cmd: 40, data: { value: 6 } })
  await rpc._processMessage({ id: 2, cmd: 41 })

  assert.deepEqual(ipc.frames.map(decodeFrame), [
    { id: 1, result: { value: 7 } },
    { id: 2, result: 'second-command' }
  ])
})

test('WorkletRPC rejects duplicate command registration and retains the original handler', async () => {
  const ipc = new MockIPC()
  const rpc = new WorkletRPC(ipc)
  const calls = []

  rpc.handle(210, async () => {
    calls.push('original')
    return 'original-result'
  })

  assert.throws(
    () => rpc.handle(210, async () => {
      calls.push('replacement')
      return 'replacement-result'
    }),
    /RPC handler already registered for command: 210/
  )

  await rpc._processMessage({ id: 3, cmd: 210 })

  assert.deepEqual(calls, ['original'])
  assert.deepEqual(decodeFrame(ipc.frames[0]), { id: 3, result: 'original-result' })
})
