import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { WalletConnections } = require('../backend/wallet/wallet-connections.cjs')

const DRIVE_A = 'aa'.repeat(32)
const DRIVE_B = 'bb'.repeat(32)
const MANIFEST_A = 'cc'.repeat(32)
const MANIFEST_B = 'dd'.repeat(32)
const ORIGIN = 'http://127.0.0.1:9341'

function tuple (overrides = {}) {
  return {
    browserSessionId: 'session-0001',
    tabId: 'tab-1',
    driveKey: DRIVE_A,
    walletTabOrigin: ORIGIN,
    manifestSha256: MANIFEST_A,
    chainId: 'eip155:2201',
    assetId: 'stable-testnet-usdt0',
    permissions: { connect: true, pay: true, signApp: false },
    ...overrides
  }
}

function codeOf (fn) {
  try {
    fn()
  } catch (err) {
    return err.code
  }
  throw new Error('expected the call to throw')
}

test('connect is idempotent per tuple and returns a frozen summary', () => {
  const connections = new WalletConnections({ now: () => 42 })
  const first = connections.connect(tuple())
  const second = connections.connect(tuple())
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.permissions), true)
  assert.equal(first.connectedAt, 42)
  assert.deepEqual(first, second)
  assert.equal(connections.list().length, 1)
})

test('a changed binding replaces the connection record', () => {
  let now = 1
  const connections = new WalletConnections({ now: () => now })
  const first = connections.connect(tuple())
  now = 2
  const replaced = connections.connect(tuple({ manifestSha256: MANIFEST_B }))
  assert.equal(replaced.manifestSha256, MANIFEST_B)
  assert.equal(replaced.connectedAt, 2)
  assert.notEqual(first.connectedAt, replaced.connectedAt)
  assert.equal(connections.list().length, 1)
})

test('omitted permissions default to all-deny (fail closed)', () => {
  const connections = new WalletConnections()
  const record = connections.connect(tuple({ permissions: undefined }))
  assert.deepEqual(record.permissions, { connect: false, pay: false, signApp: false })
})

test('connect validates the binding against the frozen manifest', () => {
  const connections = new WalletConnections()
  assert.equal(codeOf(() => connections.connect(tuple({ chainId: 'eip155:1' }))), 'unsupported-chain')
  assert.equal(codeOf(() => connections.connect(tuple({ assetId: 'usdt' }))), 'unsupported-asset')
  assert.equal(codeOf(() => connections.connect(tuple({ walletTabOrigin: 'https://evil.example' }))), 'bad-request')
  assert.equal(codeOf(() => connections.connect(tuple({ walletTabOrigin: 'http://127.0.0.1:9341/path' }))), 'bad-request')
  assert.equal(codeOf(() => connections.connect(tuple({ driveKey: 'zz' }))), 'bad-request')
  assert.equal(codeOf(() => connections.connect(tuple({ browserSessionId: 'x' }))), 'bad-request')
  assert.equal(codeOf(() => connections.connect(null)), 'bad-request')
})

test('assertConnected throws not-connected and returns the record when present', () => {
  const connections = new WalletConnections()
  assert.equal(codeOf(() => connections.assertConnected(tuple())), 'not-connected')
  assert.equal(connections.isConnected(tuple()), false)
  connections.connect(tuple())
  const record = connections.assertConnected({ browserSessionId: 'session-0001', tabId: 'tab-1', driveKey: DRIVE_A })
  assert.equal(record.walletTabOrigin, ORIGIN)
  assert.equal(connections.isConnected(tuple()), true)
})

test('the tuple distinguishes tabs and sessions for the same drive', () => {
  const connections = new WalletConnections()
  connections.connect(tuple())
  assert.equal(codeOf(() => connections.assertConnected({ browserSessionId: 'session-0001', tabId: 'tab-2', driveKey: DRIVE_A })), 'not-connected')
  assert.equal(codeOf(() => connections.assertConnected({ browserSessionId: 'session-0002', tabId: 'tab-1', driveKey: DRIVE_A })), 'not-connected')
  connections.connect(tuple({ tabId: 'tab-2', walletTabOrigin: 'http://127.0.0.1:9342' }))
  assert.equal(connections.list().length, 2)
})

test('disconnect, revokeTab, revokeSession and revokeAll', () => {
  const connections = new WalletConnections()
  connections.connect(tuple())
  connections.connect(tuple({ tabId: 'tab-2', driveKey: DRIVE_B }))
  connections.connect(tuple({ browserSessionId: 'session-0002', tabId: 'tab-9' }))
  assert.equal(codeOf(() => connections.disconnect({ browserSessionId: 'session-0001', tabId: 'tab-1', driveKey: DRIVE_B })), 'not-connected')

  assert.equal(connections.revokeTab('session-0001', 'tab-1'), 1)
  assert.equal(connections.list().length, 2)

  assert.equal(connections.revokeSession('session-0002'), 1)
  assert.equal(connections.list().length, 1)

  const result = connections.disconnect({ browserSessionId: 'session-0001', tabId: 'tab-2', driveKey: DRIVE_B })
  assert.equal(result.disconnected, true)
  assert.equal(connections.list().length, 0)

  connections.connect(tuple())
  assert.equal(connections.revokeAll(), 1)
  assert.equal(connections.list().length, 0)
})

test('list returns safe summaries without mutable internals', () => {
  const connections = new WalletConnections()
  connections.connect(tuple())
  const list = connections.list()
  assert.equal(Object.isFrozen(list), true)
  assert.equal(Object.isFrozen(list[0]), true)
  assert.deepEqual(Object.keys(list[0]).sort(), [
    'assetId',
    'browserSessionId',
    'chainId',
    'connectedAt',
    'driveKey',
    'manifestSha256',
    'permissions',
    'tabId',
    'walletTabOrigin'
  ])
})
