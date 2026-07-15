// Regression for the N5-wiring review HIGH finding, applied to the Pear Bridge
// sync-group consumer: a sync group's Autobase close() must NOT tear down the
// SHARED root Corestore (Hyperdrive / UserData / Names / replication). Each sync
// group used the RAW store, so closing one (and two groups colliding on the same
// local writer core) was unsafe. Fix: every group gets its own per-appId
// namespaced substore, and PearBridge.close() now closes each base.
//
// pear-bridge.js is Bare-targeted: it require()s 'bare-crypto', a native Bare
// addon that can't load under Node. It only uses crypto.createHash('sha256'),
// which node:crypto provides identically — so we shim 'bare-crypto' with
// node:crypto and exercise the REAL PearBridge.
import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import { createRequire } from 'node:module'
import nodeCrypto from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'

const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  return request === 'bare-crypto' ? nodeCrypto : origLoad.call(this, request, parent, isMain)
}
const { PearBridge } = (await import('../backend/pear-bridge.js')).default
const require = createRequire(import.meta.url)
const ApplyState = require('../node_modules/autobase/lib/apply-state.js')
Module._load = origLoad

// PearBridge.createSyncGroup/close call swarm.join/leave; a no-op stub is enough.
const stubSwarm = () => ({ join () {}, leave () {} })

async function newStore () {
  const dir = await mkdtemp(join(tmpdir(), 'pb-shared-'))
  const store = new Corestore(dir); await store.ready()
  return { store, dir }
}

test('closing a PearBridge leaves the shared root Corestore + siblings alive', async () => {
  const { store, dir } = await newStore()
  try {
    const bee = new Hyperbee(store.get({ name: 'userdata' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready(); await bee.put('k', 1)
    const bridge = new PearBridge(store, stubSwarm())
    await bridge.createSyncGroup('myapp', async () => {})
    await bridge.append('myapp', { type: 'test', data: { v: 1 } })
    await bridge.close() // closes the group's base — must not kill the root store
    assert.equal(store.closed, false, 'root store must stay open after the bridge closes')
    await bee.put('after', 2) // a sibling Hyperbee on the same root still works
    assert.equal((await bee.get('after')).value, 2)
    await bee.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})

test('two PearBridge sync groups coexist on ONE shared store without colliding', async () => {
  const { store, dir } = await newStore()
  try {
    const bridge = new PearBridge(store, stubSwarm())
    const a = await bridge.createSyncGroup('app-a', async () => {})
    const b = await bridge.createSyncGroup('app-b', async () => {})
    // Per-appId substores ⇒ distinct local writer cores ⇒ distinct invite keys.
    // On the raw store both groups would share one 'local' writer core.
    assert.notEqual(a.inviteKey, b.inviteKey, 'distinct appId substores ⇒ distinct base identities')
    await bridge.append('app-a', { type: 'test', data: { v: 1 } })
    await bridge.append('app-b', { type: 'test', data: { v: 2 } })
    await bridge.close()
    assert.equal(store.closed, false, 'closing both groups must not kill the root store')
    const bee = new Hyperbee(store.get({ name: 'userdata' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready(); await bee.put('after', 3)
    assert.equal((await bee.get('after')).value, 3)
    await bee.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})

test('PearBridge leaves Autobase tracing safe when a mapped view ref is unavailable', () => {
  const seen = []
  const tracer = (name, blocks = []) => ({
    start () { seen.push('start:' + name) },
    end () { seen.push('end:' + name); return blocks }
  })
  const node = {}
  const fakeApplyState = {
    systemRef: { tracer: tracer('system') },
    encryptionView: { ref: { tracer: tracer('encryption') } },
    views: [
      { ref: null },
      { ref: { tracer: tracer('view', [7]) } }
    ]
  }

  assert.doesNotThrow(() => ApplyState.prototype._startTrace.call(fakeApplyState, node))
  assert.doesNotThrow(() => ApplyState.prototype._endTrace.call(fakeApplyState, node))
  assert.deepEqual(node.trace, {
    system: [],
    encryption: [],
    user: [{ view: 1, blocks: [7] }]
  })
  assert.deepEqual(seen, ['start:system', 'start:encryption', 'start:view', 'end:system', 'end:encryption', 'end:view'])
})

test('PearBridge Autobase trace guard tolerates missing trace containers', () => {
  const emptyState = {
    systemRef: null,
    encryptionView: null
  }
  assert.doesNotThrow(() => ApplyState.prototype._startTrace.call(emptyState))
  assert.doesNotThrow(() => ApplyState.prototype._endTrace.call(emptyState))

  const node = {}
  const partialState = {
    systemRef: { tracer: { start () {}, end () { return null } } },
    encryptionView: {},
    views: [
      {},
      { ref: { tracer: { start () {}, end () { return [9] } } } }
    ]
  }
  assert.doesNotThrow(() => ApplyState.prototype._startTrace.call(partialState))
  assert.doesNotThrow(() => ApplyState.prototype._endTrace.call(partialState))
  assert.doesNotThrow(() => ApplyState.prototype._endTrace.call(partialState, node))
  assert.deepEqual(node.trace, {
    system: [],
    encryption: [],
    user: [{ view: 1, blocks: [9] }]
  })
})

test('PearBridge default reducer supports generic app writes', async () => {
  const { store, dir } = await newStore()
  try {
    const bridge = new PearBridge(store, stubSwarm())
    await bridge.createSyncGroup('generic-app')
    await bridge.append('generic-app', { type: 'probe:mobile', data: { id: 'one', note: 'default reducer probe' } })
    assert.deepEqual(await bridge.get('generic-app', 'probe!mobile!one'), { id: 'one', note: 'default reducer probe' })
    await bridge.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})

test('PearBridge dedupes concurrent createSyncGroup calls for the same app id', async () => {
  const { store, dir } = await newStore()
  try {
    const bridge = new PearBridge(store, stubSwarm())
    const [first, second] = await Promise.all([
      bridge.createSyncGroup('in-flight-app'),
      bridge.createSyncGroup('in-flight-app')
    ])
    assert.equal(second.inviteKey, first.inviteKey)
    assert.equal(second.writerPublicKey, first.writerPublicKey)
    assert.equal(bridge._syncGroups.size, 1)
    await bridge.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})

test('PearBridge createSyncGroup is open-or-create for an already-open app id', async () => {
  const { store, dir } = await newStore()
  try {
    const bridge = new PearBridge(store, stubSwarm())
    const first = await bridge.createSyncGroup('repeat-app')
    const second = await bridge.createSyncGroup('repeat-app')
    assert.equal(second.inviteKey, first.inviteKey)
    assert.equal(second.writerPublicKey, first.writerPublicKey)
    await bridge.joinSyncGroup('repeat-app', first.inviteKey)
    await assert.rejects(
      () => bridge.joinSyncGroup('repeat-app', 'a'.repeat(64)),
      /different invite key/
    )
    await bridge.close()
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
})
