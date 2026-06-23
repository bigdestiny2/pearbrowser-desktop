// NIP-19 npub bech32 encoding — display-only. Locked to the canonical NIP-19
// vector so a bech32 regression can't ship a wrong npub.
import test from 'node:test'
import assert from 'node:assert/strict'
import nip19 from '../backend/nip19.cjs'

test('npubEncode matches the canonical NIP-19 vector', () => {
  const hex = '7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e'
  assert.equal(nip19.npubEncode(hex), 'npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg')
})

test('npub is npub1-prefixed and 63 chars (hrp + 52 data + 6 checksum)', () => {
  const npub = nip19.npubEncode('11'.repeat(32))
  assert.ok(npub.startsWith('npub1'))
  assert.equal(npub.length, 63)
})

test('npubEncode rejects malformed input (not 64-hex)', () => {
  assert.throws(() => nip19.npubEncode('zz'), /64-hex/)
  assert.throws(() => nip19.npubEncode('ab'.repeat(31)), /64-hex/)
  assert.throws(() => nip19.npubEncode(123), /64-hex/)
})
