import test from 'node:test'
import assert from 'node:assert/strict'
import manifest from '../backend/wallet/networks/stable-testnet.cjs'
import {
  assertCompiledContractState,
  decodeAddressSlot,
  decodeString,
  assertFreshBlocks,
  selectProviderVerificationHeights,
  selectVerificationHeight
} from '../scripts/check-wdk-network.mjs'

const finality = Object.freeze({
  minimumConfirmations: 1,
  maximumProviderHeadLag: 5,
  maximumBlockAgeSeconds: 120,
  maximumFutureClockSkewSeconds: 30
})

test('WDK network gate applies confirmation depth to fresh bounded provider heads', () => {
  assert.equal(selectVerificationHeight([
    { providerId: 'primary', blockNumber: '0x3e8' },
    { providerId: 'secondary', blockNumber: '0x3e6' }
  ], finality), 998n)

  assert.equal(selectVerificationHeight([
    { providerId: 'primary', blockNumber: '0x3e8' },
    { providerId: 'secondary', blockNumber: '0x3e8' }
  ], { ...finality, minimumConfirmations: 2 }), 999n)
})

test('WDK network gate rejects a stale provider head before historical state can pass', () => {
  assert.throws(() => selectVerificationHeight([
    { providerId: 'primary', blockNumber: '0x3e8' },
    { providerId: 'stale-secondary', blockNumber: '0x384' }
  ], finality), /exceed the compiled maximum lag/)
})

test('WDK network gate checks each provider after the common height for a recent upgrade', () => {
  const providerHeights = selectProviderVerificationHeights([
    { providerId: 'primary', blockNumber: '0x3e8' },
    { providerId: 'secondary', blockNumber: '0x3e6' }
  ], finality)
  assert.deepEqual(providerHeights, [
    { providerId: 'primary', height: 1000n },
    { providerId: 'secondary', height: 998n }
  ])

  const compiled = {
    proxyRuntimeCodeBytes: manifest.paymentAsset.proxyRuntimeCodeBytes,
    proxyRuntimeCodeKeccak256: manifest.paymentAsset.proxyRuntimeCodeKeccak256,
    implementationRuntimeCodeBytes: manifest.paymentAsset.implementationRuntimeCodeBytes,
    implementationRuntimeCodeKeccak256: manifest.paymentAsset.implementationRuntimeCodeKeccak256,
    implementationAddress: manifest.paymentAsset.implementationAddress.toLowerCase(),
    decimals: manifest.paymentAsset.decimals,
    symbol: manifest.paymentAsset.symbol
  }
  assert.doesNotThrow(() => assertCompiledContractState(compiled))
  assert.throws(() => assertCompiledContractState({
    ...compiled,
    implementationAddress: '0x0000000000000000000000000000000000000001'
  }))
})

test('WDK network gate rejects stale or future verification blocks', () => {
  const now = 2_000_000_000
  assert.doesNotThrow(() => assertFreshBlocks([
    { providerId: 'primary', blockTimestamp: '0x773593d8' },
    { providerId: 'secondary', blockTimestamp: '0x773593d8' }
  ], finality, now))

  assert.throws(() => assertFreshBlocks([
    { providerId: 'stale-secondary', blockTimestamp: '0x77359377' }
  ], finality, now), /older than the compiled maximum age/)

  assert.throws(() => assertFreshBlocks([
    { providerId: 'future-secondary', blockTimestamp: '0x7735941f' }
  ], finality, now), /too far in the future/)
})

test('WDK network gate rejects non-canonical ABI address and string responses', () => {
  const address = '3f9e27457ac494fc729beb50e6af04ec34e3828e'
  assert.equal(decodeAddressSlot(`0x${'00'.repeat(12)}${address}`), `0x${address}`)
  assert.throws(
    () => decodeAddressSlot(`0x01${'00'.repeat(11)}${address}`),
    /canonical padded address/
  )

  const symbolBytes = Buffer.from('USD₮0', 'utf8')
  const offsetWord = Buffer.from('20'.padStart(64, '0'), 'hex')
  const lengthWord = Buffer.from(symbolBytes.length.toString(16).padStart(64, '0'), 'hex')
  const valueWord = Buffer.alloc(32)
  symbolBytes.copy(valueWord)
  const canonical = '0x' + Buffer.concat([offsetWord, lengthWord, valueWord]).toString('hex')
  assert.equal(decodeString(canonical), 'USD₮0')

  const highOffset = Buffer.from(canonical.slice(2), 'hex')
  highOffset[0] = 1
  assert.throws(() => decodeString('0x' + highOffset.toString('hex')), /offset must select/)

  const nonzeroPadding = Buffer.from(canonical.slice(2), 'hex')
  nonzeroPadding[95] = 1
  assert.throws(() => decodeString('0x' + nonzeroPadding.toString('hex')), /padding must be zero/)

  const invalidUtf8 = Buffer.from(canonical.slice(2), 'hex')
  invalidUtf8[64] = 0xc3
  invalidUtf8[65] = 0x28
  assert.throws(() => decodeString('0x' + invalidUtf8.toString('hex')))
})
