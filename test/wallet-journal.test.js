import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import Corestore from 'corestore'

const require = createRequire(import.meta.url)
const { WalletJournal } = require('../backend/wallet/wallet-journal.cjs')

const DRIVE_A = 'aa'.repeat(32)
const DRIVE_B = 'bb'.repeat(32)
const MANIFEST = 'cc'.repeat(32)
const TX_HASH = '0x' + 'ab'.repeat(32)

async function withStore (fn) {
  const dir = await mkdtemp(join(tmpdir(), 'wallet-journal-test-'))
  const store = new Corestore(dir)
  await store.ready()
  try {
    await fn(store, dir)
  } finally {
    try { await store.close() } catch {}
    await rm(dir, { recursive: true, force: true })
  }
}

function codeOf (fn) {
  return fn().then(
    () => { throw new Error('expected the call to reject') },
    (err) => err.code
  )
}

test('append assigns monotonic seq/ts and freezes entries', async () => {
  await withStore(async (store) => {
    let now = 1000
    const journal = new WalletJournal({ store, now: () => now })
    await journal.ready()
    const first = await journal.append({ type: 'connect', driveKey: DRIVE_A, manifestSha256: MANIFEST })
    now = 1001
    const second = await journal.append({ type: 'disconnect', driveKey: DRIVE_A })
    assert.equal(first.seq, 1)
    assert.equal(first.ts, 1000)
    assert.equal(second.seq, 2)
    assert.equal(Object.isFrozen(first), true)
  })
})

test('listByDrive, getByIntentId and getByTxHash resolve through their indexes', async () => {
  await withStore(async (store) => {
    const journal = new WalletJournal({ store })
    await journal.ready()
    await journal.append({ type: 'intent', intentId: 'wpi_0000000000000001', driveKey: DRIVE_A, manifestSha256: MANIFEST, intent: { amountAtomic: '1' } })
    await journal.append({ type: 'prompt', intentId: 'wpi_0000000000000001', driveKey: DRIVE_A, expiresAt: 5 })
    await journal.append({ type: 'broadcast', intentId: 'wpi_0000000000000001', driveKey: DRIVE_A, transactionHash: TX_HASH })
    await journal.append({ type: 'connect', driveKey: DRIVE_B, manifestSha256: MANIFEST })

    const byDrive = await journal.listByDrive(DRIVE_A)
    assert.equal(byDrive.length, 3)
    assert.deepEqual(byDrive.map(e => e.seq), [1, 2, 3])
    assert.deepEqual((await journal.listByDrive(DRIVE_B)).map(e => e.type), ['connect'])

    const byIntent = await journal.getByIntentId('wpi_0000000000000001')
    assert.deepEqual(byIntent.map(e => e.type), ['intent', 'prompt', 'broadcast'])
    assert.equal(byIntent[0].intent.amountAtomic, '1')

    const byTx = await journal.getByTxHash(TX_HASH.toUpperCase().replace('0X', '0x'))
    assert.equal(byTx.length, 1)
    assert.equal(byTx[0].type, 'broadcast')
  })
})

test('listRecent returns newest first and honors the limit', async () => {
  await withStore(async (store) => {
    const journal = new WalletJournal({ store })
    await journal.ready()
    for (let i = 0; i < 10; i++) await journal.append({ type: 'connect', driveKey: DRIVE_A, manifestSha256: MANIFEST })
    const recent = await journal.listRecent(3)
    assert.deepEqual(recent.map(e => e.seq), [10, 9, 8])
  })
})

test('secret-bearing or malformed entries are rejected fail-closed', async () => {
  await withStore(async (store) => {
    const journal = new WalletJournal({ store })
    await journal.ready()
    assert.equal(await codeOf(() => journal.append({ type: 'intent', intentId: 'wpi_0000000000000001', mnemonic: 'abandon' })), 'bad-request')
    assert.equal(await codeOf(() => journal.append({ type: 'outcome', intentId: 'wpi_0000000000000001', nested: { signature: '0x' } })), 'bad-request')
    assert.equal(await codeOf(() => journal.append({ type: 'outcome', intentId: 'wpi_0000000000000001', signedTransaction: Buffer.alloc(4) })), 'bad-request')
    assert.equal(await codeOf(() => journal.append({ type: 'nope', driveKey: DRIVE_A })), 'bad-request')
    assert.equal(await codeOf(() => journal.append({ type: 'connect', seq: 9, driveKey: DRIVE_A })), 'bad-request')
    assert.equal(await codeOf(() => journal.append(null)), 'bad-request')
    // Nothing was persisted.
    assert.equal((await journal.listRecent(10)).length, 0)
  })
})

test('the append counter survives a reopen', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wallet-journal-test-'))
  const store = new Corestore(dir)
  await store.ready()
  try {
    const journal = new WalletJournal({ store })
    await journal.ready()
    await journal.append({ type: 'connect', driveKey: DRIVE_A, manifestSha256: MANIFEST })
  } finally {
    await store.close()
  }
  const store2 = new Corestore(dir)
  await store2.ready()
  try {
    const journal = new WalletJournal({ store: store2 })
    await journal.ready()
    const entry = await journal.append({ type: 'disconnect', driveKey: DRIVE_A })
    assert.equal(entry.seq, 2)
    assert.equal((await journal.listByDrive(DRIVE_A)).length, 2)
  } finally {
    await store2.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('lookups validate their identifiers', async () => {
  await withStore(async (store) => {
    const journal = new WalletJournal({ store })
    await journal.ready()
    assert.equal(await codeOf(() => journal.listByDrive('zz')), 'bad-request')
    assert.equal(await codeOf(() => journal.getByTxHash('0x1234')), 'bad-request')
    assert.equal(await codeOf(() => journal.getByIntentId('')), 'bad-request')
    assert.equal(await codeOf(() => journal.listRecent(0)), 'bad-request')
  })
})

test('concurrent appends are serialized with monotonic seq and consistent indexes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wallet-journal-test-'))
  const store = new Corestore(dir)
  await store.ready()
  try {
    const journal = new WalletJournal({ store })
    await journal.ready()
    const appends = []
    for (let i = 0; i < 20; i++) {
      appends.push(journal.append({
        type: 'connect',
        driveKey: DRIVE_A,
        manifestSha256: MANIFEST,
        intentId: 'wpi_shared' + String(i).padStart(8, '0')
      }))
    }
    const entries = await Promise.all(appends)
    // The append queue assigns seqs strictly in call order.
    assert.deepEqual(entries.map(e => e.seq), Array.from({ length: 20 }, (_, i) => i + 1))
  } finally {
    await store.close()
  }
  const store2 = new Corestore(dir)
  await store2.ready()
  try {
    const journal = new WalletJournal({ store: store2 })
    await journal.ready()
    const byDrive = await journal.listByDrive(DRIVE_A)
    assert.equal(byDrive.length, 20)
    assert.deepEqual(byDrive.map(e => e.seq), Array.from({ length: 20 }, (_, i) => i + 1))
    assert.equal((await journal.listRecent(1))[0].seq, 20)
    const next = await journal.append({ type: 'disconnect', driveKey: DRIVE_A })
    assert.equal(next.seq, 21)
  } finally {
    await store2.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('a crash mid-append never reuses a live seq after reopen', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wallet-journal-test-'))
  const store = new Corestore(dir)
  await store.ready()
  try {
    const journal = new WalletJournal({ store })
    await journal.ready()
    await journal.append({ type: 'connect', driveKey: DRIVE_A, manifestSha256: MANIFEST })
    // Simulate a crash between the entry put and the meta put: an entry at
    // seq 2 with the persisted counter still at 1.
    await journal._bee.put('e!' + String(2).padStart(20, '0'), { seq: 2, ts: 1, type: 'connect', driveKey: DRIVE_A })
  } finally {
    await store.close()
  }
  const store2 = new Corestore(dir)
  await store2.ready()
  try {
    const journal = new WalletJournal({ store: store2 })
    await journal.ready()
    const next = await journal.append({ type: 'disconnect', driveKey: DRIVE_A })
    assert.equal(next.seq, 3, 'the orphaned entry seq must not be reused')
    assert.deepEqual((await journal.listRecent(10)).map(e => e.seq), [3, 2, 1])
  } finally {
    await store2.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('idempotency reservations are atomic with the intent append and survive reopen', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wallet-journal-test-'))
  const reservation = {
    driveKey: DRIVE_A,
    manifestSha256: MANIFEST,
    idempotencyKey: 'checkout:order-1842:attempt-1',
    intentId: 'wpi_0000000000000001',
    intentDigest: 'dd'.repeat(32)
  }
  const intentEntry = (intentId) => ({
    type: 'intent',
    intentId,
    driveKey: DRIVE_A,
    manifestSha256: MANIFEST,
    intentType: 'payment',
    intent: { amountAtomic: '1' }
  })
  const store = new Corestore(dir)
  await store.ready()
  try {
    const journal = new WalletJournal({ store })
    await journal.ready()
    await journal.append(intentEntry(reservation.intentId), { idempotency: reservation })
    assert.deepEqual(
      await journal.lookupIdempotency(DRIVE_A, MANIFEST, reservation.idempotencyKey),
      { intentId: reservation.intentId, intentDigest: reservation.intentDigest }
    )

    // A second append under the same key fails closed with the existing
    // record attached, and writes nothing.
    const err = await journal.append(
      intentEntry('wpi_0000000000000002'),
      { idempotency: { ...reservation, intentId: 'wpi_0000000000000002' } }
    ).then(() => null, (e) => e)
    assert.equal(err.code, 'idempotency-conflict')
    assert.equal(err.existing.intentId, reservation.intentId)
    assert.equal((await journal.getByIntentId('wpi_0000000000000002')).length, 0)

    // Concurrent same-key appends: exactly one wins the reservation.
    const [a, b] = await Promise.allSettled([
      journal.append(intentEntry('wpi_0000000000000003'), {
        idempotency: { ...reservation, idempotencyKey: 'checkout:order-2', intentId: 'wpi_0000000000000003' }
      }),
      journal.append(intentEntry('wpi_0000000000000004'), {
        idempotency: { ...reservation, idempotencyKey: 'checkout:order-2', intentId: 'wpi_0000000000000004' }
      })
    ])
    assert.equal([a, b].filter(r => r.status === 'fulfilled').length, 1)
    const loser = [a, b].find(r => r.status === 'rejected')
    assert.equal(loser.reason.code, 'idempotency-conflict')

    // A different key segment never collides.
    assert.equal(await journal.lookupIdempotency(DRIVE_B, MANIFEST, reservation.idempotencyKey), null)
    assert.equal(await codeOf(() => journal.lookupIdempotency('zz', MANIFEST, 'k')), 'bad-request')
    assert.equal(await codeOf(() => journal.lookupIdempotency(DRIVE_A, MANIFEST, 'has!bang')), 'bad-request')
  } finally {
    await store.close()
  }
  const store2 = new Corestore(dir)
  await store2.ready()
  try {
    const journal = new WalletJournal({ store: store2 })
    await journal.ready()
    assert.deepEqual(
      await journal.lookupIdempotency(DRIVE_A, MANIFEST, reservation.idempotencyKey),
      { intentId: reservation.intentId, intentDigest: reservation.intentDigest }
    )
  } finally {
    await store2.close()
    await rm(dir, { recursive: true, force: true })
  }
})
