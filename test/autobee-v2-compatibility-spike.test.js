// Autobee 2.12.1 compatibility spike. Disposable Corestores only: no browser
// catalogue, profile, or existing Autobase/Hyperbee data is opened here.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Autobee from 'autobee'
import Corestore from 'corestore'
import b4a from 'b4a'

const keyHex = (key) => b4a.toString(key, 'hex')
const encode = (op) => b4a.from(JSON.stringify(op))
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function until (label, check, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    await pause(50)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

function makeApply (ownerWriter) {
  return async (nodes, view, host) => {
    for (const node of nodes) {
      const op = JSON.parse(b4a.toString(node.value))
      if (op.type === 'grant') {
        // The spike grants a writer only from the fixture's explicit owner.
        if (keyHex(node.key) === ownerWriter.key && /^[0-9a-f]{64}$/.test(op.writer || '')) {
          await host.addWriter(b4a.from(op.writer, 'hex'), { isIndexer: true })
        }
        continue
      }
      // Pure apply: identical op order yields identical view after undo/reapply.
      if (op.type !== 'set' || typeof op.key !== 'string' || typeof op.value !== 'string') continue
      const batch = view.write()
      batch.tryPut(b4a.from(op.key), b4a.from(op.value))
      await batch.flush()
    }
  }
}

async function openBee (dir, { bootstrap = null, ownerWriter = { key: null } } = {}) {
  const store = new Corestore(dir)
  await store.ready()
  const trusted = new Set(bootstrap ? [keyHex(bootstrap)] : [])
  const isTrusted = (key) => trusted.has(keyHex(key))
  const db = new Autobee(store, bootstrap, {
    apply: makeApply(ownerWriter),
    optimistic: false,
    // Trust is explicit even though fast-forward is disabled in this spike.
    // A production policy must also review grants, revocation, and recovery.
    isTrusted,
    fastForward: false
  })
  try {
    await db.ready()
    trusted.add(keyHex(db.local.key))
    if (!ownerWriter.key && !bootstrap) ownerWriter.key = keyHex(db.local.key)
    return { db, trusted, isTrusted }
  } catch (error) {
    await store.close()
    throw error
  }
}

async function value (db, key) {
  await db.update()
  const entry = await db.view.get(b4a.from(key))
  return entry ? b4a.toString(entry.value) : null
}

function wire (a, b) {
  const left = a.replicate(true)
  const right = b.replicate(false)
  left.pipe(right).pipe(left)
  return () => { left.destroy(); right.destroy() }
}

test('Autobee 2.12.1 reopens a derived view from a disposable Corestore', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pearbrowser-desktop-autobee-reopen-'))
  let fixture = null
  try {
    fixture = await openBee(dir)
    const bootstrap = b4a.from(fixture.db.key)
    const ownerWriter = { key: keyHex(fixture.db.local.key) }
    assert.equal(fixture.isTrusted(b4a.alloc(32, 0x42)), false)
    await fixture.db.append(encode({ type: 'set', key: 'bookmark', value: 'hyper://example' }))
    await until('initial view', async () => (await value(fixture.db, 'bookmark')) === 'hyper://example')
    await fixture.db.close()
    fixture = null
    fixture = await openBee(dir, { bootstrap, ownerWriter })
    assert.equal(await value(fixture.db, 'bookmark'), 'hyper://example')
  } finally {
    if (fixture) await fixture.db.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('Autobee 2.12.1 grants a second writer and converges concurrent edits', async () => {
  const dirA = await mkdtemp(join(tmpdir(), 'pearbrowser-desktop-autobee-a-'))
  const dirB = await mkdtemp(join(tmpdir(), 'pearbrowser-desktop-autobee-b-'))
  let a = null
  let b = null
  let unwire = null
  try {
    const ownerWriter = { key: null }
    a = await openBee(dirA, { ownerWriter })
    b = await openBee(dirB, { bootstrap: a.db.key, ownerWriter })
    unwire = wire(a.db, b.db)
    assert.equal(a.isTrusted(b.db.local.key), false)
    await a.db.append(encode({ type: 'grant', writer: keyHex(b.db.local.key) }))
    await until('second writer permission', async () => { await b.db.update(); return b.db.writable })
    await Promise.all([
      a.db.append([
        encode({ type: 'set', key: 'writer-a', value: 'seen' }),
        encode({ type: 'set', key: 'shared', value: 'from A' })
      ]),
      b.db.append([
        encode({ type: 'set', key: 'writer-b', value: 'seen' }),
        encode({ type: 'set', key: 'shared', value: 'from B' })
      ])
    ])
    await until('both views converge', async () => {
      const av = await value(a.db, 'shared')
      const bv = await value(b.db, 'shared')
      return av !== null && av === bv &&
        (await value(a.db, 'writer-a')) === 'seen' && (await value(a.db, 'writer-b')) === 'seen' &&
        (await value(b.db, 'writer-a')) === 'seen' && (await value(b.db, 'writer-b')) === 'seen'
    })
    assert.ok(['from A', 'from B'].includes(await value(a.db, 'shared')))
    assert.equal(await value(a.db, 'shared'), await value(b.db, 'shared'))
  } finally {
    if (unwire) unwire()
    if (a) await a.db.close()
    if (b) await b.db.close()
    await rm(dirA, { recursive: true, force: true })
    await rm(dirB, { recursive: true, force: true })
  }
})
