// Proves the Hyperbee catalog publisher (scripts/lib/catalog-bee.js) writes
// exactly what backend/catalog-manager.js loadCatalogBee() reads. Builds a
// real on-disk Hyperbee and reads it back through the loader's query path.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import { normalizeManifest, catalogEntries, readCatalogBee } from '../scripts/lib/catalog-bee.js'

const SAMPLE = {
  name: '  Pear Picks  ',
  version: 1,
  apps: [
    { id: 'keet', name: 'Keet', type: 'standalone', description: 'P2P chat', link: 'hyper://' + 'b'.repeat(64) + '/', categories: ['chat'], author: 'Holepunch', homepage: 'https://keet.io', source: 'https://github.com/holepunchto/keet', license: 'Apache-2.0' },
    { id: 'pearpass', name: 'PearPass', driveKey: 'a'.repeat(64), version: '2.0' },
    {
      id: 'native-tool',
      name: 'Native Tool',
      type: 'standalone',
      version: '3.2.1',
      nativeDelivery: {
        status: 'available',
        kind: 'pear-v3',
        installLink: 'pear://' + 'a'.repeat(52),
        productName: 'Native Tool',
        targets: ['darwin-arm64', 'linux-x64']
      }
    }
  ]
}

test('normalizeManifest cleans input and applies defaults', () => {
  const n = normalizeManifest(SAMPLE, 1700000000000)
  assert.equal(n.name, 'Pear Picks') // trimmed
  assert.equal(n.version, 1)
  assert.equal(n.apps.length, 3)
  assert.equal(n.apps[0].publishedAt, 1700000000000) // injected default now
  assert.deepEqual(n.apps[0].categories, ['chat'])
  assert.equal(n.apps[0].sourceUrl, 'https://github.com/holepunchto/keet')
  assert.equal(n.apps[0].homepage, 'https://keet.io')
  assert.equal(n.apps[0].license, 'Apache-2.0')
  assert.equal(n.apps[1].name, 'PearPass')
  assert.equal(n.apps[1].categories.length, 0) // default empty
})

test('normalizeManifest rejects bad input', () => {
  assert.throws(() => normalizeManifest(null), /JSON object/)
  assert.throws(() => normalizeManifest({}), /apps must be an array/)
  assert.throws(() => normalizeManifest({ apps: 'nope' }), /apps must be an array/)
  assert.throws(() => normalizeManifest({ apps: [{}] }), /needs an id/)
  assert.throws(() => normalizeManifest({ apps: [{ id: 'x', link: 'hyper://' + 'c'.repeat(64) + '/' }, { id: 'x', link: 'hyper://' + 'd'.repeat(64) + '/' }] }), /duplicate app id/)
})

test('normalizeManifest allows an explicitly empty community catalog', () => {
  const n = normalizeManifest({ name: 'Community', apps: [] })
  assert.equal(n.name, 'Community')
  assert.equal(n.apps.length, 0)
})

test('derives an id from driveKey/link when id is absent', () => {
  const link = 'hyper://' + 'e'.repeat(64) + '/'
  const n = normalizeManifest({ apps: [{ link }] })
  assert.equal(n.apps[0].id, 'e'.repeat(64))
})

test('round-trips through a real Hyperbee using the loader query', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-bee-test-'))
  try {
    const store = new Corestore(dir)
    await store.ready()
    const core = store.get({ name: 'catalog' })
    await core.ready()
    const bee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' })
    await bee.ready()

    const normalized = normalizeManifest(SAMPLE, 1700000000000)
    for (const [key, value] of catalogEntries(normalized)) await bee.put(key, value)

    const keyHex = Buffer.from(core.key).toString('hex')
    const data = await readCatalogBee(bee, keyHex)

    // This is the exact `data` shape ExploreScreen consumes.
    assert.equal(data.source, 'hyperbee')
    assert.equal(data.name, 'Pear Picks')
    assert.equal(data.version, 1)
    assert.equal(data.sourceKey, keyHex)
    assert.equal(data.count.total, 3)
    assert.equal(data.apps.length, 3)

    const byId = Object.fromEntries(data.apps.map((a) => [a.id, a]))
    assert.equal(byId.keet.name, 'Keet')
    assert.equal(byId.keet.type, 'standalone')
    assert.equal(byId.keet.link, 'hyper://' + 'b'.repeat(64) + '/')
    assert.equal(byId.keet.source, 'hyperbee')
    assert.equal(byId.keet.sourceUrl, 'https://github.com/holepunchto/keet')
    assert.equal(byId.keet.homepage, 'https://keet.io')
    assert.equal(byId.keet.license, 'Apache-2.0')
    assert.equal(byId.pearpass.driveKey, 'a'.repeat(64))
    assert.deepEqual(byId['native-tool'].nativeDelivery, {
      status: 'available',
      kind: 'pear-v3',
      installLink: 'pear://' + 'a'.repeat(52),
      productName: 'Native Tool',
      targets: ['darwin-arm64', 'linux-x64']
    })
    assert.equal(byId['native-tool'].link, undefined)

    await store.close()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
