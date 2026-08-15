// Unit tests for ui/lib/wallet.js — run with `node --test`.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatAtomic,
  truncateAddress,
  normalizeMnemonic,
  utf8ToB64,
  b64ToUtf8,
  bytesToB64,
  b64ToBytes,
  walletErrorMessage,
  passphraseStrength,
  activityLabel
} from '../ui/lib/wallet.js'

test('formatAtomic converts payment amounts (6 decimals) without floats', () => {
  assert.equal(formatAtomic('1234567', 6), '1.234567')
  assert.equal(formatAtomic('1000000', 6), '1') // trailing zeros trimmed
  assert.equal(formatAtomic('1500000', 6), '1.5')
  assert.equal(formatAtomic('1', 6), '0.000001')
  assert.equal(formatAtomic('0', 6), '0')
  assert.equal(formatAtomic('100', 6), '0.0001')
})

test('formatAtomic converts native fee amounts (18 decimals)', () => {
  assert.equal(formatAtomic('1000000000000000000', 18), '1')
  assert.equal(formatAtomic('250000000000000000', 18), '0.25')
  assert.equal(formatAtomic('21000000000000', 18), '0.000021')
})

test('formatAtomic passes through malformed input', () => {
  assert.equal(formatAtomic('abc', 6), 'abc')
  assert.equal(formatAtomic(undefined, 6), '')
  assert.equal(formatAtomic('123', -1), '123')
})

test('truncateAddress compacts long addresses only', () => {
  assert.equal(truncateAddress('0x000000000000000000000000000000000000dEaD'), '0x0000…dEaD')
  assert.equal(truncateAddress('0x1234'), '0x1234')
  assert.equal(truncateAddress(''), '')
  assert.equal(truncateAddress(null), '')
})

test('normalizeMnemonic accepts 12/24 words, normalizes case and whitespace', () => {
  const w12 = Array(12).fill('abandon').join(' ')
  const w24 = Array(24).fill('abandon').join(' ')
  assert.deepEqual(normalizeMnemonic(w12), Array(12).fill('abandon'))
  assert.deepEqual(normalizeMnemonic(w24), Array(24).fill('abandon'))
  assert.deepEqual(normalizeMnemonic('  Abandon\tABANDON\n' + 'abandon '.repeat(10)), Array(12).fill('abandon'))
  assert.equal(normalizeMnemonic('abandon abandon abandon'), null) // 3 words
  assert.equal(normalizeMnemonic(''), null)
  assert.equal(normalizeMnemonic(null), null)
  assert.equal(normalizeMnemonic(Array(13).fill('abandon').join(' ')), null)
})

test('base64 round-trips utf8 (incl. multi-byte) and rejects junk', () => {
  const phrase = 'legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title'
  assert.equal(b64ToUtf8(utf8ToB64(phrase)), phrase)
  assert.equal(b64ToUtf8(utf8ToB64('USD₮0 — 24 words ✓')), 'USD₮0 — 24 words ✓')
  assert.equal(utf8ToB64('hello world'), 'aGVsbG8gd29ybGQ=') // known vector
  assert.equal(b64ToUtf8('aGVsbG8gd29ybGQ='), 'hello world')
  assert.equal(b64ToUtf8('not base64!!!'), null)
  assert.equal(b64ToUtf8(null), null)
  // byte-level round-trip for non-text payloads
  const bytes = new Uint8Array([0, 1, 2, 253, 254, 255])
  assert.deepEqual([...b64ToBytes(bytesToB64(bytes))], [...bytes])
})

test('walletErrorMessage maps coded backend errors to human text', () => {
  assert.match(walletErrorMessage(new Error('wallet passphrase is incorrect')), /Wrong passphrase/)
  assert.match(walletErrorMessage(new Error('bad-passphrase')), /Wrong passphrase/)
  assert.match(walletErrorMessage(new Error('a wallet vault already exists')), /already exists/)
  assert.match(walletErrorMessage(new Error('wallet is locked')), /locked/)
  assert.match(walletErrorMessage(new Error('lock the wallet before starting a backup ceremony')), /Lock the wallet/)
  assert.match(walletErrorMessage(new Error('payment preparation rate limit reached')), /Rate limited/)
  assert.match(walletErrorMessage(new Error('wallet prompt has expired')), /expired/)
  assert.match(walletErrorMessage(new Error('wallet is not available — worklet still booting')), /not available/)
  assert.equal(walletErrorMessage(new Error('some other failure')), 'some other failure') // pass-through
  assert.equal(walletErrorMessage(new Error('CMD_WALLET_RECONCILE is reserved and not implemented in v0.9')), 'This wallet feature is not implemented in this build.')
})

test('passphraseStrength ranks weak/fair/strong', () => {
  assert.equal(passphraseStrength('').label, '')
  assert.equal(passphraseStrength('cat').label, 'weak')
  assert.equal(passphraseStrength('password').label, 'weak')
  assert.equal(passphraseStrength('Tractor99!x').label, 'fair')
  assert.equal(passphraseStrength('correct horse battery staple 99!').label, 'strong')
})

test('activityLabel renders one line per projected entry type', () => {
  assert.equal(activityLabel({ type: 'intent', intentType: 'payment' }), 'Payment requested')
  assert.equal(activityLabel({ type: 'intent', intentType: 'sign-app' }), 'App signature requested')
  assert.equal(activityLabel({ type: 'outcome', state: 'submitted' }), 'Payment submitted')
  assert.equal(activityLabel({ type: 'outcome', state: 'cancelled' }), 'Cancelled')
  assert.equal(activityLabel({ type: 'outcome', state: 'weird' }), 'Outcome: weird')
  assert.equal(activityLabel({ type: 'connect' }), 'App connected')
  assert.equal(activityLabel({ type: 'broadcast' }), 'Broadcast to network')
  assert.equal(activityLabel(null), '')
})
