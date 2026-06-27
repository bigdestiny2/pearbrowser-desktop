import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import userDataMod from '../backend/user-data.js'

const { UserData, MAX_HISTORY } = userDataMod

test('replaceHistory applies a bounded synced snapshot and preserves visit timestamps', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'userdata-history-'))
  const store = new Corestore(dir)
  const data = new UserData(store, null)

  try {
    await data.ready()
    await data.addHistory({ url: 'hyper://old', title: 'Old local row' })

    const applied = await data.replaceHistory([
      { url: 'hyper://alpha', title: 'Alpha', visitedAt: 123 },
      { url: 'hyper://alpha', title: 'Duplicate', visitedAt: 456 },
      { url: '', title: 'Empty' },
      { url: 'hyper://beta', title: 'Beta', visitedAt: 789 },
      ...Array.from({ length: MAX_HISTORY + 4 }, (_, i) => ({
        url: `hyper://bulk-${i}`,
        title: `Bulk ${i}`,
        visitedAt: 1000 + i
      }))
    ])

    const history = await data.listHistory({ limit: MAX_HISTORY + 10 })
    assert.equal(applied, MAX_HISTORY)
    assert.equal(history.length, MAX_HISTORY)
    assert.equal(history.some((entry) => entry.url === 'hyper://old'), false)
    assert.deepEqual(history.find((entry) => entry.url === 'hyper://alpha'), {
      url: 'hyper://alpha',
      title: 'Alpha',
      visitedAt: 123
    })
    assert.deepEqual(history.find((entry) => entry.url === 'hyper://beta'), {
      url: 'hyper://beta',
      title: 'Beta',
      visitedAt: 789
    })
  } finally {
    await data.close().catch(() => {})
    await store.close().catch(() => {})
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
})
