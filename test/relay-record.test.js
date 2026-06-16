// iroh adoption (desktop side) — resolve a relay's DHT record by pubkey and
// bootstrap the relay directory from it. Node-safe: backend/relay-record.js
// has no bare-http1, so a fake hyperdht (mutableGet) drives the tests.
import test from 'node:test'
import assert from 'node:assert/strict'
import b4a from 'b4a'
import z32 from 'z32'
import mod from '../backend/relay-record.js'

const { decodeRelayRecord, resolveRelayRecord, resolveBootstrapRelays } = mod

const ROOM = z32.encode(b4a.alloc(32, 7)) // valid 52-char z32
const GW = 'https://relay.example:9100'
const PUB = b4a.alloc(32, 3)
const PUB_HEX = b4a.toString(PUB, 'hex')

// Wire format the relay publishes (matches the relay's relay-record codec).
const recordValue = (g, i) => {
  const r = { v: 1 }
  if (g) r.g = g
  if (i) r.i = i
  return b4a.from(JSON.stringify(r), 'utf8')
}
// A fake hyperdht: returns a (notionally signature-verified) value per key hex.
const fakeDht = (byKeyHex) => ({
  async mutableGet (key) {
    const v = byKeyHex[b4a.toString(key, 'hex')]
    return v ? { value: v, seq: 1 } : null
  }
})

test('decodeRelayRecord: valid / garbage / wrong version', () => {
  assert.deepEqual(decodeRelayRecord(recordValue(GW, ROOM)), { gatewayUrl: GW, indexRoom: ROOM })
  assert.deepEqual(decodeRelayRecord(recordValue(GW, null)), { gatewayUrl: GW, indexRoom: null })
  assert.equal(decodeRelayRecord(b4a.from('xxx')), null)
  assert.equal(decodeRelayRecord(b4a.from(JSON.stringify({ v: 99, g: GW }))), null)
  assert.equal(decodeRelayRecord(null), null)
})

test('resolveRelayRecord: resolves by pubkey (Buffer + hex); null on misses', async () => {
  const dht = fakeDht({ [PUB_HEX]: recordValue(GW, ROOM) })
  assert.deepEqual(await resolveRelayRecord(dht, PUB), { gatewayUrl: GW, indexRoom: ROOM })
  assert.deepEqual(await resolveRelayRecord(dht, PUB_HEX), { gatewayUrl: GW, indexRoom: ROOM })
  assert.equal(await resolveRelayRecord(dht, b4a.alloc(32, 9)), null, 'unknown key → null')
  assert.equal(await resolveRelayRecord(null, PUB), null, 'no dht → null')
  assert.equal(await resolveRelayRecord(dht, b4a.alloc(8, 1)), null, 'bad key length → null')
})

test('resolveBootstrapRelays: pubkey seed resolves from DHT (preferred)', async () => {
  const dht = fakeDht({ [PUB_HEX]: recordValue(GW, ROOM) })
  const r = await resolveBootstrapRelays(dht, [{ pubkey: PUB_HEX }])
  assert.deepEqual(r.relays, [GW])
  assert.equal(r.indexRooms.length, 1)
  assert.deepEqual(r.indexRooms[0], { pubkey: PUB_HEX, gatewayUrl: GW, indexRoom: ROOM })
})

test('resolveBootstrapRelays: static seed used when no pubkey', async () => {
  const r = await resolveBootstrapRelays(fakeDht({}), [{ gatewayUrl: GW + '/', indexRoom: ROOM }])
  assert.deepEqual(r.relays, [GW])
  assert.equal(r.indexRooms[0].indexRoom, ROOM)
})

test('resolveBootstrapRelays: falls back to static when DHT resolve fails', async () => {
  const r = await resolveBootstrapRelays(fakeDht({}), [{ pubkey: PUB_HEX, gatewayUrl: GW }])
  assert.deepEqual(r.relays, [GW], 'unresolved pubkey → static gateway kept')
})

test('resolveBootstrapRelays: merges multiple seeds, dedups, skips garbage', async () => {
  const PUB2 = b4a.alloc(32, 4); const PUB2_HEX = b4a.toString(PUB2, 'hex')
  const dht = fakeDht({
    [PUB_HEX]: recordValue(GW, ROOM),
    [PUB2_HEX]: recordValue('https://b.relay', null)
  })
  const r = await resolveBootstrapRelays(dht, [
    { pubkey: PUB_HEX },
    { pubkey: PUB2_HEX },
    { gatewayUrl: GW }, // duplicate gateway → deduped
    null, 'garbage', {}
  ])
  assert.deepEqual(r.relays.slice().sort(), [GW, 'https://b.relay'].sort())
  assert.equal(r.indexRooms.length, 1, 'only the seed that resolved an indexRoom')
})

test('resolveBootstrapRelays: empty / non-array → empty result', async () => {
  assert.deepEqual(await resolveBootstrapRelays(fakeDht({}), []), { relays: [], indexRooms: [] })
  assert.deepEqual(await resolveBootstrapRelays(fakeDht({}), null), { relays: [], indexRooms: [] })
})
